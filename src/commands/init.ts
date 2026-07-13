import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { renderAll } from "../adapters/index.js";
import type { FileAction, InitConfig, TargetName } from "../adapters/types.js";
import { readTextIfExists, sha256, writeText } from "../lib/fsutil.js";
import { readManifest, writeManifest, type Manifest } from "../lib/manifest.js";
import { applyManagedBlock, mergeJson } from "../lib/merge.js";
import { loadPayload } from "../lib/payload.js";

export interface InitOptions {
  targets?: string;
  projectKey?: string;
  language?: string;
  mainBranch?: string;
  integrationBranch?: string;
  workMode?: string;
  yes?: boolean;
  force?: boolean;
}

const ALL_TARGETS: TargetName[] = ["opencode", "claude", "codex"];

export async function initCommand(opts: InitOptions, packageVersion: string): Promise<void> {
  const cwd = process.cwd();
  p.intro(pc.bgCyan(pc.black(" opsx init ")));

  const existing = readManifest(cwd);
  if (existing && !opts.force) {
    p.log.warn("This project is already initialized (.opsx/manifest.json exists). Use `opsx update`, or `opsx init --force` to re-init.");
    p.outro("Nothing done.");
    return;
  }

  const cfg = await resolveConfig(opts);
  if (!cfg) return; // cancelled

  const payload = loadPayload();
  const actions = renderAll(payload, cfg);

  const written: string[] = [];
  const merged: string[] = [];
  const skipped: string[] = [];
  const notes = new Set<string>();
  const manifestFiles: Manifest["files"] = {};

  for (const a of actions) {
    if (a.note) notes.add(a.note);
    const abs = path.join(cwd, a.path);
    const current = readTextIfExists(abs);

    if (a.strategy === "managed-block") {
      writeText(abs, applyManagedBlock(current, a.content));
      manifestFiles[a.path] = { hash: sha256(a.content.trim()), strategy: a.strategy };
      written.push(a.path);
      continue;
    }

    if (a.strategy === "merge-json" && current !== null) {
      const result = JSON.stringify(mergeJson(JSON.parse(current), JSON.parse(a.content)), null, 2) + "\n";
      writeText(abs, result);
      manifestFiles[a.path] = { hash: sha256(result), strategy: a.strategy };
      merged.push(a.path);
      continue;
    }

    // create (or merge-json over a non-existing file)
    if (current !== null && current !== a.content && !opts.force) {
      skipped.push(a.path);
      continue;
    }
    writeText(abs, a.content);
    manifestFiles[a.path] = { hash: sha256(a.content), strategy: a.strategy };
    written.push(a.path);
  }

  writeManifest(cwd, { manifestVersion: 1, packageVersion, config: cfg, files: manifestFiles });

  p.log.success(`${written.length} files written for targets: ${cfg.targets.join(", ")}`);
  if (merged.length) p.log.info(`Merged with existing files (yours won on conflicts):\n  ${merged.join("\n  ")}`);
  if (skipped.length) p.log.warn(`Skipped (already exist and differ — re-run with --force to overwrite):\n  ${skipped.join("\n  ")}`);
  if (notes.size) p.log.info(`Adaptations:\n  ${[...notes].join("\n  ")}`);

  const next = [
    "npm install -g @fission-ai/openspec   # required CLI",
    cfg.targets.includes("opencode") ? "npm install -g opencode-ai && opencode" : null,
    cfg.targets.includes("claude") ? "claude   # commands under /opsx-*, /task-*, ..." : null,
    cfg.targets.includes("codex") ? "codex    # commands available as skills" : null,
    "Run `opsx doctor` to verify your setup.",
  ].filter(Boolean);
  p.note(next.join("\n"), "Next steps");
  p.outro("Done.");
}

async function resolveConfig(opts: InitOptions): Promise<InitConfig | null> {
  const flagTargets = opts.targets
    ?.split(",")
    .map((t) => t.trim())
    .filter((t): t is TargetName => (ALL_TARGETS as string[]).includes(t));

  if (opts.yes) {
    return {
      targets: flagTargets?.length ? flagTargets : ALL_TARGETS,
      projectKey: opts.projectKey ?? "PROJ",
      language: opts.language === "en" ? "en" : "es",
      mainBranch: opts.mainBranch ?? "main",
      integrationBranch: opts.integrationBranch ?? "develop",
      workMode:
        opts.workMode === "feature" || opts.workMode === "worktree" ? opts.workMode : "worktree",
    };
  }

  const targets =
    flagTargets?.length
      ? flagTargets
      : ((await p.multiselect({
          message: "Which agents should be configured?",
          options: [
            { value: "opencode", label: "opencode", hint: ".opencode/ + opencode.json" },
            { value: "claude", label: "Claude Code", hint: ".claude/ + CLAUDE.md" },
            { value: "codex", label: "Codex", hint: ".codex/skills/ + AGENTS.md" },
          ],
          initialValues: ["opencode"],
          required: true,
        })) as TargetName[]);
  if (p.isCancel(targets)) return cancel();

  const projectKey = opts.projectKey ?? (await p.text({ message: "Jira project key", initialValue: "PROJ" }));
  if (p.isCancel(projectKey)) return cancel();

  const language =
    opts.language ??
    (await p.select({
      message: "Default language for client-facing artifacts",
      options: [
        { value: "es", label: "Español" },
        { value: "en", label: "English" },
      ],
    }));
  if (p.isCancel(language)) return cancel();

  const mainBranch = opts.mainBranch ?? (await p.text({ message: "Release branch", initialValue: "main" }));
  if (p.isCancel(mainBranch)) return cancel();

  const integrationBranch =
    opts.integrationBranch ?? (await p.text({ message: "Integration branch (PR target)", initialValue: "develop" }));
  if (p.isCancel(integrationBranch)) return cancel();

  const workMode =
    opts.workMode ??
    (await p.select({
      message: "Working mode",
      options: [
        { value: "worktree", label: "worktree (default)", hint: "one git worktree per change; /opsx:apply creates it" },
        { value: "feature", label: "feature", hint: "always require feature branch + PR (no worktree)" },
        { value: "flexible", label: "flexible", hint: "feature branches recommended, direct commits allowed" },
      ],
      initialValue: "worktree",
    }));
  if (p.isCancel(workMode)) return cancel();

  return {
    targets,
    projectKey: String(projectKey),
    language: language === "en" ? "en" : "es",
    mainBranch: String(mainBranch),
    integrationBranch: String(integrationBranch),
    workMode:
      workMode === "feature" || workMode === "worktree" ? workMode : "worktree",
  };
}

function cancel(): null {
  p.cancel("Cancelled.");
  return null;
}
