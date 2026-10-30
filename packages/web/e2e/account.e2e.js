// Compte, sauvegarde en ligne, classement, amis et salles, par l'interface réelle et
// avec deux joueurs isolés. Demande la pile complète (E2E_URL) : serveur + base.
import { accountBox as BOX, flat, resetStorage, signUp, wait } from "./lib.js";

export const meta = { title: "Compte, amis, classement et salles", needs: ["stack"] };

const tag = Date.now().toString(36);
const msg = (page) => page.js(`(function(){ var m = document.querySelector('.acc-overlay.on .acc-msg'); return m ? m.textContent : ''; })()`);

export async function run({ browser, stackUrl, mailpit, report }) {
  report.section("Compte");
  const alice = await browser.newPage(stackUrl + "/", { name: "alice" });
  await wait(1500);
  alice.email = `alice-${tag}@exemple.test`;
  alice.pseudo = `alice${tag}`.slice(0, 20);

  report.check("le bouton Compte est visible", await alice.js("getComputedStyle(document.getElementById('btn-account')).display !== 'none'"));
  report.check("inscription → connecté", await signUp(alice, { email: alice.email, password: "mot-de-passe-long-alice", mailpit }), await alice.js(`(${BOX} || { textContent: '' }).textContent`));
  if (mailpit) { await alice.js("document.getElementById('btn-account').click()"); await wait(500); }
  await alice.js(`${BOX}.querySelector('#acc-pseudo').value = '${alice.pseudo}'; ${BOX}.querySelector('#acc-savepseudo').click()`);
  report.check("pseudo enregistré", await alice.until(`/enregistré/.test((document.querySelector('.acc-overlay.on .acc-msg') || {}).textContent || '')`), await msg(alice));

  await alice.js("localStorage.setItem('destinDeChampion_progress', JSON.stringify({ xp: 1234, careersPlayed: 3, unlockedBadges: ['a', 'b'] }))");
  await alice.js(`${BOX}.querySelector('.lb-tab[data-t=sauvegarde]').click()`); // la sauvegarde a son onglet
  await alice.js(`${BOX}.querySelector('#acc-push').click()`);
  await wait(900);
  const saved = await alice.rpc("save_get");
  report.check("la sauvegarde part au serveur", /1234/.test(JSON.stringify(saved.data ?? "")), JSON.stringify(saved).slice(0, 120));

  await alice.reload();
  await alice.js("document.getElementById('btn-account').click()");
  report.check("la session survit à un rechargement (cookie)", await alice.until(`!!(${BOX} && ${BOX}.querySelector('#acc-signout'))`));
  report.check("le pseudo est relu du serveur", await alice.until(`${BOX}.querySelector('#acc-pseudo').value === '${alice.pseudo}'`));
  report.check("aucun jeton dans le stockage local", await alice.js("Object.keys(localStorage).every(k => !/token|supabase|sb-/i.test(k) && !/access_token/.test(localStorage.getItem(k)))"));

  // Nouvel appareil : stockage vidé, reconnexion, restauration.
  await alice.js(`${BOX}.querySelector('#acc-signout').click()`);
  await alice.until(`!!${BOX}.querySelector('#acc-login')`);
  await alice.js("localStorage.removeItem('destinDeChampion_progress'); localStorage.removeItem('openEleven_current'); localStorage.removeItem('destinDeChampion_pantheon')");
  await alice.js(`${BOX}.querySelector('#acc-email').value = '${alice.email}'; ${BOX}.querySelector('#acc-pass').value = 'mauvais'; ${BOX}.querySelector('#acc-login').click()`);
  report.check("mauvais mot de passe refusé", await alice.until(`/incorrect/.test((document.querySelector('.acc-overlay.on .acc-msg') || {}).textContent || '')`), await msg(alice));
  await alice.js(`${BOX}.querySelector('#acc-pass').value = 'mot-de-passe-long-alice'; ${BOX}.querySelector('#acc-login').click()`);
  report.check("reconnexion → sauvegarde restaurée", await alice.until("(JSON.parse(localStorage.getItem('destinDeChampion_progress') || '{}')).xp === 1234", 9000));
  await wait(1500);

  report.section("Classement et profil");
  await alice.js("document.getElementById('btn-leaderboard').click()");
  report.check("le classement mondial s'affiche", await alice.until("!!document.querySelector('.acc-overlay.on .lb-tabs')"));
  await alice.js(`window.OpenElevenAccount.openProfile('${alice.pseudo}')`);
  report.check("le profil public s'affiche", await alice.until(`[...document.querySelectorAll('.acc-overlay.on')].some(o => o.textContent.includes('${alice.pseudo}'))`));
  await alice.js("document.querySelectorAll('.acc-overlay.on').forEach(o => o.classList.remove('on'))");

  report.section("Avatar et profil");
  await alice.js("document.getElementById('btn-account').click()");
  report.check("36 avatars proposés, en trois familles", (await alice.js(`${BOX}.querySelectorAll(".av-pick").length`)) === 36 && (await alice.js(`${BOX}.querySelectorAll(".av-group").length`)) === 3);
  await alice.js(`${BOX}.querySelector('.av-pick[data-av="mat-03"]').click()`);
  report.check("avatar enregistré", await alice.until(`/Avatar enregistré/.test((document.querySelector(".acc-overlay.on .acc-msg") || {}).textContent || "")`), await msg(alice));
  report.check("le serveur le garde", (await alice.rpc("profile_me")).data.avatar === "mat-03");
  report.check("le bouton compte de l'accueil montre l'avatar", /mat-03.png/.test(await alice.js("document.getElementById('btn-account').innerHTML")));
  report.check("l'en-tête du compte aussi", /mat-03.png/.test(await alice.js(`${BOX}.querySelector(".acc-head").innerHTML`)));
  report.check("un avatar inventé est refusé", !!(await alice.rpc("profile_set_avatar", { avatar: "../../etc" })).error);
  await alice.js(`${BOX}.querySelector("#acc-profile").click()`);
  report.check("« Voir mon profil » ouvre ma fiche, marquée comme la mienne", await alice.until("!!document.querySelector('.acc-overlay.on .pf-mine')"));
  report.check("ma fiche montre mon avatar", /mat-03.png/.test(await alice.js("document.querySelector('.acc-overlay.on .pf-name').innerHTML")));
  await alice.js("document.querySelector('#pf-edit').click()");
  report.check("« Modifier » ramène au choix de l'avatar", await alice.until("!!document.querySelector('.acc-overlay.on .av-grid')"));
  await alice.js("document.querySelectorAll('.acc-overlay.on').forEach(o => o.classList.remove('on'))");

  report.section("Amis");
  const bruno = await browser.newPage(stackUrl + "/", { name: "bruno" });
  await wait(1500);
  bruno.email = `bruno-${tag}@exemple.test`;
  bruno.pseudo = `bruno${tag}`.slice(0, 20);
  report.check("second joueur inscrit", await signUp(bruno, { email: bruno.email, password: "mot-de-passe-long-bruno", mailpit }));
  if (mailpit) { await bruno.js("document.getElementById('btn-account').click()"); await wait(500); }
  await bruno.js(`${BOX}.querySelector('#acc-pseudo').value = '${bruno.pseudo}'; ${BOX}.querySelector('#acc-savepseudo').click()`);
  await bruno.until(`/enregistré/.test((document.querySelector('.acc-overlay.on .acc-msg') || {}).textContent || '')`);
  await bruno.js("document.querySelectorAll('.acc-overlay.on').forEach(o => o.classList.remove('on'))");

  const socialText = "(document.querySelector('.acc-overlay.on .lb-box') || document.querySelector('.acc-overlay.on')).textContent";
  const openFriendsTab = (p) => p.js("(function(){ var t = [...document.querySelectorAll('.acc-overlay.on .lb-tab')].find(t => /ami/i.test(t.textContent) && !/class/i.test(t.textContent)); if (t) t.click(); })()");
  await alice.js("document.getElementById('btn-social').click()");
  await alice.until("!!document.querySelector('.acc-overlay.on .lb-tabs')");
  await openFriendsTab(alice); await wait(600);
  const added = await alice.js(`(function(){ var i = document.querySelector('.acc-overlay.on input[type=text]'); if (!i) return 'pas de champ'; i.value = '${bruno.pseudo}'; var b = i.parentElement.querySelector('button'); if (!b) return 'pas de bouton'; b.click(); return 'ok'; })()`);
  report.check("invitation envoyée depuis l'interface", added === "ok" && await alice.until(`/invitation|envoy|attente/i.test(${socialText})`), added);
  await bruno.js("document.getElementById('btn-social').click()");
  await bruno.until("!!document.querySelector('.acc-overlay.on .lb-tabs')");
  await openFriendsTab(bruno);
  report.check("Bruno voit la demande d'Alice", await bruno.until(`(${socialText}).includes('${alice.pseudo}')`));
  const accepted = await bruno.js("(function(){ var b = [...document.querySelectorAll('.acc-overlay.on button')].find(x => /accepter/i.test(x.textContent)); if (!b) return 'pas de bouton Accepter'; b.click(); return 'ok'; })()");
  await wait(900);
  const friends = await alice.js("window.OpenElevenAccount.listFriends().then(f => f.map(x => x.friend_pseudo).join(','))");
  report.check("amitié réciproque après acceptation", accepted === "ok" && friends === bruno.pseudo, `${accepted} · amis d'Alice : ${friends}`);
  await alice.js("document.querySelectorAll('.acc-overlay.on').forEach(o => o.classList.remove('on'))");
  await bruno.js("document.querySelectorAll('.acc-overlay.on').forEach(o => o.classList.remove('on'))");

  report.section("Salle");
  await alice.js("document.getElementById('btn-room').click()");
  await alice.until(`/Choisissez votre mode/i.test(${"(document.querySelector('.acc-overlay.on .lb-box') || { textContent: '' }).textContent"})`);
  const roomText = "(document.querySelector('.acc-overlay.on .lb-box') || { textContent: '' }).textContent";
  const created = await alice.js("(function(){ var b = document.querySelector('.acc-overlay.on .rm-create[data-mode=together]'); if (!b) return 'pas de bouton Ensemble'; b.click(); return 'ok'; })()");
  report.check("salle créée depuis l'interface", created === "ok" && await alice.until(`/créée|inviter|membres?/i.test(${roomText})`), created);
  // Le panneau d'invitation s'ouvre de lui-même après la création ; sinon, on l'ouvre.
  const invited = await alice.js("(async function(){ var o = document.querySelector('.acc-overlay.on .rm-open-invite'); if (!o) return 'pas de place à inviter'; if (!document.querySelector('.acc-overlay.on .rm-invite-panel')) o.click(); for (var i = 0; i < 40 && !document.querySelector('.acc-overlay.on .rm-invite-friend'); i++) await new Promise(r => setTimeout(r, 100)); var b = document.querySelector('.acc-overlay.on .rm-invite-friend'); if (!b) return 'aucun ami à inviter'; b.click(); return 'ok'; })()");
  report.check("ami invité dans la salle", invited === "ok" && await alice.until(`/envoyée/i.test(${roomText})`), invited);
  await bruno.js("document.getElementById('btn-room').click()");
  report.check("Bruno voit l'invitation", await bruno.until(`(${roomText}).includes('${alice.pseudo}')`));
  const joined = await bruno.js("(function(){ var b = document.querySelector('.acc-overlay.on .rm-join'); if (!b) return 'pas de bouton Rejoindre'; b.click(); return 'ok'; })()");
  report.check("Bruno rejoint la salle", joined === "ok" && await bruno.until(`/rejoint/i.test(${roomText})`), joined);
  const rooms = (await alice.rpc("rooms_mine")).data.rooms;
  report.check("la salle compte ses deux membres", rooms.length === 1 && rooms[0].members.filter((m) => m.status === "joined").length === 2, JSON.stringify(rooms.map((r) => r.phase)));

  // Signal en direct (WebSocket à travers Caddy ou le relais de développement).
  const roomId = rooms[0].id;
  await bruno.js(`window.__signals = 0; window.__stop = window.OpenElevenAccount.getClient().watchRoom('${roomId}', () => window.__signals++); true`);
  await wait(800);
  await alice.rpc("room_update_stats", { p_room_id: roomId, p_stats: { totalGoals: 3 } });
  report.check("Bruno reçoit le signal en direct", await bruno.until("window.__signals > 0", 4000), "signaux : " + await bruno.js("window.__signals"));
  await bruno.js("window.__stop(); true");
  await alice.rpc("room_leave", { p_room_id: roomId });
  await bruno.rpc("room_leave", { p_room_id: roomId });

  report.noErrors(alice, bruno);
  await alice.close();
  await bruno.close();
}
