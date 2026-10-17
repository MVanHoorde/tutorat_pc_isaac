# Prélude du parcours Python — chargé une fois par py-worker.js, dans le worker (jamais sur la page).
# Exécute le code de l'élève dans un espace de noms neuf (script) ou persistant (console),
# arrête les boucles infinies (garde-temps), produit les figures matplotlib en PNG,
# et rédige un message d'erreur COURT en français (vouvoiement) + l'explication de friendly-traceback.
import sys, io, re, time, traceback, tokenize, ast, builtins, warnings, contextlib
import js
from pyodide.ffi import to_js

FICHIERS = ('<eleve>', '<console>')
DUREE_MAX = 5.0            # secondes de calcul Python avant arrêt
_consoles = {}             # espaces de noms des consoles, par clé
_dernier_ns = None         # espace de noms du dernier script, pour le check
_derniere_figure = None    # dernière figure envoyée par plt.show(), pour le check
_FRIENDLY = False
_MPL = False


class TempsDepasse(BaseException):
    """BaseException : un « except Exception » de l'élève ne l'attrape pas."""


class InputIndisponible(Exception):
    pass


def _input(*args, **kwargs):
    raise InputIndisponible("input() n'est pas disponible dans ce parcours")


# ---------- garde-temps (pas de SharedArrayBuffer sur GitHub Pages) ----------
_limite = [0.0]
_compteur = [0]

def _trace_ligne(frame, event, arg):
    if event == 'line':
        _compteur[0] += 1
        if _compteur[0] >= 2000:
            _compteur[0] = 0
            if time.monotonic() > _limite[0]:
                raise TempsDepasse()
    return _trace_ligne

def _trace(frame, event, arg):
    # on ne trace que le code de l'élève : les bibliothèques gardent leur vitesse
    if frame.f_code.co_filename in FICHIERS:
        return _trace_ligne
    return None

def _armer():
    _limite[0] = time.monotonic() + DUREE_MAX
    _compteur[0] = 0
    sys.settrace(_trace)

def _desarmer():
    sys.settrace(None)


# ---------- matplotlib ----------
def preparer_matplotlib():
    global _MPL
    import os
    os.environ['MPLBACKEND'] = 'Agg'
    import matplotlib
    matplotlib.use('Agg')
    warnings.filterwarnings('ignore', category=matplotlib.MatplotlibDeprecationWarning)
    import matplotlib.pyplot as plt
    plt.show = _montrer
    _MPL = True

def _montrer(*args, _fermer=True, **kwargs):
    # plt.show() envoie les figures puis les ferme ; en fin de script on les garde ouvertes
    # pour que le check puisse les inspecter (plt.gca()…) — elles sont fermées au run suivant.
    if 'matplotlib.pyplot' not in sys.modules:
        return
    plt = sys.modules['matplotlib.pyplot']
    for num in plt.get_fignums():
        fig = plt.figure(num)
        buf = io.BytesIO()
        # dpi 200 : net sur écran Retina, affiché à la moitié de sa largeur en pixels CSS
        fig.savefig(buf, format='png', dpi=200, bbox_inches='tight')
        data = buf.getvalue()
        largeur = int.from_bytes(data[16:20], 'big')
        hauteur = int.from_bytes(data[20:24], 'big')
        js.ppFigure(to_js(data), largeur, hauteur)
        global _derniere_figure
        _derniere_figure = fig
    if _fermer:
        plt.close('all')

def _mpl_neuf():
    global _derniere_figure
    _derniere_figure = None
    if 'matplotlib.pyplot' in sys.modules:
        import matplotlib
        plt = sys.modules['matplotlib.pyplot']
        plt.close('all')
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            matplotlib.rcdefaults()
        plt.show = _montrer


