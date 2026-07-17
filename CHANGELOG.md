# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0](https://github.com/davidpv/opsx-spec-driven-development-toolkit/compare/opsx-v1.2.0...opsx-v1.3.0) (2026-07-17)


### Features

* Add /opsx:verify & update opsx guide ([792064b](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/792064b6e9f9a28d5725cb8e4d54cf38e76ef6ef))
* **commands:** add /work multi-agent parallel build command ([e7850d5](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/e7850d52ad3a9ce34fd6c887737f24431d4aa52f))
* **commands:** enforce develop-only branch guard + commits for tasks workflow ([85fe0d0](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/85fe0d0bd5e3aa3ae73a78c5d6582e54a0186887))
* **commands:** rewrite /ship as the one-button closing wrapper ([f9cc6f4](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/f9cc6f4a623991eadf41653eeccdec8b93b61c3d))
* **commands:** update next, start, pr-open, git-commit for worktree flow ([5518e4c](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/5518e4c6b1ab09248a0affd83e6a0beef350879d))
* **commands:** update OpenSpec lifecycle for worktree + merge-then-archive ([766d35e](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/766d35e973e4de0bb8d10e59db04a2d14596a5be))
* **init-scaffolding:** add discovery, stories, and delivery pipeline ([#1](https://github.com/davidpv/opsx-spec-driven-development-toolkit/issues/1)) ([ccec13a](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/ccec13a294f711542f27d3abc452912a6d3eb7c4))
* **opsx:** Add change verification ([e6cd5f9](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/e6cd5f9ade397299702a89ec5f4b641614bc2baa))
* **opsx:** convert template into installable multi-agent CLI ([b6449ee](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/b6449eee5d0fd80e445defc6f1e0cf4a0d55958b))
* **package:** update version to 2.0.0 ([c242e4d](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/c242e4d89a2bb6d9ba44d99b74f35508d34db12a))
* **update:** prompt on managed-block changes with diff preview ([662499e](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/662499ee457e4ffb5e42bd65c192504795e7705e))
* **update:** suggest switching to worktree mode for legacy projects ([782a4a6](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/782a4a62a4f0c1c26e074d101d0e021467e9dc4b))
* **workflow:** add support for subagents ([52e096d](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/52e096de0dfe12a0df879f83a534ea134bc683f3))
* **workflow:** enable manual triggering of release process ([b0bb18d](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/b0bb18d8a027bcc31caf2fec48b1e2a0a0e6a326))


### Bug Fixes

* **package:** bump version to 1.2.2 ([163e4b6](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/163e4b639261d50acd96b8166425002acd21816e))
* **package:** bump version to 1.2.3 ([ac2fd1d](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/ac2fd1ddcf39cadcbb4e24561a1a5926280c3c19))
* **package:** revert version to 1.1.0 ([8f6efc8](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/8f6efc8048ca8d90e3ffd09f291a2284bfd05fa9))
* **package:** update version to 1.1.1 ([4d3d058](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/4d3d058f3a2452a0bac95126c6d9fac78e6b3152))
* **package:** update version to 1.1.2 ([8dcb348](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/8dcb348240222d4f32cf6e810c1a323d191a6c44))
* **templates:** remove unsupported gherkin language tag from task.md code fence ([dd7bce3](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/dd7bce36900160d6e69a28cbbeac6660f255c06f))
* **workflow:** update release-please-action reference ([6fbdbd1](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/6fbdbd11899adb4713d871ebcd11a2b0b0c25037))


### Refactors

* **workflow:** only suggest wrapper commands as next step ([14c0280](https://github.com/davidpv/opsx-spec-driven-development-toolkit/commit/14c0280f26c16d51f54a568e89c707f7b32eb3d7))

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
