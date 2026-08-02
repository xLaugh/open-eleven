-- ============================================================
--  Profil complet, réservé aux AMIS
-- ============================================================
--  Deux niveaux de lecture, volontairement distincts :
--
--   public_profile(pseudo)  — la vitrine. Ouverte à quiconque connaît un
--                             pseudo : classement, meilleure carrière, compteurs.
--                             Inchangée par ce script.
--
--   friend_profile(pseudo)  — le profil COMPLET : le Panthéon partagé (les 10
--                             meilleures carrières). Renvoie zéro ligne si le
--                             demandeur n'est pas un ami ACCEPTÉ de la cible.
--
--  Le filtrage se fait DANS la base, pas dans le jeu : un client modifié ne
--  peut pas contourner la vérification d'amitié.
--
--  À exécuter dans l'éditeur SQL Supabase. Idempotent : relançable.
-- ============================================================

create or replace function public.friend_profile(p_pseudo text)
returns table (pseudo text, stats jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  cible uuid;
  moi   uuid := auth.uid();
begin
  if moi is null then return; end if;               -- non connecté : rien
  select pr.user_id into cible
    from public.profiles pr
   where lower(pr.pseudo) = lower(p_pseudo)
   limit 1;
  if cible is null then return; end if;

  -- Soi-même, ou une amitié ACCEPTÉE dans un sens OU dans l'autre. L'amitié est
  -- réciproque à l'acceptation, mais on teste les deux sens : une base reprise
  -- d'avant les invitations pourrait n'avoir que la ligne d'un côté.
  if cible <> moi and not exists (
    select 1 from public.friends f
     where f.status = 'accepted'
       and ((f.user_id = moi and f.friend_id = cible)
         or (f.user_id = cible and f.friend_id = moi))
  ) then
    return;                                          -- pas ami : zéro ligne
  end if;

  return query
    select pr.pseudo, pr.stats
      from public.profiles pr
     where pr.user_id = cible;
end;
$$;

-- --- Droits ----------------------------------------------------------------
-- Réservé aux comptes connectés : `anon` n'a aucune amitié, l'appel serait
-- toujours vide, autant ne pas l'exposer.
revoke all on function public.friend_profile(text) from public;
grant execute on function public.friend_profile(text) to authenticated;

-- --- Contrôle --------------------------------------------------------------
-- Depuis le jeu, connecté :
--   select * from public.friend_profile('PseudoDUnAmi');   -- 1 ligne
--   select * from public.friend_profile('PseudoDUnInconnu'); -- 0 ligne
