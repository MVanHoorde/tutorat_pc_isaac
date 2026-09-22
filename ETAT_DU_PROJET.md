# Résonance — état du projet

Tutorat entre pairs en physique-chimie (première et terminale spécialité), lycée Isaac de l'Étoile, Poitiers.

*Dernière mise à jour : 22 septembre 2026*

## En ligne

- Dépôt : https://github.com/MVanHoorde/tutorat_pc_isaac (public)
- Site : https://mvanhoorde.github.io/tutorat_pc_isaac/ (GitHub Pages, branche `main`)

## Fichiers du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | Le site : page unique branchée sur Supabase, connexion obligatoire |
| `analyser_trombi.py` | Relève la mise en page d'un trombinoscope PDF, avec le texte masqué par défaut |
| `generer_identifiants.py` | Trombinoscopes PDF → identifiants, coupons, registre de correspondance et fichier serveur |
| `preparer_supabase.py` | Fichiers serveur → `import_supabase_….sql` à coller dans Supabase ; crée les comptes enseignants (`PR-…`) |
| `supabase/schema.sql` | Tables et règles d'accès de la base (élève / enseignant) |
| `supabase/functions/premiere-connexion/` | Fonction Supabase : première connexion avec le mot de passe du coupon |
| `supabase/MISE_EN_PLACE.md` | Les étapes à suivre dans Supabase, dans l'ordre |
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

- **Rôles élève / enseignant** (19/09/2026) : un seul site ; « Je suis élève / Je suis enseignant » à la connexion. L'enseignant voit en plus le tableau de bord et la fin de période, ainsi que tous les écrans élèves, mais sans pouvoir réserver.
- **Branchement Supabase** (19/09/2026) sur un projet dédié à Résonance, `mnqcmjmypkleptbmqtws`, séparé des autres projets du professeur. Écrit et testé localement, **pas encore activé** : les étapes de `supabase/MISE_EN_PLACE.md` restent à faire.
  - Déjà branchés : connexion, dépôt de demande, demandes anonymes vues par les tuteurs, positionnement, disponibilités, tableau des dépôts de l'enseignant.
  - Correspondance : le fichier Excel est chargé sur l'appareil de l'enseignant, jamais envoyé en ligne.
  - Encore fictifs : binômes, calendrier, bilans, retours, attestation.
- **Site prêt pour les élèves** (22/09/2026) : tout l'habillage de présentation est retiré.
  - Plus de bandeau « maquette », plus de mode « Parcourir sans se connecter » : sans compte, on ne voit qu'un écran d'accueil avec le bouton de connexion.
  - Plus aucune donnée inventée : formulaire vide, spectre calculé sur les vraies demandes, tableau enseignant sans exemples.
  - Onglets retirés tant qu'ils ne sont pas branchés : Calendrier, Bilan de séance, Fin de période (et le pop-up de retour). Leur maquette reste dans l'historique git (commit `2a26f9e`).
  - Le niveau (première / terminale) est présélectionné d'après la classe du compte ; le menu des groupes est supprimé.
  - Horaires du CDI dans les grilles et le pied de page (voir ci-dessous).

## Horaires et lieu (CDI, septembre 2026)

- Récré du matin, 9 h 55 : tous les jours.
- Récré de l'après-midi, 15 h 15 – 15 h 30 : lundi, mardi, jeudi, vendredi (pas le mercredi après-midi).
- Séance d'une heure, 15 h 15 – 16 h 20 (récré puis heure de 15 h 30 à 16 h 20) : lundi, jeudi, vendredi seulement.
- Salle : CDI 2 en priorité (accès en autonomie). CDI 1 possible, mais fermée à clé : il faut demander l'accès. Le CDI 1 accueillera plus tard le matériel pour enregistrer des podcasts et des vidéos (projets futurs).

## Principes de protection des données

- Aucun nom d'élève en ligne. Le serveur ne connaît que l'identifiant et la classe.
- La correspondance entre noms et identifiants (`correspondance_resonance.xlsx`) reste dans OneDrive, réservée aux professeurs.
- Les coupons (noms + mots de passe) sont imprimés, puis supprimés.
- Les scripts sont lancés sur le PC du professeur. Seuls des rapports masqués sont partagés.

