export type WorkMode = "automated" | "supervised";

export type ResolveWorkModeResult =
  | { ok: true; mode: WorkMode; alias?: "worktree" }
  | { ok: false; raw: string; message: string };

/** Resolve git.work_mode. `worktree` is a deprecated alias of `automated`. */
export function resolveWorkMode(raw: string | undefined | null): ResolveWorkModeResult {
  const v = (raw ?? "automated").trim();
  if (v === "automated") return { ok: true, mode: "automated" };
  if (v === "worktree") return { ok: true, mode: "automated", alias: "worktree" };
  if (v === "supervised") return { ok: true, mode: "supervised" };
  if (v === "feature" || v === "flexible") {
    return {
      ok: false,
      raw: v,
      message: `git.work_mode: ${v} is no longer supported. Set automated (opsx owns worktrees) or supervised (the agent GUI owns isolation).`,
    };
  }
  return {
    ok: false,
    raw: v,
    message: `Invalid git.work_mode: '${v}'. Allowed: automated, supervised (deprecated alias: worktree → automated).`,
  };
}

/** Value written into workflow.yaml. Legacy feature/flexible are left as-is (not silent-migrated). */
export function workModeForTemplate(raw: string | undefined | null): string {
  const r = resolveWorkMode(raw);
  if (r.ok) return r.mode;
  return (raw ?? "automated").trim();
}

export function migrationTip(raw: string | undefined | null): string | null {
  const v = (raw ?? "").trim();
  if (v === "worktree") {
    return "Tip: workflow.yaml still has git.work_mode: worktree (deprecated alias of automated). Rename it to automated when convenient; behaviour is unchanged.";
  }
  if (v === "feature" || v === "flexible") {
    return `Tip: git.work_mode: ${v} is no longer supported. Set automated (opsx creates worktrees) or supervised (VS Code Agents / Superset / Copilot already isolated this session).`;
  }
  return null;
}
