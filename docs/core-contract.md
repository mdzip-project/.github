# Core library contract

Contract draft 0.1, 2026-10-25. Defines the required functionality of first-party
MDZip core libraries in JavaScript, .NET and Python. This draft is for owner
review; it is not a change to the file-format specification or a requirement
that third-party MDZip readers implement an editor SDK.

The [specification](https://github.com/mdzip-project/mdzip-spec/blob/main/SPEC.md), especially sections 4–6, 9, 13 and
14, governs archive conformance. This document defines the reusable library
operations first-party applications can rely on. Where a format rule and this
document disagree, the specification governs; report and correct the contract.
This document may make a spec SHOULD mandatory for first-party cores; that is a
deliberate tightening, not a disagreement. R7's built-in resource limits (spec
13.1) are one such case.

## Capability levels

| Level | Meaning | Parity obligation |
|---|---|---|
| Required baseline | Reusable archive read, inspect, validate, resolve, create and modify operations below | Every first-party core implements equivalent behavior |
| Optional extension | Additional reusable functionality justified by a consumer | No obligation to implement it elsewhere; implementations of the same advertised extension meet that extension's contract |
| Runtime integration | Language/platform delivery, I/O or host integration | Document supported forms and boundaries; no artificial equivalents in unrelated runtimes |

The baseline is deliberately not the union of all existing APIs. A feature is
not required just because one library ships it. Promote an extension to the
baseline only for a stated common consumer need, with owner-reviewed contract
changes, compatibility assessment and acceptance tests. Optional APIs already
in use remain supported according to their own compatibility policy; this
classification is not an instruction to remove them.

## Required baseline operations

The operation names are conceptual, not required method names. A class method,
function, property, dictionary or combination of existing operations can satisfy
them. Async/sync, context management and exception classes may differ.

| ID | Operation and inputs | Required observable result and failure behavior |
|---|---|---|
| R1 | Open/read an archive from a documented supported input | Accept supported ZIP entries and absent manifests according to the spec. Report malformed/unsupported input clearly. Keep document and asset bytes available through library APIs without making callers parse ZIP themselves. One supported input model suffices; bytes, streams, paths and browser objects need not all be supported everywhere. |
| R2 | Inspect entries and metadata | Enumerate stored paths and distinguish files/directories; determine whether an exact case/NFC-matched entry exists; read arbitrary file bytes and UTF-8 text; expose manifest metadata, entry point and effective mode. Missing entries and invalid text decoding have documented failures. Never silently substitute a differently cased file. Separate contains/find/tree/Base64 helpers are not required. |
| R3 | Resolve an archive link from a source document and target | Apply spec path matching, relative resolution, percent decoding and entry-point rules. Return distinguishable internal, URL/external or unresolved outcomes as appropriate, preserving fragments. Do not load remote resources or silently resolve an external path to an internal file. Host-backed outside/into-archive resolution is optional; without it, follow spec unresolved behavior. |
| R4 | Validate archive/manifest conformance and expose errors | Provide accessible findings for applicable ZIP/path/manifest/entry-point checks, including descriptive-field warnings and cover checks under spec rules. Distinguish failure from warnings and provide stable machine-readable spec codes when applicable through a property, result or accessor; no prescribed exception inheritance. An open-time rejection may satisfy an unrecoverable validation finding if documented. A separate standalone manifest validator or aggregate status helper is optional. Missing-image content scanning is an extension, not format validation. |
| R5 | Create an archive from named text/binary content and supplied metadata | Produce a conforming archive with the correct manifest/entry point and mode; apply path, encoding and text-normalization rules. Accept caller-supplied supported manifest metadata, including application provenance, without requiring direct convenience options. Return usable archive output or a documented output destination; no generated index, filesystem scan, progress model or workspace is required. |
| R6 | Modify an existing archive: add/replace/remove entries and update metadata | Keep unrelated stored paths and file contents unchanged, including unsupported file types, nested support files and directory entries. Preserve unknown manifest fields on rewrite, and preserve the resolved entry point unless explicitly changing it. A rejected operation must not replace the original with a partial archive. Sequential operations or a broader update API suffice; an atomic multi-operation batch convenience API is optional. Preserve spec recovery/reporting rules for pre-existing nonconformance. |
| R7 | Enforce spec safety boundaries | Enforce applicable malformed-path, traversal, duplicate/conflicting-entry, unsupported compression/version, symlink and untrusted-link rules. Apply built-in limits on entry count, total uncompressed bytes and compression ratio when reading (spec 13.1), checking actual decompressed bytes as well as declared sizes, and fail with a stable code when one is exceeded; fixed documented defaults suffice. Avoid exposing unsafe behavior as normal success. Making those limits configurable is a separate optional extension. |

### Shared defaults and result mapping

