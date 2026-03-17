const {
  AGENTS,
  getAvailableSkills,
  getInstalledSkills,
  getTargetDir,
  getAgentConfig,
  parseSkillDescription,
} = require("./utils");

function list(flags) {
  const agent = getAgentConfig(flags.agent);
  const targetDir = getTargetDir(flags.project, flags.agent);
  const available = getAvailableSkills();
  const installed = getInstalledSkills(targetDir);
  const location = flags.project ? "project" : "global";

  console.log(`\nAvailable skills for ${agent.label} (${location}):\n`);

  if (available.length === 0) {
    console.log("  No skills bundled.");
    return;
  }

  for (const skill of available) {
    const status = installed.includes(skill)
      ? "\x1b[32m[installed]\x1b[0m"
      : "\x1b[90m[not installed]\x1b[0m";
    const desc = parseSkillDescription(skill);
    console.log(`  ${skill}  ${status}`);
    if (desc) console.log(`    ${desc}`);
  }

  if (flags.all) {
    console.log(`\nSupported agents: ${Object.keys(AGENTS).join(", ")}`);
  }

  console.log();
}

module.exports = list;
