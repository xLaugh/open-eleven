-- ============================================================
--  Salles : re-synchronisation après un changement d'effectif
-- ============================================================
--  Bug récurrent trouvé en test : quand des membres ont DÉJÀ voté ou rapporté
--  leur saison et attendent le DERNIER membre manquant, si celui-ci PART
--  (room_leave), est EXCLU (vote de kick résolu) ou TERMINE sa carrière
--  (room_mark_career_ended) au lieu de voter/rapporter, plus rien ne
--  re-déclenche la vérification — room_maybe_resolve_vote et la barrière de
--  saison ne sont normalement relancées QUE par un nouveau bulletin/rapport.
--  Les membres restants restaient donc bloqués indéfiniment sur "en attente",
--  pas seulement au lancement de la salle (déjà corrigé pour room_launch).
--
--  Correctif : chaque endroit qui RÉDUIT l'effectif actif re-tente
--  explicitement la résolution du vote ouvert (s'il y en a un) et l'avancée
--  de la barrière de saison — sans effet si rien n'est en attente.
--
--  À exécuter dans l'éditeur SQL Supabase, en DERNIER (après les 4 fichiers
--  précédents). Idempotent.
-- ============================================================

-- --- 1. Barrière de saison, extraite en fonction réutilisable ---------------
-- Reprend exactement la logique qui vivait en seconde moitié de
-- room_report_season (rooms-endgame.sql) : vérifie si tous les membres
-- actifs restants ont rapporté, et fait avancer la salle si oui (vote de
-- mercato si au moins une offre concrète, sinon saison suivante directe).
-- Appelée par room_report_season (comme avant) ET par tout ce qui réduit
-- l'effectif actif ci-dessous.
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

  select bool_or(jsonb_array_length(coalesce(pending_offer->'offers', '[]'::jsonb)) > 0)
    into v_any_offers
    from public.room_progress
   where room_id = p_room_id
     and user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined' and not career_ended);

  if not coalesce(v_any_offers, false) then
    update public.room_progress set ready = false, pending_offer = null where room_id = p_room_id;
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

