import pc from "picocolors";

const START = "<!-- OPSX:START — managed by opsx, do not edit inside this block -->";
const END = "<!-- OPSX:END -->";

/** Inject/replace the opsx-managed block in a file, preserving user content around it. */
export function applyManagedBlock(existing: string | null, content: string): string {
  const block = `${START}\n${content.trim()}\n${END}\n`;
  if (existing === null || existing.trim() === "") return block;
  const start = existing.indexOf(START);
  const end = existing.indexOf(END);
  if (start !== -1 && end !== -1) {
    return existing.slice(0, start) + block + existing.slice(end + END.length).replace(/^\n/, "");
  }
  return existing.trimEnd() + "\n\n" + block;
}

export function extractManagedBlock(content: string): string | null {
  const start = content.indexOf(START);
  const end = content.indexOf(END);
  if (start === -1 || end === -1) return null;
  return content.slice(start + START.length, end).trim();
}

/**
 * Compact line-level diff for managed-block changes.
 * Returns a list of `+` / `-` prefixed lines plus a summary `{added, removed}`.
 * No external deps; intended for clack output, not strict unified-diff format.
 */
export function summariseBlockDiff(oldBlock: string, newBlock: string): { added: number; removed: number; preview: string } {
  const oldLines = oldBlock.split("\n");
  const newLines = newBlock.split("\n");
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  const removed = oldLines.filter((l) => !newSet.has(l));
  const added = newLines.filter((l) => !oldSet.has(l));
  const preview: string[] = [];
  for (const l of removed.slice(0, 6)) preview.push(pc.red(`- ${l}`));
  for (const l of added.slice(0, 6)) preview.push(pc.green(`+ ${l}`));
  if (removed.length > 6 || added.length > 6) preview.push(pc.dim(`  ... (${Math.max(0, removed.length - 6) + Math.max(0, added.length - 6)} more lines)`));
  return { added: added.length, removed: removed.length, preview: preview.join("\n") };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Deep-merge `existing` (user's file) over `incoming` (our payload).
 * On scalar conflict the user's value wins; arrays are unioned.
 */
export function mergeJson(existing: unknown, incoming: unknown): unknown {
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return [...new Set([...incoming, ...existing])];
  }
  if (isObj(existing) && isObj(incoming)) {
    const out: Record<string, unknown> = { ...incoming };
    for (const k of Object.keys(existing)) {
      out[k] = k in incoming ? mergeJson(existing[k], incoming[k]) : existing[k];
    }
    return out;
  }
  return existing;
}
