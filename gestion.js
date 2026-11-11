/* Résonance — la gestion du site entre collègues (11/11/2026, migration 008).
   Chargé avant le script principal d'index.html, dont il utilise sb, session, role, corresp, esc,
   nomAffiche, dateCourte, aller, chargerDepots, chargerAppariements, chargerPython et
   chargerDonneesReelles au moment des appels (jamais au chargement).

   Pour tout enseignant :
   - « Mes élèves » : les comptes de ses classes, avec deux coches. « Masquer » retire l'élève de ses
     listes (sur son écran seulement) ; « À supprimer » prévient le gestionnaire, et masque l'élève en
     attendant. Les doublons se repèrent au nom (correspondance chargée sur l'appareil) et aux connexions.
   - « ⚙︎ Personnaliser l'affichage » : les rubriques du Tableau de bord qu'il ne veut pas voir.
   - Le bouton ✉️ « Écrire à M. Van Hoorde », en bas à droite de toutes les vues, et ses réponses.
   - La fenêtre « ✨ Nouveautés » à la connexion, une fois par édition (nouveautes.js).
   Réglages dans reglages_prof (donc sur tous ses appareils) ; tant que la migration 008 n'est pas
   collée, ils restent sur l'appareil (localStorage) et le reste se signale « pas encore activé ».

   Pour le gestionnaire (table gestionnaires, M. Van Hoorde) : la section « Gestion du site » —
   comptes à supprimer, effacement définitif, messages des collègues et réponses. */
(function(){
"use strict";

const NOM_GESTIONNAIRE = 'M. Van Hoorde';
const RUBRIQUES = [
  {k:'apparier',     l:'Demandes à apparier'},
  {k:'seances',      l:'Séances validées à venir'},
  {k:'dispos',       l:'Disponibilités des tuteurs'},
  {k:'signalements', l:'Signalements'},
  {k:'eleves',       l:'Mes élèves'},
  {k:'deposes',      l:'Tout ce qui a été déposé'},
  {k:'python',       l:'Parcours Python', complet:true}
];
const MIGRATION = 'la migration <code>008_gestion.sql</code> n\'a pas été collée dans Supabase (étape 11 de <code>supabase/MISE_EN_PLACE.md</code>)';
const pasActivee = m => /reglages_prof|demandes_suppression|messages_gestion|comptes_de_mes_classes|gestion_suppressions|est_gestionnaire|does not exist|schema cache|Could not find/i.test(m||'');

const $ = id => document.getElementById(id);
const uid = () => session && session.user.id;
const quand = s => s ? new Date(s).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(' ',' à ') : '';
const jour = s => s ? new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '';
const sansAccents = t => String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z]+/g,' ').trim();

/* =====================================================================
   Réglages de l'enseignant
   ===================================================================== */
const REG = {masques:new Set(), rubriques:new Set(), vues:0, enBase:false};
let suppressionsMoi = new Set();      // identifiants dont j'ai demandé la suppression
let minuteurReg = null;
const cleLocale = () => 'resonance-reglages-prof-' + uid();

async function lireReglages(){
  REG.masques = new Set(); REG.rubriques = new Set(); REG.vues = 0; REG.enBase = false;
  let r = null;
  try{
    const {data, error} = await sb.from('reglages_prof').select('comptes_masques,rubriques_masquees,nouveautes_vues').eq('prof', uid()).maybeSingle();
    if(!error){ REG.enBase = true; r = data; }
  }catch(e){}
  if(!REG.enBase){ try{ r = JSON.parse(localStorage.getItem(cleLocale())); }catch(e){ r = null; } }
  if(r){
    REG.masques = new Set(r.comptes_masques || []);
    REG.rubriques = new Set(r.rubriques_masquees || []);
    REG.vues = +r.nouveautes_vues || 0;
  }
  $('gstEtat').innerHTML = REG.enBase ? '' : 'Réglages gardés sur cet appareil seulement : ' + MIGRATION + '.';
}
function enregistrerReglages(){
  clearTimeout(minuteurReg);
  minuteurReg = setTimeout(async () => {
    const r = {comptes_masques:[...REG.masques], rubriques_masquees:[...REG.rubriques], nouveautes_vues:REG.vues};
    try{ localStorage.setItem(cleLocale(), JSON.stringify(r)); }catch(e){}
    if(!REG.enBase) return;
    const {error} = await sb.from('reglages_prof').upsert({prof:uid(), ...r, maj_le:new Date().toISOString()});
    if(error) $('gstEtat').textContent = 'Réglage non enregistré en ligne : ' + error.message;
  }, 400);
}
window.gestionMasque = id => !!id && (REG.masques.has(id) || suppressionsMoi.has(id));

