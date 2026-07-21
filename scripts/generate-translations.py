#!/usr/bin/env python3
"""Fetch the Minecraft en_us.json lang file and write a flat translations.json.

Run on demand:
    python scripts/generate-translations.py

Output: public/data/translations.json
"""

import json
import urllib.request
import sys
from pathlib import Path

LANG_URL = (
    "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/"
    "master/data/pc/1.21.4/language.json"
)
OUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "translations.json"

ITEM_PREFIXES = ("item.minecraft.", "block.minecraft.", "entity.minecraft.", "stat.minecraft.")


def fetch_lang() -> dict[str, str]:
    print(f"Fetching {LANG_URL} ...")
    with urllib.request.urlopen(LANG_URL) as resp:
        return json.loads(resp.read())


def extract_translations(lang: dict[str, str]) -> dict[str, str]:
    translations: dict[str, str] = {}
    for key, value in lang.items():
        for prefix in ITEM_PREFIXES:
            if key.startswith(prefix):
                id_ = key[len(prefix):]
                if "." not in id_:
                    translations[id_] = value
                break
    return translations


def extract_advancement_translations(lang: dict[str, str]) -> dict[str, str]:
    advancements: dict[str, str] = {}
    for key, value in lang.items():
        if key.startswith("advancements.") and key.endswith(".title"):
            path = key[len("advancements.") : -len(".title")].replace(".", "/")
            advancements[path] = value
    return advancements


def main() -> None:
    lang = fetch_lang()
    translations = extract_translations(lang)
    advancements = extract_advancement_translations(lang)

    merged = {**translations, **advancements}
    merged = dict(sorted(merged.items()))

    print(f"  {len(translations)} item/block/entity/stat translations")
    print(f"  {len(advancements)} advancement translations")
    print(f"  {len(merged)} total entries")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
