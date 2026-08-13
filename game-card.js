/* ============================================================
   Export de la fiche de fin de carrière en image, et partage.

   Module ANNEXE, extrait de game.js : c'est une feuille de l'arbre — il lit
   la carrière pour dessiner un canvas, mais ne modifie aucun état de jeu.
   Il ne partage donc pas la portée de game.js et reçoit le strict nécessaire
   par window.OE : neuf aides de dessin restent purement locales.

   La carrière (G) est lue par ACCESSEUR à chaque appel : elle est remplacée à
   chaque nouvelle partie, une copie capturée au chargement serait périmée.
   ============================================================ */
(function () {
  "use strict";
  const OE = window.OE;
  if (!OE) return; // game.js absent : rien à faire
  const T = OE.T, track = OE.track, careerStartYear = OE.careerStartYear;
  const cardTierFor = OE.cardTierFor, nicknameFor = OE.nicknameFor;
  const NAT_FLAG_IMGS = OE.natFlagImgs;

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
    const G = OE.G(); // carrière courante (remplacée à chaque partie)
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
    ctx.fillText(`${G.position.icon} ${G.position.name}${G.archetype ? ` · ${G.archetype.name}` : ""} · ${G.careerEnded ? T("Carrière interrompue") : `${careerStartYear()} – ${G.year}`}`, cx, y);
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
    // C2/C3 : portée non uniforme selon le continent (cf. CONTINENTAL_CUPS2/3,
    // data.js) — groupées comme canvasContRows plutôt qu'un libellé Europe fixe.
    function canvasSubCupRows(detail) {
      const groups = {};
      (detail || []).forEach((x) => { groups[x.continent] = (groups[x.continent] || 0) + 1; });
      return groups;
    }
    const c2Groups = canvasSubCupRows(G.continental2Detail);
    const c3Groups = canvasSubCupRows(G.continental3Detail);
    const scGroups = canvasSubCupRows(G.supercupDetail);
    const canvasCont2Rows = Object.entries(c2Groups).map(([cont, n]) => [`🥈 ${(CONTINENTAL_CUPS2[cont] || CONTINENTAL_CUPS2.eu).name}`, n]);
    const canvasCont3Rows = Object.entries(c3Groups).map(([cont, n]) => [`🥉 ${(CONTINENTAL_CUPS3[cont] || CONTINENTAL_CUPS3.eu).name}`, n]);
    const canvasSupercupRows = Object.entries(scGroups).map(([cont, n]) => [`🏅 ${(CONTINENTAL_SUPERCUP[cont] || CONTINENTAL_SUPERCUP.eu).name}`, n]);
    const trophyRows = [
      [`🏆 ${COMPETITIONS.worldCup.name}`, t.worldCup],
      [`⭐ ${COMPETITIONS.ballon.name}`, t.ballon],
      ...canvasContRows,
      ...canvasSupercupRows,
      // C2/C3 : n'apparaissent QUE si remportées (évite d'allonger la carte partageable)
      ...canvasCont2Rows,
      ...canvasCont3Rows,
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
    const G = OE.G(); // carrière courante (remplacée à chaque partie)
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
    const G = OE.G(); // carrière courante (remplacée à chaque partie)
    const narrative = E.buildNarrative(G);
    const t = G.trophies;
    const bits = [];
    if (t.ballon) bits.push(`${t.ballon}× Ballon d'Or`);
    if (t.worldCup) bits.push(T("{n}× Coupe du Monde", { n: t.worldCup }));
    if (t.continental) bits.push(T("{n}× Coupe des Champions", { n: t.continental }));
    // Un "bit" par continent gagné (Trophée d'Afrique, Bouclier d'Asie…) : un
    // total générique ferait perdre l'info de savoir LEQUEL a été remporté.
    function subCupBits(detail, cupsMap) {
      const groups = {};
      (detail || []).forEach((x) => { groups[x.continent] = (groups[x.continent] || 0) + 1; });
      return Object.entries(groups).map(([cont, n]) => T("{n}× {name}", { n, name: T((cupsMap[cont] || cupsMap.eu).name) }));
    }
    bits.push(...subCupBits(G.supercupDetail, CONTINENTAL_SUPERCUP));
    bits.push(...subCupBits(G.continental2Detail, CONTINENTAL_CUPS2));
    bits.push(...subCupBits(G.continental3Detail, CONTINENTAL_CUPS3));
    if (t.league) bits.push(T("{n}× Champion", { n: t.league }));
    const isGk = G.position.id === "gk";
    const perf = isGk ? T("{n} clean sheets", { n: G.totals.cleanSheets }) : T("{n} buts", { n: G.totals.goals });
    const link = BRAND.url ? ` ${BRAND.url}` : "";
    return (T("⚽ {name}, {pos} — « {title} » (note de carrière {rating}, {perf}).", { name: G.name, pos: G.position.name.toLowerCase(), title: narrative.title, rating: E.careerRating(G), perf })
      + (bits.length ? T(" Palmarès : {list}.", { list: bits.join(", ") }) : "")
      + T(" Écris ta légende sur {game} !", { game: BRAND.game }) + link + " " + (BRAND.hashtag || "")).trim();
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

  // Seules ces deux fonctions sont appelées depuis game.js.
  OE.downloadCardImage = downloadCardImage;
  OE.shareCard = shareCard;
})();
