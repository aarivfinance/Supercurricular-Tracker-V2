// Checks every supercurricular's official page: detects when it changes and pulls out any dates it mentions.
// Also scans the listing pages in data/sc-discovery.json for new competitions → the site's "New finds" review tab.
// Run: node scripts/scan-supers.mjs   (Node 20+)
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const strip = s => String(s ?? '').replace(/<[^>]*>/g, '');
const slug = s => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const UA = { 'user-agent': 'Mozilla/5.0 (application-hub scanner)' };
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE = new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\s+20\\d\\d\\b|\\b${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+20\\d\\d\\b`, 'gi');
const CUE = /(deadline|closes?|closing|submi|register|registration|opens?|launch|entr(y|ies)|final|round|results?)/i;
const COMP = /(competition|prize|olympiad|challenge|essay|summer school|programme|debate|moot|award)/i;

const ctx = { window:{} }; vm.createContext(ctx);
vm.runInContext(await readFile('assets/data/supercurriculars.js', 'utf8') + ';window.D=DATA;', ctx);
const items = [];
for(const y of Object.keys(ctx.window.D)) for(const g of ctx.window.D[y]) for(const it of g.items) if(it.link) items.push({ id:y + ':' + slug(it.t), t:strip(it.t), link:it.link });

const prev = JSON.parse(await readFile('data/supercurriculars-live.json', 'utf8').catch(() => '{"items":{},"discovered":[]}'));
const now = new Date().toISOString(), today = now.slice(0, 10);
const text = html => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

const out = { updated:now, items:{}, discovered:[] };
await Promise.all(items.map(async it => {
  const p = prev.items?.[it.id] || {};
  try{
    const r = await fetch(it.link, { headers:UA, redirect:'follow', signal:AbortSignal.timeout(20000) });
    const t = text(await r.text());
    const dates = [];
    for(const m of t.matchAll(DATE)){
      const ctxt = t.slice(Math.max(0, m.index - 90), m.index + m[0].length + 40).trim();
      if(CUE.test(ctxt) && !dates.some(d => d.date === m[0])) dates.push({ date:m[0], context:ctxt });
    }
    const hash = createHash('sha1').update(dates.map(d => d.date).join('|') + '|' + t.length).digest('hex').slice(0, 12);
    const changed = p.hash && p.hash !== hash;
    out.items[it.id] = { ok:r.ok, checked:now, hash, dates:dates.slice(0, 6), changedOn: changed ? today : (p.changedOn || null) };
  }catch(e){ out.items[it.id] = { ok:false, checked:now, error:e.message, hash:p.hash, dates:p.dates || [], changedOn:p.changedOn || null }; }
}));

// discovery
const known = new Set(items.map(i => i.link.replace(/\/$/, '')));
const firstSeen = Object.fromEntries((prev.discovered || []).map(d => [d.link, d.found]));
const srcs = JSON.parse(await readFile('data/sc-discovery.json', 'utf8')).sources || [];
for(const s of srcs){
  try{
    const html = await (await fetch(s.url, { headers:UA, signal:AbortSignal.timeout(20000) })).text();
    for(const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{6,160}?)<\/a>/gi)){
      const title = text(m[2]).trim(), link = new URL(m[1], s.url).href.replace(/\/$/, '');
      if(!COMP.test(title) || known.has(link) || out.discovered.some(d => d.link === link)) continue;
      out.discovered.push({ id:slug(title) + '-' + createHash('sha1').update(link).digest('hex').slice(0, 6), t:title, link, s:s.subject || 'multi', via:s.name || new URL(s.url).hostname, found:firstSeen[link] || today });
    }
  }catch(e){ console.warn('✗', s.url, e.message); }
}
await writeFile('data/supercurriculars-live.json', JSON.stringify(out, null, 1));
const ch = Object.values(out.items).filter(i => i.changedOn === today).length;
console.log(`✓ ${items.length} pages checked, ${ch} changed today, ${out.discovered.length} new finds`);