# ---------- friendly-traceback ----------
def preparer_friendly():
    global _FRIENDLY, ft
    try:
        import friendly_traceback as ft
        ft.set_lang('fr')
        ft.exclude_file_from_traceback('<exec>')
        ft.exclude_file_from_traceback(__file__)
        # sans le traceback anglais (le message brut est affiché à part), avec la suggestion
        try:
            from friendly_traceback import base_formatters as bf
            bf.items_groups['pp'] = set(bf.items_groups['no_tb']) | {'suggest'}
            ft._include_choices.append('pp')
            ft.set_include('pp')
        except Exception:
            pass
        _FRIENDLY = True
    except Exception:
        _FRIENDLY = False


def imports(src):
    try:
        from pyodide.code import find_imports
        return list(find_imports(src))
    except Exception:
        return []


# ---------- analyse du code source ----------
_GUILLEMETS = {'’': ("'", '’'), '‘': ("'", '‘'), '“': ('"', '“'),
               '”': ('"', '”'), '«': ('"', '«'), '»': ('"', '»'),
               '„': ('"', '„'), '′': ("'", '′')}

def _virgules_decimales(src):
    """Repère 2,25 (chiffres collés de part et d'autre de la virgule), hors chaînes et commentaires."""
    trouves = []
    try:
        toks = list(tokenize.generate_tokens(io.StringIO(src).readline))
    except Exception:
        return trouves
    for a, b, c in zip(toks, toks[1:], toks[2:]):
        if (a.type == tokenize.NUMBER and b.type == tokenize.OP and b.string == ','
                and c.type == tokenize.NUMBER and a.end == b.start
                and b.end == c.start and '.' not in a.string):
            trouves.append((a.start[0], a.string + ',' + c.string))
    return trouves

def _chapeaux(src):
    try:
        toks = list(tokenize.generate_tokens(io.StringIO(src).readline))
    except Exception:
        return []
    return [t.start[0] for t in toks if t.type == tokenize.OP and t.string in ('^', '^=')]

def _assigne_plus_loin(src, nom, ligne):
    try:
        arbre = ast.parse(src)
    except Exception:
        return False
    for n in ast.walk(arbre):
        if isinstance(n, ast.Name) and n.id == nom and isinstance(n.ctx, ast.Store):
            if ligne is None or n.lineno > ligne:
                return True
        if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.name == nom:
            if ligne is None or n.lineno > ligne:
                return True
    return False

def _noms_definis(src, ns):
    noms = set(k for k in ns if not k.startswith('_'))
    try:
        for n in ast.walk(ast.parse(src)):
            if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store):
                noms.add(n.id)
    except Exception:
        pass
    return noms

_MATH = {'sqrt', 'pi', 'log', 'log10', 'exp', 'sin', 'cos', 'tan', 'e', 'radians', 'degrees', 'atan', 'asin', 'acos'}

# ---------- mots réservés et fonctions intégrées écrasées ----------
# Nom de remplacement proposé pour chaque mot réservé (keyword.kwlist).
_AUTRE_NOM = {
    'lambda': 'lam', 'class': 'classe', 'def': 'defaut', 'in': 'entree', 'is': 'etat', 'and': 'et',
    'or': 'ou', 'not': 'non', 'del': 'delta', 'pass': 'passe', 'return': 'retour', 'yield': 'rendement',
    'global': 'total', 'with': 'avec', 'as': 'a_s', 'from': 'depart', 'while': 'tant_que', 'try': 'essai',
    'except': 'sauf', 'finally': 'enfin', 'raise': 'hausse', 'assert': 'test', 'break': 'pause',
    'continue': 'suite', 'elif': 'sinon_si', 'else': 'sinon', 'if': 'si', 'for': 'pour', 'import': 'module',
    'True': 'vrai', 'False': 'faux', 'None': 'rien', 'nonlocal': 'local', 'async': 'asynchrone',
    'await': 'attente',
}
_AFFECTATIONS = {'=', '+=', '-=', '*=', '/=', '//=', '%=', '**=', ':='}

