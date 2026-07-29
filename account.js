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
        '<button class="acc-btn primary" id="acc-push">☁️ Sauvegarder maintenant</button>' +
        '<button class="acc-btn soft" id="acc-pull">📥 Restaurer depuis le cloud</button>' +
        '<button class="acc-btn danger" id="acc-signout">Se déconnecter</button>' +
        '<p class="acc-msg"></p>';
      box.querySelector(".acc-x").onclick = close;
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
        '<input type="password" id="acc-pass" placeholder="Mot de passe (6+ caractères)" autocomplete="current-password" />' +
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
        if (!email() || pass().length < 6) return msg("Mot de passe : 6 caractères minimum.", "err");
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
    if (event === "SIGNED_IN") onFreshLogin();
  });
  sb.auth.getSession().then(({ data }) => { session = data.session; renderModal(); });

  // ---- sauvegarde auto quand on quitte / passe en arrière-plan ---------------
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && session && Date.now() - lastPush > 8000) pushSave();
  });

  // ---- bouton d'accueil -------------------------------------------------------
  if (btn) btn.addEventListener("click", open);
})();
