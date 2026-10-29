#!/usr/bin/env python3
"""Summarise saved HTML pages: forms, fields, scripts, links, third parties.

No network access. Prints only structural facts; field values and any
credential-like strings are never printed (names/types only).

Usage:
    python3 scripts/analyze_html.py [evidence/html]
"""
import glob
import os
import re
import sys

PATTERNS = ["action=", "fetch\\(", "XMLHttpRequest", "gtag", "googletagmanager",
            "formspree", "web3forms", "mailto:", "csrf", "recaptcha", "hcaptcha",
            "localStorage", "sessionStorage"]


def main():
    directory = sys.argv[1] if len(sys.argv) > 1 else "evidence/html"
    files = sorted(glob.glob(os.path.join(directory, "*-r1.html")))
    if not files:
        print(f"No *-r1.html files in {directory}")
        return 1
    for path in files:
        html = open(path, errors="replace").read()
        forms = re.findall(r"<form[^>]*>", html, re.I)
        inputs = re.findall(r"<input[^>]*>", html, re.I)
        textareas = re.findall(r"<textarea[^>]*>", html, re.I)
        selects = re.findall(r"<select[^>]*>", html, re.I)
        scripts = re.findall(r'<script[^>]*src="([^"]+)"', html)
        links = re.findall(r'href="(/[^"]+)"', html)
        internal = sorted({l.split("#")[0].split("?")[0] for l in links
                           if l.startswith("/") and not l.startswith("/_next")})
        external = sorted(set(re.findall(r"https://([A-Za-z0-9.\-]+)/", html)))
        print(f"\n== {os.path.basename(path)} len={len(html)} "
              f"forms={len(forms)} inputs={len(inputs)} "
              f"textareas={len(textareas)} selects={len(selects)} ==")
        for f in forms:
            print(f"  FORM: {f[:400]}")
        for inp in inputs:
            name = re.search(r'name="([^"]+)"', inp)
            typ = re.search(r'type="([^"]+)"', inp)
            print(f"  INPUT: name={name.group(1) if name else '?'} "
                  f"type={typ.group(1) if typ else '?'}")
        print(f"  scripts ({len(scripts)}):")
        for s in scripts:
            print(f"    {s}")
        print(f"  internal links: {internal}")
        print(f"  external hosts in HTML: {external}")
        for pat in PATTERNS:
            count = len(re.findall(pat, html, re.I))
            if count:
                print(f"  contains {pat}: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
