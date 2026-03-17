---
name: skill-factory
description: >
  A meta-skill that creates, updates, and expands Claude's skill library. Use this skill whenever: (1) Claude lacks a specialized skill for the user's task, (2) an existing skill might be outdated or incomplete for the current task, (3) the user explicitly asks to "create a skill", "update skill", "expand skill", "refresh skill", "check if skill is current", "add X to the skill", or "learn about X first". Also triggers when Claude detects that an installed skill references deprecated APIs, old library versions, or patterns that have been superseded. This skill ensures Claude's knowledge is always current — it creates new skills, detects and fixes stale ones, and expands existing skills with new capabilities when needed.
---

# Skill Factory

You are a skill factory. You create new skills, detect when existing skills are outdated, update stale skills, and expand skills with new capabilities. You ensure that Claude's skill library is always current, comprehensive, and production-ready.

Three modes of operation:
- **Create**: No matching skill exists → research, generate, save
- **Update**: Skill exists but is outdated or uses deprecated patterns → detect staleness, research current state, patch or rewrite
- **Expand**: Skill exists but is missing capabilities the user needs → add new sections, reference files, or patterns

---

## When This Skill Activates

This skill should activate when ANY of these are true:

### Create mode
1. **No matching skill exists.** The user asks to build something with a framework, library, or tool that doesn't have a dedicated skill in `~/.claude/skills/`.
2. **Uncertain best practices.** You're not confident about the current best practices, project structure, or idiomatic patterns for the requested technology.
3. **Explicit request.** The user says something like "research this first", "make a skill for X", or "learn about X before starting".

### Update mode
4. **Skill references outdated patterns.** You read an existing skill and notice it uses deprecated APIs, old library versions, or patterns that have been superseded (e.g., Pydantic v1 syntax when v2 is current, React class components when hooks are standard, `pages/` router when App Router is default).
5. **Version mismatch.** The skill mentions a specific version (e.g., "Next.js 13") but the current stable version is significantly newer and has breaking changes.
6. **Explicit request.** The user says "update the skill", "refresh", "is this skill still current?", or "check for updates".
7. **Build failures from stale patterns.** During execution, you encounter errors that suggest the skill's instructions are outdated (deprecated imports, removed APIs, changed default behaviors).

### Expand mode
8. **Missing capability.** The user asks for something that falls within an existing skill's domain but the skill doesn't cover it (e.g., the FastAPI skill exists but doesn't cover WebSockets or background tasks).
9. **New integration.** The user wants to combine the skill's technology with something new (e.g., "add Redis caching to our FastAPI app" — the FastAPI skill doesn't cover Redis).
10. **Explicit request.** The user says "add X to the skill", "expand the skill with Y", or "the skill is missing Z".

---

## Phase 1: Detect the Gap (or the Staleness)

Before starting any task, do a quick check:

### Check 1: Does a skill exist?

```bash
# List installed skills
ls ~/.claude/skills/ 2>/dev/null
```

### Check 2: If a skill exists, is it still current?

Read the skill's SKILL.md and run these staleness checks:

**Version check** — Look for version numbers mentioned in the skill:
```bash
# Extract version references from the skill
grep -i "version\|v[0-9]\|>=\|~=\|[0-9]\.[0-9]\+\.[0-9]" ~/.claude/skills/{skill-name}/SKILL.md 2>/dev/null
```
Then search the web for the current stable version of that technology. If the skill references a version that's more than one major version behind, it's stale.

**Deprecation check** — Scan for known deprecated patterns:
- Python: `class Config:` in Pydantic (v1 → v2), `@app.on_event` in FastAPI (deprecated → lifespan), `.dict()` → `.model_dump()`
- React: class components (→ hooks), `componentDidMount` (→ `useEffect`), `pages/` directory in Next.js (→ `app/` router)
- Node: `var` (→ `const/let`), callback patterns (→ async/await), CommonJS `require` (→ ES modules in modern projects)
- General: any `TODO: update this`, version pinning from 2+ years ago, references to archived/unmaintained libraries

**Completeness check** — Does the skill cover what the user is asking for? If the user asks about WebSockets but the skill only covers REST, it needs expansion.

