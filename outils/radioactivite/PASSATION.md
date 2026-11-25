# Animation « Radioactivité » dans Résonance

**Depuis le 24/11/2026**, l'animation vit dans Résonance : `outils/radioactivite/index.html`, carte dans la rubrique
Outils (espace de terminale). Page autonome, sans compte ni serveur : la progression des missions reste dans le
navigateur (`localStorage`, clé `radio-missions-v3`). Polices de Résonance (`../../polices/`), aucune requête externe.
Mode professeur : la case n'apparaît qu'avec l'adresse `…/outils/radioactivite/?prof` (ce n'est pas une protection).

## Règles (reprises du CLAUDE.md d'origine)

- Interface et textes en français.
- Toute donnée chiffrée ajoutée doit avoir une source vérifiable, numérotée comme dans la liste de `HANDOFF.md` (§9), et apparaître dans l'objet `SRC` de `index.html`. Ne jamais inventer une valeur : si aucune source n'est trouvée, le dire.
- Si deux sources divergent, afficher les deux et indiquer celle qui est utilisée.
- Écriture scientifique avec × (jamais de point médian), virgule décimale.
- Ne pas tout afficher d'emblée : réglages secondaires dans les menus « Options » repliés.
- Aucune étiquette de graphe ne doit en chevaucher une autre : utiliser `rowLabels`, `dodge`, `xLabels`, `fit`.
- Écran partagé sans défilement de la page sur PC et tablette en paysage (≥ 900 px) ; empilé sur téléphone.
- Garder la mention : © M. Van Hoorde ; code, recherche documentaire et mise en forme par Claude ; choix pédagogiques, vérification et validation par M. Van Hoorde.
- Sujets sensibles (bombes, accidents, cancer) : ton factuel et sobre, silhouette neutre, aucune image de victime ou de patient.

## v0.4 (24/11/2026, intégration dans Résonance)

- Équations de transformation de chaque nucléide et de chaque source, d'après les tables du LNHB [54] à [64] ;
  bilan de conservation de A et Z ; fluor 18 ajouté (seul émetteur β⁺ ; 1,8289 h, LNHB [54]).
- Les demi-vies du LNHB diffèrent un peu de celles de l'appli (I-131 8,0233 j / 8,04 ; Cs-137 30,018 ans / 30,1 ;
  C-14 5 700 / 5 730 ; Ir-192 73,827 j / 74,02 ; H-3 12,312 / 12,35 ; Pu-239 24 100 / 24 065 ; Tc-99m 6,0067 h / 6,02).
  Les valeurs de l'appli sont gardées (les corrigés des missions en dépendent) ; les deux sont affichées sous chaque
  équation. Point ouvert n° 7 : tout passer au LNHB demandera de recalculer les missions.
- Décroissance : bouton « Afficher t½ » sur le graphe (rien n'est affiché d'office) avec construction graphique
  depuis N₀/2 ; « Garder la courbe » (6 au plus) et courbe N/N₀ pour comparer des N₀ différents ; info-bulle au doigt.
- Demi-vie mesurée = médiane des durées de vie, interpolée dans le pas. L'ancienne mesure (milieu du palier) était
  trop longue d'un demi-pas : +1 % en Décroissance, +0,5 % dans l'Expérience (vérifié sur 10⁴ à 2 × 10⁵ essais).
- Expérience : u = s/√n et z-score de la moyenne par rapport à t½, sous chaque colonne et dans le tableau ; trait
  « moyenne ± 2u ». Limite connue : pour N₀ ≤ 10, la moyenne est biaisée (1,44 t½ à N₀ = 1, 1,08 t½ à N₀ = 10),
  z peut dépasser 2 avec beaucoup d'essais ; expliqué dans « Modèle et hypothèses ».
- Couleurs sans `light-dark()` (Safari < 17.5), en-tête et légende de grille qui ne débordent plus sur téléphone.

---

# Passation – Animation « Radioactivité » (terminale spécialité PC)

Ce fichier reprend une conversation menée avec Claude dans l'appli claude.ai, le 24 novembre 2026. Il permet à Claude Code de reprendre le travail sans relire tout l'échange. Il ne remplace pas une relecture humaine : les valeurs chiffrées sont à vérifier sur les sources citées avant tout usage en classe.

## 1. Le projet