def _mot_reserve_affecte(texte_ligne):
    """Renvoie le mot réservé employé comme nom de variable sur cette ligne (lambda = 0.68), sinon None."""
    import keyword
    try:
        toks = [t for t in tokenize.generate_tokens(io.StringIO(texte_ligne + '\n').readline)
                if t.type not in (tokenize.NL, tokenize.NEWLINE, tokenize.INDENT, tokenize.DEDENT,
                                  tokenize.COMMENT, tokenize.ENDMARKER)]
    except Exception:
        toks = []
        m = re.match(r'\s*([A-Za-z_]\w*)\s*(?:[-+*/%]|//|\*\*)?=(?!=)', texte_ligne)
        if m and keyword.iskeyword(m.group(1)):
            return m.group(1)
        return None
    for a, b in zip(toks, toks[1:]):
        if a.type == tokenize.NAME and keyword.iskeyword(a.string) and b.type == tokenize.OP and b.string in _AFFECTATIONS:
            return a.string
    # « a, lambda = 1, 2 » : un mot réservé juste après une virgule, avant le =
    if any(t.type == tokenize.OP and t.string == '=' for t in toks):
        avant = []
        for t in toks:
            if t.type == tokenize.OP and t.string == '=':
                break
            avant.append(t)
        for a, b in zip(avant, avant[1:]):
            if a.type == tokenize.OP and a.string == ',' and b.type == tokenize.NAME and keyword.iskeyword(b.string):
                return b.string
    return None

def _message_mot_reserve(mot):
    return ("« %s » est un mot réservé de Python : il ne peut pas servir de nom de variable. "
            "Choisissez un autre nom, par exemple %s." % (mot, _AUTRE_NOM.get(mot, mot + '_')))

# Fonctions intégrées que les élèves écrasent le plus souvent en nommant une variable.
_INTEGREES = ('print', 'round', 'type', 'sum', 'max', 'min', 'len', 'list', 'abs', 'int', 'float', 'str',
              'range', 'pow', 'sorted', 'dict', 'set', 'tuple', 'bool', 'zip', 'map', 'id', 'format')
_mode = ['script']

def _integrees_ecrasees(src):
    """[(ligne, nom)] : première affectation qui écrase chaque fonction intégrée courante."""
    vus = {}
    try:
        arbre = ast.parse(src)
    except Exception:
        return []
    for n in ast.walk(arbre):
        if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store) and n.id in _INTEGREES:
            vus[n.id] = min(vus.get(n.id, n.lineno), n.lineno)
    return sorted((l, nom) for nom, l in vus.items())


