/* Résonance — « J'ai vu un bug » et le « +0,5 au prochain contrôle » (17/10/2026).
   Repris du site pédagogique de M. Van Hoorde (bouton des pages de cours, 03/10 et 11/10/2026).
   Script classique, sans dépendance, partagé par index.html et les pages du parcours Python
   (chargé par outils/python/progression-resonance.js). Il ne fait rien par lui-même : la page appelle
     RESONANCE_SIGNALEMENT.installer({ sb, contexte })   → bouton + formulaire, ÉLÈVE CONNECTÉ seulement ;
     RESONANCE_SIGNALEMENT.annoncerBonus({ sb, occupe }) → la fenêtre 🎁, une fois (accueil de Résonance).
   Base : table signalements et fonctions mes_bonus_signalement / bonus_signalement_vus (migration 006).
   Élèves de TERMINALE seulement (la page appelante vérifie espaceComplet). L'élève écrit ses signalements et
   ne les relit pas ; il n'écrit ni son nom ni son prénom : son compte suffit à son professeur pour le retrouver
   (décision de M. Van Hoorde, 17/10/2026). */
(function(){
"use strict";

const CSS = `
#rs-bug-ouvrir{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom, 0px));z-index:60;
  display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:999px;
  border:1px solid #D3DAE7;background:#fff;color:#4A566E;font-family:inherit;font-size:13.5px;line-height:1;
  cursor:pointer;box-shadow:0 2px 10px rgba(22,31,51,.12)}
#rs-bug-ouvrir:hover{color:#161F33;border-color:#8B97AD}
#rs-bug-ouvrir:focus-visible{outline:2px solid #2445C7;outline-offset:2px}
body.cadre-plein #rs-bug-ouvrir{display:none}
dialog.rs-dlg{border:0;border-radius:16px;padding:20px 22px;width:calc(100% - 32px);max-width:520px;max-height:calc(100% - 32px);
  overflow:auto;color:#161F33;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.35);font-family:inherit;font-size:15px;line-height:1.5}
dialog.rs-dlg::backdrop{background:rgba(13,20,36,.6)}
@media (max-width:480px){dialog.rs-dlg{padding:18px 16px}}
.rs-dlg h2{font-family:inherit;font-size:19px;font-weight:600;letter-spacing:0;margin:0 0 6px;line-height:1.3}
.rs-dlg p{margin:0}
.rs-dlg .rs-ou,.rs-dlg .rs-note{font-size:13.5px;color:#4A566E;margin:0 0 12px}
.rs-dlg .rs-note{margin:6px 0 12px}
.rs-dlg label{display:block;font-size:14px;font-weight:600;margin:0 0 4px;color:#161F33}
.rs-dlg .rs-deux{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:480px){.rs-dlg .rs-deux{grid-template-columns:1fr}}
.rs-dlg input,.rs-dlg textarea{display:block;width:100%;box-sizing:border-box;margin:0;font-family:inherit;font-size:16px;
  color:#161F33;background:#fff;border:1px solid #C7CFDD;border-radius:9px;padding:9px 11px}
.rs-dlg textarea{min-height:120px;resize:vertical;line-height:1.5}
.rs-dlg input:focus-visible,.rs-dlg textarea:focus-visible{outline:2px solid #2445C7;outline-offset:1px;box-shadow:none}
.rs-dlg [aria-invalid="true"]{border-color:#B3261E}
.rs-dlg .rs-etat{min-height:1.5em;font-size:14px;margin:10px 0 0}
.rs-dlg .rs-etat.rs-erreur{color:#B3261E}
.rs-dlg .rs-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:12px}
.rs-dlg .rs-btn{appearance:none;border:1px solid #161F33;background:#161F33;color:#fff;font-family:inherit;font-size:15px;
  font-weight:500;min-height:42px;padding:0 16px;border-radius:9px;cursor:pointer}
.rs-dlg .rs-btn.rs-ghost{background:#fff;color:#161F33;border-color:#C7CFDD}
.rs-dlg .rs-btn:disabled{opacity:.55;cursor:default}
.rs-dlg .rs-btn:focus-visible{outline:2px solid #2445C7;outline-offset:2px;box-shadow:none}
.rs-dlg .rs-bonus{display:flex;justify-content:space-between;gap:12px;align-items:baseline;border-top:1px solid #E3E8F0;padding:8px 0;font-size:14.5px}
.rs-dlg .rs-bonus:first-child{border-top:0}
.rs-dlg .rs-bonus i{display:block;color:#4A566E;font-size:13.5px}
.rs-dlg .rs-bonus b{color:#12805C;white-space:nowrap}
@media print{#rs-bug-ouvrir,dialog.rs-dlg{display:none!important}}
`;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const court = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) : t; };

