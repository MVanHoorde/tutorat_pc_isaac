"""Captures d'écran de l'animation sur trois formats, et relevé des erreurs JavaScript.

Usage : python tests/captures.py index.html
Prérequis : pip install playwright && playwright install chromium
"""
import asyncio
import pathlib
import sys

from playwright.async_api import async_playwright

FORMATS = [(1280, 800, 1, "pc"), (1180, 820, 2, "tablette"), (390, 844, 3, "telephone")]
VUES = ["decroissance", "experience", "radioprotection", "missions", "apropos"]


async def main(page_path: str) -> None:
    url = pathlib.Path(page_path).resolve().as_uri()
    out = pathlib.Path(__file__).parent / "captures"
    out.mkdir(exist_ok=True)
    erreurs = []
    async with async_playwright() as p:
        navigateur = await p.chromium.launch()
        for largeur, hauteur, dpr, nom in FORMATS:
            page = await navigateur.new_page(viewport={"width": largeur, "height": hauteur}, device_scale_factor=dpr)
            page.on("pageerror", lambda e, n=nom: erreurs.append(f"{n} : {e}"))
            await page.goto(url + "#decroissance")
            await page.wait_for_timeout(600)
            for vue in VUES:
                await page.evaluate(f"location.hash = '{vue}'")
                await page.wait_for_timeout(400)
                await page.screenshot(path=str(out / f"{nom}-{vue}.png"))
            hauteurs = await page.evaluate("[document.documentElement.scrollHeight, innerHeight]")
            print(f"{nom} : hauteur de page {hauteurs[0]} px pour une fenêtre de {hauteurs[1]} px")
            await page.close()
        await navigateur.close()
    print("\n".join(erreurs) if erreurs else "Aucune erreur JavaScript.")
    print(f"Captures dans {out}")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "index.html"))
