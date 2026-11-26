# Labo de titrage dans Résonance

**Depuis le 26/11/2026**, le labo numérique de titrage vit dans Résonance : `outils/titrage/index.html`, carte
dans la rubrique Outils, à côté de « Radioactivité ». Page autonome, un seul fichier, sans compte ni serveur ;
rien n'est enregistré ni envoyé. Polices de Résonance (`../../polices/`), aucune requête externe.

Origine : le dossier `labo-titrage-claude-code.zip` conçu par M. Van Hoorde avec Claude (labo + documentation +
figures Python + tests). Le dossier de conception est copié dans `docs/` (`00-consignes-du-projet-d-origine.md`
est l'ancien `CLAUDE.md`) ; les figures Python, les tests Node et le cours de référence sont restés dans le zip.

## Adresses

- `…/outils/titrage/` : labo libre (pH-métrie) ; `?mode=cond` : labo libre en conductimétrie ;
- `?tp=9` : TP9 ; `?tp=10` : TP10. L'onglet choisi met l'adresse à jour (on peut la copier pour un lien direct).

## Les trois onglets

1. **Labo libre** : le labo du zip, sans changement de fond (HCl, acide éthanoïque, ammoniac ; pH ou σ ; indicateurs ;
   190 mL d'eau ; courbe calculée superposable ; vue microscopique).
2. **TP9 · pH-métrie** (« Quel est le degré d'acidité d'un vinaigre ? ») : 10,0 mL de S′ + 100 mL d'eau ; soude
   C_B = 0,10 mol·L⁻¹ ; phénolphtaléine par défaut, les 7 indicateurs du tableau 1 du TP (zones du TP : rouge de
   méthyle 4,2 – 6,3) ; incréments 1 / 0,5 / 0,2 mL / 1 goutte. Exploitation : **méthode des tangentes** (point de
   contact au curseur ou par clic sur la courbe ; la seconde tangente, parallèle, est cherchée de l'autre côté du saut ;
   la droite équidistante coupe la courbe en E) et **courbe dérivée** calculée sur les points de l'élève (le pas des
   ajouts fixe la précision, comme dans Latis Pro). Réticule : le point mesuré le plus proche du pointeur.
3. **TP10 · conductimétrie** (« Quelle est la concentration d'un déboucheur ? ») : V_B = 10,0 mL de S_B + 100 mL
   d'eau ; HCl C_A = 5,00 × 10⁻² mol·L⁻¹ ; σ affichée en **mS·cm⁻¹** comme le conductimètre du lycée ; points non
   reliés. Exploitation : **deux droites de régression** sur des intervalles choisis par l'élève, équations et
   intersection. « Copier les mesures » colle directement dans le tableur (colonnes séparées par des tabulations).

## Valeurs simulées, calées sur les corrigés

| | Paramètre retenu | Ce que donne le labo | Corrigé |
|---|---|---|---|
| TP9 | vinaigre à 8,0° : C = 1,333 mol·L⁻¹, C′ = 0,1333 mol·L⁻¹, pK_A = 4,8 | V_E = 13,33 mL ; tangentes 13,33 mL / pH 8,35 ; dérivée 13,30 mL | 13,2 – 13,4 mL ; pH_E 8,3 – 8,4 |
| TP10 | **C₀ = 2,45 mol·L⁻¹** (C_B = 4,90 × 10⁻² mol·L⁻¹) | σ = 1,110 / 0,552 / 2,149 mS·cm⁻¹ à 0 / 10 / 20 mL ; droites 0–9 et 11–20 mL → 9,61 mL | 1,119 / 0,552 / 2,149 ; 9,6 mL |

Pour le TP10, C₀ = 2,45 mol·L⁻¹ est la valeur qui redonne le tableau 1 du corrigé (écart quadratique 0,02 mS·cm⁻¹ sur
21 points). Le « vrai » V_E du modèle est 9,80 mL ; la dilution (V_tot = 110 + V_A mL) courbe légèrement les deux
branches, et l'intersection des droites tombe à 9,6 mL, comme dans le corrigé, d'où C₀ ≈ 2,4 mol·L⁻¹ pour l'élève.

Le moteur (bloc `MOTEUR CHIMIQUE` de `index.html`) est celui du zip, avec un type de plus : `bf` (base forte titrée
par un acide fort, ions Na⁺ et Cl⁻). Les valeurs de référence du labo libre (doc 03, § 7) sont inchangées :
pH 2,00 / 2,40 / 7,00 à 0 / 5 / 10 mL pour HCl ; σ_E = 60,2 mS·m⁻¹ en conductimétrie avec 190 mL d'eau.

## Écarts avec le zip

- Polices Atkinson Hyperlegible (Google) remplacées par celles de Résonance (RGPD : aucune requête externe).
- Couleurs sans `light-dark()` (Safari < 17.5 sur les iPad), bandeau et lien « ← Résonance » comme la Radioactivité.
- Vue microscopique : une entité titrante pour V_E / 20 (et non plus 0,5 mL fixe), pour que l'équivalence tombe
  toujours à 20 entités quel que soit l'onglet.
- Mention de transparence du pied de page : celle des TP (« Choix pédagogiques, conception, relecture et correction :
  Loïc Van Hoorde. Développement et mise en forme assistés par Claude »). Point P0 du zip, à confirmer.

## À valider par M. Van Hoorde (choix faits sans lui, le 26/11/2026)

- [ ] **TP10 noté** : la modélisation par deux droites donne l'intersection, ce qui est une compétence évaluée
      (« utiliser un tableur… modéliser une courbe »). Elle est repliée derrière une case à cocher ; à masquer pendant
      l'évaluation si besoin. Le labo ne calcule jamais C_B ni C₀.
- [ ] **TP9** : la méthode des tangentes et la dérivée affichent V_E et pH_E. Le TP n'est pas noté : gardé.
- [ ] C₀ = 2,45 mol·L⁻¹ (TP10) plutôt que la valeur du fabricant (2,5) ou le résultat du corrigé (2,4) : voir plus haut.
- [ ] Les points ouverts du zip restent ouverts (`docs/08-journal-des-decisions.md`) : P1 phases de préparation
      (rinçage, remplissage, zéro), P2 concentrations réglables, P7 bornes des zones de virage, P9 V_tot constant.

## Règles (reprises du projet d'origine, `docs/00-…`)

- Un seul fichier HTML autonome ; aucune donnée inventée : tout est calculé et présenté comme simulé.
- Le moteur est la source de vérité ; ne pas déplacer les repères `MOTEUR CHIMIQUE : début / fin`.
- Texte élève : vouvoiement, virgule décimale, unités `mol·L⁻¹`, `mS·m⁻¹` (`mS·cm⁻¹` au TP10), exposants Unicode ;
  pas de demi-équivalence ni de lecture du pK_A ; ne jamais mentionner « le programme ».
- Accessibilité : cibles ≥ 44 px, robinet au clavier, `aria-live`, `prefers-reduced-motion`.
- Pas de collecte : ni compte, ni `localStorage`.
- `©2026 Loïc Van Hoorde – CC BY-NC 4.0` dans le pied de page.

## Vérifié le 26/11/2026

Chromium headless (Playwright) : les trois onglets, 20 ajouts par onglet, tangentes, dérivée, droites, vue
microscopique, `?tp=9`, `?mode=cond`, largeur 390 px sans défilement horizontal ; aucune erreur JavaScript.