- **Auteur** : M. Van Hoorde (Loïc), professeur de physique-chimie, établissement Isaac de l'Étoile. Marque : « du cahier au laboratoire » (bleu marine #1B2A4A, orange #E8772E, cyan #1FA3C4, raies de Balmer de l'hydrogène).
- **Objet** : une animation interactive globale pour le chapitre « Décroissance radioactive » de terminale spécialité : population de noyaux, activité, dose, radioprotection, cas historiques et médicaux.
- **Usages** : projection en cours en 2026-2027, puis usage autonome par les élèves, puis classe inversée envisagée dès 2027-2028.
- **Hébergement visé** : site GitHub Pages de l'auteur (mvanhoorde.github.io/Site-Web-Portfolio). Comptes élèves déjà gérés dans Supabase (suivi possible en V3).

## 2. Préférences de l'auteur à respecter

- Tout en français.
- **Chaque donnée chiffrée a une source vérifiable** (lien). Quand deux sources divergent, afficher les deux et dire laquelle est utilisée.
- Mention de transparence et copyright sur les productions : « © M. Van Hoorde ». Pour l'appli, la mention retenue dit que Claude (Claude Opus 5.5, Anthropic) a fait le code, la recherche documentaire et la mise en forme, et que les choix pédagogiques, la vérification et la validation sont de M. Van Hoorde.
- Documents à lire : format Word (.docx), pas de PDF. Équations Word éditables (OMML), écriture scientifique avec ×.
- Interface : ne pas tout afficher d'emblée (menus « Options » repliés), aucun chiffre qui en chevauche un autre, écran partagé sans défilement sur PC et tablette en paysage.

## 3. Historique des décisions

