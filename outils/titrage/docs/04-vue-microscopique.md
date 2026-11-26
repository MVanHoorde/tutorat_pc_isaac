# 04 — Vue microscopique

Fenêtre flottante optionnelle (`#micro`), ouverte par « Ouvrir la vue microscopique ». Demande de Loïc : « une animation de ce qui se passe à l'échelle microscopique […] sur une autre fenêtre qu'on peut choisir d'ouvrir ou pas, histoire qu'ils comprennent bien l'équivalence ».

## 1. Modèle

- **`N0 = 20` entités d'espèce titrée** au départ, dans un canvas de 440 × 280 px.
- **Une entité titrante pour 0,5 mL versé** : `ajoutes(V) = ⌊2V⌋`. À `V_E = 10,0 mL`, on a donc versé 20 entités : c'est l'équivalence.
- Réaction **totale et instantanée** au contact : chaque entité titrante qui arrive vise l'entité titrée libre la plus proche (marquée `claimed`) et réagit en la touchant.
- **Ions spectateurs** dessinés comme des cercles blancs en pointillés, avec leur charge : Cl⁻ présents dès le départ pour HCl ; Na⁺ (ou Cl⁻ pour l'ammoniac) ajoutés avec chaque entité titrante.
- **Eau formée** : une bulle orange pâle qui s'estompe (alpha diminué de 0,009 par image), car elle « rejoint le solvant ». Les molécules d'eau du solvant ne sont pas dessinées.
- **Ion H⁺ échangé** : point blanc cerclé, porté par le donneur, qui glisse en 280 ms vers l'accepteur. Un anneau orange de 500 ms marque chaque réaction.

| Système | Équation affichée | Donneur de H⁺ | Produit dessiné |
|---|---|---|---|
| `hcl` | H₃O⁺ + HO⁻ → 2 H₂O | espèce titrée (H₃O⁺) | aucun (2 H₂O) |
| `acoh` | CH₃COOH + HO⁻ → CH₃COO⁻ + H₂O | espèce titrée | CH₃COO⁻ (orange) |
| `nh3` | NH₃ + H₃O⁺ → NH₄⁺ + H₂O | espèce titrante (H₃O⁺) | NH₄⁺ (orange) |

Couleurs (`COL`) : espèce titrée `#2F6FB5`, titrante `#D64545`, produit `#E08A2E`, spectateurs `#9AA3AD`, eau `#F2B877`.

## 2. Synchronisation avec le titrage

- `sync()` est appelée par `verser()`. Elle met en file d'attente les nouvelles entités titrantes, espacées de 160 ms, pour qu'un ajout de 1 mL montre deux arrivées successives.
- Si `V` diminue (après « Recommencer »), ou si la solution change, `reconstruire()` recrée l'état d'équilibre correspondant à `V` sans animation.
- Ouvrir la fenêtre en cours de titrage reconstruit l'état courant.
- La boucle `requestAnimationFrame` (`boucle`) ne tourne **que si la fenêtre est ouverte**.

## 3. Textes pédagogiques (`compteurs()`)

Compteurs : espèce titrée restante, espèce titrante libre, produit formé (s'il existe), ions spectateurs.

Texte de phase, avec un fond de couleur :
- **avant** (`n < 20`, fond bleu clair) : le titrant est le réactif limitant, il n'en reste aucun ; l'espèce titrée est encore présente ;
- **équivalence** (`n = 20`, fond orange clair) : les réactifs ont été introduits dans les proportions stœchiométriques ; il ne reste ni l'un ni l'autre ;
- **après** (`n > 20`, fond rose) : l'espèce titrée est épuisée et devient le réactif limitant ; le titrant s'accumule.

Ces textes reprennent le vocabulaire du cours (II - C, « L'équivalence »). Toute modification doit rester cohérente avec lui.

## 4. Ergonomie

- Fenêtre déplaçable par son bandeau (`pointerdown`, `pointermove`, `pointerup`), bornée à l'écran.
- Fermeture par la croix, par Échap ou par le bouton du panneau.
- Bouton « Verser » intégré, pour ne pas avoir à déplacer la fenêtre.
- Encadré « Comment lire cette animation ? » qui annonce le modèle (20 entités, 1 entité pour 0,5 mL, eau du solvant non représentée).

## 5. Limites et pistes

- Le rapport « 1 entité pour 0,5 mL » est **codé en dur** et suppose `V_E = 10 mL`. Si les concentrations deviennent réglables (P2), il faut le remplacer par `entités = ⌊N0 · V / V_E⌋` et réécrire le texte de l'encadré.
- À 1 goutte (0,05 mL) par clic, il faut 10 clics pour faire apparaître une entité. C'est cohérent avec le modèle, mais l'élève peut croire que rien ne se passe. Une piste serait d'afficher une jauge « prochaine entité ».
- La vue fonctionne aussi en conductimétrie (même `V_E`). Une piste serait d'afficher la contribution de chaque ion à la conductivité (P8).
