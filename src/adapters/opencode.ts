import { AGENT_PHASE, COMMAND_PHASE, resolvePhaseModels, setFrontmatterModel, type Phase } from "../lib/models.js";
import type { Adapter, FileAction } from "./types.js";

/** opencode is the native format of the payload — straight copy, plus model pins. */
export const opencode: Adapter = (p, cfg) => {
  const phases = resolvePhaseModels(cfg.provider ?? "none");
  const pin = (rel: string, content: string, map: Record<string, Phase>) => {
    const phase = map[rel];
    return phase && phases ? setFrontmatterModel(content, phases[phase]) : content;
  };
  const actions: FileAction[] = [];
  for (const c of p.commands) {
    actions.push({ path: `.opencode/commands/${c.rel}`, content: pin(c.rel, c.content, COMMAND_PHASE), strategy: "create" });
  }
  for (const s of p.skills) {
    actions.push({ path: `.opencode/skills/${s.rel}`, content: s.content, strategy: "create" });
  }
  for (const a of p.agents) {
    actions.push({ path: `.opencode/agents/${a.rel}`, content: pin(a.rel, a.content, AGENT_PHASE), strategy: "create" });
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