### Decision matrix

| Skill exists? | Current? | Covers the task? | Action |
|---|---|---|---|
| No | — | — | **Create** → Phase 2 |
| Yes | No | — | **Update** → Phase 1B |
| Yes | Yes | No | **Expand** → Phase 1C |
| Yes | Yes | Yes | **Use as-is** → skip skill-factory, proceed with the task |

---

## Phase 1B: Update an Outdated Skill

When you detect that an existing skill is stale:

### Step 1: Diagnose what's outdated

Read the full SKILL.md and all reference files. Categorize issues:

- **Critical**: Deprecated APIs that will cause build/runtime errors (must fix)
- **Major**: Old patterns that still work but are no longer recommended (should fix)
- **Minor**: Slightly outdated version numbers, style preferences (nice to fix)

### Step 2: Research the current state

Search for what changed between the skill's version and the current version:
```bash
# Search for migration guides, changelogs, breaking changes
# "FastAPI 0.100 to 0.115 migration"
# "Pydantic v1 to v2 migration guide"
# "Next.js 13 to 15 breaking changes"
```

Focus on: breaking changes, new recommended patterns, deprecated features and their replacements.

### Step 3: Present findings to the user

> "I found that your [X] skill is based on [version/pattern]. The current version is [Y], with these key changes:
> - [Breaking change 1]: [old way] → [new way]
> - [New recommended pattern]: [description]
>
> I'd like to update the skill. Want me to proceed?"

### Step 4: Apply updates

**Preserve the skill's structure.** Don't rewrite from scratch unless most content is outdated.

1. Back up the original:
```bash
cp -r ~/.claude/skills/{skill-name} ~/.claude/skills/{skill-name}.backup
```

2. Update version numbers, dependency pins, deprecated code patterns
3. Add a changelog entry at the top of SKILL.md:
```markdown
## Changelog
- [date]: Updated from [old version] to [new version]. Key changes: [summary]
```
4. Update affected reference files
5. Remove backup after user confirms:
```bash
rm -rf ~/.claude/skills/{skill-name}.backup
```

### Step 5: Validate

After updating, verify:
- Code examples use the new APIs correctly
- Imports are updated
- Bootstrap/install commands reference current versions
- Project structure matches the framework's current recommendations

---

## Phase 1C: Expand an Existing Skill

When the skill exists and is current but doesn't cover what the user needs:

### Step 1: Identify the gap

Common expansion patterns:
- **New integration**: Redis, WebSockets, GraphQL, message queues, file uploads
- **New pattern**: Background tasks, scheduled jobs, caching, rate limiting
- **New deployment target**: Docker → Kubernetes, Vercel, AWS Lambda
- **New testing layer**: E2E tests, load tests, contract tests

### Step 2: Research the addition

Research how the new capability integrates with the existing technology. Focus on official docs, idiomatic patterns, and gotchas.

### Step 3: Decide where it goes

- **Small addition** (under 50 lines): Add a new section directly to SKILL.md
- **Medium addition** (50-200 lines): Create a new reference file in `references/`
- **Large addition** (200+ lines): Consider if it deserves its own standalone skill

### Step 4: Present to user and apply

> "Your [X] skill doesn't cover [Y] yet. I've researched the integration and can add it as [a new section / a reference file]. Here's what I'll add:
> - [Pattern 1]
> - [Key library or dependency]
>
> Want me to add this?"

### Step 5: Update the skill description

After expanding, update the YAML frontmatter description to reflect new capabilities. If you added WebSocket support, the description should now mention WebSockets as a trigger.

---

## Phase 2: Ask the User (Create Mode)

Before researching, ask the user a few focused questions to scope the skill properly. Don't generate a generic skill — tailor it to their actual needs.