# ---------- message court (vouvoiement) ----------
def message_court(exc, src, ligne, ns):
    t = type(exc).__name__
    m = str(exc)
    try:
        brut = ''.join(traceback.format_exception(exc))
    except Exception:
        brut = ''.join(traceback.format_exception_only(type(exc), exc))
    texte_ligne = ''
    if ligne:
        lignes = src.splitlines()
        if 0 < ligne <= len(lignes):
            texte_ligne = lignes[ligne - 1]
    virgules = _virgules_decimales(src)

    if isinstance(exc, TempsDepasse):
        return ("Le programme tournait encore après %d secondes : c'est sans doute une boucle infinie "
                "(une condition de while qui reste toujours vraie). Il a été arrêté." % DUREE_MAX)
    if isinstance(exc, InputIndisponible):
        return ("input() n'est pas disponible dans ce parcours : donnez directement la valeur à la "
                "variable, par exemple m = 2.5")

    if isinstance(exc, SyntaxError):
        # un mot réservé employé comme nom de variable : lambda = 0.68
        texte_err = texte_ligne or (getattr(exc, 'text', '') or '')
        mot = _mot_reserve_affecte(texte_err.rstrip('\n'))
        if mot:
            return _message_mot_reserve(mot)
        # caractères interdits venus du clavier
        mi = re.search(r"invalid character '(.)' \(U\+([0-9A-F]+)\)", m)
        if mi:
            car = mi.group(1)
            if car in _GUILLEMETS:
                droit, courbe = _GUILLEMETS[car]
                return ("Votre clavier a remplacé %s par %s : retapez les guillemets ou utilisez la "
                        "touche %s de la barre." % (droit, courbe, droit))
            if car == '…':
                return "Remplacez les … par votre propre code avant d'exécuter."
            if car in '×·':
                return "La multiplication s'écrit avec * en Python (et non %s)." % car
            if car in '−–—':
                return "Ce tiret n'est pas le signe moins de Python : retapez-le avec la touche - du clavier."
            if car in '²³':
                return "Les exposants s'écrivent avec ** en Python : x**2 et non x²."
            return "Le caractère %s n'est pas permis ici : effacez-le et retapez cette partie." % car
        if 'non-printable character' in m:
            return "Un caractère invisible (espace spéciale) s'est glissé dans la ligne : effacez les espaces et retapez-les."
        if isinstance(exc, IndentationError):
            if isinstance(exc, TabError) or 'inconsistent use of tabs' in m:
                return "Cette ligne mélange tabulations et espaces : utilisez seulement les touches ⇥ et ⇤."
            if 'expected an indented block' in m:
                return ("Après les deux-points :, la ligne suivante doit être décalée vers la droite "
                        "(touche ⇥).")
            if 'unexpected indent' in m:
                return "Cette ligne est décalée vers la droite alors qu'elle ne devrait pas l'être (touche ⇤)."
            if 'unindent does not match' in m:
                return ("Le décalage de cette ligne ne correspond à aucun bloc précédent : alignez-la "
                        "exactement sur les lignes de son bloc.")
            return "Le décalage (indentation) de cette ligne n'est pas correct."
        if 'was never closed' in m:
            c = m[1] if m.startswith("'") and len(m) > 1 else '('
            return "Une parenthèse ou un crochet %s ouvert ici n'est jamais refermé." % c
        if 'unterminated string literal' in m or 'unterminated triple-quoted' in m:
            return "Un texte est ouvert par un guillemet mais jamais refermé : ajoutez le guillemet de fin."
        if m.startswith('unmatched') or 'does not match opening parenthesis' in m:
            return "Une parenthèse ou un crochet fermant est en trop, ou ne correspond pas à celui ouvert."
        if "expected ':'" in m:
            return "Il manque les deux-points : à la fin de la ligne (après if, elif, else, for, while ou def)."
        if 'invalid decimal literal' in m:
            return ("Un nombre est collé à un nom (par exemple 2x) : écrivez la multiplication avec *, "
                    "comme 2*x, et ne commencez pas un nom de variable par un chiffre.")
        if "Maybe you meant '==' or ':='" in m or "Maybe you meant '=='" in m:
            return "Pour comparer deux valeurs, écrivez == ; un seul = sert à donner une valeur à une variable."
        if 'cannot assign to' in m:
            return ("À gauche du signe = il faut un seul nom de variable : écrivez x = 3, et non 3 = x "
                    "ou 2*x = 6.")
        if 'Perhaps you forgot a comma' in m:
            if virgules:
                pass
            return ("Python ne comprend pas cette ligne : il manque sans doute une virgule, un opérateur "
                    "(* pour multiplier) ou un guillemet.")
        if "'return' outside function" in m:
            return "return ne peut s'écrire qu'à l'intérieur d'une fonction (bloc décalé sous def)."
        if 'unexpected EOF' in m or 'incomplete input' in m:
            return "Le programme s'arrête au milieu d'une instruction : une parenthèse ou un bloc n'est pas terminé."
        return ("Python ne comprend pas l'écriture de cette ligne : vérifiez les parenthèses, les "
                "guillemets et les deux-points.")

    if isinstance(exc, NameError):
        nom = getattr(exc, 'name', None)
        if not nom:
            mm = re.search(r"name '(\w+)' is not defined", m)
            nom = mm.group(1) if mm else '?'
        connus = _noms_definis(src, ns)
        if nom == 'np':
            return "np n'est pas défini : ajoutez la ligne import numpy as np en haut du programme."
        if nom == 'plt':
            return "plt n'est pas défini : ajoutez la ligne import matplotlib.pyplot as plt en haut du programme."
        if nom in _MATH:
            return ("%s n'est pas défini : ajoutez from math import %s en haut du programme "
                    "(ou écrivez np.%s après import numpy as np)." % (nom, nom, nom))
        for k in connus:
            if k.lower() == nom.lower() and k != nom:
                return ("Le nom %s n'existe pas ; vouliez-vous dire %s ? Python distingue les "
                        "majuscules des minuscules." % (nom, k))
        if _assigne_plus_loin(src, nom, ligne):
            return ("La variable %s est utilisée avant d'avoir reçu une valeur : déplacez sa "
                    "définition plus haut dans le programme." % nom)
        sugg = re.search(r"Did you mean: '(\w+)'", brut)
        if sugg:
            return "Le nom %s n'existe pas : vouliez-vous dire %s ?" % (nom, sugg.group(1))
        if nom.lower() in ('true', 'false', 'none') and nom not in ('True', 'False', 'None'):
            return "Écrivez %s avec une majuscule." % nom.capitalize()
        if re.search(r"(print|input)\s*\(", texte_ligne) or re.search(r"=\s*" + re.escape(nom) + r"\s*$", texte_ligne):
            return ("Le nom %s n'est pas défini. S'il s'agit d'un texte, mettez-le entre guillemets : "
                    "'%s'." % (nom, nom))
        return ("Le nom %s n'est pas défini : vérifiez l'orthographe (majuscules comprises) ou "
                "définissez-le avant de l'utiliser." % nom)

    if isinstance(exc, TypeError):
        if virgules and ('tuple' in m or 'sequence' in m or 'argument' in m or 'unsupported operand' in m):
            return ("Python a lu %s comme deux nombres séparés par une virgule : en Python, la virgule "
                    "décimale s'écrit avec un point, %s." % (virgules[0][1], virgules[0][1].replace(',', '.')))
        if 'for ^' in m:
            return "En Python, la puissance s'écrit ** et non ^ : par exemple 10**3."
        if 'can only concatenate str' in m or ("'str'" in m and ('for +' in m or 'for -' in m)):
            return ("Vous combinez un texte (str) et un nombre : pour afficher, séparez-les par une virgule "
                    "dans print, ou convertissez avec str(…) ; pour calculer, convertissez le texte avec float(…).")
        if "can't multiply sequence by non-int" in m:
            return ("Vous multipliez un texte ou une liste par un nombre décimal : une liste Python ne se "
                    "calcule pas comme un vecteur. Utilisez un tableau numpy (np.array) ou une boucle.")
        if 'list' in m and ('unsupported operand' in m or 'must be real number' in m or 'can only concatenate list' in m):
            return ("Une liste Python ne se calcule pas comme un vecteur : transformez-la en tableau numpy "
                    "(np.array(…)) ou utilisez une boucle.")
        if 'must be real number, not str' in m or ("'str'" in m and 'unsupported operand' in m):
            return "Ce calcul porte sur un texte (str) : convertissez-le d'abord en nombre avec float(…)."
        if 'object is not callable' in m:
            # print = 3 … puis print(x) : la variable a remplacé la fonction
            for nom in _INTEGREES:
                if (nom in ns and ns[nom] is not getattr(builtins, nom, None)
                        and re.search(r'(?<![\w.])' + nom + r'\s*\(', texte_ligne or '')):
                    msg = ("Vous avez rangé une valeur dans une variable nommée %s, qui remplace la fonction "
                           "%s. Renommez la variable puis relancez." % (nom, nom))
                    if _mode[0] == 'console':
                        msg += " Dans la console, tapez aussi del %s pour retrouver la fonction." % nom
                    return msg
        if "'int' object is not callable" in m or "'float' object is not callable" in m:
            return ("Un nombre est suivi d'une parenthèse : la multiplication doit s'écrire avec *, "
                    "par exemple 2*(x+1).")
        if 'object is not callable' in m:
            return ("Vous utilisez comme une fonction quelque chose qui n'en est pas une (une variable "
                    "porte peut-être le nom d'une fonction, comme print ou max).")
        if 'positional argument' in m or 'takes' in m and 'given' in m:
            return "Le nombre de valeurs données entre parenthèses ne correspond pas à ce qu'attend la fonction."
        if 'not subscriptable' in m:
            return "Les crochets [ ] servent aux listes et aux textes : cet objet n'en est pas un."
        return "Cette opération est impossible avec ces types de données (texte, nombre, liste…)."

    if isinstance(exc, ZeroDivisionError):
        return "Division par zéro : la valeur au dénominateur vaut 0."
    if isinstance(exc, IndexError):
        return ("Vous demandez un élément qui n'existe pas : dans une liste de n éléments, les indices "
                "vont de 0 à n − 1.")
    if isinstance(exc, FileNotFoundError):
        nom = getattr(exc, 'filename', None) or ''
        if not nom:   # np.loadtxt : « mesure.csv not found. »
            mm = re.match(r"(\S+) not found", m)
            nom = mm.group(1) if mm else ''
        return ("Le fichier %s est introuvable : son nom doit être écrit exactement comme sur l'onglet 📄 "
                "sous l'éditeur, entre guillemets, avec son extension." % (nom or 'demandé'))
    if isinstance(exc, ModuleNotFoundError):
        mod = (getattr(exc, 'name', '') or '').split('.')[0]
        if mod == 'scipy':
            return "scipy n'a pas pu être téléchargé : vérifiez la connexion, puis relancez."
        if mod.lower() in ('numpy', 'matplotlib', 'math', 'random') and mod != mod.lower():
            return "Le nom du module s'écrit tout en minuscules : import %s." % mod.lower()
        return ("Le module %s n'est pas disponible ici : ce parcours propose math, random, numpy et "
                "matplotlib." % mod)
    if isinstance(exc, ImportError):
        return "Ce module ne contient pas ce nom : vérifiez l'orthographe de ce qui suit import."
    if isinstance(exc, ValueError):
        if 'math domain error' in m or 'expected a positive input' in m or 'expected a nonnegative input' in m:
            return ("Calcul impossible : logarithme d'un nombre négatif ou nul, ou racine carrée d'un "
                    "nombre négatif.")
        if re.search(r"could not convert string '.*' to float\d* at row", m):
            # np.loadtxt : ligne d'en-tête non sautée, mauvais séparateur ou virgule décimale
            return ("Une ligne du fichier n'a pas pu être lue comme des nombres : ligne d'en-tête à sauter "
                    "(skiprows=1), séparateur différent de celui du fichier (delimiter=';'), ou virgule "
                    "décimale à la place du point ?")
        if 'could not convert string to float' in m or 'invalid literal for int' in m:
            return ("Ce texte ne peut pas être converti en nombre (une virgule à la place du point ? "
                    "une lettre ?).")
        if 'must have same first dimension' in m:
            return "Les deux séries tracées n'ont pas le même nombre de valeurs."
        if 'too many values to unpack' in m or 'not enough values to unpack' in m:
            return "Il n'y a pas autant de variables à gauche du = que de valeurs à droite."
        return "Une fonction a reçu une valeur qu'elle ne peut pas traiter."
    if isinstance(exc, AttributeError):
        mm = re.search(r"has no attribute '(\w+)'", m)
        attr = mm.group(1) if mm else '?'
        return "Cet objet n'a pas d'élément nommé %s : vérifiez l'orthographe après le point." % attr
    if isinstance(exc, KeyError):
        return "Cette clé n'existe pas dans le dictionnaire."
    if isinstance(exc, RecursionError):
        return "La fonction s'appelle elle-même sans jamais s'arrêter."
    if isinstance(exc, OverflowError):
        return "Le résultat est trop grand pour être calculé."
    if isinstance(exc, (MemoryError,)):
        return "Le programme demande trop de mémoire."
    if isinstance(exc, KeyboardInterrupt):
        return "Exécution interrompue."
    return "Le programme s'est arrêté sur une erreur."


