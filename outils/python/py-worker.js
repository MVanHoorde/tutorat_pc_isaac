// Parcours Python — worker MODULE (Pyodide 314 refuse les workers classiques).
// SÉCURITÉ : Pyodide ne tourne qu'ici. Le worker n'a pas accès au localStorage de la page
// (où vit le jeton Supabase) : c'est la barrière qui protège l'élève. Ne jamais déplacer
// l'exécution du code élève sur le thread principal.
import { loadPyodide } from '../../vendor/pyodide/pyodide.mjs';

const BASE = new URL('../../vendor/pyodide/', import.meta.url).href;
const PRELUDE = new URL('py-prelude.py', import.meta.url).href;
const FRIENDLY_WHL = 'friendly_traceback-0.7.61-py3-none-any.whl';
const MAX_CARACTERES = 200000;   // au-delà, la sortie d'un run est tronquée

let py = null;
let fn = {};                     // fonctions Python du prélude
let courant = null;              // id de l'exécution en cours
let muet = false;                // pendant le check : on n'affiche rien
let sortie = '';                 // stdout du run en cours, pour _sortie du check
let compte = 0;
let tronque = false;
const t0 = performance.now();
const ms = () => Math.round(performance.now() - t0);

// Les lignes sont regroupées avant envoi : un print dans une boucle produirait sinon
// des dizaines de milliers de messages, et la page se figerait à les afficher.
let tampon = '', fluxTampon = null, dernierEnvoi = 0;

function vider() {
  if (tampon && courant !== null) postMessage({ type: 'out', id: courant, flux: fluxTampon, text: tampon });
  tampon = ''; fluxTampon = null; dernierEnvoi = performance.now();
}

function emettre(flux, s) {
  if (muet || courant === null) return;
  const texte = s + '\n';
  if (flux === 'out' && sortie.length < MAX_CARACTERES) sortie += texte;
  if (tronque) return;
  compte += texte.length;
  if (compte > MAX_CARACTERES) {
    tronque = true;
    vider();
    postMessage({ type: 'out', id: courant, flux: 'info', text: '… sortie tronquée (trop de lignes affichées).\n' });
    return;
  }
  if (fluxTampon !== null && fluxTampon !== flux) vider();
  fluxTampon = flux;
  tampon += texte;
  if (tampon.length > 8000 || performance.now() - dernierEnvoi > 100) vider();
}

// appelé par le prélude Python pour chaque figure matplotlib
self.ppFigure = (u8, largeur, hauteur) => {
  if (muet || courant === null) return;
  vider();
  const copie = u8.slice();
  postMessage({ type: 'figure', id: courant, png: copie.buffer, largeur, hauteur }, [copie.buffer]);
};

// ---------- chargement, en trois temps ----------
// 1. cœur Python (le ▶ des exercices sans numpy part dès ici)
// 2. friendly-traceback (explications d'erreurs en français, 0,8 Mo)
// 3. numpy + matplotlib (13 Mo) : attendus seulement par le code qui les importe
let resoudreCoeur, resoudreFriendly, resoudrePaquets;
const coeur = new Promise((r) => (resoudreCoeur = r));
const friendly = new Promise((r) => (resoudreFriendly = r));
const paquets = new Promise((r) => (resoudrePaquets = r));

async function demarrer() {
  try {
    py = await loadPyodide({ indexURL: BASE });
    py.setStdout({ batched: (s) => emettre('out', s) });
    py.setStderr({ batched: (s) => emettre('err', s) });
    py.setStdin({ stdin: () => { throw new Error('input() indisponible'); } });
    const src = await (await fetch(PRELUDE)).text();
    py.FS.writeFile('/home/pyodide/pp_prelude.py', src);
    py.runPython('import sys; sys.path.insert(0, "/home/pyodide"); import pp_prelude');
    const mod = py.pyimport('pp_prelude');
    for (const nom of ['executer', 'verifier', 'imports', 'preparer_matplotlib', 'preparer_friendly', 'oublier_console']) fn[nom] = mod[nom];
    postMessage({ type: 'statut', etat: 'pret', ms: ms() });
    resoudreCoeur();
  } catch (e) {
    postMessage({ type: 'statut', etat: 'echec', message: String(e && e.message || e) });
    return;
  }
  try {
    await py.loadPackage(['six', 'asttokens', 'executing', 'pure-eval', 'stack-data'], { messageCallback: () => {} });
    await py.loadPackage(BASE + FRIENDLY_WHL, { messageCallback: () => {} });
    fn.preparer_friendly();
  } catch (e) { /* sans friendly : messages courts seulement */ }
  resoudreFriendly();
  try {
    await py.loadPackage(['numpy', 'matplotlib'], { messageCallback: () => {} });
    fn.preparer_matplotlib();
    postMessage({ type: 'statut', etat: 'paquets', ms: ms() });
  } catch (e) {
    postMessage({ type: 'statut', etat: 'paquets-echec', message: String(e && e.message || e) });
  }
  resoudrePaquets();
}

