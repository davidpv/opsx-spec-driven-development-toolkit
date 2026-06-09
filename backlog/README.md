# Backlog

Product artifacts that live **upstream** of OpenSpec. Flow:

```
discovery/  →  stories/  →  openspec/changes/  →  code
(/req-capture) (/story-generate, /story-enrich)  (/opsx-propose)
```

| Dir | Contents |
|-----|----------|
| `discovery/` | Requirements-gathering notes, one file per topic (`/req-capture`) |
| `stories/` | User stories `US-NNN-<slug>.md` with frontmatter traceability (`/story-generate`) |
| `exports/jira/` | Jira-ready markup renders of stories (`/story-jira`) |
| `exports/pr/` | PR descriptions when no platform CLI is available (`/pr-open`) |

A story's frontmatter (`status`, `change`, `jira_key`) is the single place that
tracks where it is in the pipeline. Commands update it; don't edit it by hand
unless correcting drift.
