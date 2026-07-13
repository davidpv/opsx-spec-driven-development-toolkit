export type TargetName = "opencode" | "claude" | "codex";

export type Strategy = "create" | "managed-block" | "merge-json";

export interface FileAction {
  /** Path relative to the project root. */
  path: string;
  content: string;
  strategy: Strategy;
  /** Degradation / info note surfaced in the init summary. */
  note?: string;
}

export interface InitConfig {
  targets: TargetName[];
  projectKey: string;
  language: "es" | "en";
  mainBranch: string;
  integrationBranch: string;
  workMode: "feature" | "flexible" | "worktree";
}

export interface PayloadFile {
  rel: string;
  content: string;
}

export interface Payload {
  commands: PayloadFile[];
  skills: PayloadFile[];
  agents: PayloadFile[];
  /** Stack-agnostic files copied to the project root (backlog/, templates/, openspec/). */
  shared: PayloadFile[];
  workflow: string;
  agentsMd: string;
  /** Per-target static files, keyed by target name. */
  targets: Partial<Record<TargetName, PayloadFile[]>>;
}

export type Adapter = (payload: Payload, cfg: InitConfig) => FileAction[];
