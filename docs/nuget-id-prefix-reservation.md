# NuGet ID Prefix Reservation — reference

**Purpose:** how to reserve the `MDZip` package-ID namespace on NuGet.org so others
can't publish confusingly-named packages under it.
**Last reviewed:** 2026-06-29 against the official docs (doc itself dated 2019, content-updated 2022).
**Source:** <https://learn.microsoft.com/en-us/nuget/nuget-org/id-prefix-reservation>

> Context: this is the **NuGet** equivalent of the namespace protection that
> **winget does *not* offer** (see `mdzip-cli/docs/winget.md`). npm has a similar
> idea via scopes (`@mdzip/*`), which we already use for the JS packages.

---

## What it is

Reserving an ID prefix associates it with your NuGet.org owner account. Then:

1. **New packages matching the prefix from anyone else are rejected** at upload —
   only the reserving owner(s) can publish under it.
2. Your packages under the prefix get a **blue "reserved prefix" check** on
   nuget.org and in Visual Studio (15.4+) — a trust signal to consumers.
3. **Grandfathering:** packages that *already* matched the prefix before you
   reserved it but are owned by someone else are **left untouched** — not
   unlisted, no check, and those owners can still push new versions. (Not an
   issue for `MDZip` today since nobody else uses it — confirmed.)

## How prefix matching works (important for MDZip)

Matching is on **dot (`.`) boundaries**, case-insensitive. Reserving `MDZip` covers:

- `MDZip` (exact) and `MDZip.Core`, `MDZip.Cli`, `MDZip.Anything` ✅
- It does **not** cover `MDZipSomething` (no separator) or, crucially,
  **`mdzip-core`** — a hyphen is part of the token, not a namespace separator. ❗

**Implication:** our current .NET package is `mdzip-core` (hyphenated), which a
`MDZip` reservation would **not** protect. To get real coverage and match the
winget `MDZip.*` scheme (`MDZip.Cli`, `MDZip.Studio`), publish the .NET packages
under a **dotted** ID — e.g. `MDZip.Core`. Options:
- Rename/republish as `MDZip.Core` going forward (keep `mdzip-core` listed for
  back-compat, or deprecate it pointing at the new ID), **or**
- Reserve `MDZip` now for the dotted family and treat `mdzip-core` as legacy.

Decide the ID scheme before reserving, so the reservation actually covers the IDs we ship.

## Eligibility criteria (what reviewers check)

Not all must be met, but weak evidence → denial (with reason given):

1. Does the prefix **clearly identify you** as the owner? (Brand/trademark helps.)
2. Is it **too common/generic**? Avoid prefixes **< 4 characters** and dictionary
   words. (`MDZip` = 5 chars, distinctive → fine.)
3. Would *not* reserving it cause **ambiguity, confusion, or harm**?

Publishing best-practices they expect on packages under the prefix:
- **Consistent, clear identifying metadata** — especially `author`.
- A real **`license`** metadata element (not the deprecated `licenseUrl`).
- **Embedded `icon`** metadata (not just `iconUrl`) if you ship an icon.

## Advanced options (worth knowing)

- **Sub-prefix delegation:** the prefix owner can delegate a subset to another
  account (e.g. own `MDZip.*` but delegate `MDZip.Studio.*` elsewhere).
- **Public prefix:** keep the reserved-check trust badge but *don't* block others
  from publishing under it — useful for OSS with many contributors. (We almost
  certainly want it **private/blocking**, not public.)

## How to apply

1. Confirm the ID scheme (see matching note above) and pick the prefix(es): **`MDZip`**.
2. Make sure existing/planned packages meet the best-practices (license + embedded
   icon + consistent author).
3. Email **account@nuget.org** with:
   - your NuGet.org **owner display name**,
   - the **prefix(es)** requested (`MDZip`),
   - any delegation/public requests (none for us — request a private reservation).
4. They reply with acceptance or rejection (with the failing criteria), and may
   ask identity-confirming questions.

## Disputes / trademark

If someone is granted a prefix that infringes our trademark or violates the
criteria, email **support@nuget.org** with the prefix, its owner, and the reason.
(Owning a registered/used **"MDZip" trademark** materially strengthens both this
and the winget takedown path.)

---

## MDZip action checklist

- [ ] Decide .NET package ID scheme: adopt dotted **`MDZip.Core`** (recommended) vs. keep `mdzip-core`.
- [ ] Ensure packages set `license` (metadata element) and embedded `icon`, with consistent `author = MDZip Project`.
- [ ] Email account@nuget.org to reserve **`MDZip`** (private, no delegation) under our owner account.
- [ ] (Optional but high-leverage) Pursue an **"MDZip" trademark** — strengthens NuGet disputes *and* winget impersonation/takedowns.
- [ ] Record the outcome + reserved-prefix date back in this doc.
