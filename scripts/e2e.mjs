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
run(["init", "--yes", "--targets", "opencode,claude,codex", "--project-key", "DEMO", "--language", "en", "--work-mode", "supervised"]);

// shared
assert(exists("workflow.yaml"), "workflow.yaml written");
const wf = read("workflow.yaml");
assert(/project_key: DEMO/.test(wf), "workflow.yaml: project_key templated");
assert(/default_language: en/.test(wf), "workflow.yaml: language templated");
assert(/work_mode: supervised/.test(wf), "workflow.yaml: work_mode templated");
  assert(/^ {2}provider: none$/m.test(wf), "workflow.yaml: provider none by default");
  assert(!/^model:/m.test(read(".opencode/commands/opsx-propose.md")), "opencode: no model pin when provider is none");
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

console.log("\n— model routing —");
const routed = fs.mkdtempSync(path.join(os.tmpdir(), "opsx-e2e-models-"));
fs.mkdirSync(path.join(routed, ".git"));
fs.writeFileSync(
  path.join(routed, "opencode.json"),
  JSON.stringify({ instructions: ["AGENTS.md"], theme: "dark" }, null, 2),
);
const readAt = (root, rel) => fs.readFileSync(path.join(root, rel), "utf8");
run(["init", "--yes", "--targets", "opencode,claude", "--provider", "grok", "--project-key", "GROK"], routed);
const grokWf = readAt(routed, "workflow.yaml");
assert(/provider: grok/.test(grokWf), "grok: provider written");
assert(/propose: xai\/grok-4\.7/.test(grokWf), "grok: propose is frontier");
assert(/apply: xai\/grok-4\.3/.test(grokWf), "grok: apply is mid");
assert(/model: xai\/grok-4\.7/.test(readAt(routed, ".opencode/commands/opsx-propose.md")), "grok: propose command pinned");
assert(/model: xai\/grok-4\.3/.test(readAt(routed, ".opencode/commands/opsx-apply.md")), "grok: apply command pinned");
assert(/model: xai\/grok-4\.3/.test(readAt(routed, ".opencode/commands/git-commit.md")), "grok: commit stays on grok-4.3");
assert(!readAt(routed, ".claude/commands/opsx-propose.md").includes("xai/"), "grok: claude commands not pinned to xAI");
const grokOc = JSON.parse(readAt(routed, "opencode.json"));
assert(grokOc.theme === "dark", "grok: user opencode.json preserved");
assert(grokOc.small_model === "xai/grok-4.3", "grok: small_model is routine");
assert(grokOc.agent?.title?.reasoningEffort === "none", "grok: title effort none");

const applyCmd = path.join(routed, ".opencode/commands/opsx-apply.md");
fs.writeFileSync(applyCmd, readAt(routed, ".opencode/commands/opsx-apply.md") + "\n<!-- local tweak -->\n");
fs.writeFileSync(
  path.join(routed, "workflow.yaml"),
  grokWf.replace("apply: xai/grok-4.3", "apply: xai/grok-4.7"),
);
run(["update"], routed);
const applied = readAt(routed, ".opencode/commands/opsx-apply.md");
assert(applied.includes("local tweak"), "grok update: command body kept");
assert(/model: xai\/grok-4\.7/.test(applied), "grok update: yaml edit re-pins apply");
assert(readAt(routed, "workflow.yaml").includes("apply: xai/grok-4.7"), "grok update: yaml edit kept");

const claudeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opsx-e2e-claude-"));
fs.mkdirSync(path.join(claudeRoot, ".git"));
run(["init", "--yes", "--targets", "opencode,claude", "--provider", "claude"], claudeRoot);
assert(/model: anthropic\/claude-opus-5-5/.test(readAt(claudeRoot, ".opencode/commands/opsx-propose.md")), "claude: propose pinned");
assert(/model: anthropic\/claude-sonnet-5-5/.test(readAt(claudeRoot, ".opencode/commands/opsx-apply.md")), "claude: apply pinned");
assert(/model: anthropic\/claude-haiku-4-5/.test(readAt(claudeRoot, ".opencode/commands/git-commit.md")), "claude: routine is haiku");
assert(/model: claude-opus-5-5/.test(readAt(claudeRoot, ".claude/commands/opsx-propose.md")), "claude: bare id on Claude Code");

const openaiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opsx-e2e-openai-"));
fs.mkdirSync(path.join(openaiRoot, ".git"));
run(["init", "--yes", "--targets", "opencode,claude", "--provider", "openai"], openaiRoot);
assert(/model: openai\/gpt-6-astra/.test(readAt(openaiRoot, ".opencode/commands/opsx-propose.md")), "openai: propose is Astra");
assert(/model: openai\/gpt-6-sol/.test(readAt(openaiRoot, ".opencode/commands/opsx-apply.md")), "openai: apply is Sol");
assert(/model: openai\/gpt-6-luna/.test(readAt(openaiRoot, ".opencode/commands/git-commit.md")), "openai: routine is Luna");
assert(!readAt(openaiRoot, ".claude/commands/opsx-propose.md").includes("openai/"), "openai: claude commands not pinned");

console.log(failures ? `\n${failures} FAILURES` : "\nALL OK");
process.exit(failures ? 1 : 0);
