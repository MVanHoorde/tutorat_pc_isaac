/* Résonance — ce que partagent toutes les pages du dépôt (index.html, outils/…).
   Une seule copie de la connexion à Supabase : même projet, même origine, donc même session
   (supabase-js la range dans localStorage sous CLE_SESSION). Script classique, sans dépendance :
   il ne charge rien par lui-même ; RESONANCE.client() exige que supabase-js soit déjà là,
   RESONANCE.chargerClient() le charge à la demande (pages Outils). */
(function(){
"use strict";
// Clé « anon » : publique par conception, les droits réels sont fixés par les règles de la base (supabase/schema.sql).
const SUPABASE_URL = "https://mnqcmjmypkleptbmqtws.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ucWNtam15cGtsZXB0Ym1xdHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3OTg2MzgsImV4cCI6MjEwNTM3NDYzOH0.6D3QDDW4DYm_xErBwCom6xdKeMhOUf1TbUDZPN-Q0bc";
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
let client = null, chargement = null;

window.RESONANCE = {
  SUPABASE_URL, SUPABASE_ANON, SUPABASE_JS,
  DOMAINE_COMPTES: "resonance.invalid",          // identique à DOMAINE dans la fonction premiere-connexion
  CLE_SESSION: "sb-mnqcmjmypkleptbmqtws-auth-token",

  /* Client Supabase unique de la page ; null si supabase-js n'a pas pu se charger (hors ligne). */
  client(){
    if(!client && window.supabase) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    return client;
  },
  /* Pour les pages qui ne chargent pas supabase-js d'office : on ne le télécharge que s'il sert. */
  chargerClient(){
    if(window.supabase) return Promise.resolve(this.client());
    if(!chargement) chargement = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = SUPABASE_JS; s.async = true;
      s.onload = () => ok(this.client());
      s.onerror = () => { chargement = null; ko(new Error('supabase-js indisponible')); };
      document.head.appendChild(s);
    });
    return chargement;
  },
  /* Une session a-t-elle été ouverte sur cet appareil ? (lecture locale, sans réseau) */
  sessionStockee(){
    try{ return !!localStorage.getItem(this.CLE_SESSION); }catch(e){ return false; }
  },
  role: s => (s && s.user && s.user.app_metadata && s.user.app_metadata.role) || 'visiteur',
  identifiant: s => (s && s.user && s.user.app_metadata && s.user.app_metadata.identifiant) || '',
  /* Espace complet (Tutorat + Participation + Outils) : enseignants et élèves de terminale.
     Les premières n'ont que le Tutorat (décision de M. Van Hoorde, 17/10/2026). La classe vient du
     compte (« B1_T_3_… » terminale, « B1_P_3_… » première ; « TEST » compte comme terminale).
     Classe inconnue : Tutorat seulement, par prudence. */
  espaceComplet(s){
    const r = this.role(s);
    if (r === 'prof') return true;
    if (r !== 'eleve') return false;
    const c = String((s.user.app_metadata && s.user.app_metadata.classe) || '').trim();
    return /_T_/i.test(c) || /^t/i.test(c);
  },
  esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
})();