function style(){
  if (document.getElementById('rs-sig-style')) return;
  const s = document.createElement('style');
  s.id = 'rs-sig-style'; s.textContent = CSS;
  document.head.appendChild(s);
}

/* « iPad · Safari · 1024×768 » : de quoi reproduire un bug d'affichage, rien de plus (pas d'empreinte). */
function resumeAppareil(){
  const ua = navigator.userAgent || '';
  // un iPad récent se déclare « Macintosh » : il se reconnaît au tactile
  const app = (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) ? 'iPad'
            : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android'
            : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'Chromebook'
            : /Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'appareil inconnu';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
            : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'navigateur inconnu';
  const ecran = (navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) ? ' · écran d’accueil' : '';
  return app + ' · ' + nav + ecran + ' · ' + window.innerWidth + '×' + window.innerHeight;
}

function fenetre(id, titreId, html){
  const d = document.createElement('dialog');
  d.className = 'rs-dlg'; d.id = id;
  d.setAttribute('aria-labelledby', titreId);
  d.innerHTML = html;
  document.body.appendChild(d);
  return d;
}

/* Bouton « J'ai vu un bug » et son formulaire.
   contexte() est lu au moment où l'élève touche le bouton : { cle, page, etape, ou } —
   cle = la rubrique ('tutorat', 'python-n2'…), ou = ce qu'on lui affiche (« Tutorat · Demander de l'aide »). */
function installer(opts){
  const sb = opts && opts.sb, contexte = (opts && opts.contexte) || (() => ({}));
  if (!sb || document.getElementById('rs-bug-ouvrir')) return;
  style();
  const b = document.createElement('button');
  b.type = 'button'; b.id = 'rs-bug-ouvrir';
  b.setAttribute('aria-haspopup', 'dialog');
  b.innerHTML = '<span aria-hidden="true">🐞</span> J’ai vu un bug';
  document.body.appendChild(b);

  const d = fenetre('rs-bug', 'rs-bug-titre',
    '<form class="rs-form" novalidate>' +
      '<h2 id="rs-bug-titre">🐞 Qu’est-ce qui ne marche pas&nbsp;?</h2>' +
      '<p class="rs-ou"></p>' +
      '<label for="rs-bug-msg">Le problème</label>' +
      '<textarea id="rs-bug-msg" maxlength="900" rows="5" placeholder="Ce que tu as fait, ce qui s’est passé, ce que tu attendais. Pas d’information personnelle."></textarea>' +
      '<p class="rs-etat" role="status" aria-live="polite"></p>' +
      '<div class="rs-actions"><button type="button" class="rs-btn rs-ghost" data-annuler>Annuler</button>' +
        '<button type="submit" class="rs-btn" data-envoyer>Envoyer à mon professeur</button></div>' +
    '</form>');
  const form = d.querySelector('form');
  const ta = d.querySelector('textarea'), etat = d.querySelector('.rs-etat'), envoyer = d.querySelector('[data-envoyer]');
  let ctx = {}, minuteur = null;

  function dire(texte, erreur){ etat.textContent = texte; etat.classList.toggle('rs-erreur', !!erreur); }
  function fermer(){ clearTimeout(minuteur); if (d.open) d.close(); }
  d.addEventListener('close', () => { clearTimeout(minuteur); b.focus(); });
  b.addEventListener('click', () => {
    try { ctx = contexte() || {}; } catch (e) { ctx = {}; }
    d.querySelector('.rs-ou').textContent = 'Ton professeur saura où tu étais' + (ctx.ou ? ' : ' + ctx.ou : '') +
      '. Il verra aussi ton identifiant et ton appareil.';
    dire(''); envoyer.disabled = false;
    ta.removeAttribute('aria-invalid');
    d.showModal();
    ta.focus();
  });
  d.querySelector('[data-annuler]').addEventListener('click', fermer);
  // Toucher le fond sombre ferme, comme Échap (natif du <dialog>).
  // (la marge intérieure du <dialog> est aussi « le dialog » : on vérifie que le geste est hors du cadre)
  d.addEventListener('click', e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) fermer();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (envoyer.disabled) return;
    const m = ta.value.trim();
    if (m.length < 3){ ta.setAttribute('aria-invalid', 'true'); dire('Écris au moins quelques mots.', true); ta.focus(); return; }
    ta.removeAttribute('aria-invalid');
    envoyer.disabled = true; dire('Envoi…');
    let erreur = null;
    try {
      const r = await sb.from('signalements').insert({
        cle: court(ctx.cle, 40) || 'inconnue',
        page: court(ctx.page, 120) || 'inconnue',
        etape: court(ctx.etape, 120) || null,
        message: m,
        appareil: court(resumeAppareil(), 120)
      });
      erreur = r && r.error;
    } catch (err) { erreur = err || new Error('réseau'); }
    if (erreur){
      envoyer.disabled = false;
      dire(/PLAFOND/.test(String(erreur.message || ''))
        ? 'Tu as déjà envoyé beaucoup de signalements aujourd’hui : parles-en directement à ton professeur.'
        : 'L’envoi n’a pas marché. Vérifie ta connexion et réessaie, ou dis-le à ton professeur.', true);
      return;
    }
    dire('✅ Merci, c’est transmis à ton professeur.');
    ta.value = '';
    minuteur = setTimeout(fermer, 1600);
  });
}

