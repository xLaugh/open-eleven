/* ============================================================
   Génère supabase/badwords.sql (trigger de modération des pseudos)
   à partir de la liste UNIQUE src/badwords.js.
   Lancer :  node tools/gen-badwords.js
   Puis coller/relancer supabase/badwords.sql dans le SQL Editor Supabase.
   ============================================================ */
const fs = require("fs");
const path = require("path");

const LIST = require(path.join(__dirname, "..", "src", "badwords.js"));
const uniq = [...new Set(LIST.map((w) => String(w).trim().toLowerCase()).filter(Boolean))];

// Échappe les métacaractères regex ; l'alternance est bornée en MOT ENTIER (\m…\M).
const escRe = (w) => w.replace(/[.^$*+?()[\]{}|\\]/g, "\\$&");
const pattern = "\\m(" + uniq.map(escRe).join("|") + ")\\M";
const sqlPattern = pattern.replace(/'/g, "''"); // échappe les quotes pour la string SQL

const sql = `-- ============================================================
--  GÉNÉRÉ par tools/gen-badwords.js depuis src/badwords.js.
--  NE PAS ÉDITER À LA MAIN : modifie src/badwords.js puis régénère
--    node tools/gen-badwords.js
--  puis relance ce fichier dans Supabase (SQL Editor).
--  ${uniq.length} termes · correspondance en MOT ENTIER, insensible à la casse.
-- ============================================================
create or replace function public.check_pseudo() returns trigger language plpgsql as $$
begin
  -- Teste le pseudo brut (attrape les mots accentués entiers) ET une version où
  -- les séparateurs (_ - . chiffres) deviennent des espaces (attrape « x_nazi_x »).
  if new.pseudo ~* '${sqlPattern}'
     or regexp_replace(lower(new.pseudo), '[^a-z0-9]+', ' ', 'g') ~* '${sqlPattern}' then
    raise exception 'pseudo_forbidden';
  end if;
  return new;
end $$;

drop trigger if exists trg_check_pseudo on public.profiles;
create trigger trg_check_pseudo before insert or update of pseudo on public.profiles
  for each row execute function public.check_pseudo();
`;

const out = path.join(__dirname, "..", "supabase", "badwords.sql");
fs.writeFileSync(out, sql);
console.log("Écrit " + out + " (" + uniq.length + " termes)");
