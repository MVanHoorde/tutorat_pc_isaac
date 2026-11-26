# 03 — Modèle chimique

Le même modèle est codé deux fois :
- dans `etat(V)` du labo (JavaScript) ;
- dans `etat(...)` de `figures-python/titrage.py`, qui calcule les figures du cours.

`tests/test_moteur.mjs` vérifie que les deux codes donnent les mêmes résultats, à 10⁻⁴ près.

## 1. Systèmes titrés

| Clé | Solution titrée | Titrant | Type | `pK_A` | Réaction support |
|---|---|---|---|---|---|
| `hcl` | acide chlorhydrique | soude | `af` (acide fort) | — | `H₃O⁺ + HO⁻ → 2 H₂O` |
| `acoh` | acide éthanoïque | soude | `aw` (acide faible) | 4,8 | `CH₃COOH + HO⁻ → CH₃COO⁻ + H₂O` |
| `nh3` | ammoniac | acide chlorhydrique | `bw` (base faible) | 9,2 (couple NH₄⁺/NH₃) | `NH₃ + H₃O⁺ → NH₄⁺ + H₂O` |

Valeurs tabulées : acide éthanoïque `pK_A = 4,76` ; ion ammonium `pK_A = 9,25`. Le cours et le labo arrondissent à 4,8 et 9,2.

## 2. Paramètres (`MODES` dans le labo)

| Suivi | `V_A` (mL) | `c_A` (mol·L⁻¹) | `c_B` (mol·L⁻¹) | Eau ajoutée | `V_E` |
|---|---|---|---|---|---|
| pH-métrique (`ph`) | 20,0 | 1,0×10⁻² | 2,0×10⁻² | 0 | 10,0 mL |
| Conductimétrique (`cond`) | 10,0 | 1,00×10⁻¹ | 1,00×10⁻¹ | 190 mL (case cochée) ou 0 | 10,0 mL |

`V_E = c_A × V_A / c_B` (nombres stœchiométriques égaux à 1). Les deux suivis ont **le même `V_E`**, ce qui simplifie la vue microscopique.

## 3. Calcul du pH : électroneutralité, résolue exactement

Pour un volume versé `V` (mL) :
- `V_t = V_A + V_eau + V` ;
- `C₀ = c_A·V_A / V_t` : concentration apportée de l'espèce titrée ;
- `C_t = c_B·V / V_t` : concentration apportée du titrant ;
- `h = [H₃O⁺] = 10^(−pH)`, `[HO⁻] = K_e / h` et `K_e = 1,0×10⁻¹⁴` (25 °C).

Concentrations des ions en fonction de `h` :

| Type | Ions | Électroneutralité `g(pH) = 0` |
|---|---|---|
| `af` | `[Cl⁻] = C₀`, `[Na⁺] = C_t` | `h + [Na⁺] − [HO⁻] − [Cl⁻] = 0` |
| `aw` | `[CH₃COO⁻] = C₀·K_A / (K_A + h)`, `[Na⁺] = C_t` | `h + [Na⁺] − [HO⁻] − [CH₃COO⁻] = 0` |
| `bw` | `[NH₄⁺] = C₀·h / (K_A + h)`, `[Cl⁻] = C_t` | `h + [NH₄⁺] − [HO⁻] − [Cl⁻] = 0` |

`g` est strictement décroissante en pH. La racine est cherchée **par dichotomie** sur l'intervalle [−1 ; 15] : 70 itérations en JS, 80 en Python. La précision est bien meilleure que 10⁻⁶ unité de pH. Il n'y a ni approximation, ni découpage en zones « avant / après l'équivalence ».

## 4. Calcul de la conductivité : loi de Kohlrausch

`σ = Σ λᵢ·[Xᵢ]`, avec `[Xᵢ]` converti de mol·L⁻¹ en **mol·m⁻³** (× 1000). Les `λᵢ` sont en mS·m²·mol⁻¹, donc **σ est en mS·m⁻¹**.

| Ion | H₃O⁺ | HO⁻ | Na⁺ | Cl⁻ | CH₃COO⁻ | NH₄⁺ |
|---|---|---|---|---|---|---|
| λ (mS·m²·mol⁻¹, 25 °C) | 35,0 | 19,9 | 5,01 | 7,63 | 4,09 | 7,34 |

