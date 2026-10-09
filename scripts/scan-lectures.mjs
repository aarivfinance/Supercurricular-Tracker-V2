// ============================================================================
// Academic lectures scanner — runs in GitHub Actions every 3 hours (see .github/workflows/scan.yml)
// Reads the hosts in data/lecture-sources.json and writes data/lectures.json.
//   • respects robots.txt (shared with scripts/scan.mjs) and identifies itself as AdmissionsHomeBot
//   • every lecture links to its own event page on the host's site
//   • hosts that fail keep their last good listings, so one bad run never empties the page
// ============================================================================
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { allowed } from './scan.mjs';

const UA = 'Mozilla/5.0 (compatible; AdmissionsHomeBot/1.0; +https://aarivfinance.github.io/Supercurricular-Tracker-V2/)';
const HEADERS = { 'user-agent':UA, 'accept-language':'en-GB,en;q=0.9' };
const T0 = Date.now(), LIMIT_MS = +(process.env.LECTURE_LIMIT_MIN || 9) * 60e3;
const timeLeft = () => LIMIT_MS - (Date.now() - T0);
const read = async (f, d) => { try{ return JSON.parse(await readFile(f, 'utf8')); }catch(e){ return d; } };

/* ---------------------------------------------------------------- dates */
const MON = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, sept:9, oct:10, nov:11, dec:12 };
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const pad = n => String(n).padStart(2, '0');
const isoOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const validDate = (y, m, d) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
export function londonToday(now = new Date()){
  const p = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
  const g = k => p.find(x => x.type === k).value; return `${g('year')}-${g('month')}-${g('day')}`;
}
const dayDiff = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 864e5);

function timeAfter(text){
  const m = String(text || '').slice(0, 70).match(/(?<![\d/])(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)|(?<![\d/.:])([01]?\d|2[0-3])[:.]([0-5]\d)(?![\d/])/i);
  if(!m) return '';
  if(m[3]){ let h = +m[1] % 12; if(/^p/i.test(m[3])) h += 12; return pad(h) + ':' + (m[2] || '00'); }
  return pad(+m[4]) + ':' + m[5];
}
/* every date-like string in the text, in order: [{date, time, index}] */
export function datesIn(text, today = londonToday()){
  text = String(text || '').replace(/\s+/g, ' ');
  const out = [], ty = +today.slice(0, 4);
  const push = (y, mo, d, idx, rest, yearGiven) => {
    if(!validDate(y, mo, d)) return;
    let iso = isoOf(y, mo, d);
    if(!yearGiven && dayDiff(iso, today) < -60 && validDate(y + 1, mo, d)) iso = isoOf(y + 1, mo, d);
    out.push({ date:iso, time:timeAfter(rest), index:idx });
  };
  let m;
  const iso = /(?<!\d)(20\d{2})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/g;
  while((m = iso.exec(text))) { if(validDate(+m[1], +m[2], +m[3])) out.push({ date:isoOf(+m[1], +m[2], +m[3]), time:m[4] ? m[4] + ':' + m[5] : '', index:m.index }); }
  const dmy = new RegExp('(?<![\\d:.])(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*[-–]\\s*\\d{1,2}(?:st|nd|rd|th)?)?\\s+' + MONTH_RE + '\\.?,?(?:\\s+(20\\d{2}))?', 'gi');
  while((m = dmy.exec(text))) push(m[3] ? +m[3] : ty, MON[m[2].slice(0, 3).toLowerCase() === 'sep' ? 'sep' : m[2].slice(0, 3).toLowerCase()], +m[1], m.index, text.slice(m.index + m[0].length), !!m[3]);
  const mdy = new RegExp(MONTH_RE + '\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![\\d:])(?:,?\\s+(20\\d{2}))?', 'gi');
  while((m = mdy.exec(text))) push(m[3] ? +m[3] : ty, MON[m[1].slice(0, 3).toLowerCase()], +m[2], m.index, text.slice(m.index + m[0].length), !!m[3]);
  const num = /(?<![\d/])(\d{1,2})\/(\d{1,2})\/(20\d{2})(?![\d/])/g;
  while((m = num.exec(text))) push(+m[3], +m[2], +m[1], m.index, text.slice(m.index + m[0].length), true);
  return out.sort((a, b) => a.index - b.index);
}
/* the first date in the text that falls in the window we care about */
export function parseWhen(text, today = londonToday(), back = 14, ahead = 240){
  return datesIn(text, today).find(d => { const n = dayDiff(d.date, today); return n >= -back && n <= ahead; }) || null;
}
/* a card's own date is the first one in it; if that is out of range the event is too (no hunting for a neighbour's date) */
export function firstWhen(text, today = londonToday(), back = 14, ahead = 240){
  const d = datesIn(text, today)[0]; if(!d) return null;
  const n = dayDiff(d.date, today); return n >= -back && n <= ahead ? d : null;
}
export function dateFromUrl(href){
  let p; try{ p = new URL(href).pathname; }catch(e){ return null; }
  const m = p.match(/\/(20\d{2})(\d{2})(\d{2})(?:(\d{2})(\d{2}))?(?=\/|$|-)/);
  if(!m || !validDate(+m[1], +m[2], +m[3])) return null;
  return { date:isoOf(+m[1], +m[2], +m[3]), time:m[4] && +m[4] < 24 ? m[4] + ':' + m[5] : '' };
}
function fromIsoLocal(s){
  // "2026-10-14T18:30:00+01:00" or "...Z" → London date and time
  const t = Date.parse(s); if(isNaN(t)) return null;
  if(!/[T ]\d{2}:\d{2}/.test(s)) return { date:s.slice(0, 10), time:'' };
  const p = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(new Date(t));
  const g = k => p.find(x => x.type === k).value;
  return { date:`${g('year')}-${g('month')}-${g('day')}`, time:`${g('hour')}:${g('minute')}` };
}

