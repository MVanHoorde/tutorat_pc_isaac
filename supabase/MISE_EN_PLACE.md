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

## Où sont les données

| Donnée | Emplacement |
|---|---|
| Identifiants, classes, demandes, disponibilités, positionnements | Supabase (Paris) |
| Mots de passe | Supabase Auth, sous forme d'empreinte uniquement |
| Noms et prénoms | Le fichier Excel dans OneDrive, et la mémoire de l'appareil de l'enseignant qui l'a chargé |
