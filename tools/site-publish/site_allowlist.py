#!/usr/bin/env python3
"""Ailane site publish allowlist: decide which repo files are served on ailane.ai.

Usage:
  python3 tools/site-publish/site_allowlist.py list            # print published paths
  python3 tools/site-publish/site_allowlist.py build OUT_DIR   # copy published files into OUT_DIR
  python3 tools/site-publish/site_allowlist.py verify OUT_DIR  # fail if any served page references a missing local file
Run from the repository root. Stdlib only.
"""
from __future__ import annotations
import os, re, shutil, subprocess, sys
from pathlib import PurePosixPath

PUBLISH_EXT = {".html", ".js", ".mjs", ".css", ".json", ".png", ".jpg", ".jpeg", ".gif", ".webp",
               ".svg", ".ico", ".webmanifest", ".xml", ".txt", ".woff", ".woff2", ".pdf", ".mp4", ".webm"}
EXCLUDE_DIRS = {".github", "supabase", "deployments", "tools", "scripts", "backend", "scraper", "docs", "node_modules"}
EXCLUDE_DIR_SUFFIXES = ("/migrations",)
EXCLUDE_PREFIXES = ("workspace/src/",)  # build sources; pages load workspace/dist/
EXTRA_PUBLISH = {"intelligence/demo-assets/NHF-CC-2026-0047-ComplianceReport.docx"}  # linked demo download
EXCLUDE_FILES = {"package.json", "package-lock.json", "tsconfig.json", "CLAUDE.md"}
EXCLUDE_PATHS = {"assets/dnb-2026/AILANE-ROADMAP-DNB-001-v1-3.pdf"}  # contains personal contact details
KEEP_ROOT_FILES = {".nojekyll", "CNAME"}

def tracked() -> list[str]:
    out = subprocess.run(["git", "ls-files", "-z"], check=True, capture_output=True).stdout.decode()
    return [p for p in out.split("\0") if p]

def published(path: str) -> bool:
    p = PurePosixPath(path)
    if path in KEEP_ROOT_FILES or path in EXTRA_PUBLISH:
        return True
    if path.startswith(EXCLUDE_PREFIXES):
        return False
    if path in EXCLUDE_PATHS or p.name in EXCLUDE_FILES:
        return False
    parts = p.parts
    if parts[0] in EXCLUDE_DIRS or any(part.startswith(".") for part in parts[:-1]):
        return False
    parent = "/" + "/".join(parts[:-1])
    if any(parent.endswith(s) or (s + "/") in parent + "/" for s in EXCLUDE_DIR_SUFFIXES):
        return False
    if p.name.startswith(".") and path not in KEEP_ROOT_FILES:
        return False
    return p.suffix.lower() in PUBLISH_EXT

REF = re.compile(r"""(?:src|href|data|action)\s*=\s*["']([^"'#?]+)|fetch\(\s*["'`]([^"'`#?$]+)|import\s+[^;]*?from\s+["']([^"']+)|["'`](/[A-Za-z0-9_\-./]+\.(?:js|mjs|css|json|png|svg|pdf|ico|html|webmanifest|jpg|jpeg|webp|woff2?))["'`]""")

def local_refs(page: str, text: str) -> set[str]:
    refs = set()
    for m in REF.finditer(text):
        ref = next(g for g in m.groups() if g)
        if re.match(r"^(?:[a-z]+:|//|mailto:|tel:|javascript:|data:)", ref, re.I) or "{" in ref or "${" in ref:
            continue
        base = PurePosixPath(page).parent
        target = PurePosixPath(ref.lstrip("/")) if ref.startswith("/") else base / ref
        norm = os.path.normpath(str(target)).lstrip("./")
        if norm in ("", "."):
            continue
        refs.add(norm)
    return refs

def resolves(norm: str, files: set[str]) -> bool:
    if norm in files:
        return True
    if norm.rstrip("/") + "/index.html" in files or norm + ".html" in files:
        return True
    return False

def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in {"list", "build", "verify"}:
        print(__doc__); return 2
    files = tracked()
    pub = sorted(f for f in files if published(f))
    if sys.argv[1] == "list":
        print("\n".join(pub)); print(f"# {len(pub)} published of {len(files)} tracked", file=sys.stderr); return 0
    out = sys.argv[2]
    if sys.argv[1] == "build":
        if os.path.exists(out):
            shutil.rmtree(out)
        for f in pub:
            dst = os.path.join(out, f)
            os.makedirs(os.path.dirname(dst) or out, exist_ok=True)
            shutil.copy2(f, dst)
        print(f"built {len(pub)} files into {out}"); return 0
    built = set()
    for root, _, names in os.walk(out):
        for n in names:
            built.add(os.path.relpath(os.path.join(root, n), out).replace(os.sep, "/"))
    tracked_set = set(files)
    missing = {}
    for f in sorted(built):
        if not f.endswith((".html", ".js", ".mjs", ".css")):
            continue
        text = open(os.path.join(out, f), encoding="utf-8", errors="ignore").read()
        for r in local_refs(f, text):
            if not resolves(r, built) and resolves(r, tracked_set):
                missing.setdefault(r, set()).add(f)
    for r, pages in sorted(missing.items()):
        print(f"EXCLUDED-BUT-REFERENCED {r}  <- {', '.join(sorted(pages)[:5])}")
    leaks = [f for f in built if (f.endswith((".md", ".sql", ".ts", ".py", ".sh", ".yml", ".docx")) and f not in EXTRA_PUBLISH)
             or f.startswith(("supabase/", "deployments/", "workspace/src/"))]
    for f in leaks:
        print(f"INTERNAL-FILE-IN-BUILD {f}")
    print(f"verify: {len(built)} files; {len(missing)} excluded-but-referenced; {len(leaks)} internal files in build")
    return 1 if (missing or leaks) else 0

if __name__ == "__main__":
    sys.exit(main())
