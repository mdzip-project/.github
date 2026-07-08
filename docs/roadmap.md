# MDZip Roadmap

Cross-repository work only — initiatives that span more than one repo.
Single-repo features live in that repo. See
[the coordination strategy](../MDZip_GitHub_Organization_Coordination_Strategy.md).

## In progress

*(nothing currently — see Planned)*

## Planned

### Related-format interoperability (importers)
Acknowledge prior art, compete on ecosystem, cooperate on interop —
build importers rather than compatibility hacks, keeping the MDZip
specification independent.

- **`mdz import`** in `mdzip-cli`, TextBundle/TextPack first (the
  closest conceptual relative), with pluggable importers later
  (markdown folders, generic ZIPs of markdown).
- **Evaluate mutual compatibility** with the independent Rust MDZ
  project (`wflixu/mdz` / `mdz-rs`), whose layout converges on the
  same design (ZIP, `index.md`, `manifest.json`, same extension).
- **Repos:** `mdzip-cli` (import command), `mdzip-core`/`mdzip-core-js`
  (format readers), references `mdzip-spec`.
- Public positioning lives at
  [mdzip.org/docs/related-formats.html](https://mdzip.org/docs/related-formats.html),
  which points at this entry as the documented plan.

## Done

### Parity branch stack merged into `main` — 2026-07-08
`mdzip-core`'s `main` fast-forwarded from the pre-parity `7dfda11`
(2026-04-12) to `f782bc3` (v1.3.3); 69/69 tests pass on both `net8.0`
and `net10.0`. The `parity/phase1…phase6` and `upgrade/net10` branches
(all contained in the merged history) were deleted locally and on
origin. The default branch now matches what's released.

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
