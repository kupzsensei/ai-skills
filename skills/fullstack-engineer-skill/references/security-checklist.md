# Security Checklist for Web Applications

Run through this checklist before delivering any web application. Not every item applies to every project, but you should consciously decide to skip items rather than forget them.

## Authentication & Authorization

- [ ] Passwords are hashed with bcrypt/argon2/scrypt (NEVER plain text, NEVER MD5/SHA)
- [ ] Password minimum length enforced (12+ characters recommended)
- [ ] Rate limiting on login endpoints (prevent brute force)
- [ ] Account lockout or exponential backoff after failed attempts
- [ ] JWT tokens have reasonable expiry (15min access, 7d refresh)
- [ ] Refresh tokens are stored securely (httpOnly cookie, not localStorage)
- [ ] Token revocation mechanism exists (for logout, password change)
- [ ] Authorization checked on EVERY endpoint, not just the frontend
- [ ] Role-based or attribute-based access control is enforced server-side
- [ ] API keys are scoped to minimum required permissions

## Input Validation & Injection

- [ ] All user inputs validated on the server (never trust client-side validation alone)
- [ ] SQL queries use parameterized statements / prepared statements (NEVER string concatenation)
- [ ] NoSQL injection vectors covered (MongoDB $where, $regex, etc.)
- [ ] HTML output is escaped/sanitized to prevent XSS
- [ ] File uploads validated: type, size, filename sanitized, stored outside web root
- [ ] Command injection prevented (never pass user input to shell commands)
- [ ] Path traversal prevented (validate file paths, no ../ sequences)
- [ ] Email/URL inputs validated with proper parsing, not regex alone
- [ ] JSON/XML parsers configured to prevent entity expansion attacks

## HTTP Security

- [ ] HTTPS enforced everywhere (HSTS header set)
- [ ] CORS configured restrictively (specific origins, not wildcard in production)
- [ ] Security headers set:
  - `Content-Security-Policy` (prevent XSS, restrict resource loading)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` or `SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (restrict browser features you don't use)
- [ ] Cookies set with `Secure`, `HttpOnly`, `SameSite` flags
- [ ] CSRF protection on state-changing endpoints (token or SameSite cookies)
- [ ] Rate limiting on all public endpoints

## Data Protection

- [ ] Sensitive data encrypted at rest (database encryption, encrypted backups)
- [ ] Sensitive data encrypted in transit (TLS 1.2+)
- [ ] PII (personally identifiable information) identified and handled with care
- [ ] Secrets stored in environment variables, NOT in code or config files
- [ ] `.env` files are in `.gitignore`
- [ ] Logs do NOT contain passwords, tokens, credit card numbers, or PII
- [ ] Database backups are encrypted and access-controlled
- [ ] Soft-delete considered for user data (for audit trails and data recovery)

## API Security

- [ ] Authentication required on all non-public endpoints
- [ ] Request body size limits set (prevent abuse)
- [ ] Pagination enforced on list endpoints (prevent data dumps)
- [ ] Sensitive data filtered from API responses (no password hashes, internal IDs unless needed)
- [ ] API versioning in place
- [ ] Error responses don't leak internal details (stack traces, database errors, file paths)
- [ ] GraphQL: depth limiting, query cost analysis, introspection disabled in production

## Dependencies & Supply Chain

- [ ] Dependencies pinned to specific versions (lockfile committed)
- [ ] Known vulnerabilities checked: `npm audit` / `pip audit` / `cargo audit`
- [ ] Unnecessary dependencies removed
- [ ] Dependencies sourced from official registries only
- [ ] No vendored code with known vulnerabilities

## Deployment & Infrastructure

- [ ] Production environment variables are different from development
- [ ] Debug mode / development mode disabled in production
- [ ] Default passwords and accounts removed/changed
- [ ] File permissions restricted (principle of least privilege)
- [ ] Database not exposed to public internet
- [ ] Firewall rules configured (only expose necessary ports)
- [ ] Docker images use specific version tags, not `latest`
- [ ] Docker containers run as non-root user

## Error Handling & Logging

- [ ] Application errors are caught and handled gracefully
- [ ] Error messages shown to users are generic ("Something went wrong") not technical
- [ ] Detailed errors logged server-side for debugging
- [ ] Logging includes: timestamp, request ID, user ID, action, outcome
- [ ] Logging does NOT include: passwords, tokens, full credit card numbers, session IDs

## Common Vulnerability Quick Checks

| Vulnerability | Quick Test |
|---|---|
| SQL Injection | Try `' OR 1=1 --` in input fields |
| XSS | Try `<script>alert('xss')</script>` in text fields |
| CSRF | Can you submit a form from another domain? |
| IDOR | Can you access another user's data by changing an ID in the URL? |
| Open Redirect | Does `?redirect=https://evil.com` work? |
| Path Traversal | Try `../../etc/passwd` in file parameters |
