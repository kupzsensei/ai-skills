# Project Memory — Auto-Activation

This project uses a shared memory system at `.ai/memory/` that works across all AI agents (Claude, Gemini, Qwen, Codex). Switching agents mid-project preserves full context.

At the START of every conversation, before doing anything else, check for project memory:

1. Look for a `.ai/memory/` directory in the project root
2. If it exists, read these files and give a brief status update:
   - `.ai/memory/index.md` — project overview and architecture
   - `.ai/memory/sessions.md` (last 100 lines) — recent session history
   - `.ai/memory/todo.md` — pending tasks
   - `.ai/memory/decisions.md` (last 50 lines) — technical decisions
3. If it does NOT exist, perform first-time project indexing:
   - Create `.ai/memory/` directory
   - Scan the project structure, tech stack, and architecture
   - Generate `index.md`, `sessions.md`, `todo.md`, `decisions.md`, `bugs.md`, and `file-index.json`
   - Report a summary to the user

At the END of every conversation or when completing significant milestones, update the memory files with what was accomplished, decisions made, and next steps.

When the user says "remember this", "save progress", "what did we do last time", "continue where we left off", "index this project", "map the codebase", or "update memory" — update the `.ai/memory/` files.
