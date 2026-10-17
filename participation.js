/* Résonance — participation orale et dépôts de ressources (points bonus).
   Chargé avant le script principal d'index.html, dont il utilise sb, session, role, corresp,
   esc, nomAffiche et dateCourte au moment des appels (jamais au chargement).

   La participation elle-même est l'application déjà utilisée en classe (pages A01-…),
   ouverte dans un cadre : ce module ne fait que le transport, chiffré de bout en bout.
   - Chaque appareil fabrique une paire de clés (ECDH P-256). La clé privée reste dans
     l'appareil (IndexedDB) ; la clé publique est déposée dans cles_publiques.
   - La séance (liste des noms comprise) est chiffrée pour les appareils de l'observateur,
     le relevé pour ceux du professeur. Le serveur ne voit que des boîtes fermées. */
(function(){
"use strict";

/* Pages de participation : même origine que Résonance, donc même stockage. */
const URL_PARTICIPATION = /\.github\.io$/.test(location.hostname) ? '/participation_terminale/' : '../Appli_part_spe/';
/* Empreintes des clés de l'enseignant, recopiées depuis l'onglet Participation.
   Vide : l'élève fait confiance aux clés lues dans la base. Remplie : il refuse toute
   autre clé, même si quelqu'un parvenait à en glisser une dans la base. */
const EMPREINTES_PROF = [];
const CLE_LIENS = 'resonance-liens-participation';
const ACTIVE_JOURS = 180;            // clés d'appareil prises en compte

const $ = s => document.querySelector(s);
const uid = () => session && session.user.id;
const moduleActif = () => document.body.classList.contains('module-participation');
const vueOuverte = n => { const v = document.getElementById('v-'+n); return !!(v && v.classList.contains('on')); };

/* =====================================================================
   Chiffrement
   ===================================================================== */
const ECDH = {name:'ECDH', namedCurve:'P-256'};
const enc = new TextEncoder(), dec = new TextDecoder();
function b64(buf){
  const u = new Uint8Array(buf); let s = '';
  for(let i=0; i<u.length; i+=0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i+0x8000));
  return btoa(s);
}
const deb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const jwkPublic = j => ({kty:'EC', crv:'P-256', x:j.x, y:j.y});

async function empreinteDe(jwk){
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(jwk.x+'.'+jwk.y)));
  return Array.from(h.slice(0,8), x => x.toString(16).padStart(2,'0')).join('').toUpperCase().match(/.{4}/g).join('-');
}
/* Secret partagé ECDH → clé AES-GCM (SHA-256 du secret et d'une étiquette de version). */
async function cleCommune(prive, publiqueJwk){
  const pub = await crypto.subtle.importKey('jwk', jwkPublic(publiqueJwk), ECDH, true, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH', public:pub}, prive, 256));
  const etiquette = enc.encode('resonance/participation/v1');
  const m = new Uint8Array(secret.length + etiquette.length); m.set(secret); m.set(etiquette, secret.length);
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', m), 'AES-GCM', false, ['encrypt','decrypt']);
}
/* Une boîte = clé éphémère + texte chiffré. Le contexte (« seance:JETON », « releve:JETON »)
   est authentifié : une boîte ne peut pas être déplacée d'une séance à une autre. */
async function chiffrerPour(publiqueJwk, texte, contexte){
  const eph = await crypto.subtle.generateKey(ECDH, true, ['deriveBits']);
  const cle = await cleCommune(eph.privateKey, publiqueJwk);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:enc.encode(contexte)}, cle, enc.encode(texte));
  return {v:1, e:jwkPublic(await crypto.subtle.exportKey('jwk', eph.publicKey)), iv:b64(iv), ct:b64(ct)};
}
async function dechiffrer(boite, prive, contexte){
  if(!boite || boite.v !== 1) throw new Error('boîte inconnue');
  const cle = await cleCommune(prive, boite.e);
  const clair = await crypto.subtle.decrypt({name:'AES-GCM', iv:deb64(boite.iv), additionalData:enc.encode(contexte)}, cle, deb64(boite.ct));
  return dec.decode(clair);
}
async function chiffrerPourTous(cles, texte, contexte){
  const out = {};
  for(const c of cles) out[c.empreinte] = await chiffrerPour(c.cle, texte, contexte);
  return out;
}

/* ---- Clé de l'appareil (IndexedDB : une CryptoKey s'y range telle quelle) ---- */
function idb(mode, f){
  return new Promise((ok, ko) => {
    const r = indexedDB.open('resonance-cles', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('cles');
    r.onerror = () => ko(r.error);
    r.onsuccess = () => {
      const t = r.result.transaction('cles', mode), q = f(t.objectStore('cles'));
      t.oncomplete = () => ok(q && q.result); t.onerror = () => ko(t.error);
    };
  });
}
let cleMemoire = null;               // si IndexedDB est refusé (navigation privée) : clé de la visite
async function maCle(){
  const id = uid();
  if(cleMemoire && cleMemoire.compte === id) return cleMemoire;
  let c = null;
  try{ c = await idb('readonly', s => s.get(id)); }catch(e){}
  if(!c){
    // Le professeur doit pouvoir sauvegarder sa clé : elle est exportable. Celle d'un élève ne l'est pas.
    const p = await crypto.subtle.generateKey(ECDH, role === 'prof', ['deriveBits']);
    const publique = jwkPublic(await crypto.subtle.exportKey('jwk', p.publicKey));
    c = {prive:p.privateKey, publique, empreinte:await empreinteDe(publique)};
    try{ await idb('readwrite', s => s.put(c, id)); }catch(e){}
  }
  cleMemoire = {...c, compte:id};
  return cleMemoire;
}
async function publierMaCle(){
  const c = await maCle();
  const {error} = await sb.from('cles_publiques').upsert({compte:uid(), empreinte:c.empreinte, cle:c.publique, maj_le:new Date().toISOString()});
  if(error) throw error;
  return c;
}
async function clesDe(compte){
  const depuis = new Date(Date.now() - ACTIVE_JOURS*864e5).toISOString();
  const {data, error} = await sb.from('cles_publiques').select('empreinte,cle').eq('compte', compte).gte('maj_le', depuis);
  if(error) throw error;
  return data;
}

/* ---- Sauvegarde de la clé du professeur, protégée par une phrase de passe ---- */
async function clePhrase(phrase, sel){
  const base = await crypto.subtle.importKey('raw', enc.encode(phrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', hash:'SHA-256', salt:sel, iterations:310000},
    base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function sauverCle(){
  const c = await maCle();
  let jwk;
  try{ jwk = await crypto.subtle.exportKey('jwk', c.prive); }
  catch(e){ alert("Cette clé n'est pas exportable."); return; }
  const phrase = prompt("Phrase de passe pour protéger la sauvegarde (au moins 12 caractères). Notez-la : sans elle, la sauvegarde est illisible.");
  if(!phrase) return;
  if(phrase.length < 12){ alert('Phrase trop courte : 12 caractères au moins.'); return; }
  if(prompt('Retapez la phrase de passe.') !== phrase){ alert('Les deux saisies diffèrent.'); return; }
  const sel = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, await clePhrase(phrase, sel), enc.encode(JSON.stringify(jwk)));
  const txt = JSON.stringify({format:'resonance-cle-v1', empreinte:c.empreinte, sel:b64(sel), iv:b64(iv), ct:b64(ct)});
  const url = URL.createObjectURL(new Blob([txt], {type:'application/json'}));
  const a = document.createElement('a'); a.href = url;
  a.download = 'resonance-cle-'+c.empreinte+'.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
async function restaurerCle(fichier){
  try{
    const d = JSON.parse(await fichier.text());
    if(d.format !== 'resonance-cle-v1') throw new Error("ce fichier n'est pas une clé Résonance");
    const phrase = prompt('Phrase de passe de cette sauvegarde :');
    if(!phrase) return;
    let jwk;
    try{ jwk = JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:deb64(d.iv)}, await clePhrase(phrase, deb64(d.sel)), deb64(d.ct)))); }
    catch(e){ throw new Error('phrase de passe incorrecte'); }
    const prive = await crypto.subtle.importKey('jwk', jwk, ECDH, true, ['deriveBits']);
    const publique = jwkPublic(jwk);
    const c = {prive, publique, empreinte:await empreinteDe(publique)};
    if(!confirm('Remplacer la clé de cet appareil par celle de la sauvegarde ('+c.empreinte+') ?')) return;
    try{ await idb('readwrite', s => s.put(c, uid())); }catch(e){}
    cleMemoire = {...c, compte:uid()};
    await publierMaCle();
    afficherCle();
    alert('Clé restaurée.');
  }catch(e){ alert('Restauration impossible : '+e.message); }
}

