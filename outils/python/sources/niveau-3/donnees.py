"""Construit les fichiers de données du niveau 3 (valeurs construites, bruit de pointage réaliste)."""
import numpy as np, pathlib
ICI = pathlib.Path(__file__).parent / 'data'
ICI.mkdir(exist_ok=True)
rng = np.random.default_rng(2026)

def ecrire(nom, entete, cols, fmts):
    lignes = [entete] + [';'.join(f % v for f, v in zip(fmts, ligne)) for ligne in zip(*cols)]
    (ICI / nom).write_text('\n'.join(lignes) + '\n', encoding='utf-8')
    print(nom, len(lignes) - 1, 'lignes')

g = 9.81
# 1. chute d'une balle lâchée, pointage vidéo 25 images/s, au mm près
t = np.round(np.arange(0, 0.53, 0.04), 2)
y = 1.500 - 0.5 * g * t**2 + rng.normal(0, 0.0015, t.size)
y[0] = 1.500
ecrire('chute.csv', 't (s);y (m)', [t, y], ['%.2f', '%.3f'])

# 2. lancer de ballon : v0 = 7,0 m/s, 55 degrés, depuis (0 ; 2,00 m), 20 images/s
t2 = np.round(np.arange(0, 1.001, 0.05), 2)
a = np.radians(55)
x2 = 7.0 * np.cos(a) * t2 + rng.normal(0, 0.002, t2.size)
y2 = 2.00 + 7.0 * np.sin(a) * t2 - 0.5 * g * t2**2 + rng.normal(0, 0.002, t2.size)
x2[0], y2[0] = 0.0, 2.000
ecrire('lancer.csv', 't (s);x (m);y (m)', [t2, x2, y2], ['%.2f', '%.3f', '%.3f'])

# 3. satellite : a = 24 000 km, e = 0,3, positions toutes les 1000 s (Kepler résolu numériquement)
GM = 3.986e14
A, e = 24000e3, 0.3
T = 2 * np.pi * np.sqrt(A**3 / GM)
ts = np.arange(0, 36001, 1000.0)
M = 2 * np.pi * ts / T
E = M.copy()
for _ in range(50):
    E = E - (E - e * np.sin(E) - M) / (1 - e * np.cos(E))
xs = A * (np.cos(E) - e) / 1e3            # km, Terre au foyer (origine)
ys = A * np.sqrt(1 - e**2) * np.sin(E) / 1e3
ecrire('satellite.csv', 't (s);x (km);y (km)', [ts, xs, ys], ['%.0f', '%.0f', '%.0f'])
print('période du satellite', T, 's')

# 4. cinétique (sujet 49) : A(t), ordre 1, k = 2,5e-3 s-1, Af = 0,850, toutes les 20 s pendant 10 min
tc = np.arange(0, 601, 20.0)
Af, k = 0.850, 2.5e-3
Ac = Af * (1 - np.exp(-k * tc)) + rng.normal(0, 0.002, tc.size)
Ac[0] = 0.000
ecrire('absorbance.csv', 't (s);A', [tc, Ac], ['%.0f', '%.3f'])

# 5. Kepler, troisième loi : planètes (NASA, fiches planétaires)
# a en UA, T en années ; on convertit dans l'exercice
# 6. radioactivité : baryum 137m, comptages sur 10 s toutes les 30 s
tr = np.arange(0, 601, 30.0)
lam = np.log(2) / 153.0
Nr = rng.poisson(900 * np.exp(-lam * tr))
ecrire('comptages.csv', 't (s);N (coups en 10 s)', [tr, Nr], ['%.0f', '%d'])

# 7. plongeon (sujet 34) : chute libre depuis 58,8 m, 25 images/s ... on garde 1 image sur 4 (0,16 s)
tp = np.round(np.arange(0, 3.37, 0.16), 2)
zp = 58.8 - 0.5 * g * tp**2 + rng.normal(0, 0.06, tp.size)
zp[0] = 58.80
ecrire('plongeon.csv', 't (s);z (m)', [tp, zp], ['%.2f', '%.2f'])
