---
name: project-memory
description: >
  A project memory and indexing skill that makes Claude remember everything across sessions. Use this skill at the START of every conversation and at the END of every conversation. Triggers automatically whenever Claude opens a project, starts a new session, finishes a task, makes architectural decisions, encounters bugs, or when the user says "remember this", "save progress", "what did we do last time", "continue where we left off", "index this project", "map the codebase", or "update memory". This skill ensures zero context loss between sessions — Claude always knows what happened before, what the project looks like, what decisions were made, and what's next.
---

# Project Memory Skill

You have persistent memory across sessions. At the start of every conversation, you load it. At the end of every conversation (or at key milestones), you save it. You never lose context, you never ask "what does this project do?" twice, and you never repeat work.

The memory lives in a `.claude/memory/` directory inside the project. It's just markdown and JSON files — human-readable, version-controllable, and portable.

---

## Memory Architecture

```
.claude/
└── memory/
    ├── index.md              # Project map: file tree, tech stack, architecture
    ├── decisions.md          # Every architectural/technical decision and WHY
    ├── sessions.md           # Log of what happened in each session
    ├── bugs.md               # Bugs encountered, how they were fixed, lessons learned
    ├── todo.md               # What's pending, in progress, and blocked
    └── file-index.json       # Quick lookup: every file, what it does, key exports
```

---

## On Session Start (ALWAYS DO THIS)

Every time a conversation begins in a project directory, run this sequence before doing anything else:

### Step 1: Check for existing memory

```bash
if [ -d ".claude/memory" ]; then
    echo "Memory found — loading context..."
    cat .claude/memory/index.md
    cat .claude/memory/sessions.md | tail -100
    cat .claude/memory/todo.md
    cat .claude/memory/decisions.md | tail -50
else
    echo "No memory found — running first-time indexing..."
fi
```

### Step 2A: If memory exists — load and summarize

Read the memory files and give the user a brief status update:

> "Welcome back. Here's where we are:
> - **Project**: [name] — [one-line description]
> - **Last session**: [date] — [what was accomplished]
> - **Open items**: [list from todo.md]
> - **In progress**: [anything left incomplete]
>
> Ready to continue. What are we working on today?"

This should take 5 seconds, not 5 minutes. Be concise.

### Step 2B: If no memory exists — run first-time indexing

This is the deep scan that creates the initial project map. See the "First-Time Indexing" section below.

---

## First-Time Indexing

When entering a project for the first time (no `.claude/memory/` directory), perform a comprehensive scan.

### Step 1: Create memory directory

```bash
mkdir -p .claude/memory
```

### Step 2: Map the project structure

```bash
# Get the full file tree (excluding noise)
find . -type f \
    -not -path '*/node_modules/*' \
    -not -path '*/.git/*' \
    -not -path '*/venv/*' \
    -not -path '*/__pycache__/*' \
    -not -path '*/.next/*' \
    -not -path '*/dist/*' \
    -not -path '*/build/*' \
    -not -path '*/.claude/*' \
    -not -path '*/coverage/*' \
    -not -path '*/.env' \
    -not -name '*.lock' \
    -not -name 'package-lock.json' \
    | sort > /tmp/project_files.txt

# Count by file type
echo "=== File type breakdown ==="
cat /tmp/project_files.txt | sed 's/.*\.//' | sort | uniq -c | sort -rn

# Count total files and lines
echo "=== Scale ==="
wc -l /tmp/project_files.txt
cat /tmp/project_files.txt | xargs wc -l 2>/dev/null | tail -1
```

### Step 3: Identify the tech stack

