# Core Parity: `mdzip-core` (C#) → `mdzip-core-js` (TS)

Method-level map of the gap between the C# core and the TypeScript core,
and the phased plan to close it. This is the detail behind the parity entry
in [roadmap.md](roadmap.md).

- **Baseline:** `mdzip-core` **1.2.0** (net10, just upgraded) · `mdzip-core-js` **1.3.2**
- **Target:** `mdzip-core` **1.3.0** = parity, to line up with core-js 1.3.x
- Legend: ✅ present · ⚠️ partial · ❌ missing in C#

The C# public surface today is `MdzArchive` (10 static methods): `Create`,
`CreateFromFiles`, `AddFile`, `RemoveFile`, `Extract`, `List`,
`ListDetailed`, `ReadManifest`, `ResolveEntryPoint`, `Validate`.

## API comparison

### 1. Read / inspect entries
| core-js | C# today | Gap |
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
| core-js | C# today | Gap |
|---|---|---|
| `validate` | `Validate` | ⚠️ simpler |
| `getValidationStatus` (valid/warning/error) | `ValidationResult` (bool-ish) | ❌ tri-state status |
| `validateManifest` | (inline in `Validate`) | ⚠️ not exposed |
| `validateArchivePath` | `PathValidator` | ⚠️ exists, align semantics |

### 3. Mutate files
| core-js | C# today | Gap |
|---|---|---|
| `addFile` | `AddFile` | ✅ |
| `removeFile` | `RemoveFile` | ✅ |
| `removeFiles` (batch) | — | ❌ |
| `updateFiles` (atomic multi add+remove) | — | ❌ atomic batch |

### 4. Manifest editing
| core-js | C# today | Gap |
|---|---|---|
| `createManifest` / `buildManifestFromOptions` | (internal to `Create`) | ⚠️ not standalone |
| `updateManifest` | — | ❌ read-only today |
| `splitManifestMetadata` (editable vs reserved) | — | ❌ |

### 5. Packaging
| core-js | C# today | Gap |
|---|---|---|
| `Create` / `CreateFromFiles` | `Create` / `CreateFromFiles` | ✅ basic |
| `buildArchive` (options, progress, warnings, file-map, modes) | — | ❌ rich packager |
| `buildGeneratedIndex` | — | ❌ auto index |
| `makeUniqueArchivePath` | — | ❌ |

### 6. Assets
| core-js | C# today | Gap |
|---|---|---|
| `classifyAssetKind` (image/audio/video/font/data/other) | — | ❌ |
| `inferMimeType` / `IMAGE_MIME_TYPES` | — | ❌ |
| `isPreviewableAsset` | — | ❌ |
| `findOrphanedAssets` (missing / unreferenced) | — | ❌ high value |

### 7. Workspace (editor model)
| core-js | C# today | Gap |
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

- `1.2.0` — net10 (done).
- `1.3.0` — parity complete, released together with cli, lining up with
  core-js 1.3.x. Phases land as internal progress; cut `1.3.0` at the end
  (or ship intermediate `1.2.x` previews — owner's call).
