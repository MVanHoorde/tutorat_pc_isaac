#!/usr/bin/env python3
"""
trombi_png_vers_liste.py — Lit les noms d'un trombinoscope en images (captures PNG)
avec l'OCR intégré à Windows, et écrit une liste à VÉRIFIER avant de créer les coupons.

Tout se passe sur le PC : l'OCR de Windows travaille hors ligne, rien n'est envoyé.

    python trombi_png_vers_liste.py capture1.png capture2.png --classe "1re spé 3"
        → liste_1re spé 3.csv   (Classe ; Nom ; Prénom ; Remarque)

Ensuite :
  1. ouvrir le CSV dans Excel, corriger les noms (accents !), supprimer les lignes
     qui ne sont pas des élèves, enregistrer en CSV (séparateur point-virgule) ;
  2. python generer_identifiants.py "liste_1re spé 3.csv" --sortie . --simulation

Si correspondance_resonance.xlsx est dans le dossier, chaque nom lu est comparé
au registre : la colonne Remarque signale les élèves qui y figurent déjà
(même sous une autre classe), avec l'orthographe du registre.

Par défaut, les noms ne s'affichent pas dans le terminal ; --afficher-noms pour les voir.

Dépendances (Windows 10/11) :
    pip install winrt-runtime winrt-Windows.Foundation winrt-Windows.Foundation.Collections ^
        winrt-Windows.Globalization winrt-Windows.Graphics.Imaging winrt-Windows.Media.Ocr ^
        winrt-Windows.Storage winrt-Windows.Storage.Streams
La langue « Français » doit être installée dans Windows (c'est le cas d'un Windows en français).
"""

import argparse
import asyncio
import csv
import difflib
import re
import sys
import unicodedata
from pathlib import Path
from statistics import median

REGISTRE = "correspondance_resonance.xlsx"
# Textes de mise en page qui ne sont jamais des noms d'élèves.
HORS_NOMS = re.compile(r"\d|:|@|trombi|classe|page|pronote|lyc[ée]e|groupe|ann[ée]e", re.I)


def masquer(texte):
    return "".join("9" if c.isdigit() else "A" if c.isupper() else "a" if c.islower() else c
                   for c in texte)


# --------------------------------------------------------------------------
# OCR de Windows : renvoie des lignes, chacune une liste de mots (texte, x, y, l, h)
# --------------------------------------------------------------------------

def ocr_windows(chemin):
    try:
        from winrt.windows.globalization import Language
        from winrt.windows.graphics.imaging import BitmapDecoder
        from winrt.windows.media.ocr import OcrEngine
        from winrt.windows.storage import FileAccessMode, StorageFile
    except ImportError:
        sys.exit("Il manque les modules de l'OCR de Windows : voir la commande pip en tête du script.")

    async def lire():
        fichier = await StorageFile.get_file_from_path_async(str(Path(chemin).resolve()))
        flux = await fichier.open_async(FileAccessMode.READ)
        image = await (await BitmapDecoder.create_async(flux)).get_software_bitmap_async()
        moteur = OcrEngine.try_create_from_language(Language("fr-FR")) \
            or OcrEngine.try_create_from_user_profile_languages()
        if moteur is None:
            sys.exit("Aucun moteur OCR : ajoutez la langue Français dans les paramètres de Windows.")
        resultat = await moteur.recognize_async(image)
        lignes = []
        for ligne in resultat.lines:
            mots = []
            for m in ligne.words:
                r = m.bounding_rect
                mots.append((m.text, r.x, r.y, r.width, r.height))
            if mots:
                lignes.append(mots)
        return lignes

    return asyncio.run(lire())


# --------------------------------------------------------------------------
# Des mots aux étiquettes « NOM Prénom »
# --------------------------------------------------------------------------

def etiquettes(lignes):
    """Découpe chaque ligne aux grands blancs (plusieurs élèves sur une rangée),
    puis recolle un NOM et un Prénom écrits l'un sous l'autre."""
    hauteurs = [h for l in lignes for (_, _, _, _, h) in l]
    if not hauteurs:
        return []
    h_type = median(hauteurs)
    morceaux = []
    for ligne in lignes:
        ligne = sorted(ligne, key=lambda m: m[1])
        courant = [ligne[0]]
        for prec, m in zip(ligne, ligne[1:]):
            if m[1] - (prec[1] + prec[3]) > 1.5 * h_type:
                morceaux.append(courant)
                courant = []
            courant.append(m)
        morceaux.append(courant)

    boites = []
    for mots in morceaux:
        x0 = min(m[1] for m in mots); y0 = min(m[2] for m in mots)
        x1 = max(m[1] + m[3] for m in mots); y1 = max(m[2] + m[4] for m in mots)
        boites.append({"texte": " ".join(m[0] for m in mots), "x0": x0, "y0": y0, "x1": x1, "y1": y1})
    boites.sort(key=lambda b: (b["y0"], b["x0"]))

    # NOM au-dessus, Prénom juste dessous, centrés l'un sur l'autre → une seule étiquette.
    pris, resultat = set(), []
    for i, b in enumerate(boites):
        if i in pris:
            continue
        if est_majuscules(b["texte"]):
            cx = (b["x0"] + b["x1"]) / 2
            for j, d in enumerate(boites):
                if j in pris or j == i:
                    continue
                if (0 <= d["y0"] - b["y1"] <= 1.2 * h_type
                        and abs((d["x0"] + d["x1"]) / 2 - cx) <= max(b["x1"] - b["x0"], d["x1"] - d["x0"]) / 2
                        and not est_majuscules(d["texte"])):
                    b = {**b, "texte": b["texte"] + " " + d["texte"], "y1": d["y1"]}
                    pris.add(j)
                    break
        pris.add(i)
        resultat.append(b["texte"])
    return resultat


