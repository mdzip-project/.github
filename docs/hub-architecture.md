# Hub Architecture

How the `.github` repo coordinates the MDZip multi-repo workspace, and
why it's shaped this way. For the rules agents actually follow day to
day (orchestration model, `STATUS.md` protocol, project conventions),
see [AGENTS.md](../AGENTS.md) — that file is the living source of
truth and takes precedence if anything here drifts out of sync with it.

**Scope note:** this document covers the *mechanics* of multi-repo
coordination — public engineering reference, safe for anyone to read.
Product direction, market positioning, and other business strategy
live in the private `planning` repo (local: `../planning`), never here.

------------------------------------------------------------------------

## Purpose

Product code lives in its own repositories. Cross-repository
documentation, workflows, templates, and agent guidance live in
`.github` — the **hub**. Cross-repository work is planned and driven
from here, reaching into the product repositories as spokes. The hub
decides *what* changes and *in what order*; each product repository's
own CI, branch protection, and `CODEOWNERS` remain the gate that
approves *its own* merge. Orchestration does not move where merges
happen.

## Repository Layout

Current layout (grows as needed — this isn't a prescribed target):

``` text
.github/
├── profile/
│   └── README.md                 # Organization landing page
├── docs/
│   ├── roadmap.md                # Cross-repo initiatives and their state
│   ├── workspace.md              # Repo manifest: paths + roles (hub reads this)
│   ├── hub-architecture.md       # This file
│   ├── dotnet-workflow.md        # Build/test/release for the .NET repos
│   └── core-parity.md            # Active initiative detail
├── tools/
│   └── dashboard/                # Local workspace status dashboard
├── AGENTS.md                     # Hub orchestration rules for agents
├── CHANGELOG.md
└── STATUS.md
```

> **CODEOWNERS scope:** if/when a `CODEOWNERS` file is added here,
> GitHub honours it only within the repository that contains it — it
> would govern `.github` itself, not the org. Each product repository
> keeps its own.

> **Dependency source of truth:** the per-repository `DEPENDENCIES.md`
> files are authoritative. A generated, aggregated dependency-graph
> view is a possible future enhancement — see below.

## Workspace Model

Orchestrating from the hub requires the product repositories to be
available locally to the agent. `.github` contains no product code, so
"directing from here" means driving a multi-repository workspace, not
editing files that live in this repo.

- Each product repository is checked out as a sibling directory and
  added as an additional working directory for the orchestrating agent.
- [`docs/workspace.md`](workspace.md) lists every repository, its
  local path, and its role — the manifest the hub reads to know what
  it can reach.
- The hub may implement changes directly across repositories when the
  work is genuinely cross-cutting and orchestrated from here.
- Each change still lands through the **owning repository's** branch,
  PR, CI, and `CODEOWNERS` — one PR per repository, never a single PR
  spanning repos.

This model suits a single maintainer or small team. If repository
ownership later splits across teams, revisit the decentralized
"open an upstream issue" flow as the default instead (see AGENTS.md).

## Roadmap Scope

[`docs/roadmap.md`](roadmap.md) should contain only work that spans
multiple repositories, e.g.:

-   MDZip Studio depends on a new `mdzip-core-js` API.
-   Viewer requires Manifest v1.1 support.
-   Obsidian plugin migration depends on editor API changes.

Individual feature plans belong in the repository that owns the code.

------------------------------------------------------------------------

## Project Dashboard

A single at-a-glance status page for the whole workspace, run from the
hub. The owner keeps it open and uses it to decide what to do next.

### What it shows, per project

-   **Git state** — clean, or a count of uncommitted/untracked changes
    (`git status --porcelain` in each repo path).
-   **Dependency state** — `up to date`, or `behind` when a first-party
    upstream has advanced past the version this project pins.
-   **Status** — the project's workflow state as a coloured badge
    (`idle`, `in-progress`, `awaiting-test`, `ready-to-commit`,
    `blocked`) plus the last action taken. Agents update this as they
    work (protocol in [AGENTS.md](../AGENTS.md)), so the board
    reflects live progress.

### Form

A small Node script in `tools/dashboard/` that scans the workspace and
serves an **auto-refreshing local web page** (e.g. `localhost:7777`).
Keep a browser tab open; it polls and re-renders on its own. No external
service, no deployment — it only reads local repos.

### Data sources (no duplicated state)

-   Repo list and local paths come from `docs/workspace.md`.
-   Git state comes from `git` directly.
-   "Behind" is computed by reading versions straight from each
    project's `package.json`: a project is **behind** when the version
    it pins for a first-party upstream is lower than that upstream
    repo's current `version`. No hand-maintained "behind" flag.

        behind  =  pinned(upstream) < current(upstream.version)

-   For couplings that are not npm dependencies (e.g. "viewer requires
    Manifest v1.1"), add an explicit machine-readable entry; this is the
    narrow case the `DEPENDENCIES.json` future enhancement covers.
-   **Status** and the last-action line come from each repo's
    `STATUS.md` (`Status:` and `Last:`) — the only hand-maintained
    input, kept current by agents per [AGENTS.md](../AGENTS.md).

### Driving workflow

1.  Change `mdzip-core` to do XYZ; bump its `version`.
2.  Every app still pinning the old range shows **behind** on the
    dashboard.
3.  Update each app's pin; it returns to **up to date**.

This makes the cascade visible instead of remembered.

------------------------------------------------------------------------

## Files Expected in Every Product Repository

### `AGENTS.md`
Repository-specific instructions for AI agents.

### `DEPENDENCIES.md`
Lists upstream repositories/packages, version expectations, and public
APIs relied upon.

### `STATUS.md`
The project's live work state, read by the dashboard. Protocol
(states, when to update) is defined in [AGENTS.md](../AGENTS.md).

### `UPSTREAM_REQUESTS.md`
Tracks open upstream GitHub issues, blocking dependencies, and links to
downstream work.

> **Keep these current in the same PR.** Whenever a PR changes a
> dependency, it must update that repository's `DEPENDENCIES.md` (and
> `UPSTREAM_REQUESTS.md` if applicable) in the same change. Otherwise
> these files rot.

------------------------------------------------------------------------

## Cross-Repository Workflow

The hub orchestrates; product repositories gate their own merges. Rules
for agents are in [AGENTS.md](../AGENTS.md); the detail specific to
recording *why* a downstream change exists:

-   For a change that crosses an ownership or release boundary, open
    an `upstream-change` issue in the target repository and link it
    from `UPSTREAM_REQUESTS.md`. This is the durable record, even when
    the same maintainer makes both changes.
-   For purely internal coordination, a `docs/roadmap.md` entry is
    enough.
-   After an upstream change is merged and released, update dependent
    repositories and close the dependency in both `docs/roadmap.md`
    and `UPSTREAM_REQUESTS.md`.

### Upstream Change Template

An `upstream-change` issue template can formalize this:

``` text
Requesting repository:
Target repository:
Reason:
Required API / behavior change:
Acceptance criteria:
Downstream issue / PR:
Additional notes:
```

------------------------------------------------------------------------

## Future Enhancement

Consider adding a machine-readable `DEPENDENCIES.json` or
`DEPENDENCIES.yaml` alongside `DEPENDENCIES.md` so tooling and AI
agents can automatically build a dependency graph and identify
downstream repositories affected by upstream changes.
