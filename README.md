# Admissions Home

A static site (no build step) for GitHub Pages.

| Menu | Page | Data |
|---|---|---|
| Academics | Revision resources | `assets/data/resources.js` + your own additions |
| Academics | Universities | `assets/data/universities.js` + your own additions |
| Co-curriculars | Supercurriculars | `assets/data/supercurriculars.js` (ported from the old planner) |
| Co-curriculars | Extracurriculars | entered on the site |
| Professional | Openings tracker | `data/openings.json`, rewritten every 3 hours by `scripts/scan.mjs` from Workday, Oracle, Greenhouse/Lever/Ashby, careers sitemaps, firms' own pages, Sutton Trust, Springpod, Rare, upReach and Coursera (config: `data/watchlist.json`, `data/sources.json`) |
| Professional | Work experience, Contacts, CV builder | entered on the site |

Anything you type is saved in your browser's localStorage, not in the repo, so personal
contacts never become public. Use **Overview → Export backup** to move it to another device.

`supercurricular_calendar.html` now redirects to `index.html#supercurriculars` so old links keep working.