/* =====================================================================
   Liens entre les noms de la participation et les comptes Résonance
   (sur l'appareil du professeur seulement, comme la correspondance)
   ===================================================================== */
const lireLiens = () => { try{ return JSON.parse(localStorage.getItem(CLE_LIENS)) || {}; }catch(e){ return {}; } };
const ecrireLiens = l => { try{ localStorage.setItem(CLE_LIENS, JSON.stringify(l)); }catch(e){} };
const motsNom = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const cleNom = s => motsNom(s).sort().join(' ');
const elevesCorresp = () => corresp ? Object.entries(corresp.eleves).filter(([id]) => /^PC-/.test(id)) : [];
/* Rattache les noms identiques (ordre des mots, accents et casse ignorés), seulement sans ambiguïté. */
function lierAuto(noms, liensCls){
  const index = {};
  elevesCorresp().forEach(([id, n]) => { const k = cleNom(n); (index[k] = index[k] || []).push(id); });
  const pris = new Set(Object.values(liensCls));
  let n = 0;
  noms.forEach(nom => {
    if(liensCls[nom]) return;
    const ids = (index[cleNom(nom)] || []).filter(id => !pris.has(id));
    if(ids.length === 1){ liensCls[nom] = ids[0]; pris.add(ids[0]); n++; }
  });
  return n;
}
function ressemblance(a, b){
  const A = motsNom(a), B = new Set(motsNom(b));
  return A.filter(m => B.has(m)).length;
}

/* =====================================================================
   Côté professeur
   ===================================================================== */
const cadreProf = () => $('#pCadreProf iframe');
const appProf = () => { try{ const f = cadreProf(); return f && f.contentWindow && f.contentWindow.PARTICIPATION; }catch(e){ return null; } };
let seanceCourante = null, fileEnvoi = Promise.resolve();

function etatSeance(html, pourCadre){
  const bar = $('#pSeanceBar');
  bar.innerHTML = html; bar.hidden = !html;
  const app = appProf();
  if(app) app.etat(pourCadre === undefined ? '' : pourCadre);
}

async function envoyerSeance(info){
  seanceCourante = info;
  etatSeance('<span>Envoi de la séance aux tablettes…</span>', '<div class="note">Envoi de la séance aux tablettes…</div>');
  const liens = lireLiens()[info.cls] || {};
  const idents = info.postes.map(p => liens[p.obs]).filter(Boolean);
  const {data:profils, error} = idents.length
    ? await sb.from('profils').select('id,identifiant').in('identifiant', idents) : {data:[]};
  if(error) throw error;
  // Un nouveau tirage abandonne les jetons précédents : leurs affectations disparaissent.
  const jetons = info.postes.map(p => p.jeton);
  await sb.from('obs_affectations').delete().eq('prof', uid()).not('jeton', 'in', '('+jetons.join(',')+')');
  const lignes = [];
  for(const p of info.postes){
    const qui = '<b>'+esc(p.obs)+'</b> (poste '+p.poste+')';
    const profil = profils.find(x => x.identifiant === liens[p.obs]);
    if(!profil){ lignes.push('⚠ '+qui+' : aucun compte Résonance relié, utilisez son QR code.'); continue; }
    const cles = await clesDe(profil.id);
    if(!cles.length){ lignes.push('⚠ '+qui+' ne s\'est jamais connecté à Résonance : utilisez son QR code.'); continue; }
    const boites = await chiffrerPourTous(cles, p.charge, 'seance:'+p.jeton);
    const r = await sb.from('obs_affectations').upsert({jeton:p.jeton, observateur:profil.id, poste:p.poste, jour:info.date, boites}, {onConflict:'jeton'});
    if(r.error){ lignes.push('⚠ '+qui+' : envoi refusé ('+esc(r.error.message)+').'); continue; }
    lignes.push('✓ '+qui+' : séance envoyée sur '+cles.length+' appareil'+(cles.length>1?'s':'')+(p.recu?' · relevé reçu':'')+'.');
  }
  const html = lignes.join('<br>');
  etatSeance('<span class="txt">'+html+'</span><button class="mini ghost" id="pRenvoyer">Renvoyer</button><button class="mini" id="pRecuperer">Récupérer les relevés</button>',
    '<div class="note">'+html+'<br>Les relevés arrivent ici tout seuls ; le QR code reste un secours.</div>');
  await recupererReleves();
}
function signalerEnvoi(info){
  fileEnvoi = fileEnvoi.then(() => envoyerSeance(info)).catch(e => etatSeance('<span>Envoi impossible : '+esc(e.message)+'</span><button class="mini ghost" id="pRenvoyer">Réessayer</button>', '<div class="warnbox">Envoi aux tablettes impossible : '+esc(e.message)+'. Utilisez les QR codes.</div>'));
}
async function fermerSeances(){
  seanceCourante = null;
  etatSeance('');
  const {error} = await sb.from('obs_affectations').delete().eq('prof', uid());
  if(error) console.error(error);
}

let recuperation = false;
async function recupererReleves(manuel){
  if(recuperation || !seanceCourante) return;
  const app = appProf(); if(!app) return;
  recuperation = true;
  try{
    const {data, error} = await sb.from('obs_releves').select('affectation_id,boites,recu_le,obs_affectations!inner(jeton,poste)');
    if(error) throw error;
    const c = await maCle(), problemes = [];
    let nouveaux = 0;
    for(const r of data){
      const a = r.obs_affectations, boite = r.boites[c.empreinte];
      if(!boite){ problemes.push('poste '+a.poste+' : relevé chiffré pour un autre appareil de l\'enseignant'); continue; }
      let txt;
      try{ txt = await dechiffrer(boite, c.prive, 'releve:'+a.jeton); }
      catch(e){ problemes.push('poste '+a.poste+' : relevé illisible'); continue; }
      const res = app.recevoirReleve(txt);
      if(res === 'ok') nouveaux++;
      if((res === 'ok' || res === 'deja') && !r.recu_le)
        await sb.from('obs_releves').update({recu_le:new Date().toISOString()}).eq('affectation_id', r.affectation_id);
    }
    if(manuel || problemes.length){
      alert((nouveaux ? nouveaux+' relevé'+(nouveaux>1?'s':'')+' reçu'+(nouveaux>1?'s':'')+'.' : 'Aucun nouveau relevé.')+
        (problemes.length ? '\n'+problemes.join('\n') : ''));
    }
  }catch(e){ if(manuel) alert('Récupération impossible : '+e.message); }
  finally{ recuperation = false; }
}
setInterval(() => {
  if(role === 'prof' && seanceCourante && document.visibilityState === 'visible') recupererReleves();
}, 10000);

/* Publie la période en cours de l'application dans la période ouverte en base (migration 007).
   Les deux doivent porter le même numéro : sinon rien n'est écrit, pour ne jamais verser les points
   d'une période dans une autre. Rend true si quelque chose a été publié. */