/* ---------------------------------------------------------------- what counts */
const SUBJECTS = [
  ['econ', /\b(econom\w*|inflation|interest rates?|central banks?|bank of england|financ\w*|tax(es|ation)?|budgets?|fiscal|monetary|tariffs?|trade wars?|free trade|productivity|inequalit\w*|wages?|poverty|living standards|labour market|unemployment|recession|capitalis\w*|markets?|money|debt|pensions?|housing crisis|cost of living|growth)\b/i],
  ['pol', /\b(politic\w*|democra\w*|elections?|electoral|government|parliament\w*|geopolitic\w*|wars?|conflict|diplomac\w*|foreign policy|populis\w*|nationalis\w*|public policy|prime ministers?|presiden\w*|brexit|immigration|migration|nato|empire|imperial\w*|colonial\w*|sovereignty|civil service|ministers?|westminster|authoritarian\w*|liberalism|conservatism|socialism|revolution\w*|state power)\b/i],
  ['phil', /\b(philosoph\w*|ethic\w*|moral\w*|free will|consciousness|metaphysic\w*|epistemolog\w*|virtue|utilitarian\w*|kant|aristotle|plato|socrates|hume|nietzsche|existential\w*|the good life|meaning of life|what is (truth|justice|knowledge)|personal identity|rationality)\b/i],
  ['law', /\b(law|laws|legal|courts?|judges?|judicia\w*|constitution\w*|human rights|rights|criminal|crime|justice system|supreme court|legislation|lawyers?|rule of law|trials?|jur(y|ies)|tribunals?|barristers?|solicitors?)\b/i],
];
export function classify(text){
  let best = null, n = 0;
  for(const [k, re] of SUBJECTS){ const c = (String(text || '').match(new RegExp(re.source, 'gi')) || []).length; if(c > n){ n = c; best = k; } }
  return best;
}
export const JUNK = /\b(agm|annual general meeting|open (day|evening)|meet-?ups?|fellows'? (evening|drinks|networking)|private view|members'? (evening|drinks)|tours?|concerts?|recitals?|exhibitions?|film screenings?|quiz|drinks reception|networking|jobs?|vacanc\w*|careers fair|workshop for teachers|cpd|internal|staff (training|briefing)|graduation|alumni reunion)\b/i;
const CLOSED = /\b(members only|by invitation( only)?|invitation only|invite only|not open to the public|for (lse |ucl |university )?(staff|students) only|staff and students only|closed event|private event|members of the university only)\b/i;
const CTA = /^(book( now| tickets?| your place)?|register( now)?|find out more|read more|more info(rmation)?|learn more|details|view( event)?|see more|watch( now| live)?|listen|tickets?|sign up|add to calendar|share|free|online|in person|sold out|waiting list|past events?|upcoming events?|all events|events?|what'?s on|next|previous|load more|show more)$/i;
const ONLINE = /\b(online|livestream(ed)?|live stream(ed)?|watch live|webinar|virtual|via zoom|on zoom|streamed live|broadcast live)\b/i;
const INPERSON = /\b(in[- ]person|theatre|hall|auditorium|lecture room|building|house|venue|centre|college|museum)\b/i;
export function formatOf(text){
  const on = ONLINE.test(text), inp = INPERSON.test(text);
  return on && inp ? 'In person and online' : on ? 'Online' : inp ? 'In person' : '';
}
export function tidyTitle(t){
  t = String(t || '').replace(/\s+/g, ' ').replace(/\s*\(opens in (a )?new (window|tab)\)\s*/i, ' ').trim();
  t = t.replace(/^(event|lecture|talk|webinar|panel|debate|online event|hybrid event|in-person event)\s*[:|–-]\s+/i, m => /^(lecture|debate|panel)/i.test(m) ? m : '');
  return t.replace(/\s*[|–-]\s*(lse|gresham college|ifs|rsa|institute for government|resolution foundation|the british academy)\s*$/i, '').trim();
}
const goodTitle = t => !!t && t.length >= 8 && t.length <= 220 && !CTA.test(t) && !/^\d/.test(t) && datesIn(t).length === 0;
function titleFrom(anchorText, card){
  const a = tidyTitle(anchorText.split('\n').map(s => s.trim()).filter(Boolean).sort((x, y) => y.length - x.length)[0] || '');
  if(goodTitle(a)) return a;
  for(let line of String(card || '').split('\n').map(s => tidyTitle(s))){
    const d = datesIn(line)[0];
    if(d && d.index >= 8) line = line.slice(0, d.index).replace(/[\s,;:|–-]+$/, '').replace(/\s+(mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?|sun)(day)?$/i, '').trim();
    if(goodTitle(line)) return line;
  }
  return '';
}
const cleanHref = h => { try{ const u = new URL(h); u.hash = ''; ['utm_source','utm_medium','utm_campaign','utm_content','ref'].forEach(k => u.searchParams.delete(k)); return u.href; }catch(e){ return ''; } };
const slugId = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150);

