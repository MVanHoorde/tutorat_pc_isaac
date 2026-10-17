# Parcours Python — ce qui attend la décision de Loïc

*État au 17/10/2026. Tout le contenu des niveaux 2 à 5 est une PROPOSITION : choix des
notions, ordre, contextes, formulations. Ce fichier ne liste que les points précis
qu'un audit doit trancher. On retire une ligne quand elle est tranchée ; la décision
part dans `PARCOURS.md`.*

**Priorité d'audit : niveaux 1 et 2** (annoncé aux élèves sur la page d'accueil).

## Commun à plusieurs niveaux
- **Seuil du z-score.** La fiche d'incertitudes dit « 1 ≤ z ≤ 2 : compatibles » et
  « z ≥ 2 : non compatibles » : les deux cas se chevauchent à z = 2. Les niveaux 1 et 2
  écrivent « 1 ≤ z < 2 ». À corriger aussi dans la fiche ?
- **Cours introuvables** (rappels rédigés d'après le programme officiel ou un TP, à relire) :
  ondes sonores (4.1) et Doppler (4.3) — d'après le sujet du TP5 ; cinétique, titrages,
  radioactivité (niveau 3) ; mécanique du pendule, condensateur (niveau 4) ; transferts
  thermiques, loi de Newton, RC (niveau 5).
- **Vouvoiement** partout (comme l'Atelier 1/2).

## Niveau 1
- Harmonique « de rang 3 » (3f) en 2.1 : conforme à la numérotation du cours ?
- Doppler exact en 2.2 : fR = fE × c / (c − v) (émetteur qui s'approche d'un récepteur fixe).
- Données construites : 15 masses du cylindre (somme 831,73 g, s ≈ 0,02 g), sirop de menthe
  (k = 0,124 L/mg, A = 0,47).

## Niveau 2
- Outils nouveaux répartis en **3 séances** (décider, répéter, tranches et hasard) plutôt qu'une.
- Ajouts non prévus mais nécessaires : `append`, `np.max`, `np.sin`, lecture des affichages `f"…"`.
- Projet Doppler : z-score **entre deux mesures**, |v₁ − v₂| / √(u₁² + u₂²).
- TP4 (conductimétrie) plutôt que TP3 (aucune donnée du sirop de menthe).
- Fentes de Young : écart noté **b** (fiche d'incertitudes, sujet 78) alors que la partie IV
  du cours de diffraction l'appelle **a**.
- M(NaCl) = 58,5 g/mol (le corrigé du TP4 donne 58,6).

## Niveau 3
- Ajouts : `np.random`/`np.sum` (2.3), `plt.quiver` (vecteurs accélération), passage d'une
  fonction en paramètre (dichotomie réutilisable).
- Données construites (chute, lancer, satellite, comptages, absorbance, plongeon) ;
  `planetes.csv` est réel (NASA). Sources dans `sources/niveau-3/`.
- Radioactivité appuyée sur une fiche STL (FS06), faute du cours de terminale.

## Niveau 4
- Contextes : estérification avec K = 4, pendule (équation « établie en PCSI »),
  Kohlrausch non linéaire, pKa arrondis (méthanoïque 3,7, éthanoïque 4,8).
- Solution 4.1 : « b = 0,05 ± 0,02 n'est pas compatible avec 0 ».
- Le mémo fixe le hasard avec `np.random.seed(1)`, non présenté dans la page.
- Données construites : u(σ) du TP4, gamme étendue jusqu'à 100 mmol/L, λ à 641/628/633 nm,
  cinétique de « A ».

## Niveau 5
- Choix des 7 séances, dont le **CAN** (numérisation, d'après le sujet ECE 62).
- Contextes : mur de béton en hiver (D ≈ 8 × 10⁻⁷ m²/s, ordre de grandeur), goutte de
  sirop de menthe (marche aléatoire), refroidissement, filtre vu comme un circuit RC.
- Limites de détection et de quantification : LD = 3 s_blanc / k, LQ = 10 s_blanc / k,
  présentées comme « la convention la plus courante » (le référentiel du BUT n'en fixe pas).
