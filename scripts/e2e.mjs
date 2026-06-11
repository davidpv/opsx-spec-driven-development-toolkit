// E2E: init a temp project for all three targets, verify structure, then test update semantics.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "dist", "cli.js");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "opsx-e2e-"));
let failures = 0;

const run = (args, cwd = tmp) =>
  execFileSync("node", [cli, ...args], { cwd, encoding: "utf8", env: { ...process.env, CI: "1" } });

const assert = (cond, msg) => {
  if (cond) console.log(`  ✔ ${msg}`);
  else {
    failures++;
    console.error(`  ✘ ${msg}`);
  }
};
const exists = (rel) => fs.existsSync(path.join(tmp, rel));
const read = (rel) => fs.readFileSync(path.join(tmp, rel), "utf8");

console.log(`E2E in ${tmp}`);
fs.mkdirSync(path.join(tmp, ".git")); // doctor expects a git repo; init doesn't care

// Pre-existing files to test merge/managed-block behavior
fs.writeFileSync(path.join(tmp, "AGENTS.md"), "# My project notes\n\nKeep me.\n");
fs.writeFileSync(
  path.join(tmp, "opencode.json"),
  JSON.stringify({ instructions: ["AGENTS.md"], permission: { bash: { "docker *": "allow" } }, theme: "dark" }, null, 2),
);

console.log("\n— init —");
run(["init", "--yes", "--targets", "opencode,claude,codex", "--project-key", "DEMO", "--language", "en", "--work-mode", "feature"]);

// shared
assert(exists("workflow.yaml"), "workflow.yaml written");
const wf = read("workflow.yaml");
assert(/project_key: DEMO/.test(wf), "workflow.yaml: project_key templated");
assert(/default_language: en/.test(wf), "workflow.yaml: language templated");
assert(/work_mode: feature/.test(wf), "workflow.yaml: work_mode templated");
assert(wf.includes("#"), "workflow.yaml: comments preserved");
assert(exists("backlog/tasks/.gitkeep") && exists("templates/task.md") && exists("openspec/config.yaml"), "backlog/, templates/, openspec/ scaffolded");
const agentsMd = read("AGENTS.md");
assert(agentsMd.startsWith("# My project notes"), "AGENTS.md: user content preserved");
assert(agentsMd.includes("OPSX:START"), "AGENTS.md: managed block injected");

// opencode
assert(exists(".opencode/commands/opsx-propose.md"), "opencode: commands");
assert(exists(".opencode/skills/openspec-propose/SKILL.md"), "opencode: skills");
assert(exists(".opencode/agents/spec-reviewer.md"), "opencode: agents");
const oc = JSON.parse(read("opencode.json"));
assert(oc.theme === "dark" && oc.permission?.bash?.["docker *"] === "allow", "opencode.json: user values preserved");
assert(oc.permission?.bash?.["openspec *"] === "allow", "opencode.json: payload permissions merged in");

// claude
assert(exists(".claude/commands/opsx-propose.md"), "claude: commands");
assert(exists(".claude/skills/openspec-propose/SKILL.md"), "claude: skills");
assert(exists(".claude/agents/spec-reviewer.md"), "claude: agents");
assert(exists(".claude/settings.json"), "claude: settings.json");
assert(read("CLAUDE.md").includes("@AGENTS.md"), "claude: CLAUDE.md imports AGENTS.md");
assert(read(".claude/commands/review-change.md").includes("spec-reviewer"), "claude: agent delegation mapped");
assert(read(".claude/agents/spec-reviewer.md").includes("name: spec-reviewer"), "claude: subagent frontmatter");

// codex
assert(exists(".codex/skills/openspec-propose/SKILL.md"), "codex: skills");
assert(exists(".codex/skills/opsx-propose/SKILL.md"), "codex: command compiled as skill");
assert(exists(".codex/skills/spec-reviewer/SKILL.md"), "codex: agent compiled as skill");
assert(!read(".codex/skills/next/SKILL.md").includes("$ARGUMENTS"), "codex: $ARGUMENTS replaced");

// manifest
assert(exists(".opsx/manifest.json"), "manifest written");

console.log("\n— update —");
// user modifies a managed file; update must keep it
const cmd = path.join(tmp, ".opencode/commands/ship.md");
fs.writeFileSync(cmd, read(".opencode/commands/ship.md") + "\n<!-- local tweak -->\n");
// user deletes a file; update must restore it
fs.rmSync(path.join(tmp, ".claude/commands/next.md"));
const out = run(["update"]);
assert(read(".opencode/commands/ship.md").includes("local tweak"), "update: locally modified file kept");
assert(exists(".claude/commands/next.md"), "update: deleted file restored");
assert(/locally modified/.test(out), "update: reports kept files");

console.log("\n— init guard —");
const guard = run(["init", "--yes"]);
assert(/already initialized/.test(guard), "init refuses to re-run without --force");

console.log(failures ? `\n${failures} FAILURES` : "\nALL OK");
process.exit(failures ? 1 : 0);
