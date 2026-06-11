import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import type { TargetName } from "../adapters/types.js";
import { readManifest } from "../lib/manifest.js";

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

  checks.push({
    label: "Git repository",
    ok: fs.existsSync(path.join(cwd, ".git")),
    detail: fs.existsSync(path.join(cwd, ".git")) ? "found" : "not a git repo (the workflow assumes git)",
    required: true,
  });

  const openspec = bin("openspec");
  checks.push({ label: "openspec CLI (@fission-ai/openspec)", ok: openspec.ok, detail: openspec.detail, required: true });

  for (const t of targets) {
    const { cmd, label } = TARGET_BINS[t];
    const r = bin(cmd);
    checks.push({ label, ok: r.ok, detail: r.detail, required: false });
  }

  let failures = 0;
  for (const c of checks) {
    const mark = c.ok ? pc.green("✔") : c.required ? pc.red("✘") : pc.yellow("▲");
    if (!c.ok && c.required) failures++;
    p.log.message(`${mark} ${c.label} — ${c.detail}`);
  }

  if (failures) {
    p.outro(pc.red(`${failures} required check(s) failed.`));
    process.exitCode = 1;
  } else {
    p.outro(pc.green("All required checks passed."));
  }
}
