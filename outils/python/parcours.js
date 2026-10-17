// Parcours Python — moteur de page (module ES, vanilla, sans build).
// Lit la grammaire HTML des pages de niveau (.seance, .exo, .py, .qcm, .solution…)
// et la rend interactive. Python (Pyodide) tourne dans py-worker.js, JAMAIS ici :
// la page détient le jeton Supabase (localStorage), le worker n'y a pas accès.
// Tout ce qui vient du worker est traité comme des données : textContent et Blob, jamais innerHTML.
import * as CM from '../../vendor/codemirror/codemirror-python.min.js';

const ICI = import.meta.url;
const DELAI_SECOURS = 9000;   // ms après le début d'un run : au-delà, le worker est tué et relancé
                              // (le garde-temps Python coupe à 5 s ; ceci rattrape les longs calculs C)

// ---------------------------------------------------------------- utilitaires
function el(tag, attrs, ...enfants) {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants) if (e != null) n.append(e);
  return n;
}

// retire la ligne vide initiale, les lignes vides finales et l'indentation commune (code écrit dans le HTML)
function dedent(texte) {
  let l = texte.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  while (l.length && !l[0].trim()) l.shift();
  while (l.length && !l[l.length - 1].trim()) l.pop();
  const marges = l.filter((x) => x.trim()).map((x) => x.match(/^ */)[0].length);
  const m = marges.length ? Math.min(...marges) : 0;
  return l.map((x) => x.slice(m).replace(/\s+$/, '')).join('\n');
}

const reduitMouvement = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- statut Python
const zoneStatut = document.querySelector('.pp-statut');
const pastilleStatut = zoneStatut ? el('span', { class: 'pp-statut-pastille' }) : null;
if (zoneStatut) { zoneStatut.textContent = ''; zoneStatut.append(pastilleStatut); }
function statut(texte, etat) {
  if (!zoneStatut) return;
  pastilleStatut.textContent = texte;
  zoneStatut.dataset.etat = etat;
}

// ---------------------------------------------------------------- moteur (un seul worker par page)
const mesures = (window.ppMesures = { debut: performance.now() });

const Moteur = {
  worker: null,
  etat: 'arret',            // charge | pret | echec
  paquets: false,
  runs: new Map(),
  seq: 0,
  consoles: new Set(),      // consoles à prévenir d'un redémarrage

  demarrer(relance) {
    this.etat = 'charge';
    this.paquets = false;
    statut(relance ? 'Python redémarre…' : 'Python se prépare… (téléchargement la 1re fois)', 'charge');
    try {
      this.worker = new Worker(new URL('py-worker.js', ICI), { type: 'module' });
    } catch (e) {
      this.echec('ce navigateur ne sait pas lancer Python (iPadOS 16.4 ou plus récent requis).');
      return;
    }
    this.worker.onmessage = (e) => this.recevoir(e.data);
    this.worker.onerror = (e) => { e.preventDefault(); this.echec('le chargement a échoué. Rechargez la page.'); };
  },

  echec(raison) {
    this.etat = 'echec';
    statut('Python n\'a pas pu démarrer : ' + raison, 'echec');
    for (const r of this.runs.values()) r.resoudre({ echec: true });
    this.runs.clear();
  },

  recevoir(m) {
    if (m.type === 'statut') {
      if (m.etat === 'pret') {
        this.etat = 'pret';
        if (mesures.pret == null) mesures.pret = Math.round(performance.now() - mesures.debut);
        statut('Python est prêt', 'pret');
        for (const r of this.runs.values()) r.gestion.surPret && r.gestion.surPret();
      } else if (m.etat === 'paquets') {
        this.paquets = true;
        if (mesures.paquets == null) mesures.paquets = Math.round(performance.now() - mesures.debut);
      } else if (m.etat === 'echec') {
        this.echec('le chargement a échoué. Rechargez la page.');
      }
      return;
    }
    const r = this.runs.get(m.id);
    if (!r) return;
    const g = r.gestion;
    switch (m.type) {
      case 'out': g.surSortie && g.surSortie(m.flux, m.text); break;
      case 'figure': g.surFigure && g.surFigure(m.png, m.largeur, m.hauteur); break;
      case 'attente': g.surAttente && g.surAttente(true); break;
      case 'attente-fin': g.surAttente && g.surAttente(false); break;
      case 'debut':
        g.surDebut && g.surDebut();
        r.secours = setTimeout(() => this.redemarrer('long'), DELAI_SECOURS);
        break;
      case 'fin':
        clearTimeout(r.secours);
        this.runs.delete(m.id);
        r.resoudre(m);
        break;
    }
  },

  executer(params, gestion) {
    if (this.etat === 'echec') return Promise.resolve({ echec: true });
    const id = ++this.seq;
    return new Promise((resoudre) => {
      this.runs.set(id, { gestion, resoudre, secours: null });
      this.worker.postMessage({ type: 'run', id, ...params });
    });
  },

  // ■ Arrêter, ou calcul interminable : on tue le worker et on en relance un neuf
  redemarrer(raison) {
    if (this.worker) this.worker.terminate();
    for (const r of this.runs.values()) { clearTimeout(r.secours); r.resoudre({ arrete: raison }); }
    this.runs.clear();
    for (const c of this.consoles) c.surRedemarrage();
    this.demarrer(true);
  },

  oublierConsole(cle) {
    if (this.worker) this.worker.postMessage({ type: 'oublier', cle });
  },
};

