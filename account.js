/* ============================================================
   Compte & sauvegarde cloud (Supabase) — module AUTONOME.
   • Ne touche pas au gameplay : lit/écrit uniquement les clés localStorage
     du jeu, et recharge la page après une restauration.
   • Désactivé tant que src/supabase-config.js n'est pas renseigné → le jeu
     reste 100% invité/local. Voir SUPABASE_SETUP.md.
   • Auth : e-mail + mot de passe. Sécurité des données : RLS côté Supabase
     (chaque utilisateur ne voit que SA sauvegarde).
   ============================================================ */
(function () {
  "use strict";
  // Texte traduisible. Les libellés injectés dans le DOM sont pris en charge
  // automatiquement par i18n.js ; T() ne sert donc qu'aux textes qui n'y
  // passent PAS — les boîtes natives confirm() — et à ceux qui portent des
  // valeurs. Le gabarit français est la clé : sans traduction, il s'affiche
  // tel quel.
  // ⚠️ Les valeurs sont insérées SANS échappement. Ici plus qu'ailleurs, la
  // donnée vient du SERVEUR (pseudos, libellés de duel) : passer par esc() à
  // l'appel. Cf. le contrat détaillé dans i18n.js.
  const T = (tpl, vars) => (window.I18N ? window.I18N.t(tpl, vars) : (vars
    ? Object.keys(vars).reduce((a, k) => a.split("{" + k + "}").join(vars[k] == null ? "" : String(vars[k])), tpl)
    : tpl));

  const KEYS = ["openEleven_current", "destinDeChampion_pantheon", "destinDeChampion_progress"];
  const URL = window.SUPABASE_URL, ANON = window.SUPABASE_ANON_KEY;
  // Version du moteur envoyée avec chaque journal de choix : le serveur rejoue avec
  // data.js/engine.js DE CETTE VERSION. Évite qu'un déploiement en cours de journée
  // fasse vérifier des runs avec un moteur différent de celui qui les a produits.
  const EV = (window.Engine && window.Engine.ENGINE_VERSION) || "";
  const btn = document.getElementById("btn-account");

  // Config absente ou SDK non chargé → mode invité, on masque le bouton.
  if (!URL || !ANON || !window.supabase || !window.supabase.createClient) {
    if (btn) btn.style.display = "none";
    return;
  }

  if (btn) btn.style.display = ""; // config présente → on révèle le bouton Compte
  const sb = window.supabase.createClient(URL, ANON, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  let session = null;
  let lastPush = 0;
  // E-mail dont l'inscription attend une confirmation. Renseigné quand signUp
  // n'ouvre PAS de session : c'est le signal que « Confirm email » est activé
  // côté Supabase et qu'un lien a été envoyé.
  let pendingEmail = null;
  // Vrai quand on arrive depuis un lien « mot de passe oublié » : la session
  // ouverte par le jeton ne sert qu'à définir un nouveau mot de passe.
  let recoveryMode = false;

  // Garde-fou de saisie. La validation qui fait foi reste celle du serveur ;
  // celle-ci évite juste d'envoyer une adresse manifestement erronée.
  function looksLikeEmail(v) { return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(v); }

  // ---- localStorage <-> cloud -------------------------------------------------
  function collectLocal() {
    const d = {};
    KEYS.forEach((k) => { const v = localStorage.getItem(k); if (v != null) d[k] = v; });
    return d;
  }
  function hasLocalData() {
    return !!localStorage.getItem("destinDeChampion_pantheon") || !!localStorage.getItem("destinDeChampion_progress");
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

  async function serverStamp() {
    const { data } = await sb.from("saves").select("updated_at").eq("user_id", session.user.id).maybeSingle();
    return data ? data.updated_at : null;
  }

  // `force` : écrase sciemment la version distante (choix explicite du joueur).
  async function pushSave(force) {
    if (!session) return { ok: false };
    lastPush = Date.now();
    const uid = session.user.id;
    const now = new Date().toISOString();
    const payload = { user_id: uid, data: collectLocal(), updated_at: now };

    if (!force) {
      const remote = await serverStamp();
      // Une version distante existe et n'est pas celle qu'on connaît :
      // quelqu'un (un autre appareil) a écrit entre-temps.
      if (remote && cloudStamp !== remote) {
        conflictInfo = { serverStamp: remote };
        return { ok: false, conflict: true, serverStamp: remote };
      }
    }
    const { error } = await sb.from("saves").upsert(payload, { onConflict: "user_id" });
    if (error) return { ok: false, error };
    cloudStamp = now;
    conflictInfo = null;
    return { ok: true };
  }

  async function pullSave() {
    if (!session) return { ok: false };
    const { data, error } = await sb.from("saves").select("data, updated_at").eq("user_id", session.user.id).maybeSingle();
    // Lire, c'est se resynchroniser : on repart de la version du serveur.
    if (!error && data) cloudStamp = data.updated_at;
    return { ok: !error, row: data, error };
  }

  // Date lisible pour départager deux versions dans l'interface.
  function stampLabel(iso) {
    try { return new Date(iso).toLocaleString(); } catch (e) { return String(iso || ""); }
  }

  // ---- UI (modale injectée) ---------------------------------------------------
  const style = document.createElement("style");
  style.textContent =
    ".acc-overlay{position:fixed;inset:0;z-index:900;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(3,20,12,.62);backdrop-filter:blur(3px)}" +
    ".acc-overlay.on{display:flex}" +
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
  function msg(text, kind) { const m = box.querySelector(".acc-msg"); if (m) { m.textContent = text || ""; m.className = "acc-msg" + (kind ? " " + kind : ""); } }

  function renderModal() {
    if (!overlay.classList.contains("on") && !session) { /* pas ouvert : rien à re-rendre de visible */ }
    if (recoveryMode) { renderNewPassword(); return; }
    if (!session && pendingEmail) { renderPending(); return; }
    if (session) {
      box.innerHTML =
        '<button class="acc-x" aria-label="Fermer">×</button>' +
        "<h3>Mon compte</h3>" +
        '<p class="acc-sub">Connecté : <span class="acc-mail">' + esc(session.user.email || "") + "</span></p>" +
        // Une sauvegarde automatique refusée ne doit pas passer inaperçue :
        // le joueur doit savoir que le cloud diverge, et pouvoir trancher.
        (conflictInfo
          ? '<p class="acc-warn">⚠️ ' + T("Une sauvegarde plus récente existe sur un autre appareil ({date}). Votre progression locale n'a pas été envoyée.", { date: esc(stampLabel(conflictInfo.serverStamp)) }) + "</p>"
          : "") +
        '<p class="acc-sub" style="margin:0 0 4px">Pseudo au classement mondial :</p>' +
        '<div class="acc-row"><input type="text" id="acc-pseudo" maxlength="24" placeholder="Ton pseudo" value="' + esc(pseudo || "") + '" style="margin:0" />' +
        '<button class="acc-btn soft" id="acc-savepseudo" style="width:auto;padding:11px 14px">OK</button></div>' +
        '<button class="acc-btn primary" id="acc-push">☁️ Sauvegarder maintenant</button>' +
        '<button class="acc-btn soft" id="acc-profile">🏛️ Voir mon profil public</button>' +
        '<button class="acc-btn soft" id="acc-pull">📥 Restaurer depuis le cloud</button>' +
        '<button class="acc-btn danger" id="acc-signout">Se déconnecter</button>' +
        '<p class="acc-msg"></p>';
      box.querySelector(".acc-x").onclick = close;
      box.querySelector("#acc-savepseudo").onclick = async () => {
        const r = await savePseudo(box.querySelector("#acc-pseudo").value);
        msg(r.ok ? "Pseudo enregistré ✔" : (r.error && r.error.message) || "Échec", r.ok ? "ok" : "err");
      };
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
        msg(r.ok ? "Sauvegarde envoyée au cloud ✔" : "Échec : " + (r.error && r.error.message || "erreur"), r.ok ? "ok" : "err");
        renderModal();
      };
      box.querySelector("#acc-profile").onclick = async () => {
        if (!pseudo) return msg("Choisis d'abord un pseudo ci-dessus.", "err");
        await pushProfileStats(); close(); openProfile(pseudo);
      };
      box.querySelector("#acc-pull").onclick = async () => {
        msg("Récupération…");
        const r = await pullSave();
        if (!r.ok) return msg("Échec : " + (r.error && r.error.message || "erreur"), "err");
        if (!r.row || !r.row.data || !Object.keys(r.row.data).length) return msg("Aucune sauvegarde cloud pour l'instant.", "err");
        if (confirm(T("Restaurer la sauvegarde cloud ? Cela REMPLACE votre partie locale actuelle."))) { applyLocal(r.row.data); location.reload(); }
      };
      box.querySelector("#acc-signout").onclick = async () => { await sb.auth.signOut(); msg(""); };
    } else {
      box.innerHTML =
        '<button class="acc-x" aria-label="Fermer">×</button>' +
        "<h3>Compte & sauvegarde cloud</h3>" +
        '<p class="acc-sub">Optionnel. Retrouvez vos carrières, votre Panthéon et votre progression sur tous vos appareils.</p>' +
        '<input type="email" id="acc-email" placeholder="E-mail" autocomplete="email" />' +
        '<input type="password" id="acc-pass" placeholder="Mot de passe (8+ caractères)" autocomplete="current-password" />' +
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
        const { error } = await sb.auth.signInWithPassword({ email: email(), password: pass() });
        if (error) msg(traduire(error.message), "err");
      };
      box.querySelector("#acc-forgot").onclick = async () => {
        if (!looksLikeEmail(email())) return msg("Renseigne d'abord ton e-mail ci-dessus.", "err");
        msg(T("Envoi…"));
        // redirectTo ramène sur le jeu : le lien arrive avec un jeton dans le
        // hash, que l'on consomme au chargement (cf. consumeRecoveryHash).
        const { error } = await sb.auth.resetPasswordForEmail(email(), { redirectTo: location.origin + location.pathname });
        // Réponse volontairement identique que le compte existe ou non : dire
        // « cette adresse est inconnue » permettrait d'énumérer les comptes.
        if (error && /rate limit|too many/i.test(error.message || "")) return msg(traduire(error.message), "err");
        msg("Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.", "ok");
      };
      box.querySelector("#acc-signup").onclick = async () => {
        if (!looksLikeEmail(email())) return msg("Adresse e-mail invalide.", "err");
        if (pass().length < 8) return msg("Mot de passe : 8 caractères minimum.", "err");
        msg("Création…");
        const { data, error } = await sb.auth.signUp({ email: email(), password: pass() });
        if (error) return msg(traduire(error.message), "err");
        if (data && data.session) {
          // Une session est ouverte d'emblée : « Confirm email » est DÉSACTIVÉ
          // côté Supabase, n'importe quelle adresse inventée passe. Voir README
          // (Authentication → Providers → Email → Confirm email) pour l'activer.
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
      '<input type="password" id="acc-np" placeholder="Nouveau mot de passe (8+ caractères)" autocomplete="new-password" />' +
      '<input type="password" id="acc-np2" placeholder="Confirmer le mot de passe" autocomplete="new-password" />' +
      '<button class="acc-btn primary" id="acc-np-save">Enregistrer</button>' +
      '<p class="acc-msg"></p>';
    box.querySelector(".acc-x").onclick = () => { recoveryMode = false; close(); renderModal(); };
    box.querySelector("#acc-np-save").onclick = async () => {
      const a = box.querySelector("#acc-np").value, b = box.querySelector("#acc-np2").value;
      if (a.length < 8) return msg("Mot de passe : 8 caractères minimum.", "err");
      if (a !== b) return msg("Les deux mots de passe ne correspondent pas.", "err");
      msg(T("Enregistrement…"));
      const { error } = await sb.auth.updateUser({ password: a });
      if (error) return msg(traduire(error.message), "err");
      recoveryMode = false;
      msg("Mot de passe mis à jour ✔", "ok");
      // La session du jeton devient une session normale : on rebascule sur
      // « Mon compte », déjà connecté.
      const { data } = await sb.auth.getSession();
      session = data.session;
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
      const { error } = await sb.auth.resend({ type: "signup", email: pendingEmail });
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
    return m;
  }

  // ---- au login frais : réconcilier local <-> cloud --------------------------
  async function onFreshLogin() {
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
  // Le client est créé avec detectSessionInUrl:false, pour que le SDK ne touche
  // pas au hash — le jeu s'en sert pour les liens de duel (#duel=…). On lit
  // donc NOUS-MÊMES le jeton de récupération que Supabase renvoie dans le hash.
  async function consumeRecoveryHash() {
    const h = (location.hash || "").replace(/^#/, "");
    if (!h || h.indexOf("type=recovery") === -1) return false;
    const p = new URLSearchParams(h);
    const at = p.get("access_token"), rt = p.get("refresh_token");
    if (!at) return false;
    // Le hash est retiré immédiatement : un rechargement ne doit pas rejouer le
    // jeton, et il n'a rien à faire dans l'historique du navigateur.
    history.replaceState(null, "", location.pathname + location.search);
    // Posé AVANT setSession : celui-ci déclenche onAuthStateChange(SIGNED_IN),
    // qui doit déjà savoir qu'on est en récupération — sinon la réconciliation
    // de sauvegarde cloud s'ouvrirait en plein milieu du parcours.
    recoveryMode = true;
    const { error } = await sb.auth.setSession({ access_token: at, refresh_token: rt || "" });
    if (error) { recoveryMode = false; return false; }
    open();
    renderModal();
    return true;
  }

  // ---- état d'auth ------------------------------------------------------------
  sb.auth.onAuthStateChange((event, s) => {
    session = s;
    if (s) pendingEmail = null; // confirmé et connecté : l'écran d'attente n'a plus lieu d'être
    renderModal();
    // En récupération, on ne déclenche PAS la réconciliation locale/cloud :
    // le joueur n'est là que pour changer son mot de passe.
    if (event === "SIGNED_IN" && !recoveryMode) { onFreshLogin(); loadPseudo().then(() => { renderModal(); pushProfileStats(); }); }
    if (event === "SIGNED_OUT") { pseudo = null; cloudStamp = null; conflictInfo = null; }
  });
  // On tente d'abord la récupération : si le hash porte un jeton, il ouvre
  // directement l'écran « nouveau mot de passe » plutôt que la session normale.
  consumeRecoveryHash().then((recovered) => {
    if (recovered) return;
    sb.auth.getSession().then(({ data }) => { session = data.session; renderModal(); if (session) loadPseudo().then(() => { renderModal(); pushProfileStats(); }); });
  });

  // ---- sauvegarde auto quand on quitte / passe en arrière-plan ---------------
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && session && Date.now() - lastPush > 8000) { pushSave(); pushProfileStats(); }
  });

  // ============================================================================
  //  Classement mondial VÉRIFIÉ du Défi du jour
  //  • submitDaily : envoie SEULEMENT (date, choix) ; le serveur rejoue + recalcule.
  //  • Lecture du classement : publique (RPC), fonctionne même sans compte.
  // ============================================================================
  let pseudo = null;
  // Modération de confort (message immédiat). La liste vient de src/badwords.js
  // (source UNIQUE, partagée avec le trigger DB via supabase/badwords.sql).
  // On normalise (minuscules + sans accents) pour attraper « Nègre » / « negre ».
  const BADWORDS = (function () {
    const norm = (s) => String(s).toLowerCase().normalize("NFD").split("").filter((c) => { const n = c.charCodeAt(0); return n < 0x300 || n > 0x36f; }).join("").replace(/[^a-z0-9]+/g, " ");
    const list = (window.OE_BADWORDS && window.OE_BADWORDS.length)
      ? window.OE_BADWORDS
      : ["fuck", "shit", "con", "pute", "salope", "encule", "nigger", "faggot", "pd", "nazi"]; // repli si non chargé
    const esc = list.map((w) => norm(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).filter(Boolean);
    let re;
    try { re = new RegExp("\\b(" + esc.join("|") + ")\\b", "i"); } catch (_) { re = /\b(fuck|shit|con|pute)\b/i; }
    return { test: (p) => re.test(norm(p)) };
  })();

  async function loadPseudo() {
    if (!session) { pseudo = null; return; }
    const { data } = await sb.from("profiles").select("pseudo").eq("user_id", session.user.id).maybeSingle();
    pseudo = data && data.pseudo ? data.pseudo : null;
  }
  async function savePseudo(p) {
    if (!session) return { ok: false };
    p = String(p || "").trim().slice(0, 24);
    if (p.length < 2) return { ok: false, error: { message: "Pseudo trop court (2 caractères min)." } };
    if (BADWORDS.test(p)) return { ok: false, error: { message: "Pseudo non autorisé." } };
    // Pré-vérif best-effort : déjà pris par un AUTRE joueur (insensible à la casse).
    // On échappe %/_ pour que ilike fasse une correspondance exacte, pas un motif.
    const esc = p.replace(/[\\%_]/g, "\\$&");
    const { data: taken } = await sb.from("profiles").select("user_id").ilike("pseudo", esc).neq("user_id", session.user.id).limit(1);
    if (taken && taken.length) return { ok: false, error: { message: "Ce pseudo est déjà pris." } };
    // Source de vérité = index unique sur lower(pseudo) : en cas de course, l'upsert
    // renvoie une violation d'unicité (23505) qu'on traduit proprement.
    const { error } = await sb.from("profiles").upsert(
      { user_id: session.user.id, pseudo: p }, { onConflict: "user_id" }
    );
    if (error) {
      const m = error.message || "";
      if (/pseudo_forbidden/i.test(m)) return { ok: false, error: { message: "Pseudo non autorisé." } };
      const dup = error.code === "23505" || /duplicate|unique|pseudo_lower/i.test(m);
      return { ok: false, error: { message: dup ? "Ce pseudo est déjà pris." : (m || "Échec") } };
    }
    pseudo = p; pushProfileStats();
    return { ok: true };
  }

  // ---- vitrine du joueur (profil public + pool de légendes communautaires) ---
  // Auto-déclarée (non vérifiée) : c'est une VITRINE, pas un classement. Le rang
  // général, lui, vient des scores vérifiés (fonction public_profile).
  function buildStats() {
    let best = null, badges = 0, careers = 0, bestStreak = 0;
    try {
      const pan = JSON.parse(localStorage.getItem("destinDeChampion_pantheon") || "[]");
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
    } catch (_) {}
    return { best, badges, careers, bestStreak };
  }
  async function pushProfileStats() {
    if (!session || !pseudo) return; // pseudo requis pour publier
    try {
      await sb.from("profiles").upsert(
        { user_id: session.user.id, pseudo, stats: buildStats() }, { onConflict: "user_id" }
      );
    } catch (_) {}
  }

  // Envoi anti-triche : le serveur est seul juge du score.
  async function submitDaily(date, choices) {
    if (!session) return; // pas connecté → pas de classement (lecture reste publique)
    try {
      await fetch(URL.replace(/\/+$/, "") + "/functions/v1/submit-daily", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ date, choices, v: EV }),
      });
    } catch (_) { /* silencieux : ne jamais gêner la fin de partie */ }
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
    ".pf-best{padding:12px 14px;border-radius:12px;background:var(--panel-2,rgba(8,123,75,.1));border-left:4px solid var(--gold,#d4af37)}" +
    ".pf-best-top{font-weight:800;font-size:1.05rem;color:var(--green-ink,#0b3b26)}" +
    ".pf-best-title{font-size:.9rem;color:var(--text-1,#567);margin:1px 0 6px}" +
    ".pf-best-stats{font-weight:700;font-size:.9rem;color:var(--green-ink,#0b3b26)}" +
    ".pf-counters{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}" +
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
    lbBox.innerHTML =
      '<button class="acc-x" aria-label="Fermer">×</button>' +
      "<h3>🏆 Classement mondial</h3>" +
      '<p class="acc-sub" style="margin:0 0 2px">Défi du jour — scores vérifiés par le serveur.</p>' +
      '<div class="lb-tabs">' +
      '<button class="lb-tab' + (lbTab === "today" ? " on" : "") + '" data-t="today">Aujourd\'hui</button>' +
      '<button class="lb-tab' + (lbTab === "week" ? " on" : "") + '" data-t="week">Semaine</button>' +
      '<button class="lb-tab' + (lbTab === "alltime" ? " on" : "") + '" data-t="alltime">Général</button>' +
      "</div>" +
      '<div class="lb-content"><p class="lb-empty">Chargement…</p></div>';
    lbBox.querySelector(".acc-x").onclick = () => lbOverlay.classList.remove("on");
    lbBox.querySelectorAll(".lb-tab").forEach((b) => (b.onclick = () => { lbTab = b.dataset.t; renderLeaderboard(); }));
    const content = lbBox.querySelector(".lb-content");

    try {
      let rows, meHtml = "";
      if (lbTab === "today") {
        const best = myTodayBest();
        const { data } = await sb.rpc("daily_top", { d: today, lim: 100 });
        rows = data || [];
        if (session && best != null) {
          const { data: rk } = await sb.rpc("daily_rank", { d: today, sc: best });
          if (rk && rk[0]) meHtml = '<div class="lb-me">Ta place aujourd\'hui : <strong>' + medal(Number(rk[0].rank)) + "</strong> · " + best + " pts <span class=\"lb-sub\">" + T("(sur {n} joueurs)", { n: rk[0].players }) + "</span></div>";
        } else if (!session) {
          meHtml = '<div class="lb-me lb-sub" style="font-weight:400">Connecte-toi (👤) pour apparaître au classement.</div>';
        } else {
          meHtml = '<div class="lb-me lb-sub" style="font-weight:400">Termine le défi du jour pour entrer au classement.</div>';
        }
      } else {
        const since = lbTab === "week" ? weekSince() : "";
        const { data } = await sb.rpc("range_top", { since, lim: 100 });
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
  pfOverlay.className = "acc-overlay";
  pfOverlay.innerHTML = '<div class="lb-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(pfOverlay);
  const pfBox = pfOverlay.querySelector(".lb-box");
  pfOverlay.addEventListener("click", (e) => { if (e.target === pfOverlay) pfOverlay.classList.remove("on"); });
  const medalR = (r) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : "#" + num(r, 1e9));
  const money = (m) => { m = num(m, 1e12); return m >= 1e6 ? (m / 1e6).toFixed(m >= 1e7 ? 0 : 1) + " M€" : m >= 1e3 ? Math.round(m / 1e3) + " k€" : m + " €"; };

  async function openProfile(who) {
    pfBox.innerHTML = '<button class="acc-x" aria-label="Fermer">×</button><p class="lb-empty">Chargement…</p>';
    pfBox.querySelector(".acc-x").onclick = () => pfOverlay.classList.remove("on");
    pfOverlay.classList.add("on");
    let row = null;
    try { const { data } = await sb.rpc("public_profile", { p_pseudo: who }); row = data && data[0]; } catch (_) {}
    if (!row) {
      pfBox.innerHTML = '<button class="acc-x" aria-label="Fermer">×</button><h3>🏛️ ' + esc(who) + "</h3><p class=\"lb-empty\">Profil introuvable.</p>";
      pfBox.querySelector(".acc-x").onclick = () => pfOverlay.classList.remove("on");
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
    pfBox.innerHTML =
      '<button class="acc-x" aria-label="Fermer">×</button>' +
      "<h3>🏛️ " + esc(row.pseudo || who) + "</h3>" +
      rankLine +
      '<p class="acc-sub" style="margin:12px 0 2px">Meilleure carrière <span class="lb-sub">(vitrine, non vérifiée)</span></p>' +
      bestLine +
      '<div class="pf-counters"><span>🏆 ' + num(st.badges, 999) + " badges</span><span>🔥 " + num(st.bestStreak, 99999) + " " + T("j (série)") + "</span><span>👤 " + num(st.careers, 99999) + " " + T("carrières") + "</span></div>";
    pfBox.querySelector(".acc-x").onclick = () => pfOverlay.classList.remove("on");
  }

  // ============================================================================
  //  Duels par pseudo (sans lien) + historique
  //  Envois auto en fin de partie (create/respond) → le serveur rejoue + départage.
  // ============================================================================
  async function callDuel(body) {
    if (!session) return { ok: false };
    try {
      const res = await fetch(URL.replace(/\/+$/, "") + "/functions/v1/submit-duel", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: "Bearer " + session.access_token },
        body: JSON.stringify(body),
      });
      return await res.json().catch(() => ({ ok: res.ok }));
    } catch (_) { return { ok: false }; }
  }
  function submitDuelCreate(o) { return callDuel({ action: "create", seed: o.seed, choices: o.choices, toPseudo: o.toPseudo, label: o.label, v: EV }); }
  function submitDuelRespond(o) { return callDuel({ action: "respond", id: o.id, choices: o.choices, label: o.label, v: EV }); }

  const duOverlay = document.createElement("div");
  duOverlay.className = "acc-overlay";
  duOverlay.innerHTML = '<div class="lb-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(duOverlay);
  const duBox = duOverlay.querySelector(".lb-box");
  duOverlay.addEventListener("click", (e) => { if (e.target === duOverlay) duOverlay.classList.remove("on"); });
  let duTab = "send";

  async function renderDuels() {
    duBox.innerHTML =
      '<button class="acc-x" aria-label="Fermer">×</button><h3>⚔️ Duels</h3>' +
      '<div class="lb-tabs">' +
      '<button class="lb-tab' + (duTab === "send" ? " on" : "") + '" data-t="send">Défier</button>' +
      '<button class="lb-tab' + (duTab === "in" ? " on" : "") + '" data-t="in">Reçus</button>' +
      '<button class="lb-tab' + (duTab === "hist" ? " on" : "") + '" data-t="hist">Historique</button>' +
      "</div><div class=\"lb-content\"><p class=\"lb-empty\">Chargement…</p></div>";
    duBox.querySelector(".acc-x").onclick = () => duOverlay.classList.remove("on");
    duBox.querySelectorAll(".lb-tab").forEach((b) => (b.onclick = () => { duTab = b.dataset.t; renderDuels(); }));
    const content = duBox.querySelector(".lb-content");

    if (!session) { content.innerHTML = '<p class="lb-empty">Connecte-toi (👤) pour défier des joueurs.</p>'; return; }
    if (!pseudo) { content.innerHTML = '<p class="lb-empty">Choisis d\'abord un pseudo dans « Mon compte ».</p>'; return; }

    if (duTab === "send") {
      content.innerHTML =
        '<p class="acc-sub" style="margin:4px 0 8px">Entre le pseudo d\'un ami. Tu joues ta carrière, ton défi lui est envoyé (même parcours pour vous deux).</p>' +
        '<input type="text" id="du-pseudo" maxlength="24" placeholder="Pseudo de l\'adversaire" style="width:100%;box-sizing:border-box;margin:0 0 8px;padding:11px 13px;border:1.5px solid rgba(12,45,30,.18);border-radius:10px;font-size:1rem" />' +
        '<button class="acc-btn primary" id="du-go" style="margin:0">🆚 Lancer le défi</button><p class="acc-msg"></p>';
      const go = async () => {
        const p = duBox.querySelector("#du-pseudo").value.trim();
        const m = duBox.querySelector(".acc-msg");
        if (p.length < 2) { m.textContent = "Pseudo trop court."; m.className = "acc-msg err"; return; }
        if (p.toLowerCase() === (pseudo || "").toLowerCase()) { m.textContent = "Tu ne peux pas te défier toi-même."; m.className = "acc-msg err"; return; }
        // Vérifie que le pseudo existe AVANT de jouer (évite un run perdu sur une faute).
        m.textContent = "Vérification…"; m.className = "acc-msg";
        const esc = p.replace(/[\\%_]/g, "\\$&");
        const { data } = await sb.from("profiles").select("pseudo").ilike("pseudo", esc).limit(1);
        if (!data || !data.length) { m.textContent = "Aucun joueur avec ce pseudo."; m.className = "acc-msg err"; return; }
        duOverlay.classList.remove("on");
        // Utilise la casse exacte du profil trouvé.
        if (window.OpenElevenGame && window.OpenElevenGame.startDuelVsPseudo) window.OpenElevenGame.startDuelVsPseudo(data[0].pseudo);
      };
      duBox.querySelector("#du-go").onclick = go;
      return;
    }

    if (duTab === "in") {
      let rows = [];
      try { const { data } = await sb.rpc("duels_incoming"); rows = data || []; } catch (_) {}
      content.innerHTML = rows.length
        ? '<ul class="lb-list">' + rows.map((r, i) =>
            '<li class="lb-row"><span class="lb-name">🆚 <strong>' + esc(r.from_label || r.from_pseudo) + "</strong><br><span class=\"lb-sub\">" + T("te défie · {n} pts à battre", { n: r.from_score }) + "</span></span>" +
            '<button class="acc-btn soft du-accept" data-i="' + i + '" style="width:auto;margin:0;padding:8px 12px">Relever</button></li>'
          ).join("") + "</ul>"
        : '<p class="lb-empty">Aucun défi en attente.</p>';
      content.querySelectorAll(".du-accept").forEach((b) => (b.onclick = () => {
        const r = rows[Number(b.dataset.i)];
        duOverlay.classList.remove("on");
        if (window.OpenElevenGame && window.OpenElevenGame.acceptServerDuel) window.OpenElevenGame.acceptServerDuel(r);
      }));
      return;
    }

    // historique (+ défis envoyés encore en attente, annulables)
    let out = [], hist = [];
    try { const a = await sb.rpc("duels_outgoing"); out = a.data || []; } catch (_) {}
    try { const b = await sb.rpc("duels_history"); hist = b.data || []; } catch (_) {}
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
      try { await sb.rpc("duel_cancel", { p_id: r.id }); } catch (_) {}
      renderDuels();
    }));
    content.querySelectorAll(".du-rematch").forEach((b) => (b.onclick = () => {
      duOverlay.classList.remove("on");
      if (window.OpenElevenGame && window.OpenElevenGame.startDuelVsPseudo) window.OpenElevenGame.startDuelVsPseudo(b.dataset.opp);
    }));
  }
  function openDuels() { duTab = "send"; renderDuels(); duOverlay.classList.add("on"); }

  // ============================================================================
  //  Amis (suivi par pseudo) + classement entre amis
  //  Modèle « follow » : tu ajoutes un pseudo, ton classement = toi + tes suivis.
  // ============================================================================
  async function resolvePseudo(p) {
    const e = String(p).replace(/[\\%_]/g, "\\$&");
    const { data } = await sb.from("profiles").select("user_id, pseudo").ilike("pseudo", e).limit(1);
    return data && data[0] ? data[0] : null;
  }
  async function addFriend(p) {
    if (!session) return { ok: false, error: { message: "Connecte-toi." } };
    p = String(p || "").trim();
    if (p.length < 2) return { ok: false, error: { message: "Pseudo trop court." } };
    if (p.toLowerCase() === (pseudo || "").toLowerCase()) return { ok: false, error: { message: "C'est toi !" } };
    const found = await resolvePseudo(p);
    if (!found) return { ok: false, error: { message: "Aucun joueur avec ce pseudo." } };
    if (found.user_id === session.user.id) return { ok: false, error: { message: "C'est toi !" } };
    // S'il nous a déjà invité, on accepte SA demande : deux invitations
    // croisées resteraient sinon en attente face à face, chacune attendant
    // l'autre.
    const mutual = await friendRows((q) => q.eq("user_id", found.user_id).eq("friend_id", session.user.id));
    if (mutual.length && mutual[0].status === "pending") {
      const r = await acceptRequest(found.user_id, found.pseudo);
      if (r.ok) return { ok: true, pseudo: found.pseudo, accepted: true };
    }
    // Une demande part en « pending » : elle n'existe pour l'autre qu'une fois
    // acceptée. Sans ça, on s'ajoutait des « amis » à leur insu et leur nom
    // apparaissait dans un classement sans qu'ils aient rien demandé.
    const { error } = await sb.from("friends").insert({
      user_id: session.user.id, friend_id: found.user_id, friend_pseudo: found.pseudo, status: "pending",
    });
    if (error) {
      if (error.code === "23505" || /duplicate/i.test(error.message || "")) return { ok: false, error: { message: T("{p} est déjà dans tes amis, ou a déjà reçu ton invitation.", { p: found.pseudo }) } };
      return { ok: false, error };
    }
    return { ok: true, pseudo: found.pseudo };
  }
  // Retirer un ami coupe le lien DANS LES DEUX SENS : une amitié acceptée est
  // réciproque, la garder d'un côté laisserait un classement bancal.
  async function removeFriend(fid) {
    if (!session) return;
    const me = session.user.id;
    try { await sb.from("friends").delete().eq("user_id", me).eq("friend_id", fid); } catch (_) {}
    try { await sb.from("friends").delete().eq("user_id", fid).eq("friend_id", me); } catch (_) {}
  }

  // `status` n'existe pas tant que la migration SQL n'est pas passée : on
  // retombe alors sur l'ancien comportement plutôt que de casser la liste.
  // `legacy` doit refaire le même filtre SANS le statut — sinon le repli
  // renverrait les mauvaises lignes. Absent = pas d'équivalent avant migration.
  async function friendRows(where, legacy) {
    if (!session) return [];
    const cols = "user_id, friend_id, friend_pseudo, created_at";
    const { data, error } = await where(sb.from("friends").select(cols + ", status"))
      .order("created_at", { ascending: false });
    if (!error) return data || [];
    if (!/status/i.test(error.message || "") || !legacy) return [];
    const { data: old } = await legacy(sb.from("friends").select(cols)).order("created_at", { ascending: false });
    return old || [];
  }
  const listFriends = () => friendRows(
    (q) => q.eq("user_id", session.user.id).eq("status", "accepted"),
    (q) => q.eq("user_id", session.user.id) // avant la migration, tout lien est un ami
  );
  const listOutgoing = () => friendRows((q) => q.eq("user_id", session.user.id).eq("status", "pending"));

  // Demandes reçues. La ligne porte le pseudo de la CIBLE (moi) : celui du
  // demandeur se lit dans profiles, en lecture publique.
  async function listIncoming() {
    const rows = await friendRows((q) => q.eq("friend_id", session.user.id).eq("status", "pending"));
    if (!rows.length) return [];
    const { data: profs } = await sb.from("profiles").select("user_id, pseudo").in("user_id", rows.map((r) => r.user_id));
    const byId = {};
    (profs || []).forEach((p) => { byId[p.user_id] = p.pseudo; });
    return rows.map((r) => ({ ...r, from_pseudo: byId[r.user_id] || "Joueur" }));
  }

  // Accepter valide la demande reçue ET crée le lien réciproque, pour que
  // l'amitié compte des deux côtés du classement.
  async function acceptRequest(fromId, fromPseudo) {
    if (!session) return { ok: false };
    const me = session.user.id;
    const { error } = await sb.from("friends").update({ status: "accepted" }).eq("user_id", fromId).eq("friend_id", me);
    if (error) return { ok: false, error };
    await sb.from("friends").upsert(
      { user_id: me, friend_id: fromId, friend_pseudo: fromPseudo, status: "accepted" },
      { onConflict: "user_id,friend_id" }
    );
    return { ok: true };
  }
  // Refuser une demande reçue.
  async function declineRequest(fromId) {
    if (!session) return;
    try { await sb.from("friends").delete().eq("user_id", fromId).eq("friend_id", session.user.id); } catch (_) {}
  }
  // Annuler une demande qu'on a envoyée.
  async function cancelRequest(toId) {
    if (!session) return;
    try { await sb.from("friends").delete().eq("user_id", session.user.id).eq("friend_id", toId); } catch (_) {}
  }

  const frOverlay = document.createElement("div");
  frOverlay.className = "acc-overlay";
  frOverlay.innerHTML = '<div class="lb-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(frOverlay);
  const frBox = frOverlay.querySelector(".lb-box");
  frOverlay.addEventListener("click", (e) => { if (e.target === frOverlay) frOverlay.classList.remove("on"); });
  let frTab = "today";
  // Pastille sur l'onglet « Gérer » : sans elle, une demande reçue resterait
  // invisible tant qu'on n'ouvre pas l'onglet.
  let frPending = 0;
  function paintPendingBadge() {
    const tab = frBox.querySelector('.lb-tab[data-t="manage"]');
    if (tab) tab.innerHTML = "Gérer" + (frPending ? ' <span class="fr-badge">' + frPending + "</span>" : "");
  }

  // `msg` : retour à afficher après une action ({ text, cls }), le rendu
  // reconstruisant tout le panneau.
  async function renderFriends(msg) {
    frBox.innerHTML =
      '<button class="acc-x" aria-label="Fermer">×</button><h3>👥 Amis</h3>' +
      '<div class="lb-tabs">' +
      '<button class="lb-tab' + (frTab === "today" ? " on" : "") + '" data-t="today">Aujourd\'hui</button>' +
      '<button class="lb-tab' + (frTab === "week" ? " on" : "") + '" data-t="week">Semaine</button>' +
      '<button class="lb-tab' + (frTab === "alltime" ? " on" : "") + '" data-t="alltime">Général</button>' +
      '<button class="lb-tab' + (frTab === "manage" ? " on" : "") + '" data-t="manage">Gérer</button>' +
      "</div><div class=\"lb-content\"><p class=\"lb-empty\">Chargement…</p></div>";
    frBox.querySelector(".acc-x").onclick = () => frOverlay.classList.remove("on");
    frBox.querySelectorAll(".lb-tab").forEach((b) => (b.onclick = () => { frTab = b.dataset.t; renderFriends(); }));
    paintPendingBadge();
    const content = frBox.querySelector(".lb-content");

    if (!session) { content.innerHTML = '<p class="lb-empty">Connecte-toi (👤) pour gérer tes amis.</p>'; return; }

    if (frTab === "manage") {
      const [incoming, outgoing, friends] = await Promise.all([listIncoming(), listOutgoing(), listFriends()]);
      frPending = incoming.length;
      paintPendingBadge();
      const nameCell = (p) =>
        '<span class="lb-name" data-pseudo="' + esc(p || "") + '" style="cursor:pointer">👤 ' + esc(p || "Joueur") + "</span>";
      const btn = (cls, label, i) =>
        '<button class="acc-btn ' + cls + '" data-i="' + i + '" style="width:auto;margin:0;padding:6px 10px;font-size:.78rem">' + label + "</button>";
      const group = (title, rows, html) =>
        rows.length ? '<p class="fr-head">' + title + "</p><ul class=\"lb-list\">" + rows.map(html).join("") + "</ul>" : "";

      content.innerHTML =
        '<div class="acc-row" style="margin:2px 0 6px"><input type="text" id="fr-pseudo" maxlength="24" placeholder="Inviter un ami par pseudo" style="margin:0" />' +
        '<button class="acc-btn soft" id="fr-add" style="width:auto;padding:11px 14px">Inviter</button></div><p class="acc-msg"></p>' +
        group("Demandes reçues", incoming, (f, i) =>
          '<li class="lb-row">' + nameCell(f.from_pseudo) +
          '<span class="fr-acts">' + btn("soft fr-ok", "Accepter", i) + btn("danger fr-no", "Refuser", i) + "</span></li>") +
        group("Invitations envoyées", outgoing, (f, i) =>
          '<li class="lb-row">' + nameCell(f.friend_pseudo) +
          '<span class="fr-acts"><span class="lb-sub">En attente</span>' + btn("danger fr-cancel", "Annuler", i) + "</span></li>") +
        (friends.length
          ? group("Amis", friends, (f, i) => '<li class="lb-row">' + nameCell(f.friend_pseudo) + btn("danger fr-del", "Retirer", i) + "</li>")
          : '<p class="lb-empty">Aucun ami pour l\'instant. Invite un pseudo ci-dessus : il devra accepter ta demande.</p>');

      // Le message survit au re-rendu : il est repeint APRÈS, sinon
      // renderFriends() l'effacerait aussitôt écrit.
      const m = content.querySelector(".acc-msg");
      if (msg) { m.textContent = msg.text; m.className = "acc-msg " + msg.cls; }

      const doAdd = async () => {
        const r = await addFriend(content.querySelector("#fr-pseudo").value);
        if (!r.ok) {
          m.textContent = (r.error && r.error.message) || T("Échec");
          m.className = "acc-msg err";
          return;
        }
        renderFriends({
          text: T(r.accepted ? "Vous êtes maintenant amis avec {p} ✔" : "Invitation envoyée à {p} ✔", { p: r.pseudo }),
          cls: "ok",
        });
      };
      content.querySelector("#fr-add").onclick = doAdd;
      content.querySelector("#fr-pseudo").addEventListener("keydown", (e) => { if (e.key === "Enter") doAdd(); });

      const act = (sel, fn) => content.querySelectorAll(sel).forEach((b) => (b.onclick = async () => {
        b.disabled = true;
        renderFriends(await fn(Number(b.dataset.i)));
      }));
      act(".fr-ok", async (i) => {
        const who = incoming[i].from_pseudo;
        const r = await acceptRequest(incoming[i].user_id, who);
        return r.ok
          ? { text: T("Vous êtes maintenant amis avec {p} ✔", { p: who }), cls: "ok" }
          : { text: T("Échec, réessaie."), cls: "err" };
      });
      act(".fr-no", (i) => declineRequest(incoming[i].user_id));
      act(".fr-cancel", (i) => cancelRequest(outgoing[i].friend_id));
      act(".fr-del", (i) => removeFriend(friends[i].friend_id));
      content.querySelectorAll("[data-pseudo]").forEach((el) => { if (el.dataset.pseudo) el.onclick = () => openProfile(el.dataset.pseudo); });
      return;
    }

    // classement entre amis (moi + suivis)
    try {
      let rows, isRange = frTab !== "today";
      if (frTab === "today") { const { data } = await sb.rpc("friends_daily", { d: todayKeyLocal(), lim: 100 }); rows = data || []; }
      else { const { data } = await sb.rpc("friends_range", { since: frTab === "week" ? weekSince() : "", lim: 100 }); rows = data || []; }
      content.innerHTML = rows.length
        ? '<ul class="lb-list">' + rows.map((r) => {
            const val = isRange ? r.total : r.score;
            const sub = isRange ? ' <span class="lb-sub">· ' + r.days + " j</span>" : "";
            return '<li class="lb-row' + (r.is_me ? " mine" : "") + '" data-pseudo="' + esc(r.pseudo || "") + '">' +
              '<span class="lb-rank">' + medalR(Number(r.rank)) + "</span>" +
              '<span class="lb-name">' + esc(r.pseudo || "Joueur") + (r.is_me ? " <span class=\"lb-sub\">(toi)</span>" : "") + "</span>" +
              '<span class="lb-pts">' + val + ' <span class="lb-sub">pts</span>' + sub + "</span></li>";
          }).join("") + "</ul>"
        : '<p class="lb-empty">Personne n\'a encore joué le défi. Invite des amis dans « Gérer ».</p>';
      content.querySelectorAll(".lb-row[data-pseudo]").forEach((el) => { if (el.dataset.pseudo) el.onclick = () => openProfile(el.dataset.pseudo); });
    } catch (e) {
      content.innerHTML = '<p class="lb-empty">Classement indisponible pour le moment.</p>';
    }
  }
  function openFriends() {
    frTab = "today";
    renderFriends();
    frOverlay.classList.add("on");
    // Compté en arrière-plan : la pastille doit apparaître dès l'ouverture,
    // sans attendre que l'on aille dans « Gérer ».
    if (session) listIncoming().then((r) => { frPending = r.length; paintPendingBadge(); }).catch(() => {});
  }

  // ---- pool de légendes communautaires (invité du mercato) -------------------
  let legendsCache = [];
  async function loadLegends() {
    try { const { data } = await sb.rpc("random_legends", { n: 16 }); if (Array.isArray(data)) legendsCache = data; } catch (_) {}
  }
  function getLegends() { return legendsCache; }
  loadLegends();

  // ---- API publique pour le jeu ----------------------------------------------
  window.OpenElevenAccount = {
    submitDaily, openLeaderboard, openProfile, getLegends, pushProfile: pushProfileStats,
    openDuels, submitDuelCreate, submitDuelRespond, openFriends,
  };

  // ---- bouton d'accueil -------------------------------------------------------
  if (btn) btn.addEventListener("click", open);
})();
