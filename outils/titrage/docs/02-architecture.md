# 02 — Architecture de `labo/index.html`

Ce fichier unique (≈ 590 lignes) a trois parties : `<style>`, le balisage (scène SVG, panneau, fenêtre microscopique) et un `<script>` encapsulé dans un bloc `{ … }`, pour ne pas polluer l'espace global.

## 1. Plan du fichier

| Lignes (≈) | Contenu |
|---|---|
| 9-77 | CSS : variables de thème (`--bg`, `--ink`, `--muted`, `--card`, `--line`, `--acc`, `--navy`), grille `.lab`, boutons segmentés `.seg`, fenêtre `#micro`, animations `.spin` (barreau) et `.pulse` (anneau du robinet) |
| 80-83 | En-tête : titre et sous-titre (mention « valeurs simulées ») |
| 85-172 | `<svg id="sc" viewBox="0 0 1200 700">` : la paillasse |
| 174-196 | Panneau de réglages `.panel` |
| 199-210 | Fenêtre `#micro` (dialogue non modal) |
| 212-215 | Tableau des mesures (`<details>`) et pied de page |
| 217-584 | Script |

## 2. Script : constantes et état

```
NS, $(id)                         utilitaires DOM
── MOTEUR CHIMIQUE : début ──────
KE = 1e-14
LAM  {H, HO, Na, Cl, Ac, NH4}     conductivités ioniques molaires (mS·m²·mol⁻¹)
SYS  {hcl, acoh, nh3}             nom, type ("af" | "aw" | "bw"), pKa, titrant
MODES {ph, cond}                  Va (mL), ca, cb (mol/L), eau (mL), capEau / cap (capacité du bécher, mL)
IND  {hel, rm, bbt, phph}         lo, hi (zone de virage), c : 3 couleurs [acide, intermédiaire, basique], incolore
VMAX = 25 (mL), Y0 = 64 (px, graduation 0 de la burette), PXML = 12 (px par mL)
S = {mode, sys, ind, eau, inc, V, pts, theo}   ← ÉTAT UNIQUE de l'application
fmt(x, d)  nombre avec virgule décimale ; sci(x) → « 1,0×10⁻² »
etat(V) → {pH, sigma, Vt}         cœur du calcul (voir 03-modele-chimique.md)
mesure(V) → pH ou σ selon S.mode
── MOTEUR CHIMIQUE : fin ────────
```

`S.pts` est la liste des mesures `[V, valeur]`, commençant par `[0, mesure(0)]`. `S.inc` est l'incrément en mL (1, 0,5, 0,1 ou 0,05). `S.theo` affiche ou masque la courbe complète.

## 3. Script : fonctions

| Fonction | Rôle |
|---|---|
| bloc « décor statique » | génère le carrelage (`#tiles`), les graduations de la burette (`#grad`) et celles du bécher (`#bGrad`) |
| `hex`, `mix`, `couleurInd(pH)` | couleur et opacité du mélange selon l'indicateur (modèle logistique, voir § 6) |
| `niveau()` | hauteur du liquide dans le bécher, en px (maximum 104), à partir de `Vt` et de la capacité affichée |
| `scene()` | met à jour la burette (`#bLiq`), le bécher (`#liqBase`, `#liqInd`), l'étiquette de capacité, le LCD, la lecture `#read` et l'état du bouton Verser |
| `pas(max)`, `echelle()` | échelle verticale : pH de 0 à 14 ; σ automatique (max sur 0 à 25 mL × 1,08, pas « rond » 1, 2, 2,5, 5 ou 10) |
| `X(v)`, `Y(y)` | conversion des données en coordonnées de l'écran d'acquisition |
| `graphe()` | dessine le cadre, la grille, les axes, la courbe théorique et les points dans `#chart` |
| `tableau()` | remplit le tableau des mesures |
| `description()` | phrase décrivant le bécher et la burette |
| `goutte()` | anime une goutte de la pointe (y = 444) jusqu'à la surface en 260 ms ; désactivée si `prefers-reduced-motion` |
| `poignee(ouvert)` | poignée du robinet horizontale (fermée) ou verticale (ouverte) |
| `verser(dv, silencieux)` | **action principale** : borne à 25 mL, arrondit au centième, ajoute un point, appelle `goutte()`, `scene()`, `graphe()`, `tableau()` et `sync()`. Renvoie `false` si la burette est vide |
| `tout()` | `echelle()`, `description()`, `scene()`, `graphe()` et `tableau()` |
| `recommencer()` | remet `S.V` à 0 et `S.pts` à `[[0, mesure(0)]]`, appelle `tout()`, et reconstruit la vue microscopique si elle est ouverte |
| `seg(id, cb)` | gère les groupes de boutons à bascule (`aria-pressed`) |
| écouteurs | `#mode`, `#inc`, `#sys`, `#ind`, `#eau`, `#theo`, `#verser`, `#reset`, `#copy` ; robinet : `pointerdown` / `pointerup` / `pointercancel` / `keydown` |
| vue microscopique | `MIC`, `COL`, `N0`, `M`, `part`, `spec`, `reconstruire`, `sync`, `injecter`, `reagir`, `pas_sim`, `bulle`, `hdot`, `dessin`, `boucle`, `legende`, `compteurs`, `ouvrirMicro`, puis le déplacement de la fenêtre (voir `04-vue-microscopique.md`) |

