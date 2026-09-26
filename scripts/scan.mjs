// ============================================================================
// Openings scanner — every UK early-careers opportunity for the firms you watch.
// Writes data/openings.json. Runs every 3 hours on GitHub; locally: node scripts/scan.mjs
//
// Where openings come from
//   • Job systems firms use, read through their official feeds:
//       Workday (job API + sitemap), Oracle Recruiting Cloud, Greenhouse, Lever, Ashby,
//       Workable, SmartRecruiters, and any careers-site sitemap (Radancy, Phenom, SuccessFactors…)
//   • Firms' own programme pages (opened in a real browser): programme lists, "Apply" links
//     to Oleeo (tal.net) / Avature / Workday / Oracle are recognised and followed.
//   • Access programmes & courses: Sutton Trust, Springpod, Rare, upReach, Coursera (with price).
// Rules: UK only · early careers only (no experienced hires) · robots.txt is respected ·
//        human-check pages (CAPTCHAs) are never bypassed.
// Config: data/watchlist.json (firms), data/sources.json (feeds & pages), data/discovery.json (Review tab)
// ============================================================================
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const UA_STRING = 'Mozilla/5.0 (compatible; AdmissionsHomeBot/1.0; +https://aarivfinance.github.io/Supercurricular-Tracker-V2/)';
const HEADERS = { 'user-agent':UA_STRING, 'accept-language':'en-GB,en;q=0.9' };
const NOW = new Date(), NOW_ISO = NOW.toISOString(), TODAY = NOW_ISO.slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const read = async (f, d) => { try{ return JSON.parse(await readFile(f, 'utf8')); }catch(e){ return d; } };
export const idOf = (co, title, link) => (co + '|' + title + '|' + (link || '')).toLowerCase().replace(/[^a-z0-9|]+/g, '-').slice(0, 180);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const LOG = [];
function log(e){ LOG.push(e); console.log((e.ok ? '✓ ' : '✗ ') + [e.company, e.type, e.found != null ? e.found + ' found' : '', e.error || '', e.target || ''].filter(Boolean).join(' · ')); }

