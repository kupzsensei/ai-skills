# Database Design Patterns

## Schema Design Principles

### Start Normalized, Denormalize Deliberately

Begin with 3rd normal form (3NF): no duplicate data, every non-key column depends on the whole key.

```sql
-- Good: normalized
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    status      VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_cents INTEGER NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    price_cents INTEGER NOT NULL
);
```

Denormalize only when you have measured performance problems. Common acceptable denormalizations:
- Storing a computed `total_cents` on orders (instead of always summing items)
- Caching a user's `post_count` if you display it on every profile view
- Storing `author_name` alongside a post if you display it constantly

Always document why you denormalized and keep the source of truth clear.

### Standard Columns (Every Table)

```sql
id          SERIAL PRIMARY KEY,        -- or UUID or BIGSERIAL
created_at  TIMESTAMPTZ DEFAULT NOW(), -- always know when data was created
updated_at  TIMESTAMPTZ DEFAULT NOW()  -- always know when it changed
```

Use `TIMESTAMPTZ` (timestamp with time zone), never `TIMESTAMP` without timezone. Store everything in UTC.

### Naming Conventions

- Tables: `snake_case`, plural (`users`, `order_items`)
- Columns: `snake_case`, singular (`user_id`, `created_at`)
- Foreign keys: `{referenced_table_singular}_id` (`user_id`, `product_id`)
- Indexes: `idx_{table}_{columns}` (`idx_orders_user_id`)
- Unique constraints: `uniq_{table}_{columns}` (`uniq_users_email`)

### Soft Deletes vs Hard Deletes

**Soft delete**: Add a `deleted_at TIMESTAMPTZ` column. "Deleted" records stay in the DB.
```sql
-- "Delete" a user
UPDATE users SET deleted_at = NOW() WHERE id = 123;

-- Query only active users
SELECT * FROM users WHERE deleted_at IS NULL;
```

**When to use soft deletes:**
- User data (GDPR compliance, audit trail, accidental deletion recovery)
- Financial records (never lose transaction history)
- Content with references (comments, posts that others link to)

**When to hard delete:**
- Session data, temporary records, caches
- When storage is a concern and data is truly disposable
- When privacy regulations require actual deletion

## Migrations

Never modify a production database by hand. Always use migration files.

### Migration Best Practices

```sql
-- migrations/001_create_users.sql
-- Up
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Down
DROP TABLE users;
```

Rules:
- Each migration is a single, atomic change
- Migrations are numbered sequentially and never reordered
- Never modify a migration that has been applied to production — write a new one
- Test migrations against a copy of production data, not just empty databases
- Make migrations reversible when possible (include the "down" migration)

### Safe Column Operations

```sql
-- SAFE: Adding a nullable column (no lock)
ALTER TABLE users ADD COLUMN bio TEXT;

-- SAFE: Adding a column with a default (PG 11+, no rewrite)
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';

-- DANGEROUS: Adding a NOT NULL column without default (locks table, rewrites)
-- Do this instead:
ALTER TABLE users ADD COLUMN phone VARCHAR(50);        -- 1. Add nullable
UPDATE users SET phone = '' WHERE phone IS NULL;        -- 2. Backfill
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;      -- 3. Add constraint
ALTER TABLE users ALTER COLUMN phone SET DEFAULT '';     -- 4. Set default

-- DANGEROUS: Renaming a column (breaks queries)
-- Do this instead: add new column, migrate data, update code, drop old column
```

## Indexing

### What to Index

- Primary keys (automatic)
- Foreign keys (not automatic in most DBs — always add these)
- Columns in WHERE clauses that are queried frequently
- Columns in ORDER BY clauses
- Columns in JOIN conditions
- Columns with UNIQUE constraints (automatic)

### What Not to Index