- Follow spec defaults: missing manifest allowed for reading; absent mode means
  document mode; creation writes the required manifest; declared invalid/missing
  entry points do not silently fall back; paths are case-sensitive after NFC.
- Preserve unknown data on modification. ZIP compression bytes/timestamps can
  change where the spec permits; unchanged entry paths and content cannot.
- Diagnostic prose and result containers can differ. Adapters compare operation
  outcome, stable error code, relevant location, warning/error category, paths,
  link meaning, metadata and entry contents. They must not hide different safety
  behavior or silently turn a failed operation into success.
- Ordering is not part of the baseline unless the operation documents it; tests
  compare entry sets where ordering has no meaning. Document text-decoding errors,
  input/output ownership, overwrite policy and failure atomicity for the native API.
- Conformance behavior applies to both document and project archives without
  requiring an application/editor workspace model or Markdown renderer.

## Optional extensions

These are capability groups, not mandatory additions or a claim that a complete
versioned extension contract already exists. Each implemented extension needs a
documented supported scope and tests. A missing extension is not a baseline gap;
advertising an extension but returning wrong results is still a defect.

| Extension | Examples | Conditional correctness requirements |
|---|---|---|
| Image analysis | Extract references, missing-image warnings, orphan detection | Use one consistent interpretation of rendered image references; code examples are not images. Match relative paths and trust boundaries. Document syntax coverage, scan modes, deduplication and cover retention. Never delete assets automatically as a side effect of analysis. |
| Workspace/editor model | Open/build workspace, lazy documents/assets, asset import/export | Preserve untouched text, binary assets and metadata; do not silently write empty lazy content. Document lifetime, materialization costs and opt-in content scans. |
| Asset presentation helpers | MIME inference, kind classification, previewability, data URI/Base64 | Document inference/fallback rules. Preview support is a runtime/consumer choice, not an archive-format restriction. |
| Packaging conveniences | Directory scans, filters, file mapping, generated index, unique paths, progress/warning model | Produce conforming output and document defaults. Preserve caller data; helper omissions do not prevent baseline creation. |
| Metadata/inspection conveniences | Standalone manifest builders/splitters, path trees, case suggestions, aggregate validation status | Agree with baseline paths/metadata/diagnostics; do not require new wrappers where existing native operations suffice. |
| Configurable resource limits | Caller-set entry count, declared/actual size, compression ratio, bounded reads | Builds on the built-in R7 limits. Document overrides and limit-exceeded outcomes; don't silently bypass an advertised limit. Compare matching policies, rather than requiring all runtimes to share numerical defaults. |
| Host link resolution | Links outside or into other archives with a filesystem host | Follow spec sections 9.4–9.6 and declared trust/permission boundaries; unsupported host context yields unresolved targets. |

Optional extension changes are checked against other libraries implementing that
same capability. Adding a workspace feature in JS does not require a Python
workspace implementation. Python's configurable limits do not automatically
require identical options in JS/.NET. A real consumer requirement may justify
either addition in a separately scoped issue.

## Runtime integrations

Examples: browser IIFE bundles and Blob inputs, Node filesystem entry points,
.NET stream/path overloads, Python file objects/context managers, safe filesystem
extraction, native async and packaging/distribution conventions. Each runtime
documents what it offers. Supported extraction must be safe; extraction itself
is not required when the core exposes entry reads. Raw bytes and text must remain
accessible through the supported native API, but a path-based implementation is
not deficient solely because another library accepts in-memory ZIP bytes.

## Acceptance and change control

1. Map R1–R7 to each library's public operations, documenting native adaptations.
   Unmapped requirements are baseline gaps; missing conveniences/extensions are not.
2. Run the released spec fixtures plus shared baseline operation fixtures through
   public APIs. Include no-manifest input, case/NFC, links/fragments, invalid and
   ambiguous entry points, unsafe/duplicate paths, unsupported versions, manifest
   warnings, arbitrary assets, empty directories, unknown fields, failed writes and
   resource-limit cases (too many entries, forged declared sizes, extreme ratios).
3. Declare optional capabilities and run only the corresponding extension suites.
   An unsupported extension is explicitly not applicable, not failed baseline
   parity. A declared extension may not skip its failing cases silently.
4. Compare meaningful outputs, not generated timestamps, compression bytes,
   language object shapes or prose. Verify published artifacts before claiming a
   released implementation meets the contract.
5. Record required gaps and consumer-justified optional work in owning repositories.
   Before introducing a new mandatory operation, revise this contract and fixtures
   for owner review; don't infer a requirement from another library's method list.

The [parity plan](core-parity.md) maps current implementations and issue scope to
this contract. Shared baseline/extension fixture work is tracked in
[mdzip-spec #9](https://github.com/mdzip-project/mdzip-spec/issues/9). The fixture
suite is not implemented yet; source audits alone are not acceptance evidence.
