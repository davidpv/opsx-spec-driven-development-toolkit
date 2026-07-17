# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-07-17

> No code changes since `v1.2.0`. This tag points to the same commit as `v1.2.0`.

## [1.2.0] - 2026-07-17

### Features
- add support for subagents in the workflow

## [1.1.3] - 2026-07-14

### Documentation
- enforce user-driven commit discipline

## [1.1.2] - 2026-07-13

### Documentation
- simplify and align README with the wrapper-first model
- update commit discipline to group artifacts in `opsx:propose`

### Refactors
- only suggest wrapper commands as the next step in the workflow

## [1.1.1] - 2026-07-13

### Documentation
- use the `openspec` subagent type (instead of `general-purpose`) in `archive-change`
- use the `openspec` subagent type (instead of `general-purpose`) in `work`

## [1.1.0] - 2026-07-13

### Features
- prompt on managed-block changes with a diff preview during `opsx:update`
- suggest switching to worktree mode for legacy projects during `opsx:update`
- enforce a develop-only branch guard and per-task commits for the tasks workflow
- update `next`, `start`, `pr-open`, and `git-commit` for the worktree flow
- update the OpenSpec lifecycle for worktree + merge-then-archive
- rewrite `/ship` as the one-button closing wrapper
- add the `/work` multi-agent parallel build command

### Documentation
- update README for the worktree + merge-then-archive workflow
- rewrite workflow rules for worktree + merge-then-archive

### Chores
- add branch guards and worktree context to OpenSpec skills
- add `worktree` `work_mode` and per-project settings to the workflow

### Tests
- add a focused `update-validation` script

## [1.0.5] - 2026-07-09

### Documentation
- update language gate instructions for clarity in agents
- refine language gate requirements across commands

## [1.0.4] - 2026-06-27

### Documentation
- clarify the Jira Gherkin block format in `task-jira`

## [1.0.3] - 2026-06-24

> No notable changes. Maintenance release.

## [1.0.2] - 2026-06-24

### Documentation
- add installation instructions to the README
- add a demo GIF to the README

### Chores
- add `.superset/` to `.gitignore`

## [1.0.1] - 2026-06-18

### Features
- add `/opsx:verify` and update the opsx guide

## [1.0.0] - 2026-06-18

### Features
- add change verification to `opsx`

### Bug Fixes
- remove the unsupported Gherkin language tag from the `task.md` code fence

### Documentation
- use the `@davidpv/opsx` package name and add the npm badge to the README

## [0.1.1] - 2026-06-14

### Features
- convert the template into an installable multi-agent CLI (`opsx`)
- add discovery, stories, and a delivery pipeline to the init scaffolding (#1)

### CI
- publish to npm on version tags

### Documentation
- clarify handling of multiple commits in `git-commit`
- add a prerequisites section to the README
- add a branch verification step in `opsx:apply`
- add a guided flow and `/next` recovery command to the pipeline guidance
- add a model overview with a management vs governance diagram to the README
- document flexible work mode and Jira-keyed branch naming
- clarify the spec-drift checkpoint and trim outdated sections of the README

### Chores
- update Jira tasks
- allow the `date` command in the opencode config
- set default permissions in the opencode config
