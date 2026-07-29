-- ============================================================
--  GÉNÉRÉ par tools/gen-badwords.js depuis src/badwords.js.
--  NE PAS ÉDITER À LA MAIN : modifie src/badwords.js puis régénère
--    node tools/gen-badwords.js
--  puis relance ce fichier dans Supabase (SQL Editor).
--  161 termes · correspondance en MOT ENTIER, insensible à la casse.
-- ============================================================
create or replace function public.check_pseudo() returns trigger language plpgsql as $$
begin
  -- Teste le pseudo brut (attrape les mots accentués entiers) ET une version où
  -- les séparateurs (_ - . chiffres) deviennent des espaces (attrape « x_nazi_x »).
  if new.pseudo ~* '\m(con|conne|connard|connasse|conard|conasse|salaud|salop|salope|salopard|salaupe|pute|putain|pouffiasse|poufiasse|pétasse|petasse|enculé|encule|enculer|enculee|enculés|niquer|nique|niquez|niker|fdp|ntm|tg|tafiole|tapette|tarlouze|tarlouse|merde|merdeux|merdique|chier|chiotte|batard|bâtard|batards|connerie|couille|couilles|bite|bites|zboub|teub|chatte|foutre|pd|pédé|pede|pedale|pédale|gouine|sucemabite|ntmr|fils2pute|negre|nègre|negro|bougnoule|bougnol|bicot|youpin|youpine|feuj|raton|chinetoque|niakoué|niakoue|sale arabe|sale juif|sale noir|sale blanc|fuck|fucker|fucking|motherfucker|fuk|fck|shit|bullshit|shitty|asshole|arsehole|ass|bitch|bastard|dick|dickhead|cock|pussy|cunt|twat|wanker|prick|slut|whore|hoe|bollocks|bugger|damn|crap|nigger|nigga|nigg|faggot|fag|retard|retarded|chink|spic|kike|coon|wetback|tranny|dyke|gook|paki|beaner|porn|porno|sex|sexe|boobs|penis|vagina|anal|blowjob|handjob|creampie|hentai|rape|raped|rapist|viol|violeur|nazi|nazism|hitler|heil|kkk|isis|daesh|jihad|genocide|genocidaire|terroriste|puta|mierda|cabron|cabrón|pendejo|coño|cono|gilipollas|maricon|maricón|joder)\M'
     or regexp_replace(lower(new.pseudo), '[^a-z0-9]+', ' ', 'g') ~* '\m(con|conne|connard|connasse|conard|conasse|salaud|salop|salope|salopard|salaupe|pute|putain|pouffiasse|poufiasse|pétasse|petasse|enculé|encule|enculer|enculee|enculés|niquer|nique|niquez|niker|fdp|ntm|tg|tafiole|tapette|tarlouze|tarlouse|merde|merdeux|merdique|chier|chiotte|batard|bâtard|batards|connerie|couille|couilles|bite|bites|zboub|teub|chatte|foutre|pd|pédé|pede|pedale|pédale|gouine|sucemabite|ntmr|fils2pute|negre|nègre|negro|bougnoule|bougnol|bicot|youpin|youpine|feuj|raton|chinetoque|niakoué|niakoue|sale arabe|sale juif|sale noir|sale blanc|fuck|fucker|fucking|motherfucker|fuk|fck|shit|bullshit|shitty|asshole|arsehole|ass|bitch|bastard|dick|dickhead|cock|pussy|cunt|twat|wanker|prick|slut|whore|hoe|bollocks|bugger|damn|crap|nigger|nigga|nigg|faggot|fag|retard|retarded|chink|spic|kike|coon|wetback|tranny|dyke|gook|paki|beaner|porn|porno|sex|sexe|boobs|penis|vagina|anal|blowjob|handjob|creampie|hentai|rape|raped|rapist|viol|violeur|nazi|nazism|hitler|heil|kkk|isis|daesh|jihad|genocide|genocidaire|terroriste|puta|mierda|cabron|cabrón|pendejo|coño|cono|gilipollas|maricon|maricón|joder)\M' then
    raise exception 'pseudo_forbidden';
  end if;
  return new;
end $$;

drop trigger if exists trg_check_pseudo on public.profiles;
create trigger trg_check_pseudo before insert or update of pseudo on public.profiles
  for each row execute function public.check_pseudo();
