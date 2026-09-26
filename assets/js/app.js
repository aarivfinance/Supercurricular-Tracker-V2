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
  sc:{}, scCustom:[], books:[], restorePoints:[], opMeta:{}, reviewDecisions:{}, extras:[], work:[], contacts:[], openings:[],
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
};

/* ---------------- navigation ---------------- */
const NAV = [
  { k:'academics', label:'Academics', items:[
    { k:'revision',     label:'Revision resources', desc:'Notes, past papers and admissions-test prep', ic:'book', c:'var(--econ)' },
    { k:'universities', label:'Universities',       desc:'Courses, offers and subject requirements',  ic:'cap',  c:'var(--law)' },
  ]},
  { k:'cocurricular', label:'Co-curriculars', items:[
    { k:'supercurriculars', label:'Supercurriculars', desc:'Competitions and programmes by date, with reading guides', ic:'trophy', c:'var(--accent)' },
    { k:'extracurriculars', label:'Extracurriculars', desc:'Sport, music, leadership, volunteering',                   ic:'run',    c:'var(--phil)' },
  ]},
  { k:'professional', label:'Professional', items:[
    { k:'openings', label:'Openings tracker', desc:'Spring weeks, insight days and internships',   ic:'radar', c:'var(--new)' },
    { k:'work',     label:'Work experience',  desc:'Placements you’ve done, and what you learned', ic:'brief', c:'var(--teal)' },
    { k:'contacts', label:'Contacts',         desc:'People you’ve met and when to follow up',      ic:'users', c:'var(--pol)' },
    { k:'cv',       label:'CV builder',       desc:'One-page CV that pulls from everything here',  ic:'doc',   c:'var(--multi)' },
  ]},
];
const PAGES = {};
NAV.forEach(g => g.items.forEach(it => PAGES[it.k] = Object.assign({ group:g }, it)));

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
    </div>`).join('');
  $('#mobileMenu').innerHTML = `<a class="dd-item" href="#home"><span class="dd-ico">${I(IC.star,17)}</span><span><b>Overview</b><span>Everything at a glance</span></span></a>`
    + NAV.map(g => `<h4>${g.label}</h4>` + g.items.map(it => ddItem(it, cur)).join('')).join('');
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
    <div class="crumb">${new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
    <h1>${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}. Welcome.</h1>
    <p class="sub">Pick a section from <b>Academics</b>, <b>Co-curriculars</b> or <b>Professional</b> above.</p>
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
  if(scF.subjects.size && !scF.subjects.has(it.s)) return false;
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

function drawSc(){
  const body = $('#scBody'); if(!body) return;
  if($('#scLive')) $('#scLive').innerHTML = scLiveLine();
  $('.filterbar').classList.toggle('hidden', scF.tab === 'finds' || scF.tab === 'books');
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
    S.scCustom.push({ id, t, s:$('#qS', qa).value, year:scF.year, date, when:'', note:'' });
    S.sc[id] = { status:'done', result:$('#qR', qa).value.trim(), doneOn:date };
    save(); toast('Logged: ' + t); viewSuper($('#view'));
  };
  $$('[data-gobooks]', body).forEach(a => a.onclick = () => { scF.tab = 'books'; viewSuper($('#view')); });

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
      <div class="row2"><select class="inp" id="qS" aria-label="Subject">${SUBJ.map(x => `<option value="${x.k}" ${x.k === 'multi' ? 'selected' : ''}>${x.label}</option>`).join('')}</select><button class="btn primary sm" style="justify-content:center">${I(IC.plus,13)} Log as done</button></div>
    </form>
    <div class="rec-stats"><div><b>${done.length}</b><span>done</span></div><div><b>${doing.length}</b><span>in progress</span></div><div><b>${plan.length}</b><span>planning</span></div><div><b>${books}</b><span>books read</span></div></div>
    <div class="rec-h">Completed</div>
    ${done.length ? done.map(i => li(i, [scState(i.id).result, scState(i.id).doneOn && fmtD(scState(i.id).doneOn, true)].filter(Boolean).join(' · ') || 'Add your result')).join('') : '<p class="faint rec-empty">Mark something as Done and it appears here with its result.</p>'}
    ${doing.length ? '<div class="rec-h">In progress</div>' + doing.map(i => li(i)).join('') : ''}
    ${plan.length ? '<div class="rec-h">Planning</div>' + plan.map(i => li(i)).join('') : ''}
    <button class="btn sm" data-gobooks style="margin-top:12px;width:100%;justify-content:center">${I(IC.book,13)} My books</button>
  </div></aside>`;
}