```bash
# Check for package managers and dependency files
cat package.json 2>/dev/null | head -30
cat requirements.txt 2>/dev/null
cat pyproject.toml 2>/dev/null | head -40
cat Cargo.toml 2>/dev/null | head -20
cat go.mod 2>/dev/null | head -20
cat Gemfile 2>/dev/null | head -20
cat composer.json 2>/dev/null | head -20

# Check for framework indicators
ls -la next.config.* nuxt.config.* vite.config.* webpack.config.* 2>/dev/null
ls -la tsconfig.json .eslintrc* .prettierrc* tailwind.config.* 2>/dev/null
ls -la Dockerfile docker-compose.* .github/workflows/ 2>/dev/null
ls -la alembic.ini manage.py 2>/dev/null

# Check for existing documentation
cat README.md 2>/dev/null | head -50
```

### Step 4: Scan key files for understanding

Read the entry points and core files to understand the architecture:

```bash
# Find entry points
cat src/index.ts 2>/dev/null || cat src/main.ts 2>/dev/null || cat app/main.py 2>/dev/null || cat main.go 2>/dev/null || cat src/App.tsx 2>/dev/null

# Find route definitions
grep -rn "router\|@app\.\|@router\.\|app\.get\|app\.post\|Route\|path(" --include="*.py" --include="*.ts" --include="*.js" -l 2>/dev/null | head -10

# Find model/schema definitions
grep -rn "class.*Model\|class.*Schema\|interface\|type.*=" --include="*.py" --include="*.ts" -l 2>/dev/null | head -10

# Find test files
find . -name "test_*" -o -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -10
```

### Step 5: Generate index.md

Write a comprehensive project map:

```markdown
# Project Index — [Project Name]

## Generated: [timestamp]

## Overview
[What this project does — derived from README, package.json description, or code analysis]

## Tech Stack
- **Language**: [e.g., TypeScript 5.x]
- **Framework**: [e.g., Next.js 14 (App Router)]
- **Database**: [e.g., PostgreSQL via Prisma]
- **Auth**: [e.g., NextAuth.js with JWT]
- **Styling**: [e.g., Tailwind CSS]
- **Testing**: [e.g., Vitest + Playwright]
- **Deployment**: [e.g., Docker + GitHub Actions]

## Architecture
[High-level description of how the app is structured]

### Key Directories
- `src/app/` — Next.js app router pages and layouts
- `src/components/` — Reusable React components
- `src/lib/` — Utility functions and shared logic
- `src/api/` — API route handlers
- `prisma/` — Database schema and migrations

### Data Flow
[How data moves: client → API → service → DB → response]

## Entry Points
- **App**: `src/app/layout.tsx` → `src/app/page.tsx`
- **API**: `src/app/api/` directory
- **DB**: `prisma/schema.prisma`

## Scale
- **Files**: [count]
- **Lines of code**: [approximate]
- **Dependencies**: [count from package.json/requirements.txt]

## Environment Variables
[List from .env.example or detected from code]
```

### Step 6: Generate file-index.json

Create a quick-lookup index of every significant file:

```json
{
  "generated": "2024-01-15T10:30:00Z",
  "files": {
    "src/app/main.py": {
      "purpose": "FastAPI application entry point",
      "exports": ["app", "create_app"],
      "imports_from": ["config", "api.v1.router", "core.database"],
      "size_lines": 45,
      "last_analyzed": "2024-01-15T10:30:00Z"
    },
    "src/models/user.py": {
      "purpose": "User SQLAlchemy ORM model",
      "exports": ["User"],
      "imports_from": ["models.base"],
      "size_lines": 32,
      "last_analyzed": "2024-01-15T10:30:00Z"
    }
  }
}
```

You don't need to index every single file — focus on:
- Entry points and config files
- Models / schemas / types
- Route handlers / API endpoints
- Services / business logic
- Test files
- Key utilities

Skip: generated files, lock files, assets, vendored code.

### Step 6b: Map dependency graph (for larger projects)

For projects with 20+ source files, also capture how files depend on each other. This helps Claude navigate the codebase without re-reading everything:

```bash
# Find import relationships (JS/TS)
grep -rn "^import\|^const.*require(" --include="*.ts" --include="*.tsx" --include="*.js" src/ 2>/dev/null | head -50

# Find import relationships (Python)
grep -rn "^from\|^import" --include="*.py" app/ src/ 2>/dev/null | head -50
```

