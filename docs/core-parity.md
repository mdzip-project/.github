# Core Parity: `mdzip-core` (C#) → `mdzip-core-js` (TS)

Method-level map of the gap between the C# core and the TypeScript core,
and the phased plan to close it.

- **Status: parity shipped and exposed in the CLI — still true as of
  2026-09-12.** Current versions: `mdzip-core` (now published as
  **`MDZip.Core`**) **1.4.0** · `mdzip-core-js` **1.5.0** · `mdzip-cli`
  **1.3.2**, whose `mdz`/`mdz.Tests` projects already reference
  `MDZip.Core 1.4.0` (current — not behind). The new commands (`cat`,
  `assets`, `manifest`, `workspace`, `info`) have shipped since `v1.3.0`.
  **Re-verified 2026-09-12** (this doc had drifted to citing the older
  1.3.3/1.3.3/1.3.0 trio as current): every core-js release since 1.3.3
  was checked against the C# side and found to need no port —
  - `mdzip-core` **1.4.0** — package rename only (`mdzip-core` →
    `MDZip.Core`, to align with the npm scoped-package naming); no API
    change.
  - `mdzip-core-js` **1.4.0** — added a browser IIFE bundle for
    non-bundler consumers (e.g. loading via `@require` from a CDN). Pure
    JS distribution concern; nothing to port.
  - `mdzip-core-js` **1.5.0** — made `extractImageReferences` a public
    static method (consolidating a regex previously duplicated across
    several JS packages), switched `deflateRawBytes()` from
    `CompressionStream` to `fflate` (a JS/Electron-webview-specific
    per-call overhead fix), and cached per-entry sizes lazily instead of
    rescanning on every `open()`. C#'s `MdzArchive.ExtractMarkdownImageReferences`
    already does the same dual markdown-`![]()`-plus-raw-`<img src>`
    matching (checked side by side) — it just isn't public, and a check
    of `mdzip-cli`/`mdzip-win-prev` found no duplicated copy of that logic
    on the .NET side the way JS had, so there's no equivalent reason to
    expose it. The compression-backend and caching changes are specific
    to problems that don't exist in .NET's `System.IO.Compression`.
- **Merged 2026-07-08.** The parity branch stack was fast-forwarded into
  `main` (now at `f782bc3`, v1.3.3) and the working branches deleted; the
  default branch matches what's released. Nothing outstanding.
- **Core implementation status:** Phases 1-6 implemented and verified in
  `mdzip-core` on the parity branch stack. Latest verification:
  `dotnet test mdz-core.slnx -c Release` passed 68/68 tests for both
  `net8.0` and `net10.0`.
- Legend: ✅ present · ⚠️ partial · ❌ missing in C#

The original C# public surface was `MdzArchive` (10 static methods): `Create`,
`CreateFromFiles`, `AddFile`, `RemoveFile`, `Extract`, `List`,
`ListDetailed`, `ReadManifest`, `ResolveEntryPoint`, `Validate`. The parity
branch stack expands that surface with read/inspect, validation, manifest
editing, batch mutation, packaging, asset, orphan-analysis, and workspace APIs.

## Implementation status

| Phase | `mdzip-core` status | Commit |
|---|---|---|
| **1** read/inspect | Implemented and tested | `1722d21` |
| **2** validation helpers | Implemented and tested | `0b80de1` |
| **3** manifest editing | Implemented and tested | `f403061` |
| **4** mutation/packaging | Implemented and tested | `f9d5671` |
| **5** assets/orphan detection | Implemented and tested | `afa37c0` |
| **6** workspace | Implemented and tested | `7ca50b7` |

CLI exposure shipped in `mdzip-cli` `v1.3.0` (see its `CHANGELOG.md`), using the
NuGet/local-feed workflow in [dotnet-workflow.md](dotnet-workflow.md).

## API comparison

