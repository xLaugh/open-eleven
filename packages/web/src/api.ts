// Client du serveur d'Open Eleven (tout ce qui vit sous /api).
//
// La session tient dans un cookie HttpOnly posé par le serveur : la page ne
// manipule aucun jeton. Elle sait seulement QUI est connecté.
//
// Les appels ne lèvent jamais d'exception : ils renvoient { data, error }, et
// une panne réseau est une erreur comme une autre — le jeu reste jouable hors
// connexion.

export interface ApiError { message: string; code?: string; status?: number; }
export interface Result<T> { data: T | null; error: ApiError | null; }
export interface Session { user: { id: string; email: string }; recovery: boolean; }
/** INITIAL_SESSION : session relue au chargement de la page (connecté ou non). */
export type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "PASSWORD_RECOVERY" | "INITIAL_SESSION";

async function send(method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
  try {
    const res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  } catch (_) {
    return { status: 0, json: null };
  }
}

function fail(status: number, json: any): ApiError {
  const e = json && json.error;
  if (e && typeof e === "object") return { message: String(e.message || "Erreur"), code: e.code, status };
  return { message: typeof e === "string" ? e : status ? "Erreur du serveur" : "Serveur injoignable", status };
}

// --- Session -------------------------------------------------------------------

let session: Session | null = null;
const listeners = new Set<(event: AuthEvent, session: Session | null) => void>();

function setSession(next: Session | null, event?: AuthEvent): void {
  session = next;
  if (event) listeners.forEach((fn) => { try { fn(event, session); } catch (_) {} });
}

/** Appel d'authentification : met la session à jour si le serveur en renvoie une. */
async function authCall(path: string, body: unknown, event?: AuthEvent): Promise<Result<{ session: Session | null }>> {
  const { status, json } = await send("POST", path, body);
  if (status !== 200) return { data: null, error: fail(status, json) };
  if (json && "session" in json) setSession(json.session, json.session ? event : undefined);
  return { data: json, error: null };
}

export const api = {
  /** Procédure du serveur : classements, amis, duels, salles, sauvegarde. */
  async rpc<T = any>(name: string, args?: Record<string, unknown>): Promise<Result<T>> {
    const { status, json } = await send("POST", "/api/rpc/" + name, args ?? {});
    if (status !== 200) return { data: null, error: fail(status, json) };
    return { data: json ? json.data : null, error: null };
  },

  /** Ouvre la partie classée du jour (ranked) : { ranked, token } ou { ranked: false, reason }. */
  async rankedStart(body: unknown): Promise<any> {
    const { json } = await send("POST", "/api/ranked/start", body);
    return json ?? { ranked: false, reason: "offline" };
  },

  /** Envoi d'un journal de choix à vérifier (défi du jour, duel) : réponse brute du serveur. */
  async submitScore(kind: "daily" | "duel", body: unknown): Promise<any> {
    const { status, json } = await send("POST", "/api/scores/" + kind, body);
    return json ?? { ok: false, error: status ? "Erreur du serveur" : "Serveur injoignable" };
  },

  auth: {
    get session(): Session | null { return session; },

    /** Relit la session auprès du serveur (au chargement de la page). */
    async load(): Promise<Session | null> {
      const { status, json } = await send("GET", "/api/auth/session");
      if (status === 200) setSession(json ? json.session : null, "INITIAL_SESSION");
      return session;
    },
    signUp: (email: string, password: string) => authCall("/api/auth/signup", { email, password }, "SIGNED_IN"),
    signIn: (email: string, password: string) => authCall("/api/auth/login", { email, password }, "SIGNED_IN"),
    resend: (email: string) => authCall("/api/auth/resend", { email }),
    forgot: (email: string) => authCall("/api/auth/forgot", { email }),
    /** Lien « mot de passe oublié » : ouvre une session qui permet d'en choisir un nouveau. */
    recover: (token: string) => authCall("/api/auth/recover", { token }, "PASSWORD_RECOVERY"),
    /** `current` est exigé, sauf dans une session ouverte par un lien de récupération. */
    updatePassword: (password: string, current?: string) => authCall("/api/auth/password", { password, current }),
    async signOut(): Promise<void> {
      await send("POST", "/api/auth/logout", {});
      setSession(null, "SIGNED_OUT");
    },
    /** Annonce une connexion faite ailleurs que par signIn (lien de confirmation). */
    announce(event: AuthEvent): void { setSession(session, event); },
    onChange(fn: (event: AuthEvent, session: Session | null) => void): void { listeners.add(fn); },
  },

  /**
   * Prévient à chaque changement d'une salle. Le serveur n'envoie qu'un signal,
   * l'appelant relit l'état ; la reconnexion est automatique. Renvoie de quoi
   * arrêter l'écoute.
   */
  /** Canal personnel : prévient quand une notification arrive (même logique que watchRoom). */
  watchMe(onNotif: () => void): () => void {
    return this.watchRoom("", onNotif);
  },

  watchRoom(roomId: string, onChange: () => void): () => void {
    let socket: WebSocket | null = null;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      if (stopped) return;
      try {
        socket = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/live" + (roomId ? "?room=" + encodeURIComponent(roomId) : ""));
      } catch (_) { return; }
      socket.onmessage = () => onChange();
      // 4403 : le serveur refuse (plus membre, plus connecté) — inutile d'insister.
      socket.onclose = (e) => { if (!stopped && e.code !== 4403) retry = setTimeout(connect, 3000); };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      if (socket) { try { socket.close(); } catch (_) {} }
    };
  },
};
