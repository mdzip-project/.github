# NuGet: `mdzip-core` → `MDZip.Core` + owner → "MDZip Project"

**Goal:** move the .NET package to the dotted ID scheme so the `MDZip`
prefix reservation actually covers it (see
[nuget-id-prefix-reservation.md](nuget-id-prefix-reservation.md) — a
hyphen is part of the token, so reserving `MDZip` would *not* protect
`mdzip-core`), and make the package's public owner **MDZip Project**
instead of the personal `kylemwhite` account.

**Reality check:** NuGet package IDs cannot be renamed in place. This
is publish-new (`MDZip.Core`) + deprecate-old (`mdzip-core`). IDs also
can't be deleted, only unlisted — so the ID choice is one-way.

## Current state (verified 2026-07-08)

- nuget.org: `mdzip-core` 1.3.3, sole owner `kylemwhite`, 298 total
  downloads (tiny blast radius; only known consumer is our own CLI).
- `src/mdzip-core/mdzip-core.csproj`: `PackageId` `mdzip-core`,
  `Authors` **`mdz`** (weak), **no** `PackageLicenseExpression` (repo
  LICENSE is Apache-2.0), **no** embedded icon, README embedded ✅,
  `RepositoryUrl` ✅, `RootNamespace` is **already `MDZip.Core`** ✅
  (consumer code needs no changes), `AssemblyName` `mdzip.core`.
- Publishing: tag `v*` → `publish.yml` packs and pushes with the
  `NUGET_API_KEY` repo secret, then creates a GitHub release.
- Consumers: `mdzip-cli` pins `mdzip-core 1.3.3` in `mdz.csproj` and
  `mdz.Tests.csproj` (plus a comment mention in `mdz.Cli.csproj`).

## Phase 0 — Decisions

| Decision | Recommendation | Why |
|---|---|---|
| New ID | `MDZip.Core` | Matches winget scheme (`MDZip.Cli`, `MDZip.Studio`) and the existing `RootNamespace`; covered by the future `MDZip` prefix reservation |
| First `MDZip.Core` version | **1.4.0** | Signals the transition; legacy package tops out at 1.3.3 so "newer version = new ID" reads naturally; avoids colliding with the existing `v1.3.3` tag in CI |
| `AssemblyName` | Align to `MDZip.Core` now | Cosmetic, but the ID change is the one cheap moment to do it; consumers get the new DLL name transparently on rebuild |
| Legacy `mdzip-core` | Deprecate ("Legacy", alternate = `MDZip.Core`), keep listed | Doc's recommended back-compat path; deprecation shows an upgrade pointer in tooling |

## Phase 1 — NuGet organization & ownership (manual, web, Kyle only)

