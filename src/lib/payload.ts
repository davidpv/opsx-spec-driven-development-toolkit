import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Payload, PayloadFile, TargetName } from "../adapters/types.js";
import { readText, walk } from "./fsutil.js";

export function payloadRoot(): string {
  // dist/cli.js → <package root>/payload
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "payload");
}

function loadDir(dir: string): PayloadFile[] {
  return walk(dir).map((rel) => ({ rel, content: readText(path.join(dir, rel)) }));
}

export function loadPayload(root = payloadRoot()): Payload {
  const core = path.join(root, "core");
  const shared: PayloadFile[] = [];
  for (const sub of ["backlog", "templates", "openspec"]) {
    for (const f of loadDir(path.join(core, sub))) {
      shared.push({ rel: path.posix.join(sub, f.rel.split(path.sep).join("/")), content: f.content });
    }
  }
  const targets: Partial<Record<TargetName, PayloadFile[]>> = {};
  for (const t of ["opencode", "claude", "codex"] as TargetName[]) {
    const files = loadDir(path.join(root, "targets", t));
    if (files.length) targets[t] = files;
  }
  return {
    commands: loadDir(path.join(core, "commands")),
    skills: loadDir(path.join(core, "skills")),
    agents: loadDir(path.join(core, "agents")),
    shared,
    workflow: readText(path.join(core, "workflow.yaml")),
    agentsMd: readText(path.join(core, "AGENTS.md")),
    targets,
  };
}
