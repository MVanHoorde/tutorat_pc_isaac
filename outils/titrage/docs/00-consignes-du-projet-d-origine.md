# Labo numérique : titrage — instructions pour Claude Code

## Le projet

Simulation interactive d'un **titrage acide-base** pour des élèves de **Terminale spécialité physique-chimie** (France), conçue par **Loïc Van Hoorde**, enseignant, pour ses cours en ligne QuizEO et son site « du cahier au laboratoire ».
L'élève verse la solution titrante en cliquant sur le robinet d'une burette ; la courbe `pH = f(V)` ou `σ = f(V)` se trace en direct sur l'écran d'un ordinateur dessiné sur la paillasse. Une fenêtre optionnelle montre l'équivalence **à l'échelle microscopique**.

Le labo illustre le cours `reference/cours-th1-ch4-v2.md` (Thème 1 - Chapitre 4, « Analyser un système chimique par des méthodes chimiques »). Il s'insère dans ce cours par deux granules *Iframe* (fin de la partie III : suivi pH-métrique ; fin de la partie IV : suivi conductimétrique).

## Fichiers

| Chemin | Rôle |
|---|---|
| `labo/index.html` | **Le labo** : un seul fichier HTML autonome (CSS + SVG + JS), aucune dépendance |
| `docs/01-cahier-des-charges.md` | Objectifs pédagogiques, fonctions, contraintes, ce qui est interdit |
| `docs/02-architecture.md` | Carte du code : état, fonctions, coordonnées SVG, flux d'événements |
| `docs/03-modele-chimique.md` | Équations, paramètres, valeurs de référence, hypothèses et limites |
| `docs/04-vue-microscopique.md` | Modèle et animation de la fenêtre microscopique |
| `docs/05-charte-graphique.md` | Palette, typographie, accessibilité, conventions d'écriture |
| `docs/06-feuille-de-route.md` | Évolutions demandées par Loïc, priorités, critères d'acceptation |
| `docs/07-integration-et-hebergement.md` | Hébergement HTTPS, iframe QuizEO, GitHub Pages |
| `docs/08-journal-des-decisions.md` | Historique, choix tranchés, bugs déjà corrigés — **à tenir à jour** |
| `figures-python/` | Moteur chimique de référence (`titrage.py`) et figures du cours (PNG 300 dpi + GIF animés) |
| `tests/` | Tests du moteur JS, du moteur Python et de l'interface (Playwright) |
| `reference/` | Cours complet et captures d'écran de la version actuelle |

Lisez le document de `docs/` concerné **avant** de modifier une partie du labo.

## Commandes

```
npm test                       # moteur chimique du labo comparé au moteur Python (Node ≥ 18, sans dépendance)
npm run test:python            # moteur Python comparé aux valeurs citées dans le cours (numpy)
npm run test:ui                # scénario élève complet dans Chromium + captures dans tests/captures/
npm run test:tout              # les trois
npm run serveur                # http://localhost:8080 (sinon : ouvrir labo/index.html dans le navigateur)
cd figures-python && python figures_ch4.py        # régénère toutes les figures du cours dans figures-python/out/
```

Sous Windows, si `python` n'est pas reconnu, utilisez `py`. Le test d'interface demande une fois : `npm install` puis `npx playwright install chromium`.
Skills du projet : `/verifier`, `/evolution <demande>`, `/audit-labo`, `/figures`, `/publier`.

## Règles non négociables

