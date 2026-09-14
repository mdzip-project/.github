# Moved

The workspace dashboard that used to live here (`server.js`, a
zero-dependency Node script with the whole frontend embedded as a JS
template literal) has been rewritten as a TypeScript server + Vite SPA
and split into its own repo: `../../mdzip-dashboard` (a sibling of
`.github`, same as every other product repo).

See that repo's `README.md` (running it, layout) and
`docs/hosting-iis.md` (hosting it under IIS). `docs/workspace.md` and
`docs/hub-architecture.md` here have been updated to point there too.

`start-hidden.vbs`, `links.json`, and the cache files that used to sit
in this folder now live in `mdzip-dashboard/` directly.
