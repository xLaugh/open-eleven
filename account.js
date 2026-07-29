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
  const KEYS = ["openEleven_current", "destinDeChampion_pantheon", "destinDeChampion_progress"];
  const URL = window.SUPABASE_URL, ANON = window.SUPABASE_ANON_KEY;
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
  async function pushSave() {
    if (!session) return { ok: false };
    lastPush = Date.now();
    const { error } = await sb.from("saves").upsert(
      { user_id: session.user.id, data: collectLocal(), updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    return { ok: !error, error };
  }
  async function pullSave() {
    if (!session) return { ok: false };
    const { data, error } = await sb.from("saves").select("data, updated_at").eq("user_id", session.user.id).maybeSingle();
    return { ok: !error, row: data, error };
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
    ".acc-row{display:flex;gap:8px}.acc-row .acc-btn{margin-top:0}";
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
    if (session) {
      box.innerHTML =
        '<button class="acc-x" aria-label="Fermer">×</button>' +
        "<h3>Mon compte</h3>" +
        '<p class="acc-sub">Connecté : <span class="acc-mail">' + esc(session.user.email || "") + "</span></p>" +
        '<p class="acc-sub" style="margin:0 0 4px">Pseudo au classement mondial :</p>' +
        '<div class="acc-row"><input type="text" id="acc-pseudo" maxlength="24" placeholder="Ton pseudo" value="' + esc(pseudo || "") + '" style="margin:0" />' +
        '<button class="acc-btn soft" id="acc-savepseudo" style="width:auto;padding:11px 14px">OK</button></div>' +
        '<button class="acc-btn primary" id="acc-push">☁️ Sauvegarder maintenant</button>' +
        '<button class="acc-btn soft" id="acc-pull">📥 Restaurer depuis le cloud</button>' +
        '<button class="acc-btn danger" id="acc-signout">Se déconnecter</button>' +
        '<p class="acc-msg"></p>';
      box.querySelector(".acc-x").onclick = close;
      box.querySelector("#acc-savepseudo").onclick = async () => {
        const r = await savePseudo(box.querySelector("#acc-pseudo").value);
        msg(r.ok ? "Pseudo enregistré ✔" : (r.error && r.error.message) || "Échec", r.ok ? "ok" : "err");
      };
      box.querySelector("#acc-push").onclick = async () => { msg("Sauvegarde…"); const r = await pushSave(); msg(r.ok ? "Sauvegarde envoyée au cloud ✔" : "Échec : " + (r.error && r.error.message || "erreur"), r.ok ? "ok" : "err"); };
      box.querySelector("#acc-pull").onclick = async () => {
        msg("Récupération…");
        const r = await pullSave();
        if (!r.ok) return msg("Échec : " + (r.error && r.error.message || "erreur"), "err");
        if (!r.row || !r.row.data || !Object.keys(r.row.data).length) return msg("Aucune sauvegarde cloud pour l'instant.", "err");
        if (confirm("Restaurer la sauvegarde cloud ? Cela REMPLACE votre partie locale actuelle.")) { applyLocal(r.row.data); location.reload(); }
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
      box.querySelector("#acc-signup").onclick = async () => {
        if (!email() || pass().length < 8) return msg("Mot de passe : 8 caractères minimum.", "err");
        msg("Création…");
        const { data, error } = await sb.auth.signUp({ email: email(), password: pass() });
        if (error) return msg(traduire(error.message), "err");
        if (data && data.session) msg("Compte créé ✔", "ok"); // confirmation e-mail désactivée
        else msg("Compte créé. Vérifie ta boîte mail pour confirmer, puis connecte-toi.", "ok");
      };
    }
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
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
        if (confirm("Une sauvegarde cloud existe. La restaurer (remplace la partie locale) ?\n\nOK = restaurer le cloud · Annuler = garder le local et l'envoyer au cloud.")) {
          applyLocal(r.row.data); location.reload();
        } else { await pushSave(); msg("Partie locale envoyée au cloud ✔", "ok"); }
      }
    } else {
      await pushSave(); // pas de cloud → on y met le local
      if (overlay.classList.contains("on")) msg("Connecté. Sauvegarde synchronisée ✔", "ok");
    }
  }

  // ---- état d'auth ------------------------------------------------------------
  sb.auth.onAuthStateChange((event, s) => {
    session = s;
    renderModal();
    if (event === "SIGNED_IN") { onFreshLogin(); loadPseudo().then(renderModal); }
    if (event === "SIGNED_OUT") pseudo = null;
  });
  sb.auth.getSession().then(({ data }) => { session = data.session; renderModal(); if (session) loadPseudo().then(renderModal); });

  // ---- sauvegarde auto quand on quitte / passe en arrière-plan ---------------
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && session && Date.now() - lastPush > 8000) pushSave();
  });

  // ============================================================================
  //  Classement mondial VÉRIFIÉ du Défi du jour
  //  • submitDaily : envoie SEULEMENT (date, choix) ; le serveur rejoue + recalcule.
  //  • Lecture du classement : publique (RPC), fonctionne même sans compte.
  // ============================================================================
  let pseudo = null;

  async function loadPseudo() {
    if (!session) { pseudo = null; return; }
    const { data } = await sb.from("profiles").select("pseudo").eq("user_id", session.user.id).maybeSingle();
    pseudo = data && data.pseudo ? data.pseudo : null;
  }
  async function savePseudo(p) {
    if (!session) return { ok: false };
    p = String(p || "").trim().slice(0, 24);
    if (p.length < 2) return { ok: false, error: { message: "Pseudo trop court (2 caractères min)." } };
    const { error } = await sb.from("profiles").upsert(
      { user_id: session.user.id, pseudo: p }, { onConflict: "user_id" }
    );
    if (!error) pseudo = p;
    return { ok: !error, error };
  }

  // Envoi anti-triche : le serveur est seul juge du score.
  async function submitDaily(date, choices) {
    if (!session) return; // pas connecté → pas de classement (lecture reste publique)
    try {
      await fetch(URL.replace(/\/+$/, "") + "/functions/v1/submit-daily", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ date, choices }),
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
    ".lb-empty{padding:22px 4px;text-align:center;color:var(--text-1,#567);font-size:.9rem}";
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
          if (rk && rk[0]) meHtml = '<div class="lb-me">Ta place aujourd\'hui : <strong>' + medal(Number(rk[0].rank)) + "</strong> · " + best + " pts <span class=\"lb-sub\">(sur " + rk[0].players + " joueurs)</span></div>";
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
            return '<li class="lb-row' + (uid && r.user_id === uid ? " mine" : "") + '">' +
              '<span class="lb-rank">' + medal(Number(r.rank)) + "</span>" +
              '<span class="lb-name">' + esc(r.pseudo || "Joueur") + "</span>" +
              '<span class="lb-pts">' + val + ' <span class="lb-sub">pts</span>' + sub + "</span></li>";
          }).join("") + "</ul>"
        : '<p class="lb-empty">Personne au classement pour l\'instant. Sois le premier !</p>';
      content.innerHTML = meHtml + list;
    } catch (e) {
      content.innerHTML = '<p class="lb-empty">Classement indisponible pour le moment.</p>';
    }
  }
  function openLeaderboard() { lbTab = "today"; renderLeaderboard(); lbOverlay.classList.add("on"); }

  // ---- API publique pour le jeu ----------------------------------------------
  window.OpenElevenAccount = { submitDaily, openLeaderboard };

  // ---- bouton d'accueil -------------------------------------------------------
  if (btn) btn.addEventListener("click", open);
})();
