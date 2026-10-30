// Bibliothèque des tests de bout en bout : un vrai navigateur, piloté par le
// protocole DevTools (CDP), sans aucune dépendance — Node 22+ suffit (WebSocket
// et fetch sont natifs).
//
//   npm run build && npm run test:e2e          scénarios sans serveur (version assemblée)
//   E2E_URL=http://localhost:8080 npm run test:e2e   + scénarios qui demandent le serveur
//   E2E_MAILPIT=http://localhost:8025 …         + parcours par e-mail (serveur lancé avec SMTP_URL)
//
// Le navigateur se trouve tout seul (Chrome, Edge, Chromium ou le cache
// Playwright) ; CHROME_PATH force un chemin précis.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, readFile } from "node:fs";
import { createServer } from "node:http";
import { homedir, tmpdir } from "node:os";
import { extname, join } from "node:path";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export { wait };
export const flat = (t) => String(t ?? "").trim().replace(/\s+/g, " ");

// --- Trouver un navigateur ------------------------------------------------------
function playwrightCaches() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "ms-playwright"), join(homedir(), ".cache", "ms-playwright"), join(homedir(), "Library", "Caches", "ms-playwright")].filter(Boolean);
  return roots.filter(existsSync);
}
/** @returns {{ path: string, shell: boolean } | null} shell = chrome-headless-shell (sans service worker) */
export function findBrowser({ full = false } = {}) {
  if (process.env.CHROME_PATH) return { path: process.env.CHROME_PATH, shell: /headless-shell/.test(process.env.CHROME_PATH) };
  const fixed = process.platform === "win32"
    ? [`${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`, `${process.env["ProgramFiles(x86)"]}\\Google\\Chrome\\Application\\chrome.exe`, `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`, `${process.env["ProgramFiles(x86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  const found = [];
  for (const p of fixed) if (p && existsSync(p)) found.push({ path: p, shell: false });
  for (const root of playwrightCaches()) {
    for (const dir of readdirSync(root).sort().reverse()) {
      const sub = join(root, dir);
      const exes = [
        [/^chromium-\d+$/, ["chrome-win64/chrome.exe", "chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"], false],
        [/^chromium_headless_shell-\d+$/, ["chrome-headless-shell-win64/chrome-headless-shell.exe", "chrome-headless-shell-linux64/chrome-headless-shell", "chrome-headless-shell-mac-x64/chrome-headless-shell"], true],
      ];
      for (const [re, rels, shell] of exes) if (re.test(dir)) for (const rel of rels) if (existsSync(join(sub, rel))) found.push({ path: join(sub, rel), shell });
    }
  }
  // Un service worker exige un vrai navigateur ; le reste se contente du plus léger.
  const pool = full ? found.filter((b) => !b.shell) : found;
  return pool[0] ?? null;
}

// --- Serveur statique pour la version assemblée ---------------------------------
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".json": "application/json" };
export function serveStatic(root) {
  let up = true;
  const server = createServer((req, res) => {
    if (!up) { req.socket.destroy(); return; }
    let p = join(root, decodeURIComponent(req.url.split("?")[0]));
    // Une page par langue (/en/, /es/, /ar/ : leur index.html), comme Caddy en ligne.
    if (!extname(p)) p = existsSync(join(p, "index.html")) ? join(p, "index.html") : join(root, "index.html");
    readFile(p, (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": TYPES[extname(p)] ?? "application/octet-stream", "Cache-Control": "no-store" });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({
    // « localhost » (et non 127.0.0.1) : seul un nom d'hôte de ce genre autorise le service worker.
    url: "http://localhost:" + server.address().port,
    /** Coupe le serveur sans fermer le port : le navigateur passe « hors ligne ». */
    goOffline() { up = false; server.closeAllConnections?.(); },
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }),
  })));
}

// --- Navigateur ------------------------------------------------------------------
export async function launchBrowser({ full = false } = {}) {
  const found = findBrowser({ full });
  if (!found) throw new Error(full
    ? "Aucun navigateur complet trouvé (Chrome, Edge, Chromium). Indiquez CHROME_PATH."
    : "Aucun navigateur trouvé (Chrome, Edge, Chromium). Indiquez CHROME_PATH, ou installez-en un.");
  // Le démarrage à froid d'un navigateur peut être très lent sur une machine chargée (la CI,
  // juste après la construction de la pile Docker) : on laisse jusqu'à 60 s, trois essais, et
  // on garde ce que le navigateur a écrit sur sa sortie d'erreur pour comprendre un échec.
  let proc, dir, wsUrl = null, journal = "", sorti = null;
  for (let essai = 1; essai <= 3 && !wsUrl; essai++) {
    dir = mkdtempSync(join(tmpdir(), "oe-e2e-"));
    const args = [found.shell ? "--headless" : "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "about:blank"];
    journal = ""; sorti = null;
    proc = spawn(found.path, args, { stdio: ["ignore", "ignore", "pipe"] });
    proc.stderr.on("data", (d) => { journal = (journal + d).slice(-1500); });
    proc.on("exit", (code, signal) => { sorti = signal ?? code; });
    for (let i = 0; i < 400 && !wsUrl && sorti === null; i++) {
      const f = join(dir, "DevToolsActivePort");
      if (existsSync(f)) { const [port, path] = readFileSync(f, "utf8").trim().split("\n"); wsUrl = `ws://127.0.0.1:${port}${path}`; }
      else await wait(150);
    }
    if (!wsUrl) proc.kill();
  }
  if (!wsUrl) {
    throw new Error("Le navigateur n'a pas ouvert son port de pilotage (" + found.path + ")."
      + (sorti !== null ? " Il s'est arrêté (" + sorti + ")." : " Il ne répond pas.")
      + (journal.trim() ? "\nSortie d'erreur du navigateur :\n" + journal.trim() : ""));
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error("connexion CDP refusée")); });
  let nextId = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    else if (d.method) for (const fn of listeners) fn(d);
  };
  const cmd = (method, params = {}, sessionId) => new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  const browser = {
    path: found.path, shell: found.shell,
    /** Un joueur = un contexte isolé (ses propres cookies et stockage). */
    async newPage(url, { name = "page", init = [] } = {}) {
      const ctx = (await cmd("Target.createBrowserContext")).result.browserContextId;
      const targetId = (await cmd("Target.createTarget", { url: "about:blank", browserContextId: ctx })).result.targetId;
      const sessionId = (await cmd("Target.attachToTarget", { targetId, flatten: true })).result.sessionId;
      const page = new Page(name, cmd, listeners, sessionId, ctx);
      await cmd("Runtime.enable", {}, sessionId);
      await cmd("Page.enable", {}, sessionId);
      // confirm() répond toujours « OK » : les tests n'ont personne pour cliquer.
      await cmd("Page.addScriptToEvaluateOnNewDocument", { source: "window.confirm = () => true;" + init.join(";") }, sessionId);
      if (url) await page.goto(url);
      return page;
    },
    async close() {
      try { ws.close(); } catch { /* déjà fermé */ }
      proc.kill();
      await wait(300);
      try { rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }); } catch { /* verrou Windows : le dossier est temporaire */ }
    },
  };
  return browser;
}