const BOOK_ST = ['Want to read', 'Reading', 'Finished'];
function drawBooks(body){
  const books = (S.books || []).slice().sort((a, b) => BOOK_ST.indexOf(b.status) - BOOK_ST.indexOf(a.status) || (b.finished || '').localeCompare(a.finished || ''));
  body.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:16px"><p class="muted" style="margin:0;max-width:60ch">Every book you read for your subjects, and what you took from it. The “how I’d use it” line is what you say at interview.</p>
    <button class="btn primary" id="bkAdd">${I(IC.plus,14)} Add book</button></div>`
    + (books.length ? BOOK_ST.slice().reverse().filter(st => books.some(b => b.status === st)).map(st => `<section class="tl-month"><div class="tl-mhead"><h2>${st}</h2><span class="n">${books.filter(b => b.status === st).length}</span></div>
      <div class="grid">${books.filter(b => b.status === st).map(b => `<div class="card c-${b.s || 'multi'}" data-bk="${b.id}" style="cursor:pointer">
        <div class="meta"><span class="chip subj">${SUBJ_L[b.s] || 'Other'}</span>${b.finished ? `<span class="chip soft">Finished ${fmtD(b.finished, true)}</span>` : ''}${b.rating ? `<span class="chip soft">${'★'.repeat(+b.rating)}</span>` : ''}</div>
        <h3>${esc(b.title)}</h3><div class="muted" style="font-size:13px;margin:-2px 0 8px">${esc(b.author || '')}</div>
        ${b.learned ? `<div class="lbl-sm">What I learned</div><p class="note">${esc(b.learned)}</p>` : ''}
        ${b.use ? `<div class="mynote">${esc(b.use)}</div>` : ''}</div>`).join('')}</div></section>`).join('')
      : emptyBox('No books yet', 'Add what you’re reading — or press “+ My books” on any title in the Reading guide.'));
  $('#bkAdd', body).onclick = () => editBook();
  $$('[data-bk]', body).forEach(c => c.onclick = () => editBook(S.books.find(b => b.id === c.dataset.bk)));
}
function editBook(bk, preset){
  openForm({ title: bk ? 'Edit book' : 'Add book', value: bk || Object.assign({ status:'Reading', s:'multi' }, preset),
    fields:[
      { k:'title', label:'Title', req:true }, { k:'author', label:'Author' },
      { k:'s', label:'Subject', type:'select', opts:SUBJ.map(x => [x.k, x.label]) }, { k:'status', label:'Status', type:'select', opts:BOOK_ST },
      { k:'finished', label:'Date finished', type:'date' }, { k:'rating', label:'Rating', type:'select', opts:[['', '—'], ['1','★'], ['2','★★'], ['3','★★★'], ['4','★★★★'], ['5','★★★★★']] },
      { k:'learned', label:'What I learned', type:'textarea', rows:4, ph:'The main argument, and what changed your mind' },
      { k:'use', label:'How I’d use it', type:'textarea', ph:'e.g. “I read X, which led me to Y, so I argued Z in the JLI essay.”' },
    ],
    onSave: out => { if(!S.books) S.books = []; if(out.status === 'Finished' && !out.finished) out.finished = isoToday(); bk ? Object.assign(bk, out) : S.books.push(Object.assign({ id:uid() }, out)); save(); scF.tab = 'books'; route(); },
    onDelete: bk ? () => { S.books = S.books.filter(x => x !== bk); save(); route(); } : null });
}

function scRow(it){
  const st = scState(it.id);
  const books = it.reading ? ROLE_ORDER.filter(k => it.reading[k]).length : 0;
  const statusChip = st.status ? `<span class="status-tag ${st.status === 'done' ? 's-offer' : 's-applied'}">${SC_STATUS.find(s => s[0] === st.status)[1]}</span>` : '';
  return `<div class="sc-row c-${it.s}" data-id="${esc(it.id)}" tabindex="0">
    <span class="bar"></span>
    <div>
      <h3>${it.custom ? esc(it.t) : it.t}</h3>
      <div class="sw">${I(IC.cal,13)}<span>${it.custom ? esc(it.date ? fmtD(it.date, true) + (it.when ? ' · ' + it.when : '') : it.when || 'No date') : it.when || ''}</span></div>
      <div class="chips"><span class="chip subj">${SUBJ_L[it.s] || 'Other'}</span>${it.tag ? `<span class="chip new">${it.tag}</span>` : ''}${it.custom ? '<span class="chip soft">Added by you</span>' : eligChip(it.elig)}${it.tbc ? '<span class="chip tbc">date TBC</span>' : ''}${scRecent(it.id) ? '<span class="badge-new">UPDATED</span>' : ''}${statusChip}</div>
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
    <div class="meta c-${it.s}"><span class="chip subj">${SUBJ_L[it.s] || 'Other'}</span>${it.tag ? `<span class="chip new">${it.tag}</span>` : ''}${it.custom ? '' : eligChip(it.elig)}${it.yr ? `<span class="chip soft">${it.custom ? esc(it.yr) : it.yr}</span>` : ''}${it.tbc ? '<span class="chip tbc">date TBC</span>' : ''}</div>
    <h2>${it.custom ? esc(it.t) : it.t}</h2>
    <div class="when">${I(IC.cal,13)}<span>${it.custom ? esc([it.date && fmtD(it.date, true), it.when].filter(Boolean).join(' · ')) : it.when}</span></div>
    ${it.note ? `<p class="note">${it.custom ? esc(it.note) : it.note}</p>` : ''}
    ${it.link ? `<a class="btn" href="${esc(safeUrl(it.link))}" target="_blank" rel="noopener">Official page ${I(IC.ext,13)}</a>` : (it.custom ? '' : '<span class="faint" style="font-size:12.5px">No official page found — verify directly</span>')}
    ${(() => { const L = SCL.items[it.id]; if(!L) return ''; return `<div class="drawer-sec"><div class="lbl">Live from the official page · checked ${esc(ago(L.checked.slice(0,10)).toLowerCase())}</div>
      ${L.changedOn ? `<p class="note"><span class="badge-new">UPDATED</span> Page changed on ${fmtD(L.changedOn, true)} — check the dates below against the ones above.</p>` : ''}
      ${L.dates && L.dates.length ? `<div class="list">${L.dates.map(d => `<div class="li"><span class="when-col">${esc(d.date)}</span><span class="grow"><small>…${esc(d.context)}…</small></span></div>`).join('')}</div>` : `<p class="faint" style="font-size:12.5px;margin:0">${L.ok ? 'No dates found on the page.' : 'The page couldn’t be reached on the last check.'}</p>`}</div>`; })()}
    ${r ? `<div class="drawer-sec"><div class="lbl">Read alongside this</div><div class="reading">${ROLE_ORDER.filter(k => r[k]).map(k => bookHTML(k, r[k])).join('')}${r.link ? `<div class="thelink"><b>The link →</b> ${r.link}</div>` : ''}</div></div>` : ''}
    <div class="drawer-sec"><div class="lbl">Your progress</div>
      <div class="row"><div class="status" id="dStatus">${SC_STATUS.map(s => `<button data-v="${s[0]}" aria-pressed="${(st.status || '') === s[0]}">${s[1]}</button>`).join('')}</div>
      <button class="btn sm ${st.saved ? 'accent' : ''}" id="dStar">${I(IC.star,13)} ${st.saved ? 'Saved' : 'Save'}</button></div>
    </div>
    <div class="drawer-sec"><div class="lbl">Result</div>
      <div class="row2"><input class="inp" id="dRes" value="${esc(st.result || '')}" placeholder="e.g. Highly commended, semi-finalist, certificate"><input class="inp" type="date" id="dDone" value="${esc(st.doneOn || '')}" aria-label="Date completed"></div>
    </div>
    <div class="drawer-sec"><div class="lbl">Your notes</div>
      <textarea class="inp" id="dNote" rows="4" placeholder="What you entered, what you argued, what you’d say about it in an interview…">${esc(st.note || '')}</textarea>
    </div>
    ${it.custom ? `<div class="drawer-sec"><button class="btn" id="dEdit">Edit this entry</button></div>` : ''}`;
  openDrawer(it.custom ? 'Your supercurricular' : (YEARS.find(y => y.k === it.year) || {}).label + ' · ' + esc(it.month), html, b => {
    $$('#dStatus button', b).forEach(btn => btn.onclick = () => { setSc(it.id, Object.assign({ status:btn.dataset.v }, btn.dataset.v === 'done' && !scState(it.id).doneOn ? { doneOn:isoToday() } : {})); if($('#dDone', b) && !$('#dDone', b).value && btn.dataset.v === 'done') $('#dDone', b).value = isoToday(); $$('#dStatus button', b).forEach(x => x.setAttribute('aria-pressed', x === btn)); drawSc(); });
    $('#dStar', b).onclick = () => { const s = !scState(it.id).saved; setSc(it.id, { saved:s }); $('#dStar', b).className = 'btn sm ' + (s ? 'accent' : ''); $('#dStar', b).innerHTML = I(IC.star,13) + (s ? ' Saved' : ' Save'); drawSc(); };
    $('#dNote', b).oninput = debounce(e => setSc(it.id, { note:e.target.value }), 300);
    $('#dRes', b).oninput = debounce(e => { setSc(it.id, { result:e.target.value }); drawSc(); }, 400);
    $('#dDone', b).onchange = e => { setSc(it.id, { doneOn:e.target.value }); drawSc(); };
    if(it.custom) $('#dEdit', b).onclick = () => { closeDrawer(); editScCustom(S.scCustom.find(c => c.id === it.id)); };
  });
}

function editScCustom(existing){
  openForm({
    title: existing ? 'Edit supercurricular' : 'Add a supercurricular',
    value: existing || { year:scF.year, s:'multi' },
    fields:[
      { k:'t', label:'Title', req:true, full:true, ph:'e.g. Bank of England Target 2.0 Challenge' },
      { k:'s', label:'Subject', type:'select', opts:SUBJ.map(s => [s.k, s.label]) },
      { k:'year', label:'School year', type:'select', opts:YEARS.map(y => [y.k, y.label]) },
      { k:'date', label:'Key date', type:'date', hint:'deadline or event day' },
      { k:'when', label:'Timing notes', ph:'e.g. Heats in March' },
      { k:'yr', label:'Eligibility', ph:'e.g. Ages 16–18' },
      { k:'link', label:'Link', type:'url', ph:'https://' },
      { k:'note', label:'Description', type:'textarea' },
      { k:'_status', label:'Status', type:'select', opts:SC_STATUS, def:existing ? (scState(existing.id).status || '') : '' },
      { k:'_result', label:'Result', ph:'e.g. Commended, finalist', def:existing ? (scState(existing.id).result || '') : '' },
    ],
    onSave: out => {
      const st = out._status, res = out._result; delete out._status; delete out._result;
      let id;
      if(existing){ Object.assign(existing, out); id = existing.id; }
      else { id = 'c:' + uid(); S.scCustom.push(Object.assign({ id }, out)); }
      S.sc[id] = Object.assign({}, S.sc[id], { status:st, result:res }, st === 'done' && !(S.sc[id] || {}).doneOn ? { doneOn:out.date || isoToday() } : {});
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
const exF = { cat:'', q:'' };

function viewExtras(v){
  const hrs = S.extras.filter(e => !e.end).reduce((a, e) => a + (Number(e.hours) || 0), 0);
  v.innerHTML = head({
    crumbs:crumbsFor('extracurriculars'), title:'Extracurriculars',
    sub:'Everything you do outside lessons. Log it as you go — dates, roles and achievements are much harder to reconstruct when you’re writing a CV or personal statement.',
    stats:[[S.extras.length, 'activities'], [S.extras.filter(e => !e.end).length, 'ongoing'], [hrs, 'hours / week']],
    actions:`<button class="btn primary" id="exAdd">${I(IC.plus,14)} Add activity</button>`
  }) + `<div class="filterbar"><div class="row">${searchbar('exQ', 'Search activities…', exF.q)}${selectBox('exCat', 'All categories', EX_CATS, exF.cat)}</div></div><div id="exBody"></div>`;
  $('#exAdd').onclick = () => editExtra();
  $('#exCat').onchange = e => { exF.cat = e.target.value; drawExtras(); };
  bindSearch('exQ', q => { exF.q = q; drawExtras(); });
  drawExtras();
}
function drawExtras(){
  const b = $('#exBody');
  const list = S.extras.filter(e => (!exF.cat || e.cat === exF.cat) && (!exF.q || [e.title, e.org, e.role, e.desc, e.achieve].join(' ').toLowerCase().includes(exF.q)));
  if(!S.extras.length){ b.innerHTML = emptyBox('No activities yet', 'Add a club, team, instrument, role or volunteering commitment.', `<button class="btn primary" data-add>${I(IC.plus,14)} Add your first activity</button>`); $('[data-add]', b).onclick = () => editExtra(); return; }
  const cats = EX_CATS.filter(c => list.some(e => e.cat === c));
  b.innerHTML = cats.length ? cats.map(c => `<section class="tl-month"><div class="tl-mhead"><h2>${c}</h2><span class="n">${list.filter(e => e.cat === c).length}</span></div>
    <div class="grid">${list.filter(e => e.cat === c).map(e => `
      <div class="card bar c-${EX_COL[c]}" data-id="${e.id}" style="cursor:pointer">
        <div class="meta"><span class="chip subj">${esc(c)}</span>${e.end ? `<span class="chip soft">Ended</span>` : '<span class="chip ok">Ongoing</span>'}${e.hours ? `<span class="chip soft">${esc(e.hours)} h/wk</span>` : ''}${e.inCV ? '<span class="chip soft">On CV</span>' : ''}</div>
        <h3>${esc(e.title)}</h3>
        <div class="when">${I(IC.cal,13)}${esc([e.role, e.org].filter(Boolean).join(' · '))}${(e.role || e.org) ? ' · ' : ''}${esc(fmtRange(e.start, e.end))}</div>
        ${e.desc ? `<p class="note">${esc(e.desc)}</p>` : ''}
        ${e.achieve ? `<div class="mynote">${esc(e.achieve)}</div>` : ''}
      </div>`).join('')}</div></section>`).join('') : emptyBox('No matches', 'Try a different search or category.');
  $$('[data-id]', b).forEach(c => c.onclick = () => editExtra(S.extras.find(e => e.id === c.dataset.id)));
}
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
      { k:'achieve', label:'Achievements & responsibilities', type:'textarea', hint:'one per line — these become CV bullet points' },
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
const TRACKS = [['uni','Internships & spring weeks'], ['preuni','Pre-uni'], ['opps','Opportunities']];
const TRACK_SUB = {
  uni:'Spring weeks, insight programmes, summer and off-cycle internships, placements and graduate schemes at UK firms.',
  preuni:'Work experience, insight days, apprenticeships, summer schools and programmes open to school students (Years 10–13).',
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
function trackOf(o){
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
const isMacro = o => MACRO_FIRM.test(o.company) || MACRO_ROLE.test(o.role + ' ' + (o.programme || '') + ' ' + (o.sub || ''));
const opF = { tab:'uni', q:'', region:'', sector:'', role:'', prog:'', yg:'', isNew:false, soon:false, openOnly:false, macro:false, sort:'posted', dir:1, page:0 };
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
  const title = { uni:'Live internship & spring week tracker', preuni:'Live pre-uni tracker', opps:'Opportunities' }[opF.tab] || 'Openings tracker';
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
      ${selectBox('opReg', 'All UK regions', REGIONS.filter(x => cur.some(o => o.region === x)), opF.region)}
      <span class="row" style="gap:14px">${sw('opMacro', 'Macro & markets', opF.macro)} ${sw('opNew', 'New (24h)', opF.isNew)} ${sw('opSoon', 'Deadline soon', opF.soon)} ${sw('opOpen', 'Open now', opF.openOnly)}</span>
    </div>
  </div>
  <div id="opStrip"></div>
  <div id="opBody"></div>`;
  $$('.subtabs button', v).forEach(b => b.onclick = () => { opF.tab = b.dataset.t; opF.page = 0; opF.sector = opF.role = opF.prog = opF.region = ''; viewOpenings(v); });
  $('#opAdd').onclick = () => editOpening();
  $('#opRefresh').onclick = () => { toast('Checking…'); loadLive(false); };
  bindSearch('opQ', q => { opF.q = q; opF.page = 0; drawOpenings(); });
  [['opReg','region'], ['opSec','sector'], ['opRole','role'], ['opProg','prog'], ['opYg','yg']].forEach(([id, k]) => $('#' + id).onchange = e => { opF[k] = e.target.value; opF.page = 0; drawOpenings(); });
  $('#opNew').onchange = e => { opF.isNew = e.target.checked; opF.page = 0; drawOpenings(); };
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
    if(opF.role && o.roleType !== opF.role) return false;
    if(opF.prog && o.programme !== opF.prog) return false;
    if(opF.yg && ageOf(o) !== opF.yg && o.yearGroup !== 'Any') return false;
    if(opF.isNew && !isNew24(o)) return false;
    if(opF.openOnly && (o.live === 'closed' || (daysUntil(o.deadline) ?? 0) < 0)) return false;
    if(opF.macro && !isMacro(o)) return false;
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
  const sub = [o.roleType, o.price].filter(Boolean).join(' · ');
  return `<div class="tr-row ${ghost ? 'ghost' : ''} ${o.live === 'closed' ? 'is-closed' : ''}" data-id="${esc(o.id || '')}" style="--sc:var(--${SEC_COL[o.sector] || 'grey'})">
    <div class="cell-main"><button class="co-link" data-co="${esc(o.company)}" title="See everything at ${esc(o.company)}">${esc(o.company)}</button><small><span class="sec-dot"></span>${esc(o.sector || '')}</small></div>
    <div class="cell-main"><div class="ttl"><b>${esc(o.role || o.programme)}</b>${isNew24(o) ? '<span class="badge-new">NEW</span>' : ''}${o.auto ? '<span class="badge-auto" title="The scanner found this firm by itself">New firm</span>' : ''}${o.status ? `<span class="status-tag ${statusCls(o.status)}">${esc(o.status)}</span>` : ''}</div><small>${esc(sub)}</small></div>
    <div class="cell-txt">${esc(o.programme || '')}</div>
    <div class="cell-main"><b style="font-weight:500">${esc(cityOf(o))}</b><small>${(() => { const ol = otherLocs(o); return ol.length ? `<span title="Same programme also in ${esc(ol.join(', '))}">also ${esc(ol.slice(0, 2).join(', '))}${ol.length > 2 ? ' +' + (ol.length - 2) : ''}</span>` : o.region && o.region !== cityOf(o) ? esc(o.region) : ''; })()}</small></div>
    <div class="cell-age">${ageCell(o)}</div>
    <div>${o.live === 'closed' ? '<span class="cd closed">Closed</span>' : o.deadline || o.opens || o.rolling ? countdown(o.deadline, o.opens, o.rolling) : o.live === 'open' ? '<span class="cd open">Open</span>' : o.live === 'soon' ? '<span class="cd future">Opening soon</span>' : '<span class="faint">·</span>'}</div>
    <div class="cell-main posted">${postedCell(o)}</div>
    <div class="m-extra">${esc([o.programme, ageOf(o) && 'Age ' + AGE_TEXT[ageOf(o)], o.location, o.deadline ? 'closes ' + fmtD(o.deadline) : ''].filter(Boolean).join(' · '))}</div>
    <div class="acts">
      <button class="act ${o.saved ? 'on' : ''}" data-star title="Star" aria-label="Star">${I(IC.star,17)}</button>
      ${o.link ? `<a class="apply" href="${esc(safeUrl(o.link))}" target="_blank" rel="noopener">Apply ${I(IC.ext,14)}</a>` : `<span class="apply" style="opacity:.5">Apply ${I(IC.ext,14)}</span>`}
    </div>
  </div>`;
}

