-- ============================================================
--  Salles « carrière commune au même club » (jusqu'à 4 joueurs)
-- ============================================================
--  Phase A du chantier : schéma + cycle de vie du lobby (créer, inviter,
--  rejoindre, décliner, quitter). PAS de gameplay ici — le vote du club de
--  départ, la boucle de saison et le temps réel arrivent dans rooms-votes.sql
--  (Phase B et suivantes).
--
--  Convention du fichier friends-invites.sql : une salle se forme UNIQUEMENT
--  entre amis acceptés (table public.friends, déjà en place). created_by ne
--  donne AUCUN pouvoir particulier (pas de créateur-arbitre) — c'est une
--  simple trace de qui a initié la salle.
--
--  À exécuter dans l'éditeur SQL Supabase. Idempotent : relançable.
-- ============================================================

-- --- 1. Tables --------------------------------------------------------------
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  status      text not null default 'lobby',
  phase       text not null default 'profile_setup',
  created_by  uuid not null references auth.users(id),
  max_members smallint not null default 4,
  club_id     text,
  season_year int,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  ended_at    timestamptz
);

do $$ begin
  alter table public.rooms
    add constraint rooms_status_chk check (status in ('lobby', 'active', 'ended'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.rooms
    add constraint rooms_phase_chk check (phase in ('profile_setup', 'starting_vote', 'in_season', 'season_vote', 'ended'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.rooms
    add constraint rooms_max_members_chk check (max_members between 2 and 4);
exception when duplicate_object then null; end $$;

create table if not exists public.room_members (
  room_id       uuid not null references public.rooms(id) on delete cascade,
  user_id       uuid not null references auth.users(id),
  pseudo        text not null,
  status        text not null default 'invited',
  invited_by    uuid references auth.users(id),
  position_id   text,
  nationality_id text,
  joined_at     timestamptz,
  created_at    timestamptz not null default now(),
  primary key (room_id, user_id)
);

do $$ begin
  alter table public.room_members
    add constraint room_members_status_chk check (status in ('invited', 'joined', 'left', 'excluded'));
exception when duplicate_object then null; end $$;

-- Un joueur retrouve « sa » salle en cours sans balayer toute la table.
create index if not exists room_members_user_idx on public.room_members (user_id, status);


-- --- 2. RLS -------------------------------------------------------------------
-- Lecture directe autorisée (comme friends) ; toute ÉCRITURE passe par les RPC
-- SECURITY DEFINER ci-dessous (règles « max 4 », « doit être ami » plus sûres
-- en PL/pgSQL qu'en policy). Aucune policy insert/update/delete : la table
-- reste fermée en écriture directe, y compris pour son propre user_id.
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

-- Fonction d'appartenance, SECURITY DEFINER : une policy de room_members qui
-- sous-interroge room_members ELLE-MÊME déclenche "infinite recursion
-- detected in policy for relation room_members" (Postgres réapplique la même
-- policy à la sous-requête, indéfiniment). Le SECURITY DEFINER contourne le
-- problème : la fonction s'exécute avec les droits de son propriétaire, qui
-- n'est pas soumis à la RLS qu'il a lui-même écrite. Sans ce correctif,
-- TOUTE lecture de room_members/rooms échoue en silence côté client (l'erreur
-- est avalée par `if (error) return []`) — une salle créée semble ne "rien
-- faire ensuite" alors que l'écriture (via les RPC, déjà SECURITY DEFINER)
-- avait réussi.
create or replace function public.is_room_member(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = p_user_id
  );
$$;
revoke all on function public.is_room_member(uuid, uuid) from public;
grant execute on function public.is_room_member(uuid, uuid) to authenticated;

-- Un seul salle ACTIVE à la fois par joueur (lobby ou en cours — pas
-- 'ended', qui ne bloque plus rien) : on ne peut pas en créer ou en rejoindre
-- une seconde tant que la précédente n'est pas terminée ou quittée.
create or replace function public.has_active_room(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.room_members m
      join public.rooms r on r.id = m.room_id
     where m.user_id = p_user_id and m.status = 'joined' and r.status <> 'ended'
  );
$$;
revoke all on function public.has_active_room(uuid) from public;
grant execute on function public.has_active_room(uuid) to authenticated;

drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
  for select using (public.is_room_member(id));

drop policy if exists room_members_select on public.room_members;
create policy room_members_select on public.room_members
  for select using (public.is_room_member(room_id));


-- --- 3. RPC : cycle de vie du lobby -------------------------------------------

-- Crée la salle et y place immédiatement le créateur (déjà 'joined').
create or replace function public.room_create()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_pseudo  text;
begin
  if public.has_active_room(auth.uid()) then
    raise exception 'already in an active room';
  end if;
  select pseudo into v_pseudo from public.profiles where user_id = auth.uid();
  insert into public.rooms (created_by) values (auth.uid()) returning id into v_room_id;
  insert into public.room_members (room_id, user_id, pseudo, status, invited_by, joined_at)
    values (v_room_id, auth.uid(), coalesce(v_pseudo, 'Joueur'), 'joined', auth.uid(), now());
  return v_room_id;
end;
$$;

-- Invite un AMI ACCEPTÉ (dans un sens ou l'autre) dans une salle où on est
-- soi-même déjà 'joined', tant qu'il reste de la place. Ré-invite proprement
-- un ancien membre parti/exclu (on ne duplique jamais la ligne, cf. la clé
-- primaire (room_id, user_id)).
create or replace function public.room_invite(p_room_id uuid, p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pseudo text;
  v_taken  int;
  v_max    smallint;
begin
  if not exists (
    select 1 from public.room_members where room_id = p_room_id and user_id = auth.uid() and status = 'joined'
  ) then
    raise exception 'not a member of this room';
  end if;

  if not exists (
    select 1 from public.friends
     where status = 'accepted'
       and ((user_id = auth.uid() and friend_id = p_friend_id) or (user_id = p_friend_id and friend_id = auth.uid()))
  ) then
    raise exception 'not friends';
  end if;

  select max_members into v_max from public.rooms where id = p_room_id;
  select count(*) into v_taken from public.room_members
   where room_id = p_room_id and status in ('joined', 'invited');
  if v_taken >= v_max then
    raise exception 'room full';
  end if;

  select pseudo into v_pseudo from public.profiles where user_id = p_friend_id;
  insert into public.room_members (room_id, user_id, pseudo, status, invited_by)
    values (p_room_id, p_friend_id, coalesce(v_pseudo, 'Joueur'), 'invited', auth.uid())
  on conflict (room_id, user_id) do update
    set status = 'invited', invited_by = excluded.invited_by, pseudo = excluded.pseudo
    where room_members.status in ('left', 'excluded');
end;
$$;

-- Accepte une invitation reçue.
create or replace function public.room_join(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.has_active_room(auth.uid()) then
    raise exception 'already in an active room';
  end if;
  update public.room_members
     set status = 'joined', joined_at = now()
   where room_id = p_room_id and user_id = auth.uid() and status = 'invited';
  if not found then
    raise exception 'no pending invitation';
  end if;
end;
$$;

-- Décline une invitation reçue : la ligne disparaît (comme declineRequest côté
-- amis) — un refus ne laisse pas de trace, contrairement à un départ après
-- avoir rejoint (cf. room_leave, qui GARDE la ligne en 'left').
create or replace function public.room_decline(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.room_members
   where room_id = p_room_id and user_id = auth.uid() and status = 'invited';
end;
$$;

-- Quitte une salle déjà rejointe. La ligne est GARDÉE en 'left' (pas de
-- delete) : les phases suivantes (progression de saison, historique de fin de
-- salle) ont besoin de savoir qui est parti, pas seulement qu'il n'est plus là.
create or replace function public.room_leave(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.room_members
     set status = 'left'
   where room_id = p_room_id and user_id = auth.uid() and status = 'joined';
end;
$$;


-- --- 4. Droits ------------------------------------------------------------
revoke all on function public.room_create() from public;
revoke all on function public.room_invite(uuid, uuid) from public;
revoke all on function public.room_join(uuid) from public;
revoke all on function public.room_decline(uuid) from public;
revoke all on function public.room_leave(uuid) from public;
grant execute on function public.room_create() to authenticated;
grant execute on function public.room_invite(uuid, uuid) to authenticated;
grant execute on function public.room_join(uuid) to authenticated;
grant execute on function public.room_decline(uuid) to authenticated;
grant execute on function public.room_leave(uuid) to authenticated;


-- --- 5. Contrôle ------------------------------------------------------------
-- select * from public.rooms order by created_at desc limit 10;
-- select * from public.room_members order by created_at desc limit 20;
