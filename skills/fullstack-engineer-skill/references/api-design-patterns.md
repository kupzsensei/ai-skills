# API Design Patterns

## RESTful Design Principles

### URL Structure
Use nouns, not verbs. The HTTP method is the verb.

```
GET    /api/v1/users          → List users
POST   /api/v1/users          → Create user
GET    /api/v1/users/:id      → Get user by ID
PUT    /api/v1/users/:id      → Replace user
PATCH  /api/v1/users/:id      → Partial update user
DELETE /api/v1/users/:id      → Delete user

# Nested resources (when the child only makes sense in parent context)
GET    /api/v1/users/:id/posts     → List user's posts
POST   /api/v1/users/:id/posts     → Create post for user

# Actions that don't map to CRUD (use verbs sparingly, as sub-resources)
POST   /api/v1/users/:id/verify    → Trigger verification
POST   /api/v1/orders/:id/cancel   → Cancel order
```

### HTTP Status Codes (Use the Right Ones)

**Success:**
- `200 OK` — General success, response has body
- `201 Created` — Resource created, include `Location` header
- `204 No Content` — Success, no response body (good for DELETE)

**Client errors:**
- `400 Bad Request` — Malformed request or validation error
- `401 Unauthorized` — Not authenticated (misleading name, but standard)
- `403 Forbidden` — Authenticated but not authorized
- `404 Not Found` — Resource doesn't exist
- `409 Conflict` — Duplicate or state conflict
- `422 Unprocessable Entity` — Semantic validation error (valid syntax, invalid data)
- `429 Too Many Requests` — Rate limited

**Server errors:**
- `500 Internal Server Error` — Unhandled server error
- `502 Bad Gateway` — Upstream service failed
- `503 Service Unavailable` — Temporarily down (maintenance, overload)

### Consistent Response Format

Every API should use a consistent response envelope:

**Success response:**
```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

**List response:**
```json
{
  "data": [ ... ],
  "meta": {
    "total": 142,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

**Error response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Must be a valid email address" },
      { "field": "age", "message": "Must be a positive number" }
    ]
  }
}
```

## Pagination

Always paginate list endpoints. Three common approaches:

**Offset-based** (simplest, most common):
```
GET /api/v1/users?page=2&pageSize=20
```
Pros: Simple, allows jumping to any page.
Cons: Inconsistent when data changes between requests (items can be skipped or duplicated).

**Cursor-based** (recommended for feeds, large datasets):
```
GET /api/v1/users?cursor=eyJpZCI6MTAwfQ&limit=20
```
Pros: Consistent pagination, good performance.
Cons: Can't jump to arbitrary page.

**Key-set / seek pagination** (best performance on large tables):
```
GET /api/v1/users?after_id=100&limit=20
```
Backed by: `WHERE id > 100 ORDER BY id LIMIT 20`

## Filtering & Sorting

```
# Filtering
GET /api/v1/users?status=active&role=admin

# Sorting
GET /api/v1/users?sort=created_at&order=desc

# Multiple sort fields
GET /api/v1/users?sort=role,-created_at   (- prefix for descending)

# Date range
GET /api/v1/events?start_date=2024-01-01&end_date=2024-12-31

# Search
GET /api/v1/users?q=john
```

## Rate Limiting

Implement rate limiting on all public endpoints. Return these headers:

```
X-RateLimit-Limit: 100        # Max requests per window
X-RateLimit-Remaining: 87     # Requests remaining
X-RateLimit-Reset: 1640000000 # UTC timestamp when window resets
Retry-After: 30               # Seconds to wait (on 429 responses)
```

Common strategies:
- **Fixed window**: 100 requests per minute (simple, can burst at window boundaries)
- **Sliding window**: Smooths out bursts (more complex)
- **Token bucket**: Allows controlled bursts (best for most APIs)

## Authentication Patterns

### JWT (JSON Web Tokens)

```
Access Token:  Short-lived (15 min), sent in Authorization header
Refresh Token: Long-lived (7-30 days), sent in httpOnly cookie

Flow:
1. Login → receive access_token + refresh_token
2. API requests → Authorization: Bearer <access_token>
3. Access token expires → POST /api/v1/auth/refresh with refresh_token cookie
4. Refresh token expires → re-login
5. Logout → POST /api/v1/auth/logout (revoke refresh token server-side)
```

### API Keys
For server-to-server or third-party integrations:
```
Authorization: Bearer sk_live_abc123def456

# Or as query param (less secure, logged in URLs)
GET /api/v1/data?api_key=sk_live_abc123def456
```

Always support key rotation (user can create multiple keys, revoke old ones).

## Versioning

Version from day one. Use URL prefix versioning (most explicit and discoverable):
```
/api/v1/users
/api/v2/users
```

When to bump the version: breaking changes to response shape, removed fields, changed behavior. Non-breaking additions (new fields, new endpoints) don't require a new version.

## Error Handling Middleware Pattern

```typescript
// Centralized error handling (Express example)
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any[]
  ) {
    super(message);
  }
}

// Usage in routes
if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

// Global error handler
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = status === 500 ? 'Internal server error' : err.message;

  // Log the full error server-side
  logger.error({ err, requestId: req.id, path: req.path });

  // Return clean error to client
  res.status(status).json({
    error: { code, message, details: err.details }
  });
});
```

## Idempotency

For operations that can be accidentally retried (network timeouts, user double-clicks):

```
POST /api/v1/payments
Idempotency-Key: unique-client-generated-key

# Server checks: have I seen this key before?
# Yes → return the cached response
# No  → process the request, cache the response with this key
```

Critical for: payment processing, order creation, any state-changing operation where duplicates would be harmful.
