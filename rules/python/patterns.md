---
name: python-patterns
description: Concrete Python application patterns — Repository and Service-layer split, explicit Dependency Injection, Try-Except scope minimization, and Context Manager resource management.
version: 1.0.0
required: false
category: python
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://docs.python.org/3/library/contextlib.html
  - https://fastapi.tiangolo.com/tutorial/dependencies/
applies_to:
  - "**/*.py"
---

# Python Patterns Rules

**Load when:** Designing, refactoring, or reviewing Python application architectures, database models, API services, background workers, or system integration layers.

## Version Awareness

Understand Python's contextlib updates. Async context managers (`async with`) are fully standard in Python 3.7+. If writing web applications (like FastAPI), ensure dependency injection and routing match the framework's version guidelines.

## Sources

- Python `contextlib` — https://docs.python.org/3/library/contextlib.html
- FastAPI Dependencies — https://fastapi.tiangolo.com/tutorial/dependencies/
- Clean Architecture / Domain Driven Design in Python

## Rules

### Repository and Service Layer Split

Separate persistence and API layers. Do not put SQL queries, database logic, or raw external fetches inside HTTP controller/routing handlers. Route handlers delegate to Services, and Services delegate data persistence to Repositories.

```python
# CORRECT — Controller delegates to Service, which uses Repository
# controllers/user.py
@router.get("/users/{user_id}")
async def get_user(user_id: str, service: UserService = Depends(get_user_service)):
    return await service.get_user_profile(user_id)

# services/user.py
class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    async def get_user_profile(self, user_id: str) -> UserProfile:
        user = await self.repo.find_by_id(user_id)
        if not user:
            raise UserNotFoundError(user_id)
        return UserProfile.from_domain(user)
```

```python
# WRONG — Direct persistence and business logic inside the API route handler
# controllers/user.py
@router.get("/users/{user_id}")
async def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
         raise HTTPException(status_code=404)
    return {"id": user.id, "name": user.name}
```

### Dependency Injection

Provide dependencies explicitly via constructor injection (class `__init__`) or runtime DI boundaries (e.g., FastAPI's `Depends`). Avoid relying on global singletons, global configurations, or imports that spin up hardcoded clients.

```python
# CORRECT — Client injected during initialization
class PaymentService:
    def __init__(self, stripe_client: StripeClient):
        self.client = stripe_client

    def charge(self, amount: int, currency: str) -> dict:
        return self.client.create_charge(amount, currency)
```

```python
# WRONG — Hardcoded global client initialized on module load
import stripe_client  # Creates a global connection

class PaymentService:
    def charge(self, amount: int, currency: str) -> dict:
         return stripe_client.create_charge(amount, currency) # Hard to mock or swap
```

### Minimizing Exception Scope & Chain of Custody

Wrap only the exact line(s) that can raise an exception. Catch specific exceptions, never bare `except:`. When transforming an exception, use `raise NewException(...) from err` to preserve the original traceback context.

```python
# CORRECT — Narrow try/except scope and chained exceptions
try:
    with open("config.json") as f:
        config_data = f.read()
except FileNotFoundError as err:
    raise ConfigurationError("Configuration file missing") from err

# Parse safely outside the try-except block
config = json.loads(config_data)
```

```python
# WRONG — Overscoped try/except and swallowed traceback
try:
    with open("config.json") as f:
        config = json.loads(f.read())
except Exception:  # Swallows FileNotFoundError, json.JSONDecodeError, etc.
    raise ConfigurationError("Could not load config")
```

### Context Managers for Resource Management

Use `with` or `async with` for any resource with a lifecycle (files, database connections, locks, HTTP client sessions). Utilize `contextlib.contextmanager` or `contextlib.asynccontextmanager` to write reusable setups.

```python
# CORRECT — Context-managed client session
from contextlib import asynccontextmanager

class ServiceClient:
    @asynccontextmanager
    async def session(self):
        client = httpx.AsyncClient()
        try:
            yield client
        finally:
            await client.aclose()
```

```python
# WRONG — Manual open/close prone to leak during errors
class ServiceClient:
    async def get_client(self):
        self.client = httpx.AsyncClient()
        return self.client

    async def close(self):
        await self.client.aclose() # If error occurs before this, client is leaked
```

## Deep-Dive Reference Materials

Coding agents should fetch the raw text of these references programmatically when designing system boundaries, database layers, DI systems, or exception hierarchies:

- **Clean Architecture & Patterns in Python:** Implementing Repository, Service, Unit of Work, and Domain patterns for highly testable code. Read [Architecture Patterns with Python Guide](https://cosmicpython.com/)
- **Context Managers (`contextlib`):** Constructing class-based and generator-based context managers for strict resource allocation. Read [Python contextlib API](https://docs.python.org/3/library/contextlib.html)
- **FastAPI Dependency Injection:** Managing dependency scoping, overrides, and framework-level lifecycle resolution. Read [FastAPI Dependency Tutorial](https://fastapi.tiangolo.com/tutorial/dependencies/)

## Anti-patterns to refuse

- Writing database queries, domain validation logic, or raw external networking requests directly inside web framework controller routing endpoints.
- Instantiating heavyweight service clients or DB connections inside class methods, static functions, or modules instead of accepting them as injected constructor arguments.
- Placing large, unrelated segments of code inside a single `try` block, which makes it easy to accidentally catch and mask lookup, attribute, or programming errors.
- Discarding the original stack trace when transforming caught errors into domain exceptions (e.g. executing `raise MyException` without the trailing `from err`).
- Instantiating, opening, or reading lifecycled resources (like network connections, files, locks) without using `with` or `async with` context statements, leading to file descriptor or connection exhaustion.

## Evidence

For structural pattern alignments, verify dependency configuration and component separation:

- Confirm that controllers/routers only import and inject Service layers, never database ORM sessions or SQLAlchemy/SQLModel models directly.
- Inspect the file system structure to verify distinct folders for `/repositories`, `/services`, and `/controllers`.
- Run the unit tests with mock structures to ensure services can be tested fully offline without initiating raw DB or network instances.
