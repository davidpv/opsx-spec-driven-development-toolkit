import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { writeText } from "./fsutil.js";

/** User-facing provider. OpenCode ids are `xai/`, `anthropic/`, `openai/`. */
export type ModelProvider = "grok" | "claude" | "openai" | "none";

export const PHASES = [
  "discover",
  "tasks",
  "explore",
  "propose",
  "review",
  "apply",
  "verify",
  "archive",
  "ship",
  "routine",
] as const;

export type Phase = (typeof PHASES)[number];

/**
 * Prices checked 2026-09-28.
 * grok:   frontier grok-4.7 $2/$6 (500k), mid grok-4.3 $1.25/$2.50 (1M). ≥200k bills the whole request at 2×.
 * claude: frontier opus-5-5 $4/$20, mid sonnet-5-5 $2/$10, routine haiku-4-5 $1/$5 (200k).
 * openai: frontier gpt-6-astra $10/$50, mid gpt-6-sol $2/$10, routine gpt-6-luna $0.10/$0.50.
 * Frontier is only explore / propose / review. Apply stays on the mid model.
 */
const CATALOG: Record<Exclude<ModelProvider, "none">, Record<Phase, string>> = {
  grok: {
    discover: "xai/grok-4.3",
    tasks: "xai/grok-4.3",
    explore: "xai/grok-4.7",
    propose: "xai/grok-4.7",
    review: "xai/grok-4.7",
    apply: "xai/grok-4.3",
    verify: "xai/grok-4.3",
    archive: "xai/grok-4.3",
    ship: "xai/grok-4.3",
    routine: "xai/grok-4.3",
  },
  claude: {
    discover: "anthropic/claude-sonnet-5-5",
    tasks: "anthropic/claude-sonnet-5-5",
    explore: "anthropic/claude-opus-5-5",
    propose: "anthropic/claude-opus-5-5",
    review: "anthropic/claude-opus-5-5",
    apply: "anthropic/claude-sonnet-5-5",
    verify: "anthropic/claude-sonnet-5-5",
    archive: "anthropic/claude-sonnet-5-5",
    ship: "anthropic/claude-sonnet-5-5",
    routine: "anthropic/claude-haiku-4-5",
  },
  openai: {
    discover: "openai/gpt-6-sol",
    tasks: "openai/gpt-6-sol",
    explore: "openai/gpt-6-astra",
    propose: "openai/gpt-6-astra",
    review: "openai/gpt-6-astra",
    apply: "openai/gpt-6-sol",
    verify: "openai/gpt-6-sol",
    archive: "openai/gpt-6-sol",
    ship: "openai/gpt-6-sol",
    routine: "openai/gpt-6-luna",
  },
};

/** Models that accept reasoning effort `none`. Haiku, Opus, Astra, and grok-4.7 do not. */
const EFFORT_NONE = new Set(["xai/grok-4.3", "openai/gpt-6-luna", "openai/gpt-6-sol"]);

const CATALOG_IDS = new Set(Object.values(CATALOG).flatMap((phases) => Object.values(phases)));

export const COMMAND_PHASE: Record<string, Phase> = {
  "req-capture.md": "discover",
  "task-import.md": "tasks",
  "task-new.md": "tasks",
  "task-generate.md": "tasks",
  "task-enrich.md": "tasks",
  "review-task.md": "tasks",
  "opsx-explore.md": "explore",
  "start.md": "propose",
  "opsx-propose.md": "propose",
  "review-change.md": "review",
  "work.md": "apply",
  "opsx-apply.md": "apply",
  "opsx-verify.md": "verify",
  "opsx-archive.md": "archive",
  "opsx-sync.md": "archive",
  "ship.md": "ship",
  "pr-open.md": "ship",
  "git-commit.md": "routine",
  "next.md": "routine",
  "task-jira.md": "routine",
};

export const AGENT_PHASE: Record<string, Phase> = {
  "spec-reviewer.md": "review",
  "task-reviewer.md": "tasks",
};

