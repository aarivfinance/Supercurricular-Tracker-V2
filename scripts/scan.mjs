// Openings scanner. Reads data/watchlist.json (+ data/discovery.json), finds early-careers roles in the UK,
// and rewrites data/openings.json. Run: node scripts/scan.mjs   (Node 20+; runs every 3 hours on GitHub)
//
// For each company it tries, in order:
//   1. "sources" you set by hand   {type:'greenhouse'|'lever'|'ashby'|'workable'|'smartrecruiters', board}
//                                  {type:'workday', url:'https://x.wd3.myworkdayjobs.com/wday/cxs/x/Site/jobs'}
//                                  {type:'page', url, location?}  any careers page, scanned for early-careers links
//   2. "hints" (likely job boards)
//   3. auto-detection: guesses the firm's board name on each job-board platform and keeps the one that answers.
// What worked is remembered in data/ats-cache.json so later runs go straight to it.
import { readFile, writeFile } from 'node:fs/promises';

// Only EXPERIENCES, not jobs: work experience, spring weeks, insight days/weeks, virtual programmes, open days, talks.
const KEYWORDS = /(work[- ]experience|spring (week|insight|programme|internship)|insight (day|week|programme|event|evening|series)|virtual (work|experience|insight|internship|programme|event)|open (day|evening|week)|taster|discovery (day|week|programme|event)|\btalks?\b|webinar|masterclass|workshop|school (students?|leavers? insight)|sixth[- ]form|year 1[0-3]\b|early insight|first[- ]year (programme|insight|event)|pre-?university|vacation scheme|fellowship|accelerator)/i;
const EXCLUDE = /(senior|principal|director|head of|\blead\b|manager\b|vice president|\bvp\b|graduate (programme|scheme|analyst)|analyst programme|full[- ]time|permanent|apprenticeship|industrial placement|placement year|year[- ]long|12[- ]month|engineer\b|developer\b|associate\b|summer (analyst|associate)|off[- ]cycle)/i;
const INTERN = /\bintern(s|ship|ships)?\b|summer analyst|summer associate|off[- ]cycle/i;
const NOT_INTERN = /(senior|director|head of|manager\b|vice president|\bvp\b|graduate (programme|scheme)|full[- ]time|permanent|apprenticeship|internal\b)/i;
const kindOf = t => (KEYWORDS.test(t) && !EXCLUDE.test(t)) ? 'experience' : (INTERN.test(t) && !NOT_INTERN.test(t)) ? 'internship' : null;
function programmeOf(t){
  t = t.toLowerCase();
  if(/spring/.test(t)) return 'Spring week';
  if(/\bintern|summer analyst|summer associate|off[- ]cycle/.test(t) && !/insight|spring/.test(t)) return 'Internship';
  if(/virtual|online/.test(t)) return 'Virtual programme';
  if(/vacation scheme/.test(t)) return 'Vacation scheme';
  if(/open (day|evening|week)/.test(t)) return 'Open day';
  if(/\btalks?\b|webinar|masterclass|workshop/.test(t)) return 'Talk / webinar';
  if(/work[- ]experience/.test(t)) return 'Work experience';
  if(/fellowship/.test(t)) return 'Fellowship';
  if(/accelerator/.test(t)) return 'Accelerator';
  if(/insight|discovery|taster/.test(t)) return 'Insight day';
  return 'Work experience';
}
const UA = { 'user-agent':'Mozilla/5.0 (admissions-home scanner; +https://github.com/)' };
const read = async (f, d) => { try{ return JSON.parse(await readFile(f, 'utf8')); }catch(e){ return d; } };
const idOf = (co, title, link) => (co + '|' + title + '|' + (link || '')).toLowerCase().replace(/[^a-z0-9|]+/g, '-').slice(0, 160);
const get = (url, opts = {}) => fetch(url, { headers:UA, signal:AbortSignal.timeout(15000), ...opts });