async function publierSuivi(cls, silencieux){
  const app = appProf();
  if(!app){ if(!silencieux) alert("Ouvrez d'abord l'application de participation."); return false; }
  const liens = lireLiens()[cls] || {}, lignes = app.suivi(cls).filter(l => liens[l.nom]);
  if(!lignes.length){ if(!silencieux) alert('Aucun élève de « '+cls+' » n\'est relié à un compte Résonance.'); return false; }
  const {data:profils, error} = await sb.from('profils').select('id,identifiant,classe').in('identifiant', lignes.map(l => liens[l.nom]));
  if(error){ alert('Suivi non publié : '+error.message); return false; }
  const classesRes = [...new Set(profils.map(p => p.classe).filter(Boolean))];
  const po = await sb.from('periodes').select('classe,numero').in('classe', classesRes).is('fin', null);
  if(po.error){ alert('Suivi non publié : '+po.error.message); return false; }
  const ouverte = Object.fromEntries(po.data.map(p => [p.classe, p.numero]));
  const parIdent = Object.fromEntries(profils.map(p => [p.identifiant, p])), maj = new Date().toISOString();
  const nApp = lignes[0].periode || 1, decalees = new Set(), rows = [];
  lignes.forEach(l => {
    const p = parIdent[liens[l.nom]]; if(!p) return;
    if(ouverte[p.classe] !== nApp){ decalees.add(p.classe+' ('+(ouverte[p.classe] ? 'période '+ouverte[p.classe]+' en base' : 'aucune période ouverte')+')'); return; }
    rows.push({eleve:p.id, periode:nApp, points:l.points, objectif:l.objectif, participation:l.participation,
      seances:l.seances, presences:l.presences, roles:l.roles, tirages:l.tirages || 0, bilan:l.bilan, maj_le:maj});
  });
  if(decalees.size) alert('Suivi non publié pour '+[...decalees].join(', ')+' : l\'application de participation est en période '+nApp+
    '. Clôturez la période depuis le Bilan de période, pour que la base et l\'application avancent ensemble.');
  if(!rows.length) return false;
  const r = await sb.from('participation_suivi').upsert(rows, {onConflict:'eleve,periode'});
  if(r.error){ alert('Suivi non publié : '+r.error.message); return false; }
  if(!silencieux) alert('Suivi de la période '+nApp+' publié : chaque élève voit maintenant ses points ('+rows.length+' élèves).');
  if(vueOuverte('participation')) chargerBilanPeriode(true).catch(e => console.error(e));
  return true;
}

/* ---- Pont : ce que l'application de participation appelle depuis son cadre ---- */
window.RESONANCE_PONT = {
  seance: info => { if(role === 'prof') signalerEnvoi(info); },
  seanceFermee: () => { if(role === 'prof') fileEnvoi = fileEnvoi.then(fermerSeances); },
  seanceValidee: ({cls}) => {
    if(role !== 'prof') return;
    fileEnvoi = fileEnvoi.then(fermerSeances).then(() => publierSuivi(cls, true)).catch(e => console.error(e));
  },
  envoyerReleve: d => envoyerReleve(d),
  releveEfface: () => { if(role === 'eleve') chargerObservation(); }
};

/* ---- Vue professeur ---- */
function ouvrirCadre(conteneur, page){
  let f = conteneur.querySelector('iframe');
  if(f) return f;
  f = document.createElement('iframe');
  f.src = URL_PARTICIPATION + page;
  f.title = 'Participation';
  f.setAttribute('allow', 'camera');
  conteneur.appendChild(f);
  return f;
}
function pleinEcran(conteneur, on){ conteneur.classList.toggle('plein', on); document.body.classList.toggle('cadre-plein', on); }

async function afficherCle(){
  const zone = $('#pCle'); if(!zone) return;
  try{
    const c = await publierMaCle();
    zone.innerHTML = 'Empreinte de la clé de cet appareil : <b style="font-family:var(--mono)">'+esc(c.empreinte)+'</b>'+
      (EMPREINTES_PROF.length && !EMPREINTES_PROF.includes(c.empreinte)
        ? '<br><b style="color:#B3261E">Cette empreinte n\'est pas inscrite dans le code : les élèves refuseront de chiffrer pour cet appareil.</b>' : '');
  }catch(e){ zone.textContent = 'Clé indisponible : '+e.message; }
}

function afficherLiens(){
  const zone = $('#pLiens'), sel = $('#pLiensClasse');
  const app = appProf();
  if(!app){ zone.innerHTML = '<p class="note">L\'application de participation se charge…</p>'; return; }
  const cls = app.classes();
  if(!cls.length){ zone.innerHTML = '<p class="note">Créez d\'abord une classe dans l\'application ci-dessus (onglet Classes).</p>'; sel.hidden = true; return; }
  const avant = sel.value;
  sel.innerHTML = cls.map(c => '<option>'+esc(c.nom)+'</option>').join('');
  if(cls.some(c => c.nom === avant)) sel.value = avant;
  sel.hidden = false;
  const classe = cls.find(c => c.nom === sel.value);
  if(!corresp){
    zone.innerHTML = '<p class="note">Chargez d\'abord la correspondance identifiants ↔ noms dans le <b>Tableau de bord</b> : c\'est elle qui relie chaque nom à son compte, sur cet appareil seulement.</p>';
    return;
  }
  const liens = lireLiens(), lc = liens[classe.nom] = liens[classe.nom] || {};
  const auto = lierAuto(classe.eleves, lc);
  if(auto) ecrireLiens(liens);
  const eleves = elevesCorresp();
  const nb = classe.eleves.filter(n => lc[n]).length;
  zone.innerHTML = '<p class="note" style="margin:0 0 10px"><b>'+nb+' élève'+(nb>1?'s':'')+' sur '+classe.eleves.length+'</b> relié'+(nb>1?'s':'')+' à un compte.'+
      (nb < classe.eleves.length ? ' Choisissez le compte des autres ci-dessous (les plus ressemblants en premier).' : '')+'</p>'+
    '<div class="tscroll"><table class="t"><thead><tr><th>Nom dans la participation</th><th>Compte Résonance</th></tr></thead><tbody>'+
    classe.eleves.map((n, i) => {
      const tri = eleves.slice().sort((a, b) => ressemblance(n, b[1]) - ressemblance(n, a[1]) || a[1].localeCompare(b[1], 'fr'));
      return '<tr><td>'+esc(n)+'</td><td><select data-i="'+i+'" style="width:auto;min-width:240px;padding:6px 8px;font-size:14px'+(lc[n]?'':';border-color:var(--ambre)')+'">'+
        '<option value="">— aucun —</option>'+
        tri.map(([id, nom]) => '<option value="'+esc(id)+'"'+(lc[n] === id ? ' selected' : '')+'>'+esc(nom)+' — '+esc(id)+'</option>').join('')+
        '</select></td></tr>';
    }).join('')+'</tbody></table></div>';
  zone.querySelectorAll('select[data-i]').forEach(s => s.addEventListener('change', () => {
    const l = lireLiens(), c = l[classe.nom] = l[classe.nom] || {}, nom = classe.eleves[+s.dataset.i];
    if(s.value){
      const deja = Object.keys(c).find(k => c[k] === s.value && k !== nom);
      if(deja && !confirm(s.value+' est déjà relié à « '+deja+' ». Le relier plutôt à « '+nom+' » ?')){ s.value = c[nom] || ''; return; }
      if(deja) delete c[deja];
      c[nom] = s.value;
    } else delete c[nom];
    ecrireLiens(l); afficherLiens();
  }));
}

