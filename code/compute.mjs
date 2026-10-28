// Ireland Clinical Trials Performance Index: indicators from the raw rows (2026-10-27).
// Reads scratch/trials_index/raw_<country>.json (fetch.mjs) and writes the release file
// public_html/data/trials_index/<edition>.json plus CSVs in public_html/downloads/trials-index/<edition>/.
// Every figure is a count or share of ClinicalTrials.gov records; definitions are in METHOD below and on the page.
// Usage: node scripts/trials_index/compute.mjs 2026-q4
import fs from 'fs';

const EDITION = process.argv[2] || '2026-q4';
const RAW = 'scratch/trials_index';
const OUT_JSON = `public_html/data/trials_index/${EDITION}.json`;
const OUT_CSV = `public_html/downloads/trials-index/${EDITION}`;

// Eurostat tps00001, population on 1 January 2025 (retrieved 27 Oct 2026)
const POP = { Ireland: 5440278, Denmark: 5992734, Finland: 5635971, Norway: 5594340, Sweden: 10587710, Belgium: 11883495,
  Netherlands: 18044027, Austria: 9197213, Switzerland: 9051029, Portugal: 11387222, Czechia: 10909500 };
const CODE = { Ireland: 'IE', Denmark: 'DK', Finland: 'FI', Norway: 'NO', Sweden: 'SE', Belgium: 'BE', Netherlands: 'NL', Austria: 'AT', Switzerland: 'CH', Portugal: 'PT', Czechia: 'CZ' };

const W0 = 2021, W1 = 2025;          // five full start years
const C0 = 2016, C1 = 2025;          // primary-completion window for completion rate
const R0 = 2016, R1 = 2024;          // primary-completion window for results (leaves 12+ months to report)
const yr = d => parseInt(String(d).slice(0, 4), 10) || 0;
const mon = d => String(d).slice(0, 7);
const day = d => { const s = String(d); return new Date(s.length === 7 ? s + '-15' : s.length === 4 ? s + '-07-01' : s); };
// A start or primary completion counts as having happened when the registry marks it ACTUAL, or when the record
// predates the 2017 date-type field (no type), the date is past and the status shows the trial ran (QC 2026-10-27:
// 34% of Irish and 49% of Danish 2014-2016 records carry no type, so ACTUAL alone undercounted the early years).
const TODAY = new Date().toISOString().slice(0, 10);
const NEVER_RAN = new Set(['WITHDRAWN', 'NOT_YET_RECRUITING']);
const started = r => r.st === 'ACTUAL' || (r.st === '' && r.s !== '' && r.s.slice(0, 10) <= TODAY && !NEVER_RAN.has(r.o));
const pcDone = r => r.pct === 'ACTUAL' || (r.pct === '' && r.pc !== '' && r.pc.slice(0, 10) <= TODAY && (r.o === 'COMPLETED' || r.o === 'TERMINATED'));
const isEarly = ph => ph.some(p => p === 'EARLY_PHASE1' || p === 'PHASE1');
const isLate = ph => ph.some(p => /PHASE[234]/.test(p));
const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : null;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), h = s.length >> 1; return Math.round((s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2) * 10) / 10; };

function indicators(rows, pop) {
  const yrs = W1 - W0 + 1, pm = pop / 1e6;
  const win = rows.filter(r => started(r) && yr(r.s) >= W0 && yr(r.s) <= W1);
  const ind = win.filter(r => r.cl === 'INDUSTRY');
  const early = win.filter(r => isEarly(r.ph));
  const pros = win.filter(r => r.sub && mon(r.sub) <= mon(r.s));
  const closed = rows.filter(r => pcDone(r) && yr(r.pc) >= C0 && yr(r.pc) <= C1 && (r.o === 'COMPLETED' || r.o === 'TERMINATED'));
  const done = rows.filter(r => r.o === 'COMPLETED' && pcDone(r) && yr(r.pc) >= R0 && yr(r.pc) <= R1 && isLate(r.ph));
  const res12 = done.filter(r => r.res && (day(r.res) - day(r.pc)) / 864e5 <= 365);
  const resAny = done.filter(r => r.res);
  const since2014 = rows.filter(r => yr(r.s) >= 2014 && yr(r.s) <= W1);
  const unknown = since2014.filter(r => r.o === 'UNKNOWN');
  const dur = win.length ? rows.filter(r => started(r) && pcDone(r) && yr(r.pc) >= C0 && yr(r.pc) <= C1 && isLate(r.ph) && r.cl === 'INDUSTRY')
    .map(r => (day(r.pc) - day(r.s)) / 2629.8e6).filter(m => m > 0 && m < 240) : [];
  const byYear = {};
  for (let y = 2014; y <= W1; y++) byYear[y] = { n: 0, industry: 0 };
  for (const r of rows) { const y = yr(r.s); if (started(r) && byYear[y]) { byYear[y].n++; if (r.cl === 'INDUSTRY') byYear[y].industry++; } }
  return {
    starts: win.length, startsPm: Math.round(win.length / yrs / pm * 10) / 10,
    industryStarts: ind.length, industryPm: Math.round(ind.length / yrs / pm * 10) / 10, industryShare: pct(ind.length, win.length),
    earlyStarts: early.length, earlyShare: pct(early.length, win.length),
    prospective: pros.length, prospectiveShare: pct(pros.length, win.length),
    closed: closed.length, completedShare: pct(closed.filter(r => r.o === 'COMPLETED').length, closed.length),
    resultsBase: done.length, results12: res12.length, results12Share: pct(res12.length, done.length), resultsAnyShare: pct(resAny.length, done.length),
    startedSince2014: since2014.length, unknownShare: pct(unknown.length, since2014.length),
    nationalOnlyShare: pct(win.filter(r => r.nc === 1).length, win.length),
    medianMonthsIndustryLate: dur.length >= 20 ? Math.round(median(dur) * 10) / 10 : null,
    byYear,
  };
}

