/* ============================================================
   Enregistrement du service worker (PWA : installable + hors-ligne)
   + BANNIÈRE DE MISE À JOUR.

   Extrait d'un <script> inline d'index.html pour permettre une
   Content-Security-Policy stricte (script-src 'self', sans 'unsafe-inline').

   L'échec est volontairement silencieux : un service worker indisponible
   (navigation privée, contexte non sécurisé, refus du navigateur) ne doit
   jamais empêcher de jouer — le jeu fonctionne entièrement sans lui.

   Mise à jour : quand un nouveau worker est prêt mais en attente (cf. sw.js,
   qui NE fait plus skipWaiting tout seul), on affiche une petite bannière. Le
   joueur clique « Mettre à jour » → on demande au worker de prendre la main →
   la page se recharge sur la version fraîche. Sans ça, le cache pouvait servir
   d'anciens fichiers après un déploiement sans que le joueur le sache.
   ============================================================ */
(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;

  // Le gabarit français EST la clé i18n : sans traduction, il s'affiche tel quel.
  var T = function (fr) { return (window.I18N && window.I18N.t) ? window.I18N.t(fr) : fr; };

  // Recharge une seule fois, quand le nouveau worker a pris la main. La TOUTE
  // PREMIÈRE prise de contrôle (installation initiale, où la page n'avait pas
  // encore de worker) ne doit PAS recharger — sinon tout premier chargement se
  // rechargerait tout seul. On la laisse passer une fois, puis toute bascule
  // suivante (une vraie mise à jour acceptée) recharge sur la version fraîche.
  var hadController = !!navigator.serviceWorker.controller;
  var refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController) { hadController = true; return; }
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  function injectStyle() {
    if (document.getElementById("oe-update-style")) return;
    var st = document.createElement("style");
    st.id = "oe-update-style";
    st.textContent =
      "#oe-update-bar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:3000;" +
      "display:flex;align-items:center;gap:12px;max-width:calc(100vw - 24px);box-sizing:border-box;" +
      "background:var(--card-bg,#fff);color:var(--green-ink,#0b3b26);border:2px solid var(--gold,#d4af37);" +
      "border-radius:14px;padding:11px 12px 11px 16px;box-shadow:0 12px 34px rgba(0,0,0,.34);" +
      "font-family:var(--font,system-ui);font-size:.92rem;font-weight:600;animation:oe-up-in .28s ease}" +
      "@keyframes oe-up-in{from{opacity:0}to{opacity:1}}" +
      ".oe-up-txt{line-height:1.25}" +
      ".oe-up-btn{flex-shrink:0;background:var(--green,#087b4b);color:#fff;border:none;border-radius:10px;" +
      "padding:9px 14px;font-weight:800;font-size:.86rem;cursor:pointer;font-family:inherit}" +
      ".oe-up-btn:disabled{opacity:.7;cursor:default}" +
      ".oe-up-x{flex-shrink:0;background:transparent;border:none;color:var(--text-1,#567);" +
      "font-size:1.35rem;line-height:1;cursor:pointer;padding:2px 6px;font-family:inherit}";
    document.head.appendChild(st);
  }

  // `worker` : le worker en attente à qui demander de prendre la main.
  function showUpdateBanner(worker) {
    if (!worker || document.getElementById("oe-update-bar") || !document.body) return;
    injectStyle();
    var bar = document.createElement("div");
    bar.id = "oe-update-bar";
    bar.setAttribute("role", "status");

    var txt = document.createElement("span");
    txt.className = "oe-up-txt";
    txt.textContent = T("Une mise à jour est disponible.");

    var go = document.createElement("button");
    go.className = "oe-up-btn";
    go.type = "button";
    go.textContent = T("Mettre à jour");
    go.addEventListener("click", function () {
      go.disabled = true;
      go.textContent = T("Mise à jour…");
      worker.postMessage({ type: "SKIP_WAITING" });
    });

    var x = document.createElement("button");
    x.className = "oe-up-x";
    x.type = "button";
    x.setAttribute("aria-label", T("Fermer"));
    x.textContent = "×";
    x.addEventListener("click", function () { bar.remove(); });

    bar.appendChild(txt);
    bar.appendChild(go);
    bar.appendChild(x);
    document.body.appendChild(bar);
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      // Une mise à jour peut déjà attendre d'une session précédente.
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg.waiting);

      // Un nouveau worker s'installe : on guette le moment où il devient prêt
      // (« installed ») ALORS QU'un ancien contrôle encore la page — signe d'une
      // vraie mise à jour, à distinguer de la toute première installation.
      reg.addEventListener("updatefound", function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", function () {
          if (nw.state === "installed" && navigator.serviceWorker.controller) showUpdateBanner(nw);
        });
      });

      // Le navigateur ne revérifie sw.js que de loin en loin. On force une
      // vérification au retour sur l'onglet : c'est là qu'un joueur revient après
      // qu'un déploiement a eu lieu, et il verra la bannière sans recharger à la main.
      var check = function () { if (document.visibilityState === "visible") { try { reg.update(); } catch (_) {} } };
      document.addEventListener("visibilitychange", check);
      setInterval(check, 60 * 60 * 1000); // filet de sécurité horaire
    }).catch(function () { /* hors-ligne indisponible, sans conséquence */ });
  });
})();
