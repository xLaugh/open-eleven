-- ============================================================
--  Salles : cas limites (Phase D, dernière phase du chantier)
-- ============================================================
--  Suite de rooms.sql / rooms-votes.sql / rooms-season.sql. Trois pièces :
--
--  1. Transfert narratif « direct » (fx.transfer.direct, engine.js) : le
--     moteur l'applique tout de suite à UN SEUL membre, sans concertation
--     possible (irréversible). Un vote A POSTERIORI décide si le groupe
--     suit — réutilise le vote de transfert générique (kind='follow_relocation',
--     candidats [clubId, 'stay']) : aucun nouveau rendu client nécessaire,
--     seule la résolution diffère (le meneur a déjà voté pour son propre club).
--
--  2. Exclusion d'un membre absent : vote à la majorité des membres joints
--     HORS la cible (jamais la cible elle-même) — réutilise le même moteur de
--     dépouillement générique que les autres votes (majorité + égalité
--     aléatoire), juste avec un dénominateur réduit.
--
--  3. Fin de carrière asynchrone + fin de salle : un membre qui termine SA
--     carrière devient spectateur (exclu du dénominateur de TOUS les votes
--     futurs, definitivement — pas remis à zéro à chaque saison, contrairement
--     à room_progress). La salle passe 'ended' quand tout le monde a fini.
--
--  À exécuter dans l'éditeur SQL Supabase, après rooms-season.sql. Idempotent.
-- ============================================================

-- --- 1. Colonnes ------------------------------------------------------------
alter table public.room_members add column if not exists career_ended boolean not null default false;
alter table public.room_members add column if not exists final_score numeric;
alter table public.room_members add column if not exists final_summary jsonb;


-- --- 2. RPC : vote de relocalisation (transfert narratif direct) ------------
-- Ouvert par le membre déjà déplacé (son propre club fait partie des deux
-- candidats, l'autre étant 'stay') ; son propre bulletin est posé tout de
-- suite — inutile de lui demander ce qu'il pense d'un choix déjà fait.
create or replace function public.room_open_relocation_vote(p_room_id uuid, p_club_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vote_id uuid;
begin
  if not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = auth.uid() and status = 'joined'
  ) then
    raise exception 'not a joined member';
  end if;

  update public.rooms set phase = 'season_vote' where id = p_room_id and phase = 'in_season';
  if not found then
    return null; -- un vote est déjà ouvert (mercato, un autre narratif, un kick…)
  end if;

  insert into public.room_votes (room_id, kind, candidates)
    values (p_room_id, 'follow_relocation', jsonb_build_array(p_club_id, 'stay'))
    returning id into v_vote_id;

  insert into public.room_ballots (vote_id, user_id, choice) values (v_vote_id, auth.uid(), p_club_id);
  perform public.room_maybe_resolve_vote(v_vote_id);
  return v_vote_id;
end;
$$;


-- --- 3. RPC : proposer l'exclusion d'un membre ------------------------------
-- Sous 3 membres joints, l'exclusion perd son sens (un des deux restants peut
-- simplement quitter, cf. room_leave) : bloqué explicitement.
create or replace function public.room_propose_kick(p_room_id uuid, p_target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_joined_count int;
  v_vote_id      uuid;
begin
  if auth.uid() = p_target_user_id then
    raise exception 'cannot propose to kick yourself';
  end if;
  if not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = auth.uid() and status = 'joined'
  ) then
    raise exception 'not a joined member';
  end if;
  if not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = p_target_user_id and status = 'joined'
  ) then
    raise exception 'target is not a joined member';
  end if;

  select count(*) into v_joined_count from public.room_members where room_id = p_room_id and status = 'joined';
  if v_joined_count < 3 then
    raise exception 'not enough members to vote a kick — leave instead';
  end if;

  update public.rooms set phase = 'season_vote' where id = p_room_id and phase = 'in_season';
  if not found then
    raise exception 'a vote is already in progress';
  end if;

  insert into public.room_votes (room_id, kind, candidates)
    values (p_room_id, 'kick', jsonb_build_object('target', p_target_user_id, 'options', jsonb_build_array('kick', 'keep')))
    returning id into v_vote_id;

  insert into public.room_ballots (vote_id, user_id, choice) values (v_vote_id, auth.uid(), 'kick');
  perform public.room_maybe_resolve_vote(v_vote_id);
  return v_vote_id;
end;
$$;


-- --- 4. RPC : signaler la fin de SA carrière ---------------------------------
-- p_summary : petit résumé jsonb pour l'écran de fin de salle des autres
-- (nom, poste, saisons, palmarès résumé…) — construit côté client, jamais
-- vérifié (même compromis « pas de vérification serveur du moteur » que le
-- reste du mode). Ferme la salle quand TOUS les membres joints ont terminé.
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
  end if;
end;
$$;


-- --- 5. Dépouillement unifié (remplace la version de rooms-season.sql) ------
-- Un seul mécanisme de majorité (+ égalité aléatoire, une fois, côté serveur)
-- pour LES QUATRE types de vote : le dénominateur exclut la cible d'un kick
-- (v_target) et, pour tous les votes, quiconque a déjà terminé sa carrière
-- (spectateur — décision « la salle continue pour les autres »).
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
    return; -- tout le monde n'a pas encore voté
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
    return; -- résolu entre-temps par un appel concurrent
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
  end if;
end;
$$;


-- --- 6. RPC : proposition de fenêtre côté barrière, à jour du spectateur ----
-- Remplace la version de rooms-season.sql : exclut désormais les membres
-- career_ended du décompte "tout le monde a fini sa saison".
create or replace function public.room_report_season(p_room_id uuid, p_pending_offer jsonb)
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

  select count(*) into v_joined_count from public.room_members
   where room_id = p_room_id and status = 'joined' and not career_ended;
  select count(*) into v_ready_count from public.room_progress
   where room_id = p_room_id and ready = true
     and user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined' and not career_ended);
  if v_ready_count < v_joined_count then
    return;
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
    return;
  end if;

  insert into public.room_votes (room_id, kind, candidates) values (p_room_id, 'transfer', v_candidates);
end;
$$;


-- --- 7. Droits ------------------------------------------------------------
revoke all on function public.room_open_relocation_vote(uuid, text) from public;
revoke all on function public.room_propose_kick(uuid, uuid) from public;
revoke all on function public.room_mark_career_ended(uuid, numeric, jsonb) from public;
grant execute on function public.room_open_relocation_vote(uuid, text) to authenticated;
grant execute on function public.room_propose_kick(uuid, uuid) to authenticated;
grant execute on function public.room_mark_career_ended(uuid, numeric, jsonb) to authenticated;
grant execute on function public.room_maybe_resolve_vote(uuid) to authenticated;
grant execute on function public.room_report_season(uuid, jsonb) to authenticated;


-- --- 8. Contrôle ------------------------------------------------------------
-- select id, status, pseudo, career_ended, final_score from public.room_members order by room_id;
-- select * from public.rooms where status = 'ended' order by ended_at desc limit 10;
