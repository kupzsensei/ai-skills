const fs = require("fs");
const path = require("path");
const os = require("os");
const { confirm } = require("./utils");

// Recommended permission rules per agent for skills to work without constant prompting.
// Uses shared .ai/memory/ directory for cross-agent memory.
const RECOMMENDED_PERMISSIONS = {
  claude: {
    format: "json",
    path: (isProject) =>
      isProject
        ? path.join(process.cwd(), ".claude", "settings.json")
        : path.join(os.homedir(), ".claude", "settings.json"),
    allow: [
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
      "Skill(skill-factory)",
    ],
  },
  gemini: {
    format: "json",
    path: (isProject) =>
      isProject
        ? path.join(process.cwd(), ".gemini", "settings.json")
        : path.join(os.homedir(), ".gemini", "settings.json"),
    // Gemini CLI doesn't use the same permission model as Claude.
    // We include a note in the instruction file instead.
    allow: [],
  },
  qwen: {
    format: "json",
    path: (isProject) =>
      isProject
        ? path.join(process.cwd(), ".qwen", "settings.json")
        : path.join(os.homedir(), ".qwen", "settings.json"),
    // Qwen CLI doesn't use the same permission model as Claude.
    allow: [],
  },
};

/**
 * Get the path to the agent's settings file.
 */
function getSettingsPath(agentName, isProject) {
  const rec = RECOMMENDED_PERMISSIONS[agentName];
  if (!rec || !rec.path) return null;
  return rec.path(isProject);
}

/**
 * Read the current settings file, or return empty object.
 */
function readSettings(settingsPath) {
  if (!settingsPath || !fs.existsSync(settingsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Merge recommended permission rules into existing settings without duplicating.
 */
function mergePermissions(existing, recommended) {
  const settings = { ...existing };
  if (!settings.permissions) settings.permissions = {};
  if (!settings.permissions.allow) settings.permissions.allow = [];

  const currentAllow = new Set(settings.permissions.allow);
  let added = 0;

  for (const rule of recommended) {
    if (!currentAllow.has(rule)) {
      settings.permissions.allow.push(rule);
      added++;
    }
  }

  return { settings, added };
}

/**
 * Apply recommended settings for the given agent.
 * Returns true if settings were modified.
 */
async function applyRecommendedSettings(agentName, isProject, skipPrompt) {
  const recommended = RECOMMENDED_PERMISSIONS[agentName];
  if (!recommended || recommended.allow.length === 0) return false;

  const settingsPath = getSettingsPath(agentName, isProject);
  if (!settingsPath) return false;

  const existing = readSettings(settingsPath);
  const { settings, added } = mergePermissions(existing, recommended.allow);

  if (added === 0) {
    console.log("  \u2139 Recommended permissions already configured.");
    return false;
  }

  if (!skipPrompt) {
    console.log(`\n  ${added} recommended permission rule(s) to add:`);
    for (const rule of recommended.allow) {
      if (!existing.permissions || !existing.permissions.allow || !existing.permissions.allow.includes(rule)) {
        console.log(`    + ${rule}`);
      }
    }
    const yes = await confirm("\n  Apply recommended settings?");
    if (!yes) {
      console.log("  Skipped settings.");
      return false;
    }
  }

  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  console.log(`  \u2713 Settings updated \u2192 ${settingsPath}`);
  return true;
}

module.exports = {
  RECOMMENDED_PERMISSIONS,
  getSettingsPath,
  readSettings,
  mergePermissions,
  applyRecommendedSettings,
};
