# MDZip Roadmap

Cross-repository work only — initiatives that span more than one repo.
Single-repo features live in that repo. See
[the hub architecture](hub-architecture.md).

## In progress

### NuGet: `MDZip.Core` rename + "MDZip" org ownership + prefix reservation
Move the .NET package from `mdzip-core` to the dotted `MDZip.Core` ID
(the `MDZip` prefix reservation cannot cover a hyphenated ID) and
publish under a new **`MDZip`** NuGet organization instead of the
personal account. Full phased plan:
[nuget-mdzip-core-rename.md](nuget-mdzip-core-rename.md).

- **Done (2026-07-08):** `MDZip` org created; `MDZip.Core` 1.4.0
  published (license, icon, `MDZip` authorship) via NuGet Trusted
  Publishing (OIDC, no API key); `mdzip-cli` bumped to consume it and
  released as `v1.3.2`; docs swept.
- **Remaining (manual, Kyle only):** deprecate legacy `mdzip-core` on
  nuget.org pointing at `MDZip.Core`; email account@nuget.org to
  reserve the `MDZip` prefix.
- **Repos:** `mdzip-core` (metadata, publish), `mdzip-cli` (package
  reference), plus manual nuget.org account/email steps.

## Planned

### Related-format interoperability (importers)
Acknowledge prior art, compete on ecosystem, cooperate on interop —
build importers rather than compatibility hacks, keeping the MDZip
specification independent.

- **`mdz import`** in `mdzip-cli`, TextBundle/TextPack first (the
  closest conceptual relative), with pluggable importers later.
- **Candidate import sources** (running list; pluggable-importer
  targets, roughly ordered by closeness to the format):
  - TextBundle / TextPack — closest relative; first implementation.
  - Rust MDZ archives (`wflixu/mdz` / `mdz-rs`) — same extension,
    converging layout; an importer doubles as the compatibility
    evaluation below.
  - Markdown folders and generic ZIPs of markdown — includes Obsidian
    vaults and Notion's markdown+assets export.
  - AI project/chat exports — ChatGPT/OpenAI, Claude, Gemini data
    exports: hostile JSON zips today; converting one into a browsable
    archive (chats as markdown, documents alongside, a narrating
    `index.md`) is the showcase use case for the importer idea.
  - Google Takeout — per-product payloads, so per-product importers
    (Keep first if attempted; Docs exports are already zips of HTML/md).
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
