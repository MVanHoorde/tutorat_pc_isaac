# 08 — Journal des décisions

À compléter à chaque évolution, de la plus récente à la plus ancienne. Indiquer pour chaque entrée : la date, ce qui change, pourquoi, et qui a décidé (Loïc, ou une proposition technique validée).

## 2026-11-26 — Dossier Claude Code

- Le labo est rangé dans un dossier de projet autonome pour VS Code et Claude Code : `CLAUDE.md`, documentation, skills, tests.
- **Seule modification de `labo/index.html` :** deux commentaires-repères encadrent le moteur chimique (`MOTEUR CHIMIQUE : début` / `fin`), pour que le moteur puisse être testé hors du navigateur. Le comportement est inchangé.
- Tests créés et passés :
  - `test_moteur.mjs` : 305 vérifications contre le moteur Python et les valeurs du cours ;
  - `test_moteur_python.py` : valeurs citées dans le cours ;
  - `test_interface.mjs` : 27 vérifications dans Chromium, avec captures.
- Captures de la version actuelle archivées dans `reference/captures-v2/`.

## 2026-11-22 — Cours : demi-équivalence retirée

- **Décision de Loïc :** la demi-équivalence (pH = pKa à `V_E/2`) est hors programme de Terminale. Elle est retirée du cours, et les figures sont renumérotées (22 figures).
- Le labo n'affichait déjà rien à ce sujet. **Règle :** ne pas l'ajouter (voir `CLAUDE.md`, règle 5).

## Novembre 2026 — Version 2 du labo (vue microscopique)

- **Demande de Loïc :** une animation à l'échelle microscopique, « sur une autre fenêtre qu'on peut choisir d'ouvrir ou pas », pour comprendre l'équivalence.
- **Choix :**
  - fenêtre flottante non modale ;
  - 20 entités titrées, et 1 entité titrante pour 0,5 mL (donc `V_E = 10 mL`) ;
  - réaction totale au contact, avec le transfert de H⁺ animé ;
  - textes de phase reprenant le vocabulaire du cours ;
  - compteurs.
- **Bug corrigé :** la fenêtre, ouverte par-dessus le panneau, interceptait les clics sur « Verser ». Elle est déplacée en bas à gauche, rendue déplaçable, et dotée de son propre bouton « Verser ».

## Novembre 2026 — Version 1 du labo (prototype)

- **Demande de Loïc :** une paillasse avec le PC à droite, une sonde, une burette, un bécher et un agitateur. On verse en cliquant sur la burette, et la courbe se trace en direct. On choisit un indicateur coloré, dont le virage se voit dans le bécher et sur l'ordinateur. Même chose en conductimétrie, sans indicateur. Les éléments graphiques doivent resservir aux schémas de montage du cours.
- **Choix techniques :**
  - un seul fichier HTML, en SVG et JS natifs ;
  - calcul exact du pH (électroneutralité, dichotomie) et loi de Kohlrausch ;
  - **dilution réelle** prise en compte ;
  - valeurs annoncées comme **simulées** ;
  - paramètres alignés sur les figures du cours (`V_E = 10,0 mL`) ;
  - quatre indicateurs : hélianthine, rouge de méthyle, BBT et phénolphtaléine ;
  - case « 190 mL d'eau » en conductimétrie ;
  - robinet : clic = incrément, appui long = écoulement continu.
- **Bugs corrigés pendant la mise au point :**
  - un élément `hidden` restait affiché à cause de `display:flex`. Ajout de `[hidden]{display:none!important}` ;
  - la lecture « V = … pH = … » débordait. Elle est découpée en deux `span` en `nowrap` ;
  - des étiquettes se chevauchaient (robinet, capacité du bécher, câble de la sonde). Le câble est déplacé à x = 575 ;
  - l'étiquette de l'axe vertical de l'écran du PC est tournée de −90°.
- **Retour de Loïc :** « vraiment très très cool ». Il veut l'ajouter à ses sites et l'auditer plus tard : phases de préparation, choix de la solution titrante et des concentrations (voir la feuille de route).

## Décisions en attente

- P0 : formulation de la mention de transparence.
- P7 : bornes des zones de virage, à aligner sur la figure 20 du chapitre 2.
- P9 : écart de conductivité entre le cours (V_tot constant) et le labo (dilution réelle).
- P1 et P2 : contenu pédagogique des phases de préparation, et valeurs proposées.