// indicator registry: key, label, unit, direction (1 = higher is better, -1 = lower is better, 0 = context only)
const IND = [
  ['startsPm', 'Trials started per million people', 'per million a year', 1],
  ['industryPm', 'Industry-sponsored trials per million people', 'per million a year', 1],
  ['earlyShare', 'Early-phase share of new trials', '% of starts', 1],
  ['prospectiveShare', 'Registered before the first patient', '% of starts', 1],
  ['completedShare', 'Completed rather than stopped early', '% of closed trials', 1],
  ['resultsAnyShare', 'Results posted at all', '% of completed phase 2–4', 1],
  ['results12Share', 'Results posted within 12 months', '% of completed phase 2–4', 1],
  ['unknownShare', 'Records gone stale', '% of trials since 2014', -1],
  ['medianMonthsIndustryLate', 'Median length, industry phase 2–4', 'months, start to primary completion', 0],
];

const countries = Object.keys(POP).filter(c => fs.existsSync(`${RAW}/raw_${c}.json`));
const data = {}, fetched = {};
for (const c of countries) {
  const j = JSON.parse(fs.readFileSync(`${RAW}/raw_${c}.json`, 'utf8'));
  fetched[c] = j.fetchedAt;
  data[c] = indicators(j.rows, POP[c]);
}
const ranks = {};
for (const [k, , , dir] of IND) {
  if (!dir) continue;
  const vals = countries.filter(c => data[c][k] != null).sort((a, b) => dir * (data[b][k] - data[a][k]));
  // rank = 1 + countries strictly better; tiedWith names peers with the same rounded value (shown as "joint")
  const better = vals.filter(c => c !== 'Ireland' && dir * (data[c][k] - data.Ireland[k]) > 0).length;
  ranks[k] = { order: vals, ie: better + 1, of: vals.length, tiedWith: vals.filter(c => c !== 'Ireland' && data[c][k] === data.Ireland[k]),
    median: median(countries.filter(c => c !== 'Ireland').map(c => data[c][k]).filter(v => v != null)) }; // median of the ten comparison countries
}

// ── Ireland deep dive ──
const ie = JSON.parse(fs.readFileSync(`${RAW}/raw_Ireland.json`, 'utf8')).rows;
const ieWin = ie.filter(r => started(r) && yr(r.s) >= W0 && yr(r.s) <= W1);
const tally = (arr, f) => { const m = {}; for (const r of arr) for (const k of [].concat(f(r)).filter(Boolean)) m[k] = (m[k] || 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]); };

// quarterly starts (actual) for the last 12 complete quarters + current part quarter
const quarters = {};
for (const r of ie) {
  if (!started(r) || String(r.s).length < 7) continue;
  const y = yr(r.s), q = Math.floor((parseInt(String(r.s).slice(5, 7), 10) - 1) / 3) + 1;
  if (y < 2023) continue;
  const key = `${y} Q${q}`;
  quarters[key] ??= { n: 0, industry: 0 };
  quarters[key].n++; if (r.cl === 'INDUSTRY') quarters[key].industry++;
}