/* hover card with the key application details */
let hoverEl;
function showHover(o, row){
  if(!hoverEl){ hoverEl = document.createElement('div'); hoverEl.className = 'hovercard'; hoverEl.setAttribute('role', 'tooltip'); document.body.appendChild(hoverEl); }
  const badges = [o.programme, ageOf(o) && AGE_TEXT[ageOf(o)], o.visa, o.price, o.live === 'open' ? 'Applications open' : o.live === 'closed' ? 'Closed' : o.live === 'soon' ? 'Opening soon' : ''].filter(Boolean);
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
    ${o.link ? `<div style="margin:4px 0 14px"><a class="apply" href="${esc(safeUrl(o.link))}" target="_blank" rel="noopener">Apply ${I(IC.ext,14)}</a>${o.info ? ` <a class="btn ghost sm" style="margin-left:6px" href="${esc(safeUrl(o.info))}" target="_blank" rel="noopener">Programme page ${I(IC.ext,12)}</a>` : ''}</div>` : ''}
    <dl class="kv">
      <dt>Deadline</dt><dd>${o.deadline ? fmtD(o.deadline, true) + ' ' + countdown(o.deadline, o.opens, o.rolling) : o.rolling ? 'Rolling' : 'Not published — apply early'}</dd>
      ${o.opens ? `<dt>Opens</dt><dd>${fmtD(o.opens, true)}</dd>` : ''}
      ${o.roleType ? `<dt>Role type</dt><dd>${esc(o.roleType)}</dd>` : ''}
      ${o.region ? `<dt>Region</dt><dd>${esc(o.region)}</dd>` : ''}
      ${o.price ? `<dt>Price</dt><dd>${esc(o.price)}</dd>` : ''}
      <dt>Posted</dt><dd>${o.postedAt ? fmtD(o.postedAt, true) + (o.postedApprox ? ' or earlier' : '') + ' by ' + esc(o.company) : 'Not stated by the firm'}</dd>
      ${o.detected ? `<dt>Detected</dt><dd>${new Date(o.detected).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}${o.source ? ' · via ' + esc(o.source) : ''}</dd>` : ''}
    </dl>
    ${notes.length ? `<div class="drawer-sec"><div class="lbl">Key details from the listing</div><ul class="notes">${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
    <div class="drawer-sec"><div class="lbl">Application status</div>
      <select class="dd-sel" id="dSt">${APP_STATUS.map(s => `<option value="${s}" ${s === (o.status || '') ? 'selected' : ''}>${s || 'Not tracking'}</option>`).join('')}</select></div>
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
function viewWork(v){
  v.innerHTML = head({
    crumbs:crumbsFor('work'), title:'Work experience',
    sub:'Placements, insight days and virtual programmes you’ve completed — and what you actually took from them. The reflection is what interviewers ask about.',
    stats:[[S.work.length, 'placements'], [S.work.reduce((a, w) => a + (Number(w.days) || 0), 0), 'days in total']],
    actions:`<button class="btn primary" id="wAdd">${I(IC.plus,14)} Add placement</button>`
  }) + `<div id="wBody"></div>`;
  $('#wAdd').onclick = () => editWork();
  const b = $('#wBody');
  if(!S.work.length){ b.innerHTML = emptyBox('No placements logged yet', 'Add anything from a week in an office to a Forage virtual programme.', `<button class="btn primary" data-add>${I(IC.plus,14)} Add your first placement</button>`); $('[data-add]', b).onclick = () => editWork(); return; }
  const list = [...S.work].sort((a, c) => (c.start || '') < (a.start || '') ? -1 : 1);
  b.innerHTML = `<div class="grid">${list.map(w => `<div class="card bar" data-id="${w.id}" style="--sc:var(--${SEC_COL[w.sector] || 'teal'});cursor:pointer">
    <div class="meta"><span class="chip subj">${esc(w.sector || 'Other')}</span>${w.type ? `<span class="chip soft">${esc(w.type)}</span>` : ''}${w.inCV ? '<span class="chip soft">On CV</span>' : ''}</div>
    <h3>${esc(w.role || w.type)} · ${esc(w.company)}</h3>
    <div class="when">${I(IC.cal,13)}${esc([fmtD(w.start, true), w.days ? w.days + ' days' : ''].filter(Boolean).join(' · '))}</div>
    ${w.did ? `<div class="lbl-sm">What I did</div><p class="note">${esc(w.did)}</p>` : ''}${w.learned ? `<div class="lbl-sm">What I learned</div><div class="mynote" style="margin-top:0">${esc(w.learned)}</div>` : ''}</div>`).join('')}</div>`;
  $$('[data-id]', b).forEach(c => c.onclick = () => editWork(S.work.find(w => w.id === c.dataset.id)));
}
function editWork(w){
  openForm({ title: w ? 'Edit placement' : 'Add placement', value: w || { sector:'Banking', type:'Work experience', inCV:true },
    fields:[
      { k:'company', label:'Company', req:true }, { k:'role', label:'Role / programme' },
      { k:'sector', label:'Sector', type:'select', opts:SECTORS }, { k:'type', label:'Type', type:'select', opts:PROGRAMMES },
      { k:'start', label:'Start date', type:'date' }, { k:'days', label:'Length (days)', type:'number' },
      { k:'contact', label:'Supervisor / contact' }, { k:'inCV', label:'Include on CV', type:'check' },
      { k:'did', label:'What you did', type:'textarea', hint:'one per line — these become CV bullet points' },
      { k:'learned', label:'What you learned / would say in an interview', type:'textarea' },
    ],
    onSave: out => { w ? Object.assign(w, out) : S.work.push(Object.assign({ id:uid() }, out)); save(); route(); },
    onDelete: w ? () => { S.work = S.work.filter(x => x !== w); save(); route(); } : null });
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
   REVISION RESOURCES
   ============================================================ */
const RES_TYPES = { notes:'Notes', papers:'Past papers', video:'Videos', practice:'Practice', flashcards:'Flashcards', tests:'Admissions tests', reading:'Reading' };
const RES_COL = { notes:'law', papers:'econ', video:'pol', practice:'multi', flashcards:'phil', tests:'teal', reading:'grey' };
const rsF = { subj:'', level:'', type:'', fav:false, q:'' };
function allRes(){ return RES_DATA.map(r => Object.assign({ id:'r:' + slug(r.t) }, r)).concat(S.resCustom.map(r => Object.assign({ mine:true }, r))); }
function viewRevision(v){
  const all = allRes();
  const subjects = [...new Set(all.map(r => r.subj))];
  v.innerHTML = head({
    crumbs:crumbsFor('revision'), title:'Revision resources',
    sub:'The sites worth your time for GCSE, A-level and admissions tests. Star the ones you use and add your own.',
    stats:[[all.length, 'resources'], [subjects.length, 'subjects'], [Object.values(S.resFav).filter(Boolean).length, 'starred']],
    actions:`<button class="btn primary" id="rAdd">${I(IC.plus,14)} Add resource</button>`
  }) + `<div class="filterbar"><div class="row">${searchbar('rQ', 'Search resources…', rsF.q)}
    <div class="seg" id="rLvl">${[['','All levels'],['gcse','GCSE'],['alevel','A-level']].map(l => `<button data-l="${l[0]}" aria-pressed="${rsF.level === l[0]}">${l[1]}</button>`).join('')}</div></div>
    <div class="row">${selectBox('rSubj', 'All subjects', subjects, rsF.subj)} ${selectBox('rType', 'All types', Object.entries(RES_TYPES), rsF.type)} ${sw('rFav', 'Starred only', rsF.fav)}</div></div>
    <div id="rBody"></div>`;
  $('#rAdd').onclick = () => editRes();
  bindSearch('rQ', q => { rsF.q = q; drawRes(); });
  $('#rSubj').onchange = e => { rsF.subj = e.target.value; drawRes(); };
  $('#rType').onchange = e => { rsF.type = e.target.value; drawRes(); };
  $('#rFav').onchange = e => { rsF.fav = e.target.checked; drawRes(); };
  $$('#rLvl button').forEach(b => b.onclick = () => { rsF.level = b.dataset.l; $$('#rLvl button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawRes(); });
  drawRes();
}
function drawRes(){
  const b = $('#rBody');
  const list = allRes().filter(r => (!rsF.subj || r.subj === rsF.subj) && (!rsF.type || r.type === rsF.type)
    && (!rsF.level || r.level === rsF.level || r.level === 'both') && (!rsF.fav || S.resFav[r.id])
    && (!rsF.q || [r.t, r.d, r.subj].join(' ').toLowerCase().includes(rsF.q)));
  const subjects = [...new Set(list.map(r => r.subj))];
  b.innerHTML = subjects.length ? subjects.map(s => `<section class="tl-month"><div class="tl-mhead"><h2>${esc(s)}</h2><span class="n">${list.filter(r => r.subj === s).length}</span></div>
    <div class="grid">${list.filter(r => r.subj === s).map(r => `<div class="card" style="--sc:var(--${RES_COL[r.type] || 'grey'})">
      <a class="card-link" href="${esc(safeUrl(r.u))}" target="_blank" rel="noopener" aria-label="${esc(r.t)}"></a>
      <div class="res"><span class="av">${esc(r.t[0])}</span><div style="flex:1;min-width:0">
        <h3>${esc(r.t)} <span class="faint">${I(IC.ext,12)}</span></h3>
        <div class="meta" style="margin:4px 0 0"><span class="chip subj">${RES_TYPES[r.type] || 'Other'}</span><span class="chip soft">${{ gcse:'GCSE', alevel:'A-level', both:'GCSE & A-level' }[r.level] || ''}</span>${r.mine ? '<span class="chip soft">Yours</span>' : ''}</div>
        ${r.d ? `<p>${esc(r.d)}</p>` : ''}</div>
        <div style="display:flex;flex-direction:column;gap:2px"><button class="act ${S.resFav[r.id] ? 'on' : ''}" data-fav="${esc(r.id)}" aria-label="Star">${I(IC.star,17)}</button>
        ${r.mine ? `<button class="act" data-edit="${esc(r.id)}" aria-label="Edit" style="font-size:12px">✎</button>` : ''}</div></div></div>`).join('')}</div></section>`).join('')
    : emptyBox('Nothing matches', 'Try clearing a filter.');
  $$('[data-fav]', b).forEach(x => x.onclick = e => { e.preventDefault(); S.resFav[x.dataset.fav] = !S.resFav[x.dataset.fav]; save(); drawRes(); });
  $$('[data-edit]', b).forEach(x => x.onclick = e => { e.preventDefault(); editRes(S.resCustom.find(r => r.id === x.dataset.edit)); });
}
function editRes(r){
  openForm({ title: r ? 'Edit resource' : 'Add resource', value: r || { level:'both', type:'notes' },
    fields:[
      { k:'t', label:'Name', req:true }, { k:'u', label:'Link', type:'url', req:true, ph:'https://' },
      { k:'subj', label:'Subject', req:true, list:[...new Set(allRes().map(x => x.subj))] },
      { k:'type', label:'Type', type:'select', opts:Object.entries(RES_TYPES) },
      { k:'level', label:'Level', type:'select', opts:[['both','GCSE & A-level'],['gcse','GCSE'],['alevel','A-level']] },
      { k:'d', label:'Why it’s useful', type:'textarea' },
    ],
    onSave: out => { r ? Object.assign(r, out) : S.resCustom.push(Object.assign({ id:'m:' + uid() }, out)); save(); route(); },
    onDelete: r ? () => { S.resCustom = S.resCustom.filter(x => x !== r); save(); route(); } : null });
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
function viewUni(v){
  const all = allUni();
  v.innerHTML = head({
    crumbs:crumbsFor('universities'), title:'Universities',
    sub:'Courses you’re considering, with the typical offer, required and recommended subjects, and the admissions test for each.',
    stats:[[all.length, 'courses'], [new Set(all.map(u => u.uni)).size, 'universities'], [Object.values(S.uni).filter(u => u.status).length, 'on your list']],
    actions:`<button class="btn primary" id="uAdd">${I(IC.plus,14)} Add course</button>`
  }) + `
  <div class="caveat">${I(IC.warn,15)}<div>Figures are for <b>2027 entry</b>, checked on each university’s own page in September 2026. You’ll apply in autumn 2028, so re-check every course in the summer before you apply. Where a page didn’t state GCSE requirements, the card says so — that usually means none beyond the university’s general rules.</div></div>
  <div class="gradebox"><b>Your predicted / target grades</b><input id="uGr" value="${esc(S.grades)}" placeholder="e.g. A*A*A" aria-label="Your grades"><span class="muted">Each course shows whether they meet its typical offer.</span></div>
  <h2 class="sec">PPE at a glance</h2>
  <div class="tbl-wrap" style="margin-bottom:30px"><table class="tbl"><thead><tr><th>University</th><th>Course</th><th>Offer</th><th>A-level required</th><th>GCSE</th><th>Test</th><th></th></tr></thead><tbody>
  ${all.filter(u => u.area === 'ppe').map(u => `<tr><td class="co">${esc(u.uni)}</td><td>${esc(u.course)}</td><td style="font-family:var(--mono)">${esc(u.offer)}</td><td>${esc(u.required)}</td><td class="prog">${esc(u.gcse)}</td><td class="prog">${esc(u.test)}</td><td>${gradeCheck(u.offer)}</td></tr>`).join('')}
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
    && (!unF.q || [u.uni, u.course, u.test, u.required, u.recommended, u.gcse].join(' ').toLowerCase().includes(unF.q)));
  const ORDER = { ppe:0, econ:1, law:2, pol:3 };
  list.sort((a, b) => (ORDER[a.area] ?? 9) - (ORDER[b.area] ?? 9));
  const unis = [...new Set(list.map(u => u.uni))];
  b.innerHTML = unis.length ? unis.map(n => `<section class="tl-month"><div class="tl-mhead"><h2>${esc(n)}</h2><span class="n">${list.filter(u => u.uni === n).length} course${list.filter(u => u.uni === n).length > 1 ? 's' : ''}</span></div>
    <div class="grid">${list.filter(u => u.uni === n).map(u => { const st = S.uni[u.id] || {}; const a = AREAS[u.area] || AREAS.other; return `
    <div class="card bar c-${a[1]}">
      <div class="meta"><span class="chip subj">${a[0]}</span>${u.ucas ? `<span class="chip soft">UCAS ${esc(u.ucas)}</span>` : ''}${u.years ? `<span class="chip soft">${esc(u.years)} years</span>` : ''}${gradeCheck(u.offer)}${u.mine ? '<span class="chip soft">Added by you</span>' : ''}</div>
      <h3>${esc(u.course)}</h3>
      <div class="offer">${esc(u.offer || '—')}</div>
      <dl class="kv">
        <dt>A-level required</dt><dd>${esc(u.required || '—')}</dd>
        <dt>GCSE</dt><dd>${esc(u.gcse || '—')}</dd>
        ${u.recommended ? `<dt>Recommended</dt><dd>${esc(u.recommended)}</dd>` : ''}
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
      { k:'required', label:'Required subjects', full:true }, { k:'recommended', label:'Recommended subjects', full:true },
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
  education:[{ title:'', org:'', dates:'', bullets:'' }], experience:[], activities:[], achievements:[], skills:'', interests:'' });