**Questions to ask (pick the relevant ones, don't overwhelm):**

1. **What's the technology/framework?**
   - "I don't have a specialized skill for [X] yet. I'd like to research and create one before we start so I can give you production-quality work. Sound good?"

2. **What's the scope?**
   - "Are you looking for a full project setup (scaffolding, config, deployment) or just the core feature patterns?"

3. **Any preferences?**
   - "Do you have any preferences for project structure, libraries, or patterns? Or should I research and recommend the current best practices?"

4. **What's the target?**
   - "Is this for production, a prototype, or learning?"

**Keep it to 2-3 questions max.** The goal is to scope the skill, not conduct an interview. If the user says "just go", respect that and make reasonable defaults.

---

## Phase 3: Research

Once you have enough context, research the technology thoroughly before writing the skill.

**Research strategy:**

### Step 1: Check official documentation
```bash
# Use web search to find current official docs, getting started guides, and best practices
# Focus on:
# - Official project structure / scaffolding recommendations
# - Current stable version and breaking changes from previous versions
# - Recommended libraries and tools in the ecosystem
# - Common patterns and anti-patterns
```

### Step 2: Identify key patterns
For any framework/library, you need to understand:
- **Project structure**: How should files and folders be organized?
- **Configuration**: How is the app configured? (env vars, config files, etc.)
- **Core patterns**: What are the idiomatic ways to do common things? (routing, state management, data fetching, error handling)
- **Testing**: What's the recommended testing setup and approach?
- **Deployment**: How is it typically deployed?
- **Common pitfalls**: What do people frequently get wrong?

### Step 3: Find current version specifics
Technologies change fast. Make sure you're documenting the CURRENT way to do things, not the old way.
- Check the latest stable version number
- Note any recent breaking changes or deprecations
- Identify patterns that have been superseded by newer approaches

---

## Phase 4: Generate the Skill

Create a proper skill following this template. The skill should be comprehensive enough that Claude can build production-quality projects with it.

### Skill Structure

```
{technology}-skill/
├── SKILL.md          # Core instructions (under 500 lines)
└── references/       # Optional, for deep-dive topics
    ├── patterns.md   # Common patterns and examples
    ├── testing.md    # Testing setup and patterns
    └── deployment.md # Deployment guide
```

### SKILL.md Template

```markdown
---
name: {technology}-expert
description: >
  A specialist skill for building production-grade {technology} applications.
  Use this skill whenever the user asks to build, debug, or work with {technology}.
  Triggers on: [list specific trigger phrases and contexts].
---

# {Technology} Expert Skill

[One paragraph: what this skill does and the philosophy behind it]

---

## Project Scaffolding

[Recommended project structure with file tree]
[Bootstrap commands to set up a new project]
[Dependencies / requirements]

---

## Core Patterns

### Configuration
[How to configure the app — settings, env vars, etc.]

### [Pattern 1: e.g., Routing / Components / Models]
[Code examples showing the idiomatic approach]

### [Pattern 2: e.g., State Management / Database / API calls]
[Code examples]

### [Pattern 3: e.g., Error Handling / Middleware / Auth]
[Code examples]

---

## Testing

[Testing setup, configuration, example tests]
[How to run tests]

---

## Deployment

[Dockerfile or deployment config]
[Common deployment commands]

---

## Key Principles

[5-7 bullet points: the most important rules for this technology]

## Common Pitfalls

[Things that trip people up — outdated patterns, common mistakes]
```

### Quality Checklist for Generated Skills

Before presenting the skill to the user, verify:

- [ ] All code examples use the CURRENT version of the technology (not deprecated APIs)
- [ ] Project structure follows official recommendations or well-established community standards
- [ ] Examples are complete and runnable (not pseudo-code snippets)
- [ ] Error handling is included in examples (not just happy-path)
- [ ] Type safety is used where the language supports it
- [ ] Testing approach is included
- [ ] The skill is opinionated where it should be (recommends specific approaches, doesn't just list options)
- [ ] Common pitfalls are documented
- [ ] SKILL.md is under 500 lines (use references/ for overflow)

---

## Phase 5: Confirm with User

Present the generated skill to the user before proceeding:

**Show them:**
1. A brief summary of what the skill covers
2. The key technology choices and patterns you've selected
3. Ask if they want to adjust anything

**Example message:**
> "I've researched [technology] and created a skill for it. Here's what it covers:
> - Project structure: [approach]
> - Key libraries: [list]
> - Patterns: [list]
> - Testing with: [framework]
>
> Want me to adjust anything, or should I proceed with your task using this skill?"

If the user approves, save the skill and proceed. If they want changes, update the skill first.

---

## Phase 6: Save and Execute

### Save the skill

```bash
# Save to the user's skills directory
# Linux/Mac:
mkdir -p ~/.claude/skills/{technology}-skill/references
# Windows (PowerShell):
# mkdir -Force "$HOME\.claude\skills\{technology}-skill\references"
# Write SKILL.md and any reference files
```

**Important:** Tell the user where the skill was saved so they know it exists for future sessions.

### Execute the original task

Now that the skill exists, go back to the user's original request and execute it following the skill you just created. The skill should guide your implementation just like any pre-installed skill would.

### Update project memory

If the `project-memory` skill is installed, record the new skill creation in `decisions.md`:
- What technology the skill covers
- Why it was created (what task triggered it)
- Key patterns and libraries chosen

---

## Handling Edge Cases

### User says "just do it, don't research"
Respect that. Skip the skill generation and do your best. But mention: "I'll proceed without creating a dedicated skill. If you want more thorough results next time, I can research first."

### Technology is too niche or new
If you can't find enough information to create a confident skill:
- Be transparent: "I found limited documentation for [X]. Here's what I've gathered, but I'd recommend double-checking the patterns."
- Create a minimal skill with what you found and note the gaps.

### User already has a similar skill
If a related skill exists (e.g., user has `react-skill` but asks about Next.js):
- Don't create from scratch — extend or complement the existing skill.
- "You already have a React skill. I'll create a Next.js skill that builds on it and focuses on the Next.js-specific patterns."

### The task is too small to justify a full skill
If the user just needs a quick script or a one-off task in an unfamiliar technology:
- Do a lightweight version: research the key patterns, write them as comments in your code, but skip the full skill generation.
- "This is a small task, so I'll research the key patterns and apply them directly rather than creating a full skill. Want me to save it as a skill for future use?"

---

## Key Principles

1. **Never wing it.** If you're not confident, research first. A few minutes of research prevents hours of debugging bad patterns.

2. **Ask, don't assume.** The user might have strong preferences about libraries, patterns, or structure. Ask before you commit.

3. **Current over cached.** Your training data might be stale. Always verify against current docs when generating or updating a skill for a technology that evolves quickly.

4. **Opinionated is good.** A skill that says "do it this way" is more useful than one that says "here are 5 options". Make a recommendation and explain why.

5. **Skills compound.** Every skill you generate is an investment. It makes the next task with that technology faster and better. Encourage the user to keep building their skill library.

6. **Update, don't accumulate debt.** A stale skill is worse than no skill — it gives Claude false confidence in outdated patterns. When you detect staleness, fix it before it causes bugs.

7. **Expand surgically.** When adding capabilities, respect the existing skill's structure and conventions. Don't refactor the whole skill just to add one feature.

8. **Back up before modifying.** Always create a `.backup` copy before updating or expanding a skill. If the update goes wrong, the user can revert instantly.

---

## Runtime Staleness Detection

Sometimes you won't know a skill is outdated until you're mid-task and something breaks. When this happens:

### Signals that a skill is stale during execution

- **Import errors**: `ModuleNotFoundError` or `ImportError` on packages the skill told you to use
- **Deprecation warnings**: Runtime warnings about deprecated functions
- **API changes**: HTTP 404 on documented API endpoints, changed response shapes
- **Build failures**: Webpack/Vite/TypeScript errors on patterns the skill recommended
- **Test failures**: Tests written following the skill's patterns fail on current library versions

### What to do

1. **Don't fight it.** If the skill's pattern is causing errors, don't try to force it to work — the skill is wrong.
2. **Research the current way.** Search for the error message + the library name to find what changed.
3. **Fix the immediate issue** in your code so the user's task can proceed.
4. **Update the skill** with the corrected pattern so future sessions don't hit the same problem.
5. **Tell the user**: "I found that the [X] skill had an outdated pattern for [Y]. I've fixed it in your code and updated the skill for next time."

If the `project-memory` skill is installed, record the staleness detection in `bugs.md` so there's a trail.
