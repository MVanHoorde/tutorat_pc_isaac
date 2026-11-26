# 01 — Cahier des charges du labo numérique de titrage

## 1. Public et usage

- **Élèves** de Terminale générale, enseignement de spécialité physique-chimie (France), qui travaillent seuls sur ordinateur, tablette ou téléphone.
- **Contexte d'usage :**
  - intégré au cours en ligne QuizEO (Th. 1 - Ch. 4), dans deux granules *Iframe* : la fin de la partie III (suivi pH-métrique) et la fin de la partie IV (suivi conductimétrique) ;
  - publié sur le site de Loïc (« du cahier au laboratoire », GitHub Pages) ;
  - projeté en classe par l'enseignant.
- **Durée d'une manipulation :** 5 à 15 minutes.

## 2. Objectifs pédagogiques

Le labo doit permettre à l'élève de :

1. **Voir** l'évolution du pH (ou de la conductivité) au fil des ajouts et repérer le saut de pH, ou le changement de pente.
2. **Comprendre** que l'équivalence correspond au **changement de réactif limitant** et aux **proportions stœchiométriques**. C'est le rôle de la vue microscopique.
3. **Comparer** les trois situations du cours :
   - acide fort titré par une base forte ;
   - acide faible titré par une base forte ;
   - base faible titrée par un acide fort.

   Le pH à l'équivalence vaut `7`, est supérieur à `7` ou inférieur à `7` selon le cas.
4. **Justifier le choix d'un indicateur coloré** : sa zone de virage doit être contenue dans le saut de pH. L'élève observe un virage trop précoce ou bien placé, pour un même titrage, selon l'indicateur choisi.
5. **Justifier qualitativement l'évolution des pentes** d'une courbe conductimétrique, et comprendre pourquoi on ajoute un grand volume d'eau (case « 190 mL d'eau »).
6. **Exploiter ses mesures** dans un tableur (bouton « Copier les mesures »).

Hors objectifs, et à ne pas ajouter sans accord de Loïc :
- la demi-équivalence et la lecture du `pK_A` sur la courbe (hors programme) ;
- les titrages par précipitation ;
- l'oxydoréduction ;
- les calculs d'incertitude, qui font l'objet d'un cours séparé.

## 3. Fonctions actuelles (version 2, novembre 2026)

### 3.1 Paillasse (scène SVG)

- **Décor :**
  - mur carrelé, paillasse ardoise et flacon décoratif « titrant » ;
  - potence avec noix et pinces ;
  - burette graduée de 0 à 25 mL ;
  - bécher gradué sur agitateur magnétique, avec un barreau aimanté qui tourne ;
  - sonde pH-métrique ou cellule conductimétrique, et appareil de mesure à écran LCD vert ;
  - ordinateur dont l'écran affiche la courbe.
- **Robinet cliquable** (cercle orange pulsant autour) :
  - un clic verse l'incrément choisi ;
  - un appui long (plus de 380 ms) déclenche un écoulement continu de 0,05 mL toutes les 80 ms ;
  - au clavier, Entrée ou Espace verse l'incrément.
- La poignée du robinet pivote pendant l'écoulement, une goutte tombe dans le bécher et le niveau de liquide monte dans le bécher et baisse dans la burette.
- **La couleur du mélange** suit l'indicateur choisi. La phénolphtaléine est incolore puis rose.
- **L'appareil de mesure** affiche le pH (2 décimales) ou σ en mS·m⁻¹ (1 décimale sous 100, sinon aucune).

### 3.2 Écran d'acquisition (dans la scène)

- Axe des volumes de 0 à 25 mL. Axe des pH de 0 à 14, ou axe de σ avec une échelle automatique.
- Points de mesure bleus reliés par une ligne ; le dernier point est orange.
- Option « Superposer la courbe calculée complète » : courbe grise en pointillés.

### 3.3 Panneau de réglages