// ---------------------------------------------------------------- coloration statique (pre.code)
function colorer(pre) {
  const code = dedent(pre.textContent);
  if (pre.classList.contains('sortie')) { pre.textContent = code; return; }   // affichage attendu : pas de coloration
  pre.textContent = '';
  try {
    const arbre = CM.pythonLanguage.parser.parse(code);
    let pos = 0;
    CM.highlightTree(arbre, CM.classHighlighter, (de, a, classes) => {
      if (de > pos) pre.append(code.slice(pos, de));
      pre.append(el('span', { class: classes, text: code.slice(de, a) }));
      pos = a;
    });
    if (pos < code.length) pre.append(code.slice(pos));
  } catch (e) {
    pre.textContent = code;
  }
}

// ---------------------------------------------------------------- progression (pas de persistance en V1)
const etatExos = new Map();   // id d'exo -> { reussi, essai, cibles:Map(cle -> ok) , qcm:Map }
const reussis = new Set();

function etatExo(exo) {
  if (!exo) return null;
  if (!etatExos.has(exo)) etatExos.set(exo, { reussi: false, essai: false, runOk: false, checks: new Map(), qcms: new Map() });
  return etatExos.get(exo);
}

function marquerEssai(exo) {
  const e = etatExo(exo);
  if (!e || e.essai) return;
  e.essai = true;
  deverrouillerSolutions(exo);
}

function marquerReussi(exo, opts = {}) {
  const e = etatExo(exo);
  if (!e || e.reussi) return;
  e.reussi = true;
  reussis.add(exo.id);
  exo.classList.add('reussi');
  const h = exo.querySelector('h3');
  if (h && !h.querySelector('.pp-reussi')) h.append(el('span', { class: 'pp-reussi', text: '✓ réussi' }));
  majSommaire();
  if (!opts.silencieux) {
    document.dispatchEvent(new CustomEvent('pp:reussi', {
      detail: { exo: exo.id, seance: exo.closest('.seance')?.id || null, niveau: document.body.dataset.niveau || null },
    }));
  }
}

// Règle de réussite d'un exercice :
// - partie code : si l'exo a des éditeurs avec check, chacun doit avoir atteint son nombre de « ok »
//   distincts (data-attendus, 1 par défaut) ; sinon, une exécution sans erreur (script ou console) suffit ;
// - partie questions : avec du code, toutes les questions de ses .quiz doivent être trouvées ;
//   sans code, toutes ses .qcm (dans un quiz ou non).
function evaluerExo(exo) {
  const e = etatExo(exo);
  if (!e || e.reussi) return;
  const avecCode = !!exo.querySelector('.py');
  const avecCheck = [...exo.querySelectorAll('.py')].filter((p) => p.dataset.mode !== 'console' && p.querySelector('.py-check'));
  const qcms = [...exo.querySelectorAll(avecCode ? '.quiz .qcm' : '.qcm')];
  if (!avecCode && !qcms.length) return;
  const codeOk = !avecCode || (avecCheck.length ? avecCheck.every((p) => e.checks.get(p) === true) : e.runOk);
  const qcmOk = qcms.every((q) => e.qcms.get(q) === true);
  if (codeOk && qcmOk) marquerReussi(exo);
}

window.ppProgression = {
  reussis: () => [...reussis],
  estReussi: (id) => reussis.has(id),
  // pour restaurer un état venu d'ailleurs (Supabase, plus tard) sans réémettre pp:reussi
  marquerReussi: (id) => { const x = document.getElementById(id); if (x && x.classList.contains('exo')) marquerReussi(x, { silencieux: true }); },
};

// ---------------------------------------------------------------- solutions verrouillées
const TEXTE_VERROU = 'Voir une solution — après un premier essai';

function preparerSolutions() {
  for (const d of document.querySelectorAll('details.solution')) {
    const exo = d.closest('.exo');
    if (!exo) continue;
    const s = d.querySelector('summary');
    if (!s) continue;
    s.dataset.texte = s.textContent;
    d.classList.add('verrou');
    d.open = false;
    s.textContent = TEXTE_VERROU;
    s.setAttribute('aria-disabled', 'true');
    s.addEventListener('click', (ev) => { if (d.classList.contains('verrou')) ev.preventDefault(); });
    s.addEventListener('keydown', (ev) => {
      if (d.classList.contains('verrou') && (ev.key === 'Enter' || ev.key === ' ')) ev.preventDefault();
    });
  }
}

function deverrouillerSolutions(exo) {
  for (const d of exo.querySelectorAll('details.solution.verrou')) {
    const s = d.querySelector('summary');
    d.classList.remove('verrou');
    s.textContent = s.dataset.texte;
    s.removeAttribute('aria-disabled');
  }
}