1. **Audit** de ce qui est imaginable : deux vues (Décroissance, Radioprotection) sur un même moteur de calcul ; les cas historiques deviennent des « scénarios » qui préréglent les vues, pas un module à part. La dose (Gy, Sv) est hors programme : badge « hors programme », ordres de grandeur.
2. **Cahier des charges v0.1** (fichier Word joint) : usages, divulgation progressive en 4 niveaux (Voir / Calculer / Modèle / Sources), catalogue de nucléides, écrans, zonage, coefficients de dose, réglette des doses, 9 scénarios avec priorités, phasage V1/V2/V3, 51 sources numérotées.
3. **Curiethérapie** ajoutée comme scénario phare (décroissance + dose + 1/d²).
4. **Prototype v0.1** : vues Décroissance, Expérience t½ et N₀, Radioprotection, Sources.
5. **v0.2** : onglet Missions (questions sur des données réelles à retrouver dans les menus), N₀ jusqu'à 100 000, dessin pixel par pixel quand un noyau fait moins de 3 px.
6. **v0.3** (version actuelle, `index.html`) :
   - écran partagé (scène à gauche, pupitre à droite) dès 900 px de large en paysage ; empilé sur téléphone ;
   - menus « Options » repliés ;
   - valeurs mesurées sur les graphes (point courant, t½ mesurée, τ, pente mesurée en ln N, médianes de l'expérience, graphes débit/distance, débit/écran, dose/durée avec décroissance de la source, échelle log des doses) ;
   - étiquettes placées sans chevauchement (lignes et écartement automatiques) ;
   - vitesse continue (0,05 à 5 demi-vies/s), pas de temps t½/2 à t½/200, probabilité exacte ou approchée (p = λΔt) ;
   - missions progressives : une question à la fois, paris résolus plus loin, bouton « Laisser en suspens », questions ouvertes à discuter en classe, mode professeur (corrigés et pistes).

## 4. Lisibilité de la grille (mesuré)

Taille d'un noyau à l'écran (px CSS) :

| N₀ | Portable 1280 px | Téléphone |
|---|---|---|
| 1 000 | 12 | 8,5 |
| 10 000 | 3,9 | 2,7 |
| 30 000 | 2,3 | 1,6 |
| 100 000 | 1,2 | 0,9 |

Au-delà d'environ 30 000 noyaux on ne voit plus chaque noyau, la grille se lit comme une teinte. En projection, viser environ 3 000 noyaux pour qu'ils restent distincts du fond de la salle (estimation, pas mesure). L'appli affiche « 1 noyau ≈ x px » sous la grille.

## 5. Architecture de `index.html` (un seul fichier, sans dépendance)

- **CSS** : variables de thème clair/sombre (`light-dark()`), `--fs` = taille du texte des graphes (16 px en projection). Mise en page empilée par défaut ; `@media (min-width:900px) and (orientation:landscape)` passe `main` en grille 2 colonnes, `.view.on{display:contents}` place `.scene` à gauche et `.pupitre` à droite, `#mdock` (mission) en bas à droite.
- **Données** (en tête du script) : `SRC` (sources numérotées comme dans le cahier des charges), `NUC` (nucléides et périodes), `RSRC` (sources de la vue Radioprotection : Γ, période, épaisseurs moitié CNRS/OSHA), `LADDER` (repères de dose).
- **Utilitaires** : `nf`, `sci` (écriture scientifique avec × et exposants Unicode), `unitFmt`, `tw` (mesure du texte sur canvas), `rowLabels` (étiquettes sur des lignes sans chevauchement), `dodge` (écartement vertical), `xLabels` (graduations espacées selon la largeur).
- **Décroissance** : `newSim`, `doStep` (tirage pas à pas, probabilité `sim.p`), `drawGrid` (canvas, ImageData sous 3 px par noyau), `drawChart` (SVG ; N, A ou ln N ; régression en ln N), `render1`, boucle `loop` (vitesse `st.hps` en demi-vies/s, plafond de calcul par image).
- **Expérience** : `trial(N0)` (Δt = t½/100, t½ mesurée = franchissement de N₀/2, milieu du palier si N₀ pair), `xEnqueue`/`xWork` (calcul par tranches), `drawX`.
- **Radioprotection** : `computeR` (débit Γ·A/d², transmission 2^(−x/CDA), dose avec décroissance D = Ḋ(1 − e^(−λΔt))/λ), `drawBench`, `drawRChart` (distance / écran / durée), `drawScale` (échelle log verticale), `drawR`.
- **Missions** : `MISSIONS` (7 missions, 49 étapes ; types `pari`, `num`, `choice`, `open` ; champ `pari:` = index du pari résolu), progression dans `localStorage` (clé `radio-missions-v3`), `renderMList`, `renderDock`, `checkNum`, `parseNum` (accepte 9,98e-7, 9,98 × 10^-7, exposants Unicode).

## 6. Données chiffrées utilisées et leurs sources

Numéros = liste du §9.

| Donnée | Valeur | Source |
|---|---|---|
| Tc-99m | 6,02 h | [6] |
| I-131 | 8,04 j | [5] |
| I-125 | 59,4 j (60 j selon l'ASN) | [6], [34] |
| Ir-192 | 74,02 j | [7] |
| Co-60 | 5,27 ans | [5] |
| Tritium | 12,35 ans | [5] |
| Cs-137 | 30,1 ans | [8] |
| C-14 | 5 730 ans | [5] |
| Pu-239 | 24 065 ans | [5] |
| Débit à 1 m pour 1 Bq, Cs-137 | 2,75 × 10⁻¹⁷ Sv/s | [52] |
| Débit à 1 m pour 1 Bq, Co-60 | 9,76 × 10⁻¹⁷ Sv/s | [53] |
| Débit à 1 m pour 1 Bq, Ir-192 | 3,75 × 10⁻¹⁷ Sv/s (CCSN : 0,16 mSv/h par GBq) | [13], [7] |
| Épaisseur moitié Cs-137 | plomb 6 mm, béton 66 mm (CNRS) ; plomb 7 mm, béton 48 mm (OSHA) | [11], [12] |
| Épaisseur moitié Co-60 | plomb 11,5 mm, béton 84 mm (CNRS) ; plomb 12 mm, béton 66 mm (OSHA) | [11], [12] |
| Épaisseur moitié Ir-192 | plomb 3,5 mm, béton 54 mm (CNRS) | [11] |
| Parcours alpha Po-210 dans l'air | 3,84 cm (5,3 MeV) | [9] |
| Bêta arrêté par l'aluminium | 4 mm (schéma CNRS) | [9], [10] |
| Zonage | bleue < 1,25 mSv/mois ; verte < 4 mSv/mois ; jaune < 2 mSv en 1 h ; orange < 100 mSv en 1 h ; rouge ≥ 100 mSv en 1 h | [14] |
| Coefficients ingestion (µSv/Bq, adulte / 3 mois) | Sr-90 0,028 / 0,23 ; I-131 0,022 / 0,18 ; Cs-137 0,013 / 0,021 ; Pu-239 0,25 / 4,2 ; eau tritiée 0,000018 / 0,000064 | [15] ; version réglementaire française : [16] |
| Repères de dose | installations nucléaires 0,001 mSv/an [18] ; vol Paris–New York 0,03 mSv [19] ou 0,08 mSv [20] ; radio thorax 0,1 mSv [19] (0,05 selon [21]) ; Tchernobyl en France 1986 ≈ 0,3 mSv [19] ; limite public 1 mSv/an et travailleurs 20 mSv/an [25] ; moyenne France 4,5 mSv/an, bilan 2014-2019 [22] ; scanner abdominal ≈ 12 mSv [19] (8 selon [21]) ; effets déterministes 0,15 Gy [26] ; DL50 4,5 Gy [27] | voir colonne |
| Curiethérapie | source HDR 370 GBq [38] ; implant I-125 : débit initial ≈ 0,1 Gy/h, dose prescrite 145 à 165 Gy [28] ; radioactivité des grains plus présente après un an [35] | voir colonne |
| Goiânia | 74 TBq en 1971 [43], soit ≈ 51 TBq en 1987 par le calcul ; 112 000 personnes contrôlées, 271 contaminées [42] | voir colonne |
| Tchernobyl | iode 131 disparu de la plupart des produits fin juillet 1986 [39] ; doses les plus élevées en France ≈ 7 mSv chez les 2-7 ans, presque toutes dues à l'iode 131 [40] | voir colonne |
| Fukushima, puissance résiduelle | 7 % à l'arrêt, 3 % à 3 h, 1 % à 1 jour | [41] |

Vigilance : un nouveau bilan d'exposition 2020-2024 est paru en septembre 2026 [23] ; l'IRSN indiquait qu'avec les nouveaux coefficients du radon la moyenne passerait de 4,5 à 6,5 mSv/an [24]. À mettre à jour.

## 7. Points ouverts

1. Épaisseurs moitié de référence : CNRS ou OSHA ? Constante de débit de l'Ir-192 : IRSN ou CCSN ?
2. Moyenne nationale : intégrer le bilan 2020-2024.
3. Liste et ordre définitifs des scénarios V2.
4. Hébergement : page publique du site ou accès réservé aux élèves.
5. Le mode professeur n'est qu'une case à cocher : il ne cache rien à un élève curieux. Une vraie protection passerait par Supabase.
6. Tablette tenue en hauteur : mise en page empilée (choix actuel).
7. Version finale : toutes les périodes depuis une seule référence, la table du LNHB [4], et données sorties dans un `data.json` avec une source par valeur.

## 8. Prochaines étapes prévues

- **V2** : scénarios dans cet ordre : curiethérapie, Tchernobyl (iode contre césium), Fukushima (puissance résiduelle), Goiânia, Marie Curie (carnets encore contaminés au Ra-226 [44, 45]), Radium Girls (ingestion, radium fixé dans les os [46, 47]), médecine nucléaire (TEP, déchets laissés 10 périodes [50, 51]), radiographie (piège : pas de λ), Hiroshima/Nagasaki (contre-exemple : un flash, pas une décroissance [48, 49] ; traitement sobre, aucune image de victimes).
- **V3** : contamination interne (E = A × coefficient de dose), mode Élève et classe inversée, suivi via Supabase.
- Vérifier chaque changement en ouvrant la page dans un navigateur à 1280 × 800, 1180 × 820 et 390 × 844 (script `tests/captures.py`).

## 9. Sources

1. Fiche CCM « Décroissance radioactive », Pégase – ENS de Lyon : https://pegase.ens-lyon.fr/sites/default/files/2025-07/Terminale_RADIOACTIVITE_CCM.pdf
2. Cours « La radioactivité », académie de Bordeaux : https://ent2d.ac-bordeaux.fr/disciplines/physique-chimie/wp-content/uploads/sites/82/2026/04/Chapitre-15-cours-La-radioactivite-finale.pdf
3. Éduscol, simulation d'une décroissance radioactive en Python : https://eduscol.education.fr/document/22822/download
4. LNHB, table de radionucléides : http://www.nucleide.org
5. ANCCLI, fiche 02 « Radioactivité » : https://www.anccli.org/wp-content/uploads/2023/01/FT_02_Radioactivite.pdf
6. CNRS, guide radioprotection, chapitre 2 : https://www.dgdr.cnrs.fr/sst/CNPS/guides/doc/radioprotection/Chapitre2_RI_Notions_fondamentales.pdf
7. CCSN, fiche Iridium-192 : https://bac-lac.wayback.archive-it.org/web/20061029062647/https://www.nuclearsafety.gc.ca/fr/safety/pdf/Ir-192.pdf
8. INRS, fiche ED 4319 « Césium-137 » : https://inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-4319.pdf
9. CNRS, fiche 1 « Pénétration dans la matière » : https://www.dgdr.cnrs.fr/sst/CNPS/guides/doc/radioprotection/Fiche1_Penetration_dans_la_matiere.pdf
10. ASNR, exposition « Radioactivité » : https://expo-radioactivite.asnr.fr/app/uploads/2026/02/expo-v2025-1-3.pdf
11. CNRS, fiche 2 « Écrans de protection » : https://www.dgdr.cnrs.fr/sst/CNPS/guides/doc/radioprotection/Fiche2_Ecrans_de_protection.pdf
12. OSHA, Shielding Layer Examples : https://www.osha.gov/ionizing-radiation/introduction/shielding-layer-examples
13. IRSN, fiche Iridium 192 : https://www.irsn.fr/FR/Larecherche/publications-documentation/fiches-radionucleides/Documents/sante/Ir192SAN.pdf
14. Code du travail, article R4451-23 : https://code.travail.gouv.fr/code-du-travail/r4451-23
15. CIPR 119, coefficients de dose (tableau du ministère japonais de l'Environnement) : https://www.env.go.jp/en/chemi/rhm/basic-info/2018/pdf/basic-1st-02-04-12.pdf
16. ASNR, références dosimétriques (arrêté du 16 novembre 2023) : https://regulation-oversight.asnr.fr/regulation/asnr-guides/dosimetric-references-of-the-radionuclide-handbook
17. IRSN, Tchernobyl, fiche 7 : https://recherche-expertise.asnr.fr/FR/connaissances/Installations_nucleaires/Les-accidents-nucleaires/accident-tchernobyl-1986/librairie-Tchernobyl/Documents/irsn_tchernobyl_fiche7.pdf
18. IRSN, infographie exposition de la population (2021) : https://www.irsn.fr/FR/Actualites_presse/Communiques_et_dossiers_de_presse/Documents/info_exposition_population-V2021.pdf
19. Connaissance des énergies, dose annuelle : https://www.connaissancedesenergies.org/questions-et-reponses-energies/quelle-dose-annuelle-de-radioactivite-un-francais-recoit-il
20. EDF, protection des travailleurs : https://www.edf.fr/groupe-edf/comprendre/production/nucleaire/radioprotection
21. HUG, imagerie par rayons X : https://www.hug.ch/atlas-sante/examen/imagerie-medicale-par-rayons-x
22. SFRP / IRSN, « Tous exposés, mais tous différemment » : https://sfrp.asso.fr/wp-content/uploads/2021/11/S13-a-VIAL-E-IELSCH-G-1.pdf
23. ASNR, bilan 2020-2024 : https://www.vie-publique.fr/files/rapport/pdf/304796.pdf
24. IRSN, rapport EXPOP 2014-2019 : https://www.irsn.fr/FR/Actualites_presse/Communiques_et_dossiers_de_presse/Documents/IRSN_Rapport%20EXPOP_def.pdf
25. INRS, DMT AC 161 (valeurs limites) : https://www.inrs.fr/dms/inrs/CataloguePapier/DMT/TI-AC-161/ac161.pdf
26. INRS, effets sur la santé : https://www.inrs.fr/risques/rayonnements-ionisants/effets-sur-la-sante.html
27. CNRS, fiche 4 (DL50) : https://www.dgdr.cnrs.fr/sst/CNPS/guides/doc/radioprotection/Fiche4_Effets_non_aleatoires_ou_deterministe.pdf
28. CSPO, brachythérapie de la prostate : https://www.cspo.be/uploads/brochures/Brachyth%C3%A9rapie-de-la-prostate-urologie.pdf
29. Futura Santé, curiethérapie : https://www.futura-sciences.com/sante/definitions/medecine-curietherapie-2654/
30. Futura Santé, brachythérapie : https://www.futura-sciences.com/sante/definitions/medecine-brachytherapie-2634/
31. La Revue du praticien, histoire du radium : https://www.larevuedupraticien.fr/article/grandeur-delires-et-polemiques-histoire-du-radium
32. AIP, Marie Curie et la radiologie de guerre : https://history.aip.org/exhibits/curie/war2.htm
33. ARCAGY, radioéléments de curiethérapie : https://www.arcagy.org/infocancer/uploads/pdf/la-brachytherapie-ou-curietherapie-les-radio%C3%A9l%C3%A9ments-utilis%C3%A9s-en-curieth%C3%A9rapie-2835.pdf
34. ASN, rapport annuel 2005, brachythérapie : https://www.asn.fr/annual_report/2005/chap9/chap9-4.html
35. CHU de Québec, implants permanents : https://chudequebec.ca/getattachment/19ed10dc-eb67-4c9f-973d-9c5a3c489e55/Curietherapie-avec-implants-permanents-pour-le-cancer-de-la-prostate.aspx
36. IUCT-Oncopole, grains d'iode 125 : https://www.iuct-oncopole.fr/documents/20049/1675456/Curieth%C3%A9rapie+de+prostate+par+implantation+de+grains+d'iode+125.pdf/1b711098-8b2f-4a54-8ccb-ea7838593a28
37. INRS, fiche ED 4287 « Curiethérapie à haut débit » : https://inrs.fr/dam/jcr:7f7490b8-5e13-4c6b-8f90-3c90276e0081/ed4287.pdf
38. SFRP, retour d'expérience HDR (370 GBq) : https://sfrp.asso.fr/wp-content/uploads/2021/11/2016_11_09_HAJJI_B.pdf
39. IRSN, Tchernobyl, fiche 6 : https://recherche-expertise.asnr.fr/FR/connaissances/Installations_nucleaires/Les-accidents-nucleaires/accident-tchernobyl-1986/librairie-Tchernobyl/Documents/irsn_tchernobyl_fiche6.pdf
40. ASNR, doses dues à Tchernobyl en France (2025) : https://recherche-expertise.asnr.fr/sites/default/files/2025-07/ASNR_Rapport-2025-00253_Actualisation-doses-Tchernobyl-en-France.pdf
41. H. Safa (CEA), l'accident de Fukushima : https://indico.in2p3.fr/event/4988/attachments/26011/32076/Henri_Safa_accident_Fukushima.pdf
42. AIEA, accident de Goiânia : https://iaea.org/sites/default/files/21/12/9-d_radiological_accidents_goiania_accident.pdf
43. Wikipédia (Wikiwand), Goiânia accident, à recouper avec l'AIEA : https://www.wikiwand.com/en/articles/Goiania_accident
44. Slate, carnets de Marie Curie : https://www.slate.fr/sciences/marie-curie-bibliotheque-nationale-france-carnets-radioactivite-physique-uranium-radiations
45. BnF, cahiers de Marie Curie : https://www.bnf.fr/fr/les-cahiers-de-marie-curie-conserves-la-bnf-sont-ils-radioactifs
46. AFACWA, Radium Girls : https://www.afacwa.org/the_forgotten_story_of_the_radium_girls_whose_deaths_saved_thousands_of_workers_lives
47. ORAU, Radium Girls : https://orau.org/blog/history/radium-girls-the-health-scandal-of-radium-dial-painters-in-the-1920s-and-1930s.html
48. Cullings et al., dosimétrie des survivants, PubMed 16808610 : https://pubmed.ncbi.nlm.nih.gov/16808610/
49. CEA, Prosinfo n° 20 : https://fontenay-aux-roses.cea.fr/drf/prositon/Documents/Prosinfo20.pdf
50. OFSP, radiodiagnostic TEP : https://www.bag.admin.ch/fr/produits-radiodiagnostiques-en-medecine-nucleaire
51. ASN, plan de gestion des déchets (10 périodes) : https://www.asn.fr/Media/Files/Plan-de-gestion-des-dechets-et-effluents31
52. IRSN, fiche Césium 137 : https://recherche-expertise.asnr.fr/sites/default/files/documents/larecherche/publications-documentation/fiches-radionucleides/CS137SAN.pdf
53. IRSN, fiche Cobalt 60 : https://www.irsn.fr/FR/Larecherche/publications-documentation/fiches-radionucleides/Documents/sante/Co60SAN.pdf
