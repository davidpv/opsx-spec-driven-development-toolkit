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