def _ligne_eleve(exc, fichier):
    if isinstance(exc, SyntaxError) and exc.filename == fichier:
        return exc.lineno
    n = None
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == fichier:
            n = tb.tb_lineno
        tb = tb.tb_next
    return n


def _nettoyer_friendly(texte):
    garde = []
    for l in texte.splitlines():
        if ('/lib/python' in l or 'site-packages' in l or '<exec>' in l or '/home/pyodide' in l
                or 'pp_prelude' in l or 'HOME:' in l):
            continue
        l = l.replace('File "<eleve>"', 'Votre programme').replace('File "<console>"', 'La console')
        l = l.replace("'<eleve>'", 'votre programme').replace('<eleve>', 'votre programme')
        l = l.replace('du fichier votre programme', 'de votre programme')
        l = l[4:] if l.startswith('    ') else l.lstrip(' ')
        garde.append(l)
    # pas plus de deux lignes vides de suite
    sortie, vides = [], 0
    for l in garde:
        vides = vides + 1 if not l.strip() else 0
        if vides <= 1:
            sortie.append(l)
    return '\n'.join(sortie).strip()


def _rapport(exc, src, fichier, ns):
    ligne = _ligne_eleve(exc, fichier)
    if isinstance(exc, TempsDepasse):
        brut = 'Arrêt après %d s de calcul (garde-temps du parcours)' % DUREE_MAX
    else:
        try:
            brut = ''.join(traceback.format_exception(exc)).strip().splitlines()[-1]
        except Exception:
            brut = ''.join(traceback.format_exception_only(type(exc), exc)).strip().splitlines()[-1]
    try:
        court = message_court(exc, src, ligne, ns)
    except Exception:
        court = "Le programme s'est arrêté sur une erreur."
    detail = ''
    if _FRIENDLY and not isinstance(exc, (TempsDepasse, InputIndisponible)):
        try:
            ft.explain_traceback(redirect='capture')
            detail = _nettoyer_friendly(ft.get_output())
        except Exception:
            detail = ''
    if isinstance(exc, TempsDepasse):
        nom = 'Boucle trop longue'
    elif isinstance(exc, InputIndisponible):
        nom = 'input() indisponible'
    else:
        nom = type(exc).__name__
    return {'type': nom, 'ligne': ligne, 'court': court, 'brut': brut, 'detail': detail}


