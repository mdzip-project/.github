#!/usr/bin/env node
// MDZip workspace dashboard — zero-dependency.
// Reads ../../docs/workspace.md, scans each repo live, serves an
// auto-refreshing status page. Run: node tools/dashboard/server.js
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const execFileP = require('util').promisify(execFile);
const gitOut = (dir, args) => execFileP('git', ['-C', dir, ...args], { encoding: 'utf8', maxBuffer: 4 << 20 }).then(r => r.stdout);

const PORT = process.env.PORT || 7777;
const GITHUB_ROOT = path.resolve(__dirname, '..', '..');         // the .github repo root
const MANIFEST = path.join(GITHUB_ROOT, 'docs', 'workspace.md');
const LINKS_FILE = path.join(__dirname, 'links.json');
const ROADMAP_FILE = path.join(GITHUB_ROOT, 'docs', 'roadmap.md');
const PLANNING_NOTES_FILE = path.resolve(GITHUB_ROOT, '..', 'planning', 'notes.md');
const ADOPTION_CACHE_FILE = path.join(__dirname, 'adoption-cache.json');
const ADOPTION_REFRESH_MS = 60 * 60 * 1000; // hourly — these numbers don't move fast
// Deliberately outside every repo (this one's public): a leaked service-account
// key here would be a leaked key, gitignore or not. See planning/agent-notes.md.
const GSC_KEY_FILE = path.join(process.env.APPDATA || '', 'mdzip-dashboard', 'gsc-service-account.json');
const GSC_SITE_MATCH = 'mdzip.org';
// The `adoption` folder is a deliberately-not-a-repo scratch workspace, a
// sibling of `.github` — see planning/notes.md "Recovered goals".
const EXTENSION_SITES_FILE = path.resolve(GITHUB_ROOT, '..', 'adoption', 'drafts', 'file-extension-submission.md');

// ---------- minimal YAML-subset parser (tailored to workspace.md) ----------
function stripComment(line) {
  const i = line.indexOf(' #');
  return i === -1 ? line : line.slice(0, i);
}
function unquote(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
function parseVal(v) {
  v = v.trim();
  if (v === '' ) return '';
  if (v.startsWith('[')) { try { return JSON.parse(v); } catch { return []; } }
  return unquote(v);
}
function parseManifest(md) {
  const block = (md.match(/```yaml\s*([\s\S]*?)```/) || [])[1] || '';
  const packages = {};
  const repos = [];
  let section = null, cur = null;
  for (const raw of block.split(/\r?\n/)) {
    const line = stripComment(raw);
    if (!line.trim()) continue;
    if (/^packages:\s*$/.test(line)) { section = 'packages'; continue; }
    if (/^repos:\s*$/.test(line)) { section = 'repos'; continue; }
    if (section === 'packages') {
      const m = line.match(/^\s+(".*?"|[^:]+):\s*(.+?)\s*$/);
      if (m) packages[unquote(m[1])] = unquote(m[2]);
    } else if (section === 'repos') {
      const item = line.match(/^\s*-\s*(\w+):\s*(.*)$/);
      if (item) { cur = {}; repos.push(cur); cur[item[1]] = parseVal(item[2]); }
      else {
        const f = line.match(/^\s+(\w+):\s*(.*)$/);
        if (f && cur) cur[f[1]] = parseVal(f[2]);
      }
    }
  }
  return { packages, repos };
}

// ---------- tiny markdown renderer (Next tab — roadmap.md + planning/notes.md) ----------
// Not a general CommonMark implementation: just enough for these two files'
// actual shape (##/### headings, bullet/numbered lists incl. one level of
// nesting, bold, inline code, links, wrapped paragraph lines).
function mdEscape(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function mdInline(s) {
  return mdEscape(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
function mdToHtml(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  let html = '', para = [], listStack = []; // listStack: [{indent, tag}]
  const flushPara = () => { if (para.length) { html += '<p>' + mdInline(para.join(' ')) + '</p>'; para = []; } };
  const closeLists = () => { while (listStack.length) html += '</' + listStack.pop().tag + '>'; };
  for (const line of lines) {
    let m;
    if (!line.trim()) { flushPara(); closeLists(); continue; }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara(); closeLists();
      const level = Math.min(m[1].length, 3) + 2; // # -> h3 .. ### -> h5
      html += '<h' + level + '>' + mdInline(m[2]) + '</h' + level + '>';
      continue;
    }
    if ((m = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/))) {
      flushPara();
      const indent = m[1].length, tag = /\d+\./.test(m[2]) ? 'ol' : 'ul';
      while (listStack.length && listStack[listStack.length - 1].indent > indent) html += '</' + listStack.pop().tag + '>';
      const top = listStack[listStack.length - 1];
      if (!top || top.indent < indent) { html += '<' + tag + '>'; listStack.push({ indent, tag }); }
      else if (top.tag !== tag) { html += '</' + listStack.pop().tag + '><' + tag + '>'; listStack.push({ indent, tag }); }
      html += '<li>' + mdInline(m[3]) + '</li>';
      continue;
    }
    if (listStack.length && /^\s{2,}\S/.test(line)) { html = html.replace(/<\/li>$/, ' ' + mdInline(line.trim()) + '</li>'); continue; }
    closeLists();
    para.push(line.trim());
  }
  flushPara(); closeLists();
  return html;
}
// Concatenate the "## " sections whose heading starts with one of `prefixes`
// (case-insensitive), stopping each at the next "## " heading.
function extractSections(md, prefixes) {
  const lc = prefixes.map(p => p.toLowerCase());
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let taking = false;
  for (const line of lines) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) { taking = lc.some(p => h[1].trim().toLowerCase().startsWith(p)); if (taking) out.push(line); continue; }
    if (taking) out.push(line);
  }
  return out.join('\n');
}
function readNext() {
  const out = {};
  try {
    const md = fs.readFileSync(ROADMAP_FILE, 'utf8');
    out.roadmapHtml = mdToHtml(extractSections(md, ['in progress', 'planned']));
  } catch (e) { out.roadmapError = 'docs/roadmap.md: ' + String(e.message || e).split('\n')[0]; }
  try {
    const md = fs.readFileSync(PLANNING_NOTES_FILE, 'utf8');
    out.movesHtml = mdToHtml(extractSections(md, ['next big moves']));
  } catch (e) { out.movesError = 'planning/notes.md not found locally — private repo, expected as a sibling of mdzip-project/.github (' + String(e.message || e).split('\n')[0] + ')'; }
  return out;
}