## À faire / en attente

- [x] Premier lancement réel de `generer_identifiants.py` : coupons et registres créés (19/09/2026).
- [x] Coupons distribués aux élèves de première (22/09/2026). Inscription des terminales de M. Van Hoorde le 23/09/2026.
- [ ] Trombinoscope de la collègue : à traiter plus tard avec `generer_identifiants.py`.
- [ ] Suivre `supabase/MISE_EN_PLACE.md` :
  - fermer l'inscription libre ;
  - lancer `schema.sql` ;
  - déployer la fonction `premiere-connexion` ;
  - importer les comptes.
- [ ] Créer les comptes enseignants avec `preparer_supabase.py --enseignant`.
- [ ] Brancher la suite : validation des binômes, calendrier réel, bilans (texte puis audio dans le stockage Supabase), retours, attestation.
- [ ] Effacement automatique des textes quinze jours après la séance (tâche planifiée dans Supabase).
- [x] Chapitres de terminale : progression de M. Van Hoorde, 25 chapitres de T.1 à 4.6 (19/09/2026).
- [ ] Chapitres de première : progression de Mme Castel (liste à fournir).
- [ ] Classes à afficher : « Première spé — Mme Castel » et « Terminale spé — M. Van Hoorde », sans numéro de groupe.
- [ ] « Pressant » : exiger une évaluation à plus de trois jours, sans révision de dernière minute (demande de Mme Castel, à préciser).
- [ ] Validation des binômes : décider comment les deux élèves savent avec qui ils ont rendez-vous, puisque les noms ne sont pas en ligne.
- [ ] Remettre une demande à « ouverte » quand tous les tuteurs se sont retirés.
- [x] Horaires : réglés avec le CDI (22/09/2026), voir « Horaires et lieu ».
- [ ] Salle : CDI 2 ou CDI 1, à redéfinir plus tard avec le CDI.
- [ ] Ajouter une option « nouveau mot de passe » pour un élève qui a perdu son coupon.
- [x] Retirer « Parcourir sans se connecter » avant l'ouverture aux élèves (22/09/2026).
- [ ] Supprimer les comptes de test `PC-TEST1` et `PR-TEST1`.
- [ ] Calendrier calculé automatiquement, avec export .ics.
- [ ] Vérifications RGPD avec la direction et le DPO, en particulier pour les bilans audio (la voix est une donnée personnelle). À faire avant l'ouverture aux élèves.

## Journal

- **22/09/2026** — Site nettoyé de sa présentation (maquette, exemples, mode visiteur, onglets non branchés) et horaires du CDI intégrés, avant l'inscription des terminales.
- **19/09/2026** — Mise en ligne de la maquette v2, puis de la v3.
- **19/09/2026** — Ajout du script d'analyse et du générateur d'identifiants, du `.gitignore` et de ce fichier.
- **19/09/2026** — Appariement. Testé de bout en bout ; migration `002` appliquée dans Supabase.
  - Le tuteur coche les créneaux de la demande qui lui conviennent.
  - L'enseignant voit, pour chaque demande, les tuteurs positionnés et les tuteurs disponibles sur les mêmes créneaux, ainsi que le tableau de toutes les disponibilités.
  - Une fois connecté, les exemples restent visibles avec l'étiquette « Exemple », et le spectre affiche les vraies demandes.
- **19/09/2026** — Supabase activé :
  - inscription libre fermée, tables créées, fonction `premiere-connexion` déployée ;
  - 76 élèves et 2 enseignants importés.
- **19/09/2026** — Parcours testé de bout en bout avec deux comptes de test sans nom (`PC-TEST1`, `PR-TEST1`, classe « TEST »), à supprimer après les essais.
  - Correction : le tableau enseignant restait vide, à cause d'un lien ambigu entre demandes et profils.
  - Ajouts : liste « Mes demandes » côté élève, avec possibilité de retirer une demande ; masquage des parties encore fictives quand on est connecté.
- **19/09/2026** — Choix de Supabase (Paris). Ajout des rôles élève et enseignant, de la structure de la base, de la fonction de première connexion, du script d'import et du chargement de la correspondance sur l'appareil.
