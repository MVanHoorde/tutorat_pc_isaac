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

## Où sont les données

| Donnée | Emplacement |
|---|---|
| Identifiants, classes, demandes, disponibilités, positionnements | Supabase (Paris) |
| Mots de passe | Supabase Auth, sous forme d'empreinte uniquement |
| Abonnements aux notifications (adresse technique de l'appareil, sans nom) | Supabase (Paris) ; envoi par le service de notification d'Apple ou de Google |
| Noms et prénoms | Le fichier Excel dans OneDrive, et la mémoire de l'appareil de l'enseignant qui l'a chargé |
| Listes de noms des séances et relevés des observateurs | Chiffrés sur la tablette : Supabase ne stocke que des boîtes illisibles, effacées à la validation de la séance |
| Liens noms ↔ identifiants de la participation | La mémoire de l'appareil de l'enseignant |
| Points de participation (par identifiant), dépôts et fichiers déposés | Supabase (Paris) |
| Clés privées de chiffrement | Chaque appareil (IndexedDB) ; celle de l'enseignant aussi dans sa sauvegarde protégée par phrase de passe |
| Exercices réussis du parcours Python (identifiant, niveau, exercice, date ; jamais le code) | Supabase (Paris) |
| Python lui-même (Pyodide, ~20 Mo) | Le cache de l'appareil, après la première ouverture d'un niveau |
