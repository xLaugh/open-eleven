-- ============================================================
--  Salles : boucle de saison collective (Phase C)
-- ============================================================
--  Suite de rooms.sql (Phase A) et rooms-votes.sql (Phase B). Deux points de
--  synchronisation distincts, tous deux résolus par le même mécanisme de vote
--  (room_votes/room_ballots, kind='transfer') :
--
--  1. Mercato de fin de saison (barrière) : CHAQUE membre doit avoir fini SA
--     saison avant que la salle ne tranche — room_report_season() compte les
--     rapports et n'ouvre un vote QUE si tout le monde est arrivé ET qu'au
--     moins un membre a une fenêtre de transfert concrète. Sinon (personne
--     n'a de fenêtre), tout le monde repart directement, sans vote.
--
--  2. Transfert narratif en cours de saison (immédiat) : un événement peut
--     proposer un club à N'IMPORTE QUEL moment, à un SEUL membre — pas de
--     barrière possible (les 3 autres peuvent être n'importe où dans LEUR
--     propre saison). room_open_transfer_vote() ouvre le vote tout de suite ;
--     les autres membres le découvrent au prochain point où LEUR client
--     interroge l'état de la salle (leur propre mercato, ou l'overlay 🏟️).
--     Limite assumée en v1 : pas d'interruption en direct de qui que ce soit.
--
--  À exécuter dans l'éditeur SQL Supabase, après rooms-votes.sql. Idempotent.
-- ============================================================