async function afficherClassesOuvertes(){
  const zone = $('#pClasses'); if(!zone) return;
  const {data, error} = await sb.from('classes_participation').select('classe,prof');
  if(error){ zone.textContent = 'Erreur : '+error.message; return; }
  zone.innerHTML = data.length
    ? 'Onglets ouverts pour : '+data.map(d => '<span class="cren">'+esc(d.classe)+(d.prof === uid() ? ' <button class="mini ghost pFermer" data-c="'+esc(d.classe)+'" style="padding:0 6px;font-size:12px">fermer</button>' : '')+'</span>').join(' ')
    : 'Aucune classe ne voit encore les onglets Participation et Dépôts.';
  zone.querySelectorAll('.pFermer').forEach(b => b.addEventListener('click', async () => {
    if(!confirm('Retirer les onglets Participation et Dépôts aux élèves de '+b.dataset.c+' ?')) return;
    await sb.from('classes_participation').delete().eq('classe', b.dataset.c);
    afficherClassesOuvertes();
  }));
}
/* Ouvre les onglets aux classes Résonance des élèves reliés : la classe vient du serveur, pas d'un nom. */
async function ouvrirOnglets(){
  const sel = $('#pLiensClasse'), lc = lireLiens()[sel.value] || {}, ids = Object.values(lc);
  if(!ids.length){ alert('Reliez d\'abord les élèves à leur compte.'); return; }
  const {data, error} = await sb.from('profils').select('classe').in('identifiant', ids);
  if(error){ alert('Erreur : '+error.message); return; }
  const classes = [...new Set(data.map(p => p.classe).filter(Boolean))];
  if(!confirm('Ouvrir les onglets Participation et Dépôts aux élèves de : '+classes.join(', ')+' ?')) return;
  const r = await sb.from('classes_participation').upsert(classes.map(c => ({classe:c, prof:uid()})));
  if(r.error){ alert('Erreur : '+r.error.message+(/duplicate|violates/.test(r.error.message) ? ' (classe déjà ouverte par un autre enseignant ?)' : '')); return; }
  // Première ouverture : la période 1 commence aujourd'hui (sans effet si la classe a déjà ses périodes).
  const p = await sb.from('periodes').upsert(classes.map(c => ({classe:c, numero:1})), {onConflict:'classe,numero', ignoreDuplicates:true});
  if(p.error) console.error(p.error);
  afficherClassesOuvertes();
  chargerBilanPeriode().catch(e => console.error(e));
}

function initVueProf(){
  const cadre = $('#pCadreProf');
  const f = ouvrirCadre(cadre, 'A01-professeur.html');
  if(!f.dataset.pret){
    f.dataset.pret = '1';
    f.addEventListener('load', afficherLiens);
  }
  afficherLiens(); afficherCle(); afficherClassesOuvertes();
  chargerBilanPeriode(true).catch(e => console.error(e));
}

/* =====================================================================
   Côté élève : observation
   ===================================================================== */
let affectation = null;
const cadreObs = () => $('#pCadreObs iframe');

async function chargerObservation(){
  const zone = $('#pObs'), bandeau = $('#pAvisObs');
  const {data, error} = await sb.from('obs_affectations').select('id,jeton,poste,jour,prof,boites,obs_releves(envoye_le,recu_le)')
    .eq('observateur', uid()).order('cree_le', {ascending:false}).limit(1);
  if(error){ zone.innerHTML = '<p class="note">Erreur : '+esc(error.message)+'</p>'; return; }
  const a = data[0] || null;
  if(!a){
    affectation = null;
    zone.innerHTML = ''; bandeau.hidden = true;
    const f = cadreObs(); if(f) f.remove();
    return;
  }
  const releve = Array.isArray(a.obs_releves) ? a.obs_releves[0] : a.obs_releves;
  const etatEnvoi = releve ? (releve.recu_le ? 'Relevé reçu par ton professeur ✓' : 'Relevé envoyé, en attente de réception par ton professeur.') : '';
  bandeau.innerHTML = '<b>👁 Tu es observateur'+(a.jour === new Date().toISOString().slice(0,10) ? ' aujourd\'hui' : ' (séance du '+esc(dateCourte(a.jour))+')')+
    '</b> — poste '+esc(a.poste)+'. <button class="mini" id="pAllerObs" style="margin-left:8px">Ouvrir le relevé</button>';
  bandeau.hidden = vueOuverte('participation');
  const neuf = !affectation || affectation.jeton !== a.jeton;
  affectation = a;
  const c = await maCle(), boite = a.boites[c.empreinte];
  if(!boite){
    zone.innerHTML = '<div class="card"><b>Tu es observateur, poste '+esc(a.poste)+'.</b><p class="note">La séance a été envoyée avant que cette tablette soit reconnue. '+
      'Demande à ton professeur de toucher « Renvoyer » (ou scanne son QR code).</p></div>';
    return;
  }
  let charge;
  try{ charge = await dechiffrer(boite, c.prive, 'seance:'+a.jeton); }
  catch(e){ zone.innerHTML = '<div class="card"><p class="note">La séance reçue est illisible sur cette tablette. Demande à ton professeur de la renvoyer.</p></div>'; return; }
  if(!$('#pObsCarte')){
    zone.innerHTML = '<div class="card" id="pObsCarte" style="padding:16px">'+
      '<div class="calhead" style="margin:0 0 10px"><span class="sem" style="font-size:17px">Relevé de la séance · poste '+esc(a.poste)+'</span>'+
      '<button class="mini ghost" id="pPleinObs">Plein écran</button></div>'+
      '<p class="note" id="pEnvoiObs" style="margin:0 0 10px"></p>'+
      '<div class="cadre" id="pCadreObs"><button class="mini sortir" id="pSortirObs">Quitter le plein écran</button></div></div>';
  }
  $('#pEnvoiObs').textContent = etatEnvoi || 'Touche un nom quand l\'élève intervient. À la fin : « Terminer », puis « Envoyer au professeur ».';
  const f = ouvrirCadre($('#pCadreObs'), 'A01-observateur.html');
  const demarrer = () => {
    try{
      const app = f.contentWindow.PARTICIPATION;
      const cur = app.enCours();
      if(!cur || cur.jeton !== a.jeton) app.demarrer(charge);
    }catch(e){ console.error(e); }
  };
  if(f.contentWindow && f.contentWindow.PARTICIPATION && f.contentDocument.readyState === 'complete'){ if(neuf) demarrer(); }
  else f.onload = demarrer;
}
async function envoyerReleve({jeton, charge}){
  if(!affectation || affectation.jeton !== jeton)
    throw new Error("Cette séance n'est plus ouverte sur Résonance : montre le QR code à ton professeur.");
  let cles = await clesDe(affectation.prof);
  if(EMPREINTES_PROF.length) cles = cles.filter(c => EMPREINTES_PROF.includes(c.empreinte));
  if(!cles.length) throw new Error("Ton professeur n'a pas encore activé l'envoi : montre-lui le QR code.");
  const boites = await chiffrerPourTous(cles, charge, 'releve:'+jeton);
  const {error} = await sb.from('obs_releves').upsert({affectation_id:affectation.id, auteur:uid(), boites, envoye_le:new Date().toISOString(), recu_le:null});
  if(error) throw new Error('Envoi refusé : '+error.message);
  const e = $('#pEnvoiObs'); if(e) e.textContent = 'Relevé envoyé, en attente de réception par ton professeur.';
}
setInterval(() => {
  if(role === 'eleve' && moduleActif() && document.visibilityState === 'visible') chargerObservation().catch(() => {});
}, 20000);

/* ---- Où j'en suis : une carte par période (mon_bilan, migration 007) ----
   La prise de notes et la note de période n'arrivent qu'à la clôture : la base les cache avant. */
