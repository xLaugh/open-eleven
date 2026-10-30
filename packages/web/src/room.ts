/* ============================================================
   Salle « carrière commune au même club » (jusqu'à 4 joueurs) — module
   AUTONOME, greffé sur account.ts SANS lui faire connaître la notion de
   salle (il expose juste son client du serveur, la session, la liste d'amis).

   Phase A : cycle de vie du lobby — créer une salle, inviter des amis,
   accepter/décliner, quitter.
   Phase B : vote du club de départ (union des propositions individuelles de
   chaque membre), suivi en direct par WebSocket, avec un sondage de secours
   si la connexion en direct est coupée. La boucle de saison collective
   (Phase C) n'est PAS ici : une fois le club de départ résolu, chacun joue
   sa saison normalement, sans re-synchronisation.
   ============================================================ */
import { CLUBS, COMPETITIONS } from "@open-eleven/content";
import { Engine } from "@open-eleven/engine";

(function () {
  "use strict";
  const T = (tpl, vars?) => (window.I18N ? window.I18N.t(tpl, vars) : (vars
    ? Object.keys(vars).reduce((a, k) => a.split("{" + k + "}").join(vars[k] == null ? "" : String(vars[k])), tpl)
    : tpl));
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  const acc = window.OpenElevenAccount;
  const btn = document.getElementById("btn-room");
  // Pas de serveur (mode invité) → la salle n'a pas de sens, on masque le
  // bouton et on s'arrête là, comme account.ts le fait lui-même.
  if (!acc || !acc.getClient) {
    if (btn) btn.style.display = "none";
    return;
  }
  if (btn) btn.style.display = "";
  const api = acc.getClient();
  const E = Engine;
  // Exposé par game.ts (chargé avant room.ts) : mêmes cartes de club riches
  // (drapeau du pays) qu'en solo, sans dupliquer la logique NAT_FLAG_IMGS ici.
  const flagHtml = (window.OE && window.OE.flagHtml) || (() => "");

  function setNavBadge(n) {
    if (!btn) return;
    let b = btn.querySelector(".online-badge");
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("span"); b.className = "online-badge"; btn.appendChild(b); }
    b.textContent = n > 99 ? "99+" : String(n);
  }

  // ---- lecture -----------------------------------------------------------
  // Mes invitations reçues (à accepter/décliner) et les salles où je suis déjà
  // 'joined' (lobby en cours de formation, ou partie lancée), chacune avec ses
  // membres. Une seule lecture ; le serveur ne renvoie que ce qui me concerne.
  async function fetchMyRooms() {
    const none = { invitations: [], rooms: [] };
    if (!acc.getSession()) return none;
    const { data } = await api.rpc("rooms_mine");
    return data || none;
  }
  const listIncoming = async () => (await fetchMyRooms()).invitations;

  // État complet d'une salle dont je suis membre : la salle, ses membres, le
  // vote ouvert (avec ses bulletins), le dernier vote de mercato clos et mon
  // propre bilan de saison. null si je n'en suis pas (ou plus) membre.
  async function roomState(roomId) {
    const { data } = await api.rpc("room_state", { room_id: roomId });
    return data || null;
  }
  const joined = (st) => (st ? st.members.filter((m) => m.status === "joined") : []);

  // ---- overlay -------------------------------------------------------------
  const overlay = document.createElement("div");
  overlay.className = "acc-overlay";
  overlay.innerHTML = '<div class="lb-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(overlay);
  const box = overlay.querySelector(".lb-box");
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("on"); });

  // Salle dont le panneau d'invitation est déplié (gardé d'un rendu à l'autre).
  let inviteOpen = null;

  async function render(msg?) {
    box.innerHTML = '<button class="acc-x" aria-label="Fermer">×</button><h3>🏟️ ' + esc(T("Salle")) + '</h3><div class="lb-content"><p class="lb-empty">Chargement…</p></div>';
    box.querySelector(".acc-x").onclick = () => overlay.classList.remove("on");
    const content = box.querySelector(".lb-content");
    const session = acc.getSession();
    if (!session) { content.innerHTML = '<p class="lb-empty">Connecte-toi (👤) pour jouer en salle.</p>'; return; }
    const me = session.user.id;

    const [{ invitations: incoming, rooms: myRooms }, friends, outgoing] = await Promise.all([
      fetchMyRooms(), acc.listFriends(), acc.listOutgoing ? acc.listOutgoing().catch(() => []) : Promise.resolve([]),
    ]);
    setNavBadge(incoming.length);
    // Une seule salle ACTIVE (non terminée) à la fois par joueur — imposé aussi côté
    // serveur (room_create/room_join) ; ici on évite de proposer une action vouée à échouer.
    const hasActive = myRooms.some((r) => r.status !== "ended");
    const av = (id, cls) => (acc.avatarHtml ? acc.avatarHtml(id, cls) : '<span class="av-img av-none ' + cls + '">👤</span>');
    const btn = (cls, label, data, title?) => '<button class="acc-btn ' + cls + '" data-i="' + esc(data) + '"' + (title ? ' title="' + esc(title) + '"' : "") + ">" + label + "</button>";

    let html = '<p class="acc-msg"></p>';

    // --- Créer une salle : seulement sans salle active -------------------------------
    if (!hasActive) {
      html += '<div class="rm-hero"><p>' + esc(T("Vivez une carrière à plusieurs, jusqu'à 4 amis. Choisissez votre mode :")) + "</p>" +
        '<div class="rm-modes">' +
        '<button class="rm-mode rm-create" data-mode="together"><span class="rm-mode-t">🤝 ' + esc(T("Ensemble")) + "</span>" +
        '<span class="rm-mode-d">' + esc(T("Tous dans le même club : le club de départ et les transferts se votent.")) + "</span></button>" +
        '<button class="rm-mode rm-create" data-mode="rivals"><span class="rm-mode-t">⚔️ ' + esc(T("Rivaux")) + "</span>" +
        '<span class="rm-mode-d">' + esc(T("Chacun sa carrière et son club : le meilleur score l'emporte.")) + "</span></button>" +
        "</div></div>";
    }

    // --- Invitations reçues : une carte par salle ------------------------------------
    if (incoming.length) {
      html += '<p class="fr-head">' + esc(T("Invitations reçues")) + "</p>" + incoming.map((inv) =>
        '<div class="rm-invite-card">' + av(inv.fromAvatar, "rm-av-lg") +
        '<div class="rm-ic-body"><p>' + T("{p} t'invite dans sa salle.", { p: "<strong>" + esc(inv.fromPseudo) + "</strong>" }) + "</p>" +
        '<div class="rm-mini">' + (inv.members || []).map((m) => av(m.avatar, "av-mini") + '<span class="rm-mini-name">' + esc(m.pseudo) + "</span>").join("") + "</div>" +
        '<div class="rm-ic-acts">' +
        (hasActive ? '<span class="lb-sub">' + esc(T("Quitte d'abord ta salle actuelle pour la rejoindre.")) + "</span>" : btn("primary rm-join", esc(T("Rejoindre")), inv.roomId)) +
        btn("ghost rm-decline", esc(T("Refuser")), inv.roomId) + "</div></div></div>"
      ).join("");
    }

    // --- Mes salles ------------------------------------------------------------------
    for (const room of myRooms) html += room.status === "ended" ? endedRoomHtml(room) : roomHtml(room);
    if (!myRooms.length && !incoming.length) {
      html += '<p class="lb-empty">' + esc(T("Aucune salle pour l'instant.")) + "</p>";
    }

    function endedRoomHtml(room) {
      const ranked = room.members.filter((m) => m.status === "joined").sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
      return '<div class="rm-card rm-ended"><p class="rm-card-title">🏁 ' + esc(T("Salle terminée")) + "</p>" +
        '<ul class="lb-list">' + ranked.map((m, i) => {
          const s = m.final_summary || {};
          return '<li class="lb-row"><span class="lb-name">' + (i === 0 ? "🏆 " : "") + av(m.avatar, "av-mini") + " " + esc(m.pseudo) + "</span>" +
            '<span class="lb-sub">' + (s.name ? esc(s.name) + " — " : "") + (m.final_score != null ? esc(Math.round(m.final_score)) + " pts" : "?") + "</span></li>";
        }).join("") + "</ul>" +
        '<div class="rm-sub-acts">' + btn("soft rm-stats", "📊 " + esc(T("Comparer les carrières")), room.id) + btn("ghost rm-leave", esc(T("Retirer de ma liste")), room.id) + "</div></div>";
    }

    function roomHtml(room) {
      const joinedM = room.members.filter((m) => m.status === "joined");
      const invitedM = room.members.filter((m) => m.status === "invited");
      const mine = joinedM.find((m) => m.user_id === me);
      const setup = room.phase === "profile_setup";
      const playing = room.phase === "in_season" || room.phase === "season_vote";
      const rivals = room.mode === "rivals";
      // Étape en cours. Ensemble : ① Équipe ② Profils ③ Club ④ Carrière.
      // Rivaux : ① Rivaux ② Profils et clubs ③ Carrière (pas de club commun à choisir).
      const step = rivals
        ? (playing ? 3 : joinedM.length < 2 ? 1 : 2)
        : playing ? 4 : room.phase === "starting_vote" ? 3
          : joinedM.length < 2 ? 1 : joinedM.every((m) => m.ready) ? 3 : 2;
      const steps = rivals ? [T("Rivaux"), T("Profils et clubs"), T("Carrière")] : [T("Équipe"), T("Profils"), T("Club"), T("Carrière")];
      const stepper = '<p class="rm-mode-tag">' + (rivals ? "⚔️ " + esc(T("Mode Rivaux")) : "🤝 " + esc(T("Mode Ensemble"))) + "</p>" +
        '<ol class="rm-steps">' + steps.map((label, i) =>
        '<li class="' + (i + 1 < step ? "done" : i + 1 === step ? "on" : "") + '"><span>' + (i + 1 < step ? "✓" : i + 1) + "</span>" + esc(label) + "</li>").join("") + "</ol>";
      const hint = (rivals ? [
        T("Invite jusqu'à 3 amis : ils reçoivent une notification."),
        T("Chacun crée son joueur et réserve son centre de formation. L'hôte lance quand tout le monde est prêt."),
        T("Chacun son club, jamais le même : finis devant tes rivaux."),
      ] : [
        T("Invite jusqu'à 3 amis : ils reçoivent une notification."),
        T("Chacun crée son joueur. L'hôte choisira ensuite le club de départ."),
        T("L'hôte choisit le club de départ, puis la carrière commence."),
        T("Même club pour tous : les transferts se votent ensemble."),
      ])[step - 1];

      // Les 4 places : membres, invités, puis places libres (tant que la salle se forme).
      const slot = (m) => {
        const isMe = m.user_id === me, isHost = m.user_id === room.createdBy;
        const state = m.status === "invited" ? ["wait", T("Invité…")]
          : m.career_ended ? ["end", "🏁 " + T("Terminé")]
          : playing ? ["play", T("En jeu")]
          : m.ready ? ["ok", T("Prêt ✓")] : ["todo", T("À faire")];
        const canCancel = m.status === "invited" && (room.isCreator || m.invited_by === me);
        const canKick = m.status === "joined" && !isMe && !m.career_ended && joinedM.length >= 3;
        return '<div class="rm-slot rm-' + state[0] + '">' + av(m.avatar, "rm-av") +
          '<span class="rm-name">' + esc(m.pseudo) + (isHost ? ' <span title="' + esc(T("Hôte")) + '">👑</span>' : "") + "</span>" +
          (isMe ? '<span class="rm-me">' + esc(T("toi")) + "</span>" : "") +
          '<span class="rm-state">' + esc(state[1]) + "</span>" +
          (canCancel ? '<button class="rm-slot-x rm-cancel" data-i="' + esc(room.id + "|" + m.user_id + "|" + m.pseudo) + '" title="' + esc(T("Annuler l'invitation")) + '">✕</button>' : "") +
          (canKick ? '<button class="rm-slot-x rm-kick" data-i="' + esc(room.id + "|" + m.user_id + "|" + m.pseudo) + '" title="' + esc(T("Proposer son exclusion")) + '">🚫</button>' : "") +
          "</div>";
      };
      const taken = joinedM.length + invitedM.length;
      const empty = setup ? Math.max(0, 4 - taken) : 0;
      const slots = '<div class="rm-slots">' + [...joinedM, ...invitedM].map(slot).join("") +
        Array.from({ length: empty }, () => '<button class="rm-slot rm-empty rm-open-invite" data-i="' + esc(room.id) + '"><span class="rm-plus">＋</span><span class="rm-state">' + esc(T("Inviter")) + "</span></button>").join("") + "</div>";

      // Panneau d'invitation : tes amis, un bouton chacun ; et l'ajout d'un ami par pseudo.
      let invite = "";
      if (setup && inviteOpen === room.id) {
        const inRoom = new Set(room.members.map((m) => m.user_id));
        const rows = friends.map((f) =>
          '<li class="lb-row"><span class="lb-name">' + av(f.avatar, "av-mini") + " " + esc(f.friend_pseudo) + "</span>" +
          (inRoom.has(f.friend_id)
            ? '<span class="lb-sub">' + esc(T("Invité ✓")) + "</span>"
            : taken >= 4 ? "" : btn("soft rm-invite-friend", esc(T("Inviter")), room.id + "|" + f.friend_id)) + "</li>").join("");
        invite = '<div class="rm-invite-panel"><p class="rm-card-title">' + esc(T("Inviter des amis")) + "</p>" +
          (friends.length ? '<ul class="lb-list">' + rows + "</ul>" : '<p class="lb-sub">' + esc(T("Tu n'as pas encore d'ami : ajoute quelqu'un par son pseudo, il pourra rejoindre dès qu'il aura accepté.")) + "</p>") +
          '<div class="acc-row rm-add"><input type="text" class="rm-add-pseudo" maxlength="24" placeholder="' + esc(T("Ajouter un ami par pseudo")) + '" />' +
          btn("soft rm-add-friend", esc(T("Ajouter")), room.id) + "</div>" +
          (outgoing.length ? '<p class="lb-sub">' + esc(T("En attente d'acceptation : {list}", { list: outgoing.map((o) => o.friend_pseudo).join(", ") })) + "</p>" : "") +
          "</div>";
      }

      // Une action principale, selon l'étape ; le reste en discret.
      const primary = room.phase === "season_vote" ? btn("primary rm-vote-now", "🗳️ " + esc(T("Voter maintenant")), room.id)
        : playing ? btn("primary rm-play", "▶️ " + esc(T("Reprendre la carrière")), room.id)
        : room.phase === "starting_vote" ? btn("primary rm-play", "🗳️ " + esc(T("Choisir le club")), room.id)
        : mine && mine.ready ? btn("primary rm-play", room.isCreator && !rivals ? "🏟️ " + esc(T("Choisir le club de départ")) : "⏳ " + esc(T("Rejoindre l'attente")), room.id)
        : btn("primary rm-play", "🎮 " + esc(T("Créer mon joueur")), room.id);
      const secondary = '<div class="rm-sub-acts">' +
        (setup ? btn("ghost rm-open-invite", "👥 " + esc(inviteOpen === room.id ? T("Masquer les invitations") : T("Inviter des amis")), room.id) : "") +
        (room.status === "active" ? btn("ghost rm-stats", "📊 " + esc(T("Stats")), room.id) : "") +
        btn("ghost rm-leave rm-danger", "🚪 " + esc(T("Quitter")), room.id) + "</div>";

      return '<div class="rm-card">' + stepper + '<p class="rm-hint">' + esc(hint) + "</p>" + slots + invite + primary + secondary + "</div>";
    }

    content.innerHTML = html;
    const m = content.querySelector(".acc-msg");
    if (msg) { m.textContent = msg.text; m.className = "acc-msg " + msg.cls; }

    const on = (sel, fn) => content.querySelectorAll(sel).forEach((b) => (b.onclick = () => fn(b)));
    const act = (sel, fn) => on(sel, async (b) => { b.disabled = true; render(await fn(b.dataset.i, b)); });
    on(".rm-create", async (b) => {
      content.querySelectorAll(".rm-create").forEach((x) => (x.disabled = true));
      const { data, error } = await api.rpc("room_create", { p_mode: b.dataset.mode === "rivals" ? "rivals" : "together" });
      if (!error) inviteOpen = data; // salle neuve : on enchaîne directement sur les invitations
      render(error ? { text: T("Échec, réessaie."), cls: "err" } : { text: T("Salle créée ✔ Invite maintenant tes amis."), cls: "ok" });
    });
    act(".rm-join", async (roomId) => {
      const { error } = await api.rpc("room_join", { p_room_id: roomId });
      return error ? { text: T("Échec, réessaie."), cls: "err" } : { text: T("Tu as rejoint la salle ✔"), cls: "ok" };
    });
    act(".rm-decline", async (roomId) => {
      await api.rpc("room_decline", { p_room_id: roomId });
      return { text: T("Invitation refusée."), cls: "ok" };
    });
    on(".rm-leave", async (b) => {
      if (!confirm(T("Quitter la salle ? Tes coéquipiers continueront sans toi."))) return;
      b.disabled = true;
      await api.rpc("room_leave", { p_room_id: b.dataset.i });
      render({ text: T("Tu as quitté la salle."), cls: "ok" });
    });
    on(".rm-play", (b) => {
      overlay.classList.remove("on");
      const room = myRooms.find((r) => r.id === b.dataset.i);
      if (window.OE && window.OE.startRoomCareer) window.OE.startRoomCareer(b.dataset.i, room && room.mode === "rivals" ? "rivals" : "together");
    });
    on(".rm-open-invite", (b) => { inviteOpen = inviteOpen === b.dataset.i ? null : b.dataset.i; render(); });
    act(".rm-invite-friend", async (data) => {
      const [roomId, friendId] = data.split("|");
      const { error } = await api.rpc("room_invite", { p_room_id: roomId, p_friend_id: friendId });
      return error ? { text: T("Échec de l'invitation."), cls: "err" } : { text: T("Invitation envoyée ✔"), cls: "ok" };
    });
    on(".rm-cancel", async (b) => {
      const [roomId, userId, pseudo] = b.dataset.i.split("|");
      if (!confirm(T("Annuler l'invitation de {p} ?", { p: pseudo }))) return;
      b.disabled = true;
      const { error } = await api.rpc("room_cancel_invite", { p_room_id: roomId, p_user_id: userId });
      render(error ? { text: T("Échec, réessaie."), cls: "err" } : { text: T("Invitation annulée."), cls: "ok" });
    });
    on(".rm-add-friend", async (b) => {
      const input = b.closest(".rm-add").querySelector(".rm-add-pseudo");
      const pseudo = input.value.trim();
      if (!pseudo) return;
      b.disabled = true;
      const r = await acc.addFriend(pseudo);
      render(r && r.ok === false
        ? { text: (r.error && r.error.message) || T("Échec, réessaie."), cls: "err" }
        : r && r.accepted ? { text: T("Vous êtes maintenant amis ✔ Tu peux inviter {p}.", { p: r.pseudo }), cls: "ok" }
        : { text: T("Demande envoyée à {p} : dès qu'il accepte, tu pourras l'inviter.", { p: pseudo }), cls: "ok" });
    });
    on(".rm-vote-now", (b) => renderVoteInline(b.dataset.i));
    on(".rm-stats", (b) => renderStatsInline(b.dataset.i));
    on(".rm-kick", async (b) => {
      const [roomId, targetId, pseudo] = b.dataset.i.split("|");
      if (!confirm(T("Proposer d'exclure {p} ? La salle votera.", { p: pseudo }))) return;
      b.disabled = true;
      const { error } = await api.rpc("room_propose_kick", { p_room_id: roomId, p_target_user_id: targetId });
      if (error) render({ text: T("Échec — un vote est peut-être déjà en cours."), cls: "err" });
      else renderVoteInline(roomId);
    });
  }

  function open() { render(); overlay.classList.add("on"); }

  // Vote de mercato consulté depuis l'overlay (pas depuis l'écran de jeu) :
  // permet à un membre de voter même s'il n'est pas encore retombé sur son
  // propre point de synchro (offseason/événement narratif). Simple aller
  // simple — pas de canal temps réel ici, "Fermer" ou revoter suffit à
  // rafraîchir ; retour à la liste des salles au clic sur voter.
  async function renderVoteInline(roomId) {
    box.innerHTML = '<button class="acc-x" aria-label="Fermer">×</button><h3>🗳️ Vote de la salle</h3><div class="lb-content"><p class="lb-empty">Chargement…</p></div>';
    box.querySelector(".acc-x").onclick = () => overlay.classList.remove("on");
    const content = box.querySelector(".lb-content");
    const back = () => { content.querySelector("#rm-back").onclick = () => render(); };
    const st = await roomState(roomId);
    const vote = st && st.openVote;
    if (!vote) { content.innerHTML = '<p class="lb-empty">Aucun vote ouvert pour l\'instant.</p><button class="acc-btn soft" id="rm-back">← Retour</button>'; back(); return; }
    const ballots = vote.ballots;
    const session = acc.getSession();
    const mine = ballots.find((b) => b.user_id === session.user.id);

    if (vote.kind === "kick") {
      const targetId = vote.candidates.target;
      const members = st.members;
      const target = (members || []).find((m) => m.user_id === targetId);
      const eligible = (members || []).filter((m) => m.status === "joined" && m.user_id !== targetId).length;
      if (session.user.id === targetId) {
        content.innerHTML = '<p class="lb-empty">' + esc(T("Un vote est en cours pour t'exclure de la salle.")) + '</p><button class="acc-btn soft" id="rm-back">← Retour</button>';
        back(); return;
      }
      content.innerHTML =
        '<p class="lb-sub">' + esc(T("Exclure {p} — {n}/{t} ont voté.", { p: (target || {}).pseudo || "?", n: (ballots || []).length, t: eligible })) + "</p>" +
        '<div class="acc-row" style="margin:6px 0">' +
        '<button class="acc-btn danger rm-tv-opt" data-c="kick" style="width:auto;padding:11px 14px"' + (mine && mine.choice === "kick" ? " disabled" : "") + ">" + (mine && mine.choice === "kick" ? "✔ " : "") + esc(T("Exclure")) + "</button>" +
        '<button class="acc-btn soft rm-tv-opt" data-c="keep" style="width:auto;padding:11px 14px"' + (mine && mine.choice === "keep" ? " disabled" : "") + ">" + (mine && mine.choice === "keep" ? "✔ " : "") + esc(T("Garder")) + "</button>" +
        "</div>" +
        '<button class="acc-btn soft" id="rm-back" style="margin-top:6px">← Retour</button>';
    } else {
      const members = joined(st);
      content.innerHTML =
        '<p class="lb-sub">' + esc(T("{n}/{t} ont voté.", { n: (ballots || []).length, t: (members || []).length })) + "</p>" +
        '<ul class="lb-list">' + vote.candidates.map((c) => {
          if (c === "stay") {
            return '<li class="lb-row"><span class="lb-name">' + T("Rester au club actuel") + "</span>" +
              '<button class="acc-btn soft rm-tv-opt" data-c="stay" style="width:auto;padding:6px 10px;font-size:.78rem"' +
              (mine && mine.choice === "stay" ? " disabled" : "") + ">" + (mine && mine.choice === "stay" ? "✔" : T("Voter")) + "</button></li>";
          }
          const club = CLUBS.find((x) => x.id === c);
          if (!club) return "";
          const cc = E.countryOf(club.countryId);
          const label = '<span class="level-tag level-' + esc(club.level) + '">' + esc(E.divShort(club.level, club.countryId)) + "</span> " +
            esc(club.name) + (club.colors ? " " + club.colors : "") + " " + flagHtml(cc);
          return '<li class="lb-row"><span class="lb-name">' + label + "</span>" +
            '<button class="acc-btn soft rm-tv-opt" data-c="' + esc(c) + '" style="width:auto;padding:6px 10px;font-size:.78rem"' +
            (mine && mine.choice === c ? " disabled" : "") + ">" + (mine && mine.choice === c ? "✔" : T("Voter")) + "</button></li>";
        }).join("") + "</ul>" +
        '<button class="acc-btn soft" id="rm-back" style="margin-top:6px">← Retour</button>';
    }
    back();
    content.querySelectorAll(".rm-tv-opt").forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      const { error } = await api.rpc("room_cast_vote", { p_vote_id: vote.id, p_choice: b.dataset.c });
      if (!error) api.rpc("room_maybe_resolve_vote", { p_vote_id: vote.id }).catch(() => {});
      renderVoteInline(roomId);
    }));
  }

  // Construit la liste HTML de comparaison des membres — utilisée à la fois
  // par l'overlay Salle (renderStatsInline) ET par l'onglet "Salle" du
  // panneau de profil en jeu (renderMembersStats), pour ne pas dupliquer le
  // rendu entre les deux points d'entrée.
  // Tout ce qui vient d'un autre membre (live_stats, final_summary) est écrit par SON
  // client, sans contrôle : chaque valeur est échappée, et les nombres bornés.
  const num = (v) => { const x = Number(v); return Number.isFinite(x) ? x : null; };
  const n = (v) => (v == null ? "?" : esc(v));
  // Instantané le plus complet d'un membre : son bilan de fin s'il a terminé, sinon le direct.
  const snapshotOf = (m) => (m.final_summary && m.final_summary.history ? m.final_summary : m.live_stats) || null;

  // Comparatif côte à côte : une colonne par membre, la meilleure valeur de chaque ligne en or.
  function compareTableHtml(rows) {
    const data = rows.map((m) => ({ m, s: snapshotOf(m) })).filter((x) => x.s);
    if (data.length < 2) return "";
    const tr = (s) => (s && s.trophies) || {};
    const lines = [
      [T("OVR max"), (s) => num(s.peakOvr != null ? s.peakOvr : s.ovr)],
      [T("Matchs"), (s) => num(s.totalMatches)],
      [T("Buts"), (s) => num(s.totalGoals)],
      [T("Passes décisives"), (s) => num(s.totalAssists)],
      [COMPETITIONS.league.icon + " " + T("Titres"), (s) => num(tr(s).league)],
      [COMPETITIONS.cup.icon + " " + T("Coupes"), (s) => num(tr(s).cup)],
      [COMPETITIONS.continental.icon + " " + T("Coupes continentales"), (s) => num(tr(s).continental)],
      [COMPETITIONS.worldCup.icon + " " + T("Coupe du Monde"), (s) => num(tr(s).worldCup)],
      [COMPETITIONS.ballon.icon + " " + T("Ballon d'Or"), (s) => num(tr(s).ballon)],
      [T("Sélections"), (s) => num(s.natCaps)],
      [T("Buts en sélection"), (s) => num(s.natGoals)],
      [T("Score final"), (s) => num(s.score)],
    ];
    const head = "<tr><th></th>" + data.map((x) => "<th>" + esc(x.m.pseudo) + "</th>").join("") + "</tr>";
    const body = lines.map(([label, get]) => {
      const vals = data.map((x) => get(x.s));
      if (vals.every((v) => v == null)) return "";
      const best = Math.max(...vals.filter((v) => v != null));
      return "<tr><td>" + esc(label) + "</td>" + vals.map((v) =>
        "<td" + (v != null && v === best && best > 0 ? ' class="rm-best"' : "") + ">" + (v == null ? "–" : esc(Math.round(v))) + "</td>").join("") + "</tr>";
    }).join("");
    return '<div class="rm-compare"><table>' + head + body + "</table></div>";
  }

  // Historique saison par saison d'un membre, replié par défaut.
  function historyHtml(m, s) {
    const hist = Array.isArray(s && s.history) ? s.history : [];
    if (!hist.length) return "";
    const icons = (keys) => (Array.isArray(keys) ? keys : []).map((k) => (COMPETITIONS[k] ? COMPETITIONS[k].icon : "")).join("");
    const rows = hist.map((h) => {
      const pos = num(h.p);
      return "<tr><td>" + n(h.a) + "</td><td>" + n(h.y) + "</td><td>" + esc(h.c || "") + "</td><td>" + (pos ? pos : "–") + "</td><td>" +
        n(h.m) + " · " + n(h.g) + " · " + n(h.as) + "</td><td>" + n(h.r) + "</td><td>" + icons(h.t) + "</td></tr>";
    }).join("");
    return '<details class="rm-history"><summary>📜 ' + esc(T("Historique de {p}", { p: m.pseudo })) + "</summary>" +
      '<div class="rm-compare"><table><tr><th>' + esc(T("Âge")) + "</th><th>" + esc(T("Année")) + "</th><th>" + esc(T("Club")) + "</th><th>" + esc(T("Clt")) +
      "</th><th>" + esc(T("M · B · PD")) + "</th><th>" + esc(T("Note")) + "</th><th></th></tr>" + rows + "</table></div></details>";
  }

  async function buildStatsListHtml(roomId) {
    const st = await roomState(roomId);
    const members = joined(st);
    // Mode Rivaux : classement au score de carrière (le bilan final s'il existe, sinon le direct).
    const rivals = !!(st && st.room && st.room.mode === "rivals");
    const scoreOf = (m) => num(m.final_score != null ? m.final_score : (m.live_stats || {}).score) || 0;
    const rows = (members || []).slice().sort((a, b) => rivals
      ? scoreOf(b) - scoreOf(a)
      : ((snapshotOf(b) || {}).totalGoals || 0) - ((snapshotOf(a) || {}).totalGoals || 0));
    if (!rows.length) return '<p class="lb-empty">' + esc(T("Aucun membre actif.")) + "</p>";

    const lines = rows.map((m, i) => {
      const s = snapshotOf(m);
      const statusTag = m.career_ended ? ' <span class="lb-sub">🏁 ' + esc(T("carrière terminée")) + "</span>" : "";
      if (!s) {
        return '<li class="lb-row" style="flex-direction:column;align-items:flex-start;gap:4px">' +
          '<span class="lb-name">👤 ' + esc(m.pseudo) + statusTag + "</span>" +
          '<span class="lb-sub">' + esc(T("Pas encore de données pour cette carrière.")) + "</span></li>";
      }
      const rank = rivals ? (["🥇 ", "🥈 ", "🥉 "][i] || "") : i === 0 && s.totalGoals ? "🥇 " : "";
      const scoreTag = rivals ? ' <span class="lb-sub">· ' + esc(Math.round(scoreOf(m))) + " pts</span>" : "";
      const cc = s.countryId ? E.countryOf(s.countryId) : null;
      const clubLine = s.club
        ? '<span class="lb-sub">' + (s.level ? '<span class="level-tag level-' + esc(s.level) + '">' + esc(E.divShort(s.level, s.countryId)) + "</span> " : "") +
          esc(s.club) + (cc ? " " + flagHtml(cc) : "") + (s.age != null ? " · " + esc(s.age) + " ans" : "") + "</span>"
        : "";
      const seasonPart = s.seasonGoals != null
        ? n(s.seasonGoals) + " ⚽ " + n(s.seasonAssists || 0) + " 🅰️" + (s.seasonRating != null ? " · " + n(s.seasonRating) : "")
        : "?";
      const careerPart = n(s.totalGoals) + " ⚽ " + n(s.totalAssists) +
        " 🅰️ · " + n(s.totalMatches) + " " + esc(T("matchs")) +
        (s.ovr != null ? " · " + n(s.ovr) + " OVR" : "");
      const statLine = '<span class="lb-sub">' + esc(T("Saison")) + " : " + seasonPart + " — " + esc(T("Carrière")) + " : " + careerPart + "</span>";
      return '<li class="lb-row" style="flex-direction:column;align-items:flex-start;gap:4px">' +
        '<span class="lb-name">' + rank + "👤 " + esc(m.pseudo) + scoreTag + statusTag + "</span>" + clubLine + statLine + historyHtml(m, s) + "</li>";
    }).join("");
    return compareTableHtml(rows) + '<ul class="lb-list">' + lines + "</ul>";
  }

  // Comparatif des statistiques en direct des membres, consulté depuis
  // l'overlay 🏟️ Salle. Pas de sondage automatique ici : l'utilisateur a
  // explicitement demandé d'éviter le clignotement d'un rafraîchissement en
  // boucle sur ce genre de vue — un bouton Actualiser suffit.
  async function renderStatsInline(roomId) {
    box.innerHTML = '<button class="acc-x" aria-label="Fermer">×</button><h3>📊 Statistiques de la salle</h3><div class="lb-content"><p class="lb-empty">Chargement…</p></div>';
    box.querySelector(".acc-x").onclick = () => overlay.classList.remove("on");
    const content = box.querySelector(".lb-content");

    async function draw() {
      content.innerHTML = await buildStatsListHtml(roomId) +
        '<div class="acc-row" style="margin:6px 0 2px">' + '<button class="acc-btn soft" id="rm-stats-refresh" style="width:auto;padding:11px 14px">' + esc(T("Actualiser")) + "</button></div>" +
        '<button class="acc-btn soft" id="rm-back" style="margin-top:6px">← Retour</button>';
      content.querySelector("#rm-back").onclick = () => render();
      content.querySelector("#rm-stats-refresh").onclick = draw;
    }
    draw();
  }

  // Même comparatif, mais peint directement dans l'onglet "Salle" du panneau
  // de profil EN JEU (à côté de Statistiques/Palmarès/Distinctions/Parcours)
  // — c'est là que l'utilisateur veut le trouver en cours de partie, pas
  // seulement depuis l'overlay lobby. Appelé par game.ts (initProfileTabs)
  // au clic sur l'onglet ; targetEl reste vide/masqué tant qu'on ne l'ouvre
  // pas (même logique de rendu paresseux que le reste du panneau de profil).
  async function renderMembersStats(roomId, targetEl) {
    targetEl.innerHTML = '<p class="lb-empty">Chargement…</p>';
    const html = await buildStatsListHtml(roomId);
    targetEl.innerHTML = html +
      '<div class="acc-row" style="margin:6px 0 2px">' +
      '<button class="acc-btn soft rm-stats-refresh-inline" style="width:auto;padding:11px 14px">' + esc(T("Actualiser")) + "</button></div>";
    const rb = targetEl.querySelector(".rm-stats-refresh-inline");
    if (rb) rb.onclick = () => renderMembersStats(roomId, targetEl);
  }

  // ---- Phase B : vote du club de départ + temps réel ------------------------

  // État complet d'une salle pour l'étape de création : la salle elle-même,
  // ses membres, et le vote en cours (avec les bulletins) s'il y en a un.
  async function getRoomState(roomId) {
    const session = acc.getSession();
    if (!session) return null;
    const st = await roomState(roomId);
    if (!st) return null;
    const vote = st.room.phase === "starting_vote" && st.openVote && st.openVote.kind === "starting_club" ? st.openVote : null;
    return { room: st.room, members: st.members.filter((m) => m.status === "joined" || m.status === "invited"), vote, me: session.user.id };
  }

  // Écoute d'une salle, UNIQUEMENT pendant que l'étape qui en a besoin est
  // affichée (arrêt via le stop() rendu). Le serveur signale chaque changement
  // par WebSocket ; un sondage de secours tourne EN PLUS : si la connexion en
  // direct est coupée, la salle avance quand même (juste moins instantanément).
  // Un rafraîchissement à la fois. Le signal en direct, le sondage de secours
  // et les clics peuvent en demander plusieurs en même temps ; menés de front,
  // deux d'entre eux concluraient chacun la même fin de saison (une année
  // sautée par doublon), ou liraient la salle avant que notre propre bilan y
  // soit inscrit. Une demande arrivée en cours de route est rejouée ensuite.
  function serialized(fn) {
    let running = false, again = false;
    return async function run() {
      if (running) { again = true; return; }
      running = true;
      try { await fn(); } catch (_) { /* la prochaine demande réessaiera */ } finally { running = false; }
      if (again) { again = false; run(); }
    };
  }

  function watchRoom(roomId, onChange) {
    const unwatch = api.watchRoom(roomId, onChange);
    const poll = setInterval(onChange, 5000);
    return function stop() {
      clearInterval(poll);
      unwatch();
    };
  }

  // Rendu de l'étape « club de départ », appelé par game.ts depuis l'écran
  // académie (setup.roomId posé) : els = { subEl, listEl } (les mêmes éléments
  // que l'écran académie solo), offerClubIds = propositions DE CE membre
  // (issues de son propre profil, calculées par le moteur côté game.ts).
  // onReadyToStart(clubId) est appelé une seule fois la salle lancée — c'est
  // à game.ts de retrouver le club et de lancer startCareer(club).
  //
  // Pas de vote à plusieurs candidats ici (trop de points de blocage à
  // tester à 2-4) : SEUL le créateur de la salle choisit
  // parmi SES propres offres, et son choix s'applique direct à tout le monde.
  function renderAcademyStep(roomId, offers, els, onReadyToStart) {
    const { subEl, listEl } = els;
    let stopped = false, started = false;
    let stop = null;

    async function refreshOnce() {
      if (stopped) return;
      const st = await getRoomState(roomId);
      if (!st || stopped) return;
      const { room, members, me } = st;

      if (room.status === "active" && room.club_id) {
        if (started) return;
        started = true;
        subEl.textContent = T("Le créateur a lancé la salle — la carrière commune commence !");
        listEl.innerHTML = "";
        if (stop) stop();
        onReadyToStart(room.club_id);
        return;
      }

      // Si le créateur a quitté la salle AVANT de lancer, plus personne ne
      // pouvait choisir : les autres attendaient indéfiniment (le bug
      // "coincé sur la page d'accueil" remonté par un joueur). N'importe quel
      // membre encore joint prend alors le relais (cf. room_launch, à jour
      // côté serveur pour accepter ce cas).
      const creatorActive = members.some((m) => m.user_id === room.created_by && m.status === "joined");
      const canLaunch = room.created_by === me || !creatorActive;

      if (canLaunch) {
        subEl.textContent = creatorActive
          ? T("Choisissez le club de départ — la salle se lance pour tout le monde dès votre choix.")
          : T("Le créateur a quitté la salle avant de la lancer — choisissez un club pour la relancer.");
        // Mêmes cartes qu'en solo (renderAcademyScreen, game.ts) : niveau,
        // drapeau du pays, description du centre de formation.
        listEl.innerHTML = offers.map((offer) => {
          const cc = E.countryOf(offer.club.countryId);
          return '<button class="origin-card academy-card rm-offer-pick" data-club="' + esc(offer.club.id) + '">' +
            '<p class="origin-name"><span class="level-tag level-' + esc(offer.level) + '">' + esc(E.divShort(offer.level, offer.club.countryId)) + "</span> " +
            esc(offer.club.name) + (offer.club.colors ? " " + offer.club.colors : "") + " " + flagHtml(cc) + "</p>" +
            '<p class="origin-desc">' + esc(offer.blurb || "") + (offer.surprise ? " — <strong>" + esc(T("contre toute attente, ils vous veulent VOUS.")) + "</strong>" : "") + "</p></button>";
        }).join("");
        listEl.querySelectorAll(".rm-offer-pick").forEach((b) => (b.onclick = async () => {
          listEl.querySelectorAll(".rm-offer-pick").forEach((x) => (x.disabled = true));
          const { error } = await api.rpc("room_launch", { p_room_id: roomId, p_club_id: b.dataset.club });
          if (error) {
            listEl.querySelectorAll(".rm-offer-pick").forEach((x) => (x.disabled = false));
            const p = document.createElement("p");
            p.className = "lb-empty"; p.style.color = "#b3261e";
            p.textContent = T("Erreur : {msg}", { msg: error.message });
            listEl.appendChild(p);
          }
          // sinon : le prochain refresh() (temps réel ou sondage) détecte
          // status='active' et démarre — inutile de forcer un refresh ici.
        }));
      } else {
        subEl.textContent = T("En attente que le créateur de la salle choisisse le club de départ…");
        listEl.innerHTML = '<button class="btn btn-secondary rm-refresh">' + esc(T("Actualiser")) + "</button>";
        const refreshBtn = listEl.querySelector(".rm-refresh");
        if (refreshBtn) refreshBtn.onclick = refresh;
      }
    }

    const refresh = serialized(refreshOnce);
    stop = watchRoom(roomId, refresh);
    refresh();
    return { stop: () => { stopped = true; if (stop) stop(); } };
  }

  // ---- Phase C : boucle de saison collective --------------------------------

  // Cœur commun aux deux points de synchro (barrière de mercato et vote
  // narratif) : une fois le vote/la barrière ouverts côté serveur, la vue est
  // identique — candidats à voter, ou écran d'attente, jusqu'au retour en
  // phase 'in_season'. `open` fait le SEUL geste différent entre les deux cas
  // (appeler room_report_season vs room_open_transfer_vote) et n'est tenté
  // qu'une fois (`opened`), pour ne pas ré-ouvrir un vote à chaque poll.
  //
  // usesBarrier=true (mercato) : room_report_season écrit room_progress.ready
  // pour CE membre, MÊME quand tout le monde n'est pas encore prêt (la salle
  // reste alors en phase 'in_season', SANS vote). Sans un signal dédié, un
  // client qui vient de rapporter verrait "phase=in_season, déjà ouvert" et
  // conclurait à tort que la barrière est déjà retombée — d'où la vérification
  // de son PROPRE ready (retombé à false = barrière vraiment franchie / vote
  // clos ; encore à true = les autres ne sont pas prêts, on attend).
  // usesBarrier=false (narratif) : room_open_transfer_vote fait TOUJOURS
  // passer la salle en 'season_vote' avant de rendre la main (à nous, ou à
  // qui a gagné la course d'ouverture) — la phase repasse à 'in_season'
  // seulement quand ce vote se clôt, aucune ambiguïté possible.
  function watchTransferPhase(roomId, open, usesBarrier, renderFn, onResolved, mark?) {
    let stopped = false, resolved = false, opened = false;
    let stop = null;

    function cardHtml(inner) {
      return '<div class="card-tag"><span class="card-icon">💼</span> ' + esc(T("Salle — mercato")) + "</div>" + inner;
    }
    // renderFn (showCard côté jeu) rejoue une animation d'ENTRÉE à chaque
    // appel — sur un sondage de 5 s, ça faisait clignoter la carte même quand
    // rien n'avait changé (ex. "0/2 ont voté" repeint identique en boucle).
    // On ne peint que si le HTML a réellement changé depuis le dernier rendu.
    let lastHtml = null;
    function paint(html) {
      if (html === lastHtml) return;
      lastHtml = html;
      renderFn(html);
    }
    function finish() {
      if (resolved) return; // une fin de vote ne se conclut qu'une fois
      resolved = true;
      if (stop) stop();
      // Deuxième argument : le club de l'équipe, tenu à jour par le serveur à chaque
      // décision. C'est LUI qui fait foi pour savoir où aller, pas le dernier vote clos
      // (qui peut être celui d'une autre saison, ou une décision prise en cours de saison).
      return roomState(roomId).then((st) => {
        const last = st && st.lastClosedVote;
        onResolved(last && last.result ? last.result : null, st && st.room ? st.room.club_id : null);
      });
    }

    async function refreshOnce() {
      if (stopped || resolved) return;
      if (!opened) {
        // Marquée ouverte SEULEMENT si l'appel a réussi : sinon la salle se lirait sans
        // que notre bilan ou notre vote ait jamais été envoyé, et rien ne le renverrait.
        const r = await open();
        if (r && r.error) throw new Error(r.error.message);
        opened = true;
      }
      const st = await roomState(roomId);
      if (!st || stopped) return;
      const room = st.room;

      if (room.phase === "in_season") {
        if (!usesBarrier) return finish(); // narratif : jamais atteint tant que le vote n'est pas clos
        if ((room.season_year || 0) <= mark.season) {
          // Barrière pas encore franchie (un vote pris en cours de saison par un autre
          // membre a pu se clore entre-temps : il ne nous libère pas).
          paint(cardHtml('<p class="event-text">' + esc(T("En attente des autres membres de la salle…")) + "</p>"));
          return;
        }
        // Barrière franchie : la saison qui vient de se terminer peut avoir
        // vu un coéquipier gagner un trophée club que MA propre simulation
        // n'a pas tiré (RNG locale indépendante) —
        // room.season_trophies porte l'union posée par room_maybe_advance_season
        // juste avant cette bascule. game.ts filtre ce que j'ai déjà.
        if (room.season_trophies && room.season_trophies.length && window.OE && window.OE.creditClubTrophies) {
          window.OE.creditClubTrophies(room.season_trophies);
        }
        return finish(); // l'année de la salle a avancé : barrière franchie
      }

      if (room.phase !== "season_vote") { paint(cardHtml('<p class="event-text">' + esc(T("En attente des autres membres de la salle…")) + "</p>")); return; }

      const vote = st.openVote;
      if (!vote) {
        // La salle affiche 'season_vote' mais aucun vote OUVERT n'existe : soit
        // un tout dernier vote vient tout juste de se clore sans que la salle
        // soit encore repassée 'in_season' (course bénigne, la prochaine
        // synchro règle ça), soit — plus rare — la clôture a laissé la salle
        // sur cette phase. Auto-guérison : on cherche le dernier vote clos et,
        // s'il y en a un, on le traite comme résolu plutôt que de rester
        // bloqué sur "en préparation" indéfiniment.
        if (st.lastClosedVote) { return finish(); }
        paint(cardHtml('<p class="event-text">' + esc(T("Vote en préparation…")) + '</p><button class="btn btn-secondary rm-refresh">' + esc(T("Actualiser")) + "</button>"));
        const rb = document.querySelector(".rm-refresh");
        if (rb) rb.onclick = refresh;
        return;
      }
      if (vote.kind === "kick") {
        // Vote d'exclusion : se vote depuis l'overlay 🏟️ Salle (contexte
        // différent — cible nommée, pas de club en jeu), pas depuis l'écran
        // de jeu. On informe et on continue de suivre l'état, sans bloquer.
        paint(cardHtml('<p class="event-text">' + esc(T("Un vote d'exclusion est en cours dans la salle — ouvre 🏟️ Salle pour y participer.")) + "</p>"));
        return;
      }
      const ballots = vote.ballots;
      const members = joined(st);
      const me = st.me;
      const mine = (ballots || []).find((b) => b.user_id === me);
      // Mêmes cartes que le mercato solo (renderTransferChoice, game.ts) :
      // niveau + drapeau du pays, pas juste le nom sec du club.
      const optionsHtml = vote.candidates.map((c) => {
        if (c === "stay") {
          return '<button class="opt-btn rm-tv-opt" data-c="stay"' + (mine && mine.choice === "stay" ? " disabled" : "") + ">" +
            T("Rester à votre club actuel") + (mine && mine.choice === "stay" ? " ✔" : "") + "</button>";
        }
        const club = CLUBS.find((x) => x.id === c);
        if (!club) return "";
        const cc = E.countryOf(club.countryId);
        return '<button class="opt-btn rm-tv-opt" data-c="' + esc(c) + '"' + (mine && mine.choice === c ? " disabled" : "") + ">" +
          '<span class="opt-hint">' + esc(E.divShort(club.level, club.countryId)) + "</span>" +
          esc(club.name) + (club.colors ? " " + club.colors : "") + " " + flagHtml(cc) + (mine && mine.choice === c ? " ✔" : "") + "</button>";
      }).join("");
      paint(cardHtml(
        '<p class="event-text">' + esc(T("Vote collectif de la salle — {n}/{t} ont voté.", { n: (ballots || []).length, t: (members || []).length })) + "</p>" +
        '<div class="event-options">' + optionsHtml + "</div>"
      ));
      document.querySelectorAll(".rm-tv-opt").forEach((b) => (b.onclick = async () => {
        document.querySelectorAll(".rm-tv-opt").forEach((x) => (x.disabled = true));
        const { error } = await api.rpc("room_cast_vote", { p_vote_id: vote.id, p_choice: b.dataset.c });
        if (error) {
          document.querySelectorAll(".rm-tv-opt").forEach((x) => (x.disabled = false));
          const p = document.createElement("p");
          p.className = "lb-empty"; p.style.color = "#b3261e";
          p.textContent = T("Erreur : {msg}", { msg: error.message });
          document.querySelector(".event-options").after(p);
          return;
        }
        // Filet de sécurité : room_cast_vote tente déjà la résolution en
        // interne, mais un nudge explicite ici ne coûte rien et couvre le cas
        // où ce dernier bulletin n'aurait pas déclenché la clôture.
        api.rpc("room_maybe_resolve_vote", { p_vote_id: vote.id }).catch(() => {});
        refresh();
      }));
    }

    const refresh = serialized(refreshOnce);
    stop = watchRoom(roomId, refresh);
    refresh();
    return { stop: () => { stopped = true; if (stop) stop(); } };
  }

  // Barrière de fin de saison (mercato), appelée depuis offseason() en mode
  // salle. myPendingOffer = null (pas de fenêtre pour ce membre) ou
  // { offers: [clubId,...], forced: bool } (comme E.transferWindow, mais
  // réduit aux IDs). myClubTrophies = trophées CLUB de la saison qui vient de
  // se jouer, MA simulation locale (sert à créditer
  // les coéquipiers qui ne les ont pas tirés eux-mêmes). onResolved(result)
  // reçoit soit null (personne n'avait de fenêtre, rien à appliquer), soit
  // { choice: clubId | "stay" }.
  // Barrière de fin de saison. On note l'ANNÉE de la salle avant de rendre notre bilan :
  // la barrière est franchie quand cette année avance, et seulement alors. Le drapeau
  // « prêt » ne dit rien là-dessus : un vote pris en cours de saison par un autre membre
  // le remettait à zéro et nous faisait passer en avance.
  function renderSeasonBarrierStep(roomId, myPendingOffer, myClubTrophies, renderFn, onResolved) {
    const mark = { season: 0 };
    return watchTransferPhase(
      roomId,
      async () => {
        const st = await roomState(roomId);
        if (!st) throw new Error("salle illisible"); // on réessaiera : sans année de départ, on ne peut pas détecter la barrière
        mark.season = st.room.season_year || 0;
        await pendingPush; // nos chiffres de fin de saison d'abord, le bilan ensuite
        return api.rpc("room_report_season", { p_room_id: roomId, p_pending_offer: myPendingOffer, p_club_trophies: myClubTrophies || [] });
      },
      true, renderFn, onResolved, mark
    );
  }

  // Vote narratif immédiat (pas de barrière), appelé depuis onResultContinue()
  // en mode salle. myOffers = [clubId,...] (les offres narratives DE CE
  // membre) ; forced = pas d'option "rester" (comme window=null en solo).
  function renderNarrativeVoteStep(roomId, myOffers, forced, renderFn, onResolved) {
    return watchTransferPhase(
      roomId,
      () => api.rpc("room_open_transfer_vote", { p_room_id: roomId, p_offers: myOffers, p_forced: !!forced }),
      false, renderFn, onResolved
    );
  }

  // Vote a posteriori (Phase D), appelé quand un événement narratif a DÉJÀ
  // déplacé ce membre (fx.transfer.direct — irréversible) : le groupe décide
  // s'il suit. clubId = le club où CE membre se trouve déjà ; room_open_
  // relocation_vote pose son propre bulletin pour lui (inutile de lui
  // redemander ce qu'il pense d'un choix déjà fait).
  function renderRelocationVoteStep(roomId, clubId, renderFn, onResolved) {
    return watchTransferPhase(
      roomId,
      () => api.rpc("room_open_relocation_vote", { p_room_id: roomId, p_club_id: clubId }),
      false, renderFn, onResolved
    );
  }

  // Point de synchro AVANT de jouer sa saison : si un vote de club est ouvert (un coéquipier
  // vient d'être transféré par un événement…), on le vote d'abord, puis on rejoint le club
  // de l'équipe. Sans ça, un membre jouait sa saison dans l'ancien club pendant que l'autre
  // la jouait dans le nouveau. Rien à ouvrir côté serveur : on ne fait que lire et voter.
  function renderPreSeasonSync(roomId, renderFn, onResolved) {
    return watchTransferPhase(roomId, async () => ({}), false, renderFn, onResolved);
  }

  // Club de la saison : le premier membre à la commencer le fixe pour toute la salle
  // (cf. migration 004). Renvoie le club à jouer, ou null si le serveur ne répond pas.
  async function claimSeasonClub(roomId, year, clubId) {
    const { data, error } = await api.rpc("room_claim_season_club", { p_room_id: roomId, p_year: year, p_club_id: clubId });
    return error ? null : data;
  }

  // Signale la fin de SA carrière (retraite/blessure définitive) — le membre
  // devient spectateur : exclu du dénominateur de tous les votes futurs, sans
  // bloquer les autres. Appelé depuis finalize() (game.ts) en mode salle.
  // Best-effort : une erreur réseau ici ne doit jamais empêcher l'écran de
  // fin de carrière solo de s'afficher normalement.
  async function markCareerEnded(roomId, score, summary) {
    try { await api.rpc("room_mark_career_ended", { p_room_id: roomId, p_score: score, p_summary: summary }); } catch (_) {}
  }

  // Publie un instantané de carrière (club, âge, buts…) — appelé après chaque
  // saison jouée en mode salle (game.ts). Best-effort, comme markCareerEnded :
  // ne doit jamais interrompre le déroulé d'une saison.
  // Le dernier envoi est gardé : la barrière l'attend avant de rendre le bilan, pour que
  // tous les membres lisent les mêmes chiffres de fin de saison (note d'équipe, cf. teamOvr).
  let pendingPush = Promise.resolve();
  function pushLiveStats(roomId, stats) {
    pendingPush = api.rpc("room_update_stats", { p_room_id: roomId, p_stats: stats }).catch(() => {});
    return pendingPush;
  }

  // OVR moyen de l'équipe à l'issue d'une saison (ce que chaque membre a publié pour cette
  // année) : il fixe la note d'équipe de la saison suivante, la même pour tous puisque ces
  // chiffres ne bougent plus une fois la barrière franchie. null si personne n'a publié.
  async function teamOvr(roomId, year) {
    const st = await roomState(roomId);
    const vals = (st ? st.members : [])
      .map((m) => m.live_stats && m.live_stats.ovrByYear ? Number(m.live_stats.ovrByYear[year]) : NaN)
      .filter((v) => Number.isFinite(v) && v > 0 && v <= 99);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  // ---- Mode « Rivaux » --------------------------------------------------------
  // Chacun sa carrière et son club, jamais celui d'un autre membre (cf. migration 009).
  // Les rivaux sont les autres membres, avec leur dernier instantané publié (tout ce
  // qui vient d'un autre client est borné ou échappé à l'affichage).
  const clubOfMember = (m) => {
    const s = m.live_stats || {};
    if (typeof s.clubId === "string") return s.clubId;
    return Array.isArray(m.starting_offers) && typeof m.starting_offers[0] === "string" ? m.starting_offers[0] : null;
  };
  async function rivalsInfo(roomId) {
    const st = await roomState(roomId);
    if (!st) return null;
    const rivals = joined(st).filter((m) => m.user_id !== st.me).map((m) => {
      const s = m.live_stats || {};
      return {
        pseudo: m.pseudo, avatar: m.avatar, ended: !!m.career_ended, clubId: clubOfMember(m),
        name: typeof s.name === "string" ? s.name.slice(0, 40) : null,
        club: typeof s.club === "string" ? s.club.slice(0, 60) : null, countryId: typeof s.countryId === "string" ? s.countryId : null,
        level: typeof s.level === "string" ? s.level : null, year: num(s.year), age: num(s.age), ovr: num(s.ovr), score: num(s.score),
        seasonGoals: num(s.seasonGoals), seasonAssists: num(s.seasonAssists), seasonRating: num(s.seasonRating),
        seasonTrophies: Array.isArray(s.seasonTrophies) ? s.seasonTrophies.filter((t) => typeof t === "string").slice(0, 8) : [],
      };
    });
    return { rivals, blocked: rivals.filter((r) => r.clubId && !r.ended).map((r) => r.clubId) };
  }

  // Écran « centre de formation » en mode Rivaux : chacun réserve SON club parmi ses
  // offres (celles d'un rival en sont retirées), puis l'hôte lance quand tout le monde est
  // prêt. makeOffers(clubsPris) rend les offres du joueur (moteur, côté game.ts) ;
  // onStart(clubId) est appelé une fois la salle lancée.
  function renderRivalAcademyStep(roomId, makeOffers, els, onStart) {
    const { subEl, listEl } = els;
    let stopped = false, started = false, choosing = false, offers = null, lastHtml = null;
    let stop = null;
    const paint = (sub, html, bind) => {
      if (subEl.textContent !== sub) subEl.textContent = sub;
      if (html !== lastHtml) { lastHtml = html; listEl.innerHTML = html; bind(); }
    };

    async function refreshOnce() {
      if (stopped) return;
      const st = await getRoomState(roomId);
      if (!st || stopped) return;
      const { room, members, me } = st;
      const joinedM = members.filter((m) => m.status === "joined");
      const myClub = clubOfMember(joinedM.find((m) => m.user_id === me) || {});
      if (room.status === "active") {
        if (started || !myClub) return;
        started = true;
        if (stop) stop();
        onStart(myClub);
        return;
      }
      const taken = joinedM.filter((m) => m.user_id !== me).map(clubOfMember).filter(Boolean);

      if (!myClub || choosing || taken.includes(myClub)) {
        if (!offers) offers = makeOffers(taken);
        let shown = offers.filter((o) => !taken.includes(o.club.id));
        if (!shown.length) { offers = makeOffers(taken); shown = offers; } // un rival a pris toutes mes offres
        const html = shown.map((offer) => {
          const cc = E.countryOf(offer.club.countryId);
          return '<button class="origin-card academy-card rm-offer-pick" data-club="' + esc(offer.club.id) + '">' +
            '<p class="origin-name"><span class="level-tag level-' + esc(offer.level) + '">' + esc(E.divShort(offer.level, offer.club.countryId)) + "</span> " +
            esc(offer.club.name) + (offer.club.colors ? " " + offer.club.colors : "") + " " + flagHtml(cc) + "</p>" +
            '<p class="origin-desc">' + esc(offer.blurb || "") + (offer.surprise ? " — <strong>" + esc(T("contre toute attente, ils vous veulent VOUS.")) + "</strong>" : "") + "</p></button>";
        }).join("");
        paint(T("Choisis ton centre de formation. Les clubs déjà réservés par un rival ne sont pas proposés."), html, () => {
          listEl.querySelectorAll(".rm-offer-pick").forEach((b) => (b.onclick = async () => {
            listEl.querySelectorAll(".rm-offer-pick").forEach((x) => (x.disabled = true));
            const { error } = await api.rpc("room_pick_start_club", { p_room_id: roomId, p_club_id: b.dataset.club });
            if (!error) choosing = false;
            lastHtml = null; // repeindre même si rien d'autre n'a changé
            refresh();
          }));
        });
        return;
      }

      // Club réservé : on attend les autres, puis l'hôte lance.
      const creatorActive = joinedM.some((m) => m.user_id === room.created_by);
      const canLaunch = room.created_by === me || !creatorActive;
      const allReady = joinedM.length >= 2 && joinedM.every((m) => clubOfMember(m));
      const myClubObj = CLUBS.find((c) => c.id === myClub);
      const rows = joinedM.map((m) => {
        const c = CLUBS.find((x) => x.id === clubOfMember(m));
        return '<li class="lb-row"><span class="lb-name">' + (c ? "✓ " : "… ") + esc(m.pseudo) + (m.user_id === me ? " (" + esc(T("toi")) + ")" : "") + "</span>" +
          '<span class="lb-sub">' + (c ? esc(c.name) + " " + flagHtml(E.countryOf(c.countryId)) : esc(T("choisit son club…"))) + "</span></li>";
      }).join("");
      const html = '<ul class="lb-list">' + rows + "</ul>" +
        (canLaunch && allReady ? '<button class="btn btn-primary rm-rival-launch">🚀 ' + esc(T("Lancer la carrière")) + "</button>" : "") +
        '<button class="btn btn-secondary rm-rival-change">' + esc(T("Changer de club")) + "</button>";
      const sub = myClubObj ? T("Tu commences à {club}.", { club: myClubObj.name }) + " " : "";
      const wait = canLaunch ? (allReady ? T("Tout le monde est prêt : lance la carrière quand tu veux.") : T("En attente que chaque rival choisisse son club…"))
        : T("En attente que l'hôte lance la carrière…");
      paint(sub + wait, html, () => {
        const launch = listEl.querySelector(".rm-rival-launch");
        if (launch) launch.onclick = async () => {
          launch.disabled = true;
          const { error } = await api.rpc("room_launch", { p_room_id: roomId, p_club_id: null });
          if (error) launch.disabled = false;
          refresh();
        };
        const change = listEl.querySelector(".rm-rival-change");
        if (change) change.onclick = () => { choosing = true; lastHtml = null; refresh(); };
      });
    }

    const refresh = serialized(refreshOnce);
    stop = watchRoom(roomId, refresh);
    refresh();
    return { stop: () => { stopped = true; if (stop) stop(); } };
  }

  // Barrière de fin de saison en mode Rivaux : aucun vote, on attend seulement que chaque
  // rival ait fini la même saison. Puis les nouvelles des rivaux (cf. game.ts).
  function renderRivalBarrierStep(roomId, renderFn, onResolved) {
    return renderSeasonBarrierStep(roomId, null, [], renderFn, onResolved);
  }

  // ---- pastille d'accueil : compte des invitations reçues, sondage 60 s ----
  // Même discipline que account.ts (refreshNotifs) : actif seulement onglet
  // visible + session active, jamais de canal ouvert en permanence (le temps
  // réel, réservé à une salle active, arrive en phase suivante).
  async function refreshBadge() {
    const session = acc.getSession();
    if (!session) { setNavBadge(0); return; }
    try { setNavBadge((await listIncoming()).length); } catch (_) {}
  }
  refreshBadge();
  setInterval(() => { if (document.visibilityState === "visible" && acc.getSession()) refreshBadge(); }, 60000);

  window.OpenElevenRoom = { open, renderAcademyStep, renderSeasonBarrierStep, renderNarrativeVoteStep, renderRelocationVoteStep, markCareerEnded, pushLiveStats, renderMembersStats, teamOvr, renderPreSeasonSync, refreshBadge, claimSeasonClub, rivalsInfo, renderRivalAcademyStep, renderRivalBarrierStep };
  if (btn) btn.addEventListener("click", open);
})();