// ---------------------------------------------------------------- rendu commun d'une sortie
class Sortie {
  constructor(zone) { this.zone = zone; this.flux = null; }
  vider() { this.zone.textContent = ''; this.flux = null; }
  texte(classe, t) {
    if (!this.flux || this.flux.dataset.classe !== classe) {
      this.flux = el('pre', { class: 'py-flux ' + classe });
      this.flux.dataset.classe = classe;
      this.zone.append(this.flux);
    }
    this.flux.append(t);
    this.defiler();
  }
  info(t, temporaire) {
    const p = el('p', { class: 'py-info' + (temporaire ? ' temporaire' : ''), text: t });
    this.zone.append(p);
    this.flux = null;
    this.defiler();
    return p;
  }
  retirerTemporaires() { for (const p of this.zone.querySelectorAll('.temporaire')) p.remove(); }
  figure(buffer, largeur, hauteur) {
    const url = URL.createObjectURL(new Blob([buffer], { type: 'image/png' }));
    // PNG en dpi 200 : affiché à la moitié de sa taille en pixels pour rester net sur Retina
    const img = el('img', { class: 'py-figure', src: url, alt: 'Figure tracée par le programme', width: Math.round(largeur / 2), height: Math.round(hauteur / 2) });
    img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    this.zone.append(img);
    this.flux = null;
    this.defiler();
  }
  // Ordre voulu : (1) le message de Python lui-même, pour que l'élève apprenne à le reconnaître ;
  // (2) la phrase courte en français ; (3) l'explication détaillée, dépliable.
  erreur(err, avecLigne) {
    const tete = el('p', { class: 'py-erreur-python' });
    if (avecLigne && err.ligne) tete.append(el('span', { class: 'py-erreur-ligne', text: 'Ligne ' + err.ligne }));
    tete.append(el('code', { class: 'py-erreur-brut', text: err.brut || err.type }));
    const bloc = el('div', { class: 'py-erreur', role: 'alert', 'data-type': err.type }, tete,
      el('p', { class: 'py-erreur-court', text: err.court }));
    if (err.detail) {
      bloc.append(el('details', { class: 'py-erreur-detail' }, el('summary', { text: 'Explication détaillée' }),
        el('pre', { class: 'py-friendly', text: err.detail })));
    }
    this.zone.append(bloc);
    this.flux = null;
    this.defiler();
  }
  remarques(liste) {
    for (const r of liste || []) { this.zone.append(el('p', { class: 'py-remarque', text: r })); this.flux = null; }
  }
  defiler() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.zone.scrollTop = this.zone.scrollHeight; });
  }
}

function messageArret(raison) {
  return raison === 'long'
    ? 'Calcul trop long : Python a été arrêté puis redémarré.'
    : 'Exécution arrêtée. Python redémarre (quelques secondes).';
}

// ---------------------------------------------------------------- éditeur de script
const poserErreur = CM.StateEffect.define();
const champErreur = CM.StateField.define({
  create: () => CM.Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) if (e.is(poserErreur)) {
      deco = e.value == null ? CM.Decoration.none
        : CM.Decoration.set([CM.Decoration.line({ class: 'cm-ligne-erreur' }).range(tr.state.doc.line(e.value).from)]);
    }
    return deco;
  },
  provide: (f) => CM.EditorView.decorations.from(f),
});