class Page {
  constructor(name, cmd, listeners, sessionId, ctx) {
    this.name = name; this.cmd = cmd; this.sessionId = sessionId; this.ctx = ctx;
    this.errors = [];
    listeners.push((d) => {
      if (d.sessionId !== sessionId) return;
      if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") this.errors.push(d.params.args.map((a) => a.value ?? a.description).join(" "));
      if (d.method === "Runtime.exceptionThrown") this.errors.push("EXCEPTION: " + (d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text));
    });
  }
  /** Évalue une expression dans la page ; relance l'erreur de la page telle quelle. */
  async js(expression) {
    const r = await this.cmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, this.sessionId);
    if (r.result.exceptionDetails) throw new Error(`[${this.name}] ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}`);
    return r.result.result.value;
  }
  /** Attend qu'une expression devienne vraie. */
  async until(expression, ms = 8000) {
    for (let t = 0; t < ms; t += 150) { if (await this.js(expression)) return true; await wait(150); }
    return false;
  }
  async goto(url) { await this.cmd("Page.navigate", { url }, this.sessionId); await wait(1800); }
  async reload() { await this.cmd("Page.reload", {}, this.sessionId); await wait(1800); }
  text(selector) { return this.js(`(document.querySelector(${JSON.stringify(selector)}) || { textContent: '' }).textContent`).then(flat); }
  click(selector) { return this.js(`(function(){ var b = document.querySelector(${JSON.stringify(selector)}); if (!b) return false; b.click(); return true; })()`); }
  screen() { return this.js("document.querySelector('.screen.active').id"); }
  /** Appelle une procédure du serveur avec la session de CE joueur. */
  rpc(name, args = {}) { return this.js(`window.OpenElevenAccount.getClient().rpc(${JSON.stringify(name)}, ${JSON.stringify(args)}).then(r => JSON.stringify(r))`).then(JSON.parse); }
  async close() { await this.cmd("Target.disposeBrowserContext", { browserContextId: this.ctx }); }
}