// ---------- exécutions, une à la fois ----------
let file = Promise.resolve();
let scipyCharge = false;

async function traiter(m) {
  await coeur;
  await friendly;
  let besoin = [];
  try { besoin = fn.imports(m.code).toJs(); } catch (e) { besoin = []; }
  // La correction automatique peut importer numpy même si l'élève ne l'a pas fait :
  // attendre aussi ses paquets, sinon elle échouerait en silence.
  if (m.check) { try { besoin = besoin.concat(fn.imports(m.check).toJs()); } catch (e) { /* check illisible : ignoré */ } }
  if (besoin.some((n) => n === 'numpy' || n === 'matplotlib')) {
    let attendu = false;
    const minuteur = setTimeout(() => { attendu = true; postMessage({ type: 'attente', id: m.id }); }, 50);
    await paquets;
    clearTimeout(minuteur);
    if (attendu) postMessage({ type: 'attente-fin', id: m.id });
  }
  // scipy (14 Mo) n'est téléchargé que si un exercice l'importe — niveaux 4 et 5.
  if (besoin.includes('scipy') && !scipyCharge) {
    postMessage({ type: 'attente', id: m.id });
    try { await py.loadPackage(['scipy'], { messageCallback: () => {} }); scipyCharge = true; } catch (e) { /* l'import échouera avec son message */ }
    postMessage({ type: 'attente-fin', id: m.id });
  }
  courant = m.id; sortie = ''; compte = 0; tronque = false; muet = false; tampon = ''; fluxTampon = null; dernierEnvoi = performance.now();
  postMessage({ type: 'debut', id: m.id });
  const t = performance.now();
  let res = null, verdict = null;
  try {
    // fichiers de données de l'exercice (np.loadtxt, open) : réécrits à chaque exécution dans le
    // répertoire courant, pour que l'élève retrouve toujours le fichier d'origine
    for (const f of m.fichiers || []) {
      if (f && typeof f.contenu === 'string' && /^[\w-]+\.(csv|txt|dat|tsv)$/i.test(f.nom || '')) {
        py.FS.writeFile(py.FS.cwd() + '/' + f.nom, f.contenu);
      }
    }
    const r = fn.executer(m.code, m.mode || 'script', m.cle || '');
    vider();
    res = r.toJs({ dict_converter: Object.fromEntries });
    r.destroy();
    if (!res.erreur && m.check) {
      muet = true;
      try {
        const v = fn.verifier(m.check, sortie);
        if (v) { verdict = v.toJs({ dict_converter: Object.fromEntries }); v.destroy(); }
      } catch (e) { verdict = null; }
      muet = false;
    }
  } catch (e) {
    res = { erreur: { type: 'Erreur interne', ligne: null, court: "Python n'a pas pu exécuter ce code.", brut: String(e && e.message || e).split('\n').slice(-2).join(' '), detail: '' } };
  }
  muet = false;
  vider();
  const duree = Math.round(performance.now() - t);
  postMessage({ type: 'fin', id: m.id, erreur: res.erreur || null, remarques: res.remarques || [], verdict, ms: duree });
  courant = null;
}

self.onmessage = (ev) => {
  const m = ev.data || {};
  if (m.type === 'run') file = file.then(() => traiter(m)).catch(() => {});
  else if (m.type === 'oublier') file = file.then(async () => { await coeur; fn.oublier_console(m.cle); });
};

demarrer();
