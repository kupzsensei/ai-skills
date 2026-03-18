const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  AGENTS,
  DEFAULT_AGENT,
  getAgentConfig,
  getAvailableSkills,
  getInstalledSkills,
  parseSkillDescription,
  copyDirRecursive,
  injectAutorun,
  removeAutorun,
} = require("../lib/utils");

// Create a temp directory for each test
let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-skills-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("AGENTS config", () => {
  it("has all expected agents", () => {
    const agents = Object.keys(AGENTS);
    assert.deepStrictEqual(agents, ["claude", "gpt", "gemini", "qwen", "codex"]);
  });

  it("default agent is claude", () => {
    assert.strictEqual(DEFAULT_AGENT, "claude");
  });

  it("claude uses CLAUDE.md for instruction file", () => {
    const file = AGENTS.claude.projectInstructionFile();
    assert.ok(file.endsWith("CLAUDE.md"));
  });

  it("codex uses AGENTS.md for instruction file (not CODEX.md)", () => {
    const file = AGENTS.codex.projectInstructionFile();
    assert.ok(file.endsWith("AGENTS.md"), `Expected AGENTS.md, got ${file}`);
  });

  it("gpt has no instruction file support", () => {
    assert.strictEqual(AGENTS.gpt.supportsAutorun, false);
    assert.strictEqual(AGENTS.gpt.globalInstructionFile, null);
    assert.strictEqual(AGENTS.gpt.projectInstructionFile, null);
  });

  it("gemini uses GEMINI.md", () => {
    const file = AGENTS.gemini.projectInstructionFile();
    assert.ok(file.endsWith("GEMINI.md"));
  });

  it("qwen uses QWEN.md", () => {
    const file = AGENTS.qwen.projectInstructionFile();
    assert.ok(file.endsWith("QWEN.md"));
  });

  it("all agents with autorun support have instruction file functions", () => {
    for (const [name, agent] of Object.entries(AGENTS)) {
      if (agent.supportsAutorun) {
        assert.ok(
          typeof agent.globalInstructionFile === "function",
          `${name} supportsAutorun but has no globalInstructionFile`
        );
        assert.ok(
          typeof agent.projectInstructionFile === "function",
          `${name} supportsAutorun but has no projectInstructionFile`
        );
      }
    }
  });
});

describe("getAgentConfig", () => {
  it("returns claude config by default", () => {
    const config = getAgentConfig(null);
    assert.strictEqual(config.name, "claude");
    assert.strictEqual(config.label, "Claude Code");
  });

  it("returns correct config for each agent", () => {
    for (const name of Object.keys(AGENTS)) {
      const config = getAgentConfig(name);
      assert.strictEqual(config.name, name);
    }
  });

  it("is case-insensitive", () => {
    const config = getAgentConfig("CLAUDE");
    assert.strictEqual(config.name, "claude");
  });
});

describe("getAvailableSkills", () => {
  it("returns array of skill names", () => {
    const skills = getAvailableSkills();
    assert.ok(Array.isArray(skills));
    assert.ok(skills.length > 0);
  });

  it("includes project-memory-skill", () => {
    const skills = getAvailableSkills();
    assert.ok(skills.includes("project-memory-skill"));
  });

  it("includes fullstack-engineer-skill", () => {
    const skills = getAvailableSkills();
    assert.ok(skills.includes("fullstack-engineer-skill"));
  });

  it("includes skill-factory", () => {
    const skills = getAvailableSkills();
    assert.ok(skills.includes("skill-factory"));
  });
});

describe("getInstalledSkills", () => {
  it("returns empty array for non-existent directory", () => {
    const skills = getInstalledSkills(path.join(tmpDir, "nonexistent"));
    assert.deepStrictEqual(skills, []);
  });

  it("returns directory names", () => {
    const skillDir = path.join(tmpDir, "skills");
    fs.mkdirSync(path.join(skillDir, "my-skill"), { recursive: true });
    fs.mkdirSync(path.join(skillDir, "other-skill"), { recursive: true });
    const skills = getInstalledSkills(skillDir);
    assert.ok(skills.includes("my-skill"));
    assert.ok(skills.includes("other-skill"));
  });
});

describe("parseSkillDescription", () => {
  it("parses multi-line description from SKILL.md", () => {
    const desc = parseSkillDescription("project-memory-skill");
    assert.ok(desc.length > 0);
  });

  it("returns empty string for non-existent skill", () => {
    const desc = parseSkillDescription("nonexistent-skill");
    assert.strictEqual(desc, "");
  });
});

describe("copyDirRecursive", () => {
  it("copies directory contents", () => {
    const src = path.join(tmpDir, "src");
    const dest = path.join(tmpDir, "dest");
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, "file.txt"), "hello");
    fs.mkdirSync(path.join(src, "sub"));
    fs.writeFileSync(path.join(src, "sub", "nested.txt"), "world");

    copyDirRecursive(src, dest);

    assert.ok(fs.existsSync(path.join(dest, "file.txt")));
    assert.strictEqual(fs.readFileSync(path.join(dest, "file.txt"), "utf8"), "hello");
    assert.ok(fs.existsSync(path.join(dest, "sub", "nested.txt")));
    assert.strictEqual(fs.readFileSync(path.join(dest, "sub", "nested.txt"), "utf8"), "world");
  });
});