def est_majuscules(texte):
    lettres = [c for c in texte if c.isalpha()]
    return bool(lettres) and all(c.isupper() for c in lettres)


def nom_prenom(texte):
    """Sépare les mots en MAJUSCULES (nom) des autres (prénom), quel que soit l'ordre."""
    mots = texte.split()
    nom = [m for m in mots if est_majuscules(m)]
    prenom = [m for m in mots if not est_majuscules(m)]
    return " ".join(nom), " ".join(prenom)


# --------------------------------------------------------------------------
# Comparaison au registre
# --------------------------------------------------------------------------

def sans_accents(s):
    s = unicodedata.normalize("NFD", " ".join(str(s or "").split()).casefold())
    return "".join(c for c in s if not unicodedata.combining(c)).replace("-", " ")


def lire_registre(chemin):
    if not chemin.exists():
        return []
    from openpyxl import load_workbook
    lignes = list(load_workbook(chemin).active.iter_rows(values_only=True))
    entete = list(lignes[0])
    return [dict(zip(entete, l)) for l in lignes[1:] if l and l[0]]


def rapprocher(nom, prenom, registre):
    """L'entrée du registre la plus proche (ratio ≥ 0,85), ou None."""
    cible = sans_accents(f"{nom} {prenom}")
    meilleur, score = None, 0.0
    for l in registre:
        r = difflib.SequenceMatcher(None, cible, sans_accents(f"{l.get('Nom')} {l.get('Prénom')}")).ratio()
        if r > score:
            meilleur, score = l, r
    return (meilleur, score) if score >= 0.85 else (None, score)


# --------------------------------------------------------------------------

def main():
    for flux in (sys.stdout, sys.stderr):
        try:
            flux.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    ap = argparse.ArgumentParser(description="Trombinoscope en images → liste de noms à vérifier.")
    ap.add_argument("images", nargs="+", help="captures PNG (ou JPG) d'UNE classe")
    ap.add_argument("--classe", required=True, help="nom de la classe, tel qu'il sera écrit dans le registre")
    ap.add_argument("--dossier", default=".", help="dossier du registre et de la liste produite")
    ap.add_argument("--afficher-noms", action="store_true", help="affiche les vrais noms dans le terminal")
    args = ap.parse_args()
    voir = (lambda s: s) if args.afficher_noms else masquer

    dossier = Path(args.dossier)
    registre = lire_registre(dossier / REGISTRE)
    lignes_csv, vus = [], set()
    print()
    for image in args.images:
        textes = etiquettes(ocr_windows(image))
        gardes = 0
        for t in textes:
            if HORS_NOMS.search(t) or len(t) < 3:
                continue
            nom, prenom = nom_prenom(t)
            remarque = []
            if not nom or not prenom:
                remarque.append("nom ou prénom non reconnu : à vérifier")
            if sans_accents(t) in vus:
                remarque.append("doublon (même nom lu deux fois : captures qui se chevauchent ?)")
            vus.add(sans_accents(t))
            if registre and nom and prenom:
                l, score = rapprocher(nom, prenom, registre)
                if l:
                    remarque.append(f"DÉJÀ AU REGISTRE en « {l.get('Classe')} » ({l.get('Identifiant')}) "
                                    f"sous « {l.get('Nom')} {l.get('Prénom')} »"
                                    + ("" if (str(l.get('Nom')), str(l.get('Prénom'))) == (nom, prenom)
                                       else " — orthographe différente, à comparer"))
            lignes_csv.append({"Classe": args.classe, "Nom": nom or t, "Prénom": prenom,
                               "Remarque": " ; ".join(remarque), "Image": Path(image).name})
            gardes += 1
        print(f"  {Path(image).name} : {gardes} nom(s) lu(s)")

    sortie = dossier / f"liste_{args.classe}.csv"
    with open(sortie, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["Classe", "Nom", "Prénom", "Remarque", "Image"], delimiter=";")
        w.writeheader()
        w.writerows(lignes_csv)

    deja = sum("DÉJÀ AU REGISTRE" in l["Remarque"] for l in lignes_csv)
    a_voir = sum(bool(l["Remarque"]) and "DÉJÀ" not in l["Remarque"] for l in lignes_csv)
    print(f"\n  {len(lignes_csv)} ligne(s) écrite(s) dans {sortie.resolve()}")
    if registre:
        print(f"      {deja} élève(s) ressemblent à des élèves déjà au registre")
    else:
        print(f"      ⚠  pas de {REGISTRE} dans ce dossier : aucune comparaison faite")
    print(f"      {a_voir} ligne(s) marquées « à vérifier »")
    for l in lignes_csv[:0 if args.afficher_noms else 3]:
        print(f"      exemple masqué : {voir(l['Nom'])} | {voir(l['Prénom'])}")
    print("\n  Ouvrez la liste dans Excel, corrigez les noms (accents compris), supprimez ce qui")
    print("  n'est pas un élève, puis enregistrez-la en CSV (séparateur : point-virgule).")
    print("  La liste contient des noms : à supprimer une fois les coupons faits.\n")


if __name__ == "__main__":
    main()
