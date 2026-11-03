#!/usr/bin/env python3
"""headers_check - response-header, cookie and CORS policy check against a live test environment (stdlib only).

    python headers_check.py http://127.0.0.1:8765/orders
    python headers_check.py <url> --policy policy.json --header "Authorization: Bearer <token>"
    python headers_check.py <url> --origin https://evil.example.test

Deterministic: every finding is a header that is missing, has the wrong value, must be absent, a cookie without a
required attribute, or a CORS grant to an origin not on the allowlist. No scanner heuristics. Findings carry
HDR-/CKE-/CORS- IDs for the report. Exit 0 clean, 1 findings, 2 target unreachable or a URL that is not a test
environment.

Policy (JSON; the default below is the baseline for a JSON API - a page-serving app needs its own CSP):
    {"required": {"X-Content-Type-Options": "nosniff", ...},   value is an exact string or "re:<regex>"
     "forbidden": ["X-Powered-By", "Server"],
     "cookie_attributes": ["Secure", "HttpOnly", "SameSite"],
     "allowed_origins": ["https://app.example.test"],
     "test_hosts": ["127.0.0.1", "localhost", "*.test", "staging.example.com"]}

The URL's host must match test_hosts (a guard against pointing the check at production by mistake).
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DEFAULT_POLICY = {
    "required": {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "re:^(DENY|SAMEORIGIN)$",
        "Content-Security-Policy": "re:default-src",
        "Strict-Transport-Security": "re:max-age=\\d{6,}",
        "Cache-Control": "re:no-store",
        "Referrer-Policy": "re:^(no-referrer|strict-origin-when-cross-origin|same-origin)$",
    },
    "forbidden": ["X-Powered-By", "X-AspNet-Version"],
    "cookie_attributes": ["Secure", "HttpOnly", "SameSite"],
    "allowed_origins": ["https://app.example.test"],
    "test_hosts": ["127.0.0.1", "localhost", "*.localhost", "*.test"],
}


def fetch(url: str, headers: dict[str, str]) -> tuple[int, dict[str, list[str]]]:
    req = urllib.request.Request(url, method="GET")
    for k, v in headers.items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, _multi(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, _multi(e.headers)


def _multi(h) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for k, v in h.items():
        out.setdefault(k.lower(), []).append(v)
    return out


def matches(expected: str, actual: str) -> bool:
    if expected.startswith("re:"):
        return re.search(expected[3:], actual) is not None
    return expected == actual


def check(url: str, policy: dict, extra: dict[str, str], attack_origin: str) -> tuple[list[str], int]:
    findings: list[str] = []
    status, headers = fetch(url, extra)
    for name, expected in policy.get("required", {}).items():
        got = headers.get(name.lower())
        if got is None:
            findings.append(f"HDR-MISSING {name}: required, absent")
        elif not matches(expected, got[0]):
            findings.append(f"HDR-VALUE {name}: expected {expected!r}, got {got[0]!r}")
    for name in policy.get("forbidden", []):
        if name.lower() in headers:
            findings.append(f"HDR-FORBIDDEN {name}: present ({headers[name.lower()][0]!r})")
    for cookie in headers.get("set-cookie", []):
        attrs = {p.strip().split("=")[0].lower() for p in cookie.split(";")[1:]}
        cname = cookie.split("=")[0]
        for attr in policy.get("cookie_attributes", []):
            if attr.lower() not in attrs:
                findings.append(f"CKE-ATTR {cname}: missing {attr}")
    # CORS: an origin not on the allowlist must get no grant
    _, cors = fetch(url, {**extra, "Origin": attack_origin})
    acao = cors.get("access-control-allow-origin", [None])[0]
    if acao in {attack_origin, "*"} and attack_origin not in policy.get("allowed_origins", []):
        creds = cors.get("access-control-allow-credentials", [""])[0]
        findings.append(f"CORS-GRANT origin {attack_origin}: Access-Control-Allow-Origin={acao!r}"
                        + (" with credentials" if creds.lower() == "true" else ""))
    return findings, status


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url")
    ap.add_argument("--policy", type=Path)
    ap.add_argument("--header", action="append", default=[], help='"Name: value", repeatable')
    ap.add_argument("--origin", default="https://evil.example.test", help="origin that must NOT be granted")
    args = ap.parse_args(argv)
    policy = DEFAULT_POLICY if args.policy is None else json.loads(args.policy.read_text(encoding="utf-8"))
    host = urlparse(args.url).hostname or ""
    if not any(fnmatch.fnmatch(host, pat) for pat in policy.get("test_hosts", [])):
        print(f"REFUSED: host {host!r} is not in test_hosts {policy.get('test_hosts')} - this check only runs "
              "against a test environment")
        return 2
    extra = dict(h.split(":", 1) for h in args.header)
    extra = {k.strip(): v.strip() for k, v in extra.items()}
    try:
        findings, status = check(args.url, policy, extra, args.origin)
    except (urllib.error.URLError, OSError) as e:
        print(f"UNREACHABLE: {args.url} ({e})")
        return 2
    print(f"target: {args.url} | status {status} | checks: {len(policy.get('required', {}))} required, "
          f"{len(policy.get('forbidden', []))} forbidden, cookies, CORS")
    for f in findings:
        print(f"ERROR {f}")
    print(f"total: {len(findings)} findings")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
