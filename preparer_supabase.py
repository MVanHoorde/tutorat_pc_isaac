#!/usr/bin/env python3
"""
preparer_supabase.py — Prépare l'import des comptes Résonance dans Supabase.

1. Lit tous les comptes_serveur_*.csv du dossier (produits par generer_identifiants.py).
2. Crée, si demandé, des comptes enseignants (identifiants PR-XXXXX) avec leurs classes :
   ils sont ajoutés au registre de correspondance et reçoivent un coupon.
3. Écrit import_supabase_AAAAMMJJ-HHMM.sql, à coller dans Supabase → SQL Editor → Run.

Le fichier SQL ne contient aucun nom : identifiants, classes et empreintes de mots de passe.
Il peut être recréé et recollé sans risque : les comptes déjà présents sont ignorés.

    python preparer_supabase.py --dossier "C:/Users/.../OneDrive/Résonance"
    python preparer_supabase.py --dossier "..." --enseignant "VAN HOORDE Loïc" --classes "Première 2" "Terminale 1"

Dépendances : celles de generer_identifiants.py (dans le même dossier).
"""

import argparse
import csv
import sys
from datetime import datetime
from pathlib import Path

from generer_identifiants import (REGISTRE, ecrire_coupons, ecrire_registre, empreinte, lire_registre,
                                  masquer, nouveau_mot_de_passe, nouvel_identifiant, separer_nom_prenom)

CLASSE_PROF = "Enseignant"


def sql(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"


def tableau(valeurs):
    return "array[" + ", ".join(sql(v) for v in valeurs) + "]::text[]" if valeurs else "'{}'::text[]"


def ligne_insert(identifiant, role, classe, classes, emp):
    return (f"insert into public.comptes_import (identifiant, role, classe, classes, empreinte)\n"
            f"  select {sql(identifiant)}, {sql(role)}, {sql(classe)}, {tableau(classes)}, {sql(emp)}\n"
            f"  where not exists (select 1 from public.profils where identifiant = {sql(identifiant)})\n"
            f"  on conflict (identifiant) do nothing;")


def main():
    for flux in (sys.stdout, sys.stderr):
        try:
            flux.reconfigure(encoding="utf-8")
        except AttributeError:
            pass
    ap = argparse.ArgumentParser(description="Prépare l'import des comptes Résonance dans Supabase.")
    ap.add_argument("--dossier", default="sortie_resonance", help="dossier de sortie de generer_identifiants.py")
    ap.add_argument("--enseignant", help="crée un compte enseignant : « NOM Prénom »")
    ap.add_argument("--classes", nargs="+", default=[], help="classes de cet enseignant, telles qu'écrites dans le registre")
    args = ap.parse_args()
    if args.classes and not args.enseignant:
        sys.exit("--classes s'utilise avec --enseignant.")

    dossier = Path(args.dossier)
    maintenant = datetime.now()
    horodatage = maintenant.strftime("%Y%m%d-%H%M")
    registre = lire_registre(dossier / REGISTRE)
    lignes_sql = []

    # --- comptes enseignants existants ou nouveaux (les empreintes sont dans les CSV) ---
    if args.enseignant:
        classes_connues = {str(l["Classe"]) for l in registre if l["Classe"] != CLASSE_PROF}
        inconnues = [c for c in args.classes if c not in classes_connues]
        if inconnues:
            print(f"\n  ⚠  classe(s) absente(s) du registre : {', '.join(inconnues)}")
            print(f"     classes connues : {', '.join(sorted(classes_connues)) or '(aucune)'}\n")
        nom, prenom = separer_nom_prenom(args.enseignant)
        if any(l["Classe"] == CLASSE_PROF and l["Nom"] == nom and l["Prénom"] == prenom for l in registre):
            sys.exit("Cet enseignant a déjà un compte dans le registre.")
        pris = {l["Identifiant"] for l in registre}
        mdp = nouveau_mot_de_passe()
        compte = {"Identifiant": nouvel_identifiant(pris).replace("PC-", "PR-", 1), "Classe": CLASSE_PROF,
                  "Nom": nom or args.enseignant, "Prénom": prenom,
                  "Ajouté le": maintenant.strftime("%d/%m/%Y %H:%M"),
                  "Source": "classes : " + ", ".join(args.classes), "mdp": mdp}
        dossier.mkdir(parents=True, exist_ok=True)
        ecrire_registre(dossier / REGISTRE, registre + [compte])
        ecrire_coupons(dossier / f"coupon_enseignant_{horodatage}.pdf", [compte])
        with open(dossier / f"comptes_serveur_{horodatage}_prof.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f, delimiter=";")
            w.writerow(["identifiant", "classe", "empreinte_mot_de_passe", "role", "classes"])
            w.writerow([compte["Identifiant"], "", empreinte(mdp), "prof", "|".join(args.classes)])
        print(f"\n  Compte enseignant créé : {compte['Identifiant']}  ({masquer(args.enseignant)})")
        print(f"      classes : {', '.join(args.classes) or '(aucune)'}")
        print(f"      coupon  : coupon_enseignant_{horodatage}.pdf (mot de passe dessus) — à supprimer après usage")

    # --- lecture de tous les CSV serveur ---
    fichiers = sorted(dossier.glob("comptes_serveur_*.csv"))
    if not fichiers:
        sys.exit(f"Aucun comptes_serveur_*.csv dans {dossier.resolve()}")
    vus = set()
    for chemin in fichiers:
        with open(chemin, encoding="utf-8") as f:
            for l in csv.DictReader(f, delimiter=";"):
                ident = l["identifiant"].strip()
                if ident in vus:
                    continue
                vus.add(ident)
                role = l.get("role") or "eleve"
                classes = [c for c in (l.get("classes") or "").split("|") if c]
                lignes_sql.append(ligne_insert(ident, role, l["classe"] or None, classes, l["empreinte_mot_de_passe"]))

    sortie = dossier / f"import_supabase_{horodatage}.sql"
    with open(sortie, "w", encoding="utf-8") as f:
        f.write("-- Résonance — import des comptes (aucun nom). Coller dans Supabase → SQL Editor → Run.\n")
        f.write(f"-- Généré le {maintenant:%d/%m/%Y %H:%M} à partir de {len(fichiers)} fichier(s).\n\n")
        f.write("\n\n".join(lignes_sql) + "\n")
    nb_prof = sum(1 for s in lignes_sql if "'prof'" in s)
    print(f"\n  {len(lignes_sql)} compte(s) dans {sortie.name} ({len(lignes_sql) - nb_prof} élève(s), {nb_prof} enseignant(s))")
    print(f"  → Supabase → SQL Editor → New query → coller le contenu → Run\n")


if __name__ == "__main__":
    main()
