#!/usr/bin/env python3
"""Langsame, robuste Nachzügler-Suche (Backoff bei 429)."""
import json, os, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "portraits")
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "TRAUMAATLAS3-portrait-fetch/1.0 (educational art project)"}

QUERIES = {
    "reich": 'intitle:"Wilhelm Reich"',
    "bowlby": 'John Bowlby psychoanalyst',
    "linehan": 'Marsha Linehan dialectical',
    "levine": '"Peter Levine" somatic',
    "shapiro": 'Francine Shapiro',
    "porges": 'Stephen Porges',
    "herman": '"Judith Herman"',
    "rogers": 'Carl Rogers psychologist',
    "perls": 'Fritz Perls gestalt',
    "erikson": 'Erik Erikson psychologist',
    "wundt": 'Wilhelm Wundt Leipzig photograph',
    "jung": '"C. G. Jung"',
}

def api(params, tries=5):
    params = dict(params, format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:
            wait = 8 * (i + 1)
            print(f"    retry in {wait}s ({e})")
            time.sleep(wait)
    return {}

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

def main():
    allres = {}
    for pid, term in QUERIES.items():
        files = search_files(term)
        allres[pid] = files
        print(f"\n===== {pid} [{term}] =====")
        for f in files[:8]:
            print(f"  [{f['license']}] {f['w']}x{f['h']} {f['title']}")
        time.sleep(6)
    with open(os.path.join(OUT, "_refined.json"), "w") as f:
        json.dump(allres, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
