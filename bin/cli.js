#!/usr/bin/env node

const install = require("../lib/install");
const uninstall = require("../lib/uninstall");
const list = require("../lib/list");
const { AGENTS } = require("../lib/utils");

const args = process.argv.slice(2);

// Parse flags
const flags = {
  project: args.includes("--project"),
  force: args.includes("--force"),
  all: args.includes("--all"),
  agent: null,
};

// Parse --agent=<name> or --agent <name>
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--agent=")) {
    flags.agent = args[i].split("=")[1];
  } else if (args[i] === "--agent" && args[i + 1] && !args[i + 1].startsWith("--")) {
    flags.agent = args[i + 1];
  }
}

// Remove flags from args to get positional arguments
const positional = args.filter((a) => {
  if (a.startsWith("--")) return false;
  // Skip value after --agent
  const idx = args.indexOf(a);
  if (idx > 0 && args[idx - 1] === "--agent") return false;
  return true;
});

const command = positional[0];
const skillName = positional[1];

const agentList = Object.entries(AGENTS)
  .map(([key, val]) => `${key} (${val.label})`)
  .join(", ");

const HELP = `
claude-skills — Install AI coding skills for any terminal agent

Usage:
  claude-skills install [skill-name] [--project] [--force] [--agent=<agent>]
  claude-skills uninstall <skill-name> [--project] [--force] [--agent=<agent>]
  claude-skills list [--project] [--agent=<agent>]

Options:
  --project        Install/check in project-level directory instead of global
  --force          Skip confirmation prompts
  --agent=<name>   Target agent (default: claude)
                   Supported: ${agentList}

Commands:
  install     Install all skills (or a specific one) to the target location
  uninstall   Remove an installed skill from the target location
  list        Show available skills and their install status

Examples:
  claude-skills install                              # Install all skills globally for Claude
  claude-skills install --agent=gpt                  # Install all skills globally for GPT CLI
  claude-skills install fullstack-engineer-skill --project --agent=gemini
  claude-skills list --agent=codex
`;

async function main() {
  switch (command) {
    case "install":
      await install(skillName, flags);
      break;
    case "uninstall":
      await uninstall(skillName, flags);
      break;
    case "list":
      list(flags);
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: "${command}"\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
