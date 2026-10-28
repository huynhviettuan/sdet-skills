"""Base for API services generated 1:1 from OpenAPI (``service-builder``).

A service *receives* its ``httpx.Client`` (composition): the client carries the base URL and credentials, built
once by the service fixtures, so a service holds no configuration and no secrets. Services send and parse; they
never assert or decide what success means.
"""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import quote

import httpx
from pydantic import TypeAdapter


class ApiResponse[T]:
    """Status, headers and a body parsed on first access, so a call whose body is never read can't fail on it."""

    def __init__(self, response: httpx.Response, adapter: TypeAdapter[T] | None) -> None:
        self.raw = response
        self._adapter = adapter

    @property
    def status_code(self) -> int:
        return self.raw.status_code

    @property
    def text(self) -> str:
        return self.raw.text

    def json(self) -> Any:
        try:
            return self.raw.json()
        except json.JSONDecodeError as error:
            request = self.raw.request
            raise AssertionError(
                f"{request.method} {request.url} returned a body that is not valid JSON: {self.raw.text[:200]}"
            ) from error

    @property
    def data(self) -> T:
        """The body validated into the operation's model (raises with the field path when it doesn't match)."""
        if self._adapter is None:
            raise AssertionError("this operation declares no response model; read .json() or .text")
        return self._adapter.validate_python(self.json())


class BaseService:
    def __init__(self, client: httpx.Client) -> None:
        self._client = client

    @staticmethod
    def path_of(template: str, **params: str | int) -> str:
        """Fill an OpenAPI path template, keeping the spec path verbatim: ``/pet/{petId}`` → ``/pet/42``."""
        path = template
        for name, value in params.items():
            path = path.replace("{" + name + "}", quote(str(value), safe=""))
        if "{" in path:
            raise ValueError(f"missing path parameter in {template}: {path}")
        return path

    def send(
        self,
        method: str,
        path: str,
        *,
        model: Any = None,
        json_body: Any = None,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> ApiResponse[Any]:
        query = {key: value for key, value in (params or {}).items() if value is not None}
        response = self._client.request(method, path, json=json_body, params=query, headers=headers)
        return ApiResponse(response, TypeAdapter(model) if model is not None else None)