1. Create the org: nuget.org → Account → **Organizations → Add new**.
   The "Organization Name" field is the account slug — it becomes the
   profile URL **and the exact text shown in the Owners box** (NuGet
   has no separate display name; letters/digits/`.`/`_`/`-` only,
   casing preserved). **Use `MDZip`** (verified free 2026-07-08):
   matches the npm org (`@mdzip`) with brand casing, reads best in
   the Owners box, and an owner named `MDZip` requesting the `MDZip`
   prefix is the strongest identity match for the Phase 6 reservation.
   Needs its own email address — use `info@mdzip.org`, the project's
   canonical role address (unique-across-NuGet requirement satisfied;
   forwarding + Gravatar setup documented in the private planning
   repo's `mdzip-org-email.md`). `kylemwhite` becomes Administrator.
2. On the existing `mdzip-core` package: **Manage → Owners** → add
   `MDZip`, accept from the org side, then **remove `kylemwhite`**.
   The Owners box then shows only MDZip — do this even for the legacy
   package so the old listing looks right too.

## Phase 2 — Package metadata (repo `mdzip-core`)

In `mdzip-core.csproj`:

- `PackageId` → `MDZip.Core`; `AssemblyName` → `MDZip.Core` (per Phase 0).
- `Authors` → `MDZip Project`.
- Add `PackageLicenseExpression` → `Apache-2.0` (reservation
  best-practice requires the `license` element, not `licenseUrl`).
- Add embedded `PackageIcon` (128×128 `icon.png` from mdzip.org
  branding, packed like the README) and `PackageProjectUrl` →
  `https://mdzip.org`.
- `Version` → 1.4.0. Also fix the stale comment ("pinned to the
  supported markdownzip spec version" — versions are 1.3.x while the
  spec is 1.1.0; the pin no longer holds).
- README: title/intro to `MDZip.Core`, add a "formerly `mdzip-core`"
  line so search hits from the old name land correctly.

## Phase 3 — Publish under the org

**Superseded 2026-07-08: use Trusted Publishing (OIDC), not an API
key.** Nuget.org's account menu now flags API Keys "Not recommended"
in favor of Trusted Publishing — short-lived, GitHub-Actions-issued
credentials instead of a long-lived secret. No key to create, store,
rotate, or leak; `publish.yml` needs a small change instead of a repo
secret swap.

1. **On nuget.org** (you): account menu → **Trusted Publishing** → add
   a policy:
   - Repository Owner: `mdzip-project`
   - Repository: `mdzip-core`
   - Workflow File: `publish.yml` (file name only, not the
     `.github/workflows/` path)
   - Environment: leave blank (the workflow doesn't use a GitHub
     Actions `environment:`)
   - **Policy owner: the `MDZip` organization** (not your personal
     account) — this is what makes the org own `MDZip.Core` from its
     first push, no post-publish ownership shuffle needed.
   - `mdzip-core` is a public repo, so the policy activates immediately
     (the 7-day pending-activation window is a private-repo thing).
2. **In `publish.yml`** (repo work — done): added `permissions:
   id-token: write`, swapped the API-key push step for
   `NuGet/login@v1` + `dotnet nuget push` using its output token. Still
   needs **one repo secret**: `NUGET_USER` = your nuget.org **username**
   (profile name, e.g. `kylemwhite` — the docs explicitly warn NOT to
   use the email address). This identifies *who* is requesting the
   token; the policy above is what actually authorizes it. Add it in
   repo Settings → Secrets and variables → Actions, then delete the old
   `NUGET_API_KEY` secret once a publish succeeds.
3. Tag `v1.4.0` and push → the workflow requests an OIDC token from
   GitHub, exchanges it with nuget.org for a 1-hour API key, and pushes
   `MDZip.Core 1.4.0`.
4. Verify the package page: ID, owner shows **MDZip**, license
   expression, icon, README.
5. **Optional cleanup:** once Trusted Publishing is proven, consider
   the same swap for `mdzip-cli`, `mdzip-core-js`'s npm publish
   (npm has an equivalent OIDC trusted-publisher flow), and other repos
   still using long-lived tokens.

## Phase 4 — Consumers & docs

- `mdzip-cli`: `PackageReference` → `MDZip.Core` 1.4.0 in `mdz.csproj`
  and `mdz.Tests.csproj`; update the comment in `mdz.Cli.csproj`. Run
  the full test suite and verify the trimmed standalone exe, then
  release a CLI patch.
- Docs sweep: `workspace.md` (`publishes:` field), `dotnet-workflow.md`
  (release-ordering example names `mdzip-core X.Y.Z`),
  `nuget-id-prefix-reservation.md` (tick checklist items),
  `mdzip-core` README/STATUS, mdzip.org tools page if it names the
  package ID.

## Phase 5 — Deprecate the legacy package

On nuget.org `mdzip-core` → **Manage package → Deprecate**: select all
versions (or just 1.3.3), reason **Legacy**, alternate package
`MDZip.Core`, keep versions **listed** for back-compat.

**Custom message** (nuget.org page only — `dotnet.exe`/Visual Studio
show just the reason + alternate package, not this text):

> This package has been renamed to **MDZip.Core** to match the
> project's `MDZip.*` NuGet naming scheme. `mdzip-core` will remain
> listed for existing consumers but receives no further updates —
> please migrate your `PackageReference` to `MDZip.Core`. See
> https://github.com/mdzip-project/mdzip-core for details.

(Optional final `mdzip-core 1.3.4` push whose README points at the new
ID — skip unless someone actually lands on the old page confused; the
deprecation banner already does this job.)

**Not pursuing:** NuGet's popularity-transfer feature (moves search
ranking from the legacy package to the new one) — requires an
account@nuget.org application and is meant for packages with real
download volume; `mdzip-core`'s 298 total downloads don't justify it.

## Phase 6 — Reserve the `MDZip` prefix

Only after Phases 1–3 (org owns a live, best-practices-compliant
`MDZip.Core`): email **account@nuget.org** per
[nuget-id-prefix-reservation.md](nuget-id-prefix-reservation.md) —
owner **MDZip Project**, prefix **`MDZip`**, private reservation, no
delegation. Record the outcome and date back in that doc.

## Risks / notes

- Grandfathering is a non-issue: nobody else publishes under `MDZip`,
  and the hyphenated legacy ID was never coverable anyway.
- Phases 1, 3.1, 5, and 6 are manual web/email steps only the owner
  can do; everything else is repo work an agent can prepare.
- npm (`@mdzip/*` scope) and winget (`MDZip.*`, no namespace
  protection offered) are unaffected; this plan is NuGet-only.
- Trademark ("MDZip") remains the separate high-leverage option noted
  in the reservation doc — strengthens both NuGet disputes and winget
  takedowns, but is not a dependency of anything here.
