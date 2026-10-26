# Core library parity

This plan measures JavaScript, .NET and Python against the draft
[core library contract](core-contract.md), not against the union of their APIs.
The contract defines what is required, what is optional, and how results are
compared; this document maps each core to it and tracks the remaining work.

**Status, 2026-10-26:** required-baseline acceptance has not yet been verified
across all three cores. All implement spec 1.2.0, but passing format fixtures
alone does not prove the public operation contract. The two known required gaps,
Python directory enumeration and built-in ZIP-bomb limits in JS and .NET (below),
are fixed on each core's unreleased `feat/spec-1.2.1` branch, and all three pass
T-018 there. The older completed JS/.NET effort is in
the [historical notes](core-parity-history.md).

This document is engineering reference. Work is tracked in the linked issues in
each owning repository, and live status is on the private planning board.
Contract draft 0.1 and the issue scope below await owner review. Neither is a
mandate to implement optional extensions everywhere.

## Source audit and required-baseline mapping

Reviewed sources: core-js 2.1.2 (`src/mdz-core.ts`, Node export), .NET 2.0.1
(`Core/MdzArchive.cs`, `MdzSpec.cs`, `MdzLinks.cs`, manifest models), Python
0.1.0 (`src/mdzip_core/__init__.py`, `archive.py`, `writer.py`, `manifest.py`,
`links.py`, `paths.py`). This is a source review, not verification of released
artifacts, and no new cross-language behavior tests were run for it.

