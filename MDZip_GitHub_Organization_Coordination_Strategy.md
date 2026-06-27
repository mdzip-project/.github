# MDZip GitHub Organization Coordination Strategy

## Purpose

Use the organization's `.github` repository as the central coordination,
governance, **and orchestration** repository for the MDZip ecosystem.

Product code remains in its own repositories. Cross-repository
documentation, workflows, templates, and agent guidance live in
`.github`.

This repository is the **hub**: cross-repository work is planned and
driven from here, reaching into the product repositories as spokes.
The hub decides *what* changes and *in what order*; each product
repository's own CI, branch protection, and `CODEOWNERS` remain the
gate that approves *its own* merge. Orchestration does not move where
merges happen.

------------------------------------------------------------------------

## Repository Layout

``` text
.github/
├── profile/
│   └── README.md                 # Organization landing page
├── docs/
│   ├── architecture.md           # High-level architecture
│   ├── repository-map.md         # What each repo does
│   ├── release-process.md
│   ├── agent-workflow.md         # How AI agents coordinate
│   ├── dependency-graph.md       # Derived view; see source-of-truth note
│   ├── workspace.md              # Repo manifest: paths + roles (hub reads this)
│   └── roadmap.md
├── ISSUE_TEMPLATE/
│   ├── bug.yml
│   ├── feature.yml
│   └── upstream-change.yml
├── tools/
│   └── dashboard/                # Local workspace status dashboard
├── AGENTS.md                     # Hub orchestration rules for agents
├── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md
└── CODEOWNERS                    # Governs THIS repo only — not org-wide
```

> **CODEOWNERS scope:** GitHub honours `CODEOWNERS` only within the
> repository that contains it. The file above governs the `.github`
> repository itself; each product repository keeps its own.

> **Dependency source of truth:** the per-repository `DEPENDENCIES.md`
> files are authoritative. `docs/dependency-graph.md` is a derived,
> aggregated view (eventually generated — see Future Enhancement).

## Workspace Model

Orchestrating from the hub requires the product repositories to be
available locally to the agent. `.github` contains no product code, so
"directing from here" means driving a multi-repository workspace, not
editing files that live in this repo.

Setup:

-   Check out each product repository as a sibling directory, and add
    each as an additional working directory for the orchestrating agent.
-   A `workspace.md` (or `repos.yaml`) in `docs/` lists every repository,
    its local path, and its role. This is the manifest the hub reads to
    know what it can reach.
-   The hub may implement changes directly across repositories when the
    work is genuinely cross-cutting and orchestrated from here.
-   Each change still lands through the **owning repository's** branch,
    PR, CI, and `CODEOWNERS` — one PR per repository, never a single PR
    spanning repos.

This model suits a single maintainer or small team. If repository
ownership later splits across teams, revisit the decentralized
"open an upstream issue" flow below as the default instead.

------------------------------------------------------------------------

## Roadmap Scope

`docs/roadmap.md` should contain only work that spans multiple
repositories.

Examples:

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
    work, so the board reflects live progress.

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
    `STATUS.md` (`Status:` and `Last:`; see below). This is the only
    hand-maintained input, kept current by agents per
    [AGENTS.md](AGENTS.md).

### Driving workflow

1.  Change `mdzip-core` to do XYZ; bump its `version`.
2.  Every app still pinning the old range shows **behind** on the
    dashboard.
3.  Update each app's pin; it returns to **up to date**.

This makes the cascade visible instead of remembered.

------------------------------------------------------------------------

## Files to Add to Every Repository

### `AGENTS.md`

Repository-specific instructions for AI agents.

### `DEPENDENCIES.md`

Lists:

-   Upstream repositories/packages
-   Version expectations
-   Public APIs relied upon

### `STATUS.md`

The project's live work state, read by the dashboard. Two recognized
lines:

```
Status: <idle | in-progress | awaiting-test | ready-to-commit | blocked>
Last:   <one-line description of the most recent action>
```

Agents keep these current as they work — see [AGENTS.md](AGENTS.md) for
the protocol (when to set each state, e.g. `blocked` carries the
question in `Last:`). Example: `Status: awaiting-test` /
`Last: streaming export done — please test large files`.

### `UPSTREAM_REQUESTS.md`

Tracks:

-   Open upstream GitHub issues
-   Blocking dependencies
-   Links to downstream work

> **Keep these current in the same PR.** Whenever a PR changes a
> dependency, it must update that repository's `DEPENDENCIES.md` (and
> `UPSTREAM_REQUESTS.md` if applicable) in the same change. Otherwise
> these files rot.

------------------------------------------------------------------------

## Cross-Repository Workflow

The hub orchestrates; product repositories gate their own merges.

1.  Plan cross-repository work from `.github`, recording any spanning
    dependency in `docs/roadmap.md`.
2.  Determine the order of changes from the dependency graph (upstream
    before downstream).
3.  Implement each repository's change on a branch **in that
    repository**, one PR per repository.
4.  Each PR lands through the owning repository's CI, branch protection,
    and `CODEOWNERS`. The hub never bypasses a repository's own gate.
5.  Record the cross-repository dependency:
    -   For a change that crosses an ownership or release boundary, open
        an `upstream-change` issue in the target repository and link it
        from `UPSTREAM_REQUESTS.md`. This is the durable record of *why*
        a downstream change exists, even when the same maintainer makes
        both changes.
    -   For purely internal coordination, the roadmap entry is enough.
6.  After an upstream change is merged and released:
    -   Update dependent repositories.
    -   Close the dependency in `docs/roadmap.md` and
        `UPSTREAM_REQUESTS.md`.

### When NOT to orchestrate from the hub

-   Work confined to a single repository belongs in that repository;
    do not route it through the hub.
-   If repositories gain separate owners/teams, the decentralized model
    (open an upstream issue, do not touch another team's code directly)
    becomes the default again.

------------------------------------------------------------------------

## Upstream Change Template

The rendered template lives in `ISSUE_TEMPLATE/upstream-change.yml`,
which is the source of truth. The block below is illustrative only —
keep the `.yml` authoritative to avoid drift.

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

## Initial Implementation Tasks

-   Create the `.github` repository structure.
-   Add the documentation under `docs/`, including `docs/workspace.md`
    (the repository manifest the hub reads).
-   Add a hub `AGENTS.md` capturing the orchestration rules in this
    strategy.
-   Add GitHub issue templates.
-   Add `AGENTS.md`, `DEPENDENCIES.md`, `UPSTREAM_REQUESTS.md`, and
    `STATUS.md` to every product repository.
-   Build the workspace dashboard under `tools/dashboard/`.
-   Update `CONTRIBUTING.md`.
-   Update the organization profile README to point contributors and
    agents to the governance documentation.

------------------------------------------------------------------------

## Future Enhancement

After the documentation is established, consider adding a
machine-readable `DEPENDENCIES.json` or `DEPENDENCIES.yaml` alongside
`DEPENDENCIES.md` so tooling and AI agents can automatically build a
dependency graph and identify downstream repositories affected by
upstream changes.