-- --- 1. Table ---------------------------------------------------------------
-- Une ligne par membre, ÉCRASÉE à chaque tour (pas d'historique par saison) :
-- ready=true une fois SA saison rapportée ; remis à false par la résolution
-- (barrière franchie sans vote, ou vote clos) pour armer le tour suivant.
create table if not exists public.room_progress (
  room_id       uuid not null references public.rooms(id) on delete cascade,
  user_id       uuid not null references auth.users(id),
  ready         boolean not null default false,
  pending_offer jsonb,
  updated_at    timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.room_progress enable row level security;

drop policy if exists room_progress_select on public.room_progress;
create policy room_progress_select on public.room_progress
  for select using (
    exists (select 1 from public.room_members m where m.room_id = room_progress.room_id and m.user_id = auth.uid())
  );
-- Aucun insert/update direct : uniquement via room_report_season ci-dessous.


-- --- 2. RPC : barrière de fin de saison --------------------------------------
-- p_pending_offer : null (aucune fenêtre pour ce membre cette saison), ou
-- jsonb {"offers": ["clubId", ...], "forced": bool} — "forced" = contrat NON
-- renouvelé (pas d'option "rester" possible pour CE membre).
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
  -- Un vote (mercato ou narratif) est déjà ouvert : rien à faire, ce membre
  -- votera comme les autres — pas d'exception, l'appelant doit juste
  -- constater phase='season_vote' et basculer sur le vote existant.
  if not exists (select 1 from public.rooms where id = p_room_id and phase = 'in_season') then
    return;
  end if;

  insert into public.room_progress (room_id, user_id, ready, pending_offer, updated_at)
    values (p_room_id, auth.uid(), true, p_pending_offer, now())
  on conflict (room_id, user_id) do update
    set ready = true, pending_offer = excluded.pending_offer, updated_at = now();

  select count(*) into v_joined_count from public.room_members where room_id = p_room_id and status = 'joined';
  select count(*) into v_ready_count from public.room_progress
   where room_id = p_room_id and ready = true
     and user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined');
  if v_ready_count < v_joined_count then
    return; -- tout le monde n'a pas encore fini sa saison
  end if;

  select bool_or(jsonb_array_length(coalesce(pending_offer->'offers', '[]'::jsonb)) > 0)
    into v_any_offers
    from public.room_progress
   where room_id = p_room_id
     and user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined');

  if not coalesce(v_any_offers, false) then
    -- Personne n'a de fenêtre : tout le monde repart directement, sans vote.
    update public.room_progress set ready = false, pending_offer = null where room_id = p_room_id;
    update public.rooms set season_year = coalesce(season_year, 0) + 1 where id = p_room_id;
    return;
  end if;

  select bool_or(coalesce((pending_offer->>'forced')::boolean, false)) into v_forced
    from public.room_progress
   where room_id = p_room_id
     and user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined');

  select jsonb_agg(distinct clubid) into v_candidates
    from public.room_progress rp, jsonb_array_elements_text(coalesce(rp.pending_offer->'offers', '[]'::jsonb)) as clubid
   where rp.room_id = p_room_id
     and rp.user_id in (select user_id from public.room_members where room_id = p_room_id and status = 'joined');
  if not coalesce(v_forced, false) then
    v_candidates := coalesce(v_candidates, '[]'::jsonb) || to_jsonb(array['stay']);
  end if;

  update public.rooms set phase = 'season_vote' where id = p_room_id and phase = 'in_season';
  if not found then
    return; -- une course avec un vote narratif a déjà ouvert entre-temps
  end if;

  insert into public.room_votes (room_id, kind, candidates) values (p_room_id, 'transfer', v_candidates);
end;
$$;


-- --- 3. RPC : vote narratif immédiat (pas de barrière) -----------------------
-- Ouvert par UN SEUL membre, à n'importe quel moment de sa propre saison —
-- les autres le découvrent à leur prochain point de contact avec la salle.
create or replace function public.room_open_transfer_vote(p_room_id uuid, p_offers jsonb, p_forced boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidates jsonb;
  v_vote_id    uuid;
begin
  if not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = auth.uid() and status = 'joined'
  ) then
    raise exception 'not a joined member';
  end if;

  update public.rooms set phase = 'season_vote' where id = p_room_id and phase = 'in_season';
  if not found then
    return null; -- déjà un vote ouvert (mercato ou un autre narratif) : on le rejoint plutôt
  end if;

  v_candidates := coalesce(p_offers, '[]'::jsonb);
  if not coalesce(p_forced, false) then
    v_candidates := v_candidates || to_jsonb(array['stay']);
  end if;

  insert into public.room_votes (room_id, kind, candidates) values (p_room_id, 'transfer', v_candidates)
    returning id into v_vote_id;
  return v_vote_id;
end;
$$;


-- --- 4. Résolution : extension de room_maybe_resolve_vote (Phase B) ----------
-- Remplace la version de rooms-votes.sql : ajoute la branche 'transfer', qui
-- referme la barrière de saison (room_progress) pour armer le tour suivant.
create or replace function public.room_maybe_resolve_vote(p_vote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id      uuid;
  v_kind         text;
  v_joined_count int;
  v_ballot_count int;
  v_winner       text;
begin
  select room_id, kind into v_room_id, v_kind from public.room_votes where id = p_vote_id and status = 'open';
  if v_room_id is null then
    return;
  end if;

  select count(*) into v_joined_count from public.room_members where room_id = v_room_id and status = 'joined';
  select count(*) into v_ballot_count
    from public.room_ballots b
      join public.room_members m on m.room_id = v_room_id and m.user_id = b.user_id and m.status = 'joined'
   where b.vote_id = p_vote_id;
  if v_ballot_count < v_joined_count then
    return;
  end if;

  select choice into v_winner from (
    select b.choice, count(*) as n
      from public.room_ballots b
        join public.room_members m on m.room_id = v_room_id and m.user_id = b.user_id and m.status = 'joined'
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
  elsif v_kind = 'transfer' then
    update public.room_progress set ready = false, pending_offer = null where room_id = v_room_id;
    update public.rooms set phase = 'in_season', season_year = coalesce(season_year, 0) + 1 where id = v_room_id;
  end if;
end;
$$;


-- --- 5. Droits ------------------------------------------------------------
revoke all on function public.room_report_season(uuid, jsonb) from public;
revoke all on function public.room_open_transfer_vote(uuid, jsonb, boolean) from public;
grant execute on function public.room_report_season(uuid, jsonb) to authenticated;
grant execute on function public.room_open_transfer_vote(uuid, jsonb, boolean) to authenticated;
-- room_maybe_resolve_vote a déjà ses droits (posés dans rooms-votes.sql) ;
-- create or replace ne les retire pas, mais on les rejoue pour rester
-- idempotent même si ce fichier tourne seul sur une base neuve.
grant execute on function public.room_maybe_resolve_vote(uuid) to authenticated;


-- --- 6. Geste manuel : étendre la publication Realtime -----------------------
-- room_progress vient s'ajouter aux tables déjà publiées en Phase B :
--
--   alter publication supabase_realtime add table public.room_progress;
--
-- (si toute la publication a été configurée d'un coup après cette phase,
-- inclure room_progress dans la même commande que rooms.sql lignes 5)


-- --- 7. Contrôle ------------------------------------------------------------
-- select * from public.room_progress order by updated_at desc limit 20;
