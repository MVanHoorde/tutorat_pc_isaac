// Résonance — notifications sur l'appareil (Web Push).
//
// Appelée par le site :
//   { test: true }                      → notification d'essai sur les appareils du compte connecté ;
//   { seance_id: 12 }                   → (enseignant) séance validée : prévient le tuteur et l'élève aidé ;
//   { seance_id: 12, annulation: true } → (enseignant) séance annulée, appelée AVANT la suppression.
// Les notifications ne contiennent aucun nom : date, horaire, chapitre et rôle seulement.
//
// Secrets (supabase secrets set) : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
// La clé publique est aussi dans index.html (VAPID_PUBLIC).

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SITE = "https://mvanhoorde.github.io/tutorat_pc_isaac/";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reponse = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...cors, "Content-Type": "application/json" } });

// Mêmes créneaux que LIGNES dans index.html.
const HORAIRES: Record<string, string> = {
  r1: "récré de 9 h 55",
  r2: "récré de 15 h 15",
  s: "séance de 15 h 15 à 16 h 20",
};
const dateLongue = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

type Message = { titre: string; texte: string; tag: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reponse({ ok: false }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: qui } = await admin.auth.getUser(jeton);
  if (!qui?.user) return reponse({ ok: false, erreur: "non connecté" }, 401);
  const estProf = qui.user.app_metadata?.role === "prof";

  let corps: { test?: boolean; seance_id?: number; annulation?: boolean } = {};
  try { corps = await req.json(); } catch { return reponse({ ok: false }, 400); }

  webpush.setVapidDetails(SITE, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

  // Destinataires : compte → message.
  const envois = new Map<string, Message>();
  if (corps.test) {
    envois.set(qui.user.id, { titre: "Résonance", texte: "Les notifications fonctionnent sur cet appareil ✓", tag: "essai" });
  } else if (corps.seance_id) {
    if (!estProf) return reponse({ ok: false, erreur: "réservé aux enseignants" }, 403);
    const { data: s } = await admin.from("seances").select("*").eq("id", corps.seance_id).maybeSingle();
    if (!s) return reponse({ ok: false, erreur: "séance introuvable" }, 404);
    const quand = `${dateLongue(s.jour)}, ${HORAIRES[String(s.creneau).split("-")[0]] ?? s.creneau}`;
    const titre = corps.annulation ? "Séance de tutorat annulée" : "Séance de tutorat validée";
    const fin = corps.annulation ? "" : " Au CDI. Ton professeur te dit avec qui.";
    envois.set(s.tuteur, { titre, texte: `${quand} — tu aides un camarade sur « ${s.chapitre} ».${fin}`, tag: `seance-${s.id}` });
    for (const t of s.tutores ?? []) {
      envois.set(t, { titre, texte: `${quand} — un tuteur t'aide sur « ${s.chapitre} ».${fin}`, tag: `seance-${s.id}` });
    }
  } else {
    return reponse({ ok: false, erreur: "requête incomplète" }, 400);
  }

  const { data: abonnements } = await admin.from("abonnements_push").select("*").in("compte", [...envois.keys()]);
  const atteints = new Set<string>();
  await Promise.all((abonnements ?? []).map(async (a) => {
    const m = envois.get(a.compte)!;
    try {
      await webpush.sendNotification(
        { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
        JSON.stringify({ ...m, url: SITE }),
        { TTL: 4 * 24 * 3600, urgency: "high" },
      );
      atteints.add(a.compte);
    } catch (e) {
      // Abonnement expiré ou retiré par l'appareil : on l'oublie.
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("abonnements_push").delete().eq("endpoint", a.endpoint);
    }
  }));

  // Pour l'enseignant : qui a été prévenu (identifiants des comptes, jamais de noms).
  return reponse({ ok: true, atteints: [...atteints], non_atteints: [...envois.keys()].filter((c) => !atteints.has(c)) });
});