describe("injectAutorun", () => {
  let srcDir;
  let instructionFile;
  let agent;

  beforeEach(() => {
    srcDir = path.join(tmpDir, "skills-src");
    fs.mkdirSync(path.join(srcDir, "test-skill"), { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, "test-skill", "AUTORUN.md"),
      "# Test\nDo the thing automatically."
    );

    instructionFile = path.join(tmpDir, "CLAUDE.md");

    agent = {
      supportsAutorun: true,
      projectInstructionFile: () => instructionFile,
      globalInstructionFile: () => instructionFile,
    };
  });

  it("creates instruction file with markers", () => {
    const result = injectAutorun("test-skill", srcDir, agent, true);
    assert.strictEqual(result, instructionFile);

    const content = fs.readFileSync(instructionFile, "utf8");
    assert.ok(content.includes("<!-- ai-skills:test-skill:start -->"));
    assert.ok(content.includes("# Test"));
    assert.ok(content.includes("Do the thing automatically."));
    assert.ok(content.includes("<!-- ai-skills:test-skill:end -->"));
  });

  it("appends to existing instruction file", () => {
    fs.writeFileSync(instructionFile, "# Existing content\nDo not remove.");

    injectAutorun("test-skill", srcDir, agent, true);

    const content = fs.readFileSync(instructionFile, "utf8");
    assert.ok(content.includes("# Existing content"));
    assert.ok(content.includes("Do not remove."));
    assert.ok(content.includes("<!-- ai-skills:test-skill:start -->"));
  });

  it("replaces old section on re-install (no duplicates)", () => {
    injectAutorun("test-skill", srcDir, agent, true);
    injectAutorun("test-skill", srcDir, agent, true);

    const content = fs.readFileSync(instructionFile, "utf8");
    const starts = content.match(/<!-- ai-skills:test-skill:start -->/g);
    assert.strictEqual(starts.length, 1, "Should have exactly one start marker");
  });

  it("returns false for skill without AUTORUN.md", () => {
    fs.mkdirSync(path.join(srcDir, "no-autorun"), { recursive: true });
    const result = injectAutorun("no-autorun", srcDir, agent, true);
    assert.strictEqual(result, false);
  });

  it("returns false for agent that does not support autorun", () => {
    const gptAgent = { supportsAutorun: false };
    const result = injectAutorun("test-skill", srcDir, gptAgent, true);
    assert.strictEqual(result, false);
  });

  it("handles multiple skills in same instruction file", () => {
    fs.mkdirSync(path.join(srcDir, "skill-a"), { recursive: true });
    fs.writeFileSync(path.join(srcDir, "skill-a", "AUTORUN.md"), "Skill A instructions");
    fs.mkdirSync(path.join(srcDir, "skill-b"), { recursive: true });
    fs.writeFileSync(path.join(srcDir, "skill-b", "AUTORUN.md"), "Skill B instructions");

    injectAutorun("skill-a", srcDir, agent, true);
    injectAutorun("skill-b", srcDir, agent, true);

    const content = fs.readFileSync(instructionFile, "utf8");
    assert.ok(content.includes("<!-- ai-skills:skill-a:start -->"));
    assert.ok(content.includes("Skill A instructions"));
    assert.ok(content.includes("<!-- ai-skills:skill-a:end -->"));
    assert.ok(content.includes("<!-- ai-skills:skill-b:start -->"));
    assert.ok(content.includes("Skill B instructions"));
    assert.ok(content.includes("<!-- ai-skills:skill-b:end -->"));
  });
});

describe("removeAutorun", () => {
  let instructionFile;
  let agent;

  beforeEach(() => {
    instructionFile = path.join(tmpDir, "CLAUDE.md");
    agent = {
      supportsAutorun: true,
      projectInstructionFile: () => instructionFile,
      globalInstructionFile: () => instructionFile,
    };
  });

  it("removes managed section from instruction file", () => {
    fs.writeFileSync(
      instructionFile,
      "# My stuff\n\n<!-- ai-skills:test-skill:start -->\nAutorun content\n<!-- ai-skills:test-skill:end -->\n"
    );

    removeAutorun("test-skill", agent, true);

    const content = fs.readFileSync(instructionFile, "utf8");
    assert.ok(!content.includes("ai-skills:test-skill"));
    assert.ok(content.includes("# My stuff"));
  });

  it("deletes instruction file if empty after removal", () => {
    fs.writeFileSync(
      instructionFile,
      "\n\n<!-- ai-skills:test-skill:start -->\nAutorun content\n<!-- ai-skills:test-skill:end -->\n"
    );

    removeAutorun("test-skill", agent, true);

    assert.ok(!fs.existsSync(instructionFile), "File should be deleted when empty");
  });

  it("returns false for non-existent instruction file", () => {
    const result = removeAutorun("test-skill", agent, true);
    assert.strictEqual(result, false);
  });

  it("returns false for agent without autorun support", () => {
    const gptAgent = { supportsAutorun: false };
    const result = removeAutorun("test-skill", gptAgent, true);
    assert.strictEqual(result, false);
  });

  it("preserves other skills when removing one", () => {
    fs.writeFileSync(
      instructionFile,
      [
        "<!-- ai-skills:skill-a:start -->",
        "Skill A",
        "<!-- ai-skills:skill-a:end -->",
        "",
        "<!-- ai-skills:skill-b:start -->",
        "Skill B",
        "<!-- ai-skills:skill-b:end -->",
      ].join("\n")
    );

    removeAutorun("skill-a", agent, true);

    const content = fs.readFileSync(instructionFile, "utf8");
    assert.ok(!content.includes("skill-a"));
    assert.ok(content.includes("<!-- ai-skills:skill-b:start -->"));
    assert.ok(content.includes("Skill B"));
  });
});
