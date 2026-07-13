import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { renderAll } from "../adapters/index.js";
import { readTextIfExists, sha256, writeText } from "../lib/fsutil.js";
import { readManifest, writeManifest } from "../lib/manifest.js";
import { applyManagedBlock, extractManagedBlock, summariseBlockDiff } from "../lib/merge.js";
import { loadPayload } from "../lib/payload.js";

export interface UpdateOptions {
  force?: boolean;
  nonInteractive?: boolean;
}

/** A change to a managed block (AGENTS.md / CLAUDE.md) the user can decide on. */
type ManagedBlockDecision = "apply" | "keep" | "cancel";

async function promptManagedBlock(file: string, current: string, incoming: string, oldBlock: string, newBlock: string): Promise<ManagedBlockDecision> {
  const diff = summariseBlockDiff(oldBlock, newBlock);
  p.log.warn(`${file}: managed block has changed (+${diff.added} / -${diff.removed} lines). Review before applying.`);
  if (diff.preview) p.log.message(diff.preview);
  const choice = await p.select<ManagedBlockDecision>({
    message: `What should we do with the opsx-managed block in ${file}?`,
    options: [
      { value: "apply", label: "apply new content (replace the block)", hint: "your edits inside the block, if any, will be overwritten" },
      { value: "keep", label: "keep existing content", hint: "you'll see the diff again on the next opsx update" },
      { value: "cancel", label: "cancel", hint: "stop the whole update; nothing was written yet" },
    ],
    initialValue: "apply",
  });
  if (p.isCancel(choice)) return "cancel";
  return choice as ManagedBlockDecision;
}

