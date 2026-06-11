import { parseDoc, stringifyDoc } from "../lib/frontmatter.js";
import type { Adapter, FileAction } from "./types.js";

/**
 * Claude Code target.
 * - commands → .claude/commands/ (frontmatter mapped; `agent:` becomes an explicit delegation line)
 * - skills   → .claude/skills/ (same SKILL.md format, straight copy)
 * - agents   → .claude/agents/ (subagent frontmatter; read-only tool set)
 * - CLAUDE.md imports the shared AGENTS.md
 */
export const claude: Adapter = (p) => {
  const actions: FileAction[] = [];

  for (const c of p.commands) {
    const { data, body } = parseDoc(c.content);
    let newBody = body;
    let note: string | undefined;
    if (typeof data.agent === "string") {
      newBody =
        `> Delegate this work to the \`${data.agent}\` subagent (read-only reviewer) and relay its full report to the user.\n\n` +
        body;
      note = `command ${c.rel}: 'agent: ${data.agent}' mapped to an explicit subagent delegation line`;
    }
    const fm: Record<string, unknown> = { description: data.description };
    actions.push({
      path: `.claude/commands/${c.rel}`,
      content: stringifyDoc(fm, newBody),
      strategy: "create",
      ...(note ? { note } : {}),
    });
  }

  for (const s of p.skills) {
    actions.push({ path: `.claude/skills/${s.rel}`, content: s.content, strategy: "create" });
  }

  for (const a of p.agents) {
    const { data, body } = parseDoc(a.content);
    const name = a.rel.replace(/\.md$/, "");
    const fm: Record<string, unknown> = {
      name,
      description: data.description,
      // Source agents are strictly read-only (write/edit disabled); map to a read-only tool set.
      tools: "Read, Grep, Glob, Bash",
    };
    actions.push({
      path: `.claude/agents/${a.rel}`,
      content: stringifyDoc(fm, body),
      strategy: "create",
      note: `subagent ${name}: opencode tool restrictions mapped to read-only tool set (temperature not supported, dropped)`,
    });
  }

  for (const t of p.targets.claude ?? []) {
    actions.push({
      path: `.claude/${t.rel}`,
      content: t.content,
      strategy: t.rel.endsWith(".json") ? "merge-json" : "create",
    });
  }

  actions.push({
    path: "CLAUDE.md",
    content: "@AGENTS.md",
    strategy: "managed-block",
    note: "CLAUDE.md imports the shared AGENTS.md instead of duplicating it",
  });

  return actions;
};
