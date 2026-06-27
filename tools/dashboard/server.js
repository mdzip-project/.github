#!/usr/bin/env node
// MDZip workspace dashboard — zero-dependency.
// Reads ../../docs/workspace.md, scans each repo live, serves an
// auto-refreshing status page. Run: node tools/dashboard/server.js
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const execFileP = require('util').promisify(execFile);
const gitOut = (dir, args) => execFileP('git', ['-C', dir, ...args], { encoding: 'utf8', maxBuffer: 4 << 20 }).then(r => r.stdout);

const PORT = process.env.PORT || 7777;
const GITHUB_ROOT = path.resolve(__dirname, '..', '..');         // the .github repo root
const MANIFEST = path.join(GITHUB_ROOT, 'docs', 'workspace.md');

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

// ---------- helpers ----------
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function repoDir(repo) { return path.resolve(GITHUB_ROOT, repo.path); }

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

    // STATUS.md: "Status:" = workflow state, "Next:" = description, "Version:" = version fallback
    let next = '', state = 'idle';
    try {
      const status = fs.readFileSync(path.join(dir, 'STATUS.md'), 'utf8');
      const stm = status.match(/^\s*Status:\s*(.+?)\s*$/mi);
      if (stm) state = stm[1].toLowerCase().trim().replace(/\s+/g, '-');
      const nm = status.match(/^\s*Next:\s*(.+?)\s*$/mi);
      if (nm) next = nm[1];
      else next = (status.split(/\r?\n/).find(l => l.trim() && !/^\s*(Status|Version):/i.test(l)) || '').replace(/^#*\s*/, '');
      if (!version) {
        const vm = status.match(/^\s*Version:\s*(.+?)\s*$/mi);
        if (vm) { version = vm[1].replace(/^v/, ''); vsrc = 'status'; }
      }
    } catch {}
    if (!version) { version = '—'; vsrc = 'none'; }

    return {
      name: repo.name, role: repo.role || '', branch: git.branch,
      type: repo.type || '', visibility: repo.visibility || '', icon: repo.icon || '',
      version, vsrc,
      git: git.ok ? (git.changes === 0 ? 'clean' : git.changes + ' changed') : (git.error || 'error'),
      gitDirty: git.changes > 0 || !git.ok,
      deps: depsState, behind, next, state,
    };
  }));

  return { generated: new Date().toISOString(), root: GITHUB_ROOT, repos: rows };
}

