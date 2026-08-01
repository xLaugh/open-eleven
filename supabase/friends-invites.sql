-- ============================================================
--  Demandes d'amis : passage du « suivi » unilatéral à l'invitation
-- ============================================================
--  Avant : ajouter un pseudo créait le lien immédiatement. La personne
--  n'était jamais prévenue et n'avait rien à accepter.
--  Après : la ligne naît en 'pending' ; seule la CIBLE peut la passer en
--  'accepted', et l'acceptation crée le lien réciproque.
--
--  À exécuter dans l'éditeur SQL Supabase. Idempotent : relançable.
-- ============================================================

-- --- 1. La colonne de statut ---------------------------------------------
-- Le défaut 'accepted' à la création BACKFILLE les liens existants : ce sont
-- de vraies relations, elles ne doivent pas retomber en attente.
alter table public.friends
  add column if not exists status text not null default 'accepted';

-- Puis on bascule le défaut : un client au cache périmé qui insère sans
-- statut crée désormais une demande, pas un ami silencieux.
alter table public.friends alter column status set default 'pending';

do $$ begin
  alter table public.friends
    add constraint friends_status_chk check (status in ('pending', 'accepted'));
exception when duplicate_object then null; end $$;

-- Les demandes reçues se cherchent par friend_id : sans cet index, chaque
-- ouverture du panneau balaierait la table.
create index if not exists friends_incoming_idx on public.friends (friend_id, status);


-- --- 2. RLS ---------------------------------------------------------------
alter table public.friends enable row level security;

-- OBLIGATOIRE : sans le « or friend_id = auth.uid() », les demandes reçues
-- sont invisibles et l'onglet « Gérer » reste désespérément vide.
drop policy if exists friends_select on public.friends;
create policy friends_select on public.friends
  for select using (user_id = auth.uid() or friend_id = auth.uid());

-- On n'invite qu'en son propre nom.
drop policy if exists friends_insert on public.friends;
create policy friends_insert on public.friends
  for insert with check (user_id = auth.uid());

-- Seule la cible accepte, et seulement vers 'accepted' : on ne peut pas
-- s'auto-accepter une demande qu'on a envoyée.
drop policy if exists friends_update on public.friends;
create policy friends_update on public.friends
  for update using (friend_id = auth.uid())
  with check (friend_id = auth.uid() and status = 'accepted');

-- Chacun des deux côtés peut couper : refuser, annuler, ou retirer un ami.
drop policy if exists friends_delete on public.friends;
create policy friends_delete on public.friends
  for delete using (user_id = auth.uid() or friend_id = auth.uid());


-- --- 3. ⚠️ LES DEUX RPC DE CLASSEMENT ------------------------------------
-- friends_daily et friends_range agrègent la table friends. Tant qu'elles
-- ignorent le statut, les personnes SIMPLEMENT INVITÉES apparaissent dans le
-- classement — l'inverse exact de ce que corrige cette migration.
--
-- Affiche leur définition actuelle :
--
--   select p.proname, pg_get_functiondef(p.oid)
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('friends_daily', 'friends_range');
--
-- puis, dans chacune, ajouter la condition sur le join de `friends` :
--
--   ... from public.friends f
--       where f.user_id = auth.uid()
--         and f.status = 'accepted'      -- <== la ligne à ajouter
--
-- et rejouer le CREATE OR REPLACE FUNCTION obtenu.


-- --- 4. Contrôle ----------------------------------------------------------
-- select status, count(*) from public.friends group by status;
