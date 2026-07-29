// ============================================================
//  Chargeur de moteur partagé (submit-daily + submit-duel).
//  Récupère data.js + engine.js DÉPLOYÉS et les évalue → le serveur rejoue
//  EXACTEMENT le moteur que le joueur a utilisé (aucune copie à maintenir).
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

let ENGINE: any = null;
export async function getEngine(): Promise<any> {
  if (ENGINE) return ENGINE;
  const base = (Deno.env.get("GAME_ORIGIN") || "https://openeleven.laugh.yt").replace(/\/+$/, "");
  const [dataSrc, engineSrc] = await Promise.all([
    fetch(`${base}/data.js`).then((r) => r.text()),
    fetch(`${base}/engine.js`).then((r) => r.text()),
  ]);
  const g: any = globalThis;
  // data.js : son bloc d'export s'active quand `module` existe → pose les données
  // sur `global` (= globalThis ici) : NATIONALITIES, LEVELS, BALANCE, etc.
  const dataMod: any = { exports: {} };
  new Function("global", "module", "exports", "window", dataSrc)(g, dataMod, dataMod.exports, undefined);
  // engine.js : IIFE qui lit ces globals et pose module.exports = Engine.
  const engMod: any = { exports: {} };
  new Function("global", "module", "exports", "window", engineSrc)(g, engMod, engMod.exports, undefined);
  if (!engMod.exports || typeof engMod.exports.scoreDaily !== "function") {
    throw new Error("Moteur chargé sans scoreDaily/scoreDuel — version déployée trop ancienne ?");
  }
  ENGINE = engMod.exports;
  return ENGINE;
}

// Client authentifié (avec le JWT du joueur) → renvoie l'utilisateur ou null.
export async function authUser(req: Request) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const client = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await client.auth.getUser();
  return error || !data?.user ? null : data.user;
}

// Client admin (service_role) : contourne la RLS pour écrire les scores vérifiés.
export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

// Validation d'un journal de choix (petits entiers, borné).
export function validChoices(choices: unknown): choices is number[] {
  if (!Array.isArray(choices) || choices.length > 400) return false;
  return choices.every((c) => Number.isInteger(c) && (c as number) >= -1 && (c as number) <= 64);
}
