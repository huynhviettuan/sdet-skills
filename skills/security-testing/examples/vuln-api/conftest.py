"""Fixtures: the API in-process on an ephemeral port, one client per role, a fresh store per test."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import pytest

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent.parent / "scripts"))   # authz_matrix (the skill's script)

import app  # noqa: E402

USER_FOR_ACTOR = {
    "anonymous": None,
    "customer-own": "alice",
    "customer-same-tenant": "erin",
    "customer-other-tenant": "bob",
    "manager-same-tenant": "carol",
    "manager-other-tenant": "dave",
    "admin": "root",
}


@dataclass
class Response:
    status: int
    body: dict | list | None
    headers: dict[str, str]


class Api:
    """Minimal urllib client: every call returns the status instead of raising, so tests assert on it."""

    def __init__(self, base: str) -> None:
        self.base = base

    def request(self, method: str, path: str, *, token: str | None = None, json_body: dict | None = None,
                headers: dict[str, str] | None = None) -> Response:
        data = json.dumps(json_body).encode() if json_body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=5) as r:
                return Response(r.status, _json(r.read()), dict(r.headers))
        except urllib.error.HTTPError as e:
            return Response(e.code, _json(e.read()), dict(e.headers))

    def login(self, username: str, password: str = app.EXAMPLE_PASSWORD) -> Response:
        return self.request("POST", "/auth/login", json_body={"username": username, "password": password})

    def token(self, username: str) -> str:
        r = self.login(username)
        assert r.status == 200, f"login for {username} failed: {r.status} {r.body}"
        return r.body["token"]


def _json(raw: bytes):
    return json.loads(raw) if raw else None


@pytest.fixture(scope="session")
def server():
    srv = app.serve(port=0)
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


@pytest.fixture
def api(server: str) -> Api:
    client = Api(server)
    client.request("POST", "/_reset")        # test-only hook; a real suite resets through its data factories
    return client


@pytest.fixture
def tokens(api: Api) -> dict[str, str | None]:
    return {actor: (api.token(user) if user else None) for actor, user in USER_FOR_ACTOR.items()}


@pytest.fixture
def alice_order(api: Api, tokens: dict[str, str | None]) -> dict:
    r = api.request("POST", "/orders", token=tokens["customer-own"], json_body={"note": "original"})
    assert r.status == 201
    return r.body
