# ai-skills

A CLI tool to install production-grade coding skills for AI terminal agents. One command gives your AI agent expert-level capabilities in full-stack engineering, persistent project memory, and self-expanding skill creation.

Works with **Claude Code**, **GPT CLI**, **Gemini CLI**, **Qwen CLI**, **Codex CLI**, and any other AI terminal agent that reads markdown skill files.

## Quick Start

```bash
# Install the CLI
npm install -g ai-skills

# Install all skills globally (default: Claude Code)
ai-skills install

# Install for a different agent
ai-skills install --agent=gpt
ai-skills install --agent=gemini
```

## Bundled Skills

| Skill | Description |
|-------|-------------|
| **fullstack-engineer-skill** | A full engineering team in one agent — architect, frontend, backend, DevOps, QA, DBA, security, and tech lead. Handles building, debugging, refactoring, deploying, and maintaining any software project. Includes reference guides for API design, databases, DevOps, security, testing, and tech stack selection. |
| **project-memory-skill** | Persistent memory across sessions. Your AI agent remembers what happened before, what decisions were made, and what's next. Zero context loss between conversations. |
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

## Requirements

- Node.js >= 16
- Zero runtime dependencies

## License

MIT