/* La fenêtre « 🎁 +0,5 au prochain contrôle » : une fois, puis « vu » enregistré EN BASE (tous appareils ;
   l'enseignant voit que l'élève l'a lue). Jamais par-dessus ce que l'élève est en train de faire :
   occupe() dit quand attendre ; on réessaie toutes les trois secondes. */
async function annoncerBonus(opts){
  const sb = opts && opts.sb, occupe = (opts && opts.occupe) || (() => false);
  if (!sb) return;
  let l;
  try {
    const r = await sb.rpc('mes_bonus_signalement');
    if (r.error) return;                 // migration 006 pas encore collée, ou panne : rien à montrer
    l = r.data || [];
  } catch (e) { return; }
  if (!l.length) return;
  const jour = iso => { const x = new Date(iso); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', {day:'numeric', month:'long'}); };
  (function essayer(){
    if (occupe() || document.visibilityState !== 'visible' || document.querySelector('dialog[open]')){
      setTimeout(essayer, 3000); return;
    }
    style();
    const n = l.length;
    const d = fenetre('rs-bonus', 'rs-bonus-titre',
      '<h2 id="rs-bonus-titre">🎁 +' + String(n * 0.5).replace('.', ',') + ' au prochain contrôle</h2>' +
      '<div>' + l.map(x => {
        let ex = String(x.extrait || '').trim();
        if (ex.length > 100) ex = ex.slice(0, 97) + '…';
        return '<div class="rs-bonus"><span>Ton signalement du ' + esc(jour(x.cree_le)) +
          (ex ? '<i>« ' + esc(ex) + ' »</i>' : '') + '</span><b>+0,5</b></div>';
      }).join('') + '</div>' +
      '<p style="margin-top:6px">' + (n > 1 ? 'Tes signalements ont été retenus' : 'Ton signalement a été retenu') +
        '. Merci : ton professeur l’a enregistré.</p>' +
      '<form method="dialog" class="rs-actions"><button class="rs-btn" value="ok" autofocus>Super !</button></form>');
    d.addEventListener('close', () => d.remove());
    d.showModal();
    Promise.resolve(sb.rpc('bonus_signalement_vus', {p_ids: l.map(x => x.id)})).catch(() => {});
  })();
}

window.RESONANCE_SIGNALEMENT = { installer, annoncerBonus, resumeAppareil };
})();