- Columns with very low cardinality (boolean flags on large tables — index won't help)
- Tables with very few rows (sequential scan is faster)
- Columns that are rarely queried

### Index Types

```sql
-- B-tree (default, good for equality and range queries)
CREATE INDEX idx_users_email ON users(email);

-- Composite (for queries filtering on multiple columns, order matters)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Good for: WHERE user_id = 1 AND status = 'active'
-- Good for: WHERE user_id = 1 (leftmost prefix)
-- NOT good for: WHERE status = 'active' (missing leftmost column)

-- Partial (index only a subset of rows)
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';
-- Smaller index, faster queries when you always filter by status

-- GIN (for full-text search, JSONB, arrays)
CREATE INDEX idx_posts_search ON posts USING GIN(to_tsvector('english', title || ' ' || body));
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);
```

### Checking Query Performance

```sql
-- Always EXPLAIN ANALYZE before and after adding indexes
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123 AND status = 'active';

-- Look for:
-- Seq Scan  → bad on large tables (missing index)
-- Index Scan / Index Only Scan → good
-- Rows (estimated vs actual) → if way off, run ANALYZE
```

## Query Optimization

### Common Performance Killers

```sql
-- BAD: N+1 queries (1 query + N queries for related data)
-- Fetching all users, then for each user, fetching their orders
SELECT * FROM users;
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 2;
-- ...

-- GOOD: Join or subquery
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;

-- Or: batch the IDs
SELECT * FROM orders WHERE user_id IN (1, 2, 3, ...);
```

```sql
-- BAD: SELECT * when you only need a few columns
SELECT * FROM users;   -- fetches 20 columns, you need 3

-- GOOD: Select only what you need
SELECT id, name, email FROM users;
```

```sql
-- BAD: Unindexed LIKE with leading wildcard
SELECT * FROM users WHERE name LIKE '%john%';  -- can't use index

-- BETTER: Full-text search
SELECT * FROM users WHERE to_tsvector('english', name) @@ to_tsquery('john');
```

## Connection Pooling

Never open a new database connection per request. Use a connection pool.

```
Application → Connection Pool → Database
                (5-20 connections shared across all requests)
```

Typical settings:
- **min**: 2-5 connections (kept warm)
- **max**: 10-20 connections (upper limit per application instance)
- **idle timeout**: 10-30 seconds (release unused connections)

Most ORMs handle this automatically (Prisma, SQLAlchemy, etc.), but verify the pool is configured.

## Transactions

Use transactions when multiple operations must succeed or fail together:

```sql
BEGIN;
  INSERT INTO orders (user_id, total_cents, status) VALUES (1, 5000, 'paid');
  UPDATE users SET order_count = order_count + 1 WHERE id = 1;
  UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 42;
COMMIT;
-- If any statement fails, ROLLBACK undoes all of them
```

### Isolation Levels (from least to most strict)

- **READ UNCOMMITTED**: Can see uncommitted changes from other transactions (almost never use this)
- **READ COMMITTED**: Default in PostgreSQL. Only sees committed data. Good for most cases.
- **REPEATABLE READ**: Snapshot at transaction start. Good for reports and batch operations.
- **SERIALIZABLE**: Full isolation. Use for financial operations where correctness is critical.

## Common Patterns

### Optimistic Locking
Prevent lost updates when two users edit the same record:

```sql
-- Add a version column
ALTER TABLE articles ADD COLUMN version INTEGER DEFAULT 1;

-- Update with version check
UPDATE articles
SET title = 'New Title', version = version + 1
WHERE id = 123 AND version = 5;
-- If 0 rows affected → someone else updated it → retry or error
```

### Audit Trail
Track who changed what and when:

```sql
CREATE TABLE audit_log (
    id          SERIAL PRIMARY KEY,
    table_name  VARCHAR(100) NOT NULL,
    record_id   INTEGER NOT NULL,
    action      VARCHAR(10) NOT NULL,  -- INSERT, UPDATE, DELETE
    old_data    JSONB,
    new_data    JSONB,
    changed_by  INTEGER REFERENCES users(id),
    changed_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### UPSERT (Insert or Update)
```sql
INSERT INTO user_settings (user_id, theme, language)
VALUES (1, 'dark', 'en')
ON CONFLICT (user_id)
DO UPDATE SET theme = EXCLUDED.theme, language = EXCLUDED.language, updated_at = NOW();
```
