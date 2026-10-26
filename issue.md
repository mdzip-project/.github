Spec §13.1 says consumers **SHOULD** limit extracted entry count, total uncompressed bytes and compression ratio to guard against ZIP bombs. core-js has no such limits today: it reads the declared sizes from the central directory but never checks them. None of the JS apps built on it (editor, VS Code, Obsidian, mdzip.org) add their own, and they all open `.mdz` files from untrusted sources. A ZIP bomb would hang or crash the tab or extension host.

This replaces #9, which asked for a configurable limits API mirroring Python. Configurability stays an optional extension under the [core contract](https://github.com/mdzip-project/.github/blob/main/docs/core-contract.md); having sensible built-in limits is the baseline (contract R7, being clarified to say so).

## Scope

- Check entry count and declared per-entry/total uncompressed sizes when an archive is opened.
- Check **actual** decompressed bytes while reading, since declared sizes can be forged.
- Check compression ratio for large entries.
- Fail with a stable machine-readable code. Python uses `ERR_LIMIT_EXCEEDED` (not yet a spec code); use the same unless spec #9 settles on another.
- Fixed, documented defaults are enough. For reference, Python's defaults: 100,000 entries, 4 GiB total, 1 GiB per entry, ratio 1000:1 for entries over 1 MiB.
- Apply to every read path (browser and Node, lazy reads, `updateFiles`, custom ZIP factories). Keep lazy opening and the 2.1.1 performance fix.

## Out of scope

- A public configuration API. Add one only when a consumer needs to raise or lower the limits.

## Tests

- Forged central-directory sizes, high-ratio entries, too many entries: rejected with the stable code.
- A legitimately large archive under the defaults still opens.

Related: #9 (superseded), https://github.com/mdzip-project/mdzip-core/issues/8, https://github.com/mdzip-project/mdzip-spec/issues/9
