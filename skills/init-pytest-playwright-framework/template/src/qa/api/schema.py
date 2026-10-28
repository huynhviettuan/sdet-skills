"""Response contracts: JSON Schemas extracted from the OpenAPI spec (``node scripts/openapi-tool.mjs schemas``)."""

from __future__ import annotations

import json
from functools import cache
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator

from qa.api.base_service import ApiResponse

SCHEMAS = Path(__file__).resolve().parents[1] / "schemas"


@cache
def _validator(folder: str, name: str) -> Draft7Validator:
    schema = json.loads((SCHEMAS / folder / f"{name}_schema.json").read_text(encoding="utf-8"))
    return Draft7Validator(schema)


def assert_matches(response: ApiResponse[Any], folder: str, name: str) -> None:
    """Fail listing every violation when the body doesn't match ``schemas/<folder>/<name>_schema.json``."""
    errors = sorted(_validator(folder, name).iter_errors(response.json()), key=lambda e: list(e.path))
    if errors:
        details = "\n".join(f"  {'/'.join(map(str, e.path)) or '(root)'}: {e.message}" for e in errors[:10])
        raise AssertionError(f"response does not match schema {folder}/{name}:\n{details}")
