---
description: Verify implementation matches change artifacts before archiving
---

Verify that an implementation matches the change artifacts (specs, tasks, design) before archiving.

**Input**: Optionally specify a change name after `/opsx-verify` (e.g., `/opsx-verify add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Verifying change: <name>" and how to override.

2. **Check status to understand the schema**

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - Which artifacts exist for this change

3. **Get the change directory and load artifacts**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns `contextFiles` (artifact ID -> array of concrete file paths). Read all available artifacts from `contextFiles`.

4. **If the `openspec-verify-change` skill is available, load it for the full execution logic**

   The skill provides the detailed verification procedure across three dimensions:
   - **Completeness**: Tasks done, spec coverage
   - **Correctness**: Requirements implemented, scenarios covered
   - **Coherence**: Design followed, pattern consistency

   Follow the skill's steps to perform the verification and generate the report.

5. **If the skill is not available, perform a basic verification**

   - Read tasks file and check `- [x]` vs `- [ ]` completion
   - Read delta specs and search codebase for requirement coverage
   - Read design and check for obvious contradictory implementation
   - Report findings with CRITICAL / WARNING / SUGGESTION priority levels

6. **Generate and display the verification report**

   Output the report with:
   - Summary scorecard (Completeness / Correctness / Coherence)
   - Issues grouped by priority (CRITICAL, WARNING, SUGGESTION)
   - Final assessment: ready for archive or issues to fix

**Output On Success (All Clear)**

```
## Verification Report: <change-name>

### Summary
| Dimension    | Status          |
|--------------|-----------------|
| Completeness | 6/6 tasks ✓     |
| Correctness  | 3/3 reqs ✓      |
| Coherence    | No issues ✓     |

### Final Assessment
All checks passed. Ready for archive.
```

**Output On Success (With Issues)**

```
## Verification Report: <change-name>

### Summary
| Dimension    | Status          |
|--------------|-----------------|
| Completeness | 4/6 tasks       |
| Correctness  | 2/3 reqs        |
| Coherence    | Issues found    |

### Issues

**CRITICAL** (Must fix before archive):
- [ ] 2 incomplete tasks: 1.3, 1.4
- [ ] 1 missing requirement: "User can export data"

**WARNING** (Should fix):
- Design decision not followed: Use SQLite (using Postgres instead)

**SUGGESTION** (Nice to fix):
- Code pattern deviation: file naming mismatch

### Final Assessment
2 critical issue(s) found. Fix before archiving.
```

**Guardrails**
- Always read the change artifacts before verifying
- If the `openspec-verify-change` skill exists, use it - it has richer verification logic
- Be conservative: prefer SUGGESTION over WARNING, WARNING over CRITICAL when uncertain
- Every issue must have a specific, actionable recommendation
- If no artifacts exist to verify against, report that clearly
- Gracefully degrade: if only tasks exist, verify tasks; if full artifacts exist, verify all dimensions
