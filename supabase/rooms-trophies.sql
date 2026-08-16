-- ============================================================
--  Salles : trophées CLUB partagés entre membres
-- ============================================================
--  Chaque carrière de la salle tourne sur son propre RNG local (aucune
--  vérification serveur, v1 100% client-trust comme le reste du mode) : deux
--  membres au MÊME club, la même saison, peuvent obtenir des résultats
--  différents (l'un "champion", l'autre non) puisque chaque simulation tire
--  indépendamment si LE CLUB gagne le titre. Comme la salle impose le même
--  club à tous, un trophée gagné par l'un doit compter pour tous — sinon le
--  palmarès de fin de salle paraît arbitraire (bug remonté : un membre
--  "champion" alors que le premier à avoir rapporté sa saison n'a rien).
--
--  Principe : chaque membre transmet à room_report_season les trophées CLUB
--  (pas les distinctions individuelles - Ballon d'Or, Soulier d'Or... - qui
--  ne se partagent jamais) que SA PROPRE simulation a obtenus cette saison.
--  Quand la barrière de saison se referme (tout le monde a rapporté),
--  room_maybe_advance_season calcule l'UNION de ces trophées et la pose sur
--  rooms.season_trophies. Chaque client, au moment où SA barrière se lève
--  (cf. room.js watchTransferPhase), lit cette union et crédite localement
--  (via engine.js creditClubTrophies) ce qu'il n'avait pas déjà lui-même.
--
--  À exécuter dans l'éditeur SQL Supabase, après les fichiers précédents.
--  Idempotent.
-- ============================================================

alter table public.room_progress add column if not exists club_trophies jsonb;
alter table public.rooms add column if not exists season_trophies jsonb;

-- room_report_season change de signature (ajout de p_club_trophies) : on
-- retire l'ancienne version à 2 arguments pour éviter toute ambiguïté de
-- surcharge côté PostgREST (Supabase résout par nom de paramètres).
drop function if exists public.room_report_season(uuid, jsonb);

create or replace function public.room_report_season(p_room_id uuid, p_pending_offer jsonb, p_club_trophies jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = auth.uid() and status = 'joined'
  ) then
    raise exception 'not a joined member';
  end if;
  if not exists (select 1 from public.rooms where id = p_room_id and phase = 'in_season') then
    return;
  end if;

  insert into public.room_progress (room_id, user_id, ready, pending_offer, club_trophies, updated_at)
    values (p_room_id, auth.uid(), true, p_pending_offer, coalesce(p_club_trophies, '[]'::jsonb), now())
  on conflict (room_id, user_id) do update
    set ready = true, pending_offer = excluded.pending_offer, club_trophies = excluded.club_trophies, updated_at = now();

  perform public.room_maybe_advance_season(p_room_id);
end;
$$;

-- room_maybe_advance_season : reprend la version de rooms-resync.sql, avec
-- deux ajouts — calcul de l'union des trophées dès que la barrière est
-- franchie (AVANT de réinitialiser room_progress), et remise à zéro de
-- club_trophies en même temps que pending_offer dans les deux branches.
create or replace function public.room_maybe_advance_season(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_joined_count int;
  v_ready_count  int;
  v_any_offers   boolean;
  v_forced       boolean;
  v_candidates   jsonb;
  v_trophies     jsonb;
begin
  if not exists (select 1 from public.rooms where id = p_room_id and phase = 'in_season') then
    return;
  end if;

  select count(*) into v_joined_count from public.room_members
   where room_id = p_room_id and status = 'joined' and not career_ended;
  if v_joined_count = 0 then
    return; -- plus personne d'actif : rien à faire avancer ici
  end if;

  select count(*) into v_ready_count from public.room_progress
   where room_id = p_room_id and ready = true
     and user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined' and not career_ended);
  if v_ready_count < v_joined_count then
    return; -- il manque encore un rapport
  end if;

  -- Barrière franchie : union des trophées club rapportés par les membres
  -- actifs pour la saison qui vient de se terminer, posée AVANT de
  -- réinitialiser room_progress ci-dessous (sinon plus rien à agréger).
  select coalesce(jsonb_agg(distinct trophy), '[]'::jsonb)
    into v_trophies
    from public.room_progress rp, jsonb_array_elements_text(coalesce(rp.club_trophies, '[]'::jsonb)) as trophy
   where rp.room_id = p_room_id
     and rp.user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined' and not career_ended);
  update public.rooms set season_trophies = v_trophies where id = p_room_id;

  select bool_or(jsonb_array_length(coalesce(pending_offer->'offers', '[]'::jsonb)) > 0)
    into v_any_offers
    from public.room_progress
   where room_id = p_room_id
     and user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined' and not career_ended);

  if not coalesce(v_any_offers, false) then
    update public.room_progress set ready = false, pending_offer = null, club_trophies = null where room_id = p_room_id;
    update public.rooms set season_year = coalesce(season_year, 0) + 1 where id = p_room_id;
    return;
  end if;

  select bool_or(coalesce((pending_offer->>'forced')::boolean, false)) into v_forced
    from public.room_progress
   where room_id = p_room_id
     and user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined' and not career_ended);

  select jsonb_agg(distinct clubid) into v_candidates
    from public.room_progress rp, jsonb_array_elements_text(coalesce(rp.pending_offer->'offers', '[]'::jsonb)) as clubid
   where rp.room_id = p_room_id
     and rp.user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined' and not career_ended);
  if not coalesce(v_forced, false) then
    v_candidates := coalesce(v_candidates, '[]'::jsonb) || to_jsonb(array['stay']);
  end if;

  update public.rooms set phase = 'season_vote' where id = p_room_id and phase = 'in_season';
  if not found then
    return; -- déjà ouvert entre-temps par un appel concurrent
  end if;

  insert into public.room_votes (room_id, kind, candidates) values (p_room_id, 'transfer', v_candidates);
end;
$$;

-- room_leave et room_mark_career_ended appellent déjà room_maybe_advance_season
-- (cf. rooms-resync.sql) : rien à changer là, create or replace ci-dessus
-- suffit à propager le nouveau comportement.

revoke all on function public.room_report_season(uuid, jsonb, jsonb) from public;
grant execute on function public.room_report_season(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.room_maybe_advance_season(uuid) to authenticated;

-- Contrôle :
-- select season_trophies from public.rooms where id = '<id>';
-- select user_id, club_trophies from public.room_progress where room_id = '<id>';
