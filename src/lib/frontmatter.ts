import YAML from "yaml";

export interface Doc {
  data: Record<string, unknown>;
  body: string;
}

export function parseDoc(src: string): Doc {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { data: {}, body: src };
  return { data: (YAML.parse(m[1] ?? "") as Record<string, unknown>) ?? {}, body: src.slice(m[0].length) };
}

export function stringifyDoc(data: Record<string, unknown>, body: string): string {
  const fm = YAML.stringify(data, { lineWidth: 0 }).trimEnd();
  return `---\n${fm}\n---\n\n${body.replace(/^\n+/, "")}`;
}
