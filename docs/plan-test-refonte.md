# Plan de test — accueil à trois entrées, parcours Python relié, signalements

Sections A à F : accueil et parcours Python (en ligne depuis le 17/10/2026). Section G : signalements, branche
`signalements`, à dérouler **avant** de la fusionner dans `main` (tout push sur `main` est en ligne aussitôt).
Durée : une vingtaine de minutes. Matériel : un ordinateur, et si possible un iPad avec Résonance sur l'écran d'accueil.
Comptes : `PR-TEST1` (enseignant) et `PC-TEST1` (élève, classe « TEST »), déjà dans la base.

## Déjà vérifié automatiquement (sans Supabase)

Chromium, serveur local, Supabase remplacé par un faux client : 99 vérifications.

- Sans connexion : seule la boîte de connexion s'affiche, aucune erreur JS, **aucune requête vers Google**, polices chargées depuis `polices/`.
- Élève connecté : l'accueil montre Tutorat, Participation (si sa classe est ouverte), Outils ; jamais le Tableau de bord.
- Chaque rubrique n'affiche que ses onglets, plus « Accueil » ; le bouton retour du navigateur fonctionne ; `index.html#outils`, `#participation`, `#prof`… ouvrent la bonne vue ou ramènent à l'accueil si elle est interdite.
- Les vues Participation et Dépôts se rechargent comme avant quand on y entre (par la carte ou par l'onglet).
- Enseignant : carte et onglet Tableau de bord partout ; vue « Parcours Python » remplie (une ligne par élève, un nombre par niveau).
- Parcours Python sans connexion : `progression-resonance.js` ne charge rien et ne change rien.
- Parcours Python, élève connecté : bandeau « ← Résonance », réussites relues et cochées, chaque réussite envoyée sous la forme `{niveau, exercice}` seulement.
- Service worker : Pyodide et ses paquets mis en cache au premier chargement ; scipy seulement s'il est importé ; second chargement servi par le cache (2 s) ; `index.html`, `commun.js`, `participation.js`, `signalement.js` jamais mis en cache.
- Signalements : pas de bouton sans connexion ni pour l'enseignant (Résonance et parcours) ; bouton pour une première (accueil, Tutorat) et une terminale (accueil, pages du parcours) ; dialogue modal, focus sur le nom, Échap ferme et rend le focus ; nom ou prénom vide refusé ; envoi avec « 👤 Nom Prénom » en tête, `cle` et `etape` justes (`tutorat` / `#demande`, `python-n1` / « Étape 2 · … — 2.2 … »), sans compte ni statut envoyés ; plafond et panne réseau expliqués ; fenêtre 🎁 seulement à l'accueil, une seule fois, « vu » envoyé ; Tableau de bord : cartes récentes d'abord, « Accorder +0,5 » pour la terminale seulement, Traité, Supprimer ; migration absente signalée sans erreur.

## Préalable

1. Coller `supabase/migrations/005_python.sql` (étape 8 de `supabase/MISE_EN_PLACE.md`).
2. Rattacher la classe TEST au compte de test enseignant :
   ```sql
   update public.profils set classes = array['TEST'] where identifiant = 'PR-TEST1';
   ```
3. Ajouter la ligne de chargement dans chaque page du parcours (fichiers tenus par le chantier Python), juste après `parcours.js` :
   ```html
   <script src="progression-resonance.js" type="module"></script>
   ```
   dans `outils/python/index.html` et chaque `niveau-N.html`.
4. Servir la branche en local : depuis le dossier du dépôt, `python -m http.server 8000`, puis ouvrir `http://localhost:8000/`.
   Supabase accepte les connexions depuis `localhost` (même clé, même projet). Pour l'iPad, il faudrait publier : ne le faire qu'après les étapes A à E.

## A. Connexion et première connexion

| # | Geste | Attendu |
|---|---|---|
| A1 | Ouvrir le site, se connecter avec `PC-TEST1` | L'accueil s'affiche : cartes Tutorat, Outils (et Participation si la classe TEST est ouverte) |
| A2 | Toucher « se déconnecter » | Retour à l'écran « Bienvenue », boîte de connexion |
| A3 | Se connecter avec `PR-TEST1` | Accueil avec quatre cartes, dont Tableau de bord ; onglet « Tableau de bord » dans la barre |
| A4 | (si un coupon neuf est disponible) Première connexion | Le compte se crée en une ou deux secondes, puis l'accueil s'affiche |

## B. Tutorat (élève `PC-TEST1`)

| # | Geste | Attendu |
|---|---|---|
| B1 | Accueil → « Demander de l'aide » | Formulaire ; niveau présélectionné ; « Mes demandes » en bas |
| B2 | Déposer une demande | « Demande envoyée » ; elle apparaît dans « Mes demandes » |
| B3 | Onglet « Proposer son aide » | Les demandes des autres, sans nom ; disponibilités enregistrées après un clic sur la grille |
| B4 | Recharger la page | On reste sur la même vue (adresse `#offre`) |

## C. Tableau de bord (enseignant `PR-TEST1`)

| # | Geste | Attendu |
|---|---|---|
| C1 | Accueil → Tableau de bord | La demande de B2 dans « Demandes à apparier » |
| C2 | Charger la correspondance (.xlsx) | Les noms remplacent les identifiants, ici et dans « Parcours Python » |
| C3 | Valider un binôme | Message « Binôme validé » ; notification si l'appareil est abonné ; séance listée |
| C4 | Côté élève, recharger | L'encadré « Ta séance de tutorat est validée » en haut, sur toutes les rubriques |
| C5 | Annuler la séance | Elle disparaît des deux côtés |

## D. Participation (classe ouverte)

| # | Geste | Attendu |
|---|---|---|
| D1 | Enseignant : Accueil → Participation | L'application de participation dans le cadre ; « Comptes Résonance des élèves » ; empreinte de la clé |
| D2 | Ouvrir une séance avec `PC-TEST1` observateur | « ✓ … séance envoyée sur N appareil(s) » |
| D3 | Élève : recharger | Bandeau « Tu es observateur » ; « Ouvrir le relevé » mène à la rubrique Participation, relevé ouvert |
| D4 | Élève : « Terminer » puis « Envoyer au professeur » | Côté enseignant, « relevé reçu » en quelques secondes, **sans quitter la rubrique Participation** |
| D5 | Enseignant : passer au Tableau de bord puis revenir à Participation pendant une séance ouverte | La séance est toujours là (le cadre n'est pas rechargé) |
| D6 | Élève : Dépôts bonus → déposer un lien | « Envoyé à ton professeur » ; validation côté enseignant, puis visible dans « Ressources de la classe » |
| D7 | Élève d'une classe **non** ouverte | Pas de carte Participation ; `#participation` ramène à l'accueil |
| D8 | Élève de **première** (n'importe quel coupon de 1re) | Accueil avec la seule carte Tutorat ; ni onglet Participation ni Outils ; `#outils` et `#participation` ramènent à l'accueil |

## E. Parcours Python relié

| # | Geste | Attendu |
|---|---|---|
| E1 | Élève connecté : Accueil → Outils → Parcours Python | La page du parcours, avec sa propre charte ; bandeau « ← Résonance · Connecté·e (PC-TEST1) » |
| E2 | Niveau 1 : réussir deux exercices | « ✓ réussi » sur chacun |
| E3 | Supabase → Table editor → `python_reussites` | Deux lignes : l'uuid de l'élève, `niveau = 1`, `exercice = ex-…`, la date. **Aucun code** |
| E4 | Recharger la page du niveau 1 (ou l'ouvrir sur un autre appareil connecté au même compte) | Les deux exercices sont de nouveau cochés |
| E5 | Accueil du parcours | « Ouvert · 8 séances · … · 2 exercices réussis » |
| E6 | « ← Résonance » | Retour sur Résonance, rubrique Outils |
| E7 | Enseignant : Tableau de bord → Parcours Python | `PC-TEST1` (ou son nom si la correspondance est chargée), « 2 » au niveau 1 ; toucher le 2 liste les exercices |
| E8 | Déconnecté (fenêtre privée) : ouvrir `outils/python/niveau-1.html` | Le parcours fonctionne, sans bandeau ; dans l'onglet Réseau du navigateur, **aucune requête vers supabase.co** |
| E9 | Un second enseignant (sans la classe TEST) | Sa vue Parcours Python ne montre pas `PC-TEST1` |

## F. Service worker et mises à jour (iPad, depuis l'icône)

| # | Geste | Attendu |
|---|---|---|
| F1 | Première ouverture d'un niveau du parcours | « Python se prépare… » (une minute sur le wifi du lycée) |
| F2 | Fermer, rouvrir le niveau | « Python est prêt » en quelques secondes |
| F3 | Modifier un texte d'`index.html`, publier, rouvrir Résonance | Le nouveau texte s'affiche tout de suite (l'application n'est jamais servie depuis le cache) |
| F4 | Notifications : « Envoyer un essai » | La notification arrive ; la toucher ouvre Résonance |

## G. Signalements « J'ai vu un bug » (branche `signalements`)

Préalable : migration `006` collée (étape 9 de `supabase/MISE_EN_PLACE.md`), classe TEST rattachée à `PR-TEST1` (voir le préalable ci-dessus), branche servie en local.

| # | Geste | Attendu |
|---|---|---|
| G1 | Visiteur, puis `PR-TEST1` | Aucun bouton 🐞, ni sur Résonance ni dans le parcours Python |
| G2 | `PC-TEST1` : accueil, Tutorat, Outils, une page du parcours | Le bouton 🐞 « J'ai vu un bug » en bas à droite partout ; il ne masque rien d'important (iPad, portrait et paysage) |
| G3 | Toucher le bouton, laisser le nom vide, envoyer | « Écris ton nom. » ; rien n'est envoyé. Échap (ou Annuler) ferme |
| G4 | Nom, prénom, message depuis « Demander de l'aide » | « ✅ Merci, c'est transmis à ton professeur. », le formulaire se ferme |
| G5 | Même chose depuis le niveau 1 du parcours, exercice 2.2 à l'écran | Idem |
| G6 | Supabase → Table editor → `signalements` | Deux lignes ; `message` commence par « 👤 Nom Prénom » ; `cle` = `tutorat` puis `python-n1` ; `etape` = `#demande · Demander de l'aide` puis « Étape 2 · … — 2.2 … » ; `appareil` court |
| G7 | `PR-TEST1` : Tableau de bord → Signalements | Les deux cartes, la plus récente d'abord ; pastille « 2 » sur l'onglet ; nom de l'élève si la correspondance est chargée |
| G8 | « Accorder +0,5 » sur une carte | « +0,5 enregistré » ; la carte passe dans les traités (cocher « montrer aussi… ») avec « l'élève le verra à sa prochaine ouverture » |
| G9 | `PC-TEST1` : rouvrir Résonance sur `#demande`, puis revenir à l'accueil | Pas de fenêtre sur le formulaire ; à l'accueil, « 🎁 +0,5 au prochain contrôle » ; « Super ! » ferme. Recharger : elle ne revient pas |
| G10 | `PR-TEST1` : Recharger les signalements | « ✓ vu par l'élève le … » sur la carte |
| G11 | « Retirer le +0,5 », puis « Supprimer » | Confirmation, puis la carte disparaît |
| G12 | Un compte de **première** rattaché à `PR-TEST1` envoie un signalement | La carte apparaît, **sans** bouton +0,5. En SQL Editor, `update public.signalements set bonus_le = now() where id = '…';` (l'id de cette carte) est refusé : `BONUS_TERMINALE` (le déclencheur vaut pour tous, éditeur SQL compris) |
| G13 | Envoyer 21 signalements dans la journée avec le même compte | Au 21ᵉ : « Tu as déjà envoyé beaucoup de signalements aujourd'hui… » |

Après les essais : « Supprimer » sur chaque carte, ou `delete from public.signalements where eleve in (select id from public.profils where classe = 'TEST');`.

## Si quelque chose ne va pas

- Revenir en arrière : ne pas fusionner la branche ; `main` n'a pas bougé.
- Vider le cache Python d'un appareil : Réglages → Safari → Avancé → Données de sites → `mvanhoorde.github.io` → supprimer (cela déconnecte aussi).
- Dans `sw.js`, changer `VERSION_VENDOR` (mise à jour de Pyodide) ou `VERSION_OUTILS` vide les anciens caches à la visite suivante.
