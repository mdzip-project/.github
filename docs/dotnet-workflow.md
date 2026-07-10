# .NET repo workflow (`mdzip-core`, `mdzip-cli`)

How to build, test, pack, and integration-test the C# repos. Used by the
core-parity work ([roadmap.md](roadmap.md) → [core-parity.md](core-parity.md))
and any .NET change.

## Prerequisites
- **.NET SDK 10** (`dotnet --version` ≥ 10.0).
- For `mdzip-core` multi-target tests, the **.NET 8 runtime** must be present
  (`dotnet --list-runtimes` shows `Microsoft.NETCore.App 8.x`) so net8 tests run.

## Build & test
```sh
# mdzip-core (multi-target net8.0;net10.0) — builds + tests both TFMs
dotnet test mdz-core.slnx -c Release

# mdzip-cli (net10.0)
dotnet test mdz-cli.slnx -c Release

# standalone CLI exe (single-file, self-contained — no runtime needed to run)
dotnet publish src/mdz.Cli/mdz.Cli.csproj -c Release -r win-x64 --self-contained true -o <out>
#   -> <out>/mdz.Cli.exe
```

## Integration-testing cli against an UNRELEASED core
`mdzip-cli` consumes `MDZip.Core` (NuGet ID; renamed from `mdzip-core`
2026-07-08, see [nuget-mdzip-core-rename.md](nuget-mdzip-core-rename.md))
via a NuGet `PackageReference`, so local core changes do **not** flow into
cli until packed/published. To test cli against a local core build:

1. **Pack** local core to a local feed with a distinct version:
   ```sh
   mkdir -p ../.local-feed
   dotnet pack src/mdzip-core/mdzip-core.csproj -c Release -o ../.local-feed -p:PackageVersion=<X>-local
   ```
2. **Add the feed** to `mdzip-cli/nuget.config` `<packageSources>` (TEMPORARY):
   ```xml
   <add key="local-core" value="../.local-feed" />
   ```
3. **Bump** cli's `MDZip.Core` `PackageReference` to `<X>-local` in
   `mdz.csproj` and `mdz.Tests.csproj`.
4. **Test:** `dotnet test mdz-cli.slnx -c Release`. Confirm restore resolved
   `mdzip.core/<X>-local` (grep `src/mdz/obj/project.assets.json` — NuGet
   lowercases the package ID in the resolved asset path).
5. **REVERT before committing:** remove the `nuget.config` source line, reset the
   `PackageReference` versions, delete `../.local-feed`.

> `nuget.config` is **gitignored** in `mdzip-cli`, so the feed-source edit is
> local-only. The `PackageReference` versions ARE tracked — revert those.

## Release ordering (core → cli)
Because of the NuGet coupling, a coordinated version bump releases in order:
1. Merge + tag `mdzip-core` `vX.Y.Z` → its `publish.yml` pushes `MDZip.Core
   X.Y.Z` to NuGet (Trusted Publishing/OIDC, no API key).
2. Bump cli's `MDZip.Core` `PackageReference` to `X.Y.Z`, then merge + tag
   `mdzip-cli` `vX.Y.Z`.