const themeClair = CM.EditorView.theme({
  '&': { backgroundColor: '#FFFFFF', color: '#151B2B', fontSize: '15px' },
  '.cm-content': { fontFamily: 'var(--mono)', padding: '10px 0', caretColor: '#151B2B' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.6' },
  '.cm-gutters': { backgroundColor: '#F4F6F9', color: '#8A93A5', borderRight: '1px solid #D6DCE4' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 12px', minWidth: '2.2em' },
  '.cm-activeLineGutter': { backgroundColor: '#E8EBF1', color: '#151B2B' },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused .cm-matchingBracket': { backgroundColor: '#E3D8FF', outline: '1px solid #B9A3F5' },
  '&.cm-focused .cm-nonmatchingBracket': { backgroundColor: '#F9D9DC' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: '#D9E2F7 !important' },
  '.cm-ligne-erreur': { backgroundColor: '#FCE4E6', boxShadow: 'inset 3px 0 0 #C8414B' },
  '.cm-specialChar': { color: '#C8414B' },
}, { dark: false });

const TOUCHES = [
  { label: '⇥', aria: 'Indenter (décaler à droite)', cmd: 'plus' },
  { label: '⇤', aria: 'Désindenter (décaler à gauche)', cmd: 'moins' },
  '(', ')', '[', ']', "'", '"', '#', '=', ':', '.', ',', '*', '**', '_',
];

let numEditeur = 0;

// Fichiers de données : <script type="text/plain" class="py-fichier" data-nom="mesures.csv"> dans un .py.
// Nom simple, extension de données seulement (le worker refait le même contrôle).
const NOM_FICHIER = /^[\w-]+\.(csv|txt|dat|tsv)$/i;
let fichiersStyles = false;
function stylerFichiers() {   // feuille propre à la fonctionnalité, posée une fois, seulement si une page s'en sert
  if (fichiersStyles) return;
  fichiersStyles = true;
  document.head.append(el('style', { text:
    '.py-fichiers{display:flex;flex-direction:column;gap:6px;padding:7px 8px;background:var(--soft);border-top:1px solid var(--rule)}' +
    '.py-fichier>summary{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:4px 12px;border:1px solid var(--rule);' +
    'border-radius:8px;background:#fff;font-family:var(--mono);font-size:13px;color:var(--ink);cursor:pointer;list-style:none}' +
    '.py-fichier>summary::-webkit-details-marker{display:none}' +
    '.py-fichier>summary::after{content:"▸";color:var(--faint);margin-left:4px}' +
    '.py-fichier[open]>summary::after{content:"▾"}' +
    '.py-fichier>summary:focus-visible{outline:none;box-shadow:var(--focus)}' +
    '.py-fichier-contenu{margin:6px 0 0;padding:8px 12px;max-height:260px;overflow:auto;background:#fff;border:1px solid var(--rule);' +
    'border-radius:8px;font-family:var(--mono);font-size:13px;line-height:1.45;color:var(--ink-soft);white-space:pre}' +
    '.py-fichier-contenu:focus-visible{outline:none;box-shadow:var(--focus)}' }));
}

function creerEditeur(bloc) {
  const exo = bloc.closest('.exo');
  const ta = bloc.querySelector('textarea.py-code');
  const sc = bloc.querySelector('script.py-check');
  const depart = ta ? dedent(ta.value) : '';
  const check = sc ? dedent(sc.textContent) : '';
  const attendus = Math.max(1, parseInt(bloc.dataset.attendus, 10) || 1);
  const obtenus = new Set();          // messages ok distincts, cumulés au fil des exécutions
  const num = ++numEditeur;
  let enCours = false;

  const boutonLancer = el('button', { type: 'button', class: 'pp-btn lancer', 'aria-label': 'Exécuter le programme (Ctrl ou Cmd + Entrée)' }, el('span', { 'aria-hidden': 'true', text: '▶' }), ' Exécuter');
  const boutonArret = el('button', { type: 'button', class: 'pp-btn arret', 'aria-label': 'Arrêter le programme', hidden: true }, el('span', { 'aria-hidden': 'true', text: '■' }), ' Arrêter');
  const boutonDepart = el('button', { type: 'button', class: 'pp-btn discret depart', 'aria-label': 'Revenir au code de départ' }, el('span', { 'aria-hidden': 'true', text: '↺' }), ' Code de départ');
  const raccourci = el('span', { class: 'py-raccourci', 'aria-hidden': 'true', text: /Mac|iPad|iPhone/.test(navigator.platform || navigator.userAgent) ? '⌘ + Entrée' : 'Ctrl + Entrée' });
  const barre = el('div', { class: 'py-barre' },
    el('span', { class: 'py-nom', text: 'script.py' }), raccourci, boutonDepart, boutonArret, boutonLancer);
  const zoneEditeur = el('div', { class: 'py-editeur' });
  const touches = el('div', { class: 'py-touches', role: 'toolbar', 'aria-label': 'Touches de programmation' });
  const zoneSortie = el('div', { class: 'py-sortie', role: 'log', 'aria-live': 'polite', 'aria-label': 'Sortie du programme', hidden: true });
  const sortie = new Sortie(zoneSortie);

  const listeReussites = el('ul');
  const titreReussites = el('p', { class: 'py-reussites-titre' });
  const zoneReussites = el('div', { class: 'py-reussites', role: 'status', 'aria-live': 'polite', hidden: true }, titreReussites, listeReussites);

  // fichiers de données fournis avec l'exercice : écrits par le worker avant chaque exécution
  const fichiers = [...bloc.querySelectorAll('script.py-fichier')]
    .map((s) => ({ nom: (s.dataset.nom || '').trim(), contenu: dedent(s.textContent) + '\n' }))
    .filter((f) => NOM_FICHIER.test(f.nom));
  const zoneFichiers = fichiers.length ? el('div', { class: 'py-fichiers' }, ...fichiers.map((f) =>
    el('details', { class: 'py-fichier' },
      el('summary', { 'aria-label': 'Fichier de données ' + f.nom + ' (afficher le contenu)' },
        el('span', { 'aria-hidden': 'true', text: '📄' }), ' ' + f.nom),
      el('pre', { class: 'py-fichier-contenu', tabindex: '0', 'aria-label': 'Contenu de ' + f.nom + ', en lecture seule', text: f.contenu })))) : null;
  if (fichiers.length) stylerFichiers();

  if (ta) ta.hidden = true;
  bloc.append(barre, zoneEditeur, touches, zoneSortie, zoneReussites);
  if (zoneFichiers) touches.after(zoneFichiers);

  // « Question 2 — … » : le préfixe en gras
  function ligneReussite(msg) {
    const li = el('li');
    const m = msg.match(/^((?:Questions?|Étape|Partie)\s[^—–:]{1,30}?\s*[—–:])\s*(.*)$/s);
    if (m) li.append(el('strong', { text: m[1] }), ' ' + m[2]);
    else li.textContent = msg;
    return li;
  }
  function majReussites(nouveaux) {
    zoneReussites.hidden = obtenus.size === 0;
    const atteint = obtenus.size >= attendus;
    titreReussites.textContent = attendus > 1
      ? 'Vérifications réussies : ' + Math.min(obtenus.size, attendus) + ' / ' + attendus
      : 'Vérification réussie';
    bloc.classList.toggle('atteint', atteint);
    listeReussites.textContent = '';
    for (const msg of obtenus) {
      const li = ligneReussite(msg);
      if (nouveaux.has(msg)) li.classList.add('nouveau');
      listeReussites.append(li);
    }
  }

  const vue = new CM.EditorView({
    parent: zoneEditeur,
    state: CM.EditorState.create({
      doc: depart,
      extensions: [
        CM.lineNumbers(), CM.highlightActiveLineGutter(), CM.highlightSpecialChars(), CM.history(),
        CM.drawSelection(), CM.indentOnInput(), CM.bracketMatching(),
        CM.syntaxHighlighting(CM.classHighlighter), CM.python(),
        CM.indentUnit.of('    '), CM.EditorState.tabSize.of(4),
        CM.keymap.of([
          { key: 'Mod-Enter', run: () => { lancer(); return true; } },
          { key: 'Tab', run: CM.indentMore },
          { key: 'Shift-Tab', run: CM.indentLess },
          ...CM.defaultKeymap, ...CM.historyKeymap,
        ]),
        champErreur, themeClair,
        CM.EditorView.contentAttributes.of({
          autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', autocomplete: 'off',
          'aria-label': 'Éditeur de code Python, exercice ' + (exo?.querySelector('.num')?.textContent || num),
        }),
      ],
    }),
  });

  for (const t of TOUCHES) {
    const label = typeof t === 'string' ? t : t.label;
    const b = el('button', { type: 'button', class: 'py-touche', 'aria-label': typeof t === 'string' ? 'Insérer ' + t : t.aria, text: label });
    // ne pas voler le focus à l'éditeur : le clavier de l'iPad reste ouvert
    b.addEventListener('pointerdown', (ev) => ev.preventDefault());
    b.addEventListener('mousedown', (ev) => ev.preventDefault());
    b.addEventListener('click', () => {
      if (typeof t !== 'string') {
        (t.cmd === 'plus' ? CM.indentMore : CM.indentLess)(vue);
      } else {
        vue.dispatch(vue.state.replaceSelection(t), { scrollIntoView: true, userEvent: 'input.type' });
      }
      vue.focus();
    });
    touches.append(b);
  }

  function enMarche(oui) {
    enCours = oui;
    boutonArret.hidden = !oui;
    boutonLancer.disabled = oui;
    bloc.classList.toggle('en-cours', oui);
  }

  async function lancer() {
    if (enCours) return;
    marquerEssai(exo);
    const t0 = performance.now();
    enMarche(true);
    vue.dispatch({ effects: poserErreur.of(null) });
    zoneSortie.hidden = false;
    sortie.vider();
    let rien = true;
    if (Moteur.etat !== 'pret') sortie.info('Python se prépare… (téléchargement la 1re fois)', true);
    const fin = await Moteur.executer({ code: vue.state.doc.toString(), mode: 'script', check, fichiers }, {
      surDebut: () => sortie.retirerTemporaires(),
      surAttente: (oui) => { if (oui) sortie.info('Chargement de numpy et matplotlib…', true); else sortie.retirerTemporaires(); },
      surSortie: (flux, t) => { rien = false; sortie.texte(flux === 'err' ? 'err' : flux === 'info' ? 'note' : 'out', t); },
      surFigure: (b, w, h) => { rien = false; sortie.figure(b, w, h); },
    });
    enMarche(false);
    sortie.retirerTemporaires();
    bloc.dataset.dureeMs = Math.round(performance.now() - t0);
    if (fin.echec) { sortie.info('Python est indisponible : rechargez la page.'); return; }
    if (fin.arrete) { sortie.info(messageArret(fin.arrete)); return; }
    if (fin.erreur) {
      const n = fin.erreur.ligne;
      if (n && n >= 1 && n <= vue.state.doc.lines) {
        vue.dispatch({ effects: [poserErreur.of(n), CM.EditorView.scrollIntoView(vue.state.doc.line(n).from, { y: 'center' })] });
      }
      sortie.erreur(fin.erreur, true);
      return;
    }
    if (rien && !fin.verdict) sortie.info('Le programme s\'est exécuté sans rien afficher.');
    sortie.remarques(fin.remarques);
    const e = etatExo(exo);
    if (e) e.runOk = true;
    if (check && fin.verdict) {
      const nouveaux = new Set();
      for (const msg of fin.verdict.oks || []) {
        if (!obtenus.has(msg)) { obtenus.add(msg); nouveaux.add(msg); }
      }
      if (obtenus.size) majReussites(nouveaux);
      if (fin.verdict.indice) {
        zoneSortie.append(el('p', { class: 'py-verdict indice', role: 'status' },
          el('strong', { text: 'Indice : ' }), fin.verdict.indice));
      }
      if (e && obtenus.size >= attendus) e.checks.set(bloc, true);
      sortie.defiler();
    }
    if (exo) evaluerExo(exo);
  }

  boutonLancer.addEventListener('click', lancer);
  boutonArret.addEventListener('click', () => Moteur.redemarrer('stop'));
  boutonDepart.addEventListener('click', () => {
    vue.dispatch({
      changes: { from: 0, to: vue.state.doc.length, insert: depart },
      effects: poserErreur.of(null),
      userEvent: 'input.reset',
    });
    sortie.vider();
    zoneSortie.hidden = true;
    vue.focus();
  });
  bloc.ppVue = vue;   // utile aux tests et au débogage
}

// ---------------------------------------------------------------- console interactive
let numConsole = 0;

function creerConsole(bloc) {
  const exo = bloc.closest('.exo');
  const cle = 'console-' + (++numConsole);
  const historique = [];
  let pos = 0, enCours = false;

  const journal = el('div', { class: 'py-log', role: 'log', 'aria-live': 'polite', 'aria-label': 'Échanges avec la console Python' });
  const sortie = new Sortie(journal);
  const champ = el('input', {
    type: 'text', class: 'py-ligne', autocorrect: 'off', autocapitalize: 'off', autocomplete: 'off',
    spellcheck: 'false', enterkeyhint: 'go', 'aria-label': 'Instruction Python à exécuter',
    placeholder: 'tapez une instruction puis Entrée',
  });
  const boutonEntree = el('button', { type: 'submit', class: 'pp-btn lancer petit', 'aria-label': 'Exécuter la ligne' }, el('span', { 'aria-hidden': 'true', text: '⏎' }));
  const formulaire = el('form', { class: 'py-saisie' }, el('span', { class: 'py-invite', 'aria-hidden': 'true', text: '>>>' }), champ, boutonEntree);
  const boutonEffacer = el('button', { type: 'button', class: 'pp-btn discret', 'aria-label': 'Effacer l\'écran de la console (les variables sont conservées)', text: 'Effacer' });
  const barre = el('div', { class: 'py-barre' }, el('span', { class: 'py-nom', text: 'Console Python' }), boutonEffacer);
  bloc.classList.add('console');
  bloc.append(barre, journal);

  const exemples = (bloc.dataset.exemples || '').split('|').map((s) => s.trim()).filter(Boolean);
  if (exemples.length) {
    const chips = el('div', { class: 'py-exemples' }, el('span', { class: 'py-exemples-titre', text: 'Essayez :' }));
    for (const ex of exemples) {
      chips.append(el('button', { type: 'button', class: 'py-chip', 'aria-label': 'Écrire ' + ex + ' dans la console', text: ex, onclick: () => { champ.value = ex; champ.focus(); } }));
    }
    bloc.append(chips);
  }
  bloc.append(formulaire);

  async function executerLigne(code) {
    if (enCours || !code.trim()) return;
    marquerEssai(exo);
    historique.push(code); pos = historique.length;
    sortie.texte('echo', '>>> ' + code + '\n');
    champ.value = '';
    enCours = true; bloc.classList.add('en-cours');
    if (Moteur.etat !== 'pret') sortie.info('Python se prépare… (téléchargement la 1re fois)', true);
    const fin = await Moteur.executer({ code, mode: 'console', cle }, {
      surDebut: () => sortie.retirerTemporaires(),
      surAttente: (oui) => { if (oui) sortie.info('Chargement de numpy et matplotlib…', true); else sortie.retirerTemporaires(); },
      surSortie: (flux, t) => sortie.texte(flux === 'err' ? 'err' : flux === 'info' ? 'note' : 'out', t),
      surFigure: (b, w, h) => sortie.figure(b, w, h),
    });
    enCours = false; bloc.classList.remove('en-cours');
    sortie.retirerTemporaires();
    if (fin.echec) sortie.info('Python est indisponible : rechargez la page.');
    else if (fin.arrete) sortie.info(messageArret(fin.arrete));
    else if (fin.erreur) sortie.erreur(fin.erreur, false);
    else {
      sortie.remarques(fin.remarques);
      const e = etatExo(exo);
      if (e) { e.runOk = true; evaluerExo(exo); }
    }
    sortie.defiler();
  }

  formulaire.addEventListener('submit', (ev) => { ev.preventDefault(); executerLigne(champ.value); });
  champ.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowUp' && historique.length) {
      ev.preventDefault(); pos = Math.max(0, pos - 1); champ.value = historique[pos];
    } else if (ev.key === 'ArrowDown' && historique.length) {
      ev.preventDefault(); pos = Math.min(historique.length, pos + 1); champ.value = historique[pos] || '';
    }
  });
  boutonEffacer.addEventListener('click', () => { sortie.vider(); champ.focus(); });

  Moteur.consoles.add({
    surRedemarrage() { sortie.info('Python a redémarré : les variables de cette console ont été effacées.'); },
  });
}

