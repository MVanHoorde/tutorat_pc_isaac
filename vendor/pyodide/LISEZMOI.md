# Pyodide — Python dans le navigateur (auto-hébergé)

- **Version** : Pyodide **314.0.7** (Python 3.14.2, Emscripten 5.0.3, ABI `2026_0`).
- **Licence** : MPL-2.0 (Pyodide). Chaque paquet garde sa licence : numpy, matplotlib, contourpy,
  kiwisolver, pillow, fonttools, cycler, pyparsing, packaging, python-dateutil, pytz, six (BSD/MIT/PSF/HPND/Apache),
  friendly_traceback (MIT), asttokens (Apache-2.0), executing, pure_eval, stack_data (MIT).
- **Utilisé par** : `outils/python/py-worker.js` (worker module ; jamais sur le thread de la page).

## Contenu (≈ 27 Mo)

| Groupe | Fichiers |
|---|---|
| Cœur | `pyodide.mjs`, `pyodide.asm.mjs`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json` |
| numpy + matplotlib | numpy, matplotlib, contourpy, kiwisolver, pillow, fonttools, cycler, pyparsing, packaging, python_dateutil, pytz, six (`.whl`) |
| Erreurs en français | friendly_traceback 0.7.61 (PyPI, absent du lock : chargé par URL), asttokens, executing, pure_eval, stack_data |

scipy (14 Mo) est présent depuis le 17/10/2026 pour les niveaux 4 et 5 : `py-worker.js` ne le télécharge que si le code l’importe. Volontairement absents : micropip,
`pyodide.js` (workers classiques non supportés depuis 314), `python`, `python.exe`, `*.d.ts`, `package.json`.
Aucun fichier n'est chargé depuis un CDN : la résolution des paquets passe par `pyodide-lock.json` local.

🔴 `pyodide-lock.json` est réintégré par `vendor/pyodide/.gitignore` : le `.gitignore` racine exclut `*.json`
(données d'élèves), ce qui l'aurait retiré de GitHub Pages et cassé le chargement de numpy.

## Mettre à jour

1. Télécharger `pyodide-core-<version>.tar.bz2` sur https://github.com/pyodide/pyodide/releases
   (cœur) et récupérer les wheels nommées dans le nouveau `pyodide-lock.json` (champ `file_name` de
   numpy, matplotlib et de leurs `depends`, puis six, asttokens, executing, pure-eval, stack-data) depuis
   l'archive complète `pyodide-<version>.tar.bz2`.
2. friendly_traceback : wheel `py3-none-any` depuis PyPI ; si son nom change, corriger `FRIENDLY_WHL`
   dans `outils/python/py-worker.js`.
3. Remplacer **tous** les fichiers d'un coup (le `.wasm`, le `.mjs` et le lock vont ensemble).
4. Rejouer le test du parcours (`outils/python/demo.html` : print, figure, NameError, boucle infinie).
5. Chaque mise à jour alourdit l'historique git de ~27 Mo : n'en faire qu'à bon escient.
