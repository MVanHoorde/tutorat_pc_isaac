# Plan de test — accueil à trois entrées, parcours Python relié, signalements, périodes

Sections A à G : accueil, parcours Python et signalements (en ligne depuis le 17/10/2026). Section H : périodes et
bilan de période (en ligne depuis le 17/10/2026), à dérouler avec de vrais comptes, de préférence sur la classe TEST avant la clôture réelle de P1.
Section I : Boîte à cartes par Résonance (pont vers Leitner), après le déploiement de la fonction.
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
- Signalements : pas de bouton sans connexion ni pour l'enseignant (Résonance et parcours) ; ni pour une première ; bouton pour une terminale (accueil, Tutorat, pages du parcours) ; dialogue modal sans nom ni prénom, focus sur le message, Échap ferme et rend le focus ; message trop court refusé ; envoi du message seul, `cle` et `etape` justes (`tutorat` / `#demande`, `python-n1` / « Étape 2 · … — 2.2 … »), sans compte ni statut envoyés ; plafond et panne réseau expliqués ; fenêtre 🎁 seulement à l'accueil, une seule fois, « vu » envoyé ; Tableau de bord : cartes récentes d'abord, « Accorder +0,5 » pour la terminale seulement, Traité, Supprimer ; migration absente signalée sans erreur.

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

## G. Signalements « J'ai vu un bug »

Préalable : migration `006` collée (étape 9 de `supabase/MISE_EN_PLACE.md`), classe TEST rattachée à `PR-TEST1` (voir le préalable ci-dessus), branche servie en local.

| # | Geste | Attendu |
|---|---|---|
| G1 | Visiteur, puis `PR-TEST1` | Aucun bouton 🐞, ni sur Résonance ni dans le parcours Python |
| G2 | `PC-TEST1` : accueil, Tutorat, Outils, une page du parcours | Le bouton 🐞 « J'ai vu un bug » en bas à droite partout ; il ne masque rien d'important (iPad, portrait et paysage) |
| G3 | Toucher le bouton, envoyer un message vide | « Écris au moins quelques mots. » ; rien n'est envoyé. Échap (ou Annuler) ferme |
| G4 | Un message depuis « Demander de l'aide » (pas de nom à saisir) | « ✅ Merci, c'est transmis à ton professeur. », le formulaire se ferme |
| G5 | Même chose depuis le niveau 1 du parcours, exercice 2.2 à l'écran | Idem |
| G6 | Supabase → Table editor → `signalements` | Deux lignes ; `message` = le texte tapé, sans nom ; `cle` = `tutorat` puis `python-n1` ; `etape` = `#demande · Demander de l'aide` puis « Étape 2 · … — 2.2 … » ; `appareil` court |
| G7 | `PR-TEST1` : Tableau de bord → Signalements | Les deux cartes, la plus récente d'abord ; pastille « 2 » sur l'onglet ; nom de l'élève si la correspondance est chargée |
| G8 | « Accorder +0,5 » sur une carte | « +0,5 enregistré » ; la carte passe dans les traités (cocher « montrer aussi… ») avec « l'élève le verra à sa prochaine ouverture » |
| G9 | `PC-TEST1` : rouvrir Résonance sur `#demande`, puis revenir à l'accueil | Pas de fenêtre sur le formulaire ; à l'accueil, « 🎁 +0,5 sur ta note de participation » ; « Super ! » ferme. Recharger : elle ne revient pas |
| G10 | `PR-TEST1` : Recharger les signalements | « ✓ vu par l'élève le … » sur la carte |
| G11 | « Retirer le +0,5 », puis « Supprimer » | Confirmation, puis la carte disparaît |
| G12 | Un compte de **première** | Aucun bouton 🐞, ni sur l'accueil ni dans le Tutorat |
| G12 bis | `PR-TEST1` : rubrique Participation → Dépôts, tableau « Points bonus » | `PC-TEST1` y figure avec 0,5 dans la colonne Signalements (après G8), et le total des dépôts + signalements |
| G12 ter | Accorder un cinquième +0,5 au même élève dans la période | « Refusé : cet élève a déjà 2 points de signalements sur la période » |
| G13 | Envoyer 21 signalements dans la journée avec le même compte | Au 21ᵉ : « Tu as déjà envoyé beaucoup de signalements aujourd'hui… » |

Après les essais : « Supprimer » sur chaque carte, ou `delete from public.signalements where eleve in (select id from public.profils where classe = 'TEST');`.

## H. Périodes et bilan de période

