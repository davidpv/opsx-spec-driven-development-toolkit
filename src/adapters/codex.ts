import { parseDoc, stringifyDoc } from "../lib/frontmatter.js";
import type { Adapter, FileAction } from "./types.js";

/**
 * Codex target. Codex has no project-level slash commands (custom prompts are
 * deprecated and global-only) and no subagents, but it shares the SKILL.md
 * standard at .codex/skills/. Strategy:
 * - skills   → .codex/skills/ (straight copy)
 * - commands → compiled into invocable skills (one dir per command)
 * - agents   → compiled into "rubric" skills that run inline
 * - AGENTS.md is read natively (written by the shared layer)
 */
export const codex: Adapter = (p) => {
  const actions: FileAction[] = [];

  for (const s of p.skills) {
    actions.push({ path: `.codex/skills/${s.rel}`, content: s.content, strategy: "create" });
  }

  for (const c of p.commands) {
    const { data, body } = parseDoc(c.content);
    const name = c.rel.replace(/\.md$/, "");
    const newBody = body.replaceAll("$ARGUMENTS", "the target the user named in their message");
    actions.push({
      path: `.codex/skills/${name}/SKILL.md`,
      content: stringifyDoc({ name, description: data.description }, newBody),
      strategy: "create",
      note: `command /${name} compiled as a Codex skill (Codex has no project-level slash commands)`,
    });
  }

  for (const a of p.agents) {
    const { data, body } = parseDoc(a.content);
    const name = a.rel.replace(/\.md$/, "");
    actions.push({
      path: `.codex/skills/${name}/SKILL.md`,
      content: stringifyDoc({ name, description: data.description }, body),
      strategy: "create",
      note: `subagent ${name} compiled as an inline skill (Codex has no subagents)`,
    });
  }

  for (const t of p.targets.codex ?? []) {
    actions.push({ path: `.codex/${t.rel}`, content: t.content, strategy: "create" });
  }

  return actions;
};