/* ---------- rubriques du Tableau de bord ---------- */
function appliquerRubriques(){
  document.querySelectorAll('#v-prof [data-rubrique]').forEach(el => { el.hidden = REG.rubriques.has(el.dataset.rubrique); });
}
function rendreRubriques(){
  $('gstRubriques').innerHTML = RUBRIQUES.map(x =>
    '<label class="coche' + (x.complet ? ' complet-seul' : '') + '"><input type="checkbox" data-rub="' + x.k + '"' +
    (REG.rubriques.has(x.k) ? '' : ' checked') + '> ' + esc(x.l) + '</label>').join('');
  appliquerRubriques();
}
document.addEventListener('change', e => {
  const c = e.target.closest && e.target.closest('#gstRubriques input[data-rub]'); if(!c) return;
  if(c.checked) REG.rubriques.delete(c.dataset.rub); else REG.rubriques.add(c.dataset.rub);
  appliquerRubriques(); enregistrerReglages();
});

/* =====================================================================
   Mes élèves : masquer, demander une suppression
   ===================================================================== */
let COMPTES = [], comptesLe = 0;
const classesOuvertes = new Set();
async function chargerComptes(){
  const {data, error} = await sb.rpc('comptes_de_mes_classes');
  comptesLe = Date.now();
  if(error){
    COMPTES = null; suppressionsMoi = new Set();
    $('gstEleves').innerHTML = '<p class="note">' + (pasActivee(error.message) ? 'Pas encore activé : ' + MIGRATION + '.' : 'Erreur : ' + esc(error.message)) + '</p>';
    return;
  }
  COMPTES = data || [];
  suppressionsMoi = new Set(COMPTES.filter(c => c.suppression_demandee).map(c => c.identifiant));
}
function rendreEleves(){
  const zone = $('gstEleves'), etat = $('gstElevesEtat');
  if(COMPTES === null) return;
  if(!COMPTES.length){
    zone.innerHTML = '<p class="note">Aucun compte d\'élève dans vos classes. Si vous avez pourtant des élèves inscrits, vérifiez que vos classes sont rattachées à votre compte.</p>';
    etat.textContent = ''; return;
  }
  const montrer = $('gstMontrerMasques').checked;
  const nom = id => (corresp && corresp.eleves[id]) || '';
  // Même nom pour deux identifiants : le doublon le plus probable (correspondance chargée seulement).
  const parNom = {};
  COMPTES.forEach(c => { const n = sansAccents(nom(c.identifiant)); if(n) (parNom[n] = parNom[n] || []).push(c.identifiant); });
  const doublon = id => { const n = sansAccents(nom(id)); return n && parNom[n].length > 1 ? parNom[n].filter(x => x !== id) : null; };
  const classes = [...new Set(COMPTES.map(c => c.classe || '—'))];
  const nbMasques = COMPTES.filter(c => window.gestionMasque(c.identifiant)).length;
  etat.textContent = COMPTES.length + ' compte' + (COMPTES.length > 1 ? 's' : '') +
    (nbMasques ? ' · ' + nbMasques + ' masqué' + (nbMasques > 1 ? 's' : '') : '') +
    (suppressionsMoi.size ? ' · ' + suppressionsMoi.size + ' à supprimer' : '') +
    (corresp ? '' : ' · chargez la correspondance pour voir les noms et repérer les doublons');
  zone.innerHTML = classes.map(cl => {
    const tous = COMPTES.filter(c => (c.classe || '—') === cl);
    const vus = tous.filter(c => montrer || !window.gestionMasque(c.identifiant))
      .sort((a, b) => (nom(a.identifiant) || a.identifiant).localeCompare(nom(b.identifiant) || b.identifiant, 'fr'));
    const caches = tous.length - vus.length;
    const ouverte = classes.length === 1 || classesOuvertes.has(cl);
    return '<details class="gst-classe" data-classe="' + esc(cl) + '"' + (ouverte ? ' open' : '') + '><summary>' + esc(cl) +
      ' <span class="hint">· ' + tous.length + ' compte' + (tous.length > 1 ? 's' : '') + (caches ? ', dont ' + caches + ' masqué' + (caches > 1 ? 's' : '') : '') + '</span></summary>' +
      (vus.length ? '<div class="tscroll"><table class="t"><thead><tr><th>Élève</th><th>Compte</th><th class="c">Masquer</th><th class="c">À supprimer</th></tr></thead><tbody>' +
        vus.map(c => {
          const id = c.identifiant, d = doublon(id), sup = suppressionsMoi.has(id), autres = c.demandes - (c.suppression_demandee ? 1 : 0);
          const compte = c.active
            ? (c.derniere_connexion ? 'dernière connexion le ' + jour(c.derniere_connexion) : '<span class="badge wait">jamais connecté</span>')
            : '<span class="badge">coupon pas encore utilisé</span>';
          return '<tr class="' + (REG.masques.has(id) ? 'masque ' : '') + (sup ? 'suppr' : '') + '" data-id="' + esc(id) + '"><td>' + nomAffiche(id) +
            (d ? ' <span class="badge rouge" title="Même nom que ' + esc(d.join(', ')) + '">même nom que ' + esc(d.join(', ')) + '</span>' : '') +
            (sup ? ' <span class="badge rouge">suppression demandée</span>' : '') +
            (autres > 0 ? ' <span class="badge">signalé aussi par un collègue</span>' : '') + '</td>' +
            '<td class="hint">' + compte + '</td>' +
            '<td class="c"><input type="checkbox" data-masquer aria-label="Masquer ' + esc(id) + '"' + (REG.masques.has(id) ? ' checked' : '') + '></td>' +
            '<td class="c"><input type="checkbox" data-suppr aria-label="Demander la suppression de ' + esc(id) + '"' + (sup ? ' checked' : '') + '></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<p class="note" style="margin:0 14px 12px">Tous les élèves de cette classe sont masqués.</p>') +
    '</details>';
  }).join('');
}
function rafraichirListes(){
  rendreEleves();
  try{ chargerDepots(); chargerAppariements(); chargerPython(); }catch(e){}
}
$('gstEleves').addEventListener('toggle', e => {
  const d = e.target.closest && e.target.closest('.gst-classe'); if(!d) return;
  if(d.open) classesOuvertes.add(d.dataset.classe); else classesOuvertes.delete(d.dataset.classe);
}, true);
$('gstMontrerMasques').addEventListener('change', rendreEleves);
$('gstEleves').addEventListener('change', async e => {
  const c = e.target, tr = c.closest('tr[data-id]'); if(!tr) return;
  const id = tr.dataset.id, etat = $('gstElevesEtat');
  if(c.hasAttribute('data-masquer')){
    if(c.checked) REG.masques.add(id); else REG.masques.delete(id);
    enregistrerReglages(); rafraichirListes(); return;
  }
  if(!c.hasAttribute('data-suppr')) return;
  c.disabled = true;
  let error = null;
  if(c.checked){
    const motif = prompt('Demander à ' + NOM_GESTIONNAIRE + ' de supprimer le compte ' + id + ' ?\n\n' +
      'Pourquoi ? (facultatif — par exemple « doublon de PC-XXXXX », « élève parti ». Pas de nom d\'élève.)', '');
    if(motif === null){ c.checked = false; c.disabled = false; return; }
    ({error} = await sb.from('demandes_suppression').insert({identifiant:id, motif:motif.trim().slice(0, 300) || null}));
  } else {
    ({error} = await sb.from('demandes_suppression').delete().eq('identifiant', id).eq('demande_par', uid()));
  }
  if(error){
    c.checked = !c.checked; c.disabled = false;
    etat.textContent = pasActivee(error.message) ? 'Pas encore activé (migration 008).' : 'Échec : ' + error.message;
    return;
  }
  await chargerComptes();
  rafraichirListes();
  if(window.gestionnaire) chargerSuppressions().then(rendreSuppressions);
});

/* =====================================================================
   Gestion du site (gestionnaire seul) : suppressions et messages
   ===================================================================== */
let SUPPR = [], MESSAGES = [];
async function chargerSuppressions(){
  const {data, error} = await sb.rpc('gestion_suppressions');
  SUPPR = error ? null : (data || []);
  if(error) $('gstSuppressions').innerHTML = '<p class="note">Erreur : ' + esc(error.message) + '</p>';
}
function rendreSuppressions(){
  const zone = $('gstSuppressions'); if(SUPPR === null) return;
  const parId = {};
  SUPPR.forEach(x => (parId[x.identifiant] = parId[x.identifiant] || []).push(x));
  const ids = Object.keys(parId);
  const n = $('gstNSuppr'); n.hidden = !ids.length; n.textContent = ids.length;
  if(!ids.length){ zone.innerHTML = '<p class="note">Aucune demande de suppression.</p>'; return; }
  zone.innerHTML = ids.map(id => {
    const l = parId[id], x = l[0];
    const compte = x.active ? 'compte créé le ' + jour(x.cree_le) + ' · ' + (x.derniere_connexion ? 'dernière connexion le ' + jour(x.derniere_connexion) : 'jamais connecté')
      : x.classe ? 'coupon pas encore utilisé (importé le ' + jour(x.cree_le) + ')' : 'introuvable : déjà effacé ?';
    return '<div class="sig" data-id="' + esc(id) + '"><div class="sig-tete"><b>' + nomAffiche(id) + '</b>' +
      (x.classe ? '<span class="sig-classe">' + esc(x.classe) + '</span>' : '') + '<span>' + esc(compte) + '</span></div>' +
      l.map(d => '<div class="sig-msg" style="margin:6px 0"><span class="hint">Demandé par <b>' + esc(d.demande_par) + '</b> (' +
        esc((d.classes_demandeur || []).join(', ') || 'sans classe') + ') le ' + esc(quand(d.demande_le)) + '</span>' +
        (d.motif ? '<br>' + esc(d.motif) : '') + '</div>').join('') +
      '<div class="acts"><button class="mini" data-effacer>Effacer définitivement</button>' +
      '<button class="mini ghost" data-ecarter>Écarter la demande</button></div></div>';
  }).join('');
}
$('gstSuppressions').addEventListener('click', async e => {
  const b = e.target.closest('button'), carte = e.target.closest('.sig'); if(!b || !carte) return;
  const id = carte.dataset.id;
  if(b.hasAttribute('data-effacer')){
    if(!confirm('Effacer définitivement ' + id + ' ?\n\nLe compte, toutes ses données (demandes, séances, participation, parcours Python, signalements…) ' +
      'et son coupon disparaissent. Impossible de revenir en arrière.')) return;
    b.disabled = true;
    const {data, error} = await sb.rpc('effacer_compte_eleve', {p_identifiant:id});
    if(error){ b.disabled = false; alert('Échec : ' + error.message); return; }
    alert(data === 'compte' ? id + ' : compte effacé.' : data === 'coupon' ? id + ' : coupon effacé (le compte n\'avait jamais servi).' : id + ' : rien à effacer, la demande est retirée.');
    REG.masques.delete(id); enregistrerReglages();
    await chargerDonneesReelles();
    return;
  }
  if(b.hasAttribute('data-ecarter')){
    if(!confirm('Écarter la demande pour ' + id + ' ? Le compte reste ; l\'enseignant verra sa coche disparaître.')) return;
    b.disabled = true;
    const {error} = await sb.from('demandes_suppression').delete().eq('identifiant', id);
    if(error){ b.disabled = false; alert('Échec : ' + error.message); return; }
    await Promise.all([chargerSuppressions(), chargerComptes()]);
    rendreSuppressions(); rafraichirListes();
  }
});

async function chargerMessagesGestion(){
  const {data, error} = await sb.from('messages_gestion').select('id,ou,message,cree_le,lu_le,reponse,repondu_le,profils(identifiant,classes)')
    .order('cree_le', {ascending:false}).limit(300);
  MESSAGES = error ? null : (data || []);
  if(error) $('gstMessages').innerHTML = '<p class="note">Erreur : ' + esc(error.message) + '</p>';
}
function rendreMessagesGestion(){
  const zone = $('gstMessages'); if(MESSAGES === null) return;
  const nonLus = MESSAGES.filter(m => !m.lu_le).length;
  const n = $('gstNMsg'); n.hidden = !nonLus; n.textContent = nonLus;
  majBouton(nonLus);
  const tout = $('gstMsgTout').checked, liste = tout ? MESSAGES : MESSAGES.filter(m => !m.lu_le);
  if(!liste.length){ zone.innerHTML = '<p class="note">Aucun message' + (tout ? '' : ' non lu') + '.</p>'; return; }
  zone.innerHTML = liste.map(m => {
    const p = m.profils || {};
    return '<div class="sig' + (m.lu_le ? ' traite' : '') + '" data-id="' + esc(m.id) + '"><div class="sig-tete"><b>' + esc(p.identifiant || '?') + '</b>' +
      ((p.classes || []).length ? '<span class="sig-classe">' + esc(p.classes.join(', ')) + '</span>' : '') +
      '<span>' + esc(quand(m.cree_le)) + '</span>' + (m.ou ? '<span>' + esc(m.ou) + '</span>' : '') + '</div>' +
      '<div class="sig-msg">' + esc(m.message) + '</div>' +
      (m.reponse ? '<p class="sig-bonus"><b>Votre réponse</b> le ' + esc(quand(m.repondu_le)) + ' : ' + esc(m.reponse) + '</p>' : '') +
      '<div class="gst-rep" hidden><textarea maxlength="2000" rows="3" style="width:100%;font:inherit;font-size:15px;padding:8px 10px;border:1px solid var(--rule);border-radius:9px">' +
        esc(m.reponse || '') + '</textarea></div>' +
      '<div class="acts"><button class="mini' + (m.lu_le ? ' ghost' : '') + '" data-lu="' + (m.lu_le ? '0' : '1') + '">' + (m.lu_le ? 'Remettre non lu' : '✓ Lu') + '</button>' +
        '<button class="mini ghost" data-repondre>' + (m.reponse ? 'Modifier la réponse' : 'Répondre') + '</button>' +
        '<button class="mini ghost" data-suppr-msg>Supprimer</button></div></div>';
  }).join('');
}
$('gstMsgTout').addEventListener('change', rendreMessagesGestion);
$('gstMessages').addEventListener('click', async e => {
  const b = e.target.closest('button'), carte = e.target.closest('.sig'); if(!b || !carte) return;
  const id = carte.dataset.id;
  let req = null;
  if(b.dataset.lu) req = sb.from('messages_gestion').update({lu_le: b.dataset.lu === '1' ? new Date().toISOString() : null}).eq('id', id);
  else if(b.hasAttribute('data-repondre')){
    const box = carte.querySelector('.gst-rep');
    if(box.hidden){ box.hidden = false; b.textContent = 'Envoyer la réponse'; box.querySelector('textarea').focus(); return; }
    const t = box.querySelector('textarea').value.trim();
    req = sb.from('messages_gestion').update({reponse: t || null}).eq('id', id);
  } else if(b.hasAttribute('data-suppr-msg')){
    if(!confirm('Supprimer ce message ? Son auteur ne le verra plus non plus.')) return;
    req = sb.from('messages_gestion').delete().eq('id', id);
  }
  if(!req) return;
  b.disabled = true;
  const {error} = await req;
  if(error){ b.disabled = false; alert('Échec : ' + error.message); return; }
  await chargerMessagesGestion(); rendreMessagesGestion();
});

/* =====================================================================
   Bouton ✉️ et fenêtre « Écrire à M. Van Hoorde »
   ===================================================================== */
const CSS = `
#gst-ecrire{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom, 0px));z-index:60;
  display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:999px;
  border:1px solid #D3DAE7;background:#fff;color:#4A566E;font-family:inherit;font-size:13.5px;line-height:1;
  cursor:pointer;box-shadow:0 2px 10px rgba(22,31,51,.12)}
#gst-ecrire:hover{color:#161F33;border-color:#8B97AD}
#gst-ecrire:focus-visible{outline:2px solid #2445C7;outline-offset:2px}
#gst-ecrire .gst-n{min-width:18px;padding:2px 6px;border-radius:999px;background:#C0392B;color:#fff;font-size:12px;font-weight:600}
body.cadre-plein #gst-ecrire{display:none}
dialog.gst-dlg{border:0;border-radius:16px;padding:20px 22px;width:calc(100% - 32px);max-width:560px;max-height:calc(100% - 32px);
  overflow:auto;color:#161F33;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.35);font-family:inherit;font-size:15px;line-height:1.5}
dialog.gst-dlg::backdrop{background:rgba(13,20,36,.6)}
@media (max-width:480px){dialog.gst-dlg{padding:18px 16px}}
.gst-dlg h2{font-family:inherit;font-size:19px;font-weight:600;letter-spacing:0;margin:0 0 6px;line-height:1.3}
.gst-dlg h3{font-size:15px;margin:18px 0 6px}
.gst-dlg p{margin:0}
.gst-dlg .gst-ou{font-size:13.5px;color:#4A566E;margin:0 0 12px}
.gst-dlg textarea{display:block;width:100%;box-sizing:border-box;min-height:120px;resize:vertical;font-family:inherit;font-size:16px;
  line-height:1.5;color:#161F33;background:#fff;border:1px solid #C7CFDD;border-radius:9px;padding:9px 11px}
.gst-dlg textarea:focus-visible{outline:2px solid #2445C7;outline-offset:1px}
.gst-dlg .gst-aide{font-size:13px;color:#4A566E;margin:6px 0 0}
.gst-dlg .gst-msg-etat{min-height:1.5em;font-size:14px;margin:10px 0 0}
.gst-dlg .gst-msg-etat.err{color:#B3261E}
.gst-dlg .gst-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:12px}
.gst-dlg .gst-btn{appearance:none;border:1px solid #161F33;background:#161F33;color:#fff;font-family:inherit;font-size:15px;
  font-weight:500;min-height:42px;padding:0 16px;border-radius:9px;cursor:pointer}
.gst-dlg .gst-btn.ghost{background:#fff;color:#161F33;border-color:#C7CFDD}
.gst-dlg .gst-btn:disabled{opacity:.55;cursor:default}
.gst-dlg .gst-histo{border-top:1px solid #E3E8F0;padding:8px 0;font-size:14px}
.gst-dlg .gst-histo .q{white-space:pre-wrap;overflow-wrap:anywhere}
.gst-dlg .gst-histo small{display:block;color:#4A566E;font-size:12.5px}
.gst-dlg .gst-histo .r{margin-top:6px;padding:8px 10px;border-radius:9px;background:#EEF6F1;white-space:pre-wrap;overflow-wrap:anywhere}
.gst-dlg .gst-histo .r.neuf{background:#E2F3EA;box-shadow:inset 3px 0 0 #2E9E6B}
/* Nouveautés */
.gst-nv-ed{margin:14px 0 0}
.gst-nv-ed>small{color:#4A566E;font-size:12.5px}
.gst-nv-pt{display:grid;grid-template-columns:200px 1fr;gap:14px;align-items:center;border-top:1px solid #E3E8F0;padding:12px 0}
@media (max-width:520px){.gst-nv-pt{grid-template-columns:1fr}}
.gst-nv-pt b{display:block;font-size:15px;margin-bottom:2px}
.gst-nv-pt p{font-size:14px;color:#3A4459}
.nv-ecran{background:#F4F6F9;border:1px solid #D6DCE4;border-radius:10px;padding:8px;font-size:11.5px;line-height:1.3;color:#151B2B;min-height:84px;position:relative}
.nv-ligne{display:grid;grid-template-columns:1fr 46px 58px;align-items:center;gap:4px;padding:4px 6px;background:#fff;border-radius:5px;margin-bottom:3px}
.nv-ligne.nv-tete{background:none;color:#5C6679;font-size:10px;padding:0 6px}
.nv-ligne.nv-tete span:not(:first-child){text-align:center}
.nv-ligne .nv-case{justify-self:center}
.nv-id{font-family:"IBM Plex Mono",ui-monospace,monospace}
.nv-barre .nv-id{text-decoration:line-through;text-decoration-color:#C0392B}
.nv-pale{opacity:.5}
.nv-case{display:inline-flex;width:14px;height:14px;border:1.5px solid #5C6679;border-radius:3px;align-items:center;justify-content:center;font-size:10px;color:#fff;vertical-align:-2px;flex:none}
.nv-case.nv-oui{background:#151B2B;border-color:#151B2B}
.nv-case.nv-rouge{background:#C0392B;border-color:#C0392B}
.nv-puce{font-style:normal;font-family:"IBM Plex Sans",sans-serif;font-size:9.5px;background:#FBE3E1;color:#9B231A;border-radius:3px;padding:0 4px;text-decoration:none;display:inline-block}
.nv-titre{font-weight:600;margin:0 0 6px}
.nv-choix{display:flex;gap:6px;align-items:center;padding:3px 2px}
.nv-coin{display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end;gap:6px}
.nv-bulle{background:#fff;border:1px solid #D6DCE4;border-radius:9px 9px 2px 9px;padding:5px 8px;max-width:85%}
.nv-bouton{background:#fff;border:1px solid #D3DAE7;border-radius:999px;padding:5px 9px;box-shadow:0 2px 6px rgba(22,31,51,.15);color:#4A566E}
@media print{#gst-ecrire,dialog.gst-dlg{display:none!important}}
`;
function style(){
  if($('gst-style')) return;
  const s = document.createElement('style'); s.id = 'gst-style'; s.textContent = CSS;
  document.head.appendChild(s);
}
function fenetre(id, html){
  let d = $(id); if(d) d.remove();
  d = document.createElement('dialog'); d.className = 'gst-dlg'; d.id = id;
  d.setAttribute('aria-labelledby', id + '-titre');
  d.innerHTML = html; document.body.appendChild(d);
  return d;
}
/* Où est l'enseignant quand il écrit : « Tableau de bord », « Tutorat · Demander de l'aide »… */
function ouSuisJe(){
  const v = document.querySelector('.view.on'), nom = v ? v.id.replace(/^v-/, '') : 'accueil';
  const tab = document.querySelector('.tab[data-view="' + nom + '"]');
  return tab ? tab.firstChild.textContent.trim() : nom;
}

let MES_MESSAGES = [];
const cleReponses = () => 'resonance-reponses-vues-' + uid();
function reponsesVuesLe(){ try{ return localStorage.getItem(cleReponses()) || ''; }catch(e){ return ''; } }
async function chargerMesMessages(){
  const {data, error} = await sb.from('messages_gestion').select('id,ou,message,cree_le,lu_le,reponse,repondu_le')
    .eq('auteur', uid()).order('cree_le', {ascending:false}).limit(20);
  MES_MESSAGES = error ? null : (data || []);
  if(!window.gestionnaire) majBouton(MES_MESSAGES ? MES_MESSAGES.filter(m => m.repondu_le && m.repondu_le > reponsesVuesLe()).length : 0);
}
function majBouton(n){
  const b = $('gst-ecrire'); if(!b) return;
  const lib = window.gestionnaire ? 'Messages des collègues' : 'Écrire à ' + NOM_GESTIONNAIRE;
  b.innerHTML = '<span aria-hidden="true">✉️</span> ' + lib + (n ? ' <span class="gst-n" aria-label="' + n + (window.gestionnaire ? ' non lus' : ' réponse(s) nouvelle(s)') + '">' + n + '</span>' : '');
}
function installerBouton(){
  style();
  let b = $('gst-ecrire');
  if(!b){
    b = document.createElement('button');
    b.type = 'button'; b.id = 'gst-ecrire'; b.setAttribute('aria-haspopup', 'dialog');
    document.body.appendChild(b);
    b.addEventListener('click', () => {
      if(window.gestionnaire){ aller('prof'); setTimeout(() => $('gestion').scrollIntoView({behavior:'smooth'}), 60); return; }
      ouvrirEcrire();
    });
  }
  majBouton(0);
}
function rendreHistorique(d, vuesAvant){
  const zone = d.querySelector('.gst-histo-liste');
  if(MES_MESSAGES === null){ zone.innerHTML = '<p class="gst-aide">Pas encore activé : la boîte à messages attend une mise à jour de la base.</p>'; return; }
  zone.innerHTML = MES_MESSAGES.length ? MES_MESSAGES.map(m =>
    '<div class="gst-histo"><small>' + esc(quand(m.cree_le)) + (m.ou ? ' · ' + esc(m.ou) : '') + ' · ' +
      (m.reponse ? 'répondu le ' + esc(quand(m.repondu_le)) : m.lu_le ? 'lu le ' + esc(quand(m.lu_le)) : 'envoyé, pas encore lu') + '</small>' +
      '<div class="q">' + esc(m.message) + '</div>' +
      (m.reponse ? '<div class="r' + (m.repondu_le > vuesAvant ? ' neuf' : '') + '"><b>' + esc(NOM_GESTIONNAIRE) + ' :</b> ' + esc(m.reponse) + '</div>' : '') +
    '</div>').join('') : '<p class="gst-aide">Aucun message envoyé pour l\'instant.</p>';
}
function ouvrirEcrire(){
  const ou = ouSuisJe(), vuesAvant = reponsesVuesLe();
  const d = fenetre('gst-dlg-ecrire',
    '<form novalidate>' +
      '<h2 id="gst-dlg-ecrire-titre">✉️ Écrire à ' + esc(NOM_GESTIONNAIRE) + '</h2>' +
      '<p class="gst-ou">Une demande, une modification, un souci : il le lira dans son Tableau de bord et vous répondra ici. ' +
        'Vous écrivez depuis : <b>' + esc(ou) + '</b>.</p>' +
      '<label for="gst-msg" style="display:block;font-weight:600;font-size:14px;margin:0 0 4px">Votre message</label>' +
      '<textarea id="gst-msg" maxlength="2000" rows="5" placeholder="Par exemple : le compte PC-XXXXX est en double ; ajouter ma classe de jeudi ; la page Tutorat…"></textarea>' +
      '<p class="gst-aide">Pas de nom d\'élève : son identifiant PC-… suffit.</p>' +
      '<p class="gst-msg-etat" role="status" aria-live="polite"></p>' +
      '<div class="gst-actions"><button type="button" class="gst-btn ghost" data-fermer>Fermer</button>' +
        '<button type="submit" class="gst-btn" data-envoyer>Envoyer</button></div>' +
      '<h3>Vos derniers messages</h3><div class="gst-histo-liste"><p class="gst-aide">Chargement…</p></div>' +
    '</form>');
  const form = d.querySelector('form'), ta = d.querySelector('textarea'), etat = d.querySelector('.gst-msg-etat'), env = d.querySelector('[data-envoyer]');
  const dire = (t, err) => { etat.textContent = t; etat.classList.toggle('err', !!err); };
  d.querySelector('[data-fermer]').addEventListener('click', () => d.close());
  d.addEventListener('close', () => { $('gst-ecrire') && $('gst-ecrire').focus(); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const t = ta.value.trim();
    if(t.length < 3){ dire('Écrivez au moins quelques mots.', true); ta.focus(); return; }
    env.disabled = true; dire('Envoi…');
    const {error} = await sb.from('messages_gestion').insert({message:t, ou});
    env.disabled = false;
    if(error){
      dire(pasActivee(error.message) ? 'La boîte à messages n\'est pas encore activée : prévenez ' + NOM_GESTIONNAIRE + ' (mise à jour de la base à faire).'
        : /PLAFOND_MESSAGES/.test(error.message) ? 'Trente messages par jour au plus : réessayez demain.' : 'Échec : ' + error.message, true);
      return;
    }
    ta.value = ''; dire('Envoyé. Merci !');
    await chargerMesMessages(); rendreHistorique(d, vuesAvant);
  });
  d.showModal();
  ta.focus();
  chargerMesMessages().then(() => {
    rendreHistorique(d, vuesAvant);
    try{ localStorage.setItem(cleReponses(), new Date().toISOString()); }catch(e){}
    majBouton(0);
  });
}

/* =====================================================================
   Nouveautés
   ===================================================================== */
const editions = () => (window.RESONANCE_NOUVEAUTES || []).filter(x => (x.public || 'prof') === 'prof').sort((a, b) => b.n - a.n);
function annoncer(toutes){
  const liste = toutes ? editions().slice(0, 4) : editions().filter(x => x.n > REG.vues);
  if(!liste.length){ if(toutes) alert('Aucune nouveauté pour l\'instant.'); return; }
  // Jamais par-dessus une autre fenêtre ni un cadre en plein écran.
  if(!toutes && (document.querySelector('dialog[open]') || document.body.classList.contains('cadre-plein'))) return;
  style();
  const dateLongue = s => new Date(s + 'T12:00').toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
  const d = fenetre('gst-dlg-nv',
    '<h2 id="gst-dlg-nv-titre">✨ ' + (toutes ? 'Les dernières nouveautés' : 'Du nouveau sur Résonance') + '</h2>' +
    liste.map(ed => '<div class="gst-nv-ed"><small>' + esc(dateLongue(ed.date)) + '</small><h3 style="margin:2px 0 4px">' + esc(ed.titre) + '</h3>' +
      (ed.points || []).map(p => '<div class="gst-nv-pt"><div>' + (p.visuel || '') + '</div><div><b>' + esc(p.titre) + '</b><p>' + esc(p.texte) + '</p></div></div>').join('') +
    '</div>').join('') +
    '<p class="gst-aide" style="margin-top:8px">Vous retrouvez ces annonces dans le Tableau de bord, bouton « ✨ Nouveautés ».</p>' +
    '<div class="gst-actions"><button type="button" class="gst-btn" data-ok>J\'ai compris</button></div>');
  const max = Math.max(...editions().map(x => x.n));
  // Fermée d'une façon ou d'une autre (bouton, Échap) : vue. Elle ne revient pas à chaque connexion.
  d.addEventListener('close', () => { if(max > REG.vues){ REG.vues = max; enregistrerReglages(); } d.remove(); });
  d.querySelector('[data-ok]').addEventListener('click', () => d.close());
  d.showModal();
}
$('gstVoirNouveautes').addEventListener('click', () => annoncer(true));

/* =====================================================================
   Points d'entrée appelés par index.html
   ===================================================================== */
window.gestionnaire = false;
/* À la connexion d'un enseignant, avant le chargement du Tableau de bord. */
window.gestionEntrer = async function(){
  await lireReglages();
  rendreRubriques();
  try{
    const {data, error} = await sb.rpc('est_gestionnaire');
    window.gestionnaire = !error && data === true;
  }catch(e){ window.gestionnaire = false; }
  $('gestion').hidden = !window.gestionnaire;
  installerBouton();
  await chargerComptes();        // avant les autres listes : les « à supprimer » y sont déjà masqués
};
/* Avec le reste du Tableau de bord (chargerDonneesReelles, bouton « Actualiser »). */
window.gestionCharger = async function(){
  const t = [Date.now() - comptesLe > 3000 ? chargerComptes() : null];
  if(window.gestionnaire) t.push(chargerSuppressions(), chargerMessagesGestion());
  else t.push(chargerMesMessages());
  await Promise.all(t);
  window.gestionRendre();
};
/* Après un changement de correspondance : les noms ont changé. */
window.gestionRendre = function(){
  rendreEleves();
  if(window.gestionnaire){ rendreSuppressions(); rendreMessagesGestion(); }
};
/* Une fois tout affiché : les nouveautés pas encore vues. */
window.gestionAnnoncer = function(){ try{ annoncer(false); }catch(e){ console.error('nouveautés', e); } };
})();
