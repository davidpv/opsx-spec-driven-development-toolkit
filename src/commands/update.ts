import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { renderAll } from "../adapters/index.js";
import { readTextIfExists, sha256, writeText } from "../lib/fsutil.js";
import { readManifest, writeManifest } from "../lib/manifest.js";
import { applyManagedBlock, extractManagedBlock } from "../lib/merge.js";
import { loadPayload } from "../lib/payload.js";

export interface UpdateOptions {
  force?: boolean;
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

  for (const a of actions) {
    const abs = path.join(cwd, a.path);
    const current = readTextIfExists(abs);
    const entry = manifest.files[a.path];

    if (a.strategy === "managed-block") {
      const currentBlock = current !== null ? extractManagedBlock(current) : null;
      if (currentBlock !== null && sha256(currentBlock) === sha256(a.content.trim())) {
        unchanged.push(a.path);
      } else {
        writeText(abs, applyManagedBlock(current, a.content));
        updated.push(a.path);
      }
      manifest.files[a.path] = { hash: sha256(a.content.trim()), strategy: a.strategy };
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

  manifest.packageVersion = packageVersion;
  writeManifest(cwd, manifest);

  if (added.length) p.log.success(`Added:\n  ${added.join("\n  ")}`);
  if (updated.length) p.log.success(`Updated:\n  ${updated.join("\n  ")}`);
  if (kept.length) p.log.warn(`Kept (not touched):\n  ${kept.join("\n  ")}`);
  p.log.info(`${unchanged.length} files already up to date.`);
  p.outro("Done.");
}
