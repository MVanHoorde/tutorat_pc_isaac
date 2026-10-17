# Parcours Python — structure des cinq niveaux

*Terminale spécialité physique-chimie · Résonance, rubrique Outils · état au 17/10/2026*

> **Statut.** Le découpage en cinq niveaux est **validé par Loïc** (17/10/2026).
> Le contenu de chaque niveau ci-dessous est une **PROPOSITION à valider** :
> notions, ordre et contextes relèvent de ses choix. Les cinq niveaux sont
> rédigés (`niveau-1.html` à `niveau-5.html`, mémos dans `fiches/`). Niveau 1
> audité une première fois ; **audit prioritaire : niveaux 1 et 2** (annoncé aux
> élèves sur `index.html`). Les points à trancher sont listés dans `A-VALIDER.md`.
> Le niveau 3 se génère depuis `sources/niveau-3/` (`python build.py`).

## Principes (décidés)

- **Deux choses à la fois** : on apprend Python *et* on révise le cours. Chaque
  exercice a un contexte tiré du cours de physique-chimie. Quand le programme ne
  prévoit pas de capacité numérique sur un chapitre (Doppler, diffraction,
  Beer-Lambert, IR), le chapitre sert de **thème**, pas d'objectif numérique.
- **Niveaux 1 et 2 : thèmes du premier bloc du cours** — ondes sonores (4.1),
  diffraction et interférences (4.2), Doppler (4.3), acide-base (1.2), méthodes
  physiques d'analyse : absorbance, conductimétrie, IR (1.3), incertitudes (T.1).
  À partir du niveau 3, tout le programme.
- **Libre accès** : aucun verrou, aucune correction par l'enseignant. L'élève
  exécute, lit le message d'erreur, consulte une solution après un premier essai.
- **Interpréteur dans chaque cadre** (Pyodide auto-hébergé, numpy et matplotlib),
  messages d'erreur courts en français, explication détaillée dépliable.
- **Rappels de cours** sous un bouton ⓘ, tirés des fiches et des cours Quizéo.
- **Fiche PDF de fin de niveau** à télécharger, pour le travail sur papier.
- **Étiquettes d'origine** aux niveaux 4 et 5 : chaque notion indique la
  formation qui l'attend (« attendu de PCSI », « BUT Mesures physiques »…).
- **Bibliothèque ECE** à part : les parties Python des sujets de la banque 2026,
  réécrites (sujets cités par leur numéro, PDF non republiés). Quelques-uns sont
  intégrés au parcours.

## Ce que l'élève sait déjà (maths 2019, cohorte 2026-2027)

> 2nde : « Variables informatiques de type entier, booléen, flottant, chaîne de
> caractères. Affectation […]. Instruction conditionnelle. Boucle bornée (for),
> boucle non bornée (while). » — « Écrire des fonctions simples […]. **Aucune
> connaissance sur les listes n'est exigée.** »
> 1re : « Générer une liste […]. Parcourir une liste. Itérer sur les éléments
> d'une liste. »

Conséquence : le niveau 1 peut aller vite sur les variables, mais ne suppose
rien ; les listes arrivent au niveau 2.

---

## Niveau 1 — La boîte à outils de l'ECE ✅ rédigé (V2, en audit)

**Objectif** (décision du 17/10/2026) : **tous les éléments** qui permettent de
faire la partie Python d'une ECE, un par un. Pyplot, les listes et les
statistiques en font partie.

| Séance | Notions Python | Thème du cours |
|---|---|---|
| 1. Python, une calculatrice | console `>>>`, opérations, `**`, ordre des calculs, point décimal, notation `e` | ondes sonores, intensité |
| 2. Ranger des valeurs | variable, affectation `=`, mots réservés (`lambda`), script, `print`, `#` | harmoniques, Doppler exact et approché, interférences |
| 3. Types et affichage | `int`/`float`/`str`, textes, `print` à plusieurs morceaux, `round` | Doppler, diffraction (TP1) |
| 4. La bibliothèque numpy | `import`, `log10`, `sqrt`, piège `np.log` ; « derrière le rideau » : l'open source | niveau sonore, pH, incertitude type A |
| 5. Listes et tableaux | listes, `len`, indices, `np.array`, calcul sur tout un tableau | pH du TP6, liquides courants |
| 6. Statistiques | `np.mean`, `np.std(ddof=1)`, incertitude-type | cylindre d'aluminium |
| 7. Tracer avec pyplot | `plot`, styles, `label`/`legend`, axes, `linspace`, `hist`, `show` | étalonnage du TP4, histogramme |
| 8. Lire un message d'erreur | SyntaxError, NameError, TypeError, mot réservé, `^` silencieux, ValueError de `plt.plot` | Beer-Lambert (sirop de menthe) |