## 4. Flux des événements

```
clic « Verser » / clic court sur le robinet / Entrée sur le robinet
        └─> verser(S.inc) ─> S.V, S.pts ─> goutte() + scene() + graphe() + tableau() + sync()
appui long sur le robinet (> 380 ms)
        └─> setInterval 80 ms : verser(0,05, silencieux) jusqu'au relâchement ou à la burette vide
changement de suivi / de solution / case « eau »
        └─> recommencer() ─> tout() (+ reconstruire() si la vue microscopique est ouverte)
changement d'indicateur ─> scene()          case « courbe calculée » ─> graphe()
```

Règle : **toute modification de l'état passe par `S`, puis par les fonctions d'affichage.** Aucune fonction d'affichage ne modifie `S`.

## 5. Carte des coordonnées de la scène SVG (viewBox 1200 × 700)

| Élément | Identifiant | Position |
|---|---|---|
| Mur, carrelage de 60 px | `#tiles` | y de 0 à 610 |
| Plan de travail | — | y de 600 à 616 (bord) et de 616 à 700 (façade) |
| Flacon décoratif | — | x de 52 à 110, y de 478 à 600 |
| Socle de la potence | — | x de 120 à 340, y = 588 |
| Tige de la potence | — | x de 168 à 178, y de 40 à 588 |
| Pince de la burette | — | y de 141 à 161 |
| Bras de la sonde | — | y de 311 à 331, jusqu'à x = 346 |
| **Burette** (verre) | — | x de 292 à 308, y de 40 à 388 |
| Liquide de la burette | `#bLiq` | x = 294, largeur 12 ; y = `Y0 + V × PXML` ; bas à y = 388 |
| Graduations de la burette | `#grad` | 0 mL à y = 64, 25 mL à y = 364, soit 12 px par mL ; étiquette tous les 5 mL |
| Pointe | — | y de 402 à 442 ; les gouttes partent de y = 444 |
| **Robinet** (cliquable) | `#robinet`, `#poignee` | centre (300 ; 396), anneau r = 30, zone de clic r = 34 |
| Agitateur | — | x de 220 à 400, y de 540 à 600 ; barreau `#barreau` en (297 ; 531) |
| **Bécher** | `#liqBase`, `#liqInd` | x de 247 à 373 ; fond à y = 540 ; liquide de hauteur `niveau().h` (au plus 104 px) |
| Graduations du bécher | `#bGrad`, `#becCap` | tous les 20 px ; capacité affichée : 100, 250 ou 50 mL |
| Sonde pH | `#sondePH` | x de 343 à 357, y de 300 à 532 |
| Cellule conductimétrique | `#sondeCond` | x de 342 à 358, y de 300 à 534 |
| Câble de la sonde | — | de (350 ; 288) à (575 ; 470) |
| Appareil de mesure | `#lcd`, `#lcdU`, `#appTxt` | x de 440 à 620, y de 470 à 600 ; LCD de 455 à 605 en x, de 485 à 543 en y |
| Câble vers le PC | — | de (620 ; 560) à (900 ; 590) |
| Ordinateur, écran | `#appTitle` | cadre de 690 à 1180 en x et de 90 à 522 en y ; dalle de 705 à 1165 en x et de 105 à 505 en y |
| Zone du graphique | `#chart` | `PX0 = 762`, `PX1 = 1145`, `PY0 = 152`, `PY1 = 452` |
| Gouttes | `#drops` | calque au-dessus de tout |

Ces coordonnées servent aussi au **schéma de montage du cours** (figure 15, montage conductimétrique). Les éléments graphiques doivent être réutilisables (voir P11 dans la feuille de route).

## 6. Modèle de couleur des indicateurs (purement visuel)

Pour un indicateur de zone de virage `[lo ; hi]` :
- `mid = (lo + hi) / 2` et `k = 2 / (hi − lo)` ;
- avancement du virage : `a = 1 / (1 + 10^(−(pH − mid)·k))`, qui vaut environ 0,09 à `lo` et 0,91 à `hi` ;
- couleur : mélange linéaire couleur acide → intermédiaire pour `a < 0,5`, puis intermédiaire → basique ;
- opacité : 0,82, ou `0,88 × a` pour la phénolphtaléine (incolore en milieu acide).

Ce modèle rend un virage progressif et plausible. Ce n'est pas un calcul d'absorbance.

## 7. Points d'extension prévus

- **Nouvelles solutions titrées :** ajouter une entrée à `SYS` (de type `af`, `aw` ou `bw`) et à `MIC`, plus une option dans `#sys`. Un nouveau type (diacide, base forte titrée par un acide fort…) demande d'étendre `ions()` dans `etat()` **et** `titrage.py`.
- **Concentrations réglables :** ce sont `MODES[mode].Va`, `ca` et `cb`. Il faut alors recalculer `V_E`, l'échelle, la capacité du bécher et le rapport de la vue microscopique.
- **Phases de préparation :** prévoir une machine à états au-dessus de `S` (`S.phase = "preparation" | "titrage"`) plutôt que de disperser des conditions dans le code.
