// Résonance — première connexion d'un compte issu de generer_identifiants.py.
//
// Le coupon donne un identifiant et un mot de passe dont l'empreinte (PBKDF2-SHA256)
// a été importée dans la table comptes_import. À la première connexion, cette fonction
// vérifie le mot de passe, crée le vrai compte Supabase avec ce même mot de passe,
// puis retire la ligne d'import. Les connexions suivantes passent directement par Supabase Auth.
//
// Déploiement : Supabase → Edge Functions → Deploy a new function → nom « premiere-connexion »,
// coller ce fichier, et DÉCOCHER « Verify JWT » (l'élève n'est pas encore connecté).

import { createClient } from "npm:@supabase/supabase-js@2";

const DOMAINE = "resonance.invalid"; // identique à DOMAINE_COMPTES dans index.html

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reponse = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...cors, "Content-Type": "application/json" } });

async function verifier(motDePasse: string, empreinte: string): Promise<boolean> {
  const [algo, iter, sel, attendu] = empreinte.split("$");
  if (algo !== "pbkdf2_sha256" || !iter || !sel || !attendu) return false;
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(motDePasse), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(sel), iterations: Number(iter) }, cle, 256);
  const calcule = btoa(String.fromCharCode(...new Uint8Array(bits)));
  // Comparaison en temps constant.
  if (calcule.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < calcule.length; i++) diff |= calcule.charCodeAt(i) ^ attendu.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reponse({ ok: false }, 405);

  let identifiant = "", motDePasse = "";
  try {
    const corps = await req.json();
    identifiant = String(corps.identifiant ?? "").trim().toUpperCase();
    motDePasse = String(corps.mot_de_passe ?? "");
  } catch {
    return reponse({ ok: false }, 400);
  }
  if (!/^P[CR]-[A-Z0-9]{5}$/.test(identifiant) || !motDePasse) return reponse({ ok: false }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: compte } = await admin.from("comptes_import").select("*").eq("identifiant", identifiant).maybeSingle();
  if (!compte || !(await verifier(motDePasse, compte.empreinte))) return reponse({ ok: false }, 401);

  const { data: cree, error } = await admin.auth.admin.createUser({
    email: `${identifiant.toLowerCase()}@${DOMAINE}`,
    password: motDePasse,
    email_confirm: true,
    app_metadata: { role: compte.role, identifiant, classe: compte.classe },
  });
  if (error || !cree.user) return reponse({ ok: false, erreur: error?.message ?? "création impossible" }, 500);

  const { error: errProfil } = await admin.from("profils").insert({
    id: cree.user.id, identifiant, role: compte.role, classe: compte.classe, classes: compte.classes,
  });
  if (errProfil) {
    await admin.auth.admin.deleteUser(cree.user.id);
    return reponse({ ok: false, erreur: errProfil.message }, 500);
  }
  await admin.from("comptes_import").delete().eq("identifiant", identifiant);
  return reponse({ ok: true });
});