Fiche de fin : mémo du niveau 1 (3 pages, avec trois exemples commentés).

## Niveau 2 — Les outils rassemblés : mini-projets d'ECE

**Objectif** : rassembler les outils du niveau 1 dans des programmes plus
grands, comme le jour de l'épreuve. À la fin du niveau 2, on est prêt pour l'ECE.
`if` / `elif` / `else` (décision du 17/10/2026) arrive ici, par exemple pour
conclure à partir d'un z-score.

**Ce que demande réellement l'ECE** (banque 2026 : 20 sujets sur 90 contiennent
du Python) : exécuter puis lire un résultat (20 sujets), saisir des valeurs avec
le point décimal (17), remplir une liste ou un `np.array` (9), écrire une
formule (8-9). Un seul sujet fait écrire un `plt.plot`. Fonctions les plus
fréquentes : `np.array`, `plt.plot`/`xlabel`/`show`, `np.sqrt`,
`np.std(ddof=1)/np.sqrt(n)` (8 sujets).

**Notions nouvelles** : `if` / `elif` / `else`, comparaisons, `abs`, boucle
`for` sur une liste, tranches (`x[:5]`). Le reste est la mise en œuvre conjointe
des outils du niveau 1.

**Extraits du programme de Terminale** (BO spécial n° 8 du 25/07/2019), les
capacités numériques du premier bloc :
- « Représenter, à l'aide d'un langage de programmation, la somme de deux
  signaux sinusoïdaux périodiques synchrones en faisant varier la phase à
  l'origine de l'un des deux. »
- « Tracer, à l'aide d'un langage de programmation, le diagramme de
  distribution des espèces d'un couple acide-base de pKA donné. »
- « Déterminer, à l'aide d'un langage de programmation, le taux d'avancement
  final d'une transformation, modélisée par la réaction d'un acide sur l'eau. »
- « Représenter l'histogramme associé à une série de mesures à l'aide d'un
  tableur ou d'un langage de programmation. »
- « Simuler, à l'aide d'un langage de programmation, un processus aléatoire
  illustrant la détermination de la valeur d'une grandeur avec
  incertitudes-types composées. »
- « Comparer […] le résultat d'une mesure m_mes à une valeur de référence m_ref
  en utilisant le quotient |m_mes − m_ref| / u(m). »

Ces capacités sont **évaluables à l'écrit du bac** (note de service, août 2024).

**Pistes** :
- reprise de l'**Atelier Python 1/2** (exercices 1 à 7 : TP6 pH, TP4
  Kohlrausch, pipette jaugée, liquides courants, 20 pH du robinet) ;
- interférences : somme de deux sinusoïdes, déphasage variable ;
- diagramme de distribution (script `diagramme de distribution.py` existant) ;
- TP4 : courbe d'étalonnage σ = f(c) ; TP3 : A = f(c), sirop de menthe
  (données à construire) ; TP1 : θ en fonction de 1/a (D = 1,50 m) ;
- incertitudes : histogramme d'une série, type A, z-score.

**Sujets ECE 2026 à intégrer** : 78 (diffraction et interférences, le plus
complet : type A et Monte-Carlo), 52, 59, 89 (diffraction-interférences), 3
(acide-base), 1 (Monte-Carlo), 19, 35, 38 (type A).

