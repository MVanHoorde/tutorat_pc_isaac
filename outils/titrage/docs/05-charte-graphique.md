# 05 — Charte graphique et conventions d'écriture

## 1. Identité

- Marque de Loïc : **« du cahier au laboratoire »** (bleu marine, orange, cyan ; raies de Balmer de l'hydrogène).
- Intention du labo : un manuel de TP clair et calme, une planche de manuel qu'on peut manipuler. Mur clair, paillasse ardoise, accent orange.
- Police : **Atkinson Hyperlegible** (400 et 700), conçue pour la lisibilité. Repli : `system-ui, sans-serif`. Chiffres tabulaires (`font-variant-numeric: tabular-nums`) pour les lectures.

## 2. Variables CSS de l'interface

| Variable | Clair | Sombre | Usage |
|---|---|---|---|
| `--bg` | `#F3F5F8` | `#11151B` | fond de page, fond des boutons |
| `--ink` | `#1B2430` | `#E5E9EF` | texte |
| `--muted` | `#5A6573` | `#9AA6B4` | texte secondaire |
| `--card` | `#FFFFFF` | `#1A2029` | cartes (scène, panneau, fenêtre) |
| `--line` | `#D5DBE3` | `#2C3440` | bordures |
| `--acc` | `#E08A2E` | `#E08A2E` | bouton principal, focus, accent |
| `--navy` | `#1F3A5F` | `#9DB8DD` | titres, boutons actifs, lectures |

La scène SVG garde ses couleurs claires en thème sombre : c'est un choix assumé (planche de manuel).

## 3. Couleurs du chapitre (identiques dans le cours, les figures et le labo)

| Rôle | Couleur | Teinte claire (domaines) |
|---|---|---|
| Espèce titrée, domaine avant l'équivalence | `#2F6FB5` | `#D6E6F5` |
| Espèce titrante, domaine après l'équivalence | `#D64545` | `#F6D2CE` |
| Point d'équivalence, produits | `#E08A2E` | `#FBE3C8` |
| Ions spectateurs | `#9AA3AD` (labo), `#555555` en tirets (figures) | — |
| Eau formée (vue microscopique) | `#F2B877` | — |
| Courbe | `#333333` (figures), `#2F6FB5` points + dernier point `#E08A2E` (labo) | — |

**Règle :** la couleur suit l'espèce chimique, jamais son rang ou l'ordre d'affichage.

## 4. Couleurs des indicateurs (`IND`)

| Indicateur | Zone de virage | Acide → intermédiaire → basique |
|---|---|---|
| Hélianthine | 3,1 – 4,4 | `#D2302A` → `#E8702A` → `#F2B51E` |
| Rouge de méthyle | 4,2 – 6,2 | `#D3263A` → `#EE7A24` → `#F2D31E` |
| Bleu de bromothymol | 6,0 – 7,6 | `#E9D21C` → `#3FA34D` → `#2457C8` |
| Phénolphtaléine | 8,2 – 10,0 | incolore → `#F4B7D6` → `#D6338A` |

Le cours contient aussi le **vert de bromocrésol** (3,8 – 5,4 ; jaune → bleu) et le **rouge de crésol** (7,2 – 8,8 ; jaune → rouge pourpre), absents du labo (P7). Les bornes peuvent varier d'un ou deux dixièmes selon les sources : Loïc souhaite les aligner sur la figure 20 de son chapitre 2 (décision en attente).

## 5. Écriture (texte élève)

- Français, **vouvoiement**, phrases courtes, ton de manuel.
- **Virgule décimale** partout : `7,00`, `0,5 mL`. Utiliser `fmt(x, d)`.
- Notation scientifique : `1,0×10⁻²` (exposants Unicode, `×`). Utiliser `sci(x)`.
- Unités : `mL`, `mol·L⁻¹`, `mS·m⁻¹`, `mS·m²·mol⁻¹` (point médian `·`), avec une espace entre la valeur et l'unité.
- Noms des espèces : acide chlorhydrique, acide éthanoïque, ammoniac, soude (solution d'hydroxyde de sodium), ions oxonium H₃O⁺, ions hydroxyde HO⁻.
- Vocabulaire du cours : espèce titrée, espèce titrante, solution titrante, réaction support, équivalence, volume équivalent `V_E`, réactif limitant, proportions stœchiométriques, saut de pH, zone de virage.
- Indice `E` pour l'équivalence (`V_E`, `pH_E`), distinct de l'indice `éq` (équilibre).
- Jamais « programme » ni « B.O. ». Citer les « sujets de baccalauréat » est permis.

## 6. Accessibilité

- Cibles tactiles ≥ 44 px (boutons, cases, robinet). Sur mobile, le robinet est actuellement trop petit (P4).
- Focus visible : contour orange de 3 px (`:focus-visible`). Sur le robinet, l'anneau s'épaissit.
- `aria-pressed` sur les boutons à bascule, `aria-live="polite"` sur la lecture et les messages, `role="dialog"` sur la fenêtre microscopique, `aria-expanded` sur son bouton.
- `prefers-reduced-motion` : barreau, anneau pulsant et gouttes désactivés.
- Contrastes WCAG AA pour tout texte, y compris dans le SVG.
- L'information ne passe jamais par la couleur seule : lectures chiffrées, textes de phase, légendes.

## 7. Figures du cours (Python)

Voir `figures-python/README.md`. En résumé : PNG 300 dpi, fond blanc, crédit `©2026 Loïc Van Hoorde – CC BY-NC 4.0` en bas à droite (`#AAAAAA`, corps 8), virgule décimale, pas de double axe des ordonnées, GIF à 80 dpi assemblés image par image.
