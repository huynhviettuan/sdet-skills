"""Configuration from the environment (``.env``, ``.env.<TEST_ENV>``, then real variables). Secrets never live here."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_ENV = os.environ.get("TEST_ENV", "dev")
load_dotenv(Path.cwd() / f".env.{_ENV}", override=True)
load_dotenv(Path.cwd() / ".env", override=False)


def _get(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


@dataclass(frozen=True)
class Config:
    env: str
    base_url: str
    api_domain: str
    api_key: str
    password: str
    locale: str


CONFIG = Config(
    env=_ENV,
    base_url=_get("BASE_URL"),
    api_domain=_get("API_DOMAIN"),
    api_key=_get("API_KEY"),
    password=_get("PASSWORD"),
    locale=_get("LOCALE", "en-US"),
)