const CV_SECTIONS = [
  { k:'education',    label:'Education',                   ph:{ title:'GCSEs (predicted)', org:'School name', bullets:'Maths 9, English Language 9, …' } },
  { k:'experience',   label:'Work experience',             ph:{ title:'Work experience', org:'Company', bullets:'One achievement per line' }, imp:'Import from Work experience' },
  { k:'activities',   label:'Positions & activities',      ph:{ title:'Captain', org:'School hockey team', bullets:'One achievement per line' }, imp:'Import from Extracurriculars' },
  { k:'achievements', label:'Supercurriculars & awards',   ph:{ title:'John Locke Essay Prize — Commended', org:'', bullets:'' }, imp:'Import completed supercurriculars' },
];
function cv(){ if(!S.cv) S.cv = CV_DEF(); return S.cv; }
function viewCV(v){
  const c = cv();
  const inp = (k, label, type='text', ph='') => `<label class="field">${label}<input class="inp" data-cv="${k}" type="${type}" value="${esc(c[k])}" placeholder="${esc(ph)}"></label>`;
  v.innerHTML = head({
    crumbs:crumbsFor('cv'), title:'CV builder',
    sub:'A clean one-page CV. Pull entries in from your other pages, edit the wording, then save as PDF.',
    actions:`<button class="btn accent" id="cvAsk">✦ Edit with Claude</button><div class="seg" id="cvT">${['classic','modern'].map(t => `<button data-t="${t}" aria-pressed="${c.template === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><button class="btn primary" id="cvPrint">${I(IC.print,14)} Save as PDF</button>`
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
  $('#cvAsk').onclick = () => openClaude();
  $('#cvPrint').onclick = () => { $('#print-root').innerHTML = `<div class="cv-sheet ${c.template}">${cvHTML(c)}</div>`; window.print(); };
  function keepOpen(k){ const y = window.scrollY; viewCV(v); $$('.cv-editor details').forEach(d => d.open = d.querySelector(`[data-sec="${k}"]`) ? true : d.open); window.scrollTo(0, y); }
  redraw();
}
function cvImport(k){
  const c = cv(), have = new Set(c[k].map(e => (e.title + '|' + e.org).toLowerCase()));
  let add = [];
  if(k === 'experience') add = S.work.filter(w => w.inCV).map(w => ({ title:w.role || w.type || 'Work experience', org:w.company, dates:w.start ? fmtRange(w.start).replace(' – present', '') : '', bullets:w.did || '' }));
  if(k === 'activities') add = S.extras.filter(e => e.inCV).map(e => ({ title:e.role || e.title, org:e.role ? e.title + (e.org ? ', ' + e.org : '') : e.org || '', dates:fmtRange(e.start, e.end), bullets:e.achieve || '' }));
  if(k === 'achievements') add = allSc().filter(i => scState(i.id).status === 'done').map(i => ({ title:strip(i.t), org:'', dates:'', bullets:scState(i.id).note || '' }));
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


/* ============================================================
   ASK CLAUDE
   In the Claude preview: uses the viewer's own Claude (sample capability).
   On the GitHub site: uses an Anthropic API key you paste into Settings
   (stored only in this browser).
   ============================================================ */
let SAMPLE = null;
(async () => { try{ if(window.claude && claude.use) SAMPLE = await claude.use('sample'); }catch(e){} })();
const claudeReady = () => !!SAMPLE || !!(S.settings.apiKey || '').trim();

async function askClaude(turns, { onText, signal } = {}){
  if(SAMPLE){
    const r = await SAMPLE(turns, { onText, signal, cache:false });
    return r.text;
  }
  const key = (S.settings.apiKey || '').trim();
  if(!key) throw { code:'no_key', message:'Add an API key in Settings to use Claude on this site.' };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', signal,
    headers:{ 'content-type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
    body:JSON.stringify({ model:S.settings.model || 'claude-sonnet-5', max_tokens:4096, messages:turns })
  });
  const d = await res.json().catch(() => ({}));
  if(!res.ok) throw { code:'api', message:(d.error && d.error.message) || ('Request failed (' + res.status + ')') };
  const text = (d.content || []).map(c => c.text || '').join('');
  if(onText) onText({ text });
  return text;
}
function parseJSON(t){
  try{ return JSON.parse(t); }catch(e){}
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if(f){ try{ return JSON.parse(f[1]); }catch(e){} }
  const a = t.indexOf('{'), b = t.lastIndexOf('}'); if(a >= 0 && b > a){ try{ return JSON.parse(t.slice(a, b + 1)); }catch(e){} }
  return null;
}
const errCopy = e => ({ not_granted:'Claude wasn’t allowed for this page.', rate_limited:'Too many requests — try again in a minute.', refused:'Claude declined that request — try rewording it.',
  no_key:'Add your Anthropic API key in Settings (the database icon, top right) to use Claude on the GitHub site.', session_expired:'Sign in to Claude again.' }[e && e.code] || (e && e.message) || 'Something went wrong — try again.');

/* page context sent with each question */
function pageContext(page){
  const cut = (x, n = 9000) => { const t = JSON.stringify(x); return t.length > n ? t.slice(0, n) + '…' : t; };
  switch(page){
    case 'cv': return 'CV builder data (JSON): ' + cut(cv(), 14000) + (S.cvFile && S.cvFile.text ? '\n\nText of the CV file the student uploaded:\n' + S.cvFile.text.slice(0, 12000) : '');
    case 'supercurriculars': return 'Supercurriculars the student has progress on: ' + cut(allSc().filter(i => scState(i.id).status || scState(i.id).saved).map(i => ({ id:i.id, t:strip(i.t), subject:SUBJ_L[i.s], when:strip(i.when), ...scState(i.id) }))) + '\nBooks: ' + cut(S.books);
    case 'extracurriculars': return 'Extracurriculars: ' + cut(S.extras);
    case 'work': return 'Work experience log: ' + cut(S.work);
    case 'contacts': return 'Contacts (names, orgs, notes): ' + cut(S.contacts.map(c => ({ id:c.id, name:c.name, org:c.org, course:c.course, email:c.email, title:c.title, met:c.met, notes:c.notes, followUp:c.followUp }))); 
    case 'openings': return 'Openings being tracked: ' + cut(OPS().filter(o => !o.remote).map(o => ({ id:o.id, company:o.company, role:o.role, programme:o.programme, deadline:o.deadline, status:o.status })));
    case 'universities': return 'Courses on the page: ' + cut(allUni().map(u => ({ id:u.id, uni:u.uni, course:u.course, offer:u.offer, required:u.required, gcse:u.gcse, test:u.test, myStatus:(S.uni[u.id] || {}).status }))) + '\nStudent’s predicted grades: ' + (S.grades || 'not entered');
    case 'revision': return 'Revision resources listed: ' + cut(allRes().map(r => r.t + ' (' + r.subj + ')')) + '\nThe student’s own added resources: ' + cut(S.resCustom);
    default: return 'Summary: ' + S.extras.length + ' extracurriculars, ' + S.work.length + ' placements, ' + S.contacts.length + ' contacts, ' + (S.books || []).length + ' books.';
  }
}

/* ---------- Claude can edit your entries — only when asked, only after you click Yes ---------- */
const EDITABLE = {
  extras:'Extracurriculars {title, cat, role, org, start, end (YYYY-MM-DD), hours, inCV, desc, achieve}',
  work:'Work experience {company, role, sector, type, start, days, contact, inCV, did, learned}',
  contacts:'Contacts {name, title, org (company or university), course (if at a university), sector, rel, met, email, phone, linkedin, last, followUp, notes}',
  books:'My books {title, author, s (phil|pol|econ|law|multi), status (Want to read|Reading|Finished), finished, rating (1-5), learned, use}',
  scCustom:'Own supercurriculars {t, s, year (y11|y1213), date, when, yr, link, note}',
  sc:'Progress on a listed supercurricular — update only, by its id {status (planning|doing|done), result, doneOn, note, saved}',
  openings:'Own openings {company, sector, role, roleType, programme, ageGroup (14-16|16-18|18+|uni1|uni2|grad), location, region, opens, deadline, rolling, link, status, notes}',
  resCustom:'Own revision resources {t, u, subj, type (notes|papers|video|practice|flashcards|tests|reading), level (gcse|alevel|both), d}',
  uniCustom:'Own university courses {uni, course, area (ppe|law|econ|pol), ucas, offer, years, required, recommended, gcse, test, other, link}',
  uni:'Shortlist status of a listed course — update only, by its id {status}',
  grades:'Predicted grades — replace, data is a string e.g. "A*A*A"',
  cv:'The CV — replace, data is the complete CV object in the same shape as the CV builder data',
};
const EDIT_RULES = 'Always reply with ONLY one JSON object: {"reply": "your message to the student", "changes": [...]}.\n'
  + 'Put changes in "changes" ONLY when the student has explicitly asked you to add, change or delete something in their planner in their latest message. For questions, advice or drafts, "changes" must be []. The student will be shown your changes and must click Yes before anything happens, so say in "reply" what you are proposing.\n'
  + 'Each change: {"collection": one of ' + Object.keys(EDITABLE).join(', ') + ', "action": "add" | "update" | "delete" | "replace", "id": "existing id (update/delete)", "data": {fields}, "label": "short human description"}.\n'
  + 'Collections:\n' + Object.entries(EDITABLE).map(([k, v]) => '- ' + k + ': ' + v).join('\n') + '\n'
  + 'Only use ids that appear in the page data. Never invent grades, results, jobs or achievements — use only what the student tells you, and ask if something is missing. You cannot change the website’s design or code, only the student’s entries; say so if asked.';
const ARR = ['extras','work','contacts','books','scCustom','openings','resCustom','uniCustom'];
const PREFIX = { scCustom:'c:', resCustom:'m:', uniCustom:'u:' };
const COL_NAME = { extras:'Extracurriculars', work:'Work experience', contacts:'Contacts', books:'My books', scCustom:'Supercurriculars', sc:'Supercurricular progress', openings:'Openings', resCustom:'Revision resources', uniCustom:'Universities', uni:'University shortlist', grades:'Predicted grades', cv:'CV' };
function validChange(c){
  if(!c || !EDITABLE[c.collection] || !['add','update','delete','replace'].includes(c.action)) return false;
  if(['sc','uni'].includes(c.collection)) return c.action === 'update' && !!c.id;
  if(['grades','cv'].includes(c.collection)) return c.action === 'replace' && c.data != null;
  if(c.action === 'add') return c.data && typeof c.data === 'object';
  if(c.action === 'update' || c.action === 'delete') return !!c.id && (S[c.collection] || []).some(x => x.id === c.id);
  return false;
}
function describeChange(c){
  const verb = { add:'Add to', update:'Update in', delete:'Delete from', replace:'Replace' }[c.action];
  const item = c.label || (c.data && (c.data.name || c.data.title || c.data.t || c.data.company || c.data.course)) || ((S[c.collection] || []).find(x => x.id === c.id) || {}).name || c.id || '';
  return `${verb} ${COL_NAME[c.collection]}${item ? ': ' + item : ''}`;
}
function applyChanges(changes){
  let n = 0;
  changes.forEach(c => {
    const d = c.data || {};
    if(c.collection === 'cv'){ S.cv = Object.assign(CV_DEF(), d); n++; return; }
    if(c.collection === 'grades'){ S.grades = String(d); n++; return; }
    if(c.collection === 'sc' || c.collection === 'uni'){ S[c.collection][c.id] = Object.assign({}, S[c.collection][c.id], d); n++; return; }
    if(!S[c.collection]) S[c.collection] = [];
    if(c.action === 'add'){ S[c.collection].push(Object.assign({}, d, { id:(PREFIX[c.collection] || '') + uid() })); n++; }
    if(c.action === 'update'){ const x = S[c.collection].find(y => y.id === c.id); if(x){ Object.assign(x, d, { id:x.id }); n++; } }
    if(c.action === 'delete'){ const before = S[c.collection].length; S[c.collection] = S[c.collection].filter(y => y.id !== c.id); if(S[c.collection].length < before) n++; }
  });
  return n;
}
function confirmCard(changes, page){
  const box = document.createElement('div'); box.className = 'confirm';
  box.innerHTML = `<b>Claude wants to make ${changes.length} change${changes.length > 1 ? 's' : ''}:</b><ul>${changes.map(c => `<li>${esc(describeChange(c))}</li>`).join('')}</ul>
    <div class="row"><button class="btn primary sm" data-yes>Yes, make ${changes.length > 1 ? 'these changes' : 'this change'}</button><button class="btn sm" data-no>No</button></div>`;
  $('[data-no]', box).onclick = () => { box.innerHTML = '<span class="faint">Declined — nothing was changed.</span>'; };
  $('[data-yes]', box).onclick = () => {
    const rp = makeRestorePoint(changes.map(describeChange).join('; '));
    const n = applyChanges(changes); save();
    const y = window.scrollY; VIEWS[page]($('#view')); window.scrollTo(0, y);
    box.innerHTML = `<span>✓ ${n} change${n === 1 ? '' : 's'} made. A restore point was saved.</span> `;
    const u = document.createElement('button'); u.className = 'btn sm'; u.textContent = 'Undo (restore)'; u.onclick = () => restoreTo(rp.id); box.appendChild(u);
    toast('Changes applied');
  };
  return box;
}

/* restore points: a snapshot taken before every Claude edit, kept for 24 hours */
const DAY = 864e5;
function snapshot(){ const c = Object.assign({}, S); delete c.restorePoints; delete c.cvFile; return JSON.parse(JSON.stringify(c)); }
function pruneRestorePoints(){ S.restorePoints = (S.restorePoints || []).filter(r => Date.now() - r.at < DAY); }
function makeRestorePoint(label){
  pruneRestorePoints();
  const rp = { id:uid(), at:Date.now(), label, data:snapshot() };
  S.restorePoints.unshift(rp); S.restorePoints = S.restorePoints.slice(0, 15);
  return rp;
}
function restoreTo(id){
  pruneRestorePoints();
  const rp = S.restorePoints.find(r => r.id === id);
  if(!rp){ toast('That restore point has expired'); return; }
  const keep = { restorePoints:S.restorePoints, cvFile:S.cvFile, settings:S.settings };
  S = Object.assign(DEFAULTS(), JSON.parse(JSON.stringify(rp.data)), keep);
  save(); closeDrawer(); route(); toast('Restored to ' + new Date(rp.at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }));
}
function restoreListHTML(){
  pruneRestorePoints();
  const list = S.restorePoints;
  return list.length ? `<div class="list">${list.map(r => { const left = Math.max(0, Math.round((DAY - (Date.now() - r.at)) / 36e5)); return `<div class="li"><span class="when-col">${new Date(r.at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}</span><span class="grow">Before: ${esc(r.label)}<small>Expires in ${left}h</small></span><button class="btn sm" data-restore="${r.id}">Restore</button></div>`; }).join('')}</div>`
    : '<p class="faint" style="font-size:12.5px">No restore points. One is saved automatically before every change Claude makes, and kept for 24 hours.</p>';
}
function bindRestore(root){ $$('[data-restore]', root).forEach(b => b.onclick = () => { b.textContent = 'Click again to confirm'; b.onclick = () => restoreTo(b.dataset.restore); }); }

const CHAT = { turns:[], busy:false, ctl:null };
function currentPage(){ const k = (location.hash || '#home').slice(1); return VIEWS[k] ? k : 'home'; }

function openClaude(prefill){
  const page = currentPage(), isCV = page === 'cv';
  const label = PAGES[page] ? PAGES[page].label : 'Overview';
  openDrawer('Ask Claude · ' + esc(label), `
    <div class="chat" id="chatLog">${CHAT.turns.length ? '' : `<div class="chat-hello"><b>Hi — I can see your ${esc(label.toLowerCase())} page.</b>${isCV
      ? 'Ask me to edit your CV — e.g. “Tighten my profile to two lines” or “Import my uploaded CV”.'
      : 'Ask about anything here, or tell me to change your entries — e.g. “Add Jane Doe from LSE to my contacts”, “Mark the JLI essay as done, result: commended”.'} I’ll only change things when you ask, and you’ll always click <b>Yes</b> first. A restore point is saved before every change and kept for 24 hours.</div>`}</div>
    ${claudeReady() ? '' : `<p class="faint" style="font-size:12px;margin:8px 0 0">Works with your Claude Pro account: after you send, copy the prompt into Claude and paste its reply back here.</p>`}
    <form class="chat-box" id="chatForm"><textarea class="inp" id="chatIn" rows="2" placeholder="${isCV ? 'e.g. Rewrite my work experience bullets to sound more concrete' : 'Ask Claude…'}">${esc(prefill || '')}</textarea>
      <div class="row" style="justify-content:space-between"><span class="row"><button type="button" class="btn sm ghost" id="chatClear">New chat</button><button type="button" class="btn sm ghost" id="chatRP">Restore points (${(pruneRestorePoints(), S.restorePoints.length)})</button></span>
      <div class="row"><button type="button" class="btn sm hidden" id="chatStop">Stop</button><button class="btn primary sm" id="chatSend">Send</button></div></div></form>`, b => {
    const log = $('#chatLog', b);
    const bubble = (role, text, extra) => { const d = document.createElement('div'); d.className = 'msg ' + role; d.textContent = text; if(extra) d.appendChild(extra); log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
    CHAT.turns.forEach(t => bubble(t.role === 'user' ? 'me' : 'ai', t.shown || t.content));
    $('#chatClear', b).onclick = () => { CHAT.turns = []; openClaude(); };
    $('#chatRP', b).onclick = () => { const d = document.createElement('div'); d.className = 'msg ai'; d.style.maxWidth = '100%'; d.innerHTML = '<b>Restore points</b> — go back to how things were before a change (kept 24 hours).' + restoreListHTML(); log.appendChild(d); bindRestore(d); log.scrollTop = log.scrollHeight; };
    $('#chatStop', b).onclick = () => CHAT.ctl && CHAT.ctl.abort();
    $('#chatIn', b).onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); $('#chatForm', b).requestSubmit(); } };
    $('#chatForm', b).onsubmit = async e => {
      e.preventDefault();
      const q = $('#chatIn', b).value.trim(); if(!q || CHAT.busy) return;
      $('#chatIn', b).value = '';
      bubble('me', q);
      CHAT.turns.push({ role:'user', content:q, shown:q });
      const rules = 'You are a helpful, encouraging assistant inside “Admissions Home”, a UK Year 11 student’s application planner (target: PPE at Oxford, LSE, UCL, Warwick etc.; also interested in law, economics, finance). Be concise, specific and practical. British English.\n\nCurrent page: ' + label + '\n' + pageContext(page) + '\n\n' + EDIT_RULES;
      const turns = [{ role:'user', content:rules }, { role:'assistant', content:'Understood. I will reply with the JSON object only.' }].concat(CHAT.turns.slice(-10).map(t => ({ role:t.role, content:t.content })));
      const handleReply = (text, out) => {
        const j = parseJSON(text);
        const shown = (j && j.reply) || text;
        out.textContent = shown;
        const changes = j && Array.isArray(j.changes) ? j.changes.filter(validChange) : [];
        if(changes.length) out.appendChild(confirmCard(changes, page));
        CHAT.turns.push({ role:'assistant', content:text, shown });
        log.scrollTop = log.scrollHeight;
      };

      /* No built-in Claude here (the GitHub site with a Pro plan): hand the prompt to claude.ai and paste the answer back */
      if(!claudeReady()){
        const prompt = rules + '\n\n--- Conversation so far ---\n' + CHAT.turns.slice(-10).map(t => (t.role === 'user' ? 'Student: ' : 'You: ') + t.content).join('\n\n')
          + '\n\nReply to the student’s latest message. Output ONLY the JSON object described above, in one code block, nothing else.';
        const out = bubble('ai', '');
        out.classList.add('handoff');
        out.innerHTML = `<b>Ask Claude with your Pro account</b>
          <ol><li><button class="btn primary sm" data-copy>Copy prompt &amp; open Claude</button> <span class="faint" data-copied></span></li>
          <li>In the new Claude tab, paste (<kbd>Ctrl+V</kbd>) and send.</li>
          <li>Copy Claude’s whole reply (the copy icon under it), then paste it here:</li></ol>
          <textarea class="inp" rows="3" placeholder="Paste Claude’s reply here" data-paste></textarea>
          <div class="row" style="margin-top:6px"><button class="btn sm" data-use>Use this reply</button></div>
          <details style="margin-top:8px"><summary class="faint" style="cursor:pointer;font-size:12px">Copy didn’t work? Show the prompt</summary><textarea class="inp" rows="5" readonly data-raw></textarea></details>`;
        $('[data-raw]', out).value = prompt;
        $('[data-copy]', out).onclick = () => {
          const done = ok => { $('[data-copied]', out).textContent = ok ? 'Copied ✓' : 'Copy the prompt from “Show the prompt” below'; };
          (navigator.clipboard ? navigator.clipboard.writeText(prompt) : Promise.reject()).then(() => done(true), () => { const r = $('[data-raw]', out); r.closest('details').open = true; r.select(); done(false); });
          window.open('https://claude.ai/new', '_blank', 'noopener');
        };
        $('[data-use]', out).onclick = () => {
          const t = $('[data-paste]', out).value.trim(); if(!t){ toast('Paste Claude’s reply first'); return; }
          const res = bubble('ai', ''); handleReply(t, res);
          if(!parseJSON(t)) res.appendChild(Object.assign(document.createElement('div'), { className:'faint', style:'font-size:12px;margin-top:6px', textContent:'(That reply wasn’t in the expected format, so no changes can be applied — shown as text.)' }));
          out.remove();
        };
        return;
      }

      const out = bubble('ai', 'Thinking…'); out.classList.add('pending');
      CHAT.busy = true; CHAT.ctl = new AbortController(); $('#chatStop', b).classList.remove('hidden'); $('#chatSend', b).disabled = true;
      try{
        const text = await askClaude(turns, { signal:CHAT.ctl.signal });
        out.classList.remove('pending');
        handleReply(text, out);
      }catch(err){
        out.classList.remove('pending');
        if(err && err.code === 'cancelled'){ out.textContent = (err.text || '') + ' [stopped]'; }
        else { out.textContent = errCopy(err); out.classList.add('err'); CHAT.turns.pop(); }
      }finally{
        CHAT.busy = false; $('#chatStop', b).classList.add('hidden'); $('#chatSend', b).disabled = false;
      }
    };
    if(prefill) $('#chatIn', b).focus();
  });
}