const fr1 = v => (Math.round(Number(v || 0)*10)/10).toLocaleString('fr-FR');
const pl = (n, mot) => n+' '+mot+(n>1?'s':'');
function lignesBonus(d){
  const st = d.seances_tuteur || 0, sa = d.seances_tutore || 0;
  const tut = [st ? pl(st, 'séance')+' comme tuteur' : '', sa ? pl(sa, 'séance')+' en étant aidé' : ''].filter(Boolean).join(', ');
  return '<table class="t" style="margin-top:4px"><tbody>'+
    '<tr><td>Dépôts bonus</td><td>'+(d.nb_depots ? pl(d.nb_depots, 'dépôt')+' retenu'+(d.nb_depots>1?'s':'') : 'aucun pour l\'instant')+'</td><td><b>+'+fr1(d.depots)+'</b></td></tr>'+
    '<tr><td>Tutorat <span class="hint">5 au plus</span></td><td>'+(tut || 'aucune séance pour l\'instant')+'</td><td><b>+'+fr1(d.tutorat)+'</b></td></tr>'+
    '<tr><td>Signalements <span class="hint">2 au plus</span></td><td>'+(d.nb_signalements ? pl(d.nb_signalements, 'signalement')+' retenu'+(d.nb_signalements>1?'s':'') : 'aucun pour l\'instant')+'</td><td><b>+'+fr1(d.signalements)+'</b></td></tr>'+
    '</tbody></table>';
}
async function chargerSuivi(){
  const zone = $('#pSuivi');
  const {data, error} = await sb.rpc('mon_bilan');
  if(error){ zone.innerHTML = '<p class="note" style="margin:0">Ton suivi n\'est pas disponible pour l\'instant.</p>'; console.error(error); return; }
  if(!data.length){ zone.innerHTML = '<p class="note" style="margin:0">Les périodes de ta classe ne sont pas encore ouvertes.</p>'; return; }
  const d = data.find(p => !p.fin), closes = data.filter(p => p.fin).reverse();
  let h = '';
  if(d){
    h += '<p style="margin:0 0 10px;font-weight:600">Période '+d.periode+' · en cours</p>';
    if(d.seances){
      const pct = d.objectif ? Math.min(100, Math.round(100*d.points/d.objectif)) : 0;
      h += '<p style="margin:0 0 6px;font-size:15px"><b style="font-family:var(--disp);font-size:30px">'+d.points+'</b> point'+(d.points>1?'s':'')+
          (d.objectif ? ' sur un objectif de <b>'+d.objectif+'</b>' : '')+(d.participation !== null ? ' · participation <b>'+fr1(d.participation)+'/10</b>' : '')+'</p>'+
        (d.objectif ? '<div style="height:10px;background:#E7EAEF;border-radius:6px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--vert)"></div></div>' : '')+
        '<p class="note">'+pl(d.seances, 'séance')+' observée'+(d.seances>1?'s':'')+(d.presences < d.seances ? ' · '+pl(d.seances-d.presences, 'absence')+' (neutralisée'+(d.seances-d.presences>1?'s':'')+')' : '')+
          ' · observateur '+d.roles+' fois'+
          '<br>L\'objectif est fixe : il ne dépend pas des autres élèves. Une hypothèse fausse compte autant qu\'un raisonnement abouti. Mis à jour le '+esc(dateCourte(d.maj_le))+'.</p>';
    } else h += '<p class="note" style="margin:0 0 8px">Aucune séance de participation validée pour l\'instant dans cette période.</p>';
    h += lignesBonus(d)+
      '<p class="note" style="margin-top:10px">Ta note de période sur 20 : participation /10 + prise de notes /10 + bonus, 20 au plus. '+
      'La prise de notes et la note sont publiées à la clôture de la période.</p>';
  }
  h += closes.map(c => '<details class="info" style="margin-top:12px"'+(!d && c === closes[0] ? ' open' : '')+'><summary>Période '+c.periode+' · <b>'+(c.note !== null ? fr1(c.note)+'/20' : '—')+'</b></summary>'+
    '<p style="margin:8px 0 4px">Participation <b>'+(c.participation !== null ? fr1(c.participation) : '0')+'/10</b> · prise de notes <b>'+(c.notes !== null ? fr1(c.notes) : '—')+'/10</b></p>'+
    lignesBonus(c)+'<p class="note" style="margin-top:8px">Période close le '+esc(dateCourte(c.fin))+'.</p></details>').join('');
  zone.innerHTML = h;
}

/* =====================================================================
   Dépôts de ressources
   ===================================================================== */
const LIB_DEPOT = {en_attente:['wait','en attente de validation'], valide:['vert','validé'], refuse:['','non retenu']};
const nomFichierSur = n => String(n).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9._-]+/g,'-').slice(-80);
const lienSur = u => /^https?:\/\//i.test(u || '') ? u : null;
async function urlsSignees(chemins){
  const c = chemins.filter(Boolean);
  if(!c.length) return {};
  const {data} = await sb.storage.from('depots').createSignedUrls(c, 3600);
  return Object.fromEntries((data || []).filter(x => x.signedUrl).map(x => [x.path, x.signedUrl]));
}
const liensDepot = (d, urls) =>
  (lienSur(d.lien) ? '<a class="mini ghost" href="'+esc(d.lien)+'" target="_blank" rel="noopener noreferrer">Ouvrir le lien</a> ' : '')+
  (d.fichier && urls[d.fichier] ? '<a class="mini ghost" href="'+esc(urls[d.fichier])+'" target="_blank" rel="noopener">'+esc(d.fichier_nom || 'Fichier')+'</a>' : '');

async function deposer(){
  const btn = $('#dEnvoyer'), titre = $('#dTitre').value.trim(), desc = $('#dDesc').value.trim(), lien = $('#dLien').value.trim(), f = $('#dFichier').files[0];
  if(!titre){ alert('Donne un titre à ta ressource.'); return; }
  if(!lien && !f){ alert('Ajoute un lien ou un fichier.'); return; }
  if(lien && !lienSur(lien)){ alert('Le lien doit commencer par https://'); return; }
  if(f && f.size > 10*1024*1024){ alert('Fichier trop lourd : 10 Mo au maximum.'); return; }
  btn.disabled = true; btn.textContent = 'Envoi…';
  let chemin = null;
  try{
    if(f){
      chemin = uid()+'/'+Date.now()+'-'+nomFichierSur(f.name);
      const up = await sb.storage.from('depots').upload(chemin, f, {contentType:f.type || 'application/octet-stream'});
      if(up.error) throw new Error(/mime|type/i.test(up.error.message) ? 'type de fichier refusé (PDF, image ou document bureautique)' : up.error.message);
    }
    const {error} = await sb.from('depots').insert({titre, description:desc, lien:lien || null, fichier:chemin, fichier_nom:f ? f.name : null});
    if(error){ if(chemin) await sb.storage.from('depots').remove([chemin]); throw error; }
    $('#dTitre').value = ''; $('#dDesc').value = ''; $('#dLien').value = ''; $('#dFichier').value = '';
    btn.textContent = 'Envoyé à ton professeur ✓'; btn.classList.add('sent');
    setTimeout(() => { btn.textContent = 'Déposer'; btn.classList.remove('sent'); }, 2600);
    chargerDepotsEleve();
  }catch(e){ alert('Dépôt impossible : '+e.message); btn.textContent = 'Déposer'; }
  finally{ btn.disabled = false; }
}
async function chargerDepotsEleve(){
  const [mes, res] = await Promise.all([
    sb.from('depots').select('id,titre,lien,fichier,fichier_nom,statut,points_bonus,commentaire,cree_le').eq('auteur', uid()).order('cree_le', {ascending:false}),
    sb.from('ressources_classe').select('id,titre,description,lien,fichier,fichier_nom,valide_le').order('valide_le', {ascending:false})
  ]);
  const urls = await urlsSignees([...(mes.data || []), ...(res.data || [])].map(d => d.fichier));
  $('#dMes').innerHTML = mes.error ? '<p class="note">Erreur : '+esc(mes.error.message)+'</p>'
    : !mes.data.length ? '<p class="note" style="margin:0">Tu n\'as encore rien déposé.</p>'
    : mes.data.map(d => {
        const st = LIB_DEPOT[d.statut] || ['', d.statut];
        return '<div class="mesdem"><div>'+esc(d.titre)+'<small>déposé le '+dateCourte(d.cree_le)+
          (d.statut === 'valide' && Number(d.points_bonus) ? ' · +'+String(d.points_bonus).replace('.', ',')+' point'+(Number(d.points_bonus)>1?'s':'')+' bonus' : '')+
          (d.commentaire ? ' · « '+esc(d.commentaire)+' »' : '')+'</small></div>'+
          '<span><span class="badge '+st[0]+'">'+esc(st[1])+'</span> '+
          (d.statut === 'en_attente' ? '<button class="mini ghost dRetirer" data-id="'+d.id+'" data-f="'+esc(d.fichier || '')+'">Retirer</button>' : '')+'</span></div>';
      }).join('');
  $('#dMes').querySelectorAll('.dRetirer').forEach(b => b.addEventListener('click', async () => {
    if(!confirm('Retirer ce dépôt ?')) return;
    const {error} = await sb.from('depots').delete().eq('id', +b.dataset.id);
    if(error){ alert('Impossible : '+error.message); return; }
    if(b.dataset.f) await sb.storage.from('depots').remove([b.dataset.f]);
    chargerDepotsEleve();
  }));
  $('#dClasse').innerHTML = res.error ? '<p class="note">Erreur : '+esc(res.error.message)+'</p>'
    : !res.data.length ? '<p class="note">Aucune ressource partagée pour l\'instant.</p>'
    : res.data.map(d => '<article class="dem" style="border-top-color:var(--vert)"><p class="c">'+esc(d.titre)+'</p>'+
        (d.description ? '<p class="q">'+esc(d.description)+'</p>' : '')+
        '<div class="acts">'+liensDepot(d, urls)+'</div></article>').join('');
}
/* Bonus d'un dépôt : 0 · 0,5 · 1 · 1,5 (décision du 17/10/2026 ; la base refuse toute autre valeur). */
const PTS_DEPOT = [0, 0.5, 1, 1.5];
const ptsDepot = v => PTS_DEPOT.includes(+v) ? +v : 0;
const choixPts = (cls, v, id) => '<select class="'+cls+'"'+(id !== undefined ? ' data-id="'+id+'"' : '')+' style="width:auto;padding:6px 8px" aria-label="Points bonus">'+
  PTS_DEPOT.map(p => '<option value="'+p+'"'+(Number(v) === p ? ' selected' : '')+'>'+(p ? '+'+String(p).replace('.', ',') : '0')+'</option>').join('')+'</select>';
