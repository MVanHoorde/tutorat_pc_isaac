"""Assemble outils/python/niveau-3.html : remplace @@fichier.csv@@ par le contenu des données.
Ne pas modifier niveau-3.html à la main : modifier niveau-3.src.html (et data/), puis relancer
`python build.py` ici. Les données se régénèrent avec `python donnees.py` (graine fixe)."""
import pathlib, re
ICI = pathlib.Path(__file__).parent
s = (ICI / 'niveau-3.src.html').read_text(encoding='utf-8')
def sub(m):
    txt = (ICI / 'data' / m.group(1)).read_text(encoding='utf-8').strip('\n')
    return '\n'.join('        ' + l for l in txt.split('\n'))
s = re.sub(r'^@@([\w.-]+)@@$', sub, s, flags=re.M)
assert '@@' not in s
out = ICI.parent.parent / 'niveau-3.html'   # outils/python/niveau-3.html
out.write_text(s, encoding='utf-8', newline='\n')
print('écrit', out, len(s), 'caractères')
