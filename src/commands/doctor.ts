import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { parse as parseYaml } from "yaml";
import type { TargetName } from "../adapters/types.js";
import { readManifest } from "../lib/manifest.js";
import { resolveWorkMode } from "../lib/work-mode.js";

interface Check {
  label: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

function bin(cmd: string): { ok: boolean; detail: string } {
  const r = spawnSync(cmd, ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
  if (r.error || r.status !== 0) return { ok: false, detail: "not found in PATH" };
  return { ok: true, detail: (r.stdout || r.stderr).trim().split("\n")[0] ?? "found" };
}

function git(cwd: string, args: string[]): string | null {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.error || r.status !== 0) return null;
  return r.stdout.trim();
}

function isLinkedWorktree(cwd: string): boolean {
  const gitDir = git(cwd, ["rev-parse", "--git-dir"]);
  const common = git(cwd, ["rev-parse", "--git-common-dir"]);
  if (!gitDir || !common) return false;
  return path.resolve(cwd, gitDir) !== path.resolve(cwd, common);
}

function underOpsxWorktrees(cwd: string, dir: string): boolean {
  const abs = path.resolve(cwd);
  const marker = `${path.sep}${dir.replace(/[/\\]+$/, "")}${path.sep}`;
  return abs.includes(marker) || abs.endsWith(`${path.sep}${dir.replace(/[/\\]+$/, "")}`);
}

const TARGET_BINS: Record<TargetName, { cmd: string; label: string }> = {
  opencode: { cmd: "opencode", label: "opencode CLI" },
  claude: { cmd: "claude", label: "Claude Code CLI" },
  codex: { cmd: "codex", label: "Codex CLI" },
};

export async function doctorCommand(): Promise<void> {
  const cwd = process.cwd();
  p.intro(pc.bgCyan(pc.black(" opsx doctor ")));

  const manifest = readManifest(cwd);
  const targets: TargetName[] = manifest?.config.targets ?? ["opencode", "claude", "codex"];
  const checks: Check[] = [];

  const major = Number(process.versions.node.split(".")[0]);
  checks.push({ label: "Node.js >= 18", ok: major >= 18, detail: `v${process.versions.node}`, required: true });

  checks.push({
    label: "Initialized (.opsx/manifest.json)",
    ok: manifest !== null,
    detail: manifest ? `v${manifest.packageVersion}, targets: ${manifest.config.targets.join(", ")}` : "run `opsx init`",
    required: true,
  });

  const gitOk = git(cwd, ["rev-parse", "--is-inside-work-tree"]) === "true" || fs.existsSync(path.join(cwd, ".git"));
  checks.push({
    label: "Git repository",
    ok: gitOk,
    detail: gitOk ? "found" : "not a git repo (the workflow assumes git)",
    required: true,
  });

  const openspec = bin("openspec");
  checks.push({ label: "openspec CLI (@fission-ai/openspec)", ok: openspec.ok, detail: openspec.detail, required: true });

  for (const t of targets) {
    const { cmd, label } = TARGET_BINS[t];
    const r = bin(cmd);
    checks.push({ label, ok: r.ok, detail: r.detail, required: false });
  }

  const wfPath = path.join(cwd, "workflow.yaml");
  let yamlMode: string | undefined;
  let worktreeDir = ".worktrees";
  if (fs.existsSync(wfPath)) {
    try {
      const wf = parseYaml(fs.readFileSync(wfPath, "utf8")) as {
        git?: { work_mode?: string; worktree?: { dir?: string }; integration_branch?: string };
      };
      yamlMode = wf.git?.work_mode;
      if (wf.git?.worktree?.dir) worktreeDir = String(wf.git.worktree.dir);
    } catch {
      yamlMode = undefined;
    }
  }
  const rawMode = yamlMode ?? manifest?.config.workMode;
  const resolved = resolveWorkMode(rawMode);
  if (!resolved.ok) {
    checks.push({ label: "git.work_mode", ok: false, detail: resolved.message, required: false });
  } else {
    const alias = resolved.alias ? ` (yaml still says ${resolved.alias}; rename to ${resolved.mode} when convenient)` : "";
    checks.push({
      label: "git.work_mode",
      ok: true,
      detail: `${resolved.mode}${alias}`,
      required: false,
    });
  }

  let failures = 0;
  for (const c of checks) {
    const mark = c.ok ? pc.green("✔") : c.required ? pc.red("✘") : pc.yellow("▲");
    if (!c.ok && c.required) failures++;
    p.log.message(`${mark} ${c.label} — ${c.detail}`);
  }

  if (resolved.ok && gitOk) {
    const linked = isLinkedWorktree(cwd);
    const hostEnv = Boolean(process.env.SUPERSET_WORKSPACE_NAME || process.env.SUPERSET_ROOT_PATH);
    const opsxTree = underOpsxWorktrees(cwd, worktreeDir);
    if (resolved.mode === "automated" && (hostEnv || (linked && !opsxTree))) {
      p.log.warn(
        "This checkout looks like a GUI-managed worktree (Superset / VS Code Agents / linked worktree outside .worktrees/). Set git.work_mode: supervised so opsx does not create or delete another worktree.",
      );
    }
    if (resolved.mode === "supervised") {
      const branch = git(cwd, ["branch", "--show-current"]);
      if (!linked && !hostEnv) {
        p.log.info(
          `supervised mode, planning session${branch ? ` on ${branch}` : ""}. Create a GUI workspace from the integration branch to run /work.`,
        );
      }
    }
    if (resolved.alias) {
      p.log.info("git.work_mode: worktree is a deprecated alias of automated.");
    }
  }

  if (failures) {
    p.outro(pc.red(`${failures} required check(s) failed.`));
    process.exitCode = 1;
  } else {
    p.outro(pc.green("All required checks passed."));
  }
}
