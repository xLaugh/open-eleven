/* ============================================================
   Salle « carrière commune au même club » (jusqu'à 4 joueurs) — module
   AUTONOME, greffé sur account.js SANS lui faire connaître la notion de
   salle (il expose juste son client Supabase/session/liste d'amis).

   Phase A : cycle de vie du lobby — créer une salle, inviter des amis,
   accepter/décliner, quitter.
   Phase B : vote du club de départ (union des propositions individuelles de
   chaque membre) + premier usage du temps réel Supabase dans ce projet, avec
   un sondage de secours si la publication Realtime n'a pas été activée côté
   serveur (cf. supabase/rooms-votes.sql §5). La boucle de saison collective
   (Phase C) n'est PAS ici : une fois le club de départ résolu, chacun joue
   sa saison normalement, sans re-synchronisation.
   ============================================================ */
(function () {
  "use strict";
  const T = (tpl, vars) => (window.I18N ? window.I18N.t(tpl, vars) : (vars
    ? Object.keys(vars).reduce((a, k) => a.split("{" + k + "}").join(vars[k] == null ? "" : String(vars[k])), tpl)
    : tpl));
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  const acc = window.OpenElevenAccount;
  const btn = document.getElementById("btn-room");
  // Pas de compte configuré (mode invité) → la salle n'a pas de sens, on
  // masque le bouton et on s'arrête là, comme account.js le fait lui-même.
  if (!acc || !acc.getClient) {
    if (btn) btn.style.display = "none";
    return;
  }
  if (btn) btn.style.display = "";
  const sb = acc.getClient();
  const E = window.Engine; // CLUBS, lui, est un global de script classique (data-clubs.js), accessible tel quel
  // Exposé par game.js (chargé avant room.js) : mêmes cartes de club riches
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
  // Mes salles où je suis 'invited' (invitations reçues, à accepter/décliner).
  async function listIncoming() {
    const session = acc.getSession();
    if (!session) return [];
    const { data, error } = await sb.from("room_members")
      .select("room_id, invited_by, rooms:room_id(id, status, created_at)")
      .eq("user_id", session.user.id).eq("status", "invited")
      .order("created_at", { ascending: false });
    if (error) return [];
    // Le pseudo de l'invitant se lit dans profiles (lecture publique).
    const ids = [...new Set((data || []).map((r) => r.invited_by).filter(Boolean))];
    let byId = {};
    if (ids.length) {
      const { data: profs } = await sb.from("profiles").select("user_id, pseudo").in("user_id", ids);
      (profs || []).forEach((p) => { byId[p.user_id] = p.pseudo; });
    }
    return (data || []).filter((r) => r.rooms && r.rooms.status !== "ended")
      .map((r) => ({ roomId: r.room_id, fromPseudo: byId[r.invited_by] || "Joueur" }));
  }
  // Mes salles où je suis déjà 'joined' (lobby en cours de formation, ou
  // future carrière active) — avec la liste complète des membres.
  async function listMyRooms() {
    const session = acc.getSession();
    if (!session) return [];
    const { data: mine, error } = await sb.from("room_members")
      .select("room_id, rooms:room_id(id, status, phase, created_by, created_at)")
      .eq("user_id", session.user.id).eq("status", "joined")
      .order("created_at", { ascending: false });
    if (error || !mine || !mine.length) return [];
    const rooms = mine; // les salles 'ended' restent affichées, pour le récap final
    const roomIds = rooms.map((r) => r.room_id);
    if (!roomIds.length) return [];
    const { data: members } = await sb.from("room_members")
      .select("room_id, user_id, pseudo, status, career_ended, final_score, final_summary")
      .in("room_id", roomIds).in("status", ["joined", "invited"]);
    return rooms.map((r) => ({
      id: r.room_id,
      status: r.rooms.status,
      phase: r.rooms.phase,
      isCreator: r.rooms.created_by === session.user.id,
      members: (members || []).filter((m) => m.room_id === r.room_id),
    }));
  }

  // ---- overlay -------------------------------------------------------------
  const overlay = document.createElement("div");
  overlay.className = "acc-overlay";
  overlay.innerHTML = '<div class="lb-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(overlay);
  const box = overlay.querySelector(".lb-box");
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("on"); });

  async function render(msg) {
    box.innerHTML = '<button class="acc-x" aria-label="Fermer">×</button><h3>🏟️ Salle</h3><div class="lb-content"><p class="lb-empty">Chargement…</p></div>';
    box.querySelector(".acc-x").onclick = () => overlay.classList.remove("on");
    const content = box.querySelector(".lb-content");
    const session = acc.getSession();
    if (!session) { content.innerHTML = '<p class="lb-empty">Connecte-toi (👤) pour jouer en salle.</p>'; return; }

    const [incoming, myRooms, friends] = await Promise.all([listIncoming(), listMyRooms(), acc.listFriends()]);
    setNavBadge(incoming.length);
    // Un seul salle ACTIVE (non 'ended') à la fois par joueur — imposé aussi
    // côté serveur (room_create/room_join, cf. rooms.sql has_active_room) ;
    // ici on évite juste de proposer une action vouée à échouer.
    const hasActive = myRooms.some((r) => r.status !== "ended");

    const nameCell = (p) => '<span class="lb-name">👤 ' + esc(p || "Joueur") + "</span>";
    const btnHtml = (cls, label, data) => '<button class="acc-btn ' + cls + '" data-i="' + esc(data) + '" style="width:auto;margin:0;padding:6px 10px;font-size:.78rem">' + label + "</button>";
    const group = (title, html) => '<p class="fr-head">' + title + "</p>" + html;

    let html = (hasActive
      ? '<p class="lb-sub" style="margin:2px 0 6px">' + esc(T("Tu es déjà dans une salle active — quitte-la ou termine ta carrière avant d'en créer/rejoindre une autre.")) + "</p>"
      : '<div class="acc-row" style="margin:2px 0 6px"><button class="acc-btn soft" id="rm-create" style="width:auto;padding:11px 14px">+ Créer une salle</button></div>'
    ) + '<p class="acc-msg"></p>';

    html += incoming.length
      ? group("Invitations reçues", '<ul class="lb-list">' + incoming.map((r) =>
          '<li class="lb-row">' + nameCell(r.fromPseudo) +
          '<span class="fr-acts">' + (hasActive ? "" : btnHtml("soft rm-join", "Rejoindre", r.roomId)) + btnHtml("danger rm-decline", "Refuser", r.roomId) + "</span></li>"
        ).join("") + "</ul>")
      : "";

    if (myRooms.length) {
      html += myRooms.map((room) => {
        // Salle terminée (tout le monde a fini sa carrière) : récap plutôt
        // que les actions habituelles — classement par score, cf.
        // room_mark_career_ended (final_score/final_summary, jsonb best-effort
        // rempli par chaque client, jamais vérifié — même compromis que le
        // reste du mode).
        if (room.status === "ended") {
          const ranked = room.members.filter((m) => m.status === "joined")
            .sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
          const rows = ranked.map((m, i) => {
            const s = m.final_summary || {};
            const detail = s.name ? esc(s.name) + (s.position ? " · " + esc(s.position) : "") : "";
            return '<li class="lb-row"><span class="lb-name">' + (i === 0 ? "🏆 " : "") + "👤 " + esc(m.pseudo) + "</span>" +
              '<span class="lb-sub">' + (detail ? detail + " — " : "") + (m.final_score != null ? Math.round(m.final_score) + " pts" : "?") + "</span></li>";
          }).join("");
          return group("Salle terminée", '<ul class="lb-list">' + rows + "</ul>" +
            '<div class="acc-row" style="margin:6px 0 2px">' + btnHtml("danger rm-leave", "Retirer de ma liste", room.id) + "</div>");
        }

        const rows = room.members.map((m) => {
          const status = m.status === "invited" ? ' <span class="lb-sub">(invité)</span>'
            : m.career_ended ? ' <span class="lb-sub">🏁 carrière terminée</span>' : "";
          const kickBtn = (m.status === "joined" && m.user_id !== session.user.id &&
            room.members.filter((x) => x.status === "joined").length >= 3)
            ? btnHtml("danger rm-kick", "Exclure", room.id + "|" + m.user_id) : "";
          return '<li class="lb-row">' + nameCell(m.pseudo) + status + (kickBtn ? '<span class="fr-acts">' + kickBtn + "</span>" : "") + "</li>";
        }).join("");
        const full = room.members.filter((m) => m.status === "joined" || m.status === "invited").length >= 4;
        const invitable = friends.filter((f) => !room.members.some((m) => m.user_id === f.friend_id));
        // Inviter n'a de sens que tant que le club de départ n'est pas
        // encore tranché — au-delà, la salle a déjà démarré sa saison.
        const inviteRow = room.phase !== "profile_setup" ? "" : (full ? '<p class="lb-sub">Salle complète (4/4).</p>' : (
          invitable.length
            ? '<div class="acc-row" style="margin:6px 0"><select class="rm-invite-select" data-room="' + esc(room.id) + '" style="margin:0">' +
              invitable.map((f) => '<option value="' + esc(f.friend_id) + '">' + esc(f.friend_pseudo) + "</option>").join("") +
              '</select><button class="acc-btn soft rm-invite" data-i="' + esc(room.id) + '" style="width:auto;padding:11px 14px">Inviter</button></div>'
            : '<p class="lb-sub">Tous tes amis sont déjà dans cette salle, ou tu n\'as pas encore d\'ami à inviter.</p>'
        ));
        const phaseLabel = {
          profile_setup: "Configuration des profils",
          starting_vote: "Vote du club de départ en cours",
          in_season: "Carrière commune en cours",
          season_vote: "Vote en cours",
        }[room.phase] || room.phase;
        // Un vote de mercato peut s'ouvrir pendant que ce membre est ailleurs
        // dans SA propre saison (rien ne les synchronise en dehors de ce
        // point de contact) : ce bouton lui permet de le découvrir et voter
        // sans attendre de retomber par hasard sur son propre point de
        // synchro. Cf. room.js renderNarrativeVoteStep / renderSeasonBarrierStep.
        const playLabel = room.phase === "in_season" ? "Rejoindre la carrière"
          : room.phase === "profile_setup" && room.isCreator ? "Configurer mon profil (tu lanceras la salle)"
          : "Configurer mon profil";
        const playRow = room.phase === "season_vote"
          ? '<div class="acc-row" style="margin:6px 0 2px">' + btnHtml("soft rm-vote-now", "Voter maintenant", room.id) + "</div>"
          : '<div class="acc-row" style="margin:6px 0 2px">' + btnHtml("soft rm-play", playLabel, room.id) + "</div>";
        // Le comparatif n'a de sens qu'une fois la salle lancée (avant, live_stats
        // est vide pour tout le monde — cf. pushLiveStats, appelé après chaque
        // saison jouée en mode salle).
        const statsRow = room.status === "active"
          ? '<div class="acc-row" style="margin:6px 0 2px">' + btnHtml("soft rm-stats", "📊 Comparer les stats", room.id) + "</div>"
          : "";
        return group("Salle · " + esc(phaseLabel) + " (" + room.members.filter((m) => m.status === "joined").length + "/4)",
          '<ul class="lb-list">' + rows + "</ul>" + inviteRow + playRow + statsRow +
          '<div class="acc-row" style="margin:6px 0 2px">' + btnHtml("danger rm-leave", "Quitter la salle", room.id) + "</div>");
      }).join("");
    } else if (!incoming.length) {
      html += '<p class="lb-empty">Aucune salle pour l\'instant. Crée-en une et invite jusqu\'à 3 amis pour vivre une carrière commune dans le même club.</p>';
    }

    content.innerHTML = html;
    const m = content.querySelector(".acc-msg");
    if (msg) { m.textContent = msg.text; m.className = "acc-msg " + msg.cls; }

    const createBtn = content.querySelector("#rm-create");
    if (createBtn) createBtn.onclick = async () => {
      const { error } = await sb.rpc("room_create");
      render(error ? { text: T("Échec, réessaie."), cls: "err" } : { text: T("Salle créée ✔"), cls: "ok" });
    };
    const act = (sel, fn) => content.querySelectorAll(sel).forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      render(await fn(b.dataset.i));
    }));
    act(".rm-join", async (roomId) => {
      const { error } = await sb.rpc("room_join", { p_room_id: roomId });
      return error ? { text: T("Échec, réessaie."), cls: "err" } : { text: T("Tu as rejoint la salle ✔"), cls: "ok" };
    });
    act(".rm-decline", async (roomId) => {
      await sb.rpc("room_decline", { p_room_id: roomId });
      return { text: T("Invitation refusée."), cls: "ok" };
    });
    act(".rm-leave", async (roomId) => {
      await sb.rpc("room_leave", { p_room_id: roomId });
      return { text: T("Tu as quitté la salle."), cls: "ok" };
    });
    content.querySelectorAll(".rm-play").forEach((b) => (b.onclick = () => {
      overlay.classList.remove("on");
      if (window.OE && window.OE.startRoomCareer) window.OE.startRoomCareer(b.dataset.i);
    }));
    content.querySelectorAll(".rm-invite").forEach((b) => (b.onclick = async () => {
      const roomId = b.dataset.i;
      const sel = content.querySelector('.rm-invite-select[data-room="' + roomId + '"]');
      if (!sel || !sel.value) return;
      b.disabled = true;
      const { error } = await sb.rpc("room_invite", { p_room_id: roomId, p_friend_id: sel.value });
      render(error ? { text: T("Échec de l'invitation."), cls: "err" } : { text: T("Invitation envoyée ✔"), cls: "ok" });
    }));
    content.querySelectorAll(".rm-vote-now").forEach((b) => (b.onclick = () => renderVoteInline(b.dataset.i)));
    content.querySelectorAll(".rm-stats").forEach((b) => (b.onclick = () => renderStatsInline(b.dataset.i)));
    content.querySelectorAll(".rm-kick").forEach((b) => (b.onclick = async () => {
      const [roomId, targetId] = b.dataset.i.split("|");
      b.disabled = true;
      const { error } = await sb.rpc("room_propose_kick", { p_room_id: roomId, p_target_user_id: targetId });
      if (error) render({ text: T("Échec — un vote est peut-être déjà en cours."), cls: "err" });
      else renderVoteInline(roomId);
    }));
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
    const { data: votes } = await sb.from("room_votes")
      .select("*").eq("room_id", roomId).eq("status", "open")
      .order("opened_at", { ascending: false }).limit(1);
    const vote = votes && votes[0];
    if (!vote) { content.innerHTML = '<p class="lb-empty">Aucun vote ouvert pour l\'instant.</p><button class="acc-btn soft" id="rm-back">← Retour</button>'; back(); return; }
    const { data: ballots } = await sb.from("room_ballots").select("*").eq("vote_id", vote.id);
    const session = acc.getSession();
    const mine = (ballots || []).find((b) => b.user_id === session.user.id);

    if (vote.kind === "kick") {
      const targetId = vote.candidates.target;
      const { data: members } = await sb.from("room_members").select("user_id, pseudo, status").eq("room_id", roomId);
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
      const { data: members } = await sb.from("room_members").select("user_id").eq("room_id", roomId).eq("status", "joined");
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
      const { error } = await sb.rpc("room_cast_vote", { p_vote_id: vote.id, p_choice: b.dataset.c });
      if (!error) sb.rpc("room_maybe_resolve_vote", { p_vote_id: vote.id }).catch(() => {});
      renderVoteInline(roomId);
    }));
  }

  // Construit la liste HTML de comparaison des membres — utilisée à la fois
  // par l'overlay Salle (renderStatsInline) ET par l'onglet "Salle" du
  // panneau de profil en jeu (renderMembersStats), pour ne pas dupliquer le
  // rendu entre les deux points d'entrée.
  async function buildStatsListHtml(roomId) {
    const { data: members } = await sb.from("room_members")
      .select("user_id, pseudo, status, career_ended, live_stats")
      .eq("room_id", roomId).eq("status", "joined");
    const rows = (members || []).slice().sort((a, b) =>
      (((b.live_stats || {}).totalGoals) || 0) - (((a.live_stats || {}).totalGoals) || 0));
    if (!rows.length) return '<p class="lb-empty">' + esc(T("Aucun membre actif.")) + "</p>";

    const lines = rows.map((m, i) => {
      const s = m.live_stats;
      const statusTag = m.career_ended ? ' <span class="lb-sub">🏁 ' + esc(T("carrière terminée")) + "</span>" : "";
      if (!s) {
        return '<li class="lb-row" style="flex-direction:column;align-items:flex-start;gap:4px">' +
          '<span class="lb-name">👤 ' + esc(m.pseudo) + statusTag + "</span>" +
          '<span class="lb-sub">' + esc(T("Pas encore de données pour cette carrière.")) + "</span></li>";
      }
      const rank = i === 0 && s.totalGoals ? "🥇 " : "";
      const cc = s.countryId ? E.countryOf(s.countryId) : null;
      const clubLine = s.club
        ? '<span class="lb-sub">' + (s.level ? '<span class="level-tag level-' + esc(s.level) + '">' + esc(E.divShort(s.level, s.countryId)) + "</span> " : "") +
          esc(s.club) + (cc ? " " + flagHtml(cc) : "") + (s.age != null ? " · " + esc(s.age) + " ans" : "") + "</span>"
        : "";
      const seasonPart = s.seasonGoals != null
        ? s.seasonGoals + " ⚽ " + (s.seasonAssists || 0) + " 🅰️" + (s.seasonRating != null ? " · " + s.seasonRating : "")
        : "?";
      const careerPart = (s.totalGoals != null ? s.totalGoals : "?") + " ⚽ " + (s.totalAssists != null ? s.totalAssists : "?") +
        " 🅰️ · " + (s.totalMatches != null ? s.totalMatches : "?") + " " + esc(T("matchs")) +
        (s.ovr != null ? " · " + s.ovr + " OVR" : "");
      const statLine = '<span class="lb-sub">' + esc(T("Saison")) + " : " + seasonPart + " — " + esc(T("Carrière")) + " : " + careerPart + "</span>";
      return '<li class="lb-row" style="flex-direction:column;align-items:flex-start;gap:4px">' +
        '<span class="lb-name">' + rank + "👤 " + esc(m.pseudo) + statusTag + "</span>" + clubLine + statLine + "</li>";
    }).join("");
    return '<ul class="lb-list">' + lines + "</ul>";
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
  // seulement depuis l'overlay lobby. Appelé par game.js (initProfileTabs)
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
    const { data: room } = await sb.from("rooms").select("*").eq("id", roomId).single();
    if (!room) return null;
    const { data: members } = await sb.from("room_members")
      .select("room_id, user_id, pseudo, status, starting_offers")
      .eq("room_id", roomId).in("status", ["joined", "invited"]);
    let vote = null;
    if (room.phase === "starting_vote") {
      const { data: votes } = await sb.from("room_votes")
        .select("*").eq("room_id", roomId).eq("kind", "starting_club").eq("status", "open")
        .order("opened_at", { ascending: false }).limit(1);
      vote = votes && votes[0] ? votes[0] : null;
      if (vote) {
        const { data: ballots } = await sb.from("room_ballots").select("*").eq("vote_id", vote.id);
        vote.ballots = ballots || [];
      }
    }
    return { room, members: members || [], vote, me: session.user.id };
  }

  // Un canal par salle active, souscrit UNIQUEMENT pendant que cette étape est
  // affichée (désabonnement via le stop() rendu). Premier usage du temps réel
  // dans ce projet — un sondage de secours tourne EN PLUS : si la publication
  // `supabase_realtime` n'a pas été activée côté Supabase (geste manuel, cf.
  // rooms-votes.sql §5), le canal ne se déclenche simplement jamais, mais la
  // salle avance quand même (juste moins instantanément).
  function watchRoom(roomId, onChange) {
    let channel = null;
    try {
      channel = sb.channel("room:" + roomId)
        .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: "id=eq." + roomId }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: "room_id=eq." + roomId }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "room_votes", filter: "room_id=eq." + roomId }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "room_progress", filter: "room_id=eq." + roomId }, onChange)
        .subscribe();
    } catch (_) { channel = null; }
    const poll = setInterval(onChange, 5000);
    return function stop() {
      clearInterval(poll);
      if (channel) { try { sb.removeChannel(channel); } catch (_) {} }
    };
  }

  // Rendu de l'étape « club de départ », appelé par game.js depuis l'écran
  // académie (setup.roomId posé) : els = { subEl, listEl } (les mêmes éléments
  // que l'écran académie solo), offerClubIds = propositions DE CE membre
  // (issues de son propre profil, calculées par le moteur côté game.js).
  // onReadyToStart(clubId) est appelé une seule fois la salle lancée — c'est
  // à game.js de retrouver le club et de lancer startCareer(club).
  //
  // Pas de vote à plusieurs candidats ici (trop de points de blocage à
  // tester à 2-4, cf. rooms-votes.sql) : SEUL le créateur de la salle choisit
  // parmi SES propres offres, et son choix s'applique direct à tout le monde.
  function renderAcademyStep(roomId, offers, els, onReadyToStart) {
    const { subEl, listEl } = els;
    let stopped = false, started = false;
    let stop = null;

    async function refresh() {
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
        // Mêmes cartes qu'en solo (renderAcademyScreen, game.js) : niveau,
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
          const { error } = await sb.rpc("room_launch", { p_room_id: roomId, p_club_id: b.dataset.club });
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
  function watchTransferPhase(roomId, open, usesBarrier, renderFn, onResolved) {
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
      resolved = true;
      if (stop) stop();
      return sb.from("room_votes")
        .select("*").eq("room_id", roomId).in("kind", ["transfer", "follow_relocation"]).eq("status", "closed")
        .order("closed_at", { ascending: false }).limit(1)
        .then(({ data: last }) => onResolved(last && last[0] && last[0].result ? last[0].result : null));
    }

    async function refresh() {
      if (stopped || resolved) return;
      if (!opened) { opened = true; await open(); }
      const { data: room } = await sb.from("rooms").select("*").eq("id", roomId).single();
      if (!room || stopped) return;

      if (room.phase === "in_season") {
        if (!usesBarrier) return finish(); // narratif : jamais atteint tant que le vote n'est pas clos
        const session = acc.getSession();
        const { data: mine } = await sb.from("room_progress").select("ready")
          .eq("room_id", roomId).eq("user_id", session.user.id).maybeSingle();
        if (mine && mine.ready === true) {
          paint(cardHtml('<p class="event-text">' + esc(T("En attente des autres membres de la salle…")) + "</p>"));
          return;
        }
        // Barrière franchie : la saison qui vient de se terminer peut avoir
        // vu un coéquipier gagner un trophée club que MA propre simulation
        // n'a pas tiré (RNG locale indépendante, cf. rooms-trophies.sql) —
        // room.season_trophies porte l'union posée par room_maybe_advance_season
        // juste avant cette bascule. game.js filtre ce que j'ai déjà.
        if (room.season_trophies && room.season_trophies.length && window.OE && window.OE.creditClubTrophies) {
          window.OE.creditClubTrophies(room.season_trophies);
        }
        return finish(); // ready retombé à false : barrière franchie (ou vote clos)
      }

      if (room.phase !== "season_vote") { paint(cardHtml('<p class="event-text">' + esc(T("En attente des autres membres de la salle…")) + "</p>")); return; }

      const { data: votes } = await sb.from("room_votes")
        .select("*").eq("room_id", roomId).eq("status", "open")
        .order("opened_at", { ascending: false }).limit(1);
      const vote = votes && votes[0];
      if (!vote) {
        // La salle affiche 'season_vote' mais aucun vote OUVERT n'existe : soit
        // un tout dernier vote vient tout juste de se clore sans que la salle
        // soit encore repassée 'in_season' (course bénigne, la prochaine
        // synchro règle ça), soit — plus rare — la clôture a laissé la salle
        // sur cette phase. Auto-guérison : on cherche le dernier vote clos et,
        // s'il y en a un, on le traite comme résolu plutôt que de rester
        // bloqué sur "en préparation" indéfiniment.
        const { data: last } = await sb.from("room_votes")
          .select("*").eq("room_id", roomId).in("kind", ["transfer", "follow_relocation"]).eq("status", "closed")
          .order("closed_at", { ascending: false }).limit(1);
        if (last && last[0]) { return finish(); }
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
      const { data: ballots } = await sb.from("room_ballots").select("*").eq("vote_id", vote.id);
      const { data: members } = await sb.from("room_members").select("user_id").eq("room_id", roomId).eq("status", "joined");
      const me = acc.getSession().user.id;
      const mine = (ballots || []).find((b) => b.user_id === me);
      // Mêmes cartes que le mercato solo (renderTransferChoice, game.js) :
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
        const { error } = await sb.rpc("room_cast_vote", { p_vote_id: vote.id, p_choice: b.dataset.c });
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
        sb.rpc("room_maybe_resolve_vote", { p_vote_id: vote.id }).catch(() => {});
        refresh();
      }));
    }

    stop = watchRoom(roomId, refresh);
    refresh();
    return { stop: () => { stopped = true; if (stop) stop(); } };
  }

  // Barrière de fin de saison (mercato), appelée depuis offseason() en mode
  // salle. myPendingOffer = null (pas de fenêtre pour ce membre) ou
  // { offers: [clubId,...], forced: bool } (comme E.transferWindow, mais
  // réduit aux IDs). myClubTrophies = trophées CLUB de la saison qui vient de
  // se jouer, MA simulation locale (cf. rooms-trophies.sql — sert à créditer
  // les coéquipiers qui ne les ont pas tirés eux-mêmes). onResolved(result)
  // reçoit soit null (personne n'avait de fenêtre, rien à appliquer), soit
  // { choice: clubId | "stay" }.
  function renderSeasonBarrierStep(roomId, myPendingOffer, myClubTrophies, renderFn, onResolved) {
    return watchTransferPhase(
      roomId,
      () => sb.rpc("room_report_season", { p_room_id: roomId, p_pending_offer: myPendingOffer, p_club_trophies: myClubTrophies || [] }),
      true, renderFn, onResolved
    );
  }

  // Vote narratif immédiat (pas de barrière), appelé depuis onResultContinue()
  // en mode salle. myOffers = [clubId,...] (les offres narratives DE CE
  // membre) ; forced = pas d'option "rester" (comme window=null en solo).
  function renderNarrativeVoteStep(roomId, myOffers, forced, renderFn, onResolved) {
    return watchTransferPhase(
      roomId,
      () => sb.rpc("room_open_transfer_vote", { p_room_id: roomId, p_offers: myOffers, p_forced: !!forced }),
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
      () => sb.rpc("room_open_relocation_vote", { p_room_id: roomId, p_club_id: clubId }),
      false, renderFn, onResolved
    );
  }

  // Signale la fin de SA carrière (retraite/blessure définitive) — le membre
  // devient spectateur : exclu du dénominateur de tous les votes futurs, sans
  // bloquer les autres. Appelé depuis finalize() (game.js) en mode salle.
  // Best-effort : une erreur réseau ici ne doit jamais empêcher l'écran de
  // fin de carrière solo de s'afficher normalement.
  async function markCareerEnded(roomId, score, summary) {
    try { await sb.rpc("room_mark_career_ended", { p_room_id: roomId, p_score: score, p_summary: summary }); } catch (_) {}
  }

  // Publie un instantané de carrière (club, âge, buts…) — appelé après chaque
  // saison jouée en mode salle (game.js). Best-effort, comme markCareerEnded :
  // ne doit jamais interrompre le déroulé d'une saison.
  async function pushLiveStats(roomId, stats) {
    try { await sb.rpc("room_update_stats", { p_room_id: roomId, p_stats: stats }); } catch (_) {}
  }

  // ---- pastille d'accueil : compte des invitations reçues, sondage 60 s ----
  // Même discipline que account.js (refreshNotifs) : actif seulement onglet
  // visible + session active, jamais de canal ouvert en permanence (le temps
  // réel, réservé à une salle active, arrive en phase suivante).
  async function refreshBadge() {
    const session = acc.getSession();
    if (!session) { setNavBadge(0); return; }
    try { setNavBadge((await listIncoming()).length); } catch (_) {}
  }
  refreshBadge();
  setInterval(() => { if (document.visibilityState === "visible" && acc.getSession()) refreshBadge(); }, 60000);

  window.OpenElevenRoom = { open, renderAcademyStep, renderSeasonBarrierStep, renderNarrativeVoteStep, renderRelocationVoteStep, markCareerEnded, pushLiveStats, renderMembersStats };
  if (btn) btn.addEventListener("click", open);
})();