/* ---------- UK only, with region ---------- */
const REGIONS = [
  ['London', /london|canary wharf|city of london/i],
  ['South East', /reading|oxford|brighton|guildford|milton keynes|southampton|crawley|slough|maidenhead|kent|surrey|sussex|berkshire|farnborough/i],
  ['South West', /bristol|bath|exeter|plymouth|swindon|cheltenham|gloucester/i],
  ['East of England', /cambridge|norwich|ipswich|chelmsford|luton|peterborough|st albans/i],
  ['West Midlands', /birmingham|coventry|wolverhampton|worcester/i],
  ['East Midlands', /nottingham|leicester|derby|northampton|lincoln/i],
  ['North West', /manchester|liverpool|chester|preston|warrington|lancaster/i],
  ['Yorkshire', /leeds|sheffield|york\b|bradford|hull/i],
  ['North East', /newcastle|sunderland|durham|middlesbrough/i],
  ['Scotland', /scotland|edinburgh|glasgow|aberdeen|dundee/i],
  ['Wales', /wales|cardiff|swansea|newport/i],
  ['Northern Ireland', /northern ireland|belfast/i],
];
const UK = /united kingdom|\buk\b|england|scotland|wales|northern ireland|great britain|\bgb\b/i;
const US = /united states|\busa?\b|, ?(al|ca|ct|ma|nc|nh|nj|ny|pa|ri|tx|wa|il|ga|fl|va|md|co)\b|new york|san francisco|seattle|chicago|boston|austin|palo alto|mountain view/i;
function regionOf(loc){
  if(!loc) return null;
  const us = US.test(loc);
  loc = loc.replace(/new york/ig, '').replace(/\b(cambridge|manchester|birmingham|durham|reading|newport|york)\s*,\s*(ma|nh|al|nc|pa|ri|me)\b/ig, '');
  for(const [r, re] of REGIONS) if(re.test(loc)) return r;
  if(us && !UK.test(loc)) return null;
  if(/remote/i.test(loc) && UK.test(loc)) return 'Remote (UK)';
  if(UK.test(loc)) return 'UK (region not stated)';
  return null;
}

/* ---------- who it's for: age group from the role title (and description where the board gives one) ---------- */
function ageOf(text){
  const t = text.toLowerCase();
  if(/year 1[01]\b|gcse|aged? 1[45]|14-16|15-16/.test(t)) return '14-16';
  if(/year 1[23]\b|sixth[- ]form|a-?level|school students?|aged? 1[67]|16-18|16\+|pre-?university/.test(t)) return '16-18';
  if(/school leaver|apprentice|gap year|18\+/.test(t)) return '18+';
  if(/spring|insight|first[- ]year|fresher|discovery|1st year/.test(t)) return 'uni1';
  if(/penultimate|summer (analyst|associate|intern)|internship|\bintern\b|vacation scheme|placement|off-?cycle/.test(t)) return 'uni2';
  if(/graduate|final[- ]year|training contract/.test(t)) return 'grad';
  return '';
}

