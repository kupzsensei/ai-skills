const fs = require("fs");
const path = require("path");
const {
  getInstalledSkills,
  getTargetDir,
  getAgentConfig,
  confirm,
} = require("./utils");

async function uninstall(skillName, flags) {
  if (!skillName) {
    console.error("Error: Please specify a skill name to uninstall.");
    process.exit(1);
  }

  const agent = getAgentConfig(flags.agent);
  const targetDir = getTargetDir(flags.project, flags.agent);
  const installed = getInstalledSkills(targetDir);
  const location = flags.project ? "project" : "global";

  if (!installed.includes(skillName)) {
    console.error(`Error: Skill "${skillName}" is not installed at ${agent.label} ${location} location.`);
    process.exit(1);
  }

  if (!flags.force) {
    const yes = await confirm(`Remove skill "${skillName}" from ${agent.label} ${location} location?`);
    if (!yes) {
      console.log("Cancelled.");
      return;
    }
  }

  const skillDir = path.join(targetDir, skillName);
  fs.rmSync(skillDir, { recursive: true, force: true });
  console.log(`  ✓ Removed ${skillName} from ${agent.label} ${location} location.`);
}

module.exports = uninstall;
