-- ============================================================
--  Salles : vote du club de départ + temps réel (Phase B)
-- ============================================================
--  Suite de rooms.sql (Phase A, cycle de vie du lobby). Ici : chaque membre
--  soumet SES propositions de club (issues de son propre profil — origine,
--  hygiène de vie, entourage — comme en solo), la salle ouvre un vote sur
--  l'UNION de toutes les propositions, résolu à la majorité (égalité →
--  tirage aléatoire, une seule fois, côté serveur). La résolution fait
--  basculer la salle en 'active' avec le club gagnant.
--
--  À exécuter dans l'éditeur SQL Supabase, APRÈS rooms.sql. Idempotent.
-- ============================================================

-- --- 1. Colonne + tables ------------------------------------------------------
-- Propositions de CE membre (2-3 clubIds, comme E.academyOffers côté client).
-- null tant qu'il n'a pas encore configuré son profil.
alter table public.room_members
  add column if not exists starting_offers jsonb;

create table if not exists public.room_votes (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  kind       text not null,
  candidates jsonb not null,
  status     text not null default 'open',
  result     jsonb,
  opened_at  timestamptz not null default now(),
  closed_at  timestamptz
);

do $$ begin
  alter table public.room_votes
    add constraint room_votes_kind_chk check (kind in ('starting_club', 'transfer', 'follow_relocation', 'kick'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.room_votes
    add constraint room_votes_status_chk check (status in ('open', 'closed'));
exception when duplicate_object then null; end $$;

create index if not exists room_votes_room_idx on public.room_votes (room_id, status);

create table if not exists public.room_ballots (
  vote_id uuid not null references public.room_votes(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  choice  text not null,
  cast_at timestamptz not null default now(),
  primary key (vote_id, user_id)
);


-- --- 2. RLS -------------------------------------------------------------------
-- Même principe que rooms.sql : lecture directe pour les membres de la salle,
-- toute écriture passe par les RPC SECURITY DEFINER ci-dessous.
alter table public.room_votes enable row level security;
alter table public.room_ballots enable row level security;

drop policy if exists room_votes_select on public.room_votes;
create policy room_votes_select on public.room_votes
  for select using (
    exists (select 1 from public.room_members m where m.room_id = room_votes.room_id and m.user_id = auth.uid())
  );

drop policy if exists room_ballots_select on public.room_ballots;
create policy room_ballots_select on public.room_ballots
  for select using (
    exists (
      select 1 from public.room_votes v
        join public.room_members m on m.room_id = v.room_id and m.user_id = auth.uid()
       where v.id = room_ballots.vote_id
    )
  );


-- --- 3. RPC ---------------------------------------------------------------

-- Chaque membre envoie SES propositions (générées côté client par
-- E.academyOffers, selon SON profil) — plafonné pour éviter tout abus, aucune
-- vérification que les clubId existent réellement (cf. compromis « pas de
-- vérification serveur du moteur en v1 », déjà assumé pour tout le mode).
create or replace function public.room_submit_starting_offers(p_room_id uuid, p_offers jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(p_offers) <> 'array' or jsonb_array_length(p_offers) = 0 or jsonb_array_length(p_offers) > 6 then
    raise exception 'invalid offers';
  end if;
  update public.room_members
     set starting_offers = p_offers
   where room_id = p_room_id and user_id = auth.uid() and status = 'joined';
  if not found then
    raise exception 'not a joined member';
  end if;
end;
$$;

-- Ouvre le vote une fois que TOUS les membres 'joined' ont soumis leurs
-- propositions : candidats = union (sans doublon) de toutes les offres.
-- Le update gardé (phase='profile_setup' -> 'starting_vote') sert de verrou
-- de concurrence : si deux clients appellent en même temps, un seul ouvre le
-- vote, l'autre échoue proprement au lieu de créer un second vote.
create or replace function public.room_open_starting_vote(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missing    int;
  v_candidates jsonb;
  v_vote_id    uuid;
begin
  if not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = auth.uid() and status = 'joined'
  ) then
    raise exception 'not a member of this room';
  end if;

  select count(*) into v_missing from public.room_members
   where room_id = p_room_id and status = 'joined' and starting_offers is null;
  if v_missing > 0 then
    raise exception 'not everyone has submitted their offers yet';
  end if;

  update public.rooms set phase = 'starting_vote' where id = p_room_id and phase = 'profile_setup';
  if not found then
    raise exception 'vote already opened';
  end if;

  select jsonb_agg(distinct clubid) into v_candidates
    from public.room_members rm, jsonb_array_elements_text(rm.starting_offers) as clubid
   where rm.room_id = p_room_id and rm.status = 'joined';

  insert into public.room_votes (room_id, kind, candidates)
    values (p_room_id, 'starting_club', v_candidates)
    returning id into v_vote_id;

  return v_vote_id;
end;
$$;

-- Révision : le club de départ n'est PLUS soumis à un vote à plusieurs
-- candidats (room_submit_starting_offers/room_open_starting_vote ci-dessus
-- restent en base, mais le client ne les appelle plus) — trop de points de
-- blocage possibles à tester à 2-4. SEUL le créateur choisit, et son choix
-- s'applique directement à toute la salle : un geste, une décision, personne
-- n'attend personne pour démarrer.
create or replace function public.room_launch(p_room_id uuid, p_club_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.rooms where id = p_room_id and created_by = auth.uid() and phase = 'profile_setup'
  ) then
    raise exception 'only the room creator can launch, and only before it has started';
  end if;
  update public.rooms
     set club_id = p_club_id, status = 'active', phase = 'in_season', started_at = now()
   where id = p_room_id and phase = 'profile_setup';
  if not found then
    raise exception 'room already launched';
  end if;
end;
$$;
revoke all on function public.room_launch(uuid, text) from public;
grant execute on function public.room_launch(uuid, text) to authenticated;

-- Vote/change de vote (upsert) tant que le scrutin est ouvert, puis tente
-- immédiatement la résolution — la plupart des votes se règlent donc au
-- dernier bulletin, sans appel séparé.
create or replace function public.room_cast_vote(p_vote_id uuid, p_choice text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
begin
  select room_id into v_room_id from public.room_votes where id = p_vote_id and status = 'open';
  if v_room_id is null then
    raise exception 'vote not open';
  end if;
  if not exists (
    select 1 from public.room_members where room_id = v_room_id and user_id = auth.uid() and status = 'joined'
  ) then
    raise exception 'not a joined member';
  end if;
  insert into public.room_ballots (vote_id, user_id, choice)
    values (p_vote_id, auth.uid(), p_choice)
  on conflict (vote_id, user_id) do update set choice = excluded.choice, cast_at = now();
  perform public.room_maybe_resolve_vote(p_vote_id);
end;
$$;

-- Résout le vote si TOUS les membres actuellement 'joined' ont voté (un
-- membre exclu/parti entre-temps sort du dénominateur). Majorité ; égalité →
-- tirage aléatoire (order by n desc, random() limit 1), une seule fois — le
-- update gardé (status='open' -> 'closed') empêche deux résolutions
-- concurrentes d'appliquer chacune un gagnant différent : la seconde échoue
-- silencieusement sur le update (0 ligne touchée), son résultat calculé est
-- jeté sans jamais être écrit.
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
    return; -- déjà résolu, ou vote inexistant
  end if;

  select count(*) into v_joined_count from public.room_members where room_id = v_room_id and status = 'joined';
  select count(*) into v_ballot_count
    from public.room_ballots b
      join public.room_members m on m.room_id = v_room_id and m.user_id = b.user_id and m.status = 'joined'
   where b.vote_id = p_vote_id;
  if v_ballot_count < v_joined_count then
    return; -- tout le monde n'a pas encore voté
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
    return; -- une autre exécution concurrente a déjà résolu ce vote
  end if;

  if v_kind = 'starting_club' then
    update public.rooms
       set club_id = v_winner, status = 'active', phase = 'in_season', started_at = now()
     where id = v_room_id;
  end if;
end;
$$;


-- --- 4. Droits ------------------------------------------------------------
revoke all on function public.room_submit_starting_offers(uuid, jsonb) from public;
revoke all on function public.room_open_starting_vote(uuid) from public;
revoke all on function public.room_cast_vote(uuid, text) from public;
revoke all on function public.room_maybe_resolve_vote(uuid) from public;
grant execute on function public.room_submit_starting_offers(uuid, jsonb) to authenticated;
grant execute on function public.room_open_starting_vote(uuid) to authenticated;
grant execute on function public.room_cast_vote(uuid, text) to authenticated;
grant execute on function public.room_maybe_resolve_vote(uuid) to authenticated;


-- --- 5. ⚠️ Geste manuel obligatoire : activer le temps réel -----------------
-- Sans cette ligne, room.js fonctionne quand même (il re-sonde toutes les
-- 5 secondes tant qu'une salle est affichée) mais rien n'est instantané.
-- Aucune erreur si oubliée : postgres_changes ne se déclenche juste jamais.
--
--   alter publication supabase_realtime add table
--     public.rooms, public.room_members, public.room_votes, public.room_ballots;
--
-- Vérifier ensuite : select * from pg_publication_tables where pubname = 'supabase_realtime';


-- --- 6. Contrôle ------------------------------------------------------------
-- select * from public.room_votes order by opened_at desc limit 10;
-- select * from public.room_ballots order by cast_at desc limit 20;