// therapeutic areas: top-level MeSH disease categories from the condition ancestors
const AREAS = [
  ['Cancer', /^Neoplasms$/], ['Heart and circulation', /^Cardiovascular Diseases$/], ['Brain and nerves', /^Nervous System Diseases$/],
  ['Mental health', /^Mental Disorders$|^Behavior and Behavior Mechanisms$/], ['Metabolism and diabetes', /^Nutritional and Metabolic Diseases$/],
  ['Immune system', /^Immune System Diseases$/], ['Infections', /^Infections$|^Bacterial Infections and Mycoses$|^Virus Diseases$/],
  ['Lungs and breathing', /^Respiratory Tract Diseases$/], ['Digestive system', /^Digestive System Diseases$/],
  ['Skin', /^Skin and Connective Tissue Diseases$/], ['Kidney, urinary and reproductive', /^Urogenital Diseases$|^Male Urogenital Diseases$|^Female Urogenital Diseases and Pregnancy Complications$/],
  ['Muscles and bones', /^Musculoskeletal Diseases$/], ['Eyes', /^Eye Diseases$/], ['Blood', /^Hemic and Lymphatic Diseases$/],
];
const areaOf = r => [...new Set(AREAS.filter(([, re]) => (r.mesh || []).some(t => re.test(t))).map(([n]) => n))];
const areas = tally(ieWin, areaOf).slice(0, 10).map(([n, v]) => ({ area: n, n: v, industry: ieWin.filter(r => r.cl === 'INDUSTRY' && areaOf(r).includes(n)).length }));