Store the key relationships in `file-index.json` under `imports_from` so Claude can trace data flow without re-scanning.

### Step 7: Initialize other memory files

```markdown
# decisions.md
# Technical Decisions Log
No decisions recorded yet.

# sessions.md
# Session Log
## Session 1 — [date]
- **First indexing**: Scanned and mapped the project
- **Project state**: [brief description of current state]

# bugs.md
# Bug Tracker
No bugs recorded yet.

# todo.md
# Task Tracker
## Pending
[Any TODOs found in the codebase]
## In Progress
## Done
## Blocked
```

### Step 8: Report to user

After indexing, give the user a concise summary:

> "I've mapped your project. Here's what I found:
> - **[Project Name]**: [one-line description]
> - **Stack**: [key technologies]
> - **Scale**: [X files, ~Y lines of code]
> - **Structure**: [brief architecture description]
>
> Memory saved to `.claude/memory/`. I'll remember this across sessions.
> What are we working on?"

---

## On Session End / At Key Milestones (ALWAYS DO THIS)

### When to save

Save memory whenever:
- The user says they're done or is about to close the session
- You complete a significant task (new feature, major bug fix, refactor)
- You make an architectural or technical decision
- You encounter and fix a non-trivial bug
- The conversation is getting long (approaching context limits)
- The user explicitly says "save", "remember", "update memory"

### What to save

#### Update sessions.md

Append a new session entry:

```markdown
## Session [N] — [date]
- **Duration**: [approximate]
- **Goal**: [what the user wanted to accomplish]
- **Accomplished**:
  - [concrete thing 1]
  - [concrete thing 2]
- **Files modified**: [list of key files changed]
- **Decisions made**: [any decisions, with brief reasoning]
- **Issues encountered**: [any problems and how they were resolved]
- **Left incomplete**: [anything not finished]
- **Next steps**: [what should happen next]
```

#### Update todo.md

Move items between sections based on what happened:

```markdown
## Pending
- Add rate limiting to auth endpoints
- Set up email verification flow

## In Progress
- Dashboard frontend (components built, needs API wiring)

## Done
- [Session 3] User authentication API
- [Session 3] Database migrations for users table
- [Session 2] Project scaffolding and config

## Blocked
- Payment integration (waiting on Stripe API keys from client)
```

#### Update decisions.md (when decisions are made)

```markdown
## [Date] — Chose PostgreSQL over MongoDB
**Context**: User needs relational data with complex queries.
**Decision**: PostgreSQL with async SQLAlchemy.
**Reasoning**: Data is highly relational (users → orders → items). Need ACID transactions for payments. PostgreSQL's JSONB covers any semi-structured data needs.
**Alternatives considered**: MongoDB (rejected: would need manual joins, no transaction safety).

## [Date] — JWT with refresh tokens over session-based auth
**Context**: API will serve both web and mobile clients.
**Decision**: JWT access tokens (15min) + refresh tokens (7 days) in httpOnly cookies.
**Reasoning**: Stateless auth works better for multi-client APIs. Short access token limits damage from token theft. Refresh token in httpOnly cookie prevents XSS access.
```

#### Update bugs.md (when bugs are encountered)

```markdown
## [Date] — SQLAlchemy async session not committing
**Symptom**: Data appeared to save but wasn't persisted after request.
**Root cause**: The `get_db` dependency wasn't calling `await session.commit()` in the finally block.
**Fix**: Added explicit commit in the dependency's try/finally.
**File**: `app/core/database.py`
**Lesson**: Always verify the DB session lifecycle. Async sessions don't auto-commit.
**Time to fix**: ~20 minutes
```

#### Update file-index.json (when files change significantly)

If you created new files, significantly modified existing ones, or changed the architecture, update the relevant entries in file-index.json.

#### Update index.md (when architecture changes)

