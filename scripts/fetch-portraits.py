#!/usr/bin/env python3
"""Lade gemeinfreie Porträts von Wikimedia Commons für den TRAUMAATLAS.

Nutzt die Commons-API (Suche im Datei-Namensraum) und lädt ein passendes
Thumbnail (max. 640px) nach src/assets/portraits/ herunter.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "portraits")
os.makedirs(OUT, exist_ok=True)

UA = {"User-Agent": "TRAUMAATLAS3-portrait-fetch/1.0 (educational art project)"}

# id -> Suchbegriff für die Commons-Suche
PEOPLE = {
    "freud": 'Sigmund Freud portrait',
    "jung": 'Carl Gustav Jung portrait',
    "adler": 'Alfred Adler portrait',
    "wundt": 'Wilhelm Wundt portrait',
    "reich": 'Wilhelm Reich portrait',
    "bowlby": 'John Bowlby portrait',
    "levine": 'Peter Levine somatic experiencing',
    "shapiro": 'Francine Shapiro EMDR',
    "porges": 'Stephen Porges polyvagal',
    "herman": 'Judith Lewis Herman trauma',
    "linehan": 'Marsha Linehan',
    "vanderkolk": 'Bessel van der Kolk',
    "rogers": 'Carl Rogers psychologist portrait',
    "perls": 'Fritz Perls portrait',
    "erikson": 'Erik Erikson portrait',
}

def api(params):
    params = dict(params, format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def search_files(term, limit=8):
    data = api({
        "action": "query", "generator": "search",
        "gsrsearch": term, "gsrnamespace": 6, "gsrlimit": limit,
        "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": 640,
    })
    pages = (data.get("query") or {}).get("pages") or {}
    out = []
    for p in pages.values():
        ii = (p.get("imageinfo") or [None])[0]
        if not ii:
            continue
        if ii.get("mime") not in ("image/jpeg", "image/png"):
            continue
        em = ii.get("extmetadata") or {}
        out.append({
            "title": p.get("title", ""),
            "thumb": ii.get("thumburl") or ii.get("url"),
            "w": ii.get("thumbwidth") or ii.get("width"),
            "h": ii.get("thumbheight") or ii.get("height"),
            "license": (em.get("LicenseShortName") or {}).get("value", ""),
            "artist": (em.get("Artist") or {}).get("value", ""),
            "credit": (em.get("Credit") or {}).get("value", ""),
        })
    return out

def download(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())

def main():
    only = sys.argv[1:] or list(PEOPLE)
    results = {}
    for pid in only:
        term = PEOPLE[pid]
        try:
            files = search_files(term)
        except Exception as e:
            print(f"{pid}: SEARCH ERROR {e}")
            files = []
        # Score: lieber hoch, lieber Portrait im Titel, keine Logos/Siegel
        def score(f):
            t = f["title"].lower()
            s = 0
            if "portrait" in t: s += 5
            if any(bad in t for bad in ("logo", "seal", "signature", "book", "cover", "stamp", "poster")): s -= 10
            if f["w"] and f["h"] and f["w"] >= 400: s += 3
            return s
        files.sort(key=score, reverse=True)
        results[pid] = files
        print(f"\n== {pid} ({term}) ==")
        for f in files[:4]:
            print(f"  [{f['license']}] {f['w']}x{f['h']} {f['title']}")
        if files:
            best = files[0]
            dest = os.path.join(OUT, f"{pid}.jpg")
            try:
                download(best["thumb"], dest)
                meta = {
                    "id": pid, "title": best["title"],
                    "file": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(best['title'])}",
                    "license": best["license"],
                }
                with open(os.path.join(OUT, f"{pid}.json"), "w") as mf:
                    json.dump(meta, mf, ensure_ascii=False, indent=2)
                print(f"  -> saved {dest} ({os.path.getsize(dest)//1024} KB)")
            except Exception as e:
                print(f"  -> DOWNLOAD ERROR {e}")
        time.sleep(0.5)
    with open(os.path.join(OUT, "_search-results.json"), "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
