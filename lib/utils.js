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
  },
  gpt: {
    label: "GPT CLI",
    globalDir: () => path.join(os.homedir(), ".gpt", "skills"),
    projectDir: () => path.join(process.cwd(), ".gpt", "skills"),
    skillFile: "SKILL.md",
  },
  gemini: {
    label: "Gemini CLI",
    globalDir: () => path.join(os.homedir(), ".gemini", "skills"),
    projectDir: () => path.join(process.cwd(), ".gemini", "skills"),
    skillFile: "SKILL.md",
  },
  qwen: {
    label: "Qwen CLI",
    globalDir: () => path.join(os.homedir(), ".qwen", "skills"),
    projectDir: () => path.join(process.cwd(), ".qwen", "skills"),
    skillFile: "SKILL.md",
  },
  codex: {
    label: "Codex CLI",
    globalDir: () => path.join(os.homedir(), ".codex", "skills"),
    projectDir: () => path.join(process.cwd(), ".codex", "skills"),
    skillFile: "SKILL.md",
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
};
