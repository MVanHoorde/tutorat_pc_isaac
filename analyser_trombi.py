#!/usr/bin/env python3
"""
analyser_trombi.py — Relève la structure d'un trombinoscope PDF.

Produit un rapport lisible et un JSON exploitable décrivant la mise en page :
positions et dimensions des photos, blocs de texte, grille détectée,
association photo → texte.

Par défaut, le contenu textuel est MASQUÉ : chaque lettre devient A ou a,
chaque chiffre devient 9. La forme est conservée, la donnée disparaît.
Le rapport peut donc être partagé sans exposer d'information personnelle.

    python analyser_trombi.py trombi.pdf
    python analyser_trombi.py trombi.pdf --json structure.json
    python analyser_trombi.py trombi.pdf --brut        # texte réel, NE PAS partager

Dépendance : pymupdf
"""

import argparse
import json
import sys
from collections import Counter

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        sys.exit("Installez PyMuPDF :  pip install pymupdf")


# --------------------------------------------------------------------------
# Masquage
# --------------------------------------------------------------------------

def masquer(texte: str) -> str:
    """Conserve la forme du texte, remplace le contenu."""
    out = []
    for c in texte:
        if c.isdigit():
            out.append("9")
        elif c.isupper():
            out.append("A")
        elif c.islower():
            out.append("a")
        else:
            out.append(c)
    return "".join(out)


# --------------------------------------------------------------------------
# Détection de grille
# --------------------------------------------------------------------------

def grouper(valeurs, tolerance):
    """Regroupe des coordonnées proches. Retourne la liste des groupes triés."""
    if not valeurs:
        return []
    valeurs = sorted(valeurs)
    groupes = [[valeurs[0]]]
    for v in valeurs[1:]:
        if v - groupes[-1][-1] <= tolerance:
            groupes[-1].append(v)
        else:
            groupes.append([v])
    return groupes


def detecter_grille(rects, tolerance=12):
    """Déduit le nombre de lignes et de colonnes à partir des positions."""
    if not rects:
        return {"lignes": 0, "colonnes": 0, "regulier": False}
    lignes = grouper([r["y0"] for r in rects], tolerance)
    colonnes = grouper([r["x0"] for r in rects], tolerance)
    tailles = Counter((round(r["largeur"]), round(r["hauteur"])) for r in rects)
    taille_dominante, occurrences = tailles.most_common(1)[0]
    return {
        "lignes": len(lignes),
        "colonnes": len(colonnes),
        "taille_dominante_pt": {"largeur": taille_dominante[0],
                                "hauteur": taille_dominante[1]},
        "part_taille_dominante": round(occurrences / len(rects), 3),
        "regulier": len(lignes) * len(colonnes) >= len(rects),
    }


# --------------------------------------------------------------------------
# Association photo → texte
# --------------------------------------------------------------------------

def associer(image, blocs, marge_horizontale=0.6, hauteur_max=100):
    """
    Retourne les blocs de texte situés sous une image et alignés avec elle.
    marge_horizontale : tolérance latérale, en fraction de la largeur de l'image.
    hauteur_max : distance verticale maximale, en points.
    """
    cx = (image["x0"] + image["x1"]) / 2
    tol = image["largeur"] * marge_horizontale
    candidats = []
    for b in blocs:
        bcx = (b["x0"] + b["x1"]) / 2
        dy = b["y0"] - image["y1"]
        if 0 <= dy <= hauteur_max and abs(bcx - cx) <= tol:
            candidats.append((dy, b))
    candidats.sort(key=lambda t: t[0])
    return [b for _, b in candidats]


# --------------------------------------------------------------------------
# Analyse
# --------------------------------------------------------------------------