/* ---------- CV file upload: PDF (pdf.js), Word (mammoth), or text ---------- */
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
  if(!f) return `<div class="upload" id="cvDrop"><div><b>Upload your current CV</b><span>PDF, Word (.docx) or text. It’s shown here in full, and Claude can read it to fill in the builder.</span></div>
    <label class="btn">${I(IC.up,14)} Choose file<input type="file" id="cvFileIn" accept=".pdf,.docx,.txt,.md,application/pdf" hidden></label></div>`;
  return `<div class="filecard">
    <div class="row" style="justify-content:space-between"><div><b>${esc(f.name)}</b><span class="muted" style="font-size:12.5px"> · ${(f.size / 1024).toFixed(0)} KB · uploaded ${esc(fmtD(f.added, true))}</span></div>
    <div class="row"><button class="btn sm accent" id="cvImportAI">✦ Fill builder from this with Claude</button><label class="btn sm">Replace<input type="file" id="cvFileIn" accept=".pdf,.docx,.txt,.md,application/pdf" hidden></label><button class="btn sm ghost danger" id="cvFileDel">Remove</button></div></div>
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
  const imp = $('#cvImportAI', v); if(imp) imp.onclick = () => { openClaude('Import my uploaded CV into the builder — fill every section from the file, keeping my wording.'); };
}

/* ============================================================
   ROUTER
   ============================================================ */
const VIEWS = { home:viewHome, supercurriculars:viewSuper, extracurriculars:viewExtras, openings:viewOpenings, work:viewWork,
                contacts:viewContacts, revision:viewRevision, universities:viewUni, cv:viewCV };
function route(){
  const k = (location.hash || '#home').slice(1).split('?')[0];
  const page = VIEWS[k] ? k : 'home';
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
$('#askFab').onclick = () => openClaude();
$('#backupBtn').onclick = () => openDrawer('Settings', `<h2>Back up your data</h2>
  <p class="note">Everything you enter lives in this browser only. Export a backup now and then, and import it on another device.</p>
  <div class="row"><button class="btn" id="exp">${I(IC.down,14)} Export backup</button>
  <label class="btn">${I(IC.up,14)} Import backup<input type="file" id="imp" accept="application/json" hidden></label></div>
  <h2 style="margin-top:30px">Restore points</h2>
  <p class="note">Saved automatically before every change Claude makes. Each one disappears after 24 hours.</p>
  ${restoreListHTML()}
  <h2 style="margin-top:30px">Claude on your site</h2>
  <p class="note">You don’t need anything here: Ask Claude works with your Claude Pro account by copy and paste. Optional, for developers only: an Anthropic API key (18+, billed separately) makes answers appear directly. It’s stored only in this browser.</p>
  <label class="field">API key<input class="inp" id="apiKey" type="password" value="${esc(S.settings.apiKey || '')}" placeholder="sk-ant-…" autocomplete="off"></label>
  <label class="field" style="margin-top:10px">Model<input class="inp" id="apiModel" value="${esc(S.settings.model || 'claude-sonnet-5')}"></label>
  <div class="row" style="margin-top:10px"><button class="btn primary sm" id="apiSave">Save</button></div>`, b => {
  bindRestore(b);
  $('#apiSave', b).onclick = () => { S.settings.apiKey = $('#apiKey', b).value.trim(); S.settings.model = $('#apiModel', b).value.trim() || 'claude-sonnet-5'; save(); toast('Saved'); };
  $('#exp', b).onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type:'application/json' })); a.download = 'admissions-home-backup-' + isoToday() + '.json'; a.click(); };
  $('#imp', b).onchange = e => { const f = e.target.files[0]; if(!f) return; f.text().then(t => { try{ S = Object.assign(DEFAULTS(), JSON.parse(t)); save(); applyTheme(); closeDrawer(); route(); toast('Backup imported'); }catch(err){ toast('That file isn’t a valid backup'); } }); };
});
})();