def _remarques(src):
    notes = []
    for ligne, txt in _virgules_decimales(src):
        notes.append("Remarque, ligne %d : %s est lu comme deux nombres. La virgule décimale s'écrit avec un "
                     "point : %s." % (ligne, txt, txt.replace(',', '.')))
    for ligne in _chapeaux(src):
        notes.append("Remarque, ligne %d : ^ n'est pas la puissance en Python ; écrivez ** (10**3)." % ligne)
    for ligne, nom in _integrees_ecrasees(src):
        notes.append("Remarque, ligne %d : %s est le nom d'une fonction de Python. En y rangeant une valeur, "
                     "vous ne pouvez plus vous servir de %s : choisissez un autre nom." % (ligne, nom, nom))
    return notes


def _normaliser(src):
    # espaces insécables du clavier français : invisibles et refusées par Python
    for code in (0x00A0, 0x202F, 0x2007):   # chr() : caractères invisibles, illisibles dans le source
        src = src.replace(chr(code), " ")
    return src


def executer(src, mode, cle):
    """Renvoie un dict : {'erreur': {...}} ou {'remarques': [...]}"""
    global _dernier_ns
    src = _normaliser(src)
    _mode[0] = mode
    if mode == 'console':
        fichier = '<console>'
        ns = _consoles.get(cle)
        if ns is None:
            ns = {'__name__': '__main__', 'input': _input}
            _consoles[cle] = ns
    else:
        fichier = '<eleve>'
        ns = {'__name__': '__main__', 'input': _input}
        _dernier_ns = ns
        _mpl_neuf()
    if _FRIENDLY:
        try:
            from friendly_traceback.source_cache import cache
            cache.add(fichier, src)
        except Exception:
            pass
    try:
        if mode == 'console':
            arbre = ast.parse(src, fichier, 'exec')
            dernier = None
            if arbre.body and isinstance(arbre.body[-1], ast.Expr):
                dernier = ast.Expression(arbre.body.pop().value)
            _armer()
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter('ignore', SyntaxWarning)
                    code = compile(arbre, fichier, 'exec')
                exec(code, ns)
                if dernier is not None:
                    val = eval(compile(dernier, fichier, 'eval'), ns)
                    if val is not None:
                        ns['_'] = val
                        print(repr(val))
            finally:
                _desarmer()
        else:
            with warnings.catch_warnings():
                warnings.simplefilter('ignore', SyntaxWarning)
                code = compile(src, fichier, 'exec')
            _armer()
            try:
                exec(code, ns)
            finally:
                _desarmer()
        sys.stdout.flush()
        _montrer(_fermer=(mode == 'console'))
        return {'remarques': _remarques(src)}
    except BaseException as exc:
        _desarmer()
        try:
            sys.stdout.flush()
        except Exception:
            pass
        try:
            _montrer()
        except Exception:
            pass
        rap = _rapport(exc, src, fichier, ns)
        if 'matplotlib.pyplot' in sys.modules:
            sys.modules['matplotlib.pyplot'].close('all')
        return {'erreur': rap}


