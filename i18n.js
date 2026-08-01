/* ============================================================
   Traduction de l'interface — Open Eleven.

   PRINCIPE : le FRANÇAIS EST LA RÉFÉRENCE. La clé du dictionnaire est le
   texte français lui-même, et un texte sans traduction reste affiché en
   français. Rien ne casse donc si une entrée manque ou si un libellé change
   côté data.js / game.js — au pire, cette phrase-là reste en français.

   PORTÉE : l'INTERFACE (menus, écrans, boutons, libellés). Le CONTENU du jeu
   (événements, moments décisifs, récits de data.js) reste en français : c'est
   ~168 000 caractères de texte narratif, un chantier de traduction distinct.

   FONCTIONNEMENT : aucun appel à envelopper dans game.js. Le module traduit le
   DOM directement (texte + attributs title/aria-label/placeholder), puis
   surveille les ajouts via un MutationObserver — les écrans rendus
   dynamiquement sont donc traduits sans que game.js ait à le savoir.
   En français, l'observateur ne fait rien : coût nul par défaut.
   ============================================================ */
(function () {
  "use strict";

  const STORE_KEY = "openEleven_lang";
  const SUPPORTED = ["fr", "en"];

  // --- Dictionnaire anglais (clé = texte français exact) --------------------
  const EN = {
    // Accueil
    "Écrivez une carrière de footballeur, saison après saison.": "Write a footballer's career, season after season.",
    "Chaque choix compte. Personne ne connaît son destin à l'avance.": "Every choice counts. Nobody knows their fate in advance.",
    "Commencer ma carrière": "Start my career",
    "🛒 Boutique": "🛒 Shop",
    "🏅 Badges": "🏅 Badges",
    "🏛️ Panthéon": "🏛️ Hall of Fame",
    "🌐 Compétition en ligne": "🌐 Online competition",
    "🏆 Classement mondial": "🏆 World ranking",
    "⚔️ Duels par pseudo": "⚔️ Duels by username",
    "👥 Amis": "👥 Friends",
    "Code source": "Source code",
    "Code source sur GitHub": "Source code on GitHub",
    "Confidentialité": "Privacy",
    "Mon compte": "My account",
    "Une carrière est en cours": "A career is in progress",

    // Écrans génériques
    "Retour": "Back",
    "← Retour": "← Back",
    "Badges": "Badges",
    "Vos exploits à travers toutes vos carrières.": "Your feats across all your careers.",
    "Quêtes": "Quests",
    "Panthéon": "Hall of Fame",
    "Les légendes que vous avez écrites.": "The legends you have written.",
    "Boutique": "Shop",
    "Gagnez des": "Earn",
    "jetons": "tokens",
    "Le Défi du jour les ignore : il reste équitable pour tous.": "The Daily Challenge ignores them: it stays fair for everyone.",
    "Défi entre amis": "Friendly duel",
    "Mode Histoire": "Story mode",
    "Revivez une carrière de légende — et essayez de faire mieux qu'elle.": "Relive a legendary career — and try to do better.",
    "🏛️ Retour au Panthéon": "🏛️ Back to the Hall of Fame",
    "🕓 Récent": "🕓 Recent",
    "🏆 Trophées": "🏆 Trophies",
    "Débloquée": "Unlocked",

    // Création
    "Votre nationalité": "Your nationality",
    "Choisissez d'abord un continent.": "First choose a continent.",
    "Double nationalité": "Dual nationality",
    "Votre nom": "Your name",
    "Prénom": "First name",
    "Nom": "Last name",
    "Continuer": "Continue",
    "🎲 Aléatoire": "🎲 Random",
    "🎲 Tout aléatoire": "🎲 Randomise all",
    "Tirer tout le profil au hasard": "Randomise the whole profile",
    "Choisir au hasard sur cet écran": "Pick at random on this screen",
    "Choisir au hasard": "Pick at random",
    "Continents": "Continents",
    "Aucune": "None",
    "Une seule sélection": "A single national team",
    "Grande nation": "Major nation",
    "Nation solide": "Solid nation",
    "Petite nation": "Minor nation",
    "Votre poste": "Your position",
    "Il façonnera vos statistiques, vos événements et votre légende.": "It will shape your stats, your events and your legend.",
    "Votre origine": "Your background",
    "D'où venez-vous, avant les projecteurs ?": "Where do you come from, before the spotlight?",
    "Votre adolescence": "Your teenage years",
    "Le mode de vie qui forgera votre discipline… et votre réputation.": "The lifestyle that will forge your discipline… and your reputation.",
    "Votre entourage": "Your entourage",
    "Qui gère vos intérêts avant même votre premier contrat ?": "Who handles your interests before your very first contract?",
    "Les clubs vous ont repéré": "Clubs have spotted you",
    "Les recruteurs ont observé votre profil.": "Scouts have been watching you.",

    // En-tête de jeu / profil
    "Forme": "Form",
    "Moral": "Morale",
    "Niveau général": "Overall rating",
    "Fortune": "Wealth",
    "Profil complet": "Full profile",
    "Technique": "Technique",
    "Physique": "Physical",
    "Mental": "Mental",
    "Charisme": "Charisma",
    "Réputation": "Reputation",
    "Discipline": "Discipline",
    "Relation coach": "Coach relationship",
    "Vestiaire": "Dressing room",

    // Onglets du profil
    "Statistiques": "Stats",
    "Palmarès": "Honours",
    "Distinctions": "Awards",
    "Parcours": "Journey",
    "Traits": "Traits",
    "Distinctions individuelles": "Individual awards",
    "Le chemin parcouru": "The road travelled",
    "Aucun trait débloqué pour l'instant": "No trait unlocked yet",
    "Aucune récompense individuelle. Elles viennent avec les grandes saisons.": "No individual award yet. They come with great seasons.",
    "Aucun trophée pour l'instant. Tout reste à écrire.": "No trophy yet. Everything is still to be written.",

    // Parcours / statistiques
    "Saisons jouées": "Seasons played",
    "Club formateur": "Youth club",
    "Matchs joués": "Matches played",
    "Buts marqués": "Goals scored",
    "Clean sheets": "Clean sheets",
    "Passes décisives": "Assists",
    "Passes déc.": "Assists",
    "OVR max": "Peak OVR",
    "Sélections": "Caps",
    "🎽 Sélections jeunes": "🎽 Youth caps",
    "💰 Gains de carrière": "💰 Career earnings",
    "💰 Fortune": "💰 Wealth",
    "Matchs": "Matches",
    "Buts": "Goals",
    "Score": "Score",

    // Fiche finale
    "Carrière terminée": "Career over",
    "Carrière interrompue": "Career cut short",
    "Retraité": "Retired",
    "Face à face": "Head to head",
    "📅 Voir la carrière saison par saison": "📅 View the career season by season",
    "📤 Partager": "📤 Share",
    "💾 Ma fiche": "💾 My card",
    "🆚 Défier un ami": "🆚 Challenge a friend",
    "Rejouer une carrière": "Play another career",
    "NOTE DE CARRIÈRE": "CAREER RATING",
    "PALMARÈS": "HONOURS",
    "STATISTIQUES": "STATS",
    "UNE ICÔNE": "AN ICON",
    "UNE LÉGENDE": "A LEGEND",
    "UN CHAMPION": "A CHAMPION",
    "Légende du football mondial": "Legend of world football",
    "Phénomène": "Phenomenon",

    // Défis, duels, histoires
    "Créer le défi": "Create the duel",
    "Lancer le défi": "Start the duel",
    "Relever le défi": "Take on the duel",
    "Copie ce lien de défi et envoie-le à un ami :": "Copy this duel link and send it to a friend:",
    "✅ Lien copié !": "✅ Link copied!",
    "✅ Réponse envoyée": "✅ Reply sent",
    "Pas encore tenté aujourd'hui": "Not attempted today yet",
    "Créer un défi effacera définitivement votre carrière actuelle.": "Creating a duel will permanently erase your current career.",
    "Relever ce défi effacera définitivement votre carrière actuelle.": "Taking on this duel will permanently erase your current career.",
    "Lancer cette histoire effacera définitivement votre carrière actuelle.": "Starting this story will permanently erase your current career.",
    "Lancer le défi du jour effacera définitivement votre carrière actuelle.": "Starting the daily challenge will permanently erase your current career.",

    // Modale
    "Annuler": "Cancel",
    "Confirmer": "Confirm",

    // Continents
    "Europe": "Europe",
    "Amérique": "America",
    "Afrique": "Africa",
    "Asie": "Asia",
    "Océanie": "Oceania",

    // Sélecteur de langue
    "Langue": "Language",

    // Écrans dynamiques rendus par game.js
    "Nouvelle carrière": "New career",
    "En commencer une nouvelle effacera définitivement votre carrière actuelle. Vous pouvez la reprendre depuis l'accueil.": "Starting a new one will permanently erase your current career. You can resume it from the home screen.",
    "Votre décision est prise : reste à choisir la destination.": "Your mind is made up: now to choose the destination.",
    "Mais aucune offre concrète n'arrive sur la table.": "But no concrete offer lands on the table.",
    "📅 Masquer le détail des saisons": "📅 Hide the season-by-season detail",
    "Résultat ▶": "Result ▶",
    "Défaite": "Defeat",
    "16es de finale": "Round of 32",
    "8es de finale": "Round of 16",
    "Quart de finale": "Quarter-final",
    "C'EST QUI ?": "WHO IS IT?",
    "le défi": "the challenge",
    "Quête accomplie": "Quest completed",
    "Quêtes accomplies": "Quests completed",
    "20 quêtes accomplies": "20 quests completed",
    "Série de 365 jours": "365-day streak",
    "· ✨ meilleur score du jour": "· ✨ best score of the day",
    "· 👑 légende battue": "· 👑 legend beaten",
    " · 👑 légende battue": " · 👑 legend beaten",
    "légende de la communauté": "community legend",
    "légende de votre Panthéon": "legend from your Hall of Fame",
    "Une blessure sévère, diagnostiquée trop tard, met un terme brutal à votre carrière naissante.": "A severe injury, diagnosed too late, brings a brutal end to your fledgling career.",
    "En pleine force de l'âge, le verdict médical est sans appel : vous ne rejouerez plus au haut niveau. Une carrière fauchée en plein vol.": "In your prime, the medical verdict is final: you will never play at the top level again. A career cut down in full flight.",
    "Le diagnostic est tombé, implacable : votre carrière s'arrête avant d'avoir vraiment éclos. Le sport est parfois d'une cruauté inouïe.": "The diagnosis is in, and it is merciless: your career ends before it ever truly blossomed. Sport can be unspeakably cruel.",
    "🆚 Je te défie sur Open Eleven — même profil, mêmes épreuves. Fais mieux que moi !": "🆚 I challenge you on Open Eleven — same profile, same trials. Do better than me!",

    // Gabarits paramétrés (T) — les {marqueurs} doivent être repris tels quels
    "{flag} Sélections": "{flag} Caps",
    "{icon} {cont} — le pays qui vous verra grandir.": "{icon} {cont} — the country that will watch you grow up.",
    "{flag} {nat} — vos origines peuvent vous ouvrir une seconde sélection. Vous trancherez en carrière, avant votre première convocation.": "{flag} {nat} — your roots may open a second national team to you. You will decide during your career, before your first call-up.",
    "{nat} — écrivez votre nom, ou laissez le hasard décider.": "{nat} — write your name, or let chance decide.",
    "Les recruteurs ont observé votre profil.<br/>Potentiel estimé : {stars}": "Scouts have been watching you.<br/>Estimated potential: {stars}",
    "prêt d'une saison": "one-season loan",

    "{pos}ᵉ — 🚀 montée arrachée en barrage !": "{pos}th — 🚀 promotion snatched in the play-offs!",
    "{pos}ᵉ — barrage de montée perdu": "{pos}th — promotion play-off lost",
    "{pos}ᵉ — 🛟 maintien arraché en barrage": "{pos}th — 🛟 survival snatched in the play-off",
    "{pos}ᵉ — 📉 RELÉGATION": "{pos}th — 📉 RELEGATED",
    "🛒 Une recrue de renom débarque à votre poste : vous voilà <strong>{role}</strong>.": "🛒 A big-name signing arrives in your position: you are now <strong>{role}</strong>.",
    "📈 Le coach vous promeut : nouveau statut <strong>{role}</strong>.": "📈 The manager promotes you: new status <strong>{role}</strong>.",
    "📉 Vous perdez du galon : statut <strong>{role}</strong>.": "📉 You lose your standing: status <strong>{role}</strong>.",
    " · ⚽ vous : {n}": " · ⚽ you: {n}",
    " · ⚽ vous : {n} but": " · ⚽ you: {n} goal",
    " · ⚽ vous : {n} buts": " · ⚽ you: {n} goals",

    "{icon} Défi de la semaine : {name}": "{icon} Challenge of the week: {name}",
    "{icon} Défi légendaire : {name}": "{icon} Legendary challenge: {name}",
    "🧊 Joker consommé : un jour manqué, série sauvée ({n} en réserve)": "🧊 Joker used: a day missed, streak saved ({n} left)",
    "🧊 7 jours de plus : +1 joker de série ({n}/2 en réserve)": "🧊 7 more days: +1 streak joker ({n}/2 in reserve)",
    "🔥 Palier de série {days} jours : +{jetons} 🪙 !": "🔥 {days}-day streak milestone: +{jetons} 🪙!",
    "Série de <strong>{n} jour</strong> en cours 🔥": "<strong>{n}-day</strong> streak running 🔥",
    "Série de <strong>{n} jours</strong> en cours 🔥": "<strong>{n}-day</strong> streak running 🔥",
    "Série de {days} jours (+{jetons} 🪙)": "{days}-day streak (+{jetons} 🪙)",
    "Série de {n} jours": "{n}-day streak",
    " · 🔥 série de {n} jours": " · 🔥 {n}-day streak",

    "🗓️ <strong>Défi du jour</strong> — {profile}": "🗓️ <strong>Daily Challenge</strong> — {profile}",
    "Votre record : {n} pts": "Your best: {n} pts",
    "🗓️ Défi du jour — {n} pts": "🗓️ Daily Challenge — {n} pts",
    "🗓️ Défi du {date} — {n} pts (défi expiré : hors classement du jour, série intacte)": "🗓️ Challenge of {date} — {n} pts (expired: outside today's ranking, streak intact)",
    "Débloquer (🪙 {n} jetons)": "Unlock (🪙 {n} tokens)",

    "Duel au sommet : {a} et {b} se tiennent dans un mouchoir ({sa} – {sb}).": "A duel at the top: {a} and {b} are neck and neck ({sa} – {sb}).",
    "{win} l'emporte sur {lose} ({a} – {b}).": "{win} comes out on top of {lose} ({a} – {b}).",
    "🆚 <strong>Tu crées un défi</strong>{cible} — {profile}": "🆚 <strong>You are creating a duel</strong>{cible} — {profile}",
    "🆚 <strong>Défi de {who}</strong> — {profile}": "🆚 <strong>Duel from {who}</strong> — {profile}",
    "✅ Défi envoyé à {who}": "✅ Duel sent to {who}",
    "↩️ Renvoyer à {who}": "↩️ Send back to {who}",

    "Débloqué avec {name} ({flag} {pos}, carrière {from}-{to})": "Unlocked with {name} ({flag} {pos}, career {from}-{to})",
    "Nouveau badge débloqué : {names}": "New badge unlocked: {names}",
    "{done}/{total} badges · {n} carrière jouée": "{done}/{total} badges · {n} career played",
    "{done}/{total} badges · {n} carrières jouées": "{done}/{total} badges · {n} careers played",

    "Retraite à {age} ans": "Retired at {age}",
    "Carrière écourtée à {age} ans": "Career cut short at {age}",
    "🌍 Meilleure carrière que {p} % des destins simulés": "🌍 A better career than {p}% of simulated destinies",
    "🪙 +{n} jeton pour la boutique": "🪙 +{n} token for the shop",
    "🪙 +{n} jetons pour la boutique": "🪙 +{n} tokens for the shop",
    "👑 {n} pts — vous avez fait MIEUX que la légende ({base} pts) !": "👑 {n} pts — you did BETTER than the legend ({base} pts)!",
    "{icon} {n} pts — la légende reste devant ({base} pts). Réécrivez l'histoire.": "{icon} {n} pts — the legend stays ahead ({base} pts). Rewrite history.",

    "Potentiel estimé : {stars} · Contrat : {salary}/an{left}": "Estimated potential: {stars} · Contract: {salary}/yr{left}",
    ", {n} an restant": ", {n} year left",
    ", {n} ans restants": ", {n} years left",
    " (dernière année)": " (final year)",
    "<br/>🧬 <strong>{name}</strong> — {effect}": "<br/>🧬 <strong>{name}</strong> — {effect}",
    " · {flag} {n} sélection": " · {flag} {n} cap",
    " · {flag} {n} sélections": " · {flag} {n} caps",
    ", {g} but": ", {g} goal",
    ", {g} buts": ", {g} goals",
    "🎽 Sélections jeunes{tiers}": "🎽 Youth caps{tiers}",
    "{n}× Coupe du Monde": "{n}× World Cup",
    "{n}× Coupe des Champions": "{n}× Champions Cup",
    "▶️ Reprendre {what}— {name}, {age} ans{club}": "▶️ Resume {what}— {name}, {age}{club}",
    "le défi ": "the challenge ",
    "l'histoire ": "the story ",
    "{n} carrière vécue · record : {best} pts": "{n} career played · best: {best} pts",
    "{n} carrières vécues · record : {best} pts": "{n} careers played · best: {best} pts",
    "{n}× Champion": "{n}× League title",
    "{n} clean sheets": "{n} clean sheets",
    "{n} buts": "{n} goals",
    "⚽ {name}, {pos} — « {title} » (note de carrière {rating}, {perf}).": "⚽ {name}, {pos} — “{title}” (career rating {rating}, {perf}).",
    " Palmarès : {list}.": " Honours: {list}.",
    " Écris ta légende sur {game} !": " Write your own legend on {game}!",
    "Aucune série en cours — lancez-vous !": "No streak running — get started!",
  };

  const DICT = { en: EN };

  // --- État de langue -------------------------------------------------------
  let lang = "fr";
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (SUPPORTED.includes(saved)) lang = saved;
  } catch (e) { /* stockage indisponible : on reste en français */ }

  // `vars` : valeurs à injecter dans les marqueurs {…} du gabarit. Elles sont
  // substituées DANS LES DEUX LANGUES — un gabarit non traduit reste donc
  // parfaitement lisible en français.
  function translate(str, vars) {
    let out = str;
    if (lang !== "fr") {
      const table = DICT[lang];
      const key = str.trim();
      const hit = table && table[key];
      // On restitue les espaces/retours à la ligne qui entouraient le texte
      if (hit !== undefined) out = str.replace(key, hit);
    }
    if (vars) {
      for (const k in vars) {
        const v = vars[k] == null ? "" : String(vars[k]);
        out = out.split("{" + k + "}").join(v);
      }
    }
    return out;
  }

  /* --- Traduction du CONTENU du jeu (data.js) --------------------------------
     Les textes de data.js ne sont PAS affichés tels quels : le moteur y injecte
     d'abord {club}, {name}, {rival}… via renderText(). Une traduction au niveau
     du DOM ne retrouverait donc jamais la phrase d'origine. On traduit les
     données À LA SOURCE, une fois pour toutes, dès le chargement de ce script —
     c'est-à-dire avant tout rendu, puisque game.js ne lit data.js qu'au moment
     d'afficher un écran.
     Le dictionnaire vit dans i18n-data.js (window.I18N_DATA), séparé pour que
     ce fichier-ci reste lisible.
     CLUBS, COACH_NAMES et NAME_POOLS sont volontairement absents : ce sont des
     noms propres, ils ne se traduisent pas. */
  const DATA_TEXT_KEYS = new Set(["text", "title", "desc", "label", "hint", "winText", "failText",
    "winLabel", "failLabel", "championText", "effect", "blurb", "reveal", "sub", "name", "short", "of"]);
  // data.js déclare des `const` de haut niveau : ce sont des liaisons lexicales
  // globales, PAS des propriétés de window. On les référence donc par leur
  // identifiant (le `typeof` protège d'une structure qui n'existerait pas).
  function dataStructures() {
    const g = (n, v) => (v !== undefined ? [n, v] : null);
    return [
      typeof EVENTS !== "undefined" ? EVENTS : null,
      typeof MICRO_EVENTS !== "undefined" ? MICRO_EVENTS : null,
      typeof KEY_MOMENTS !== "undefined" ? KEY_MOMENTS : null,
      typeof STORIES !== "undefined" ? STORIES : null,
      typeof BADGES !== "undefined" ? BADGES : null,
      typeof BADGE_CATS !== "undefined" ? BADGE_CATS : null,
      typeof DAILY_QUESTS !== "undefined" ? DAILY_QUESTS : null,
      typeof WEEKLY_CHALLENGES !== "undefined" ? WEEKLY_CHALLENGES : null,
      typeof LEGEND_QUESTS !== "undefined" ? LEGEND_QUESTS : null,
      typeof TRAITS !== "undefined" ? TRAITS : null,
      typeof ARCHETYPES !== "undefined" ? ARCHETYPES : null,
      typeof POSITIONS !== "undefined" ? POSITIONS : null,
      typeof ORIGINS !== "undefined" ? ORIGINS : null,
      typeof LIFESTYLES !== "undefined" ? LIFESTYLES : null,
      typeof ENTOURAGES !== "undefined" ? ENTOURAGES : null,
      typeof TRAJECTORIES !== "undefined" ? TRAJECTORIES : null,
      typeof AWARDS !== "undefined" ? AWARDS : null,
      typeof COMPETITIONS !== "undefined" ? COMPETITIONS : null,
      typeof CONTINENTAL_CUPS !== "undefined" ? CONTINENTAL_CUPS : null,
      typeof NATIONAL_CUPS !== "undefined" ? NATIONAL_CUPS : null,
      typeof NATIONS_LEAGUE !== "undefined" ? NATIONS_LEAGUE : null,
      typeof ROLES !== "undefined" ? ROLES : null,
      typeof LEVELS !== "undefined" ? LEVELS : null,
      typeof PERKS !== "undefined" ? PERKS : null,
      typeof HEADLINES !== "undefined" ? HEADLINES : null,
      typeof WORLD_NEWS !== "undefined" ? WORLD_NEWS : null,
      typeof RIVAL_NEWS_GOOD !== "undefined" ? RIVAL_NEWS_GOOD : null,
      typeof RIVAL_NEWS_BAD !== "undefined" ? RIVAL_NEWS_BAD : null,
      typeof RIVAL_NEWS_AHEAD !== "undefined" ? RIVAL_NEWS_AHEAD : null,
      typeof RIVAL_NEWS_BEHIND !== "undefined" ? RIVAL_NEWS_BEHIND : null,
      typeof UNTAKEN_PATH_TEMPLATES !== "undefined" ? UNTAKEN_PATH_TEMPLATES : null,
      typeof WC_STAGES !== "undefined" ? WC_STAGES : null,
      typeof YOUTH_STAGES !== "undefined" ? YOUTH_STAGES : null,
      typeof YOUTH_TIERS !== "undefined" ? YOUTH_TIERS : null,
      typeof OLYMPIC_STAGES !== "undefined" ? OLYMPIC_STAGES : null,
      typeof NL_STAGES !== "undefined" ? NL_STAGES : null,
      typeof COUNTRIES !== "undefined" ? COUNTRIES : null,
      typeof NATIONALITIES !== "undefined" ? NATIONALITIES : null,
      typeof STREAK_MILESTONES !== "undefined" ? STREAK_MILESTONES : null,
      // BALANCE est surtout numérique, mais porte les libellés de blessure
      // (BALANCE.injury.labels), affichés dans l'historique de carrière.
      typeof BALANCE !== "undefined" ? BALANCE : null,
    ].filter(Boolean);
  }

  let dataStats = { done: 0, missing: 0 };

  function translateDataNode(node, table, seen) {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return; // structures partagées : on ne traduit qu'une fois
    seen.add(node);
    if (Array.isArray(node)) { for (const item of node) translateDataNode(item, table, seen); return; }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === "string") {
        if (!DATA_TEXT_KEYS.has(k) || v.length < 2) continue;
        const hit = table[v.trim()];
        if (hit !== undefined) { node[k] = hit; dataStats.done++; }
        else if (/[A-Za-zÀ-ÿ]{3,}/.test(v)) dataStats.missing++;
      } else if (v && typeof v === "object") {
        // Une table nommée « labels » est une table de LIBELLÉS : ses clés sont
        // des identifiants techniques (knock, severe…) et toutes ses valeurs
        // sont affichées au joueur. Ex. BALANCE.injury.labels.
        if (k === "labels" && !Array.isArray(v)) {
          for (const lk of Object.keys(v)) {
            const lv = v[lk];
            if (typeof lv !== "string" || lv.length < 2) continue;
            const hit = table[lv.trim()];
            if (hit !== undefined) { v[lk] = hit; dataStats.done++; }
            else if (/[A-Za-zÀ-ÿ]{3,}/.test(lv)) dataStats.missing++;
          }
        } else translateDataNode(v, table, seen);
      }
    }
  }

  function translateGameData() {
    const packs = window.I18N_DATA;
    const table = packs && packs[lang];
    if (!table) return; // pack absent → le contenu reste en français
    const seen = new WeakSet();
    for (const struct of dataStructures()) translateDataNode(struct, table, seen);

    // ENGINE_TEXT est une table plate dont les PROPRIÉTÉS sont des
    // identifiants (natSwitch, captain…), pas des clés de texte : le parcours
    // générique ci-dessus l'ignorerait. On traduit donc toutes ses valeurs.
    if (typeof ENGINE_TEXT !== "undefined" && ENGINE_TEXT) {
      for (const k of Object.keys(ENGINE_TEXT)) {
        const v = ENGINE_TEXT[k];
        if (typeof v !== "string") continue;
        const hit = table[v.trim()];
        if (hit !== undefined) { ENGINE_TEXT[k] = hit; dataStats.done++; }
        else dataStats.missing++;
      }
    }
  }

  // --- Traduction du DOM ----------------------------------------------------
  // Le texte français d'origine est mémorisé par nœud : repasser en français
  // restitue l'original exact, sans avoir à recharger la page.
  const originals = new WeakMap();
  const ATTRS = ["title", "aria-label", "placeholder"];
  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CANVAS: 1 };

  function translateTextNode(node) {
    const parent = node.parentNode;
    if (!parent || SKIP_TAGS[parent.nodeName]) return;
    let src = originals.get(node);
    if (src === undefined) {
      src = node.nodeValue;
      if (!src || !src.trim()) return;
      originals.set(node, src);
    }
    const next = translate(src);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttrs(el) {
    for (const name of ATTRS) {
      if (!el.hasAttribute || !el.hasAttribute(name)) continue;
      const store = `__i18n_${name}`;
      let src = el[store];
      if (src === undefined) { src = el.getAttribute(name); el[store] = src; }
      const next = translate(src);
      if (el.getAttribute(name) !== next) el.setAttribute(name, next);
    }
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1) return;
    if (SKIP_TAGS[root.nodeName]) return;
    translateAttrs(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === 3) translateTextNode(n);
      else translateAttrs(n);
    }
  }

  function translateAll() { translateTree(document.body); }

  // Les écrans sont rendus dynamiquement par game.js : on traduit ce qui arrive.
  let observer = null;
  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((records) => {
      if (lang === "fr") return; // rien à faire : coût nul en français
      for (const rec of records) {
        for (const node of rec.addedNodes) translateTree(node);
        if (rec.type === "characterData") translateTextNode(rec.target);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // --- Sélecteur de langue --------------------------------------------------
  function refreshSwitch() {
    const cur = document.getElementById("lang-current");
    if (cur) cur.textContent = lang.toUpperCase();
    document.querySelectorAll(".lang-opt").forEach((b) => {
      const on = b.dataset.lang === lang;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.documentElement.setAttribute("lang", lang);
  }

  // Le contenu du jeu est traduit EN PLACE dans les structures de data.js : on
  // ne peut donc pas revenir en arrière sans recharger. Un rechargement est
  // aussi la garantie qu'aucun écran déjà rendu ne reste dans l'ancienne
  // langue. La carrière en cours n'est pas perdue : la sauvegarde automatique
  // la restitue via « Reprendre » sur l'accueil.
  function setLang(next) {
    if (!SUPPORTED.includes(next) || next === lang) { closeMenu(); return; }
    try { localStorage.setItem(STORE_KEY, next); } catch (e) { /* ignoré */ }
    closeMenu();
    location.reload();
  }

  function closeMenu() {
    const menu = document.getElementById("lang-menu");
    const btn = document.getElementById("btn-lang");
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function initSwitch() {
    const btn = document.getElementById("btn-lang");
    const menu = document.getElementById("lang-menu");
    if (!btn || !menu) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", (e) => {
      const opt = e.target.closest(".lang-opt");
      if (opt) setLang(opt.dataset.lang);
    });
    document.addEventListener("click", (e) => {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) closeMenu();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
    refreshSwitch();
  }

  function boot() {
    startObserver();
    if (lang !== "fr") translateAll();
    initSwitch();
  }

  // IMMÉDIAT, sans attendre DOMContentLoaded : game.js enregistre son propre
  // écouteur AVANT le nôtre (il est chargé plus tôt), donc il rendrait le
  // premier écran avec des données encore françaises si l'on temporisait.
  if (lang !== "fr") translateGameData();

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // Exposé pour game.js si un texte doit être traduit à la source un jour.
  window.I18N = {
    get lang() { return lang; },
    set: setLang,
    t: translate,
    dict: DICT,
    refresh: translateAll,
    dataStats: () => ({ ...dataStats }),
  };
})();
