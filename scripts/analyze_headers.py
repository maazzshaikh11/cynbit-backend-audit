#!/usr/bin/env python3
"""Parse saved response headers and produce a security-header scorecard.

Reads evidence/headers/*.headers.txt (curl -D output, which may contain
multiple response blocks when redirects were followed; the LAST block is
the final response) and prints a per-file table plus a summary count.

No network access. Usage:
    python3 scripts/analyze_headers.py [evidence/headers]
"""
import os
import re
import sys

CHECKED = [
    "strict-transport-security",
    "content-security-policy",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
    "cross-origin-opener-policy",
    "cross-origin-resource-policy",
    "cross-origin-embedder-policy",
    "cache-control",
    "set-cookie",
    "server",
    "x-powered-by",
    "content-encoding",
    "access-control-allow-origin",
    "x-vercel-cache",
    "age",
    "etag",
    "vary",
    "x-matched-path",
    "x-nextjs-prerender",
]

LEAKY = ("server", "x-powered-by", "x-aspnet-version", "x-generator")


def parse_headers(path):
    """Return (status_line, dict) for the LAST HTTP response block in a curl -D file."""
    with open(path, "r", errors="replace") as fh:
        text = fh.read()
    blocks = [b for b in text.split("\n\n") if b.startswith("HTTP/")]
    if not blocks:
        return "", {}
    last = blocks[-1]
    lines = last.splitlines()
    status = lines[0] if lines else ""
    headers = {}
    for line in lines[1:]:
        if ":" in line:
            name, value = line.split(":", 1)
            headers.setdefault(name.strip().lower(), []).append(value.strip())
    return status, headers


def main():
    directory = sys.argv[1] if len(sys.argv) > 1 else "evidence/headers"
    files = sorted(f for f in os.listdir(directory) if f.endswith(".headers.txt"))
    if not files:
        print(f"No .headers.txt files in {directory}")
        return 1
    present = {name: 0 for name in CHECKED}
    for fname in files:
        path = os.path.join(directory, fname)
        status, headers = parse_headers(path)
        print(f"\n== {fname} ==  {status}")
        for name in CHECKED:
            values = headers.get(name)
            if values:
                present[name] += 1
                shown = " | ".join(values)
                # Never print a cookie value: name + flags only.
                if name == "set-cookie":
                    flags = []
                    for v in values:
                        parts = [p.strip() for p in v.split(";")]
                        cname = parts[0].split("=", 1)[0] if parts else "?"
                        flags.append(f"{cname}=<redacted> ({', '.join(parts[1:]) or 'no flags'})")
                    shown = " || ".join(flags)
                print(f"  {name}: {shown}")
            else:
                print(f"  {name}: MISSING")
        for name in LEAKY:
            if name in headers and name not in ("set-cookie",):
                pass  # already printed above; leakage is judged in docs, not here
    print("\n== Summary (files with header present / total files) ==")
    for name in CHECKED:
        print(f"  {name}: {present[name]}/{len(files)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