-- room_report_season : ne fait plus QUE upsert son propre rapport, puis
-- délègue la vérification à room_maybe_advance_season (même comportement
-- qu'avant, logique juste extraite pour être réutilisable).
create or replace function public.room_report_season(p_room_id uuid, p_pending_offer jsonb)
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

  insert into public.room_progress (room_id, user_id, ready, pending_offer, updated_at)
    values (p_room_id, auth.uid(), true, p_pending_offer, now())
  on conflict (room_id, user_id) do update
    set ready = true, pending_offer = excluded.pending_offer, updated_at = now();

  perform public.room_maybe_advance_season(p_room_id);
end;
$$;


-- --- 2. room_leave : relance ce qui attendait CE membre ---------------------
create or replace function public.room_leave(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vote_id uuid;
begin
  update public.room_members
     set status = 'left'
   where room_id = p_room_id and user_id = auth.uid() and status = 'joined';

  -- Le départ peut être le dernier maillon manquant d'un vote ouvert ou de la
  -- barrière de saison — sans ce nudge, les membres restants qui ont déjà
  -- voté/rapporté resteraient bloqués à attendre quelqu'un qui ne reviendra
  -- plus. Sans effet si rien n'était en attente.
  select id into v_vote_id from public.room_votes where room_id = p_room_id and status = 'open' limit 1;
  if v_vote_id is not null then
    perform public.room_maybe_resolve_vote(v_vote_id);
  end if;
  perform public.room_maybe_advance_season(p_room_id);
end;
$$;


-- --- 3. room_maybe_resolve_vote : relance la barrière après une exclusion --
-- Reprend la version de rooms-endgame.sql à l'identique, sauf la branche
-- 'kick' qui appelle désormais room_maybe_advance_season après avoir exclu :
-- si le membre exclu était le seul manquant, la barrière se débloque tout de
-- suite pour les autres au lieu d'attendre un rapport qui ne viendra jamais.
create or replace function public.room_maybe_resolve_vote(p_vote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id        uuid;
  v_kind           text;
  v_target         uuid;
  v_eligible_count int;
  v_ballot_count   int;
  v_winner         text;
begin
  select room_id, kind into v_room_id, v_kind from public.room_votes where id = p_vote_id and status = 'open';
  if v_room_id is null then
    return;
  end if;

  v_target := case when v_kind = 'kick'
    then (select (candidates->>'target')::uuid from public.room_votes where id = p_vote_id)
    else null end;

  select count(*) into v_eligible_count from public.room_members
   where room_id = v_room_id and status = 'joined' and not career_ended
     and (v_target is null or user_id <> v_target);
  select count(*) into v_ballot_count
    from public.room_ballots b
      join public.room_members m on m.room_id = v_room_id and m.user_id = b.user_id
        and m.status = 'joined' and not m.career_ended
        and (v_target is null or m.user_id <> v_target)
   where b.vote_id = p_vote_id;
  if v_ballot_count < v_eligible_count then
    return;
  end if;

  select choice into v_winner from (
    select b.choice, count(*) as n
      from public.room_ballots b
        join public.room_members m on m.room_id = v_room_id and m.user_id = b.user_id
          and m.status = 'joined' and not m.career_ended
          and (v_target is null or m.user_id <> v_target)
     where b.vote_id = p_vote_id
     group by b.choice
     order by n desc, random()
     limit 1
  ) t;

  update public.room_votes
     set status = 'closed', result = jsonb_build_object('choice', v_winner, 'resolvedAt', now()), closed_at = now()
   where id = p_vote_id and status = 'open';
  if not found then
    return;
  end if;

  if v_kind = 'starting_club' then
    update public.rooms
       set club_id = v_winner, status = 'active', phase = 'in_season', started_at = now()
     where id = v_room_id;
  elsif v_kind in ('transfer', 'follow_relocation') then
    update public.room_progress set ready = false, pending_offer = null where room_id = v_room_id;
    update public.rooms set phase = 'in_season', season_year = coalesce(season_year, 0) + 1 where id = v_room_id;
  elsif v_kind = 'kick' then
    if v_winner = 'kick' then
      update public.room_members set status = 'excluded' where room_id = v_room_id and user_id = v_target;
    end if;
    update public.rooms set phase = 'in_season' where id = v_room_id;
    perform public.room_maybe_advance_season(v_room_id);
  end if;
end;
$$;


-- --- 4. room_mark_career_ended : relance la barrière pour les autres -------
create or replace function public.room_mark_career_ended(p_room_id uuid, p_score numeric, p_summary jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  update public.room_members
     set career_ended = true, final_score = p_score, final_summary = p_summary
   where room_id = p_room_id and user_id = auth.uid() and status = 'joined';
  if not found then
    return;
  end if;

  select count(*) into v_remaining from public.room_members
   where room_id = p_room_id and status = 'joined' and not career_ended;
  if v_remaining = 0 then
    update public.rooms set status = 'ended', phase = 'ended', ended_at = now() where id = p_room_id;
    return;
  end if;

  -- Cette carrière qui se termine peut être le dernier rapport manquant de
  -- la saison en cours pour les membres encore actifs.
  perform public.room_maybe_advance_season(p_room_id);
end;
$$;


-- --- 5. Droits --------------------------------------------------------------
revoke all on function public.room_maybe_advance_season(uuid) from public;
grant execute on function public.room_maybe_advance_season(uuid) to authenticated;
grant execute on function public.room_report_season(uuid, jsonb) to authenticated;
grant execute on function public.room_leave(uuid) to authenticated;
grant execute on function public.room_maybe_resolve_vote(uuid) to authenticated;
grant execute on function public.room_mark_career_ended(uuid, numeric, jsonb) to authenticated;


-- --- 6. Contrôle ------------------------------------------------------------
-- select * from public.room_progress where room_id = '<id>' order by updated_at desc;
-- select * from public.room_votes where room_id = '<id>' order by opened_at desc;