/* ---------------------------------------------------------------- robots.txt */
const ROBOTS = new Map();
function parseRobots(txt){
  const groups = []; let cur = null, lastAgent = false;
  for(let line of txt.split(/\r?\n/)){
    line = line.replace(/#.*/, '').trim(); if(!line) continue;
    const i = line.indexOf(':'); if(i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
    if(k === 'user-agent'){ if(!cur || !lastAgent){ cur = { agents:[], rules:[] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); lastAgent = true; }
    else { lastAgent = false; if(cur && (k === 'allow' || k === 'disallow') && v) cur.rules.push({ allow:k === 'allow', path:v }); }
  }
  const g = groups.find(g => g.agents.some(a => a.includes('admissionshome'))) || groups.find(g => g.agents.includes('*'));
  return g ? g.rules : [];
}
const robotsRe = p => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
export async function allowed(url){
  let u; try{ u = new URL(url); }catch(e){ return false; }
  if(!ROBOTS.has(u.origin)){
    let rules = [];
    try{
      const r = await fetch(u.origin + '/robots.txt', { headers:HEADERS, signal:AbortSignal.timeout(10000) });
      if(r.ok) rules = parseRobots(await r.text());
      else if(r.status >= 500) rules = [{ allow:false, path:'/' }];
    }catch(e){ /* unreachable robots → treat as allowed */ }
    ROBOTS.set(u.origin, rules);
  }
  const path = u.pathname + u.search; let best = null;
  for(const r of ROBOTS.get(u.origin)) if(robotsRe(r.path).test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  return !best || best.allow;
}
async function get(url, opts = {}){
  if(!(await allowed(url))) { const e = new Error('blocked by robots.txt'); e.robots = true; throw e; }
  return fetch(url, { redirect:'follow', ...opts, headers:{ ...HEADERS, ...(opts.headers || {}) }, signal:AbortSignal.timeout(opts.timeout || 25000) });
}
async function getJSON(url, opts){ const r = await get(url, opts); if(!r.ok){ const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; } return r.json(); }

/* ---------------------------------------------------------------- what counts */
export const EARLY = /\b(intern(s|ship|ships)?|spring (week|insight|programme|program|internship|into)|insight (day|week|days|programme|program|event|evening|series|scheme|internship)|early insight|work[- ]experience|placements?|graduates?|summer (analyst|associate|programme|program|school|intern)|off[- ]cycle|apprentice(ship)?s?|vacation schemes?|first[- ]year|penultimate|discovery (day|week|programme|program|event)|open (day|evening)|fellowships?|accelerator|school leavers?|sixth[- ]form|year 1[0-3]|virtual (work|experience|insight|internship|programme|program)|taster|early careers?|trainee(ship)?s?|training contract|scholarships?|pre-?university|work shadow(ing)?|boot ?camp|pathways to)\b/i;
export const EXCLUDE = /\b(senior|snr|principal|director|head of|lead\b|manager|vice president|vp|avp|experienced|lateral|staff (engineer|scientist)|executive|chief|recruit(er|ment (partner|coordinator|specialist|manager|lead|advisor))|graduate recruitment|mentor|coach|tutor|lecturer|professor|teacher|internal (audit|comm))\b/i;
export const isEarly = t => !!t && EARLY.test(t) && !EXCLUDE.test(t);

export function programmeOf(t){
  t = String(t || '').toLowerCase();
  if(/spring/.test(t)) return 'Spring week';
  if(/vacation scheme/.test(t)) return 'Vacation scheme';
  if(/training contract/.test(t)) return 'Training contract';
  if(/apprentice/.test(t)) return 'Apprenticeship';
  if(/virtual|online (programme|experience)/.test(t)) return 'Virtual programme';
  if(/summer school/.test(t)) return 'Summer school';
  if(/work[- ]experience|insight|discovery|first[- ]year|work shadow|taster/.test(t)) return 'Insight / work experience';
  if(/industrial placement|placement year|year[- ]long|12[- ]month|sandwich|placement/.test(t)) return 'Industrial placement';
  if(/off[- ]cycle|winter intern|autumn intern|spring intern/.test(t)) return 'Off-cycle internship';
  if(/\bintern|summer analyst|summer associate/.test(t)) return 'Summer internship';
  if(/graduate|analyst program|full[- ]time analyst|trainee/.test(t)) return 'Graduate programme';
  if(/fellowship|scholar/.test(t)) return 'Fellowship';
  if(/accelerator|incubator/.test(t)) return 'Accelerator';
  if(/open (day|evening)|\btalks?\b|webinar|masterclass|workshop|event|boot ?camp/.test(t)) return 'Event / talk';
  if(/pathways?|sixth[- ]form|year 1[0-3]|school|pre-?university|spotlight/.test(t)) return 'Pre-university programme';
  return 'Summer internship';
}
export function ageOf(text){
  const t = String(text || '').toLowerCase();
  if(/year 1[01]\b|gcse|aged? 1[45]|14-16|15-16/.test(t)) return '14-16';
  if(/year 1[23]\b|sixth[- ]form|a-?level|school students?|aged? 1[67]|16-18|16\+|pre-?university|pathways to/.test(t)) return '16-18';
  if(/school leaver|apprentice|gap year|18\+/.test(t)) return '18+';
  if(/spring|insight|first[- ]year|fresher|discovery|1st year/.test(t)) return 'uni1';
  if(/graduate|final[- ]year|training contract|full[- ]time analyst/.test(t)) return 'grad';
  if(/penultimate|summer (analyst|associate|intern)|internship|\bintern\b|vacation scheme|placement|off-?cycle/.test(t)) return 'uni2';
  return '';
}
export function trackOf(o){
  if(['Online course', 'Fellowship', 'Accelerator', 'Competition'].includes(o.programme)) return 'opps';
  if(['14-16', '16-18', '18+'].includes(o.ageGroup) || ['Pre-university programme', 'Summer school', 'Apprenticeship'].includes(o.programme)) return 'preuni';
  return 'uni';
}
const ROLE_TYPES = [
  ['Investment banking', /investment bank|\bibd\b|m&a|mergers|capital markets|\becm\b|\bdcm\b|leveraged finance|restructuring|corporate finance|coverage|global advisory|financial advisory/i],
  ['Markets & trading', /markets|sales|trading|trader|structuring|fixed income|equities|\bfx\b|commodit|\brates\b/i],
  ['Quant & research', /quant|quantitative|strats|research|economist/i],
  ['Private equity & VC', /private equity|venture|buyout|growth equity/i],
  ['Asset & wealth management', /asset management|wealth|private bank|investment management|portfolio|\bfund|investment solutions/i],
  ['Corporate & commercial banking', /corporate bank|commercial bank|transaction bank|treasury|lending|payments/i],
  ['Risk & compliance', /risk|compliance|control|regulat|financial crime/i],
  ['Audit, tax & accounting', /assurance|audit|\btax\b|accountan|actuar/i],
  ['Consulting & strategy', /consult|strategy|deals|transformation/i],
  ['Law', /\blaw\b|legal|solicitor|vacation scheme|training contract|barrister/i],
  ['Technology & data', /technolog|software|engineer|developer|\bit\b|cyber|cloud|\bdata\b|\bai\b|machine learning|digital|product/i],
  ['Operations', /operations|\bops\b/i],
  ['Finance, HR & business', /finance|human resources|\bhr\b|people|marketing|communications|business/i],
];
export const roleTypeOf = t => (ROLE_TYPES.find(([, re]) => re.test(t || '')) || [''])[0];

/* ---------------------------------------------------------------- UK only, with region */
const REGIONS = [
  ['London', /london|canary wharf|city of london/i],
  ['South East', /reading|oxford|brighton|guildford|milton keynes|southampton|crawley|slough|maidenhead|kent|surrey|sussex|berkshire|farnborough|basingstoke/i],
  ['South West', /bristol|bath\b|exeter|plymouth|swindon|cheltenham|gloucester|bournemouth/i],
  ['East of England', /cambridge|norwich|ipswich|chelmsford|luton|peterborough|st albans/i],
  ['West Midlands', /birmingham|coventry|wolverhampton|worcester/i],
  ['East Midlands', /nottingham|leicester|derby|northampton|lincoln/i],
  ['North West', /manchester|liverpool|chester|preston|warrington|lancaster|knutsford/i],
  ['Yorkshire', /leeds|sheffield|\byork\b|bradford|hull/i],
  ['North East', /newcastle|sunderland|durham|middlesbrough/i],
  ['Scotland', /scotland|edinburgh|glasgow|aberdeen|dundee/i],
  ['Wales', /wales|cardiff|swansea|newport/i],
  ['Northern Ireland', /northern ireland|belfast/i],
];
const UK = /united kingdom|\buk\b|england|scotland|wales|northern ireland|great britain|\bgb\b|britain/i;
const NOT_UK = /united states|\busa?\b|, ?(al|ca|ct|ma|nc|nh|nj|ny|pa|ri|tx|wa|il|ga|fl|va|md|co)\b|new york|san francisco|seattle|chicago|boston|austin|palo alto|mountain view|hong kong|singapore|tokyo|paris|frankfurt|dubai|sydney|mumbai|bangalore|bengaluru|toronto|zurich|geneva|amsterdam|dublin|madrid|milan|luxembourg|warsaw|budapest|shanghai|beijing|seoul|sao paulo|mexico|canada|india|ireland|france|germany|spain|italy|poland|switzerland|netherlands|japan|china|australia|brazil|apac|americas|middle east/i;
export function regionOf(loc){
  if(!loc) return null;
  const foreign = NOT_UK.test(loc);
  const l = String(loc).replace(/new york/ig, '').replace(/\b(cambridge|manchester|birmingham|durham|reading|newport|york|london)\s*,\s*(ma|nh|al|nc|pa|ri|me|on|ky|oh)\b/ig, '');
  for(const [r, re] of REGIONS) if(re.test(l)) return r;
  if(foreign && !UK.test(l)) return null;
  if(/remote/i.test(l) && UK.test(l)) return 'Remote (UK)';
  if(UK.test(l)) return 'UK (region not stated)';
  return null;
}

/* ---------------------------------------------------------------- details: deadlines, status, visa, notes */
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const MI = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
function dateFrom(s){
  const d = String(s).match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH})\\s*,?\\s*(20\\d\\d)?`, 'i')); if(!d) return '';
  let y = d[3] ? +d[3] : NOW.getUTCFullYear();
  const dt = new Date(Date.UTC(y, MI[d[2].slice(0, 3).toLowerCase()], +d[1]));
  if(!d[3] && dt < NOW) dt.setUTCFullYear(y + 1);
  return dt.toISOString().slice(0, 10);
}
export function deadlineIn(text){
  const m = String(text).match(new RegExp(`(?:deadline|close[sd]?|closing|apply by|applications? (?:close|due)|submit (?:by|before))[^.]{0,60}?(\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\s*,?\\s*(?:20\\d\\d)?)`, 'i'));
  return m ? dateFrom(m[1]) : '';
}
export function opensIn(text){
  const m = String(text).match(new RegExp(`(?:applications? (?:will )?(?:re)?open|opens? (?:on|in)?)[^.]{0,40}?(\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\s*,?\\s*(?:20\\d\\d)?)`, 'i'));
  const d = m ? dateFrom(m[1]) : ''; return d && d > TODAY ? d : '';
}
export function statusIn(text){
  if(/applications? (?:are |is )?(?:now )?closed|(?:has|have) (?:now )?closed|no longer accepting|closed for (?:this|20)|currently closed|not currently open|register (?:your )?interest|applications? will (?:re)?open/i.test(text)) return 'closed';
  if(/apply now|applications? (?:are |is )?(?:now )?open|now accepting|open for applications|submit your application|start (?:your )?application/i.test(text)) return 'open';
  return 'check';
}
const NOTE_RE = /(only (?:apply|submit)|apply (?:for|to) (?:one|a maximum|up to)|up to (?:one|two|three|\d) (?:applications?|programmes?|roles?)|one application|applications? (?:limit|per)|maximum of \w+ applications?|(?:visa|sponsor)|right to work|rolling basis|reviewed on a rolling|as early as possible|early application|penultimate[- ]year|first[- ]year (?:students|undergrad)|final[- ]year|year 12|year 13|aged? \d\d|minimum|2:1|ucas points|gcse|a-?levels?|eligib|free (?:of charge|to (?:attend|apply))|travel (?:costs|expenses)|paid|bursary|salary|£\d)/i;
export function notesFrom(text){
  const out = [];
  for(const s of String(text || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)){
    const t = s.trim();
    if(t.length > 25 && t.length < 280 && NOTE_RE.test(t) && !out.some(o => o.slice(0, 60) === t.slice(0, 60))) out.push(t);
    if(out.length >= 4) break;
  }
  return out;
}
export function visaFrom(text){
  const t = String(text || '');
  if(/(?:not|unable to|cannot|can't|won't|do not|does not)\s+(?:be able to\s+)?(?:offer|provide|support|sponsor)[^.]{0,50}(?:visa|sponsor)|no visa sponsorship|sponsorship (?:is )?not (?:available|offered)/i.test(t)) return 'No visa sponsorship';
  if(/visa sponsorship (?:is |may be )?(?:available|provided|offered)|(?:we|will|can) (?:can |will |may )?(?:offer |provide )?(?:visa )?sponsor(?:ship)?\b/i.test(t)) return 'Visa sponsorship';
  return '';
}
const htmlText = h => String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, '. ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').replace(/([.!?])\s*(?:\.\s*)+/g, '$1 ').replace(/(^|\s)\.\s/g, '$1').trim();
export const deslug = s => decodeURIComponent(String(s || '')).replace(/^XMLNAME-/i, '').replace(/---/g, ' – ').replace(/--/g, ' ').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b([a-z])/g, (m, c, i, str) => (i === 0 || str[i - 1] === ' ') ? c.toUpperCase() : c);
function detailsOf(text){ return { notes:notesFrom(text), visa:visaFrom(text), deadline:deadlineIn(text), opens:opensIn(text) }; }

/* ---------------------------------------------------------------- job-system readers */
const TERMS = ['intern', 'internship', 'spring', 'insight', 'graduate', 'placement', 'work experience', 'apprentice', 'off-cycle', 'summer analyst', '2027'];

async function readGreenhouse(board){
  for(const host of ['boards-api.greenhouse.io', 'boards-api.eu.greenhouse.io']){
    let d; try{ d = await getJSON(`https://${host}/v1/boards/${board}/jobs`); }catch(e){ continue; }
    return (d.jobs || []).map(j => ({ role:j.title, location:j.location?.name || '', link:j.absolute_url, postedAt:(j.first_published || j.updated_at || '').slice(0, 10),
      detail:async () => { const x = await getJSON(`https://${host}/v1/boards/${board}/jobs/${j.id}`); return htmlText(x.content?.replace(/&lt;/g, '<').replace(/&gt;/g, '>')); } }));
  }
  return null;
}
async function readLever(board){
  for(const host of ['api.lever.co', 'api.eu.lever.co']){
    let d; try{ d = await getJSON(`https://${host}/v0/postings/${board}?mode=json`); }catch(e){ continue; }
    if(!Array.isArray(d)) continue;
    return d.map(j => ({ role:j.text, location:[j.categories?.location, ...(j.categories?.allLocations || [])].filter(Boolean).join(', '), link:j.hostedUrl,
      postedAt:j.createdAt ? new Date(j.createdAt).toISOString().slice(0, 10) : '', text:htmlText((j.descriptionPlain || j.description || '') + ' ' + (j.additionalPlain || '')) }));
  }
  return null;
}
async function readAshby(board){
  let d; try{ d = await getJSON(`https://api.ashbyhq.com/posting-api/job-board/${board}`); }catch(e){ return null; }
  return (d.jobs || []).map(j => ({ role:j.title, location:[j.location, ...(j.secondaryLocations || []).map(x => x.location)].filter(Boolean).join(', '), link:j.jobUrl, postedAt:(j.publishedAt || '').slice(0, 10), text:htmlText(j.descriptionHtml || j.descriptionPlain || '') }));
}
async function readWorkable(board){
  let d; try{ d = await getJSON(`https://apply.workable.com/api/v1/widget/accounts/${board}`); }catch(e){ return null; }
  return (d.jobs || []).map(j => ({ role:j.title, location:[j.city, j.country].filter(Boolean).join(', '), link:j.url, postedAt:(j.published_on || '').slice(0, 10) }));
}
async function readSmartRecruiters(board){
  let d; try{ d = await getJSON(`https://api.smartrecruiters.com/v1/companies/${board}/postings?limit=100`); }catch(e){ return null; }
  if(!d.totalFound) return null;
  return d.content.map(j => ({ role:j.name, location:[j.location?.city, j.location?.country === 'gb' ? 'United Kingdom' : j.location?.country].filter(Boolean).join(', '), link:`https://jobs.smartrecruiters.com/${board}/${j.id}`, postedAt:(j.releasedDate || '').slice(0, 10) }));
}
function workdayPosted(s){
  if(!s) return '';
  const d = new Date(NOW);
  if(/today/i.test(s)) return TODAY;
  if(/yesterday/i.test(s)){ d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
  const m = s.match(/(\d+)\+?\s+days?/i); if(m){ d.setUTCDate(d.getUTCDate() - +m[1]); return d.toISOString().slice(0, 10) + (/\+/.test(s) ? '+' : ''); }
  return '';
}
export async function readWorkday(src){
  const api = `https://${src.host}/wday/cxs/${src.tenant}/${src.site}`;
  const ui = src.ui || `https://${src.host}/en-US/${src.site}`;
  const seen = new Map(); let firstError = null, anyOk = false;
  for(const q of src.terms || TERMS){
    for(let offset = 0; offset < 120; offset += 20){
      let d;
      try{ d = await getJSON(api + '/jobs', { method:'POST', headers:{ 'content-type':'application/json', accept:'application/json' }, body:JSON.stringify({ appliedFacets:{}, limit:20, offset, searchText:q }) }); anyOk = true; }
      catch(e){ firstError = firstError || e; break; }
      const posts = d.jobPostings || [];
      for(const p of posts) if(p.externalPath && !seen.has(p.externalPath)) seen.set(p.externalPath, p);
      if(posts.length < 20 || offset + 20 >= (d.total || 0)) break;
      await sleep(200);
    }
  }
  if(!anyOk) throw firstError || new Error('no response');
  return [...seen.values()].map(p => ({
    role:p.title, location:p.locationsText || '', link:ui + p.externalPath, postedAt:workdayPosted(p.postedOn),
    detail:async () => {
      const x = await getJSON(api + p.externalPath, { headers:{ accept:'application/json' } });
      const i = x.jobPostingInfo || {};
      return { text:htmlText(i.jobDescription), location:[i.location, ...(i.additionalLocations || [])].filter(Boolean).join(', '), postedAt:workdayPosted(i.postedOn) || undefined };
    },
  }));
}
export async function readOracle(src){
  const base = `https://${src.host}/hcmRestApi/resources/latest`;
  const seen = new Map(); let firstError = null, anyOk = false;
  for(const q of src.terms || TERMS){
    for(let offset = 0; offset < 200; offset += 50){
      const finder = `findReqs;siteNumber=${src.site},facetsList=LOCATIONS;WORK_LOCATIONS;TITLES;CATEGORIES;POSTING_DATES,limit=50,offset=${offset},keyword="${q}",sortBy=POSTING_DATES_DESC`;
      let d;
      try{ d = await getJSON(`${base}/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=${encodeURIComponent(finder)}`, { headers:{ accept:'application/json' } }); anyOk = true; }
      catch(e){ firstError = firstError || e; break; }
      const it = (d.items || [])[0] || {}; const list = it.requisitionList || [];
      for(const j of list) if(!seen.has(j.Id)) seen.set(j.Id, j);
      if(list.length < 50 || offset + 50 >= (it.TotalJobsCount || 0)) break;
      await sleep(200);
    }
  }
  if(!anyOk) throw firstError || new Error('no response');
  return [...seen.values()].map(j => ({
    role:j.Title, location:[j.PrimaryLocation, j.PrimaryLocationCountry, ...(j.secondaryLocations || []).map(s => s.Name)].filter(Boolean).join(', '),
    link:`https://${src.host}/hcmUI/CandidateExperience/en/sites/${src.site}/job/${j.Id}`, postedAt:(j.PostedDate || '').slice(0, 10),
    detail:async () => {
      const f = `ById;Id="${j.Id}",siteNumber=${src.site}`;
      const x = await getJSON(`${base}/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=${encodeURIComponent(f)}`, { headers:{ accept:'application/json' } });
      const i = (x.items || [])[0] || {};
      return { text:htmlText([i.ExternalDescriptionStr, i.ExternalResponsibilitiesStr, i.ExternalQualificationsStr].join(' ')) };
    },
  }));
}
export async function readSitemap(src){
  const urls = [], queue = [src.url], idx = src.indexPattern ? new RegExp(src.indexPattern, 'i') : null; let n = 0;
  while(queue.length && n < 25){
    const u = queue.shift(); n++;
    let x; try{ const r = await get(u); if(!r.ok) continue; x = await r.text(); }catch(e){ if(n === 1) throw e; continue; }
    if(/<sitemapindex/i.test(x)){ for(const m of x.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) if(!idx || idx.test(m[1])) queue.push(m[1].replace(/&amp;/g, '&')); continue; }
    for(const m of x.matchAll(/<url>([\s\S]*?)<\/url>/g)){
      const loc = (m[1].match(/<loc>\s*([^<]+?)\s*<\/loc>/) || [])[1]; const lm = (m[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/) || [])[1];
      if(loc) urls.push({ loc:loc.replace(/&amp;/g, '&'), lastmod:lm || '' });
    }
  }
  const re = new RegExp(src.pattern, 'i');
  const hits = urls.filter(u => re.test(u.loc));
  const seg = (u, i) => { const p = new URL(u).pathname.split('/').filter(Boolean); return p[i < 0 ? p.length + i : i] || ''; };
  const out = hits.map(u => {
    const path = new URL(u.loc).pathname.split('/').filter(Boolean);
    const slug = src.slugIndex != null ? seg(u.loc, src.slugIndex) : path.reduce((a, b) => (b.length > a.length && !/^\d+$/.test(b) ? b : a), '');
    return { role:deslug(slug), link:u.loc, location:src.location || (src.cityIndex != null ? deslug(seg(u.loc, src.cityIndex)) : ''), postedAt:(u.lastmod || '').slice(0, 10) };
  });
  if(src.titleFrom === 'page'){
    const pick = out.slice(0, src.maxPages || 150);
    await pool(pick, 4, async o => {
      try{
        const r = await get(o.link); if(!r.ok) return; const h = await r.text();
        const t = (h.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || h.match(/<title>([^<]+)<\/title>/i) || [])[1];
        if(t) o.role = htmlText(t).replace(/\s*[|–-]\s*(Springpod|Coursera).*$/i, '').trim();
        o.text = htmlText(h).slice(0, 20000);
      }catch(e){}
    });
    return pick;
  }
  return out;
}
export async function readCoursera(src){
  const out = [];
  for(const slug of src.courses || []){
    const url = `https://www.coursera.org/learn/${slug}`;
    try{
      const r = await get(url); if(!r.ok){ log({ company:'Coursera', type:'course', target:url, ok:false, error:'HTTP ' + r.status }); continue; }
      const h = await r.text(), text = htmlText(h);
      const title = htmlText((h.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || h.match(/<title>([^<]+)<\/title>/i) || [])[1] || deslug(slug)).replace(/\s*\|\s*Coursera.*$/i, '');
      const provider = (h.match(/"provider"\s*:\s*\{[^}]*?"name"\s*:\s*"([^"]+)"/) || h.match(/"partnerName"\s*:\s*"([^"]+)"/) || [])[1] || '';
      out.push({ role:title + (provider ? ` (${provider})` : ''), link:url, location:'Online', price:priceFrom(text), text:text.slice(0, 30000), programme:'Online course' });
    }catch(e){ log({ company:'Coursera', type:'course', target:url, ok:false, error:e.message }); }
    await sleep(400);
  }
  return out;
}
export function priceFrom(text){
  const parts = [];
  if(/enrol+ for free|free enrol+ment|audit (?:this course )?for free|free course|start for free/i.test(text)) parts.push('Free to enrol');
  const money = text.match(/(?:£|US\$|\$|€)\s?\d[\d,]*(?:\.\d\d)?(?:\s?(?:\/|per)\s?(?:month|mo|year|yr))?/i);
  if(money) parts.push(money[0].replace(/\s+/g, ''));
  if(/included with coursera plus/i.test(text)) parts.push('certificate via Coursera Plus');
  else if(/purchase (?:a|the) certificate|paid certificate|certificate for a fee/i.test(text)) parts.push('paid certificate');
  if(/financial aid available/i.test(text)) parts.push('financial aid available');
  return parts.join(' · ') || 'See course page';
}

/* ---------------------------------------------------------------- links on job systems we can recognise */
export function atsFromLink(href){
  let m;
  if((m = href.match(/^https?:\/\/([\w-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([^\/?#]+)/)) && !/^(wday|job)$/i.test(m[3])) return { type:'workday', host:`${m[1]}.${m[2]}.myworkdayjobs.com`, tenant:m[1], site:m[3] };
  if((m = href.match(/^https?:\/\/(wd\d+)\.myworkdaysite\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?recruiting\/([^\/]+)\/([^\/?#]+)/))) return { type:'workday', host:`${m[1]}.myworkdaysite.com`, tenant:m[2], site:m[3], ui:`https://${m[1]}.myworkdaysite.com/recruiting/${m[2]}/${m[3]}` };
  if((m = href.match(/^https?:\/\/([\w.-]+\.oraclecloud\.com)\/hcmUI\/CandidateExperience\/[a-z]{2}(?:-[A-Z]{2})?\/sites\/([^\/?#]+)/))) return { type:'oracle', host:m[1], site:m[2] };
  if((m = href.match(/^https?:\/\/(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board\?for=)?([\w-]+)/)) && m[1] !== 'embed') return { type:'greenhouse', board:m[1] };
  if((m = href.match(/^https?:\/\/jobs(?:\.eu)?\.lever\.co\/([\w-]+)/))) return { type:'lever', board:m[1] };
  if((m = href.match(/^https?:\/\/jobs\.ashbyhq\.com\/([\w.-]+)/))) return { type:'ashby', board:m[1] };
  return null;
}
export function titleFromLink(href){
  let m;
  if((m = href.match(/\/opp\/\d+-([^\/?#]+)/))) return deslug(m[1]);                                      // Oleeo (tal.net)
  if((m = href.match(/\/JobDetail\/([^\/?#]+)\/\d+/))) return deslug(m[1]);                                // Avature
  if((m = href.match(/myworkday(?:jobs|site)\.com\/.*\/job\/(?:[^\/]+\/)?([^\/?#]+?)_[A-Za-z0-9-]+\/?(?:[?#]|$)/))) return deslug(m[1]); // Workday
  return '';
}
const GENERIC = /^(apply( now| here| today)?|find out more|learn more|read more|more info(rmation)?|view( (role|job|details|programme|opportunity))?|details|register( (now|interest))?|click here|here|explore|discover more|see more|open|›|→|>)$/i;

/* ---------------------------------------------------------------- firms' own pages (real browser) */
let browser = null;
async function getBrowser(){
  if(browser !== null) return browser;
  try{ const { chromium } = await import('playwright'); browser = await chromium.launch(); }
  catch(e){ console.warn('⚠ Playwright not installed — skipping firms’ own pages. Run: npm i playwright && npx playwright install chromium'); browser = false; }
  return browser;
}
export async function scanPage(src){
  if(!(await allowed(src.url))) throw Object.assign(new Error('blocked by robots.txt'), { robots:true });
  const b = await getBrowser(); if(!b) throw new Error('browser unavailable');
  const page = await b.newPage({ userAgent:UA_STRING });
  try{
    const resp = await page.goto(src.url, { waitUntil:'domcontentloaded', timeout:35000 });
    if(resp && resp.status() >= 400) throw new Error('HTTP ' + resp.status());
    await page.waitForLoadState('networkidle', { timeout:12000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const text = (await page.evaluate(() => document.body ? document.body.innerText : '')).replace(/\s+/g, ' ');
    if(/verify (?:you are|you're) (?:a )?human|are you a robot|captcha|quick check needed|access denied|unusual traffic/i.test(text.slice(0, 1500))) throw new Error('human check shown — skipped');
    if(src.type === 'programme'){
      return { items:[{ role:src.title, link:src.url, live:statusIn(text), ...detailsOf(text), location:src.location || 'London, United Kingdom' }], ats:[] };
    }
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({ t:(a.innerText || a.getAttribute('aria-label') || a.title || '').replace(/\s+/g, ' ').trim(), h:a.href, ctx:(a.closest('li,article,tr,[class*=card],[class*=item],div') || a).innerText.replace(/\s+/g, ' ').slice(0, 600) })));
    const seen = new Set(), items = [], ats = new Map();
    const pat = src.linkPattern ? new RegExp(src.linkPattern, 'i') : null, inc = src.include ? new RegExp(src.include, 'i') : null;
    for(const l of links){
      if(!l.h || !/^https?:/i.test(l.h)) continue;
      const board = atsFromLink(l.h); if(board) ats.set(JSON.stringify(board), board);
      if(seen.has(l.h)) continue;
      let title = l.t;
      if(!title || GENERIC.test(title) || title.length < 6) title = titleFromLink(l.h) || '';
      if(src.titleFrom === 'url'){ const p = new URL(l.h).pathname.split('/').filter(Boolean); title = deslug(p[p.length - 1]) + (p.length > 1 ? ' — ' + deslug(p[p.length - 2]) : ''); }
      if(!title || title.length > 160) continue;
      if(pat ? !pat.test(l.h) : !(isEarly(title) || titleFromLink(l.h))) continue;
      if(inc && !inc.test(title + ' ' + l.ctx)) continue;
      if(NOT_UK.test(title + ' ' + l.ctx) && !/london|\buk\b|united kingdom|emea|england|scotland|wales/i.test(title + ' ' + l.ctx)) continue;
      seen.add(l.h);
      items.push({ role:title, link:l.h, live:statusIn(l.ctx), deadline:deadlineIn(l.ctx), opens:opensIn(l.ctx), notes:notesFrom(l.ctx).slice(0, 2), location:src.location || 'London, United Kingdom' });
    }
    return { items, ats:[...ats.values()], pageNotes:notesFrom(text) };
  }finally{ await page.close().catch(() => {}); }
}

/* ---------------------------------------------------------------- helpers */
export async function pool(items, n, fn){ const out = []; let i = 0; await Promise.all(Array.from({ length:Math.min(n, items.length) }, async () => { while(i < items.length){ const k = i++; out[k] = await fn(items[k]); } })); return out; }
const slugs = name => {
  const base = name.toLowerCase().replace(/\(.*?\)/g, '').replace(/&/g, 'and').replace(/[^a-z0-9 ]/g, '').trim();
  const words = base.split(/\s+/).filter(w => !['and', 'the', 'co', 'company', 'group', 'partners', 'llp', 'inc', 'plc'].includes(w));
  return [...new Set([base.replace(/\s+/g, ''), words.join(''), words.join('-'), words[0]].filter(s => s && s.length > 2))];
};
const SIMPLE = { greenhouse:readGreenhouse, lever:readLever, ashby:readAshby, workable:readWorkable, smartrecruiters:readSmartRecruiters };
async function readBoard(src){
  if(SIMPLE[src.type]) return SIMPLE[src.type](src.board);
  if(src.type === 'workday') return readWorkday(src);
  if(src.type === 'oracle') return readOracle(src);
  if(src.type === 'sitemap') return readSitemap(src);
  if(src.type === 'coursera') return readCoursera(src);
  throw new Error('unknown source type ' + src.type);
}
const boardKey = s => [s.type, s.board || s.host || s.url, s.site || ''].join(':');

/* ---------------------------------------------------------------- turn raw rows into openings */
async function toOpenings(rows, co, src){
  const out = []; let details = 0;
  for(const j of rows || []){
    const role = String(j.role || '').replace(/\s+/g, ' ').trim(); if(!role) continue;
    if(!src.all && !isEarly(role)) continue;
    let location = j.location || src.location || '', text = j.text || '';
    let region = regionOf(location);
    const needDetail = j.detail && details < (src.maxDetails || 40) && (!region || /\d+ locations/i.test(location) || !text);
    if(needDetail){
      details++;
      try{
        const d = await j.detail();
        if(typeof d === 'string') text = d; else if(d){ text = d.text || text; if(d.location) location = d.location; if(d.postedAt) j.postedAt = d.postedAt; }
        region = regionOf(location);
        await sleep(150);
      }catch(e){}
    }
    if(!region && /\d+ locations/i.test(location) && /london|\buk\b|united kingdom/i.test(role + ' ' + text.slice(0, 600))) region = 'London';
    if(!region && src.online) region = 'Online';
    if(!region) continue;
    const programme = j.programme || src.programme || programmeOf(role);
    const ageGroup = src.age || ageOf(role) || ageOf(text.slice(0, 1500));
    const det = text ? detailsOf(text) : {};
    const o = {
      id:idOf(co.company, role, j.link), company:co.company, sector:co.sector || src.sector || 'Other', sub:co.sub || '',
      role, programme, roleType:src.roleType || roleTypeOf(role) || roleTypeOf(co.sector), ageGroup, location, region, link:j.link || '',
      postedAt:(j.postedAt || '').replace('+', ''), postedApprox:/\+$/.test(j.postedAt || ''),
      deadline:j.deadline || det.deadline || '', opens:j.opens || det.opens || '', live:j.live || '',
      visa:j.visa || det.visa || '', notes:(j.notes && j.notes.length ? j.notes : det.notes || []).slice(0, 4),
      price:j.price || src.price || '', source:src.label || src.type,
    };
    o.track = src.track || trackOf(o);
    out.push(o);
  }
  return out;
}

/* ================================================================ main */
async function main(){
  const prev  = await read('data/openings.json', { openings:[], review:[], closed:[] });
  const cache = await read('data/ats-cache.json', {});
  const watch = (await read('data/watchlist.json', { companies:[] })).companies;
  const disc  = (await read('data/discovery.json', { companies:[] })).companies;
  const srcs  = (await read('data/sources.json', { sources:[] })).sources;
  const byName = Object.fromEntries(watch.map(c => [c.company, c]));
  const onList = new Set(watch.map(c => c.company));
  const companyOf = (name, src = {}) => byName[name] || { company:name, sector:src.sector || 'Access programmes', sub:src.sub || '' };

  const found = [];                // openings from the watchlist + sources
  const review = [];               // openings from discovery firms
  const okCompanies = new Set(), failedCompanies = new Set();
  const health = {};
  const note = (c, r) => { const h = health[c] || (health[c] = { ok:false, via:[], found:0, errors:[] }); if(r.ok){ h.ok = true; if(r.via && !h.via.includes(r.via)) h.via.push(r.via); h.found += r.found || 0; } else if(r.error) h.errors.push(r.error); };
  const doneBoards = new Set();

  async function runSource(src, sink = found){
    const co = companyOf(src.company, src);
    const key = boardKey(src); if(doneBoards.has(src.company + key)) return; doneBoards.add(src.company + key);
    try{
      let rows, extra = [];
      if(src.type === 'links' || src.type === 'programme'){
        const r = await scanPage(src); rows = r.items;
        if(src.type === 'links' && r.pageNotes && r.pageNotes.length) rows.forEach(x => { if(!x.notes || !x.notes.length) x.notes = r.pageNotes.slice(0, 2); });
        extra = r.ats.filter(b => !doneBoards.has(src.company + boardKey(b)));
      }else rows = await readBoard(src);
      if(rows == null) throw new Error('no job board here');
      const list = await toOpenings(rows, co, { ...src, all:src.all || src.type === 'programme' || src.type === 'coursera' || !!src.linkPattern, label:src.label || ({ links:'firm’s own page', programme:'firm’s own page' }[src.type] || src.type) });
      sink.push(...list); okCompanies.add(co.company);
      note(co.company, { ok:true, via:src.label || src.type, found:list.length });
      log({ company:co.company, type:src.type, target:src.url || src.host || src.board, ok:true, found:list.length, raw:rows.length });
      for(const b of extra) await runSource({ ...b, company:src.company, label:b.type + ' (found on firm’s page)' }, sink);
    }catch(e){
      failedCompanies.add(co.company); note(co.company, { ok:false, error:e.message });
      log({ company:co.company, type:src.type, target:src.url || src.host || src.board, ok:false, error:e.message, robots:!!e.robots });
    }
  }

  // 1) explicit feeds & pages from data/sources.json (job systems first, then browser pages)
  const apiSrcs = srcs.filter(s => !['links', 'programme'].includes(s.type)), pageSrcs = srcs.filter(s => ['links', 'programme'].includes(s.type));
  await pool(apiSrcs, 4, s => runSource(s));
  for(const s of pageSrcs) await runSource(s);
  if(browser) await browser.close();

  // 2) watchlist firms with no explicit feed: remembered board → hints → guess the board name
  const covered = new Set(srcs.map(s => s.company));
  async function guessFirm(co, sink){
    const tried = [], cached = cache[co.company];
    const tryOne = async (type, board) => { tried.push(type + ':' + board); try{ const rows = await SIMPLE[type](board); return rows ? { rows, via:type + ':' + board } : null; }catch(e){ return null; } };
    let hit = null;
    for(const s of co.sources || []) if(!hit && SIMPLE[s.type]) hit = await tryOne(s.type, s.board);
    if(!hit && cached?.via){ const [t, b] = cached.via.split(':'); if(SIMPLE[t]) hit = await tryOne(t, b); }
    for(const h of co.hints || []) if(!hit && SIMPLE[h.type]) hit = await tryOne(h.type, h.board);
    const recheck = !cached || !cached.checked || (Date.now() - Date.parse(cached.checked)) > 7 * 864e5;
    if(!hit && recheck) for(const b of slugs(co.company)) for(const t of Object.keys(SIMPLE)){ if(hit) break; const r = await tryOne(t, b); if(r && r.rows.length) hit = r; }
    cache[co.company] = { via:hit ? hit.via : null, checked:hit || recheck ? NOW_ISO : (cached?.checked || null) };
    if(!hit){ note(co.company, { ok:false, error:'no job board found yet' }); return; }
    const list = await toOpenings(hit.rows, co, { type:hit.via.split(':')[0], label:hit.via.split(':')[0] });
    sink.push(...list); okCompanies.add(co.company); note(co.company, { ok:true, via:hit.via.split(':')[0], found:list.length });
  }
  await pool(watch.filter(c => !covered.has(c.company)), 8, c => guessFirm(c, found));
  await pool(disc.filter(c => !onList.has(c.company)), 8, c => guessFirm(c, review));

  // 3) merge: one row per programme (same firm + same title), keep the richest record
  const merge = list => {
    const m = new Map();
    for(const o of list){
      const k = o.company + '|' + norm(o.role).slice(0, 90);
      const a = m.get(k);
      if(!a) m.set(k, o);
      else for(const f of ['deadline', 'opens', 'live', 'visa', 'postedAt', 'price']) if(!a[f] && o[f]) a[f] = o[f];
      if(a && (!a.notes || !a.notes.length) && o.notes && o.notes.length) a.notes = o.notes;
    }
    return [...m.values()];
  };
  let openings = merge(found), reviewList = merge(review);

  // 4) first-seen times, and keep what we couldn't check this time
  const prevAll = [...(prev.openings || []), ...(prev.review || [])];
  const firstSeen = Object.fromEntries(prevAll.map(o => [o.id, o.detected || (o.posted ? o.posted + 'T00:00:00Z' : null)]));
  const stamp = o => { o.detected = firstSeen[o.id] || NOW_ISO; o.posted = o.detected.slice(0, 10); return o; };
  openings.forEach(stamp); reviewList.forEach(stamp);
  const ids = new Set(openings.map(o => o.id));
  const carried = (prev.openings || []).filter(o => !ids.has(o.id) && failedCompanies.has(o.company)).map(o => ({ ...o, stale:true }));
  openings.push(...carried);

  // 5) recently closed: gone from a firm we could check → closed today (kept 120 days)
  const nowIds = new Set(openings.map(o => o.id));
  const closedNow = (prev.openings || []).filter(o => !nowIds.has(o.id) && okCompanies.has(o.company) && !failedCompanies.has(o.company)).map(o => ({ id:o.id, company:o.company, role:o.role, programme:o.programme, link:o.link, detected:o.detected, closedOn:TODAY }));
  const closed = [...closedNow, ...(prev.closed || []).filter(c => !nowIds.has(c.id) && (Date.now() - Date.parse(c.closedOn)) < 120 * 864e5)]
    .filter((c, i, a) => a.findIndex(x => x.id === c.id) === i);

  const out = {
    updated:NOW_ISO,
    watchlist:watch.map(c => ({ company:c.company, sector:c.sector, sub:c.sub, addedByClaude:!!c.addedByClaude })),
    health, openings, review:reviewList, closed, log:LOG,
  };
  await writeFile('data/openings.json', JSON.stringify(out, null, 1));
  await writeFile('data/ats-cache.json', JSON.stringify(cache, null, 1));
  const byTrack = t => openings.filter(o => o.track === t).length;
  console.log(`\n✓ ${openings.length} UK openings (${byTrack('uni')} internships & spring weeks · ${byTrack('preuni')} pre-uni · ${byTrack('opps')} opportunities) · ${reviewList.length} for review · ${closedNow.length} closed since last scan`);
  console.log(`  firms with openings found: ${new Set(openings.map(o => o.company)).size} · sources failing: ${LOG.filter(l => !l.ok).length}`);
}

if(import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