// ---------------------------------------------------------------- QCM
function creerQcm(q) {
  const exo = q.closest('.exo');
  const quiz = q.closest('.quiz');
  const bonne = q.dataset.bonne;
  const expl = q.querySelector('.qcm-expl');
  const options = [...q.querySelectorAll('button.opt')];
  // options regroupées dans une grille (2 ou 3 colonnes selon la largeur, à partir de 4 options)
  const grille = el('div', { class: 'qcm-opts' + (options.length >= 4 ? ' grille' : '') + (options.length >= 6 && options.length % 3 === 0 ? ' trois' : '') });
  if (options.length) { options[0].before(grille); grille.append(...options); }
  const retour = el('p', { class: 'qcm-retour', role: 'status', 'aria-live': 'polite' });
  if (expl) expl.before(retour); else if (grille.parentNode) grille.after(retour); else q.append(retour);
  for (const b of options) {
    // une option faite d'un seul <code> s'affiche en mono, sans fond
    const enfants = [...b.childNodes].filter((n) => n.nodeType === 1 || n.textContent.trim());
    if (enfants.length === 1 && enfants[0].nodeName === 'CODE') b.classList.add('code-seul');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      if (q.classList.contains('resolu') || b.disabled) return;
      const juste = b.dataset.v === bonne;
      b.setAttribute('aria-pressed', 'true');
      if (exo && !exo.querySelector('.py')) marquerEssai(exo);
      if (juste) {
        b.classList.add('bonne');
        q.classList.add('resolu');
        for (const o of options) if (o !== b) o.disabled = true;
        retour.textContent = '✓ Bonne réponse.';
        retour.className = 'qcm-retour ok';
        const e = etatExo(exo);
        if (e) { e.qcms.set(q, true); evaluerExo(exo); }
        if (quiz && quiz.ppMaj) quiz.ppMaj();
      } else {
        b.classList.add('fausse');
        b.disabled = true;
        retour.textContent = 'Ce n\'est pas cette réponse — vous pouvez réessayer.';
        retour.className = 'qcm-retour non';
      }
      // L'explication donne la bonne réponse : elle n'apparaît qu'une fois celle-ci trouvée.
      if (expl && juste) expl.hidden = false;
    });
  }
}

