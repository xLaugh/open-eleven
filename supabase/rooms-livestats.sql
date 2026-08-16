-- ============================================================
--  Salles : statistiques en direct entre membres
-- ============================================================
--  Chaque membre publie un petit instantané de SA carrière (club, âge, buts
--  de la saison, buts en carrière...) après chaque saison jouée — pas de
--  vérification serveur (même compromis assumé que le reste du mode : v1
--  100% client-trust). Permet un tableau de comparaison en direct dans
--  l'overlay 🏟️ Salle, sans attendre la fin de la carrière (contrairement à
--  final_score/final_summary, posés une seule fois par room_mark_career_ended).
--
--  À exécuter dans l'éditeur SQL Supabase, après les fichiers précédents.
--  Idempotent.
-- ============================================================

alter table public.room_members add column if not exists live_stats jsonb;

-- p_stats : objet compact construit côté client (voir game.js) — nom, club,
-- niveau, pays, âge, buts/passes de la saison et de la carrière, note. Aucun
-- champ n'est interprété ni vérifié ici, juste stocké tel quel.
create or replace function public.room_update_stats(p_room_id uuid, p_stats jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.room_members
     set live_stats = p_stats
   where room_id = p_room_id and user_id = auth.uid() and status = 'joined';
end;
$$;

revoke all on function public.room_update_stats(uuid, jsonb) from public;
grant execute on function public.room_update_stats(uuid, jsonb) to authenticated;

-- Contrôle :
-- select pseudo, live_stats from public.room_members where room_id = '<id>';
