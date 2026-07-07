# Core Parity: `mdzip-core` (C#) → `mdzip-core-js` (TS)

Method-level map of the gap between the C# core and the TypeScript core,
and the phased plan to close it. This is the detail behind the parity entry
in [roadmap.md](roadmap.md).

- **Status: parity shipped and exposed in the CLI.** `mdzip-core` **1.3.3**
  (parity landed at `v1.3.0`, plus the 1.3.3 raw-`<img>` orphan-detection fix)
  · `mdzip-core-js` **1.3.3** · `mdzip-cli` **1.3.0** already ships the new
  commands (`cat`, `assets`, `manifest`, `workspace`, `info`) and consumes
  `mdzip-core 1.3.3` via `PackageReference`.
- **Outstanding: branch not merged.** The releases above came from the parity
  branch stack ending at `parity/phase6-workspace` (`7ca50b7`), which is
  **still not merged into `main`** — `main` sits at the pre-parity commit
  `7dfda11` (2026-04-12). Merge the stack so the default branch matches what's
  actually released.
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
