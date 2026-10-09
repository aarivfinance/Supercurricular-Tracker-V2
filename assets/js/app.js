/* ============================================================
   Admissions Home
   Everything you type is saved in this browser (localStorage).
   Use Overview → "Back up" to export a JSON copy.
   ============================================================ */
(function(){
'use strict';

/* ---------------- store ---------------- */
const KEY = 'apphub.v1';
const DEFAULTS = () => ({
  sc:{}, scCustom:[], books:[], projects:[], restorePoints:[], opMeta:{}, reviewDecisions:{}, extras:[], work:[], contacts:[], openings:[],
  resCustom:[], resFav:{}, uni:{}, uniCustom:[], grades:'', cv:null,
  settings:{ theme:'auto' }
});
let S = load();
function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw) return Object.assign(DEFAULTS(), JSON.parse(raw));
  }catch(e){}
  return DEFAULTS();
}
let savedTimer;
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S)); }
  catch(e){ toast('Could not save — browser storage is blocked or full'); return; }
  const s = document.getElementById('saved');
  s.classList.add('on'); clearTimeout(savedTimer);
  savedTimer = setTimeout(() => s.classList.remove('on'), 1200);
}

/* ---------------- utils ---------------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const strip = s => String(s ?? '').replace(/<[^>]*>/g, '');
const slug = s => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const safeUrl = u => /^(https?:|mailto:|tel:)/i.test(u || '') ? u : (u ? 'https://' + u.replace(/^\/+/, '') : '');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function parseD(s){ if(!s) return null; const [y,m,d] = s.split('-').map(Number); return (y && m && d) ? new Date(y, m-1, d) : null; }
function today(){ const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function daysUntil(s){ const d = parseD(s); return d ? Math.round((d - today()) / 864e5) : null; }
function fmtD(s, withYear){
  const d = parseD(s); if(!d) return '';
  const y = (withYear || d.getFullYear() !== today().getFullYear()) ? ' ' + d.getFullYear() : '';
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + y;
}
function ago(s){
  const n = -daysUntil(s);
  if(n === null || isNaN(n)) return '';
  if(n <= 0) return 'Today'; if(n === 1) return 'Yesterday';
  if(n < 7) return n + ' days ago'; if(n < 30) return Math.floor(n/7) + (n < 14 ? ' week ago' : ' weeks ago');
  return fmtD(s);
}
function isoToday(){ const d = today(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2200); }
function debounce(fn, ms){ let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ---------------- icons ---------------- */
const I = (p, s=16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC = {
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  cap:'<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  star:'<path d="m12 3 2.9 5.9 6.1.9-4.5 4.3 1.1 6.1L12 17.3 6.4 20.2l1.1-6.1L3 9.8l6.1-.9z"/>',
  run:'<circle cx="13" cy="4" r="2"/><path d="m7 21 3-6 3 2v5M5 12l3-3 4 1 3 3 3 1"/>',
  radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 5"/>',
  brief:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  doc:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  chev:'<path d="m6 9 6 6 6-6"/>',
  warn:'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  auto:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  check:'<path d="m5 12 5 5L20 7"/>',
  print:'<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>',
  down:'<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  up:'<path d="M12 20V8M6 14l6-6 6 6M4 4h16"/>',
  bolt:'<path d="M13 2 4 14h8l-1 8 9-12h-8z"/>',
};

/* ---------------- navigation ---------------- */
const NAV = [
  { k:'academics', label:'Academics', items:[
    { k:'universities', label:'Universities',      desc:'Courses, offers and A-level requirements',            ic:'cap',  c:'var(--law)' },
    { k:'lectures',     label:'Academic lectures', desc:'Free public lectures in London and online',           ic:'book', c:'var(--econ)' },
  ]},
  { k:'cocurricular', label:'Co-curriculars', items:[
    { k:'supercurriculars', label:'Supercurriculars', desc:'Competitions and programmes by date, and your log',  ic:'trophy', c:'var(--accent)' },
    { k:'extracurriculars', label:'Extracurriculars', desc:'Sport, music, leadership, volunteering',             ic:'run',    c:'var(--phil)' },
  ]},
  { k:'professional', label:'Professional', items:[
    { k:'openings', label:'Openings',               desc:'Spring weeks, internships and apprenticeships',     ic:'radar', c:'var(--new)' },
    { k:'work',     label:'Work experience logger', desc:'Placements you’ve done, and what you learned',      ic:'brief', c:'var(--teal)' },
    { k:'projects', label:'Projects',               desc:'AI workflows, automations and things you’ve built', ic:'bolt',  c:'var(--multi)' },
    { k:'contacts', label:'Networking & contacts',  desc:'People you’ve met and when to follow up',           ic:'users', c:'var(--pol)' },
    { k:'cv',       label:'CV builder',             desc:'One-page CV built from your logs',                  ic:'doc',   c:'var(--multi)' },
  ]},
];
const PAGES = {};
NAV.forEach(g => g.items.forEach(it => PAGES[it.k] = Object.assign({ group:g }, it)));
PAGES.about = { k:'about', label:'About', group:{ k:'about', label:'Admissions Home' } };

function ddItem(it, cur){
  return `<a class="dd-item" href="#${it.k}" style="--ic:${it.c}" ${it.k === cur ? 'aria-current="page"' : ''}>
    <span class="dd-ico">${I(IC[it.ic], 17)}</span><span><b>${it.label}</b><span>${it.desc}</span></span></a>`;
}
function buildNav(cur){
  const curGroup = PAGES[cur] ? PAGES[cur].group.k : null;
  $('#menus').innerHTML = NAV.map(g => `
    <div class="menu ${g.k === curGroup ? 'active' : ''}" data-k="${g.k}">
      <button aria-haspopup="true" aria-expanded="false">${g.label}${I(IC.chev, 14)}</button>
      <div class="dropdown" role="menu">${g.items.map(it => ddItem(it, cur)).join('')}</div>
    </div>`).join('') + `<a class="menu-link" href="#about" ${cur === 'about' ? 'aria-current="page"' : ''}>About</a>`;
  $('#mobileMenu').innerHTML = `<a class="dd-item" href="#home"><span class="dd-ico">${I(IC.star,17)}</span><span><b>Overview</b><span>Everything at a glance</span></span></a>`
    + NAV.map(g => `<h4>${g.label}</h4>` + g.items.map(it => ddItem(it, cur)).join('')).join('')
    + `<h4>Admissions Home</h4><a class="dd-item" href="#about"><span class="dd-ico">${I(IC.flag,17)}</span><span><b>About</b><span>What each part of the site is for</span></span></a>`;
}
function closeMenus(){ $$('.menu.open').forEach(m => { m.classList.remove('open'); $('button', m).setAttribute('aria-expanded','false'); }); }
document.addEventListener('click', e => {
  const btn = e.target.closest('.menu > button');
  if(btn){
    const m = btn.parentElement, was = m.classList.contains('open');
    closeMenus();
    if(!was){ m.classList.add('open'); btn.setAttribute('aria-expanded','true'); }
    return;
  }
  if(!e.target.closest('.dropdown')) closeMenus();
});
// hover-open on desktop pointers
document.addEventListener('mouseover', e => {
  if(!matchMedia('(hover:hover)').matches) return;
  const m = e.target.closest('.menu');
  if(m && !m.classList.contains('open')){ closeMenus(); m.classList.add('open'); }
});
document.addEventListener('mouseout', e => {
  if(!matchMedia('(hover:hover)').matches) return;
  const m = e.target.closest('.menu');
  if(m && !m.contains(e.relatedTarget)) m.classList.remove('open');
});
$('#burger').onclick = () => $('#mobileMenu').classList.toggle('open');
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ closeMenus(); closeDrawer(); $('#mobileMenu').classList.remove('open'); } });

