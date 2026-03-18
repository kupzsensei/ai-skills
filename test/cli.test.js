const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CLI = path.join(__dirname, "..", "bin", "cli.js");

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-skills-cli-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function run(args, opts = {}) {
  try {
    return execSync(`node "${CLI}" ${args}`, {
      encoding: "utf8",
      cwd: opts.cwd || tmpDir,
      env: { ...process.env, HOME: tmpDir, USERPROFILE: tmpDir },
      timeout: 10000,
    });
  } catch (err) {
    return err.stdout + err.stderr;
  }
}

describe("CLI help", () => {
  it("shows help with no args", () => {
    const output = run("");
    assert.ok(output.includes("ai-skills"));
    assert.ok(output.includes("install"));
    assert.ok(output.includes("uninstall"));
    assert.ok(output.includes("list"));
  });

  it("shows help with --help", () => {
    const output = run("--help");
    assert.ok(output.includes("ai-skills"));
  });
});

describe("CLI list", () => {
  it("lists available skills", () => {
    const output = run("list");
    assert.ok(output.includes("project-memory-skill"));
    assert.ok(output.includes("fullstack-engineer-skill"));
    assert.ok(output.includes("skill-factory"));
  });

  it("shows not installed status for clean env", () => {
    const output = run("list");
    assert.ok(output.includes("not installed"));
  });
});

describe("CLI install", () => {
  it("installs a single skill to global location", () => {
    const output = run("install project-memory-skill --force");
    assert.ok(output.includes("Installed project-memory-skill"));

    // Verify files were copied
    const skillDir = path.join(tmpDir, ".claude", "skills", "project-memory-skill");
    assert.ok(fs.existsSync(path.join(skillDir, "SKILL.md")));
    assert.ok(fs.existsSync(path.join(skillDir, "AUTORUN.md")));
  });

  it("installs all skills", () => {
    const output = run("install --force");
    assert.ok(output.includes("fullstack-engineer-skill"));
    assert.ok(output.includes("project-memory-skill"));
    assert.ok(output.includes("skill-factory"));
  });

  it("injects autorun into CLAUDE.md for claude agent", () => {
    run("install project-memory-skill --force");

    const claudeMd = path.join(tmpDir, ".claude", "CLAUDE.md");
    assert.ok(fs.existsSync(claudeMd), "CLAUDE.md should be created");

    const content = fs.readFileSync(claudeMd, "utf8");
    assert.ok(content.includes("<!-- ai-skills:project-memory-skill:start -->"));
    assert.ok(content.includes(".ai/memory/"));
    assert.ok(content.includes("<!-- ai-skills:project-memory-skill:end -->"));
  });

  it("injects autorun into GEMINI.md for gemini agent", () => {
    run("install project-memory-skill --force --agent=gemini");

    const geminiMd = path.join(tmpDir, ".gemini", "GEMINI.md");
    assert.ok(fs.existsSync(geminiMd), "GEMINI.md should be created");

    const content = fs.readFileSync(geminiMd, "utf8");
    assert.ok(content.includes("<!-- ai-skills:project-memory-skill:start -->"));
    assert.ok(content.includes(".ai/memory/"));
  });

  it("injects autorun into QWEN.md for qwen agent", () => {
    run("install project-memory-skill --force --agent=qwen");

    const qwenMd = path.join(tmpDir, ".qwen", "QWEN.md");
    assert.ok(fs.existsSync(qwenMd), "QWEN.md should be created");

    const content = fs.readFileSync(qwenMd, "utf8");
    assert.ok(content.includes("<!-- ai-skills:project-memory-skill:start -->"));
  });

  it("injects autorun into AGENTS.md for codex agent", () => {
    run("install project-memory-skill --force --agent=codex");

    const agentsMd = path.join(tmpDir, ".codex", "AGENTS.md");
    assert.ok(fs.existsSync(agentsMd), "AGENTS.md should be created for Codex");

    const content = fs.readFileSync(agentsMd, "utf8");
    assert.ok(content.includes("<!-- ai-skills:project-memory-skill:start -->"));
  });

  it("does NOT inject autorun for gpt agent", () => {
    run("install project-memory-skill --force --agent=gpt");

    // GPT has no instruction file support, so nothing should be created
    const gptMd = path.join(tmpDir, ".gpt", "GPT.md");
    assert.ok(!fs.existsSync(gptMd), "GPT.md should NOT be created");
  });

  it("applies recommended settings for claude", () => {
    run("install project-memory-skill --force");

    const settingsPath = path.join(tmpDir, ".claude", "settings.json");
    assert.ok(fs.existsSync(settingsPath), "settings.json should be created");

    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    assert.ok(settings.permissions);
    assert.ok(settings.permissions.allow);
    assert.ok(settings.permissions.allow.includes("Read(.ai/memory/**)"));
    assert.ok(settings.permissions.allow.includes("Skill(project-memory-skill)"));
  });

  it("does not apply settings for gemini (no permission model)", () => {
    run("install project-memory-skill --force --agent=gemini");

    const settingsPath = path.join(tmpDir, ".gemini", "settings.json");
    assert.ok(!fs.existsSync(settingsPath), "settings.json should NOT be created for Gemini");
  });

  it("re-install does not duplicate autorun markers", () => {
    run("install project-memory-skill --force");
    run("install project-memory-skill --force");

    const claudeMd = path.join(tmpDir, ".claude", "CLAUDE.md");
    const content = fs.readFileSync(claudeMd, "utf8");
    const starts = content.match(/<!-- ai-skills:project-memory-skill:start -->/g);
    assert.strictEqual(starts.length, 1);
  });

  it("errors on unknown skill name", () => {
    const output = run("install nonexistent-skill");
    assert.ok(output.includes("Error"));
    assert.ok(output.includes("nonexistent-skill"));
  });
});

