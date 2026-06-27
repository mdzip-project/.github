# Changelog

Notable changes to the MDZip `.github` coordination hub. Format based on
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- **Coordination & governance strategy**
  (`MDZip_GitHub_Organization_Coordination_Strategy.md`): hub-and-spoke
  orchestration model, workspace model, cross-repository workflow, roadmap
  scope, and the project dashboard design.
- **Workspace manifest** (`docs/workspace.md`): the 11 active repos (the
  `.github` hub + 10 product repos) with type, visibility, roles, remotes,
  and first-party package mapping; plus archived repos and review notes.
- **Workspace dashboard** (`tools/dashboard/`): a zero-dependency Node
  server that serves an auto-refreshing local board (`localhost:7777`)
  showing, per repo: type icon, version (package.json → git tag →
  `STATUS.md`), git state, dependency state (behind / up to date), and the
  workflow Status badge. Sorted by type; custom image icon support
  (mdzip-mark); private repos marked with a lock.
- **Agent orchestration rules** (`AGENTS.md`): the hub model and the
  `STATUS.md` protocol — states `idle`, `in-progress`, `awaiting-test`,
  `ready-to-commit`, `blocked`, and when agents update them.
- **Hub `STATUS.md`** so the `.github` repo participates in its own board.