// Parses the "| Site | Status | Notes |" table — the first GFM table in the
// file (the "Key facts" table further down is a different, later one). The
// Status cell's emoji IS the status — passed through as-is for display (icon
// keeps the file the single source of truth for what each symbol means; the
// legend line at the top of the file is the legend, not this code). `status`
// is only a sort key, derived from the same emoji.
const EXT_STATUS = { '✅': 'done', '⌛': 'pending', '🫰': 'responding', '💩': 'skip' };
function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
}
function parseSiteRow(cells) {
  const [siteCell, statusCell, notesCell] = cells;
  const linkMatch = (siteCell || '').match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  const name = linkMatch ? linkMatch[1].trim() : (siteCell || '').trim();
  const url = linkMatch ? linkMatch[2].trim() : null;
  let status = 'none', icon = (statusCell || '').trim() || '—';
  for (const [emoji, s] of Object.entries(EXT_STATUS)) {
    if ((statusCell || '').includes(emoji)) { status = s; icon = emoji; break; }
  }
  return { name, url, status, icon, notes: (notesCell || '').trim() };
}
function readExtensionSites() {
  try {
    const lines = fs.readFileSync(EXTENSION_SITES_FILE, 'utf8').replace(/\r\n/g, '\n').split('\n');
    const isRow = l => /^\s*\|.*\|\s*$/.test(l);
    const isSeparator = l => /^\s*\|[\s:|-]+\|\s*$/.test(l);
    const headerIdx = lines.findIndex((l, i) => isRow(l) && isSeparator(lines[i + 1] || ''));
    if (headerIdx === -1) return { ok: true, sites: [] };
    const sites = [];
    for (let i = headerIdx + 2; i < lines.length && isRow(lines[i]); i++) sites.push(parseSiteRow(splitTableRow(lines[i])));
    return { ok: true, sites };
  } catch (e) { return { ok: false, error: 'adoption/drafts/file-extension-submission.md: ' + String(e.message || e).split('\n')[0] }; }
}

// ---------- helpers ----------
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
// Re-read on every call (like the workspace manifest) so editing links.json
// takes effect on the next poll with no server restart.
function readQuickLinks() { return readJSON(LINKS_FILE) || []; }
function repoDir(repo) { return path.resolve(GITHUB_ROOT, repo.path); }
function repoRemoteUrl(repo) {
  const remote = String(repo.remote || '').trim();
  if (!remote) return '';
  const ssh = remote.match(/^git@github\.com:(.+?)(?:\.git)?$/);
  if (ssh) return 'https://github.com/' + ssh[1];
  if (/^https:\/\/github\.com\//.test(remote)) return remote.replace(/\.git$/, '');
  return remote;
}

// ---------- release / package badges (mirrors mdzip.org/project.html) ----------
// Same shields.io content shown on the mdzip.org "The Project" page. Keyed by
// repo name: a GitHub release badge (for repos that publish releases) plus the
// distribution badge(s) from the project page's "Package" column.
const SHIELD = 'https://img.shields.io';
const releaseBadge = name => ({
  img: `${SHIELD}/github/v/release/mdzip-project/${name}?logo=github&logoColor=white&label=release`,
  href: `https://github.com/mdzip-project/${name}/releases/latest`,
  alt: `Latest release for ${name}`,
});
const npmBadge = pkg => ({
  img: `${SHIELD}/npm/v/${pkg}`,
  href: `https://www.npmjs.com/package/${pkg}`,
  alt: `NPM package version for ${pkg}`,
});
// repos that show a GitHub release badge on the project page
const RELEASE_REPOS = new Set([
  'mdzip-spec', 'mdzip-core', 'mdzip-core-js', 'mdzip-editor',
  'mdzip-cli', 'mdzip-vscode', 'mdzip-studio',
]);
// the project page's "Package" column, per repo
const PACKAGE_BADGES = {
  'mdzip-core': [{ img: `${SHIELD}/nuget/v/MDZip.Core?logo=nuget`, href: 'https://www.nuget.org/packages/MDZip.Core', alt: 'NuGet package version for MDZip.Core' }],
  'mdzip-core-js': [npmBadge('@mdzip/core-js')],
  'mdzip-editor': [npmBadge('@mdzip/editor'), npmBadge('@mdzip/editor-react'), npmBadge('@mdzip/editor-vue'), npmBadge('@mdzip/editor-ng')],
  'mdzip-vscode': [{ img: `${SHIELD}/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode&logoColor=white`, href: 'https://marketplace.visualstudio.com/items?itemName=mdzip-project.mdzip-vscode', alt: 'MDZip on the VS Code Marketplace' }],
  'mdzip-studio': [{ img: `${SHIELD}/badge/Download-Windows-blue?logo=windows&logoColor=white`, href: 'https://mdzip.org/studio.html', alt: 'Download for Windows' }],
};
function repoBadges(name) {
  const badges = [];
  if (RELEASE_REPOS.has(name)) badges.push(releaseBadge(name));
  if (PACKAGE_BADGES[name]) badges.push(...PACKAGE_BADGES[name]);
  return badges;
}

async function gitStatus(dir) {
  try {
    const [out, branchRaw] = await Promise.all([
      gitOut(dir, ['status', '--porcelain']),
      gitOut(dir, ['rev-parse', '--abbrev-ref', 'HEAD']),
    ]);
    const changes = out.split(/\r?\n/).filter(Boolean).length;
    return { ok: true, changes, branch: branchRaw.trim() };
  } catch (e) { return { ok: false, changes: 0, branch: '?', error: String(e.message || e).split('\n')[0] }; }
}

// "1.3.1" min floor of a range "^1.3.1" / "~1.2" / ">=1.0" / "1.3.2"
function rangeFloor(range) {
  const m = String(range).match(/(\d+)\.(\d+)\.?(\d+)?/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] || 0)];
}
function cmp(a, b) {
  for (let i = 0; i < 3; i++) { if ((a[i]||0) !== (b[i]||0)) return (a[i]||0) - (b[i]||0); }
  return 0;
}

