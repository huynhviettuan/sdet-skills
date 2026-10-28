#!/usr/bin/env python3
"""check_kb — consistency check for a knowledge base built by the project-knowledge-base skill.

    python check_kb.py <kb-dir> [--min-citations 0.3]

Errors (exit 1):
  - a citation [Sxx Lnn] names a source id that is not in the manifest, or a source marked removed
  - a cited line is past the end of the source's extracted text
  - a relative link in a page points to a file that doesn't exist, or to a #heading that file doesn't have
  - a Markdown file has an unbalanced code fence
Warnings:
  - a readable source (status ok / image) has no digest card in _digests/
  - a content page cites less than --min-citations of its fact lines (bullets and table rows)
  - a page or digest contains an email address or a phone-like number (copy only documented examples; a person
    decides — the check cannot tell a real customer from a sample)
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

CITE = re.compile(r"\[((?:S\d{2,3}(?:\s+L\d+(?:\s*[-–]\s*L?\d+)?)?(?:;\s*)?)+)\]")
ONE = re.compile(r"(S\d{2,3})(?:\s+L(\d+)(?:\s*[-–]\s*L?(\d+))?)?")
LINK = re.compile(r"\]\(([^)\s]+)\)")
NAV_PAGES = {"README.md", "index.md", "changelog.md"}
PERSONAL = re.compile(r"[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}|(?<![\w-])(?:\+84|\+\d{2}|0)\d[\d .-]{7,11}\d(?![\w-])")
_anchor_cache: dict[Path, set[str]] = {}


def anchors_of(page: Path) -> set[str]:
    """Heading anchors as GitHub renders them: lower case, punctuation dropped, spaces to '-', repeats get -1, -2."""
    if page not in _anchor_cache:
        text = re.sub(r"```.*?```", "", page.read_text(encoding="utf-8"), flags=re.S)
        seen: dict[str, int] = {}
        for heading in re.findall(r"^#{1,6}\s+(.+?)\s*#*\s*$", text, flags=re.M):
            slug = re.sub(r"[^\w\- ]", "", heading.strip().lower()).replace(" ", "-")
            n = seen.get(slug, 0)
            seen[slug] = n + 1
            seen.setdefault(f"{slug}-{n}" if n else slug, 1)
        _anchor_cache[page] = set(seen)
    return _anchor_cache[page]


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    kb = Path(args[0]).resolve()
    min_ratio = float(args[args.index("--min-citations") + 1]) if "--min-citations" in args else 0.3
    manifest = json.loads((kb / "_sources" / "manifest.json").read_text(encoding="utf-8"))
    sources = {f["id"]: f for f in manifest["files"]}
    lengths = {}
    for doc_id, f in sources.items():
        if f.get("text") and (kb / f["text"]).exists():
            lengths[doc_id] = len((kb / f["text"]).read_text(encoding="utf-8").splitlines())

    errors: list[str] = []
    warnings: list[str] = []
    pages = [p for p in kb.rglob("*.md") if "_sources" not in p.relative_to(kb).parts]
    cited_sources: set[str] = set()

    for page in pages:
        rel = page.relative_to(kb).as_posix()
        text = page.read_text(encoding="utf-8")
        if text.count("```") % 2:
            errors.append(f"{rel}: unbalanced code fence")
        for block in CITE.finditer(re.sub(r"`[^`\n]*`", "", text)):
            for doc_id, start, end in ONE.findall(block.group(1)):
                cited_sources.add(doc_id)
                source = sources.get(doc_id)
                if source is None:
                    errors.append(f"{rel}: cites unknown source {doc_id}")
                    continue
                if source.get("change") == "removed":
                    errors.append(f"{rel}: cites {doc_id}, which was removed from the sources")
                last = int(end or start or 0)
                if last and doc_id in lengths and last > lengths[doc_id]:
                    errors.append(f"{rel}: cites {doc_id} L{last}, past the end ({lengths[doc_id]} lines)")
        prose = re.sub(r"```.*?```", "", text, flags=re.S)
        for target in LINK.findall(prose):
            if re.match(r"^(https?:|mailto:)", target):
                continue
            path, _, anchor = target.partition("#")
            dest = (page.parent / path).resolve() if path else page
            if path and not dest.exists():
                errors.append(f"{rel}: broken link {target}")
            elif anchor and dest.suffix == ".md" and anchor not in anchors_of(dest):
                errors.append(f"{rel}: link {target} names no heading in {dest.name}")
        for found in PERSONAL.findall(re.sub(r"\[S\d[^\]]*\]", "", text)):
            warnings.append(f"{rel}: looks like personal data or a credential, check it is a documented example: {found}")
        is_content = not rel.startswith("_digests/") and page.name not in NAV_PAGES and page.name != "README.md"
        if is_content:
            facts = [ln for ln in prose.splitlines() if re.match(r"^\s*([-*]|\d+\.|\|(?!\s*-))", ln) and len(ln) > 30]
            facts = [ln for ln in facts if not re.match(r"^\|\s*(ID|#|Term|Page|Step|Kind|Topic|Role|Flow|Severity)\s*\|", ln)]
            if facts:
                cited = sum(1 for ln in facts if CITE.search(ln) or "inferred" in ln.lower() or "not stated" in ln.lower())
                if cited / len(facts) < min_ratio:
                    warnings.append(f"{rel}: {cited}/{len(facts)} fact lines cited (below {min_ratio:.0%})")

    digests = {p.name.split("-")[0] for p in (kb / "_digests").glob("S*.md")} if (kb / "_digests").exists() else set()
    for doc_id, f in sources.items():
        if f.get("change") != "removed" and f["status"] in ("ok", "image") and doc_id not in digests:
            warnings.append(f"no digest for {doc_id} ({f['path']})")

    live = [d for d, f in sources.items() if f.get("change") != "removed" and f["status"] in ("ok", "image")]
    print(f"{len(pages)} pages | {len(live)} readable sources | {len(digests)} digests | "
          f"{len(cited_sources & set(live))} sources cited in pages")
    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