// hospitals: one key per hospital however it is spelt (same rules as cron/build_ie_trials_kpi.php iekSiteKey)
function siteKey(f) {
  let k = f.toLowerCase().replace(/['’]s\b/g, '').replace(/\bsaint\b/g, 'st')
    .replace(/university college hospital galway/, 'university hospital galway').replace(/waterford regional hospital/, 'university hospital waterford')
    .replace(/mid[- ]western regional hospital/, 'university hospital limerick').replace(/^.*\badelaide\b.*\bmeath\b.*$/, 'tallaght university hospital')
    .replace(/^.*\bour lady\S* children\S* hospital.*$/, 'childrens health ireland crumlin').replace(/atlantia food clinical trials/, 'atlantia clinical trials')
    .replace(/\b(the|of|and|&)\b/g, ' ').replace(/[^a-z0-9 ]+/g, '');
  return k.split(' ').filter(Boolean).map(w => w.length > 3 ? w.replace(/s$/, '') : w).sort().join(' ');
}
const placeholder = /\b(research|investigat\w*|clinical|study|trial|local)\b.*\b(site|institution|location|centre|center)\b|^site\b|\bsite \d+$/i;
const siteN = {}, siteName = {};
for (const r of ieWin) {
  const seen = new Set();
  for (const s of r.sites || []) {
    const [fac, city] = s.split('|');
    if (!fac || placeholder.test(fac)) continue;
    const k = siteKey(fac) + '|' + city.toLowerCase();
    if (seen.has(k)) continue; seen.add(k);
    siteN[k] = (siteN[k] || 0) + 1;
    const nm = fac + (city ? ', ' + city : '');
    (siteName[k] ??= {})[nm] = (siteName[k][nm] || 0) + 1;
  }
}
const hospitals = Object.entries(siteN).sort((a, b) => b[1] - a[1]).slice(0, 12)
  .map(([k, n]) => ({ site: Object.entries(siteName[k]).sort((a, b) => b[1] - a[1])[0][0], n }));
const namedShare = pct(ieWin.filter(r => (r.sites || []).some(s => { const f = s.split('|')[0]; return f && !placeholder.test(f); })).length, ieWin.length);

const sponsors = tally(ieWin, r => r.sp).slice(0, 12).map(([s, n]) => ({ sponsor: s, n, industry: ieWin.find(r => r.sp === s)?.cl === 'INDUSTRY' }));

// why trials stopped early (terminated, primary completion 2016-2025), keyword buckets
const term = ie.filter(r => r.o === 'TERMINATED' && pcDone(r) && yr(r.pc) >= C0 && yr(r.pc) <= C1);
// reasons were read by hand and labelled in scripts/trials_index/review_why_stopped.py (QC 2026-10-27: keyword
// matching mislabelled 25 of 95); every terminated trial must have a reviewed label
const REVIEWED = JSON.parse(fs.readFileSync('public_html/data/trials_index/why_stopped_reviewed.json', 'utf8'));
const unreviewed = term.filter(r => !REVIEWED[r.id]).map(r => r.id);
if (unreviewed.length) throw new Error('why-stopped labels missing, run review_why_stopped.py and review: ' + unreviewed.join(' '));
const whyStopped = {};
for (const r of term) whyStopped[REVIEWED[r.id]] = (whyStopped[REVIEWED[r.id]] || 0) + 1;

const phaseMix = { 'Early phase (1 and 1/2)': 0, 'Phase 2': 0, 'Phase 3': 0, 'Phase 4': 0, 'Not phased (devices, procedures, behaviour)': 0 };
for (const r of ieWin) {
  const ph = r.ph;
  if (isEarly(ph)) phaseMix['Early phase (1 and 1/2)']++;
  else if (ph.includes('PHASE3')) phaseMix['Phase 3']++;
  else if (ph.includes('PHASE2')) phaseMix['Phase 2']++;
  else if (ph.includes('PHASE4')) phaseMix['Phase 4']++;
  else phaseMix['Not phased (devices, procedures, behaviour)']++;
}

// peer median per year (trials started per million) and the size of Ireland's gap
const peers = countries.filter(c => c !== 'Ireland');
const trend = Object.keys(data.Ireland.byYear).map(y => ({ year: +y,
  ie: Math.round(data.Ireland.byYear[y].n / (POP.Ireland / 1e6) * 10) / 10,
  peerMedian: Math.round(median(peers.map(c => data[c].byYear[y].n / (POP[c] / 1e6))) * 10) / 10 }));
const gap = { perYear: Math.round((ranks.startsPm.median - data.Ireland.startsPm) * POP.Ireland / 1e6),
  industryPerYear: Math.round((ranks.industryPm.median - data.Ireland.industryPm) * POP.Ireland / 1e6) };
const uniqueTrials = new Set(countries.flatMap(c => JSON.parse(fs.readFileSync(`${RAW}/raw_${c}.json`, 'utf8')).rows.filter(r => yr(r.s) >= 2014 && yr(r.s) <= W1).map(r => r.id))).size;
const recruitingNow = ie.filter(r => r.o === 'RECRUITING').length;
const out = {
  edition: EDITION, title: 'Ireland Clinical Trials Performance Index', published: new Date().toISOString().slice(0, 10),
  fetchedAt: fetched, source: 'ClinicalTrials.gov API v2 (interventional studies with a site in the country, start date 2014 or later); population: Eurostat tps00001, 1 January 2025',
  windows: { starts: [W0, W1], completion: [C0, C1], results: [R0, R1] },
  population: POP, codes: CODE, indicators: IND.map(([key, label, unit, dir]) => ({ key, label, unit, dir })),
  countries: data, ranks,
  trend, gap, uniqueTrials, countryRecords: countries.reduce((a, c) => a + data[c].startedSince2014, 0),
  ireland: { recruitingNow, quarters, areas, hospitals, namedSiteShare: namedShare, sponsors, whyStopped, terminatedBase: term.length, phaseMix, windowStarts: ieWin.length },
};
fs.mkdirSync(OUT_JSON.replace(/\/[^/]+$/, ''), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 1));

// CSV downloads
fs.mkdirSync(OUT_CSV, { recursive: true });
const esc = v => v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
const csv = (f, head, rows) => fs.writeFileSync(`${OUT_CSV}/${f}`, '﻿' + [head, ...rows].map(r => r.map(esc).join(',')).join('\n') + '\n');
csv('indicators_by_country.csv', ['country', 'population_2025', ...IND.map(i => i[0]), 'starts_2021_2025', 'industry_starts_2021_2025', 'completed_phase2_4_base', 'closed_trials_base'],
  countries.map(c => [c, POP[c], ...IND.map(i => data[c][i[0]]), data[c].starts, data[c].industryStarts, data[c].resultsBase, data[c].closed]));
csv('ireland_starts_by_year.csv', ['year', 'trials_started', 'industry_sponsored'], Object.entries(data.Ireland.byYear).map(([y, v]) => [y, v.n, v.industry]));
csv('ireland_starts_by_quarter.csv', ['quarter', 'trials_started', 'industry_sponsored'], Object.entries(quarters).sort().map(([q, v]) => [q, v.n, v.industry]));
csv('ireland_hospitals_2021_2025.csv', ['hospital', 'trials_started_2021_2025'], hospitals.map(h => [h.site, h.n]));
csv('ireland_therapy_areas_2021_2025.csv', ['area', 'trials', 'industry_trials'], areas.map(a => [a.area, a.n, a.industry]));
console.log(JSON.stringify({ countries, ranks: Object.fromEntries(Object.entries(ranks).map(([k, v]) => [k, `${v.ie}/${v.of}`])), ie: data.Ireland }, null, 1));
