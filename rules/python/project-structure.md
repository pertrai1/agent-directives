---
name: python-project-structure
description: Concrete Python workspace, src-layout, package metadata, pyproject.toml configuration, and module organization standards for agents.
version: 1.0.0
required: false
category: python
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://packaging.python.org/en/latest/tutorials/packaging-projects/
  - https://peps.python.org/pep-0518/
  - https://peps.python.org/pep-0621/
applies_to:
  - "pyproject.toml"
  - "setup.py"
  - "requirements.txt"
  - "poetry.lock"
  - "uv.lock"
  - "**/*.py"
---

# Python Project Structure Rules

**Load when:** The project contains `pyproject.toml`, `requirements.txt`, `setup.py`, or touches general repository module layout, dependency declarations, package configurations, or build environments.

## Version Awareness

Confirm the target Python version from `pyproject.toml` (`requires-python`), `setup.py`, or `.python-version`. Modern projects rely on PEP 621 metadata standards under `[project]` inside `pyproject.toml` and utilize modern lockfiles (`uv.lock`, `poetry.lock`). Do not introduce deprecated setup configurations (like `setup.cfg` or verbose non-declarative `setup.py`) into projects configured for modern unified tool definitions.

## Sources

- Python Packaging User Guide — https://packaging.python.org/en/latest/tutorials/packaging-projects/
- PEP 518 (Specifying Build System Requirements) — https://peps.python.org/pep-0518/
- PEP 621 (Storing Project Metadata in pyproject.toml) — https://peps.python.org/pep-0621/

## Rules

### src-layout vs Flat-layout

Prefer `src-layout` for packages, CLI tools, and libraries. Placing the primary source module under a nested `src/` directory prevents accidental imports of development modules, guarantees that test suites run against the installed package, and ensures clean distribution packaging.

```text
# CORRECT — src-layout
my-project/
├── pyproject.toml
├── src/
│   └── my_package/
│       ├── __init__.py
│       ├── main.py
│       └── utils.py
└── tests/
    └── test_utils.py
```

```text
# WRONG — Flat-layout (vulnerable to import shadowing & test runner leaks)
my-project/
├── pyproject.toml
├── my_package/
│   ├── __init__.py
│   ├── main.py
│   └── utils.py
└── tests/
    └── test_utils.py
```

### Module and naming conventions

Follow PEP 8 module and directory naming conventions:
- Use short, lowercase, snake_case module names: `user_profile.py`, `database_helpers.py`.
- Package/folder names must be lower_case with no hyphens (prefer snake_case if separators are absolutely necessary).
- Class names must use PascalCase (e.g. `UserRepository`).
- Constant names must use UPPER_CASE (e.g. `MAX_RETRIES`).
- Test files must be prefixed with `test_` and reside under a dedicated `tests/` directory (e.g., `tests/test_user_profile.py`).

### Unified pyproject.toml configuration

Consolidate build, package, linter, formatting, and type-checking settings inside a single `pyproject.toml` rather than splitting configurations across multiple standalone files (like `.ruff.toml`, `setup.cfg`, `tox.ini`, `.pylintrc`).

```toml
# CORRECT — Unified PEP 621 & tool configuration in pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-package"
version = "0.1.0"
description = "A clean modern Python project"
requires-python = ">=3.11"
dependencies = [
    "pydantic>=2.0.0",
    "httpx>=0.24.0"
]

[tool.ruff]
line-length = 88
select = ["E", "F", "I", "UP"]

[tool.mypy]
strict = true
```

- Always specify exact version bounds or reasonable minimum versions (`>=`) inside dependency declarations to prevent breaking updates.
- Keep dependency files locked. If the project utilizes `uv`, `poetry`, or `pipenv`, update dependencies by invoking the CLI rather than editing the lockfile manually.

### Directory Hygiene and Ignore files

Never commit temporary python artifacts, cache directories, or virtual environment structures to git. Ensure the root `.gitignore` blocks Python-specific runtime environments completely:

```gitignore
# CORRECT — Core .gitignore entries
__pycache__/
*.py[cod]
*$py.class
.ipynb_checkpoints/

# Virtual Environments
.venv/
venv/
ENV/

# Tool Caches & Builds
.mypy_cache/
.pytest_cache/
.ruff_cache/
build/
dist/
*.egg-info/
```

## Deep-Dive Reference Materials

Coding agents should fetch the raw text of these references programmatically when adjusting dependencies, defining packaging configurations, or reorganizing code directories:

- **src-layout packaging benefits:** Why the standard packaging guides recommend `src/` folder structures. Read [Packaging src-layout overview](https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/)
- **PEP 621 Standard:** Defining metadata keys, author details, dependencies, and entrypoints inside pyproject.toml. Read [PEP 621 Standard](https://peps.python.org/pep-0621/)
- **Ruff linter integration:** Configuring high-speed linting and formatting targets inside pyproject.toml. Read [Ruff Configuration Guide](https://docs.astral.sh/ruff/configuration/)

## Anti-patterns to refuse

- Committing virtual environments (`.venv`, `venv`) or compilation cache directories (`__pycache__`) to the git repository.
- Introducing a hybrid configuration layout (e.g., maintaining a `pyproject.toml` alongside redundant configs in `setup.cfg`, `setup.py`, and `tox.ini` without explicit automation).
- Naming packages or module folders with uppercase letters, hyphens, or special characters.
- Placing test suites (`test_*.py`) directly inside the production package directory, which can cause test modules to get distributed and imported as part of the live production package.

## Evidence

For structural pattern alignments, verify workspace configuration:

- Verify the existence of a valid `pyproject.toml` with conforming `[build-system]` and `[project]` metadata tables.
- Run `git status` to ensure no compilation artifacts or `.venv` files are being tracked.
- Validate packaging compliance by executing a mock build (e.g., `uv build` or `python -m build`).
