const fs = require("fs");
const path = require("path");
const {
  getSkillsSourceDir,
  getAvailableSkills,
  getInstalledSkills,
  getTargetDir,
  getAgentConfig,
  copyDirRecursive,
  confirm,
} = require("./utils");

async function install(skillName, flags) {
  const available = getAvailableSkills();
  const agent = getAgentConfig(flags.agent);
  const targetDir = getTargetDir(flags.project, flags.agent);
  const srcDir = getSkillsSourceDir();

  let toInstall;
  if (skillName) {
    if (!available.includes(skillName)) {
      console.error(`Error: Unknown skill "${skillName}". Available: ${available.join(", ")}`);
      process.exit(1);
    }
    toInstall = [skillName];
  } else {
    toInstall = available;
  }

  if (toInstall.length === 0) {
    console.log("No skills to install.");
    return;
  }

  const installed = getInstalledSkills(targetDir);
  const location = flags.project ? "project" : "global";
  let count = 0;

  for (const skill of toInstall) {
    const dest = path.join(targetDir, skill);

    if (installed.includes(skill) && !flags.force) {
      const yes = await confirm(`Skill "${skill}" already exists at ${agent.label} ${location} location. Overwrite?`);
      if (!yes) {
        console.log(`  Skipped ${skill}`);
        continue;
      }
    }

    fs.mkdirSync(dest, { recursive: true });
    copyDirRecursive(path.join(srcDir, skill), dest);
    console.log(`  ✓ Installed ${skill} → ${dest}`);
    count++;
  }

  console.log(`\n${count} skill(s) installed to ${agent.label} ${location} location.`);
}

module.exports = install;
