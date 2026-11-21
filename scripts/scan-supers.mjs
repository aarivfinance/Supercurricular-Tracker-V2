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

// discovery: new competition links on listing pages (mostly Oxford/Cambridge college pages), plus
// "this page's competition wording changed" for pages marked watch:true (e.g. '2027 competition now open')
const known = new Set(items.map(i => i.link.replace(/\/$/, '')));
const firstSeen = Object.fromEntries((prev.discovered || []).map(d => [d.link, d.found]));
const firstRun = !prev.watch;                      // first run only records what's there, so nothing floods in
out.watch = {};
const SKIP = /winner|result|previous|past |archive|report|terms|privacy|cookie|news\b/i;
const srcs = JSON.parse(await readFile('data/sc-discovery.json', 'utf8')).sources || [];
for(const s of srcs){
  try{
    const r = await fetch(s.url, { headers:UA, redirect:'follow', signal:AbortSignal.timeout(20000) });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const html = await r.text(), host = new URL(r.url || s.url).hostname.replace(/^www\./, '');
    for(const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{6,160}?)<\/a>/gi)){
      const title = text(m[2]).trim();
      let link; try{ link = new URL(m[1], s.url).href.replace(/\/$/, '').replace(/#.*$/, ''); }catch(e){ continue; }
      if(!/^https?:/.test(link) || new URL(link).hostname.replace(/^www\./, '') !== host) continue;   // the college's own pages only
      if(!COMP.test(title) || SKIP.test(title) || known.has(link) || link === s.url.replace(/\/$/, '') || out.discovered.some(d => d.link === link)) continue;
      out.discovered.push({ id:slug(title) + '-' + createHash('sha1').update(link).digest('hex').slice(0, 6), t:title, link, s:s.subject || 'multi', via:s.name || host, found:firstSeen[link] || (firstRun ? null : today) || today, quiet:firstRun && !firstSeen[link] });
    }
    if(s.watch){
      const t = text(html);
      const lines = (t.match(/[^.!?]{0,160}\b(?:competition|prize|essay|deadline|open|closed?|questions?)\b[^.!?]{0,160}/gi) || []).filter(x => /20\d\d|open|closed?/i.test(x)).join('|');
      const hash = createHash('sha1').update(lines).digest('hex').slice(0, 12), p = (prev.watch || {})[s.url] || {};
      const changedOn = p.hash && p.hash !== hash ? today : (p.changedOn || null);
      out.watch[s.url] = { hash, checked:now, changedOn };
      if(changedOn && (Date.now() - Date.parse(changedOn)) < 21 * 864e5){
        const id = 'upd-' + createHash('sha1').update(s.url + changedOn).digest('hex').slice(0, 10);
        out.discovered.push({ id, t:(s.name || host) + ' — page updated (check for a new round)', link:s.url, s:s.subject || 'multi', via:'page watch', found:changedOn });
      }
    }
  }catch(e){ console.warn('✗', s.url, e.message); out.watch[s.url] = (prev.watch || {})[s.url] || { error:e.message }; }
}
// email: anything new today joins the openings alert (the workflow turns data/alert.md into a GitHub issue → email)
const freshFinds = out.discovered.filter(d => d.found === today && !d.quiet && !(prev.discovered || []).some(x => x.id === d.id));
out.discovered.forEach(d => delete d.quiet);
if(freshFinds.length && !firstRun){
  const prevAlert = await readFile('data/alert.md', 'utf8').catch(() => '');
  const block = `${freshFinds.length} new competition find${freshFinds.length > 1 ? 's' : ''} (Oxford/Cambridge colleges and listing pages):\n\n` +
    freshFinds.map(d => `- **${d.t}** (via ${d.via})\n  ${d.link}`).join('\n') + `\n\nReview them: https://aarivfinance.github.io/Supercurricular-Tracker-V2/#supercurriculars (New finds tab)\n`;
  await writeFile('data/alert.md', (prevAlert ? prevAlert.trim() + '\n\n---\n\n' : '') + block);
}
await writeFile('data/supercurriculars-live.json', JSON.stringify(out, null, 1));
const ch = Object.values(out.items).filter(i => i.changedOn === today).length;
console.log(`✓ ${items.length} pages checked, ${ch} changed today, ${out.discovered.length} new finds`);

// Academic lectures: scanned here and stored inside supercurriculars-live.json as well, so the existing workflow commits them
try{ const { run } = await import('./scan-lectures.mjs'); await run({ embed:'data/supercurriculars-live.json' }); }
catch(e){ console.warn('✗ lectures:', e.message); }
process.exit(0);
