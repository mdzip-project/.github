<!-- mdzip-mcp-review-guidance:start -->
## Working with `.mdz` Files

This workspace may contain `.mdz` files — MDZip archives: ZIP-based containers that package a Markdown document, its assets, and optional metadata into one portable file.

Before reading or editing a `.mdz`, actively check whether an MDZip MCP server is already available among your tools (for example, tool names beginning `mdz_`, or `upsert_canonical_document`). Do not assume one is unavailable just because it was not mentioned — check first. If one is available, skip to "MDZip MCP Review Guidance" below.

If no MDZip MCP server is available:

- Ask the user to run `MDZip: Enable Workspace MCP Server` or `MDZip: Enable User MCP Server` (from the MDZip VS Code extension) to make one available, or `MDZip: Copy MCP Server Config Snippet` for a manual/remote setup.
- If the MDZip extension is not installed, ask the user to install it — or, as an immediate fallback, read the archive directly: `.mdz` is a standard ZIP file, so any unzip tool can extract it.
- To find a `.mdz`'s entry point without a manifest reader: check `manifest.json`'s `entryPoint` field first; otherwise look for `index.md` in the archive root; otherwise, if there is exactly one Markdown file in the archive root, use that. Ignore support files (`AGENTS.md`, `README.md`, `LICENSE.md`, `CHANGELOG.md`) when guessing.
- Reading this way (manual ZIP inspection) is fine — it is non-destructive. Writing this way is not: a write performed outside MDZip-aware tooling has no way to detect a conflicting edit made elsewhere (e.g. in an open MDZip editor) and can silently discard it. Ask the user how they would like to proceed before writing to a `.mdz` without MCP or extension support.

## MDZip MCP Review Guidance

When reviewing, summarizing, or editing `.mdz` files with an MDZip MCP server available:

1. Call `mdz_review_document` first with the `.mdz` `archivePath`.
2. Use the returned `resolvedMarkdownPath`, `canonicalEntrypointPath`, and `entrypointSource` fields before deciding on write actions.
3. For canonical markdown updates, call `upsert_canonical_document` instead of editing archive entries manually.
4. If a tool returns a machine-readable error with `nextAction`, follow that next action and retry.
5. Do not extract archive entries to disk unless the user explicitly asks for extraction.
6. Use lower-level tools (`mdz_list_entries`, `mdz_read_text`, `mdz_read_image`) only for follow-up detail checks.
<!-- mdzip-mcp-review-guidance:end -->