async function computeStatus() {
  let manifest;
  try { manifest = parseManifest(fs.readFileSync(MANIFEST, 'utf8')); }
  catch (e) { return { error: 'Cannot read manifest: ' + e.message, repos: [] }; }

  // current version of each producing repo
  const producerVersion = {};
  for (const r of manifest.repos) {
    const pkg = readJSON(path.join(repoDir(r), 'package.json'));
    if (pkg && pkg.version) producerVersion[r.name] = pkg.version;
  }

  const rows = await Promise.all(manifest.repos.map(async repo => {
    const dir = repoDir(repo);
    const exists = fs.existsSync(dir);
    const git = exists ? await gitStatus(dir) : { ok: false, changes: 0, branch: '-', error: 'missing on disk' };
    const pkg = readJSON(path.join(dir, 'package.json'));

    // version: package.json -> latest git tag -> STATUS.md "Version:" -> —
    let version = (pkg && pkg.version) ? pkg.version : null;
    let vsrc = version ? 'pkg' : null;
    if (!version && exists) {
      try {
        version = (await gitOut(dir, ['describe', '--tags', '--abbrev=0'])).trim().replace(/^v/, '');
        if (version) vsrc = 'tag';
      } catch {}
    }

    // dependency / behind analysis
    const behind = [];
    let depsState = 'n/a';
    if (pkg) {
      const allDeps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
      let firstParty = 0;
      for (const [dep, range] of Object.entries(allDeps)) {
        const producer = manifest.packages[dep];
        if (!producer) continue;
        firstParty++;
        const current = producerVersion[producer];
        if (!current) continue;
        const floor = rangeFloor(range), cur = rangeFloor(current);
        if (floor && cur && cmp(floor, cur) < 0) {
          behind.push({ dep, pinned: range, current });
        }
      }
      depsState = firstParty === 0 ? 'none' : (behind.length ? 'behind' : 'up to date');
    }

    // STATUS.md: "Status:" = workflow state, "Last:" = latest action, "Version:" = version fallback
    let last = '', state = 'idle';
    try {
      const status = fs.readFileSync(path.join(dir, 'STATUS.md'), 'utf8');
      const stm = status.match(/^\s*Status:\s*(.+?)\s*$/mi);
      if (stm) state = stm[1].toLowerCase().trim().replace(/\s+/g, '-');
      const lm = status.match(/^\s*Last:\s*(.+?)\s*$/mi) || status.match(/^\s*Next:\s*(.+?)\s*$/mi);
      if (lm) last = lm[1];
      else last = (status.split(/\r?\n/).find(l => l.trim() && !/^\s*(Status|Version|Last|Next):/i.test(l)) || '').replace(/^#*\s*/, '');
      if (!version) {
        const vm = status.match(/^\s*Version:\s*(.+?)\s*$/mi);
        if (vm) { version = vm[1].replace(/^v/, ''); vsrc = 'status'; }
      }
    } catch {}
    if (!version) { version = '—'; vsrc = 'none'; }

    return {
      name: repo.name, role: repo.role || '', remote: repoRemoteUrl(repo), branch: git.branch,
      type: repo.type || '', visibility: repo.visibility || '', icon: repo.icon || '',
      version, vsrc,
      git: git.ok ? (git.changes === 0 ? 'clean' : git.changes + ' changed') : (git.error || 'error'),
      gitDirty: git.changes > 0 || !git.ok,
      deps: depsState, behind, last, state,
      badges: repoBadges(repo.name),
    };
  }));

  return { generated: new Date().toISOString(), root: GITHUB_ROOT, repos: rows, links: readQuickLinks(), next: readNext() };
}

// ---------- adoption metrics (Adoption tab) ----------
// Sources: what's already listed in links.json (npm/NuGet/Marketplace items)
// and the GitHub remote of every repo in workspace.md — no separate config,
// so there's nothing new to keep in sync when a package or repo is added.
// Fetched on a slow background timer (ADOPTION_REFRESH_MS), never on the
// client's 5s poll — the dashboard only ever serves the last cached result.
async function fetchJSON(url, opts) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, Object.assign({}, opts, { signal: ctrl.signal }));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(timer); }
}
function npmPkgFromHref(href) { const m = String(href).match(/\/package\/(.+)$/); return m ? decodeURIComponent(m[1]) : null; }
function nugetIdFromHref(href) { const m = String(href).match(/\/packages\/([^/?#]+)/); return m ? m[1] : null; }
function vscodeExtFromHref(href) { const m = String(href).match(/itemName=([^&]+)/); return m ? m[1] : null; }

async function fetchNpmWeeklyDownloads(pkg) {
  const d = await fetchJSON('https://api.npmjs.org/downloads/point/last-week/' + encodeURIComponent(pkg));
  return { downloads: d.downloads || 0 };
}
async function fetchNugetDownloads(id) {
  const d = await fetchJSON('https://azuresearch-usnc.nuget.org/query?q=packageid:' + encodeURIComponent(id) + '&prerelease=true');
  const hit = (d.data || []).find(x => String(x.id).toLowerCase() === id.toLowerCase());
  if (!hit) throw new Error('package not found on NuGet');
  return { downloads: hit.totalDownloads || 0, version: hit.version };
}
async function fetchMarketplaceStats(extensionId) {
  const d = await fetchJSON('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json;api-version=3.0-preview.1' },
    body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: extensionId }] }], flags: 914 }),
  });
  const ext = d.results && d.results[0] && d.results[0].extensions && d.results[0].extensions[0];
  if (!ext) throw new Error('extension not found');
  const stat = name => { const s = (ext.statistics || []).find(x => x.statisticName === name); return s ? Math.round(s.value) : null; };
  return { installs: stat('install'), rating: stat('averagerating'), ratingCount: stat('ratingcount') };
}
// Prefer the already-authenticated `gh` CLI (5000 req/hr, reaches private
// repos too); fall back to the unauthenticated REST API (60 req/hr — fine
// at this call volume on an hourly timer, but public repos only).
// A stale ambient GITHUB_TOKEN/GH_TOKEN shadows gh's working keyring login
// (see planning/agent-notes.md) — strip both so gh always uses the keyring.
const GH_ENV = Object.assign({}, process.env);
delete GH_ENV.GITHUB_TOKEN;
delete GH_ENV.GH_TOKEN;
// Top few open issues (title/number/url), most-recently-updated first, for
// the Adoption tab's snippet. repos.open_issues_count counts PRs too, so
// this can legitimately return fewer than that count once PRs are filtered.
async function fetchGithubIssueSnippet(owner, repo, useGh) {
  const q = `repos/${owner}/${repo}/issues?state=open&per_page=10&sort=updated&direction=desc`;
  try {
    const items = useGh
      ? JSON.parse(await execFileP('gh', ['api', q], { encoding: 'utf8', maxBuffer: 4 << 20, env: GH_ENV }).then(r => r.stdout))
      : await fetchJSON(`https://api.github.com/${q}`);
    // Collapsed view only ever shows what fits before truncating; the fuller
    // list here is for the per-repo expand/collapse detail row.
    return items.filter(i => !i.pull_request).slice(0, 8).map(i => ({ number: i.number, title: i.title, url: i.html_url }));
  } catch { return []; }
}
async function fetchGithubStats(owner, repo) {
  const issuesUrl = `https://github.com/${owner}/${repo}/issues`;
  try {
    const out = await execFileP('gh', ['api', `repos/${owner}/${repo}`], { encoding: 'utf8', maxBuffer: 4 << 20, env: GH_ENV }).then(r => r.stdout);
    const j = JSON.parse(out);
    const issues = j.open_issues_count > 0 ? await fetchGithubIssueSnippet(owner, repo, true) : [];
    return { stars: j.stargazers_count, forks: j.forks_count, openIssues: j.open_issues_count, issuesUrl, issues, source: 'gh' };
  } catch {
    const j = await fetchJSON(`https://api.github.com/repos/${owner}/${repo}`);
    const issues = j.open_issues_count > 0 ? await fetchGithubIssueSnippet(owner, repo, false) : [];
    return { stars: j.stargazers_count, forks: j.forks_count, openIssues: j.open_issues_count, issuesUrl, issues, source: 'api' };
  }
}