// ---------------------------------------------------------------- quiz : en-tête « QUIZ · N QUESTIONS » et score
function creerQuiz(quiz) {
  const qcms = [...quiz.querySelectorAll('.qcm')];
  const n = qcms.length;
  const titre = quiz.querySelector(':scope > h4');
  const score = el('span', { class: 'quiz-score', 'aria-live': 'polite' });
  const tete = el('div', { class: 'quiz-tete' },
    el('span', { class: 'quiz-badge', text: 'Quiz · ' + n + ' question' + (n > 1 ? 's' : '') }));
  if (titre) tete.append(titre);
  tete.append(score);
  const corps = el('div', { class: 'quiz-corps' });
  corps.append(...[...quiz.childNodes]);
  quiz.append(tete, corps);
  qcms.forEach((q, i) => {
    const enonce = q.querySelector('.qcm-q');
    if (enonce) {
      const contenu = el('span', null, ...[...enonce.childNodes]);
      enonce.append(el('span', { class: 'qcm-n', 'aria-hidden': 'true', text: String(i + 1) }), contenu);
    }
  });
  quiz.ppMaj = () => {
    const trouves = qcms.filter((q) => q.classList.contains('resolu')).length;
    score.textContent = trouves + ' / ' + n;
    score.setAttribute('aria-label', trouves + ' question' + (trouves > 1 ? 's' : '') + ' trouvée' + (trouves > 1 ? 's' : '') + ' sur ' + n);
    quiz.classList.toggle('complet', n > 0 && trouves === n);
  };
  quiz.ppMaj();
}