Source des λ : conductivités molaires limites à 25 °C (tables usuelles ; voir https://en.wikipedia.org/wiki/Molar_conductivity). À aligner sur le tableau du chapitre 3 du cours de Loïc si celui-ci diffère.

## 5. Hypothèses et limites (à connaître avant toute évolution)

- Solutions idéales : on confond activité et concentration. La loi de Kohlrausch est appliquée sans correction de concentration (λ constants).
- Température de 25 °C, donc `K_e = 10⁻¹⁴`.
- Aucun CO₂ dissous, appareils parfaits, réponse instantanée, volumes exacts.
- **Dilution réelle** prise en compte dans le labo (`V_t` croît avec `V`).
- Le modèle ne traite que des monoacides et des monobases. Un diacide, ou l'acide phosphorique, demanderait d'étendre les bilans.
- La couleur des indicateurs relève d'un **modèle visuel** (`02-architecture.md`, § 6), pas d'un calcul d'absorbance.

## 6. Écart connu entre le cours et le labo (conductimétrie)

Les figures 17 à 19 du cours supposent `V_tot = 200 mL` **constant**. On obtient alors des droites exactes et `σ_E = 63,2 mS·m⁻¹` pour HCl. Le labo calcule avec la **dilution réelle** (`V_tot = 200 + V`) : `σ_E = 60,2 mS·m⁻¹`, et les « droites » sont très légèrement courbées. Les deux approches sont correctes ; la seconde correspond à ce que l'élève mesurerait. Si Loïc veut que le labo redonne exactement les valeurs du cours, il faut ajouter une option `V_tot constant` (à arbitrer : P9 dans la feuille de route).

## 7. Valeurs de référence (labo, arrondies)

| Cas | pH à 0 / 5 / 10 / 20 / 25 mL | σ (mS·m⁻¹) à 0 / 5 / 10 / 20 / 25 mL |
|---|---|---|
| pH, HCl | 2,00 / 2,40 / 7,00 / 11,70 / 11,82 | — |
| pH, acide éthanoïque | 3,41 / 4,80 / 8,31 / 11,70 / 11,82 | — |
| pH, ammoniac | 10,59 / 9,20 / 5,69 / 2,30 / 2,18 | — |
| cond. + 190 mL d'eau, HCl | — | 213,2 / 134,8 / 60,2 / 170,7 / 222,2 |
| cond. + 190 mL d'eau, acide éthanoïque | — | 10,7 / 22,8 / 43,4 / 154,6 / 206,5 |
| cond. + 190 mL d'eau, ammoniac | — | 7,5 / 36,9 / 71,3 / 261,8 / 350,7 |
| cond. sans eau, HCl | — | 4263 / 1842 / 632 / 1252 / 1429 |

Valeurs complètes : `tests/valeurs_reference.json`, 9 cas et 16 volumes, générées par `tests/generer_references.py`.

Valeurs du **cours**, vérifiées par `tests/test_moteur_python.py` :
- amplitude du saut entre 9,9 et 10,1 mL : HCl 7,6 / 5,6 / 3,6 pour `c_A` = 10⁻¹ / 10⁻² / 10⁻³ mol·L⁻¹ ; acide faible 3,0 / 0,9 / 0,1 pour `pK_A` = 4,8 / 7,0 / 9,0 ;
- titrage de l'acide éthanoïque : le BBT commence à virer à 9,4 mL, et l'hélianthine a fini de virer à 2,8 mL.

## 8. Pour ajouter un système titré

1. Écrire le bilan d'électroneutralité et les expressions des ions en fonction de `h`.
2. Ajouter le type dans `ions()` (JS) **et** dans `ions()` de `titrage.py`, avec les mêmes noms d'ions. Ajouter les λ manquants avec leur source.
3. Ajouter le cas dans `tests/generer_references.py`, régénérer, puis ajouter au moins deux valeurs « pédagogiques » vérifiées à la main dans `test_moteur.mjs`.
4. Compléter `MIC` pour la vue microscopique (`04-vue-microscopique.md`).
5. Consigner l'ajout dans le journal.