/* ---------------- theme ---------------- */
function applyTheme(){
  const t = S.settings.theme || 'auto';
  if(t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const b = $('#themeBtn');
  b.innerHTML = I(t === 'dark' ? IC.moon : t === 'light' ? IC.sun : IC.auto, 16);
  b.title = 'Theme: ' + t;
}
$('#themeBtn').onclick = () => {
  const order = ['auto','light','dark'];
  S.settings.theme = order[(order.indexOf(S.settings.theme || 'auto') + 1) % 3];
  save(); applyTheme(); toast('Theme: ' + S.settings.theme);
};

/* ---------------- drawer ---------------- */
function openDrawer(title, html, mount){
  const d = $('#drawer');
  d.innerHTML = `<div class="drawer-head"><span class="crumb" style="margin:0">${title}</span>
    <button class="icon-btn" data-close aria-label="Close">${I(IC.x, 16)}</button></div>
    <div class="drawer-body">${html}</div>`;
  $('[data-close]', d).onclick = closeDrawer;
  d.classList.add('open'); d.setAttribute('aria-hidden','false');
  $('#drawerBack').classList.add('open');
  if(mount) mount($('.drawer-body', d));
}
function closeDrawer(){
  $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden','true');
  $('#drawerBack').classList.remove('open');
}
$('#drawerBack').onclick = closeDrawer;

/* ---------------- form modal ---------------- */
/* fields: {k, label, type:text|textarea|select|date|url|email|tel|number|check, opts, full, hint, ph} */
function openForm({ title, fields, value = {}, onSave, onDelete, saveLabel = 'Save' }){
  const m = $('#modal');
  const f = fld => {
    const v = value[fld.k] ?? fld.def ?? '';
    const id = 'f_' + fld.k;
    let inp;
    if(fld.type === 'textarea') inp = `<textarea class="inp" id="${id}" name="${fld.k}" rows="${fld.rows||3}" placeholder="${esc(fld.ph||'')}">${esc(v)}</textarea>`;
    else if(fld.type === 'select') inp = `<select class="inp" id="${id}" name="${fld.k}">${fld.opts.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o || '—']; return `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
    else if(fld.type === 'subjects') return `<div class="field full"><span>${fld.label}${fld.hint ? ` <span class="hint">${fld.hint}</span>` : ''}</span>${subjPicker(fld.k, Array.isArray(v) ? v : [])}</div>`;
    else if(fld.type === 'check') return `<label class="field check ${fld.full ? 'full' : ''}"><input type="checkbox" name="${fld.k}" ${v ? 'checked' : ''}> ${fld.label}</label>`;
    else inp = `<input class="inp" id="${id}" name="${fld.k}" type="${fld.type||'text'}" value="${esc(v)}" placeholder="${esc(fld.ph||'')}" ${fld.list ? `list="${id}_l"` : ''}>` + (fld.list ? `<datalist id="${id}_l">${fld.list.map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : '');
    return `<label class="field ${fld.full || fld.type === 'textarea' ? 'full' : ''}" for="${id}">${fld.label}${fld.hint ? ` <span class="hint">${fld.hint}</span>` : ''}${inp}</label>`;
  };
  m.innerHTML = `<form method="dialog">
    <div class="dlg-head"><h3>${title}</h3><button type="button" class="icon-btn" data-x aria-label="Close">${I(IC.x,16)}</button></div>
    <div class="dlg-body">${fields.map(f).join('')}</div>
    <div class="dlg-foot">${onDelete ? '<button type="button" class="btn danger left" data-del>Delete</button>' : ''}
      <button type="button" class="btn" data-x>Cancel</button><button type="submit" class="btn primary">${saveLabel}</button></div></form>`;
  $$('[data-x]', m).forEach(b => b.onclick = () => m.close());
  if(onDelete) $('[data-del]', m).onclick = () => { if(confirm('Delete this entry?')){ onDelete(); m.close(); } };
  $('form', m).onsubmit = e => {
    e.preventDefault();
    const out = {};
    fields.forEach(fl => {
      if(fl.type === 'subjects'){ out[fl.k] = $$(`[name="${fl.k}"]:checked`, m).map(x => x.value); return; }
      const el = m.querySelector(`[name="${fl.k}"]`);
      out[fl.k] = fl.type === 'check' ? el.checked : fl.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim();
    });
    const req = fields.find(fl => fl.req && !out[fl.k]);
    if(req){ toast(req.label + ' is required'); return; }
    onSave(out); m.close();
  };
  m.showModal();
  const first = $('.inp', m); if(first) first.focus();
}

/* ---------------- shared bits ---------------- */
function head({ crumbs, title, sub, stats, actions }){
  return `<header class="page-head">
    <div class="crumb">${crumbs.join(' <i>/</i> ')}</div>
    <div class="head-row"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>
    ${actions ? `<div class="head-actions">${actions}</div>` : ''}</div>
    ${stats ? `<div class="stats">${stats.map(s => `<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>` : ''}
  </header>`;
}
const crumbsFor = k => [PAGES[k].group.label, PAGES[k].label];
const searchbar = (id, ph, v) => `<label class="searchbar">${I(IC.search, 17)}<input type="search" id="${id}" placeholder="${ph}" value="${esc(v)}" autocomplete="off"></label>`;
const selectBox = (id, all, opts, v) => `<select class="dd-sel" id="${id}"><option value="">${all}</option>${opts.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${ov === v ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
const sw = (id, label, on) => `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span class="knob"></span>${label}</label>`;
const emptyBox = (t, d, btn) => `<div class="empty"><b>${t}</b>${d}${btn ? `<br>${btn}` : ''}</div>`;
function bindSearch(id, fn){ const el = $('#' + id); if(el) el.addEventListener('input', debounce(e => fn(e.target.value.trim().toLowerCase()), 140)); }

/* ============================================================
   OVERVIEW
   ============================================================ */
function viewHome(v){
  const h = new Date().getHours();
  v.innerHTML = `<section class="welcome">
    <p class="w-date">${new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}</p>
    <h1>${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}.<br>Welcome.</h1>
    <nav class="w-index" aria-label="Sections">
      ${NAV.map(g => `<div class="w-col"><h2>${esc(g.label)}</h2>${g.items.map(i => `<a href="#${i.k}"><b>${esc(i.label)}</b><span>${esc(i.desc)}</span></a>`).join('')}</div>`).join('')}
    </nav>
  </section>`;
}
function countdown(deadline, opens, rolling){
  const od = daysUntil(opens);
  if(od !== null && od > 0) return `<span class="cd future">Opens ${fmtD(opens)}</span>`;
  if(rolling && !deadline) return `<span class="cd open">Rolling</span>`;
  const d = daysUntil(deadline);
  if(d === null) return `<span class="faint">·</span>`;
  if(d < 0) return `<span class="cd closed">Closed</span>`;
  if(d === 0) return `<span class="cd urgent">Closes today</span>`;
  if(d <= 3) return `<span class="cd urgent">${d} day${d > 1 ? 's' : ''} left</span>`;
  if(d <= 14) return `<span class="cd soon">${d} days left</span>`;
  return `<span class="cd open">${fmtD(deadline)}</span>`;
}

/* ============================================================
   SUPERCURRICULARS
   ============================================================ */
const SUBJ = [
  { k:'phil',  label:'Philosophy' }, { k:'pol', label:'Politics' }, { k:'econ', label:'Economics' },
  { k:'law',   label:'Law' },        { k:'multi', label:'Multi-subject' },
];
const SUBJ_L = Object.fromEntries(SUBJ.map(s => [s.k, s.label]));
/* an entry can cover several subjects: ss = ['pol','econ']. Older entries only have s (one key, or 'multi'). */
const CORE_SUBJ = SUBJ.filter(x => x.k !== 'multi');
function subjList(x, st){
  const a = st && st.ss && st.ss.length ? st.ss : x && x.ss && x.ss.length ? x.ss : x && x.s && x.s !== 'multi' ? [x.s] : [];
  return CORE_SUBJ.map(c => c.k).filter(k => a.includes(k));
}
function subjLabel(a){ const n = a.map(k => SUBJ_L[k]); return !n.length ? 'Multi-subject' : n.length === 1 ? n[0] : n.slice(0, -1).join(', ') + ' & ' + n[n.length - 1]; }
const subjKey = a => a.length === 1 ? a[0] : 'multi';
const subjPicker = (name, sel, small) => `<div class="subj-checks${small ? ' sm' : ''}" role="group" aria-label="Subjects">${CORE_SUBJ.map(c => `<label class="pill" style="--c:var(--${c.k})"><input type="checkbox" name="${name}" value="${c.k}" ${sel.includes(c.k) ? 'checked' : ''}><span class="dot"></span>${c.label}</label>`).join('')}</div>`;
const YEARS = [
  { k:'y11',   label:'Year 11',      range:'Sept 2026 – Aug 2027' },
  { k:'y1213', label:'Year 12 / 13', range:'Sept 2027 – Aug 2029' },
];
const ROLES = { m:{ lbl:'Grounding', cls:'r-ground', c:'var(--muted)' }, n:{ lbl:'Push further', cls:'r-push', c:'var(--econ)' },
                s:{ lbl:'Stand out', cls:'r-stand', c:'var(--law)' },    c:{ lbl:'Contrarian take', cls:'r-contra', c:'var(--pol)' } };
const ROLE_ORDER = ['m','n','s','c'];
const SC_STATUS = [['', 'Not started'], ['planning', 'Planning'], ['doing', 'In progress'], ['done', 'Done']];

let _scCache;
function allSc(){
  if(!_scCache){
    _scCache = [];
    Object.keys(SC_DATA).forEach(y => SC_DATA[y].forEach(g => g.items.forEach(it => {
      it.id = it.id || (y + ':' + slug(it.t)); it.year = y; it.month = g.month; _scCache.push(it);
    })));
  }
  return _scCache.concat(S.scCustom.map(c => Object.assign({ custom:true, month:'Your additions', yr:c.yr || '' }, c)));
}
const scState = id => S.sc[id] || {};
function setSc(id, patch){ S.sc[id] = Object.assign({}, S.sc[id], patch); save(); }

const scF = { year:'y11', subjects:new Set(), elig:false, saved:false, q:'', tab:'timeline' };


/* ---------- supercurricular live checks (data/supercurriculars-live.json, written by scripts/scan-supers.mjs) ---------- */
const SCL = { updated:null, items:{}, discovered:[], loaded:false, error:false };
async function loadScLive(silent){
  try{
    const r = await fetch('data/supercurriculars-live.json?t=' + Date.now(), { cache:'no-store' }); if(!r.ok) throw 0;
    const d = await r.json(); const had = SCL.loaded && SCL.updated;
    const before = new Set(SCL.discovered.map(x => x.id));
    Object.assign(SCL, { updated:d.updated, items:d.items || {}, discovered:d.discovered || [], loaded:true, error:false });
    const fresh = SCL.discovered.filter(x => !before.has(x.id)).length;
    if(had && fresh && !silent) toast(fresh + ' new competition' + (fresh > 1 ? 's' : '') + ' found');
  }catch(e){ SCL.loaded = true; SCL.error = true; }
  if(location.hash === '#supercurriculars') drawSc();
}
setInterval(() => loadScLive(false), 5 * 60 * 1000);
const scRecent = id => { const c = (SCL.items[id] || {}).changedOn; return c && daysUntil(c) >= -14; };
function scLiveLine(){
  if(!SCL.loaded) return '<span class="live"><i></i>Checking official pages…</span>';
  if(SCL.error) return '<span class="live off"><i></i>Live checks unavailable</span>';
  if(!SCL.updated) return '<span class="live wait"><i></i>Page checker set up · waiting for its first run</span>';
  const n = Object.keys(SCL.items).filter(scRecent).length;
  return `<span class="live"><i></i>Live · official pages checked ${ago(SCL.updated.slice(0,10)).toLowerCase()} at ${SCL.updated.slice(11,16)}${n ? ` · <b>${n} updated</b> in the last 2 weeks` : ''}</span>`;
}
function scPending(){ const d = S.scDecisions || {}; return SCL.discovered.filter(x => !d[x.id]); }
function drawScFinds(body){
  const list = scPending();
  body.innerHTML = `<div class="info" style="margin-bottom:16px">Competitions and programmes the scanner found on listing sites that aren’t in your planner yet. <b>Add</b> puts one under “Your additions”; <b>Dismiss</b> hides it.</div>`
   + (list.length ? `<div class="sc-list">${list.map(x => `<div class="sc-row c-${x.s}" style="cursor:default"><span class="bar"></span><div><h3>${esc(x.t)}</h3><div class="sw">Found ${esc(ago(x.found)).toLowerCase()} via ${esc(x.via)} · <a class="lnk" href="${esc(safeUrl(x.link))}" target="_blank" rel="noopener">Open ↗</a></div></div>
      <div class="sc-side"><button class="btn primary sm" data-add="${esc(x.id)}">Add</button><button class="btn sm" data-dis="${esc(x.id)}">Dismiss</button></div></div>`).join('')}</div>`
     : emptyBox('No new finds', 'When the scanner spots a competition that isn’t in your planner, it appears here.'));
  const dec = (id, v) => { S.scDecisions = Object.assign({}, S.scDecisions, { [id]:v }); };
  $$('[data-add]', body).forEach(b => b.onclick = () => { const x = SCL.discovered.find(d => d.id === b.dataset.add); dec(x.id, 'add'); S.scCustom.push({ id:'c:' + uid(), t:x.t, s:x.s, year:scF.year, link:x.link, note:'Found automatically via ' + x.via }); save(); toast('Added to your supercurriculars'); viewSuper($('#view')); });
  $$('[data-dis]', body).forEach(b => b.onclick = () => { dec(b.dataset.dis, 'dismiss'); save(); viewSuper($('#view')); });
}

function scMatches(it){
  if(scF.subjects.size){ const a = subjList(it, scState(it.id)); if(![...scF.subjects].some(k => k === 'multi' ? a.length !== 1 : a.includes(k))) return false; }
  if(scF.elig && it.elig !== 'now') return false;
  if(scF.saved && !scState(it.id).saved && !it.custom) return false;
  if(scF.q){
    const r = it.reading || {};
    const hay = strip([it.t, it.yr, it.when, it.note, ROLE_ORDER.map(k => r[k] || '').join(' '), r.link].join(' ')).toLowerCase();
    if(!hay.includes(scF.q)) return false;
  }
  return true;
}
function eligChip(e){
  return e === 'now' ? '<span class="chip ok">Eligible now</span>' : e === 'later' ? '<span class="chip soft">Y12+ only</span>' : '<span class="chip warn">Check eligibility</span>';
}

function viewSuper(v){
  const items = allSc();
  const y11 = items.filter(i => i.year === 'y11');
  v.innerHTML = head({
    crumbs:crumbsFor('supercurriculars'), title:'Supercurriculars',
    sub:'Philosophy · Politics · Economics · Law — every competition, programme and prize sorted into the school year it applies to, each paired with the reading that lets you actually argue about it.',
    stats:[[items.filter(i => !i.custom).length, 'opportunities'], [y11.filter(i => i.elig === 'now').length, 'you can enter now'],
           [items.filter(i => scState(i.id).saved).length, 'saved'], [items.filter(i => scState(i.id).status === 'done').length, 'done']],
    actions:`<button class="btn primary" id="scAdd">${I(IC.plus,14)} Add your own</button>`
  }) + `
  <div class="subtabs" role="tablist">
    <button role="tab" data-t="timeline" aria-selected="${scF.tab === 'timeline'}">Opportunities by date</button>
    <button role="tab" data-t="reading" aria-selected="${scF.tab === 'reading'}">Reading guide</button>
    <button role="tab" data-t="log" aria-selected="${scF.tab === 'log'}">My log <span class="n">${recEntries().filter(e => ['sc', 'book', 'lec'].includes(e.type)).length}</span></button>
    <button role="tab" data-t="books" aria-selected="${scF.tab === 'books'}">My books <span class="n">${(S.books || []).length}</span></button>
    <button role="tab" data-t="finds" aria-selected="${scF.tab === 'finds'}">New finds <span class="n">${scPending().length}</span></button>
  </div>
  <div style="margin:-6px 0 14px" id="scLive">${scLiveLine()}</div>
  <div class="filterbar">
    <div class="row">
      <div class="seg" id="scYears">${YEARS.map(y => `<button data-y="${y.k}" aria-pressed="${scF.year === y.k}">${y.label}<small>${y.range}</small></button>`).join('')}</div>
      ${searchbar('scQ', 'Search competitions, books, authors…', scF.q)}
    </div>
    <div class="row" id="scPills">
      ${SUBJ.map(s => `<button class="pill" data-s="${s.k}" style="--c:var(--${s.k})" aria-pressed="${scF.subjects.has(s.k)}"><span class="dot"></span>${s.label}</button>`).join('')}
      <span style="width:6px"></span>
      ${sw('scElig', 'Eligible now', scF.elig)} ${sw('scSaved', 'Saved only', scF.saved)}
      <span class="count" id="scCount"></span>
    </div>
  </div>
  <div id="scBody"></div>`;

  $$('.subtabs button', v).forEach(b => b.onclick = () => { scF.tab = b.dataset.t; viewSuper(v); });
  $$('#scYears button').forEach(b => b.onclick = () => { scF.year = b.dataset.y; $$('#scYears button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawSc(); });
  $$('#scPills .pill').forEach(b => b.onclick = () => { const k = b.dataset.s; scF.subjects.has(k) ? scF.subjects.delete(k) : scF.subjects.add(k); b.setAttribute('aria-pressed', scF.subjects.has(k)); drawSc(); });
  $('#scElig').onchange = e => { scF.elig = e.target.checked; drawSc(); };
  $('#scSaved').onchange = e => { scF.saved = e.target.checked; drawSc(); };
  bindSearch('scQ', q => { scF.q = q; drawSc(); });
  $('#scAdd').onclick = () => editScCustom();
  drawSc();
}

function drawScLog(body){
  recF.types = ['sc', 'book', 'lec'];
  if(!$('#recBody', body)){
    body.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:14px"><p class="muted" style="margin:0;max-width:62ch">Competitions you’ve done or are doing, books you’ve read and lectures you’ve been to. Under each, keep a few short points on what you learned.</p>
      <div class="row"><button class="btn" id="lgBook">${I(IC.book,14)} Add book</button><button class="btn primary" id="lgSc">${I(IC.plus,14)} Log a competition</button></div></div>` + logBar() + `<div id="recBody"></div>`;
    $('#lgSc', body).onclick = () => recNew('sc'); $('#lgBook', body).onclick = () => recNew('book');
    bindLogBar(body);
  }
  drawRecord();
}
function drawSc(){
  const body = $('#scBody'); if(!body) return;
  if($('#scLive')) $('#scLive').innerHTML = scLiveLine();
  $('.filterbar').classList.toggle('hidden', scF.tab === 'finds' || scF.tab === 'books' || scF.tab === 'log');
  if(scF.tab === 'log') return drawScLog(body);
  if(scF.tab === 'finds') return drawScFinds(body);
  if(scF.tab === 'books') return drawBooks(body);
  const pool = allSc().filter(i => i.custom ? (i.year || 'y11') === scF.year : i.year === scF.year);
  const shown = pool.filter(scMatches);
  $('#scCount').textContent = shown.length === pool.length ? pool.length + ' shown' : shown.length + ' of ' + pool.length + ' shown';
  if(scF.tab === 'reading') return drawReading(body, shown);

  const caveat = `<div class="caveat">${I(IC.warn,15)}<div>${SC_CAVEATS[scF.year] || ''}</div></div>`;
  const groups = [];
  const custom = shown.filter(i => i.custom);
  if(custom.length) groups.push({ month:'Your additions', items:custom.sort((a, b) => (a.date || 'z') < (b.date || 'z') ? -1 : 1), own:true });
  SC_DATA[scF.year].forEach(g => { const it = g.items.filter(i => shown.includes(i)); if(it.length) groups.push({ month:g.month, items:it }); });

  body.innerHTML = `<div class="sc-layout"><div>` + caveat + (groups.length ? groups.map(g => `
    <section class="tl-month">
      <div class="tl-mhead"><h2>${esc(g.month)}</h2><span class="n">${g.items.length} ${g.items.length === 1 ? 'entry' : 'entries'}</span></div>
      <div class="sc-list">${g.items.map(scRow).join('')}</div>
    </section>`).join('')
    : emptyBox('Nothing matches those filters', 'Try clearing the search or switching off “Eligible now” / “Saved only”.')) + `</div>${scRecord()}</div>`;
  $$('[data-rec]', body).forEach(a => a.onclick = () => openScDrawer(allSc().find(i => i.id === a.dataset.rec)));
  const qa = $('#qAdd', body);
  if(qa) qa.onsubmit = e => {
    e.preventDefault();
    const t = $('#qT', qa).value.trim(); if(!t) return;
    const id = 'c:' + uid(), date = $('#qD', qa).value;
    const ss = $$('[name="qS"]:checked', qa).map(x => x.value);
    S.scCustom.push({ id, t, s:subjKey(ss), ss, year:scF.year, date, when:'', note:'' });
    S.sc[id] = { status:'done', result:$('#qR', qa).value.trim(), doneOn:date };
    save(); toast('Logged: ' + t); viewSuper($('#view'));
  };
  $$('[data-gobooks]', body).forEach(a => a.onclick = () => { scF.tab = 'books'; viewSuper($('#view')); });
  $$('[data-golog]', body).forEach(a => a.onclick = () => { scF.tab = 'log'; viewSuper($('#view')); window.scrollTo(0, 0); });

  $$('.sc-row', body).forEach(r => r.onclick = e => {
    const it = allSc().find(i => i.id === r.dataset.id);
    if(e.target.closest('[data-star]')){ e.stopPropagation(); setSc(it.id, { saved:!scState(it.id).saved }); drawSc(); return; }
    openScDrawer(it);
  });
}


function scRecord(){
  const all = allSc();
  const done = all.filter(i => scState(i.id).status === 'done').sort((a, b) => (scState(b.id).doneOn || '') < (scState(a.id).doneOn || '') ? -1 : 1);
  const doing = all.filter(i => scState(i.id).status === 'doing'), plan = all.filter(i => scState(i.id).status === 'planning');
  const books = (S.books || []).filter(b => b.status === 'Finished').length;
  const li = (i, sub) => `<a class="rec" data-rec="${esc(i.id)}"><span class="dot c-${i.s}"></span><span><b>${strip(i.t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></a>`;
  return `<aside class="sc-aside"><div class="aside-card">
    <h3>Your record</h3>
    <form class="quick" id="qAdd">
      <input class="inp" id="qT" placeholder="What have you done? e.g. JLI Politics essay" aria-label="What you did" required>
      <div class="row2"><input class="inp" id="qR" placeholder="Result (optional)" aria-label="Result"><input class="inp" type="date" id="qD" value="${isoToday()}" aria-label="Date"></div>
      ${subjPicker('qS', [], true)}
      <button class="btn primary sm" style="justify-content:center">${I(IC.plus,13)} Log as done</button>
    </form>
    <div class="rec-stats"><div><b>${done.length}</b><span>done</span></div><div><b>${doing.length}</b><span>in progress</span></div><div><b>${plan.length}</b><span>planning</span></div><div><b>${books}</b><span>books read</span></div></div>
    <div class="rec-h">Completed</div>
    ${done.length ? done.map(i => li(i, [scState(i.id).result, scState(i.id).doneOn && fmtD(scState(i.id).doneOn, true)].filter(Boolean).join(' · ') || 'Add your result')).join('') : '<p class="faint rec-empty">Mark something as Done and it appears here with its result.</p>'}
    ${doing.length ? '<div class="rec-h">In progress</div>' + doing.map(i => li(i)).join('') : ''}
    ${plan.length ? '<div class="rec-h">Planning</div>' + plan.map(i => li(i)).join('') : ''}
    <div class="row2" style="margin-top:12px"><button class="btn sm" data-golog style="justify-content:center">Open my log</button><button class="btn sm" data-gobooks style="justify-content:center">${I(IC.book,13)} My books</button></div>
  </div></aside>`;
}

const BOOK_ST = ['Want to read', 'Reading', 'Finished'];
function drawBooks(body){
  const books = (S.books || []).slice().sort((a, b) => BOOK_ST.indexOf(b.status) - BOOK_ST.indexOf(a.status) || (b.finished || '').localeCompare(a.finished || ''));
  body.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:16px"><p class="muted" style="margin:0;max-width:60ch">Every book you read for your subjects, and what you took from it. The “how I’d use it” line is what you say at interview.</p>
    <button class="btn primary" id="bkAdd">${I(IC.plus,14)} Add book</button></div>`
    + (books.length ? BOOK_ST.slice().reverse().filter(st => books.some(b => b.status === st)).map(st => `<section class="tl-month"><div class="tl-mhead"><h2>${st}</h2><span class="n">${books.filter(b => b.status === st).length}</span></div>
      <div class="grid">${books.filter(b => b.status === st).map(b => `<div class="card c-${b.s || 'multi'}" data-bk="${b.id}" style="cursor:pointer">
        <div class="meta"><span class="chip subj">${esc(subjLabel(subjList(b)))}</span>${b.finished ? `<span class="chip soft">Finished ${fmtD(b.finished, true)}</span>` : ''}${b.rating ? `<span class="chip soft">${'★'.repeat(+b.rating)}</span>` : ''}</div>
        <h3>${esc(b.title)}</h3><div class="muted" style="font-size:13px;margin:-2px 0 8px">${esc(b.author || '')}</div>
        ${b.learned ? `<div class="lbl-sm">What I learned</div><p class="note">${esc(b.learned)}</p>` : ''}
        ${b.use ? `<div class="mynote">${esc(b.use)}</div>` : ''}</div>`).join('')}</div></section>`).join('')
      : emptyBox('No books yet', 'Add what you’re reading — or press “+ My books” on any title in the Reading guide.'));
  $('#bkAdd', body).onclick = () => editBook();
  $$('[data-bk]', body).forEach(c => c.onclick = () => editBook(S.books.find(b => b.id === c.dataset.bk)));
}
function editBook(bk, preset){
  openForm({ title: bk ? 'Edit book' : 'Add book', value: Object.assign({ status:'Reading' }, preset, bk, { ss:subjList(bk || preset) }),
    fields:[
      { k:'title', label:'Title', req:true }, { k:'author', label:'Author' },
      { k:'ss', label:'Subjects', type:'subjects', hint:'pick one or more' }, { k:'status', label:'Status', type:'select', opts:BOOK_ST },
      { k:'finished', label:'Date finished', type:'date' }, { k:'rating', label:'Rating', type:'select', opts:[['', '—'], ['1','★'], ['2','★★'], ['3','★★★'], ['4','★★★★'], ['5','★★★★★']] },
      { k:'learned', label:'What I learned', type:'textarea', rows:4, ph:'The main argument, and what changed your mind' },
      { k:'use', label:'How I’d use it', type:'textarea', ph:'e.g. “I read X, which led me to Y, so I argued Z in the JLI essay.”' },
    ],
    onSave: out => { out.s = subjKey(out.ss); if(!S.books) S.books = []; if(out.status === 'Finished' && !out.finished) out.finished = isoToday(); bk ? Object.assign(bk, out) : S.books.push(Object.assign({ id:uid() }, out)); save(); if(scF.tab !== 'log') scF.tab = 'books'; route(); },
    onDelete: bk ? () => { S.books = S.books.filter(x => x !== bk); save(); route(); } : null });
}

function scRow(it){
  const st = scState(it.id);
  const books = it.reading ? ROLE_ORDER.filter(k => it.reading[k]).length : 0;
  const statusChip = st.status ? `<span class="status-tag ${st.status === 'done' ? 's-offer' : 's-applied'}">${SC_STATUS.find(s => s[0] === st.status)[1]}</span>` : '';
  const subs = subjList(it, st);
  const when = it.custom ? (it.date ? fmtD(it.date, true) + (it.when ? ', ' + it.when : '') : it.when || 'No date') : strip(it.when || '');
  return `<div class="sc-row c-${subjKey(subs)}" data-id="${esc(it.id)}" tabindex="0">
    <div class="sc-when">${esc(when)}</div>
    <div class="sc-main">
      <h3>${it.custom ? esc(it.t) : it.t}</h3>
      <div class="chips"><span class="chip subj">${esc(subjLabel(subs))}</span>${it.tag ? `<span class="chip new">${it.tag}</span>` : ''}${it.custom ? '<span class="chip soft">Added by you</span>' : eligChip(it.elig)}${it.tbc ? '<span class="chip tbc">date TBC</span>' : ''}${scRecent(it.id) ? '<span class="badge-new">UPDATED</span>' : ''}${statusChip}</div>
    </div>
    <div class="sc-side">
      ${books ? `<span class="rc">${I(IC.book,13)} ${books} book${books > 1 ? 's' : ''}</span>` : ''}
      <button class="act ${st.saved ? 'on' : ''}" data-star title="${st.saved ? 'Saved' : 'Save'}" aria-label="Save">${I(IC.star,17)}</button>
    </div>
  </div>`;
}

function bookHTML(kind, raw){
  const i = raw.indexOf('|');
  const title = i === -1 ? raw : raw.slice(0, i), why = i === -1 ? '' : raw.slice(i + 1);
  return `<div class="book ${ROLES[kind].cls}"><div class="lbl">${ROLES[kind].lbl}</div><div class="txt"><b>${title}</b>${why ? `<span class="why">${why}</span>` : ''}</div></div>`;
}

function openScDrawer(it){
  const st = scState(it.id);
  const r = it.reading;
  const html = `
    <div class="meta c-${subjKey(subjList(it, st))}"><span class="chip subj" id="dSubjChip">${esc(subjLabel(subjList(it, st)))}</span>${it.tag ? `<span class="chip new">${it.tag}</span>` : ''}${it.custom ? '' : eligChip(it.elig)}${it.yr ? `<span class="chip soft">${it.custom ? esc(it.yr) : it.yr}</span>` : ''}${it.tbc ? '<span class="chip tbc">date TBC</span>' : ''}</div>
    <h2>${it.custom ? esc(it.t) : it.t}</h2>
    <div class="when">${I(IC.cal,13)}<span>${it.custom ? esc([it.date && fmtD(it.date, true), it.when].filter(Boolean).join(' · ')) : it.when}</span></div>
    ${it.note ? `<p class="note">${it.custom ? esc(it.note) : it.note}</p>` : ''}
    ${it.link ? `<a class="btn" href="${esc(safeUrl(it.link))}" target="_blank" rel="noopener">Official page ${I(IC.ext,13)}</a>` : (it.custom ? '' : '<span class="faint" style="font-size:12.5px">No official page found — verify directly</span>')}
    ${(() => { const L = SCL.items[it.id]; if(!L) return ''; return `<div class="drawer-sec"><div class="lbl">Live from the official page · checked ${esc(ago(L.checked.slice(0,10)).toLowerCase())}</div>
      ${L.changedOn ? `<p class="note"><span class="badge-new">UPDATED</span> Page changed on ${fmtD(L.changedOn, true)} — check the dates below against the ones above.</p>` : ''}
      ${L.dates && L.dates.length ? `<div class="list">${L.dates.map(d => `<div class="li"><span class="when-col">${esc(d.date)}</span><span class="grow"><small>…${esc(d.context)}…</small></span></div>`).join('')}</div>` : `<p class="faint" style="font-size:12.5px;margin:0">${L.ok ? 'No dates found on the page.' : 'The page couldn’t be reached on the last check.'}</p>`}</div>`; })()}
    ${r ? `<div class="drawer-sec"><div class="lbl">Read alongside this</div><div class="reading">${ROLE_ORDER.filter(k => r[k]).map(k => bookHTML(k, r[k])).join('')}${r.link ? `<div class="thelink"><b>The link →</b> ${r.link}</div>` : ''}</div></div>` : ''}
    ${it.s === 'multi' && !it.custom ? `<div class="drawer-sec"><div class="lbl">Subjects <span class="hint">pick the ones this covers for you</span></div>${subjPicker('dSubj', subjList(it, st), true)}</div>` : ''}
    <div class="drawer-sec"><div class="lbl">Your progress</div>
      <div class="row"><div class="status" id="dStatus">${SC_STATUS.map(s => `<button data-v="${s[0]}" aria-pressed="${(st.status || '') === s[0]}">${s[1]}</button>`).join('')}</div>
      <button class="btn sm ${st.saved ? 'accent' : ''}" id="dStar">${I(IC.star,13)} ${st.saved ? 'Saved' : 'Save'}</button></div>
    </div>
    <div class="drawer-sec"><div class="lbl">Result</div>
      <div class="row2"><input class="inp" id="dRes" value="${esc(st.result || '')}" placeholder="e.g. Highly commended, semi-finalist, certificate"><input class="inp" type="date" id="dDone" value="${esc(st.doneOn || '')}" aria-label="Date completed"></div>
    </div>
    <div class="drawer-sec"><div class="lbl">What I learned <span class="hint">one short point per line, shown in My record</span></div>
      <textarea class="inp" id="dLearn" rows="4" placeholder="e.g. Writing to a word limit forced me to cut my weakest argument">${esc(st.learned || '')}</textarea>
    </div>
    <div class="drawer-sec"><div class="lbl">Your notes</div>
      <textarea class="inp" id="dNote" rows="4" placeholder="What you entered, what you argued, what you’d say about it in an interview…">${esc(st.note || '')}</textarea>
    </div>
    ${it.custom ? `<div class="drawer-sec"><button class="btn" id="dEdit">Edit this entry</button></div>` : ''}`;
  openDrawer(it.custom ? 'Your supercurricular' : (YEARS.find(y => y.k === it.year) || {}).label + ' · ' + esc(it.month), html, b => {
    $$('#dStatus button', b).forEach(btn => btn.onclick = () => { setSc(it.id, Object.assign({ status:btn.dataset.v }, btn.dataset.v === 'done' && !scState(it.id).doneOn ? { doneOn:isoToday() } : {})); if($('#dDone', b) && !$('#dDone', b).value && btn.dataset.v === 'done') $('#dDone', b).value = isoToday(); $$('#dStatus button', b).forEach(x => x.setAttribute('aria-pressed', x === btn)); drawSc(); });
    $('#dStar', b).onclick = () => { const s = !scState(it.id).saved; setSc(it.id, { saved:s }); $('#dStar', b).className = 'btn sm ' + (s ? 'accent' : ''); $('#dStar', b).innerHTML = I(IC.star,13) + (s ? ' Saved' : ' Save'); drawSc(); };
    $('#dNote', b).oninput = debounce(e => setSc(it.id, { note:e.target.value }), 300);
    $$('[name="dSubj"]', b).forEach(cb => cb.onchange = () => { setSc(it.id, { ss:$$('[name="dSubj"]:checked', b).map(x => x.value) }); $('#dSubjChip', b).textContent = subjLabel(subjList(it, scState(it.id))); drawSc(); });
    $('#dLearn', b).oninput = debounce(e => { setSc(it.id, { learned:e.target.value }); drawSc(); }, 400);
    $('#dRes', b).oninput = debounce(e => { setSc(it.id, { result:e.target.value }); drawSc(); }, 400);
    $('#dDone', b).onchange = e => { setSc(it.id, { doneOn:e.target.value }); drawSc(); };
    if(it.custom) $('#dEdit', b).onclick = () => { closeDrawer(); editScCustom(S.scCustom.find(c => c.id === it.id)); };
  });
}

function editScCustom(existing, preset){
  openForm({
    title: existing ? 'Edit supercurricular' : 'Add a supercurricular',
    value: Object.assign({ year:scF.year }, preset, existing, { ss:subjList(existing || preset, existing && scState(existing.id)) }),
    fields:[
      { k:'t', label:'Title', req:true, full:true, ph:'e.g. Bank of England Target 2.0 Challenge' },
      { k:'ss', label:'Subjects', type:'subjects', hint:'pick one or more' },
      { k:'year', label:'School year', type:'select', opts:YEARS.map(y => [y.k, y.label]) },
      { k:'date', label:'Key date', type:'date', hint:'deadline or event day' },
      { k:'when', label:'Timing notes', ph:'e.g. Heats in March' },
      { k:'yr', label:'Eligibility', ph:'e.g. Ages 16–18' },
      { k:'link', label:'Link', type:'url', ph:'https://' },
      { k:'note', label:'Description', type:'textarea' },
      { k:'_status', label:'Status', type:'select', opts:SC_STATUS, def:existing ? (scState(existing.id).status || '') : '' },
      { k:'_result', label:'Result', ph:'e.g. Commended, finalist', def:existing ? (scState(existing.id).result || '') : '' },
      { k:'_learned', label:'What I learned', type:'textarea', hint:'one short point per line', def:existing ? (scState(existing.id).learned || '') : '' },
    ],
    onSave: out => {
      const st = out._status, res = out._result, learned = out._learned; delete out._status; delete out._result; delete out._learned;
      out.s = subjKey(out.ss);
      let id;
      if(existing){ Object.assign(existing, out); id = existing.id; }
      else { id = 'c:' + uid(); S.scCustom.push(Object.assign({ id }, out)); }
      S.sc[id] = Object.assign({}, S.sc[id], { status:st, result:res, learned }, st === 'done' && !(S.sc[id] || {}).doneOn ? { doneOn:out.date || isoToday() } : {});
      save(); scF.year = out.year; route();
    },
    onDelete: existing ? () => { S.scCustom = S.scCustom.filter(c => c !== existing); save(); route(); } : null
  });
}

function drawReading(body, shown){
  const map = new Map();
  shown.forEach(it => {
    if(!it.reading) return;
    ROLE_ORDER.forEach(k => {
      const raw = it.reading[k]; if(!raw) return;
      const i = raw.indexOf('|'), title = i === -1 ? raw : raw.slice(0, i), why = i === -1 ? '' : raw.slice(i + 1);
      const key = strip(title).toLowerCase();
      if(!map.has(key)) map.set(key, { title, why, role:k, s:it.s, for:[] });
      map.get(key).for.push(it);
    });
  });
  const books = [...map.values()];
  const bySubj = SUBJ.map(s => ({ s, list:books.filter(b => b.s === s.k) })).filter(g => g.list.length);
  body.innerHTML = `<div class="legend">${ROLE_ORDER.map(k => `<div><b style="color:${ROLES[k].c}">${ROLES[k].lbl}</b>${{
      m:'The shared language. You can’t argue with anything else until you have this.',
      n:'Deepens or extends the grounding into a sharper question.',
      s:'An unexpected angle, a primary source, the paper behind the famous idea.',
      c:'The strongest case against your grounding — so the objection is in your essay first.'}[k]}</div>`).join('')}</div>`
    + (bySubj.length ? bySubj.map(g => `<section class="tl-month"><div class="tl-mhead"><h2>${g.s.label}</h2><span class="n">${g.list.length} books</span></div>
      <div class="grid">${g.list.map(b => `<div class="bookcard"><span class="role" style="color:${ROLES[b.role].c}">${ROLES[b.role].lbl}</span><h4>${b.title}</h4>${b.why ? `<p>${b.why}</p>` : ''}
        <div class="for">For: ${b.for.map(f => `<a data-id="${esc(f.id)}">${strip(f.t)}</a>`).join(', ')}</div>
        <button class="btn sm ghost" style="margin-top:8px;padding-left:0" data-addbk="${esc(strip(b.title))}" data-s="${b.s}">${(S.books || []).some(x => x.title.toLowerCase() === strip(b.title).toLowerCase()) ? '✓ In My books' : '+ My books'}</button></div>`).join('')}</div></section>`).join('')
      : emptyBox('No reading matches those filters', 'Clear the search or subject filters to see the full guide.'));
  $$('.for a', body).forEach(a => a.onclick = () => openScDrawer(allSc().find(i => i.id === a.dataset.id)));
  $$('[data-addbk]', body).forEach(x => x.onclick = () => { const raw = x.dataset.addbk; const i = raw.indexOf(','); editBook(null, { title: i > 0 ? raw.slice(i + 1).trim() : raw, author: i > 0 ? raw.slice(0, i).trim() : '', s:x.dataset.s }); });
}

/* ============================================================
   EXTRACURRICULARS
   ============================================================ */
const EX_CATS = ['Sport','Music','Drama & arts','Leadership','Volunteering','Debating & MUN','Clubs & societies','Enterprise','Other'];
const EX_COL = { 'Sport':'econ','Music':'phil','Drama & arts':'pol','Leadership':'multi','Volunteering':'teal','Debating & MUN':'law','Clubs & societies':'grey','Enterprise':'multi','Other':'grey' };
function fmtRange(a, b){ const f = s => { const d = parseD(s); return d ? MONTHS[d.getMonth()] + ' ' + d.getFullYear() : ''; }; return a ? f(a) + ' – ' + (b ? f(b) : 'present') : (b ? 'until ' + f(b) : ''); }
function editExtra(ex){
  openForm({ title: ex ? 'Edit activity' : 'Add activity', value: ex || { cat:'Sport', inCV:true },
    fields:[
      { k:'title', label:'Activity', req:true, ph:'e.g. School debating society' },
      { k:'cat', label:'Category', type:'select', opts:EX_CATS },
      { k:'role', label:'Your role', ph:'e.g. Vice-captain' },
      { k:'org', label:'Organisation', ph:'e.g. School / club name' },
      { k:'start', label:'Started', type:'date' }, { k:'end', label:'Ended', type:'date', hint:'blank if ongoing' },
      { k:'hours', label:'Hours per week', type:'number' },
      { k:'inCV', label:'Include on CV', type:'check' },
      { k:'desc', label:'What you do', type:'textarea' },
      { k:'achieve', label:'Achievements & responsibilities', type:'textarea', hint:'one per line, these become CV bullet points' },
      { k:'learned', label:'What I learned', type:'textarea', hint:'one short point per line', ph:'e.g. Running a meeting means deciding the outcome before it starts' },
    ],
    onSave: out => { ex ? Object.assign(ex, out) : S.extras.push(Object.assign({ id:uid() }, out)); save(); route(); },
    onDelete: ex ? () => { S.extras = S.extras.filter(e => e !== ex); save(); route(); } : null });
}

/* ============================================================
   OPENINGS TRACKER — modelled on SimplyTK's live tracker
   Data: data/openings.json (rewritten every 3 hours by scripts/scan.mjs)
   ============================================================ */
const SECTORS = ['Banking','Consulting & Accounting','AI & Tech','Private Equity & VC','Investment (HF / AM / ER)','Law','Access programmes','Online courses','Other'];
const SEC_COL = { 'Banking':'teal', 'Consulting & Accounting':'multi', 'AI & Tech':'phil', 'Private Equity & VC':'pol', 'Investment (HF / AM / ER)':'econ', 'Law':'law', 'Access programmes':'accent', 'Online courses':'law', 'Other':'grey' };
const PROGRAMMES = ['Spring week','Insight / work experience','Summer internship','Off-cycle internship','Industrial placement','Graduate programme','Apprenticeship','Vacation scheme','Training contract','Virtual programme','Pre-university programme','Summer school','Event / talk','Fellowship','Accelerator','Online course','Competition'];
const TRACKS = [['uni','Internships & spring weeks'], ['appr','Apprenticeships'], ['preuni','Pre-uni'], ['opps','Opportunities']];
const TRACK_SUB = {
  uni:'Spring weeks, insight programmes, summer and off-cycle internships, placements and graduate schemes at UK firms.',
  appr:'Degree, higher and solicitor apprenticeships across England — from firms on your watchlist and the government’s Find an apprenticeship service.',
  preuni:'Work experience, insight days, summer schools and programmes open to school students (Years 10–13).',
  opps:'Fellowships, accelerators, competitions and online courses — with prices where they cost something.',
};
const YEAR_GROUPS = ['Year 10','Year 11','Year 12','Year 13','Gap year','First year','Penultimate year','Any'];
const AGE_GROUPS = [['14-16','School, 14–16 (Y10–11)'], ['16-18','School, 16–18 (Y12–13)'], ['18+','Gap year / school leaver, 18+'], ['uni1','University 1st year, 18–19'], ['uni2','Penultimate year, 19–21'], ['grad','Final year / graduate, 21+']];
const AGE_TEXT = { '14-16':'14–16 · Y10–11', '16-18':'16–18 · Y12–13', '18+':'18+ · school leaver', 'uni1':'18–19 · uni 1st year', 'uni2':'19–21 · penultimate year', 'grad':'21+ · final year / grad' };
const YG_AGE = { 'Year 10':'14-16', 'Year 11':'14-16', 'Year 12':'16-18', 'Year 13':'16-18', 'Gap year':'18+', 'First year':'uni1', 'Penultimate year':'uni2' };
function guessAge(text){
  const t = String(text || '').toLowerCase();
  if(/year 1[01]\b|gcse|aged? 1[45]|14-16|15-16/.test(t)) return '14-16';
  if(/year 1[23]\b|sixth[- ]form|a-?level|school students?|aged? 1[67]|16-18|16\+|pre-?university|pathways to/.test(t)) return '16-18';
  if(/school leaver|apprentice|gap year|18\+/.test(t)) return '18+';
  if(/spring|insight|first[- ]year|fresher|discovery|1st year/.test(t)) return 'uni1';
  if(/graduate|final[- ]year|training contract|full[- ]time analyst/.test(t)) return 'grad';
  if(/penultimate|summer (analyst|associate|intern)|internship|\bintern\b|vacation scheme|placement|off-?cycle/.test(t)) return 'uni2';
  return '';
}
const ageOf = o => o.ageGroup || YG_AGE[o.yearGroup] || (o.remote ? guessAge(o.role + ' ' + (o.programme || '')) : '');
/* apprenticeship levels */
const LEVEL_GROUPS = [['deg','Degree (Level 6–7)'], ['high','Higher (Level 4–5)'], ['adv','Advanced (Level 3)'], ['int','Intermediate (Level 2)']];
const LEVEL_NAME = { L2:'Level 2 · intermediate', L3:'Level 3 · advanced', L4:'Level 4 · higher', L5:'Level 5 · higher', L6:'Level 6 · degree', L7:'Level 7 · master’s / solicitor' };
function levelOf(o){
  if(o.level) return o.level;
  const t = String((o.role || '') + ' ' + (Array.isArray(o.notes) ? o.notes.join(' ') : '')).toLowerCase();
  const m = t.match(/level\s*([2-7])\b/); if(m) return 'L' + m[1];
  if(/solicitor apprentice/.test(t)) return 'L7';
  if(/degree[- ]apprentice|degree[- ]level|\(degree\)/.test(t)) return 'L6';
  if(/higher apprentice/.test(t)) return 'L4';
  if(/advanced apprentice/.test(t)) return 'L3';
  return '';
}
const levelGroup = o => ({ L6:'deg', L7:'deg', L4:'high', L5:'high', L3:'adv', L2:'int' }[levelOf(o)] || '');
function trackOf(o){
  if(o.programme === 'Apprenticeship') return 'appr';
  if(o.track) return o.track;
  if(['Online course','Fellowship','Accelerator','Competition'].includes(o.programme)) return 'opps';
  if(['14-16','16-18','18+'].includes(ageOf(o)) || ['Pre-university programme','Summer school','Apprenticeship'].includes(o.programme)) return 'preuni';
  return 'uni';
}
const cityOf = o => { const c = String(o.location || '').split(/[,;|]| - /)[0].trim(); return c && c.length < 30 && !/^\d+ locations$/i.test(c) ? c : (o.region || ''); };
function ageCell(o){ const a = ageOf(o); if(!a) return '<span class="faint">Check</span>'; const mine = a === '14-16' || a === '16-18'; return `<span class="age ${mine ? 'fit' : ''}" title="${esc(AGE_TEXT[a] || a)}">${esc((AGE_TEXT[a] || a).split(' · ')[0])}<small>${esc((AGE_TEXT[a] || '').split(' · ')[1] || '')}</small></span>`; }
const REGIONS = ['London','South East','South West','East of England','West Midlands','East Midlands','North West','Yorkshire','North East','Scotland','Wales','Northern Ireland','Remote (UK)','Online','UK (region not stated)'];
const APP_STATUS = ['', 'Planning', 'Applied', 'Online test', 'Interview', 'Assessment centre', 'Offer', 'Rejected'];
const statusCls = s => ({ 'Offer':'s-offer', 'Rejected':'s-rejected', 'Applied':'s-applied', 'Online test':'s-online', 'Interview':'s-interview', 'Assessment centre':'s-ac' }[s] || '');
/* macro trading & analysis: macro funds, markets desks, economics & research roles */
const MACRO_FIRM = /brevan|rokos|caxton|tudor|bridgewater|element capital|graham capital|haidar|alphadyne|andurand|symmetry|kirkoswald|garda|lmr|florin|bluecrest|fulcrum|capstone|capital economics|oxford economics|pantheon|ts lombard|bca research|bank of england|treasury/i;
const MACRO_ROLE = /macro|rates|\bfx\b|foreign exchange|currenc|commodit|fixed income|\bficc\b|global markets|\bmarkets\b|sales (&|and) trading|trading|trader|econom|strateg(y|ist)|research|treasury|derivativ|emerging market|\bcredit\b|bond/i;
/* first-year / exploratory programmes (UK spring weeks & insights; US 'exploratory' programmes) */
const isFirstYear = o => ageOf(o) === 'uni1' || ['Spring week', 'Insight / work experience'].includes(o.programme) || /first[- ]year|spring|insight|discovery|explor|bridge|launch|future (women )?leaders|sophomore|freshman/i.test(o.role || '');
const isMacro = o => MACRO_FIRM.test(o.company) || MACRO_ROLE.test(o.role + ' ' + (o.programme || '') + ' ' + (o.sub || ''));
const opF = { tab:'uni', q:'', region:'', sector:'', role:'', prog:'', yg:'', isNew:false, soon:false, openOnly:false, macro:false, level:'', first:false, sort:'posted', dir:1, page:0 };
const PAGE_SIZE = 25;

/* time helpers: "8 hours ago", "detected 2 days after posting" */
function relTime(iso){
  if(!iso) return '';
  const t = /T/.test(iso) ? Date.parse(iso) : parseD(iso) && parseD(iso).getTime();
  if(!t) return '';
  const mins = Math.round((Date.now() - t) / 6e4);
  if(!/T/.test(iso)){ const d = -daysUntil(iso); return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 30 ? d + ' days ago' : d < 60 ? '1 month ago' : Math.floor(d / 30) + ' months ago'; }
  if(mins < 2) return 'Just now'; if(mins < 60) return mins + ' min ago';
  const h = Math.round(mins / 60); if(h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h / 24); return d === 1 ? '1 day ago' : d < 30 ? d + ' days ago' : Math.floor(d / 30) + (d < 60 ? ' month ago' : ' months ago');
}
const postedKey = o => Date.parse((o.postedAt || '') + 'T12:00:00Z') || Date.parse(o.detected || '') || Date.parse((o.posted || '') + 'T00:00:00Z') || 0;
const isNew24 = o => o.detected ? (Date.now() - Date.parse(o.detected)) < 864e5 : (daysUntil(o.posted) ?? -99) >= 0;
function postedCell(o){
  if(o.postedAt){
    const after = o.detected ? Math.round((Date.parse(o.detected) - Date.parse(o.postedAt + 'T00:00:00Z')) / 864e5) : null;
    return `<b style="font-weight:500">${o.postedApprox ? '30+ days ago' : esc(relTime(o.postedAt))}</b>${after != null ? `<small class="det">${after <= 0 ? 'detected same day' : 'detected +' + after + 'd'}</small>` : ''}`;
  }
  return o.detected || o.posted ? `<b style="font-weight:500">${esc(relTime(o.detected || o.posted))}</b><small class="det">first detected</small>` : '<span class="faint">·</span>';
}

/* ---------- live feed ---------- */
const LIVE = { updated:null, openings:[], review:[], closed:[], watchlist:[], health:{}, log:[], loaded:false, error:false };
if(!S.opMeta) S.opMeta = {};
if(!S.reviewDecisions) S.reviewDecisions = {};
if(!S.firmNotes) S.firmNotes = {};
if(S.settings && S.settings.apiKey){ delete S.settings.apiKey; try{ save(); }catch(e){} }   // Ask Claude removed: don't keep a key around
function OPS(){
  const ids = new Set(LIVE.openings.map(o => o.id));
  const remote = LIVE.openings.concat((LIVE.review || []).filter(r => !ids.has(r.id)).map(r => Object.assign({ auto:true }, r)));   // older data files kept auto-found firms separately
  return remote.map(r => {
    const meta = Object.assign({}, S.opMeta[r.id] || {});
    if(typeof meta.notes === 'string'){ meta.myNotes = meta.myNotes || meta.notes; delete meta.notes; }   // older saves kept personal notes in "notes"
    return Object.assign({ remote:true }, r, meta);
  }).concat(S.openings.map(o => typeof o.notes === 'string' ? Object.assign(o, { myNotes:o.myNotes || o.notes, notes:[] }) : o));
}
function setOp(o, patch){
  Object.assign(o, patch);
  if(o.remote) S.opMeta[o.id] = Object.assign({}, S.opMeta[o.id], patch);
  save();
}
function pendingReview(){ return []; }   // Review tab retired: auto-found firms go straight into the tracker
async function loadLive(silent){
  try{
    const res = await fetch('data/openings.json?t=' + Date.now(), { cache:'no-store' });
    if(!res.ok) throw 0;
    const d = await res.json();
    const before = new Set(LIVE.openings.map(o => o.id));
    const hadData = LIVE.loaded && LIVE.updated;
    let wl = d.watchlist || [];
    if(!wl.length){ try{ const w = await (await fetch('data/watchlist.json?t=' + Date.now(), { cache:'no-store' })).json(); wl = w.companies || []; }catch(e){} }
    Object.assign(LIVE, { updated:d.updated || null, openings:d.openings || [], review:d.review || [], closed:d.closed || [], watchlist:wl, health:d.health || {}, log:d.log || [], loaded:true, error:false });
    const fresh = LIVE.openings.filter(o => !before.has(o.id)).length;
    if(hadData && fresh && !silent) toast(fresh + ' new opening' + (fresh > 1 ? 's' : '') + ' found');
  }catch(e){ LIVE.error = true; LIVE.loaded = true; }
  if(location.hash === '#openings'){ const y = window.scrollY; viewOpenings($('#view')); window.scrollTo(0, y); }
}
setInterval(() => loadLive(false), 5 * 60 * 1000);
function liveLine(){
  if(!LIVE.loaded) return '<span class="live"><i></i>Checking for openings…</span>';
  if(LIVE.error) return '<span class="live off"><i></i>Live feed unavailable — showing your own entries</span>';
  if(!LIVE.updated) return '<span class="live wait"><i></i>Scanner set up · waiting for its first run</span>';
  return `<span class="live"><i></i>Live · refreshes automatically · last check ${esc(relTime(LIVE.updated).toLowerCase())} · ${LIVE.watchlist.length} firms watched</span>`;
}

function drawReview(b){
  const list = pendingReview();
  b.innerHTML = `<div class="info" style="margin-bottom:16px">The scanner also checks firms that aren’t on your watchlist. When it finds an opening at one of them, it lands here. <b>Accept</b> adds the firm to your watchlist and its openings to the tracker; <b>Decline</b> hides it.</div>`
    + (list.length ? `<div class="grid">${list.map(g => `<div class="card" style="--sc:var(--${SEC_COL[g.sector] || 'grey'})">
        <div class="meta"><span class="chip subj">${esc(g.sector || 'Unsorted')}</span><span class="chip soft">${g.items.length} found</span></div>
        <h3>${esc(g.company)}</h3>
        <ul style="margin:6px 0 12px;padding-left:18px;font-size:13px;color:var(--ink-2)">${g.items.slice(0,4).map(i => `<li>${i.link ? `<a class="lnk" href="${esc(safeUrl(i.link))}" target="_blank" rel="noopener">${esc(i.role)}</a>` : esc(i.role)}${i.deadline ? ' · closes ' + fmtD(i.deadline) : ''}</li>`).join('')}</ul>
        <div class="row"><button class="btn primary sm" data-acc="${esc(g.company)}">${I(IC.check,13)} Accept</button><button class="btn sm" data-dec="${esc(g.company)}">Decline</button></div></div>`).join('')}</div>`
      : emptyBox('Nothing to review', 'New firms the scanner finds outside your watchlist will appear here.'))
    + (Object.keys(S.reviewDecisions).length ? `<p class="faint" style="font-size:12.5px;margin-top:18px">${Object.values(S.reviewDecisions).filter(v => v === 'accept').length} accepted · ${Object.values(S.reviewDecisions).filter(v => v === 'decline').length} declined · <a href="#" class="lnk" id="undoRev">clear decisions</a></p>` : '');
  $$('[data-acc]', b).forEach(x => x.onclick = () => { S.reviewDecisions[x.dataset.acc] = 'accept'; save(); toast(x.dataset.acc + ' added to your watchlist'); refreshCounts(); });
  $$('[data-dec]', b).forEach(x => x.onclick = () => { S.reviewDecisions[x.dataset.dec] = 'decline'; save(); toast(x.dataset.dec + ' declined'); refreshCounts(); });
  const u = $('#undoRev', b); if(u) u.onclick = e => { e.preventDefault(); S.reviewDecisions = {}; save(); refreshCounts(); };
}

function viewOpenings(v){
  if(opF.tab === 'review') opF.tab = 'uni';
  const all = OPS();
  const inTrack = t => all.filter(o => trackOf(o) === t);
  const isTrackTab = TRACKS.some(t => t[0] === opF.tab);
  const cur = isTrackTab ? inTrack(opF.tab) : all;
  const open = cur.filter(o => o.live !== 'closed' && (daysUntil(o.deadline) ?? 0) >= 0);
  const title = { uni:'Live internship & spring week tracker', appr:'Live apprenticeship tracker', preuni:'Live pre-uni tracker', opps:'Opportunities' }[opF.tab] || 'Openings tracker';
  v.innerHTML = head({
    crumbs:crumbsFor('openings'), title,
    sub:(LIVE.updated && isTrackTab ? `<b>${open.length}</b> live UK openings. ` : '') + (TRACK_SUB[opF.tab] || 'Every UK opening across the firms you watch.') + ' Detected automatically, newest first.',
    stats:[[open.length, 'live now'], [cur.filter(isNew24).length, 'new in 24h'], [cur.filter(o => { const d = daysUntil(o.deadline); return d !== null && d >= 0 && d <= 7; }).length, 'closing this week'], [all.filter(o => o.saved).length, 'starred']],
    actions:`<button class="btn" id="opRefresh">↻ Refresh</button><button class="btn primary" id="opAdd">${I(IC.plus,14)} Add opening</button>`
  }) + `<div style="margin:-8px 0 18px">${liveLine()}</div>
  <div class="subtabs" role="tablist">
    ${TRACKS.map(t => [t[0], t[1], inTrack(t[0]).length]).concat([['saved','Starred', all.filter(o => o.saved).length], ['apps','My applications', all.filter(o => o.status).length], ['companies','Watchlist', new Set(LIVE.watchlist.map(w => w.company)).size]])
      .map(t => `<button role="tab" data-t="${t[0]}" aria-selected="${opF.tab === t[0]}">${t[1]} <span class="n">${t[2]}</span></button>`).join('')}
  </div>
  <div class="filterbar" id="opFilters">
    ${searchbar('opQ', 'Search by company, role, city…', opF.q)}
    <div class="row">
      ${selectBox('opSec', 'All sectors', SECTORS.filter(x => cur.some(o => o.sector === x)), opF.sector)}
      ${selectBox('opRole', 'All role types', [...new Set(cur.map(o => o.roleType).filter(Boolean))].sort(), opF.role)}
      ${selectBox('opProg', 'All programmes', PROGRAMMES.filter(x => cur.some(o => o.programme === x)), opF.prog)}
      ${selectBox('opYg', 'Any age', AGE_GROUPS, opF.yg)}
      ${opF.tab === 'appr' ? selectBox('opLevel', 'All levels', LEVEL_GROUPS.filter(g => cur.some(o => levelGroup(o) === g[0])), opF.level) : ''}
      ${selectBox('opReg', 'All UK regions', REGIONS.filter(x => cur.some(o => o.region === x)), opF.region)}
      <span class="row" style="gap:14px">${opF.tab === 'uni' ? sw('opFirst', 'First-years', opF.first) + ' ' : ''}${sw('opMacro', 'Macro & markets', opF.macro)} ${sw('opNew', 'New (24h)', opF.isNew)} ${sw('opSoon', 'Deadline soon', opF.soon)} ${sw('opOpen', 'Open now', opF.openOnly)}</span>
    </div>
  </div>
  <div id="opStrip"></div>
  <div id="opBody"></div>`;
  $$('.subtabs button', v).forEach(b => b.onclick = () => { opF.tab = b.dataset.t; opF.page = 0; opF.sector = opF.role = opF.prog = opF.region = opF.level = ''; viewOpenings(v); });
  { const lv = $('#opLevel'); if(lv) lv.onchange = e => { opF.level = e.target.value; opF.page = 0; drawOpenings(); }; }
  $('#opAdd').onclick = () => editOpening();
  $('#opRefresh').onclick = () => { toast('Checking…'); loadLive(false); };
  bindSearch('opQ', q => { opF.q = q; opF.page = 0; drawOpenings(); });
  [['opReg','region'], ['opSec','sector'], ['opRole','role'], ['opProg','prog'], ['opYg','yg']].forEach(([id, k]) => $('#' + id).onchange = e => { opF[k] = e.target.value; opF.page = 0; drawOpenings(); });
  $('#opNew').onchange = e => { opF.isNew = e.target.checked; opF.page = 0; drawOpenings(); };
  { const f = $('#opFirst'); if(f) f.onchange = e => { opF.first = e.target.checked; opF.page = 0; drawOpenings(); }; }
  $('#opMacro').onchange = e => { opF.macro = e.target.checked; opF.page = 0; drawOpenings(); };
  $('#opSoon').onchange = e => { opF.soon = e.target.checked; opF.page = 0; drawOpenings(); };
  $('#opOpen').onchange = e => { opF.openOnly = e.target.checked; opF.page = 0; drawOpenings(); };
  drawOpenings();
}

function opFiltered(){
  const isTrackTab = TRACKS.some(t => t[0] === opF.tab);
  let l = OPS().filter(o => {
    if(isTrackTab && trackOf(o) !== opF.tab) return false;
    if(opF.tab === 'saved' && !o.saved) return false;
    if(opF.tab === 'apps' && !o.status) return false;
    if(opF.sector && o.sector !== opF.sector) return false;
    if(opF.region && o.region !== opF.region) return false;
    if(opF.level && opF.tab === 'appr' && levelGroup(o) !== opF.level) return false;
    if(opF.role && o.roleType !== opF.role) return false;
    if(opF.prog && o.programme !== opF.prog) return false;
    if(opF.yg && ageOf(o) !== opF.yg && o.yearGroup !== 'Any') return false;
    if(opF.isNew && !isNew24(o)) return false;
    if(opF.openOnly && (o.live === 'closed' || (daysUntil(o.deadline) ?? 0) < 0)) return false;
    if(opF.macro && !isMacro(o)) return false;
    if(opF.first && opF.tab === 'uni' && !isFirstYear(o)) return false;
    if(opF.soon){ const d = daysUntil(o.deadline); if(d === null || d < 0 || d > 14) return false; }
    if(opF.q && ![o.company, o.role, o.roleType, o.location, o.region, o.programme, o.sector, (o.notes || []).join ? (o.notes || []).join(' ') : '', o.myNotes].join(' ').toLowerCase().includes(opF.q)) return false;
    return true;
  });
  const AG = ['14-16','16-18','18+','uni1','uni2','grad'];
  const key = { company:o => (o.company||'').toLowerCase(), role:o => (o.role||'').toLowerCase(), programme:o => o.programme || '', age:o => AG.indexOf(ageOf(o)) + 1 || 99, location:o => o.location || '',
    deadline:o => { const d = daysUntil(o.deadline); return d === null ? 9e9 : d < 0 ? 1e9 - d : d; }, posted:o => -postedKey(o) }[opF.sort];
  return l.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * opF.dir; });
}

const GHOSTS = [
  { company:'Example Bank', sector:'Banking', ageGroup:'uni1', role:'Spring Insight Programme 2027', roleType:'Markets & trading', programme:'Spring week', location:'London', region:'London', detected:new Date().toISOString() },
  { company:'Example Consulting', sector:'Consulting & Accounting', ageGroup:'uni2', role:'Summer Internship 2027', roleType:'Consulting & strategy', programme:'Summer internship', location:'Manchester', region:'North West', detected:new Date().toISOString() },
];

function drawOpenings(){
  const b = $('#opBody'), strip = $('#opStrip');
  const listTab = !['companies','review','apps'].includes(opF.tab);
  $('#opFilters').classList.toggle('hidden', !listTab && opF.tab !== 'apps');
  strip.innerHTML = '';
  if(opF.tab === 'companies') return drawCompanies(b);
  if(opF.tab === 'apps') return drawBoard(b);
  const list = opFiltered();
  const ghost = !OPS().length && !LIVE.updated;
  // closing soonest
  const soon = list.filter(o => { const d = daysUntil(o.deadline); return d !== null && d >= 0 && o.live !== 'closed'; }).sort((x, y) => x.deadline < y.deadline ? -1 : 1).slice(0, 5);
  if(soon.length) strip.innerHTML = `<div class="strip"><span class="strip-h">Closing soonest</span>${soon.map(o => `<button class="strip-i" data-open="${esc(o.id)}"><b>${esc(o.company)}</b><span>${esc(o.role)}</span>${countdown(o.deadline)}</button>`).join('')}</div>`;
  $$('[data-open]', strip).forEach(x => x.onclick = () => openOpening(OPS().find(o => o.id === x.dataset.open)));
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE)); if(opF.page >= pages) opF.page = pages - 1;
  const rows = ghost ? GHOSTS : list.slice(opF.page * PAGE_SIZE, (opF.page + 1) * PAGE_SIZE);
  const cols = [['company','Company'], ['role','Role'], ['programme','Programme'], ['location','Location'], ['age','Age'], ['deadline','Deadline'], ['posted','Posted']];
  b.innerHTML = (ghost ? `<div class="caveat">${I(IC.warn,15)}<div><b>Preview rows.</b> Real openings appear here after the scanner’s first run.</div></div>` : '')
  + `<div class="tracker">
    <div class="tr-head">${cols.map(c => `<span data-sort="${c[0]}" class="${opF.sort === c[0] ? 'sorted' : ''}">${c[1]}${opF.sort === c[0] ? (opF.dir > 0 ? ' ↓' : ' ↑') : ''}</span>`).join('')}<span></span></div>
    ${rows.length ? rows.map(o => opRow(o, ghost)).join('') : `<div class="tr-empty"><b>No openings match</b>Try clearing a filter or the search box.</div>`}
  </div>
  ${!ghost && list.length > PAGE_SIZE ? `<div class="pager"><button class="btn sm" data-pg="-1" ${opF.page === 0 ? 'disabled' : ''}>← Previous</button><span>Page ${opF.page + 1} of ${pages} · ${list.length} openings</span><button class="btn sm" data-pg="1" ${opF.page >= pages - 1 ? 'disabled' : ''}>Next →</button></div>` : (!ghost && list.length ? `<div class="pager"><span>${list.length} opening${list.length === 1 ? '' : 's'}</span></div>` : '')}`;
  $$('[data-sort]', b).forEach(h => h.onclick = () => { opF.dir = opF.sort === h.dataset.sort ? -opF.dir : 1; opF.sort = h.dataset.sort; drawOpenings(); });
  $$('[data-pg]', b).forEach(x => x.onclick = () => { opF.page += +x.dataset.pg; drawOpenings(); $('#opFilters').scrollIntoView({ behavior:'smooth', block:'start' }); });
  if(ghost) return;
  $$('.tr-row', b).forEach(r => {
    const o = () => OPS().find(x => x.id === r.dataset.id);
    r.onclick = e => {
      const it = o(); if(!it) return;
      if(e.target.closest('.apply')) return;
      if(e.target.closest('[data-star]')){ setOp(it, { saved:!it.saved }); e.target.closest('[data-star]').classList.toggle('on', it.saved); toast(it.saved ? 'Starred' : 'Removed from starred'); return; }
      if(e.target.closest('[data-co]')){ openCompany(it.company); return; }
      hideHover(); openOpening(it);
    };
    r.onmouseenter = e => { if(matchMedia('(hover:hover)').matches){ const it = o(); if(it) showHover(it, r); } };
    r.onmouseleave = hideHover;
  });
}
function refreshCounts(){ const v = $('#view'); const sc = window.scrollY; viewOpenings(v); window.scrollTo(0, sc); }

/* same role at the same firm in other cities → "also Leeds, Manchester" */
const opTitleKey = t => String(t || '').toLowerCase().replace(/\b20\d\d\b/g, ' ').replace(/programmes?|programs?/g, 'programme').replace(/\b(london|leeds|manchester|birmingham|edinburgh|glasgow|bristol|belfast|cardiff|uk)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
let _otherLocs = null;
function otherLocs(o){
  if(!_otherLocs){ _otherLocs = {}; OPS().forEach(x => { const k = x.company + '|' + opTitleKey(x.role); (_otherLocs[k] = _otherLocs[k] || new Set()).add(cityOf(x)); }); setTimeout(() => { _otherLocs = null; }, 0); }
  return [...(_otherLocs[o.company + '|' + opTitleKey(o.role)] || [])].filter(c => c && c !== cityOf(o));
}
function opRow(o, ghost){
  const sub = [o.roleType, o.price, o.wage].filter(Boolean).join(' · ');
  return `<div class="tr-row ${ghost ? 'ghost' : ''} ${o.live === 'closed' ? 'is-closed' : ''}" data-id="${esc(o.id || '')}" style="--sc:var(--${SEC_COL[o.sector] || 'grey'})">
    <div class="cell-main"><button class="co-link" data-co="${esc(o.company)}" title="See everything at ${esc(o.company)}">${esc(o.company)}</button><small><span class="sec-dot"></span>${esc(o.sector || '')}</small></div>
    <div class="cell-main"><div class="ttl"><b>${esc(o.role || o.programme)}</b>${isNew24(o) ? '<span class="badge-new">NEW</span>' : ''}${o.auto ? '<span class="badge-auto" title="The scanner found this firm by itself">New firm</span>' : ''}${o.status ? `<span class="status-tag ${statusCls(o.status)}">${esc(o.status)}</span>` : ''}</div><small>${esc(sub)}</small></div>
    <div class="cell-txt">${esc(o.programme || '')}${o.programme === 'Apprenticeship' && levelOf(o) ? `<small class="lvl">${esc(LEVEL_NAME[levelOf(o)] || levelOf(o))}</small>` : ''}</div>
    <div class="cell-main"><b style="font-weight:500">${esc(cityOf(o))}</b><small>${(() => { const ol = otherLocs(o); return ol.length ? `<span title="Same programme also in ${esc(ol.join(', '))}">also ${esc(ol.slice(0, 2).join(', '))}${ol.length > 2 ? ' +' + (ol.length - 2) : ''}</span>` : o.region && o.region !== cityOf(o) ? esc(o.region) : ''; })()}</small></div>
    <div class="cell-age">${ageCell(o)}</div>
    <div>${o.live === 'closed' ? '<span class="cd closed">Closed</span>' : o.deadline || o.opens || o.rolling ? countdown(o.deadline, o.opens, o.rolling) : o.live === 'open' ? '<span class="cd open">Open</span>' : o.live === 'soon' ? '<span class="cd future">Opening soon</span>' : '<span class="faint">·</span>'}</div>
    <div class="cell-main posted">${postedCell(o)}</div>
    <div class="m-extra">${esc([o.programme, ageOf(o) && 'Age ' + AGE_TEXT[ageOf(o)], o.location, o.deadline ? 'closes ' + fmtD(o.deadline) : ''].filter(Boolean).join(' · '))}</div>
    <div class="acts">
      <button class="act ${o.saved ? 'on' : ''}" data-star title="Star" aria-label="Star">${I(IC.star,17)}</button>
      ${o.link ? (o.exact === false
        ? `<a class="apply ghosted" href="${esc(safeUrl(o.link))}" target="_blank" rel="noopener" title="This programme has no individual application page yet — this is the firm's page for it">Details ${I(IC.ext,14)}</a>`
        : `<a class="apply" href="${esc(safeUrl(o.link))}" target="_blank" rel="noopener">Apply ${I(IC.ext,14)}</a>`) : `<span class="apply" style="opacity:.5">Apply ${I(IC.ext,14)}</span>`}
    </div>
  </div>`;
}

/* hover card with the key application details */
let hoverEl;
function showHover(o, row){
  if(!hoverEl){ hoverEl = document.createElement('div'); hoverEl.className = 'hovercard'; hoverEl.setAttribute('role', 'tooltip'); document.body.appendChild(hoverEl); }
  const badges = [o.programme, o.programme === 'Apprenticeship' && LEVEL_NAME[levelOf(o)], o.wage, o.start && 'Starts ' + fmtD(o.start, true), ageOf(o) && AGE_TEXT[ageOf(o)], o.visa, o.price, o.live === 'open' ? 'Applications open' : o.live === 'closed' ? 'Closed' : o.live === 'soon' ? 'Opening soon' : ''].filter(Boolean);
  const lines = [];
  if(o.deadline) lines.push(`<b>Deadline ${fmtD(o.deadline, true)}.</b>`);
  else if(o.opens) lines.push(`<b>Opens ${fmtD(o.opens, true)}.</b>`);
  else if(o.rolling) lines.push('<b>Rolling deadline — apply early.</b>');
  const notes = Array.isArray(o.notes) ? o.notes : [];
  const firm = S.firmNotes[o.company];
  hoverEl.innerHTML = `<div class="hc-t">${esc(o.role)}</div>
    <div class="hc-b">${badges.map(x => `<span>${esc(x)}</span>`).join('')}</div>
    ${lines.length || notes.length ? `<p>${lines.join(' ')} ${notes.map(esc).join(' ')}</p>` : '<p class="faint">No extra details were published with this listing — open it for the full description.</p>'}
    ${firm ? `<p class="hc-firm"><b>Your note on ${esc(o.company)}:</b> ${esc(firm)}</p>` : ''}
    <div class="hc-f">${esc([o.company, o.location || o.region, o.postedAt ? 'posted ' + fmtD(o.postedAt, true) : '', o.source ? 'via ' + o.source : '', o.info ? 'programme page in details' : ''].filter(Boolean).join(' · '))}</div>`;
  const r = row.querySelector('.cell-main:nth-child(2)').getBoundingClientRect();
  hoverEl.style.left = Math.max(12, Math.min(r.left, window.innerWidth - 400)) + 'px';
  const below = r.bottom + 8, h = hoverEl.offsetHeight || 180;
  hoverEl.style.top = (below + h > window.innerHeight ? r.top - h - 8 : below) + window.scrollY + 'px';
  hoverEl.classList.add('on');
}
function hideHover(){ if(hoverEl) hoverEl.classList.remove('on'); }
window.addEventListener('scroll', hideHover, { passive:true });

function openOpening(o){
  if(!o) return;
  const notes = Array.isArray(o.notes) ? o.notes : [];
  const html = `
    <div class="meta" style="--sc:var(--${SEC_COL[o.sector] || 'grey'})"><span class="chip subj">${esc(o.sector || 'Other')}</span>${o.programme ? `<span class="chip soft">${esc(o.programme)}</span>` : ''}${ageOf(o) ? `<span class="chip soft">Age ${esc(AGE_TEXT[ageOf(o)])}</span>` : ''}${o.visa ? `<span class="chip ${/No/.test(o.visa) ? 'warn' : 'ok'}">${esc(o.visa)}</span>` : ''}${o.live === 'open' ? '<span class="chip ok">Applications open</span>' : o.live === 'closed' ? '<span class="chip soft">Closed</span>' : ''}</div>
    <h2>${esc(o.role || o.programme)}</h2>
    <div class="muted" style="font-size:15px;margin-bottom:12px"><a href="#" class="lnk" id="dCo" style="color:var(--ink);font-weight:600">${esc(o.company)}</a>${o.location ? ' · ' + esc(o.location) : ''}</div>
    ${o.link ? `<div style="margin:4px 0 14px"><a class="apply" href="${esc(safeUrl(o.link))}" target="_blank" rel="noopener">${o.exact === false ? 'Programme page' : 'Apply'} ${I(IC.ext,14)}</a>${o.exact === false ? '<span class="faint" style="font-size:12.5px;margin-left:8px">No individual application page yet</span>' : ''}${o.info ? ` <a class="btn ghost sm" style="margin-left:6px" href="${esc(safeUrl(o.info))}" target="_blank" rel="noopener">Programme page ${I(IC.ext,12)}</a>` : ''}</div>` : ''}
    <dl class="kv">
      <dt>Deadline</dt><dd>${o.deadline ? fmtD(o.deadline, true) + ' ' + countdown(o.deadline, o.opens, o.rolling) : o.rolling ? 'Rolling' : 'Not published — apply early'}</dd>
      ${o.opens ? `<dt>Opens</dt><dd>${fmtD(o.opens, true)}</dd>` : ''}
      ${o.roleType ? `<dt>Role type</dt><dd>${esc(o.roleType)}</dd>` : ''}
      ${o.region ? `<dt>Region</dt><dd>${esc(o.region)}</dd>` : ''}
      ${o.programme === 'Apprenticeship' && levelOf(o) ? `<dt>Level</dt><dd>${esc(LEVEL_NAME[levelOf(o)] || levelOf(o))}</dd>` : ''}
      ${o.wage ? `<dt>Wage</dt><dd>${esc(o.wage)}</dd>` : ''}
      ${o.start ? `<dt>Starts</dt><dd>${fmtD(o.start, true)}</dd>` : ''}
      ${o.price ? `<dt>Price</dt><dd>${esc(o.price)}</dd>` : ''}
      <dt>Posted</dt><dd>${o.postedAt ? fmtD(o.postedAt, true) + (o.postedApprox ? ' or earlier' : '') + ' by ' + esc(o.company) : 'Not stated by the firm'}</dd>
      ${o.detected ? `<dt>Detected</dt><dd>${new Date(o.detected).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}${o.source ? ' · via ' + esc(o.source) : ''}</dd>` : ''}
    </dl>
    ${notes.length ? `<div class="drawer-sec"><div class="lbl">Key details from the listing</div><ul class="notes">${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
    <div class="drawer-sec"><div class="lbl">Application status</div>
      <select class="dd-sel" id="dSt">${APP_STATUS.map(s => `<option value="${s}" ${s === (o.status || '') ? 'selected' : ''}>${s || 'Not tracking'}</option>`).join('')}</select></div>
    <div class="drawer-sec"><div class="lbl">What I learned <span class="hint">one short point per line, shown in My record</span></div>
      <textarea class="inp" id="dLearn" rows="4" placeholder="e.g. Writing to a word limit forced me to cut my weakest argument">${esc(st.learned || '')}</textarea>
    </div>
    <div class="drawer-sec"><div class="lbl">Your notes</div><textarea class="inp" id="dN" rows="4" placeholder="Cover letter angle, test dates, who you spoke to…">${esc(o.myNotes || '')}</textarea></div>
    ${o.remote ? '' : '<div class="drawer-sec row"><button class="btn" id="dE">Edit details</button></div>'}`;
  openDrawer(esc(o.company), html, b => {
    $('#dSt', b).onchange = e => { setOp(o, { status:e.target.value }); drawOpenings(); };
    $('#dN', b).oninput = debounce(e => setOp(o, { myNotes:e.target.value }), 300);
    $('#dCo', b).onclick = e => { e.preventDefault(); openCompany(o.company); };
    if($('#dE', b)) $('#dE', b).onclick = () => { closeDrawer(); editOpening(o); };
  });
}

/* company page (like SimplyTK's /companies/…): live openings, recently closed, your notes */
function openCompany(name){
  const live = OPS().filter(o => o.company === name).sort((a, b) => postedKey(b) - postedKey(a));
  const closed = (LIVE.closed || []).filter(c => c.company === name).sort((a, b) => a.closedOn < b.closedOn ? 1 : -1);
  const w = LIVE.watchlist.find(c => c.company === name) || live[0] || {};
  const h = (LIVE.health || {})[name];
  const via = h && h.ok ? (Array.isArray(h.via) ? h.via : [h.via]).filter(Boolean).join(', ') : '';
  const html = `
    <div class="meta" style="--sc:var(--${SEC_COL[w.sector] || 'grey'})"><span class="chip subj">${esc(w.sector || 'Other')}</span>${w.sub ? `<span class="chip soft">${esc(w.sub)}</span>` : ''}</div>
    <h2>${esc(name)}</h2>
    <p class="muted" style="margin:0 0 6px"><b style="color:var(--ink)">${live.length}</b> live opening${live.length === 1 ? '' : 's'} right now${via ? ' · checked via ' + esc(via) : ''}.</p>
    ${h && !h.ok ? `<p class="faint" style="font-size:12.5px;margin:0">The scanner hasn’t found this firm’s job system yet.</p>` : ''}
    <div class="drawer-sec"><div class="lbl">Live openings</div>
      ${live.length ? `<div class="list">${live.map(o => `<div class="li"><span class="grow"><a href="#" class="lnk" data-op="${esc(o.id)}" style="color:var(--ink);font-weight:600">${esc(o.role)}</a><small>${esc([o.programme, o.location, o.postedAt ? relTime(o.postedAt) : ''].filter(Boolean).join(' · '))}</small></span>${o.deadline ? countdown(o.deadline) : ''}${o.link ? `<a class="apply sm" href="${esc(safeUrl(o.link))}" target="_blank" rel="noopener">Apply</a>` : ''}</div>`).join('')}</div>` : '<p class="faint" style="font-size:13px">Nothing open in the UK right now.</p>'}
    </div>
    <div class="drawer-sec"><div class="lbl">Recently closed</div>
      ${closed.length ? `<div class="list">${closed.slice(0, 20).map(c => `<div class="li"><span class="grow">${esc(c.role)}<small>${esc(c.programme || '')}${c.detected ? ' · seen from ' + fmtD(c.detected.slice(0, 10), true) : ''}</small></span><span class="cd closed">Closed ${fmtD(c.closedOn)}</span></div>`).join('')}</div>` : '<p class="faint" style="font-size:13px">Nothing has closed since tracking began. Closed programmes are kept here for 4 months, so next year you can see when they opened.</p>'}
    </div>
    <div class="drawer-sec"><div class="lbl">Your notes on ${esc(name)} <span class="faint" style="text-transform:none;letter-spacing:0">— shown on every opening’s hover card</span></div>
      <textarea class="inp" id="fN" rows="3" placeholder="e.g. Only one application per cycle · met Jane at the insight evening">${esc(S.firmNotes[name] || '')}</textarea></div>
    <div class="drawer-sec row"><button class="btn sm" id="fFilter">Show only ${esc(name)} in the tracker</button></div>`;
  openDrawer('Company', html, b => {
    $$('[data-op]', b).forEach(a => a.onclick = e => { e.preventDefault(); openOpening(OPS().find(o => o.id === a.dataset.op)); });
    $('#fN', b).oninput = debounce(e => { S.firmNotes[name] = e.target.value.trim(); save(); }, 300);
    $('#fFilter', b).onclick = () => { closeDrawer(); opF.q = name.toLowerCase(); opF.page = 0; const t = live[0] ? trackOf(live[0]) : 'uni'; opF.tab = t; location.hash === '#openings' ? viewOpenings($('#view')) : (location.hash = '#openings'); };
  });
}

function editOpening(o, preset){
  const companies = [...new Set(OPS().map(x => x.company))].sort();
  openForm({ title: o ? 'Edit opening' : 'Add opening', value: o || Object.assign({ sector:'Banking', programme:'Spring week', posted:isoToday(), detected:new Date().toISOString() }, preset),
    fields:[
      { k:'company', label:'Company', req:true, list:companies },
      { k:'sector', label:'Sector', type:'select', opts:SECTORS },
      { k:'role', label:'Role / programme name', req:true, full:true, ph:'e.g. Spring Insight Programme 2027' },
      { k:'roleType', label:'Role type', ph:'e.g. Markets & trading', list:[...new Set(OPS().map(x => x.roleType).filter(Boolean))] },
      { k:'programme', label:'Programme', type:'select', opts:PROGRAMMES },
      { k:'ageGroup', label:'Age / eligibility', type:'select', opts:[['', 'Not stated'], ...AGE_GROUPS] },
      { k:'location', label:'City', ph:'London' }, { k:'region', label:'UK region', type:'select', opts:['', ...REGIONS] },
      { k:'opens', label:'Opens', type:'date' }, { k:'deadline', label:'Deadline', type:'date' },
      { k:'rolling', label:'Rolling deadline', type:'check' },
      { k:'price', label:'Price', ph:'e.g. Free · £49 certificate' },
      { k:'link', label:'Application link', type:'url', full:true, ph:'https://' },
    ],
    onSave: out => { o ? Object.assign(o, out) : S.openings.push(Object.assign({ id:uid(), status:'', detected:new Date().toISOString(), posted:isoToday() }, out)); save(); route(); },
    onDelete: o ? () => { S.openings = S.openings.filter(x => x !== o); save(); route(); } : null });
}

function drawBoard(b){
  const cols = APP_STATUS.filter(Boolean);
  const list = OPS().filter(o => o.status);
  if(!list.length){ b.innerHTML = emptyBox('No applications yet', 'Open any opening and set its status — it’ll appear here as a card you can drag between stages.'); return; }
  b.innerHTML = `<div class="board">${cols.map(c => `<div class="col" data-col="${c}"><h4>${c}<span>${list.filter(o => o.status === c).length}</span></h4>
    ${list.filter(o => o.status === c).map(o => `<div class="kcard" draggable="true" data-id="${o.id}" style="--sc:var(--${SEC_COL[o.sector] || 'grey'})"><b>${esc(o.company)}</b><small>${esc(o.role || o.programme)}</small>${countdown(o.deadline, o.opens, o.rolling)}</div>`).join('')}</div>`).join('')}</div>`;
  $$('.kcard', b).forEach(k => {
    k.ondragstart = e => e.dataTransfer.setData('text/plain', k.dataset.id);
    k.onclick = () => openOpening(OPS().find(o => o.id === k.dataset.id));
  });
  $$('.col', b).forEach(c => {
    c.ondragover = e => { e.preventDefault(); c.classList.add('drag'); };
    c.ondragleave = () => c.classList.remove('drag');
    c.ondrop = e => { e.preventDefault(); const o = OPS().find(x => x.id === e.dataTransfer.getData('text/plain')); if(o){ setOp(o, { status:c.dataset.col }); drawBoard(b); } };
  });
}

const wlF = { mine:false };
function drawCompanies(b){
  const accepted = Object.keys(S.reviewDecisions || {}).filter(k => S.reviewDecisions[k] === 'accept').map(c => ({ company:c, sector:'Other', sub:'Accepted earlier' }));
  const own = OPS().filter(o => !o.remote).map(o => ({ company:o.company, sector:o.sector, sub:'Added by you' }));
  const seen = new Set(), wl = [];
  LIVE.watchlist.concat(accepted, own).forEach(c => { if(!seen.has(c.company)){ seen.add(c.company); wl.push(c); } });
  const list = wlF.mine ? wl.filter(c => !c.addedByClaude) : wl;
  const H = LIVE.health || {};
  const count = c => OPS().filter(o => o.company === c).length;
  const dot = c => { const h = H[c]; const n = count(c);
    return h ? (h.ok ? (n ? `<i class="hd on" title="${n} open now"></i>` : '<i class="hd idle" title="Job system found — nothing open in the UK right now"></i>') : '<i class="hd off" title="Job system not found yet"></i>') : '<i class="hd none" title="Not scanned yet"></i>'; };
  const secs = SECTORS.filter(sx => list.some(c => c.sector === sx));
  const found = wl.filter(c => H[c.company] && H[c.company].ok).length;
  b.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:14px">
      <p class="muted" style="margin:0;max-width:70ch;font-size:13.5px">${wl.length} firms checked every 3 hours, grouped like your mind-map. ${Object.keys(H).length ? `Job systems found for <b>${found}</b> of ${wl.length}.` : 'Health appears after the first scan.'} Click a firm to see its page.</p>
      ${sw('wlMine', 'Only firms from my list', wlF.mine)}</div>
    <div class="legend-row"><span><i class="hd on"></i>Openings now</span><span><i class="hd idle"></i>Found, nothing open</span><span><i class="hd off"></i>Not found yet</span><span><i class="hd none"></i>Not scanned yet</span><span><span class="co-chip claude" style="pointer-events:none;--sc:var(--faint);padding:1px 8px">Firm</span> added by Claude</span></div>
    <div class="mind">${secs.map(sx => { const cos = list.filter(c => c.sector === sx); const subs = [...new Set(cos.map(c => c.sub || 'Other'))];
      return `<div class="sector" style="--sc:var(--${SEC_COL[sx] || 'grey'})"><h3>${sx}<small>${cos.length} firms</small></h3>
      ${subs.map(sb => `<div class="sub-h">${esc(sb)}</div><div class="cos">${cos.filter(c => (c.sub || 'Other') === sb).map(c => `<button class="co-chip ${c.addedByClaude ? 'claude' : ''}" data-co="${esc(c.company)}">${dot(c.company)}${esc(c.company)}${count(c.company) ? ` <i>${count(c.company)}</i>` : ''}</button>`).join('')}</div>`).join('')}</div>`; }).join('')}</div>`;
  $('#wlMine', b).onchange = e => { wlF.mine = e.target.checked; drawCompanies(b); };
  $$('[data-co]', b).forEach(c => c.onclick = () => openCompany(c.dataset.co));
}

/* ============================================================
   WORK EXPERIENCE (log)
   ============================================================ */
function editWork(w){
  openForm({ title: w ? 'Edit placement' : 'Add placement', value: w || { sector:'Banking', type:'Work experience', inCV:true },
    fields:[
      { k:'company', label:'Company', req:true }, { k:'role', label:'Role / programme' },
      { k:'sector', label:'Sector', type:'select', opts:SECTORS }, { k:'type', label:'Type', type:'select', opts:PROGRAMMES },
      { k:'start', label:'Start date', type:'date' }, { k:'days', label:'Length (days)', type:'number' },
      { k:'contact', label:'Supervisor / contact' }, { k:'inCV', label:'Include on CV', type:'check' },
      { k:'did', label:'What you did', type:'textarea', hint:'one per line, these become CV bullet points' },
      { k:'learned', label:'What I learned', type:'textarea', hint:'one short point per line', ph:'e.g. Credit analysts care more about cash flow than profit' },
    ],
    onSave: out => { w ? Object.assign(w, out) : S.work.push(Object.assign({ id:uid() }, out)); save(); route(); },
    onDelete: w ? () => { S.work = S.work.filter(x => x !== w); save(); route(); } : null });
}

/* ============================================================
   MY RECORD
   Supercurriculars, extracurriculars, work experience and reading in one log.
   It reads the stores that already exist (S.sc + catalogue, S.extras, S.work, S.books),
   so nothing is moved or copied. "What I learned" points are kept one per line.
   ============================================================ */
const REC_TYPES = [
  { k:'sc',   label:'Supercurriculars', one:'Competition', c:'var(--accent)', out:'Result' },
  { k:'ex',   label:'Extracurriculars', one:'Extracurricular', c:'var(--phil)',   out:'Achievements' },
  { k:'work', label:'Work experience',  one:'Work experience', c:'var(--teal)',   out:'What I did' },
  { k:'book', label:'Reading',          one:'Book',         c:'var(--econ)',   out:'How I’d use it' },
  { k:'proj', label:'Projects',         one:'Project',      c:'var(--multi)',  out:'What it does' },
  { k:'lec',  label:'Lectures',         one:'Lecture',      c:'var(--law)',    out:'Speaker' },
];
const REC_T = Object.fromEntries(REC_TYPES.map(t => [t.k, t]));
const recF = { types:[], q:'', gaps:false };
const toPoints = t => String(t || '').split('\n').map(l => l.replace(/^\s*[-•*–]\s*/, '').trim()).filter(Boolean);

function recEntries(){
  const out = [];
  allSc().forEach(i => {
    const st = scState(i.id); if(st.status !== 'done' && st.status !== 'doing') return;
    out.push({ type:'sc', id:i.id, title:strip(i.t), meta:[subjLabel(subjList(i, st))], date:st.doneOn || i.date || '',
      when:st.status === 'doing' ? 'In progress' : st.doneOn ? fmtD(st.doneOn, true) : 'Done', out:st.result || '', learned:st.learned || '',
      set:v => setSc(i.id, { learned:v }), edit:() => i.custom ? editScCustom(S.scCustom.find(c => c.id === i.id)) : openScDrawer(i) });
  });
  S.extras.forEach(e => out.push({ type:'ex', id:e.id, title:e.title, meta:[e.cat, e.role, e.org], date:e.start || '',
    when:fmtRange(e.start, e.end) || 'Ongoing', out:toPoints(e.achieve).join('; '), learned:e.learned || '', inCV:e.inCV,
    set:v => { e.learned = v; save(); }, edit:() => editExtra(e) }));
  S.work.forEach(w => out.push({ type:'work', id:w.id, title:w.company, meta:[w.role || w.type, w.sector], date:w.start || '',
    when:[fmtD(w.start, true), w.days ? w.days + (+w.days === 1 ? ' day' : ' days') : ''].filter(Boolean).join(', '), out:toPoints(w.did).join('; '), learned:w.learned || '', inCV:w.inCV,
    set:v => { w.learned = v; save(); }, edit:() => editWork(w) }));
  (S.books || []).filter(b => b.status !== 'Want to read').forEach(b => out.push({ type:'book', id:b.id, title:b.title, meta:[b.author, subjLabel(subjList(b))], date:b.finished || '',
    when:b.status === 'Reading' ? 'Reading now' : b.finished ? fmtD(b.finished, true) : 'Finished', out:b.use || '', learned:b.learned || '',
    set:v => { b.learned = v; save(); }, edit:() => editBook(b) }));
  (S.projects || []).forEach(pj => out.push({ type:'proj', id:pj.id, title:pj.title, meta:[pj.status, pj.tools], date:pj.start || '',
    when:pj.start ? fmtRange(pj.start, pj.end) : (pj.status || ''), outs:[['Problem', pj.problem], ['What I built', toPoints(pj.built).join('; ')], ['Outcome', pj.outcome]],
    learned:pj.learned || '', link:pj.link, inCV:pj.inCV, set:v => { pj.learned = v; save(); }, edit:() => editProject(pj) }));
  (S.lectures || []).forEach(l => out.push({ type:'lec', id:l.id, title:l.title, meta:[l.host, subjLabel(subjList(l))], date:l.date || '',
    when:l.date ? fmtD(l.date, true) : '', out:l.speaker || '', learned:l.learned || '', link:l.link,
    set:v => { l.learned = v; save(); }, edit:() => editLecture(l) }));
  out.forEach(e => { e.key = e.type + ':' + e.id; e.meta = e.meta.filter(Boolean); e.points = toPoints(e.learned); });
  return out.sort((a, b) => (b.date || '0') < (a.date || '0') ? -1 : (b.date || '0') > (a.date || '0') ? 1 : 0);
}
function recMatches(e){
  if(!recF.types.includes(e.type)) return false;
  if(recF.gaps && e.points.length) return false;
  if(recF.q && ![e.title, e.meta.join(' '), e.out, e.learned].join(' ').toLowerCase().includes(recF.q)) return false;
  return true;
}

const LOGS = {
  extracurriculars:{ types:['ex'], title:'Extracurriculars', add:'Add activity',
    sub:'Sport, music, leadership, volunteering and anything else outside lessons. Under each, keep a few short points on what you learned. Those points are what your CV and personal statement are built from.' },
  projects:{ types:['proj'], title:'Projects', add:'Add project',
    sub:'AI workflows, automations, apps and anything else you’ve built. Note the problem, what you built and what came of it, then a few short points on what you learned. A good project makes a strong CV line and interview story.' },
  work:{ types:['work'], title:'Work experience logger', add:'Add placement',
    sub:'Placements, insight days and virtual programmes you’ve done. Note what you did, and a few short points on what you learned. Interviewers ask about the second part.' },
};
function logStats(types){
  const all = recEntries().filter(e => types.includes(e.type));
  const pts = all.reduce((a, e) => a + e.points.length, 0);
  return [[all.length, all.length === 1 ? 'entry' : 'entries'], [pts, pts === 1 ? 'learning point' : 'learning points'], [all.filter(e => !e.points.length).length, 'without notes yet']];
}
function logBar(){
  return `<div class="filterbar"><div class="row">${searchbar('recQ', 'Search…', recF.q)}${sw('recGaps', 'Missing notes only', recF.gaps)}</div></div>`;
}
function bindLogBar(root){
  $('#recGaps', root).onchange = e => { recF.gaps = e.target.checked; drawRecord(); };
  bindSearch('recQ', q => { recF.q = q; drawRecord(); });
}
function viewLog(v, page){
  const L = LOGS[page]; recF.types = L.types;
  v.innerHTML = head({ crumbs:crumbsFor(page), title:L.title, sub:L.sub, stats:logStats(L.types),
    actions:`<button class="btn primary" id="logAdd">${I(IC.plus,14)} ${L.add}</button>` }) + logBar() + `<div id="recBody"></div>`;
  $('#logAdd').onclick = () => recNew(L.types[0]);
  bindLogBar(v);
  drawRecord();
}
const viewExtras = v => viewLog(v, 'extracurriculars');
const viewWork = v => viewLog(v, 'work');
const viewProjects = v => viewLog(v, 'projects');
const PROJ_ST = ['In progress', 'In use', 'Finished', 'Paused'];
function editProject(pj){
  openForm({ title: pj ? 'Edit project' : 'Add project', value: pj || { status:'In progress', start:isoToday(), inCV:true },
    fields:[
      { k:'title', label:'Project', req:true, full:true, ph:'e.g. Automated spring-week deadline tracker' },
      { k:'status', label:'Status', type:'select', opts:PROJ_ST }, { k:'tools', label:'Tools', ph:'e.g. Claude, Python, Google Sheets' },
      { k:'start', label:'Started', type:'date' }, { k:'end', label:'Finished', type:'date', hint:'blank if ongoing' },
      { k:'link', label:'Link', type:'url', ph:'GitHub, demo or write-up' }, { k:'inCV', label:'Include on CV', type:'check' },
      { k:'problem', label:'Problem', type:'textarea', rows:2, ph:'What were you trying to fix or make easier?' },
      { k:'built', label:'What I built', type:'textarea', hint:'one per line, these become CV bullet points', ph:'e.g. Scrapes 600 firms’ careers pages every 3 hours' },
      { k:'outcome', label:'Outcome', full:true, ph:'e.g. Saves me 2 hours a week; used by 3 friends' },
      { k:'learned', label:'What I learned', type:'textarea', hint:'one short point per line' },
    ],
    onSave: out => { if(!S.projects) S.projects = []; pj ? Object.assign(pj, out) : S.projects.push(Object.assign({ id:uid() }, out)); save(); route(); },
    onDelete: pj ? () => { S.projects = S.projects.filter(x => x !== pj); save(); route(); } : null });
}
function recNew(t){
  if(t === 'sc') editScCustom(null, { _status:'done', date:isoToday() });
  if(t === 'ex') editExtra();
  if(t === 'work') editWork();
  if(t === 'book') editBook(null, { status:'Finished', finished:isoToday() });
  if(t === 'lec') editLecture();
  if(t === 'proj') editProject();
}
function recItemHTML(e){
  const T = REC_T[e.type];
  return `<article class="rec-item" data-key="${esc(e.key)}" style="--c:${T.c}">
    <div class="rec-side">${recF.types.length > 1 ? `<span class="rec-type"><i></i>${T.one}</span>` : ''}<span class="rec-when">${esc(e.when)}</span></div>
    <div class="rec-main">
      <div class="rec-top"><h3>${e.link ? `<a href="${esc(safeUrl(e.link))}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title)}</h3><button class="btn sm ghost" data-edit>Edit</button></div>
      ${e.meta.length ? `<p class="rec-meta">${e.meta.map(esc).join(', ')}${e.inCV ? ' <span class="chip soft">On CV</span>' : ''}</p>` : ''}
      ${(e.outs || [[T.out, e.out]]).filter(x => x[1]).map(([l, t]) => `<p class="rec-out"><b>${l}</b> ${esc(t)}</p>`).join('')}
      <div class="rec-learn">
        <h4>What I learned</h4>
        ${e.points.length ? `<ul>${e.points.map((p, i) => `<li><span class="pt" contenteditable="true" spellcheck="true" data-pi="${i}" aria-label="Learning point ${i + 1}">${esc(p)}</span><button type="button" class="pt-del" data-pdel="${i}" aria-label="Remove this point">${I(IC.x, 13)}</button></li>`).join('')}</ul>` : ''}
        <form class="rec-add"><span aria-hidden="true">${I(IC.plus, 13)}</span><input class="inp" maxlength="220" placeholder="${e.points.length ? 'Add another point' : 'What did you take from this? One short point, then press Enter'}" aria-label="Add a learning point"></form>
      </div>
    </div>
  </article>`;
}
function drawRecord(){
  const b = $('#recBody'); if(!b) return;
  const all = recEntries().filter(e => recF.types.includes(e.type)), list = all.filter(recMatches);
  if(!all.length){
    const t = recF.types[0], what = { ex:['No activities yet', 'Add a club, team, instrument, role or volunteering commitment, then note what you learned from it in a few short points.', 'Add your first activity'],
      work:['No placements logged yet', 'Add anything from a week in an office to a virtual programme, then note what you learned in a few short points.', 'Add your first placement'],
      sc:['Nothing logged yet', 'Mark a competition as done or in progress, add a book you’ve read, or log a lecture. Then note what you learned in a few short points.', 'Log a competition'],
      proj:['No projects yet', 'Add an AI workflow, automation, app or tool you’ve built, even a small one. Then note what you learned in a few short points.', 'Add your first project'],
      lec:['No lectures logged yet', 'After a lecture, press “I went” on it in Upcoming, or log one here. Then note what you learned in a few short points.', 'Log a lecture'] }[t];
    b.innerHTML = emptyBox(what[0], what[1], `<button class="btn primary" data-first>${I(IC.plus,14)} ${what[2]}</button>`);
    $('[data-first]', b).onclick = () => recNew(t); return;
  }
  b.innerHTML = list.length ? `<div class="rec-list">${list.map(recItemHTML).join('')}</div>` : emptyBox('No entries match', 'Clear the search or switch off “Missing notes only”.');
  $$('.rec-item', b).forEach(bindRecItem);
}
function refreshLogStats(){
  const k = (location.hash || '').slice(1).split('?')[0], st = $('.page-head .stats');
  if(LOGS[k] && st) st.innerHTML = logStats(LOGS[k].types).map(x => `<div class="stat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
}
function bindRecItem(el){
  const get = () => recEntries().find(x => x.key === el.dataset.key);
  const redraw = focusAdd => {
    refreshLogStats();
    const e = get(); if(!e) return drawRecord();
    const tmp = document.createElement('div'); tmp.innerHTML = recItemHTML(e);
    const fresh = tmp.firstElementChild; el.replaceWith(fresh); bindRecItem(fresh);
    if(focusAdd) $('.rec-add input', fresh).focus();
  };
  $('[data-edit]', el).onclick = () => get().edit();
  $('.rec-add', el).onsubmit = ev => {
    ev.preventDefault();
    const val = $('input', ev.target).value.replace(/\s+/g, ' ').trim(); if(!val) return;
    const e = get(); e.set(e.points.concat(val).join('\n')); redraw(true);
  };
  $$('[data-pdel]', el).forEach(btn => btn.onclick = () => { const e = get(); e.points.splice(+btn.dataset.pdel, 1); e.set(e.points.join('\n')); redraw(); });
  $$('.pt', el).forEach(pt => {
    pt.onkeydown = ev => { if(ev.key === 'Enter'){ ev.preventDefault(); pt.blur(); } if(ev.key === 'Escape'){ pt.textContent = get().points[+pt.dataset.pi] || ''; pt.blur(); } };
    pt.onpaste = ev => { ev.preventDefault(); document.execCommand('insertText', false, (ev.clipboardData.getData('text/plain') || '').replace(/\s+/g, ' ')); };
    pt.onblur = () => {
      const e = get(), i = +pt.dataset.pi, val = pt.textContent.replace(/\s+/g, ' ').trim();
      if(val === e.points[i]) return;
      if(val) e.points[i] = val; else e.points.splice(i, 1);
      e.set(e.points.join('\n'));
      if(!val) redraw(); else refreshLogStats();
    };
  });
}

/* ============================================================
   ACADEMIC LECTURES
   Data: data/lectures.json (rewritten every 3 hours by scripts/scan-lectures.mjs).
   What you attended is kept in S.lectures, with "What I learned" points like every other log.
   ============================================================ */
const LEC_HOSTS = [
  { name:'LSE public events', where:'London and online', what:'Talks by leading economists, politicians and writers. Most are free, with a ticket.', link:'https://www.lse.ac.uk/events' },
  { name:'Gresham College', where:'London and online', what:'Free public lectures across economics, law, philosophy and more, with recordings online.', link:'https://www.gresham.ac.uk/whats-on' },
  { name:'Institute for Fiscal Studies', where:'London and online', what:'Briefings and lectures on tax, public spending and the economy.', link:'https://ifs.org.uk/events' },
  { name:'Institute for Government', where:'London and online', what:'Discussions with ministers, officials and experts on how government works.', link:'https://www.instituteforgovernment.org.uk/our-events' },
  { name:'Resolution Foundation', where:'London and online', what:'Report launches and debates on living standards, wages and the economy.', link:'https://www.resolutionfoundation.org/events/' },
  { name:'The British Academy', where:'London and around the UK', what:'Lectures and festivals from the national academy for the humanities and social sciences.', link:'https://www.thebritishacademy.ac.uk/events/' },
  { name:'RSA', where:'London and online', what:'Talks on ideas, society and the economy.', link:'https://www.thersa.org/events/upcoming' },
  { name:'Oxford Talks', where:'Oxford and online', what:'The University of Oxford’s listing of lectures and seminars. Check each one is open to the public.', link:'https://talks.ox.ac.uk/' },
  { name:'Cambridge Talks', where:'Cambridge and online', what:'The University of Cambridge’s listing of talks and seminars. Check each one is open to the public.', link:'https://talks.cam.ac.uk/' },
];
const LEC = { updated:null, items:[], loaded:false, error:false };
const lcF = { tab:'up', q:'', subjects:new Set(), host:'', online:false, saved:false };
async function loadLectures(){
  try{
    // listings live in data/lectures.json, and a copy rides along in supercurriculars-live.json; use whichever is newer
    const grab = async (f, pick) => { try{ const r = await fetch(f + '?t=' + Date.now(), { cache:'no-store' }); return r.ok ? pick(await r.json()) : null; }catch(e){ return null; } };
    const [a, b] = await Promise.all([grab('data/lectures.json', d => d), grab('data/supercurriculars-live.json', d => d.lectures)]);
    const d = [a, b].filter(x => x && x.updated).sort((x, y) => y.updated.localeCompare(x.updated))[0] || a || b; if(!d) throw 0;
    Object.assign(LEC, { updated:d.updated || null, items:d.items || [], loaded:true, error:false });
  }catch(e){ Object.assign(LEC, { loaded:true, error:true }); }
  if(location.hash.startsWith('#lectures') && lcF.tab === 'up') drawLectures();
}
setInterval(loadLectures, 10 * 60 * 1000);
function lecLiveLine(){
  if(!LEC.loaded) return '<span class="live"><i></i>Loading listings…</span>';
  if(LEC.error || !LEC.updated) return '<span class="live wait"><i></i>Lecture checker set up · listings appear after its first run</span>';
  return `<span class="live"><i></i>Live · hosts’ own pages checked ${ago(LEC.updated.slice(0,10)).toLowerCase()} at ${LEC.updated.slice(11,16)} UTC</span>`;
}
const lecAttended = it => (S.lectures || []).some(l => l.ref === it.id);
function viewLectures(v){
  if(!S.lectures) S.lectures = [];
  if(!S.lecSaved) S.lecSaved = {};
  const up = LEC.items.filter(i => daysUntil(i.date) >= 0);
  v.innerHTML = head({
    crumbs:crumbsFor('lectures'), title:'Academic lectures',
    sub:'Public lectures and debates on philosophy, politics, economics and law, in London, Oxford and online. Listings come from each host’s own website and are refreshed every 3 hours.',
    stats:[[up.length, 'upcoming'], [up.filter(i => daysUntil(i.date) <= 7).length, 'in the next 7 days'], [S.lectures.length, 'attended']],
    actions:`<button class="btn primary" id="lcAdd">${I(IC.plus,14)} Log a lecture</button>`
  }) + `
  <div class="subtabs" role="tablist">
    <button role="tab" data-t="up" aria-selected="${lcF.tab === 'up'}">Upcoming <span class="n">${up.length}</span></button>
    <button role="tab" data-t="att" aria-selected="${lcF.tab === 'att'}">Attended <span class="n">${S.lectures.length}</span></button>
    <button role="tab" data-t="where" aria-selected="${lcF.tab === 'where'}">Where to look</button>
  </div>
  <div id="lcBody"></div>`;
  $$('.subtabs button', v).forEach(b => b.onclick = () => { lcF.tab = b.dataset.t; viewLectures(v); });
  $('#lcAdd').onclick = () => editLecture();
  drawLectures();
}
function drawLectures(){
  const body = $('#lcBody'); if(!body) return;
  if(lcF.tab === 'where'){
    body.innerHTML = `<p class="muted" style="margin:0 0 16px;max-width:64ch">The hosts the checker reads. Most lectures are free but need a ticket, and popular ones go quickly, so book when they’re announced.</p>
      <div class="grid">${LEC_HOSTS.map(h => `<a class="card host-card" href="${esc(h.link)}" target="_blank" rel="noopener"><h3>${esc(h.name)}</h3><div class="when">${esc(h.where)}</div><p class="note">${esc(h.what)}</p><span class="lnk">Open their listings ${I(IC.ext,12)}</span></a>`).join('')}</div>`;
    return;
  }
  if(lcF.tab === 'att'){
    recF.types = ['lec'];
    body.innerHTML = logBar() + '<div id="recBody"></div>';
    bindLogBar(body); drawRecord(); return;
  }
  const hosts = [...new Set(LEC.items.map(i => i.host))].sort();
  if(!$('#lcFilters', body)){
    body.innerHTML = `<div style="margin:-6px 0 14px" id="lcLive"></div>
    <div class="filterbar" id="lcFilters">
      <div class="row">${searchbar('lcQ', 'Search lectures, speakers, hosts…', lcF.q)}${selectBox('lcHost', 'All hosts', hosts, lcF.host)}</div>
      <div class="row" id="lcPills">${SUBJ.filter(s => s.k !== 'multi').map(s => `<button class="pill" data-s="${s.k}" style="--c:var(--${s.k})" aria-pressed="${lcF.subjects.has(s.k)}"><span class="dot"></span>${s.label}</button>`).join('')}
        <span style="width:6px"></span>${sw('lcOnline', 'Online', lcF.online)} ${sw('lcSaved', 'Saved only', lcF.saved)}<span class="count" id="lcCount"></span></div>
    </div><div id="lcList"></div>`;
    bindSearch('lcQ', q => { lcF.q = q; drawLectures(); });
    $('#lcHost', body).onchange = e => { lcF.host = e.target.value; drawLectures(); };
    $('#lcOnline', body).onchange = e => { lcF.online = e.target.checked; drawLectures(); };
    $('#lcSaved', body).onchange = e => { lcF.saved = e.target.checked; drawLectures(); };
    $$('#lcPills .pill', body).forEach(b => b.onclick = () => { const k = b.dataset.s; lcF.subjects.has(k) ? lcF.subjects.delete(k) : lcF.subjects.add(k); b.setAttribute('aria-pressed', lcF.subjects.has(k)); drawLectures(); });
  }
  $('#lcLive', body).innerHTML = lecLiveLine();
  const match = i => (!lcF.subjects.size || lcF.subjects.has(i.s)) && (!lcF.host || i.host === lcF.host) && (!lcF.online || /online/i.test(i.format || ''))
    && (!lcF.saved || S.lecSaved[i.id]) && (!lcF.q || [i.title, i.host, i.venue, i.speakers].join(' ').toLowerCase().includes(lcF.q));
  const up = LEC.items.filter(i => daysUntil(i.date) >= 0).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const past = LEC.items.filter(i => { const d = daysUntil(i.date); return d < 0 && d >= -14; }).sort((a, b) => b.date.localeCompare(a.date));
  const shown = up.filter(match), shownPast = past.filter(match);
  $('#lcCount', body).textContent = shown.length === up.length ? up.length + ' upcoming' : shown.length + ' of ' + up.length;
  const months = [];
  shown.forEach(i => { const m = i.date.slice(0, 7); let g = months.find(x => x.m === m); if(!g) months.push(g = { m, items:[] }); g.items.push(i); });
  const mLabel = m => { const d = parseD(m + '-01'); return d.toLocaleDateString('en-GB', { month:'long', year:'numeric' }); };
  $('#lcList', body).innerHTML = (!LEC.items.length
      ? emptyBox(LEC.updated ? 'No lectures found right now' : 'Listings are on their way', LEC.updated ? 'The checker found nothing upcoming on the hosts’ pages. See “Where to look” for the hosts it reads.' : 'The lecture checker runs in the cloud every 3 hours. The first listings appear after its next run. Meanwhile, “Where to look” has every host.')
      : months.length ? months.map(g => `<section class="tl-month"><div class="tl-mhead"><h2>${mLabel(g.m)}</h2><span class="n">${g.items.length}</span></div><div class="lec-list">${g.items.map(lecRow).join('')}</div></section>`).join('')
      : emptyBox('Nothing matches those filters', 'Clear the search or the subject filters.'))
    + (shownPast.length ? `<section class="tl-month"><div class="tl-mhead"><h2>Last two weeks</h2><span class="n">Went to one? Log it</span></div><div class="lec-list">${shownPast.map(lecRow).join('')}</div></section>` : '');
  $$('[data-lstar]', body).forEach(b => b.onclick = () => { const id = b.dataset.lstar; S.lecSaved[id] = !S.lecSaved[id]; if(!S.lecSaved[id]) delete S.lecSaved[id]; save(); drawLectures(); });
  $$('[data-went]', body).forEach(b => b.onclick = () => {
    const it = LEC.items.find(i => i.id === b.dataset.went); if(!it || lecAttended(it)) return;
    S.lectures.push({ id:uid(), ref:it.id, title:it.title, host:it.host, speaker:it.speakers || '', date:it.date, link:it.link, s:it.s || 'multi', ss:it.s && it.s !== 'multi' ? [it.s] : [], learned:'' });
    save(); toast('Logged. Add what you learned under Attended'); drawLectures();
    const n = $('.subtabs [data-t="att"] .n'); if(n) n.textContent = S.lectures.length;
  });
}
function lecRow(i){
  const d = parseD(i.date), past = daysUntil(i.date) < 0, saved = !!S.lecSaved[i.id];
  const went = lecAttended(i);
  return `<div class="lec-row c-${i.s || 'multi'}">
    <div class="lec-date"><b>${d.getDate()}</b><span>${d.toLocaleDateString('en-GB', { weekday:'short' })}${i.time ? ', ' + esc(i.time) : ''}</span></div>
    <div class="lec-main">
      <h3><a href="${esc(safeUrl(i.link))}" target="_blank" rel="noopener">${esc(i.title)}</a></h3>
      <p class="lec-meta">${esc([i.host, i.venue && i.venue !== i.host ? i.venue : '', i.speakers].filter(Boolean).join(', '))}</p>
      <div class="chips">${i.s && SUBJ_L[i.s] ? `<span class="chip subj">${SUBJ_L[i.s]}</span>` : ''}${i.format ? `<span class="chip soft">${esc(i.format)}</span>` : ''}${i.free ? '<span class="chip ok">Free</span>' : ''}</div>
    </div>
    <div class="lec-side">
      ${past ? (went ? '<span class="chip ok">Logged</span>' : `<button class="btn sm" data-went="${esc(i.id)}">${I(IC.check,13)} I went</button>`)
             : `<button class="act ${saved ? 'on' : ''}" data-lstar="${esc(i.id)}" title="${saved ? 'Saved' : 'Save'}" aria-label="${saved ? 'Saved' : 'Save'}">${I(IC.star,17)}</button>`}
      <a class="btn sm" href="${esc(safeUrl(i.link))}" target="_blank" rel="noopener">${past ? 'Details' : 'Book'} ${I(IC.ext,12)}</a>
    </div>
  </div>`;
}
function editLecture(l){
  openForm({ title: l ? 'Edit lecture' : 'Log a lecture', value: Object.assign({ date:isoToday() }, l, { ss:subjList(l) }),
    fields:[
      { k:'title', label:'Lecture', req:true, full:true, ph:'e.g. Why nations fail, revisited' },
      { k:'speaker', label:'Speaker' }, { k:'host', label:'Host', list:LEC_HOSTS.map(h => h.name), ph:'e.g. LSE' },
      { k:'date', label:'Date', type:'date' }, { k:'ss', label:'Subjects', type:'subjects', hint:'pick one or more' },
      { k:'link', label:'Link', type:'url', full:true, ph:'https://' },
      { k:'learned', label:'What I learned', type:'textarea', hint:'one short point per line' },
    ],
    onSave: out => { out.s = subjKey(out.ss); if(!S.lectures) S.lectures = []; l ? Object.assign(l, out) : S.lectures.push(Object.assign({ id:uid() }, out)); save(); if(location.hash.startsWith('#lectures')) lcF.tab = 'att'; route(); },
    onDelete: l ? () => { S.lectures = S.lectures.filter(x => x !== l); save(); route(); } : null });
}

/* ============================================================
   ABOUT
   ============================================================ */
const ABOUT = {
  universities:'Every PPE, economics, law and politics course you’re weighing up, with the typical offer, required and suggested A-levels, GCSE rules and admissions test. Add your predicted grades and each course shows whether you meet it.',
  lectures:'Public lectures and debates on philosophy, politics, economics and law from LSE, Gresham College, the IFS, Oxford and more, refreshed every 3 hours. Log the ones you go to, with what you learned.',
  supercurriculars:'Competitions, essay prizes and programmes sorted by the school year they apply to, each with a reading guide. Your log keeps what you’ve done, read and attended, with a few short points on what you learned.',
  extracurriculars:'Sport, music, leadership and volunteering, with dates, roles and achievements, and what you learned from each.',
  openings:'Spring weeks, insight days, internships and apprenticeships at UK firms. Each firm’s own careers site is checked every 3 hours, and every role links to its own page.',
  work:'Placements, insight days and virtual programmes you’ve done: what you did, and a few short points on what you learned.',
  projects:'AI workflows, automations and anything else you’ve built: the problem, what you built, what came of it and what you learned.',
  contacts:'People you meet at events and placements, how you met, and when to follow up so the connection doesn’t go cold.',
  cv:'A one-page CV that imports straight from your logs. Edit the wording, choose a layout, then save as PDF.',
};
function viewAbout(v){
  v.innerHTML = `<article class="about">
    <h1>Admissions Home</h1>
    <p class="about-lede">One place to plan a PPE application. Find lectures, competitions and openings, log what you do and what you learned from it, and turn that into a CV and a personal statement.</p>
    ${NAV.map(g => `<section class="about-group"><h2>${esc(g.label)}</h2><div class="about-list">${g.items.map(it => `<a class="about-row" href="#${it.k}">
      <h3>${esc(it.label)}</h3><p>${esc(ABOUT[it.k] || it.desc)}</p></a>`).join('')}</div></section>`).join('')}
    <div class="about-notes">
      <section><h2>Your data stays with you</h2><p>Everything you type is saved in this browser only. Nothing is uploaded. Use the backup button in the top bar to export a copy or move it to another device.</p></section>
      <section><h2>What updates by itself</h2><p>Openings, lectures and supercurricular dates are refreshed from official pages every 3 hours, in the cloud. You don’t need to open anything for that to happen.</p></section>
    </div>
  </article>`;
}

/* ============================================================
   CONTACTS
   ============================================================ */
const REL = ['Professional','University student','Academic / lecturer','Alumni','Mentor','Teacher','Recruiter','Peer','Family friend','Other'];
const ctF = { q:'', sector:'', due:false };
function viewContacts(v){
  const due = S.contacts.filter(c => { const d = daysUntil(c.followUp); return d !== null && d <= 0; }).length;
  v.innerHTML = head({
    crumbs:crumbsFor('contacts'), title:'Contacts',
    sub:'Everyone you meet at insight days, events and placements. Note how you met and set a follow-up date so the connection doesn’t go cold.',
    stats:[[S.contacts.length, 'contacts'], [due, 'follow-ups due'], [new Set(S.contacts.map(c => c.org).filter(Boolean)).size, 'organisations']],
    actions:`<button class="btn" id="ctCsv">${I(IC.down,14)} CSV</button><button class="btn primary" id="ctAdd">${I(IC.plus,14)} Add contact</button>`
  }) + `<div class="filterbar">${searchbar('ctQ', 'Search by name, organisation, notes…', ctF.q)}
    <div class="row">${selectBox('ctSec', 'All sectors', SECTORS, ctF.sector)} ${sw('ctDue', 'Follow-up due', ctF.due)}</div></div><div id="ctBody"></div>`;
  $('#ctAdd').onclick = () => editContact();
  $('#ctCsv').onclick = exportContacts;
  bindSearch('ctQ', q => { ctF.q = q; drawContacts(); });
  $('#ctSec').onchange = e => { ctF.sector = e.target.value; drawContacts(); };
  $('#ctDue').onchange = e => { ctF.due = e.target.checked; drawContacts(); };
  drawContacts();
}
function drawContacts(){
  const b = $('#ctBody');
  if(!S.contacts.length){ b.innerHTML = emptyBox('No contacts yet', 'Add the people you meet — name, where you met, and when to get back in touch.', `<button class="btn primary" data-add>${I(IC.plus,14)} Add your first contact</button>`); $('[data-add]', b).onclick = () => editContact(); return; }
  const list = S.contacts.filter(c => (!ctF.sector || c.sector === ctF.sector)
    && (!ctF.due || ((daysUntil(c.followUp) ?? 1) <= 0))
    && (!ctF.q || [c.name, c.org, c.course, c.title, c.met, c.notes, c.email].join(' ').toLowerCase().includes(ctF.q)))
    .sort((a, c) => (a.name || '').localeCompare(c.name || ''));
  b.innerHTML = `<div class="tracker"><div class="tr-head ct"><span>Name</span><span>Email</span><span>Company / University</span><span>Notes</span><span></span></div>
    ${list.length ? list.map(c => `<div class="tr-row ct" data-id="${c.id}" style="--sc:var(--${SEC_COL[c.sector] || 'grey'})">
      <div class="cell-main"><b>${esc(c.name)}</b><small>${esc([c.title, c.rel].filter(Boolean).join(' · '))}</small></div>
      <div class="cell-main">${c.email ? `<b style="font-weight:500;user-select:all" data-stop>${esc(c.email)}</b>` : '<span class="faint">·</span>'}<small>${esc(c.phone || '')}</small></div>
      <div class="cell-main"><b style="font-weight:500">${esc(c.org || '')}</b><small>${c.course ? esc(c.course) : c.sector ? '<span class="sec-dot"></span>' + esc(c.sector) : ''}</small></div>
      <div class="cell-main"><span class="notes-cell">${esc(c.notes || '')}</span>${c.followUp ? `<small style="margin-top:3px">${followChip(c.followUp)}</small>` : ''}</div>
      <div class="m-extra">${esc([c.email, c.org].filter(Boolean).join(' · '))}${c.notes ? '<br>' + esc(c.notes) : ''}</div>
      <div class="acts">${c.email ? `<button class="act" data-copy="${esc(c.email)}" title="Copy email" data-stop>${I(IC.mail,16)}</button>` : ''}${c.linkedin ? `<a class="act" href="${esc(safeUrl(c.linkedin))}" target="_blank" rel="noopener" title="LinkedIn" data-stop>${I(IC.link,16)}</a>` : ''}</div>
    </div>`).join('') : '<div class="tr-empty"><b>No matches</b>Try clearing the search or filters.</div>'}</div>`;
  $$('[data-copy]', b).forEach(x => x.onclick = () => { navigator.clipboard.writeText(x.dataset.copy).then(() => toast('Email copied'), () => toast(x.dataset.copy)); });
  $$('.tr-row', b).forEach(r => r.onclick = e => { if(e.target.closest('[data-stop]')) return; editContact(S.contacts.find(c => c.id === r.dataset.id)); });
}
function followChip(s){ const d = daysUntil(s); return d < 0 ? `<span class="cd urgent">${-d}d overdue</span>` : d === 0 ? '<span class="cd urgent">Today</span>' : d <= 7 ? `<span class="cd soon">${fmtD(s)}</span>` : `<span class="cd future">${fmtD(s)}</span>`; }
function editContact(c){
  openForm({ title: c ? 'Edit contact' : 'Add contact', value: c || { rel:'Professional', sector:'' },
    fields:[
      { k:'name', label:'Name', req:true }, { k:'title', label:'Job title' },
      { k:'org', label:'Company / university', list:[...new Set(S.contacts.map(x => x.org).concat(OPS().map(o => o.company)).filter(Boolean))] },
      { k:'course', label:'Course', hint:'if at a university', ph:'e.g. PPE, Year 2', list:[...new Set(allUni().map(u => u.course))] },
      { k:'sector', label:'Sector', type:'select', opts:['', ...SECTORS] },
      { k:'rel', label:'Relationship', type:'select', opts:REL }, { k:'met', label:'How you met', ph:'e.g. Insight day, Nov 2026' },
      { k:'email', label:'Email', type:'email' }, { k:'phone', label:'Phone', type:'tel' },
      { k:'linkedin', label:'LinkedIn URL', type:'url', full:true },
      { k:'last', label:'Last contacted', type:'date' }, { k:'followUp', label:'Follow up on', type:'date' },
      { k:'notes', label:'Notes', type:'textarea', ph:'What you talked about, advice they gave, anything to mention next time' },
    ],
    onSave: out => { c ? Object.assign(c, out) : S.contacts.push(Object.assign({ id:uid() }, out)); save(); route(); },
    onDelete: c ? () => { S.contacts = S.contacts.filter(x => x !== c); save(); route(); } : null });
}
function exportContacts(){
  const cols = ['name','title','org','course','sector','rel','met','email','phone','linkedin','last','followUp','notes'];
  const csv = [cols.join(',')].concat(S.contacts.map(c => cols.map(k => '"' + String(c[k] ?? '').replace(/"/g, '""') + '"').join(','))).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' })); a.download = 'contacts.csv'; a.click();
}

/* ============================================================
   UNIVERSITIES
   ============================================================ */
const AREAS = { ppe:['PPE','phil'], law:['Law','law'], econ:['Economics','econ'], pol:['Politics & social sciences','pol'], other:['Other','grey'] };
const UNI_ST = ['', 'Researching', 'Shortlisted', 'Applied', 'Offer', 'Firm', 'Insurance', 'Rejected'];
const unF = { area:'', short:false, q:'' };
const GRADE = { 'A*':6, 'A':5, 'B':4, 'C':3, 'D':2, 'E':1 };
function parseGrades(s){ return (String(s || '').toUpperCase().match(/A\*|[A-E]/g) || []).map(g => GRADE[g]).sort((a, b) => b - a); }
function gradeCheck(offer){
  const need = parseGrades(offer), have = parseGrades(S.grades);
  if(!need.length || !have.length) return '';
  if(have.length < need.length) return '<span class="chip warn">Add more grades</span>';
  const ok = need.every((g, i) => have[i] >= g);
  return ok ? '<span class="chip ok">Meets offer</span>' : '<span class="chip bad">Below offer</span>';
}
function allUni(){ return UNI_DATA.concat(S.uniCustom.map(u => Object.assign({ mine:true }, u))); }
const UNI_DOMAIN = { 'Oxford':'ox.ac.uk', 'Cambridge':'cam.ac.uk', 'LSE':'lse.ac.uk', 'Imperial':'imperial.ac.uk', 'Durham':'durham.ac.uk', 'UCL':'ucl.ac.uk',
  "King's College London":'kcl.ac.uk', 'Warwick':'warwick.ac.uk', 'St Andrews':'st-andrews.ac.uk', 'Edinburgh':'ed.ac.uk', 'Bristol':'bristol.ac.uk', 'Exeter':'exeter.ac.uk', 'York':'york.ac.uk', 'Manchester':'manchester.ac.uk', 'Bath':'bath.ac.uk', 'Nottingham':'nottingham.ac.uk' };
function uniDomain(name, link){
  if(UNI_DOMAIN[name]) return UNI_DOMAIN[name];
  try{ const h = new URL(safeUrl(link)).hostname.replace(/^www\./, ''); return /ucas\.com$/.test(h) ? '' : h; }catch(e){ return ''; }
}
/* the university's own site icon, with its initials as a fallback if the icon can't load */
function uniLogo(name, link, size = 22){
  const d = uniDomain(name, link), ini = esc(String(name).replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(w => w && !/^(of|the|and|college)$/i.test(w)).map(w => w[0]).join('').slice(0, 3) || '?');
  return `<span class="uni-logo" style="--s:${size}px" aria-hidden="true">${d ? `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64" alt="" loading="lazy" onerror="this.remove()">` : ''}<i>${ini}</i></span>`;
}
const aLevelCell = u => `<div class="alv"><span><b>Required</b> ${esc(u.required || '—')}</span>${u.suggested ? `<span class="${/^none stated$/i.test(u.suggested) ? 'faint' : ''}"><b>Suggested</b> ${esc(u.suggested)}</span>` : ''}</div>`;
function viewUni(v){
  const all = allUni();
  v.innerHTML = head({
    crumbs:crumbsFor('universities'), title:'Universities',
    sub:'Courses you’re considering, with the typical offer, required and suggested A-levels, and the admissions test for each.',
    stats:[[all.length, 'courses'], [new Set(all.map(u => u.uni)).size, 'universities'], [Object.values(S.uni).filter(u => u.status).length, 'on your list']],
    actions:`<button class="btn primary" id="uAdd">${I(IC.plus,14)} Add course</button>`
  }) + `
  <div class="caveat">${I(IC.warn,15)}<div>Figures are for <b>2027 entry</b>, checked on each university’s own page in September 2026. You’ll apply in autumn 2028, so re-check every course in the summer before you apply. Where a page didn’t state GCSE requirements, the card says so — that usually means none beyond the university’s general rules.</div></div>
  <div class="gradebox"><b>Your predicted / target grades</b><input id="uGr" value="${esc(S.grades)}" placeholder="e.g. A*A*A" aria-label="Your grades"><span class="muted">Each course shows whether they meet its typical offer.</span></div>
  <h2 class="sec">PPE at a glance</h2>
  <div class="tbl-wrap" style="margin-bottom:30px"><table class="tbl"><thead><tr><th>University</th><th>Course</th><th>Offer</th><th>A-levels</th><th>GCSE</th><th>Test</th><th></th></tr></thead><tbody>
  ${all.filter(u => u.area === 'ppe').map(u => `<tr><td class="co"><span class="uni-name">${uniLogo(u.uni, u.link)}${esc(u.uni)}</span></td><td>${esc(u.course)}</td><td class="num">${esc(u.offer)}</td><td>${aLevelCell(u)}</td><td class="prog">${esc(u.gcse)}</td><td class="prog">${esc(u.test)}</td><td>${gradeCheck(u.offer)}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="filterbar"><div class="row">${searchbar('uQ', 'Search universities, courses, tests…', unF.q)}</div>
    <div class="row">${Object.entries(AREAS).filter(([k]) => all.some(u => (u.area || 'other') === k)).map(([k, a]) => `<button class="pill" data-a="${k}" style="--c:var(--${a[1]})" aria-pressed="${unF.area === k}"><span class="dot"></span>${a[0]}</button>`).join('')}
    ${sw('uShort', 'My list only', unF.short)}</div></div>
  <div id="uBody"></div>
  <h2 class="sec" style="margin-top:34px">Admissions tests</h2>
  <div class="grid">${UNI_TESTS.map(t => `<div class="card"><h3>${t.k}</h3><p class="note">${t.who}</p><div class="when">${I(IC.cal,13)}${t.when}</div><div class="src"><a href="${t.link}" target="_blank" rel="noopener">Official page ↗</a></div></div>`).join('')}</div>`;
  $('#uAdd').onclick = () => editUni();
  $('#uGr').oninput = debounce(e => { S.grades = e.target.value; save(); const y = window.scrollY; viewUni(v); window.scrollTo(0, y); const g = $('#uGr'); g.focus(); g.setSelectionRange(g.value.length, g.value.length); }, 600);
  bindSearch('uQ', q => { unF.q = q; drawUni(); });
  $('#uShort').onchange = e => { unF.short = e.target.checked; drawUni(); };
  $$('[data-a]').forEach(b => b.onclick = () => { unF.area = unF.area === b.dataset.a ? '' : b.dataset.a; $$('[data-a]').forEach(x => x.setAttribute('aria-pressed', x.dataset.a === unF.area)); drawUni(); });
  drawUni();
}
function drawUni(){
  const b = $('#uBody');
  const list = allUni().filter(u => (!unF.area || (u.area || 'other') === unF.area) && (!unF.short || (S.uni[u.id] || {}).status)
    && (!unF.q || [u.uni, u.course, u.test, u.required, u.suggested, u.recommended, u.gcse].join(' ').toLowerCase().includes(unF.q)));
  const ORDER = { ppe:0, econ:1, law:2, pol:3 };
  list.sort((a, b) => (ORDER[a.area] ?? 9) - (ORDER[b.area] ?? 9));
  const unis = [...new Set(list.map(u => u.uni))];
  b.innerHTML = unis.length ? unis.map(n => `<section class="tl-month"><div class="tl-mhead"><h2 class="uni-name">${uniLogo(n, (list.find(u => u.uni === n) || {}).link, 26)}${esc(n)}</h2><span class="n">${list.filter(u => u.uni === n).length} course${list.filter(u => u.uni === n).length > 1 ? 's' : ''}</span></div>
    <div class="grid">${list.filter(u => u.uni === n).map(u => { const st = S.uni[u.id] || {}; const a = AREAS[u.area] || AREAS.other; return `
    <div class="card bar c-${a[1]}">
      <div class="meta"><span class="chip subj">${a[0]}</span>${u.ucas ? `<span class="chip soft">UCAS ${esc(u.ucas)}</span>` : ''}${u.years ? `<span class="chip soft">${esc(u.years)} years</span>` : ''}${gradeCheck(u.offer)}${u.mine ? '<span class="chip soft">Added by you</span>' : ''}</div>
      <h3>${esc(u.course)}</h3>
      <div class="offer">${esc(u.offer || '—')}</div>
      <dl class="kv">
        <dt>A-level required</dt><dd>${esc(u.required || '—')}</dd>
        ${u.suggested && !/^none stated$/i.test(u.suggested) ? `<dt>Suggested</dt><dd>${esc(u.suggested)}</dd>` : ''}
        <dt>GCSE</dt><dd>${esc(u.gcse || '—')}</dd>
        ${u.recommended ? `<dt>Notes</dt><dd>${esc(u.recommended)}</dd>` : ''}
        <dt>Test</dt><dd>${esc(u.test || '—')}</dd>
        ${u.other ? `<dt>Also</dt><dd>${esc(u.other)}</dd>` : ''}
        ${u.stats ? `<dt>Competition</dt><dd>${esc(u.stats)}</dd>` : ''}
      </dl>
      <div class="card-foot">
        <select class="sel" data-st="${esc(u.id)}">${UNI_ST.map(s => `<option value="${s}" ${s === (st.status || '') ? 'selected' : ''}>${s || 'Add to my list…'}</option>`).join('')}</select>
        <span class="src">${u.link ? `<a href="${esc(safeUrl(u.link))}" target="_blank" rel="noopener">Course page ↗</a>` : ''}${u.mine ? ` <a href="#" data-ued="${esc(u.id)}">Edit</a>` : ''}</span>
      </div>
    </div>`; }).join('')}</div></section>`).join('') : emptyBox('No courses match', 'Clear the filters, or add a course.');
  $$('[data-st]', b).forEach(s => s.onchange = () => { S.uni[s.dataset.st] = Object.assign({}, S.uni[s.dataset.st], { status:s.value }); save(); });
  $$('[data-ued]', b).forEach(a => a.onclick = e => { e.preventDefault(); editUni(S.uniCustom.find(u => u.id === a.dataset.ued)); });
}
function editUni(u){
  openForm({ title: u ? 'Edit course' : 'Add course', value: u || { area:'ppe', years:3 },
    fields:[
      { k:'uni', label:'University', req:true, list:[...new Set(allUni().map(x => x.uni))] }, { k:'course', label:'Course', req:true },
      { k:'area', label:'Area', type:'select', opts:Object.entries(AREAS).map(([k, a]) => [k, a[0]]) }, { k:'ucas', label:'UCAS code' },
      { k:'offer', label:'Typical offer', ph:'A*AA' }, { k:'years', label:'Length (years)', type:'number' },
      { k:'required', label:'Required subjects', full:true }, { k:'suggested', label:'Suggested subjects', full:true, ph:'e.g. History and/or English Lit' }, { k:'recommended', label:'Other subject notes', full:true },
      { k:'test', label:'Admissions test', full:true }, { k:'other', label:'Other notes', full:true },
      { k:'link', label:'Course page', type:'url', full:true },
    ],
    onSave: out => { u ? Object.assign(u, out) : S.uniCustom.push(Object.assign({ id:'u:' + uid() }, out)); save(); route(); },
    onDelete: u ? () => { S.uniCustom = S.uniCustom.filter(x => x !== u); save(); route(); } : null });
}

/* ============================================================
   CV BUILDER
   ============================================================ */
const CV_DEF = () => ({ template:'classic', name:'', email:'', phone:'', location:'', linkedin:'', profile:'',
  education:[{ title:'', org:'', dates:'', bullets:'' }], experience:[], projects:[], activities:[], achievements:[], skills:'', interests:'' });
const CV_SECTIONS = [
  { k:'education',    label:'Education',                   ph:{ title:'GCSEs (predicted)', org:'School name', bullets:'Maths 9, English Language 9, …' } },
  { k:'experience',   label:'Work experience',             ph:{ title:'Work experience', org:'Company', bullets:'One achievement per line' }, imp:'Import from Work experience logger' },
  { k:'projects',     label:'Projects',                    ph:{ title:'Deadline tracker', org:'Claude, Python', bullets:'One result per line' }, imp:'Import from Projects' },
  { k:'activities',   label:'Positions & activities',      ph:{ title:'Captain', org:'School hockey team', bullets:'One achievement per line' }, imp:'Import from Extracurriculars' },
  { k:'achievements', label:'Supercurriculars & awards',   ph:{ title:'John Locke Essay Prize — Commended', org:'', bullets:'' }, imp:'Import completed supercurriculars' },
];
function cv(){ if(!S.cv) S.cv = CV_DEF(); CV_SECTIONS.forEach(x => { if(!Array.isArray(S.cv[x.k])) S.cv[x.k] = []; }); return S.cv; }
function viewCV(v){
  const c = cv();
  const inp = (k, label, type='text', ph='') => `<label class="field">${label}<input class="inp" data-cv="${k}" type="${type}" value="${esc(c[k])}" placeholder="${esc(ph)}"></label>`;
  v.innerHTML = head({
    crumbs:crumbsFor('cv'), title:'CV builder',
    sub:'A clean one-page CV. Import entries from your logs, edit the wording, then save as PDF.',
    actions:`<div class="seg" id="cvT">${['classic','modern'].map(t => `<button data-t="${t}" aria-pressed="${c.template === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><button class="btn primary" id="cvPrint">${I(IC.print,14)} Save as PDF</button>`
  }) + cvFilePanel() + `<h2 class="sec" style="margin-top:26px">Builder</h2><div class="cv-layout">
    <div class="cv-editor">
      <details open><summary>Personal details</summary><div class="body">
        ${inp('name', 'Full name')}<div class="entry row2" style="border:0;padding:0;background:none">${inp('email', 'Email', 'email')}${inp('phone', 'Phone', 'tel')}</div>
        <div class="entry row2" style="border:0;padding:0;background:none">${inp('location', 'Location', 'text', 'London')}${inp('linkedin', 'LinkedIn', 'text', 'linkedin.com/in/…')}</div>
        <label class="field">Profile <span class="hint">2–3 lines on what you’re interested in and why</span><textarea class="inp" data-cv="profile" rows="3">${esc(c.profile)}</textarea></label>
      </div></details>
      ${CV_SECTIONS.map(s => `<details ${s.k === 'education' ? 'open' : ''}><summary>${s.label} <span class="faint" style="font-weight:500;font-size:12px;margin-left:auto;margin-right:10px">${c[s.k].length}</span></summary><div class="body" data-sec="${s.k}">
        ${c[s.k].map((e, i) => `<div class="entry" data-i="${i}">
          <div class="row2"><input class="inp" data-f="title" value="${esc(e.title)}" placeholder="${esc(s.ph.title)}"><input class="inp" data-f="dates" value="${esc(e.dates)}" placeholder="Dates"></div>
          <input class="inp" data-f="org" value="${esc(e.org)}" placeholder="${esc(s.ph.org || 'Organisation')}">
          <textarea class="inp" data-f="bullets" rows="2" placeholder="${esc(s.ph.bullets || 'Details — one bullet per line')}">${esc(e.bullets)}</textarea>
          <div class="entry-tools"><button class="btn sm ghost" data-mv="-1">↑</button><button class="btn sm ghost" data-mv="1">↓</button><button class="btn sm ghost danger" data-rm>Remove</button></div>
        </div>`).join('')}
        <div class="row"><button class="btn sm" data-addent>${I(IC.plus,12)} Add entry</button>${s.imp ? `<button class="btn sm ghost" data-imp="${s.k}">${s.imp}</button>` : ''}</div>
      </div></details>`).join('')}
      <details><summary>Skills & interests</summary><div class="body">
        <label class="field">Skills <span class="hint">comma-separated</span><textarea class="inp" data-cv="skills" rows="2" placeholder="Excel, Python (basic), public speaking, Spanish (GCSE)">${esc(c.skills)}</textarea></label>
        <label class="field">Interests<textarea class="inp" data-cv="interests" rows="2">${esc(c.interests)}</textarea></label>
      </div></details>
    </div>
    <div class="cv-preview-wrap"><div class="cv-sheet ${c.template}" id="cvSheet"></div><div class="cv-warn hidden" id="cvWarn">Your CV runs over one page — trim a few bullets.</div></div>
  </div>`;

  const redraw = () => { $('#cvSheet').innerHTML = cvHTML(c); requestAnimationFrame(() => { const s = $('#cvSheet'); const over = s.scrollHeight > s.clientHeight + 2; s.classList.toggle('overflow', over); $('#cvWarn').classList.toggle('hidden', !over); }); };
  const persist = debounce(save, 400);
  $$('[data-cv]', v).forEach(el => el.oninput = () => { c[el.dataset.cv] = el.value; persist(); redraw(); });
  $$('[data-sec]', v).forEach(sec => {
    const k = sec.dataset.sec;
    $$('.entry', sec).forEach(en => {
      const i = +en.dataset.i;
      $$('[data-f]', en).forEach(f => f.oninput = () => { c[k][i][f.dataset.f] = f.value; persist(); redraw(); });
      $('[data-rm]', en).onclick = () => { c[k].splice(i, 1); save(); keepOpen(k); };
      $$('[data-mv]', en).forEach(m => m.onclick = () => { const j = i + +m.dataset.mv; if(j < 0 || j >= c[k].length) return; [c[k][i], c[k][j]] = [c[k][j], c[k][i]]; save(); keepOpen(k); });
    });
    $('[data-addent]', sec).onclick = () => { c[k].push({ title:'', org:'', dates:'', bullets:'' }); save(); keepOpen(k); };
    const imp = $('[data-imp]', sec); if(imp) imp.onclick = () => { const n = cvImport(k); save(); keepOpen(k); toast(n ? `Imported ${n} entr${n > 1 ? 'ies' : 'y'}` : 'Nothing new to import'); };
  });
  $$('#cvT button').forEach(b => b.onclick = () => { c.template = b.dataset.t; save(); $$('#cvT button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#cvSheet').className = 'cv-sheet ' + c.template; redraw(); });
  bindCvFile(v);
  $('#cvPrint').onclick = () => { $('#print-root').innerHTML = `<div class="cv-sheet ${c.template}">${cvHTML(c)}</div>`; window.print(); };
  function keepOpen(k){ const y = window.scrollY; viewCV(v); $$('.cv-editor details').forEach(d => d.open = d.querySelector(`[data-sec="${k}"]`) ? true : d.open); window.scrollTo(0, y); }
  redraw();
}
function cvImport(k){
  const c = cv(), have = new Set(c[k].map(e => (e.title + '|' + e.org).toLowerCase()));
  let add = [];
  if(k === 'experience') add = S.work.filter(w => w.inCV).map(w => ({ title:w.role || w.type || 'Work experience', org:w.company, dates:w.start ? fmtRange(w.start).replace(' – present', '') : '', bullets:w.did || w.learned || '' }));
  if(k === 'projects') add = (S.projects || []).filter(p => p.inCV).map(p => ({ title:p.title, org:p.tools || '', dates:fmtRange(p.start, p.end), bullets:[p.built, p.outcome].filter(Boolean).join('\n') }));
  if(k === 'activities') add = S.extras.filter(e => e.inCV).map(e => ({ title:e.role || e.title, org:e.role ? e.title + (e.org ? ', ' + e.org : '') : e.org || '', dates:fmtRange(e.start, e.end), bullets:e.achieve || '' }));
  if(k === 'achievements') add = allSc().filter(i => scState(i.id).status === 'done').map(i => { const st = scState(i.id); return { title:strip(i.t) + (st.result ? ', ' + st.result : ''), org:'', dates:st.doneOn ? fmtRange(st.doneOn).replace(' – present', '') : '', bullets:st.learned || st.note || '' }; });
  add = add.filter(e => !have.has((e.title + '|' + e.org).toLowerCase()));
  c[k].push(...add); return add.length;
}
function cvHTML(c){
  const contact = [c.email, c.phone, c.location, c.linkedin].filter(Boolean).map(esc).join('  ·  ');
  const sec = (label, list) => list.filter(e => e.title || e.org).length ? `<h2>${label}</h2>` + list.filter(e => e.title || e.org).map(e => `<div class="it">
    <div class="it-h"><b>${esc(e.title)}</b><span>${esc(e.dates)}</span></div>${e.org ? `<div class="org">${esc(e.org)}</div>` : ''}
    ${(e.bullets || '').trim() ? `<ul>${e.bullets.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</div>`).join('') : '';
  return `<h1>${esc(c.name) || '<span style="color:#bbb">Your name</span>'}</h1><div class="contact">${contact || '<span style="color:#bbb">email · phone · location</span>'}</div>
    ${c.profile ? `<h2>Profile</h2><p>${esc(c.profile)}</p>` : ''}
    ${CV_SECTIONS.map(s => sec(s.label, c[s.k])).join('')}
    ${c.skills ? `<h2>Skills</h2><p>${esc(c.skills)}</p>` : ''}${c.interests ? `<h2>Interests</h2><p>${esc(c.interests)}</p>` : ''}`;
}


function loadScript(src){ return new Promise((ok, no) => { if(document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
async function pdfLib(){ await loadScript(PDFJS); window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; return window.pdfjsLib; }
const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for(let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function readCvFile(file){
  const buf = await file.arrayBuffer();
  const rec = { name:file.name, size:file.size, added:isoToday(), kind:'text', text:'', html:'' };
  if(/\.pdf$/i.test(file.name) || file.type === 'application/pdf'){
    rec.kind = 'pdf';
    const lib = await pdfLib(); const doc = await lib.getDocument({ data:new Uint8Array(buf.slice(0)) }).promise;
    const parts = [];
    for(let i = 1; i <= doc.numPages; i++){ const pg = await doc.getPage(i); const tc = await pg.getTextContent(); parts.push(tc.items.map(x => x.str + (x.hasEOL ? '\n' : ' ')).join('')); }
    rec.text = parts.join('\n\n');
    if(buf.byteLength < 2.5e6) rec.data = b64(buf);
  }else if(/\.docx$/i.test(file.name)){
    rec.kind = 'docx';
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
    rec.html = (await window.mammoth.convertToHtml({ arrayBuffer:buf })).value;
    rec.text = (await window.mammoth.extractRawText({ arrayBuffer:buf })).value;
  }else{
    rec.text = new TextDecoder().decode(buf);
  }
  return rec;
}
async function renderPdfPages(el){
  if(!S.cvFile || !S.cvFile.data) return;
  try{
    const lib = await pdfLib(); const doc = await lib.getDocument({ data:unb64(S.cvFile.data) }).promise;
    el.innerHTML = '';
    for(let i = 1; i <= doc.numPages; i++){
      const pg = await doc.getPage(i); const vp = pg.getViewport({ scale:1.6 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; c.className = 'pdf-page';
      el.appendChild(c); await pg.render({ canvasContext:c.getContext('2d'), viewport:vp }).promise;
    }
  }catch(e){ el.innerHTML = '<p class="faint">Couldn’t draw the PDF here — the full text is below.</p>'; }
}
function cvFilePanel(){
  const f = S.cvFile;
  if(!f) return `<div class="upload" id="cvDrop"><div><b>Upload your current CV</b><span>PDF, Word (.docx) or text. It’s shown here in full, next to the builder.</span></div>
    <label class="btn">${I(IC.up,14)} Choose file<input type="file" id="cvFileIn" accept=".pdf,.docx,.txt,.md,application/pdf" hidden></label></div>`;
  return `<div class="filecard">
    <div class="row" style="justify-content:space-between"><div><b>${esc(f.name)}</b><span class="muted" style="font-size:12.5px"> · ${(f.size / 1024).toFixed(0)} KB · uploaded ${esc(fmtD(f.added, true))}</span></div>
    <div class="row"><label class="btn sm">Replace<input type="file" id="cvFileIn" accept=".pdf,.docx,.txt,.md,application/pdf" hidden></label><button class="btn sm ghost danger" id="cvFileDel">Remove</button></div></div>
    <div class="subtabs" style="margin:12px 0 10px"><button data-fv="doc" aria-selected="true">Document</button><button data-fv="text" aria-selected="false">Full text</button></div>
    <div id="fvDoc" class="file-view">${f.kind === 'docx' ? `<div class="docx">${f.html}</div>` : f.kind === 'pdf' ? (f.data ? '<div id="pdfPages" class="faint">Loading…</div>' : '<p class="faint">Large PDF — only the text was kept. See Full text.</p>') : `<pre class="plain">${esc(f.text)}</pre>`}</div>
    <div id="fvText" class="file-view hidden"><pre class="plain">${esc(f.text || '(No text could be read from this file.)')}</pre></div>
  </div>`;
}
function bindCvFile(v){
  const inp = $('#cvFileIn', v);
  if(inp) inp.onchange = async e => {
    const file = e.target.files[0]; if(!file) return;
    toast('Reading ' + file.name + '…');
    try{ S.cvFile = await readCvFile(file); save(); viewCV(v); toast('CV uploaded'); }
    catch(err){ toast('Couldn’t read that file — try a PDF or .docx'); }
  };
  const del = $('#cvFileDel', v); if(del) del.onclick = () => { S.cvFile = null; save(); viewCV(v); };
  $$('[data-fv]', v).forEach(t => t.onclick = () => { $$('[data-fv]', v).forEach(x => x.setAttribute('aria-selected', x === t)); $('#fvDoc', v).classList.toggle('hidden', t.dataset.fv !== 'doc'); $('#fvText', v).classList.toggle('hidden', t.dataset.fv !== 'text'); });
  const pages = $('#pdfPages', v); if(pages) renderPdfPages(pages);
}

/* ============================================================
   ROUTER
   ============================================================ */
const VIEWS = { home:viewHome, about:viewAbout, universities:viewUni, lectures:viewLectures, supercurriculars:viewSuper, extracurriculars:viewExtras,
                openings:viewOpenings, work:viewWork, projects:viewProjects, contacts:viewContacts, cv:viewCV };
function route(){
  const kk = (location.hash || '#home').slice(1).split('?')[0];
  const page = VIEWS[kk] ? kk : 'home';
  closeMenus(); closeDrawer(); $('#mobileMenu').classList.remove('open');
  buildNav(page);
  document.title = (PAGES[page] ? PAGES[page].label + ' · ' : '') + 'Admissions Home';
  const v = $('#view');
  VIEWS[page](v);
}
let lastHash = location.hash;
window.addEventListener('hashchange', () => { route(); if(location.hash !== lastHash) window.scrollTo(0, 0); lastHash = location.hash; });

applyTheme();
route();
loadLive(true);
loadScLive(true);
loadLectures();
$('#backupBtn').onclick = () => openDrawer('Settings', `<h2>Back up your data</h2>
  <p class="note">Everything you enter lives in this browser only. Export a backup now and then, and import it on another device.</p>
  <div class="row"><button class="btn" id="exp">${I(IC.down,14)} Export backup</button>
  <label class="btn">${I(IC.up,14)} Import backup<input type="file" id="imp" accept="application/json" hidden></label></div>
`, b => {
  $('#exp', b).onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type:'application/json' })); a.download = 'admissions-home-backup-' + isoToday() + '.json'; a.click(); };
  $('#imp', b).onchange = e => { const f = e.target.files[0]; if(!f) return; f.text().then(t => { try{ S = Object.assign(DEFAULTS(), JSON.parse(t)); save(); applyTheme(); closeDrawer(); route(); toast('Backup imported'); }catch(err){ toast('That file isn’t a valid backup'); } }); };
});
})();
