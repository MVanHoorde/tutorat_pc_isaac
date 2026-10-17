// Parcours Python ↔ Résonance : enregistre les exercices réussis sur le compte de l'élève connecté.
// Module ES, à charger APRÈS parcours.js dans chaque page du parcours :
//   <script src="progression-resonance.js" type="module"></script>
//
// - Sans session Résonance sur cet appareil : ce module ne fait RIEN (aucune requête, aucun script chargé,
//   la page reste telle quelle) — le parcours reste en libre accès.
// - Élève connecté (même origine que Résonance, donc même session) :
//   · au chargement, relit ses réussites du niveau et les remarque via window.ppProgression.marquerReussi
//     (qui ne réémet pas pp:reussi) ;
//   · à chaque événement pp:reussi, enregistre { niveau, exercice } dans python_reussites (migration 005).
//     Jamais le code tapé. Hors ligne, la réussite attend en mémoire et part au retour du réseau.
// - Enseignant connecté : rien n'est enregistré ; seul le lien de retour vers Résonance est ajouté.
// - Tout élève connecté (premières comprises) : bouton « J'ai vu un bug » (../../signalement.js, migration 006),
//   qui envoie la rubrique (python-nN), le fichier et l'exercice à l'écran.
// Les tables et les droits sont dans supabase/migrations/005_python.sql.

const COMMUN = new URL('../../commun.js', import.meta.url).href;
const RESONANCE_URL = new URL('../../index.html#outils', import.meta.url).href;
const SIGNALEMENT = new URL('../../signalement.js', import.meta.url).href;

function sessionPresente() {
  // Même nom de clé que commun.js ; lu sans rien charger, pour ne rien faire du tout hors connexion.
  try { return !!localStorage.getItem('sb-mnqcmjmypkleptbmqtws-auth-token'); } catch (e) { return false; }
}

function chargerScript(src, dejaLa = () => !!window.RESONANCE) {
  return new Promise((ok, ko) => {
    if (dejaLa()) return ok();
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => ko(new Error(src.split('/').pop() + ' introuvable'));
    document.head.appendChild(s);
  });
}

// window.ppProgression est posé par parcours.js (module chargé avant celui-ci) ; on l'attend un peu par prudence.
function attendreParcours(delai = 10000) {
  return new Promise((ok) => {
    const t0 = performance.now();
    (function voir() {
      if (window.ppProgression) return ok(window.ppProgression);
      if (performance.now() - t0 > delai) return ok(null);
      setTimeout(voir, 100);
    })();
  });
}

const niveauDeLaPage = () => {
  const n = Number(document.body.dataset.niveau);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};
const exerciceValide = (id) => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(id);

// « J'ai vu un bug » : où était l'élève quand il a touché le bouton. L'étape et l'exercice dont le haut
// a passé le milieu de l'écran ; « Étape 3 · Types de valeurs et affichage — 3.2 Prédire l'affichage ».
function contextePython() {
  const n = niveauDeLaPage();
  const page = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  const mi = window.innerHeight / 2, vu = (x) => { const r = x.getBoundingClientRect(); return r.height && r.top < mi && r.bottom > 0; };
  let seance = null, exo = null;
  for (const s of document.querySelectorAll('.seance')) if (vu(s)) seance = s;
  for (const a of document.querySelectorAll('article.exo')) if (vu(a)) exo = a;
  const propre = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  let etape = '';
  if (seance) {
    const num = propre(seance.querySelector('.pp-snum') && seance.querySelector('.pp-snum').textContent);
    const titre = propre(seance.dataset.titre);
    etape = /^Étape/.test(num) ? num + (titre ? ' · ' + titre : '') : titre;
  }
  if (exo && (!seance || seance.contains(exo))) {
    const h = exo.querySelector('h3');
    etape += (etape ? ' — ' : '') + (h ? propre(h.textContent) : exo.id);
  }
  const rubrique = n ? 'Parcours Python, niveau ' + n : 'Parcours Python';
  return { cle: n ? 'python-n' + n : 'python', page, etape: etape.slice(0, 120), ou: rubrique + (etape ? ' · ' + etape : '') };
}

async function installerSignalement(sb) {
  try {
    await chargerScript(SIGNALEMENT, () => !!window.RESONANCE_SIGNALEMENT);
    window.RESONANCE_SIGNALEMENT.installer({ sb, contexte: contextePython });
  } catch (e) { console.warn('Bouton « J’ai vu un bug » indisponible :', e.message || e); }
}

