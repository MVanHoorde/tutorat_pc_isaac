# Résonance — état du projet

Tutorat entre pairs en physique-chimie (première et terminale spécialité), lycée Isaac de l'Étoile, Poitiers.

*Dernière mise à jour : 19 septembre 2026*

## En ligne

- Dépôt : https://github.com/MVanHoorde/tutorat_pc_isaac (public)
- Maquette : https://mvanhoorde.github.io/tutorat_pc_isaac/ (GitHub Pages, branche `main`)

## Fichiers du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | Maquette v3 du site : page unique, données fictives, rien n'est enregistré |
| `analyser_trombi.py` | Relève la mise en page d'un trombinoscope PDF, avec le texte masqué par défaut |
| `generer_identifiants.py` | Trombinoscopes PDF → identifiants, coupons, registre de correspondance et fichier serveur |
| `.gitignore` | Bloque PDF, Excel, CSV et JSON : aucune donnée d'élève ne doit arriver sur le dépôt public |
| `ETAT_DU_PROJET.md` | Ce fichier |

## Fait

- **Maquette v1 et v2** : connexion, demande d'aide, offre d'aide, tableau de bord du professeur, bilan de séance, attestation de fin de période.
- **Maquette v3** (19/09/2026) :
  - connexion en pop-up, avec « Parcourir sans se connecter » (option temporaire) ;
  - pop-up de retour pour l'élève aidé, et synthèse des retours dans le tableau de bord ;
  - demande d'aide : classe, chapitres des programmes officiels (BO 2019), besoin ponctuel ou sur la durée, urgence, 400 caractères, grille de disponibilités ;
  - offre d'aide : cartes filtrables, « Voir les horaires », disponibilités du tuteur ;
  - nouvel onglet Calendrier ;
  - bilan enrichi : présents, durée, déroulement ;
  - informations secondaires sous une icône ⓘ, pied de page commun, CDI 01.
- **Générateur d'identifiants** (19/09/2026) : testé sur un faux trombinoscope de 35 élèves. Il se relance sans changer les identifiants déjà attribués.
  - Identifiants au format `PC-XXXXX`.
  - Mots de passe du type `Mot-Mot-99`, stockés côté serveur sous forme chiffrée (PBKDF2-SHA256).

## Principes de protection des données

- Aucun nom d'élève en ligne. Le serveur ne connaît que l'identifiant et la classe.
- La correspondance entre noms et identifiants (`correspondance_resonance.xlsx`) reste dans OneDrive, réservée aux professeurs.
- Les coupons (noms + mots de passe) sont imprimés, puis supprimés.
- Les scripts sont lancés sur le PC du professeur. Seuls des rapports masqués sont partagés.

## À faire / en attente

- [ ] Premier lancement réel de `generer_identifiants.py` sur les trombinoscopes (sur le PC du professeur).
- [ ] Faire valider la liste des chapitres par les collègues.
- [ ] Horaires :
  - la récré de 15 h 15 tombe pendant la séance de 15 h à 16 h : à vérifier ;
  - le CDI est-il ouvert le mercredi après-midi ?
- [ ] Ajouter une option « nouveau mot de passe » pour un élève qui a perdu son coupon.
- [ ] Retirer « Parcourir sans se connecter » avant l'ouverture aux élèves.
- [ ] Site final :
  - choisir l'hébergement (serveur avec base de données : GitHub Pages ne suffit plus) ;
  - mettre en place la vraie connexion et le stockage ;
  - calendrier calculé automatiquement, avec export .ics ;
  - vérifications RGPD avec la direction et le DPO.

## Journal

- **19/09/2026** — Mise en ligne de la maquette v2, puis de la v3.
- **19/09/2026** — Ajout du script d'analyse et du générateur d'identifiants, du `.gitignore` et de ce fichier.