// ---------- HTML ----------
const PAGE = `<!doctype html><html><head><meta charset="utf8">
<title>MDZip Workspace</title>
<style>
 body{font:14px/1.5 system-ui,Segoe UI,sans-serif;margin:0;background:#0d1117;color:#e6edf3;padding-bottom:66px}
 header{padding:14px 20px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:baseline}
 h1{font-size:16px;margin:0} .meta{color:#8b949e;font-size:12px}
 table{width:100%;border-collapse:collapse} th,td{padding:9px 20px;text-align:left;border-bottom:1px solid #21262d;vertical-align:top}
 th{color:#8b949e;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
 .name{font-weight:600} .role{color:#8b949e;font-size:12px} .ver{font-variant-numeric:tabular-nums;font-weight:600}
 .pill{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;font-weight:600}
 .clean{color:#3fb950} .dirty{color:#d29922} .behind{background:#3d2b00;color:#e3b341}
 .uptodate{background:#0f2e1a;color:#3fb950} .na{color:#6e7681} .next{color:#c9d1d9}
 .st-idle{background:#21262d;color:#8b949e} .st-prog{background:#0d2847;color:#58a6ff} .st-test{background:#3d2b00;color:#e3b341} .st-commit{background:#0f2e1a;color:#3fb950} .st-block{background:#3d1418;color:#f85149}
 .detail{color:#8b949e;font-size:12px} a{color:inherit}
 .tico{margin-right:7px} .tico-img{width:16px;height:16px;vertical-align:-3px;margin-right:7px} .vis{margin-left:7px;font-size:12px}
 footer.legend{position:fixed;left:0;right:0;bottom:0;background:#161b22;border-top:1px solid #30363d;padding:8px 20px;color:#8b949e;font-size:12px}
 footer.legend img{width:14px;height:14px;vertical-align:-3px;margin:0 2px}
</style></head><body>
<header><h1>MDZip Workspace</h1><span class="meta" id="meta">loading…</span></header>
<table><thead><tr><th>Project</th><th>Version</th><th>Git</th><th>Deps</th><th>Status</th></tr></thead><tbody id="rows"></tbody></table>
<footer class="legend">🧭 hub · 📋 spec · ⚙️ core · 📦 libs · 🖥️ apps · 🌐 website · <img src="/asset/mdzip-mark" alt="mark"> mark &nbsp;·&nbsp; 🔒 private (public = no icon) &nbsp;&nbsp;║&nbsp;&nbsp; <span class="pill st-idle">idle</span> <span class="pill st-prog">in progress</span> <span class="pill st-test">awaiting test</span> <span class="pill st-commit">ready to commit</span> <span class="pill st-block">blocked</span></footer>
<script>
const REFRESH=5000;
const meta={updated:'',count:0,err:null};
const nextBoundary=()=>Math.ceil((Date.now()+1)/REFRESH)*REFRESH;
let nextAt=nextBoundary();
function renderMeta(){
 const el=document.getElementById('meta');
 if(meta.err){ el.textContent=meta.err; return; }
 const s=Math.max(0,Math.ceil((nextAt-Date.now())/1000));
 el.textContent='updated '+meta.updated+'  ·  '+meta.count+' repos  ·  refresh in '+s+'s';
}
async function load(){
 const r = await fetch('/api/status'); const d = await r.json();
 if(d.error){ meta.err=d.error; } else { meta.err=null; meta.count=d.repos.length; }
 const typeOrder=['hub','spec','core','libs','apps','website','mark'];
 const typeIcon={hub:'🧭',spec:'📋',core:'⚙️',libs:'📦',apps:'🖥️',website:'🌐',mark:'🏷️'};
 const stateMeta={'idle':{label:'idle',cls:'st-idle'},'in-progress':{label:'in progress',cls:'st-prog'},'awaiting-test':{label:'awaiting test',cls:'st-test'},'ready-to-commit':{label:'ready to commit',cls:'st-commit'},'blocked':{label:'blocked',cls:'st-block'}};
 const esc = s => s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 const rowHtml = x => {
   const git = '<span class="'+(x.gitDirty?'dirty':'clean')+'">'+x.git+'</span><span class="detail"> @'+x.branch+'</span>';
   let deps;
   if(x.deps==='behind'){deps='<span class="pill behind">behind</span><div class="detail">'+x.behind.map(b=>b.dep+' '+b.pinned+' &lt; '+b.current).join('<br>')+'</div>';}
   else if(x.deps==='up to date'){deps='<span class="pill uptodate">up to date</span>';}
   else{deps='<span class="na">'+x.deps+'</span>';}
   const sm = stateMeta[x.state] || {label:x.state||'idle',cls:'st-idle'};
   const stxt = x.next ? ' <span class="next">'+esc(x.next)+'</span>' : '';
   const status = '<span class="pill '+sm.cls+'">'+sm.label+'</span>'+stxt;
   const ver = '<span class="ver">'+x.version+'</span>'+((x.vsrc==='tag'||x.vsrc==='status')?'<span class="detail"> '+x.vsrc+'</span>':'');
   const vis = x.visibility==='private' ? '<span class="vis" title="private">🔒</span>' : '';
   const tico = x.icon
     ? '<img class="tico-img" title="'+(x.type||'')+'" alt="'+(x.type||'')+'" src="/asset/'+encodeURIComponent(x.name)+'">'
     : '<span class="tico" title="'+(x.type||'?')+'">'+(typeIcon[x.type]||'•')+'</span>';
   return '<tr><td><div class="name">'+tico+x.name+vis+'</div><div class="role">'+x.role+'</div></td><td>'+ver+'</td><td>'+git+'</td><td>'+deps+'</td><td>'+status+'</td></tr>';
 };
 const rank = t => { const i=typeOrder.indexOf(t); return i<0?99:i; };
 const sorted=(d.repos||[]).slice().sort((a,b)=> rank(a.type)-rank(b.type) || a.name.localeCompare(b.name));
 document.getElementById('rows').innerHTML = sorted.map(rowHtml).join('') || '<tr><td colspan=5>No repos.</td></tr>';
 renderMeta();
}
function stampAt(at){ meta.updated=new Date(at).toLocaleTimeString(); }
function tick(){
 if(Date.now()>=nextAt){ const at=nextAt; nextAt=nextBoundary(); stampAt(at); load(); }
 renderMeta();
}
stampAt(Math.floor(Date.now()/REFRESH)*REFRESH); load(); setInterval(tick, 200);
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
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(PAGE);
  }
}).listen(PORT, () => {
  console.log('MDZip dashboard → http://localhost:' + PORT);
  console.log('workspace root  → ' + GITHUB_ROOT);
});
