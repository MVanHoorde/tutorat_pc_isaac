# Mise en place de Supabase — Résonance

Projet dédié : `mnqcmjmypkleptbmqtws` (https://mnqcmjmypkleptbmqtws.supabase.co). À faire une seule fois, dans l'ordre.

## 1. Fermer l'inscription libre

**Authentication → Sign In / Providers → Email** : désactivez **« Allow new users to sign up »**, puis enregistrez.

Sans ce réglage, n'importe qui pourrait se créer un compte. Les comptes Résonance sont créés uniquement par la fonction de première connexion.

## 2. Créer les tables

1. Allez dans **SQL Editor → New query**.
2. Collez tout le contenu de `supabase/schema.sql`, puis cliquez sur **Run**.
3. Vous devez voir « Success. No rows returned ».

À ne lancer qu'une fois. Une deuxième exécution signale des règles déjà existantes, sans rien casser.

## 3. Déployer la fonction de première connexion

1. Allez dans **Edge Functions → Deploy a new function → Via Editor**.
2. Nommez la fonction exactement **`premiere-connexion`**.
3. Remplacez le code proposé par le contenu de `supabase/functions/premiere-connexion/index.ts`, puis cliquez sur **Deploy**.
4. Dans les réglages de la fonction, désactivez **« Enforce JWT verification »** (ou « Verify JWT »). L'élève n'est pas encore connecté quand il l'appelle.

## 4. Importer les comptes (sur le PC du professeur)

Placez `generer_identifiants.py` et `preparer_supabase.py` dans le même dossier, puis lancez :

```
python preparer_supabase.py --dossier "C:\...\OneDrive\Résonance"
```

Pour créer en même temps un compte enseignant :

```
python preparer_supabase.py --dossier "C:\...\OneDrive\Résonance" --enseignant "NOM Prénom" --classes "Première 2" "Terminale 1"
```

Les classes doivent être écrites exactement comme dans la colonne Classe du registre.

Le script écrit `import_supabase_AAAAMMJJ-HHMM.sql`. Ce fichier ne contient aucun nom. Ouvrez-le, copiez tout, puis collez-le dans **SQL Editor → New query → Run**.

Pour chaque nouvel enseignant et chaque nouvelle classe, relancez le script et recollez le fichier : les comptes déjà importés sont ignorés.

## 5. Vérifier

1. Sur le site, connectez-vous avec un coupon enseignant (`PR-…`). La première connexion prend une ou deux secondes.
2. Dans **Tableau de bord → Correspondance**, chargez `correspondance_resonance.xlsx`.
3. Connectez-vous avec un coupon élève (`PC-…`), déposez une demande, puis vérifiez qu'elle apparaît chez l'enseignant avec le nom de l'élève.

## 6. Notifications sur les tablettes (octobre 2026)

Les clés d'envoi (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) sont déjà enregistrées dans **Edge Functions → Secrets**. Ne les modifiez pas : la clé publique est aussi écrite dans `index.html`.

1. **SQL Editor → New query** : collez `supabase/migrations/003_notifications.sql`, puis **Run**.
2. Déployez la fonction `notifier`, au choix :
   - dans un terminal, depuis le dossier du projet : `supabase functions deploy notifier --project-ref mnqcmjmypkleptbmqtws --use-api` ;
   - ou dans **Edge Functions → Deploy a new function → Via Editor** : nom **`notifier`**, collez `supabase/functions/notifier/index.ts`, puis **Deploy**.
3. Laissez **« Verify JWT »** activé : seuls les comptes connectés peuvent l'appeler.
4. Essai : sur un iPad (iPadOS 16.4 ou plus), ouvrez le site dans Safari, puis **Partager → Sur l'écran d'accueil**. Ouvrez Résonance depuis l'icône, connectez-vous, touchez **Activer les notifications**, puis **Envoyer un essai**.

## 7. Participation orale et dépôts bonus (octobre 2026)

Uniquement des ajouts : les tables du tutorat ne sont pas touchées.

1. **SQL Editor → New query** : collez `supabase/migrations/004_participation.sql`, puis **Run**. La migration crée aussi l'espace de stockage privé `depots` (10 Mo par fichier).
2. Publiez d'abord la nouvelle version du site de participation (dépôt `participation_terminale`), puis celle de Résonance : l'onglet Participation ouvre les pages de participation dans un cadre.
3. Sur l'iPad de l'enseignant, depuis l'icône Résonance : connectez-vous, chargez la correspondance (Tableau de bord), puis ouvrez l'onglet **Participation**.
   - Restaurez votre sauvegarde de participation (onglet Suivi de l'application, « Restaurer ») : l'icône Résonance a sa propre mémoire, elle ne voit pas les données de l'ancienne icône.
   - Vérifiez les liens nom ↔ compte, puis touchez **Ouvrir les onglets à cette classe**.
   - Touchez **Sauvegarder ma clé** et rangez le fichier hors des dépôts.
4. Facultatif, pour verrouiller : recopiez l'empreinte affichée dans `EMPREINTES_PROF` en haut de `participation.js`. Les élèves refuseront alors toute autre clé.

## 8. Parcours Python : progression des élèves (octobre 2026)

Uniquement des ajouts. Suppose l'étape 7 faite (la migration 005 lit `classes_participation`).

1. **SQL Editor → New query** : collez `supabase/migrations/005_python.sql`, puis **Run**. Vous devez voir « Success. No rows returned ». La migration peut être relancée sans dommage.
2. Vérifiez que chaque compte enseignant connaît ses classes : c'est ce qui lui donne accès aux réussites de ses élèves, et à elles seules.
   ```sql
   select identifiant, classes from public.profils where role = 'prof';
   select distinct classe from public.profils where role = 'eleve' order by 1;
   ```
   Un enseignant voit les élèves des classes de sa colonne `classes`, **et** de celles où il a ouvert la Participation. Si sa colonne est vide et qu'il n'a ouvert la Participation nulle part, il ne voit personne. Pour la remplir (noms de classe recopiés exactement depuis la seconde requête) :
   ```sql
   update public.profils set classes = array['B1_T_3_PH-CH_VANHOORDE'] where identifiant = 'PR-XXXXX';
   ```
3. Essai : suivez `docs/plan-test-refonte.md` (deux comptes de test, une dizaine de minutes).

Ce qui est enregistré : l'identifiant du compte, le niveau, l'identifiant de l'exercice (« ex-2-3 ») et la date. Jamais le code tapé par l'élève. La réussite est constatée sur la tablette : c'est un repère de travail, pas une note. Effacement en fin d'année avec le reste : `delete from public.python_reussites;`.

## 9. Signalements « J'ai vu un bug » et +0,5 (octobre 2026)

Uniquement des ajouts. Suppose l'étape 8 faite (la migration 006 utilise `mes_classes_prof()`).

1. **SQL Editor → New query** : collez `supabase/migrations/006_signalements.sql`, puis **Run**. Vous devez voir « Success. No rows returned ». La migration peut être relancée sans dommage.
2. Vérification : collez les requêtes du bloc « Vérification » en fin de fichier. Attendu :
   - `signalements | true | 4` (la table, ses règles d'accès actives, quatre règles) ;
   - deux déclencheurs, `signalements_bonus` et `signalements_plafond` ;
   - cinq fonctions : `bonus_signalement_vus`, `classe_terminale`, `mes_bonus_signalement`, `signalements_bonus`, `signalements_plafond` ;
   - `classe_terminale` : `true | true | false | false` pour `B1_T_3_PH-CH_VANHOORDE`, `TEST`, `B2_P_3_PH-CH_HUSSON`, vide.
3. Comme pour le parcours Python, un enseignant ne lit que les signalements des élèves de **ses** classes (colonne `classes` de son profil, et classes où il a ouvert la Participation ; voir l'étape 8). Les signalements des premières n'arrivent que si leur classe est rattachée à un compte enseignant.
4. Essai : section G de `docs/plan-test-refonte.md`.

Règles posées par la base :
- l'élève connecté envoie ses signalements (vingt par jour au plus) et ne les relit pas ; il ne peut ni les marquer traités ni s'accorder un bonus ;
- **le +0,5 ne s'accorde qu'aux élèves de terminale** (classe « …\_T\_… » ou commençant par « T », comme `espaceComplet` dans `commun.js`) : pour une autre classe, la base répond `BONUS_TERMINALE` ;
- accorder le bonus marque le signalement traité, à la date du serveur ; le retirer efface aussi « vu » ;
- l'élève n'obtient que ses bonus pas encore vus (`mes_bonus_signalement()`), et ne peut marquer « vus » que les siens (`bonus_signalement_vus()`).

Le formulaire ne demande ni nom ni prénom : l'élève est reconnu par son compte. Seuls les élèves de terminale ont le bouton. Un +0,5 accordé compte sur la note de participation de la période, 2 points au plus (plafond posé par la migration `007`, étape 10). Effacement en fin d'année avec le reste : `delete from public.signalements;`.

## 10. Périodes de participation et note de période (octobre 2026)

Suppose les étapes 7 à 9 faites (migrations 004 à 006). Modifie deux tables existantes : `participation_suivi` (une ligne par élève **et par période**) et `depots` (bonus limité à 0, 0,5, 1 ou 1,5).

1. **SQL Editor → New query** : collez `supabase/migrations/007_periodes.sql`, puis **Run**. Vous devez voir « Success. No rows returned ». La migration peut être relancée sans dommage.
2. Vérification : collez les requêtes du bloc « Vérification » en fin de fichier. Attendu :
   - `B1_T_3_PH-CH_VANHOORDE | 1 | 2026-08-31 22:00:00+00 | null` (la période 1 commence le 1er septembre, heure de Paris) ;
   - toutes les lignes de suivi en période 1 ;
   - quatre fonctions : `bilan_classe`, `bilan_periode_calcul`, `cloturer_periode`, `mon_bilan`.
3. **Juste après**, publiez la branche `periodes` de `participation_terminale`, puis celle de Résonance : l'ancienne page de Résonance lit le suivi d'une façon que la migration retire (l'élève y verrait « aucune séance »).

Règles posées par la base :
- une période appartient à une classe, va de `debut` à `fin` (exclue), une seule ouverte à la fois ; l'enseignant ouvre la période 1 (« Ouvrir les onglets à cette classe »), les suivantes s'ouvrent à la clôture ;
- un dépôt compte dans la période de sa validation, un signalement dans celle de son +0,5, une séance de tutorat dans celle de son jour (le jour de la clôture compte déjà pour la suivante) ;
- `cloturer_periode()` fige les bonus de dépôts et de signalements et fixe le curseur du tutorat ; prise de notes et tutorat restent modifiables ensuite ;
- l'enseignant ne lit et ne modifie que les élèves de ses classes ; l'élève lit ses périodes par `mon_bilan()` seulement, qui cache prise de notes et note avant la clôture ;
- quatre +0,5 de signalements au plus par période : la base répond `PLAFOND_BONUS_PERIODE` au cinquième.

Fin d'année : `delete from public.participation_suivi; delete from public.periodes;`.

## Où sont les données

| Donnée | Emplacement |
|---|---|
| Identifiants, classes, demandes, disponibilités, positionnements | Supabase (Paris) |
| Mots de passe | Supabase Auth, sous forme d'empreinte uniquement |
| Abonnements aux notifications (adresse technique de l'appareil, sans nom) | Supabase (Paris) ; envoi par le service de notification d'Apple ou de Google |
| Noms et prénoms | Le fichier Excel dans OneDrive, et la mémoire de l'appareil de l'enseignant qui l'a chargé |
| Listes de noms des séances et relevés des observateurs | Chiffrés sur la tablette : Supabase ne stocke que des boîtes illisibles, effacées à la validation de la séance |
| Liens noms ↔ identifiants de la participation | La mémoire de l'appareil de l'enseignant |
| Points de participation, prise de notes et note de période (par identifiant et par période), dépôts et fichiers déposés | Supabase (Paris) |
| Bilan de période exporté (avec les noms) | L'appareil de l'enseignant, puis OneDrive ; jamais en ligne ni dans le dépôt |
| Clés privées de chiffrement | Chaque appareil (IndexedDB) ; celle de l'enseignant aussi dans sa sauvegarde protégée par phrase de passe |
| Exercices réussis du parcours Python (identifiant, niveau, exercice, date ; jamais le code) | Supabase (Paris) |
| Signalements « J'ai vu un bug » (identifiant, rubrique, page, étape, appareil résumé, message, +0,5 et « vu » ; aucun nom) | Supabase (Paris) |
| Python lui-même (Pyodide, ~20 Mo) | Le cache de l'appareil, après la première ouverture d'un niveau |
