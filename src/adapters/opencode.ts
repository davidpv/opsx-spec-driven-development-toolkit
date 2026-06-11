import type { Adapter, FileAction } from "./types.js";

/** opencode is the native format of the payload — straight copy. */
export const opencode: Adapter = (p) => {
  const actions: FileAction[] = [];
  for (const c of p.commands) {
    actions.push({ path: `.opencode/commands/${c.rel}`, content: c.content, strategy: "create" });
  }
  for (const s of p.skills) {
    actions.push({ path: `.opencode/skills/${s.rel}`, content: s.content, strategy: "create" });
  }
  for (const a of p.agents) {
    actions.push({ path: `.opencode/agents/${a.rel}`, content: a.content, strategy: "create" });
  }
  for (const t of p.targets.opencode ?? []) {
    actions.push({
      path: t.rel,
      content: t.content,
      strategy: t.rel.endsWith(".json") ? "merge-json" : "create",
    });
  }
  return actions;
};
