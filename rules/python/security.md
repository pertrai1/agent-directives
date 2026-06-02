---
name: python-security
description: Concrete Python security rules — SQL injection prevention, safe serialization, secret isolation, command execution discipline, and path traversal safety.
version: 1.0.0
required: false
category: python
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://cheatsheetseries.owasp.org/cheatsheets/Python_Security_Cheat_Sheet.html
  - https://docs.python.org/3/library/subprocess.html
  - https://pyyaml.org/wiki/PyYAMLDocumentation
applies_to:
  - "**/*.py"
  - "pyproject.toml"
  - "requirements.txt"
---

# Python Security Rules

**Load when:** Writing or reviewing Python code that processes untrusted user input, handles database interactions, executes system commands, performs object serialization/deserialization, or manages authentication and secret credentials.

## Version Awareness

Identify the versions of critical libraries (such as SQLAlchemy, Django, PyYAML, or cryptography) in use. Standard security APIs change between major versions — do not introduce deprecated or insecure APIs (like `crypt` which was removed in Python 3.13) and make sure parsing methods use current safe defaults.

## Sources

- OWASP Python Security Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Python_Security_Cheat_Sheet.html
- Python Subprocess Library Security — https://docs.python.org/3/library/subprocess.html#security-considerations
- Safe YAML Parsing — https://pyyaml.org/wiki/PyYAMLDocumentation

## Rules

### SQL Injection prevention

Never construct SQL queries by string concatenation, f-string formatting, or `%` interpolation using user-controlled parameters. Always use parameterized queries (prepared statements) provided by the database driver or utilize secure ORM expression builders (such as SQLAlchemy, SQLModel, or Tortoise ORM).

```python
# CORRECT — Parameterized query via ORM
from sqlalchemy import select

async def get_user_by_username(db_session, user_input: str):
    statement = select(User).where(User.username == user_input)
    result = await db_session.execute(statement)
    return result.scalar_one_or_none()
```

```python
# WRONG — Vulnerable to classic SQL injection via f-string
async def get_user_by_username(db_session, user_input: str):
    raw_query = f"SELECT * FROM users WHERE username = '{user_input}'"
    result = await db_session.execute(raw_query)  # Extremely dangerous!
    return result.all()
```

### Safe Serialization / Deserialization

Avoid using `pickle` or legacy `yaml.load` for parsing untrusted network payloads or data inputs, as they can trigger Remote Code Execution (RCE) via custom object instantiation. Prefer standard `json.loads` or Pydantic schemas, and if parsing YAML, always use `yaml.safe_load`.

```python
# CORRECT — Safe YAML parsing
import yaml

def load_user_config(yaml_data: str) -> dict:
    return yaml.safe_load(yaml_data)
```

```python
# WRONG — Insecure YAML parsing (can trigger arbitrary code execution)
import yaml

def load_user_config(yaml_data: str) -> dict:
    return yaml.load(yaml_data)  # Vulnerable to RCE!
```

### Environment and Secret management

Never hardcode passwords, API tokens, cryptographic private keys, or credentials into source files. Access them strictly from runtime environment variables. Use `pydantic-settings` to manage and validate structured configuration schemas.

```python
# CORRECT — Dynamic configuration via Pydantic Settings
from pydantic_settings import BaseSettings

class AppSettings(BaseSettings):
    database_url: str
    stripe_api_key: str

    class Config:
        env_file = ".env"

settings = AppSettings()
```

```python
# WRONG — Hardcoded API secrets committed directly to source code
DATABASE_URL = "postgresql://admin:super_secret_password@localhost:5432/db"
STRIPE_API_KEY = "sk_live_12345abcdef"  # Vulnerable to credential leak!
```

- Always add any local `.env` or configuration file to `.gitignore` so they are never committed.
- Commit a `.env.example` file that displays the required configuration keys with mocked or empty values as a reference for developers.

### Safe Command Execution

Avoid running system commands using raw strings or passing `shell=True` to subprocess parameters, as this exposes the system to Shell Command Injection. Always pass command arguments as lists and validate inputs before execution.

```python
# CORRECT — Safe subprocess execution using argument list
import subprocess

def check_disk_space(directory_path: str) -> str:
    # Arguments passed as list, shell=False by default prevents command chaining
    result = subprocess.run(["df", "-h", directory_path], capture_output=True, text=True, check=True)
    return result.stdout
```

```python
# WRONG — Vulnerable command execution with shell=True and raw strings
import subprocess

def check_disk_space(directory_path: str) -> str:
    # If directory_path is "/; rm -rf /", this triggers major system damage
    command = f"df -h {directory_path}"
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    return result.stdout
```

### Path Traversal prevention

When reading, writing, or serving files based on user-provided path inputs, resolve paths fully and confirm they remain strictly within the intended base directory.

```python
from pathlib import Path

def read_user_file(base_dir: Path, user_filename: str) -> str:
    # Safe resolution & validation
    target_path = (base_dir / user_filename).resolve()
    if not target_path.is_relative_to(base_dir):
        raise PermissionError("Access denied: path traversal attempt detected")
    return target_path.read_text()
```

## Deep-Dive Reference Materials

Coding agents should fetch the raw text of these references programmatically when handling cryptography, writing system bridges, or constructing parsing engines:

- **OWASP Python Security Standards:** Checklist for cryptographic storage, communications, input validations, and error handling. Read [OWASP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Python_Security_Cheat_Sheet.html)
- **Bandit Security Linter:** Common AST patterns associated with insecure python primitives (`eval`, `exec`, insecure tempfiles). Read [Bandit Linter Overview](https://bandit.readthedocs.io/en/latest/)
- **Subprocess Security Checklist:** Pitfalls of shell expansions and guidelines for secure privilege isolation. Read [Python Subprocess Security](https://docs.python.org/3/library/subprocess.html#security-considerations)

## Anti-patterns to refuse

- Performing raw SQL queries using formatted f-strings, `%` replacements, or string addition with inputs obtained from users.
- Executing `pickle.loads()`, `yaml.load()`, or `jsonpickle` on serialized payloads sourced from client connections, query parameters, or file uploads.
- Committing real credentials, service accounts, keys, or `.env` configs containing valid connection parameters to git.
- Setting `shell=True` on `subprocess` executions where any part of the command string is derived from external variables.
- Using `eval()` or `exec()` to parse or execute dynamic user-provided python expression strings.

## Evidence

For security-aligned Python changes, verify secure coding checks:

- Run `bandit -r src/` on the project directories to identify security vulnerabilities.
- Run test suites containing mock malicious inputs (such as paths with `../../`, SQL quotes, shell semi-colons) to ensure boundaries reject them safely.
