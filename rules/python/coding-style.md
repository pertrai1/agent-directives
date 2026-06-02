---
name: python-coding-style
description: Concrete Python coding-style patterns — type hinting strictness, formatting rules, Pydantic v2 validation, and asyncio asynchronous safety.
version: 1.0.0
required: false
category: python
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://peps.python.org/pep-0008/
  - https://peps.python.org/pep-0484/
  - https://docs.pydantic.dev/latest/
  - https://docs.python.org/3/library/asyncio.html
applies_to:
  - "**/*.py"
---

# Python Coding Style Rules

**Load when:** Writing or reviewing Python code — functions, classes, models, scripts, or async tasks that require standard styling, type safety, Pydantic parsing, or async event loop safety.

## Version Awareness

Check the python version target in `pyproject.toml` (`requires-python`), `environment.yml`, or `.python-version`. Modern type patterns (PEP 585 collections `list[]`, PEP 604 union `T | None`, PEP 695 generic type parameter syntax like `class Name[T]: ...` / `type Alias[T] = ...`) require Python 3.9, 3.10, or 3.12+ respectively. Ensure Pydantic code uses v2 primitives, not v1.

## Sources

- PEP 8 (Style Guide for Python Code) — https://peps.python.org/pep-0008/
- PEP 484 & PEP 585 (Type Hinting) — https://peps.python.org/pep-0484/
- Pydantic v2 Documentation — https://docs.pydantic.dev/latest/
- Python asyncio (Asynchronous I/O) — https://docs.python.org/3/library/asyncio.html

## Rules

### Type hinting strictness

Always annotate public APIs: parameters, return values, and class fields. Use PEP 585 built-in collections over legacy `typing` types, and PEP 604 Union syntax `A | B` over `Union[A, B]` or `Optional[T]`.

```python
# CORRECT
def get_user_names(user_ids: list[str]) -> list[str | None]:
    return [get_name(uid) for uid in user_ids]
```

```python
# WRONG — legacy typing types and Optional wrapper
from typing import List, Optional

def get_user_names(user_ids: List[str]) -> List[Optional[str]]:
    return [get_name(uid) for uid in user_ids]
```

- Avoid `Any` in annotations. Use `TypeVar` or generics when a function behaves generically, or `object` if the type is truly unknown and narrowed later.
- Use `Annotated` from `typing` / `typing_extensions` to attach metadata, especially for dependency injection or schema definitions.

### Pydantic v2 validation

Use Pydantic v2 patterns. Inherit from `BaseModel`. Declare validators using `@field_validator` and `@model_validator` instead of legacy `@validator` and `@root_validator`.

```python
# CORRECT — Pydantic v2 validation
from pydantic import BaseModel, Field, field_validator

class UserInput(BaseModel):
    username: str = Field(..., min_length=3)
    age: int

    @field_validator("age")
    @classmethod
    def validate_age(cls, value: int) -> int:
        if value < 18:
            raise ValueError("User must be 18 or older")
        return value
```

```python
# WRONG — legacy Pydantic v1 validator
from pydantic import BaseModel, validator

class UserInput(BaseModel):
    username: str
    age: int

    @validator("age")  # Legacy v1 decorator
    def validate_age(cls, value):
        if value < 18:
            raise ValueError("User must be 18 or older")
        return value
```

- Enforce validation strictness with `Field` parameters (`gt`, `lt`, `min_length`, `pattern`).
- Always run validations by instantiating models, and parse with `model_validate()` or `model_validate_json()`.

### Asyncio cooperative multitasking

Never block the async event loop with synchronous operations. Offload synchronous blocking operations (filesystem operations, raw network calls, CPU-heavy tasks) to threads using `asyncio.to_thread()`.

```python
# CORRECT — offloading blocking I/O to a thread
import asyncio
import requests

async def fetch_data(url: str) -> dict:
    response = await asyncio.to_thread(requests.get, url)
    return response.json()
```

```python
# WRONG — blocks the entire event loop during network fetch
import requests

async def fetch_data(url: str) -> dict:
    response = requests.get(url)  # Blocking!
    return response.json()
```

- Prefer standard async libraries (e.g. `httpx`, `aiohttp`, `aiofiles`) over offloading synchronous libraries where possible.
- Run concurrent async tasks using `asyncio.gather` or `asyncio.TaskGroup` (Python 3.11+) instead of sequential awaits.

### Styling and Formatting

Keep formatting consistent with `black` or `ruff` formatting styles. Use 4 spaces for indentation (never tabs), and keep lines bounded (defaulting to 88 or 120 characters depending on project config). Prefer double quotes for string literals.

## Deep-Dive Reference Materials

Coding agents should fetch the raw text of these references programmatically when writing or modifying typing layouts, serialization/validation layers, or async concurrency boundaries:

- **Type Hinting (PEP 484/585/604):** Core static typing conventions, standard library collections, and modern union operators. Read [PEP 585](https://peps.python.org/pep-0585/) and [PEP 604](https://peps.python.org/pep-0604/)
- **Pydantic Validation (v2):** Declarative schema generation, custom validators, strict types, serialization, and migration guides. Read [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/)
- **Async Concurrency (asyncio):** Managing event loops, task lifecycles, and thread-safe offloads of legacy blocking interfaces. Read [Python asyncio library](https://docs.python.org/3/library/asyncio.html)

## Anti-patterns to refuse

- Importing legacy `typing` container constructs (`List`, `Dict`, `Tuple`, `Set`, `Union`, `Optional`) on environment versions of Python 3.10+.
- Implementing legacy Pydantic v1 validators (`@validator`, `@root_validator`) or inheriting from v1 namespace base classes on projects where Pydantic v2 is installed.
- Invoking synchronous blocking system calls (e.g., `requests.get`, `time.sleep`, `open()`, database query execution) inside async functions without delegating them to `asyncio.to_thread` or utilizing async alternatives like `httpx`, `aiofiles`, or async DB clients.
- Swallowing exceptions silently with generic `except:` or `except Exception:` blocks without logging, raising an appropriate alternative, or preserving traceback context with `raise ... from`.
- Hardcoding configuration values, database passwords, or third-party API secret tokens into source files.

## Evidence

For style-aligned Python changes, verify linter, formatter, and typechecker correctness:

- Verify style with `ruff check .` (or `flake8` / `pylint`) on the touched paths to ensure code compliance.
- Guarantee formatting and string quote standards using `ruff format --check .` (or `black --check .`).
- Validate type annotation completeness and strictness using `mypy .` (or `pyright`).
- Execute unit and integration tests (see `rules/python/testing.md`) to assert behavior.