/* ---------------------------------------------------------------- fetching */
async function get(url, opts = {}){
  if(!(await allowed(url))){ const e = new Error('blocked by robots.txt'); e.robots = true; throw e; }
  const r = await fetch(url, { redirect:'follow', ...opts, headers:{ ...HEADERS, ...(opts.headers || {}) }, signal:AbortSignal.timeout(opts.timeout || 25000) });
  if(!r.ok){ const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  return r;
}
let browser = null, browserTried = false;
async function getBrowser(){
  if(browserTried) return browser; browserTried = true;
  try{ const { chromium } = await import('playwright'); browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath:process.env.CHROMIUM_PATH } : {}); }catch(e){ console.log('· no browser available, reading raw HTML only'); }
  return browser;
}
const htmlText = h => String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr|\/time|\/span)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&lsquo;/g, '’').replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&[a-z]+;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim();
/* raw HTML has no boxes to climb, so each link's "card" is the text between it and the neighbouring links to other events */
export function segmentCards(list, html){
  const sorted = list.slice().sort((a, b) => a.index - b.index);
  sorted.forEach((a, i) => {
    let s = i - 1; while(s >= 0 && sorted[s].href === a.href) s--;
    let e = i + 1; while(e < sorted.length && sorted[e].href === a.href) e++;
    const from = s >= 0 ? Math.max(sorted[s].end, a.index - 600) : Math.max(0, a.index - 300);
    const to = e < sorted.length ? Math.min(sorted[e].index, a.end + 900) : Math.min(html.length, a.end + 600);
    const seg = html.slice(from, to);
    // most listings put the date after the title, so read forwards first and only then look backwards
    a.card = (htmlText(html.slice(a.index, to)) + '\n' + htmlText(html.slice(from, a.index))).slice(0, 900);
    a.dt = (seg.match(/<time[^>]*datetime=["']([^"']+)/i) || [])[1] || '';
  });
  return list;
}
export function htmlAnchors(html, base){
  const out = [], re = /<a\b([^>]*?)href\s*=\s*["']([^"'#][^"']*)["']([^>]*)>([\s\S]*?)<\/a>/gi; let m;
  while((m = re.exec(html))){
    let href; try{ href = new URL(m[2].replace(/&amp;/g, '&'), base).href; }catch(e){ continue; }
    const text = htmlText(m[4]) || (m[1] + m[3]).match(/aria-label=["']([^"']+)/i)?.[1] || '';
    out.push({ href, text, index:m.index, end:re.lastIndex });
  }
  return out;
}
const jsonLdBlocks = html => [...String(html || '').matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
export function eventsFromJsonLd(blocks){
  const out = [];
  const walk = o => {
    if(!o || typeof o !== 'object') return;
    if(Array.isArray(o)) return o.forEach(walk);
    const t = [].concat(o['@type'] || []).join(' ');
    if(/Event\b/.test(t) && o.startDate){
      const loc = [].concat(o.location || [])[0] || {};
      const mode = String(o.eventAttendanceMode || '');
      out.push({ title:tidyTitle(o.name || ''), url:o.url || (o['@id'] && /^https?:/.test(o['@id']) ? o['@id'] : ''), start:o.startDate,
        venue:typeof loc === 'string' ? loc : (loc['@type'] === 'VirtualLocation' ? 'Online' : loc.name || ''),
        format:/Mixed/i.test(mode) ? 'In person and online' : /Online/i.test(mode) ? 'Online' : /Offline/i.test(mode) ? 'In person' : '',
        free:o.isAccessibleForFree === true || o.isAccessibleForFree === 'true' || [].concat(o.offers || []).some(x => x && (x.price === 0 || x.price === '0' || x.price === '0.00')),
        speakers:[].concat(o.performer || []).map(p => p && p.name).filter(Boolean).join(', '),
        desc:String(o.description || '').slice(0, 600) });
    }
    for(const k of ['@graph', 'itemListElement', 'item', 'subEvent', 'mainEntity']) if(o[k]) walk(o[k]);
  };
  for(const b of blocks){ try{ walk(JSON.parse(b.trim())); }catch(e){} }
  return out;
}
async function readListing(url){
  const b = await getBrowser();
  if(b){
    if(!(await allowed(url))){ const e = new Error('blocked by robots.txt'); e.robots = true; throw e; }
    const ctx = await b.newContext({ userAgent:UA, locale:'en-GB', timezoneId:'Europe/London' });
    try{
      const page = await ctx.newPage();
      const resp = await page.goto(url, { waitUntil:'domcontentloaded', timeout:35000 });
      if(resp && resp.status() >= 400){ const e = new Error('HTTP ' + resp.status()); e.status = resp.status(); throw e; }
      try{ await page.waitForLoadState('networkidle', { timeout:8000 }); }catch(e){}
      await page.waitForTimeout(1200);
      const anchors = await page.$$eval('a[href]', as => as.map(a => {
        // grow the card outwards until it would take in a link to a different event (same site section, different page)
        const key = h => { try{ const u = new URL(h); return [u.host, u.pathname.split('/').filter(Boolean)[0] || ''].join('/'); }catch(e){ return ''; } };
        const me = a.href.split('#')[0], sect = key(a.href);
        let card = a;
        for(let i = 0; i < 6; i++){
          const p = card.parentElement; if(!p || p.tagName === 'BODY' || p.tagName === 'MAIN') break;
          const others = [...p.querySelectorAll('a[href]')].map(x => x.href.split('#')[0]).filter(h => h !== me);
          if(others.some(h => key(h) === sect) || new Set(others).size > 3 || (p.innerText || '').length > 800) break;
          card = p;
        }
        const t = card.querySelector('time[datetime]');
        return { href:a.href, text:(a.innerText || a.getAttribute('aria-label') || a.title || '').trim(), card:(card.innerText || '').trim().slice(0, 900), dt:t ? t.getAttribute('datetime') : '' };
      }));
      const ld = await page.$$eval('script[type="application/ld+json"]', s => s.map(x => x.textContent || ''));
      return { anchors, ld, via:'browser' };
    }finally{ await ctx.close().catch(() => {}); }
  }
  const html = await (await get(url)).text();
  return { anchors:htmlAnchors(html, url), ld:jsonLdBlocks(html), via:'html', html };
}
async function readEventPage(url){
  const html = await (await get(url, { timeout:20000 })).text();
  const ev = eventsFromJsonLd(jsonLdBlocks(html))[0] || null;
  const og = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || [])[1] || '';
  const h1 = htmlText((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) || [])[1] || '';
  const dt = (html.match(/<time[^>]*datetime=["']([^"']+)/i) || [])[1] || '';
  const main = htmlText((html.match(/<main\b[\s\S]*?<\/main>/i) || [html])[0]).slice(0, 4000);
  return { ev, title:tidyTitle(htmlText(og) || h1), desc:htmlText(desc), dt, main };
}

/* ---------------------------------------------------------------- sources */
function siteOf(u){ try{ return new URL(u).hostname.replace(/^www\./, ''); }catch(e){ return ''; } }
export function baseDomain(h){
  const p = String(h || '').split('.');
  return p.length >= 3 && /^(ac|co|org|gov|ltd|plc|me|net|sch|nhs)$/.test(p[p.length - 2]) && p[p.length - 1].length === 2 ? p.slice(-3).join('.') : p.slice(-2).join('.');
}
function finish(src, raw, today){
  // raw: {title, link, date, time, venue, format, free, speakers, text}
  if(!raw.title || !raw.link || !raw.date) return null;
  const d = dayDiff(raw.date, today); if(d < -14 || d > 240) return null;
  if(JUNK.test(raw.title)) return null;
  if(CLOSED.test(raw.title + ' ' + (raw.text || ''))) return null;
  const s = classify(raw.title) || classify(raw.text || '');
  if(src.filter === 'subject' && !s) return null;
  return {
    id:slugId(src.name + ' ' + raw.title + ' ' + raw.date), title:raw.title, host:src.name, venue:raw.venue || '', speakers:raw.speakers || '',
    link:raw.link, date:raw.date, time:raw.time || '', city:src.city || '', format:raw.format || formatOf((raw.venue || '') + ' ' + (raw.text || '')),
    s:s || src.s || 'multi', free:raw.free || !!src.free,
  };
}
async function scanPage(src, today){
  const { anchors, ld, via, html } = await readListing(src.url);
  const items = [], seen = new Set();
  // 1. structured data on the listing page
  for(const e of eventsFromJsonLd(ld)){
    const w = fromIsoLocal(e.start); if(!w || !e.url) continue;
    const link = cleanHref(new URL(e.url, src.url).href); if(seen.has(link)) continue; seen.add(link);
    const it = finish(src, { ...e, link, date:w.date, time:w.time, text:e.desc }, today); if(it) items.push(it);
  }
  // 2. links to event pages
  const base = baseDomain(siteOf(src.url)), listing = cleanHref(src.url);
  const own = anchors.map(a => ({ ...a, href:cleanHref(a.href) })).filter(a => a.href && a.href !== listing && baseDomain(siteOf(a.href)) === base);
  const re = src.link ? new RegExp(src.link, 'i') : null;
  const deep = a => { try{ return new URL(a.href).pathname.split('/').filter(Boolean).length >= 2; }catch(e){ return false; } };
  let cands = re ? own.filter(a => { try{ return re.test(new URL(a.href).pathname); }catch(e){ return false; } }) : [];
  let mode = 'pattern';
  if(via === 'html') segmentCards(cands, html);
  if(!cands.length){
    mode = 'auto'; cands = own.filter(deep);
    if(via === 'html') segmentCards(cands, html);
    cands = cands.filter(a => a.dt ? fromIsoLocal(a.dt) : firstWhen(a.card, today));
  }
  // merge anchors that point at the same page (image link + title link + "Book" link)
  const byHref = new Map();
  for(const a of cands){ const p = byHref.get(a.href); if(!p) byHref.set(a.href, { ...a }); else { if(a.text.length > p.text.length) p.text = a.text; if(a.card.length > p.card.length) p.card = a.card; p.dt = p.dt || a.dt; } }
  let follows = 0; const maxFollow = src.maxFollow || 30;
  for(const a of byHref.values()){
    if(seen.has(a.href)) continue; seen.add(a.href);
    let title = titleFrom(a.text, a.card), when = (a.dt && fromIsoLocal(a.dt)) || dateFromUrl(a.href) || firstWhen(a.card, today);
    if(!when && datesIn(a.card, today).length) continue;   // the card shows a date, just not an upcoming one
    let venue = '', format = '', free = false, speakers = '', text = a.card;
    if(when && when.date && !when.time){ const t = datesIn(a.card, today).find(x => x.date === when.date); if(t) when = { ...when, time:t.time }; }
    const needPage = !title || !when || (src.filter === 'subject' && !classify(title + ' ' + a.card));
    if(needPage && follows < maxFollow && timeLeft() > 60e3){
      follows++;
      try{
        const pg = await readEventPage(a.href);
        if(pg.ev){ const w = fromIsoLocal(pg.ev.start); if(w) when = w; title = title || pg.ev.title; venue = pg.ev.venue; format = pg.ev.format; free = pg.ev.free; speakers = pg.ev.speakers; text += ' ' + pg.ev.desc; }
        title = title || (goodTitle(pg.title) ? pg.title : '');
        when = when || (pg.dt && fromIsoLocal(pg.dt)) || parseWhen(pg.main, today);
        text += ' ' + pg.desc + ' ' + pg.main.slice(0, 1500);
      }catch(e){ /* keep what the listing gave us */ }
    }
    if(!when) continue;
    const it = finish(src, { title, link:a.href, date:when.date, time:when.time, venue, format, free, speakers, text }, today);
    if(it) items.push(it);
  }
  return { items, note:`${via}, ${mode}, ${byHref.size} links, ${follows} pages opened` };
}
const PUBLIC_TALK = /\b(lecture|lectures|debate|in conversation|conversation with|panel discussion|book (talk|launch)|public talk|annual|memorial|keynote|address|symposium|festival)\b/i;
async function scanOxTalks(src, today){
  const items = []; let url = src.url, pages = 0;
  while(url && pages < 6 && timeLeft() > 60e3){
    pages++;
    const d = await (await get(url, { headers:{ accept:'application/json' } })).json();
    for(const t of (d._embedded && d._embedded.talks) || []){
      const title = tidyTitle(t.title || ''); if(!PUBLIC_TALK.test(title)) continue;
      const e = t._embedded || {}, w = fromIsoLocal(t.start || ''); if(!w) continue;
      const page = t._links && t._links.talks_page && t._links.talks_page.href; if(!page) continue;
      const topics = (e.topics || []).map(x => x.label).join(' ');
      const it = finish(src, { title, link:new URL(page, 'https://talks.ox.ac.uk').href, date:w.date, time:w.time,
        venue:(e.venue && e.venue.name) || '', speakers:(e.speakers || []).map(s => s.name).filter(Boolean).join(', '),
        text:[t.description || '', topics].join(' ') }, today);
      if(it) items.push(it);
    }
    const next = d._links && d._links.next && d._links.next.href;
    url = next ? new URL(next, 'https://talks.ox.ac.uk').href : null;
  }
  return { items, note:`api, ${pages} page${pages > 1 ? 's' : ''}` };
}

/* ---------------------------------------------------------------- main */
export async function main(){
  const today = londonToday();
  const cfg = await read('data/lecture-sources.json', { sources:[] });
  const prev = await read('data/lectures.json', { items:[] });
  const all = [], report = [], failed = new Set();
  for(const src of cfg.sources){
    if(timeLeft() < 45e3){ report.push({ name:src.name, url:src.url, ok:false, error:'skipped: out of time' }); failed.add(src.name); continue; }
    const t = Date.now();
    try{
      const r = src.type === 'oxtalks' ? await scanOxTalks(src, today) : await scanPage(src, today);
      all.push(...r.items);
      report.push({ name:src.name, url:src.url, ok:true, found:r.items.length, note:r.note, secs:Math.round((Date.now() - t) / 1000) });
      console.log(`✓ ${src.name} · ${r.items.length} found · ${r.note}`);
    }catch(e){
      failed.add(src.name);
      report.push({ name:src.name, url:src.url, ok:false, error:String(e.message || e).slice(0, 160) });
      console.log(`✗ ${src.name} · ${e.message}`);
    }
  }
  // a host that failed this run keeps its last good listings (if a source of the same host worked, its new results win)
  const worked = new Set(report.filter(r => r.ok).map(r => r.name));
  for(const it of prev.items || []) if(failed.has(it.host) && !worked.has(it.host) && dayDiff(it.date, today) >= -14) all.push({ ...it, stale:true });
  // de-duplicate: same page, or same host + title + date
  const out = [], seenLink = new Set(), seenKey = new Set();
  for(const it of all.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))){
    const key = (it.host + '|' + it.title + '|' + it.date).toLowerCase();
    if(seenLink.has(it.link) || seenKey.has(key)) continue;
    seenLink.add(it.link); seenKey.add(key); out.push(it);
  }
  const doc = { updated:new Date().toISOString(), took:+((Date.now() - T0) / 60e3).toFixed(1), items:out, sources:report };
  await writeFile('data/lectures.json', JSON.stringify(doc, null, 1) + '\n');
  console.log(`→ ${out.length} lectures written (${report.filter(r => r.ok).length}/${report.length} hosts read) in ${doc.took} min`);
}

if(import.meta.url === pathToFileURL(process.argv[1] || '').href){
  const hard = setTimeout(() => { console.error('✗ lecture scan took too long — stopping'); process.exit(1); }, LIMIT_MS + 90e3);
  try{ await main(); }
  catch(e){ console.error('✗ lecture scan failed:', e); process.exitCode = 1; }
  finally{ clearTimeout(hard); if(browser) await browser.close().catch(() => {}); }
  process.exit(process.exitCode || 0);
}
