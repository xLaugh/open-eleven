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
    "🏛️ Panthéon": "🏛️ Pantheon",
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
    "Panthéon": "Pantheon",
    "Les légendes que vous avez écrites.": "The legends you have written.",
    "Boutique": "Shop",
    "Gagnez des": "Earn",
    "jetons": "tokens",
    "Le Défi du jour les ignore : il reste équitable pour tous.": "The Daily Challenge ignores them: it stays fair for everyone.",
    "Défi entre amis": "Friendly duel",
    "Mode Histoire": "Story mode",
    "Revivez une carrière de légende — et essayez de faire mieux qu'elle.": "Relive a legendary career — and try to do better.",
    "🏛️ Retour au Panthéon": "🏛️ Back to the Pantheon",
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
    "légende de votre Panthéon": "legend from your Pantheon",
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

    // Mercato, récap de saison, moments
    "Éligible à la sélection {nat}": "Eligible for the {nat} national team",
    "Prolonger": "Extend",
    "Rester à {club} — {salary}/an": "Stay at {club} — {salary}/yr",
    "Faute d'offre concrète, rester à {club}": "With no firm offer, stay at {club}",
    "🏛️ Dans les tribunes, {who}, {src}, observe votre mercato.": "🏛️ Up in the stands, {who}, {src}, is watching your transfer window.",
    "Objectif du club :": "Club objective:",
    " : {n} semaines sur la touche.": ": {n} weeks on the sidelines.",
    "🩼 Toujours en reconstruction : {n} semaines de retard traînées de la saison passée.": "🩼 Still rebuilding: {n} weeks of backlog carried over from last season.",
    "⚠️ Cruellement court en temps de jeu : votre moral en souffre.": "⚠️ Desperately short of game time: your morale is suffering.",
    "😔 Blessé, vous manquez le grand tournoi de votre sélection cette saison.": "😔 Injured, you miss your national team's big tournament this season.",
    "✅ Qualifié pour le Final Four": "✅ Qualified for the Final Four",
    "❌ Éliminé dès la phase de Ligue": "❌ Knocked out in the league phase",
    "🌟 Élu meilleur joueur du tournoi !": "🌟 Voted player of the tournament!",
    "Prêt": "Loan",
    "Retour de prêt": "Back from loan",
    "Le corps a fini par dire stop. Après tout ce que vous avez accompli, une dernière blessure referme le rideau — vous quittez les terrains la tête haute.": "The body finally said enough. After all you achieved, one last injury brings the curtain down — you leave the pitch with your head held high.",

    // Défi du jour, quêtes, boutique
    "Ton meilleur aujourd'hui : {n} pts": "Your best today: {n} pts",
    "{n}/{max} avantage équipé · actifs en carrière normale uniquement.": "{n}/{max} perk equipped · active in normal career only.",
    "{n}/{max} avantages équipés · actifs en carrière normale uniquement.": "{n}/{max} perks equipped · active in normal career only.",
    "👑 Tous les paliers sont conquis. Série mythique.": "👑 Every milestone conquered. A legendary streak.",
    "Votre légende est encore à écrire.": "Your legend is still to be written.",
    "👁️ Voir la fiche complète": "👁️ View the full card",
    "UN PRO": "A PRO",
    "Vous": "You",
    "Personne ne t'a encore défié en retour. Partage ton défi pour comparer vos carrières !": "Nobody has challenged you back yet. Share your duel to compare careers!",

    // Compte & sauvegarde cloud (account.js)
    "Mon compte": "My account",
    "Connecté :": "Signed in:",
    "Pseudo au classement mondial :": "Username on the world ranking:",
    "Ton pseudo": "Your username",
    "☁️ Sauvegarder maintenant": "☁️ Save now",
    "🏛️ Voir mon profil public": "🏛️ View my public profile",
    "📥 Restaurer depuis le cloud": "📥 Restore from the cloud",
    "Se déconnecter": "Sign out",
    "Sauvegarde…": "Saving…",
    "Pseudo enregistré ✔": "Username saved ✔",
    "Échec": "Failed",
    "Échec :": "Failed:",
    "Sauvegarde envoyée au cloud ✔": "Save uploaded to the cloud ✔",
    "Choisis d'abord un pseudo ci-dessus.": "Choose a username above first.",
    "Récupération…": "Fetching…",
    "Aucune sauvegarde cloud pour l'instant.": "No cloud save yet.",
    "Restaurer la sauvegarde cloud ? Cela REMPLACE votre partie locale actuelle.": "Restore the cloud save? This REPLACES your current local game.",
    "Une sauvegarde cloud existe. La restaurer (remplace la partie locale) ?\n\nOK = restaurer le cloud · Annuler = garder le local et l'envoyer au cloud.": "A cloud save exists. Restore it (replaces the local game)?\n\nOK = restore the cloud · Cancel = keep the local one and upload it.",
    "Partie locale envoyée au cloud ✔": "Local game uploaded to the cloud ✔",
    "Mot de passe (8+ caractères)": "Password (8+ characters)",
    "Renseigne e-mail et mot de passe.": "Enter an e-mail and a password.",
    "Mot de passe : 8 caractères minimum.": "Password: 8 characters minimum.",
    "Création…": "Creating…",
    "Compte créé ✔": "Account created ✔",
    "Compte créé. Vérifie ta boîte mail pour confirmer, puis connecte-toi.": "Account created. Check your inbox to confirm, then sign in.",
    "E-mail ou mot de passe incorrect.": "Incorrect e-mail or password.",
    "Cet e-mail a déjà un compte. Connecte-toi.": "This e-mail already has an account. Sign in.",
    "E-mail non confirmé : vérifie ta boîte mail.": "E-mail not confirmed: check your inbox.",
    "Trop de tentatives, réessaie dans un instant.": "Too many attempts, try again in a moment.",
    "Pseudo trop court (2 caractères min).": "Username too short (2 characters min).",
    "Pseudo non autorisé.": "Username not allowed.",
    "Ce pseudo est déjà pris.": "That username is already taken.",
    "Vérification…": "Checking…",
    "Aucun joueur avec ce pseudo.": "No player with that username.",
    "Connecte-toi.": "Sign in.",
    "C'est toi !": "That's you!",
    "ajouté ✔": "added ✔",
    "Fermer": "Close",

    // --- Écrans de jeu : prêts, transferts, moments, sélection ---
    "· Rép": "· Rep",
    "contre toute attente, ils vous veulent VOUS.": "against all odds, they want YOU.",
    "Moment décisif": "Decisive moment",
    "Prêt ·": "Loan ·",
    "Plusieurs clubs garantissent du temps de jeu au jeune que vous êtes. Le club conserve votre contrat et suivra chacun de vos matchs.": "Several clubs guarantee game time to the youngster you are. Your club keeps your contract and will follow every one of your matches.",
    "Rester à": "Stay at",
    "/an · indemnité": "/yr · fee",
    "Statut proposé :": "Proposed status:",
    "Coup du sort": "A twist of fate",
    "Une blessure sévère, diagnostiquée trop tard, met un terme brutal et définitif à votre carrière naissante.": "A severe injury, diagnosed too late, brings a brutal and final end to your fledgling career.",
    "Première convocation": "First call-up",
    "Le sélectionneur de": "The national team manager of",
    "vous appelle pour la première fois. À": "calls you up for the first time. At",
    "ans, vous voilà international !": ", you are an international!",
    "Vous porterez le maillot national dès cette saison. Vos matchs et vos buts en sélection sont désormais suivis dans le bilan de fin de saison.": "You will wear the national shirt from this season on. Your caps and international goals are now tracked in the end-of-season report.",

    // --- Tournois ---
    "· Phase de poules": "· Group stage",
    "Votre poule pour cette édition :": "Your group this time:",
    "· Phase de Ligue": "· League phase",
    "Coupe du Monde": "World Cup",
    "Le monde retient son souffle :": "The world holds its breath:",
    "entre dans la compétition, et vous êtes du voyage.": "enter the competition, and you are on the plane.",
    "Vivre le tournoi": "Live the tournament",
    "Finale de la Coupe du Monde": "World Cup final",
    "entre dans SA grande compétition continentale, et vous êtes de l'aventure.": "enter THEIR big continental competition, and you are part of the adventure.",
    "dispute la Ligue des Sélections européenne, et vous en êtes.": "are playing the European Nations League, and you are in.",
    "Vivre la campagne": "Live the campaign",
    "dispute le tournoi olympique (U23), et vous en êtes.": "are playing the Olympic tournament (U23), and you are in.",
    "Vivre les Jeux": "Live the Games",

    // --- Panneaux d'accueil : quêtes, défi, duel, histoire ---
    "Quêtes du jour": "Daily quests",
    "En voir plus": "See more",
    "Défi du jour": "Daily Challenge",
    "Revivre la légende": "Relive the legend",
    "🎯 La légende a terminé sa carrière à": "🎯 The legend finished their career on",
    "te défie !": "challenges you!",
    "Profil imposé :": "Fixed profile:",
    "Mêmes épreuves que ton adversaire. À toi de faire mieux.": "The same trials as your opponent. Now do better.",
    "Plus tard": "Later",
    "🆚 Résultat du duel": "🆚 Duel result",
    "Retour à l'accueil": "Back to home",
    "Défie un ami par lien : même parcours, le meilleur gagne.": "Challenge a friend by link: same journey, best one wins.",
    "Lancer un duel": "Start a duel",
    "Tu crées un défi": "You are creating a duel",
    "🧊 +1 joker tous les 7 jours · en réserve :": "🧊 +1 joker every 7 days · in reserve:",
    "— un joker pardonne un jour manqué": "— a joker forgives one missed day",
    "🎯 Quêtes du jour": "🎯 Daily quests",
    "🏅 Défi de la semaine": "🏅 Challenge of the week",
    "👑 Défi légendaire": "👑 Legendary challenge",
    "Terminez une carrière pour valider vos quêtes. Elles se renouvellent chaque jour — revenez pour entretenir votre série 🔥": "Finish a career to complete your quests. They refresh every day — come back to keep your streak alive 🔥",
    "🧭 Objectifs de rétention": "🧭 Retention goals",
    "Son existence même est un indice…": "Its very existence is a clue…",
    "Débloquer": "Unlock",
    "Moments de légende vécus :": "Legendary moments lived:",

    // --- Compte : classement, duels, amis (account.js) ---
    "Optionnel. Retrouvez vos carrières, votre Panthéon et votre progression sur tous vos appareils.": "Optional. Find your careers, your Pantheon and your progress on all your devices.",
    "Créer un compte": "Create an account",
    "Défi du jour — scores vérifiés par le serveur.": "Daily Challenge — scores verified by the server.",
    "Général": "Overall",
    "Ta place aujourd'hui :": "Your rank today:",
    "Connecte-toi (👤) pour apparaître au classement.": "Sign in (👤) to appear in the ranking.",
    "Termine le défi du jour pour entrer au classement.": "Finish the daily challenge to enter the ranking.",
    "Personne au classement pour l'instant. Sois le premier !": "Nobody in the ranking yet. Be the first!",
    "Classement indisponible pour le moment.": "Ranking unavailable right now.",
    "Classement général :": "Overall ranking:",
    "Pas encore classé au Défi du jour.": "Not ranked in the Daily Challenge yet.",
    "Aucune carrière partagée.": "No career shared.",
    "Meilleure carrière": "Best career",
    "(vitrine, non vérifiée)": "(showcase, unverified)",
    "Défier": "Challenge",
    "Reçus": "Received",
    "Connecte-toi (👤) pour défier des joueurs.": "Sign in (👤) to challenge players.",
    "Choisis d'abord un pseudo dans « Mon compte ».": "First choose a username under “My account”.",
    "Entre le pseudo d'un ami. Tu joues ta carrière, ton défi lui est envoyé (même parcours pour vous deux).": "Enter a friend's username. You play your career, and your duel is sent to them (the same journey for you both).",
    "🆚 Lancer le défi": "🆚 Start the duel",
    "Aucun défi en attente.": "No pending duel.",
    "En attente (envoyés)": "Pending (sent)",
    "Terminés": "Completed",
    "Aucun duel pour l'instant.": "No duel yet.",
    "Gérer": "Manage",
    "Connecte-toi (👤) pour gérer tes amis.": "Sign in (👤) to manage your friends.",
    "Aucun ami pour l'instant. Ajoute un pseudo ci-dessus.": "No friends yet. Add a username above.",
    "(toi)": "(you)",
    "Personne n'a encore joué le défi. Ajoute des amis dans « Gérer ».": "Nobody has played the challenge yet. Add friends under “Manage”.",
    "(sur {n} joueurs)": "(out of {n} players)",
    "({n} défis)": "({n} challenges)",
    "j (série)": "d (streak)",
    "carrières": "careers",
    "te défie · {n} pts à battre": "challenges you · {n} pts to beat",
    "{n} pts · en attente": "{n} pts · pending",

    // --- Vérification de l'adresse e-mail ---
    "Adresse e-mail invalide.": "Invalid e-mail address.",
    "Vérifiez votre e-mail": "Check your e-mail",
    "Un lien de confirmation vient d'être envoyé à {email}. Ouvrez-le pour activer le compte, puis revenez vous connecter.": "A confirmation link has just been sent to {email}. Open it to activate the account, then come back and sign in.",
    "Pensez à regarder dans les indésirables.": "Remember to check your spam folder.",
    "Renvoyer l'e-mail": "Resend the e-mail",
    "Retour à la connexion": "Back to sign in",
    "Envoi…": "Sending…",
    "E-mail renvoyé ✔": "E-mail resent ✔",
    "Compte & sauvegarde cloud": "Account & cloud save",
    "Se connecter": "Sign in",
    "Connexion…": "Signing in…",
    "E-mail": "E-mail",
  };

  const DICT = { en: EN };

  // --- État de langue -------------------------------------------------------
  let lang = "fr";
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (SUPPORTED.includes(saved)) lang = saved;
  } catch (e) { /* stockage indisponible : on reste en français */ }

  /* `vars` : valeurs à injecter dans les marqueurs {…} du gabarit. Elles sont
     substituées DANS LES DEUX LANGUES — un gabarit non traduit reste donc
     parfaitement lisible en français.

     ⚠️ SÉCURITÉ — CONTRAT D'ÉCHAPPEMENT ⚠️
     Les valeurs sont insérées TELLES QUELLES, sans échappement. C'EST À
     L'APPELANT d'échapper toute donnée non maîtrisée :

         T("Bravo {who} !", { who: esc(pseudo) })     ✅
         T("Bravo {who} !", { who: pseudo })          ❌ XSS stocké

     Pourquoi ne pas échapper ici d'office ? Parce que T() sert AUSSI à des
     textes posés via .textContent (écrans de création, boutons) : un
     échappement systématique y afficherait « &amp; » en toutes lettres. Et
     plusieurs appels injectent volontairement du HTML (drapeaux via flagHtml,
     <strong>, étoiles de potentiel).

     La règle est donc la même que partout ailleurs dans ce projet : on échappe
     à la source, au moment où l'on manipule la donnée. Un pseudo, un nom de
     joueur, un libellé venant d'un lien de duel ou du serveur ne doivent
     JAMAIS arriver ici sans esc(). */
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