// Bandeau discret : dit à l'élève ce qui est enregistré, et le ramène à Résonance.
function bandeau(texte) {
  const tete = document.querySelector('.pp-head') || document.body;
  const p = document.createElement('p');
  p.className = 'pp-resonance';
  p.style.cssText = 'margin:14px 0 0;font-size:13.5px;line-height:1.45;max-width:62ch';
  const a = document.createElement('a');
  a.href = RESONANCE_URL;
  a.textContent = '← Résonance';
  a.style.cssText = 'font-weight:600;margin-right:10px';
  p.append(a, document.createTextNode(texte));
  tete.append(p);
  return p;
}

async function demarrer() {
  if (!sessionPresente()) return;

  // L'écoute commence tout de suite : une réussite obtenue pendant le chargement n'est pas perdue.
  const enAttente = [];
  let envoyer = null;
  document.addEventListener('pp:reussi', (e) => {
    const d = e.detail || {};
    const niveau = Number(d.niveau) || niveauDeLaPage();
    if (!niveau || !exerciceValide(d.exo)) return;
    enAttente.push({ niveau, exercice: d.exo });
    if (envoyer) envoyer();
  });

  let sb, session;
  try {
    await chargerScript(COMMUN);
    sb = await window.RESONANCE.chargerClient();
    ({ data: { session } } = await sb.auth.getSession());
  } catch (e) {
    console.warn('Résonance indisponible : progression non enregistrée.', e);
    return;
  }
  if (!session) return;
  const R = window.RESONANCE, role = R.role(session), ident = R.identifiant(session);
  if (role === 'eleve' && R.espaceComplet(session)) installerSignalement(sb);   // terminales seulement

  if (role !== 'eleve') {
    bandeau(role === 'prof' ? 'Vue enseignant : vos essais ne sont pas enregistrés.' : '');
    return;
  }
  // Le parcours Python est réservé à l'espace de terminale : rien n'est enregistré pour les premières.
  if (!R.espaceComplet(session)) { bandeau(''); return; }
  bandeau('Connecté·e (' + ident + ') : tes exercices réussis sont enregistrés sur ton compte, jamais ton code.');

  // Envoi : une requête à la fois ; une réussite déjà enregistrée est ignorée par la base.
  let enCours = false;
  envoyer = async () => {
    if (enCours || !enAttente.length) return;
    enCours = true;
    const lot = enAttente.splice(0);
    try {
      const { error } = await sb.from('python_reussites')
        .upsert(lot, { onConflict: 'eleve,niveau,exercice', ignoreDuplicates: true });
      if (error) throw error;
    } catch (e) {
      // Hors ligne, ou base pas encore prête (migration 005) : on garde le lot pour plus tard.
      enAttente.unshift(...lot);
      console.warn('Réussite non enregistrée pour l’instant :', e.message || e);
    } finally { enCours = false; }
  };
  window.addEventListener('online', () => envoyer());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') envoyer(); });
  setInterval(() => { if (enAttente.length) envoyer(); }, 30000);
  envoyer();

  // Restauration : ce que l'élève a déjà réussi, sur cet appareil ou un autre.
  const niveau = niveauDeLaPage();
  const pp = niveau ? await attendreParcours() : null;
  if (niveau && pp) {
    const { data, error } = await sb.from('python_reussites').select('exercice').eq('niveau', niveau);
    if (!error) for (const r of data) pp.marquerReussi(r.exercice);
    return;
  }

  // Page d'accueil du parcours : le nombre d'exercices réussis, niveau par niveau.
  if (document.body.classList.contains('pp-hub')) {
    const { data, error } = await sb.from('python_reussites').select('niveau');
    if (error || !data.length) return;
    const parNiveau = {};
    for (const r of data) parNiveau[r.niveau] = (parNiveau[r.niveau] || 0) + 1;
    for (const a of document.querySelectorAll('.niveau a[href^="niveau-"]')) {
      const n = Number((a.getAttribute('href').match(/niveau-(\d)/) || [])[1]);
      const etat = a.closest('.niveau') && a.closest('.niveau').querySelector('.etat');
      if (n && parNiveau[n] && etat) {
        const b = document.createElement('b');
        b.textContent = ' · ' + parNiveau[n] + ' exercice' + (parNiveau[n] > 1 ? 's' : '') + ' réussi' + (parNiveau[n] > 1 ? 's' : '');
        etat.append(b);
      }
    }
  }
}

demarrer();