async function chargerDepotsProf(){
  const {data, error} = await sb.from('depots')
    .select('id,titre,description,lien,fichier,fichier_nom,statut,points_bonus,commentaire,classe,cree_le,valide_le,profils!depots_auteur_fkey(identifiant)')
    .order('cree_le', {ascending:false});
  const zA = $('#dAValider'), zV = $('#dValides'), zB = $('#dBonus');
  if(error){ zA.innerHTML = '<p class="note">Erreur : '+esc(error.message)+'</p>'; return; }
  const urls = await urlsSignees(data.map(d => d.fichier));
  const qui = d => nomAffiche(d.profils && d.profils.identifiant)+' <span class="hint">'+esc(d.classe)+'</span>';
  const attente = data.filter(d => d.statut === 'en_attente');
  zA.innerHTML = attente.length ? attente.map(d =>
    '<div class="appar" style="border-left-color:var(--ambre)" data-id="'+d.id+'"><p class="t1">'+qui(d)+' · <b>'+esc(d.titre)+'</b> <span class="hint">'+dateCourte(d.cree_le)+'</span></p>'+
    (d.description ? '<p class="ligne">'+esc(d.description)+'</p>' : '')+
    '<div class="acts">'+liensDepot(d, urls)+'</div>'+
    '<div class="valider"><div class="champs">'+
      '<label>Points bonus'+choixPts('dPts', 0)+'</label>'+
      '<label style="flex:1">Commentaire pour l\'élève (facultatif)<input type="text" class="dCom" maxlength="400"></label></div>'+
      '<div class="acts" style="margin:0"><button class="mini dOk">Valider et partager à la classe</button><button class="mini ghost dNon">Ne pas retenir</button></div></div></div>'
  ).join('') : '<p class="note">Aucun dépôt en attente.</p>';
  const valides = data.filter(d => d.statut === 'valide');
  zV.innerHTML = valides.length ? '<div class="tscroll"><table class="t"><thead><tr><th>Élève</th><th>Ressource</th><th>Bonus</th><th></th></tr></thead><tbody>'+
    valides.map(d => '<tr><td>'+qui(d)+'</td><td>'+esc(d.titre)+'<br>'+liensDepot(d, urls)+'<br><span class="hint">validé le '+dateCourte(d.valide_le)+'</span></td>'+
      '<td>'+choixPts('dPtsV', d.points_bonus, d.id)+'</td>'+
      '<td><button class="mini ghost dRetirerP" data-id="'+d.id+'">Retirer de la classe</button></td></tr>').join('')+'</tbody></table></div>'
    : '<p class="note">Aucune ressource validée.</p>';
  // Points bonus par élève : dépôts validés + signalements « J'ai vu un bug » retenus (+0,5 chacun, terminales).
  const totD = {}, totS = {};
  valides.forEach(d => { const k = d.profils && d.profils.identifiant; if(k) totD[k] = (totD[k] || 0) + Number(d.points_bonus || 0); });
  try {
    const s = await sb.from('signalements').select('bonus_le,profils(identifiant)').not('bonus_le', 'is', null);
    (s.data || []).forEach(x => { const k = x.profils && x.profils.identifiant; if(k) totS[k] = (totS[k] || 0) + 0.5; });
  } catch(e) { /* signalements indisponibles : les dépôts seuls */ }
  const virg = v => String(v || 0).replace('.', ',');
  const ks = [...new Set([...Object.keys(totD), ...Object.keys(totS)])].filter(k => (totD[k] || 0) + (totS[k] || 0));
  const total = k => (totD[k] || 0) + (totS[k] || 0);
  zB.innerHTML = ks.length ? '<div class="tscroll"><table class="t"><thead><tr><th>Élève</th><th>Dépôts</th><th>Signalements</th><th>Total</th></tr></thead><tbody>'+
    ks.sort((a, b) => total(b) - total(a)).map(k => '<tr><td>'+nomAffiche(k)+'</td><td>'+virg(totD[k])+'</td><td>'+virg(totS[k])+'</td><td><b>'+virg(total(k))+'</b></td></tr>').join('')+'</tbody></table></div>'
    : '<p class="note">Aucun point bonus attribué.</p>';
  zA.querySelectorAll('.appar').forEach(carte => {
    const id = +carte.dataset.id;
    const maj = async champs => {
      const {error} = await sb.from('depots').update(champs).eq('id', id);
      if(error){ alert('Erreur : '+error.message); return; }
      chargerDepotsProf();
    };
    carte.querySelector('.dOk').addEventListener('click', () => maj({statut:'valide', points_bonus:ptsDepot(carte.querySelector('.dPts').value),
      commentaire:carte.querySelector('.dCom').value.trim(), valide_le:new Date().toISOString()}));
    carte.querySelector('.dNon').addEventListener('click', () => maj({statut:'refuse', points_bonus:0, commentaire:carte.querySelector('.dCom').value.trim(), valide_le:new Date().toISOString()}));
  });
  zV.querySelectorAll('.dPtsV').forEach(s => s.addEventListener('change', async () => {
    s.disabled = true;
    const {error} = await sb.from('depots').update({points_bonus:ptsDepot(s.value)}).eq('id', +s.dataset.id);
    if(error) alert('Erreur : '+error.message);
    chargerDepotsProf();
  }));
  zV.querySelectorAll('.dRetirerP').forEach(b => b.addEventListener('click', async () => {
    if(!confirm('Retirer cette ressource ? La classe ne la verra plus et ses points bonus sont annulés.')) return;
    await sb.from('depots').update({statut:'refuse', points_bonus:0}).eq('id', +b.dataset.id);
    chargerDepotsProf();
  }));
}

/* =====================================================================
   Bilan de période (migration 007) : prise de notes, bonus, clôture
   La base calcule (bilan_classe) ; ici on saisit la prise de notes et le curseur du tutorat,
   on exporte avec les noms (sur l'appareil) et on clôture la base et l'application ensemble.
   ===================================================================== */
const bp = {classe:null, numero:null, periodes:[], lignes:[]};
const nomSimple = id => (corresp && corresp.eleves[id]) || id || '?';
const nombre = s => { const v = parseFloat(String(s).replace(',', '.')); return isNaN(v) ? null : v; };
const vide = v => v === null || v === undefined;
/* Même formule que bilan_periode_calcul (migration 007), pour mettre la ligne à jour sans tout recharger. */
const noteDe = l => Math.min(20, Math.round(10*(Number(l.participation || 0) + Number(l.notes || 0) + Number(l.depots || 0) +
  Number(l.signalements || 0) + Number(vide(l.tutorat_curseur) ? l.tutorat_propose : l.tutorat_curseur)))/10);