// ---------- Google Search Console (service-account JWT, no OAuth dance) ----------
function base64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function gscAccessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + base64url(JSON.stringify({
    iss: key.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: key.token_uri, exp: now + 3600, iat: now,
  }));
  const signer = crypto.createSign('RSA-SHA256'); signer.update(unsigned); signer.end();
  const jwt = unsigned + '.' + base64url(signer.sign(key.private_key));
  const res = await fetch(key.token_uri, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt),
  });
  if (!res.ok) throw new Error('token exchange HTTP ' + res.status + ': ' + (await res.text()).slice(0, 300));
  return (await res.json()).access_token;
}
async function gscQuery(token, siteUrl, body) {
  return fetchJSON(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
function isoDate(d) { return d.toISOString().slice(0, 10); }
async function fetchSearchConsole() {
  const key = readJSON(GSC_KEY_FILE);
  if (!key) throw new Error('no service-account key at ' + GSC_KEY_FILE);
  const token = await gscAccessToken(key);
  const sitesRes = await fetchJSON('https://www.googleapis.com/webmasters/v3/sites', { headers: { authorization: 'Bearer ' + token } });
  const siteUrl = ((sitesRes.siteEntry || []).map(s => s.siteUrl)).find(u => u.includes(GSC_SITE_MATCH));
  if (!siteUrl) throw new Error('service account has no access to a ' + GSC_SITE_MATCH + ' property in Search Console');

  // GSC data typically lags 2-3 days; window over the 28 days before that.
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 28);
  const range = { startDate: isoDate(start), endDate: isoDate(end) };

  const totals = await gscQuery(token, siteUrl, Object.assign({ dimensions: [] }, range));
  const t = (totals.rows || [])[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const queries = await gscQuery(token, siteUrl, Object.assign({ dimensions: ['query'], rowLimit: 10 }, range));
  const topQueries = (queries.rows || []).map(r => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));

  return { ok: true, siteUrl, range, clicks: t.clicks, impressions: t.impressions, ctr: t.ctr, position: t.position, topQueries };
}

async function refreshAdoption() {
  const links = readQuickLinks();
  const catItems = cat => ((links.find(c => c.cat === cat) || {}).items || []);

  const npm = await Promise.all(catItems('npm').map(async i => {
    const pkg = npmPkgFromHref(i.href);
    try { const r = await fetchNpmWeeklyDownloads(pkg); return { pkg, weeklyDownloads: r.downloads, ok: true }; }
    catch (e) { return { pkg, ok: false, error: String(e.message || e) }; }
  }));

  const nuget = await Promise.all(catItems('NuGet').map(async i => {
    const id = nugetIdFromHref(i.href);
    try { const r = await fetchNugetDownloads(id); return { id, downloads: r.downloads, version: r.version, ok: true }; }
    catch (e) { return { id, ok: false, error: String(e.message || e) }; }
  }));

  const marketplace = await Promise.all(catItems('VS Code Marketplace').filter(i => vscodeExtFromHref(i.href)).map(async i => {
    const ext = vscodeExtFromHref(i.href);
    try { const r = await fetchMarketplaceStats(ext); return Object.assign({ ext, ok: true }, r); }
    catch (e) { return { ext, ok: false, error: String(e.message || e) }; }
  }));

  let manifest;
  try { manifest = parseManifest(fs.readFileSync(MANIFEST, 'utf8')); } catch { manifest = { repos: [] }; }
  const github = await Promise.all(manifest.repos.map(async repo => {
    const m = repoRemoteUrl(repo).match(/github\.com\/([^/]+)\/([^/]+?)\/?$/);
    if (!m) return { name: repo.name, ok: false, error: 'no GitHub remote' };
    try { const r = await fetchGithubStats(m[1], m[2]); return Object.assign({ name: repo.name, ok: true }, r); }
    catch (e) { return { name: repo.name, ok: false, error: String(e.message || e), issuesUrl: `https://github.com/${m[1]}/${m[2]}/issues` }; }
  }));

  const searchConsole = await fetchSearchConsole().catch(e => ({ ok: false, error: String(e.message || e) }));

  return { generated: new Date().toISOString(), npm, nuget, marketplace, github, searchConsole };
}

let adoptionCache = readJSON(ADOPTION_CACHE_FILE) || { generated: null, npm: [], nuget: [], marketplace: [], github: [], searchConsole: { ok: false } };
let adoptionRefreshing = false;
async function refreshAdoptionCache() {
  if (adoptionRefreshing) return;
  adoptionRefreshing = true;
  try {
    adoptionCache = await refreshAdoption();
    fs.writeFileSync(ADOPTION_CACHE_FILE, JSON.stringify(adoptionCache, null, 2));
  } catch (e) {
    adoptionCache = Object.assign({}, adoptionCache, { refreshError: String(e.message || e) });
  } finally {
    adoptionRefreshing = false;
  }
}
refreshAdoptionCache();
setInterval(refreshAdoptionCache, ADOPTION_REFRESH_MS);

// ---------- HTML ----------
const PAGE = `<!doctype html><html><head><meta charset="utf8">
<title>MDZip Workspace</title>
<style>
 body{font:14px/1.5 system-ui,Segoe UI,sans-serif;margin:0;background:#0d1117;color:#e6edf3;padding-bottom:66px}
 header{padding:14px 20px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:baseline;gap:16px}
 h1{font-size:16px;margin:0} .meta{color:#8b949e;font-size:12px}
 .head-actions{display:flex;align-items:center;gap:10px}.pause-btn{border:1px solid #30363d;background:#161b22;color:#e6edf3;border-radius:6px;padding:4px 8px;font:12px/1 system-ui,Segoe UI,sans-serif;cursor:pointer}.pause-btn:hover{border-color:#8b949e}
 .links-menu-wrap{position:relative}
 .links-menu{position:absolute;right:0;top:calc(100% + 6px);min-width:240px;max-height:70vh;overflow-y:auto;background:#161b22;border:1px solid #30363d;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.4);padding:6px;z-index:10}
 .links-menu h4{margin:8px 6px 2px;color:#8b949e;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
 .links-menu h4:first-child{margin-top:2px}
 .links-menu a{display:block;padding:5px 8px;border-radius:4px;color:#e6edf3;font-size:13px;text-decoration:none}
 .links-menu a:hover,.links-menu a:focus-visible{background:#21262d;outline:none}
 table{width:100%;border-collapse:collapse} th,td{padding:9px 20px;text-align:left;border-bottom:1px solid #21262d;vertical-align:top}
 th{color:#8b949e;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
 .name{font-weight:600} .role{color:#8b949e;font-size:12px} .ver{font-variant-numeric:tabular-nums;font-weight:600}
 .pill{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;font-weight:600}
 .clean{color:#3fb950} .dirty{color:#d29922} .behind{background:#3d2b00;color:#e3b341}
 .uptodate{background:#0f2e1a;color:#3fb950} .na{color:#6e7681} .next{color:#c9d1d9}
 .st-idle{background:#21262d;color:#8b949e} .st-prog{background:#0d2847;color:#58a6ff} .st-test{background:#3d2b00;color:#e3b341} .st-commit{background:#0f2e1a;color:#3fb950} .st-block{background:#3d1418;color:#f85149}
 .detail{color:#8b949e;font-size:12px} a{color:inherit}.name a{text-decoration:none}.name a:hover{text-decoration:underline}
 .badges{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px}.badges img{height:20px;display:block}
 .tico{margin-right:7px} .tico-img{width:16px;height:16px;vertical-align:-3px;margin-right:7px} .vis{margin-left:7px;font-size:12px}
 footer.legend{position:fixed;left:0;right:0;bottom:0;background:#161b22;border-top:1px solid #30363d;padding:8px 20px;color:#8b949e;font-size:12px}
 footer.legend img{width:14px;height:14px;vertical-align:-3px;margin:0 2px}
 nav.tabs{display:flex;gap:4px;padding:8px 20px 0;border-bottom:1px solid #21262d}
 .tab-btn{border:1px solid transparent;border-bottom:none;background:none;color:#8b949e;border-radius:6px 6px 0 0;padding:6px 14px;font:13px/1 system-ui,Segoe UI,sans-serif;cursor:pointer}
 .tab-btn:hover{color:#e6edf3}
 .tab-btn.active{color:#e6edf3;background:#161b22;border-color:#30363d}
 .card{background:#161b22;border:1px solid #30363d;border-radius:6px;margin:16px 20px;padding:4px 18px 14px}
 .card h2{font-size:14px;margin:14px 0 2px}
 .card .src{color:#8b949e;font-size:11px}
 .next-content{font-size:13px}
 .next-content h3{font-size:13px;margin:14px 0 4px;color:#e6edf3}
 .next-content h4{font-size:12.5px;margin:10px 0 4px;color:#c9d1d9}
 .next-content h5{font-size:12px;margin:8px 0 4px;color:#8b949e;text-transform:uppercase;letter-spacing:.03em}
 .next-content p{margin:6px 0}
 .next-content ul,.next-content ol{margin:2px 0 8px 20px;padding:0}
 .next-content li{margin:3px 0}
 .next-content code{background:#0d1117;padding:1px 4px;border-radius:3px;font-size:12px}
 .next-content a{color:#58a6ff;text-decoration:none}
 .next-content a:hover{text-decoration:underline}
 .card h2{display:flex;align-items:center;gap:8px}
 .card .src{flex:1}
 .refresh-btn{border:1px solid #30363d;background:#0d1117;color:#8b949e;border-radius:6px;padding:2px 10px;font:11px/1.6 system-ui,Segoe UI,sans-serif;cursor:pointer}
 .refresh-btn:hover{color:#e6edf3;border-color:#8b949e}
 .refresh-btn:disabled{opacity:.5;cursor:default}
 .adopt-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
 .adopt-table th{color:#8b949e;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.03em;text-align:left;padding:4px 10px 4px 0}
 .adopt-table td{padding:4px 10px 4px 0;border-top:1px solid #21262d}
 .adopt-table .stat{font-variant-numeric:tabular-nums;font-weight:600}
 .adopt-table .err{color:#f85149;font-size:12px}
 .adopt-table a{color:#58a6ff;text-decoration:none}
 .adopt-table a:hover{text-decoration:underline}
 .adopt-table .issue-row{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 #adoptGithub{table-layout:fixed}
 #adoptGithub td{white-space:nowrap;overflow:hidden}
 .adopt-table tbody tr:nth-child(even){background:#0d1117}
 .pill-stars{background:#3d2f00;color:#e3b341}
 .pill-forks{background:#0d2847;color:#58a6ff}
 .pill-issues-zero{background:#0f2e1a;color:#3fb950}
 .pill-issues-open{background:#3d2b00;color:#e3b341}
 a.pill:hover{filter:brightness(1.2);text-decoration:none}
 .issue-pill{display:inline-block;background:#21262d;color:#79c0ff;border-radius:10px;padding:1px 8px;margin-left:4px;text-decoration:none}
 .issue-pill:hover{background:#2d333b;text-decoration:none}
 .expand-btn{background:none;border:none;color:#8b949e;cursor:pointer;font-size:10px;padding:0;width:16px;text-align:center}
 .expand-btn:hover{color:#e6edf3}
 .expand-spacer{display:inline-block;width:16px}
 tr.issue-detail td{background:#0d1117;border-top:none;padding:2px 10px 8px 30px}
 .issue-full-line{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 0}
 .issue-full-line a{color:#79c0ff}
 .status-icon{font-size:14px}
 #adoptExtSites{table-layout:fixed}
 #adoptExtSites td{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body>
<header><h1>MDZip Workspace</h1><div class="head-actions"><span class="meta" id="meta">loading…</span><div class="links-menu-wrap"><button class="pause-btn" id="linksBtn" type="button" aria-haspopup="true" aria-expanded="false">Links ▾</button><div class="links-menu" id="linksMenu" role="menu" hidden></div></div><button class="pause-btn" id="pauseBtn" type="button" title="Pause auto-refresh">Pause</button></div></header>
<nav class="tabs"><button class="tab-btn active" id="tabRepos" type="button">Repos</button><button class="tab-btn" id="tabNext" type="button">Next</button><button class="tab-btn" id="tabAdoption" type="button">Adoption</button></nav>
<section id="viewRepos">
<table><thead><tr><th>Project</th><th>Version</th><th>Git</th><th>Deps</th><th>Status</th></tr></thead><tbody id="rows"></tbody></table>
</section>
<section id="viewNext" hidden>
<div class="card"><h2>Roadmap — in progress / planned</h2><div class="src">docs/roadmap.md</div><div class="next-content" id="roadmapContent"></div></div>
<div class="card"><h2>Next big moves</h2><div class="src">planning/notes.md (private repo)</div><div class="next-content" id="movesContent"></div></div>
</section>
<section id="viewAdoption" hidden>
<div class="card"><h2><span class="src" id="adoptionMeta">loading…</span><button class="refresh-btn" id="adoptionRefreshBtn" type="button">Refresh now</button></h2></div>
<div class="card"><h2>GitHub — stars / forks / open issues</h2><table class="adopt-table" id="adoptGithub"></table></div>
<div class="card"><h2>npm — weekly downloads</h2><table class="adopt-table" id="adoptNpm"></table></div>
<div class="card"><h2>NuGet — total downloads</h2><table class="adopt-table" id="adoptNuget"></table></div>
<div class="card"><h2>VS Code Marketplace — installs</h2><table class="adopt-table" id="adoptMarketplace"></table></div>
<div class="card"><h2>Google Search Console</h2><div class="src" id="adoptGscRange"></div><table class="adopt-table" id="adoptGscSummary"></table><table class="adopt-table" id="adoptGscQueries" style="margin-top:12px"></table></div>
<div class="card"><h2>File extension listing sites</h2><div class="src">adoption/drafts/file-extension-submission.md (local, not a repo)</div><table class="adopt-table" id="adoptExtSites"></table></div>
</section>
<footer class="legend" id="legend">🧭 hub · 📋 spec · ⚙️ core · 📦 libs · 🖥️ apps · 🌐 website · <img src="/asset/mdzip-mark" alt="mark"> mark &nbsp;·&nbsp; 🔒 private (public = no icon) &nbsp;&nbsp;║&nbsp;&nbsp; <span class="pill st-idle">idle</span> <span class="pill st-prog">in progress</span> <span class="pill st-test">awaiting test</span> <span class="pill st-commit">ready to commit</span> <span class="pill st-block">blocked</span></footer>
<script>
const REFRESH=5000;
const meta={updated:'',count:0,err:null};
const nextBoundary=()=>Math.ceil((Date.now()+1)/REFRESH)*REFRESH;
let nextAt=nextBoundary();
let paused=false;
function renderMeta(){
 const el=document.getElementById('meta');
 if(meta.err){ el.textContent=meta.err; return; }
 if(paused){ el.textContent='updated '+meta.updated+'  ·  '+meta.count+' repos  ·  paused'; return; }
 const s=Math.max(0,Math.ceil((nextAt-Date.now())/1000));
 el.textContent='updated '+meta.updated+'  ·  '+meta.count+' repos  ·  refresh in '+s+'s';
}
async function load(){
 const r = await fetch('/api/status'); const d = await r.json();
 if(d.error){ meta.err=d.error; } else { meta.err=null; meta.count=d.repos.length; }
 const typeOrder=['hub','spec','core','libs','apps','website','mark'];
 const typeIcon={hub:'🧭',spec:'📋',core:'⚙️',libs:'📦',apps:'🖥️',website:'🌐',mark:'🏷️'};
 const stateMeta={'idle':{label:'idle',cls:'st-idle'},'in-progress':{label:'in progress',cls:'st-prog'},'awaiting-test':{label:'awaiting test',cls:'st-test'},'ready-to-commit':{label:'ready to commit',cls:'st-commit'},'blocked':{label:'blocked',cls:'st-block'}};
 const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 const attr = s => esc(s).replace(/"/g,'&quot;');
 const rowHtml = x => {
   const git = '<span class="'+(x.gitDirty?'dirty':'clean')+'">'+x.git+'</span><span class="detail"> @'+x.branch+'</span>';
   let deps;
   if(x.deps==='behind'){deps='<span class="pill behind">behind</span><div class="detail">'+x.behind.map(b=>b.dep+' '+b.pinned+' &lt; '+b.current).join('<br>')+'</div>';}
   else if(x.deps==='up to date'){deps='<span class="pill uptodate">up to date</span>';}
   else{deps='<span class="na">'+x.deps+'</span>';}
   const sm = stateMeta[x.state] || {label:x.state||'idle',cls:'st-idle'};
   const stxt = x.last ? ' <span class="next">'+esc(x.last)+'</span>' : '';
   const badges = (x.badges||[]).map(b=>'<a href="'+attr(b.href)+'" target="_blank" rel="noopener noreferrer"><img class="badge" src="'+attr(b.img)+'" alt="'+attr(b.alt)+'" loading="lazy"></a>').join(' ');
   const badgeLine = badges ? '<div class="badges">'+badges+'</div>' : '';
   const status = '<span class="pill '+sm.cls+'">'+sm.label+'</span>'+stxt+badgeLine;
   const ver = '<span class="ver">'+x.version+'</span>'+((x.vsrc==='tag'||x.vsrc==='status')?'<span class="detail"> '+x.vsrc+'</span>':'');
   const vis = x.visibility==='private' ? '<span class="vis" title="private">🔒</span>' : '';
   const tico = x.icon
     ? '<img class="tico-img" title="'+(x.type||'')+'" alt="'+(x.type||'')+'" src="/asset/'+encodeURIComponent(x.name)+'">'
     : '<span class="tico" title="'+(x.type||'?')+'">'+(typeIcon[x.type]||'•')+'</span>';
   const name = x.remote
     ? '<a href="'+attr(x.remote)+'" target="_blank" rel="noopener noreferrer">'+esc(x.name)+'</a>'
     : esc(x.name);
   return '<tr><td><div class="name">'+tico+name+vis+'</div><div class="role">'+esc(x.role)+'</div></td><td>'+ver+'</td><td>'+git+'</td><td>'+deps+'</td><td>'+status+'</td></tr>';
 };
 const rank = t => { const i=typeOrder.indexOf(t); return i<0?99:i; };
 const sorted=(d.repos||[]).slice().sort((a,b)=> rank(a.type)-rank(b.type) || a.name.localeCompare(b.name));
 document.getElementById('rows').innerHTML = sorted.map(rowHtml).join('') || '<tr><td colspan=5>No repos.</td></tr>';
 const linkCatHtml = c => '<h4>'+esc(c.cat)+'</h4>'+(c.items||[]).map(i=>'<a href="'+attr(i.href)+'" target="_blank" rel="noopener noreferrer" role="menuitem">'+esc(i.label)+'</a>').join('');
 document.getElementById('linksMenu').innerHTML = (d.links||[]).map(linkCatHtml).join('');
 const next = d.next || {};
 document.getElementById('roadmapContent').innerHTML = next.roadmapHtml || '<p class="detail">'+esc(next.roadmapError||'No content.')+'</p>';
 document.getElementById('movesContent').innerHTML = next.movesHtml || '<p class="detail">'+esc(next.movesError||'No content.')+'</p>';
 renderMeta();
}
const fmtNum = n => (n===null||n===undefined) ? '—' : n.toLocaleString();
const escA = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const attrA = s => escA(s).replace(/"/g,'&quot;');
function adoptRows(items, cols, colWidths, detailRow){
 // cols: [{th, val(x)}]  — a row with !x.ok spans an error message instead
 // colWidths: optional CSS widths per column (paired with table-layout:fixed
 // on that <table> in CSS) so a column can truncate instead of growing.
 // detailRow(x): optional — returns an extra <tr> (or '') appended after x's row.
 const colgroup = colWidths ? '<colgroup>'+colWidths.map(w=>'<col'+(w?' style="width:'+w+'"':'')+'>').join('')+'</colgroup>' : '';
 const head = '<thead><tr>'+cols.map(c=>'<th>'+c.th+'</th>').join('')+'</tr></thead>';
 const body = (items||[]).map(x=>{
   if(!x.ok) return '<tr><td>'+escA(x.pkg||x.id||x.ext||x.name||'?')+'</td><td colspan="'+(cols.length-1)+'" class="err">'+escA(x.error||'error')+'</td></tr>';
   const row = '<tr>'+cols.map(c=>'<td'+(c.stat?' class="stat"':'')+'>'+c.val(x)+'</td>').join('')+'</tr>';
   return row+(detailRow ? (detailRow(x)||'') : '');
 }).join('') || '<tr><td>No data yet.</td></tr>';
 return colgroup+head+'<tbody>'+body+'</tbody>';
}
const expandedRepos = new Set();
function renderGithubTable(github){
 document.getElementById('adoptGithub').innerHTML = adoptRows(github, [
   {th:'', val:x=>(x.issues&&x.issues.length)
     ? '<button class="expand-btn" type="button" data-repo="'+attrA(x.name)+'">'+(expandedRepos.has(x.name)?'▾':'▸')+'</button>'
     : '<span class="expand-spacer"></span>'},
   {th:'Repo', val:x=>escA(x.name)},
   {th:'Stars', val:x=>'<span class="pill pill-stars">★ '+fmtNum(x.stars)+'</span>'},
   {th:'Forks', val:x=>'<span class="pill pill-forks">'+fmtNum(x.forks)+'</span>'},
   {th:'Open issues', val:x=>{
     const issueCls = x.openIssues>0 ? 'pill-issues-open' : 'pill-issues-zero';
     const count = x.issuesUrl
       ? '<a href="'+attrA(x.issuesUrl)+'" target="_blank" rel="noopener noreferrer" class="pill '+issueCls+'">'+fmtNum(x.openIssues)+'</a>'
       : '<span class="pill '+issueCls+'">'+fmtNum(x.openIssues)+'</span>';
     if(expandedRepos.has(x.name) || !x.issues || !x.issues.length) return '<div class="issue-row">'+count+'</div>';
     const items = x.issues.map(i=>'<a href="'+attrA(i.url)+'" target="_blank" rel="noopener noreferrer" class="issue-pill">#'+i.number+' '+escA(i.title)+'</a>');
     const plain = fmtNum(x.openIssues)+' open'+'  ·  '+x.issues.map(i=>'#'+i.number+' '+i.title).join('  ·  ');
     return '<div class="issue-row" title="'+attrA(plain)+'">'+count+items.join('')+'</div>';
   }},
 ], ['22px','170px','80px','70px',''], x=>{
   if(!expandedRepos.has(x.name) || !x.issues || !x.issues.length) return '';
   const lines = x.issues.map(i=>'<div class="issue-full-line" title="'+attrA('#'+i.number+' '+i.title)+'"><a href="'+attrA(i.url)+'" target="_blank" rel="noopener noreferrer">#'+i.number+' '+escA(i.title)+'</a></div>').join('');
   return '<tr class="issue-detail"><td colspan="5">'+lines+'</td></tr>';
 });
}
document.getElementById('adoptGithub').addEventListener('click', e=>{
 const btn = e.target.closest('.expand-btn');
 if(!btn) return;
 const name = btn.getAttribute('data-repo');
 if(expandedRepos.has(name)) expandedRepos.delete(name); else expandedRepos.add(name);
 if(lastAdoptionData) renderGithubTable(lastAdoptionData.github);
});
let lastAdoptionData = null;
async function loadAdoption(){
 const r = await fetch('/api/adoption'); const d = await r.json();
 lastAdoptionData = d;
 renderGithubTable(d.github);
 document.getElementById('adoptNpm').innerHTML = adoptRows(d.npm, [
   {th:'Package', val:x=>escA(x.pkg)},
   {th:'Weekly downloads', stat:true, val:x=>fmtNum(x.weeklyDownloads)},
 ]);
 document.getElementById('adoptNuget').innerHTML = adoptRows(d.nuget, [
   {th:'Package', val:x=>escA(x.id)},
   {th:'Total downloads', stat:true, val:x=>fmtNum(x.downloads)},
   {th:'Version', val:x=>escA(x.version||'—')},
 ]);
 document.getElementById('adoptMarketplace').innerHTML = adoptRows(d.marketplace, [
   {th:'Extension', val:x=>escA(x.ext)},
   {th:'Installs', stat:true, val:x=>fmtNum(x.installs)},
   {th:'Rating', val:x=>x.rating?(x.rating.toFixed(1)+' ('+fmtNum(x.ratingCount)+')'):'—'},
 ]);
 const gsc = d.searchConsole;
 if(gsc && gsc.ok){
   document.getElementById('adoptGscRange').textContent = gsc.siteUrl+'  ·  '+gsc.range.startDate+' to '+gsc.range.endDate;
   document.getElementById('adoptGscSummary').innerHTML =
     '<thead><tr><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Avg position</th></tr></thead><tbody><tr>'+
     '<td class="stat">'+fmtNum(gsc.clicks)+'</td><td class="stat">'+fmtNum(gsc.impressions)+'</td>'+
     '<td class="stat">'+(gsc.ctr*100).toFixed(1)+'%</td><td class="stat">'+gsc.position.toFixed(1)+'</td></tr></tbody>';
   document.getElementById('adoptGscQueries').innerHTML = adoptRows(gsc.topQueries.map(q=>Object.assign({ok:true},q)), [
     {th:'Query', val:x=>escA(x.query)},
     {th:'Clicks', stat:true, val:x=>fmtNum(x.clicks)},
     {th:'Impressions', stat:true, val:x=>fmtNum(x.impressions)},
     {th:'CTR', stat:true, val:x=>(x.ctr*100).toFixed(1)+'%'},
     {th:'Position', stat:true, val:x=>x.position.toFixed(1)},
   ]);
 } else {
   document.getElementById('adoptGscRange').textContent = '';
   document.getElementById('adoptGscSummary').innerHTML = '<tbody><tr><td class="err">'+escA((gsc&&gsc.error)||'not configured')+'</td></tr></tbody>';
   document.getElementById('adoptGscQueries').innerHTML = '';
 }
 const extSites = d.extensionSites;
 if(extSites && extSites.ok){
   const statusOrder = {done:0, pending:1, responding:2, none:3, skip:4};
   const sortedSites = extSites.sites.slice().sort((a,b)=>(statusOrder[a.status]??9)-(statusOrder[b.status]??9));
   document.getElementById('adoptExtSites').innerHTML = adoptRows(sortedSites.map(s=>Object.assign({ok:true},s)), [
     {th:'Site', val:x=> x.url ? '<a href="'+attrA(x.url)+'" target="_blank" rel="noopener noreferrer">'+escA(x.name)+'</a>' : escA(x.name)},
     {th:'Status', val:x=>'<span class="status-icon" title="'+attrA(x.status)+'">'+escA(x.icon)+'</span>'},
     {th:'Notes', val:x=>'<span title="'+attrA(x.notes)+'">'+escA(x.notes)+'</span>'},
   ], ['150px','110px','']);
 } else {
   document.getElementById('adoptExtSites').innerHTML = '<tbody><tr><td class="err">'+escA((extSites&&extSites.error)||'not available')+'</td></tr></tbody>';
 }
 const genTxt = d.generated ? 'checked '+new Date(d.generated).toLocaleString() : 'not checked yet';
 const errTxt = d.refreshError ? '  ·  last refresh failed: '+escA(d.refreshError) : '';
 document.getElementById('adoptionMeta').textContent = (d.refreshing ? 'refreshing…  ·  ' : '') + genTxt + errTxt;
 const btn = document.getElementById('adoptionRefreshBtn');
 btn.disabled = !!d.refreshing;
 return d.refreshing;
}
let adoptionPollTimer = null;
document.getElementById('adoptionRefreshBtn').addEventListener('click', async ()=>{
 await fetch('/api/adoption/refresh', { method:'POST' });
 if(adoptionPollTimer) clearInterval(adoptionPollTimer);
 adoptionPollTimer = setInterval(async ()=>{
   const stillRefreshing = await loadAdoption();
   if(!stillRefreshing){ clearInterval(adoptionPollTimer); adoptionPollTimer=null; }
 }, 2000);
});
function stampAt(at){ meta.updated=new Date(at).toLocaleTimeString(); }
function tick(){
 if(paused){ renderMeta(); return; }
 if(Date.now()>=nextAt){ const at=nextAt; nextAt=nextBoundary(); stampAt(at); load(); }
 renderMeta();
}
document.getElementById('pauseBtn').addEventListener('click',()=>{
 paused=!paused;
 const btn=document.getElementById('pauseBtn');
 btn.textContent=paused?'Play':'Pause';
 btn.title=paused?'Resume auto-refresh':'Pause auto-refresh';
 if(!paused){ nextAt=nextBoundary(); }
 renderMeta();
});
function closeLinksMenu(){
 const menu=document.getElementById('linksMenu');
 if(menu.hidden) return;
 menu.hidden=true;
 document.getElementById('linksBtn').setAttribute('aria-expanded','false');
}
document.getElementById('linksBtn').addEventListener('click',(e)=>{
 e.stopPropagation();
 const btn=document.getElementById('linksBtn');
 const menu=document.getElementById('linksMenu');
 const opening=menu.hidden;
 menu.hidden=!opening;
 btn.setAttribute('aria-expanded', opening?'true':'false');
});
document.addEventListener('click', closeLinksMenu);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLinksMenu(); });
const TAB_KEY = 'mdzipDashboardTab';
function showTab(tab, persist){
 document.getElementById('viewRepos').hidden = tab!=='repos';
 document.getElementById('viewNext').hidden = tab!=='next';
 document.getElementById('viewAdoption').hidden = tab!=='adoption';
 document.getElementById('legend').hidden = tab!=='repos';
 document.getElementById('tabRepos').classList.toggle('active', tab==='repos');
 document.getElementById('tabNext').classList.toggle('active', tab==='next');
 document.getElementById('tabAdoption').classList.toggle('active', tab==='adoption');
 if(persist!==false){ try{ localStorage.setItem(TAB_KEY, tab); }catch{} }
}
document.getElementById('tabRepos').addEventListener('click', ()=>showTab('repos'));
document.getElementById('tabNext').addEventListener('click', ()=>showTab('next'));
document.getElementById('tabAdoption').addEventListener('click', ()=>{ showTab('adoption'); loadAdoption(); });
let savedTab = 'repos';
try{ savedTab = localStorage.getItem(TAB_KEY) || 'repos'; }catch{}
showTab(savedTab, false);
stampAt(Math.floor(Date.now()/REFRESH)*REFRESH); load(); setInterval(tick, 200);
loadAdoption(); setInterval(loadAdoption, 30000);
</script></body></html>`;

const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };

http.createServer(async (req, res) => {
  if (req.url.startsWith('/asset/')) {
    const name = decodeURIComponent(req.url.slice(7).split('?')[0]);
    try {
      const manifest = parseManifest(fs.readFileSync(MANIFEST, 'utf8'));
      const repo = manifest.repos.find(r => r.name === name);
      if (repo && repo.icon) {
        const file = path.resolve(repoDir(repo), repo.icon);
        // safety: keep the resolved path inside the repo dir
        if (file.startsWith(repoDir(repo)) && fs.existsSync(file)) {
          res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' });
          res.end(fs.readFileSync(file));
          return;
        }
      }
    } catch {}
    res.writeHead(404); res.end('not found');
  } else if (req.url.startsWith('/api/status')) {
    let data;
    try { data = await computeStatus(); }
    catch (e) { data = { error: String(e.message || e), repos: [] }; }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(data));
  } else if (req.url.startsWith('/api/adoption/refresh') && req.method === 'POST') {
    refreshAdoptionCache(); // fire-and-forget; client re-polls /api/adoption
    res.writeHead(202, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, refreshing: true }));
  } else if (req.url.startsWith('/api/adoption')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(Object.assign({ refreshing: adoptionRefreshing, extensionSites: readExtensionSites() }, adoptionCache)));
  } else {
    res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-cache' });
    res.end(PAGE);
  }
}).listen(PORT, () => {
  console.log('MDZip dashboard → http://localhost:' + PORT);
  console.log('workspace root  → ' + GITHUB_ROOT);
});
