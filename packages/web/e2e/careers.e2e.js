// Historique des carrières du compte, par l'interface réelle : une carrière jouée en
// invité rejoint le compte à l'inscription, celles jouées connecté y partent à la fin,
// et le Panthéon les montre (filtres, favorite, fiche complète, suppression, anglais).
// Demande la pile complète (E2E_URL) : serveur + base.
import { finishCareer, flat, resetStorage, signUp, startCareer, wait } from "./lib.js";

export const meta = { title: "Historique des carrières du compte", needs: ["stack"] };

const tag = Date.now().toString(36);
const total = "window.OpenElevenAccount.listCareers().then(r => r.data ? r.data.total : -1)";
const cards = "document.querySelectorAll('#pantheon-list .pantheon-card').length";

/** Joue une carrière jusqu'à la fiche finale, puis revient à l'accueil. */
async function playOne(page) {
  const started = await startCareer(page);
  const done = started && await finishCareer(page);
  await page.click("#btn-replay");
  await wait(600);
  return done;
}
async function openPantheon(page) {
  await page.click("#btn-pantheon");
  return page.until("document.querySelector('.screen.active').id === 'screen-pantheon'");
}

export async function run({ browser, stackUrl, mailpit, report }) {
  const page = await browser.newPage(stackUrl + "/", { name: "historique" });
  await resetStorage(page, "fr");

  report.section("En invité");
  report.check("une carrière jouée sans compte", await playOne(page));
  await openPantheon(page);
  report.check("le Panthéon de l'appareil la montre", (await page.js(cards)) === 1);
  report.check("et invite à se connecter pour tout garder", /Connectez-vous pour garder toutes vos carrières/.test(await page.text("#pantheon-list")));
  report.check("pas de bascule appareil / compte sans compte", await page.js("document.getElementById('pantheon-source').hidden"));
  const entry = JSON.parse(await page.js("localStorage.getItem('destinDeChampion_pantheon')"))[0];
  report.check("la carrière porte un identifiant et son mode", !!entry.id && entry.mode === "career", JSON.stringify({ id: entry.id, mode: entry.mode }));
  await page.click("#btn-pantheon-back");

  report.section("Inscription");
  const email = `historique-${tag}@exemple.test`;
  report.check("compte créé", await signUp(page, { email, password: "mot-de-passe-long-historique", mailpit }));
  report.check("la carrière jouée en invité rejoint le compte", await page.until(`${total}.then(n => n === 1)`, 10000), String(await page.js(total)));
  await page.js("document.querySelectorAll('.acc-overlay.on').forEach(o => o.classList.remove('on'))");

  report.section("Connecté");
  report.check("une deuxième carrière", await playOne(page));
  report.check("elle part au compte dès la fin", await page.until(`${total}.then(n => n === 2)`, 10000), String(await page.js(total)));

  report.section("Panthéon · Mon compte");
  await openPantheon(page);
  report.check("la bascule appareil / compte apparaît", !(await page.js("document.getElementById('pantheon-source').hidden")));
  await page.click(".pantheon-source-btn[data-src=account]");
  report.check("les deux carrières du compte", await page.until(`${cards} === 2`), await page.text("#pantheon-list"));
  report.check("le compteur dit 2 / 1000", /2 \/ 1000 carrières sur le compte/.test(await page.text(".pantheon-count")), await page.text(".pantheon-count"));
  report.check("chaque carte dit son mode, sa date et son score", /⚽ Carrière/.test(await page.text(".pantheon-meta")) && /pts/.test(await page.text(".pantheon-meta")), await page.text(".pantheon-meta"));

  await page.click(".pantheon-sort-chip[data-filter=daily]");
  report.check("filtre Défi du jour : aucune", await page.until("/Aucune carrière dans cette catégorie/.test(document.getElementById('pantheon-list').textContent)"));
  await page.click(".pantheon-sort-chip[data-filter=career]");
  report.check("filtre Carrière : les deux", await page.until(`${cards} === 2`));

  await page.click(".pantheon-card .pantheon-fav");
  report.check("mise en favorite", await page.until("(document.querySelector('.pantheon-card .pantheon-fav') || {}).textContent === '★'"));
  report.check("le serveur la garde en favorite", (await page.rpc("careers_list", { favorites: true })).data.items.length === 1);
  await page.click(".pantheon-sort-chip[data-filter=fav]");
  report.check("filtre Favorites : une seule", await page.until(`${cards} === 1`));

  await page.click(".pantheon-card");
  report.check("la fiche complète se rouvre depuis le compte", await page.until("document.querySelector('.screen.active').id === 'screen-final'"));
  await page.click("#btn-replay");
  report.check("et ramène à l'historique du compte", await page.until(`document.querySelector('.screen.active').id === 'screen-pantheon' && !!document.querySelector('.pantheon-source-btn.on[data-src=account]')`));

  await page.click(".pantheon-sort-chip[data-filter=all]");
  await page.until(`${cards} === 2`);
  await page.click(".pantheon-card:last-of-type .pantheon-del");
  await page.until("!document.getElementById('modal-overlay').hidden");
  await page.click("#modal-confirm");
  report.check("suppression confirmée : il en reste une", await page.until(`${cards} === 1`) && (await page.js(total)) === 1);

  report.section("En anglais");
  await page.js("localStorage.setItem('openEleven_lang', 'en')");
  await page.reload();
  await openPantheon(page);
  report.check("la bascule est traduite", /This device.*My account/.test(await page.text("#pantheon-source")), await page.text("#pantheon-source"));
  await page.click(".pantheon-source-btn[data-src=account]");
  await page.until(`${cards} === 1`);
  report.check("le compteur aussi, au singulier", /1 \/ 1000 career on the account/.test(await page.text(".pantheon-count")), await page.text(".pantheon-count"));
  report.check("et les filtres", /All/.test(flat(await page.text("#pantheon-sort"))) && /Favourites/.test(await page.text("#pantheon-sort")), await page.text("#pantheon-sort"));

  report.noErrors(page);
}