Déjà vérifié automatiquement : migration `007` rejouée dans des transactions annulées sur la vraie base (bilan de la classe : participation /10, tutorat proposé, droits de l'autre enseignant ; clôture de 21 élèves ; note cachée à l'élève avant la clôture ; dépôt à 2 points refusé ; cinquième +0,5 refusé) ; application de participation seule (16 contrôles) ; Résonance dans Chromium avec une base simulée (27 contrôles : saisie, refus de 12/10, recalcul et plafond de 20, export CSV, clôture de la base et de l'application, vue élève).

Préalable : migration `007` collée (fait le 17/10/2026). **Exporter une sauvegarde de l'application de participation avant tout.**

| # | Geste | Attendu |
|---|---|---|
| H1 | Enseignant : Participation → application → Suivi | « Suivi de la période », période « P1 · en cours », les séances de la rentrée ; bilan en « /10 » ; un encadré renvoie au Bilan de période de Résonance |
| H2 | Roue → panneau des compteurs | Plus de bouton « Nouvelle période » ; « Période 1. Les compteurs repartent à zéro à la clôture » |
| H3 | Résonance, sous le cadre : « Publier le suivi aux élèves » | « Suivi de la période 1 publié » |
| H4 | Bilan de période | Une ligne par élève avec son nom ; participation /10 ; passages à la roue ; tutorat proposé (le tuteur du 12/10 : 1) ; note provisoire |
| H5 | Saisir une prise de notes (« 7,5 »), puis « 12 » chez un autre | « Enregistré : … » et note recalculée ; « 12 » refusé (« entre 0 et 10 ») |
| H6 | Régler un tutorat à 3, puis vider la case | La note suit ; vidée, la proposition revient |
| H7 | Dépôts : valider un dépôt à +1, puis changer un dépôt validé en +1,5 | Menu 0 · +0,5 · +1 · +1,5 ; le Bilan de période (Recharger) suit |
| H8 | `PC-TEST1` : Participation → « Où j'en suis » | « Période 1 · en cours », les bonus et leur origine ; **ni prise de notes ni note** |
| H9 | Exporter le bilan | Fichier `bilan-…-P1-….csv` lisible dans Excel (accents, virgules), avec les noms |
| H10 | « Clôturer la période 1 » | Confirmation (élèves sans note annoncés) ; deux fichiers téléchargés ; « Période 1 close… Roue remise à zéro » ; l'application passe en P2, la roue à zéro |
| H11 | `PC-TEST1` : recharger | « Période 2 · en cours », et « Période 1 · x/20 » avec participation, prise de notes et bonus |
| H12 | Bilan, période 1 close : corriger une prise de notes | Enregistré ; l'élève voit la nouvelle note |
| H13 | Valider une séance de participation après la clôture | Elle compte en P2 ; le suivi publié va en période 2 |

Pour un essai sur la classe TEST sans toucher à la vraie classe : ouvrir la participation à TEST, puis, après les essais :
`delete from public.participation_suivi where eleve in (select id from public.profils where classe = 'TEST'); delete from public.periodes where classe = 'TEST';`

## I. Boîte à cartes par Résonance (pont vers Leitner)

Déjà vérifié automatiquement : fonction `pont-resonance` (14 cas, faux réseau) et banc de bout en bout sur un vrai serveur
d'authentification Supabase (GoTrue v2.193) ; Chromium sur Résonance et Leitner servis comme sur GitHub Pages (13 contrôles :
Outils → Boîte à cartes connecté, ticket retiré de l'adresse, session gardée au rechargement, « ‹ Résonance » ramène à Outils ;
Leitner ouvert directement → « Me connecter avec Résonance » → connexion Résonance → retour connecté ; première refusée avec un
message ; ticket faux ou rejoué refusé, sans session).

Préalable, dans l'ordre : `supabase functions deploy pont-resonance --no-verify-jwt` **depuis `Site-Web-Portfolio/`** (projet
du site du cours, pas celui de Résonance) ; publier `Leitner`, puis Résonance.

| # | Geste | Attendu |
|---|---|---|
| I1 | `PC-TEST1` : Outils → Boîte à cartes | Leitner s'ouvre connecté, « Bonjour PC-TEST1 », « Terminale (Résonance) », bouton « ‹ Résonance » en haut |
| I2 | Réviser quelques cartes, puis recharger | Toujours connecté ; progression gardée |
| I3 | « ‹ Résonance » | Retour à Outils, toujours connecté à Résonance |
| I4 | Sur un autre appareil : ouvrir directement `mvanhoorde.github.io/Leitner/` → « Me connecter avec Résonance » | Connexion Résonance demandée, puis retour dans Leitner, connecté ; la progression de I2 est là |
| I5 | Compte de première (ou `PR-TEST1`) : `…/tutorat_pc_isaac/index.html#vers-leitner` | Message « réservée aux élèves de terminale » (enseignant : « avec leur compte du site du cours ») ; on reste sur Résonance |
| I6 | iPad, Résonance ouvert depuis l'écran d'accueil : Outils → Boîte à cartes | Leitner s'ouvre (dans l'app ou dans Safari selon iPadOS) ; noter lequel |

## Si quelque chose ne va pas

- Revenir en arrière : ne pas fusionner la branche ; `main` n'a pas bougé.
- Vider le cache Python d'un appareil : Réglages → Safari → Avancé → Données de sites → `mvanhoorde.github.io` → supprimer (cela déconnecte aussi).
- Dans `sw.js`, changer `VERSION_VENDOR` (mise à jour de Pyodide) ou `VERSION_OUTILS` vide les anciens caches à la visite suivante.
