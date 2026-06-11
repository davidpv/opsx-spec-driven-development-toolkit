import type { FileAction, InitConfig, Payload } from "./types.js";

/** Stack-agnostic files every target shares: workflow.yaml, AGENTS.md, backlog/, templates/, openspec/. */
export function sharedActions(p: Payload, cfg: InitConfig): FileAction[] {
  const actions: FileAction[] = [
    { path: "workflow.yaml", content: templateWorkflow(p.workflow, cfg), strategy: "create" },
    { path: "AGENTS.md", content: p.agentsMd, strategy: "managed-block" },
  ];
  for (const f of p.shared) {
    actions.push({ path: f.rel, content: f.content, strategy: "create" });
  }
  return actions;
}

/** Substitute the configured values in workflow.yaml, preserving comments. */
export function templateWorkflow(src: string, cfg: InitConfig): string {
  return src
    .replace(/^(\s*main_branch:)\s*\S+/m, `$1 ${cfg.mainBranch}`)
    .replace(/^(\s*integration_branch:)\s*\S+/m, `$1 ${cfg.integrationBranch}`)
    .replace(/^(\s*work_mode:)\s*\S+/m, `$1 ${cfg.workMode}`)
    .replace(/^(\s*project_key:)\s*\S+/m, `$1 ${cfg.projectKey}`)
    .replace(/^(\s*default_language:)\s*\S+/m, `$1 ${cfg.language}`);
}