export async function updateCommand(opts: UpdateOptions, packageVersion: string): Promise<void> {
  const cwd = process.cwd();
  p.intro(pc.bgCyan(pc.black(" opsx update ")));

  const manifest = readManifest(cwd);
  if (!manifest) {
    p.log.error("No .opsx/manifest.json found. Run `opsx init` first.");
    p.outro("Nothing done.");
    process.exitCode = 1;
    return;
  }

  const payload = loadPayload();
  const actions = renderAll(payload, manifest.config);

  const updated: string[] = [];
  const added: string[] = [];
  const kept: string[] = [];
  const unchanged: string[] = [];
  /** Files where the user opted to keep their existing managed block content. */
  const managedKept: string[] = [];
  /** Files where a managed block conflict was deferred to a follow-up prompt. */
  const managedPending: string[] = [];

  // A change to a managed block is "staged" so we can write it back-to-back
  // and then run the unified prompt only once at the end. If the user cancels,
  // we throw away the staged actions and leave the project untouched.
  const staged: { file: string; current: string | null; newContent: string; diff: ReturnType<typeof summariseBlockDiff> }[] = [];

  const isInteractive = !opts.nonInteractive && !opts.force && !process.env.CI;

  for (const a of actions) {
    const abs = path.join(cwd, a.path);
    const current = readTextIfExists(abs);
    const entry = manifest.files[a.path];

    if (a.strategy === "managed-block") {
      const currentBlock = current !== null ? extractManagedBlock(current) : null;
      const newBlock = a.content.trim();
      if (currentBlock !== null && sha256(currentBlock) === sha256(newBlock)) {
        unchanged.push(a.path);
        manifest.files[a.path] = { hash: sha256(newBlock), strategy: a.strategy };
        continue;
      }
      if (current === null) {
        // First-time install of AGENTS.md / CLAUDE.md — write unconditionally,
        // there is nothing to lose.
        writeText(abs, applyManagedBlock(null, a.content));
        added.push(a.path);
        manifest.files[a.path] = { hash: sha256(newBlock), strategy: a.strategy };
        continue;
      }
      if (!isInteractive) {
        // --force or --non-interactive or CI: apply silently.
        const diff = currentBlock !== null ? summariseBlockDiff(currentBlock, newBlock) : { added: 0, removed: 0, preview: "" };
        writeText(abs, applyManagedBlock(current, a.content));
        updated.push(a.path);
        p.log.info(`${a.path}: managed block auto-applied (${opts.force ? "--force" : opts.nonInteractive ? "--non-interactive" : "CI env"}): +${diff.added} / -${diff.removed} lines.`);
        manifest.files[a.path] = { hash: sha256(newBlock), strategy: a.strategy };
        continue;
      }
      // Interactive: stage for a unified prompt at the end.
      const diff = currentBlock !== null ? summariseBlockDiff(currentBlock, newBlock) : { added: newBlock.split("\n").length, removed: 0, preview: "" };
      staged.push({ file: a.path, current, newContent: a.content, diff });
      managedPending.push(a.path);
      continue;
    }

    if (a.strategy === "merge-json") {
      if (current === null) {
        writeText(abs, a.content);
        added.push(a.path);
        manifest.files[a.path] = { hash: sha256(a.content), strategy: a.strategy };
      } else {
        kept.push(`${a.path} (merged file — never auto-updated)`);
      }
      continue;
    }

    // create
    if (current === null) {
      writeText(abs, a.content);
      added.push(a.path);
      manifest.files[a.path] = { hash: sha256(a.content), strategy: a.strategy };
      continue;
    }
    if (current === a.content) {
      unchanged.push(a.path);
      manifest.files[a.path] = { hash: sha256(a.content), strategy: a.strategy };
      continue;
    }
    const userModified = entry ? sha256(current) !== entry.hash : true;
    if (userModified && !opts.force) {
      kept.push(`${a.path} (locally modified — \`opsx update --force\` overwrites)`);
      continue;
    }
    writeText(abs, a.content);
    updated.push(a.path);
    manifest.files[a.path] = { hash: sha256(a.content), strategy: a.strategy };
  }

  // Resolve staged managed-block decisions before writing anything.
  if (staged.length) {
    let global: ManagedBlockDecision | undefined;
    if (staged.length > 1) {
      const aggregate = staged.map((s) => `${s.file} (+${s.diff.added}/-${s.diff.removed})`).join(", ");
      const choice = await p.select<ManagedBlockDecision>({
        message: `opsx-managed blocks changed in ${staged.length} files (${aggregate}). Apply them all or keep them all?`,
        options: [
          { value: "apply", label: "apply all", hint: "replace every managed block with the new content" },
          { value: "keep", label: "keep all", hint: "leave every managed block untouched; you'll be re-prompted next time" },
          { value: "cancel", label: "cancel", hint: "stop the whole update" },
        ],
        initialValue: "apply",
      });
      if (p.isCancel(choice)) global = "cancel";
      else global = choice as ManagedBlockDecision;
    }
    for (const s of staged) {
      const decision = global
        ? global
        : await promptManagedBlock(s.file, s.current as string, s.newContent, extractManagedBlock(s.current as string) ?? "", s.newContent.trim());
      if (decision === "cancel") {
        p.log.warn(`Update cancelled by user. ${staged.length - managedKept.length - updated.length - (global ? 0 : 0)} managed block(s) left unchanged.`);
        // Strip from staging — don't touch them. Print final summary with what was done so far.
        manifest.packageVersion = packageVersion;
        writeManifest(cwd, manifest);
        if (added.length) p.log.success(`Added:\n  ${added.join("\n  ")}`);
        if (updated.length) p.log.success(`Updated:\n  ${updated.join("\n  ")}`);
        if (kept.length) p.log.warn(`Kept (not touched):\n  ${kept.join("\n  ")}`);
        p.log.info(`${unchanged.length} files already up to date.`);
        p.outro("Cancelled.");
        return;
      }
      if (decision === "apply") {
        writeText(path.join(cwd, s.file), applyManagedBlock(s.current, s.newContent));
        updated.push(s.file);
        manifest.files[s.file] = { hash: sha256(s.newContent.trim()), strategy: "managed-block" };
      } else {
        managedKept.push(s.file);
      }
    }
  }

  manifest.packageVersion = packageVersion;
  writeManifest(cwd, manifest);

  if (added.length) p.log.success(`Added:\n  ${added.join("\n  ")}`);
  if (updated.length) p.log.success(`Updated:\n  ${updated.join("\n  ")}`);
  if (managedKept.length) p.log.warn(`Kept (managed block):\n  ${managedKept.join("\n  ")}`);
  if (kept.length) p.log.warn(`Kept (not touched):\n  ${kept.join("\n  ")}`);
  p.log.info(`${unchanged.length} files already up to date.`);

  if (managedKept.length) {
    p.log.info("Re-run `opsx update` and choose 'apply' to pick up the new managed-block content.");
  }

  if (manifest.config.workMode !== "worktree") {
    const current = manifest.config.workMode;
    p.log.info(
      `Tip: workflow.yaml is on git.work_mode: ${current}. The new default is worktree (one git worktree per change, /opsx:apply creates it). Switch by editing workflow.yaml and setting git.work_mode: worktree.`,
    );
  }

  p.outro("Done.");
}