export function parseProvider(raw: string | undefined | null): ModelProvider | null {
  if (raw == null || raw.trim() === "") return null;
  const v = raw.trim().toLowerCase();
  if (v === "none") return "none";
  if (v === "grok" || v === "xai") return "grok";
  if (v === "claude" || v === "anthropic") return "claude";
  if (v === "openai") return "openai";
  return null;
}

export function providerError(raw: string): string {
  return `Invalid model provider: '${raw}'. Allowed: grok, claude, openai, none.`;
}

/** Catalog for a provider. Empty phase overrides fall back to the catalog. `none` pins nothing. */
export function resolvePhaseModels(
  provider: ModelProvider,
  overrides?: Partial<Record<Phase, string>>,
): Record<Phase, string> | null {
  if (provider === "none") return null;
  const catalog = CATALOG[provider];
  const out = {} as Record<Phase, string>;
  for (const phase of PHASES) {
    const custom = overrides?.[phase]?.trim();
    out[phase] = custom || catalog[phase];
  }
  return out;
}

export function renderModelsSection(provider: ModelProvider, overrides?: Partial<Record<Phase, string>>): string {
  const phases = resolvePhaseModels(provider, overrides);
  const lines = [
    "# Model routing — source of truth. Edit a phase id, then run `opsx update`.",
    "# provider: none leaves the session model. Ids are OpenCode ids (provider/model).",
    "# Empty phase values fall back to the catalog for `provider`.",
    "# Prices checked 2026-09-28. Grok bills the whole request at 2× when the prompt is ≥200k.",
    "# Frontier: explore, propose, review. Mid: discover, tasks, apply, verify, archive, ship.",
    "# Routine: /git-commit, /next, /task-jira.",
    "models:",
    `  provider: ${provider}`,
    "  phases:",
  ];
  for (const phase of PHASES) {
    const value = phases?.[phase] ?? "";
    lines.push(`    ${phase}: ${value === "" ? '""' : value}`);
  }
  return lines.join("\n");
}

export interface WorkflowModels {
  provider: ModelProvider;
  phases: Partial<Record<Phase, string>>;
}

export function parseWorkflowModels(text: string): WorkflowModels | null {
  let doc: unknown;
  try {
    doc = YAML.parse(text);
  } catch {
    return null;
  }
  if (!doc || typeof doc !== "object" || !("models" in doc)) return null;
  const models = (doc as { models?: unknown }).models;
  if (!models || typeof models !== "object") return null;
  const rawProvider = (models as { provider?: unknown }).provider;
  const provider = parseProvider(typeof rawProvider === "string" ? rawProvider : "none") ?? "none";
  const rawPhases = (models as { phases?: unknown }).phases;
  const phases: Partial<Record<Phase, string>> = {};
  if (rawPhases && typeof rawPhases === "object") {
    for (const phase of PHASES) {
      const value = (rawPhases as Record<string, unknown>)[phase];
      if (typeof value === "string" && value.trim()) phases[phase] = value.trim();
    }
  }
  return { provider, phases };
}

export function ensureModelsBlock(workflowText: string, provider: ModelProvider): string {
  if (parseWorkflowModels(workflowText) || provider === "none") return workflowText;
  return workflowText.trimEnd() + "\n\n" + renderModelsSection(provider) + "\n";
}

export function setFrontmatterModel(content: string, model: string | null): string {
  const m = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/.exec(content);
  if (!m) return content;
  let fm = m[2] ?? "";
  const line = model ? `model: ${yamlScalar(model)}` : null;
  if (/^model:.*$/m.test(fm)) {
    fm = line ? fm.replace(/^model:.*$/m, line) : fm.replace(/^model:.*(?:\r?\n)?/m, "");
  } else if (line) {
    fm = fm.replace(/\s*$/, "") + "\n" + line;
  }
  return (m[1] ?? "") + fm + (m[3] ?? "") + content.slice(m[0].length);
}

export function withoutModelLine(content: string): string {
  return content.replace(/^(---\r?\n[\s\S]*?)^model:.*(?:\r?\n)/m, "$1");
}

