/* ============================================================
   UI DU JEU v2 — orchestration des écrans et rendu.
   Toute la logique de jeu vit dans engine.js (Engine.*).
   ============================================================ */
(function () {
  "use strict";
  const E = window.Engine;

  const SUSPENSE_DELAY = 420;

  // --- État de session ---------------------------------------------------
  let G = null; // carrière du joueur
  let R = null; // rival
  let setup = {}; // choix de création en cours
  let currentEvent = null;
  let lastOutcome = null;
  let lastReport = null;
  let legendGuest = null;
  let legendGuestUsed = false;
  let reviewingPantheon = false; // fiche du Panthéon consultée (pas une vraie fin de carrière)

  // --- Helpers DOM ---------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(id).classList.add("active");
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  // Année du premier contrat pro. PAS BALANCE.startYear : le mode Histoire
  // impose son époque (« Le Maestro » débute en 1988).
  function careerStartYear() {
    return G.year - (G.age - E.BALANCE_REF.ageMin);
  }

  // --- Modale de confirmation (remplace window.confirm) --------------------
  // Renvoie une Promise<boolean>. Fermeture par le fond ou Échap = annuler.
  // Pour une action destructive, on passe danger:true (bouton rouge) et on
  // met le focus sur « Annuler » — jamais de confirmation accidentelle.
  function confirmModal({ title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", icon = "⚠️", danger = false } = {}) {
    return new Promise((resolve) => {
      const overlay = $("modal-overlay");
      $("modal-icon").textContent = icon;
      $("modal-title").textContent = title || "";
      $("modal-message").textContent = message || "";
      const confirmBtn = $("modal-confirm");
      const cancelBtn = $("modal-cancel");
      confirmBtn.textContent = confirmLabel;
      cancelBtn.textContent = cancelLabel;
      confirmBtn.classList.toggle("danger", !!danger);
      overlay.hidden = false;

      function cleanup(result) {
        overlay.hidden = true;
        confirmBtn.removeEventListener("click", onConfirm);
        cancelBtn.removeEventListener("click", onCancel);
        overlay.removeEventListener("click", onBackdrop);
        document.removeEventListener("keydown", onKey);
        resolve(result);
      }
      function onConfirm() { cleanup(true); }
      function onCancel() { cleanup(false); }
      function onBackdrop(e) { if (e.target === overlay) cleanup(false); }
      function onKey(e) { if (e.key === "Escape") cleanup(false); }
      confirmBtn.addEventListener("click", onConfirm);
      cancelBtn.addEventListener("click", onCancel);
      overlay.addEventListener("click", onBackdrop);
      document.addEventListener("keydown", onKey);
      (danger ? cancelBtn : confirmBtn).focus();
    });
  }

  // --- Statistiques (désactivées) -----------------------------------------
  // Aucune analytique, aucun script tiers, aucun cookie : pas de Google
  // Analytics ni de bannière RGPD. track() est conservé comme point d'ancrage
  // neutre (appelé à plusieurs endroits) mais ne fait STRICTEMENT rien et
  // n'émet rien vers l'extérieur.
  function track() { /* no-op : aucune analytique, aucun cookie */ }

  // Drapeau fiable : image si disponible (les emojis de drapeaux sont
  // cassés sur certains systèmes, ex. Angleterre), sinon emoji.
  function flagHtml(entity) {
    if (!entity) return "";
    if (entity.img) return `<img class="flag-mini" src="${encodeURI(entity.img)}" alt="${esc(entity.name || "")}" onerror="this.remove()" />`;
    return entity.flag || "";
  }

  // Ré-affiche la carte de jeu avec une animation d'entrée.
  function showCard(html, tone) {
    const card = $("game-card");
    card.classList.remove("tone-great", "tone-good", "tone-neutral", "tone-bad", "tone-terrible", "card-in");
    if (tone) card.classList.add(`tone-${tone}`);
    card.innerHTML = html;
    void card.offsetWidth; // relance l'animation CSS
    card.classList.add("card-in");
  }

  function chipsHtml(chips) {
    if (!chips || !chips.length) return "";
    return `<div class="fx-chips">${chips
      .map((c, i) => `<span class="fx-chip fx-${c.kind}" style="animation-delay:${0.15 + i * 0.09}s">${esc(c.label)}</span>`)
      .join("")}</div>`;
  }

  // --- En-tête de jeu -------------------------------------------------------
  let prevOvr = null;

  function updateHeader() {
    const country = E.countryOf(G.club.countryId);
    $("hh-player").innerHTML = `${flagHtml(G.nationality)} ${esc(G.name)}`;
    $("hh-age").textContent = `${G.age} ans · ${G.year}`;
    const clubImg = G.club.img ? `<img class="club-logo" src="${encodeURI(G.club.img)}" alt="" onerror="this.remove()" />` : "";
    const lvl = E.lvlOf(G, G.club);
    $("hh-club").innerHTML = `${clubImg}<span class="level-tag level-${lvl}">${esc(E.divShort(lvl, G.club.countryId))}</span>${esc(G.club.name)}${G.club.colors ? ` ${G.club.colors}` : ""}${G.loan ? " <span class='loan-tag'>Prêt</span>" : ""} ${flagHtml(country)}`;

    const o = E.ovr(G);
    const arrow = prevOvr == null || o === prevOvr ? "" : o > prevOvr ? " <span class='ovr-up'>▲</span>" : " <span class='ovr-down'>▼</span>";
    $("hh-ovr").innerHTML = `${o}${arrow}`;
    prevOvr = o;
    $("hh-money").textContent = E.fmtMoney(G.money);
    $("hh-rep").textContent = "★".repeat(Math.max(1, Math.round(G.rep / 20))).padEnd(5, "☆");
    $("hh-pos").textContent = G.position.icon;

    $("gauge-form-fill").style.width = `${G.form}%`;
    $("gauge-moral-fill").style.width = `${G.moral}%`;

    const pct = ((G.age - E.BALANCE_REF.ageMin) / (E.BALANCE_REF.ageMax - E.BALANCE_REF.ageMin)) * 100;
    $("age-progress-fill").style.width = `${pct}%`;

    // Panneau profil (barres de stats)
    const bars = [
      ["Technique", G.stats.t], ["Physique", G.stats.p],
      ["Mental", G.stats.m], ["Charisme", G.stats.c], ["Réputation", G.rep],
      ["Discipline", G.discipline], ["Relation coach", G.coachRel], ["Vestiaire", G.teamRel],
    ];
    $("profile-bars").innerHTML = bars
      .map(([label, v]) => `<div class="pbar-row"><span class="pbar-label">${label}</span><div class="pbar"><div class="pbar-fill" style="width:${v}%"></div></div><span class="pbar-val">${v}</span></div>`)
      .join("");
    const stars = E.potStars(G.potCap);
    $("profile-meta").innerHTML = `Potentiel estimé : <span class="pot-stars">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</span> · Contrat : ${E.fmtMoney(G.contract.salary)}/an${G.contract.years > 0 ? `, ${G.contract.years} an${G.contract.years > 1 ? "s" : ""}` : " (dernière année)"}${G.archetype ? `<br/>🧬 <strong>${esc(G.archetype.name)}</strong> — ${esc(G.archetype.effect || G.archetype.desc)}` : ""}`;
    $("profile-traits").innerHTML = G.traits.length
      ? G.traits.map((id) => { const t = TRAITS[id]; return `<span class="trait-chip" title="${esc(t.desc)}">${t.icon} ${esc(t.name)}</span>`; }).join("")
      : `<span class="trait-none">Aucun trait débloqué pour l'instant</span>`;
  }

  // --- Écrans de création ----------------------------------------------------
  // Choix de la nationalité en deux temps : d'abord le continent (mêmes cartes
  // que les drapeaux, une icône de continent au lieu du drapeau), puis les pays
  // de ce continent. Évite une liste unique interminable quand les nations se
  // multiplient. Le continent d'une nation vient de son pays d'origine.
  const CONTINENT_MENU = [
    { id: "eu", name: "Europe", icon: "🇪🇺" },
    { id: "am", name: "Amérique", icon: "🌎" },
    { id: "af", name: "Afrique", icon: "🌍" },
    { id: "as", name: "Asie", icon: "🌏" },
    { id: "oc", name: "Océanie", icon: "🏝️" },
  ];
  function continentOfNat(nat) {
    const c = COUNTRIES.find((co) => co.id === nat.homeCountryId);
    return c ? c.continent : null;
  }
  // Nom aléatoire proposé par défaut sur l'écran de nom. Volontairement tiré
  // avec Math.random (PAS le PRNG du jeu) : ce n'est qu'une suggestion d'UI, et
  // le nom retenu est passé explicitement à newCareer — le déterminisme des
  // Défis/duels (qui ne passent pas par cet écran) reste intact.
  function randomNameFor(natId) {
    const pool = (NAME_POOLS && (NAME_POOLS[natId] || NAME_POOLS.fr)) || { first: ["Alex"], last: ["Martin"] };
    const r = (a) => a[Math.floor(Math.random() * a.length)];
    return { first: r(pool.first), last: r(pool.last) };
  }
  function setNatTitle(txt) { const t = $("nationality-title"); if (t) t.textContent = txt; }
  function initNationalityScreen() { showContinentPicker(); }

  function showContinentPicker() {
    const grid = $("nationality-grid");
    grid.innerHTML = "";
    setNatTitle("Votre nationalité");
    const sub = $("nationality-sub");
    if (sub) sub.textContent = "Choisissez d'abord un continent.";
    CONTINENT_MENU.forEach((cont) => {
      const nats = NATIONALITIES.filter((n) => continentOfNat(n) === cont.id);
      if (!nats.length) return;
      const card = document.createElement("button");
      card.className = "nat-card";
      card.innerHTML = `<span class="nat-flag">${cont.icon}</span><span class="nat-name">${esc(cont.name)}</span><span class="nat-count">${nats.length} pays</span>`;
      card.addEventListener("click", () => showCountryPicker(cont));
      grid.appendChild(card);
    });
  }

  function showCountryPicker(cont) {
    const grid = $("nationality-grid");
    grid.innerHTML = "";
    setNatTitle("Votre nationalité");
    const sub = $("nationality-sub");
    if (sub) sub.textContent = `${cont.icon} ${cont.name} — le pays qui vous verra grandir.`;
    const back = document.createElement("button");
    back.className = "nat-card nat-card-back";
    back.innerHTML = `<span class="nat-flag">↩</span><span class="nat-name">Continents</span>`;
    back.addEventListener("click", showContinentPicker);
    grid.appendChild(back);
    NATIONALITIES.filter((n) => continentOfNat(n) === cont.id).forEach((nat) => {
      const card = document.createElement("button");
      card.className = "nat-card";
      const flag = nat.img
        ? `<img class="nat-flag-img" src="${encodeURI(nat.img)}" alt="${esc(nat.name)}" onerror="this.outerHTML='<span class=nat-flag>${nat.flag}</span>'" />`
        : `<span class="nat-flag">${nat.flag}</span>`;
      card.innerHTML = `${flag}<span class="nat-name">${esc(nat.name)}</span>`;
      card.addEventListener("click", () => showNameForm(nat));
      grid.appendChild(card);
    });
  }

  // Sous-étape « nom », après le choix du pays : le joueur écrit son prénom et
  // son nom, ou garde la suggestion aléatoire (pré-remplie depuis le vivier du
  // pays), ou vide les champs pour un nom tiré au sort à la création.
  function showNameForm(nat) {
    setup.nationality = nat;
    const grid = $("nationality-grid");
    grid.innerHTML = "";
    setNatTitle("Votre nom");
    const sub = $("nationality-sub");
    if (sub) sub.textContent = `${esc(nat.name)} — écrivez votre nom, ou laissez le hasard décider.`;
    const rnd = randomNameFor(nat.id);
    const form = document.createElement("div");
    form.className = "name-form";
    form.innerHTML = `
      <label class="name-field"><span>Prénom</span><input id="name-first" type="text" maxlength="20" autocomplete="off" spellcheck="false" value="${esc(rnd.first)}" /></label>
      <label class="name-field"><span>Nom</span><input id="name-last" type="text" maxlength="24" autocomplete="off" spellcheck="false" value="${esc(rnd.last)}" /></label>
      <div class="name-actions">
        <button type="button" class="btn btn-secondary" id="name-shuffle">🎲 Aléatoire</button>
        <button type="button" class="btn btn-primary" id="name-confirm">Continuer</button>
      </div>`;
    grid.appendChild(form);
    $("name-shuffle").addEventListener("click", () => {
      const r = randomNameFor(nat.id);
      $("name-first").value = r.first;
      $("name-last").value = r.last;
    });
    $("name-confirm").addEventListener("click", () => {
      const first = $("name-first").value.trim().replace(/\s+/g, " ");
      const last = $("name-last").value.trim().replace(/\s+/g, " ");
      const full = `${first} ${last}`.trim();
      setup.name = full || undefined; // champs vides → nom aléatoire tiré par newCareer
      showScreen("screen-position");
    });
  }

  function initPositionScreen() {
    const list = $("position-list");
    list.innerHTML = "";
    POSITIONS.forEach((pos) => {
      const card = document.createElement("button");
      card.className = "origin-card";
      card.innerHTML = `<p class="origin-name">${pos.icon} ${esc(pos.name)}</p><p class="origin-desc">${esc(pos.desc)}</p>`;
      card.addEventListener("click", () => { setup.position = pos; showScreen("screen-origin"); });
      list.appendChild(card);
    });
  }

  function initOriginScreen() {
    const list = $("origin-list");
    list.innerHTML = "";
    ORIGINS.forEach((origin) => {
      const st = origin.startStats;
      const card = document.createElement("button");
      card.className = "origin-card";
      card.innerHTML = `<p class="origin-name">${esc(origin.name)}</p><p class="origin-desc">${esc(origin.desc)}</p>
        <p class="origin-stats">T ${st.t} · P ${st.p} · M ${st.m} · C ${st.c} · Rép ${st.rep}</p>`;
      card.addEventListener("click", () => { setup.origin = origin; showScreen("screen-lifestyle"); });
      list.appendChild(card);
    });
  }

  function initLifestyleScreen() {
    const list = $("lifestyle-list");
    list.innerHTML = "";
    LIFESTYLES.forEach((ls) => {
      const card = document.createElement("button");
      card.className = "origin-card";
      card.innerHTML = `<p class="origin-name">${ls.icon} ${esc(ls.name)}</p><p class="origin-desc">${esc(ls.desc)}</p>`;
      card.addEventListener("click", () => { setup.lifestyle = ls; if (setup.duelRole) setup.duelChoices.push(LIFESTYLES.indexOf(ls)); showScreen("screen-entourage"); });
      list.appendChild(card);
    });
  }

  function initEntourageScreen() {
    const list = $("entourage-list");
    list.innerHTML = "";
    ENTOURAGES.forEach((ent) => {
      const card = document.createElement("button");
      card.className = "origin-card";
      card.innerHTML = `<p class="origin-name">${ent.icon} ${esc(ent.name)}</p><p class="origin-desc">${esc(ent.desc)}</p>`;
      card.addEventListener("click", () => {
        setup.entourage = ent;
        if (setup.duelRole) setup.duelChoices.push(ENTOURAGES.indexOf(ent));
        // Mode Histoire : le club de départ fait partie de la légende — pas
        // d'écran académie, la carrière démarre là où tout a commencé.
        if (setup.storyId && setup.startClubId) {
          const club = CLUBS.find((c) => c.id === setup.startClubId);
          if (club) { startCareer(club); return; }
        }
        renderAcademyScreen();
        showScreen("screen-academy");
      });
      list.appendChild(card);
    });
  }

  // Le club de départ n'est plus un choix libre : les centres intéressés
  // dépendent du profil complet (origine, hygiène de vie, entourage,
  // potentiel repéré par les scouts). Chaque début de carrière est unique.
  function renderAcademyScreen() {
    // Idempotent face au bouton "Retour" : on ne re-tire le potentiel et les
    // offres QUE si l'hygiène de vie ou l'entourage a changé. En mode seedé
    // (Défi du jour / duel), on restaure l'état du hasard AVANT le tirage pour
    // que revenir en arrière ne décale jamais le déterminisme.
    const key = `${setup.lifestyle.id}/${setup.entourage.id}`;
    if (setup._academyKey !== key) {
      if (setup._seedBeforeAcademy === undefined) setup._seedBeforeAcademy = E.getSeedState();
      else E.setSeedState(setup._seedBeforeAcademy);
      setup.potCap = E.rollPotential(setup.origin, setup.lifestyle, setup.entourage);
      setup._academyOffers = E.academyOffers({
        nationality: setup.nationality, origin: setup.origin,
        lifestyle: setup.lifestyle, entourage: setup.entourage, potCap: setup.potCap,
      });
      setup._academyKey = key;
    }
    const stars = E.potStars(setup.potCap);
    $("academy-sub").innerHTML = `Les recruteurs ont observé votre profil.<br/>Potentiel estimé : <span class="pot-stars">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</span>`;
    const offers = setup._academyOffers;
    const list = $("academy-list");
    list.innerHTML = "";
    offers.forEach((offer) => {
      const cc = E.countryOf(offer.club.countryId);
      const card = document.createElement("button");
      card.className = "origin-card academy-card";
      card.innerHTML = `
        <p class="origin-name"><span class="level-tag level-${offer.level}">${esc(E.divShort(offer.level, offer.club.countryId))}</span> ${esc(offer.club.name)}${offer.club.colors ? ` ${offer.club.colors}` : ""} ${flagHtml(cc)}</p>
        <p class="origin-desc">${esc(offer.blurb)}${offer.surprise ? " — <strong>contre toute attente, ils vous veulent VOUS.</strong>" : ""}</p>`;
      card.addEventListener("click", () => { if (setup.duelRole) setup.duelChoices.push(offers.indexOf(offer)); startCareer(offer.club); });
      list.appendChild(card);
    });
  }

  // Retour pendant la création : ramène à l'étape précédente, ou à l'accueil
  // depuis la première étape du mode en cours (setup.entryScreen — nationalité
  // en carrière normale, hygiène de vie quand le profil est imposé : Défi,
  // duel, Histoire). En duel, on retire du journal le choix ré-ouvert.
  const CREATION_ORDER = ["screen-nationality", "screen-position", "screen-origin", "screen-lifestyle", "screen-entourage", "screen-academy"];
  function creationBack() {
    const active = document.querySelector(".screen.active");
    const id = active ? active.id : "";
    const idx = CREATION_ORDER.indexOf(id);
    if (idx < 0) return;
    if (setup.duelRole && setup.duelChoices && (id === "screen-entourage" || id === "screen-academy")) {
      setup.duelChoices.pop(); // le choix qui a mené ici va être refait
    }
    if (id === (setup.entryScreen || "screen-nationality")) { resetGame(); return; }
    showScreen(CREATION_ORDER[idx - 1]);
  }

  // --- Démarrage --------------------------------------------------------------
  // Drapeaux préchargés dès l'ouverture du jeu pour la carte canvas :
  // toutes les nations, pas seulement celle de la carrière en cours.
  const NAT_FLAG_IMGS = {};
  function preloadFlags() {
    NATIONALITIES.forEach((nat) => {
      if (!nat.img) return;
      const img = new Image();
      img.src = encodeURI(nat.img);
      NAT_FLAG_IMGS[nat.id] = img;
    });
  }

  function startCareer(club) {
    G = E.newCareer({
      nationality: setup.nationality, origin: setup.origin, position: setup.position,
      name: setup.name, // nom choisi à la création (sinon undefined → tiré au sort)
      lifestyle: setup.lifestyle, entourage: setup.entourage, potCap: setup.potCap, club,
      trajectory: setup.trajectory, startYear: setup.startYear, // mode Histoire : époque + destin imposés
      clubLevels: setup.clubLevels, // mode Histoire : niveaux de clubs d'époque
    });
    if (setup.dailyDate) {
      G.dailyDate = setup.dailyDate; // Défi du jour : aucun avantage (équité)
    } else if (setup.duelRole) {
      G.duel = true; G.duelRole = setup.duelRole; G.duelSeed = setup.duelSeed;
      G.choiceLog = (setup.duelChoices || []).slice(); // journal des choix de création
      if (setup.duelRole === "respond") { G.duelFromEntry = setup.duelFromEntry; G.duelFromLabel = setup.duelFromLabel; }
    } else if (setup.storyId) {
      // Mode Histoire : aucun perk (le score se compare à la légende), et les
      // événements scriptés de la légende sont programmés aux âges clés.
      G.storyId = setup.storyId;
      const story = storyById(setup.storyId);
      if (story) story.beats.forEach((b) => G.scheduled.push({ id: b.id, age: b.age }));
    } else {
      applyPerks(G, loadProgress().equippedPerks); // avantages de la boutique
    }
    // Rival : IA en normal/Défi du jour ; adversaire REJOUÉ en duel-réponse ;
    // AUCUN en duel-création (on établit un score). Pas de newRival en duel → même
    // consommation de hasard que l'adversaire, donc mêmes épreuves (équité).
    if (setup.duelRole === "respond") R = reconstructDuelRival(setup.duelRivalSummary, setup.duelFromLabel);
    else if (setup.duelRole === "create") R = null;
    else R = E.newRival(setup.position); // un vrai rival joue au même poste
    if (G.storyId && R) R.year = G.year; // le rival vit à la même époque que la légende
    prevOvr = null;
    legendGuest = pickLegendGuest();
    legendGuestUsed = false;
    track("career_created", {
      nationality: G.nationality.id,
      position: G.position.id,
      origin: setup.origin ? setup.origin.id : undefined,
      club_level: club.level,
      mode: G.dailyDate ? "daily" : G.duel ? "duel" : G.storyId ? "story" : "career",
    });
    showScreen("screen-game");
    updateHeader();
    renderSeasonEvent();
  }

  // --- Boucle de saison ---------------------------------------------------------
  function renderSeasonEvent() {
    if (G.careerEnded) { finalize(); return; }
    saveCurrentGame(); // point de reprise propre : début de saison, avant le tirage d'événement
    updateHeader();
    currentEvent = E.pickEvent(G);
    if (!currentEvent) { proceedToSeason(); return; }

    // Les options conditionnelles (statut, réputation…) ne sont montrées
    // que si le joueur y a accès : les portes de sortie dépendent du vécu.
    const visibleOptions = currentEvent.options.filter((opt) => E.optionEligible(G, opt));
    const optionsHtml = visibleOptions
      .map((opt) => `<button class="opt-btn" data-opt="${currentEvent.options.indexOf(opt)}">${opt.hint ? `<span class="opt-hint">${esc(opt.hint)}</span>` : ""}${esc(opt.label)}</button>`)
      .join("");
    showCard(`
      <div class="card-tag"><span class="card-icon">${currentEvent.icon}</span> ${esc(currentEvent.cat)} · ${G.age} ans</div>
      <p class="event-text">${esc(E.renderText(G, currentEvent.text, { rival: R ? R.name : null }))}</p>
      <div class="event-options">${optionsHtml}</div>
    `);
    $("game-card").querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => chooseOption(currentEvent.options[Number(btn.dataset.opt)]));
    });
  }

  function chooseOption(opt) {
    if (G.duel) G.choiceLog.push(currentEvent.options.indexOf(opt)); // journal de duel
    $("game-card").querySelectorAll(".opt-btn").forEach((b) => { b.disabled = true; b.classList.add("thinking"); });
    setTimeout(() => {
      const res = E.resolveOption(G, opt);
      lastOutcome = res.outcome;
      updateHeader();
      let text = E.renderText(G, res.outcome.text, { rival: R ? R.name : null });
      showCard(`
        <div class="card-tag"><span class="card-icon">${currentEvent.icon}</span> ${esc(currentEvent.cat)}</div>
        <p class="result-text">${esc(text)}</p>
        ${chipsHtml(res.chips)}
        <button class="btn btn-secondary" id="btn-next">Continuer</button>
      `, res.tone);
      $("btn-next").addEventListener("click", onResultContinue);
    }, SUSPENSE_DELAY);
  }

  function onResultContinue() {
    if (G.careerEnded) { finalize(); return; }
    // Les transferts "direct" ont déjà été appliqués par resolveOption
    if (lastOutcome && lastOutcome.fx && lastOutcome.fx.transfer && !lastOutcome.fx.transfer.direct) {
      renderTransferChoice(E.offersFor(G, lastOutcome.fx.transfer), null);
      return;
    }
    if (lastOutcome && lastOutcome.fx && lastOutcome.fx.loan) {
      renderLoanChoice(E.loanOffersFor(G));
      return;
    }
    proceedToSeason();
  }

  // --- Moments décisifs (finales, barrages, derbys…) ---------------------------
  function renderKeyMoment(moment, onChoice) {
    const optionsHtml = moment.options
      .map((opt) => `<button class="opt-btn" data-km="${opt.id}">${opt.hint ? `<span class="opt-hint">${esc(opt.hint)}</span>` : ""}${esc(opt.label)}</button>`)
      .join("");
    showCard(`
      <div class="card-tag"><span class="card-icon">🎯</span> Moment décisif</div>
      <p class="wc-stage">${esc(moment.title)}</p>
      <p class="event-text">${esc(E.renderText(G, moment.text))}</p>
      <div class="event-options">${optionsHtml}</div>
    `, "moment");
    $("game-card").querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $("game-card").querySelectorAll(".opt-btn").forEach((b) => { b.disabled = true; });
        setTimeout(() => onChoice(btn.dataset.km), SUSPENSE_DELAY + 300);
      });
    });
  }

  // Enchaîne les moments décisifs de la saison, puis CDM, puis récap.
  function processMomentQueue() {
    const entry = lastReport.pendingMoments && lastReport.pendingMoments.shift();
    if (!entry) {
      if (lastReport.firstCap && !lastReport.firstCapShown) { lastReport.firstCapShown = true; renderFirstCap(lastReport); }
      else if (lastReport.wc) renderWorldCup(lastReport);
      else if (lastReport.cont) renderContinental(lastReport);
      else if (lastReport.natl) renderNationsLeague(lastReport);
      else renderRecap(lastReport);
      return;
    }
    renderKeyMoment(entry.moment, (choiceId) => {
      if (G.duel) G.choiceLog.push(entry.moment.options.findIndex((o) => o.id === choiceId)); // journal de duel
      const res = E.resolveSeasonMoment(G, lastReport, entry, choiceId);
      updateHeader();
      showCard(`
        <div class="card-tag"><span class="card-icon">🎯</span> ${esc(entry.label)} · ${esc(res.option.label)}</div>
        <p class="wc-stage ${res.success ? "wc-champion" : ""}">${esc(res.success ? entry.winLabel : entry.failLabel)}</p>
        <p class="result-text">${esc(res.text)}</p>
        ${chipsHtml(res.chips)}
        <button class="btn btn-secondary" id="btn-next">Continuer</button>
      `, res.success ? "great" : "bad");
      $("btn-next").addEventListener("click", processMomentQueue);
    });
  }

  // Choix du club de prêt (une saison, temps de jeu garanti).
  function renderLoanChoice(offers) {
    const buttons = offers.map((offer, i) => {
      const cc = E.countryOf(offer.club.countryId);
      return `<button class="opt-btn" data-offer="${i}"><span class="opt-hint">${esc(E.divShort(offer.club.level, offer.club.countryId))}</span>${esc(offer.club.name)}${offer.club.colors ? ` ${offer.club.colors}` : ""} ${flagHtml(cc)} — prêt d'une saison</button>`;
    }).join("");
    showCard(`
      <div class="card-tag"><span class="card-icon">🔄</span> Prêt · ${G.age} ans</div>
      <p class="event-text">Plusieurs clubs garantissent du temps de jeu au jeune que vous êtes. Le club conserve votre contrat et suivra chacun de vos matchs.</p>
      <div class="event-options">${buttons}</div>
    `);
    $("game-card").querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (G.duel) G.choiceLog.push(Number(btn.dataset.offer)); // journal de duel
        E.applyLoan(G, offers[Number(btn.dataset.offer)]);
        updateHeader();
        proceedToSeason();
      });
    });
  }

  // Fenêtre de choix de club. window=null → issue d'événement : le départ
  // est déjà acté par le choix narratif, on ne peut plus "rester".
  function renderTransferChoice(offers, window) {
    const reason = window ? window.reason : "Votre décision est prise : reste à choisir la destination.";
    let buttons = "";
    if (window && window.contractUp) {
      buttons += `<button class="opt-btn" data-stay="1"><span class="opt-hint">Prolonger</span>Rester à ${esc(G.club.name)} — ${E.fmtMoney(window.renewSalary)}/an</button>`;
    } else if (window) {
      buttons += `<button class="opt-btn" data-stay="1">Rester à ${esc(G.club.name)}</button>`;
    } else if (offers.length === 0) {
      buttons += `<button class="opt-btn" data-stay="1">Faute d'offre concrète, rester à ${esc(G.club.name)}</button>`;
    }
    offers.forEach((offer, i) => {
      const cc = E.countryOf(offer.club.countryId);
      const img = offer.club.img ? `<img class="club-logo" src="${encodeURI(offer.club.img)}" alt="" onerror="this.remove()" />` : "";
      buttons += `<button class="opt-btn" data-offer="${i}">
        <span class="opt-hint">${offer.exotic ? "💰 " : ""}${esc(E.divShort(offer.club.level, offer.club.countryId))}</span>
        ${img}${esc(offer.club.name)}${offer.club.colors ? ` ${offer.club.colors}` : ""} ${flagHtml(cc)} — ${E.fmtMoney(offer.salary)}/an · indemnité ${E.fmtMoney(offer.fee)}</button>`;
    });
    let legendLine = "";
    if (legendGuest && !legendGuestUsed && offers.length) {
      legendGuestUsed = true;
      legendLine = `<p class="legend-line">🏛️ Dans les tribunes, ${esc(legendGuest.name)}, légende de votre Panthéon, observe votre mercato.</p>`;
    }
    showCard(`
      <div class="card-tag"><span class="card-icon">💼</span> Mercato · ${G.age} ans</div>
      <p class="event-text">${esc(reason)}${offers.length === 0 ? " Mais aucune offre concrète n'arrive sur la table." : ""}</p>
      ${legendLine}
      <div class="event-options">${buttons}</div>
    `);
    $("game-card").querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (G.duel) G.choiceLog.push(btn.dataset.stay ? -1 : Number(btn.dataset.offer)); // journal de duel
        if (btn.dataset.stay) {
          if (window && window.contractUp) E.renewContract(G, window);
        } else {
          E.applyTransfer(G, offers[Number(btn.dataset.offer)]);
        }
        updateHeader();
        if (window) nextSeason();
        else proceedToSeason();
      });
    });
  }

  function proceedToSeason() {
    // Coup du sort rarissime en tout début de carrière
    if (G.age <= 18 && E.rng() < E.BALANCE_REF.earlyEndChance) {
      G.careerEnded = true;
      G.careerEndReason = "injury";
      G.history.push({ age: G.age, text: "Une blessure sévère, diagnostiquée trop tard, met un terme brutal à votre carrière naissante.", impact: -100 });
      showCard(`
        <div class="card-tag"><span class="card-icon">🚑</span> Coup du sort</div>
        <p class="result-text">Une blessure sévère, diagnostiquée trop tard, met un terme brutal et définitif à votre carrière naissante.</p>
        <button class="btn btn-secondary" id="btn-next">Continuer</button>
      `, "terrible");
      $("btn-next").addEventListener("click", finalize);
      return;
    }

    lastReport = E.playSeason(G);
    updateHeader();
    processMomentQueue();
  }

  // Toute première convocation en équipe nationale A : moment marquant, annoncé
  // sur sa propre carte avant le récap (puis la CDM / le continental s'il y en a).
  function renderFirstCap(report) {
    showCard(`
      <div class="card-tag"><span class="card-icon">📣</span> Première convocation</div>
      <p class="event-text">${flagHtml(G.nationality)} Le sélectionneur de <strong>${esc(G.nationality.name)}</strong> vous appelle pour la première fois. À ${G.age} ans, vous voilà international !</p>
      <p class="result-text">Vous porterez le maillot national dès cette saison. Vos matchs et vos buts en sélection sont désormais suivis dans le bilan de fin de saison.</p>
      <button class="btn btn-secondary" id="btn-next">Continuer</button>
    `, "great");
    $("btn-next").addEventListener("click", processMomentQueue);
  }

  function renderWorldCup(report) {
    const wc = report.wc;
    showCard(`
      <div class="card-tag"><span class="card-icon">🏆</span> Coupe du Monde ${wc.year}</div>
      <p class="event-text">${flagHtml(G.nationality)} Le monde retient son souffle : ${esc(G.nationality.name)} entre dans la compétition, et vous êtes du voyage.</p>
      <button class="btn btn-secondary" id="btn-wc">Vivre le tournoi</button>
    `);
    $("btn-wc").addEventListener("click", () => {
      if (wc.finalPending) {
        // La finale est atteinte : son issue se joue sur un moment décisif
        renderKeyMoment(wc.moment, (choiceId) => {
          if (G.duel) G.choiceLog.push(wc.moment.options.findIndex((o) => o.id === choiceId)); // journal de duel
          const res = E.resolveWcFinal(G, report, choiceId);
          updateHeader();
          showCard(`
            <div class="card-tag"><span class="card-icon">🏆</span> Finale de la Coupe du Monde ${wc.year} · ${esc(res.option.label)}</div>
            <p class="wc-stage ${wc.champion ? "wc-champion" : ""}">${esc(wc.label)}</p>
            <p class="result-text">${esc(res.text)}</p>
            ${chipsHtml(res.chips)}
            ${wc.goldenBall ? `<p class="wc-golden">🌟 Élu meilleur joueur du tournoi !</p>` : ""}
            <p class="wc-stats">${wc.games} matchs · ${wc.goals} but${wc.goals > 1 ? "s" : ""} dans le tournoi</p>
            <button class="btn btn-secondary" id="btn-next">Continuer</button>
          `, wc.champion ? "great" : "bad");
          $("btn-next").addEventListener("click", () => renderRecap(report));
        });
        return;
      }
      const tone = wc.stage === "semi" ? "good" : "bad";
      showCard(`
        <div class="card-tag"><span class="card-icon">🏆</span> Coupe du Monde ${wc.year}</div>
        <p class="wc-stage">${esc(wc.label)}</p>
        <p class="result-text">${esc(wc.text)}</p>
        <p class="wc-stats">${wc.games} matchs · ${wc.goals} but${wc.goals > 1 ? "s" : ""} dans le tournoi</p>
        <button class="btn btn-secondary" id="btn-next">Continuer</button>
      `, tone);
      $("btn-next").addEventListener("click", () => renderRecap(report));
    });
  }

  // Championnat continental de sélection (Euro / Copa / CAN) : auto-résolu côté
  // moteur, présenté sur sa propre carte comme la CDM non-finale, puis le récap.
  function renderContinental(report) {
    const c = report.cont;
    const tone = c.champion ? "great" : (c.stage === "final" || c.stage === "semi") ? "good" : "bad";
    showCard(`
      <div class="card-tag"><span class="card-icon">${c.icon}</span> ${esc(c.cupName)} ${c.year}</div>
      <p class="event-text">${flagHtml(G.nationality)} ${esc(G.nationality.name)} entre dans SA grande compétition continentale, et vous êtes de l'aventure.</p>
      <button class="btn btn-secondary" id="btn-cont">Vivre le tournoi</button>
    `);
    $("btn-cont").addEventListener("click", () => {
      showCard(`
        <div class="card-tag"><span class="card-icon">${c.icon}</span> ${esc(c.cupName)} ${c.year}</div>
        <p class="wc-stage ${c.champion ? "wc-champion" : ""}">${esc(c.label)}</p>
        <p class="result-text">${esc(c.text)}</p>
        <p class="wc-stats">${c.games} matchs · ${c.goals} but${c.goals > 1 ? "s" : ""} dans le tournoi</p>
        <button class="btn btn-secondary" id="btn-next">Continuer</button>
      `, tone);
      $("btn-next").addEventListener("click", () => renderRecap(report));
    });
  }

  function renderNationsLeague(report) {
    const c = report.natl;
    const tone = c.champion ? "great" : (c.stage === "final" || c.stage === "final_four") ? "good" : "bad";
    showCard(`
      <div class="card-tag"><span class="card-icon">${c.icon}</span> ${esc(c.cupName)} ${c.year}</div>
      <p class="event-text">${flagHtml(G.nationality)} ${esc(G.nationality.name)} dispute la Ligue des Sélections européenne, et vous en êtes.</p>
      <button class="btn btn-secondary" id="btn-natl">Vivre la campagne</button>
    `);
    $("btn-natl").addEventListener("click", () => {
      showCard(`
        <div class="card-tag"><span class="card-icon">${c.icon}</span> ${esc(c.cupName)} ${c.year}</div>
        <p class="wc-stage ${c.champion ? "wc-champion" : ""}">${esc(c.label)}</p>
        <p class="result-text">${esc(c.text)}</p>
        <p class="wc-stats">${c.games} matchs · ${c.goals} but${c.goals > 1 ? "s" : ""} dans le tournoi</p>
        <button class="btn btn-secondary" id="btn-next">Continuer</button>
      `, tone);
      $("btn-next").addEventListener("click", () => renderRecap(report));
    });
  }


  function renderRecap(report) {
    const rivalReport = G.duel ? null : E.rivalSeason(R); // en duel : rival figé, pas de sim
    const isGk = G.position.id === "gk";
    const trophyLine = report.trophies.length
      ? report.trophies.map((tr) => { const c = COMPETITIONS[tr]; return c ? `${c.icon} ${c.name}` : tr; }).join(" · ")
      : "";
    const newsLine = rivalReport && Math.random() < 0.6
      ? E.rivalNewsLine(R, rivalReport, E.computeCareerScore(G) - E.computeCareerScore(R))
      : WORLD_NEWS[Math.floor(Math.random() * WORLD_NEWS.length)];

    const microHtml = report.lines.map((l) => `<p class="recap-micro">💬 ${esc(l.text)}</p>`).join("");
    const objHtml = report.objectiveLabel
      ? `<p class="recap-objective">${report.objectiveMet ? "✅" : "❌"} Objectif du club : ${esc(report.objectiveLabel)}${report.objectiveMet && report.objectiveBonus ? ` <span class="recap-bonus">(prime +${E.fmtMoney(report.objectiveBonus)})</span>` : ""}</p>`
      : "";
    const awardIds = report.awards.filter((id) => AWARDS[id]);
    const awardsHtml = awardIds.length
      ? `<p class="recap-trophies">🎖️ ${awardIds.map((id) => `${AWARDS[id].icon} ${AWARDS[id].name}`).join(" · ")}</p>`
      : "";
    let leagueLine;
    if (report.leaguePos === 1) leagueLine = report.divisionTitle ? `🥇 Champion ${E.deOf(E.divShort(report.level, report.countryId))} !` : "🥇 Champion !";
    else if (report.promoted) leagueLine = `${report.leaguePos}ᵉ — 🚀 montée arrachée en barrage !`;
    else if (report.playoffRun) leagueLine = `${report.leaguePos}ᵉ — barrage de montée perdu`;
    else if (report.relegated) leagueLine = `${report.leaguePos}ᵉ — 📉 RELÉGATION`;
    else leagueLine = `${report.leaguePos}ᵉ`;

    showCard(`
      <div class="card-tag"><span class="card-icon">📊</span> Saison ${report.year}-${String((report.year + 1) % 100).padStart(2, "0")} · ${esc(report.clubName)} <span class="level-tag level-${report.level}">${esc(E.divShort(report.level, report.countryId))}</span>${report.onLoan ? " (prêt)" : ""}</div>
      ${report.headline ? `<p class="recap-headline">📰 ${esc(report.headline)}</p>` : ""}
      <div class="recap-grid">
        <div class="recap-cell"><span class="recap-num">${report.matches}</span><span class="recap-lbl">Matchs</span></div>
        <div class="recap-cell"><span class="recap-num">${isGk ? report.cleanSheets : report.goals}</span><span class="recap-lbl">${isGk ? "Clean sheets" : "Buts"}</span></div>
        <div class="recap-cell"><span class="recap-num">${report.assists}</span><span class="recap-lbl">Passes déc.</span></div>
        <div class="recap-cell"><span class="recap-num">${report.rating.toFixed(1)}</span><span class="recap-lbl">Note</span></div>
      </div>
      <p class="recap-line">Championnat : <strong>${leagueLine}</strong>${report.caps ? ` · ${flagHtml(G.nationality)} ${report.caps} sélection${report.caps > 1 ? "s" : ""}${report.natGoals ? `, ${report.natGoals} but${report.natGoals > 1 ? "s" : ""}` : ""}` : ""}</p>
      ${trophyLine ? `<p class="recap-trophies">${trophyLine}</p>` : ""}
      ${report.ballonRank && report.ballonRank > 1 ? `<p class="recap-trophies">⭐ Classement Ballon d'Or : <strong>${report.ballonRank}ᵉ</strong></p>` : ""}
      ${awardsHtml}
      ${objHtml}
      ${report.benched ? `<p class="recap-warn">⚠️ Cruellement court en temps de jeu : votre moral en souffre.</p>` : ""}
      ${report.seasonInjury ? `<p class="recap-warn">🚑 ${esc((E.BALANCE_REF.injury.labels || {})[report.seasonInjury.tier] || "Blessure")} : ${report.seasonInjury.weeks} semaines sur la touche.</p>` : (report.injuryWeeks ? `<p class="recap-warn">🩹 ${report.injuryWeeks} semaines d'infirmerie cette saison.</p>` : "")}
      ${report.carryInjury ? `<p class="recap-warn">🩼 Toujours en reconstruction : ${report.carryInjury} semaines de retard traînées de la saison passée.</p>` : ""}
      ${report.tournamentMissed ? `<p class="recap-warn">😔 Blessé, vous manquez le grand tournoi de votre sélection cette saison.</p>` : ""}
      <p class="recap-money">💰 +${E.fmtMoney(report.income)} (salaire & sponsors)</p>
      ${microHtml}
      ${newsLine ? `<p class="recap-news">${esc(newsLine)}</p>` : ""}
      <button class="btn btn-secondary" id="btn-next">Continuer</button>
    `, report.rating >= 7.4 ? "good" : report.rating <= 5.6 ? "bad" : "neutral");
    $("btn-next").addEventListener("click", offseason);
  }

  function offseason() {
    if (G.careerEnded) { renderCareerEndInjury(lastReport); return; }
    if (G.retiring || G.age >= E.BALANCE_REF.ageMax) { finalize(); return; }
    const window = E.transferWindow(G, lastReport);
    if (window) { renderTransferChoice(window.offers, window); return; }
    nextSeason();
  }

  // Fin de carrière sur blessure (déclenchée en fin de saison par le moteur) :
  // carte dédiée, ton adapté à l'âge, puis écran final (qui reste digne pour un
  // vétéran / joueur au palmarès, cf. dignifiedInjuryEnd).
  function renderCareerEndInjury(report) {
    const info = (report && report.careerEndInjury) || {};
    const age = info.age || G.age;
    const labels = (E.BALANCE_REF.injury && E.BALANCE_REF.injury.labels) || {};
    const label = labels[info.tier] || "Blessure grave";
    let text;
    if (age >= 30) text = "Le corps a fini par dire stop. Après tout ce que vous avez accompli, une dernière blessure referme le rideau — vous quittez les terrains la tête haute.";
    else if (age >= 24) text = "En pleine force de l'âge, le verdict médical est sans appel : vous ne rejouerez plus au haut niveau. Une carrière fauchée en plein vol.";
    else text = "Le diagnostic est tombé, implacable : votre carrière s'arrête avant d'avoir vraiment éclos. Le sport est parfois d'une cruauté inouïe.";
    showCard(`
      <div class="card-tag"><span class="card-icon">🚑</span> ${esc(label)}</div>
      <p class="result-text">${esc(text)}</p>
      <button class="btn btn-secondary" id="btn-next">Continuer</button>
    `, "terrible");
    $("btn-next").addEventListener("click", finalize);
  }

  function nextSeason() {
    if (G.retiring || G.age >= E.BALANCE_REF.ageMax) { finalize(); return; }
    E.advanceYear(G);
    renderSeasonEvent();
  }

  // --- Panthéon (persistance inter-parties) --------------------------------------
  const PANTHEON_KEY = "destinDeChampion_pantheon";
  const PANTHEON_MAX = 20;

  function loadPantheon() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PANTHEON_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  function savePantheon(list) {
    try { localStorage.setItem(PANTHEON_KEY, JSON.stringify(list)); } catch (e) { /* stockage indisponible */ }
  }
  function pickLegendGuest() {
    const p = loadPantheon();
    return p.length ? p[Math.floor(Math.random() * p.length)] : null;
  }
  function saveToPantheon() {
    const narrative = E.buildNarrative(G);
    const entry = {
      name: G.name,
      nationalityId: G.nationality.id,
      nationalityFlag: G.nationality.flag,
      nationalityName: G.nationality.name,
      positionIcon: G.position.icon,
      title: narrative.title,
      peakOvr: E.careerRating(G),
      money: Math.round(G.money),
      trophies: { ...G.trophies },
      score: E.computeCareerScore(G),
      // Instantané complet de la carrière : permet de rouvrir la fiche finale
      // entière depuis le Panthéon (et pas seulement le titre).
      career: JSON.parse(JSON.stringify(G)),
    };
    const p = loadPantheon();
    p.push(entry);
    while (p.length > PANTHEON_MAX) p.shift();
    savePantheon(p);
  }

  // Tri du Panthéon (affichage uniquement — n'altère ni le stockage ni le tirage
  // de l'invité-légende). "recent" reproduit l'ordre historique (plus récent en tête).
  let pantheonSort = "score";
  const PANTHEON_SORTS = [
    { id: "score", label: "🏅 Score" },
    { id: "ovr", label: "📊 Note" },
    { id: "trophies", label: "🏆 Trophées" },
    { id: "money", label: "💰 Fortune" },
    { id: "recent", label: "🕓 Récent" },
  ];
  function pantheonMajorCount(t) {
    t = t || {};
    return (t.worldCup || 0) + (t.ballon || 0) + (t.continental || 0) + (t.continental2 || 0) +
      (t.continental3 || 0) + (t.natLeague || 0) + (t.league || 0) + (t.goldenBoot || 0) + (t.cup || 0);
  }
  // Renvoie une copie triée des entrées (index = ordre d'insertion, pour "recent").
  function sortedPantheon(p) {
    const idx = p.map((l, i) => ({ l, i }));
    const cmp = {
      score: (a, b) => (b.l.score || 0) - (a.l.score || 0),
      ovr: (a, b) => (b.l.peakOvr || 0) - (a.l.peakOvr || 0),
      trophies: (a, b) => pantheonMajorCount(b.l.trophies) - pantheonMajorCount(a.l.trophies),
      money: (a, b) => (b.l.money || 0) - (a.l.money || 0),
      recent: (a, b) => b.i - a.i,
    }[pantheonSort] || ((a, b) => b.i - a.i);
    // Tri stable : départage par ordre d'insertion inverse (plus récent d'abord)
    idx.sort((a, b) => cmp(a, b) || b.i - a.i);
    return idx.map((x) => x.l);
  }
  function renderPantheonSortBar() {
    const bar = $("pantheon-sort");
    if (!bar) return;
    bar.innerHTML = PANTHEON_SORTS.map((s) =>
      `<button class="pantheon-sort-chip${s.id === pantheonSort ? " on" : ""}" data-sort="${s.id}">${s.label}</button>`
    ).join("");
    bar.querySelectorAll(".pantheon-sort-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        pantheonSort = btn.getAttribute("data-sort");
        renderPantheonScreen();
      });
    });
  }

  function renderPantheonScreen() {
    const p = loadPantheon();
    const list = $("pantheon-list");
    const bar = $("pantheon-sort");
    list.innerHTML = "";
    if (!p.length) {
      if (bar) bar.innerHTML = "";
      list.innerHTML = `<p class="pantheon-empty">Votre légende est encore à écrire.</p>`;
      return;
    }
    renderPantheonSortBar();
    sortedPantheon(p).forEach((l) => {
      const t = l.trophies || {};
      const bits = [];
      if (t.worldCup) bits.push(`🏆×${t.worldCup}`);
      if (t.ballon) bits.push(`⭐×${t.ballon}`);
      if (t.continental) bits.push(`🥇×${t.continental}`);
      if (t.continental2) bits.push(`🥈×${t.continental2}`);
      if (t.continental3) bits.push(`🥉×${t.continental3}`);
      if (t.natLeague) bits.push(`🛡️×${t.natLeague}`);
      if (t.league) bits.push(`🎖️×${t.league}`);
      if (t.goldenBoot) bits.push(`👟×${t.goldenBoot}`);
      const card = document.createElement("div");
      card.className = "pantheon-card";
      const legendNat = l.nationalityId ? NATIONALITIES.find((n) => n.id === l.nationalityId) : null;
      card.innerHTML = `
        <p class="pantheon-name">${legendNat ? flagHtml(legendNat) : (l.nationalityFlag || "")} ${esc(l.name || "Anonyme")} ${l.positionIcon || ""}</p>
        <p class="pantheon-title">${esc(l.title || "")}${l.peakOvr ? ` · OVR ${l.peakOvr}` : ""}</p>
        <p class="pantheon-trophies">${bits.length ? bits.join(" ") : "Aucun trophée majeur"}${l.money ? ` · 💰 ${l.money} M€` : ""}</p>
        ${l.career ? `<p class="pantheon-see">👁️ Voir la fiche complète</p>` : ""}`;
      if (l.career) {
        card.classList.add("pantheon-clickable");
        card.setAttribute("role", "button");
        card.addEventListener("click", () => reviewPantheonCard(l));
      }
      list.appendChild(card);
    });
  }

  // Rouvre la fiche finale COMPLÈTE d'une légende du Panthéon, en mode
  // consultation : aucun rival, pas de nouveaux badges/jetons/quêtes, et le
  // bouton du bas ramène au Panthéon. La carrière stockée est figée (copie).
  function reviewPantheonCard(entry) {
    if (!entry || !entry.career) return;
    G = entry.career;
    R = null;
    renderFinalScreen([], [], null, 0, null, true);
    showScreen("screen-final");
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
  }

  // --- Badges ------------------------------------------------------------------
  const PROGRESS_KEY = "destinDeChampion_progress";

  // État persistant du Défi du jour (meilleur du jour, record absolu, série).
  function normalizeDaily(d) {
    d = d && typeof d === "object" ? d : {};
    return {
      today: d.today || "",
      todayBest: typeof d.todayBest === "number" ? d.todayBest : null,
      attempts: Number(d.attempts) || 0,
      allTimeBest: Number(d.allTimeBest) || 0,
      allTimeBestDate: d.allTimeBestDate || "",
      streak: Number(d.streak) || 0,
      bestStreak: Number(d.bestStreak) || 0,
      lastDate: d.lastDate || "",
      history: Array.isArray(d.history) ? d.history.filter((x) => x && x.date).slice(-30) : [],
    };
  }

  function loadProgress() {
    try {
      const p = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      return {
        unlockedBadges: Array.isArray(p.unlockedBadges) ? p.unlockedBadges : [],
        badgeContexts: p.badgeContexts && typeof p.badgeContexts === "object" ? p.badgeContexts : {},
        consecutiveRivalWins: Number(p.consecutiveRivalWins) || 0,
        lastCareerEnded: !!p.lastCareerEnded,
        careersPlayed: Number(p.careersPlayed) || 0,
        bestScore: Number(p.bestScore) || 0,
        // Normalisation stricte : un objet à moitié écrit (ex. { date } sans
        // { ids }) ferait planter le rendu de l'accueil — et l'état étant
        // persisté, le jeu resterait cassé après rechargement.
        dailyDone: {
          date: (p.dailyDone && p.dailyDone.date) || "",
          ids: (p.dailyDone && Array.isArray(p.dailyDone.ids)) ? p.dailyDone.ids : [],
        },
        weeklyDone: { week: (p.weeklyDone && p.weeklyDone.week) || "", done: !!(p.weeklyDone && p.weeklyDone.done) },
        legendDone: { week: (p.legendDone && p.legendDone.week) || "", done: !!(p.legendDone && p.legendDone.done) },
        questStreak: Number(p.questStreak) || 0,
        bestStreak: Number(p.bestStreak) || 0,
        lastQuestDate: p.lastQuestDate || "",
        questTotal: Number(p.questTotal) || 0,
        questPoints: Number(p.questPoints) || 0,
        daily: normalizeDaily(p.daily),
        ownedPerks: Array.isArray(p.ownedPerks) ? p.ownedPerks : [],
        equippedPerks: Array.isArray(p.equippedPerks) ? p.equippedPerks : [],
        jetonsSpent: Number(p.jetonsSpent) || 0,
        jetonsFromCareers: Number(p.jetonsFromCareers) || 0,
        stories: p.stories && typeof p.stories === "object" ? p.stories : {},
        unlockedStories: Array.isArray(p.unlockedStories) ? p.unlockedStories : [],
        streakJokers: Number(p.streakJokers) || 0,
        streakMilestone: Number(p.streakMilestone) || 0,
        jetonsFromStreaks: Number(p.jetonsFromStreaks) || 0,
      };
    } catch (e) {
      return {
        unlockedBadges: [], badgeContexts: {}, consecutiveRivalWins: 0, lastCareerEnded: false,
        careersPlayed: 0, bestScore: 0, dailyDone: { date: "", ids: [] },
        weeklyDone: { week: "", done: false }, legendDone: { week: "", done: false },
        questStreak: 0, bestStreak: 0, lastQuestDate: "", questTotal: 0, questPoints: 0,
        daily: normalizeDaily(),
        ownedPerks: [], equippedPerks: [], jetonsSpent: 0, jetonsFromCareers: 0,
        stories: {}, unlockedStories: [],
        streakJokers: 0, streakMilestone: 0, jetonsFromStreaks: 0,
      };
    }
  }

  // Solde de jetons dépensable = (quêtes + bonus de fin de carrière) − dépensé en boutique.
  function jetonsBalance(progress) {
    const p = progress || loadProgress();
    return Math.max(0, p.questPoints + p.jetonsFromCareers + (p.jetonsFromStreaks || 0) - p.jetonsSpent);
  }

  // Petit gain de jetons en fin de carrière, proportionnel au score (et plafonné) :
  // l'économie tourne dès les premières parties sans devenir trop généreuse.
  // Les bonnes carrières rapportent un peu plus. Vaut pour normal ET Défi du jour.
  function awardCareerJetons(score) {
    const bonus = Math.min(30, Math.max(2, Math.round(score / 12)));
    const progress = loadProgress();
    progress.jetonsFromCareers += bonus;
    saveProgress(progress);
    return bonus;
  }

  // --- Quêtes du jour & défi de la semaine -----------------------------------
  // Sélection déterministe : tout le monde a les mêmes quêtes le même jour.
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function weekKey() {
    const d = new Date();
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.floor(((d - jan1) / 86400000 + jan1.getDay()) / 7);
    return `${d.getFullYear()}-S${week}`;
  }
  // Mélange 32 bits (avalanche façon MurmurHash3) : deux graines proches
  // (ex. deux jours qui se suivent) donnent des sorties totalement
  // décorrélées → sélection déterministe mais sans rotation prévisible.
  function hashInt(n) {
    let h = (n >>> 0);
    h ^= h >>> 16;
    h = Math.imul(h, 0x45d9f3b);
    h ^= h >>> 16;
    h = Math.imul(h, 0x45d9f3b);
    h ^= h >>> 16;
    return h >>> 0;
  }

  // 3 quêtes du jour : 1 par palier de difficulté (facile / moyen / difficile),
  // pour un mélange équilibré entre accessible et ambitieux chaque jour.
  // Une graine distincte (hashée) par palier → les 3 tirages sont indépendants.
  function dailyQuestsFor(dateKey) {
    const seed = Number(dateKey.replace(/-/g, ""));
    return [1, 2, 3].map((tier) => {
      const pool = DAILY_QUESTS.filter((q) => q.tier === tier);
      return pool.length ? pool[hashInt(seed * 3 + tier) % pool.length] : null;
    }).filter(Boolean);
  }
  function weeklyChallengeFor(wKey) {
    const seed = Number(wKey.replace(/\D/g, ""));
    return WEEKLY_CHALLENGES[hashInt(seed) % WEEKLY_CHALLENGES.length];
  }
  // Sel distinct du défi hebdo → hebdo et légendaire évoluent indépendamment.
  function legendQuestFor(wKey) {
    const seed = Number(wKey.replace(/\D/g, ""));
    return LEGEND_QUESTS[hashInt(seed * 7 + 3) % LEGEND_QUESTS.length];
  }
  const QUEST_TIERS = {
    1: { label: "Facile", cls: "easy" },
    2: { label: "Moyen", cls: "med" },
    3: { label: "Difficile", cls: "hard" },
  };

  // La carrière qui vient de se terminer remplit-elle cette quête ?
  function questFulfilled(id) {
    const success = !G.careerEnded;
    const t = G.trophies;
    const isTop = (lv) => lv === "elite" || lv === "d1";
    switch (id) {
      case "q_fr_career": return success && G.nationality.id === "fr";
      case "q_low_title": return (G.leagueTitlesDetail || []).some((x) => !isTop(x.level));
      case "q_no_elite": return success && !G.seasons.some((se) => se.level === "elite");
      case "q_ballon_top30": return G.bestBallonRank != null;
      case "q_leader": return E.hasTrait(G, "leader");
      case "q_cup": return t.cup >= 1;
      case "q_rating90": return success && E.careerRating(G) >= 90;
      case "q_3countries": return new Set(G.transferHistory.map((x) => x.countryName)).size >= 3;
      case "q_one_club": return success && G.transferHistory.filter((x) => x.fee != null).length === 0;
      case "q_fortune": return G.money >= 40;
      case "q_young_int": return !!G.flags.young_int;
      case "q_moments3": return G.momentWins >= 3;
      case "q_defensive": return success && (G.position.id === "def" || G.position.id === "gk");
      case "q_exotic": return !!G.flags.played_exotic;
      case "q_wc": return t.worldCup >= 1;
      case "q_globe": return (G.continentsPlayed || []).length >= 3;
      case "q_100caps": return G.natTeam.caps >= 100;
      case "q_wc_it": return G.nationality.id === "it" && t.worldCup >= 1;
      case "q_samba": return G.nationality.id === "br" && t.ballon >= 1;
      case "q_goleador": return G.totals.goals >= 300;
      case "q_awards5": return E.totalAwards(G) >= 5;
      case "q_cl": return t.continental >= 1 || (t.continental2 || 0) >= 1 || (t.continental3 || 0) >= 1;
      case "q_continental_nt": return (t.contInt || 0) >= 1;
      case "q_double": return G.seasons.some((se) => se.trophies.includes("league") && se.trophies.includes("cup"));
      case "q_derby3": return G.derbyWins >= 3;
      case "q_top_scorer": return !!(G.awardCounts || {}).top_scorer;
      case "q_golden_shoe": return t.goldenBoot >= 1;
      case "w_prodige": return !!G.flags.high_early;
      case "w_patron": return E.hasTrait(G, "leader") && t.league >= 1;
      case "w_remontada": {
        const origin = CLUBS.find((c) => c.id === G.clubsPlayed[0]);
        return origin && origin.level === "regional" && (G.leagueTitlesDetail || []).some((x) => isTop(x.level));
      }
      case "w_last_contract": return !!G.flags.exotic_late;
      case "w_double_ballon": return t.ballon >= 2;
      case "w_five_clubs": return G.clubsPlayed.length >= 5;
      case "w_goals400": return G.totals.goals >= 400;
      // --- Défis légendaires ---
      case "l_epopee_cl": {
        // Coupe des Champions gagnée avec un club connu au niveau régional.
        const contClubs = G.seasons.filter((se) => se.trophies.includes("continental")).map((se) => se.clubName);
        return contClubs.some((cn) => G.seasons.some((se) => se.clubName === cn && se.level === "regional"));
      }
      case "l_squadra": return G.nationality.id === "it" && t.worldCup >= 1;
      case "l_from_dust": return G.seasons[0] && G.seasons[0].level === "regional" && (t.continental >= 1 || (t.continental2 || 0) >= 1 || (t.continental3 || 0) >= 1);
      case "l_samba_rey": return G.nationality.id === "br" && t.ballon >= 1 && t.worldCup >= 1;
      case "l_kaiser": return G.nationality.id === "de" && G.natTeam.caps >= 100 && t.ballon >= 1;
      case "l_grand_chelem": {
        const titles = G.leagueTitlesDetail || [];
        return ["fr", "de", "es", "it", "en"].every((cid) => titles.some((x) => x.countryId === cid && isTop(x.level)));
      }
      case "l_nomad": return new Set(G.transferHistory.map((x) => x.countryName)).size >= 4;
      case "l_dynastie": return t.ballon >= 3;
      default: return false;
    }
  }

  // Évalue quêtes du jour + défi de la semaine, met à jour streak et totaux.
  // Retourne les accomplissements de CETTE carrière (pour la fiche finale).
  function evaluateQuests() {
    const progress = loadProgress();
    const today = todayKey();
    const week = weekKey();
    if (progress.dailyDone.date !== today) progress.dailyDone = { date: today, ids: [] };
    if (progress.weeklyDone.week !== week) progress.weeklyDone = { week, done: false };
    if (progress.legendDone.week !== week) progress.legendDone = { week, done: false };

    const completed = [];
    let gained = 0;
    dailyQuestsFor(today).forEach((q) => {
      if (!progress.dailyDone.ids.includes(q.id) && questFulfilled(q.id)) {
        progress.dailyDone.ids.push(q.id);
        progress.questTotal += 1;
        gained += q.pts || 10;
        completed.push(`${q.icon} ${q.name}`);
        track("quest_completed", { quest_id: q.id, kind: "daily", tier: q.tier });
      }
    });
    const weekly = weeklyChallengeFor(week);
    if (!progress.weeklyDone.done && questFulfilled(weekly.id)) {
      progress.weeklyDone.done = true;
      progress.questTotal += 1;
      gained += weekly.pts || 60;
      completed.push(`${weekly.icon} Défi de la semaine : ${weekly.name}`);
      track("quest_completed", { quest_id: weekly.id, kind: "weekly" });
    }
    const legend = legendQuestFor(week);
    if (!progress.legendDone.done && questFulfilled(legend.id)) {
      progress.legendDone.done = true;
      progress.questTotal += 1;
      gained += legend.pts || 120;
      completed.push(`${legend.icon} Défi légendaire : ${legend.name}`);
      track("quest_completed", { quest_id: legend.id, kind: "legend" });
    }
    progress.questPoints += gained;

    // Streak : au moins une quête accomplie aujourd'hui. Série SANS plafond :
    // paliers récompensés en jetons (STREAK_MILESTONES, ré-armés quand la série
    // retombe), joker de gel gagné tous les 7 jours (2 max) — un jour manqué
    // est pardonné automatiquement, la série survit.
    if (completed.length && progress.lastQuestDate !== today) {
      // prevDayKey travaille sur la date civile : pas de dérive au passage
      // à l'heure d'été (un « −24 h » en millisecondes saute un jour).
      const yKey = prevDayKey(today);
      const jKey = prevDayKey(yKey);
      if (progress.lastQuestDate === yKey) {
        progress.questStreak += 1;
      } else if (progress.lastQuestDate === jKey && progress.streakJokers > 0) {
        progress.streakJokers -= 1;
        progress.questStreak += 1;
        completed.push(`🧊 Joker consommé : un jour manqué, série sauvée (${progress.streakJokers} en réserve)`);
      } else {
        progress.questStreak = 1;
        progress.streakMilestone = 0; // les paliers se ré-arment : tout est à reconstruire
      }
      progress.lastQuestDate = today;
      progress.bestStreak = Math.max(progress.bestStreak, progress.questStreak);
      if (progress.questStreak % 7 === 0 && progress.streakJokers < 2) {
        progress.streakJokers += 1;
        completed.push(`🧊 7 jours de plus : +1 joker de série (${progress.streakJokers}/2 en réserve)`);
      }
      for (const ms of STREAK_MILESTONES) {
        if (progress.questStreak >= ms.days && (progress.streakMilestone || 0) < ms.days) {
          progress.streakMilestone = ms.days;
          progress.jetonsFromStreaks += ms.jetons;
          completed.push(`🔥 Palier de série ${ms.days} jours : +${ms.jetons} 🪙 !`);
          track("streak_milestone", { days: ms.days, jetons: ms.jetons });
        }
      }
    }
    saveProgress(progress);
    return completed;
  }

  // Teaser compact sur l'accueil : annonce la série + la progression du jour
  // et invite à ouvrir l'écran dédié (au lieu de tout déballer sur l'accueil).
  function renderQuestTeaser() {
    const panel = $("quest-panel");
    if (!panel) return;
    const progress = loadProgress();
    const today = todayKey();
    const daily = dailyQuestsFor(today);
    const doneIds = progress.dailyDone.date === today ? progress.dailyDone.ids : [];
    const doneCount = daily.filter((q) => doneIds.includes(q.id)).length;
    const streak = progress.questStreak;
    panel.innerHTML = `
      <div class="hc-head">Quêtes du jour</div>
      <div class="hc-body">
        <ul class="hc-lines">
          <li><strong>${doneCount}/${daily.length}</strong> quête${doneCount > 1 ? "s" : ""} accomplie${doneCount > 1 ? "s" : ""} aujourd'hui</li>
          <li>${streak > 0 ? `Série de <strong>${streak} jour${streak > 1 ? "s" : ""}</strong> en cours 🔥` : "Aucune série en cours — lancez-vous !"}</li>
        </ul>
        <div class="hc-cta">En voir plus</div>
      </div>`;
  }

  // --- Défi du jour ----------------------------------------------------------
  // Un brief déterministe (même pour tous, dérivé de la date via hashInt) :
  // identité imposée = nationalité + poste + origine. Le joueur garde la main
  // sur l'hygiène de vie, l'entourage, le club et tous les choix en carrière.
  // Score du jour = computeCareerScore ; meilleur du jour + record + série 🔥
  // conservés en local (progress.daily). Un run de défi reste une vraie
  // carrière (quêtes/badges/Panthéon comptent) et profite de l'autosave.
  function dailyChallengeFor(dateKey) {
    const seed = Number(dateKey.replace(/-/g, ""));
    return {
      id: dateKey,
      nationality: NATIONALITIES[hashInt(seed * 5 + 1) % NATIONALITIES.length],
      position: POSITIONS[hashInt(seed * 5 + 2) % POSITIONS.length],
      origin: ORIGINS[hashInt(seed * 5 + 3) % ORIGINS.length],
    };
  }

  // Graine du MOTEUR pour le run de défi (distincte des sels de sélection des
  // contraintes) → mêmes événements/résultats pour tous, à choix égaux.
  function dailySeedFor(dateKey) { return hashInt(Number(dateKey.replace(/-/g, "")) + 777); }

  // Clé du jour précédent (locale, sans dérive de fuseau) — pour la série.
  function prevDayKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }

  // Enregistre le résultat d'un run de défi. Retourne le bilan pour la fiche.
  // dateKey = jour DU DÉFI joué (une reprise d'autosave peut le terminer bien
  // plus tard). La série et le « meilleur du jour » sont indexés sur la date
  // RÉELLE : terminer un vieux défi ne doit jamais faire reculer d.lastDate,
  // ce qui remettait la série à 1.
  function recordDailyResult(dateKey, score) {
    const progress = loadProgress();
    const d = progress.daily;
    const today = todayKey();
    const isToday = dateKey === today;
    if (isToday) {
      if (d.today !== dateKey) { d.today = dateKey; d.todayBest = null; d.attempts = 0; }
      d.attempts += 1;
    }
    const isTodayBest = isToday && (d.todayBest == null || score > d.todayBest);
    if (isTodayBest) d.todayBest = score;
    const isAllTimeBest = score > d.allTimeBest;
    if (isAllTimeBest) { d.allTimeBest = score; d.allTimeBestDate = dateKey; }
    if (isToday && d.lastDate !== today) {
      d.streak = d.lastDate === prevDayKey(today) ? d.streak + 1 : 1;
      d.lastDate = today;
      d.bestStreak = Math.max(d.bestStreak, d.streak);
    }
    const h = d.history.find((x) => x.date === dateKey);
    if (h) h.score = Math.max(h.score, score);
    else d.history.push({ date: dateKey, score });
    d.history = d.history.slice(-30);
    saveProgress(progress);
    track("daily_completed", { date: dateKey, score, today_best: d.todayBest, all_time_best: d.allTimeBest, streak: d.streak });
    return { score, todayBest: d.todayBest, isTodayBest, isAllTimeBest, streak: d.streak, allTimeBest: d.allTimeBest, stale: !isToday, date: dateKey };
  }

  // Carte cliquable « Défi du jour » sur l'accueil.
  function renderDailyPanel() {
    const panel = $("daily-panel");
    if (!panel) return;
    const today = todayKey();
    const ch = dailyChallengeFor(today);
    const d = loadProgress().daily;
    const doneToday = d.today === today && d.todayBest != null;
    const alive = d.lastDate === today || d.lastDate === prevDayKey(today);
    const streak = alive ? d.streak : 0;
    const bestLine = doneToday ? `Ton meilleur aujourd'hui : ${d.todayBest} pts` : "Pas encore tenté aujourd'hui";
    panel.innerHTML = `
      <div class="hc-head">Défi du jour${streak > 0 ? ` <span class="hc-streak">🔥 ${streak} j</span>` : ""}</div>
      <div class="hc-body">
        <div class="daily-brief">
          <span class="daily-chip">${ch.position.icon} ${esc(ch.position.name)}</span>
          <span class="daily-chip">${flagHtml(ch.nationality)} ${esc(ch.nationality.name)}</span>
          <span class="daily-chip">${esc(ch.origin.name)}</span>
        </div>
        <span class="daily-best${doneToday ? " done" : ""}">${bestLine}</span>
        <div class="hc-cta">${doneToday ? "Rejouer maintenant" : "Jouer maintenant"}</div>
      </div>`;
  }

  // Lance le défi : verrouille l'identité imposée puis saute aux choix libres
  // (hygiène de vie → entourage → club). setup.dailyDate marque le run.
  async function startDailyChallenge() {
    if (readCurrentGame()) {
      const ok = await confirmModal({
        icon: "🗓️",
        title: "Une carrière est en cours",
        message: "Lancer le défi du jour effacera définitivement votre carrière actuelle.",
        confirmLabel: "Lancer le défi",
        cancelLabel: "Annuler",
        danger: true,
      });
      if (!ok) return;
    }
    const ch = dailyChallengeFor(todayKey());
    setup = { nationality: ch.nationality, position: ch.position, origin: ch.origin, dailyDate: ch.id, entryScreen: "screen-lifestyle" };
    E.setSeed(dailySeedFor(ch.id)); // moteur déterministe pour TOUT le run de défi
    track("daily_started", { date: ch.id });
    const reminder = $("daily-reminder");
    if (reminder) {
      reminder.innerHTML = `🗓️ <strong>Défi du jour</strong> — ${ch.position.icon} ${esc(ch.position.name)} · ${flagHtml(ch.nationality)} ${esc(ch.nationality.name)} · ${esc(ch.origin.name)}`;
      reminder.hidden = false;
    }
    showScreen("screen-lifestyle");
  }

  // --- Mode Histoire (légendes masquées) ------------------------------------
  // Une histoire = profil + époque imposés (setup.startYear), événements
  // scriptés programmés aux âges clés (beats → G.scheduled) et un score de
  // légende à battre. Le reste du run est LIBRE : « faire mieux qu'elle ».
  // Pas de graine : chaque tentative reste pleine de hasard (rejouabilité).
  function storyById(id) { return STORIES.find((st) => st.id === id); }

  function isStoryUnlocked(story, progress) {
    if (!story.cost) return true;
    return ((progress || loadProgress()).unlockedStories || []).includes(story.id);
  }

  function renderStoryPanel() {
    const panel = $("story-panel");
    if (!panel) return;
    const story = STORIES[0];
    if (!story) { panel.innerHTML = ""; return; }
    const best = (loadProgress().stories || {})[story.id];
    const bestLine = best && best.best != null
      ? `Votre record : ${best.best} pts${best.beaten ? " · 👑 légende battue" : ""}`
      : `Objectif : battre ses ${story.baseline} pts`;
    panel.innerHTML = `
      <div class="hc-head">Mode Histoire</div>
      <div class="hc-body">
        <p class="hc-text">${story.icon} ${esc(story.alias)} · ${esc(story.era)}</p>
        <span class="story-best">${bestLine}</span>
        <div class="hc-cta">Revivre la légende</div>
      </div>`;
  }

  function renderStoryScreen() {
    const list = $("story-list");
    if (!list) return;
    const progress = loadProgress();
    list.innerHTML = STORIES.map((st) => {
      const unlocked = isStoryUnlocked(st, progress);
      const best = (progress.stories || {})[st.id];
      const status = !unlocked
        ? `<span class="story-cost">🪙 ${st.cost}</span>`
        : `<span class="story-free">${st.cost === 0 ? "Offerte" : "Débloquée"}</span>`;
      const bestLine = best && best.best != null
        ? `<p class="story-record">Votre record : <strong>${best.best} pts</strong>${best.beaten ? " · 👑 légende battue" : ""}</p>`
        : "";
      return `<div class="story-card${unlocked ? "" : " locked"}">
        <div class="story-head">
          <span class="story-icon">${st.icon}</span>
          <div class="story-id"><p class="story-alias">${esc(st.alias)}</p><p class="story-era">${esc(st.era)}</p></div>
          ${status}
        </div>
        <p class="story-teaser">${esc(st.teaser)}</p>
        <p class="story-goal">🎯 La légende a terminé sa carrière à <strong>${st.baseline} pts</strong>. Faites mieux.</p>
        ${bestLine}
        <button class="btn btn-secondary story-play" data-story="${st.id}"${!unlocked && jetonsBalance(progress) < st.cost ? " disabled" : ""}>${unlocked ? "Revivre cette légende" : `Débloquer (🪙 ${st.cost} jetons)`}</button>
      </div>`;
    }).join("");
    list.querySelectorAll(".story-play").forEach((btn) => {
      btn.addEventListener("click", () => {
        const st = storyById(btn.dataset.story);
        if (!st) return;
        if (!isStoryUnlocked(st)) unlockStory(st);
        else startStory(st);
      });
    });
  }

  function unlockStory(story) {
    const progress = loadProgress();
    if (jetonsBalance(progress) < story.cost) return;
    progress.jetonsSpent += story.cost;
    progress.unlockedStories = progress.unlockedStories || [];
    if (!progress.unlockedStories.includes(story.id)) progress.unlockedStories.push(story.id);
    saveProgress(progress);
    track("story_unlocked", { story_id: story.id });
    renderStoryScreen();
  }

  async function startStory(story) {
    if (readCurrentGame()) {
      const ok = await confirmModal({
        icon: story.icon,
        title: "Une carrière est en cours",
        message: "Lancer cette histoire effacera définitivement votre carrière actuelle.",
        confirmLabel: "Lancer l'histoire",
        cancelLabel: "Annuler",
        danger: true,
      });
      if (!ok) return;
    }
    E.clearSeed(); // une histoire reste pleine de hasard : seule l'époque est imposée
    setup = {
      nationality: NATIONALITIES.find((n) => n.id === story.profile.nationality) || NATIONALITIES[0],
      position: POSITIONS.find((p) => p.id === story.profile.position) || POSITIONS[0],
      origin: ORIGINS.find((o) => o.id === story.profile.origin) || ORIGINS[0],
      trajectory: TRAJECTORIES.find((t) => t.id === story.trajectory),
      potCap: story.potCap,
      startYear: story.startYear,
      startClubId: story.startClubId,
      clubLevels: story.clubLevels,
      storyId: story.id,
      entryScreen: "screen-lifestyle",
    };
    track("story_started", { story_id: story.id });
    const reminder = $("daily-reminder");
    if (reminder) {
      reminder.innerHTML = `${story.icon} <strong>Mode Histoire</strong> — ${esc(story.alias)} · ${esc(story.era)} · battez ${story.baseline} pts`;
      reminder.hidden = false;
    }
    showScreen("screen-lifestyle");
  }

  // Enregistre le résultat d'une histoire (record perso + légende battue).
  function recordStoryResult(storyId, score) {
    const story = storyById(storyId);
    if (!story) return null;
    const progress = loadProgress();
    progress.stories = progress.stories || {};
    const entry = progress.stories[storyId] || { best: null, beaten: false, plays: 0 };
    entry.plays += 1;
    const beatenNow = !G.careerEnded && score > story.baseline;
    if (entry.best == null || score > entry.best) entry.best = score;
    if (beatenNow) entry.beaten = true;
    progress.stories[storyId] = entry;
    saveProgress(progress);
    track("story_completed", { story_id: storyId, score, beat_baseline: beatenNow });
    return { story, score, beaten: beatenNow };
  }

  // --- Duel entre amis (défi asynchrone par lien) --------------------------------
  // Les deux amis jouent la MÊME graine (mêmes épreuves = équité). Aucun rival
  // IA n'est simulé en mode duel (G.duel) pour ne pas désaligner le flux de
  // hasard entre les deux joueurs.
  // SEUL le format v2 est accepté : le lien transporte le JOURNAL DE CHOIX, qui
  // est rejoué localement sous la graine du duel. On ne peut donc pas gonfler un
  // score, seulement mieux jouer. L'ancien format v1 transportait un résumé
  // brut — donc falsifiable, et vecteur d'injection : il est refusé à l'entrée.
  let duelData = null; // duel en cours de consultation (intro/résultat)

  // Profil imposé par la graine (même dérivation que le Défi du jour).
  function duelChallengeFor(seed) {
    return {
      nationality: NATIONALITIES[hashInt(seed * 5 + 1) % NATIONALITIES.length],
      position: POSITIONS[hashInt(seed * 5 + 2) % POSITIONS.length],
      origin: ORIGINS[hashInt(seed * 5 + 3) % ORIGINS.length],
    };
  }

  // Résumé compact d'une carrière (ce qui voyage dans le lien).
  function careerSummary(s) {
    const t = s.trophies;
    return {
      n: s.name, nat: s.nationality.id, pos: s.position.id, ori: s.origin.id,
      ovr: s.peakOvr, rep: s.rep, mon: Math.round(s.money), end: s.careerEnded ? 1 : 0,
      tr: [t.worldCup, t.ballon, t.continental, t.league, t.cup, t.goldenBoot, t.continental2 || 0, t.continental3 || 0],
      g: s.totals.goals, m: s.totals.matches, a: s.totals.assists, cs: s.totals.cleanSheets,
      caps: s.natTeam.caps, aw: E.totalAwards(s),
    };
  }

  // Reconstruit un objet "carrière" minimal depuis un résumé, suffisant pour le
  // face-à-face (computeCareerScore / buildNarrative / colonnes / compareVerdict).
  // Un résumé « v1 » arrive d'une URL : RIEN n'y est digne de confiance. Tous
  // les champs numériques sont coercés et bornés, les ids revalidés contre les
  // données du jeu, et le nom est tronqué. Aucune chaîne libre ne ressort d'ici.
  function num(v, max) {
    const n = Number(v);
    return Number.isFinite(n) ? E.clamp(Math.round(n), 0, max) : 0;
  }
  function reconstructDuelRival(c, label) {
    c = c && typeof c === "object" ? c : {};
    const tr = Array.isArray(c.tr) ? c.tr : [];
    const name = String(c.n == null ? "Ami" : c.n).slice(0, 40) || "Ami";
    return {
      name, label: label || name,
      nationality: NATIONALITIES.find((n) => n.id === c.nat) || NATIONALITIES[0],
      position: POSITIONS.find((p) => p.id === c.pos) || POSITIONS[0],
      origin: ORIGINS.find((o) => o.id === c.ori) || ORIGINS[0],
      peakOvr: num(c.ovr, 99), rep: num(c.rep, 100), money: num(c.mon, 100000),
      careerEnded: !!c.end, careerEndReason: c.end ? "injury" : null,
      trophies: {
        worldCup: num(tr[0], 10), ballon: num(tr[1], 20), continental: num(tr[2], 30),
        league: num(tr[3], 40), cup: num(tr[4], 40), goldenBoot: num(tr[5], 20),
        continental2: num(tr[6], 40), continental3: num(tr[7], 40), // vieux liens (6 elts) → 0
      },
      totals: { goals: num(c.g, 2000), matches: num(c.m, 1200), assists: num(c.a, 2000), cleanSheets: num(c.cs, 1200) },
      natTeam: { caps: num(c.caps, 400), active: false, retired: true, goals: 0 },
      awardCounts: { _: num(c.aw, 200) }, // totalAwards() → c.aw
      history: [], // requis par buildNarrative (pickHighlights)
    };
  }

  // REJEU headless d'un journal de choix sous une graine → reconstruit la
  // carrière EXACTE du joueur (tamper-proof : on ne peut pas gonfler un score,
  // seulement mieux jouer). L'ORDRE des appels moteur DOIT être identique à
  // celui du jeu interactif (game.js), sinon le hasard consommé diffère.
  // Ordre par saison : pickEvent → resolveOption → (transfert/prêt) → coup du
  // sort (rng) → playSeason → moments → CDM → transferWindow → advanceYear.
  function replayDuelCareer(seed, log) {
    log = log || [];
    let i = 0;
    const next = () => (i < log.length ? log[i++] : 0);
    E.setSeed(seed);
    const prof = duelChallengeFor(seed);
    const lifestyle = LIFESTYLES[next()] || LIFESTYLES[0];
    const entourage = ENTOURAGES[next()] || ENTOURAGES[0];
    const potCap = E.rollPotential(prof.origin, lifestyle, entourage);
    const offers = E.academyOffers({ nationality: prof.nationality, origin: prof.origin, lifestyle, entourage, potCap });
    const club = (offers[next()] || offers[0]).club;
    const s = E.newCareer({ nationality: prof.nationality, origin: prof.origin, position: prof.position, lifestyle, entourage, potCap, club });
    let guard = 0;
    while (!s.careerEnded && !s.retiring && s.age <= E.BALANCE_REF.ageMax && guard++ < 40) {
      const ev = E.pickEvent(s);
      if (ev) {
        const res = E.resolveOption(s, ev.options[next()] || ev.options[0]);
        if (s.careerEnded) break;
        if (res.outcome.fx && res.outcome.fx.transfer && !res.outcome.fx.transfer.direct) {
          const t = E.offersFor(s, res.outcome.fx.transfer);
          const ch = next();
          if (t.length && ch >= 0) E.applyTransfer(s, t[ch] || t[0]);
        } else if (res.outcome.fx && res.outcome.fx.loan) {
          const l = E.loanOffersFor(s);
          const ch = next();
          if (l.length) E.applyLoan(s, l[ch] || l[0]);
        }
      }
      if (s.age <= 18 && E.rng() < E.BALANCE_REF.earlyEndChance) { s.careerEnded = true; s.careerEndReason = "injury"; break; }
      const report = E.playSeason(s);
      while (report.pendingMoments.length) {
        const entry = report.pendingMoments.shift();
        const opt = entry.moment.options[next()];
        E.resolveSeasonMoment(s, report, entry, opt ? opt.id : null);
      }
      if (report.wc && report.wc.finalPending) {
        const opt = report.wc.moment.options[next()];
        E.resolveWcFinal(s, report, opt ? opt.id : null);
      }
      if (s.careerEnded) break; // blessure fatale en fin de saison : miroir exact du chemin interactif (offseason → finalize)
      if (s.retiring || s.age >= E.BALANCE_REF.ageMax) break;
      const window = E.transferWindow(s, report);
      if (window) {
        const ch = next();
        if (window.offers.length && ch >= 0) E.applyTransfer(s, window.offers[ch] || window.offers[0]);
        else if (window.contractUp) E.renewContract(s, window);
      }
      E.advanceYear(s);
    }
    return s;
  }

  // Résumé d'une entrée de lien : rejeu du journal de choix sous la graine du
  // duel. Sans journal, on ne renvoie rien (plus de résumé transporté).
  function entrySummary(entry, seed) {
    if (entry && Array.isArray(entry.cl)) return careerSummary(replayDuelCareer(seed, entry.cl));
    return null; // pas de journal = rien à afficher (on ne fait plus confiance à un résumé transporté)
  }

  // Encodage URL-safe (base64url) d'un objet duel dans le hash du lien.
  function encodeDuel(obj) {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) { return ""; }
  }
  function decodeDuel(str) {
    try {
      let s = String(str).replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      return JSON.parse(decodeURIComponent(escape(atob(s))));
    } catch (e) { return null; }
  }
  function duelBaseUrl() { return location.origin + location.pathname; }

  // Lien à partager depuis la fiche finale d'un run de duel (v2 = journal de
  // choix, inviolable). En réponse, on transporte l'entrée du défieur telle
  // quelle (f) + la sienne (t).
  function currentDuelLink() {
    const myEntry = { l: G.name, cl: G.choiceLog };
    const link = G.duelRole === "respond"
      ? { v: 2, s: G.duelSeed, f: G.duelFromEntry, t: myEntry }
      : { v: 2, s: G.duelSeed, f: myEntry };
    return duelBaseUrl() + "#duel=" + encodeDuel(link);
  }

  async function shareDuel(url, btn) {
    const text = "🆚 Je te défie sur Open Eleven — même profil, mêmes épreuves. Fais mieux que moi !";
    try {
      if (navigator.share) { await navigator.share({ title: BRAND.game, text, url }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try {
      await navigator.clipboard.writeText(url);
      if (btn) { const old = btn.textContent; btn.textContent = "✅ Lien copié !"; setTimeout(() => { btn.textContent = old; }, 2500); }
    } catch (e) {
      window.prompt("Copie ce lien de défi et envoie-le à un ami :", url);
    }
  }

  // Colonne de comparaison bâtie depuis un résumé (écran duel).
  function duelCol(c, label) {
    const r = reconstructDuelRival(c, label);
    return `<div class="rival-col">
      <p class="rival-col-name">${flagHtml(r.nationality)} ${esc(label)}</p>
      <p class="rival-col-tier">${esc(E.buildNarrative(r).title)}</p>
      <div class="rival-col-stats">
        ${statRowHtml("Score", E.computeCareerScore(r))}
        ${statRowHtml("OVR max", r.peakOvr)}
        ${statRowHtml("Buts", r.totals.goals)}
        ${statRowHtml("🏆 CDM", r.trophies.worldCup)}
        ${statRowHtml("⭐ Ballon", r.trophies.ballon)}
        ${statRowHtml("🎖️ Titres", r.trophies.league)}
      </div></div>`;
  }

  function duelVerdict(lFrom, sFrom, lTo, sTo) {
    const diff = sTo - sFrom;
    if (Math.abs(diff) <= 8) return `Duel au sommet : ${esc(lFrom)} et ${esc(lTo)} se tiennent dans un mouchoir (${sFrom} – ${sTo}).`;
    const win = diff > 0 ? lTo : lFrom;
    const lose = diff > 0 ? lFrom : lTo;
    return `${esc(win)} l'emporte sur ${esc(lose)} (${Math.max(sFrom, sTo)} – ${Math.min(sFrom, sTo)}).`;
  }

  // Écran d'intro d'un défi reçu (l'adversaire n'a pas encore répondu).
  function renderDuelIntro(d) {
    const prof = duelChallengeFor(d.s);
    $("duel-body").innerHTML = `
      <p class="duel-intro-line"><strong>${esc(d.f.l)}</strong> te défie !</p>
      <p class="duel-intro-sub">Profil imposé : ${prof.position.icon} ${esc(prof.position.name)} · ${flagHtml(prof.nationality)} ${esc(prof.nationality.name)} · ${esc(prof.origin.name)}</p>
      <div class="rival-compare">${duelCol(entrySummary(d.f, d.s), d.f.l)}</div>
      <p class="duel-intro-hint">Mêmes épreuves que ton adversaire. À toi de faire mieux.</p>
      <button class="btn btn-primary" id="btn-duel-accept">Relever le défi</button>
      <button class="btn btn-secondary" id="btn-duel-later">Plus tard</button>`;
    $("btn-duel-accept").addEventListener("click", () => acceptDuel(d));
    $("btn-duel-later").addEventListener("click", () => { duelData = null; resetGame(); });
  }

  // Écran de résultat (les deux amis ont joué : lien retour ouvert par le défieur).
  function renderDuelResult(d) {
    const cFrom = entrySummary(d.f, d.s);
    const cTo = entrySummary(d.t, d.s);
    const sFrom = E.computeCareerScore(reconstructDuelRival(cFrom));
    const sTo = E.computeCareerScore(reconstructDuelRival(cTo));
    $("duel-body").innerHTML = `
      <p class="duel-result-title">🆚 Résultat du duel</p>
      <div class="rival-compare">${duelCol(cFrom, d.f.l)}${duelCol(cTo, d.t.l)}</div>
      <p class="rival-verdict">${duelVerdict(d.f.l, sFrom, d.t.l, sTo)}</p>
      <button class="btn btn-primary" id="btn-duel-home">Retour à l'accueil</button>`;
    $("btn-duel-home").addEventListener("click", () => { duelData = null; resetGame(); });
  }

  function enterDuel(d) {
    duelData = d;
    if (d.t && Array.isArray(d.t.cl)) renderDuelResult(d);
    else renderDuelIntro(d);
    showScreen("screen-duel");
  }

  function setDuelReminder(html) {
    const reminder = $("daily-reminder");
    if (reminder) { reminder.innerHTML = html; reminder.hidden = false; }
  }

  // Carte cliquable « Duel entre amis » sur l'accueil (c'est un mode de jeu,
  // pas un menu de stats → même traitement que le Défi du jour).
  function renderDuelPanel() {
    const panel = $("duel-panel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="hc-head">Duel entre amis</div>
      <div class="hc-body">
        <p class="hc-text">Défie un ami : même parcours, le meilleur gagne.</p>
        <div class="hc-cta">Lancer un duel</div>
      </div>`;
  }

  // Créer un défi : run seedé, profil imposé, SANS rival (on établit un score).
  async function startDuelCreate() {
    if (readCurrentGame()) {
      const ok = await confirmModal({
        icon: "🆚", title: "Une carrière est en cours",
        message: "Créer un défi effacera définitivement votre carrière actuelle.",
        confirmLabel: "Créer le défi", cancelLabel: "Annuler", danger: true,
      });
      if (!ok) return;
    }
    const seed = ((Math.random() * 0x7fffffff) >>> 0) || 1;
    const prof = duelChallengeFor(seed);
    setup = { nationality: prof.nationality, position: prof.position, origin: prof.origin, duelRole: "create", duelSeed: seed, duelChoices: [], entryScreen: "screen-lifestyle" };
    E.setSeed(seed);
    setDuelReminder(`🆚 <strong>Tu crées un défi</strong> — ${prof.position.icon} ${esc(prof.position.name)} · ${flagHtml(prof.nationality)} ${esc(prof.nationality.name)} · ${esc(prof.origin.name)}`);
    track("duel_created", { seed });
    showScreen("screen-lifestyle");
  }

  // Relever un défi reçu : même graine, on affronte le résumé de l'adversaire.
  async function acceptDuel(d) {
    if (readCurrentGame()) {
      const ok = await confirmModal({
        icon: "🆚", title: "Une carrière est en cours",
        message: "Relever ce défi effacera définitivement votre carrière actuelle.",
        confirmLabel: "Relever le défi", cancelLabel: "Annuler", danger: true,
      });
      if (!ok) return;
    }
    const prof = duelChallengeFor(d.s);
    // Reconstruit l'adversaire en REJOUANT son journal de choix (inviolable),
    // PUIS re-seed pour le run du répondeur (le rejeu a consommé la graine).
    const rivalSummary = entrySummary(d.f, d.s);
    E.setSeed(d.s);
    setup = {
      nationality: prof.nationality, position: prof.position, origin: prof.origin,
      duelRole: "respond", duelSeed: d.s,
      duelRivalSummary: rivalSummary, duelFromLabel: d.f.l, duelFromEntry: d.f,
      duelChoices: [], entryScreen: "screen-lifestyle",
    };
    setDuelReminder(`🆚 <strong>Défi de ${esc(d.f.l)}</strong> — ${prof.position.icon} ${esc(prof.position.name)} · ${flagHtml(prof.nationality)} ${esc(prof.nationality.name)} · ${esc(prof.origin.name)}`);
    track("duel_accepted", { seed: d.s });
    showScreen("screen-lifestyle");
  }

  // Carte de quête pour l'écran dédié.
  function questCardHtml(q, done, tier) {
    const tierBadge = tier ? `<span class="qc-tier qc-tier-${tier.cls}">${tier.label}</span>` : "";
    return `<div class="quest-card${done ? " quest-card-done" : ""}">
      <span class="qc-icon">${q.icon}</span>
      <div class="qc-body">
        <p class="qc-name">${esc(q.name)}${tierBadge}</p>
        <p class="qc-desc">${esc(q.desc)}</p>
      </div>
      <div class="qc-side">
        <span class="qc-check">${done ? "✅" : "○"}</span>
        <span class="qc-pts">+${q.pts}</span>
      </div>
    </div>`;
  }

  // Barre de progression vers un objectif de rétention.
  function retentionBarHtml(icon, label, cur, target) {
    const pct = Math.min(100, Math.round((cur / target) * 100));
    const done = cur >= target;
    return `<div class="retention-row${done ? " retention-done" : ""}">
      <span class="retention-label">${icon} ${esc(label)}</span>
      <div class="retention-bar"><div class="retention-fill" style="width:${pct}%"></div></div>
      <span class="retention-val">${Math.min(cur, target)}/${target}</span>
    </div>`;
  }

  function renderQuestScreen() {
    const progress = loadProgress();
    const today = todayKey();
    const week = weekKey();
    const daily = dailyQuestsFor(today);
    const doneIds = progress.dailyDone.date === today ? progress.dailyDone.ids : [];
    const weekly = weeklyChallengeFor(week);
    const weeklyDone = progress.weeklyDone.week === week && progress.weeklyDone.done;
    const legend = legendQuestFor(week);
    const legendDone = progress.legendDone.week === week && progress.legendDone.done;
    const streak = progress.questStreak;

    // Héros : la flamme de série + les compteurs. La série n'a PAS de plafond :
    // les 7 pastilles montrent le cycle vers le PROCHAIN JOKER (recommence à
    // chaque multiple de 7), et le prochain palier de jetons est affiché.
    const cyclePos = streak === 0 ? 0 : ((streak - 1) % 7) + 1;
    const dots = Array.from({ length: 7 }, (_, i) =>
      `<span class="streak-dot${i < cyclePos ? " on" : ""}"></span>`).join("");
    const nextMs = STREAK_MILESTONES.find((ms) => ms.days > streak);
    const jokers = progress.streakJokers || 0;
    $("quest-hero").innerHTML = `
      <div class="streak-flame ${streak > 0 ? "streak-alive" : ""}">
        <span class="sf-emoji">${streak > 0 ? "🔥" : "🕯️"}</span>
        <span class="sf-num">${streak}</span>
        <span class="sf-unit">jour${streak > 1 ? "s" : ""} de série</span>
      </div>
      <div class="streak-dots">${dots}</div>
      <p class="streak-cycle-note">🧊 +1 joker tous les 7 jours · en réserve : ${"🧊".repeat(jokers) || "aucun"}${jokers ? ` (${jokers}/2)` : ""} — un joker pardonne un jour manqué</p>
      ${nextMs ? `<p class="streak-next">Prochain palier : <strong>${nextMs.days} jours</strong> → <strong>+${nextMs.jetons} 🪙</strong> (encore ${nextMs.days - streak} j)</p>` : `<p class="streak-next">👑 Tous les paliers sont conquis. Série mythique.</p>`}
      <div class="quest-hero-stats">
        <div class="qh-stat"><span class="qh-val">${progress.bestStreak}</span><span class="qh-lbl">Record</span></div>
        <div class="qh-stat"><span class="qh-val">${progress.questTotal}</span><span class="qh-lbl">Quêtes</span></div>
        <div class="qh-stat"><span class="qh-val">🪙 ${jetonsBalance(progress)}</span><span class="qh-lbl">Jetons</span></div>
      </div>`;

    $("quest-screen-body").innerHTML = `
      <p class="quest-section-label">🎯 Quêtes du jour</p>
      ${daily.map((q) => questCardHtml(q, doneIds.includes(q.id), QUEST_TIERS[q.tier])).join("")}

      <p class="quest-section-label">🏅 Défi de la semaine</p>
      ${questCardHtml(weekly, weeklyDone, null)}

      <p class="quest-section-label">👑 Défi légendaire</p>
      <div class="legend-wrap">${questCardHtml(legend, legendDone, null)}</div>

      <p class="quest-hint-note">Terminez une carrière pour valider vos quêtes. Elles se renouvellent chaque jour — revenez pour entretenir votre série 🔥</p>

      <p class="quest-section-label">🧭 Objectifs de rétention</p>
      ${nextMs ? retentionBarHtml("🔥", `Série de ${nextMs.days} jours (+${nextMs.jetons} 🪙)`, streak, nextMs.days) : retentionBarHtml("🔥", "Série de 365 jours", streak, 365)}
      ${retentionBarHtml("🎯", "20 quêtes accomplies", progress.questTotal, 20)}`;
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
  }

  function evaluateBadges() {
    const progress = loadProgress();
    const wasFailedBefore = progress.lastCareerEnded;
    const unlocked = [];
    const success = !G.careerEnded;
    const score = E.computeCareerScore(G);

    function tryUnlock(id, cond) {
      if (cond && !progress.unlockedBadges.includes(id)) {
        progress.unlockedBadges.push(id);
        progress.badgeContexts[id] = `Débloqué avec ${G.name} (${G.nationality.flag} ${G.position.name}, carrière ${careerStartYear()}-${G.year})`;
        unlocked.push(id);
        track("badge_unlocked", { badge_id: id });
      }
    }
    if (success) {
      const t = G.trophies;
      const countries = new Set(G.transferHistory.map((x) => x.countryName));
      const tripleSeason = G.seasons.some((se) => se.trophies.includes("league") && se.trophies.includes("continental") && se.trophies.includes("worldCup"));
      tryUnlock("first_ballon_or", t.ballon >= 1);
      tryUnlock("world_cup", t.worldCup >= 1);
      tryUnlock("wonderkid", !!G.flags.wonderkid);
      tryUnlock("prolific_scorer", G.totals.goals >= 450);
      tryUnlock("legend_tier", E.careerTitle(G).title === "Légende du football mondial");
      tryUnlock("three_countries", countries.size >= 3);
      tryUnlock("well_traveled", G.clubsPlayed.length >= 5);
      tryUnlock("comeback", wasFailedBefore);
      tryUnlock("golden_boots", t.goldenBoot >= 3);
      tryUnlock("prodigy", !!G.flags.early_ballon);
      tryUnlock("one_club", G.transferHistory.filter((x) => x.fee != null).length === 0 && score >= 100);
      tryUnlock("moneybags", G.money >= 100);
      tryUnlock("centurion", G.natTeam.caps >= 100);
      tryUnlock("wall", G.position.id === "gk" && G.totals.cleanSheets >= 150);
      tryUnlock("triple", tripleSeason);
      tryUnlock("survivor", !!G.flags.big_injury);
      tryUnlock("iron_man", G.totals.matches >= 800);
      tryUnlock("ageless", G.seasons.some((se) => se.age >= 40 && se.matches > 0));
      tryUnlock("mathusalem", G.seasons.some((se) => se.age >= 45 && se.matches > 0));
      tryUnlock("nations_league", (t.natLeague || 0) >= 1);
      tryUnlock("showtime", E.hasTrait(G, "showman") && G.rep >= 88);

      // Badges v4.2 : précocité, distinctions, championnats détaillés, moments
      tryUnlock("early_cap", !!G.flags.early_cap);
      tryUnlock("ballon_3", t.ballon >= 3);
      tryUnlock("award_10", E.totalAwards(G) >= 10);
      tryUnlock("wc_golden_badge", (G.awardCounts.wc_golden_ball || 0) >= 1);
      tryUnlock("moment_5", G.momentWins >= 5);
      tryUnlock("derby_3", G.derbyWins >= 3);
      tryUnlock("panenka_or", !!G.flags.panenka_final);
      tryUnlock("double_agent", !!G.flags.traitor);

      const titles = G.leagueTitlesDetail || [];
      const isTop = (lv) => lv === "elite" || lv === "d1";
      tryUnlock("champ_3pays", new Set(titles.map((x) => x.countryId)).size >= 3);
      tryUnlock("champ_big5", ["fr", "de", "es", "it", "en"].every((cid) => titles.some((x) => x.countryId === cid && isTop(x.level))));
      tryUnlock("champ_d1d2", titles.some((a) => !isTop(a.level) && titles.some((b) => isTop(b.level) && b.countryId === a.countryId)));
      tryUnlock("champ_2continents", new Set(titles.map((x) => { const c = E.countryOf(x.countryId); return c ? c.continent : "eu"; })).size >= 2);
      tryUnlock("champ_epopee", titles.some((a) => isTop(a.level) && titles.some((b) => !isTop(b.level) && b.clubId === a.clubId)));
      tryUnlock("champ_sans_elite", titles.filter((x) => isTop(x.level)).length >= 2 && !G.seasons.some((se) => se.level === "elite"));

      if (R) { // pas de rival en duel-création
        const rivalScore = R.careerEnded ? -Infinity : E.computeCareerScore(R);
        progress.consecutiveRivalWins = score > rivalScore ? progress.consecutiveRivalWins + 1 : 0;
        tryUnlock("rival_slayer", progress.consecutiveRivalWins >= 3);
      }
    } else {
      progress.consecutiveRivalWins = 0;
    }
    // Badges de rétention (streak et total de quêtes, hors succès de carrière)
    tryUnlock("quest_streak7", progress.questStreak >= 7);
    tryUnlock("quest_20", progress.questTotal >= 20);
    // Le Graal : tous les autres badges débloqués
    tryUnlock("platine", BADGES.filter((b) => b.id !== "platine").every((b) => progress.unlockedBadges.includes(b.id)));
    progress.lastCareerEnded = G.careerEnded;
    progress.careersPlayed += 1;
    progress.bestScore = Math.max(progress.bestScore, success ? score : 0);
    saveProgress(progress);
    return unlocked;
  }

  function badgeItemHtml(badge, progress) {
    const has = progress.unlockedBadges.includes(badge.id);
    const item = document.createElement("div");
    item.className = (has ? "badge-item unlocked" : "badge-item locked") + (badge.id === "platine" ? " badge-platine" : "");
    if (has) {
      const context = progress.badgeContexts[badge.id];
      item.innerHTML = `<span class="badge-icon">${badge.icon}</span>
        <span class="badge-name">${esc(badge.name)}</span>
        <span class="badge-hint">${esc(badge.desc)}</span>
        ${context ? `<span class="badge-context">${esc(context)}</span>` : ""}`;
    } else if (badge.secret) {
      item.innerHTML = `<span class="badge-icon">❓</span>
        <span class="badge-name">Badge secret</span>
        <span class="badge-hint">Son existence même est un indice…</span>`;
    } else {
      item.innerHTML = `<span class="badge-icon">🔒</span>
        <span class="badge-name">${esc(badge.name)}</span>
        <span class="badge-hint">${esc(badge.hint)}</span>`;
    }
    return item;
  }

  function renderBadgeScreen() {
    const progress = loadProgress();
    const wrap = $("badge-grid");
    wrap.innerHTML = "";

    // Progression globale vers le Graal
    const total = BADGES.length;
    const done = progress.unlockedBadges.filter((id) => BADGES.some((b) => b.id === id)).length;
    const bar = document.createElement("div");
    bar.className = "badge-progress";
    bar.innerHTML = `<div class="badge-progress-fill" style="width:${Math.round((done / total) * 100)}%"></div>
      <span class="badge-progress-label">💎 ${done}/${total}</span>`;
    wrap.appendChild(bar);

    BADGE_CATS.forEach((cat) => {
      const catBadges = BADGES.filter((b) => b.cat === cat.id);
      if (!catBadges.length) return;
      const catDone = catBadges.filter((b) => progress.unlockedBadges.includes(b.id)).length;
      const header = document.createElement("p");
      header.className = "badge-cat-header";
      header.innerHTML = `${cat.icon} ${esc(cat.name)} <span class="badge-cat-count">${catDone}/${catBadges.length}</span>`;
      wrap.appendChild(header);
      const grid = document.createElement("div");
      grid.className = "badge-cat-grid";
      catBadges.forEach((badge) => grid.appendChild(badgeItemHtml(badge, progress)));
      wrap.appendChild(grid);
    });

    $("badge-meta").textContent = `${done}/${total} badges · ${progress.careersPlayed} carrière${progress.careersPlayed > 1 ? "s" : ""} jouée${progress.careersPlayed > 1 ? "s" : ""}`;
  }

  // --- Boutique de jetons (méta-progression) -------------------------------------
  // Débloque un avantage (achat définitif en jetons) puis équipe-en jusqu'à
  // PERK_SLOTS pour tes prochaines carrières NORMALES. Le Défi du jour les
  // ignore (cf. startCareer). jetonsSpent est cumulatif : le solde = gagné − dépensé.
  function buyPerk(id) {
    const perk = PERKS.find((p) => p.id === id);
    if (!perk) return false;
    const progress = loadProgress();
    if (progress.ownedPerks.includes(id)) return false;
    if (jetonsBalance(progress) < perk.cost) return false;
    progress.jetonsSpent += perk.cost;
    progress.ownedPerks.push(id);
    // Auto-équipe si un emplacement est libre : achat = envie de l'utiliser tout de suite.
    if (progress.equippedPerks.length < PERK_SLOTS) progress.equippedPerks.push(id);
    saveProgress(progress);
    track("perk_bought", { perk_id: id, cost: perk.cost });
    return true;
  }

  function toggleEquipPerk(id) {
    const progress = loadProgress();
    if (!progress.ownedPerks.includes(id)) return;
    const i = progress.equippedPerks.indexOf(id);
    if (i >= 0) progress.equippedPerks.splice(i, 1);
    else if (progress.equippedPerks.length < PERK_SLOTS) progress.equippedPerks.push(id);
    saveProgress(progress);
  }

  // Applique les avantages équipés à une carrière (à la création, hors Défi).
  function applyPerks(g, ids) {
    let statsTouched = false;
    (ids || []).forEach((id) => {
      const perk = PERKS.find((p) => p.id === id);
      const fx = perk && perk.fx;
      if (!fx) return;
      if (fx.pot) g.potCap = E.clamp(g.potCap + fx.pot, 68, 99);
      if (fx.rep) g.rep = E.clamp(g.rep + fx.rep, 0, 100);
      if (fx.money) g.money = Math.max(0, g.money + fx.money);
      for (const k of ["t", "p", "m", "c"]) {
        if (fx[k]) { g.stats[k] = E.clamp(g.stats[k] + fx[k], 1, 99); statsTouched = true; }
      }
      if (fx.trait && !g.traits.includes(fx.trait)) g.traits.push(fx.trait);
    });
    if (statsTouched) g.peakOvr = E.ovr(g); // l'OVR de départ tient compte du bonus
  }

  function renderShopScreen() {
    const progress = loadProgress();
    const balance = jetonsBalance(progress);
    $("shop-balance").innerHTML = `🪙 <span>${balance}</span> jeton${balance > 1 ? "s" : ""}`;
    const equippedCount = progress.equippedPerks.length;
    const list = $("shop-list");
    list.innerHTML = PERKS.map((perk) => {
      const owned = progress.ownedPerks.includes(perk.id);
      const equipped = progress.equippedPerks.includes(perk.id);
      const affordable = balance >= perk.cost;
      let side;
      if (!owned) {
        side = `<span class="perk-cost">🪙 ${perk.cost}</span>
          <button class="perk-btn" data-buy="${perk.id}"${affordable ? "" : " disabled"}>Débloquer</button>`;
      } else {
        const full = !equipped && equippedCount >= PERK_SLOTS;
        side = `<button class="perk-equip${equipped ? " on" : ""}" data-equip="${perk.id}"${full ? " disabled" : ""}>${equipped ? "Équipé ✓" : "Équiper"}</button>`;
      }
      return `<div class="perk-card${equipped ? " perk-equipped-card" : ""}">
        <span class="perk-icon">${perk.icon}</span>
        <div class="perk-body">
          <p class="perk-name">${esc(perk.name)}</p>
          <p class="perk-desc">${esc(perk.desc)}</p>
        </div>
        <div class="perk-side">${side}</div>
      </div>`;
    }).join("") + `<p class="quest-hint-note">${equippedCount}/${PERK_SLOTS} avantage${equippedCount > 1 ? "s" : ""} équipé${equippedCount > 1 ? "s" : ""} · actifs en carrière normale uniquement.</p>`;

    list.querySelectorAll("[data-buy]").forEach((btn) => {
      btn.addEventListener("click", () => { if (buyPerk(btn.dataset.buy)) renderShopScreen(); });
    });
    list.querySelectorAll("[data-equip]").forEach((btn) => {
      btn.addEventListener("click", () => { toggleEquipPerk(btn.dataset.equip); renderShopScreen(); });
    });
  }

  // --- Fin de carrière -----------------------------------------------------------
  function finalize() {
    clearCurrentGame(); // carrière terminée : plus rien à reprendre
    // Le rival IA termine sa carrière en accéléré (jamais en duel : R est figé/absent)
    let guard = 0;
    if (!G.duel) { while (!R.careerEnded && R.age <= E.BALANCE_REF.ageMax && guard++ < 30) E.rivalSeason(R); }
    saveToPantheon();
    const score = E.computeCareerScore(G);
    const questNotes = evaluateQuests(); // avant les badges (streak/total à jour)
    const newBadges = evaluateBadges();
    const dailyResult = G.dailyDate ? recordDailyResult(G.dailyDate, score) : null;
    const storyResult = G.storyId ? recordStoryResult(G.storyId, score) : null;
    const jetonBonus = awardCareerJetons(score);
    track("career_end", {
      success: !G.careerEnded,
      score,
      rating: E.careerRating(G),
      age: G.age,
      ballon: G.trophies.ballon,
      world_cup: G.trophies.worldCup,
      quests_completed: questNotes.length,
      new_badges: newBadges.length,
      jetons_earned: jetonBonus,
      mode: G.dailyDate ? "daily" : G.storyId ? "story" : "career",
    });
    renderFinalScreen(newBadges, questNotes, dailyResult, jetonBonus, storyResult);
    showScreen("screen-final");
  }

  // `value` peut provenir d'un lien de duel partagé (données non fiables) :
  // il est TOUJOURS échappé. Les libellés, eux, sont générés en interne.
  function statRowHtml(label, value, gold) {
    return `<div class="stat-row${gold ? " trophy-earned" : ""}"><span class="stat-label">${label}</span><span class="stat-value">${esc(value)}</span></div>`;
  }

  // Palier de la carte finale, indexé sur la NOTE DE CARRIÈRE :
  // 50-65 bronze · 66-79 argent · 80-85 or · 86-90 bleu · 91+ violet.
  const CARD_TIERS = [
    { id: "icone", min: 91, label: "UNE ICÔNE" },
    { id: "legende", min: 86, label: "UNE LÉGENDE" },
    { id: "or", min: 80, label: "UN CHAMPION" },
    { id: "argent", min: 66, label: "UN PRO" },
    { id: "bronze", min: -Infinity, label: "C'EST QUI ?" },
  ];

  // Fin DIGNE : une blessure qui stoppe un vétéran ou un joueur au vrai palmarès
  // mérite sa fiche complète (club, classement, tier), pas le bronze anonyme
  // réservé aux espoirs fauchés très tôt.
  function dignifiedInjuryEnd() {
    return G.careerEnded && G.careerEndReason === "injury" && (G.age >= 30 || E.computeCareerScore(G) >= 130);
  }
  function cardTierFor() {
    if (G.careerEnded && !dignifiedInjuryEnd()) return CARD_TIERS[4];
    const rating = E.careerRating(G);
    return CARD_TIERS.find((tier) => rating >= tier.min);
  }

  const POS_SHORT = { att: "ATT", mil: "MIL", def: "DEF", gk: "GB" };
  const ARCH_NICKS = {
    fox: "Renard", complete: "Phénomène", winger: "Cyclone", false9: "Illusionniste",
    anchor: "Sentinelle", b2b: "Moteur", maestro: "Maestro", cam: "Magicien",
    stopper: "Roc", libero: "Architecte", wingback: "TGV", boss: "Patron",
    line: "Mur", sweeper: "Balayeur", aerial: "Aigle", reflex: "Chat",
  };

  // Surnom de légende : gagné avec la réputation, lié à l'identité de jeu
  // et au club le plus marquant de la carrière.
  function nicknameFor() {
    if (!G.archetype || G.rep < 70) return null;
    const counts = {};
    G.seasons.forEach((se) => { counts[se.clubName] = (counts[se.clubName] || 0) + 1; });
    const topClub = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!topClub) return null;
    return `« ${E.leOf(ARCH_NICKS[G.archetype.id] || G.archetype.name)} ${E.deOf(topClub[0])} »`;
  }

  // Percentile du score sur la distribution simulée (SCORE_PERCENTILES,
  // seuils des centiles 1→99 générés par `node simulate.js 50000 table`).
  function percentileForScore(score) {
    let p = 0;
    for (let i = 0; i < SCORE_PERCENTILES.length; i++) {
      if (score >= SCORE_PERCENTILES[i]) p = i + 1;
      else break;
    }
    return p;
  }

  function renderFinalScreen(newBadges, questNotes, dailyResult, jetonBonus, storyResult, review) {
    reviewingPantheon = !!review; // consultation depuis le Panthéon vs vraie fin de carrière
    const narrative = E.buildNarrative(G);
    const isGk = G.position.id === "gk";
    const t = G.trophies;
    const tier = cardTierFor();
    const rating = E.careerRating(G);

    $("final-card").className = `player-card tier-${tier.id}`;
    $("final-tier").textContent = tier.label;
    $("final-flag").innerHTML = `${flagHtml(G.nationality)} ${esc(G.name)}`;
    $("final-age").textContent = !G.careerEnded ? `Retraite à ${G.age} ans` : dignifiedInjuryEnd() ? `Carrière écourtée à ${G.age} ans` : "Carrière interrompue";
    $("final-title").textContent = narrative.title;
    $("final-ovr").textContent = rating;
    $("final-pos").textContent = POS_SHORT[G.position.id] || G.position.icon;
    const flagImgEl = $("final-flag-img");
    if (G.nationality.img) {
      flagImgEl.src = encodeURI(G.nationality.img);
      flagImgEl.style.display = "";
    } else {
      flagImgEl.style.display = "none";
    }
    const nickname = nicknameFor();
    $("final-nickname").textContent = nickname || "";
    const country = E.countryOf(G.club.countryId);
    $("final-club").textContent = (!G.careerEnded || dignifiedInjuryEnd()) ? `Dernier club : ${G.club.name} (${country ? country.name : ""})` : "";
    $("final-trajectory").textContent = `${G.trajectory.label}${G.archetype ? ` · ${G.archetype.icon} ${G.archetype.name}` : ""} — ${G.trajectory.desc}`;

    // Percentile mondial : où se situe cette carrière parmi tous les destins
    // possibles (distribution simulée). Masqué si carrière brisée ou table absente.
    const pctEl = $("final-percentile");
    if (pctEl) {
      if ((!G.careerEnded || dignifiedInjuryEnd()) && SCORE_PERCENTILES.length) {
        const p = percentileForScore(E.computeCareerScore(G));
        pctEl.textContent = `🌍 Meilleure carrière que ${p} % des destins simulés`;
        pctEl.style.display = "";
      } else {
        pctEl.textContent = "";
        pctEl.style.display = "none";
      }
    }

    $("final-stats").innerHTML = [
      statRowHtml("Matchs joués", G.totals.matches),
      statRowHtml(isGk ? "Clean sheets" : "Buts marqués", isGk ? G.totals.cleanSheets : G.totals.goals),
      statRowHtml("Passes décisives", G.totals.assists),
      ...((G.captainMatches || 0) > 0 ? [statRowHtml("©️ Matchs comme capitaine", G.captainMatches)] : []),
      statRowHtml(`${flagHtml(G.nationality)} Sélections`, G.natTeam.caps),
      statRowHtml("💰 Fortune", E.fmtMoney(G.money)),
    ].join("");

    // Championnats détaillés par pays et division (France D1, Brésil D2…)
    const titleGroups = {};
    (G.leagueTitlesDetail || []).forEach((x) => {
      const c = E.countryOf(x.countryId);
      // Élite et D1 = même championnat national (le top-flight) : on les fusionne
      // dans le palmarès (« Champion — Espagne · D1 »), sinon un titre gagné dans
      // un club élite compterait à part d'un titre gagné dans un club D1.
      const divLabel = E.divShort(x.level === "elite" ? "d1" : x.level, x.countryId);
      const key = `${c ? c.name : x.countryId} · ${divLabel}`;
      titleGroups[key] = (titleGroups[key] || 0) + 1;
    });
    const leagueRows = Object.keys(titleGroups).length
      ? Object.entries(titleGroups).map(([key, n]) => statRowHtml(`${COMPETITIONS.league.icon} Champion — ${esc(key)}`, n, true))
      : [statRowHtml(`${COMPETITIONS.league.icon} ${COMPETITIONS.league.name}`, 0, false)];

    // Coupes continentales distinctes (Europe / Amériques / Asie)
    const contGroups = {};
    (G.continentalDetail || []).forEach((x) => { contGroups[x.continent] = (contGroups[x.continent] || 0) + 1; });
    let contRows;
    if (Object.keys(contGroups).length) {
      contRows = Object.entries(contGroups).map(([cont, n]) => {
        const cup = CONTINENTAL_CUPS[cont] || CONTINENTAL_CUPS.eu;
        return statRowHtml(`${cup.icon} ${cup.name}`, n, true);
      });
    } else if (t.continental > 0) {
      // Rétrocompatibilité : total connu sans détail → Europe par défaut
      contRows = [statRowHtml(`${CONTINENTAL_CUPS.eu.icon} ${CONTINENTAL_CUPS.eu.name}`, t.continental, true)];
    } else {
      contRows = [statRowHtml(`${CONTINENTAL_CUPS.eu.icon} ${CONTINENTAL_CUPS.eu.name}`, 0, false)];
    }

    // Championnat continental de sélection, nommé selon le continent du joueur
    const playerCont = (E.countryOf(G.nationality.homeCountryId) || {}).continent;
    const ntCup = NATIONAL_CUPS[playerCont];
    const ntCupRow = ntCup ? [statRowHtml(`${ntCup.icon} ${ntCup.name}`, t.contInt || 0, (t.contInt || 0) > 0)] : [];
    // Ligue des Sélections : n'a de sens (et n'est jouable) que pour les nations européennes
    const nlRow = (playerCont === "eu" || (t.natLeague || 0) > 0)
      ? [statRowHtml(`${NATIONS_LEAGUE.icon} ${NATIONS_LEAGUE.name}`, t.natLeague || 0, (t.natLeague || 0) > 0)]
      : [];

    $("final-trophies").innerHTML = [
      statRowHtml(`${COMPETITIONS.worldCup.icon} ${COMPETITIONS.worldCup.name}`, t.worldCup, t.worldCup > 0),
      ...ntCupRow,
      ...nlRow,
      statRowHtml(`${COMPETITIONS.ballon.icon} ${COMPETITIONS.ballon.name}`, t.ballon, t.ballon > 0),
      ...(t.ballon === 0 && G.bestBallonRank
        ? [statRowHtml(`⭐ Meilleur classement Ballon d'Or`, `${G.bestBallonRank}ᵉ`, G.bestBallonRank <= 10)]
        : []),
      ...contRows,
      statRowHtml(`${COMPETITIONS.continental2.icon} ${COMPETITIONS.continental2.name}`, t.continental2 || 0, (t.continental2 || 0) > 0),
      statRowHtml(`${COMPETITIONS.continental3.icon} ${COMPETITIONS.continental3.name}`, t.continental3 || 0, (t.continental3 || 0) > 0),
      ...leagueRows,
      statRowHtml(`${COMPETITIONS.cup.icon} ${COMPETITIONS.cup.name}`, t.cup, t.cup > 0),
      statRowHtml(`${COMPETITIONS.goldenBoot.icon} ${COMPETITIONS.goldenBoot.name}`, t.goldenBoot, t.goldenBoot > 0),
    ].join("");

    // Distinctions individuelles accumulées
    const awardEntries = Object.entries(G.awardCounts).filter(([id]) => AWARDS[id]);
    const awardsBlock = $("final-awards");
    const awardsLabel = $("final-awards-label");
    if (awardEntries.length) {
      awardsBlock.style.display = "";
      awardsLabel.style.display = "";
      awardsBlock.innerHTML = awardEntries
        .sort((a, b) => b[1] - a[1])
        .map(([id, n]) => statRowHtml(`${AWARDS[id].icon} ${AWARDS[id].name}`, n > 1 ? `×${n}` : "✓", true))
        .join("");
    } else {
      awardsBlock.style.display = "none";
      awardsLabel.style.display = "none";
    }

    $("final-traits").innerHTML = G.traits.length
      ? G.traits.map((id) => { const tr = TRAITS[id]; return `<span class="trait-chip">${tr.icon} ${esc(tr.name)}</span>`; }).join("")
      : "";

    $("final-path").innerHTML = G.transferHistory
      .map((step) => {
        const tag = step.loan ? ` <span class="loan-tag">Prêt</span>` : step.loanReturn ? ` <span class="loan-tag">Retour de prêt</span>` : "";
        const stepCid = step.countryId || (COUNTRIES.find((c) => c.name === step.countryName) || {}).id;
        const lvlTag = step.level ? `<span class="level-tag level-${step.level}">${esc(stepCid ? E.divShort(step.level, stepCid) : LEVELS[step.level].short)}</span>` : "";
        return `<div class="path-step"><span class="path-age">${step.age} ans</span><span class="path-club">${lvlTag}${esc(step.toClubName)}${tag} <span class="path-country">(${esc(step.countryName)})</span>${step.fee != null ? ` · ${E.fmtMoney(step.fee)}` : ""}</span></div>`;
      })
      .join("");

    // Historique saison par saison : division affichée chaque année,
    // avec montées (⬆) et descentes (⬇) visibles d'un coup d'œil.
    let prevSeason = null;
    $("final-seasons").innerHTML = G.seasons
      .map((se) => {
        // Un titre de division inférieure (D2/D3/Rég.) n'est pas poussé dans
        // se.trophies (pour ne pas peser sur le Ballon d'Or) : on ajoute quand
        // même l'icône de champion ici pour qu'il apparaisse dans le tableau.
        const champIcon = (se.divisionTitle && !(se.trophies || []).includes("league")) ? COMPETITIONS.league.icon : "";
        const icons = champIcon + (se.trophies || []).map((tr) => (COMPETITIONS[tr] ? COMPETITIONS[tr].icon : "")).join("");
        const perf = isGk ? `${se.cleanSheets || 0} cs` : `${se.goals} b`;
        let moveArrow = "";
        if (prevSeason && prevSeason.clubName === se.clubName && se.level && prevSeason.level && se.level !== prevSeason.level) {
          moveArrow = LEVELS[se.level].rank > LEVELS[prevSeason.level].rank
            ? ` <span class="season-up">⬆</span>` : ` <span class="season-down">⬇</span>`;
        }
        prevSeason = se;
        // Drapeau du pays du club cette saison-là. countryId ajouté récemment :
        // repli par recherche du club par son nom pour les anciennes sauvegardes.
        const seCountryId = se.countryId || (CLUBS.find((cl) => cl.name === se.clubName) || {}).countryId;
        const seCountry = COUNTRIES.find((c) => c.id === seCountryId);
        const seFlag = seCountry ? flagHtml(seCountry) : "";
        return `<div class="season-row">
          <span class="season-age">${se.age}</span>
          <span class="season-club">${se.level ? `<span class="level-tag level-${se.level}">${esc(seCountryId ? E.divShort(se.level, seCountryId) : LEVELS[se.level].short)}</span>` : ""}${seFlag ? `${seFlag} ` : ""}${esc(se.clubName)}${moveArrow}${se.onLoan ? ` <span class="loan-tag">Prêt</span>` : ""}</span>
          <span class="season-stats">${se.matches} m · ${perf} · ${se.rating.toFixed(1)}</span>
          <span class="season-icons">${icons}</span>
        </div>`;
      })
      .join("");

    // Face à face avec le rival
    const rc = $("rival-compare");
    function col(s, label) {
      const st = s.trophies;
      const tierTitle = E.buildNarrative(s).title;
      return `<div class="rival-col">
        <p class="rival-col-name">${label}</p>
        <p class="rival-col-tier">${esc(tierTitle)}</p>
        <div class="rival-col-stats">
          ${statRowHtml("OVR max", s.peakOvr)}
          ${statRowHtml("Buts", s.totals.goals)}
          ${statRowHtml("🏆 CDM", st.worldCup)}
          ${statRowHtml("⭐ Ballon", st.ballon)}
          ${statRowHtml("🥇 Contin.", st.continental)}
          ${statRowHtml("🎖️ Titres", st.league)}
        </div></div>`;
    }
    // Label "Face à face" (juste au-dessus de la comparaison) : masqué en
    // consultation Panthéon, où aucun rival n'est stocké.
    const faceLabel = rc.previousElementSibling;
    if (faceLabel && faceLabel.classList.contains("pc-section-label")) faceLabel.style.display = review ? "none" : "";
    if (review) {
      rc.innerHTML = "";
      $("rival-verdict").textContent = "";
    } else if (R) {
      rc.innerHTML = col(G, "Vous") + col(R, `${flagHtml(R.nationality)} ${esc(R.name)}`);
      $("rival-verdict").textContent = E.compareVerdict(G, R);
    } else { // duel-création : pas encore d'adversaire
      rc.innerHTML = `<p class="duel-intro-hint">Personne ne t'a encore défié en retour. Partage ton défi pour comparer vos carrières !</p>`;
      $("rival-verdict").textContent = "";
    }

    const duelBtn = $("btn-duel-share");
    if (duelBtn) {
      duelBtn.style.display = (!review && G.duel) ? "" : "none";
      if (!review && G.duel) duelBtn.textContent = G.duelRole === "respond" ? `↩️ Renvoyer à ${G.duelFromLabel}` : "🆚 Défier un ami";
    }
    const replayBtn = $("btn-replay");
    if (replayBtn) replayBtn.textContent = review ? "🏛️ Retour au Panthéon" : "Rejouer une carrière";

    $("final-story").textContent = narrative.story;
    $("final-untaken").textContent = E.buildUntakenPath(G) || "";

    if (newBadges.length) {
      const names = newBadges.map((id) => { const b = BADGES.find((x) => x.id === id); return b ? `${b.icon} ${b.name}` : id; });
      $("final-badge-note").textContent = `Nouveau badge débloqué : ${names.join(", ")}`;
    } else {
      $("final-badge-note").textContent = "";
    }
    $("final-quest-note").textContent = questNotes && questNotes.length
      ? `🎯 ${questNotes.length > 1 ? "Quêtes accomplies" : "Quête accomplie"} : ${questNotes.join(" · ")}`
      : "";

    const dailyNote = $("final-daily-note");
    if (dailyNote) {
      if (dailyResult) {
        let msg = dailyResult.stale
          ? `🗓️ Défi du ${dailyResult.date} — ${dailyResult.score} pts (défi expiré : hors classement du jour, série intacte)`
          : `🗓️ Défi du jour — ${dailyResult.score} pts`;
        if (dailyResult.isAllTimeBest) msg += " · 🏆 nouveau record absolu !";
        else if (dailyResult.isTodayBest) msg += " · ✨ meilleur score du jour";
        if (!dailyResult.stale && dailyResult.streak > 1) msg += ` · 🔥 série de ${dailyResult.streak} jours`;
        dailyNote.textContent = msg;
        dailyNote.style.display = "";
      } else {
        dailyNote.textContent = "";
        dailyNote.style.display = "none";
      }
    }

    const jetonNote = $("final-jeton-note");
    if (jetonNote) {
      jetonNote.textContent = jetonBonus > 0 ? `🪙 +${jetonBonus} jeton${jetonBonus > 1 ? "s" : ""} pour la boutique` : "";
      jetonNote.style.display = jetonBonus > 0 ? "" : "none";
    }

    // Mode Histoire : verdict face à la légende + révélation de l'inspiration
    const legendNote = $("final-legend-note");
    if (legendNote) {
      if (storyResult) {
        const st = storyResult.story;
        const verdict = storyResult.beaten
          ? `👑 ${storyResult.score} pts — vous avez fait MIEUX que la légende (${st.baseline} pts) !`
          : `${st.icon} ${storyResult.score} pts — la légende reste devant (${st.baseline} pts). Réécrivez l'histoire.`;
        const lived = Object.entries(st.moments || {}).filter(([f]) => G.flags[f]).map(([, label]) => label);
        legendNote.innerHTML = `${esc(verdict)}${lived.length ? `<br><span class="legend-moments">Moments de légende vécus : ${esc(lived.join(" · "))}</span>` : ""}<br><span class="legend-reveal">${esc(st.reveal)}</span>`;
        legendNote.style.display = "";
      } else {
        legendNote.textContent = "";
        legendNote.style.display = "none";
      }
    }

    const confetti = $("confetti-layer");
    confetti.innerHTML = "";
    if (t.worldCup > 0 || t.ballon > 0 || (t.contInt || 0) > 0) spawnConfetti(confetti);
  }

  function spawnConfetti(container, count = 30) {
    const colors = ["#d9b45c", "#f0d38c", "#4f7cff", "#4caf7d", "#ffffff"];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 0.6}s`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(piece);
    }
  }

  // --- Export de la fiche en image ------------------------------------------------
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "", currentY = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Palette de la carte selon le palier de carrière (bronze → icône).
  // Fond vert marque (#087B4B assombri) pour tous : l'accent porte le palier.
  const TIER_STYLES = {
    bronze: { accent: "#c98a4b", soft: "#e8bd8f", bgTop: "#0b6b42", bgBottom: "#03301d" },
    argent: { accent: "#aebcd0", soft: "#e2eaf5", bgTop: "#0b6b42", bgBottom: "#03301d" },
    or: { accent: "#e8c34a", soft: "#f0d38c", bgTop: "#0b6b42", bgBottom: "#03301d" },
    legende: { accent: "#7fd0ff", soft: "#cdeeff", bgTop: "#0b6b42", bgBottom: "#03301d" },
    icone: { accent: "#c9a2ff", soft: "#ecdcff", bgTop: "#0b6b42", bgBottom: "#03301d" },
  };
  // Rang à étoiles affiché sous le ruban de palier (1 à 5).
  const TIER_RANK = { bronze: 1, argent: 2, or: 3, legende: 4, icone: 5 };

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  // Petite étoile à 5 branches (rang de palier sous le ruban).
  function drawStar(ctx, cx, cy, r, filled, color) {
    const spikes = 5, step = Math.PI / spikes;
    ctx.beginPath();
    let rot = -Math.PI / 2;
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * r * 0.42, cy + Math.sin(rot) * r * 0.42);
      rot += step;
    }
    ctx.closePath();
    if (filled) { ctx.fillStyle = color; ctx.fill(); }
    else { ctx.strokeStyle = rgba(color, 0.5); ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  // Ruban de palier façon décoration officielle (bannière à pointes + queues).
  function drawRibbon(ctx, cx, y, w, h, color) {
    const notch = 10, tailW = 16, tailH = 11;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, y);
    ctx.lineTo(cx + w / 2, y);
    ctx.lineTo(cx + w / 2 + notch, y + h / 2);
    ctx.lineTo(cx + w / 2, y + h);
    ctx.lineTo(cx - w / 2, y + h);
    ctx.lineTo(cx - w / 2 - notch, y + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = color;
    [-1, 1].forEach((side) => {
      const bx = cx + side * (w / 2 - 6);
      ctx.beginPath();
      ctx.moveTo(bx - tailW / 2, y + h);
      ctx.lineTo(bx + tailW / 2, y + h);
      ctx.lineTo(bx, y + h + tailH);
      ctx.closePath();
      ctx.fill();
    });
  }

  // Couronne de laurier autour du médaillon OVR : deux branches symétriques
  // (tige + feuilles fanées le long d'un arc) nouées sous le cercle.
  function drawLaurel(ctx, cx, cy, radius, color, leafCount, maxThetaDeg) {
    const maxTheta = (maxThetaDeg * Math.PI) / 180;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.strokeStyle = rgba(color, 0.5);
      ctx.lineWidth = 2;
      for (let i = 0; i <= 40; i++) {
        const theta = (i / 40) * maxTheta;
        const x = cx + side * radius * Math.sin(theta);
        const yy = cy + radius * Math.cos(theta);
        if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      for (let i = 1; i <= leafCount; i++) {
        const tt = i / leafCount;
        const theta = tt * maxTheta;
        const x = cx + side * radius * Math.sin(theta);
        const yy = cy + radius * Math.cos(theta);
        const tangent = Math.atan2(-Math.sin(theta), side * Math.cos(theta));
        const len = 24 - tt * 9, wid = 11 - tt * 4;
        ctx.save();
        ctx.translate(x, yy);
        ctx.rotate(tangent);
        ctx.beginPath();
        ctx.ellipse(0, 0, len / 2, wid / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }
    });
    const knotY = cy + radius;
    ctx.beginPath();
    ctx.arc(cx, knotY, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(cx, knotY);
      ctx.lineTo(cx + side * 9, knotY + 16);
      ctx.lineTo(cx + side * 3, knotY + 14);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  // Séparateur de section façon certificat : libellé centré flanqué de
  // filets dorés + petits losanges (remplace un titre de bloc classique).
  function drawSectionDivider(ctx, cx, y, label, color, totalW) {
    ctx.font = "800 20px Poppins, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    const labelW = ctx.measureText(label).width;
    ctx.strokeStyle = rgba(color, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - totalW / 2, y);
    ctx.lineTo(cx - labelW / 2 - 16, y);
    ctx.moveTo(cx + labelW / 2 + 16, y);
    ctx.lineTo(cx + totalW / 2, y);
    ctx.stroke();
    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.translate(cx + side * (labelW / 2 + 10), y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    });
    ctx.fillStyle = color;
    ctx.fillText(label, cx, y + 6);
  }

  // skipImages : régénère sans drawImage (repli si le canvas est "tainté",
  // ex. jeu ouvert en file:// — le téléchargement doit toujours marcher).
  // Traitement « décoration officielle » : ruban de palier à pointes, rang à
  // étoiles, couronne de laurier autour du médaillon, séparateurs à filets
  // dorés, citation en exergue — plus prestigieux qu'une simple carte FUT.
  function generateCardImage(skipImages) {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1750;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const narrative = E.buildNarrative(G);
    const isGk = G.position.id === "gk";
    const t = G.trophies;
    const tier = cardTierFor();
    const TS = TIER_STYLES[tier.id];
    const rank = TIER_RANK[tier.id] || 1;
    const rating = E.careerRating(G);
    const darkOnAccent = tier.id === "icone" || tier.id === "legende" ? "#1c1030" : "#241a06";

    // Fond teinté selon le palier + halo cérémonial
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, TS.bgTop);
    bg.addColorStop(1, TS.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let halo = ctx.createRadialGradient(cx, 230, 30, cx, 230, 480);
    halo.addColorStop(0, rgba(TS.accent, 0.26));
    halo.addColorStop(1, rgba(TS.accent, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, canvas.width, 640);

    // Cadre double filet + pointes d'angle façon certificat
    ctx.strokeStyle = rgba(TS.accent, 0.8);
    ctx.lineWidth = 5;
    roundRect(ctx, 14, 14, canvas.width - 28, canvas.height - 28, 26);
    ctx.stroke();
    ctx.strokeStyle = rgba(TS.accent, 0.3);
    ctx.lineWidth = 1.5;
    roundRect(ctx, 25, 25, canvas.width - 50, canvas.height - 50, 20);
    ctx.stroke();
    [[36, 36, 1, 1], [canvas.width - 36, 36, -1, 1], [36, canvas.height - 36, 1, -1], [canvas.width - 36, canvas.height - 36, -1, -1]].forEach(([px, py, sx, sy]) => {
      ctx.strokeStyle = TS.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, py + sy * 20);
      ctx.lineTo(px, py);
      ctx.lineTo(px + sx * 20, py);
      ctx.stroke();
    });

    let y = 34;

    // Ruban de palier
    drawRibbon(ctx, cx, y, 250, 38, TS.accent);
    ctx.textAlign = "center";
    ctx.fillStyle = darkOnAccent;
    ctx.font = "800 20px Poppins, 'Segoe UI', sans-serif";
    ctx.fillText(tier.label, cx, y + 25);
    y += 58;

    // Rang à étoiles (1 à 5 selon le palier)
    for (let i = 0; i < 5; i++) drawStar(ctx, cx - 44 + i * 22, y, 7, i < rank, TS.accent);
    y += 34;

    // Couronne de laurier + médaillon OVR (note de carrière)
    const ovrCy = y + 92;
    drawLaurel(ctx, cx, ovrCy, 106, TS.accent, 7, 150);
    ctx.beginPath();
    ctx.arc(cx, ovrCy, 84, 0, Math.PI * 2);
    ctx.fillStyle = rgba(TS.accent, 0.14);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba(TS.accent, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, ovrCy, 75, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(TS.accent, 0.4);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "700 13px Poppins, 'Segoe UI', sans-serif";
    ctx.fillStyle = rgba(TS.accent, 0.9);
    ctx.fillText("NOTE DE CARRIÈRE", cx, ovrCy - 38);
    ctx.font = "800 66px Poppins, 'Segoe UI', sans-serif";
    ctx.fillStyle = TS.soft;
    ctx.fillText(String(rating), cx, ovrCy + 22);
    y = ovrCy + 106 + 40; // sous le nœud du laurier

    // Identité (drapeau en image, fiable sur tous les systèmes — même
    // astuce de centrage manuel qu'avant : nom centré autour de cx+30,
    // drapeau calé à gauche pour que l'ensemble paraisse centré)
    ctx.textAlign = "center";
    ctx.font = "800 44px Poppins, 'Segoe UI', sans-serif";
    const nameW = ctx.measureText(G.name).width;
    const flagImg = NAT_FLAG_IMGS[G.nationality.id];
    y += 34;
    if (!skipImages && flagImg && flagImg.complete && flagImg.naturalWidth > 0) {
      ctx.drawImage(flagImg, cx - nameW / 2 - 66, y - 30, 52, 34);
      ctx.fillStyle = "#f2f4fb";
      ctx.fillText(G.name, cx + 30, y);
    } else {
      // Repli : pastille aux couleurs du palier avec le code pays,
      // pour que le drapeau ne disparaisse jamais de la carte
      ctx.fillStyle = rgba(TS.accent, 0.25);
      roundRect(ctx, cx - nameW / 2 - 66, y - 30, 52, 34, 6);
      ctx.fill();
      ctx.strokeStyle = TS.accent;
      ctx.lineWidth = 2;
      roundRect(ctx, cx - nameW / 2 - 66, y - 30, 52, 34, 6);
      ctx.stroke();
      ctx.fillStyle = TS.soft;
      ctx.font = "800 20px Poppins, 'Segoe UI', sans-serif";
      ctx.fillText(G.nationality.id.toUpperCase(), cx - nameW / 2 - 40, y - 6);
      ctx.fillStyle = "#f2f4fb";
      ctx.font = "800 44px Poppins, 'Segoe UI', sans-serif";
      ctx.fillText(G.name, cx + 30, y);
    }
    y += 40;
    ctx.fillStyle = "#b9c2e0";
    ctx.font = "600 26px Poppins, 'Segoe UI', sans-serif";
    ctx.fillText(`${G.position.icon} ${G.position.name}${G.archetype ? ` · ${G.archetype.name}` : ""} · ${G.careerEnded ? "Carrière interrompue" : `${careerStartYear()} – ${G.year}`}`, cx, y);
    y += 64;

    ctx.fillStyle = TS.soft;
    ctx.font = "700 40px Poppins, 'Segoe UI', sans-serif";
    y = wrapText(ctx, narrative.title.toUpperCase(), cx, y, 690, 48);
    const nickname = nicknameFor();
    ctx.fillStyle = "#8d97ba";
    ctx.font = "italic 400 22px Poppins, 'Segoe UI', sans-serif";
    ctx.fillText(nickname ? `${nickname} · ${G.trajectory.label}` : G.trajectory.label, cx, y + 4);
    y += 50;

    // Bloc statistiques (2 colonnes), titré par un séparateur à filets
    drawSectionDivider(ctx, cx, y, "STATISTIQUES", TS.accent, 300);
    y += 30;
    const boxX = 56, boxW = canvas.width - 112;
    const stats = [
      ["Matchs", String(G.totals.matches)],
      [isGk ? "Clean sheets" : "Buts", String(isGk ? G.totals.cleanSheets : G.totals.goals)],
      ["Passes déc.", String(G.totals.assists)],
      ["Sélections", String(G.natTeam.caps)],
      ["Distinctions", String(E.totalAwards(G))],
      ["Fortune", E.fmtMoney(G.money)],
    ];
    const colW = boxW / 3;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, boxX, y, boxW, 170, 18);
    ctx.fill();
    stats.forEach(([label, val], i) => {
      const colX = boxX + colW * (i % 3) + colW / 2;
      const rowYy = y + 44 + Math.floor(i / 3) * 82;
      ctx.textAlign = "center";
      ctx.fillStyle = "#f2f4fb";
      ctx.font = "800 30px Poppins, 'Segoe UI', sans-serif";
      ctx.fillText(val, colX, rowYy);
      ctx.fillStyle = "#8d97ba";
      ctx.font = "600 17px Poppins, 'Segoe UI', sans-serif";
      ctx.fillText(label.toUpperCase(), colX, rowYy + 28);
    });
    y += 170 + 54;

    // Palmarès : médaillon doré derrière l'icône de chaque trophée obtenu
    const canvasContGroups = {};
    (G.continentalDetail || []).forEach((x) => { canvasContGroups[x.continent] = (canvasContGroups[x.continent] || 0) + 1; });
    const canvasContRows = Object.keys(canvasContGroups).length
      ? Object.entries(canvasContGroups).map(([cont, n]) => {
          const cup = CONTINENTAL_CUPS[cont] || CONTINENTAL_CUPS.eu;
          return [`${cup.icon} ${cup.name}`, n];
        })
      : [[`${CONTINENTAL_CUPS.eu.icon} ${CONTINENTAL_CUPS.eu.name}`, t.continental]];
    const trophyRows = [
      [`🏆 ${COMPETITIONS.worldCup.name}`, t.worldCup],
      [`⭐ ${COMPETITIONS.ballon.name}`, t.ballon],
      ...canvasContRows,
      // C2/C3 : n'apparaissent QUE si remportées (évite d'allonger la carte partageable)
      ...((t.continental2 || 0) > 0 ? [[`🥈 ${COMPETITIONS.continental2.name}`, t.continental2]] : []),
      ...((t.continental3 || 0) > 0 ? [[`🥉 ${COMPETITIONS.continental3.name}`, t.continental3]] : []),
      ...((t.natLeague || 0) > 0 ? [[`${NATIONS_LEAGUE.icon} ${NATIONS_LEAGUE.name}`, t.natLeague]] : []),
      [`🎖️ ${COMPETITIONS.league.name}`, t.league],
      [`🏵️ ${COMPETITIONS.cup.name}`, t.cup],
      [`👟 ${COMPETITIONS.goldenBoot.name}`, t.goldenBoot],
    ];
    drawSectionDivider(ctx, cx, y, "PALMARÈS", TS.accent, 300);
    y += 30;
    const trophyBoxH = 34 + trophyRows.length * 46;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, boxX, y, boxW, trophyBoxH, 18);
    ctx.fill();
    let rowY = y + 38;
    trophyRows.forEach(([label, count]) => {
      const earned = count > 0;
      ctx.textAlign = "left";
      ctx.fillStyle = earned ? TS.soft : "#5d6684";
      ctx.font = "400 25px Poppins, 'Segoe UI', sans-serif";
      ctx.fillText(label, boxX + 26, rowY);
      // Compteur : pastille pleine pour les trophées obtenus (badge net,
      // à droite), simple chiffre grisé pour ceux jamais remportés.
      if (earned) {
        ctx.font = "800 24px Poppins, 'Segoe UI', sans-serif";
        const numW = ctx.measureText(String(count)).width;
        const pillW = Math.max(38, numW + 22), pillH = 30;
        const pillX = boxX + boxW - 26 - pillW, pillY = rowY - 22;
        ctx.fillStyle = rgba(TS.accent, 0.22);
        roundRect(ctx, pillX, pillY, pillW, pillH, 15);
        ctx.fill();
        ctx.fillStyle = TS.soft;
        ctx.textAlign = "center";
        ctx.fillText(String(count), pillX + pillW / 2, rowY);
      } else {
        ctx.textAlign = "right";
        ctx.font = "800 25px Poppins, 'Segoe UI', sans-serif";
        ctx.fillText(String(count), boxX + boxW - 26, rowY);
      }
      rowY += 46;
    });
    y = rowY + 46;

    // Récit en exergue (grand guillemet doré, texte en italique)
    ctx.textAlign = "center";
    ctx.fillStyle = rgba(TS.accent, 0.55);
    ctx.font = "800 70px Georgia, 'Times New Roman', serif";
    ctx.fillText("“", cx, y);
    y += 22;
    ctx.fillStyle = "#c9d1ea";
    ctx.font = "italic 400 23px Poppins, 'Segoe UI', sans-serif";
    y = wrapText(ctx, narrative.story, cx, y, 660, 34);

    // Filet doré de clôture avant le pied de marque
    y += 20;
    ctx.strokeStyle = rgba(TS.accent, 0.4);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 60, y);
    ctx.lineTo(cx + 60, y);
    ctx.stroke();

    // Pied de marque
    ctx.fillStyle = TS.accent;
    ctx.font = "800 26px Poppins, 'Segoe UI', sans-serif";
    ctx.fillText(BRAND.game, cx, canvas.height - 74);
    ctx.fillStyle = "#7d86a8";
    ctx.font = "400 18px Poppins, 'Segoe UI', sans-serif";
    ctx.fillText(BRAND.tagline, cx, canvas.height - 44);
    return canvas;
  }

  function downloadCardImage() {
    const filename = `open-eleven-${G.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    // Blob + URL d'objet plutôt qu'une data URL : la carte pèse ~1,2 Mo et
    // certaines data URL de cette taille sont refusées. Surtout, l'ancre est
    // AJOUTÉE AU DOM avant le clic : Firefox ignore purement et simplement un
    // .click() sur une ancre détachée (Chrome le tolère), d'où le « rien ».
    const save = (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    // Canvas éventuellement "tainté" (images en file://) : repli sans images.
    const render = (skipImages) => {
      try {
        generateCardImage(skipImages).toBlob((blob) => {
          if (blob) save(blob);
          else if (!skipImages) render(true);
        }, "image/png");
      } catch (e) {
        if (!skipImages) render(true);
      }
    };
    render(false);
  }

  // --- Partage (Web Share natif avec image, sinon X/Twitter) -------------------
  function buildShareText() {
    const narrative = E.buildNarrative(G);
    const t = G.trophies;
    const bits = [];
    if (t.ballon) bits.push(`${t.ballon}× Ballon d'Or`);
    if (t.worldCup) bits.push(`${t.worldCup}× Coupe du Monde`);
    if (t.continental) bits.push(`${t.continental}× Coupe des Champions`);
    if (t.continental2) bits.push(`${t.continental2}× ${COMPETITIONS.continental2.name}`);
    if (t.continental3) bits.push(`${t.continental3}× ${COMPETITIONS.continental3.name}`);
    if (t.league) bits.push(`${t.league}× Champion`);
    const isGk = G.position.id === "gk";
    const perf = isGk ? `${G.totals.cleanSheets} clean sheets` : `${G.totals.goals} buts`;
    const link = BRAND.url ? ` ${BRAND.url}` : "";
    return `⚽ ${G.name}, ${G.position.name.toLowerCase()} — « ${narrative.title} » (note de carrière ${E.careerRating(G)}, ${perf}).${bits.length ? ` Palmarès : ${bits.join(", ")}.` : ""} Écris ta légende sur ${BRAND.game} !${link} ${BRAND.hashtag || ""}`.trim();
  }

  function shareCard() {
    const text = buildShareText();
    // Détection SYNCHRONE du partage natif avec fichier (mobile) : le
    // moindre await avant window.open ferait bloquer la popup X.
    let nativeOk = false;
    try {
      const probe = new File([new Blob(["x"])], "probe.png", { type: "image/png" });
      nativeOk = !!(navigator.canShare && navigator.canShare({ files: [probe] }));
    } catch (e) { nativeOk = false; }
    track("share", { method: nativeOk ? "native" : "twitter" });

    if (nativeOk) {
      (async () => {
        try {
          let blob;
          try {
            blob = await new Promise((res, rej) => { try { generateCardImage().toBlob(res, "image/png"); } catch (e) { rej(e); } });
          } catch (e) {
            blob = await new Promise((res) => generateCardImage(true).toBlob(res, "image/png"));
          }
          const file = new File([blob], "open-eleven.png", { type: "image/png" });
          await navigator.share({ files: [file], text });
        } catch (e) {
          if (e && e.name === "AbortError") return;
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        }
      })();
      return;
    }
    // Desktop : ouverture immédiate du post X pré-rempli (dans le clic,
    // donc jamais bloquée) + téléchargement de la carte à joindre au post.
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    downloadCardImage();
  }

  // --- Sauvegarde & reprise de la carrière en cours ------------------------------
  // La partie vit uniquement en mémoire (G, R) : sans sauvegarde, fermer l'onglet
  // efface une carrière de 20 min. On écrit un instantané en localStorage au DÉBUT
  // de chaque saison (point de reprise propre, avant le tirage d'événement) et on
  // l'efface à la retraite. On perd au pire la saison en cours, jamais la carrière.
  const CURRENT_KEY = "openEleven_current";
  const SAVE_VERSION = 1;

  function saveCurrentGame() {
    if (!G) return;
    try {
      localStorage.setItem(CURRENT_KEY, JSON.stringify({
        v: SAVE_VERSION, ts: Date.now(),
        g: G, r: R, legendGuest, legendGuestUsed,
        seedState: E.getSeedState(), // null (normal) ou état PRNG (défi) → reprise déterministe
      }));
    } catch (e) { /* stockage indisponible : le jeu continue, sans reprise possible */ }
  }

  function clearCurrentGame() {
    try { localStorage.removeItem(CURRENT_KEY); } catch (e) { /* ignore */ }
  }

  function readCurrentGame() {
    try {
      const snap = JSON.parse(localStorage.getItem(CURRENT_KEY) || "null");
      return snap && snap.v === SAVE_VERSION && snap.g ? snap : null;
    } catch (e) { return null; }
  }

  // Après JSON.parse, les objets de données (club, nationalité, poste…) sont des
  // COPIES : on les re-relie aux objets canoniques par id, pour retrouver
  // l'identité de référence et récupérer un data.js éventuellement mis à jour.
  // Repli sur la copie stockée si l'id a disparu (données éditées entre-temps).
  // s.prevClub reste volontairement une copie (niveau figé au moment du transfert).
  function relinkCareer(s) {
    if (!s) return s;
    const link = (arr, obj) => (obj && arr.find((x) => x.id === obj.id)) || obj;
    s.nationality = link(NATIONALITIES, s.nationality);
    s.origin = link(ORIGINS, s.origin);
    s.position = link(POSITIONS, s.position);
    s.lifestyle = link(LIFESTYLES, s.lifestyle);
    s.entourage = link(ENTOURAGES, s.entourage);
    s.trajectory = link(TRAJECTORIES, s.trajectory);
    s.club = link(CLUBS, s.club);
    if (s.archetype) s.archetype = link(ARCHETYPES, s.archetype);
    if (s.loan && s.loan.parentClub) s.loan.parentClub = link(CLUBS, s.loan.parentClub);
    return s;
  }

  function resumeCareer() {
    const snap = readCurrentGame();
    if (!snap) { refreshHomeButtons(); return; }
    E.setSeedState(snap.seedState); // restaure le hasard (déterministe pour un défi ; null = Math.random)
    G = relinkCareer(snap.g);
    R = snap.r ? relinkCareer(snap.r) : (G.duel ? null : E.newRival(G.position));
    legendGuest = snap.legendGuest || null;
    legendGuestUsed = !!snap.legendGuestUsed;
    prevOvr = null;
    currentEvent = null; lastOutcome = null; lastReport = null;
    track("career_resumed", { age: G.age, year: G.year });
    showScreen("screen-game");
    updateHeader();
    renderSeasonEvent();
  }

  // Accueil : « Reprendre » en primaire quand une carrière est en cours ;
  // « Commencer » sinon. Éviter d'écraser une partie par mégarde (cf. btn-start).
  function refreshHomeButtons() {
    const snap = readCurrentGame();
    const resumeBtn = $("btn-resume");
    const startBtn = $("btn-start");
    if (!resumeBtn || !startBtn) return;
    if (snap) {
      const g = snap.g;
      const clubName = g.club && g.club.name ? ` · ${esc(g.club.name)}` : "";
      resumeBtn.style.display = "";
      resumeBtn.innerHTML = `▶️ Reprendre ${g.dailyDate ? "le défi " : g.storyId ? "l'histoire " : ""}— ${esc(g.name)}, ${g.age} ans${clubName}`;
      startBtn.textContent = "Nouvelle carrière";
      startBtn.classList.remove("btn-primary");
      startBtn.classList.add("btn-secondary");
    } else {
      resumeBtn.style.display = "none";
      startBtn.textContent = "Commencer ma carrière";
      startBtn.classList.remove("btn-secondary");
      startBtn.classList.add("btn-primary");
    }
  }

  // --- Initialisation --------------------------------------------------------------
  function resetGame() {
    G = null; R = null; setup = {};
    E.clearSeed(); // retour à l'accueil : plus de graine active
    currentEvent = null; lastOutcome = null; lastReport = null;
    initNationalityScreen();
    initPositionScreen();
    initOriginScreen();
    initLifestyleScreen();
    initEntourageScreen();
    showScreen("screen-home");
    const reminder = $("daily-reminder");
    if (reminder) { reminder.hidden = true; reminder.innerHTML = ""; }
    renderQuestTeaser();
    renderDailyPanel();
    renderDuelPanel();
    renderStoryPanel();
    refreshHomeButtons();
    const progress = loadProgress();
    $("home-meta").textContent = progress.careersPlayed > 0
      ? `${progress.careersPlayed} carrière${progress.careersPlayed > 1 ? "s" : ""} vécue${progress.careersPlayed > 1 ? "s" : ""} · record : ${progress.bestScore} pts`
      : "";
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.title = `${BRAND.game} — ${BRAND.tagline}`;
    // Wordmark : le « n » de Open devient le vrai logo « 11 » (image
    // détourée depuis Frame 341, PAS une recréation CSS — la typo du
    // logo est custom et ne se reproduit pas avec une police standard).
    $("home-title").innerHTML = 'Ope<img class="wm-11-img" src="src/img/logo-11-mark.png" alt="11" /> Eleven';
    $("brand-credit").textContent = `${BRAND.game} · ${BRAND.tagline}`;
    preloadFlags();
    $("btn-start").addEventListener("click", async () => {
      if (readCurrentGame()) {
        const ok = await confirmModal({
          icon: "⚠️",
          title: "Une carrière est en cours",
          message: "En commencer une nouvelle effacera définitivement votre carrière actuelle. Vous pouvez la reprendre depuis l'accueil.",
          confirmLabel: "Nouvelle carrière",
          cancelLabel: "Annuler",
          danger: true,
        });
        if (!ok) return;
      }
      track("career_start");
      setup = { entryScreen: "screen-nationality" }; // création vierge, retour possible jusqu'à l'accueil
      E.clearSeed(); // carrière normale = plein hasard
      showScreen("screen-nationality");
    });
    document.querySelectorAll(".creation-back").forEach((b) => b.addEventListener("click", creationBack));
    $("btn-resume").addEventListener("click", resumeCareer);
    $("daily-panel").addEventListener("click", startDailyChallenge);
    $("btn-replay").addEventListener("click", () => {
      if (reviewingPantheon) { reviewingPantheon = false; renderPantheonScreen(); showScreen("screen-pantheon"); }
      else resetGame();
    });
    $("btn-download").addEventListener("click", () => { track("download_card"); downloadCardImage(); });
    $("btn-share").addEventListener("click", shareCard);
    $("seasons-toggle").addEventListener("click", () => {
      const el = $("final-seasons");
      const hidden = el.style.display === "none";
      el.style.display = hidden ? "" : "none";
      $("seasons-toggle").textContent = hidden ? "📅 Masquer le détail des saisons" : "📅 Voir la carrière saison par saison";
    });
    $("btn-badges").addEventListener("click", () => { track("open_badges"); renderBadgeScreen(); showScreen("screen-badges"); });
    $("btn-badges-back").addEventListener("click", () => showScreen("screen-home"));
    $("btn-pantheon").addEventListener("click", () => { track("open_pantheon"); renderPantheonScreen(); showScreen("screen-pantheon"); });
    $("btn-pantheon-back").addEventListener("click", () => showScreen("screen-home"));
    $("btn-shop").addEventListener("click", () => { track("open_shop"); renderShopScreen(); showScreen("screen-shop"); });
    $("btn-shop-back").addEventListener("click", () => showScreen("screen-home"));
    $("duel-panel").addEventListener("click", startDuelCreate);
    $("story-panel").addEventListener("click", () => { track("open_stories"); renderStoryScreen(); showScreen("screen-story"); });
    $("btn-story-back").addEventListener("click", () => showScreen("screen-home"));
    $("btn-duel-share").addEventListener("click", (e) => shareDuel(currentDuelLink(), e.currentTarget));
    $("quest-panel").addEventListener("click", () => { track("open_quests"); renderQuestScreen(); showScreen("screen-quests"); });
    $("btn-quests-back").addEventListener("click", () => { renderQuestTeaser(); showScreen("screen-home"); });
    $("profile-toggle").addEventListener("click", () => $("profile-panel").classList.toggle("open"));

    // Le rendu de l'accueil vient APRÈS les gestionnaires, et sous filet : il
    // lit le localStorage, et une donnée corrompue laissait sinon une page
    // sans le moindre bouton actif — état persistant, donc irrécupérable.
    // On ne supprime RIEN au passage : la progression (badges, jetons) reste
    // intacte, seul l'affichage dégrade.
    try {
      resetGame();
    } catch (err) {
      try { showScreen("screen-home"); } catch (e) { /* ignore */ }
      track("boot_error", { message: String((err && err.message) || err).slice(0, 120) });
    }

    // Ouverture d'un lien de défi (#duel=…) : on nettoie l'URL et on affiche
    // l'écran duel (intro si l'adversaire n'a pas répondu, sinon résultat).
    const dm = (location.hash || "").match(/duel=([A-Za-z0-9\-_]+)/);
    if (dm) {
      const d = decodeDuel(dm[1]);
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
      // SEUL le format v2 (journal de choix rejoué localement) est accepté :
      // un résumé transporté (v1) est un score que l'expéditeur peut inventer.
      if (d && d.v === 2 && d.s != null && d.f && Array.isArray(d.f.cl)) {
        track("duel_opened", { hasResult: !!(d.t && Array.isArray(d.t.cl)) });
        enterDuel(d);
      }
    }
  });
})();