// ---------------------------------------------------------------- aide progressive : un indice à la fois
function creerAide(aide) {
  const items = [...aide.querySelectorAll(':scope > ol > li, :scope > ul > li')];
  if (!items.length) return;
  const n = items.length;
  let vus = 0;
  for (const li of items) li.hidden = true;
  const compte = el('p', { class: 'aide-compte', hidden: true });
  const bouton = el('button', { type: 'button', class: 'aide-bouton', 'aria-expanded': 'false' },
    el('span', { 'aria-hidden': 'true', text: '💡' }), el('span', { text: 'Aide' }));
  aide.prepend(compte);
  aide.append(bouton);
  bouton.addEventListener('click', () => {
    if (vus >= n) return;
    const li = items[vus++];
    li.hidden = false;
    li.classList.add('vient');
    compte.hidden = false;
    compte.textContent = 'Aide ' + vus + ' / ' + n;
    bouton.setAttribute('aria-expanded', 'true');
    bouton.lastChild.textContent = 'Indice suivant';
    if (vus >= n) bouton.hidden = true;
  });
}

// ---------------------------------------------------------------- document à télécharger
const ICONE_DOC = '<svg viewBox="0 0 42 48" aria-hidden="true" focusable="false"><path d="M6 2h21l13 13v29a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#fff" stroke="currentColor" stroke-width="2"/><path d="M27 2v11a2 2 0 0 0 2 2h11" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8" y="27" width="26" height="12" rx="2" fill="currentColor"/><text x="21" y="36.2" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="8.5" font-weight="600" fill="#fff">PDF</text></svg>';

function preparerDoc(a) {
  const titre = a.textContent.trim();
  const action = a.dataset.legende || 'Télécharger le sujet (PDF)';
  const icone = el('span', { class: 'doc-icone' });
  icone.innerHTML = ICONE_DOC;   // constante du moteur, jamais une donnée venue d'ailleurs
  const libelle = el('span', { class: 'doc-action', text: action });
  a.textContent = '';
  a.append(icone, el('span', { class: 'doc-texte' }, el('span', { class: 'doc-titre', text: titre }), libelle),
    el('span', { class: 'doc-fleche', 'aria-hidden': 'true', text: '⤓' }));
  if (!/^https?:$/.test(location.protocol)) return;   // ouvert en fichier local : on ne peut pas vérifier
  fetch(a.href, { method: 'HEAD', cache: 'no-store' }).then((r) => {
    if (r.ok) return;
    // fichier absent : un bouton grisé plutôt qu'un lien cassé
    const remplacant = el('span', { class: a.className + ' indisponible', 'aria-disabled': 'true' }, ...[...a.childNodes]);
    libelle.textContent = 'PDF bientôt disponible';
    remplacant.querySelector('.doc-fleche')?.remove();
    a.replaceWith(remplacant);
  }).catch(() => {});
}

// ---------------------------------------------------------------- séances : accent, pastille S1, encadrés
const ACCENTS = [
  ['#2445C7', '#E8ECFB'],   // bleu
  ['#12805C', '#E1F3EA'],   // vert
  ['#6B45D6', '#EFEAFC'],   // violet
  ['#B45309', '#FCEFDF'],   // ambre
  ['#C2365F', '#FBE8EE'],   // corail
  ['#0E7490', '#DFF2F7'],   // cyan
];
const NEUTRE = ['#161F33', '#EDF0F5'];

function preparerSeances() {
  let rang = 0;
  for (const s of document.querySelectorAll('.seance')) {
    const neutre = s.id === 'mode-emploi' || s.id === 'bilan' || s.classList.contains('bilan');
    const [c, w] = neutre ? NEUTRE : ACCENTS[rang % ACCENTS.length];
    // Titre : « Étape 3 » ; sommaire, où la place manque : « 3 » (décision de Loïc, 17/10/2026).
    const court = neutre ? (s.id === 'mode-emploi' ? '?' : '∑') : String(rang + 1);
    const etiquette = neutre ? court : 'Étape ' + court;
    if (!neutre) rang++;
    s.style.setProperty('--accent', c);
    s.style.setProperty('--accent-wash', w);
    s.dataset.pastille = court;
    const h2 = s.querySelector('h2');
    if (h2 && !h2.querySelector('.pp-snum')) {
      // « 1. Titre » ou « Séance 1 — Titre » : le numéro passe dans la pastille
      const premier = h2.firstChild;
      if (!neutre && premier && premier.nodeType === 3) {
        premier.textContent = premier.textContent.replace(/^\s*(?:(?:Séance|Étape)\s*)?\d+\s*(?:[.—–:-]\s*)?/i, '');
      }
      h2.prepend(el('span', { class: 'pp-snum', 'aria-hidden': 'true', text: etiquette }));
    }
  }
}

const TITRES_DEFAUT = { retenir: 'À retenir', info: 'Bon à savoir', coulisses: 'Derrière le rideau' };

