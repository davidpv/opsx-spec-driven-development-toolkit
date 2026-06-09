# Spec-Driven Development Template

A reusable, stack-agnostic base for working with **spec-driven development** on top of [opencode](https://opencode.ai) and [OpenSpec](https://github.com/Fission-AI/OpenSpec).

The core idea: **Spec → Plan → Code.** Code is the last artifact produced, never the first. OpenSpec structures every change as proposal + specs + design + tasks, and opencode executes the implementation with full traceability back to the requirements.

## Quick start

```bash
# Prerequisites
npm install -g opencode-ai @fission-ai/openspec

# Start opencode in the repo
opencode
```

Then, inside opencode:

```
/opsx:propose speed-up-search    # 1. proposal + delta specs + design + tasks
/review-change speed-up-search   # 2. audit before building
/opsx:apply                      # 3. implement task by task
/opsx:archive                    # 4. merge specs into source of truth
```

## Workflow

```
 ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌───────────┐
 │  Proposal │──►│   Specs  │──►│  Design  │──►│   Tasks   │
 │  (why/what)│  │ (verify) │   │  (how)   │   │  (steps)  │
 └───────────┘   └──────────┘   └──────────┘   └─────┬─────┘
      ▲                                              │
      │           update as you learn                ▼
      └──────────────────────────────────────── Implementation
```

Each change lives in `openspec/changes/<name>/` until archived. Archiving merges its delta specs into `openspec/specs/`, the living description of how the system behaves.

## Repository layout

```
.
├── AGENTS.md                  # Rules every agent must follow
├── opencode.json              # opencode project config
├── .opencode/
│   ├── agents/
│   │   └── spec-reviewer.md   # Subagent: audits changes before apply/archive
│   ├── commands/
│   │   ├── review-change.md   # /review-change — audit a change
│   │   └── opsx-*.md          # /opsx:* — OpenSpec lifecycle (generated)
│   └── skills/                # OpenSpec workflow skills (generated)
└── openspec/
    ├── config.yaml            # Project context + per-artifact rules
    ├── specs/                 # Source of truth (current behavior)
    └── changes/               # In-flight changes; archive/ keeps history
```

## Commands

| Command | What it does |
|---------|--------------|
| `/opsx:propose <name>` | Create a change: proposal, delta specs, design, tasks |
| `/opsx:explore` | Investigate the codebase/specs before proposing |
| `/review-change <name>` | Run the spec-reviewer subagent: quality audit + `openspec validate --strict` |
| `/opsx:apply` | Implement the tasks of a change |
| `/opsx:sync` | Sync specs with reality when they drift |
| `/opsx:archive` | Merge delta specs into `openspec/specs/` and file the change |

## Using this template for a new project

1. Copy or clone this repo and re-init git.
2. Fill the `context:` block in `openspec/config.yaml` with your stack and conventions.
3. Extend `AGENTS.md` with project-specific rules.
4. Propose your first change with `/opsx:propose` and go.

## Keeping it up to date

After upgrading the OpenSpec CLI, regenerate the integration files:

```bash
openspec update
```

## Further reading

- [OpenSpec docs](https://github.com/Fission-AI/OpenSpec/tree/main/docs) — getting started, CLI, concepts
- [opencode docs](https://opencode.ai/docs) — agents, commands, rules, config