describe("CLI uninstall", () => {
  it("removes installed skill", () => {
    run("install project-memory-skill --force");
    const output = run("uninstall project-memory-skill --force");
    assert.ok(output.includes("Removed project-memory-skill"));

    const skillDir = path.join(tmpDir, ".claude", "skills", "project-memory-skill");
    assert.ok(!fs.existsSync(skillDir));
  });

  it("removes autorun from instruction file", () => {
    run("install project-memory-skill --force");

    const claudeMd = path.join(tmpDir, ".claude", "CLAUDE.md");
    assert.ok(fs.existsSync(claudeMd));

    run("uninstall project-memory-skill --force");

    // File should be deleted since it was only the autorun section
    assert.ok(!fs.existsSync(claudeMd), "CLAUDE.md should be removed when empty");
  });

  it("preserves other content in instruction file after uninstall", () => {
    run("install project-memory-skill --force");

    const claudeMd = path.join(tmpDir, ".claude", "CLAUDE.md");
    const content = fs.readFileSync(claudeMd, "utf8");
    // Prepend user content
    fs.writeFileSync(claudeMd, "# My custom instructions\n\n" + content);

    run("uninstall project-memory-skill --force");

    assert.ok(fs.existsSync(claudeMd), "CLAUDE.md should still exist");
    const remaining = fs.readFileSync(claudeMd, "utf8");
    assert.ok(remaining.includes("# My custom instructions"));
    assert.ok(!remaining.includes("ai-skills:project-memory-skill"));
  });

  it("errors on skill that is not installed", () => {
    const output = run("uninstall nonexistent-skill --force");
    assert.ok(output.includes("Error"));
  });
});

describe("cross-agent shared memory", () => {
  it("all agents with autorun reference .ai/memory/ in AUTORUN.md", () => {
    const autorunPath = path.join(__dirname, "..", "skills", "project-memory-skill", "AUTORUN.md");
    const content = fs.readFileSync(autorunPath, "utf8");
    assert.ok(content.includes(".ai/memory/"));
    assert.ok(!content.includes(".claude/memory/"));
  });

  it("SKILL.md references .ai/memory/ (not .claude/memory/)", () => {
    const skillPath = path.join(__dirname, "..", "skills", "project-memory-skill", "SKILL.md");
    const content = fs.readFileSync(skillPath, "utf8");
    assert.ok(content.includes(".ai/memory/"));
    assert.ok(!content.includes(".claude/memory/"));
  });

  it("same AUTORUN.md content injected for all supporting agents", () => {
    run("install project-memory-skill --force --agent=claude");
    run("install project-memory-skill --force --agent=gemini");
    run("install project-memory-skill --force --agent=qwen");
    run("install project-memory-skill --force --agent=codex");

    const claudeContent = fs.readFileSync(path.join(tmpDir, ".claude", "CLAUDE.md"), "utf8");
    const geminiContent = fs.readFileSync(path.join(tmpDir, ".gemini", "GEMINI.md"), "utf8");
    const qwenContent = fs.readFileSync(path.join(tmpDir, ".qwen", "QWEN.md"), "utf8");
    const codexContent = fs.readFileSync(path.join(tmpDir, ".codex", "AGENTS.md"), "utf8");

    // All should reference the same shared memory path
    for (const content of [claudeContent, geminiContent, qwenContent, codexContent]) {
      assert.ok(content.includes(".ai/memory/"), "Should reference shared .ai/memory/");
    }
  });
});
