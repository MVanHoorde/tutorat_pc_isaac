# 06 — Feuille de route

Statuts : ⬜ à faire · 🟨 en cours · ✅ fait · ⏸️ en attente d'une décision de Loïc.
Règle : les points marqués **« À arbitrer »** se présentent à Loïc sous forme d'options, avec une recommandation, **avant** d'écrire du code.

Demande d'origine de Loïc (22 novembre 2026) : « il y a plein de choses à auditer », notamment :
- les phases de préparation : rinçage, remplissage et réglage du zéro de la burette ;
- le choix de la solution titrante ;
- les différentes concentrations ;
- la vue microscopique (faite).

« Pour le reste, on verra plus tard. »

## Ordre conseillé

P0 → P5 + P3 (pour intégrer le labo au cours rapidement) → P4 → P1 → P2 → P7 → P6 → le reste.

---

### P0 — Mention de transparence au pied de page ⏸️
- **Quoi :** Loïc ajoute sur ses productions une mention de transparence sur l'usage de Claude.
- **Proposition :** `©2026 Loïc Van Hoorde – CC BY-NC 4.0 — Choix pédagogiques, conception, relecture et correction : Loïc Van Hoorde. Développement assisté par Claude (Claude Opus 5.5, Anthropic).`
- **À arbitrer :** la formulation exacte.
- **Acceptation :** la mention figure dans le pied de page et reste lisible sur mobile.

### P1 — Phases de préparation du titrage ⬜
- **Quoi :** un mode « préparation », facultatif, avant le titrage. Il reprend les gestes réels :
  1. rincer la burette à l'eau distillée, puis avec la solution titrante ;
  2. remplir la burette au-dessus du zéro ;
  3. chasser la bulle d'air sous le robinet ;
  4. régler le zéro (lecture au bas du ménisque, œil à hauteur du trait) ;
  5. prélever la solution titrée à la pipette jaugée (rincée avec cette solution) et la verser dans le bécher ;
  6. placer le barreau aimanté et lancer l'agitation ;
  7. étalonner le pH-mètre (solutions tampons de pH 4,0 et 7,0) ou le conductimètre ;
  8. plonger la sonde sans qu'elle touche le barreau.
- **À arbitrer :**
  - l'ordre et la liste exacte des étapes ;
  - étapes guidées (checklist) ou libres avec vérification ;
  - faut-il **simuler les erreurs** et leurs conséquences ? Par exemple :
    - burette rincée à l'eau seulement : titrant dilué, donc `V_E` surestimé ;
    - zéro mal réglé : décalage de tous les volumes ;
    - bulle non chassée : volume lu supérieur au volume versé ;
    - pas d'étalonnage : pH décalé.

    Les effets doivent être **calculés**, pas inventés, et annoncés comme simulés.
  - Peut-on sauter la préparation (bouton « Passer ») ?
- **Technique :** machine à états `S.phase` (`"preparation"` puis `"titrage"`). Nouveaux éléments SVG : pissette, pipette, poire, flacons tampons, ménisque agrandi (loupe). Les erreurs doivent passer par des paramètres du moteur (par exemple un `c_B` effectif), pas par des retouches de l'affichage.
- **Acceptation :**
  - chaque étape est réalisable à la souris, au doigt et au clavier ;
  - le titrage reste accessible directement ;
  - les tests existants passent ;
  - un nouveau test couvre la préparation complète.

### P2 — Choix de la solution titrante et des concentrations ⬜
- **Quoi :** l'élève (ou l'enseignant) choisit :
  - la solution titrante : soude ou acide chlorhydrique, selon la nature de l'espèce titrée ;
  - les concentrations `c_A` et `c_B`, et le volume `V_A`.
- **À arbitrer :**
  - valeurs libres ou **listes de valeurs** (recommandé : 10⁻³, 5×10⁻³, 10⁻², 5×10⁻², 10⁻¹ mol·L⁻¹ ; `V_A` de 10,0, 20,0 ou 25,0 mL à la pipette jaugée) ;
  - que faire si `V_E` dépasse 25 mL : message de conseil, ou remplissage de la burette ?
- **Technique :**
  - calculer `V_E = c_A·V_A / c_B`, puis :
    - adapter la capacité du bécher et l'échelle ;
    - faire varier la couleur de la burette selon le titrant ;
    - remplacer le rapport de la vue microscopique par `⌊N0·V/V_E⌋` ;
  - garder `MODES` comme valeurs par défaut ;
  - ajouter des cas de test (au moins un `V_E` différent de 10 mL).
- **Acceptation :** avec les valeurs par défaut, les résultats restent ceux d'aujourd'hui (références inchangées), et les nouveaux cas sont testés.

