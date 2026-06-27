# MDZip Roadmap

Cross-repository work only — initiatives that span more than one repo.
Single-repo features live in that repo. See
[the coordination strategy](../MDZip_GitHub_Organization_Coordination_Strategy.md).

## In progress

### Core parity: C# core → core-js (then expose in CLI)
Bring `mdzip-core` (C#) to functional parity with `mdzip-core-js` (TS), then
surface the new capabilities in `mdzip-cli`. Detailed gap + phased plan:
[core-parity.md](core-parity.md).

- **Repos:** `mdzip-core` (implement), `mdzip-cli` (expose), references
  `mdzip-core-js` (parity target), possibly `mdzip-spec` (if behaviours diverge).
- **Dependency:** cli consumes core via NuGet `PackageReference`, so each core
  capability must be packed/released before cli can expose it (local-feed
  pattern for testing — see [workspace.md](workspace.md) Review note #5).
- **Target version:** `mdzip-core` / `mdzip-cli` **1.3.0** at parity, lining up
  with `mdzip-core-js` 1.3.x.
- **Phases:** read/inspect → validation → manifest editing → mutation/packaging
  → assets/orphan-detection → workspace (see core-parity.md).
- **Status:** mapped, not started. Awaiting scope/sequencing decision.

## Done

### .NET 10 upgrade (mdzip-core + mdzip-cli) — 2026-06-27
- `mdzip-core` → multi-target `net8.0;net10.0`, **v1.2.0** (branch `upgrade/net10`,
  committed `b4b392b`). Verified: 41/41 tests on each TFM.
- `mdzip-cli` → `net10.0`, **v1.2.0** (branch `upgrade/net10`, committed `4dac987`).
  Verified: 61/61 tests; standalone exe runs.
- **Pending release ordering:** publish core 1.2.0 to NuGet (tag `v1.2.0`),
  then bump cli's `mdzip-core` reference 1.1.0 → 1.2.0. Branches not yet merged.
