// Validate that `opsx update` correctly deploys the new payload to projects
// initialised with an older version. Simulates the user journey:
//   - `opsx init` was run when v1.0.5 was the published version
//   - user upgrades the package to current develop
//   - user runs `npx @davidpv/opsx update`
//
// We swap the payload directory to v1.0.5, init a project, then swap back
// and run update. Then we check everything landed as expected.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "dist", "cli.js");
const payloadDir = path.join(root, "payload");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "opsx-update-test-"));
const project = path.join(tmp, "project");
fs.mkdirSync(project, { recursive: true });

let failures = 0;
const assert = (cond, msg) => {
  if (cond) console.log(`  ✔ ${msg}`);
  else {
    failures++;
    console.error(`  ✘ ${msg}`);
  }
};
const run = (args, cwd = project) =>
  execFileSync("node", [cli, ...args], { cwd, encoding: "utf8", env: { ...process.env, CI: "1" } });
const exists = (rel) => fs.existsSync(path.join(project, rel));
const read = (rel) => fs.readFileSync(path.join(project, rel), "utf8");
const fileText = (rel) => fs.readFileSync(path.join(project, rel), "utf8");

console.log(`Project at ${project}`);

// --- Step 1: stash current payload and check out v1.0.5 payload into payload/ ---
console.log("\n— staging v1.0.5 payload —");
execFileSync("git", ["checkout", "v1.0.5", "--", "payload"], { cwd: root, stdio: "inherit" });
// `git checkout` does not remove files that exist only on the current branch
// (work.md is committed in develop but not in v1.0.5), so remove them manually.
for (const trackedOnlyOnDevelop of ["payload/core/commands/work.md"]) {
  const p = path.join(root, trackedOnlyOnDevelop);
  if (fs.existsSync(p)) fs.rmSync(p);
}
try {
  // --- Step 2: rebuild CLI and init a project (simulates a user on v1.0.5) ---
  console.log("\n— npm run build (with v1.0.5 payload) —");
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });

  console.log("\n— git init + opsx init (v1.0.5) —");
  execFileSync("git", ["init"], { cwd: project, stdio: "inherit" });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: project, stdio: "inherit" });
  execFileSync("git", ["config", "user.name", "test"], { cwd: project, stdio: "inherit" });
  run(["init", "--yes", "--targets", "opencode,claude", "--project-key", "DEMO", "--language", "en"]);

  // Sanity: work.md must NOT exist under v1.0.5
  assert(!exists(".opencode/commands/work.md"), "v1.0.5 baseline: no work.md yet");
  // And the old ship.md must not have the worktree-aware content
  const oldShip = read(".opencode/commands/ship.md");
  assert(!/verify gate/.test(oldShip), "v1.0.5 baseline: ship.md is the old (no verify-gate) version");
} finally {
  // --- Step 3: restore current payload and rebuild CLI ---
  console.log("\n— restoring develop payload and rebuilding —");
  execFileSync("git", ["checkout", "develop", "--", "payload"], { cwd: root, stdio: "inherit" });
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
}

// --- Step 4: also user-edits a couple of files (to test the keep-vs-update logic) ---
console.log("\n— user local edit on ship.md (must be KEPT) —");
const shipRel = ".opencode/commands/ship.md";
const shipFile = path.join(project, shipRel);
fs.writeFileSync(shipFile, read(shipRel).replace(/^---$/m, "---\ndescription: my local override — DO NOT CLOBBER\n") + "\n<!-- user note -->\n");

