# Testing Patterns

## Testing Pyramid

```
         /  E2E  \        ← Few: critical user flows only
        / Integration \    ← Some: API endpoints, DB queries, component interactions
       /     Unit      \   ← Many: individual functions, pure logic, edge cases
```

More unit tests, fewer E2E tests. Unit tests are fast, reliable, and cheap to maintain. E2E tests are slow, flaky, and expensive — but essential for critical paths.

## Unit Testing

### Structure: Arrange → Act → Assert

Every test follows the same pattern:

```typescript
describe('calculateDiscount', () => {
  it('applies 10% discount for orders over $100', () => {
    // Arrange
    const order = { subtotalCents: 15000 }; // $150

    // Act
    const result = calculateDiscount(order);

    // Assert
    expect(result.discountCents).toBe(1500);
    expect(result.totalCents).toBe(13500);
  });

  it('applies no discount for orders under $100', () => {
    const order = { subtotalCents: 5000 };
    const result = calculateDiscount(order);
    expect(result.discountCents).toBe(0);
  });

  it('handles zero-value orders', () => {
    const order = { subtotalCents: 0 };
    const result = calculateDiscount(order);
    expect(result.discountCents).toBe(0);
    expect(result.totalCents).toBe(0);
  });

  it('throws on negative amounts', () => {
    const order = { subtotalCents: -100 };
    expect(() => calculateDiscount(order)).toThrow('Amount cannot be negative');
  });
});
```

### What to Test

For each function, test:
- **Happy path**: Normal expected inputs
- **Edge cases**: Empty strings, zero, boundary values, max/min values
- **Error cases**: Invalid inputs, missing fields, null/undefined
- **Type coercion traps**: What happens with `"5"` vs `5`, `null` vs `undefined` vs `""`

### Test Naming

Test names should read like specifications:
```
✓ creates a user with valid email and name
✓ rejects duplicate email addresses
✓ trims whitespace from email before saving
✗ Bad: "test user creation"
✗ Bad: "test1", "test2"
```

## Mocking

### When to Mock

Mock **external boundaries** — things outside your unit's control:
- Database calls
- HTTP requests to external APIs
- File system operations
- Time-dependent operations (`Date.now()`)
- Random number generation

Don't mock **internal logic** — if you're mocking half the functions in the module you're testing, you're testing nothing.

### Mocking Patterns (TypeScript/Jest)

```typescript
// Mock an external service
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ sent: true })
}));

// Mock with implementation
const mockDb = {
  findUser: jest.fn().mockImplementation((id: string) => {
    if (id === 'existing') return { id, name: 'Test User' };
    return null;
  })
};

// Verify mock was called correctly
expect(mockDb.findUser).toHaveBeenCalledWith('existing');
expect(mockDb.findUser).toHaveBeenCalledTimes(1);

// Mock time
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-15'));
// ... test time-dependent code
jest.useRealTimers();
```

### Mocking Patterns (Python/pytest)

```python
from unittest.mock import patch, MagicMock

# Mock an external call
@patch('services.email.send_email')
def test_user_signup_sends_welcome_email(mock_send):
    mock_send.return_value = True
    result = signup_user("test@example.com", "password123")
    mock_send.assert_called_once_with("test@example.com", subject="Welcome!")

# Mock with side effects
@patch('services.db.get_user')
def test_handles_db_failure(mock_get):
    mock_get.side_effect = ConnectionError("DB down")
    with pytest.raises(ServiceUnavailableError):
        get_user_profile(user_id=1)
```

## Integration Testing

### API Integration Tests

Test the full request → handler → database → response cycle:

```typescript
import request from 'supertest';
import { app } from '../app';
import { db } from '../db';

describe('POST /api/v1/users', () => {
  beforeEach(async () => {
    await db.query('DELETE FROM users'); // Clean slate
  });

  afterAll(async () => {
    await db.end(); // Close connection pool
  });

  it('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ email: 'test@example.com', name: 'Test User' })
      .expect(201);

    expect(res.body.data.email).toBe('test@example.com');
    expect(res.body.data.id).toBeDefined();

    // Verify it's actually in the database
    const dbUser = await db.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
    expect(dbUser.rows).toHaveLength(1);
  });

  it('returns 409 for duplicate email', async () => {
    await request(app)
      .post('/api/v1/users')
      .send({ email: 'dup@test.com', name: 'First' });

    await request(app)
      .post('/api/v1/users')
      .send({ email: 'dup@test.com', name: 'Second' })
      .expect(409);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'No Email' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Database Integration Tests

```python
import pytest
from app.models import User
from app.db import get_session

@pytest.fixture
def db_session():
    session = get_session()
    yield session
    session.rollback()  # Undo everything after each test
    session.close()

def test_create_user(db_session):
    user = User(email="test@example.com", name="Test")
    db_session.add(user)
    db_session.flush()

    assert user.id is not None
    assert user.created_at is not None

def test_unique_email_constraint(db_session):
    user1 = User(email="same@test.com", name="First")
    db_session.add(user1)
    db_session.flush()

    user2 = User(email="same@test.com", name="Second")
    db_session.add(user2)
    with pytest.raises(IntegrityError):
        db_session.flush()
```

## Test Data Management

### Factories / Fixtures

Don't hardcode test data everywhere. Use factories:

```typescript
// test/factories/user.ts
export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id ?? randomUUID(),
    email: overrides.email ?? `user-${randomUUID()}@test.com`,
    name: overrides.name ?? 'Test User',
    role: overrides.role ?? 'user',
    createdAt: overrides.createdAt ?? new Date(),
    ...overrides,
  };
}

// In tests
const admin = buildUser({ role: 'admin' });
const recentUser = buildUser({ createdAt: new Date('2024-01-01') });
```

### Database Cleanup Strategies

- **Transaction rollback**: Wrap each test in a transaction, rollback after. Fast, clean. (Best for integration tests.)
- **Truncate tables**: `TRUNCATE users, orders CASCADE` between tests. Slower but resets sequences.
- **Separate test database**: Never run tests against production or shared development databases.

## Test Configuration

### Jest (TypeScript/JavaScript)

```json
// jest.config.js or package.json
{
  "testMatch": ["**/__tests__/**/*.test.ts", "**/*.spec.ts"],
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

### Pytest (Python)

```ini
# pytest.ini or pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
addopts = "-v --tb=short --strict-markers"
markers = [
    "slow: marks tests as slow",
    "integration: marks integration tests",
]
```

## Common Testing Mistakes

- **Testing implementation, not behavior.** Don't assert that a function calls another function in a specific order. Assert that the observable outcome is correct.
- **Tests that depend on each other.** Each test should run in isolation. If test B fails only when test A doesn't run first, both tests are broken.
- **Over-mocking.** If your test has more mock setup than assertions, you're probably not testing anything useful.
- **Skipping error paths.** The happy path is easy. Bugs live in error handling.
- **Flaky tests left to rot.** A flaky test is worse than no test — it erodes confidence in the entire suite. Fix or remove it immediately.