| Contract operation | JavaScript | .NET | Python | Evidence still required |
|---|---|---|---|---|
| R1 open/read | `MdzArchiveCore.open` | Static `MdzArchive` methods that take an `archivePath` (no separate open step) | `open` / `MdzArchive.open` | Matching accept/reject behavior on supported inputs. Stream/byte overloads are not required. |
| R2 entries, bytes/text, metadata | `listPaths`/`listEntries`, `findEntry`/`hasEntry`, reads, manifest/entry point/mode | `List`/`ListDetailed`, `FindEntry`/`HasEntry`, reads, manifest/entry point/mode | `files`, `find`, `in`, `info`, `read_bytes`/`read_text`, `manifest`, `entry_point`, `mode` | **Gap, fixed unreleased:** Python had no public directory listing and `update` dropped directory entries; now `directories`, `find_directory`, and `update` keeps them ([Python #2](https://github.com/mdzip-project/mdzip-core-python/issues/2)). All cores: test directory and special-entry behavior. |
| R3 link resolution | `resolveLink` | `ResolveLink` / `MdzLinks` | `resolve_link` | Same internal path/fragment and unresolved results. Host-backed resolution is declared separately. |
| R4 validation/errors | `validate`, `MdzError.code` | `Validate` results, `MdzSpec.ErrorCode` | `validate` diagnostics, `MdzError.code` | Align codes and severity; document open-time rejections. Exception types may differ. |
| R5 conforming creation | `buildArchive` | `Create` / `CreateFromFiles` / `BuildArchive` | `create` | Required output metadata and caller-supplied manifest fields. |
| R6 safe modification | `updateFiles` (manifest via `MdzUpdateFilesOptions.manifest`) | `UpdateFiles`, metadata updates | `update(write=, remove=, manifest=, entry_point=)` | Untouched contents, directories, unknown fields and entry point preserved; a failed write leaves the original intact. |
| R7 safety | Path/ZIP/manifest/link rules | Archive/path/link checks | Open/read checks, `Limits`, host rules | **Gap, fixed unreleased:** JS and .NET had no entry-count, size or ratio limits and didn't verify reads ([JS #10](https://github.com/mdzip-project/mdzip-core-js/issues/10), [.NET #9](https://github.com/mdzip-project/mdzip-core/issues/9), [.NET #10](https://github.com/mdzip-project/mdzip-core/issues/10)); now built-in limits and checked reads. Python enforces them and now wraps corrupt reads ([Python #4](https://github.com/mdzip-project/mdzip-core-python/issues/4)). All cores: shared malformed/unsafe input cases. |

Apart from those two gaps, every operation has a mapping. Native
shapes count: .NET's `MdzSpec.ErrorCode` accessor meets R4 without a new
exception type, and Python's properties and `update` meet R2 and R6 without
JS-style wrappers. Edge-case behavior in every core still needs the shared
fixtures before it can be called verified.

## Rust core (new)

`mdzip-core-rust` (crate `mdzip-core`, 0.1.0 on crates.io) was added and
released on 2026-10-26, prompted by a Rust editor planning `.mdz` support. It was written
against this contract from the start, so it has no legacy API to map:

| Contract operation | Rust |
|---|---|
| R1 open/read | `MdzArchive::open` (bytes), `open_path`, `open_with_limits` |
| R2 entries, bytes/text, metadata | `files`, `directories`, `special_files`, `find`, `find_directory`, `entry_info`, `read_bytes`/`read_text`, `manifest`, `entry_point`, `mode` |
| R3 link resolution | `MdzArchive::resolve_link`, `resolve_link` with a `LinkHost` |
| R4 validation/errors | `validate()` diagnostics, `MdzError::code` |
| R5 conforming creation | `create`, `create_from_directory` |
| R6 safe modification | `MdzArchive::update` with `Update` |
| R7 safety | Path/entry-set/overlap/symlink rules on open; built-in `Limits` (configurable) |

It passes the spec v1.2.1 fixtures (T-001–T-018 except rendering-only T-016,
and P-001–P-008) on Rust 1.85 and stable, and archives it writes open in the
Python and JS cores (checked by hand, 2026-10-26). Optional extensions:
configurable limits, host link resolution, packaging filters. Like the others,
it still needs the shared baseline suite from
[Spec #9](https://github.com/mdzip-project/mdzip-spec/issues/9) before it can be
called verified.

## Optional extensions and runtime differences

| Capability | Current source state | Classification and owning issue |
|---|---|---|
| Image-reference extraction/orphan analysis | JS present (code-example handling fixed in 2.1.2); .NET present with a code-example bug; Python absent | Optional extension. [.NET #6](https://github.com/mdzip-project/mdzip-core/issues/6) fixes a bug in the existing capability and doesn't need a new public extractor. [Python #1](https://github.com/mdzip-project/mdzip-core-python/issues/1) waits for a Python consumer. |
| Missing-image warnings | JS present; .NET/Python absent | Optional content analysis, not format validation. [.NET #4](https://github.com/mdzip-project/mdzip-core/issues/4) is an enhancement. |
| MIME/kind/previewability, Base64/data URI, path trees | JS/.NET helpers present; Python limited | Optional helpers, added when a consumer needs them. [Python #2](https://github.com/mdzip-project/mdzip-core-python/issues/2) covers the baseline mapping and the directory gap, not these helpers. |
| Rich packaging, generated index, file mapping, filters, progress | JS/.NET richer; Python has basic creation and directory filtering | Optional conveniences. R5 is judged by conforming output, not matching packaging options. |
| Workspace/editor model, lazy asset import/export | JS/.NET present; Python absent | Optional extension. [Python #3](https://github.com/mdzip-project/mdzip-core-python/issues/3) is deferred until a consumer needs it. Existing implementations must keep preserving untouched and lazy content. |
| Configurable resource limits | Python lets callers set its limits; JS/.NET have no limits at all yet | Optional extension on top of the required built-in limits (R7). The earlier configurable-limits issues (JS #9, .NET #8) are closed, superseded by [JS #10](https://github.com/mdzip-project/mdzip-core-js/issues/10) and [.NET #9](https://github.com/mdzip-project/mdzip-core/issues/9), which add fixed limits only. |
| Archive input types and filesystem extraction | Bytes, paths, browser objects and file objects differ by runtime | Runtime integration. No universal input requirement; extraction is optional but must be safe where offered. |
| Exception types, application-provenance option, manifest-splitting helpers | API shapes differ | Runtime/convenience choices. [.NET #7](https://github.com/mdzip-project/mdzip-core/issues/7) audits .NET's baseline mapping; these APIs don't need rewriting to match. |

Reclassifying a capability as optional doesn't justify removing an existing API
or protection, and a capability that returns wrong results is still a bug.

## Fixtures and acceptance

Acceptance rules are in the contract's
[acceptance and change control](core-contract.md#acceptance-and-change-control)
section. [mdzip-spec #9](https://github.com/mdzip-project/mdzip-spec/issues/9)
builds the shared suite with separate baseline and optional profiles. For
parity work specifically:

- Image-analysis cases must cover the .NET #6 bug: inline, fenced and indented
  code examples are not images, and real images are still found.
- Workspace cases check that untouched and lazy content survives a save.
- Baseline limit cases are spec test `T-018` (`resource-limit-cases.json`, released
  in spec v1.2.1): forged sizes, an extreme ratio and
  overlapping entries, against reference limits no default may exceed. Configurable-limit cases compare cores set
  to the same policy, not default numbers.
- Keep the spec and local regression suites running while shared profiles are
  built. Existing capabilities can get bug fixes without waiting for the shared suite.

## Implementation order

| Step | Required work | Optional work, kept separate |
|---|---|---|
| 1 | Owner reviews contract R1–R7 and the mapping table above | Identify actual consumers before scheduling extensions |
| 2 | Define baseline fixtures in [Spec #9](https://github.com/mdzip-project/mdzip-spec/issues/9), including how each core declares its optional profiles; audit [Python #2](https://github.com/mdzip-project/mdzip-core-python/issues/2) and [.NET #7](https://github.com/mdzip-project/mdzip-core/issues/7) against them | Fix the .NET image-analysis bug in [#6](https://github.com/mdzip-project/mdzip-core/issues/6) |
| 3 | Close required gaps (Python directory enumeration, JS/.NET built-in limits, plus any the fixtures expose); run the baseline suite on all three cores | Missing-image warnings, Python image/workspace APIs and configurable JS/.NET limits stay consumer-driven |
| 4 | Verify published packages and consumer behavior; record evidence per core | Run the profile for each implemented extension; no release waits on every extension |

Each repository keeps its own branch, PR, CI and release gates, and lists its
dependency on the shared baseline fixtures in its `UPSTREAM_REQUESTS.md`. There
is no central tracking issue or shared release train.

## Maintenance

- Check baseline fixes across all three cores. Check optional fixes only
  against the other cores that implement that extension.
- An API added to one core doesn't widen the contract. Making something required
  takes a reviewed contract change, updated fixtures and a compatibility plan.
- Keep the mapping table current: native API names, supported optional scope,
  fixture version and verified released versions. Don't claim completion from a
  source review alone.
- Package versions stay independent. After a release, check the registry
  artifact and update downstream pins and the status board; consumer releases
  are separate.
- Release guides are untracked local files in each repo: `RELEASE.md` in
  `mdzip-core`, `How to Release.md` and `How to Publish to NPM.md` in
  `mdzip-core-js`; `mdzip-core-python` has none yet. .NET build details are in
  [dotnet-workflow.md](dotnet-workflow.md).