// Simulate a project initialised with the v1.0.5 init: that init only knew
// about workMode: feature | flexible, and defaulted to flexible. The current
// build's init defaults to worktree, so rewrite the manifest to match what a
// true v1.0.5-era user would carry into an upgrade.
console.log("\n— rewrite manifest.workMode to 'flexible' (v1.0.5-era default) —");
const manifestPath = path.join(project, ".opsx/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.config.workMode = "flexible";
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

// user has a stale workflow.yaml (still v1.0.5 content)
// Update should refresh it because it was not modified by the user post-init.

console.log("\n— running opsx update —");
const updateOut = run(["update"]);
fs.writeFileSync(path.join(tmp, "update-output.txt"), updateOut);

// --- Step 5: assertions ---
console.log("\n— assertions —");

// A. The new file lands
assert(exists(".opencode/commands/work.md"), "NEW: work.md deployed to .opencode/commands/");
assert(exists(".claude/commands/work.md"), "NEW: work.md deployed to .claude/commands/");

// B. Modified files overwrite where the user didn't change them
// Note: ship.md was user-edited below (test G) -- it's expected to stay on v1.0.5.
const newShipClaude = read(".claude/commands/ship.md");
assert(/verify gate/.test(newShipClaude), "UPDATED: ship.md deployed to .claude/ with new content (no user edit here)");

const newOpsxPropose = read(".opencode/commands/opsx-propose.md");
assert(/Branch guard/.test(newOpsxPropose), "UPDATED: opsx-propose.md has the new branch guard");

const newOpsxApply = read(".opencode/commands/opsx-apply.md");
assert(/worktree/.test(newOpsxApply), "UPDATED: opsx-apply.md is worktree-aware");

const newOpsxVerify = read(".opencode/commands/opsx-verify.md");
assert(/Worktree guard/.test(newOpsxVerify) || /worktree/i.test(newOpsxVerify), "UPDATED: opsx-verify.md has the worktree guard");

const newOpsxArchive = read(".opencode/commands/opsx-archive.md");
assert(/Branch guard/.test(newOpsxArchive), "UPDATED: opsx-archive.md refuses worktree branch");

const newNext = read(".opencode/commands/next.md");
assert(/worktree/i.test(newNext), "UPDATED: next.md decision table has worktree rows");

const newStart = read(".opencode/commands/start.md");
assert(/worktree/i.test(newStart) && /chains? (the downstream|in|into)/i.test(newStart), "UPDATED: start.md chains into worktree");

const newPrOpen = read(".opencode/commands/pr-open.md");
assert(/worktree/i.test(newPrOpen), "UPDATED: pr-open.md is worktree-aware");

const newGitCommit = read(".opencode/commands/git-commit.md");
assert(/worktree/i.test(newGitCommit), "UPDATED: git-commit.md covers the worktree branch policy");

// C. Tasks workflow — branch guards
for (const file of ["req-capture", "task-import", "task-new", "task-generate", "task-enrich", "task-jira"]) {
  const txt = read(`.opencode/commands/${file}.md`);
  assert(/Branch guard/.test(txt), `UPDATED: ${file}.md has the branch guard`);
}

// D. AGENTS.md — managed block gets refreshed, user content preserved
const newAgents = read("AGENTS.md");
assert(newAgents.includes("Worktrees") || /worktree/i.test(newAgents), "UPDATED: AGENTS.md managed block refreshed (worktree content)");
assert(newAgents.includes("<!-- OPSX:START") || newAgents.includes("OPSX:START"), "AGENTS.md: managed block markers present");

// E. Skills updated
const newProposeSkill = read(".opencode/skills/openspec-propose/SKILL.md");
assert(/Branch guard/.test(newProposeSkill), "UPDATED: openspec-propose/SKILL.md has branch guard");

const newApplySkill = read(".opencode/skills/openspec-apply-change/SKILL.md");
assert(/Worktree context/.test(newApplySkill) || /worktree/i.test(newApplySkill), "UPDATED: openspec-apply-change/SKILL.md mentions worktree");

const newArchiveSkill = read(".opencode/skills/openspec-archive-change/SKILL.md");
assert(/Branch guard/.test(newArchiveSkill), "UPDATED: openspec-archive-change/SKILL.md has branch guard");

// F. workflow.yaml has the new worktree block
const wf = read("workflow.yaml");
assert(/git:\s*[\s\S]*work_mode:/.test(wf), "workflow.yaml: contains git.work_mode");
assert(/worktree:\s*\n\s*dir:/.test(wf) || /worktree:\s*$/.test(wf) || /\bworktree:/m.test(wf), "workflow.yaml: has worktree block");
// Project key templating survives update
assert(/project_key: DEMO/.test(wf), "workflow.yaml: user project_key retained across update");
// language templating survives update
assert(/default_language: en/.test(wf), "workflow.yaml: user language retained across update");

// G. User-modified file is KEPT (not clobbered)
const finalShip = read(".opencode/commands/ship.md");
assert(/DO NOT CLOBBER/.test(finalShip), "KEPT: user-modified ship.md preserved across update (no --force)");

// H. Update output reports what happened
assert(/Added:/.test(updateOut), "update output: shows Added section");
assert(/Updated:/.test(updateOut), "update output: shows Updated section");

// I. Tip is printed for projects not yet on worktree mode
assert(/Tip.*work_mode:\s*flexible/i.test(updateOut), "update output: suggests switching to worktree mode for legacy projects");
assert(/Tip.*worktree/i.test(updateOut), "update output: tip mentions worktree");

// I. --force should overwrite the user-modified file
console.log("\n— re-running opsx update --force —");
const updateForceOut = run(["update", "--force"]);
fs.writeFileSync(path.join(tmp, "update-force-output.txt"), updateForceOut);
const shipAfterForce = read(".opencode/commands/ship.md");
assert(!/DO NOT CLOBBER/.test(shipAfterForce), "FORCED: --force overwrites user-modified ship.md with new content");
assert(/verify gate/.test(shipAfterForce), "FORCED: ship.md now has the new verify-gate content");

console.log(`\n${failures ? `❌ ${failures} FAILURES` : "✅ ALL ASSERTIONS PASSED"}`);
process.exit(failures ? 1 : 0);