/* ---------- job-board readers ---------- */
const BOARDS = {
  async greenhouse(b){ const r = await get(`https://boards-api.greenhouse.io/v1/boards/${b}/jobs`); if(!r.ok) return null; return (await r.json()).jobs.map(j => ({ role:j.title, location:j.location?.name, link:j.absolute_url })); },
  async lever(b){
    for(const host of ['api.lever.co', 'api.eu.lever.co']){
      const r = await get(`https://${host}/v0/postings/${b}?mode=json`); if(!r.ok) continue;
      const d = await r.json(); if(Array.isArray(d)) return d.map(j => ({ role:j.text, location:[j.categories?.location, ...(j.categories?.allLocations || [])].filter(Boolean).join(', '), link:j.hostedUrl }));
    }
    return null;
  },
  async ashby(b){ const r = await get(`https://api.ashbyhq.com/posting-api/job-board/${b}`); if(!r.ok) return null; const d = await r.json(); return (d.jobs || []).map(j => ({ role:j.title, location:[j.location, ...(j.secondaryLocations || []).map(x => x.location)].filter(Boolean).join(', '), link:j.jobUrl })); },
  async workable(b){ const r = await get(`https://apply.workable.com/api/v1/widget/accounts/${b}`); if(!r.ok) return null; const d = await r.json(); return (d.jobs || []).map(j => ({ role:j.title, location:[j.city, j.country].filter(Boolean).join(', '), link:j.url })); },
  async smartrecruiters(b){ const r = await get(`https://api.smartrecruiters.com/v1/companies/${b}/postings?limit=100`); if(!r.ok) return null; const d = await r.json(); if(!d.totalFound) return null; return d.content.map(j => ({ role:j.name, location:[j.location?.city, j.location?.country === 'gb' ? 'United Kingdom' : j.location?.country].filter(Boolean).join(', '), link:`https://jobs.smartrecruiters.com/${b}/${j.id}` })); },
  async workday(_, src){
    const r = await get(src.url, { method:'POST', headers:{ ...UA, 'content-type':'application/json' }, body:JSON.stringify({ limit:20, offset:0, searchText:src.search || 'intern', appliedFacets:{} }) });
    if(!r.ok) return null;
    const base = src.url.replace(/\/wday\/cxs\/[^/]+\/([^/]+)\/jobs$/, '/$1');
    return ((await r.json()).jobPostings || []).map(j => ({ role:j.title, location:j.locationsText, link:base + j.externalPath }));
  },
  async page(_, src){
    const r = await get(src.url); if(!r.ok) return null;
    const html = await r.text(), out = [];
    for(const m of html.matchAll(/<a[^>]+href="([^"#]+)"[^>]*>([\s\S]{3,200}?)<\/a>/gi)){
      const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if(KEYWORDS.test(text)) out.push({ role:text, location:src.location || 'United Kingdom', link:new URL(m[1], src.url).href });
    }
    return out;
  },
};
const slugs = name => {
  const base = name.toLowerCase().replace(/\(.*?\)/g, '').replace(/&/g, 'and').replace(/[^a-z0-9 ]/g, '').trim();
  const words = base.split(/\s+/).filter(w => !['and','the','co','company','group','partners','llp','inc'].includes(w));
  return [...new Set([base.replace(/\s+/g, ''), words.join(''), words.join('-'), words[0]].filter(s => s && s.length > 2))];
};
async function tryBoard(type, board, src){ try{ const jobs = await BOARDS[type](board, src || {}); return jobs && jobs.length ? jobs : (jobs ? [] : null); }catch(e){ return null; } }

async function scanCompany(co, cache){
  const tried = [];
  const attempt = async (type, board, src) => { tried.push(type + ':' + (board || src?.url)); const j = await tryBoard(type, board, src); return j ? { jobs:j, via:type + (board ? ':' + board : '') } : null; };
  let hit = null;
  for(const s of co.sources || []) if(!hit) hit = await attempt(s.type, s.board, s);
  const cached = cache[co.company];
  if(!hit && cached && cached.via){ const [t, b] = cached.via.split(':'); hit = await attempt(t, b); }
  for(const h of co.hints || []) if(!hit) hit = await attempt(h.type, h.board);
  const recheck = !cached || !cached.checked || (Date.now() - Date.parse(cached.checked)) > 7 * 864e5;
  if(!hit && recheck){
    for(const b of slugs(co.company)) for(const t of ['greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters']){
      if(hit) break;
      const r = await attempt(t, b);
      if(r && r.jobs.length) hit = r;      // an empty board under a guessed name is too weak a match
    }
  }
  cache[co.company] = { via:hit ? hit.via : null, checked:hit || recheck ? new Date().toISOString() : (cached?.checked || null) };
  if(!hit) return { status:{ ok:false, via:null, total:0, found:0, note:'No job board found yet — add a "sources" entry' }, found:[] };
  const found = [];
  for(const j of hit.jobs){
    const kind = j.role ? kindOf(j.role) : null;
    if(!kind) continue;
    const region = regionOf(j.location || '');
    if(!region) continue;
    found.push({ id:idOf(co.company, j.role, j.link), company:co.company, sector:co.sector || 'Other', sub:co.sub || '', role:j.role, kind, programme:programmeOf(j.role), ageGroup:ageOf(j.role), location:j.location || '', region, link:j.link || '', source:hit.via.split(':')[0] });
  }
  return { status:{ ok:true, via:hit.via, total:hit.jobs.length, found:found.length }, found };
}

/* ---------- firms' own programme pages, opened in a real browser (data/sources.json) ---------- */
let browser = null;
async function getBrowser(){
  if(browser !== null) return browser;
  try{ const { chromium } = await import('playwright'); browser = await chromium.launch(); }
  catch(e){ console.warn('⚠ Playwright not installed — skipping firms’ own pages. Run: npm i playwright && npx playwright install chromium'); browser = false; }
  return browser;
}
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_RE = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH})\\s*,?\\s*(20\\d\\d)?`, 'i');
const MI = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
function deadlineIn(text){
  const m = text.match(new RegExp(`(?:deadline|close[sd]?|closing|apply by|applications? (?:close|due))[^.]{0,60}?(\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\s*,?\\s*(?:20\\d\\d)?)`, 'i'));
  if(!m) return '';
  const d = m[1].match(DATE_RE); if(!d) return '';
  const now = new Date(); let y = d[3] ? +d[3] : now.getFullYear();
  const dt = new Date(Date.UTC(y, MI[d[2].slice(0,3).toLowerCase()], +d[1]));
  if(!d[3] && dt < now) dt.setUTCFullYear(y + 1);
  return dt.toISOString().slice(0, 10);
}
function statusIn(text){
  if(/applications? (?:are |is )?(?:now )?closed|(?:has|have) now closed|no longer accepting|closed for (?:this|20)|currently closed|not currently open|register (?:your )?interest/i.test(text)) return 'closed';
  if(/apply now|applications? (?:are |is )?(?:now )?open|now accepting|open for applications|submit your application|start (?:your )?application/i.test(text)) return 'open';
  return 'check';
}
async function scanPage(src){
  const b = await getBrowser(); if(!b) return { ok:false, note:'browser unavailable', items:[] };
  const page = await b.newPage({ userAgent:UA['user-agent'] });
  try{
    await page.goto(src.url, { waitUntil:'domcontentloaded', timeout:30000 });
    await page.waitForLoadState('networkidle', { timeout:12000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const text = (await page.evaluate(() => document.body ? document.body.innerText : '')).replace(/\s+/g, ' ');
    if(src.type === 'programme'){
      return { ok:true, items:[{ role:src.title, link:src.url, live:statusIn(text), deadline:deadlineIn(text), location:src.location || 'London, United Kingdom' }] };
    }
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({ t:(a.innerText || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), h:a.href, ctx:(a.closest('li,article,div') || a).innerText.replace(/\s+/g, ' ').slice(0, 400) })));
    const seen = new Set(), items = [];
    for(const l of links){
      if(!l.t || l.t.length < 6 || l.t.length > 140 || seen.has(l.h)) continue;
      if(!kindOf(l.t)) continue;
      if(/\b(new york|hong kong|singapore|tokyo|paris|frankfurt|dubai|sydney|mumbai|apac|americas|middle east|asia)\b/i.test(l.t + ' ' + l.ctx) && !/london|uk\b|united kingdom|emea/i.test(l.t + ' ' + l.ctx)) continue;
      seen.add(l.h);
      items.push({ role:l.t, link:l.h, live:statusIn(l.ctx), deadline:deadlineIn(l.ctx), location:src.location || 'London, United Kingdom' });
    }
    return { ok:true, items };
  }catch(e){ return { ok:false, note:e.message.split('\n')[0], items:[] }; }
  finally{ await page.close().catch(() => {}); }
}

async function pool(items, n, fn){ const out = []; let i = 0; await Promise.all(Array.from({ length:n }, async () => { while(i < items.length){ const k = i++; out[k] = await fn(items[k]); } })); return out; }

const prev  = await read('data/openings.json', { openings:[], review:[] });
const cache = await read('data/ats-cache.json', {});
const watch = (await read('data/watchlist.json', { companies:[] })).companies;
const disc  = (await read('data/discovery.json', { companies:[] })).companies;
const firstSeen = Object.fromEntries([...(prev.openings || []), ...(prev.review || [])].map(o => [o.id, o.posted]));
const today = new Date().toISOString().slice(0, 10);
const stamp = l => l.map(o => ({ ...o, posted:firstSeen[o.id] || today }));

const wRes = await pool(watch, 8, c => scanCompany(c, cache));
const onList = new Set(watch.map(c => c.company));
const dRes = await pool(disc.filter(c => !onList.has(c.company)), 8, c => scanCompany(c, cache));

const health = {}; watch.forEach((c, i) => health[c.company] = wRes[i].status);

const srcList = (await read('data/sources.json', { sources:[] })).sources;
const sector = Object.fromEntries(watch.map(c => [c.company, c]));
const pageFound = [];
for(const src of srcList){
  const r = await scanPage(src);
  const co = sector[src.company] || { company:src.company, sector:src.sector || 'Access programmes', sub:'' };
  for(const it of r.items){
    const region = regionOf(it.location) || 'London';
    pageFound.push({ id:idOf(co.company, it.role, it.link), company:co.company, sector:co.sector, sub:co.sub || '', role:it.role, kind:kindOf(it.role) || 'experience', programme:programmeOf(it.role), ageGroup:src.age || ageOf(it.role), location:it.location, region, link:it.link, live:it.live, deadline:it.deadline || '', source:'page' });
  }
  const h = health[co.company] || { ok:false, via:null, total:0, found:0 };
  health[co.company] = { ...h, ok:h.ok || r.ok, via:h.via || (r.ok ? 'own site' : null), pages:(h.pages || 0) + 1, found:(h.found || 0) + r.items.length, note:r.ok ? h.note : (h.note || r.note) };
  console.log((r.ok ? '✓ ' : '✗ ') + src.company + ' — ' + (r.ok ? r.items.length + ' found' : r.note) + ' · ' + src.url);
}
if(browser) await browser.close();
const byId = new Map(); [...wRes.flatMap(r => r.found), ...pageFound].forEach(o => byId.set(o.id, o));
const out = {
  updated:new Date().toISOString(),
  watchlist:watch.map(c => ({ company:c.company, sector:c.sector, sub:c.sub, addedByClaude:!!c.addedByClaude })),
  health,
  openings:stamp([...byId.values()]),
  review:stamp(dRes.flatMap(r => r.found)),
};
await writeFile('data/openings.json', JSON.stringify(out, null, 1));
await writeFile('data/ats-cache.json', JSON.stringify(cache, null, 1));
const ok = Object.values(health).filter(h => h.ok).length;
console.log(`✓ ${out.openings.length} UK early-careers openings · ${out.review.length} for review · job boards found for ${ok}/${watch.length} firms`);
