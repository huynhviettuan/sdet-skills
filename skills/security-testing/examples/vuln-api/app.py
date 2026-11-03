"""vuln-api - a small multi-tenant orders API (Python stdlib, no dependencies) with switchable flaws.

Secure by default. Each flaw in FLAWS is enabled by naming it in the VULN_API_INSECURE environment variable
(comma-separated), e.g. VULN_API_INSECURE=bola,headers. The security suite in test_security.py must be green with
no flaws and must turn red for exactly the tests that claim to catch each flaw - scripts/selftest.py proves it.

    python app.py            # serves on 127.0.0.1:8765
    VULN_API_INSECURE=bola python app.py

Example values only: the users, passwords and signing key below are synthetic and documented as examples.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import sys
import threading
import time
import traceback
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

FLAWS = {
    "bola": "object-level authorization skipped: any authenticated user reads/edits any order",
    "mass": "mass assignment: PATCH accepts status and tenant",
    "headers": "security headers omitted",
    "cors": "CORS reflects any origin with credentials",
    "errors": "stack trace in 500 responses",
    "ratelimit": "no login rate limit",
    "jwt-none": "tokens with alg=none accepted unsigned",
    "jwt-nosig": "signature not verified (any payload with a syntactically valid token is trusted)",
    "jwt-noexp": "expiry not checked",
    "audit": "no audit entry for denied requests",
    "enum": "login tells whether the username exists",
}
SIGNING_KEY = b"example-signing-key-not-a-secret"      # example value
EXAMPLE_PASSWORD = "example-password"                   # example value, every user
LOGIN_LIMIT = 5                                         # failed logins per username per minute

USERS = {
    # username: (tenant, role)
    "alice": ("tenant-a", "customer"),
    "bob": ("tenant-b", "customer"),
    "erin": ("tenant-a", "customer"),
    "carol": ("tenant-a", "manager"),
    "dave": ("tenant-b", "manager"),
    "root": ("*", "admin"),
}
ALLOWED_ORIGINS = {"https://app.example.test"}
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
}


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


@dataclass
class Store:
    orders: dict[int, dict] = field(default_factory=dict)
    audit: list[dict] = field(default_factory=list)
    failed_logins: dict[str, list[float]] = field(default_factory=dict)
    next_id: int = 1
    lock: threading.Lock = field(default_factory=threading.Lock)

    def reset(self) -> None:
        with self.lock:
            self.orders.clear()
            self.audit.clear()
            self.failed_logins.clear()
            self.next_id = 1


STORE = Store()


def flaws() -> set[str]:
    raw = os.environ.get("VULN_API_INSECURE", "")
    chosen = {f.strip() for f in raw.split(",") if f.strip()}
    unknown = chosen - FLAWS.keys()
    if unknown:
        raise SystemExit(f"unknown flaw(s) {sorted(unknown)}; known: {sorted(FLAWS)}")
    return chosen


def issue_token(username: str) -> str:
    tenant, role = USERS[username]
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64(json.dumps({"sub": username, "tenant": tenant, "role": role, "exp": int(time.time()) + 3600}).encode())
    sig = b64(hmac.new(SIGNING_KEY, f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


def verify_token(token: str) -> dict | None:
    try:
        header_b, payload_b, sig = token.split(".")
        header = json.loads(unb64(header_b))
        payload = json.loads(unb64(payload_b))
    except (ValueError, json.JSONDecodeError):
        return None
    if header.get("alg") == "none":
        return payload if "jwt-none" in flaws() else None
    expected = b64(hmac.new(SIGNING_KEY, f"{header_b}.{payload_b}".encode(), hashlib.sha256).digest())
    if not hmac.compare_digest(expected, sig) and "jwt-nosig" not in flaws():
        return None
    if payload.get("exp", 0) < time.time() and "jwt-noexp" not in flaws():
        return None
    return payload


class Handler(BaseHTTPRequestHandler):
    server_version = "vuln-api/1"
    protocol_version = "HTTP/1.1"

    # ---- plumbing -------------------------------------------------------------------------------------------
    def log_message(self, fmt: str, *args) -> None:   # quiet
        pass

    def send(self, status: int, body: dict | list | None = None, extra: dict[str, str] | None = None) -> None:
        raw = json.dumps(body).encode() if body is not None else b""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        if "headers" not in flaws():
            for k, v in SECURITY_HEADERS.items():
                self.send_header(k, v)
        origin = self.headers.get("Origin")
        if origin:
            if "cors" in flaws():
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Access-Control-Allow-Credentials", "true")
            elif origin in ALLOWED_ORIGINS:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(raw)

    def body(self) -> dict:
        return json.loads(self.raw) if self.raw else {}

    def user(self) -> dict | None:
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        return verify_token(auth[7:])

    def deny(self, status: int, user: dict | None, what: str) -> None:
        if "audit" not in flaws():
            STORE.audit.append({"actor": user["sub"] if user else "anonymous", "action": what, "outcome": "denied"})
        # 404 for someone else's object (do not confirm existence), 401/403 for the rest
        self.send(status, {"error": {401: "unauthorized", 403: "forbidden", 404: "not found"}[status]})

    # ---- routing --------------------------------------------------------------------------------------------
    def do_GET(self) -> None:
        self.route("GET")

    def do_POST(self) -> None:
        self.route("POST")

    def do_PATCH(self) -> None:
        self.route("PATCH")

    def do_DELETE(self) -> None:
        self.route("DELETE")

    def do_OPTIONS(self) -> None:
        self.send(204)

    def route(self, method: str) -> None:
        path = urlparse(self.path).path
        # Drain the request body before any early 401/403: an unread body on a keep-alive connection is read as
        # the next request and the client sees a connection abort (found by the selftest, 2026-11-03).
        self.raw = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        try:
            if (method, path) == ("POST", "/auth/login"):
                return self.login()
            if (method, path) == ("GET", "/_boom"):
                raise RuntimeError("simulated failure in order pricing")
            if (method, path) == ("POST", "/_reset"):
                STORE.reset()
                return self.send(204)
            user = self.user()
            if user is None:
                return self.deny(401, None, f"{method} {path}")
            if (method, path) == ("GET", "/orders"):
                return self.list_orders(user)
            if (method, path) == ("POST", "/orders"):
                return self.create_order(user)
            if (method, path) == ("GET", "/admin/users"):
                return self.admin_users(user)
            if (method, path) == ("GET", "/_audit"):
                return self.audit(user)
            m = re.fullmatch(r"/orders/(\d+)", path)
            if m:
                return self.order(method, int(m.group(1)), user)
            self.send(404, {"error": "not found"})
        except Exception as e:  # noqa: BLE001 - the point is what we leak
            if "errors" in flaws():
                self.send(500, {"error": str(e), "trace": traceback.format_exc()})
            else:
                self.send(500, {"error": "internal error", "ref": hashlib.sha256(repr(e).encode()).hexdigest()[:8]})

    # ---- handlers -------------------------------------------------------------------------------------------
    def login(self) -> None:
        data = self.body()
        username, password = data.get("username", ""), data.get("password", "")
        now = time.time()
        if "ratelimit" not in flaws():
            recent = [t for t in STORE.failed_logins.get(username, []) if now - t < 60]
            STORE.failed_logins[username] = recent
            if len(recent) >= LOGIN_LIMIT:
                return self.send(429, {"error": "too many attempts"}, {"Retry-After": "60"})
        if username in USERS and password == EXAMPLE_PASSWORD:
            return self.send(200, {"token": issue_token(username)})
        STORE.failed_logins.setdefault(username, []).append(now)
        if "enum" in flaws():
            msg = "wrong password" if username in USERS else "no such user"
        else:
            msg = "invalid credentials"
        self.send(401, {"error": msg})

    def list_orders(self, user: dict) -> None:
        if user["role"] == "admin":
            rows = list(STORE.orders.values())
        else:
            rows = [o for o in STORE.orders.values() if o["tenant"] == user["tenant"]
                    and (user["role"] == "manager" or o["owner"] == user["sub"])]
        self.send(200, rows)

    def create_order(self, user: dict) -> None:
        if user["role"] == "admin":
            return self.deny(403, user, "POST /orders")
        data = self.body()
        with STORE.lock:
            oid = STORE.next_id
            STORE.next_id += 1
            STORE.orders[oid] = {"id": oid, "owner": user["sub"], "tenant": user["tenant"],
                                 "note": str(data.get("note", ""))[:200], "status": "new"}
        self.send(201, STORE.orders[oid])

    def can_see(self, user: dict, order: dict) -> bool:
        if "bola" in flaws():
            return True
        if user["role"] == "admin":
            return True
        if order["tenant"] != user["tenant"]:
            return False
        return user["role"] == "manager" or order["owner"] == user["sub"]

    def order(self, method: str, oid: int, user: dict) -> None:
        order = STORE.orders.get(oid)
        if order is None or not self.can_see(user, order):
            return self.deny(404, user, f"{method} /orders/{oid}")
        if method == "GET":
            return self.send(200, order)
        if method == "PATCH":
            data = self.body()
            allowed = {"note", "status", "tenant"} if "mass" in flaws() else {"note"}
            rejected = sorted(set(data) - allowed)
            if rejected:
                return self.send(400, {"error": "unknown or read-only fields", "fields": rejected})
            for k in allowed & set(data):
                order[k] = str(data[k])[:200]
            return self.send(200, order)
        if method == "DELETE":
            if user["role"] not in {"manager", "admin"}:
                return self.deny(403, user, f"DELETE /orders/{oid}")
            del STORE.orders[oid]
            return self.send(204)
        self.send(405, {"error": "method not allowed"})

    def admin_users(self, user: dict) -> None:
        if user["role"] != "admin":
            return self.deny(403, user, "GET /admin/users")
        self.send(200, [{"username": u, "tenant": t, "role": r} for u, (t, r) in USERS.items()])

    def audit(self, user: dict) -> None:
        if user["role"] != "admin":
            return self.deny(403, user, "GET /_audit")
        self.send(200, STORE.audit)


def serve(host: str = "127.0.0.1", port: int = 8765) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer((host, port), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


if __name__ == "__main__":
    active = flaws()
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    srv = serve(port=port)
    print(f"vuln-api on http://127.0.0.1:{port} | flaws: {sorted(active) or 'none'}", flush=True)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        srv.shutdown()
