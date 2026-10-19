# Résonance — état du projet

Tutorat entre pairs en physique-chimie (première et terminale spécialité), lycée Isaac de l'Étoile, Poitiers.

*Dernière mise à jour : 19 octobre 2026*

## En ligne

- Dépôt : https://github.com/MVanHoorde/tutorat_pc_isaac (public)
- Site : https://mvanhoorde.github.io/tutorat_pc_isaac/ (GitHub Pages, branche `main`)

## Fichiers du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | Le site : page unique branchée sur Supabase, connexion obligatoire. Après connexion, un accueil à trois entrées (Tutorat, Participation, Outils) et, pour les enseignants, le Tableau de bord ; chaque rubrique a son adresse (`#demande`, `#offre`, `#participation`, `#depots`, `#outils`, `#prof`) |
| `commun.js` | Ce que partagent `index.html` et les pages Outils : adresse et clé publique de Supabase, client unique, lecture du rôle, règle des espaces (terminale complète, première Tutorat seulement ; `classeTerminale`). Même origine, donc même session |
| `signalement.js` | Bouton « J'ai vu un bug » et son formulaire (élève connecté), fenêtre 🎁 du +0,5 ; partagé par `index.html` et les pages du parcours Python (chargé par `progression-resonance.js`) |
| `polices/` | Polices auto-hébergées (Bricolage Grotesque, IBM Plex Sans et Mono, Spectral, STIX Two Text ; licence OFL) : copie à l'identique de `outils/python/polices/`. Plus aucun appel à Google Fonts |
| `analyser_trombi.py` | Relève la mise en page d'un trombinoscope PDF, avec le texte masqué par défaut |
| `generer_identifiants.py` | Trombinoscopes PDF → identifiants, coupons, registre de correspondance et fichier serveur |
| `preparer_supabase.py` | Fichiers serveur → `import_supabase_….sql` à coller dans Supabase ; crée les comptes enseignants (`PR-…`) |
| `supabase/schema.sql` | Tables et règles d'accès de la base (élève / enseignant) |
| `supabase/functions/premiere-connexion/` | Fonction Supabase : première connexion avec le mot de passe du coupon |
| `supabase/MISE_EN_PLACE.md` | Les étapes à suivre dans Supabase, dans l'ordre |
| `sw.js`, `manifest.webmanifest`, `icone-*.png` | Résonance sur l'écran d'accueil de l'iPad, réception des notifications, et cache des Outils : `vendor/` et `polices/` en « cache d'abord » (nom de cache `VERSION_VENDOR`, à changer à chaque mise à jour de Pyodide), `outils/` en « réseau d'abord » ; l'application elle-même (`index.html`, `commun.js`, `participation.js`, `signalement.js`) n'est jamais mise en cache |
| `supabase/functions/notifier/` | Fonction Supabase : envoie les notifications (séance validée ou annulée, essai) |
| `supabase/migrations/` | Modifications de la base à coller dans Supabase, dans l'ordre |
| `participation.js` | Rubrique Participation (onglets Participation et Dépôts bonus) : chiffrement de bout en bout, liens noms ↔ comptes, envoi des séances, réception des relevés, suivi par période, Bilan de période (prise de notes, tutorat, export, clôture), dépôts |
| `supabase/migrations/004_participation.sql` | Tables de la participation et des dépôts, stockage `depots` |
| `supabase/migrations/005_python.sql` | Table `python_reussites` (compte, niveau, exercice, date ; jamais le code) ; l'enseignant ne lit que ses classes |
| `supabase/migrations/007_periodes.sql` | Périodes de participation (`periodes`, une ouverte par classe), suivi par élève et par période, prise de notes et curseur du tutorat ; dépôts à 0 · 0,5 · 1 · 1,5 ; plafond de 2 points de signalements par période ; `bilan_classe()` (enseignant), `mon_bilan()` (élève, notes cachées avant la clôture), `cloturer_periode()` |
| `supabase/migrations/006_signalements.sql` | Table `signalements` (« J'ai vu un bug ») : l'élève écrit les siens sans les relire, vingt par jour au plus ; l'enseignant lit, traite, supprime ceux de ses classes ; +0,5 réservé aux terminales ; deux fonctions rendent à l'élève ses bonus non vus |
| `docs/plan-test-refonte.md` | Plan de test manuel de l'accueil à trois entrées, du parcours Python relié et des signalements |
| `outils/python/` | Parcours Python de terminale (rubrique Outils) : `index.html` (les 5 niveaux), `niveau-1.html` à `niveau-5.html` (le 3 se génère depuis `sources/niveau-3/`), moteur `parcours.js` + `py-worker.js` + `py-prelude.py`, `parcours.css`, `polices/` auto-hébergées, `fiches/` (mémos PDF), `PARCOURS.md` (structure des niveaux), `A-VALIDER.md` (points de fond à trancher), `progression-resonance.js` (enregistre les réussites de l'élève connecté) |
| `vendor/pyodide/`, `vendor/codemirror/`, `vendor/katex/` | Python dans le navigateur (Pyodide 314.0.7 : numpy, matplotlib, friendly-traceback), l'éditeur de code et le rendu des formules LaTeX (KaTeX 0.18.9, chargé seulement sur une page qui porte une formule), auto-hébergés ; voir leur `LISEZMOI.md` |
| `.gitignore` | Bloque PDF, Excel, CSV et JSON : aucune donnée d'élève ne doit arriver sur le dépôt public. Exceptions, par leur propre `.gitignore` : `outils/python/fiches/*.pdf` et `vendor/pyodide/pyodide-lock.json` |
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

- **Validation des binômes** (08/10/2026) : branchée sur la table `seances` existante, sans changement dans Supabase.
  - Tableau de bord : bouton « Valider ce binôme » pour chaque tuteur positionné ou disponible, et « Associer un autre élève… » pour choisir n'importe quel élève par son identifiant (liste avec les noms si la correspondance est chargée).
  - On choisit le créneau et la date (le prochain jour du créneau est proposé). La demande passe à « binôme validé ».
  - Liste « Séances validées à venir », avec annulation (la demande redevient à apparier).
  - Côté élève : un encadré en haut de page, dès la connexion, annonce la date, l'horaire, le chapitre et le rôle (« tu aides » / « un tuteur t'aide »), sans le nom de l'autre. Le professeur prévient les élèves de qui est leur binôme.

- **Notifications sur les tablettes** (08/10/2026), écrites mais **pas encore activées** (étape 6 de `supabase/MISE_EN_PLACE.md`).
  - Résonance s'installe sur l'écran d'accueil de l'iPad, avec sa propre icône.
  - Ouvert depuis cette icône, il propose « Activer les notifications ». Sinon, un bandeau explique comment l'ajouter à l'écran d'accueil.
  - Les deux élèves reçoivent une notification quand une séance est validée ou annulée : date, horaire, chapitre et rôle, jamais de nom. Après validation, l'enseignant voit qui l'a reçue.
  - Bouton « Envoyer un essai » pour vérifier un appareil. À la déconnexion, l'appareil ne reçoit plus les notifications du compte.
  - Clés d'envoi déjà dans les secrets Supabase ; la clé privée n'est écrite nulle part ailleurs.

- **Participation orale et dépôts bonus** (11/10/2026), publiés sur `main` (commit `465f6ce`). Activation dans Supabase : étape 7 de `supabase/MISE_EN_PLACE.md` (migration 004), à confirmer.
  - Une rubrique, visible des seules classes ouvertes par l'enseignant, avec deux onglets : Participation et Dépôts bonus.
  - Participation : l'application de participation (dépôt `participation_terminale`) est ouverte dans un cadre. À l'ouverture d'une séance, la liste est chiffrée pour les tablettes des deux observateurs ; leur relevé revient chiffré pour l'enseignant, d'un bouton « Envoyer au professeur ». Les QR codes restent en secours.
  - Chiffrement : une paire de clés ECDH P-256 par appareil, clé privée dans l'appareil, AES-GCM. Le serveur ne voit que des boîtes fermées, effacées à la validation de la séance. Sauvegarde de la clé de l'enseignant par phrase de passe.
  - Liens noms ↔ identifiants faits sur l'appareil de l'enseignant à partir de la correspondance ; rien de nominatif en ligne.
  - Suivi : points de la période en cours publiés par identifiant après chaque séance validée ; chaque élève ne voit que sa ligne (voir « Périodes et bilan de période »).
  - Dépôts : lien ou fichier (10 Mo), validé par l'enseignant avant d'être montré à la classe sans le nom de l'auteur, avec un bonus de 0, 0,5, 1 ou 1,5 point, modifiable après validation.
- **Parcours Python en ligne, en audit** (17/10/2026), dans `outils/python/`. Audit prioritaire : niveaux 1 et 2 (annoncé aux élèves sur l'accueil du parcours) ; points de fond dans `outils/python/A-VALIDER.md`. Les audits préparatoires (`outils/python/audit/`) restent sur le PC du professeur : ils décrivent ses fichiers et ne sont pas publiés.
  - Structure dans `outils/python/PARCOURS.md`. Niveau 1, boîte à outils de l'ECE (8 étapes, 27 exercices) ; niveau 2, mini-projets d'ECE (19) ; niveau 3, autonomie et fichiers de données (23) ; niveau 4, attendus du supérieur étiquetés (21) ; niveau 5, 2e année et spécialités (16). Un mémo PDF par niveau. Les sections s'appellent « Étape N ».
  - Python tourne dans la tablette (Pyodide dans un worker, sans accès au jeton de connexion), messages d'erreur courts en français, correction automatique par indices, solution après un premier essai.
  - Réussite d'un exercice (règle du 18/10/2026, `evaluerExo` dans `parcours.js`) : chaque éditeur ou console qui porte une vérification (`script.py-check`) doit l'avoir passée ; le quiz de l'exercice doit être entièrement trouvé ; une console d'exploration, sans vérification ni quiz, se valide par le bouton « J'ai compris », actif après un premier essai. Une exécution sans erreur ne suffit plus. Entre les deux, l'exercice porte la marque « en cours » (titre et sommaire), gardée par la page seulement, jamais en base.
  - Quiz pas à pas : une question à la fois dans l'exercice (l'énoncé et la console restent visibles), on avance une fois la bonne réponse trouvée, puis récapitulatif des bonnes réponses avec leurs explications.
  - Le code se tape : rien du cours ne se sélectionne ni ne se copie, et un éditeur ou une console n'accepte que ce que l'élève a copié dans un éditeur ou une console de la page. Clavier grec (touche αβ) sous chaque éditeur.
  - Sujets de TP téléchargeables dans `outils/python/fiches/tp/` : TP1, TP3, TP4, TP5, TP6.
  - Libre accès. Sans connexion à Résonance, rien n'est enregistré ni envoyé.
- **Accueil à trois entrées** (17/10/2026), **en ligne** ; migration `005` collée le 17/10/2026. Tests réels avec les élèves (plan : `docs/plan-test-refonte.md`).
  - Après connexion : trois cartes, Tutorat (demander / proposer de l'aide), Participation (classes ouvertes seulement), Outils ; une quatrième, Tableau de bord, pour les enseignants. **Les premières n'ont que le Tutorat** : Participation et Outils forment l'espace de terminale (règle `espaceComplet` de `commun.js`, lue d'après la classe du compte : `_T_` terminale, `_P_` première ; classe inconnue : Tutorat seulement). Dans une rubrique, la barre ne montre que ses onglets et « Accueil » ; l'onglet Tableau de bord reste visible partout pour l'enseignant.
  - Choix : des vues dans `index.html`, et non des pages séparées. `participation.js` vit des variables de la page et garde en mémoire la séance ouverte et le cadre de participation : changer de page couperait une séance en cours. Seuls les Outils sont des pages à part (charte propre, moteur Python lourd), reliées par `commun.js`.
  - Chaque vue a son adresse : rechargement, bouton retour de Safari et retour depuis les Outils (`index.html#outils`) ramènent au bon endroit.
  - Polices auto-hébergées (`polices/`) : plus aucune requête vers Google.
  - Parcours Python relié : même connexion ; l'élève connecté voit « ← Résonance » et ce qui est enregistré ; ses réussites vont dans `python_reussites` (migration 005) et reviennent cochées sur tout appareil. Tableau de bord : vue « Parcours Python », exercices réussis par élève et par niveau, noms tirés de la correspondance chargée sur l'appareil.
  - `sw.js` garde Pyodide (environ 20 Mo, scipy à la demande) dans l'appareil après la première ouverture.
- **« J'ai vu un bug » et +0,5** (17/10/2026), **en ligne** ; migration `006` collée. Section G de `docs/plan-test-refonte.md` à dérouler avec de vrais comptes. Repris du site pédagogique de M. Van Hoorde.
  - Tout élève de **terminale** connecté (pas les premières, décision du 17/10/2026) a un bouton discret 🐞 « J'ai vu un bug » en bas à droite : sur toutes les vues de Résonance et toutes les pages du parcours Python. Ni visiteur ni enseignant.
  - Le formulaire ne demande que le problème : ni nom ni prénom, le compte suffit (l'enseignant retrouve l'élève par son identifiant et la correspondance chargée sur son appareil). Il envoie la rubrique (`cle` : `accueil`, `tutorat`, `participation`, `outils`, `python`, `python-n1` à `python-n5`), le fichier, la vue ou l'exercice à l'écran, et un résumé court de l'appareil (« iPad · Safari · 1024×768 »). Vingt signalements par élève et par jour au plus. L'élève ne relit pas ses signalements.
  - Tableau de bord, section **Signalements** (pastille du nombre à traiter sur l'onglet) : cartes récentes d'abord, à traiter seulement ou toutes ; identifiant (et nom si la correspondance est chargée), classe, rubrique, page, étape, appareil, message ; **Traité**, **Supprimer**, **Accorder +0,5** / **Retirer le +0,5**, et « vu par l'élève ». L'enseignant ne voit que les élèves de ses classes (`mes_classes_prof()`) : les signalements de premières n'arrivent que si leur classe est rattachée à un compte enseignant.
  - **Le +0,5 ne s'accorde qu'aux élèves de terminale** (règle de M. Van Hoorde : ses élèves). Le bouton n'apparaît que pour eux, et la base refuse le bonus pour toute autre classe (`classe_terminale()`, même règle que `espaceComplet`). Accorder marque traité ; la date est celle du serveur. Il compte **sur la note de participation de la période**, 2 points au plus (migration `007` : la base refuse le cinquième +0,5 d'une période).
  - L'élève en est prévenu **une fois** par une fenêtre « 🎁 +0,5 sur ta note de participation », à l'accueil de Résonance, jamais par-dessus un formulaire, un relevé de participation ou un cadre en plein écran. « Vu » est enregistré en base.
- **Périodes et bilan de période** (17/10/2026), **en ligne** (Résonance et `participation_terminale`) ; migration `007` collée et vérifiée le jour même. Section H de `docs/plan-test-refonte.md` à dérouler avec de vrais comptes. Demande de M. Van Hoorde.
  - Le suivi de participation se fait **par période** (une entre deux vacances, cinq dans l'année), et non plus sur l'année. Dans l'application de participation : chaque séance validée porte son numéro de période, celles d'avant valent P1 ; l'onglet Suivi montre la période en cours, les périodes closes restent consultables ; la roue repart à zéro à la clôture (son ancien bouton « Nouvelle période » est retiré). Le bilan de l'application passe sur 10.
  - **Note de période sur 20, plafonnée à 20** : participation /10 (points ramenés à l'objectif fixe de la classe) + prise de notes /10 (saisie par l'enseignant) + bonus. Bonus : dépôts (0,5, 1 ou 1,5 chacun) ; tutorat, proposé à +1 par séance comme tuteur et +0,5 par séance comme tutoré (séances validées, date passée), 5 au plus, réglé au curseur par l'enseignant ; signalements, +0,5 chacun, 2 au plus. La note compte ensuite coefficient 0,5, hors du site.
  - **Bilan de période** (rubrique Participation, enseignant) : une ligne par élève, nom tiré de la correspondance chargée sur l'appareil ; saisie de la prise de notes et du curseur du tutorat (enregistrés aussitôt) ; « Exporter le bilan » (CSV avec les noms, sur l'appareil, à ranger dans OneDrive) ; « Clôturer la période N » : republie la participation, fige en base les bonus de dépôts et de signalements, publie la note, ouvre la période suivante, clôture l'application (sauvegarde téléchargée, roue à zéro) et exporte le bilan. Après la clôture, prise de notes et tutorat restent modifiables.
  - La base et l'application avancent ensemble : un suivi n'est publié que si l'application est dans la période ouverte en base ; sinon un message le dit.
  - Élève, « Où j'en suis » : la période en cours (points, participation /10, bonus acquis et leur origine), puis chaque période close avec sa note sur 20 et son détail. La prise de notes et la note restent cachées par la base avant la clôture.
  - Seuls les élèves de la classe de l'enseignant comptent : rien ne s'affiche chez les premières. La période 1 de `B1_T_3_PH-CH_VANHOORDE` commence le 01/09/2026.
  - Vérifié sans toucher la base en ligne : migration rejouée dans des transactions annulées (calcul, droits, clôture, plafonds) ; application seule (16 contrôles) ; Résonance dans Chromium avec une base simulée (27 contrôles, enseignant et élève).

- **Boîte à cartes par Résonance** (19/10/2026), écrite et éprouvée, **pas encore en ligne** (fonction à déployer). Section I de `docs/plan-test-refonte.md`.
  - Outils → « Boîte à cartes » : un élève de terminale entre dans Leitner (`mvanhoorde.github.io/Leitner/`) avec sa session Résonance, sans second compte, comme on « se connecte avec Google ». Leitner vit sur le projet Supabase du site du cours (`ztyv…`), pas sur celui de Résonance.
  - `ouvrirLeitner()` (`index.html`) envoie le jeton de session à la fonction `pont-resonance` **du site du cours** (`Site-Web-Portfolio/supabase/functions/pont-resonance/`), qui le fait vérifier par Résonance, applique la règle des terminales, crée ou retrouve un compte sans nom et rend un ticket à usage unique ; Leitner l'échange contre sa propre session.
  - Leitner ouvert directement propose « Me connecter avec Résonance » → `index.html#vers-leitner` : connexion demandée s'il le faut, puis le pont. Première : message « réservée aux élèves de terminale ». Enseignant : lien direct, il se connecte avec son compte du site du cours.
  - Données : la Boîte à cartes enregistre les révisions sous l'identifiant `PC-…` seul, sur le serveur du site du cours (ajouté dans « Tes données » du pied de page). Le tableau de bord de Résonance ne les voit pas.

## Horaires et lieu (CDI, septembre 2026)

- Récré du matin, 9 h 55 : tous les jours.
- Récré de l'après-midi, 15 h 15 – 15 h 30 : lundi, mardi, jeudi, vendredi (pas le mercredi après-midi).
- Séance d'une heure, 15 h 15 – 16 h 20 (récré puis heure de 15 h 30 à 16 h 20) : lundi, jeudi, vendredi seulement.
- Salle : CDI 2 en priorité (accès en autonomie). CDI 1 possible, mais fermée à clé : il faut demander l'accès. Le CDI 1 accueillera plus tard le matériel pour enregistrer des podcasts et des vidéos (projets futurs).

## Principes de protection des données

- Aucun nom d'élève en ligne. Le serveur ne connaît que l'identifiant et la classe ; un signalement « J'ai vu un bug » ne demande ni nom ni prénom.
- Parcours Python : seuls l'identifiant de l'exercice réussi, son niveau et la date sont enregistrés, jamais le code tapé ; rien du tout sans connexion.
- Aucune police ni aucun script de Google : polices dans `polices/`.
- La correspondance entre noms et identifiants (`correspondance_resonance.xlsx`) reste dans OneDrive, réservée aux professeurs.
- Les coupons (noms + mots de passe) sont imprimés, puis supprimés.
- Les scripts sont lancés sur le PC du professeur. Seuls des rapports masqués sont partagés.

## À faire / en attente

- [x] Premier lancement réel de `generer_identifiants.py` : coupons et registres créés (19/09/2026).
- [x] Coupons distribués aux élèves de première (22/09/2026). Inscription des terminales de M. Van Hoorde le 23/09/2026.
- [x] Trombinoscope de Mme Husson traité : coupons élèves et compte enseignant `PR-…` créés, import Supabase fait (01/10/2026).
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
- [x] Validation des binômes : le prof valide sur le site ; les élèves voient la séance à leur connexion, le prof leur dit avec qui (08/10/2026).
- [x] Bouton « Voir » dans le champ mot de passe de la connexion : l'élève relit ce qu'il a tapé depuis son coupon ; masqué de nouveau à l'envoi (demande des élèves, 11/10/2026).
- [ ] Notifications : coller la migration `003` et déployer la fonction `notifier` (étape 6 de `MISE_EN_PLACE.md`), puis tester avec les élèves la semaine du 12/10/2026. En attendant, et pour donner le nom du binôme : message École Directe.
- [ ] Vérifier que les iPads du lycée (s'ils sont gérés par l'établissement) autorisent les notifications des sites ajoutés à l'écran d'accueil.
- [ ] Plusieurs séances pour une même demande « sur la durée » (aujourd'hui : une séance par validation).
- [ ] Remettre une demande à « ouverte » quand tous les tuteurs se sont retirés.
- [x] Horaires : réglés avec le CDI (22/09/2026), voir « Horaires et lieu ».
- [ ] Salle : CDI 2 ou CDI 1, à redéfinir plus tard avec le CDI.
- [ ] Ajouter une option « nouveau mot de passe » pour un élève qui a perdu son coupon.
- [x] Retirer « Parcourir sans se connecter » avant l'ouverture aux élèves (22/09/2026).
- [ ] Supprimer les comptes de test `PC-TEST1` et `PR-TEST1`.
- [ ] Calendrier calculé automatiquement, avec export .ics.
- [ ] Vérifications RGPD avec la direction et le DPO, en particulier pour les bilans audio (la voix est une donnée personnelle). À faire avant l'ouverture aux élèves.

- [ ] Participation : coller la migration `004`, publier `participation_terminale` puis Résonance (étape 7 de `MISE_EN_PLACE.md`), tester avec deux comptes de test avant la classe.
- [ ] Participation : inscrire l'empreinte de la clé de l'enseignant dans `EMPREINTES_PROF` (`participation.js`).
- [ ] Dépôts : vérifier avec le DPO (fichiers déposés par les élèves, conservation jusqu'à fin août).

- [ ] Parcours Python : audit des niveaux 1 et 2 par M. Van Hoorde (prioritaire), puis 3 à 5 ; trancher `outils/python/A-VALIDER.md`.
- [ ] Parcours Python : tester sur un iPad du lycée, sur le wifi du lycée (chargement, clavier, guillemets courbes, mémoire).
- [x] Accueil à trois entrées, espaces terminale / première, connexion commune, progression dans Supabase, cache de Pyodide, polices auto-hébergées : en ligne (17/10/2026).
- [x] Migration `005` collée et vérifiée (table, 3 règles, fonction) ; compte enseignant rattaché à `B1_T_3_PH-CH_VANHOORDE`, compte de test à `TEST` (17/10/2026).
- [ ] Refonte : dérouler `docs/plan-test-refonte.md` avec de vrais comptes (connexion, tutorat, participation, parcours relié, iPad).
- [x] Signalements : migration `006` collée, en ligne (17/10/2026). Reste la section G de `docs/plan-test-refonte.md` avec de vrais comptes.
- [x] Périodes : migration `007` collée et vérifiée, en ligne (17/10/2026).
- [ ] Périodes : saisir la prise de notes de P1 puis clôturer la période 1 (vacances de la Toussaint) ; section H de `docs/plan-test-refonte.md` sur iPad.
- [ ] Signalements de premières : rattacher leurs classes à un compte enseignant (`profils.classes`), sinon personne ne les lit.
- [ ] Polices en double (`polices/` et `outils/python/polices/`) : faire importer `../../polices/polices.css` par `parcours.css`, puis supprimer la copie du parcours.
- [ ] Mise à jour de Pyodide : changer aussi `VERSION_VENDOR` dans `sw.js`, sinon les appareils gardent l'ancienne version en cache.
- [ ] RGPD : supabase-js et le lecteur Excel viennent encore d'un CDN (jsdelivr), qui voit l'adresse IP ; à auto-héberger dans `vendor/`.
- [ ] Boîte à cartes : `supabase functions deploy pont-resonance --no-verify-jwt` depuis `Site-Web-Portfolio/` (pas d'ici : autre projet), publier Leitner puis Résonance, puis la section I de `docs/plan-test-refonte.md`.

## Journal

- **19/10/2026** — Boîte à cartes (Leitner) reliée par un pont de connexion : carte dans Outils, `#vers-leitner`, fonction `pont-resonance` dans le dépôt du site du cours.
- **18/10/2026** — Audit du niveau 1 : rappels de cours en LaTeX avec noms et unités, exercice 5.4 (pH théoriques du TP6), question 3 du 6.1 (écriture du résultat), « à quoi ça sert » et liens de documentation, sujets des TP 3, 4 et 6, clavier grec, copier-coller bloqué.
- **18/10/2026** — Parcours Python : marque « en cours », fin de la réussite sur simple exécution (vérifications dans les consoles du niveau 1, bouton « J'ai compris »), quiz une question à la fois avec récapitulatif. Les réussites enregistrées avant restent en base.
- **17/10/2026** — Périodes de participation et note de période sur 20 (migration `007`, Bilan de période), en ligne le jour même (Résonance et `participation_terminale`).
- **17/10/2026** — « J'ai vu un bug » et +0,5 des terminales (migration `006`, `signalement.js`), en ligne le jour même.
- **17/10/2026** — Mise en ligne : accueil à trois entrées (Tutorat, Participation, Outils ; premières limitées au Tutorat), banque d'outils (Labo Lycée), `commun.js`, polices auto-hébergées, parcours Python en cinq niveaux relié à Supabase (migration `005`), cache de Pyodide dans `sw.js`.
- **11/10/2026** — Participation orale (sans QR code, chiffrée de bout en bout) et dépôts bonus, sur la branche `participation`.

- **08/10/2026** — Correction : la correspondance s'arrêtait à 78 personnes (élèves de Mme Husson absents), car le fichier déclarait une plage de cellules périmée. Le site recalcule désormais la plage d'après les cellules réelles.
- **08/10/2026** — Notifications sur les tablettes : écran d'accueil, service worker, fonction `notifier`, migration `003`.
- **08/10/2026** — Validation des binômes par l'enseignant, liste des séances à venir, avis de séance pour les élèves à la connexion.
- **01/10/2026** — Classe de Mme Husson (`B2_P_3_PH-CH_HUSSON`) ajoutée : coupons élèves, compte enseignant, import dans Supabase.
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
