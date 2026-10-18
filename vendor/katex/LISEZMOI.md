# KaTeX — formules mathématiques (auto-hébergé)

- **Version** : KaTeX **0.18.9**, copie à l'identique de `vendor/katex/` de Leitner (`katex.min.js`, `katex.min.css`, `fonts/` en woff2).
- **Licence** : MIT (`LICENSE`).
- **Utilisé par** : `outils/python/parcours.js`, qui ne charge ces fichiers que si la page porte une formule (`.tex`).
  Les formules s'écrivent en LaTeX dans le HTML : `<p class="formule tex">…</p>` (centrée), `<span class="tex">…</span>` (dans le texte).
- Aucun CDN : rien ne part ailleurs que sur l'adresse de Résonance.
- Les fichiers `.woff` et `.ttf` cités par `katex.min.css` sont absents exprès : tous les navigateurs visés lisent le woff2, déclaré en premier.