async function chargerBilanPeriode(garderPeriode){
  const zone = $('#bpTable'), selC = $('#bpClasse'), selP = $('#bpPeriode'), btn = $('#bpCloturer');
  if(!zone || role !== 'prof') return;
  const c = await sb.from('classes_participation').select('classe').eq('prof', uid()).order('classe');
  if(c.error){ zone.innerHTML = '<p class="note">Erreur : '+esc(c.error.message)+'</p>'; return; }
  if(!c.data.length){
    zone.innerHTML = '<p class="note">Ouvrez d\'abord la participation à une classe (« Ouvrir les onglets à cette classe », ci-dessus).</p>';
    selC.hidden = selP.hidden = btn.hidden = true; bp.lignes = []; return;
  }
  const avant = selC.value;
  selC.innerHTML = c.data.map(x => '<option>'+esc(x.classe)+'</option>').join('');
  if(c.data.some(x => x.classe === avant)) selC.value = avant;
  selC.hidden = false;
  if(bp.classe !== selC.value){ bp.classe = selC.value; garderPeriode = false; }
  let p = await sb.from('periodes').select('numero,debut,fin').eq('classe', bp.classe).order('numero');
  if(p.error){
    zone.innerHTML = /periodes|does not exist|schema cache/i.test(p.error.message)
      ? '<p class="note">Pas encore activé : la migration <code>007_periodes.sql</code> n\'a pas été collée dans Supabase (étape 10 de <code>supabase/MISE_EN_PLACE.md</code>).</p>'
      : '<p class="note">Erreur : '+esc(p.error.message)+'</p>';
    selP.hidden = btn.hidden = true; return;
  }
  if(!p.data.length){      // classe ouverte avant la migration 007 sans période : la P1 commence aujourd'hui
    await sb.from('periodes').upsert([{classe:bp.classe, numero:1}], {onConflict:'classe,numero', ignoreDuplicates:true});
    p = await sb.from('periodes').select('numero,debut,fin').eq('classe', bp.classe).order('numero');
    if(p.error || !p.data.length){ zone.innerHTML = '<p class="note">Aucune période pour cette classe.</p>'; return; }
  }
  bp.periodes = p.data;
  const ouverte = bp.periodes.find(x => !x.fin);
  if(!garderPeriode || !bp.periodes.some(x => x.numero === bp.numero)) bp.numero = (ouverte || bp.periodes[bp.periodes.length-1]).numero;
  selP.innerHTML = bp.periodes.map(x => '<option value="'+x.numero+'"'+(x.numero === bp.numero ? ' selected' : '')+'>Période '+x.numero+
    (x.fin ? ' · close le '+esc(dateCourte(x.fin)) : ' · en cours')+'</option>').join('');
  selP.hidden = false;
  const b = await sb.rpc('bilan_classe', {p_classe:bp.classe, p_numero:bp.numero});
  if(b.error){ zone.innerHTML = '<p class="note">Erreur : '+esc(b.error.message)+'</p>'; return; }
  bp.lignes = b.data.slice().sort((x, y) => nomSimple(x.identifiant).localeCompare(nomSimple(y.identifiant), 'fr'));
  rendreBilan();
}
function rendreBilan(){
  const per = bp.periodes.find(x => x.numero === bp.numero), close = !!(per && per.fin), btn = $('#bpCloturer');
  btn.hidden = close; btn.textContent = 'Clôturer la période '+bp.numero;
  const L = bp.lignes;
  if(!L.length){ $('#bpTable').innerHTML = '<p class="note">Aucun élève dans cette classe.</p>'; return; }
  const v = x => vide(x) ? '—' : fr1(x);
  const champ = (cls, val, plh, nom, max) => '<input class="'+cls+'" inputmode="decimal" autocomplete="off" value="'+(vide(val) ? '' : fr1(val))+'"'+
    (plh !== undefined ? ' placeholder="'+fr1(plh)+'"' : '')+' aria-label="'+esc(nom)+'" style="width:64px;padding:6px 8px;font-size:14px" data-max="'+max+'">';
  $('#bpTable').innerHTML = '<p class="note" id="bpManque" style="margin:10px 0 0"></p>'+
    '<div class="tscroll"><table class="t"><thead><tr><th>Élève</th><th>Participation /10</th><th>Roue</th><th>Prise de notes /10</th>'+
    '<th>Dépôts</th><th>Tutorat <span class="hint">≤ 5</span></th><th>Signalements <span class="hint">≤ 2</span></th><th>Note /20</th></tr></thead><tbody>'+
    L.map((l, i) => {
      const st = l.seances_tuteur || 0, sa = l.seances_tutore || 0, nom = nomSimple(l.identifiant);
      return '<tr data-i="'+i+'"><td>'+nomAffiche(l.identifiant)+'</td>'+
        '<td>'+v(l.participation)+(l.seances ? '<br><span class="hint">'+l.points+' pts / '+l.objectif+' · '+pl(l.seances, 'séance')+'</span>' : '')+'</td>'+
        '<td>'+(l.tirages || 0)+'</td>'+
        '<td>'+champ('bpNotes', l.notes, undefined, 'Prise de notes sur 10 de '+nom, 10)+'</td>'+
        '<td>+'+v(l.depots)+(l.nb_depots ? '<br><span class="hint">'+pl(l.nb_depots, 'dépôt')+'</span>' : '')+'</td>'+
        '<td>'+champ('bpTut', l.tutorat_curseur, l.tutorat_propose, 'Tutorat de '+nom+' (proposé : '+fr1(l.tutorat_propose)+')', 5)+
          '<br><span class="hint">proposé '+fr1(l.tutorat_propose)+(st || sa ? ' · '+[st ? st+' tuteur' : '', sa ? sa+' aidé' : ''].filter(Boolean).join(', ') : '')+'</span></td>'+
        '<td>+'+v(l.signalements)+(l.nb_signalements ? '<br><span class="hint">'+pl(l.nb_signalements, 'retenu')+'</span>' : '')+'</td>'+
        '<td><b class="bpNote">'+v(l.note)+'</b></td></tr>';
    }).join('')+'</tbody></table></div>';
  majManque();
}
function majManque(){
  const n = bp.lignes.filter(l => vide(l.notes)).length, z = $('#bpManque');
  if(!z) return;
  z.hidden = !n;
  z.textContent = n ? pl(n, 'élève')+' sans note de prise de notes (compté 0 dans la note).' : '';
}
/* Une case vidée rend la main : prise de notes non saisie, ou tutorat revenu à la proposition. */
async function saisirBilan(inp){
  const tr = inp.closest('tr'), l = bp.lignes[+tr.dataset.i], estNotes = inp.classList.contains('bpNotes');
  const cle = estNotes ? 'notes' : 'tutorat_curseur', max = +inp.dataset.max, etat = $('#bpEtat');
  const brut = inp.value.trim();
  let val = brut === '' ? null : nombre(brut);
  if(brut !== '' && (val === null || val < 0 || val > max)){
    etat.textContent = 'Valeur refusée : un nombre entre 0 et '+max+' (virgule ou point).';
    inp.value = vide(l[cle]) ? '' : fr1(l[cle]); return;
  }
  if(val !== null) val = Math.round(val*10)/10;
  inp.disabled = true;
  const {error} = await sb.from('participation_suivi').upsert({eleve:l.eleve, periode:bp.numero, [estNotes ? 'notes' : 'tutorat']:val}, {onConflict:'eleve,periode'});
  inp.disabled = false;
  if(error){ etat.textContent = 'Non enregistré : '+error.message; inp.value = vide(l[cle]) ? '' : fr1(l[cle]); return; }
  l[cle] = val;
  if(!estNotes) l.tutorat = vide(val) ? l.tutorat_propose : val;
  l.note = noteDe(l);
  inp.value = vide(val) ? '' : fr1(val);
  tr.querySelector('.bpNote').textContent = fr1(l.note);
  etat.textContent = 'Enregistré : '+nomSimple(l.identifiant)+'.';
  majManque();
}
function exporterBilan(sansQuestion){
  if(!bp.lignes.length) return;
  if(!corresp && !sansQuestion && !confirm('La correspondance n\'est pas chargée sur cet appareil : le fichier n\'aura que les identifiants. Continuer ?')) return;
  const n = x => vide(x) ? '' : String(Math.round(Number(x)*10)/10).replace('.', ',');
  const cellule = x => { const s = String(x ?? ''); return /[;"\n]/.test(s) ? '"'+s.replace(/"/g, '""')+'"' : s; };
  const per = bp.periodes.find(x => x.numero === bp.numero);
  const lignes = [['Nom', 'Identifiant', 'Participation /10', 'Points', 'Objectif', 'Séances', 'Passages à la roue', 'Prise de notes /10',
                   'Dépôts', 'Tutorat', 'Signalements', 'Note /20']]
    .concat(bp.lignes.map(l => [corresp ? nomSimple(l.identifiant) : '', l.identifiant, n(l.participation), l.points, l.objectif, l.seances,
                                l.tirages, n(l.notes), n(l.depots), n(l.tutorat), n(l.signalements), n(l.note)]));
  const txt = '﻿'+'Bilan de période — '+bp.classe+' — période '+bp.numero+(per && per.fin ? ' (close le '+dateCourte(per.fin)+')' : ' (en cours)')+'\r\n'+
    lignes.map(r => r.map(cellule).join(';')).join('\r\n')+'\r\n';
  const url = URL.createObjectURL(new Blob([txt], {type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url;
  a.download = 'bilan-'+bp.classe.replace(/[^A-Za-z0-9_-]+/g, '-')+'-P'+bp.numero+'-'+new Date().toISOString().slice(0, 10)+'.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
/* La classe de l'application reliée à une classe Résonance : celle dont le plus d'élèves y ont leur compte. */
async function classeAppliDe(classeRes){
  const app = appProf(); if(!app) return null;
  const liens = lireLiens(), noms = app.classes().map(c => c.nom);
  const ids = [...new Set(noms.flatMap(n => Object.values(liens[n] || {})))];
  if(!ids.length) return null;
  const {data} = await sb.from('profils').select('identifiant,classe').in('identifiant', ids);
  const classeDe = Object.fromEntries((data || []).map(p => [p.identifiant, p.classe]));
  let choix = null, max = 0;
  noms.forEach(n => { const k = Object.values(liens[n] || {}).filter(id => classeDe[id] === classeRes).length; if(k > max){ max = k; choix = n; } });
  return choix;
}
async function cloturerBilan(){
  const per = bp.periodes.find(x => x.numero === bp.numero), btn = $('#bpCloturer'), etat = $('#bpEtat');
  if(!per || per.fin) return;
  let app = appProf();
  if(app && typeof app.periode !== 'function') app = null;     // application d'avant les périodes : pas de pont de clôture
  const appliCls = app ? await classeAppliDe(bp.classe) : null;
  const appPer = app && appliCls ? app.periode(appliCls) : null;
  const avecAppli = !!(appPer && appPer.n === bp.numero && !appPer.fin);
  const avert = [], sans = bp.lignes.filter(l => vide(l.notes)).length;
  if(sans) avert.push(pl(sans, 'élève')+' sans note de prise de notes (compté 0 ; modifiable après la clôture).');
  if(!app) avert.push('L\'application de participation n\'est pas chargée (ou pas à jour) : la roue ne sera pas remise à zéro.');
  else if(!appliCls) avert.push('Aucune classe de l\'application n\'est reliée à '+bp.classe+' : la roue ne sera pas remise à zéro.');
  else if(!avecAppli) avert.push('L\'application est en période '+(appPer ? appPer.n : '?')+(appPer && appPer.fin ? ' (close)' : '')+' : elle ne sera pas clôturée.');
  const suite = bp.numero < 5 ? ', la période '+(bp.numero+1)+' s\'ouvre' : ' (c\'est la dernière de l\'année)';
  if(!confirm('Clôturer la période '+bp.numero+' de '+bp.classe+' ?\n\nLes bonus de dépôts et de signalements sont figés, le tutorat est fixé, '+
    'la note est publiée aux élèves'+suite+(avecAppli ? ' et la roue repart à zéro' : '')+'.\n'+
    'Deux fichiers sont téléchargés sur cet appareil : la sauvegarde de l\'application et le bilan avec les noms.'+
    (avert.length ? '\n\n⚠ '+avert.join('\n⚠ ') : ''))) return;
  btn.disabled = true; etat.textContent = 'Clôture en cours…';
  try{
    if(avecAppli) await publierSuivi(appliCls, true);          // la participation la plus récente d'abord
    const {error} = await sb.rpc('cloturer_periode', {p_classe:bp.classe, p_numero:bp.numero});
    if(error) throw error;
    let msgApp = '';
    if(avecAppli){
      const r = app.cloturer(appliCls, bp.numero);
      msgApp = r && r.erreur ? ' ⚠ Application non clôturée : '+r.erreur+'.' : ' Roue remise à zéro ; sauvegarde de l\'application téléchargée.';
    }
    const close = bp.numero;
    await chargerBilanPeriode(true);                            // reste sur la période close : valeurs figées
    exporterBilan(true);
    etat.textContent = 'Période '+close+' close : les élèves voient leur note.'+msgApp+' Bilan exporté : rangez les fichiers dans OneDrive.';
  }catch(e){ etat.textContent = 'Clôture impossible : '+e.message; }
  finally{ btn.disabled = false; }
}

/* =====================================================================
   Entrée, onglets
   ===================================================================== */
async function rafraichir(vue){
  if(!session) return;
  if(vue === 'participation'){
    if(role === 'prof') initVueProf();
    else { $('#pAvisObs').hidden = true; await Promise.all([chargerObservation(), chargerSuivi()]); }
  }
  if(vue === 'depots') await (role === 'prof' ? chargerDepotsProf() : chargerDepotsEleve());
}
document.querySelectorAll('.tab.module').forEach(t => t.addEventListener('click', () => rafraichir(t.dataset.view).catch(e => console.error(e))));

document.addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  if(b.id === 'pRenvoyer' && seanceCourante) signalerEnvoi(seanceCourante);
  else if(b.id === 'pRecuperer') recupererReleves(true);
  else if(b.id === 'pAllerObs'){ document.querySelector('.tab[data-view="participation"]').click(); }
  else if(b.id === 'pPleinProf') pleinEcran($('#pCadreProf'), true);
  else if(b.id === 'pSortirProf') pleinEcran($('#pCadreProf'), false);
  else if(b.id === 'pPleinObs') pleinEcran($('#pCadreObs'), true);
  else if(b.id === 'pSortirObs') pleinEcran($('#pCadreObs'), false);
  else if(b.id === 'pOuvrir') ouvrirOnglets();
  else if(b.id === 'pPublier') publierSuivi($('#pLiensClasse').value);
  else if(b.id === 'pSauverCle') sauverCle();
  else if(b.id === 'dEnvoyer') deposer();
  else if(b.id === 'bpRecharger') chargerBilanPeriode(true).catch(e => console.error(e));
  else if(b.id === 'bpExporter') exporterBilan();
  else if(b.id === 'bpCloturer') cloturerBilan();
});
document.getElementById('bpClasse').addEventListener('change', () => chargerBilanPeriode(false).catch(e => console.error(e)));
document.getElementById('bpPeriode').addEventListener('change', e => { bp.numero = +e.target.value; chargerBilanPeriode(true).catch(err => console.error(err)); });
document.getElementById('bpTable').addEventListener('change', e => { const i = e.target.closest('input.bpNotes, input.bpTut'); if(i) saisirBilan(i); });
document.getElementById('pLiensClasse').addEventListener('change', afficherLiens);
document.getElementById('pRestaurerCle').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if(f) restaurerCle(f); });

/* Appelé par entrer() d'index.html, après la connexion. Une panne ici ne touche jamais le tutorat. */
window.participationEntrer = async function(){
  document.body.classList.remove('module-participation');
  if(role === 'prof'){
    document.body.classList.add('module-participation');
    publierMaCle().catch(e => console.error(e));
    return;
  }
  if(role !== 'eleve') return;
  const {data} = await sb.from('classes_participation').select('classe').maybeSingle();
  if(!data) return;
  document.body.classList.add('module-participation');
  await publierMaCle();
  await chargerObservation();
};
})();