// --- Parties --------------------------------------------------------------------
export const CARD = "(document.getElementById('game-card') || { textContent: '' }).textContent";
export const TAG = "(document.querySelector('#game-card .card-tag') || { textContent: '' }).textContent";

/** Repart d'un stockage vide, dans la langue voulue. */
export async function resetStorage(page, lang = "fr") {
  await page.js(`localStorage.clear(); localStorage.setItem('openEleven_lang', '${lang}'); location.reload()`);
  await wait(2200);
}
/** Lance une nouvelle carrière en laissant le jeu tout tirer au hasard. */
export async function startCareer(page) {
  await page.js("document.getElementById('btn-start').click()");
  for (let i = 0; i < 16; i++) {
    if ((await page.screen()) === "screen-game") return true;
    await page.js("(document.querySelector('.creation-random-all') || { click() {} }).click()");
    await wait(250);
  }
  return (await page.screen()) === "screen-game";
}
/** Termine la carrière en cours et attend la fiche finale. */
export async function finishCareer(page) {
  await page.js("(function(){ var g = window.OE.G(); g.careerEnded = true; g.careerEndReason = 'retire'; g.retiring = true; })()");
  for (let i = 0; i < 50; i++) {
    if ((await page.screen()) === "screen-final") return true;
    await page.click("#btn-next, #game-card button:not([disabled])");
    await wait(300);
  }
  return false;
}

// --- Compte rendu ---------------------------------------------------------------
export function reporter(title) {
  const state = { failed: 0, checks: 0 };
  console.log("\n" + title);
  return {
    section(t) { console.log("\n  " + t); },
    note(t) { console.log("      " + t); },
    check(label, ok, detail) {
      state.checks++;
      if (!ok) state.failed++;
      console.log("    " + (ok ? "✔" : "✖") + " " + label + (detail !== undefined && (!ok || process.env.E2E_VERBOSE) ? "  — " + flat(detail).slice(0, 220) : ""));
    },
    noErrors(...pages) {
      const errors = pages.flatMap((p) => p.errors.map((e) => `[${p.name}] ${e}`));
      this.check("aucune erreur dans la console", errors.length === 0, errors.join(" | "));
    },
    get failed() { return state.failed; },
    get checks() { return state.checks; },
  };
}

// --- Parcours de compte (avec ou sans e-mails) ------------------------------------
const BOX = "document.querySelector('.acc-overlay.on .acc-box')";
export const accountBox = BOX;

/** Dernier lien d'un e-mail reçu par une adresse, d'après l'API de Mailpit. */
export async function mailLink(mailpit, email, re) {
  for (let i = 0; i < 50; i++) {
    const list = await (await fetch(mailpit + "/api/v1/search?query=" + encodeURIComponent("to:" + email))).json();
    if (list.messages?.length) {
      const m = await (await fetch(mailpit + "/api/v1/message/" + list.messages[0].ID)).json();
      const hit = m.Text.match(re);
      if (hit) return hit[0];
    }
    await wait(200);
  }
  throw new Error("aucun e-mail reçu par " + email);
}

/**
 * Crée un compte par l'interface. Sans e-mails sur le serveur, la session s'ouvre
 * tout de suite ; avec (E2E_MAILPIT), on suit le lien de confirmation.
 */
export async function signUp(page, { email, password, mailpit, baseUrl }) {
  await page.js("document.getElementById('btn-account').click()");
  await page.js(`${BOX}.querySelector('#acc-email').value = ${JSON.stringify(email)}; ${BOX}.querySelector('#acc-pass').value = ${JSON.stringify(password)}; ${BOX}.querySelector('#acc-signup').click()`);
  if (mailpit) {
    const link = await mailLink(mailpit, email, /https?:\/\/\S+\/api\/auth\/confirm\?token=[\w-]+/);
    await page.goto(link);
    return page.until("!!window.OpenElevenAccount.getSession()");
  }
  return page.until(`!!(${BOX} && ${BOX}.querySelector('#acc-signout'))`);
}
