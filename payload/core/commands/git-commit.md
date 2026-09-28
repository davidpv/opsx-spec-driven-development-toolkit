---
description: Conventional, semantic commits from staged changes — or the full working tree if nothing is staged
---

Create conventional commits for the current git work. Works in any repository, on any branch. No OpenSpec project, `workflow.yaml`, or branch layout required. `$ARGUMENTS` is an optional hint (intent, scope, or a draft subject) — not a message to commit verbatim.

**Steps**

1. **See the work.** Run `git status --short`, `git diff --cached`, and `git diff`. If nothing changed, say so and stop.

2. **Choose the set.**
   - Staged changes exist → commit **only** the index. Leave unstaged and untracked files alone.
   - Nothing staged → take the full current changes (modifications, deletions, and untracked files). Respect `.gitignore`. Do not stage secrets (`.env`, keys, credentials).

3. **Split semantically.** One concern per commit. If the set mixes unrelated changes, split it and stage each group (`git add <paths>`; `git add -p` only when one file mixes concerns). The subject describes the behavior change, not a file list.

4. **Write a single-line Conventional Commit** ([spec](https://www.conventionalcommits.org)). No body. No footer.

   ```
   <type>[optional scope][!]: <subject>
   ```

   - **type** from the diff: `feat` `fix` `refactor` `perf` `test` `docs` `style` `build` `ci` `chore` `revert`
   - **scope**: optional module or area
   - **subject**: imperative, ≤72 chars, no trailing period
   - **breaking**: `!` after the type/scope. Do not add a `BREAKING CHANGE:` footer.

5. **Show, then commit on approval.** Print each subject with its file list. On approval, commit in order with `git commit -m "<message>"`.

   Never `--amend`, `--no-verify`, or force-push unless the user asks. Afterwards print each hash and subject. If anything is still unstaged, list it and stop.
