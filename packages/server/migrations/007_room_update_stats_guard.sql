-- Salles : écrire ses stats en direct refuse désormais explicitement un non-membre.
--
-- L'ancienne version filtrait l'UPDATE par (salle, moi, 'joined') : un appel d'un
-- non-membre ne touchait aucune ligne mais renvoyait void (HTTP 200). Aucune donnée
-- ne traversait, mais ce silence était incohérent avec les autres fonctions de salle
-- (qui lèvent une exception) et pouvait masquer un bug côté client. On lève maintenant
-- comme les autres : seul un membre « joined » peut écrire, et seulement sa ligne.
create or replace function room_update_stats(p_room_id uuid, p_stats jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from room_members where room_id = p_room_id and user_id = app_user_id() and status = 'joined'
  ) then
    raise exception 'not a joined member';
  end if;
  update room_members
     set live_stats = p_stats
   where room_id = p_room_id and user_id = app_user_id() and status = 'joined';
end;
$function$;