def analyser(chemin, brut=False):
    doc = fitz.open(chemin)
    transformer = (lambda s: s) if brut else masquer

    rapport = {
        "fichier": chemin.split("/")[-1],
        "masque": not brut,
        "pages": doc.page_count,
        "metadonnees": {k: v for k, v in (doc.metadata or {}).items() if v},
        "polices": [],
        "detail_pages": [],
    }

    polices = Counter()

    for num in range(doc.page_count):
        page = doc[num]
        info = {
            "page": num + 1,
            "format_pt": {"largeur": round(page.rect.width, 1),
                          "hauteur": round(page.rect.height, 1)},
            "rotation": page.rotation,
            "images": [],
            "blocs_texte": [],
        }

        # --- images ---
        vus = set()
        for img in page.get_images(full=True):
            xref, _, w_px, h_px = img[0], img[1], img[2], img[3]
            colorspace, filtre = img[5], img[8]
            try:
                rects = page.get_image_rects(xref)
            except Exception:
                rects = []
            for r in rects:
                cle = (xref, round(r.x0, 1), round(r.y0, 1))
                if cle in vus:
                    continue
                vus.add(cle)
                info["images"].append({
                    "xref": xref,
                    "x0": round(r.x0, 1), "y0": round(r.y0, 1),
                    "x1": round(r.x1, 1), "y1": round(r.y1, 1),
                    "largeur": round(r.width, 1),
                    "hauteur": round(r.height, 1),
                    "pixels": {"largeur": w_px, "hauteur": h_px},
                    "colorspace": colorspace,
                    "filtre": filtre,
                })

        # --- texte ---
        for bloc in page.get_text("dict")["blocks"]:
            if bloc.get("type") != 0:
                continue
            texte, tailles, noms = [], [], set()
            for ligne in bloc["lines"]:
                for span in ligne["spans"]:
                    if span["text"].strip():
                        texte.append(span["text"])
                        tailles.append(round(span["size"], 1))
                        noms.add(span["font"])
                        polices[span["font"]] += 1
            contenu = " ".join(texte).strip()
            if not contenu:
                continue
            x0, y0, x1, y1 = bloc["bbox"]
            info["blocs_texte"].append({
                "x0": round(x0, 1), "y0": round(y0, 1),
                "x1": round(x1, 1), "y1": round(y1, 1),
                "texte": transformer(contenu),
                "longueur": len(contenu),
                "taille_police": max(set(tailles), key=tailles.count) if tailles else None,
                "polices": sorted(noms),
                "majuscules": contenu.isupper(),
            })

        info["grille"] = detecter_grille(info["images"])

        # --- association ---
        assoc = []
        for im in info["images"]:
            sous = associer(im, info["blocs_texte"])
            assoc.append({
                "image_xref": im["xref"],
                "image_pos": [im["x0"], im["y0"]],
                "blocs_dessous": [
                    {"texte": b["texte"],
                     "dy": round(b["y0"] - im["y1"], 1),
                     "majuscules": b["majuscules"]}
                    for b in sous[:4]
                ],
            })
        info["associations"] = assoc
        info["images_sans_texte"] = sum(1 for a in assoc if not a["blocs_dessous"])

        rapport["detail_pages"].append(info)

    rapport["polices"] = [{"nom": n, "occurrences": c} for n, c in polices.most_common()]
    doc.close()
    return rapport


# --------------------------------------------------------------------------
# Affichage
# --------------------------------------------------------------------------

def afficher(r):
    print()
    print("=" * 68)
    print(f"  STRUCTURE DE  {r['fichier']}")
    print("=" * 68)
    print(f"  Pages          : {r['pages']}")
    print(f"  Texte masqué   : {'oui' if r['masque'] else 'NON — ne pas partager'}")
    if r["metadonnees"]:
        print("  Métadonnées    :")
        for k, v in r["metadonnees"].items():
            print(f"      {k:<14} {str(v)[:50]}")
    if r["polices"]:
        print("  Polices        :")
        for p in r["polices"][:6]:
            print(f"      {p['nom']:<34} {p['occurrences']} spans")

    for p in r["detail_pages"]:
        g = p["grille"]
        print()
        print("-" * 68)
        print(f"  PAGE {p['page']}   "
              f"{p['format_pt']['largeur']} × {p['format_pt']['hauteur']} pt"
              f"{'   (rotation ' + str(p['rotation']) + '°)' if p['rotation'] else ''}")
        print("-" * 68)
        print(f"  Images         : {len(p['images'])}")
        print(f"  Blocs de texte : {len(p['blocs_texte'])}")
        print(f"  Grille         : {g['lignes']} lignes × {g['colonnes']} colonnes"
              f"   ({'régulière' if g['regulier'] else 'IRRÉGULIÈRE'})")
        if p["images"]:
            t = g["taille_dominante_pt"]
            print(f"  Taille photo   : {t['largeur']} × {t['hauteur']} pt "
                  f"({int(g['part_taille_dominante'] * 100)} % des images)")
            px = p["images"][0]["pixels"]
            print(f"  Résolution     : {px['largeur']} × {px['hauteur']} px  "
                  f"({p['images'][0]['colorspace']}, {p['images'][0]['filtre']})")
        if p["images_sans_texte"]:
            print(f"  ⚠  {p['images_sans_texte']} image(s) sans texte associé "
                  "(logo, cadre, ou association à revoir)")

        if p["associations"]:
            print()
            print("  Aperçu des associations (5 premières) :")
            for a in p["associations"][:5]:
                pos = f"({a['image_pos'][0]:>6.1f}, {a['image_pos'][1]:>6.1f})"
                if not a["blocs_dessous"]:
                    print(f"      {pos}  →  (rien)")
                    continue
                for i, b in enumerate(a["blocs_dessous"][:3]):
                    fleche = "→" if i == 0 else " "
                    maj = "MAJ" if b["majuscules"] else "   "
                    tex = b["texte"][:38]
                    espace = pos if i == 0 else " " * len(pos)
                    print(f"      {espace}  {fleche}  dy={b['dy']:>5.1f}  {maj}  {tex}")
    print()
    print("=" * 68)
    if r["masque"]:
        print("  Rapport masqué : partageable sans risque.")
    else:
        print("  ⚠  MODE BRUT : ce rapport contient des données réelles.")
    print("=" * 68)
    print()


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(
        description="Relève la structure d'un trombinoscope PDF.")
    ap.add_argument("pdf", help="fichier PDF à analyser")
    ap.add_argument("--json", metavar="SORTIE", help="écrire le rapport en JSON")
    ap.add_argument("--brut", action="store_true",
                    help="conserver le texte réel (NE PAS PARTAGER)")
    args = ap.parse_args()

    rapport = analyser(args.pdf, brut=args.brut)
    afficher(rapport)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(rapport, f, ensure_ascii=False, indent=2)
        print(f"  JSON écrit dans {args.json}\n")


if __name__ == "__main__":
    main()