If the tech stack, project structure, or architecture changed materially, update index.md to reflect the current state.

---

## Incremental Indexing

When you're mid-session and need to understand a part of the codebase you haven't looked at yet:

1. Check `file-index.json` first — it might already have what you need.
2. If not, scan just the files you need and add them to the index.
3. Don't re-index the whole project — that's expensive and unnecessary.

```bash
# Quick scan of a specific directory
find src/api/ -type f -name "*.py" | while read f; do
    echo "=== $f ==="
    head -5 "$f"  # First few lines usually show imports and purpose
    grep "def \|class \|router\." "$f" | head -10  # Key definitions
    echo ""
done
```

---

## Memory Hygiene

### Keep it lean
- sessions.md: Keep the last 20 sessions in detail. Older sessions can be summarized into a single paragraph per session.
- bugs.md: Keep all entries (they're a knowledge base).
- decisions.md: Keep all entries (they explain why the code is the way it is).
- todo.md: Archive completed items periodically (move to a `## Archive` section).
- file-index.json: Remove entries for deleted files. Update stale entries when you touch those files.

### Keep it accurate
- Never write to memory based on assumptions — only record what actually happened.
- If you notice memory is stale or incorrect during a session, fix it.
- Timestamps on everything so the user (and future Claude sessions) know how fresh the data is.

---

## Compatibility Notes

### Works with other skills
This skill is the single source of truth for project memory. If the `fullstack-engineer` skill is also installed, it will defer session management to this skill. No duplication — this skill owns all memory.

### Windows support
All bash commands in this skill use Unix syntax. On Windows with Claude Code, these run inside the Claude Code environment which supports bash. If running manually, substitute:
- `mkdir -p` → `mkdir -Force` (PowerShell)
- `cat` → `Get-Content` (PowerShell)
- `find` → `Get-ChildItem -Recurse` (PowerShell)

### .gitignore Guidance

Suggest to the user that they add `.claude/memory/` to `.gitignore` if:
- The project is open source (memory contains internal context)
- Multiple developers work on the project (memory is personal context)

Suggest they commit `.claude/memory/` if:
- It's a solo project and they want memory in version control
- The team agrees to share project context

Ask the user which they prefer on first indexing.

---

## Key Principles

1. **Always load memory first.** Before you do anything in a session, read the memory files. This takes 5 seconds and saves minutes of re-exploration.

2. **Always save memory last.** Before the session ends, update the memory. If the conversation gets cut off unexpectedly, you'll still have the previous session's memory as a baseline.

3. **Record the WHY, not just the WHAT.** "We used PostgreSQL" is useless. "We used PostgreSQL because the data is relational and we need ACID transactions for payments" is valuable.

4. **Bugs are gold.** Every bug you record is a bug you'll fix faster next time. Record the symptom, root cause, fix, and lesson learned.

5. **Index on demand, not in bulk.** Don't re-index the entire project every session. Index new areas when you need them and keep the index current as you work.

6. **Memory is for Claude, not just the user.** Write memory entries as if you're briefing a future version of yourself that has zero context. Because that's exactly what's happening.

---

## Error Recovery

### Corrupted or missing memory files
If a memory file is missing or unparseable:
- Don't panic — regenerate it from what you can see.
- If `index.md` is missing, re-run the indexing steps (Steps 2-5 from First-Time Indexing).
- If `file-index.json` is corrupted, delete it and rebuild incrementally as you work.
- If `sessions.md` is missing, start fresh — prior session history is lost but the project itself is intact.
- Always inform the user: "I noticed some memory files were missing. I've rebuilt what I can."

### Memory conflicts (multiple Claude sessions)
If the user runs multiple Claude Code sessions on the same project:
- Memory files use append-only patterns (sessions.md, decisions.md, bugs.md) so concurrent writes are unlikely to conflict badly.
- For `todo.md` and `index.md` which are overwritten, the last session to save wins.
- If you detect that memory has changed since you loaded it (timestamps don't match), re-read before saving.
