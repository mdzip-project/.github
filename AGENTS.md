# MDZip Agent Orchestration Rules

Instructions for AI agents working across the MDZip workspace. This repo
(`.github`) is the **hub**: cross-repository work is planned and driven
from here, reaching into the product repositories listed in
[docs/workspace.md](docs/workspace.md).

## Orchestration model

- Plan cross-repository work from the hub. Implement each change on a
  branch **in the repository that owns the code** — one PR per repo.
- Each repository keeps its own CI, branch protection, and `CODEOWNERS`
  as the gate that approves its own merge. The hub never bypasses them.
- Work confined to a single repository belongs in that repository.

## STATUS.md protocol (drives the dashboard)

Every product repository has a `STATUS.md`. The workspace dashboard
(`tools/dashboard/`) reads its first two recognized lines:

```
Status: <state>
Next:   <one-line description shown on the dashboard>
```

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

1. **On starting** work in a repo → set `Status: in-progress` and write
   `Next:` describing what you're doing.
2. **On finishing** → set `awaiting-test` (human should verify) or
   `ready-to-commit` (already verified), and update `Next:` with the
   outcome, e.g. `XYZ implemented; please test the export dialog`.
3. **When blocked** → set `Status: blocked` and put the exact question in
   `Next:`, e.g. `blocked — should viewer migrate to scoped @mdzip/core-js?`
4. **After commit/merge** → set back to `idle` and clear `Next:` to a
   placeholder.

Keep `Next:` to one line. Longer notes can follow on later lines (the
dashboard ignores them).

### Example

A request of *"Implement streaming export in mdzip-studio"* should move
`mdzip-studio/STATUS.md` through:

```
Status: in-progress      Next: Implementing streaming export
Status: awaiting-test    Next: Streaming export done — please test large files
Status: ready-to-commit  Next: Streaming export verified — ready to commit
Status: idle             Next: (set the next action for mdzip-studio)
```

## Dependencies

A consumer is **behind** when the version it pins for a first-party
package (`@mdzip/core-js`, `@mdzip/editor`) is lower than that package's
current `package.json` version. After bumping an upstream, update each
downstream pin and set its `STATUS.md` accordingly.
