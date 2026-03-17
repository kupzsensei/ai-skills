# DevOps Guide

## Docker

### Dockerfile Best Practices

```dockerfile
# 1. Use specific version tags (not "latest")
FROM node:20-alpine AS base

# 2. Set working directory
WORKDIR /app

# 3. Copy dependency files first (leverage Docker layer caching)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# 4. Copy source code (this layer changes most often)
COPY . .

# 5. Build step (if needed)
FROM base AS build
RUN npm ci  # install dev dependencies for build
RUN npm run build

# 6. Production stage (multi-stage build — smaller final image)
FROM base AS production
COPY --from=build /app/dist ./dist

# 7. Run as non-root user
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
USER appuser

# 8. Expose port and set entrypoint
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Key principles:
- **Multi-stage builds**: Build in one stage, run in another. Final image has no build tools.
- **Layer ordering**: Things that change least go first (base image → deps → source).
- **`.dockerignore`**: Always include one. Exclude `node_modules`, `.git`, `*.md`, test files.
- **Non-root user**: Never run containers as root in production.
- **Health checks**: Add `HEALTHCHECK` for orchestrators to monitor.

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://cache:6379
      - NODE_ENV=development
    volumes:
      - .:/app              # Hot reload: mount source code
      - /app/node_modules   # But keep node_modules from container
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

## CI/CD

### GitHub Actions (Most Common)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npx eslint . --max-warnings=0

      - name: Unit tests
        run: npm test -- --coverage

      - name: Integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
        run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | docker login -u "${{ secrets.REGISTRY_USER }}" --password-stdin
          docker tag myapp:${{ github.sha }} registry.example.com/myapp:${{ github.sha }}
          docker push registry.example.com/myapp:${{ github.sha }}
```

### CI Pipeline Stages

```
1. Install    → npm ci / pip install (cached)
2. Lint       → eslint / ruff / clippy
3. Type Check → tsc / mypy
4. Unit Test  → jest / pytest (fast, no external deps)
5. Build      → compile / bundle
6. Integration Test → with real DB, external services
7. Security Scan → npm audit / dependency check
8. Deploy (on main) → push image, deploy to staging/production
```

## Logging

### Structured Logging

Always use structured (JSON) logging in production. It's searchable, parseable, and filterable.

```typescript
// Use a structured logger (pino, winston)
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Good: structured, searchable
logger.info({ userId: user.id, action: 'login', ip: req.ip }, 'User logged in');
// Output: {"level":30,"time":1704067200,"userId":"abc","action":"login","ip":"1.2.3.4","msg":"User logged in"}

// Bad: string concatenation (unsearchable, no structure)
console.log(`User ${user.id} logged in from ${req.ip}`);
```

### What to Log

- **Request lifecycle**: method, path, status code, duration, request ID
- **Authentication events**: login, logout, failed attempts, token refresh
- **Business events**: order created, payment processed, user role changed
- **Errors**: full error with stack trace, request context, user context
- **Performance**: slow queries, slow API calls, cache hit/miss

### What NOT to Log

- Passwords, tokens, API keys, secrets
- Full credit card numbers (only last 4)
- PII unless absolutely necessary and compliant
- Request/response bodies (too verbose for production; enable in debug mode)

### Log Levels

```
FATAL  → App is crashing, wake someone up
ERROR  → Something failed, needs attention
WARN   → Something unexpected but handled
INFO   → Normal business events (most production logs)
DEBUG  → Detailed diagnostic info (development only)
TRACE  → Very detailed, per-request diagnostics
```

## Monitoring & Health Checks

### Health Check Endpoint

Every service should expose a health check:

```typescript
app.get('/health', async (req, res) => {
  const checks = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dependencies: {
      database: await checkDb(),
      cache: await checkRedis(),
    }
  };

  const allHealthy = Object.values(checks.dependencies).every(d => d.status === 'ok');
  res.status(allHealthy ? 200 : 503).json(checks);
});

async function checkDb() {
  try {
    await db.query('SELECT 1');
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}
```

### Key Metrics to Track

- **Request rate**: requests/second by endpoint
- **Error rate**: 5xx responses / total responses
- **Latency**: p50, p95, p99 response times
- **Saturation**: CPU usage, memory usage, connection pool utilization
- **Business metrics**: signups/hour, orders/day, conversion rate

## Environment Management

### Environment Variables

```bash
# .env.example (committed to repo — documents required vars)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
API_KEY=your-api-key-here
LOG_LEVEL=info

# .env (NOT committed — contains actual secrets)
# Add to .gitignore!
```

### Environment Hierarchy

```
.env.local        → Local developer overrides (gitignored)
.env.development  → Shared development defaults
.env.test         → Test environment
.env.production   → Production (or use a secrets manager)
```

Load order: base → environment-specific → local overrides.

## Deployment Checklist

Before every production deploy:

- [ ] All tests pass in CI
- [ ] No new lint warnings
- [ ] Database migrations tested against a production-like dataset
- [ ] Environment variables set in production
- [ ] Secrets rotated if compromised or stale
- [ ] Rollback plan documented (what to do if deploy breaks)
- [ ] Monitoring/alerting in place for the new feature
- [ ] Feature flags if doing gradual rollout
- [ ] Load tested if expecting traffic increase

## Rollback Strategy

Always have a plan to undo a bad deploy:

1. **Application rollback**: Deploy previous version (keep last 3 versions available)
2. **Database rollback**: Only if migration is reversible. Forward-fix is usually safer than rolling back data changes.
3. **Feature flags**: Disable the feature without redeploying. This is the safest option for risky changes.

```
Deploy flow:
  main branch → CI → build image → push to registry → deploy to staging
  → smoke test staging → promote to production → monitor for 15 min
  → if errors spike → rollback to previous version
```
