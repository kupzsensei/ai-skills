# Tech Stack Selection Guide

Choosing the right tech stack is one of the most impactful decisions in a project. Changing it later is expensive. This guide helps you make a deliberate choice.

## Decision Framework

Ask these questions in order:

### 1. What type of application is this?

**Static site / Marketing page / Blog**
→ HTML/CSS/JS, or a static site generator (Astro, Hugo, Next.js static export)
→ No backend needed unless there's dynamic content

**Single Page Application (SPA) / Dashboard**
→ React + TypeScript (most ecosystem support, largest talent pool)
→ Vue + TypeScript (simpler mental model, great docs)
→ Svelte + TypeScript (best performance, smallest bundle, newer ecosystem)

**Full-stack web app (CRUD, user accounts, data-heavy)**
→ Next.js + TypeScript (React-based, SSR/SSG, API routes built in)
→ Remix + TypeScript (nested routes, great data loading patterns)
→ Django + Python (batteries-included, admin panel, ORM, great for data-heavy apps)
→ Rails + Ruby (convention over configuration, rapid prototyping)
→ Laravel + PHP (mature ecosystem, elegant syntax)

**API / Backend service**
→ Express + TypeScript (flexible, huge middleware ecosystem)
→ Fastify + TypeScript (faster than Express, good DX)
→ FastAPI + Python (async, auto-docs, type hints, great for ML integration)
→ Go + standard library or Gin/Echo (best for high-performance microservices)
→ Rust + Actix/Axum (maximum performance, memory safety)

**CLI tool**
→ Node.js + TypeScript (fast to build, good library support)
→ Python (excellent argparse/click, great for scripting)
→ Go (compiles to single binary, great cross-platform)
→ Rust (performance-critical CLIs, great error handling)

**Mobile app**
→ React Native + TypeScript (code sharing with web)
→ Flutter + Dart (best cross-platform UI consistency)
→ Swift/Kotlin (best platform-native experience)

**Real-time application (chat, collaboration, live data)**
→ Node.js + Socket.io/ws (WebSocket-native runtime)
→ Elixir + Phoenix (built for massive concurrency)
→ Go + goroutines (efficient concurrency model)

### 2. What database fits?

**Relational data with complex queries and relationships**
→ PostgreSQL (most capable open-source RDBMS, JSON support, extensions)

**Simple relational data, lightweight needs**
→ SQLite (zero-config, embedded, great for prototyping and small apps)

**Document-oriented, flexible schema**
→ MongoDB (when schema truly varies per record)
→ But honestly: PostgreSQL with JSONB columns handles most "document" use cases

**Key-value, caching, sessions**
→ Redis (in-memory, blazing fast, pub/sub support)

**Search**
→ PostgreSQL full-text search (good enough for most cases)
→ Elasticsearch/Meilisearch (when search is a core feature)

**Time series**
→ TimescaleDB (PostgreSQL extension — use what you know)

### 3. What constraints matter most?

| Constraint | Recommendation |
|---|---|
| Speed of development | Next.js, Django, Rails |
| Runtime performance | Go, Rust, Fastify |
| Team familiarity | Match existing skills |
| Hiring / community | React, Python, TypeScript |
| Deployment simplicity | Go (single binary), Docker |
| Cost | SQLite + static hosting for small projects |

## Anti-Patterns to Avoid

- **Microservices for a small project.** Start with a monolith. Split later when you have clear domain boundaries and scaling needs.
- **MongoDB because "it's flexible."** If your data has relationships (most apps), use PostgreSQL. Schema flexibility usually means schema chaos.
- **GraphQL for a simple CRUD app.** REST is simpler to build, debug, cache, and document. GraphQL shines when you have many consumers with different data needs.
- **Kubernetes for a side project.** A single server with Docker Compose handles more traffic than you think.
- **Choosing the newest framework.** Mature frameworks have answered more questions, fixed more bugs, and have better docs. Boring technology is a feature.

## Default Stack (When You Have No Strong Preferences)

For most web applications, this stack is a safe, productive default:

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express/Fastify + TypeScript (or Next.js API routes)
- **Database**: PostgreSQL
- **ORM**: Prisma (TypeScript) or Drizzle (TypeScript, lighter)
- **Auth**: JWT with refresh tokens, or a managed service
- **Testing**: Vitest (unit) + Supertest (API) + Playwright (E2E)
- **Deployment**: Docker + any cloud provider

This isn't always the best stack — but it's rarely the wrong one.
