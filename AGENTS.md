# MDZip Agent Orchestration Rules

Instructions for AI agents working across the MDZip workspace. This repo
(`.github`) is the **hub**: cross-repository work is planned and driven
from here, reaching into the product repositories listed in
[docs/workspace.md](docs/workspace.md).

**Start here:** cross-repo work is tracked as issues in the repositories
that own the code, cross-linked to their counterparts — there is no central
tracker. For building/testing/releasing the .NET repos (`mdzip-core`,
`mdzip-cli`), see [docs/dotnet-workflow.md](docs/dotnet-workflow.md). For
core parity, the detailed gap + phased plan is in
[docs/core-parity.md](docs/core-parity.md).

## Orchestration model

- Plan cross-repository work from the hub. Implement each change on a
  branch **in the repository that owns the code** — one PR per repo.
- Each repository keeps its own CI, branch protection, and `CODEOWNERS`
  as the gate that approves its own merge. The hub never bypasses them.
- Work confined to a single repository belongs in that repository.
- An initiative that spans repos is a set of per-repo issues that link to
  each other (e.g. a Studio issue and its VS Code counterpart), plus each
  repo's `UPSTREAM_REQUESTS.md` for blocking dependencies — not a single
  tracking doc in the hub.

## STATUS.md protocol (drives the dashboard)

Every product repository has a `STATUS.md`. The workspace dashboard
(now its own repo, `../mdzip-dashboard` — see `docs/hub-architecture.md`)
reads its first two recognized lines:

```
Status: <state>
Last:   <one-line description of the most recent action, shown on the dashboard>
```

`Last:` is the **last thing you did** (or are doing) in this repo — a
running activity line, not a forward to-do.

**You MUST keep `STATUS.md` current as you work.** It is the work board
the human watches; a stale board is worse than none.

### States

| `Status:` value   | Meaning                                   | Dashboard |
|-------------------|-------------------------------------------|-----------|
| `idle`            | No active task                            | grey      |
| `in-progress`     | Actively implementing                     | blue      |
| `awaiting-test`   | Implementation done; the human should test| amber     |
| `ready-to-commit` | Verified; ready to commit/PR              | green     |
| `blocked`         | Need a decision/answer from the human     | red       |

### When to update

1. **On starting** work in a repo → set `Status: in-progress` and set
   `Last:` to what you're doing, e.g. `Implementing the export dialog`.
2. **On finishing** → set `awaiting-test` (human should verify) or
   `ready-to-commit` (already verified), and set `Last:` to what you just
   did, e.g. `Implemented the export dialog`.
3. **When blocked** → set `Status: blocked` and put the blocker/question
   in `Last:`, e.g. `Blocked: should viewer migrate to scoped @mdzip/core-js?`
4. **After commit/merge** → set `idle`, leaving `Last:` as the record of
   the last completed action, e.g. `Committed the export dialog`.

Keep `Last:` to one line. Longer notes can follow on later lines (the
dashboard ignores them).

### Example

A request of *"Implement streaming export in mdzip-studio"* should move
`mdzip-studio/STATUS.md` through:

```
Status: in-progress      Last: Implementing streaming export
Status: awaiting-test    Last: Streaming export done — please test large files
Status: ready-to-commit  Last: Streaming export verified — ready to commit
Status: idle             Last: Committed streaming export
```

## Project conventions

- **Batch commits; the owner reviews before anything goes live.** Do
  not commit/push after each change. Accumulate work, keep `STATUS.md`
  current, and present a summary for review; commit and push only when
  the owner says so. This matters doubly for repos that deploy on push
  to `main` (mdzip.org) — push means production.

- **Visual theme: black/white/greyscale, color for emphasis only.** The
  project is moving to a greyscale theme across all properties
  (mdzip.org, dashboard, editor demo, Studio, brand assets). Don't
  retrofit existing UI, but any **new** UI, page, theme, or visual asset
  defaults to greyscale, with color reserved for sparing emphasis
  (status indicators, calls to action, highlights).
- **Content style guide.** Codifies what's already the dominant, consistent
  usage across properties — not a new convention. When copy needs to be
  written or touched, match these; when in doubt, match the surrounding page
  rather than inventing a new form.
  - **Marketing-page buttons and CTAs: Title Case.** `Download for
    Windows`, `Read the Specification`, `View Full Specification`.
    Lowercase minor words (`the`, `a`, `for`, `to`, ...) unless first/last
    in the label — *or* part of a page's actual proper title, e.g. `Read
    The Problem` keeps "The" capitalized because the page itself is titled
    "The Problem" (its `<title>` and nav link both capitalize it), unlike
    `Read the Specification`, whose page is just titled "Specification."
    Check the target page's own title before "fixing" this one.
  - **Tool-page buttons: sentence case.** A separate, equally consistent
    convention on the functional tool pages (`editor.html`, `packager.html`)
    — `Choose file`, `Load single-doc sample`, `Open another...`. These
    read as native app controls, not marketing CTAs; don't Title-Case them
    to match the rule above.
  - **Headings: Sentence case.** `Common use cases`, `Build the MDZip
    ecosystem`, `Where to go next`. Only the first word and proper nouns
    are capitalized.
  - **Product names, exact forms:** `MDZip`, `MDZip Studio`, `MDZip.org`,
    `VS Code` (not "Visual Studio Code"), `mdz` CLI (lowercase, code font
    for the command itself — `` `mdz` ``).
  - **`.mdz` and `.md`** are always lowercase with the leading dot, and
    always in code font (`` `.mdz` ``), never bare prose text.
- **Where docs go.** This hub repo is **public**. Its `docs/` folder is
  for engineering status and reference only. Conceptual design work,
  strategy, market analysis, and scratchpad notes belong in the
  **private** `mdzip-project/planning` repo (local:
  `../planning`) — never here.
- **Durable notes must be agent-agnostic.** Record project-wide facts,
  conventions, and decisions in shared files any agent can discover
  (this file, `docs/`, or the `planning` repo) — not in
  agent-specific memory stores.
- **Author like a non-developer.** When working on mdzip.org (and the
  future docs site) content and authoring workflows, approach them as
  a non-technical author would: prefer workflows that don't require
  git, text editors, or build scripts, and when a task forces
  developer skills anyway, flag it as friction (logged in the
  `planning` repo's strategy findings) instead of silently working
  around it.
- **mdzip.org SEO/content checklist.** Before touching mdzip.org content
  or templates, check `mdzip.org/seo/checklist.md` — issue categories
  (status drift, heading hierarchy, structured data, known false-positive
  patterns from AI review tools, etc.) accumulated from past reviews, so
  they get caught proactively instead of waiting for another external
  audit to rediscover them. See `mdzip.org/CLAUDE.md` and
  `mdzip.org/seo/README.md` for the full report-processing workflow.

## Dependencies

A consumer is **behind** when the version it pins for a first-party
package (`@mdzip/core-js`, `@mdzip/editor`) is lower than that package's
current `package.json` version. After bumping an upstream, update each
downstream pin and set its `STATUS.md` accordingly.