def verifier(check, sortie):
    """Exécute le check de l'auteur dans l'espace de noms du dernier script.
    Ne remonte JAMAIS d'erreur : en cas de problème, pas de verdict."""
    ns = _dernier_ns
    if ns is None:
        return None
    # Correction à plusieurs étapes : ok() peut être appelé plusieurs fois (un par question),
    # indice() compte une fois au plus. Les ok obtenus avant une erreur du check sont gardés.
    oks, indices = [], []
    def ok(msg='Bravo.'):
        m = str(msg)
        if m not in oks:
            oks.append(m)
    def indice(msg=''):
        if not indices:
            indices.append(str(msg))
    sauve = {k: ns.get(k) for k in ('ok', 'indice', '_sortie', '_figure')}
    ns['ok'], ns['indice'], ns['_sortie'] = ok, indice, sortie
    # La figure à inspecter : celle encore ouverte, sinon la dernière que plt.show() a fermée.
    ns['_figure'] = _derniere_figure
    if 'matplotlib.pyplot' in sys.modules and sys.modules['matplotlib.pyplot'].get_fignums():
        ns['_figure'] = sys.modules['matplotlib.pyplot'].gcf()
    try:
        _armer()
        # Un print de l'élève appelé par le check (sa fonction, par exemple)
        # ne doit pas s'ajouter à sa sortie.
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(_normaliser(check), '<check>', 'exec'), ns)
    except BaseException:
        pass
    finally:
        _desarmer()
        for k, v in sauve.items():
            if v is None:
                ns.pop(k, None)
            else:
                ns[k] = v
        try:
            if 'matplotlib.pyplot' in sys.modules:
                sys.modules['matplotlib.pyplot'].close('all')
        except Exception:
            pass
    if not oks and not indices:
        return None
    return {'oks': oks, 'indice': indices[0] if indices else None}


def oublier_console(cle):
    _consoles.pop(cle, None)