function preparerEncadres() {
  for (const [classe, titre] of Object.entries(TITRES_DEFAUT)) {
    for (const b of document.querySelectorAll('.' + classe)) {
      if (!b.querySelector(':scope > h4')) b.prepend(el('h4', { text: titre }));
    }
  }
  for (const b of document.querySelectorAll('.plus')) {
    const h = b.querySelector(':scope > h4');
    if (h && /^pour aller plus loin\.?$/i.test(h.textContent.trim())) h.remove();
    b.prepend(el('span', { class: 'pp-badge', text: 'pour aller plus loin' }));
  }
  for (const b of document.querySelectorAll('.etiquette.ece')) {
    // « <b>À l'ECE</b> — texte » : le <b> devient le badge
    const premier = b.firstElementChild;
    if (premier && premier === b.firstChild && /ECE/i.test(premier.textContent)) {
      premier.remove();
      if (b.firstChild && b.firstChild.nodeType === 3) b.firstChild.textContent = b.firstChild.textContent.replace(/^\s*[—–:-]\s*/, '');
    }
    b.prepend(el('span', { class: 'pp-badge', text: 'À l\'ECE' }));
  }
  for (const t of document.querySelectorAll('table.tableau')) {
    if (!t.parentElement.classList.contains('pp-table-defil')) {
      const w = el('div', { class: 'pp-table-defil' });
      t.before(w); w.append(t);
    }
  }
  for (const p of document.querySelectorAll('.pp-surtitre, .pp-invite')) {
    const n = p.firstChild;
    if (n && n.nodeType === 3 && /^\s*>>>/.test(n.textContent)) {
      n.textContent = n.textContent.replace(/^\s*>>>\s*/, '');
      p.prepend(el('span', { class: 'pp-chevrons', 'aria-hidden': 'true', text: '>>>' }));
    }
  }
}

// ---------------------------------------------------------------- sommaire
const sommaire = document.querySelector('.pp-sommaire');
const liensSeance = new Map();

function compterExos(seance) {
  const exos = [...seance.querySelectorAll('.exo')].filter((x) => x.querySelector('.py, .qcm'));
  return { total: exos.length, faits: exos.filter((x) => reussis.has(x.id)).length, exos };
}

function construireSommaire() {
  if (!sommaire) return;
  sommaire.setAttribute('aria-label', 'Sommaire des étapes');
  const liste = el('ol', { class: 'pp-som-liste' });
  for (const s of document.querySelectorAll('.seance')) {
    const titre = s.dataset.titre || s.querySelector('h2')?.textContent || s.id;
    const { total, exos } = compterExos(s);
    const compte = el('span', { class: 'pp-som-compte', 'aria-label': '0 exercice réussi sur ' + total });
    const lien = el('a', { href: '#' + s.id, class: 'pp-som-seance' },
      el('span', { class: 'pp-snum', 'aria-hidden': 'true', text: s.dataset.pastille || '' }),
      el('span', { class: 'pp-som-titre', text: titre }), compte);
    const sous = el('ol', { class: 'pp-som-exos' });
    for (const x of exos) {
      const n = x.querySelector('.num')?.textContent || x.id;
      sous.append(el('li', null, el('a', { href: '#' + x.id, 'data-exo': x.id }, el('span', { class: 'pp-som-pastille', 'aria-hidden': 'true' }), n)));
    }
    const li = el('li', { 'data-seance': s.id }, lien, sous);
    li.style.setProperty('--accent', s.style.getPropertyValue('--accent'));
    li.style.setProperty('--accent-wash', s.style.getPropertyValue('--accent-wash'));
    liste.append(li);
    liensSeance.set(s, { lien, compte, sous });
  }
  sommaire.append(el('p', { class: 'pp-som-entete', text: 'Étapes' }), liste);
  majSommaire();

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entrees) => {
      for (const en of entrees) {
        const l = liensSeance.get(en.target);
        if (l && en.isIntersecting) {
          for (const x of liensSeance.values()) x.lien.removeAttribute('aria-current');
          l.lien.setAttribute('aria-current', 'true');
          if (window.innerWidth < 1100) l.lien.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduitMouvement() ? 'auto' : 'smooth' });
        }
      }
    }, { rootMargin: '-30% 0px -60% 0px' });
    for (const s of liensSeance.keys()) obs.observe(s);
  }
}

function majSommaire() {
  for (const [s, l] of liensSeance) {
    const { total, faits } = compterExos(s);
    l.compte.textContent = total ? faits + '/' + total : '';
    l.compte.setAttribute('aria-label', faits + ' exercice' + (faits > 1 ? 's' : '') + ' réussi' + (faits > 1 ? 's' : '') + ' sur ' + total);
    l.lien.classList.toggle('complet', total > 0 && faits === total);
    for (const a of l.sous.querySelectorAll('a[data-exo]')) {
      const ok = reussis.has(a.dataset.exo);
      a.classList.toggle('reussi', ok);
      a.title = ok ? 'Exercice réussi' : '';
    }
  }
}

// ---------------------------------------------------------------- démarrage
function initialiser() {
  Moteur.demarrer(false);   // Pyodide se charge en tâche de fond dès l'ouverture
  preparerSeances();
  preparerEncadres();
  for (const p of document.querySelectorAll('pre.code')) colorer(p);
  preparerSolutions();
  for (const b of document.querySelectorAll('.py')) {
    if (b.dataset.mode === 'console') creerConsole(b);
    else creerEditeur(b);
  }
  for (const q of document.querySelectorAll('.qcm')) creerQcm(q);
  for (const z of document.querySelectorAll('.quiz')) creerQuiz(z);
  for (const a of document.querySelectorAll('.aide')) creerAide(a);
  for (const a of document.querySelectorAll('a.doc')) preparerDoc(a);
  construireSommaire();
  document.body.classList.add('pp-pret');
}

initialiser();
