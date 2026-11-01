# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-11-01

### Features

- `/work` and `/opsx:apply` run every pending task, then ask once at the end of the batch and commit only on an explicit yes
- in supervised mode, `/ship` and archive close from a planning session on the integration branch, including a GUI worktree on that branch. Merge, checkout, and worktree cleanup stay with the GUI. A squash merge or a branch the GUI already deleted still counts as landed

### Bug Fixes

- `/git-commit` is a generic Conventional Commits helper. It runs from `main`, `develop`, a feature branch, a linked worktree, or any other checkout

### Documentation

- refresh the README demo and the rationale for the framework

## [2.1.1] - 2026-10-02

### Bug Fixes

- in `task-jira`, keep Jira `{code}` for the acceptance-criteria block and use `{{monospace}}` for inline code

## [2.1.0] - 2026-09-28

> First version published to npm after 1.2.4. The git tag `v2.0.0` still had `package.json` at 1.3.0, and the `v2.0.1` publish failed, so the 2.0 changes shipped in this version.

### Breaking changes

- `git.work_mode` is `automated` or `supervised`. `worktree` remains a deprecated alias of `automated`. `feature` and `flexible` are no longer valid

### Features

- add supervised mode: the GUI owns worktrees and branches, and opsx leaves creation, checkout, merge, and cleanup to it
- add model routing for Grok, Claude, and OpenAI. `opsx init` can write a catalog to `workflow.yaml` `models.phases` and pin it on commands; `opsx update` re-pins edited ids. `--yes` leaves the provider as `none`
- `/git-commit` works in any git repository, with no OpenSpec project and no branch layout required

## [1.3.0] - 2026-07-17

> Tag `opsx-v1.3.0` bumped the version and regenerated this file from the whole history. It was not published to npm. Product changes through 1.2.x are in the sections below.

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