The tables below preserve the original gap map from before the parity branch
stack. See [Implementation status](#implementation-status) for the current
`mdzip-core` implementation state.

### 1. Read / inspect entries
| core-js | C# baseline | Original gap |
|---|---|---|
| `open` | (path-based statics) | ✅ different model, ok |
| `readManifest` | `ReadManifest` | ✅ |
| `listPaths` / `listEntries` | `List` / `ListDetailed` | ✅ ≈ |
| `resolveEntryPoint` | `ResolveEntryPoint` | ✅ |
| `readText` / `readBytes` / `readBase64` / `readDataUri` | `Extract` (to disk only) | ❌ in-memory typed reads |
| `hasEntry` / `findEntry` | — | ❌ |
| `resolveMode` (document/project) | — | ❌ |
| `buildPathTree` | — | ❌ hierarchical tree |

### 2. Validate
| core-js | C# baseline | Original gap |
|---|---|---|
| `validate` | `Validate` | ⚠️ simpler |
| `getValidationStatus` (valid/warning/error) | `ValidationResult` (bool-ish) | ❌ tri-state status |
| `validateManifest` | (inline in `Validate`) | ⚠️ not exposed |
| `validateArchivePath` | `PathValidator` | ⚠️ exists, align semantics |

### 3. Mutate files
| core-js | C# baseline | Original gap |
|---|---|---|
| `addFile` | `AddFile` | ✅ |
| `removeFile` | `RemoveFile` | ✅ |
| `removeFiles` (batch) | — | ❌ |
| `updateFiles` (atomic multi add+remove) | — | ❌ atomic batch |

### 4. Manifest editing
| core-js | C# baseline | Original gap |
|---|---|---|
| `createManifest` / `buildManifestFromOptions` | (internal to `Create`) | ⚠️ not standalone |
| `updateManifest` | — | ❌ read-only today |
| `splitManifestMetadata` (editable vs reserved) | — | ❌ |

### 5. Packaging
| core-js | C# baseline | Original gap |
|---|---|---|
| `Create` / `CreateFromFiles` | `Create` / `CreateFromFiles` | ✅ basic |
| `buildArchive` (options, progress, warnings, file-map, modes) | — | ❌ rich packager |
| `buildGeneratedIndex` | — | ❌ auto index |
| `makeUniqueArchivePath` | — | ❌ |

### 6. Assets
| core-js | C# baseline | Original gap |
|---|---|---|
| `classifyAssetKind` (image/audio/video/font/data/other) | — | ❌ |
| `inferMimeType` / `IMAGE_MIME_TYPES` | — | ❌ |
| `isPreviewableAsset` | — | ❌ |
| `findOrphanedAssets` (missing / unreferenced) | — | ❌ high value |

### 7. Workspace (editor model)
| core-js | C# baseline | Original gap |
|---|---|---|
| `openWorkspace` / `buildWorkspace` | — | ❌ whole subsystem |
| `createWorkspaceAssetFromFile` / `exportWorkspaceAsset` | — | ❌ |

> Internal helpers in core-js (`basename`, `dirname`, `normalizePath`,
> `sanitise*`, `globMatch`, `sortArchivePaths`, …) are implementation details;
> C# can mirror behaviour without exposing equivalents.

## Phased plan (core first, then CLI)

Each phase = implement in C# + xUnit tests, on a branch. CLI exposure follows
once core is packed/released (cli consumes core via NuGet — see
[workspace.md](workspace.md) Review note #5).

| Phase | Capability | New/!changed CLI surface |
|---|---|---|
| **1** | Typed entry reads, `hasEntry`/`findEntry`, `resolveMode`, `buildPathTree` | richer `mdz inspect` (tree, mode); `mdz cat <entry>` |
| **2** | Tri-state validation (`getValidationStatus`, `validateManifest`) | `mdz validate` shows warning vs error |
| **3** | Manifest editing (`updateManifest`, split editable/reserved) | `mdz manifest get/set` |
| **4** | Atomic mutation (`updateFiles`, `removeFiles`) + rich `buildArchive` | richer `mdz create`/`mdz edit` |
| **5** | Asset model (`classifyAssetKind`, `inferMimeType`, `findOrphanedAssets`) | `mdz doctor` / `mdz assets --orphans` |
| **6** | Workspace (`openWorkspace`, `buildWorkspace`, asset export) | `mdz workspace inspect/export` |

`mdz info` (app + core + .NET runtime + OS) is independent and can land
anytime — fold it into Phase 1's CLI work.

## Versioning

- `1.3.0` — parity complete (folding in the net10 multi-target work), released
  together with `mdzip-cli` `1.3.0`, lining up with core-js 1.3.x. Done.
- `1.3.3` — raw-`<img>` orphan-detection fix, released together with
  `mdzip-core-js` 1.3.3. Done; `mdzip-cli` consumes it without needing its own
  version bump.
- `1.4.0` — renamed the published package from `mdzip-core` to `MDZip.Core`
  (no API change). `mdzip-cli` bumped its `PackageReference` to `1.4.0`.
  core-js's own 1.4.0 (browser IIFE bundle) and 1.5.0 (public
  `extractImageReferences`, `fflate`-based compression, entry-size caching)
  were checked and found to be JS-runtime-specific or already matched in
  C# — no corresponding `mdzip-core` release needed. See the Status note
  above for the detail; re-verified 2026-09-12.
