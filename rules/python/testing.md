---
name: python-testing
description: Concrete Python testing patterns — pytest configurations, async testing with pytest-asyncio, explicit dependency mocking, and test database scoping.
version: 1.0.0
required: false
category: python
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://docs.pytest.org/en/latest/
  - https://github.com/pytest-dev/pytest-mock/
  - https://pytest-asyncio.readthedocs.io/en/latest/
applies_to:
  - "tests/**/*.py"
  - "**/*_test.py"
  - "**/test_*.py"
  - "pyproject.toml"
---

# Python Testing Rules

**Load when:** Adding, changing, or reviewing Python tests, configuring test suites, or making behavior changes that require test coverage.

## Version Awareness

Identify which testing runner and plugins the project uses (standard `pytest`, `pytest-asyncio`, `pytest-cov`, `pytest-mock`, or standard library `unittest`). Inspect `pyproject.toml` or `requirements.txt` for configuration keys. Ensure code uses modern pytest features (like standard function-based tests with fixtures) rather than outdated, boilerplate-heavy class-based `unittest.TestCase` structures unless working inside a legacy code path.

## Sources

- pytest Documentation — https://docs.pytest.org/en/latest/
- pytest-asyncio Reference — https://pytest-asyncio.readthedocs.io/en/latest/
- pytest-mock Guide — https://github.com/pytest-dev/pytest-mock/

## Rules

### What to test

- **Services and Business Logic:** Verify all public service methods, parameter boundaries, success states, and expected exceptions.
- **API Endpoints (Controllers):** Test route resolution, request schema validation, status codes, response payloads (validated against Pydantic models), headers, and transactional rollbacks.
- **Repositories (Persistence):** Test query logic, database schema constraints, and index filters against a dedicated, isolated test database instance (such as an in-memory SQLite database or a containerized backend with immediate rollback).

Always test behavior over internal implementation details: assert visible changes in state, returned structures, or emitted system actions rather than asserting on private helper methods or raw variables that could easily be refactored.

### Modern pytest setup with Fixtures

Use `pytest` fixtures for setup, teardown, and dependency injections. Declare the fixture scope (`function`, `module`, `session`) explicitly. Utilize `yield` statements to ensure that lifecycled resources (like network connections, temporary files, or database sessions) are safely cleaned up even if test assertions fail.

```python
# CORRECT — Resource setup and teardown using yield
import pytest
from my_package.db import DatabaseConnection

@pytest.fixture(scope="function")
def db_session():
    # Setup
    session = DatabaseConnection(connection_string="sqlite:///:memory:")
    session.initialize_schema()
    yield session
    # Teardown / Cleanup
    session.close()
```

```python
# WRONG — Manual resource creation inside tests without teardown safety
def test_user_creation():
    # If this test fails halfway, the database file or session remains open and locked
    session = DatabaseConnection(connection_string="sqlite:///:memory:")
    session.initialize_schema()
    session.create_user(username="alice")
    assert session.get_user(username="alice") is not None
    session.close()
```

### Async Testing

Write async tests using `pytest-asyncio` or `anyio`. Mark async test functions with `@pytest.mark.asyncio`. If the project targets Python 3.11+ and uses modern async loop configurations, make sure the loop scope is managed safely.

```python
# CORRECT — Async testing with pytest-asyncio
import pytest
from my_package.client import AsyncClient

@pytest.mark.asyncio
async def test_async_fetch():
    async with AsyncClient() as client:
        response = await client.get_data("https://api.example.com/status")
        assert response.status_code == 200
```

```python
# WRONG — Blocking event loop calls inside standard sync tests
import asyncio
from my_package.client import AsyncClient

def test_async_fetch():
    client = AsyncClient()
    # Runs the loop manually, prone to nested event loop conflicts
    response = asyncio.run(client.get_data("https://api.example.com/status"))
    assert response.status_code == 200
```

### Mocking and Patching discipline

Use `pytest-mock`'s `mocker` fixture over raw `unittest.mock.patch` decorators. Mock external APIs and third-party dependencies at the boundary (e.g. mock where the module is imported, not where it is defined). Avoid mocking internal business structures or models when real instances can easily be constructed, as over-mocking leads to brittle tests that pass even when integration is broken.

```python
# CORRECT — Mocking external boundaries using the mocker fixture
def test_process_payment(mocker):
    # Mock only the external gateway call
    mock_charge = mocker.patch("my_package.services.payment.StripeClient.create_charge")
    mock_charge.return_value = {"status": "success", "charge_id": "ch_123"}

    service = PaymentService()
    result = service.process(amount=100)
    
    assert result["success"] is True
    mock_charge.assert_called_once_with(100)
```

```python
# WRONG — Over-mocking internal structures
def test_process_payment(mocker):
    # Mocking internal state and dependencies completely, making the assertion useless
    mock_service = mocker.patch("my_package.services.payment.PaymentService")
    mock_service.process.return_value = {"success": True}
    
    # We are testing the mock itself, not our production service implementation!
    result = mock_service.process(amount=100)
    assert result["success"] is True
```

## Deep-Dive Reference Materials

Coding agents should fetch the raw text of these references programmatically when constructing complex fixtures, mocking nested clients, or troubleshooting asynchronous test runners:

- **pytest fixture lifecycles:** Understanding scopes, parameterization, and teardown execution order. Read [pytest Fixtures Guide](https://docs.pytest.org/en/latest/explanation/fixtures.html)
- **pytest-asyncio specifications:** Configuration of event loops and running concurrent async test runs. Read [pytest-asyncio Reference](https://pytest-asyncio.readthedocs.io/en/latest/reference/index.html)
- **Mocking at the right place:** Detailed guide on where to patch external libraries and drivers. Read [Where to Patch Guide](https://docs.python.org/3/library/unittest.mock.html#where-to-patch)

## Anti-patterns to refuse

- Mixing test styles or utilizing legacy class-based `unittest.TestCase` structures on clean, modern Python 3.10+ projects.
- Creating flaky tests by writing to shared global variables or persistent databases without restoring or rolling back state in a teardown hook.
- Using blind delays like `time.sleep` or `asyncio.sleep` to wait for background workers or parallel tasks. Use polling assertions or wait-conditions instead.
- Swallowing test failures by placing overly broad assertions or wrapping assertion checks inside broad `try/except` blocks.

## Evidence

For testing-aligned Python changes, verify execution success:

- Run `pytest` or `pytest -v` to run the active test suite.
- Run `pytest --cov=src` to check code coverage metrics and ensure touched paths are fully verified.
- Confirm that all async tests are clearly marked with `@pytest.mark.asyncio` or configured via `asyncio_mode = "auto"` inside `pyproject.toml`.
