const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

// Agent target configurations
// Each agent has a home dir for global installs, a project dir pattern,
// and the filename it expects for skill/prompt definitions.
const AGENTS = {
  claude: {
    label: "Claude Code",
    globalDir: () => path.join(os.homedir(), ".claude", "skills"),
    projectDir: () => path.join(process.cwd(), ".claude", "skills"),
    skillFile: "SKILL.md",
    globalInstructionFile: () => path.join(os.homedir(), ".claude", "CLAUDE.md"),
    projectInstructionFile: () => path.join(process.cwd(), "CLAUDE.md"),
    supportsAutorun: true,
  },
  gpt: {
    label: "GPT CLI",
    globalDir: () => path.join(os.homedir(), ".gpt", "skills"),
    projectDir: () => path.join(process.cwd(), ".gpt", "skills"),
    skillFile: "SKILL.md",
    // GPT CLI (kharvd/gpt-cli) has no instruction file support
    globalInstructionFile: null,
    projectInstructionFile: null,
    supportsAutorun: false,
  },
  gemini: {
    label: "Gemini CLI",
    globalDir: () => path.join(os.homedir(), ".gemini", "skills"),
    projectDir: () => path.join(process.cwd(), ".gemini", "skills"),
    skillFile: "SKILL.md",
    globalInstructionFile: () => path.join(os.homedir(), ".gemini", "GEMINI.md"),
    projectInstructionFile: () => path.join(process.cwd(), "GEMINI.md"),
    supportsAutorun: true,
  },
  qwen: {
    label: "Qwen CLI",
    globalDir: () => path.join(os.homedir(), ".qwen", "skills"),
    projectDir: () => path.join(process.cwd(), ".qwen", "skills"),
    skillFile: "SKILL.md",
    globalInstructionFile: () => path.join(os.homedir(), ".qwen", "QWEN.md"),
    projectInstructionFile: () => path.join(process.cwd(), "QWEN.md"),
    supportsAutorun: true,
  },
  codex: {
    label: "Codex CLI",
    globalDir: () => path.join(os.homedir(), ".codex", "skills"),
    projectDir: () => path.join(process.cwd(), ".codex", "skills"),
    skillFile: "SKILL.md",
    // Codex CLI uses AGENTS.md, not CODEX.md
    globalInstructionFile: () => path.join(os.homedir(), ".codex", "AGENTS.md"),
    projectInstructionFile: () => path.join(process.cwd(), "AGENTS.md"),
    supportsAutorun: true,
  },
};

const DEFAULT_AGENT = "claude";

function getAgentConfig(agentName) {
  const name = (agentName || DEFAULT_AGENT).toLowerCase();
  const config = AGENTS[name];
  if (!config) {
    const supported = Object.keys(AGENTS).join(", ");
    console.error(`Error: Unknown agent "${name}". Supported: ${supported}`);
    process.exit(1);
  }
  return { name, ...config };
}

function getSkillsSourceDir() {
  return path.join(__dirname, "..", "skills");
}

function getTargetDir(isProject, agentName) {
  const agent = getAgentConfig(agentName);
  return isProject ? agent.projectDir() : agent.globalDir();
}

function getAvailableSkills() {
  const srcDir = getSkillsSourceDir();
  if (!fs.existsSync(srcDir)) return [];
  return fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => fs.existsSync(path.join(srcDir, d.name, "SKILL.md")))
    .map((d) => d.name);
}

function getInstalledSkills(targetDir) {
  if (!fs.existsSync(targetDir)) return [];
  return fs
    .readdirSync(targetDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function parseSkillDescription(skillName) {
  const skillMd = path.join(getSkillsSourceDir(), skillName, "SKILL.md");
  try {
    const content = fs.readFileSync(skillMd, "utf8");
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)---/);
    if (fmMatch) {
      const fm = fmMatch[1];
      const descMatch = fm.match(/description:\s*>\n([\s\S]*?)(?=\n[a-z]|\n*$)/);
      if (descMatch) {
        const text = descMatch[1].replace(/\n\s*/g, " ").trim();
        const firstSentence = text.match(/^[^.]+\./);
        return firstSentence ? firstSentence[0] : text.slice(0, 80);
      }
      const singleMatch = fm.match(/description:\s*(?!>)(.+)/);
      if (singleMatch) return singleMatch[1].trim().slice(0, 80);
    }
  } catch {}
  return "";
}

function copyDirRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

// Markers for managed sections in instruction files
function autorunStartMarker(skillName) {
  return `<!-- ai-skills:${skillName}:start -->`;
}

function autorunEndMarker(skillName) {
  return `<!-- ai-skills:${skillName}:end -->`;
}

/**
 * Inject a skill's AUTORUN.md content into the agent's instruction file.
 * Uses HTML comment markers so it can be cleanly removed later.
 */
function injectAutorun(skillName, srcDir, agent, isProject) {
  if (!agent.supportsAutorun) return false;

  const autorunPath = path.join(srcDir, skillName, "AUTORUN.md");
  if (!fs.existsSync(autorunPath)) return false;

  const getFile = isProject ? agent.projectInstructionFile : agent.globalInstructionFile;
  if (!getFile) return false;
  const instructionFile = getFile();

  const autorunContent = fs.readFileSync(autorunPath, "utf8").trim();
  const startMarker = autorunStartMarker(skillName);
  const endMarker = autorunEndMarker(skillName);
  const section = `\n\n${startMarker}\n${autorunContent}\n${endMarker}\n`;

  let existing = "";
  if (fs.existsSync(instructionFile)) {
    existing = fs.readFileSync(instructionFile, "utf8");
    // Remove old section if present (for re-installs)
    const pattern = new RegExp(
      `\\n*${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}\\n*`,
      "g"
    );
    existing = existing.replace(pattern, "");
  } else {
    // Ensure parent dir exists
    fs.mkdirSync(path.dirname(instructionFile), { recursive: true });
  }

  fs.writeFileSync(instructionFile, existing.trimEnd() + section, "utf8");
  return instructionFile;
}

/**
 * Remove a skill's managed section from the agent's instruction file.
 */
function removeAutorun(skillName, agent, isProject) {
  if (!agent.supportsAutorun) return false;

  const getFile = isProject ? agent.projectInstructionFile : agent.globalInstructionFile;
  if (!getFile) return false;
  const instructionFile = getFile();

  if (!fs.existsSync(instructionFile)) return false;

  const content = fs.readFileSync(instructionFile, "utf8");
  const startMarker = autorunStartMarker(skillName);
  const endMarker = autorunEndMarker(skillName);

  const pattern = new RegExp(
    `\\n*${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}\\n*`,
    "g"
  );
  const updated = content.replace(pattern, "");

  // If file is now empty (or just whitespace), remove it
  if (updated.trim() === "") {
    fs.unlinkSync(instructionFile);
  } else {
    fs.writeFileSync(instructionFile, updated.trimEnd() + "\n", "utf8");
  }
  return instructionFile;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  AGENTS,
  DEFAULT_AGENT,
  getAgentConfig,
  getSkillsSourceDir,
  getTargetDir,
  getAvailableSkills,
  getInstalledSkills,
  parseSkillDescription,
  copyDirRecursive,
  confirm,
  injectAutorun,
  removeAutorun,
};
