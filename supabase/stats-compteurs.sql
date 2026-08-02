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

-- ⚠️ La colonne s'appelle `nom`, PAS `cle`. Le paramètre de bump_stat() est
-- nommé `cle` (imposé par le client, qui envoie {"cle": "..."}), et PL/pgSQL
-- ne sait pas trancher entre une variable et une colonne de même nom :
-- « 42702 column reference "cle" is ambiguous », et l'insertion échoue.
-- Ne renommez pas cette colonne en `cle`.
create table if not exists public.stats_totaux (
  nom    text primary key,
  valeur bigint not null default 0,
  maj    timestamptz not null default now()
);

-- Reprise d'une installation antérieure qui avait la colonne mal nommée.
do $$ begin
  alter table public.stats_totaux rename column cle to nom;
exception when undefined_column then null; end $$;

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
  insert into public.stats_totaux (nom, valeur) values (cle, 1)
  on conflict (nom) do update set valeur = stats_totaux.valeur + 1, maj = now();
end;
$$;

-- --- Lecture ---------------------------------------------------------------
create or replace function public.stats_publiques()
returns table (cle text, valeur bigint)
language sql
security definer
stable
set search_path = public
-- La colonne renvoyée s'appelle `cle` : c'est ce que lit le jeu. Seul le
-- stockage utilise `nom`, pour éviter la collision décrite plus haut.
as $$ select s.nom as cle, s.valeur from public.stats_totaux s $$;

-- --- Droits ----------------------------------------------------------------
-- `public` inclut tous les rôles : on retire d'abord, on donne ensuite, pour
-- ne pas laisser un droit hérité plus large que voulu.
revoke all on function public.bump_stat(text) from public;
revoke all on function public.stats_publiques() from public;
grant execute on function public.bump_stat(text) to anon, authenticated;
grant execute on function public.stats_publiques() to anon, authenticated;

-- --- Amorçage : récupérer les carrières d'AVANT le compteur -----------------
-- profiles.stats->>'careers' n'est PAS « les carrières depuis le compteur » :
-- c'est le TOTAL À VIE du joueur, que le navigateur calcule ainsi —
--   careers = max(entrées du Panthéon, progress.careersPlayed)
-- Un joueur avec 30 carrières derrière lui y vaut donc 30, même si le compteur
-- n'en a vu qu'une seule.
--
-- 1. Regardez d'abord le chiffre :
--
--   select count(*) as joueurs,
--          coalesce(sum((stats->>'careers')::int), 0) as carrieres
--   from public.profiles;
--
-- 2. Puis appliquez-le. REMPLACE la valeur, et c'est voulu : les carrières
--    déjà comptées par le compteur appartiennent aux mêmes joueurs, donc
--    additionner les compterait DEUX FOIS.
--
--   insert into public.stats_totaux (nom, valeur)
--   select 'career_created', coalesce(sum((stats->>'careers')::int), 0) from public.profiles
--   on conflict (nom) do update set valeur = excluded.valeur, maj = now();
--
-- ⚠️ À NE LANCER QU'UNE FOIS. Ensuite chaque carrière ajoute +1 ; rejouer ce
--    bloc plus tard écraserait tous ces incréments, y compris ceux des joueurs
--    SANS compte — les seuls que profiles ne connaîtra jamais.

-- --- Contrôle --------------------------------------------------------------
-- select * from public.stats_totaux order by valeur desc;
-- select public.bump_stat('career_created');   -- doit passer sans erreur
