const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  RECOMMENDED_PERMISSIONS,
  readSettings,
  mergePermissions,
} = require("../lib/settings");

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-skills-settings-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("RECOMMENDED_PERMISSIONS", () => {
  it("has claude permissions", () => {
    assert.ok(RECOMMENDED_PERMISSIONS.claude);
    assert.ok(RECOMMENDED_PERMISSIONS.claude.allow.length > 0);
  });

  it("claude permissions reference .ai/memory/ (not .claude/memory/)", () => {
    for (const rule of RECOMMENDED_PERMISSIONS.claude.allow) {
      assert.ok(
        !rule.includes(".claude/memory"),
        `Rule "${rule}" still references .claude/memory instead of .ai/memory`
      );
    }
  });

  it("claude permissions include memory read/write/edit", () => {
    const allow = RECOMMENDED_PERMISSIONS.claude.allow;
    assert.ok(allow.includes("Read(.ai/memory/**)"));
    assert.ok(allow.includes("Edit(.ai/memory/**)"));
    assert.ok(allow.includes("Write(.ai/memory/**)"));
  });

  it("claude permissions include skill invocations", () => {
    const allow = RECOMMENDED_PERMISSIONS.claude.allow;
    assert.ok(allow.includes("Skill(project-memory-skill)"));
    assert.ok(allow.includes("Skill(fullstack-engineer-skill)"));
    assert.ok(allow.includes("Skill(skill-factory)"));
  });

  it("gemini and qwen have empty allow (no permission model)", () => {
    assert.deepStrictEqual(RECOMMENDED_PERMISSIONS.gemini.allow, []);
    assert.deepStrictEqual(RECOMMENDED_PERMISSIONS.qwen.allow, []);
  });
});

describe("readSettings", () => {
  it("returns empty object for non-existent file", () => {
    const result = readSettings(path.join(tmpDir, "nope.json"));
    assert.deepStrictEqual(result, {});
  });

  it("returns empty object for null path", () => {
    const result = readSettings(null);
    assert.deepStrictEqual(result, {});
  });

  it("parses valid JSON", () => {
    const settingsPath = path.join(tmpDir, "settings.json");
    fs.writeFileSync(settingsPath, JSON.stringify({ foo: "bar" }));
    const result = readSettings(settingsPath);
    assert.deepStrictEqual(result, { foo: "bar" });
  });

  it("returns empty object for invalid JSON", () => {
    const settingsPath = path.join(tmpDir, "settings.json");
    fs.writeFileSync(settingsPath, "not json{{{");
    const result = readSettings(settingsPath);
    assert.deepStrictEqual(result, {});
  });
});

describe("mergePermissions", () => {
  it("adds rules to empty settings", () => {
    const { settings, added } = mergePermissions({}, ["Read(.ai/memory/**)", "Edit(.ai/memory/**)"]);
    assert.strictEqual(added, 2);
    assert.deepStrictEqual(settings.permissions.allow, [
      "Read(.ai/memory/**)",
      "Edit(.ai/memory/**)",
    ]);
  });

  it("does not duplicate existing rules", () => {
    const existing = {
      permissions: {
        allow: ["Read(.ai/memory/**)"],
      },
    };
    const { settings, added } = mergePermissions(existing, [
      "Read(.ai/memory/**)",
      "Edit(.ai/memory/**)",
    ]);
    assert.strictEqual(added, 1);
    assert.deepStrictEqual(settings.permissions.allow, [
      "Read(.ai/memory/**)",
      "Edit(.ai/memory/**)",
    ]);
  });

  it("returns added=0 when all rules exist", () => {
    const existing = {
      permissions: {
        allow: ["Read(.ai/memory/**)", "Edit(.ai/memory/**)"],
      },
    };
    const { added } = mergePermissions(existing, [
      "Read(.ai/memory/**)",
      "Edit(.ai/memory/**)",
    ]);
    assert.strictEqual(added, 0);
  });

  it("preserves other settings fields", () => {
    const existing = {
      permissions: { defaultMode: "default", allow: [] },
      autoUpdatesChannel: "latest",
    };
    const { settings } = mergePermissions(existing, ["Read(.ai/memory/**)"]);
    assert.strictEqual(settings.permissions.defaultMode, "default");
    assert.strictEqual(settings.autoUpdatesChannel, "latest");
  });
});