Fiche de fin : mémo ECE (reprise du mémo de l'Atelier 1/2).

## Niveau 3 — Intermédiaire : vers l'autonomie

**Objectif** : écrire de petits programmes complets, traiter tout le programme.

**Notions** : écrire ses propres fonctions (`def`, `return` — décision du
17/10/2026 : on ne le fait jamais pour le bac), lire un fichier de données (CSV
d'acquisition ou de smartphone), dérivée numérique (vitesse volumique, vitesse),
`np.polyfit` sur une droite d'étalonnage, méthode d'Euler sur y' = ay + b,
dichotomie, simulation et loi des grands nombres.

**Extraits** : « Représenter […] l'évolution des quantités de matière des espèces
en fonction du volume de solution titrante versé » (titrages) ; « tracer
l'évolution temporelle d'une concentration, d'une vitesse volumique […] »
(cinétique) ; « Représenter […] des vecteurs accélération » ; « tester les
deuxième et troisième lois de Kepler ». Euler, dichotomie et Monte-Carlo ne
figurent qu'en **exemples** des programmes de mathématiques, jamais en
exigence.

**Pistes** : titrage conductimétrique n(V) ; cinétique (TP23-24) ; décroissance
radioactive par Euler (ressource de l'académie de Strasbourg, `curve_fit`
remplacé par une linéarisation) ; charge d'un condensateur ; mouvement
parabolique (TP12, sujet ECE 34 Plongeon).

## Niveau 4 — Ouverture vers la 1re année du supérieur

**Objectif** : chercher soi-même dans la documentation, découvrir ce que le
supérieur attend. Chaque notion porte son étiquette.

| Notion | Étiquette |
|---|---|
| Régression linéaire raisonnée : barres d'incertitude, écarts normalisés, pas de R² seul | attendu de PCSI / MPSI / MP2I / BCPST / TSI |
| Monte-Carlo sur les paramètres d'une régression | attendu de PCSI / MPSI / BCPST / TSI |
| Loi normale, intervalle de confiance, écart normalisé | attendu de PCSI (toutes filières de 1re année) |
| `np.random.normal`, `plt.hist`, tirages aléatoires | attendu de PCSI (annexe outils numériques) |
| Dichotomie, `scipy.optimize.bisect`, méthode de Newton | attendu de PCSI (Newton : PCSI chimie) |
| Euler sur un 1er ordre forcé, `odeint` sur un 2nd ordre | attendu de PCSI / MPSI / TSI1 |
| État final avec une constante d'équilibre K | attendu de PCSI chimie / MPSI / TSI1 |
| Spécifier une fonction, tests, `assert`, dictionnaires, fichiers | informatique commune de CPGE ; BUT Mesures physiques (R1.07) |
| Statistiques descriptives et régression en TP | BUT Chimie (R1.07) |
| Incertitude élargie, méthode GUM | BTS Métiers de la chimie |

**Personnaliser un graphique** (souhait de Loïc) : couleurs, styles, barres
d'erreur, sous-figures, échelle logarithmique, en cherchant dans la
documentation de matplotlib — compétence absente de l'ECE.

**Extrait CPGE** (bloc « Mesures et incertitudes », commun à toutes les
filières) : « Associer un intervalle de confiance à l'écart-type dans
l'hypothèse d'une distribution suivant la loi normale. » — « simuler […] un
processus aléatoire de variation des valeurs expérimentales de l'une des
grandeurs – simulation Monte-Carlo – pour évaluer l'incertitude sur les
paramètres du modèle. »

## Niveau 5 — Ouverture vers la 2e année et les spécialités

| Notion | Étiquette |
|---|---|
| FFT (`numpy.fft.rfft`), spectre d'un son enregistré | attendu de PSI (en PC, Fourier « non exigible ») |
| Échantillonnage, repliement, Nyquist-Shannon | PC / MP / PSI ; BUT Mesures physiques (R2.08) |
| Filtrage numérique d'un signal | attendu de MP / TSI2 |
| Tableaux 2D, différences finies (diffusion) | attendu de PC / MP / TSI2 |
| Marche aléatoire | attendu de PC |
| Loi de Student, limites de détection, validation de méthode | BUT Chimie (R3.08) |
| Pilotage d'instrument, CAN | BUT Mesures physiques |

**Pistes liées au premier bloc** : spectre d'un son (4.1), Monte-Carlo sur la
pente d'une droite d'étalonnage (1.3), point isoélectrique d'un acide aminé
(BCPST1, prolongement de l'acide-base).

Note : le mot « Python » n'apparaît dans aucun référentiel de BUT ou de BTS
consulté ; leurs étiquettes portent sur le traitement de données, pas sur le
langage.

---

## Sources

Les quatre rapports d’audit (17/10/2026) sont dans `audit/`, sur le PC du professeur seulement (non publiés : ils décrivent ses fichiers) : programmes
(citations et URL), sujets ECE (tableau des 90 sujets), technique (Pyodide,
mesures), existant (Atelier, TP, cours, moteur SNT, Résonance).
