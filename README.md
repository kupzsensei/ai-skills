# ai-skills

A CLI tool to install production-grade coding skills for AI terminal agents. One command gives your AI agent expert-level capabilities in full-stack engineering, persistent project memory, and self-expanding skill creation.

Works with **Claude Code**, **GPT CLI**, **Gemini CLI**, **Qwen CLI**, **Codex CLI**, and any other AI terminal agent that reads markdown skill files.

## Quick Start

```bash
# Install the CLI
npm install -g @sirbenj/ai-skills

# Install all skills globally (default: Claude Code)
ai-skills install

# Install for a different agent
ai-skills install --agent=gpt
ai-skills install --agent=gemini
```

You can also install directly from GitHub:
```bash
npm install -g kupzsensei/ai-skills
```

## Bundled Skills

| Skill | Description |
|-------|-------------|
| **fullstack-engineer-skill** | A full engineering team in one agent — architect, frontend, backend, DevOps, QA, DBA, security, and tech lead. Handles building, debugging, refactoring, deploying, and maintaining any software project. Includes reference guides for API design, databases, DevOps, security, testing, and tech stack selection. |
| **project-memory-skill** | Persistent memory across sessions **and across agents**. Start in Claude, continue in Gemini, pick up in Qwen — zero context loss. Memory is stored in a shared `.ai/memory/` directory that all agents read and write. |
| **skill-factory** | A meta-skill that creates new skills, detects when existing skills are outdated, and expands skills with new capabilities. Keeps your AI agent's knowledge current and production-ready. |

## Usage

```bash
ai-skills <command> [options]
```

### Commands

#### `install`

Install skills to your agent's skill directory.

```bash
# Install all skills globally
ai-skills install

# Install a specific skill
ai-skills install fullstack-engineer-skill

# Install to project directory instead of global
ai-skills install --project

# Skip overwrite confirmation
ai-skills install --force

# Install for a specific agent
ai-skills install --agent=gemini
```

#### `uninstall`

Remove an installed skill.

```bash
ai-skills uninstall project-memory-skill
ai-skills uninstall skill-factory --project
ai-skills uninstall fullstack-engineer-skill --agent=gpt
```

#### `list`

Show available skills and their install status.

```bash
ai-skills list
ai-skills list --project
ai-skills list --agent=codex
```

### Options

| Flag | Description |
|------|-------------|
| `--project` | Target the project-level directory (`./<agent>/skills/`) instead of global (`~/.<agent>/skills/`) |
| `--force` | Skip confirmation prompts when overwriting or removing |
| `--agent=<name>` | Target a specific agent. Default: `claude` |

### Supported Agents

| Agent | Global Path | Project Path |
|-------|-------------|--------------|
| `claude` | `~/.claude/skills/` | `.claude/skills/` |
| `gpt` | `~/.gpt/skills/` | `.gpt/skills/` |
| `gemini` | `~/.gemini/skills/` | `.gemini/skills/` |
| `qwen` | `~/.qwen/skills/` | `.qwen/skills/` |
| `codex` | `~/.codex/skills/` | `.codex/skills/` |

## Install Locations

**Global** (default) — skills are available across all your projects:
```
~/.claude/skills/fullstack-engineer-skill/SKILL.md
```

**Project** (`--project`) — skills scoped to the current project:
```
./your-project/.claude/skills/fullstack-engineer-skill/SKILL.md
```

## What Happens During Install

The installer does three things:

1. **Copies skill files** to the agent's skill directory
2. **Injects auto-activation** into the agent's instruction file (e.g., `CLAUDE.md`) — skills that include an `AUTORUN.md` get their activation instructions added automatically, so they trigger without manual `/slash-command` invocation
3. **Offers recommended settings** — permission rules that let skills work without constant approval prompts

### Auto-Activation

Skills with an `AUTORUN.md` file automatically inject instructions into the agent's instruction file:

| Agent | Global Instruction File | Project Instruction File | Supported |
|-------|------------------------|--------------------------|-----------|
| `claude` | `~/.claude/CLAUDE.md` | `./CLAUDE.md` | Yes |
| `gemini` | `~/.gemini/GEMINI.md` | `./GEMINI.md` | Yes |
| `qwen` | `~/.qwen/QWEN.md` | `./QWEN.md` | Yes |
| `codex` | `~/.codex/AGENTS.md` | `./AGENTS.md` | Yes |
| `gpt` | — | — | No (no instruction file support) |

These sections are wrapped in HTML comment markers (`<!-- ai-skills:skill-name:start/end -->`) and are cleanly removed on uninstall.

### Shared Memory Across Agents

The `project-memory-skill` stores all memory in `.ai/memory/` — an agent-agnostic directory shared by all agents. This means you can:

- Start a project in **Claude Code**, build the foundation
- Run out of context, switch to **Gemini CLI** — it loads the same memory and picks up where Claude left off
- Switch to **Qwen CLI** later — same memory, zero context loss

```
your-project/
└── .ai/
    └── memory/
        ├── index.md          # Project map (shared)
        ├── sessions.md       # Session log from ALL agents
        ├── todo.md           # Task tracker (shared)
        ├── decisions.md      # Technical decisions (shared)
        ├── bugs.md           # Bug tracker (shared)
        └── file-index.json   # File index (shared)
```

### Recommended Settings (Claude Code)

After installing, the CLI will prompt you to apply recommended permission rules to `settings.json`. These let skills read/write memory files and scan your project without asking for approval on every action:

```json
{
  "permissions": {
    "allow": [
      "Read(.ai/memory/**)",
      "Edit(.ai/memory/**)",
      "Write(.ai/memory/**)",
      "Bash(cat .ai/memory/*)",
      "Bash(ls .ai/memory/*)",
      "Bash(mkdir -p .ai/memory)",
      "Bash(find . -type f *)",
      "Bash(wc -l *)",
      "Bash(head *)",
      "Bash(grep -rn *)",
      "Skill(project-memory-skill)",
      "Skill(fullstack-engineer-skill)",
      "Skill(skill-factory)"
    ]
  }
}
```

Use `--force` to apply settings automatically, or decline the prompt to configure manually.

## Requirements

- Node.js >= 16
- Zero runtime dependencies

## License

MIT