1. **Un seul fichier HTML autonome.** Pas de framework, pas de bundler, pas de bibliothèque externe, pas d'image externe. Seule exception tolérée : la police Google *Atkinson Hyperlegible* (le labo doit rester lisible si elle ne charge pas). Le fichier doit fonctionner ouvert en local (`file://`) et dans une iframe.
2. **Aucune donnée expérimentale inventée.** Toutes les valeurs sont **calculées** par le moteur chimique et présentées comme **simulées**. Pas de bruit aléatoire présenté comme une vraie mesure. Si du « bruit de mesure » est ajouté un jour, il doit être annoncé à l'écran.
3. **Le moteur chimique est la source de vérité.** Le bloc compris entre les repères `// ===== MOTEUR CHIMIQUE : début` et `// ===== MOTEUR CHIMIQUE : fin =====` ne dépend ni du DOM ni de variables extérieures. Ne déplacez pas ces repères : `tests/test_moteur.mjs` les utilise. Le moteur JS et `figures-python/titrage.py` doivent rester équivalents.
4. **Ne modifiez jamais `tests/valeurs_reference.json` pour faire passer un test.** On ne le régénère (`npm run references`) qu'après un changement de modèle **voulu par Loïc**, consigné dans `docs/08-journal-des-decisions.md`.
5. **Contenu scientifique conforme au cours de Terminale.** Pas de demi-équivalence ni de lecture du `pK_A` sur la courbe : c'est hors programme et retiré du cours. Pas de titrage par précipitation. Le critère de transformation totale est `K > 10⁴`.
6. **Texte destiné aux élèves :** français, **vouvoiement**, phrases courtes, **virgule décimale** (`7,00`), unités `mol·L⁻¹`, `mS·m⁻¹`, `mL`, exposants Unicode (`10⁻²`). Ne jamais mentionner « le programme » ni « le B.O. ». Citer les sujets de baccalauréat est permis.
7. **Accessibilité :** cibles tactiles ≥ 44 px, focus visible, robinet utilisable au clavier (Entrée, Espace), `aria-live` sur les lectures, respect de `prefers-reduced-motion`, contrastes WCAG AA. Ne régressez jamais sur ces points.
8. **Licence et crédits :** `©2026 Loïc Van Hoorde – CC BY-NC 4.0` dans le pied de page. Toute ressource tierce doit avoir une licence compatible, vérifiée et notée dans le journal.
9. **Palette du chapitre :** espèce titrée `#2F6FB5`, espèce titrante `#D64545`, équivalence et produits `#E08A2E`, ions spectateurs en gris. La couleur suit l'espèce, jamais l'ordre d'affichage. Détails dans `docs/05-charte-graphique.md`.
10. **Pas d'élève identifiable, pas de collecte de données.** Le labo ne stocke rien et n'envoie rien. Un éventuel `localStorage` se limite aux préférences d'affichage, encadré par `try/catch`.

## Façon de travailler avec Loïc

- Loïc est enseignant de physique-chimie, pas développeur professionnel. Expliquez vos choix simplement, en français, sans jargon inutile.
- Ses messages peuvent contenir des **erreurs de dictée vocale** : interprétez-les avec bon sens et reformulez la demande en cas de doute.
- **Les choix pédagogiques ou scientifiques sont les siens.** Avant de coder une évolution qui en implique (ordre des étapes de préparation, erreurs simulées, valeurs proposées, vocabulaire), présentez-lui les options avec une recommandation et attendez sa décision. Il tranche vite quand les options sont claires.
- Pour toute évolution qui touche plusieurs parties du fichier, commencez en **mode plan**. Une évolution à la fois.
- Après chaque modification : `/verifier`, puis regardez les captures de `tests/captures/`. Mettez à jour `docs/06-feuille-de-route.md` (statut) et `docs/08-journal-des-decisions.md` (ce qui a changé et pourquoi).
- Ne poussez jamais sur GitHub (`git push`) sans son accord explicite.

## Pièges connus (déjà rencontrés)

- Les CSS `display:flex` ou `grid` écrasent l'attribut `hidden` : la règle `[hidden]{display:none!important}` doit rester.
- La fenêtre microscopique est en `position:fixed`. Ancrée en bas à gauche, elle peut masquer la paillasse ; elle est déplaçable et a son propre bouton « Verser ». Vérifiez qu'elle n'intercepte jamais les clics des boutons du panneau.
- L'échelle verticale de la conductimétrie est automatique (`echelle()`) et calculée sur 0 à 25 mL : changer `VMAX` ou les concentrations la modifie.
- La vue microscopique suppose `V_E = 10,0 mL` (20 entités, 1 entité titrante pour 0,5 mL). Si les concentrations deviennent réglables, il faut recalculer ce rapport (voir `docs/04-vue-microscopique.md`).
- En conductimétrie, le labo tient compte de la **dilution réelle** (`V_tot = 200 + V` mL, d'où `σ_E = 60,2 mS·m⁻¹`). Les figures du cours supposent `V_tot = 200 mL` constant (`σ_E = 63,2 mS·m⁻¹`). Cet écart est connu et volontaire (voir journal).
- Sur mobile, la scène SVG est réduite : les étiquettes deviennent très petites et le robinet est sous la taille tactile recommandée (feuille de route, P4).
