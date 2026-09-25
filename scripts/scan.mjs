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

const KEYWORDS = /(spring|insight|\bintern(s|ship|ships)?\b|work experience|placement|fellowship|accelerator|early careers?|sixth[- ]form|year 1[0-3]\b|school leaver|apprentice|discovery|pre-?university|off-?cycle|vacation scheme|open day|first[- ]year|penultimate|graduate programme|summer analyst|industrial placement|residency|scholar)/i;
const EXCLUDE = /(senior|principal|staff engineer|director|head of|lead\b|manager\b|vice president|\bvp\b)/i;
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
  if(US.test(loc) && !UK.test(loc.replace(/new york/ig, ''))) return null;   // "New York", "Cambridge, MA" etc. are not UK
  loc = loc.replace(/new york/ig, '');
  for(const [r, re] of REGIONS) if(re.test(loc)) return r;
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
    if(!j.role || !KEYWORDS.test(j.role) || EXCLUDE.test(j.role)) continue;
    const region = regionOf(j.location || '');
    if(!region) continue;
    found.push({ id:idOf(co.company, j.role, j.link), company:co.company, sector:co.sector || 'Other', sub:co.sub || '', role:j.role, ageGroup:ageOf(j.role), location:j.location || '', region, link:j.link || '', source:hit.via.split(':')[0] });
  }
  return { status:{ ok:true, via:hit.via, total:hit.jobs.length, found:found.length }, found };
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
const out = {
  updated:new Date().toISOString(),
  watchlist:watch.map(c => ({ company:c.company, sector:c.sector, sub:c.sub, addedByClaude:!!c.addedByClaude })),
  health,
  openings:stamp(wRes.flatMap(r => r.found)),
  review:stamp(dRes.flatMap(r => r.found)),
};
await writeFile('data/openings.json', JSON.stringify(out, null, 1));
await writeFile('data/ats-cache.json', JSON.stringify(cache, null, 1));
const ok = Object.values(health).filter(h => h.ok).length;
console.log(`✓ ${out.openings.length} UK early-careers openings · ${out.review.length} for review · job boards found for ${ok}/${watch.length} firms`);
