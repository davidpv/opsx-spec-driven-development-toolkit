import { claude } from "./claude.js";
import { codex } from "./codex.js";
import { opencode } from "./opencode.js";
import { sharedActions } from "./shared.js";
import type { Adapter, FileAction, InitConfig, Payload, TargetName } from "./types.js";

export const adapters: Record<TargetName, Adapter> = { opencode, claude, codex };

/** Render every file action for the chosen targets (shared layer included once). */
export function renderAll(payload: Payload, cfg: InitConfig): FileAction[] {
  const actions = sharedActions(payload, cfg);
  for (const t of cfg.targets) {
    actions.push(...adapters[t](payload, cfg));
  }
  // Last one wins on duplicated paths (shouldn't happen, but keeps it deterministic).
  const byPath = new Map<string, FileAction>();
  for (const a of actions) byPath.set(a.path, a);
  return [...byPath.values()];
}