### P3 — Paramètres d'URL et mode intégré (iframe) ⬜
- **Quoi :** deux granules *Iframe* du cours doivent ouvrir le labo directement dans le bon mode : `index.html?mode=ph` (fin de la partie III) et `index.html?mode=cond` (fin de la partie IV). Ajouter aussi `&sys=acoh`, `&ind=phph` et `&embed=1`.
- **Mode `embed=1` :** sans titre ni pied de page longs, mise en page compacte, hauteur fixe raisonnable (QuizEO impose une hauteur d'iframe fixe).
- **Acceptation :** paramètres validés (une valeur inconnue est ignorée) ; testé dans une page HTML de test qui contient les deux iframes à 800 px de large.

### P4 — Confort sur mobile et tablette ⬜
- **Constat :** en 390 px de large, les étiquettes de la scène font environ 5 px et le robinet mesure environ 30 px, sous les 44 px recommandés (voir `reference/captures-v2/05-mobile.png`).
- **Pistes :**
  - vue recadrée sur la burette et le bécher, avec l'écran du PC sous la scène, en portrait ;
  - zone de clic du robinet agrandie ;
  - bouton « Verser » collant (sticky) sous la scène.
- **Acceptation :** aucun débordement horizontal ; textes ≥ 12 px effectifs ; robinet ≥ 44 px effectifs en 390 px.

### P5 — Hébergement HTTPS et intégration QuizEO ⬜
Voir `07-integration-et-hebergement.md` et le skill `/publier`.
- **Acceptation :** URL HTTPS publique ; aucun en-tête `X-Frame-Options` bloquant ; affichage vérifié dans une iframe.

### P6 — Outils d'exploitation sur l'écran du PC ⬜
- **Quoi :** reprendre les méthodes du cours dans le logiciel d'acquisition simulé :
  - afficher la courbe dérivée `dpH/dV` (méthode de la dérivée) ;
  - tracer guidé des tangentes parallèles ;
  - en conductimétrie, droites de régression et lecture de l'intersection.
- **À arbitrer :** outils accessibles tout de suite, ou seulement après le titrage (pour que l'élève cherche d'abord seul) ?
- **Rappel :** pas de demi-équivalence (hors programme).

### P7 — Indicateurs colorés : compléter et aligner ⏸️
- Ajouter le vert de bromocrésol (3,8 – 5,4) et le rouge de crésol (7,2 – 8,8), présents dans le tableau du cours.
- Aligner les bornes sur la figure 20 du chapitre 2 de Loïc : valeurs à obtenir auprès de lui.

### P8 — Vue microscopique en conductimétrie ⬜
- Ajouter, dans la fenêtre, des barres de contribution de chaque ion à σ (comme la figure 17 du cours), pour justifier les pentes « ion par ion ».

### P9 — Écart cours / labo en conductimétrie ⏸️
- **À arbitrer :**
  - garder la dilution réelle (σ_E = 60,2) en ajoutant une remarque dans le labo ;
  - ajouter une option « volume total supposé constant », qui redonne les valeurs du cours (σ_E = 63,2) ;
  - ou modifier les figures du cours.

  Voir `03-modele-chimique.md`, § 6.

### P10 — Mode exercice ⬜
- Concentration inconnue tirée au hasard dans une plage réaliste. L'élève relève `V_E`, calcule `c_A` et saisit sa réponse. Il reçoit une rétroaction graduée : correct à 2 % près, erreur de facteur 10 (unités), erreur de rapport stœchiométrique…
- Aucune donnée personnelle n'est stockée ni envoyée.

### P11 — Export du schéma de montage pour le cours ⬜
- **Quoi :** la figure 15 du cours (montage conductimétrique) doit être dessinée avec les éléments graphiques du labo, à la demande de Loïc.
- **Méthode :** une page ou un script `outils/export-schema.html` affiche la scène sans écran de PC ni interface, avec des étiquettes au format du cours (« bécher de 250 mL », « 190 mL d'eau distillée ajoutés », « cellule conductimétrique »). On exporte ensuite en PNG 300 dpi par une capture Playwright avec `deviceScaleFactor: 3`, car QuizEO n'affiche pas le SVG.
- **Acceptation :** PNG d'au moins 2400 px de large, fond blanc, crédit en bas à droite, aucun texte sous 8 pt équivalent.

### P12 — Export des mesures en fichier ⬜
- Bouton « Télécharger (.csv) », en plus du presse-papiers. Séparateur `;` et virgule décimale, pour Excel et LibreOffice en français.

### P13 — Petites améliorations (à prendre au fil de l'eau) ⬜
- Vue microscopique : jauge « prochaine entité dans … mL » quand on verse goutte à goutte.
- La fenêtre microscopique s'ouvre en bas à gauche, par-dessus la paillasse : la placer plutôt à droite sur grand écran ?
- Son facultatif de goutte (désactivé par défaut).
- Scène SVG en thème sombre (faible priorité : la planche claire est un choix assumé).
