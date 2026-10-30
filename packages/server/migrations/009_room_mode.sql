-- Salles : deux modes de jeu.
--
--   together : l'existant. Tous coéquipiers dans le même club, club de départ et
--              transferts votés, saison du club tirée en commun.
--   rivals   : chacun sa carrière et son club (jamais le même qu'un autre membre), sans
--              vote. La barrière de fin de saison reste : tout le monde joue la même
--              année, et l'on se compare saison après saison.
alter table rooms add column mode text not null default 'together';
alter table rooms add constraint rooms_mode_chk check (mode in ('together', 'rivals'));

drop function room_create();
create function room_create(p_mode text default 'together')
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_room_id uuid;
  v_pseudo  text;
begin
  if p_mode is null or p_mode not in ('together', 'rivals') then
    raise exception 'invalid room mode';
  end if;
  if has_active_room(app_user_id()) then
    raise exception 'already in an active room';
  end if;
  select pseudo into v_pseudo from profiles where user_id = app_user_id();
  insert into rooms (created_by, mode) values (app_user_id(), p_mode) returning id into v_room_id;
  insert into room_members (room_id, user_id, pseudo, status, invited_by, joined_at)
    values (v_room_id, app_user_id(), coalesce(v_pseudo, 'Joueur'), 'joined', app_user_id(), now());
  return v_room_id;
end;
$function$;

-- Mode Rivaux : chaque membre réserve son centre de formation avant le lancement. Un
-- club déjà réservé par un autre membre est refusé (même club = jamais en Rivaux). Le
-- choix est rangé dans starting_offers, ce qui marque aussi le membre « prêt ».
create function room_pick_start_club(p_room_id uuid, p_club_id text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if p_club_id is null or length(p_club_id) = 0 or length(p_club_id) > 64 then
    raise exception 'invalid club';
  end if;
  if not exists (select 1 from rooms where id = p_room_id and mode = 'rivals' and phase = 'profile_setup') then
    raise exception 'not a rivals room in setup';
  end if;
  if not exists (
    select 1 from room_members where room_id = p_room_id and user_id = app_user_id() and status = 'joined'
  ) then
    raise exception 'not a joined member';
  end if;
  if exists (
    select 1 from room_members
     where room_id = p_room_id and user_id <> app_user_id() and status = 'joined'
       and starting_offers ->> 0 = p_club_id
  ) then
    raise exception 'club already taken by a rival';
  end if;
  update room_members set starting_offers = jsonb_build_array(p_club_id)
   where room_id = p_room_id and user_id = app_user_id() and status = 'joined';
end;
$function$;
