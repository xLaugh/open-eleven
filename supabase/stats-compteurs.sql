-- ============================================================
--  Compteurs communautaires anonymes
-- ============================================================
--  Des totaux agrégés, et RIEN d'autre : aucun identifiant, aucune adresse IP,
--  aucune donnée personnelle, aucun cookie. Une seule ligne par compteur.
--
--  Objectif : afficher « N carrières jouées » en page d'accueil, et savoir ce
--  que font réellement les joueurs — y compris ceux qui n'ont pas de compte,
--  invisibles dans la table profiles.
--
--  À exécuter dans l'éditeur SQL Supabase. Idempotent : relançable.
-- ============================================================

create table if not exists public.stats_totaux (
  cle    text primary key,
  valeur bigint not null default 0,
  maj    timestamptz not null default now()
);

-- La table n'est JAMAIS accessible directement : RLS active et aucune policy.
-- Seules les deux fonctions ci-dessous y touchent, en SECURITY DEFINER.
-- Sans ça, n'importe qui pourrait écrire la valeur de son choix au lieu de
-- l'incrémenter de 1.
alter table public.stats_totaux enable row level security;

-- --- Incrémentation --------------------------------------------------------
-- Liste blanche : une clé inconnue est ignorée SANS erreur. Le client n'a donc
-- aucun moyen de créer des compteurs arbitraires, et une faute de frappe côté
-- jeu ne pollue pas la table.
create or replace function public.bump_stat(cle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if cle not in ('career_created', 'career_end', 'daily_completed', 'duel_created', 'story_completed') then
    return;
  end if;
  insert into public.stats_totaux (cle, valeur) values (cle, 1)
  on conflict (cle) do update set valeur = stats_totaux.valeur + 1, maj = now();
end;
$$;

-- --- Lecture ---------------------------------------------------------------
create or replace function public.stats_publiques()
returns table (cle text, valeur bigint)
language sql
security definer
stable
set search_path = public
as $$ select s.cle, s.valeur from public.stats_totaux s $$;

-- --- Droits ----------------------------------------------------------------
-- `public` inclut tous les rôles : on retire d'abord, on donne ensuite, pour
-- ne pas laisser un droit hérité plus large que voulu.
revoke all on function public.bump_stat(text) from public;
revoke all on function public.stats_publiques() from public;
grant execute on function public.bump_stat(text) to anon, authenticated;
grant execute on function public.stats_publiques() to anon, authenticated;

-- --- Amorçage (facultatif) -------------------------------------------------
-- Les carrières déjà jouées par les joueurs INSCRITS sont connues : profiles
-- porte un champ stats->>'careers'. On peut en partir plutôt que de repartir
-- de zéro. Attention : ce total ignore les joueurs sans compte.
--
--   insert into public.stats_totaux (cle, valeur)
--   select 'career_created', coalesce(sum((stats->>'careers')::int), 0) from public.profiles
--   on conflict (cle) do update set valeur = excluded.valeur, maj = now();

-- --- Contrôle --------------------------------------------------------------
-- select * from public.stats_totaux order by valeur desc;