function yamlScalar(value: string): string {
  if (value === "" || /[:#{}[\],&*!|>'"%@`]/.test(value) || /\s/.test(value)) return JSON.stringify(value);
  return value;
}

function bareClaude(id: string): string {
  return id.replace(/^anthropic\//, "");
}

function patchDir(
  dir: string,
  phaseOf: Record<string, Phase>,
  modelFor: (phase: Phase) => string | null,
  changed: string[],
  cwd: string,
): void {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".md")) continue;
    const phase = phaseOf[name];
    if (!phase) continue;
    const abs = path.join(dir, name);
    const current = fs.readFileSync(abs, "utf8");
    const next = setFrontmatterModel(current, modelFor(phase));
    if (next === current) continue;
    writeText(abs, next);
    changed.push(path.relative(cwd, abs));
  }
}

function isCatalogModel(id: string): boolean {
  return CATALOG_IDS.has(id);
}

function patchOpencodeJson(cwd: string, phases: Record<Phase, string> | null): boolean {
  const abs = path.join(cwd, "opencode.json");
  if (!fs.existsSync(abs)) return false;
  const json = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
  const agent = (isObj(json.agent) ? json.agent : {}) as Record<string, unknown>;
  let changed = false;

  const setAgent = (name: string, model: string | null, effort?: string) => {
    const current = isObj(agent[name]) ? { ...agent[name] } : {};
    if (model) {
      if (current.model !== model) {
        current.model = model;
        changed = true;
      }
      if (effort) {
        if (current.reasoningEffort !== effort) {
          current.reasoningEffort = effort;
          changed = true;
        }
      } else if ("reasoningEffort" in current) {
        delete current.reasoningEffort;
        changed = true;
      }
      agent[name] = current;
      return;
    }
    if (typeof current.model === "string" && isCatalogModel(current.model)) {
      delete current.model;
      delete current.reasoningEffort;
      changed = true;
      if (Object.keys(current).length === 0) delete agent[name];
      else agent[name] = current;
    }
  };

  if (phases) {
    const routineEffort = EFFORT_NONE.has(phases.routine) ? "none" : undefined;
    if (json.small_model !== phases.routine) {
      json.small_model = phases.routine;
      changed = true;
    }
    setAgent("explore", phases.apply);
    setAgent("compaction", phases.apply);
    setAgent("title", phases.routine, routineEffort);
    setAgent("summary", phases.routine, routineEffort);
  } else {
    if (typeof json.small_model === "string" && isCatalogModel(json.small_model)) {
      delete json.small_model;
      changed = true;
    }
    setAgent("explore", null);
    setAgent("compaction", null);
    setAgent("title", null);
    setAgent("summary", null);
  }

  if (!changed) return false;
  if (Object.keys(agent).length) json.agent = agent;
  else delete json.agent;
  writeText(abs, JSON.stringify(json, null, 2) + "\n");
  return true;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Re-pin installed commands from the on-disk workflow.yaml.
 * OpenCode is pinned for every provider. Claude Code is pinned only for `claude`
 * (bare model ids). Codex has no per-skill model field.
 * Returns project-relative paths whose content changed.
 */
export function applyInstalledPins(cwd: string): string[] {
  const wf = path.join(cwd, "workflow.yaml");
  if (!fs.existsSync(wf)) return [];
  const parsed = parseWorkflowModels(fs.readFileSync(wf, "utf8"));
  const provider = parsed?.provider ?? "none";
  const phases = resolvePhaseModels(provider, parsed?.phases);
  const changed: string[] = [];

  const opencodeModel = (phase: Phase) => phases?.[phase] ?? null;
  const claudeModel = (phase: Phase) => (provider === "claude" && phases ? bareClaude(phases[phase]) : null);

  patchDir(path.join(cwd, ".opencode", "commands"), COMMAND_PHASE, opencodeModel, changed, cwd);
  patchDir(path.join(cwd, ".opencode", "agents"), AGENT_PHASE, opencodeModel, changed, cwd);
  patchDir(path.join(cwd, ".claude", "commands"), COMMAND_PHASE, claudeModel, changed, cwd);
  patchDir(path.join(cwd, ".claude", "agents"), AGENT_PHASE, claudeModel, changed, cwd);
  if (patchOpencodeJson(cwd, phases)) changed.push("opencode.json");
  return changed;
}
