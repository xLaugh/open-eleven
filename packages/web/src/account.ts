/* ============================================================
   Compte & sauvegarde en ligne — module AUTONOME.
   • Ne touche pas au gameplay : lit/écrit uniquement les clés localStorage
     du jeu, et recharge la page après une restauration.
   • Parle au serveur du jeu par api.ts (/api). Sans serveur (assemblage
     avec VITE_ONLINE=0), le module s'efface : le jeu reste 100% invité/local.
   • Auth : e-mail + mot de passe. Chaque joueur ne lit que SA sauvegarde :
     c'est le serveur qui le vérifie.
   ============================================================ */
import { AVATAR_GROUPS, AVATAR_IDS, FORBIDDEN_WORDS } from "@open-eleven/content";
import { Engine } from "@open-eleven/engine";
import { api } from "./api";

(function () {
  "use strict";
  // Texte traduisible. Les libellés injectés dans le DOM sont pris en charge
  // automatiquement par i18n.ts ; T() ne sert donc qu'aux textes qui n'y
  // passent PAS — les boîtes natives confirm() — et à ceux qui portent des
  // valeurs. Le gabarit français est la clé : sans traduction, il s'affiche
  // tel quel.
  // ⚠️ Les valeurs sont insérées SANS échappement. Ici plus qu'ailleurs, la
  // donnée vient du SERVEUR (pseudos, libellés de duel) : passer par esc() à
  // l'appel. Cf. le contrat détaillé dans i18n.ts.
  const T = (tpl, vars?) => (window.I18N ? window.I18N.t(tpl, vars) : (vars
    ? Object.keys(vars).reduce((a, k) => a.split("{" + k + "}").join(vars[k] == null ? "" : String(vars[k])), tpl)
    : tpl));

  const KEYS = ["openEleven_current", "destinDeChampion_pantheon", "destinDeChampion_progress"];
  // Version du moteur de CETTE page : le serveur refuse un score envoyé par une
  // page restée sur une ancienne version (déploiement en cours de journée).
  const EV = Engine.ENGINE_VERSION;

  const btn = document.getElementById("btn-account");
  if (import.meta.env.VITE_ONLINE === "0") {
    if (btn) btn.style.display = "none";
    return;
  }
  if (btn) btn.style.display = "";

  let session = null;
  let lastPush = 0;
  // E-mail dont l'inscription attend une confirmation. Renseigné quand signUp
  // n'ouvre PAS de session : c'est le signal que le serveur envoie des e-mails
  // (SMTP_URL renseigné) et qu'un lien de confirmation est parti.
  let pendingEmail = null;
  // Vrai quand on arrive depuis un lien « mot de passe oublié » : la session
  // ouverte par le jeton ne sert qu'à définir un nouveau mot de passe.
  let recoveryMode = false;
  // Onglet actif de « Mon compte » : Profil (pseudo, avatar), Sauvegarde, Sécurité.
  let accTab = "profil";
  // Avatar choisi (identifiant « clair-01 »…), ou null : on affiche alors 👤.
  let avatar = null;
  const avatarUrl = (id) => "/src/img/avatar/" + id + ".png";
  // Un identifiant venu du serveur n'est affiché que s'il fait partie des avatars du jeu.
  const avatarHtml = (id, cls) => (id && AVATAR_IDS.includes(id)
    ? '<img class="av-img ' + cls + '" src="' + avatarUrl(id) + '" alt="" />'
    : '<span class="av-img av-none ' + cls + '">👤</span>');
  // Le bouton compte de l'accueil montre l'avatar du joueur connecté.
  function paintFab() {
    if (!btn) return;
    btn.innerHTML = avatar && AVATAR_IDS.includes(avatar) ? '<img class="fab-av" src="' + avatarUrl(avatar) + '" alt="" />' : "👤";
  }

  // Garde-fou de saisie. La validation qui fait foi reste celle du serveur ;
  // celle-ci évite juste d'envoyer une adresse manifestement erronée.
  function looksLikeEmail(v) { return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(v); }

  // ---- localStorage <-> cloud -------------------------------------------------
  function collectLocal() {
    const d = {};
    KEYS.forEach((k) => { const v = localStorage.getItem(k); if (v != null) d[k] = v; });
    return d;
  }
  // ⚠️ Doit couvrir LES TROIS clés de KEYS, "openEleven_current" (carrière en
  // cours) y compris — l'oubli de cette dernière causait une boucle de
  // rechargement infinie : un compte avec une sauvegarde cloud contenant une
  // carrière en cours mais AUCUNE carrière terminée (donc ni panthéon ni
  // progression) repassait chaque fois par la branche "aucune donnée locale"
  // ci-dessous (applyLocal + location.reload), qui rechargeait la page sans
  // jamais satisfaire la condition — reload à l'infini, repéré via un compte
  // de test resté coincé en pleine carrière de salle.
  function hasLocalData() {
    return !!localStorage.getItem("openEleven_current") || !!localStorage.getItem("destinDeChampion_pantheon") || !!localStorage.getItem("destinDeChampion_progress");
  }
  function applyLocal(data) {
    KEYS.forEach((k) => { if (data && typeof data[k] === "string") localStorage.setItem(k, data[k]); });
  }
  /* Écriture concurrente : la sauvegarde est un blob unique remplacé en entier.
     Sans précaution, jouer sur un second appareil écrase silencieusement la
     progression du premier. On garde donc la date de la version connue, et on
     n'écrit QUE si le serveur en est toujours là (verrouillage optimiste).
     `cloudStamp` = updated_at de la dernière version qu'on a lue ou écrite.
     null = on ignore où en est le serveur → il faut relire avant d'écrire. */
  let cloudStamp = null;
  let conflictInfo = null; // { serverStamp } quand une écriture a été refusée

  async function pushSave(force?) {
    if (!session) return { ok: false };
    lastPush = Date.now();
    // Le serveur compare lui-même la version connue (cloudStamp) à la sienne,
    // dans la même transaction que l'écriture.
    const { data, error } = await api.rpc("save_put", { data: collectLocal(), expected: cloudStamp, force: !!force });
    if (error) return { ok: false, error };
    if (data.conflict) {
      conflictInfo = { serverStamp: data.serverStamp };
      return { ok: false, conflict: true, serverStamp: data.serverStamp };
    }
    cloudStamp = data.updated_at;
    conflictInfo = null;
    return { ok: true };
  }
  async function pullSave() {
    if (!session) return { ok: false };
    const { data, error } = await api.rpc("save_get");
    if (!error && data) cloudStamp = data.updated_at;
    return { ok: !error, row: data, error };
  }

  function stampLabel(iso) {
    try { return new Date(iso).toLocaleString(); } catch (e) { return String(iso || ""); }
  }

  // ---- historique des carrières ----------------------------------------------
  // Chaque carrière terminée sur un compte connecté y est gardée (jusqu'à 1000).
  // Le Panthéon de l'appareil sert de file d'attente : ce qui n'est pas encore
  // parti (hors ligne, compte connecté après coup) part au prochain envoi. Le
  // serveur ignore une carrière déjà reçue (même identifiant) : rien ne double,
  // même depuis un second appareil qui a restauré la même sauvegarde.
  const PANTHEON_KEY = "destinDeChampion_pantheon";
  const CAREER_BATCH = 20;
  const careerModeOf = (c) => (!c ? "career" : c.room ? "room" : c.dailyDate ? "daily" : c.duel ? "duel" : c.storyId ? "story" : "career");
  function newCareerId() {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* hors HTTPS */ }
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }
  const careerItem = (e) => ({
    clientId: e.id, mode: e.mode || careerModeOf(e.career), score: e.score || 0, playedAt: e.playedAt,
    summary: {
      name: e.name, title: e.title, natId: e.nationalityId, natFlag: e.nationalityFlag, natName: e.nationalityName,
      posIcon: e.positionIcon, peakOvr: e.peakOvr, money: e.money, seasons: (e.career.seasons || []).length, trophies: e.trophies,
    },
    data: e.career,
  });
  // Refus définitif (carrière invalide ou trop lourde) : inutile de la renvoyer.
  // Réseau coupé, limite du jour ou panne : elle repartira au prochain envoi.
  const careerRejected = (error) => !!error && error.status >= 400 && error.status < 500 && error.status !== 429 && error.status !== 401;

  async function sendPendingCareers() {
    let pan;
    try { pan = JSON.parse(localStorage.getItem(PANTHEON_KEY) || "[]"); } catch (e) { return; }
    if (!Array.isArray(pan) || !session) return;
    // Carrières d'avant l'historique : elles reçoivent un identifiant, gardé au Panthéon
    // (donc aussi dans la sauvegarde en ligne), et une date qui respecte leur ordre.
    let changed = false;
    pan.forEach((e, i) => {
      if (e && !e.id) { e.id = newCareerId(); e.playedAt = e.playedAt || new Date(Date.now() - (pan.length - i) * 1000).toISOString(); changed = true; }
    });
    if (changed) { try { localStorage.setItem(PANTHEON_KEY, JSON.stringify(pan)); } catch (e) { /* stockage plein */ } }
    const key = "openEleven_careersSynced:" + session.user.id;
    let synced = [];
    try { synced = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { /* illisible : tout repart, sans doublon */ }
    const done = new Set(Array.isArray(synced) ? synced : []);
    const todo = pan.filter((e) => e && e.id && e.career && !done.has(e.id));
    for (let i = 0; i < todo.length; i += CAREER_BATCH) {
      const batch = todo.slice(i, i + CAREER_BATCH);
      const { error } = await api.rpc("careers_add", { items: batch.map(careerItem) });
      if (!error) { batch.forEach((e) => done.add(e.id)); continue; }
      if (!careerRejected(error)) break;
      // Une carrière du lot est refusée : envoi une à une, pour ne perdre que celle-là.
      for (const e of batch) {
        const one = await api.rpc("careers_add", { items: [careerItem(e)] });
        if (!one.error || careerRejected(one.error)) done.add(e.id);
        else break;
      }
    }
    // Seuls les identifiants encore au Panthéon sont gardés : la liste reste courte.
    const ids = new Set(pan.map((e) => e && e.id));
    try { localStorage.setItem(key, JSON.stringify([...done].filter((id) => ids.has(id)))); } catch (e) { /* stockage plein */ }
  }
  let careerFlush = null;
  let careerAgain = false;
  function flushCareers() {
    if (!session) return Promise.resolve();
    // Une carrière finie pendant un envoi en cours repart juste après lui.
    if (careerFlush) { careerAgain = true; return careerFlush; }
    careerFlush = (async () => {
      do { careerAgain = false; await sendPendingCareers(); } while (careerAgain && session);
    })().catch(() => {}).finally(() => { careerFlush = null; });
    return careerFlush;
  }

  // ---- UI (modale injectée) ---------------------------------------------------
  const style = document.createElement("style");
  style.textContent =
    ".acc-overlay{position:fixed;inset:0;z-index:900;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(3,20,12,.62);backdrop-filter:blur(3px)}" +
    ".acc-overlay.on{display:flex}" +
    // Le profil se consulte DEPUIS une autre fenêtre (amis, classement, duels).
    // Tous les panneaux partageant le même z-index, l'empilement suivait l'ordre
    // du DOM — et le profil, créé avant celui des amis, passait derrière lui.
    // Il monte donc d'un cran : c'est une vue de détail, elle se referme pour
    // revenir à la liste.
    ".acc-overlay.acc-top{z-index:940}" +
    ".acc-box{width:100%;max-width:380px;background:var(--card-bg,#fff);color:var(--text-0,#182);border-radius:16px;padding:22px 22px 24px;box-shadow:0 24px 60px rgba(0,0,0,.4);font-family:var(--font,system-ui)}" +
    ".acc-box h3{font-family:var(--font-display,inherit);margin:0 0 4px;font-size:1.35rem;color:var(--green-ink,#0b3b26)}" +
    ".acc-box p.acc-sub{margin:0 0 14px;color:var(--text-1,#567);font-size:.86rem}" +
    ".acc-box input{width:100%;box-sizing:border-box;margin:6px 0;padding:11px 13px;border:1.5px solid rgba(12,45,30,.18);border-radius:10px;font-size:1rem;font-family:inherit;background:#fff;color:#182}" +
    ".acc-box input:focus{outline:none;border-color:var(--green,#087b4b)}" +
    ".acc-btn{width:100%;margin-top:8px;padding:12px;border:none;border-radius:10px;font-size:.98rem;font-weight:700;cursor:pointer;font-family:inherit}" +
    ".acc-btn.primary{background:var(--green,#087b4b);color:#fff}" +
    ".acc-btn.ghost{background:transparent;color:var(--green,#087b4b);border:1.5px solid var(--green,#087b4b)}" +
    ".acc-btn.soft{background:var(--panel-2,rgba(8,123,75,.12));color:var(--green-ink,#0b3b26)}" +
    ".acc-btn.danger{background:transparent;color:#b3261e;border:1.5px solid rgba(179,38,30,.4)}" +
    ".acc-msg{margin:12px 0 2px;font-size:.85rem;min-height:1.1em;text-align:center}" +
    ".acc-msg.err{color:#b3261e}.acc-msg.ok{color:var(--green,#087b4b)}" +
    ".acc-x{float:right;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-1,#567);line-height:1;margin:-4px -4px 0 0}" +
    ".acc-mail{font-weight:700;color:var(--green-ink,#0b3b26);word-break:break-all}" +
    ".acc-row{display:flex;gap:8px}.acc-row .acc-btn{margin-top:0}" +
    ".acc-link{display:block;width:100%;margin-top:10px;padding:4px;background:none;border:none;cursor:pointer;font-family:inherit;font-size:.82rem;color:var(--text-1,#567);text-decoration:underline}" +
    ".acc-link:hover{color:var(--green,#087b4b)}" +
    ".acc-warn{margin:0 0 12px;padding:9px 11px;border-radius:10px;background:rgba(179,38,30,.08);border:1px solid rgba(179,38,30,.3);color:#8c2018;font-size:.8rem;line-height:1.35}";
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "acc-overlay";
  overlay.innerHTML = '<div class="acc-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(overlay);
  const box = overlay.querySelector(".acc-box");
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  function open() { renderModal(); overlay.classList.add("on"); }
  function close() { overlay.classList.remove("on"); }
  function msg(text, kind?) { const m = box.querySelector(".acc-msg"); if (m) { m.textContent = text || ""; m.className = "acc-msg" + (kind ? " " + kind : ""); } }

  function renderModal() {
    if (!overlay.classList.contains("on") && !session) { /* pas ouvert : rien à re-rendre de visible */ }
    if (recoveryMode) { renderNewPassword(); return; }
    if (!session && pendingEmail) { renderPending(); return; }
    if (session) {
      if (accTab === "compte") accTab = "profil"; // ancien nom de l'onglet
      const tab = (id, label) => '<button class="lb-tab' + (accTab === id ? " on" : "") + '" data-t="' + id + '">' + label + "</button>";
      const avatarGrid = AVATAR_GROUPS.map((g) =>
        '<p class="av-group">' + esc(T(g.label)) + '</p><div class="av-grid">' +
        AVATAR_IDS.filter((id) => id.startsWith(g.id + "-")).map((id) =>
          '<button class="av-pick' + (id === avatar ? " on" : "") + '" data-av="' + id + '" aria-label="' + id + '"><img src="' + avatarUrl(id) + '" alt="" loading="lazy" /></button>').join("") +
        "</div>").join("");
      box.innerHTML =
        '<button class="acc-x" aria-label="Fermer">×</button>' +
        // En-tête : qui est connecté, toujours visible, avec la déconnexion.
        '<div class="acc-head">' + avatarHtml(avatar, "acc-head-av") +
        '<div class="acc-head-id"><strong>' + esc(pseudo || T("Sans pseudo")) + '</strong><span class="acc-mail">' + esc(session.user.email || "") + "</span></div>" +
        '<button class="acc-btn danger acc-head-out" id="acc-signout">' + esc(T("Se déconnecter")) + "</button></div>" +
        '<div class="lb-tabs">' + tab("profil", "Profil") + tab("sauvegarde", "Sauvegarde") + tab("securite", "Sécurité") + "</div>" +
        // Une sauvegarde automatique refusée ne doit pas passer inaperçue :
        // le joueur doit savoir que le cloud diverge, et pouvoir trancher.
        // Affiché sur TOUS les onglets — trop important pour dépendre du choix.
        (conflictInfo
          ? '<p class="acc-warn">⚠️ ' + T("Une sauvegarde plus récente existe sur un autre appareil ({date}). Votre progression locale n'a pas été envoyée.", { date: esc(stampLabel(conflictInfo.serverStamp)) }) + "</p>"
          : "") +
        (accTab === "securite"
          ? '<input type="password" id="acc-curpass" placeholder="Mot de passe actuel" autocomplete="current-password" />' +
            '<input type="password" id="acc-newpass" placeholder="Nouveau mot de passe (16+ caractères)" autocomplete="new-password" />' +
            '<input type="password" id="acc-newpass2" placeholder="Confirmer le nouveau mot de passe" autocomplete="new-password" />' +
            '<button class="acc-btn primary" id="acc-changepass">Changer le mot de passe</button>'
          : accTab === "sauvegarde"
            ? '<p class="acc-sub">Ta progression (carrières, Panthéon, badges) part dans le cloud automatiquement. Tu peux aussi l\'envoyer tout de suite, ou récupérer celle d\'un autre appareil.</p>' +
              '<button class="acc-btn primary" id="acc-push">☁️ Sauvegarder maintenant</button>' +
              '<button class="acc-btn soft" id="acc-pull">📥 Restaurer depuis le cloud</button>'
            : '<p class="acc-sub" style="margin:0 0 4px">Pseudo au classement mondial :</p>' +
              '<div class="acc-row"><input type="text" id="acc-pseudo" maxlength="24" placeholder="Ton pseudo" value="' + esc(pseudo || "") + '" style="margin:0" />' +
              '<button class="acc-btn soft" id="acc-savepseudo" style="width:auto;padding:11px 14px">OK</button></div>' +
              '<button class="acc-btn primary" id="acc-profile">👁️ Voir mon profil</button>' +
              '<p class="acc-sub" style="margin:12px 0 2px">Avatar</p>' + avatarGrid) +
        '<p class="acc-msg"></p>';
      box.querySelector(".acc-x").onclick = close;
      box.querySelector("#acc-signout").onclick = async () => { await api.auth.signOut(); msg(""); };
      box.querySelectorAll(".lb-tab").forEach((b) => (b.onclick = () => { accTab = b.dataset.t; renderModal(); }));
      if (accTab === "securite") {
        box.querySelector("#acc-changepass").onclick = async () => {
          const cur = box.querySelector("#acc-curpass").value;
          const a = box.querySelector("#acc-newpass").value;
          const b = box.querySelector("#acc-newpass2").value;
          if (!cur) return msg("Renseigne ton mot de passe actuel.", "err");
          if (a.length < 16) return msg("Nouveau mot de passe : 16 caractères minimum.", "err");
          if (a !== b) return msg("Les deux mots de passe ne correspondent pas.", "err");
          msg(T("Enregistrement…"));
          const { error } = await api.auth.updatePassword(a, cur);
          if (error) return msg(traduire(error.message), "err");
          box.querySelector("#acc-curpass").value = "";
          box.querySelector("#acc-newpass").value = "";
          box.querySelector("#acc-newpass2").value = "";
          msg("Mot de passe mis à jour ✔", "ok");
        };
        return;
      }
      if (accTab === "sauvegarde") {
        box.querySelector("#acc-push").onclick = async () => {
          msg(T("Sauvegarde…"));
          let r = await pushSave();
          if (r.conflict) {
            // Version distante plus récente : on ne l'écrase pas sans un accord
            // explicite, et on montre sa date pour que le choix soit éclairé.
            const ok = confirm(T("Une sauvegarde plus récente existe sur un autre appareil ({date}).\n\nOK = l'écraser avec cette partie · Annuler = ne rien changer (vous pourrez la récupérer avec « Restaurer depuis le cloud »).",
              { date: stampLabel(r.serverStamp) }));
            if (!ok) return msg("Sauvegarde annulée : le cloud n'a pas été modifié.", "err");
            r = await pushSave(true);
          }
          renderModal();
          msg(r.ok ? "Sauvegarde envoyée au cloud ✔" : "Échec : " + (r.error && r.error.message || "erreur"), r.ok ? "ok" : "err");
        };
        box.querySelector("#acc-pull").onclick = async () => {
          msg("Récupération…");
          const r = await pullSave();
          if (!r.ok) return msg("Échec : " + (r.error && r.error.message || "erreur"), "err");
          if (!r.row || !r.row.data || !Object.keys(r.row.data).length) return msg("Aucune sauvegarde cloud pour l'instant.", "err");
          if (confirm(T("Restaurer la sauvegarde cloud ? Cela REMPLACE votre partie locale actuelle."))) { applyLocal(r.row.data); location.reload(); }
        };
        return;
      }
      box.querySelector("#acc-savepseudo").onclick = async () => {
        const r = await savePseudo(box.querySelector("#acc-pseudo").value);
        if (r.ok) renderModal(); // l'en-tête affiche le nouveau pseudo
        msg(r.ok ? "Pseudo enregistré ✔" : (r.error && r.error.message) || "Échec", r.ok ? "ok" : "err");
      };
      box.querySelector("#acc-profile").onclick = async () => {
        if (!pseudo) return msg("Choisis d'abord un pseudo ci-dessus.", "err");
        await pushProfileStats(); close(); openProfile(pseudo);
      };
      box.querySelectorAll(".av-pick").forEach((b) => (b.onclick = async () => {
        if (!pseudo) return msg("Choisis d'abord un pseudo ci-dessus.", "err");
        const { error } = await api.rpc("profile_set_avatar", { avatar: b.dataset.av });
        if (error) return msg(traduire(error.message), "err");
        avatar = b.dataset.av;
        paintFab();
        renderModal();
        msg("Avatar enregistré ✔", "ok");
      }));
    } else {
      box.innerHTML =
        '<button class="acc-x" aria-label="Fermer">×</button>' +
        "<h3>Compte & sauvegarde cloud</h3>" +
        '<p class="acc-sub">Optionnel. Retrouvez vos carrières, votre Panthéon et votre progression sur tous vos appareils.</p>' +
        '<input type="email" id="acc-email" placeholder="E-mail" autocomplete="email" />' +
        '<input type="password" id="acc-pass" placeholder="Mot de passe (16+ caractères)" autocomplete="current-password" />' +
        '<button class="acc-btn primary" id="acc-login">Se connecter</button>' +
        '<button class="acc-btn ghost" id="acc-signup">Créer un compte</button>' +
        '<button class="acc-link" id="acc-forgot">Mot de passe oublié ?</button>' +
        '<p class="acc-msg"></p>';
      box.querySelector(".acc-x").onclick = close;
      const email = () => box.querySelector("#acc-email").value.trim();
      const pass = () => box.querySelector("#acc-pass").value;
      box.querySelector("#acc-login").onclick = async () => {
        if (!email() || !pass()) return msg("Renseigne e-mail et mot de passe.", "err");
        msg("Connexion…");
        const { error } = await api.auth.signIn(email(), pass());
        if (error) msg(traduire(error.message), "err");
      };
      box.querySelector("#acc-forgot").onclick = async () => {
        if (!looksLikeEmail(email())) return msg("Renseigne d'abord ton e-mail ci-dessus.", "err");
        msg(T("Envoi…"));
        const { error } = await api.auth.forgot(email());
        // Refus net (trop de tentatives, e-mails non configurés sur ce serveur) :
        // on le dit. Sinon, réponse volontairement identique que le compte existe
        // ou non : dire « cette adresse est inconnue » permettrait d'énumérer les comptes.
        if (error) return msg(traduire(error.message), "err");
        msg("Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.", "ok");
      };
      box.querySelector("#acc-signup").onclick = async () => {
        if (!looksLikeEmail(email())) return msg("Adresse e-mail invalide.", "err");
        if (pass().length < 16) return msg("Mot de passe : 16 caractères minimum.", "err");
        msg("Création…");
        const { data, error } = await api.auth.signUp(email(), pass());
        if (error) return msg(traduire(error.message), "err");
        if (data && data.session) {
          // Une session est ouverte d'emblée : le serveur n'envoie pas d'e-mails
          // (SMTP_URL vide), donc n'importe quelle adresse inventée passe.
          msg("Compte créé ✔", "ok");
        } else {
          // Pas de session : un lien de confirmation vient d'être envoyé.
          pendingEmail = email();
          renderModal();
        }
      };
    }
  }

  // Écran de définition du nouveau mot de passe, atteint depuis le lien reçu
  // par e-mail. La session ouverte par le jeton n'est là que pour ça : tant
  // que le mot de passe n'est pas changé, on ne bascule pas sur l'écran
  // « Mon compte », pour ne pas laisser croire que tout est réglé.
  function renderNewPassword() {
    box.innerHTML =
      '<button class="acc-x" aria-label="Fermer">×</button>' +
      "<h3>Nouveau mot de passe</h3>" +
      '<p class="acc-sub">Choisissez un nouveau mot de passe pour votre compte.</p>' +
      '<input type="password" id="acc-np" placeholder="Nouveau mot de passe (16+ caractères)" autocomplete="new-password" />' +
      '<input type="password" id="acc-np2" placeholder="Confirmer le mot de passe" autocomplete="new-password" />' +
      '<button class="acc-btn primary" id="acc-np-save">Enregistrer</button>' +
      '<p class="acc-msg"></p>';
    box.querySelector(".acc-x").onclick = () => { recoveryMode = false; close(); renderModal(); };
    box.querySelector("#acc-np-save").onclick = async () => {
      const a = box.querySelector("#acc-np").value, b = box.querySelector("#acc-np2").value;
      if (a.length < 16) return msg("Mot de passe : 16 caractères minimum.", "err");
      if (a !== b) return msg("Les deux mots de passe ne correspondent pas.", "err");
      msg(T("Enregistrement…"));
      const { error } = await api.auth.updatePassword(a);
      if (error) return msg(traduire(error.message), "err");
      recoveryMode = false;
      msg("Mot de passe mis à jour ✔", "ok");
      // La session du jeton devient une session normale : on rebascule sur
      // « Mon compte », déjà connecté.
      session = api.auth.session;
      renderModal();
      if (session) loadPseudo().then(renderModal);
    };
  }

  // Écran d'attente de confirmation. Tant que le lien n'est pas cliqué, le
  // compte n'ouvre aucune session : il ne peut ni publier de score, ni
  // réserver un pseudo. C'est là que se joue le filtrage des faux comptes.
  function renderPending() {
    box.innerHTML =
      '<button class="acc-x" aria-label="Fermer">×</button>' +
      "<h3>Vérifiez votre e-mail</h3>" +
      '<p class="acc-sub">' + T("Un lien de confirmation vient d'être envoyé à {email}. Ouvrez-le pour activer le compte, puis revenez vous connecter.",
        { email: '<span class="acc-mail">' + esc(pendingEmail) + "</span>" }) + "</p>" +
      '<p class="acc-sub">Pensez à regarder dans les indésirables.</p>' +
      '<button class="acc-btn soft" id="acc-resend">Renvoyer l\'e-mail</button>' +
      '<button class="acc-btn ghost" id="acc-back">Retour à la connexion</button>' +
      '<p class="acc-msg"></p>';
    box.querySelector(".acc-x").onclick = close;
    box.querySelector("#acc-back").onclick = () => { pendingEmail = null; renderModal(); };
    box.querySelector("#acc-resend").onclick = async () => {
      msg(T("Envoi…"));
      const { error } = await api.auth.resend(pendingEmail);
      msg(error ? traduire(error.message) : T("E-mail renvoyé ✔"), error ? "err" : "ok");
    };
  }

  // Échappe AUSSI l'apostrophe : plusieurs attributs sont écrits en HTML par
  // concaténation, et une seule valeur en quotes simples suffirait sinon à sortir
  // de l'attribut.
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  // Coercition numérique bornée. `profiles.stats` est un jsonb écrit par le CLIENT
  // et lu PUBLIQUEMENT : rien de ce qui en sort n'est digne de confiance. Un champ
  // « numérique » peut donc contenir une chaîne — d'où Number() + bornes avant tout
  // affichage (même principe que reconstructDuelRival pour les liens de duel).
  function num(v, max) { const n = Number(v); return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), max) : 0; }
  function traduire(m) {
    if (/Invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
    if (/already registered|already been registered/i.test(m)) return "Cet e-mail a déjà un compte. Connecte-toi.";
    if (/Email not confirmed/i.test(m)) return "E-mail non confirmé : vérifie ta boîte mail.";
    if (/rate limit|too many/i.test(m)) return "Trop de tentatives, réessaie dans un instant.";
    if (/injoignable/i.test(m)) return "Serveur injoignable. Vérifie ta connexion.";
    return m;
  }

  // ---- au login frais : réconcilier local <-> cloud --------------------------
  async function onFreshLogin() {
    // D'abord l'historique : si l'on restaure ensuite la sauvegarde en ligne, le
    // Panthéon de l'appareil est remplacé — ses carrières sont alors déjà au compte.
    await flushCareers();
    const r = await pullSave();
    if (r.ok && r.row && r.row.data && Object.keys(r.row.data).length) {
      if (!hasLocalData()) { applyLocal(r.row.data); location.reload(); return; }
      // Local ET cloud existent : laisser choisir.
      if (overlay.classList.contains("on")) {
        if (confirm(T("Une sauvegarde cloud existe. La restaurer (remplace la partie locale) ?\n\nOK = restaurer le cloud · Annuler = garder le local et l'envoyer au cloud."))) {
          applyLocal(r.row.data); location.reload();
        } else { await pushSave(true); msg("Partie locale envoyée au cloud ✔", "ok"); } // choix explicite → on écrase
      }
    } else {
      await pushSave(); // pas de cloud → on y met le local
      if (overlay.classList.contains("on")) msg("Connecté. Sauvegarde synchronisée ✔", "ok");
    }
  }

  // ---- réinitialisation du mot de passe --------------------------------------
  // Le lien reçu par e-mail ramène sur le jeu avec un jeton dans le hash
  // (#type=recovery&token=…), que l'on échange ici contre une session. Le hash
  // sert aussi aux liens de duel (#duel=…) : on ne touche qu'au nôtre.
  async function consumeRecoveryHash() {
    const h = (location.hash || "").replace(/^#/, "");
    if (!h || h.indexOf("type=recovery") === -1) return false;
    const token = new URLSearchParams(h).get("token");
    if (!token) return false;
    // Nettoie l'URL (pas de jeton dans l'historique).
    history.replaceState(null, "", location.pathname + location.search);
    recoveryMode = true;
    const { error } = await api.auth.recover(token);
    if (error) { recoveryMode = false; return false; }
    open();
    renderModal();
    return true;
  }

  api.auth.onChange((event, s) => {
    session = s;
    if (s) pendingEmail = null; // confirmé et connecté : l'écran d'attente n'a plus lieu d'être
    renderModal();
    if (event === "SIGNED_IN" && !recoveryMode) { onFreshLogin(); loadPseudo().then(() => { renderModal(); pushProfileStats(); }); }
    if (event === "SIGNED_OUT") { pseudo = null; avatar = null; cloudStamp = null; conflictInfo = null; paintFab(); }
    refreshNotifs(); // session à jour : (re)pose ou efface les pastilles Amis/Duels
  });
  // Le lien peut aussi s'ouvrir dans un onglet où le jeu tourne déjà : seul le
  // fragment change alors, sans rechargement de la page.
  window.addEventListener("hashchange", () => { consumeRecoveryHash(); });
  consumeRecoveryHash().then((recovered) => {
    if (recovered) return;
    // Retour du lien de confirmation d'inscription : le serveur a ouvert la
    // session et renvoie ici avec #confirmed — c'est une connexion toute neuve.
    const confirmed = location.hash === "#confirmed";
    const expired = location.hash === "#confirm=expired";
    if (confirmed || expired) history.replaceState(null, "", location.pathname + location.search);
    api.auth.load().then((s) => {
      session = s;
      if (confirmed && s) { api.auth.announce("SIGNED_IN"); return; }
      renderModal();
      if (expired && !s) { open(); msg("Ce lien a expiré ou a déjà servi. Connecte-toi, ou crée de nouveau ton compte pour recevoir un nouveau lien.", "err"); }
      if (session) { loadPseudo().then(() => { renderModal(); pushProfileStats(); }); flushCareers(); }
      refreshNotifs();
    });
  });

  // ---- sauvegarde auto quand on quitte / passe en arrière-plan ---------------
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && session && Date.now() - lastPush > 8000) { pushSave(); pushProfileStats(); }
    // Retour sur l'onglet : une invitation a pu arriver entre-temps.
    if (document.visibilityState === "visible" && session) refreshNotifs();
  });

  // ============================================================================
  //  Classement mondial VÉRIFIÉ du Défi du jour
  //  • submitDaily : envoie SEULEMENT (date, choix) ; le serveur rejoue + recalcule.
  //  • Lecture du classement : publique (RPC), fonctionne même sans compte.
  // ============================================================================
  let pseudo = null;
  // Modération de confort (message immédiat). La liste est partagée avec le
  // serveur (contenu du jeu), qui tranche. On normalise (minuscules + sans
  // accents) pour attraper « Nègre » / « negre ».
  const BADWORDS = (function () {
    const norm = (s) => String(s).toLowerCase().normalize("NFD").split("").filter((c) => { const n = c.charCodeAt(0); return n < 0x300 || n > 0x36f; }).join("").replace(/[^a-z0-9]+/g, " ");
    const esc = FORBIDDEN_WORDS.map((w) => norm(w).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).filter(Boolean);
    const re = new RegExp("\\b(" + esc.join("|") + ")\\b", "i");
    return { test: (p) => re.test(norm(p)) };
  })();

  async function loadPseudo() {
    if (!session) { pseudo = null; avatar = null; paintFab(); return; }
    const { data } = await api.rpc("profile_me");
    pseudo = data && data.pseudo ? data.pseudo : null;
    avatar = data && data.avatar ? data.avatar : null;
    paintFab();
  }
  async function savePseudo(p) {
    if (!session) return { ok: false };
    p = String(p || "").trim().slice(0, 24);
    if (p.length < 2) return { ok: false, error: { message: "Pseudo trop court (2 caractères min)." } };
    if (BADWORDS.test(p)) return { ok: false, error: { message: "Pseudo non autorisé." } };
    // L'unicité (sans tenir compte de la casse) et la modération sont tranchées
    // par le serveur ; son message est déjà celui à afficher.
    const { error } = await api.rpc("profile_set_pseudo", { pseudo: p });
    if (error) return { ok: false, error: { message: error.message || "Échec" } };
    pseudo = p; pushProfileStats();
    return { ok: true };
  }

  // ---- vitrine du joueur (profil public + pool de légendes communautaires) ---
  // Auto-déclarée (non vérifiée) : c'est une VITRINE, pas un classement. Le rang
  // général, lui, vient des scores vérifiés (fonction public_profile).
  // Une entrée de Panthéon retenue pour la publication. On ne garde QUE
  // l'affichable : chaque entrée locale embarque aussi `career`, l'instantané
  // complet de la carrière (des dizaines de kilo-octets), qui n'a rien à faire
  // en base ni chez un ami.
  const panthEntry = (e) => ({
    name: String(e.name || "").slice(0, 40),
    title: String(e.title || "").slice(0, 80),
    natFlag: String(e.nationalityFlag || "").slice(0, 8),
    natName: String(e.nationalityName || "").slice(0, 40),
    posIcon: String(e.positionIcon || "").slice(0, 8),
    score: Number(e.score) || 0,
    peakOvr: Number(e.peakOvr) || 0,
    money: Number(e.money) || 0,
    trophies: e.trophies || {},
  });

  function buildStats() {
    let best = null, badges = 0, careers = 0, bestStreak = 0, topRuns = [], level = 1;
    try {
      const pan = JSON.parse(localStorage.getItem("destinDeChampion_pantheon") || "[]");
      if (Array.isArray(pan) && pan.length) {
        // Les 10 meilleures carrières, pour le profil complet réservé aux amis.
        // Plafonné : un Panthéon monte à 20 entrées, et tout publier ferait
        // enfler la base à chaque partie sans rien apporter de plus.
        topRuns = pan.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10).map(panthEntry);
      }
      if (Array.isArray(pan) && pan.length) {
        const top = pan.reduce((a, b) => ((b.score || 0) > (a.score || 0) ? b : a));
        best = {
          name: top.name, title: top.title, natFlag: top.nationalityFlag, natName: top.nationalityName,
          posIcon: top.positionIcon, score: top.score || 0, peakOvr: top.peakOvr || 0,
          money: top.money || 0, trophies: top.trophies || {},
        };
        careers = pan.length;
      }
      const pr = JSON.parse(localStorage.getItem("destinDeChampion_progress") || "{}");
      badges = Array.isArray(pr.unlockedBadges) ? pr.unlockedBadges.length : 0;
      careers = Math.max(careers, Number(pr.careersPlayed) || 0);
      bestStreak = (pr.daily && Number(pr.daily.bestStreak)) || 0;
      // Niveau dérivé de l'XP cumulé — formule tenue par game.ts (window.OE),
      // pour ne pas dupliquer la courbe des paliers à deux endroits.
      if (window.OE && window.OE.levelInfo) level = window.OE.levelInfo(pr.xp).level;
    } catch (_) {}
    return { best, badges, careers, bestStreak, topRuns, level };
  }
  async function pushProfileStats() {
    if (!session || !pseudo) return; // pseudo requis pour publier
    await api.rpc("profile_set_stats", { stats: buildStats() });
  }

  // Envoi anti-triche : le serveur est seul juge du score.
  async function submitDaily(date, choices) {
    if (!session) return; // pas connecté → pas de classement (lecture reste publique)
    await api.submitScore("daily", { date, choices, v: EV }); // silencieux : ne jamais gêner la fin de partie
  }

  function todayKeyLocal() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function myTodayBest() {
    try {
      const p = JSON.parse(localStorage.getItem("destinDeChampion_progress") || "{}");
      const dy = p && p.daily;
      if (dy && dy.today === todayKeyLocal() && dy.todayBest != null) return dy.todayBest;
    } catch (_) {}
    return null;
  }
  function weekSince() {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // ---- modale classement (overlay dédié) -------------------------------------
  const lbStyle = document.createElement("style");
  lbStyle.textContent =
    ".lb-box{width:100%;max-width:440px;max-height:82vh;overflow:auto;background:var(--card-bg,#fff);color:var(--text-0,#182);border-radius:16px;padding:20px 20px 22px;box-shadow:0 24px 60px rgba(0,0,0,.4);font-family:var(--font,system-ui)}" +
    ".lb-box h3{font-family:var(--font-display,inherit);margin:0 0 2px;font-size:1.3rem;color:var(--green-ink,#0b3b26)}" +
    ".lb-tabs{display:flex;gap:6px;margin:12px 0 8px}" +
    ".lb-tab{flex:1;padding:8px 4px;border:1.5px solid rgba(12,45,30,.18);border-radius:9px;background:transparent;color:var(--text-1,#567);font-weight:700;font-size:.82rem;cursor:pointer;font-family:inherit}" +
    ".lb-tab.on{background:var(--green,#087b4b);color:#fff;border-color:var(--green,#087b4b)}" +
    ".lb-me{margin:8px 0 4px;padding:9px 12px;border-radius:10px;background:var(--panel-2,rgba(8,123,75,.12));font-size:.88rem;font-weight:700;color:var(--green-ink,#0b3b26)}" +
    ".lb-list{list-style:none;margin:6px 0 0;padding:0}" +
    ".lb-row{display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid rgba(12,45,30,.08);font-size:.92rem}" +
    ".lb-row.mine{background:rgba(212,175,55,.16);border-radius:8px}" +
    ".lb-rank{min-width:2.1em;font-weight:800;color:var(--green,#087b4b);text-align:right}" +
    ".lb-name{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".lb-pts{font-weight:800;color:var(--green-ink,#0b3b26)}" +
    ".lb-sub{font-size:.8rem;color:var(--text-1,#567);font-weight:400}" +
    ".lb-empty{padding:22px 4px;text-align:center;color:var(--text-1,#567);font-size:.9rem}" +
    ".lb-row[data-pseudo]{cursor:pointer}.lb-row[data-pseudo]:hover{background:rgba(8,123,75,.08);border-radius:8px}" +
    ".fr-head{margin:14px 0 2px;font-size:.78rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--text-1,#567)}" +
    ".fr-acts{display:flex;align-items:center;gap:6px;flex-shrink:0}" +
    ".fr-badge{display:inline-block;min-width:1.5em;padding:1px 5px;border-radius:999px;background:#b3261e;color:#fff;font-size:.72rem;font-weight:800;line-height:1.4}" +
    ".lb-tab.on .fr-badge{background:#fff;color:var(--green,#087b4b)}" +
    ".pf-best{padding:12px 14px;border-radius:12px;background:var(--panel-2,rgba(8,123,75,.1));border-inline-start:4px solid var(--gold,#d4af37)}" +
    ".pf-best-top{font-weight:800;font-size:1.05rem;color:var(--green-ink,#0b3b26)}" +
    ".pf-best-title{font-size:.9rem;color:var(--text-1,#567);margin:1px 0 6px}" +
    ".pf-best-stats{font-weight:700;font-size:.9rem;color:var(--green-ink,#0b3b26)}" +
    ".pf-counters{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}" +
    // --- Profil pleine page ---------------------------------------------------
    // Le profil d'un ami n'est plus une fenêtre mais une PAGE : ancrée en haut,
    // pleine hauteur, défilement propre. Les autres panneaux restent centrés.
    // overflow-y:auto est INDISPENSABLE : .acc-overlay est en position fixed,
    // donc tout ce qui dépasse de la fenêtre est coupé et devient inatteignable.
    // Sans lui, la 10e carrière du Panthéon existait dans le DOM sans qu'on
    // puisse jamais l'atteindre.
    ".acc-overlay.pf-page{align-items:flex-start;justify-content:center;padding:0;overflow-y:auto;-webkit-overflow-scrolling:touch}" +
    // La boîte ne borne plus sa hauteur : c'est la PAGE qui défile, pas elle.
    ".pf-page .lb-box{max-width:600px;max-height:none;min-height:100vh;overflow:visible;border-radius:0;padding:16px 18px 40px}" +
    ".pf-head{display:flex;align-items:center;gap:10px;margin:0 0 14px}" +
    ".pf-back{flex:none;width:auto;margin:0;padding:8px 16px;font-size:.9rem}" +
    ".pf-name{margin:0;font-family:var(--font-display,inherit);font-size:1.35rem;color:var(--green-ink,#0b3b26);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".pf-section{margin:20px 0 6px;font-size:.78rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--text-1,#567)}" +
    // Une carrière du Panthéon partagé. Même grammaire visuelle que .pf-best,
    // en plus compact puisqu'on en empile dix.
    ".pf-run{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:10px;background:var(--card-bg-2,#f4f7f3);margin-bottom:7px}" +
    ".pf-run-rank{flex:none;min-width:1.8em;font-weight:800;color:var(--green,#087b4b);text-align:right}" +
    ".pf-run-main{flex:1;min-width:0}" +
    // display:block — sans quoi un nom et un sous-titre courts tiennent sur la
    // MÊME ligne et la liste perd son alignement d'une entrée à l'autre.
    ".pf-run-name{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".pf-run-sub{display:block;font-size:.78rem;color:var(--text-1,#567);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".pf-run-score{flex:none;font-weight:800;color:var(--green-ink,#0b3b26)}" +
    // Message affiché à qui n'est pas ami : on explique, on ne se contente pas
    // de masquer.
    ".pf-locked{padding:14px;border-radius:12px;background:var(--panel-2,rgba(8,123,75,.08));color:var(--text-1,#567);font-size:.88rem;line-height:1.55;text-align:center}" +
    ".pf-counters span{flex:1;min-width:96px;text-align:center;padding:8px 4px;border-radius:9px;background:var(--panel-2,rgba(8,123,75,.1));font-weight:700;font-size:.82rem;color:var(--green-ink,#0b3b26)}";
  document.head.appendChild(lbStyle);

  const lbOverlay = document.createElement("div");
  lbOverlay.className = "acc-overlay";
  lbOverlay.innerHTML = '<div class="lb-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(lbOverlay);
  const lbBox = lbOverlay.querySelector(".lb-box");
  lbOverlay.addEventListener("click", (e) => { if (e.target === lbOverlay) lbOverlay.classList.remove("on"); });

  let lbTab = "today";
  const medal = (r) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : "#" + r);

  async function renderLeaderboard() {
    const today = todayKeyLocal();
    const isLevel = lbTab === "level";
    lbBox.innerHTML =
      '<button class="acc-x" aria-label="Fermer">×</button>' +
      "<h3>🏆 Classement mondial</h3>" +
      '<p class="acc-sub" style="margin:0 0 2px">' + (isLevel
        ? "Niveau du compte, cumulé sur toutes les carrières."
        : "Défi du jour — scores vérifiés par le serveur.") + "</p>" +
      '<div class="lb-tabs">' +
      '<button class="lb-tab' + (lbTab === "today" ? " on" : "") + '" data-t="today">Aujourd\'hui</button>' +
      '<button class="lb-tab' + (lbTab === "week" ? " on" : "") + '" data-t="week">Semaine</button>' +
      '<button class="lb-tab' + (lbTab === "alltime" ? " on" : "") + '" data-t="alltime">Général</button>' +
      '<button class="lb-tab' + (isLevel ? " on" : "") + '" data-t="level">Niveau</button>' +
      "</div>" +
      '<div class="lb-content"><p class="lb-empty">Chargement…</p></div>';
    lbBox.querySelector(".acc-x").onclick = () => lbOverlay.classList.remove("on");
    lbBox.querySelectorAll(".lb-tab").forEach((b) => (b.onclick = () => { lbTab = b.dataset.t; renderLeaderboard(); }));
    const content = lbBox.querySelector(".lb-content");

    try {
      // Onglet Niveau : classement à part (colonne différente, pas de scores
      // vérifiés) — géré séparément du reste plutôt que forcé dans la forme
      // score/total des autres onglets.
      if (isLevel) {
        const { data } = await api.rpc("level_top", { lim: 10 });
        const rows = data || [];
        const uid = session ? session.user.id : null;
        let meHtml = "";
        if (session) {
          const { data: rk } = await api.rpc("level_rank", { p_user: uid });
          if (rk && rk[0]) meHtml = '<div class="lb-me">Ta place : <strong>' + medal(Number(rk[0].rank)) + "</strong> · " + T("Niveau {n}", { n: rk[0].level }) + ' <span class="lb-sub">' + T("(sur {n} joueurs)", { n: rk[0].players }) + "</span></div>";
        } else {
          meHtml = '<div class="lb-me lb-sub" style="font-weight:400">Connecte-toi (👤) pour apparaître au classement.</div>';
        }
        const list = rows.length
          ? '<ul class="lb-list">' + rows.map((r) =>
              '<li class="lb-row' + (uid && r.user_id === uid ? " mine" : "") + '" data-pseudo="' + esc(r.pseudo || "") + '">' +
              '<span class="lb-rank">' + medal(Number(r.rank)) + "</span>" +
              '<span class="lb-name">' + esc(r.pseudo || "Joueur") + "</span>" +
              '<span class="lb-pts">' + T("Niveau {n}", { n: r.level }) + "</span></li>"
            ).join("") + "</ul>"
          : '<p class="lb-empty">Personne au classement pour l\'instant. Sois le premier !</p>';
        content.innerHTML = meHtml + list;
        content.querySelectorAll(".lb-row[data-pseudo]").forEach((el) => {
          if (el.dataset.pseudo) el.onclick = () => openProfile(el.dataset.pseudo);
        });
        return;
      }

      let rows, meHtml = "";
      if (lbTab === "today") {
        const best = myTodayBest();
        const { data } = await api.rpc("daily_top", { d: today, lim: 100 });
        rows = data || [];
        if (session && best != null) {
          const { data: rk } = await api.rpc("daily_rank", { d: today, sc: best });
          if (rk && rk[0]) meHtml = '<div class="lb-me">Ta place aujourd\'hui : <strong>' + medal(Number(rk[0].rank)) + "</strong> · " + best + " pts <span class=\"lb-sub\">" + T("(sur {n} joueurs)", { n: rk[0].players }) + "</span></div>";
        } else if (!session) {
          meHtml = '<div class="lb-me lb-sub" style="font-weight:400">Connecte-toi (👤) pour apparaître au classement.</div>';
        } else {
          meHtml = '<div class="lb-me lb-sub" style="font-weight:400">Termine le défi du jour pour entrer au classement.</div>';
        }
      } else {
        const since = lbTab === "week" ? weekSince() : "";
        const { data } = await api.rpc("range_top", { since, lim: 100 });
        rows = data || [];
      }
      const uid = session ? session.user.id : null;
      const isRange = lbTab !== "today";
      const list = rows.length
        ? '<ul class="lb-list">' + rows.map((r) => {
            const val = isRange ? r.total : r.score;
            const sub = isRange ? ' <span class="lb-sub">· ' + r.days + " j</span>" : "";
            return '<li class="lb-row' + (uid && r.user_id === uid ? " mine" : "") + '" data-pseudo="' + esc(r.pseudo || "") + '">' +
              '<span class="lb-rank">' + medal(Number(r.rank)) + "</span>" +
              '<span class="lb-name">' + esc(r.pseudo || "Joueur") + "</span>" +
              '<span class="lb-pts">' + val + ' <span class="lb-sub">pts</span>' + sub + "</span></li>";
          }).join("") + "</ul>"
        : '<p class="lb-empty">Personne au classement pour l\'instant. Sois le premier !</p>';
      content.innerHTML = meHtml + list;
      content.querySelectorAll(".lb-row[data-pseudo]").forEach((el) => {
        if (el.dataset.pseudo) el.onclick = () => openProfile(el.dataset.pseudo);
      });
    } catch (e) {
      content.innerHTML = '<p class="lb-empty">Classement indisponible pour le moment.</p>';
    }
  }
  function openLeaderboard() { lbTab = "today"; renderLeaderboard(); lbOverlay.classList.add("on"); }

  // ---- fiche publique d'un joueur (profil par pseudo) ------------------------
  const pfOverlay = document.createElement("div");
  pfOverlay.className = "acc-overlay acc-top pf-page";
  pfOverlay.innerHTML = '<div class="lb-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(pfOverlay);
  const pfBox = pfOverlay.querySelector(".lb-box");
  pfOverlay.addEventListener("click", (e) => { if (e.target === pfOverlay) pfOverlay.classList.remove("on"); });
  const medalR = (r) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : "#" + num(r, 1e9));
  const money = (m) => { m = num(m, 1e12); return m >= 1e6 ? (m / 1e6).toFixed(m >= 1e7 ? 0 : 1) + " M€" : m >= 1e3 ? Math.round(m / 1e3) + " k€" : m + " €"; };

  // En-tête de page : « ← Retour » referme le profil et laisse la fenêtre qui
  // l'a ouvert (amis, classement, duels) exactement là où elle était.
  const pfHead = (titre) =>
    '<div class="pf-head"><button class="btn btn-secondary pf-back">← Retour</button>' +
    '<h3 class="pf-name">' + titre + "</h3></div>";
  const pfFermer = () => {
    const b = pfBox.querySelector(".pf-back");
    if (b) b.onclick = () => pfOverlay.classList.remove("on");
  };

  async function openProfile(who) {
    pfBox.innerHTML = pfHead("🏛️ " + esc(who)) + '<p class="lb-empty">Chargement…</p>';
    pfFermer();
    pfOverlay.classList.add("on");
    pfBox.scrollTop = 0;
    // Deux lectures distinctes et volontairement séparées : la vitrine est
    // ouverte à tous, le Panthéon partagé est filtré par la base selon l'amitié.
    // Un client modifié ne peut donc pas s'octroyer le profil complet.
    let row = null, complet = null;
    try { const { data } = await api.rpc("public_profile", { p_pseudo: who }); row = data && data[0]; } catch (_) {}
    try { const { data } = await api.rpc("friend_profile", { p_pseudo: who }); complet = data && data[0]; } catch (_) {}
    if (!row) {
      pfBox.innerHTML = pfHead("🏛️ " + esc(who)) + '<p class="lb-empty">Profil introuvable.</p>';
      pfFermer();
      return;
    }
    const st = row.stats || {};
    const b = st.best;
    // TOUT ce qui vient de `stats` est hostile par défaut : chaînes échappées,
    // nombres coercés et bornés, et les « icônes » tronquées à quelques caractères
    // (ce sont des emojis, pas du HTML).
    const rankLine = row.rank
      ? '<div class="lb-me">Classement général : <strong>' + medalR(num(row.rank, 1e9)) + "</strong> · " + num(row.total, 1e9) + ' pts <span class="lb-sub">' + T("({n} défis)", { n: num(row.days, 1e6) }) + "</span></div>"
      : '<div class="lb-me lb-sub" style="font-weight:400">Pas encore classé au Défi du jour.</div>';
    const icon = (v) => esc(String(v == null ? "" : v).slice(0, 8));
    const bestLine = b
      ? '<div class="pf-best"><div class="pf-best-top">' + icon(b.natFlag) + " " + esc(String(b.name == null ? "—" : b.name).slice(0, 40)) + "</div>" +
        '<div class="pf-best-title">' + icon(b.posIcon) + " " + esc(String(b.title == null ? "" : b.title).slice(0, 80)) + "</div>" +
        '<div class="pf-best-stats">🏅 ' + num(b.score, 100000) + " pts · 📊 " + num(b.peakOvr, 99) + " · 💰 " + money(b.money) + "</div></div>"
      : '<p class="lb-sub">Aucune carrière partagée.</p>';
    // --- Panthéon partagé : réservé aux amis -------------------------------
    // `complet` est vide si la base a refusé (pas ami, ou non connecté). On
    // l'explique au lieu de masquer sans un mot.
    const runs = (complet && complet.stats && complet.stats.topRuns) || null;
    let pantheon;
    if (!complet) {
      // Le pseudo passe par T() : concaténé à la main, le message n'aurait
      // jamais correspondu à une clé du dictionnaire et serait resté français.
      pantheon = '<div class="pf-locked">🔒 Le Panthéon complet n\'est visible que par les amis.<br>' +
        T("Ajoutez {p} en ami pour découvrir toutes ses carrières.", { p: esc(row.pseudo || who) }) + "</div>";
    } else if (!runs || !runs.length) {
      pantheon = '<p class="lb-empty">Aucune carrière partagée pour l\'instant.</p>';
    } else {
      pantheon = runs.map((r, i) =>
        '<div class="pf-run"><span class="pf-run-rank">' + (i + 1) + "</span>" +
        '<span class="pf-run-main"><span class="pf-run-name">' + icon(r.natFlag) + " " + esc(String(r.name == null ? "—" : r.name).slice(0, 40)) + "</span>" +
        '<span class="pf-run-sub">' + icon(r.posIcon) + " " + esc(String(r.title == null ? "" : r.title).slice(0, 80)) +
        " · 📊 " + num(r.peakOvr, 99) + " · 💰 " + money(r.money) + "</span></span>" +
        '<span class="pf-run-score">' + num(r.score, 100000) + "</span></div>"
      ).join("");
    }

    // Ma propre fiche : on le dit, et on donne de quoi la modifier.
    const mine = !!(session && pseudo && row.pseudo && String(row.pseudo).toLowerCase() === pseudo.toLowerCase());
    pfBox.innerHTML =
      pfHead(avatarHtml(row.avatar, "pf-av") + esc(row.pseudo || who)) +
      (mine ? '<div class="pf-mine"><span>⭐ ' + esc(T("C'est ton profil, tel que les autres le voient.")) + '</span><button class="acc-btn soft" id="pf-edit">✏️ ' + esc(T("Modifier")) + "</button></div>" : "") +
      rankLine +
      '<div class="pf-counters"><span>⭐ ' + T("Niveau {n}", { n: Math.max(1, num(st.level, 9999)) }) + "</span><span>🏆 " + num(st.badges, 999) + " badges</span><span>🔥 " + num(st.bestStreak, 99999) + " " + T("j (série)") + "</span><span>👤 " + num(st.careers, 99999) + " " + T("carrières") + "</span></div>" +
      '<p class="pf-section">Meilleure carrière <span class="lb-sub" style="text-transform:none;letter-spacing:0">(vitrine, non vérifiée)</span></p>' +
      bestLine +
      '<p class="pf-section">Panthéon</p>' +
      pantheon;
    pfFermer();
    const edit = pfBox.querySelector("#pf-edit");
    if (edit) edit.onclick = () => { pfOverlay.classList.remove("on"); accTab = "profil"; open(); };
  }

  // ============================================================================
  //  Duels par pseudo (sans lien) + historique
  //  Envois auto en fin de partie (create/respond) → le serveur rejoue + départage.
  // ============================================================================
  async function callDuel(body) {
    if (!session) return { ok: false };
    return api.submitScore("duel", body);
  }
  function submitDuelCreate(o) { return callDuel({ action: "create", seed: o.seed, choices: o.choices, toPseudo: o.toPseudo, label: o.label, v: EV }); }
  function submitDuelRespond(o) { return callDuel({ action: "respond", id: o.id, choices: o.choices, label: o.label, v: EV }); }

  // Duels et Amis vivent désormais dans UN SEUL panneau à onglets (soOverlay,
  // plus bas) : regroupe défier/reçus/historique/classement/gérer-amis, avec
  // un raccourci "⚔️ Défier" directement sur chaque ami. Voir renderSocial().

  // ============================================================================
  //  Amis (suivi par pseudo) + classement entre amis
  //  Modèle « follow » : tu ajoutes un pseudo, ton classement = toi + tes suivis.
  // ============================================================================
  async function resolvePseudo(p) {
    const { data } = await api.rpc("profile_find", { pseudo: p });
    return data || null;
  }
  async function addFriend(p) {
    if (!session) return { ok: false, error: { message: "Connecte-toi." } };
    p = String(p || "").trim();
    if (!p) return { ok: false, error: { message: "Entre un pseudo." } };
    const found = await resolvePseudo(p);
    if (!found) return { ok: false, error: { message: "Aucun joueur avec ce pseudo." } };
    if (found.user_id === session.user.id) return { ok: false, error: { message: "C'est toi !" } };
    // Une demande part en « pending » : elle n'existe pour l'autre qu'une fois
    // acceptée. S'il nous a déjà invité, le serveur accepte SA demande : deux
    // invitations croisées resteraient sinon en attente face à face.
    const { data, error } = await api.rpc("friend_request", { friend_id: found.user_id });
    if (error) {
      if (error.code === "duplicate") return { ok: false, error: { message: T("{p} est déjà dans tes amis, ou a déjà reçu ton invitation.", { p: found.pseudo }) } };
      return { ok: false, error };
    }
    return { ok: true, pseudo: found.pseudo, accepted: !!data.accepted };
  }
  // Retirer un ami, refuser une demande reçue, annuler une demande envoyée :
  // dans les trois cas, le lien disparaît dans les deux sens.
  async function removeFriend(fid) {
    if (!session) return;
    await api.rpc("friend_remove", { friend_id: fid });
  }
  const declineRequest = removeFriend;
  const cancelRequest = removeFriend;

  // Amis acceptés, demandes envoyées, demandes reçues (avec le pseudo du
  // demandeur) : une seule lecture.
  async function friendLists() {
    if (!session) return { friends: [], outgoing: [], incoming: [] };
    const { data } = await api.rpc("friends_list");
    return data || { friends: [], outgoing: [], incoming: [] };
  }
  const listFriends = async () => (await friendLists()).friends;
  const listOutgoing = async () => (await friendLists()).outgoing;
  const listIncoming = async () => (await friendLists()).incoming;

  // Accepter : l'amitié devient réciproque.
  async function acceptRequest(fromId) {
    if (!session) return { ok: false };
    const { error } = await api.rpc("friend_accept", { from_id: fromId });
    return error ? { ok: false, error } : { ok: true };
  }

  // Panneau unique « Amis & Duels » : les deux anciens panneaux (duOverlay,
  // frOverlay) tenaient des rôles très proches (retrouver quelqu'un par
  // pseudo, jouer contre lui) — regroupés ici en 5 onglets, avec un
  // raccourci "⚔️ Défier" directement sur chaque ami (onglet Amis).
  const soOverlay = document.createElement("div");
  soOverlay.className = "acc-overlay";
  soOverlay.innerHTML = '<div class="lb-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(soOverlay);
  const soBox = soOverlay.querySelector(".lb-box");
  soOverlay.addEventListener("click", (e) => { if (e.target === soOverlay) soOverlay.classList.remove("on"); });
  let soTab = "challenge";
  let rankTab = "today"; // sous-onglet du Classement (today/week/alltime)
  // Pastille sur l'onglet « Amis » : sans elle, une demande reçue resterait
  // invisible tant qu'on n'ouvre pas l'onglet.
  let soPending = 0;
  function paintPendingBadge() {
    const tab = soBox.querySelector('.lb-tab[data-t="friends"]');
    if (tab) tab.innerHTML = "Amis" + (soPending ? ' <span class="fr-badge">' + soPending + "</span>" : "");
  }

  // `msg` : retour à afficher après une action ({ text, cls }). `prefill` :
  // pseudo pré-rempli en arrivant sur l'onglet Défier (raccourci "⚔️ Défier"
  // depuis la liste d'amis).
  async function renderSocial(msg?, prefill?) {
    soBox.innerHTML =
      '<button class="acc-x" aria-label="Fermer">×</button><h3>👥 Amis &amp; Duels</h3>' +
      '<div class="lb-tabs">' +
      '<button class="lb-tab' + (soTab === "challenge" ? " on" : "") + '" data-t="challenge">Défier</button>' +
      '<button class="lb-tab' + (soTab === "incoming" ? " on" : "") + '" data-t="incoming">Reçus</button>' +
      '<button class="lb-tab' + (soTab === "history" ? " on" : "") + '" data-t="history">Historique</button>' +
      '<button class="lb-tab' + (soTab === "ranking" ? " on" : "") + '" data-t="ranking">Classement</button>' +
      '<button class="lb-tab' + (soTab === "friends" ? " on" : "") + '" data-t="friends">Amis</button>' +
      "</div><div class=\"lb-content\"><p class=\"lb-empty\">Chargement…</p></div>";
    soBox.querySelector(".acc-x").onclick = () => soOverlay.classList.remove("on");
    soBox.querySelectorAll(".lb-tab").forEach((b) => (b.onclick = () => { soTab = b.dataset.t; renderSocial(); }));
    paintPendingBadge();
    const content = soBox.querySelector(".lb-content");

    if (!session) { content.innerHTML = '<p class="lb-empty">Connecte-toi (👤) pour défier des joueurs et gérer tes amis.</p>'; return; }

    // ---- Défier -------------------------------------------------------------
    if (soTab === "challenge") {
      if (!pseudo) { content.innerHTML = '<p class="lb-empty">Choisis d\'abord un pseudo dans « Mon compte ».</p>'; return; }
      const friends = await listFriends();
      content.innerHTML =
        '<p class="acc-sub" style="margin:4px 0 8px">Entre un pseudo, ou choisis un ami ci-dessous. Tu joues ta carrière, ton défi lui est envoyé (même parcours pour vous deux).</p>' +
        '<input type="text" id="du-pseudo" maxlength="24" placeholder="Pseudo de l\'adversaire" value="' + esc(prefill || "") + '" style="width:100%;box-sizing:border-box;margin:0 0 8px;padding:11px 13px;border:1.5px solid rgba(12,45,30,.18);border-radius:10px;font-size:1rem" />' +
        '<button class="acc-btn primary" id="du-go" style="margin:0">🆚 Lancer le défi</button><p class="acc-msg"></p>' +
        (friends.length
          ? '<p class="fr-head">Tes amis</p><ul class="lb-list">' + friends.map((f) =>
              '<li class="lb-row"><span class="lb-name">' + avatarHtml(f.avatar, "av-mini") + " " + esc(f.friend_pseudo) + '</span>' +
              '<button class="acc-btn soft du-pick" data-p="' + esc(f.friend_pseudo) + '" style="width:auto;margin:0;padding:6px 10px;font-size:.78rem">⚔️ Défier</button></li>'
            ).join("") + "</ul>"
          : "");
      const go = async () => {
        const p = content.querySelector("#du-pseudo").value.trim();
        const m = content.querySelector(".acc-msg");
        if (p.length < 2) { m.textContent = "Pseudo trop court."; m.className = "acc-msg err"; return; }
        if (p.toLowerCase() === (pseudo || "").toLowerCase()) { m.textContent = "Tu ne peux pas te défier toi-même."; m.className = "acc-msg err"; return; }
        // Vérifie que le pseudo existe AVANT de jouer (évite un run perdu sur une faute).
        m.textContent = "Vérification…"; m.className = "acc-msg";
        const found = await resolvePseudo(p);
        if (!found) { m.textContent = "Aucun joueur avec ce pseudo."; m.className = "acc-msg err"; return; }
        soOverlay.classList.remove("on");
        // Utilise la casse exacte du profil trouvé.
        if (window.OpenElevenGame && window.OpenElevenGame.startDuelVsPseudo) window.OpenElevenGame.startDuelVsPseudo(found.pseudo);
      };
      content.querySelector("#du-go").onclick = go;
      content.querySelectorAll(".du-pick").forEach((b) => (b.onclick = () => { content.querySelector("#du-pseudo").value = b.dataset.p; go(); }));
      return;
    }

    // ---- Reçus ----------------------------------------------------------------
    if (soTab === "incoming") {
      let rows = [];
      try { const { data } = await api.rpc("duels_incoming"); rows = data || []; } catch (_) {}
      refreshNotifs(); // garde la pastille d'accueil synchro (compte combiné amis+duels)
      content.innerHTML = rows.length
        ? '<ul class="lb-list">' + rows.map((r, i) =>
            '<li class="lb-row"><span class="lb-name">🆚 <strong>' + esc(r.from_label || r.from_pseudo) + "</strong><br><span class=\"lb-sub\">" + T("te défie · {n} pts à battre", { n: r.from_score }) + "</span></span>" +
            '<button class="acc-btn soft du-accept" data-i="' + i + '" style="width:auto;margin:0;padding:8px 12px">Relever</button></li>'
          ).join("") + "</ul>"
        : '<p class="lb-empty">Aucun défi en attente.</p>';
      content.querySelectorAll(".du-accept").forEach((b) => (b.onclick = () => {
        const r = rows[Number(b.dataset.i)];
        soOverlay.classList.remove("on");
        if (window.OpenElevenGame && window.OpenElevenGame.acceptServerDuel) window.OpenElevenGame.acceptServerDuel(r);
      }));
      return;
    }

    // ---- Historique (+ défis envoyés encore en attente, annulables) -----------
    if (soTab === "history") {
      let out = [], hist = [];
      try { const a = await api.rpc("duels_outgoing"); out = a.data || []; } catch (_) {}
      try { const b = await api.rpc("duels_history"); hist = b.data || []; } catch (_) {}
      let html = "";
      if (out.length) {
        html += '<p class="acc-sub" style="margin:6px 0 4px;font-weight:700">En attente (envoyés)</p><ul class="lb-list">' +
          out.map((r, i) =>
            '<li class="lb-row"><span class="lb-name">vs <strong>' + esc(r.to_pseudo) + '</strong> <span class="lb-sub">' + T("{n} pts · en attente", { n: r.from_score }) + "</span></span>" +
            '<button class="acc-btn danger du-cancel" data-i="' + i + '" style="width:auto;margin:0;padding:7px 10px">Annuler</button></li>'
          ).join("") + "</ul>";
      }
      if (hist.length) {
        if (out.length) html += '<p class="acc-sub" style="margin:12px 0 4px;font-weight:700">Terminés</p>';
        html += '<ul class="lb-list">' + hist.map((r) => {
          const mine = r.i_am, myScore = mine === "from" ? r.from_score : r.to_score, opp = mine === "from" ? r.to_pseudo : r.from_pseudo, oppScore = mine === "from" ? r.to_score : r.from_score;
          const res = r.winner === "tie" ? '<span style="color:var(--text-1,#567)">Nul</span>' : (r.winner === mine ? '<span style="color:var(--green,#087b4b);font-weight:800">Victoire</span>' : '<span style="color:#b3261e;font-weight:800">Défaite</span>');
          return '<li class="lb-row"><span class="lb-name">vs <strong>' + esc(opp) + "</strong> <span class=\"lb-sub\">" + myScore + " – " + oppScore + "</span></span>" +
            '<span class="lb-pts" style="display:flex;align-items:center;gap:8px">' + res +
            '<button class="acc-btn soft du-rematch" data-opp="' + esc(opp) + '" style="width:auto;margin:0;padding:6px 9px;font-size:.78rem">Revanche</button></span></li>';
        }).join("") + "</ul>";
      }
      content.innerHTML = html || '<p class="lb-empty">Aucun duel pour l\'instant.</p>';
      content.querySelectorAll(".du-cancel").forEach((b) => (b.onclick = async () => {
        const r = out[Number(b.dataset.i)];
        b.disabled = true; b.textContent = "…";
        try { await api.rpc("duel_cancel", { p_id: r.id }); } catch (_) {}
        renderSocial();
      }));
      content.querySelectorAll(".du-rematch").forEach((b) => (b.onclick = () => {
        soOverlay.classList.remove("on");
        if (window.OpenElevenGame && window.OpenElevenGame.startDuelVsPseudo) window.OpenElevenGame.startDuelVsPseudo(b.dataset.opp);
      }));
      return;
    }

    // ---- Classement entre amis (moi + suivis) ----------------------------------
    if (soTab === "ranking") {
      const rankLabel = { today: "Aujourd'hui", week: "Semaine", alltime: "Général" };
      content.innerHTML =
        '<div class="lb-tabs" style="margin-bottom:8px">' + ["today", "week", "alltime"].map((t) =>
          '<button class="lb-tab so-rank' + (rankTab === t ? " on" : "") + '" data-r="' + t + '">' + rankLabel[t] + "</button>"
        ).join("") + '</div><div id="so-rank-body"><p class="lb-empty">Chargement…</p></div>';
      content.querySelectorAll(".so-rank").forEach((b) => (b.onclick = () => { rankTab = b.dataset.r; renderSocial(); }));
      const body = content.querySelector("#so-rank-body");
      try {
        let rows, isRange = rankTab !== "today";
        if (rankTab === "today") { const { data } = await api.rpc("friends_daily", { d: todayKeyLocal(), lim: 100 }); rows = data || []; }
        else { const { data } = await api.rpc("friends_range", { since: rankTab === "week" ? weekSince() : "", lim: 100 }); rows = data || []; }
        body.innerHTML = rows.length
          ? '<ul class="lb-list">' + rows.map((r) => {
              const val = isRange ? r.total : r.score;
              const sub = isRange ? ' <span class="lb-sub">· ' + r.days + " j</span>" : "";
              return '<li class="lb-row' + (r.is_me ? " mine" : "") + '" data-pseudo="' + esc(r.pseudo || "") + '">' +
                '<span class="lb-rank">' + medalR(Number(r.rank)) + "</span>" +
                '<span class="lb-name">' + esc(r.pseudo || "Joueur") + (r.is_me ? " <span class=\"lb-sub\">(toi)</span>" : "") + "</span>" +
                '<span class="lb-pts">' + val + ' <span class="lb-sub">pts</span>' + sub + "</span></li>";
            }).join("") + "</ul>"
          : '<p class="lb-empty">Personne n\'a encore joué le défi. Invite des amis dans « Amis ».</p>';
        body.querySelectorAll(".lb-row[data-pseudo]").forEach((el) => { if (el.dataset.pseudo) el.onclick = () => openProfile(el.dataset.pseudo); });
      } catch (e) {
        body.innerHTML = '<p class="lb-empty">Classement indisponible pour le moment.</p>';
      }
      return;
    }

    // ---- Amis (ex-« Gérer ») : demandes + liste, avec raccourci Défier --------
    const [incoming, outgoing, friends] = await Promise.all([listIncoming(), listOutgoing(), listFriends()]);
    soPending = incoming.length;
    paintPendingBadge();
    refreshNotifs(); // garde la pastille d'accueil synchro (accept/refus la font varier)
    const nameCell = (p, av) =>
      '<span class="lb-name" data-pseudo="' + esc(p || "") + '" style="cursor:pointer">' + avatarHtml(av, "av-mini") + " " + esc(p || "Joueur") + "</span>";
    const btn = (cls, label, i) =>
      '<button class="acc-btn ' + cls + '" data-i="' + i + '" style="width:auto;margin:0;padding:6px 10px;font-size:.78rem">' + label + "</button>";
    const group = (title, rows, html) =>
      rows.length ? '<p class="fr-head">' + title + "</p><ul class=\"lb-list\">" + rows.map(html).join("") + "</ul>" : "";

    content.innerHTML =
      '<div class="acc-row" style="margin:2px 0 6px"><input type="text" id="fr-pseudo" maxlength="24" placeholder="Inviter un ami par pseudo" style="margin:0" />' +
      '<button class="acc-btn soft" id="fr-add" style="width:auto;padding:11px 14px">Inviter</button></div><p class="acc-msg"></p>' +
      group("Demandes reçues", incoming, (f, i) =>
        '<li class="lb-row">' + nameCell(f.from_pseudo, f.avatar) +
        '<span class="fr-acts">' + btn("soft fr-ok", "Accepter", i) + btn("danger fr-no", "Refuser", i) + "</span></li>") +
      group("Invitations envoyées", outgoing, (f, i) =>
        '<li class="lb-row">' + nameCell(f.friend_pseudo, f.avatar) +
        '<span class="fr-acts"><span class="lb-sub">En attente</span>' + btn("danger fr-cancel", "Annuler", i) + "</span></li>") +
      (friends.length
        ? group("Amis", friends, (f, i) =>
            '<li class="lb-row">' + nameCell(f.friend_pseudo, f.avatar) +
            '<span class="fr-acts">' + btn("soft fr-challenge", "⚔️ Défier", i) + btn("danger fr-del", "Retirer", i) + "</span></li>")
        : '<p class="lb-empty">Aucun ami pour l\'instant. Invite un pseudo ci-dessus : il devra accepter ta demande.</p>');

    // Le message survit au re-rendu : il est repeint APRÈS, sinon
    // renderSocial() l'effacerait aussitôt écrit.
    const m = content.querySelector(".acc-msg");
    if (msg) { m.textContent = msg.text; m.className = "acc-msg " + msg.cls; }

    const doAdd = async () => {
      const r = await addFriend(content.querySelector("#fr-pseudo").value);
      if (!r.ok) {
        m.textContent = (r.error && r.error.message) || T("Échec");
        m.className = "acc-msg err";
        return;
      }
      renderSocial({
        text: T(r.accepted ? "Vous êtes maintenant amis avec {p} ✔" : "Invitation envoyée à {p} ✔", { p: r.pseudo }),
        cls: "ok",
      });
    };
    content.querySelector("#fr-add").onclick = doAdd;
    content.querySelector<HTMLElement>("#fr-pseudo").addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") doAdd(); });

    const act = (sel, fn) => content.querySelectorAll(sel).forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      renderSocial(await fn(Number(b.dataset.i)));
    }));
    act(".fr-ok", async (i) => {
      const who = incoming[i].from_pseudo;
      const r = await acceptRequest(incoming[i].user_id);
      return r.ok
        ? { text: T("Vous êtes maintenant amis avec {p} ✔", { p: who }), cls: "ok" }
        : { text: T("Échec, réessaie."), cls: "err" };
    });
    act(".fr-no", (i) => declineRequest(incoming[i].user_id));
    act(".fr-cancel", (i) => cancelRequest(outgoing[i].friend_id));
    act(".fr-del", (i) => removeFriend(friends[i].friend_id));
    content.querySelectorAll(".fr-challenge").forEach((b) => (b.onclick = () => {
      soTab = "challenge";
      renderSocial(null, friends[Number(b.dataset.i)].friend_pseudo);
    }));
    content.querySelectorAll("[data-pseudo]").forEach((el) => { if (el.dataset.pseudo) el.onclick = () => openProfile(el.dataset.pseudo); });
  }
  // tab : onglet à ouvrir (« incoming », « history », « friends »…) — depuis une notification.
  function openSocial(tab?) {
    soTab = typeof tab === "string" ? tab : "challenge";
    renderSocial();
    soOverlay.classList.add("on");
    // Compté en arrière-plan : la pastille de l'onglet Amis doit apparaître
    // dès l'ouverture, sans attendre qu'on y clique.
    if (session) listIncoming().then((r) => { soPending = r.length; paintPendingBadge(); }).catch(() => {});
  }

  // ---- pool de légendes communautaires (invité du mercato) -------------------
  let legendsCache = [];
  async function loadLegends() {
    try { const { data } = await api.rpc("random_legends", { n: 16 }); if (Array.isArray(data)) legendsCache = data; } catch (_) {}
  }
  function getLegends() { return legendsCache; }
  loadLegends();

  // ---- Compteurs communautaires -----------------------------------------------
  // Totaux agrégés et anonymes : aucun identifiant, aucun cookie, aucune donnée
  // personnelle. La liste des clés acceptées vit dans la base (bump_stat) —
  // une clé inconnue y est ignorée sans erreur.
  // Silencieux par construction : un compteur ne doit JAMAIS gêner une partie
  // ni retarder un affichage.
  async function bumpStat(cle) {
    try { await api.rpc("bump_stat", { cle: cle }); } catch (_) {}
  }
  async function getStats() {
    try {
      const { data, error } = await api.rpc("stats_publiques");
      if (error) return null;
      const o = {};
      (data || []).forEach((r) => { o[r.cle] = Number(r.valeur) || 0; });
      return o;
    } catch (_) { return null; }
  }

  // ---- Pastille de notification (accueil : Amis & Duels) ---------------------
  // Un petit compteur rouge en coin du bouton dès qu'une invitation arrive —
  // demande d'ami ou défi reçu, comptés ensemble sur le bouton unique — pour
  // ne plus avoir à ouvrir la fenêtre pour le savoir. Compté côté serveur,
  // rafraîchi à la connexion, au retour sur l'onglet, après chaque action, et
  // par un léger sondage périodique. Silencieux : une pastille ne doit jamais
  // gêner le jeu.
  function setNavBadge(btnId, n) {
    const b = document.getElementById(btnId);
    if (!b) return;
    let badge = b.querySelector(".online-badge");
    if (!n) { if (badge) badge.remove(); return; }
    if (!badge) { badge = document.createElement("span"); badge.className = "online-badge"; b.appendChild(badge); }
    const txt = n > 99 ? "99+" : String(n);
    if (badge.textContent !== txt) badge.textContent = txt;
  }
  // Comptages légers : on ne résout pas les pseudos (contrairement à
  // listIncoming), seul le nombre compte. Toute erreur → 0, jamais d'exception.
  async function countIncomingFriends() {
    try { return (await listIncoming()).length; }
    catch (_) { return 0; }
  }
  async function countIncomingDuels() {
    try { const { data } = await api.rpc("duels_incoming"); return (data || []).length; }
    catch (_) { return 0; }
  }
  let notifsBusy = false;
  async function refreshNotifs() {
    if (!session) { setNavBadge("btn-social", 0); return; }
    if (notifsBusy) return; // évite les appels concurrents (poll + retour d'onglet)
    notifsBusy = true;
    try {
      const [f, d] = await Promise.all([countIncomingFriends(), countIncomingDuels()]);
      setNavBadge("btn-social", f + d);
    } finally { notifsBusy = false; }
  }
  // Sondage discret : ne tourne que quand l'onglet est visible et qu'on est
  // connecté — inutile d'interroger le serveur pour une page en arrière-plan.
  setInterval(() => { if (document.visibilityState === "visible" && session) refreshNotifs(); }, 60000);

  // ---- API publique pour le jeu ----------------------------------------------
  window.OpenElevenAccount = {
    submitDaily, openLeaderboard, openProfile, getLegends, pushProfile: pushProfileStats,
    submitDuelCreate, submitDuelRespond, openSocial,
    bumpStat, getStats, refreshNotifs,
    // Exposés pour room.ts (mode « carrière commune ») : ce module reste
    // autonome (aucune notion de salle ici), il ne fait qu'exposer ce qu'il
    // sait déjà (client du serveur, session, liste d'amis acceptés).
    getClient: () => api, getSession: () => session, listFriends, listOutgoing, addFriend, avatarHtml,
    // Historique des carrières du compte (écran Panthéon).
    saveCareer: flushCareers,
    listCareers: (opts) => api.rpc("careers_list", opts || {}),
    getCareer: (id) => api.rpc("careers_get", { id }),
    setCareerFavorite: (id, favorite) => api.rpc("careers_favorite", { id, favorite }),
    deleteCareer: (id) => api.rpc("careers_delete", { id }),
  };

  // ---- bouton d'accueil -------------------------------------------------------
  if (btn) btn.addEventListener("click", open);
})();
