# Backlog

Product artifacts that live **upstream** of OpenSpec. Flow:

```
discovery/  →  tasks/  →  openspec/changes/  →  code
(/req-capture) (/task-generate, /task-enrich)  (/opsx-propose)
```

| Dir | Contents |
|-----|----------|
| `discovery/` | Requirements-gathering notes, one file per topic (`/req-capture`) |
| `tasks/` | Tasks `<jira-key>-<slug>.md` with frontmatter traceability (`/task-generate`) |
| `exports/jira/` | Jira-ready markup renders of tasks (`/task-jira`) |
| `exports/pr/` | PR descriptions when no platform CLI is available (`/pr-open`) |

Task IDs ARE Jira keys (`<project_key>-<n>`), provided by the user; drafts use
`<project_key>-Dnn` until the real issue exists. A task's frontmatter (`status`,
`change`) is the single place that tracks where it is in the pipeline. Commands
update it; don't edit it by hand unless correcting drift.
