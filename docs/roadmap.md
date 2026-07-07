# MDZip Roadmap

Cross-repository work only — initiatives that span more than one repo.
Single-repo features live in that repo. See
[the coordination strategy](../MDZip_GitHub_Organization_Coordination_Strategy.md).

## In progress

### Merge the core-parity branch stack into `main`
`mdzip-core`'s parity work shipped directly from the `parity/phase6-workspace`
branch — `v1.3.0` and `v1.3.3` are tagged there — but `main` was never updated
and still sits at the pre-parity commit `7dfda11` (2026-04-12). Merge the
branch stack (`parity/phase1-read-inspect` … `parity/phase6-workspace`) into
`main` so the default branch matches what's actually released. Details:
[core-parity.md](core-parity.md).

## Done

### Core parity: C# core → core-js → CLI — 2026-06-29
Brought `mdzip-core` (C#) to functional parity with `mdzip-core-js` (TS) and
surfaced the new capabilities in `mdzip-cli`. Detailed gap + phased plan:
[core-parity.md](core-parity.md).

- **Repos:** `mdzip-core` (implemented), `mdzip-cli` (exposed via the new
  `cat`, `assets`, `manifest`, `workspace`, `info` commands), references
  `mdzip-core-js` (parity target).
- **Shipped:** `mdzip-core` `v1.3.0` (parity, folding in the net10 multi-target
  work) → `v1.3.3` (raw-`<img>` orphan-detection fix); `mdzip-cli` `v1.3.0`
  consuming `mdzip-core 1.3.3` via `PackageReference`.
- **Phases:** read/inspect → validation → manifest editing → mutation/packaging
  → assets/orphan-detection → workspace (see core-parity.md).
- **Known gap:** the branch stack that produced these releases isn't merged
  into `main` — tracked in **In progress** above.

### .NET 10 upgrade (mdzip-core + mdzip-cli) — 2026-06-27
- `mdzip-core` → multi-target `net8.0;net10.0` (branch `upgrade/net10`,
  committed `b4b392b`). Verified: 41/41 tests on each TFM.
- `mdzip-cli` → `net10.0` (branch `upgrade/net10`, committed `4dac987`).
  Verified: 61/61 tests; standalone exe runs.
- Superseded by the core-parity release above — the net10 multi-target landed
  as part of `mdzip-core` `1.3.0` rather than a standalone `1.2.0`; no
  `v1.2.0` tag was ever published.