- **Suivi :** pH-métrique ou conductimétrique.
- **Solution titrée :**
  - acide chlorhydrique et acide éthanoïque, titrés par la soude ;
  - ammoniac, titré par l'acide chlorhydrique.
- **Description** de la composition du bécher et de la burette.
- **Indicateur coloré**, en pH-métrie seulement : aucun, hélianthine, rouge de méthyle, BBT ou phénolphtaléine, avec leurs zones de virage.
- **Case « 190 mL d'eau distillée ajoutés »**, en conductimétrie seulement.
- **Volume versé à chaque clic :** 1 mL, 0,5 mL, 0,1 mL ou 1 goutte (0,05 mL).
- **Lecture en grand :** `V = … mL   pH = …`.
- **Boutons :** Verser, Recommencer, ouvrir ou fermer la vue microscopique, Copier les mesures (format `V (mL);pH` avec virgule décimale, prêt pour un tableur).
- Tout changement de suivi, de solution ou de la case « eau » **remet le titrage à zéro**. Le changement d'indicateur ne le fait pas.

### 3.4 Vue microscopique (fenêtre flottante, optionnelle)

Elle est décrite en détail dans `04-vue-microscopique.md`. En résumé :
- 20 entités d'espèce titrée au départ, et une entité titrante dessinée pour 0,5 mL versé ;
- l'ion H⁺ échangé est animé ;
- des compteurs suivent les entités ;
- un texte de phase s'affiche : « avant l'équivalence », « équivalence » ou « après l'équivalence » ;
- la fenêtre se déplace par son bandeau, se ferme par Échap et a son propre bouton « Verser ».

### 3.5 Tableau des mesures

Section repliable sous le labo.

### 3.6 Pied de page

Licence et mode de calcul des valeurs.

## 4. Contraintes non fonctionnelles

| Domaine | Exigence |
|---|---|
| Technique | Un seul fichier HTML, sans dépendance ni build ; fonctionne en `file://`, sur un serveur statique et dans une iframe HTTPS |
| Hors ligne | Tout fonctionne sans réseau ; seule la police est chargée en ligne, avec une police système de repli |
| Navigateurs | Chrome, Edge, Firefox et Safari récents, sur ordinateur, tablette et téléphone |
| Performance | Pas de boucle d'animation permanente : la boucle `requestAnimationFrame` de la vue microscopique ne tourne que si la fenêtre est ouverte. Calculs instantanés (dichotomie de 70 itérations) |
| Accessibilité | WCAG 2.2 AA : contrastes, clavier, focus visible, `aria-live`, `prefers-reduced-motion`, cibles ≥ 44 px |
| Thèmes | Clair et sombre pour l'interface (`light-dark()`). La scène SVG reste en couleurs claires, comme une planche de manuel |
| Langue | Français, vouvoiement, typographie française |
| Vie privée | Aucune collecte, aucun cookie, aucun appel réseau autre que la police |
| Licence | CC BY-NC 4.0, ©2026 Loïc Van Hoorde |

## 5. Ce que le labo ne doit jamais faire

- Présenter des valeurs calculées comme des mesures réelles.
- Afficher un résultat scientifiquement faux pour simplifier, par exemple un pH à l'équivalence de 7 pour un acide faible.
- Employer le vocabulaire « programme » ou « B.O. » dans le texte élève.
- Dépendre d'un service externe pour fonctionner.

## 6. Définition de « terminé » pour une évolution

1. La fonction est conforme aux critères d'acceptation de `06-feuille-de-route.md`.
2. `npm run test:tout` est au vert. Les nouveaux comportements sont couverts par un test, si c'est possible.
3. Les captures de `tests/captures/` ont été regardées : pas de chevauchement de texte ni de débordement en 390 px de large.
4. `08-journal-des-decisions.md` et le statut dans `06-feuille-de-route.md` sont à jour.
5. Loïc a validé les choix pédagogiques impliqués.
