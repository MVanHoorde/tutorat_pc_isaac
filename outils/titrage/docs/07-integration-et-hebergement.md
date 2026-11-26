# 07 — Intégration dans QuizEO et hébergement

## 1. Contraintes de QuizEO

- QuizEO **n'accepte pas de fichier HTML**. La granule *Iframe* attend une **URL HTTPS**.
- La page hébergée ne doit pas envoyer d'en-tête `X-Frame-Options: DENY` ou `SAMEORIGIN`, ni de `Content-Security-Policy: frame-ancestors` restrictif.
- La **hauteur de l'iframe est fixe** : le labo doit rester utilisable dans un cadre de hauteur donnée (voir P3, mode `embed=1`).
- Le cours prévoit deux emplacements :

| Emplacement dans le cours | Texte de la granule (déjà rédigé) | URL visée (après P3) |
|---|---|---|
| Fin de III (suivi pH-métrique) | « Labo numérique — titrage avec suivi pH-métrique » | `…/labos/titrage/?mode=ph&embed=1` |
| Fin de IV (suivi conductimétrique) | « Labo numérique — titrage avec suivi conductimétrique » | `…/labos/titrage/?mode=cond&embed=1` |

## 2. Hébergement conseillé : GitHub Pages (site existant de Loïc)

Loïc héberge déjà son site sur GitHub Pages : https://mvanhoorde.github.io/Site-Web-Portfolio/. Le clone local est sous `C:\Users\Utilisateur\Desktop\Clone Git\Site-Web-Portfolio`.

1. Copier `labo/index.html` dans le dépôt du site, sous `labos/titrage/index.html`.
2. Commit, puis push, **avec l'accord de Loïc**.
3. L'URL devient `https://mvanhoorde.github.io/Site-Web-Portfolio/labos/titrage/`.
4. GitHub Pages n'envoie pas d'en-tête `X-Frame-Options` par défaut. Vérifier quand même avec `curl -sI <url>`.
5. Tester l'URL dans une iframe (page de test ci-dessous), puis dans l'éditeur QuizEO.

Autres options possibles : Netlify, ou l'hébergement FTP de son site.

## 3. Page de test d'intégration (à créer localement, hors du site)

```html
<!DOCTYPE html><html lang="fr"><meta charset="utf-8"><title>Test iframe</title>
<body style="font-family:sans-serif;max-width:820px;margin:auto">
<h1>Test d'intégration</h1>
<iframe src="labo/index.html?mode=ph" width="800" height="900" style="border:1px solid #ccc"></iframe>
<iframe src="labo/index.html?mode=cond" width="800" height="900" style="border:1px solid #ccc"></iframe>
</body></html>
```

## 4. Lien avec le site « du cahier au laboratoire »

- Le site a des comptes élèves (Supabase) et des tableaux de bord enseignants. **Le labo n'y est pas relié** et ne collecte rien.
- Toute connexion future (suivi des élèves, mode exercice noté) est une décision de Loïc. Elle exige de revoir la règle « aucune collecte » du `CLAUDE.md` et l'information des familles.

## 5. Licence et crédits

- Pied de page : `©2026 Loïc Van Hoorde – CC BY-NC 4.0`, plus la mention de transparence (P0, à valider).
- La police Atkinson Hyperlegible est sous SIL Open Font License : compatible.
- N'importer aucune image tierce sans vérifier sa licence. Une image en CC BY-SA est incompatible avec la CC BY-NC 4.0 du projet, sauf avec un crédit séparé.
