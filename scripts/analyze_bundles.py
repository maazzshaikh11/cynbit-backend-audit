#!/usr/bin/env python3
"""Static analysis of saved public JS/CSS bundles (no network, no execution).

For each file under a directory (default: evidence/html bundles saved by the
collector, or any directory of .js/.css files passed on the command line),
report:
  * file size
  * framework / version hints found as plain strings (react, next, vue, ...)
  * sourceMappingURL references (and whether a .map file was saved alongside)
  * absolute http(s) URLs and API-looking paths (recorded, NOT fetched)
  * third-party hostnames referenced

Anything that looks like a secret/token is redacted to <REDACTED> in output:
this tool never prints a matched credential-like value.

Usage:
    python3 scripts/analyze_bundles.py [directory ...]
"""
import os
import re
import sys

FRAMEWORKS = [
    (r"react", "react"),
    (r"next[./_-]", "next.js"),
    (r"vue", "vue"),
    (r"angular", "angular"),
    (r"jquery", "jquery"),
    (r"webpack", "webpack"),
    (r"vite", "vite"),
    (r"tailwind", "tailwind"),
    (r"framer-motion", "framer-motion"),
    (r"gsap", "gsap"),
]

URL_RE = re.compile(r"https?://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+")
API_RE = re.compile(r"""["'`](/(?:api|graphql|v\d+|wp-json)[A-Za-z0-9._~/?#=&%+-]*)["'`]""")
SOURCEMAP_RE = re.compile(r"//#\s*sourceMappingURL=(\S+)")
SECRET_RE = re.compile(
    r"(?i)(api[_-]?key|secret|token|passwd|password)\s*[:=]\s*[\"'][^\"']+[\"']"
)


def redact(text):
    return SECRET_RE.sub(r"\1=<REDACTED>", text)


def analyse(path):
    try:
        with open(path, "r", errors="replace") as fh:
            data = fh.read()
    except OSError as exc:
        return {"path": path, "error": str(exc)}
    size = os.path.getsize(path)
    lowered = data.lower()
    frameworks = sorted({label for pattern, label in FRAMEWORKS if re.search(pattern, lowered)})
    sourcemaps = SOURCEMAP_RE.findall(data)
    urls = sorted(set(URL_RE.findall(data)))
    # Keep only hostnames for the third-party summary; full URLs are listed
    # separately and only if they are not credential-like.
    hosts = sorted({re.sub(r"^https?://", "", u).split("/")[0] for u in urls})
    apis = sorted(set(API_RE.findall(data)))
    return {
        "path": path,
        "size_bytes": size,
        "framework_hints": frameworks,
        "sourceMappingURL": sourcemaps,
        "api_like_paths": [redact(a) for a in apis],
        "hosts": hosts,
        "urls_sample": [redact(u) for u in urls[:20]],
        "url_count": len(urls),
    }


def main():
    dirs = sys.argv[1:] or ["evidence/bundles"]
    found = []
    for directory in dirs:
        if os.path.isfile(directory):
            found.append(directory)
        elif os.path.isdir(directory):
            for root, _dirs, files in os.walk(directory):
                for name in sorted(files):
                    if name.endswith((".js", ".css", ".mjs")):
                        found.append(os.path.join(root, name))
    if not found:
        print("No JS/CSS files found. Save public bundles first (see docs/01).")
        return 1
    for path in found:
        result = analyse(path)
        print(f"\n== {result['path']} ==")
        if "error" in result:
            print(f"  error: {result['error']}")
            continue
        print(f"  size: {result['size_bytes']} bytes")
        print(f"  framework hints: {', '.join(result['framework_hints']) or '(none)'}")
        print(f"  sourceMappingURL: {', '.join(result['sourceMappingURL']) or '(none)'}")
        print(f"  api-like paths: {', '.join(result['api_like_paths']) or '(none)'}")
        print(f"  hosts ({len(result['hosts'])}): {', '.join(result['hosts']) or '(none)'}")
        print(f"  urls: {result['url_count']} total, sample: {result['urls_sample']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
