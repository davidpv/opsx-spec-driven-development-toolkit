---
description: Propose a new change on the integration branch (never inside a worktree)
---

Propose a new change on the integration branch. This command creates the change directory and generates all artifacts in one step.

> **Branch guard — non-negotiable.** `/opsx:propose` MUST run on the integration branch (`develop`, configured as `git.integration_branch` in `workflow.yaml`). It MUST NOT run on a feature branch or inside a worktree. OpenSpec needs to see every active change and the authoritative `openspec/specs/` to detect conflicts and gaps; running on a worktree branch would blind it to that context.

I'll create a change with artifacts:
- proposal.md (what & why)
- design.md (how)
- tasks.md (implementation steps)
- delta specs (ADDED / MODIFIED / REMOVED requirements)

When ready to implement, run `/opsx:apply` (which creates a worktree) or `/work` (multi-agent parallel build).

---

**Input**: The argument after `/opsx-propose` is the change name (kebab-case), OR a description of what the user wants to build.

**Steps**

0. **Branch guard**

   ```bash
   git branch --show-current
   git worktree list
   ```

   - Read `git.integration_branch` from `workflow.yaml`.
   - If the current branch is not the integration branch, refuse and tell the user to `git checkout <integration_branch>` first. Print the required branch name explicitly.
   - If `git worktree list` shows the working dir is inside a worktree, refuse and tell the user to run this from the main checkout, not from inside a worktree path.

1. **If no input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Create the change directory**

   ```bash
   openspec new change "<name>"
   ```

   This creates a scaffolded change in the planning home resolved by the CLI with `.openspec.yaml`.

3. **Get the artifact build order**

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to get:
   - `applyRequires`: array of artifact IDs needed before implementation (e.g., `["tasks"]`)
   - `artifacts`: list of all artifacts with their status and dependencies
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context. Use these instead of assuming repo-local paths.

4. **Create artifacts in sequence until apply-ready**

   Use the **TodoWrite tool** to track progress through the artifacts.

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. **For each artifact that is `ready` (dependencies satisfied)**:
      - Get instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - The instructions JSON includes:
        - `context`: Project background (constraints for you - do NOT include in output)
        - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
        - `template`: The structure to use for your output file
        - `instruction`: Schema-specific guidance for this artifact type
        - `resolvedOutputPath`: Resolved path or pattern to write the artifact
        - `dependencies`: Completed artifacts to read for context
      - Read any completed dependency files for context
      - Create the artifact file using `template` as the structure and write it to `resolvedOutputPath`
      - Apply `context` and `rules` as constraints - but do NOT copy them into the file
      - Show brief progress: "Created <artifact-id>"

   b. **Continue until all `applyRequires` artifacts are complete**
      - After creating each artifact, re-run `openspec status --change "<name>" --json`
      - Check if every artifact ID in `applyRequires` has `status: "done"` in the artifacts array
      - Stop when all `applyRequires` artifacts are done

   c. **If an artifact requires user input** (unclear context):
      - Use **AskUserQuestion tool** to clarify
      - Then continue with creation

5. **Commit each artifact individually (commit discipline)**

   This is a recovery point. After each artifact is written, stage and commit it on the integration branch:

   ```bash
   git add <artifact file>
   git commit -m "<type>(<change>): add <artifact>"  # e.g. docs(<change>): add proposal
   ```

   Conventional-commit `<type>` per artifact kind:
   - `proposal.md` → `docs(<change>): add proposal`
   - `design.md`   → `docs(<change>): add design`
   - `tasks.md`    → `docs(<change>): add tasks`
   - `specs/*`     → `docs(<change>): add delta spec for <capability>`

   Skip if the user has already committed or asks to batch.

6. **Show final status**

   ```bash
   openspec status --change "<name>"
   git status --short
   ```

   If `git status --short` shows anything uncommitted, commit it now before returning.

**Output**

After completing all artifacts, summarize:
- Change name and location
- List of artifacts created with brief descriptions
- Confirmation that each artifact was committed individually on the integration branch
- What's ready: "All artifacts created and committed on <integration_branch>. Ready for implementation."
- Prompt: "Run `/opsx:apply` to create a worktree and implement, or `/work` to fan out across agents."

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type
- The schema defines what an artifact should contain - follow it
- Read dependency artifacts for context before creating new ones
- Use `template` as the structure for your output file - fill in its sections
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**

- **Always run the branch guard first.** Refuse and exit if the working branch or working dir is wrong.
- Create ALL artifacts needed for implementation (as defined by schema's `apply.requires`)
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, ask if user wants to continue it or create a new one
- Verify each artifact file exists after writing before proceeding to next
- Verify each artifact is committed on the integration branch before returning

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly