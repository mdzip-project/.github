# MDZip Roadmap

Cross-repository work only — initiatives that span more than one repo.
Single-repo features live in that repo. See
[the hub architecture](hub-architecture.md).

## In progress

_Nothing in progress right now._

## Planned

### WinGet distribution: CLI version catch-up, Studio submission — logged 2026-07-24
Get MDZip properly current on WinGet: bring the already-published
`MDZip.Cli` package up to date, then get `MDZip.Studio` submitted for
the first time — gated on finishing outstanding Studio work, which is
itself gated on the `mdzip-editor` issues Studio embeds via
`@mdzip/editor`.

Ordered steps:

1. **CLI version bump** — independent of everything below. Manifest
   authored ([mdzip-cli@af40194](https://github.com/mdzip-project/mdzip-cli/commit/af40194));
   PR open at
   [microsoft/winget-pkgs#407510](https://github.com/microsoft/winget-pkgs/pull/407510)
   (opened 2026-07-24), awaiting CI + maintainer merge. Prior version:
   `MDZip.Cli` **1.3.0**
   ([microsoft/winget-pkgs#396154](https://github.com/microsoft/winget-pkgs/pull/396154),
   merged 2026-07-15).
2. **`mdzip-editor` open issues** — Studio embeds `@mdzip/editor`, so
   these should land (and Studio bump its dependency) before Studio
   work is considered done, to avoid reworking Studio against a moving
   dependency:
   [#13](https://github.com/mdzip-project/mdzip-editor/issues/13),
   [#35](https://github.com/mdzip-project/mdzip-editor/issues/35),
   [#36](https://github.com/mdzip-project/mdzip-editor/issues/36),
   [#37](https://github.com/mdzip-project/mdzip-editor/issues/37).
   (#34 shipped 2026-07-22 in `@mdzip/editor` 1.3.20, closed 2026-07-24 —
   already done before this initiative was logged.)
3. **`mdzip-studio` open issues** — addressed after step 2:
   [#1](https://github.com/mdzip-project/mdzip-studio/issues/1),
   [#2](https://github.com/mdzip-project/mdzip-studio/issues/2),
   [#4](https://github.com/mdzip-project/mdzip-studio/issues/4),
   [#5](https://github.com/mdzip-project/mdzip-studio/issues/5),
   [#8](https://github.com/mdzip-project/mdzip-studio/issues/8),
   [#9](https://github.com/mdzip-project/mdzip-studio/issues/9),
   [#10](https://github.com/mdzip-project/mdzip-studio/issues/10),
   [#11](https://github.com/mdzip-project/mdzip-studio/issues/11),
   [#12](https://github.com/mdzip-project/mdzip-studio/issues/12),
   [#13](https://github.com/mdzip-project/mdzip-studio/issues/13).
4. **Studio WinGet submission** — first-time `MDZip.Studio` package to
   `winget-pkgs`, once steps 2–3 are in an acceptable state (not
   necessarily every issue closed — revisit scope when step 2 is done).

- **Repos:** `mdzip-cli`, `mdzip-editor`, `mdzip-studio`; external
  `microsoft/winget-pkgs`.

### Related-format interoperability (importers)
Acknowledge prior art, compete on ecosystem, cooperate on interop —
build importers rather than compatibility hacks, keeping the MDZip
specification independent.

- **`mdz import`** in `mdzip-cli`, TextBundle/TextPack first (the
  closest conceptual relative), with pluggable importers later.
- **Candidate import sources** (running list; pluggable-importer
  targets, roughly ordered by closeness to the format):
  - TextBundle / TextPack — closest relative; first implementation.
    Tracked: [mdzip-cli#4](https://github.com/mdzip-project/mdzip-cli/issues/4).
  - Rust MDZ archives (`wflixu/mdz` / `mdz-rs`) — same extension,
    converging layout; an importer doubles as the compatibility
    evaluation below. No issue yet.
  - Markdown folders and generic ZIPs of markdown — includes Obsidian
    vaults and Notion's markdown+assets export. No issue yet.
  - AI project/chat exports — ChatGPT/OpenAI, Claude, Gemini data
    exports: hostile JSON zips today; converting one into a browsable
    archive (chats as markdown, documents alongside, a narrating
    `index.md`) is the showcase use case for the importer idea.
    Tracked: [mdzip-cli#5](https://github.com/mdzip-project/mdzip-cli/issues/5).
  - Google Takeout — per-product payloads, so per-product importers
    (Keep first if attempted; Docs exports are already zips of HTML/md).
    No issue yet.
- **Evaluate mutual compatibility** with the independent Rust MDZ
  project (`wflixu/mdz` / `mdz-rs`), whose layout converges on the
  same design (ZIP, `index.md`, `manifest.json`, same extension).
- **Repos:** `mdzip-cli` (import command), `mdzip-core`/`mdzip-core-js`
  (format readers), references `mdzip-spec`.
- Public positioning lives at
  [mdzip.org/docs/related-formats.html](https://mdzip.org/docs/related-formats.html),
  which points at this entry as the documented plan.

## Done

### NuGet: `MDZip.Core` rename + "MDZip" org ownership + prefix reservation — 2026-07-09
Moved the .NET package from `mdzip-core` to the dotted `MDZip.Core` ID
(the `MDZip` prefix reservation cannot cover a hyphenated ID), published
under a new **`MDZip`** NuGet organization instead of the personal
account, deprecated the legacy package, and got the `MDZip` prefix
reserved. Full phased plan:
[nuget-mdzip-core-rename.md](nuget-mdzip-core-rename.md).

- **Repos:** `mdzip-core` (metadata, publish), `mdzip-cli` (package
  reference), plus manual nuget.org account/email steps.
- **Shipped:** `MDZip.Core` 1.4.0 published (Apache-2.0 license, icon,
  `MDZip` authorship) via NuGet Trusted Publishing (OIDC, no API key);
  `mdzip-cli` bumped to consume it, released as `v1.3.2`; legacy
  `mdzip-core` deprecated on nuget.org pointing at `MDZip.Core`; `MDZip`
  prefix reservation confirmed live (verified 2026-07-09, see
  [nuget-id-prefix-reservation.md](nuget-id-prefix-reservation.md)).
- **Not pursued:** NuGet popularity-transfer (298 lifetime downloads
  don't justify it); an "MDZip" trademark remains a separate optional
  follow-on.

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
