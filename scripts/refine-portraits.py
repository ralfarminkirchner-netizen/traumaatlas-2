#!/usr/bin/env python3
"""Verfeinerte Suche für die Porträts, die beim ersten Lauf danebenlagen."""
import json, os, sys, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "portraits")
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "TRAUMAATLAS3-portrait-fetch/1.0 (educational art project)"}

QUERIES = {
    "reich": ['intitle:"Wilhelm Reich"'],
    "bowlby": ['intitle:"John Bowlby"'],
    "linehan": ['intitle:"Marsha Linehan"'],
    "levine": ['intitle:"Peter Levine" psychotherapy', '"Peter A. Levine"'],
    "shapiro": ['intitle:"Francine Shapiro"'],
    "porges": ['intitle:"Stephen Porges"'],
    "herman": ['intitle:"Judith Herman"'],
    "rogers": ['intitle:"Carl Rogers" psychologist', 'Carl Rogers client-centered'],
    "perls": ['intitle:"Fritz Perls"'],
    "erikson": ['intitle:"Erik Erikson"'],
    "wundt": ['intitle:"Wilhelm Wundt" photograph', 'intitle:"Wundt" Leipzig'],
    "jung": ['intitle:"Jung" 1920', 'intitle:"C. G. Jung"'],
}

def api(params):
    params = dict(params, format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def search_files(term, limit=10):
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
        if not ii or ii.get("mime") not in ("image/jpeg", "image/png"):
            continue
        em = ii.get("extmetadata") or {}
        out.append({
            "title": p.get("title", ""),
            "thumb": ii.get("thumburl") or ii.get("url"),
            "w": ii.get("thumbwidth") or ii.get("width"),
            "h": ii.get("thumbheight") or ii.get("height"),
            "license": (em.get("LicenseShortName") or {}).get("value", ""),
        })
    return out

def download(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())

def main():
    picks = {}  # pid -> title chosen by operator afterwards
    for pid, terms in QUERIES.items():
        print(f"\n===== {pid} =====")
        for t in terms:
            try:
                files = search_files(t)
            except Exception as e:
                print(f"  [{t}] ERROR {e}"); continue
            print(f"  [{t}]")
            for f in files[:6]:
                print(f"    [{f['license']}] {f['w']}x{f['h']} {f['title']}")
            time.sleep(0.3)
            if files:
                break

if __name__ == "__main__":
    main()
