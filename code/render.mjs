// Ireland Clinical Trials Performance Index: renders one edition to static HTML (2026-10-27).
// Reads public_html/data/trials_index/<edition>.json (compute.mjs) and writes
// public_html/data/trials_index/<edition>.body.html, which trials-index.php wraps in the site header and footer.
// Charts are HTML and inline SVG built here, so every number is in the page source (no client-side charting).
// Usage: node scripts/trials_index/render.mjs 2026-q4
import fs from 'fs';

const EDITION = process.argv[2] || '2026-q4';
const D = JSON.parse(fs.readFileSync(`public_html/data/trials_index/${EDITION}.json`, 'utf8'));
const OUT = `public_html/data/trials_index/${EDITION}.body.html`;
const DL = `/downloads/trials-index/${EDITION}`;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n1 = v => v == null ? 'n/a' : Number(v).toLocaleString('en-IE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const n0 = v => v == null ? 'n/a' : Math.round(v).toLocaleString('en-IE');
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const C = D.countries, R = D.ranks, IE = C.Ireland, I = D.ireland;
const IND = Object.fromEntries(D.indicators.map(i => [i.key, i]));
const fmt = (k, v) => /Share$/.test(k) ? n1(v) + '%' : n1(v);
const countries = Object.keys(C);
const peers = countries.filter(c => c !== 'Ireland');
const pubDate = new Date(D.published + 'T12:00:00Z').toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
const dataDate = new Date(D.fetchedAt.Ireland).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
const lastT = D.trend[D.trend.length - 1];
const gaps = D.trend.map(t => t.peerMedian - t.ie);
const belowAll = gaps.every(g => g > 0);
const pm = I.phaseMix, pmTot = Object.values(pm).reduce((a, b) => a + b, 0);
const top = R.startsPm.order[0];
const ratioTop = C[top].startsPm / IE.startsPm;

// ── small builders ──
const tip = (t) => ` tabindex="0" data-tip="${esc(t)}"`;

/** Rank strip: every country as a dot on one axis, Ireland emphasised, peer median as a tick. */
function strip(key) {
  const ind = IND[key], vals = countries.map(c => [c, C[c][key]]).filter(([, v]) => v != null);
  const lo = Math.min(...vals.map(v => v[1])), hi = Math.max(...vals.map(v => v[1]));
  const pad = (hi - lo) * 0.06 || 1, a = lo - pad, b = hi + pad;
  const x = v => ((v - a) / (b - a) * 100).toFixed(2);
  const flip = ind.dir === -1; // lower is better: draw better to the right for every row
  const pos = v => flip ? (100 - x(v)).toFixed(2) : x(v);
  const med = R[key]?.median;
  const dots = vals.filter(([c]) => c !== 'Ireland').map(([c, v]) =>
    `<span class="ti-dot" style="left:${pos(v)}%"${tip(`${c}: ${fmt(key, v)}`)}><i>${D.codes[c]}</i></span>`).join('');
  return `<div class="ti-strip" role="img" aria-label="${esc(`${ind.label}: Ireland ${fmt(key, IE[key])}, ${ord(R[key].ie)} of ${R[key].of}; peer median ${fmt(key, med)}`)}">
    <span class="ti-strip-axis"></span>
    ${med != null ? `<span class="ti-med" style="left:${pos(med)}%"${tip(`Median of the 10 comparison countries: ${fmt(key, med)}`)}></span>` : ''}
    ${dots}
    <span class="ti-dot ti-dot-ie" style="left:${pos(IE[key])}%"${tip(`Ireland: ${fmt(key, IE[key])}`)}><b>${fmt(key, IE[key])}</b></span>
    ${[R[key].order[0], R[key].order[R[key].order.length - 1]].filter(c => c !== 'Ireland').map((c, i) =>
      `<span class="ti-ext${i ? ' is-lo' : ' is-hi'}" style="left:${pos(C[c][key])}%">${esc(c)} ${fmt(key, C[c][key])}</span>`).join('')}
  </div>`;
}

/** Above / below / level against the peer median, in words as well as colour. */
function signal(key) {
  const d = IND[key].dir, v = IE[key], m = R[key].median;
  if (v === m) return '<em class="ti-sig is-lv">= level with median</em>';
  return (v - m) * d > 0 ? '<em class="ti-sig is-up">&#9650; above median</em>' : '<em class="ti-sig is-dn">&#9660; below median</em>';
}

/** Horizontal bars, one series; Ireland (or a named row) emphasised. Values at the tip. */
function hbars(rows, { max, unit = '', emph = 'Ireland', valFmt = n1, label = r => r[0] } = {}) {
  const m = max ?? Math.max(...rows.map(r => r[1]));
  return `<ol class="ti-hbars${emph ? ' has-emph' : ''}">${rows.map(r => {
    const w = (r[1] / m).toFixed(4), e = r[0] === emph;
    return `<li class="${e ? 'is-ie' : ''}"${tip(`${label(r)}: ${valFmt(r[1])}${unit}`)}><span class="ti-hb-l">${esc(label(r))}</span><span class="ti-hb-t"><span class="ti-hb-b" style="--w:${w}"></span><span class="ti-hb-v">${valFmt(r[1])}${unit}</span></span></li>`;
  }).join('')}</ol>`;
}

/** Two-part horizontal bars (industry + other), legend above. */
function hstack(rows, keys, labels) {
  const m = Math.max(...rows.map(r => r.total));
  return `<div class="ti-legend"><span><i class="sw sw-a"></i>${labels[0]}</span><span><i class="sw sw-b"></i>${labels[1]}</span></div>
  <ol class="ti-hbars ti-hstack">${rows.map(r => {
    const a = r[keys[0]], b = r.total - a;
    return `<li${tip(`${r.name}: ${r.total} trials, ${a} ${labels[0].toLowerCase()}, ${b} ${labels[1].toLowerCase()}`)}><span class="ti-hb-l">${esc(r.name)}</span><span class="ti-hb-t"><span class="ti-hb-b sw-a" style="--w:${(a / m).toFixed(4)}"></span><span class="ti-hb-b sw-b" style="--w:${(b / m).toFixed(4)}"></span><span class="ti-hb-v">${r.total}</span></span></li>`;
  }).join('')}</ol>`;
}

/** Line chart, two series on one axis: Ireland vs peer median. HTML axis labels over a stretched SVG plot. */
function lineChart(trend) {
  const ys = trend.map(t => t.year), maxV = Math.ceil(Math.max(...trend.flatMap(t => [t.ie, t.peerMedian])) / 10) * 10;
  const X = i => i / (ys.length - 1) * 100, Y = v => 100 - v / maxV * 100;
  const path = k => trend.map((t, i) => `${i ? 'L' : 'M'}${X(i).toFixed(2)},${Y(t[k]).toFixed(2)}`).join(' ');
  const gap = `M${trend.map((t, i) => `${X(i).toFixed(2)},${Y(t.peerMedian).toFixed(2)}`).join(' L')} L${[...trend].reverse().map((t, i) => `${X(trend.length - 1 - i).toFixed(2)},${Y(t.ie).toFixed(2)}`).join(' L')} Z`;
  const ticks = [0, maxV / 4, maxV / 2, maxV * 3 / 4, maxV];
  const last = trend[trend.length - 1];
  return `<div class="ti-legend"><span><i class="ln ln-ie"></i>Ireland</span><span><i class="ln ln-med"></i>Median of the ten comparison countries</span></div>
  <div class="ti-line">
    <div class="ti-y">${ticks.map(t => `<span style="top:${Y(t)}%">${t}</span>`).join('')}</div>
    <div class="ti-plot">
      ${ticks.map(t => `<span class="ti-grid" style="top:${Y(t)}%"></span>`).join('')}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="${gap}" class="ti-gapfill"/>
        <path d="${path('peerMedian')}" class="ti-l-med" vector-effect="non-scaling-stroke"/>
        <path d="${path('ie')}" class="ti-l-ie" vector-effect="non-scaling-stroke"/>
      </svg>
      ${trend.map((t, i) => `<span class="ti-hit" style="left:${X(i)}%"${tip(`${t.year}: Ireland ${n1(t.ie)}, peer median ${n1(t.peerMedian)} trials per million`)}></span>`).join('')}
      <span class="ti-end ti-end-ie" style="left:100%;top:${Y(last.ie)}%"></span>
      <span class="ti-end ti-end-med" style="left:100%;top:${Y(last.peerMedian)}%"></span>
      <span class="ti-endlab" style="top:${Y(last.peerMedian)}%">${n1(last.peerMedian)}</span>
      <span class="ti-endlab is-ie" style="top:${Y(last.ie)}%">${n1(last.ie)}</span>
      <span class="ti-gaplab" style="top:${((Y(last.ie) + Y(last.peerMedian)) / 2).toFixed(2)}%">Gap ${last.year}: ${n1(last.peerMedian - last.ie)}</span>
    </div>
    <div class="ti-x">${ys.map((y, i) => `<span style="left:${X(i)}%"${i % 2 && i !== ys.length - 1 ? ' class="ti-xo"' : ''}>${y}</span>`).join('')}</div>
  </div>`;
}

/** Quarterly columns, stacked industry + other; provisional quarters drawn lighter. */
function quarterCols(q, provisional) {
  const keys = Object.keys(q).sort().filter(k => k !== '2026 Q4');
  const m = Math.ceil(Math.max(...keys.map(k => q[k].n)) / 10) * 10;
  const full = keys.filter(k => !provisional.includes(k) && +k.slice(0, 4) < 2026);
  const avg = full.reduce((a, k) => a + q[k].n, 0) / full.length;
  return `<div class="ti-legend"><span><i class="sw sw-a"></i>Industry sponsored</span><span><i class="sw sw-b"></i>Universities, hospitals and networks</span><span><i class="sw sw-p"></i>Paler: provisional, late registrations still arriving</span><span><i class="ln ln-avg"></i>${full[0].slice(0, 4)} to ${full[full.length - 1].slice(0, 4)} average</span></div>
  <div class="ti-cols" style="--n:${keys.length}">
    <div class="ti-y">${[0, m / 2, m].map(t => `<span style="top:${100 - t / m * 100}%">${t}</span>`).join('')}</div>
    <div class="ti-cols-plot">
      ${[0, m / 2, m].map(t => `<span class="ti-grid" style="top:${100 - t / m * 100}%"></span>`).join('')}
      <span class="ti-avg" style="top:${(100 - avg / m * 100).toFixed(2)}%"><em>Average ${n1(avg)} a quarter</em></span>
      ${keys.map(k => { const v = q[k], p = provisional.includes(k);
        return `<div class="ti-col${p ? ' is-prov' : ''}"${tip(`${k}: ${v.n} trials started, ${v.industry} industry${p ? ' (provisional)' : ''}`)}><span class="ti-col-v">${v.n}</span><span class="ti-col-b sw-b" style="height:${((v.n - v.industry) / m * 100).toFixed(2)}%"></span><span class="ti-col-b sw-a" style="height:${(v.industry / m * 100).toFixed(2)}%"></span></div>`; }).join('')}
    </div>
    <div class="ti-cols-x">${keys.map(k => `<span>${k.replace(' ', '<br>')}</span>`).join('')}</div>
  </div>`;
}

/** 100% bar of the phase mix (ordered categories, one-hue ramp). */
function phaseBar(mix) {
  const tot = Object.values(mix).reduce((a, b) => a + b, 0);
  const ent = Object.entries(mix);
  return `<div class="ti-pbar">${ent.map(([k, v], i) => `<span class="ti-pseg r${i}" style="width:${(v / tot * 100).toFixed(2)}%"${tip(`${k}: ${v} trials (${n1(v / tot * 100)}%)`)}></span>`).join('')}</div>
  <ul class="ti-plegend">${ent.map(([k, v], i) => `<li><i class="r${i}"></i><span>${esc(k)}</span><b>${v}</b><em>${n1(v / tot * 100)}%</em></li>`).join('')}</ul>`;
}

/** Ireland against the peer median for one indicator, two short bars. */
function compare(key, label, unit = '') {
  const vals = countries.map(c => C[c][key]).filter(v => v != null), mx = Math.max(...vals);
  const pmed = peers.map(c => C[c][key]).sort((a, b) => a - b), h = pmed.length >> 1;
  const med = Math.round((pmed.length % 2 ? pmed[h] : (pmed[h - 1] + pmed[h]) / 2) * 10) / 10;
  const row = (n, v, ie) => `<div class="ti-vs-row${ie ? ' is-ie' : ''}"><span>${n}</span><span class="ti-vs-t"><span style="width:${(v / mx * 100).toFixed(1)}%"></span></span><b>${n1(v)}${unit}</b></div>`;
  return `<div class="ti-cmp"><p class="ti-k">${label}</p><div class="ti-vs">${row('Ireland', IE[key], 1)}${row('Peer median', med)}</div></div>`;
}

// ── content ──
const lowest = R.startsPm.order[R.startsPm.order.length - 1];
const findings = [
  { k: n1(IE.startsPm), l: `trials per million people a year, ${ord(R.startsPm.ie)} of ${R.startsPm.of}`,
    t: `Ireland started ${n0(IE.starts)} interventional trials in ${D.windows.starts[0]} to ${D.windows.starts[1]}. The peer median is ${n1(R.startsPm.median)}, and ${top} runs ${n1(ratioTop)} times as many per head.${R.startsPm.order[R.startsPm.order.length - 2] === 'Ireland' ? ` Only ${lowest} is lower.` : ''}` },
  { k: n0(D.gap.perYear), l: 'more trials a year would reach the peer median',
    t: `Most of the gap is in academic and hospital-led research. On industry-sponsored trials alone, Ireland is about ${n0(D.gap.industryPerYear)} a year short.` },
  { k: n1(IE.completedShare) + '%', l: `completed rather than stopped early, ${ord(R.completedShare.ie)} of ${R.completedShare.of}`,
    t: `Results reach ClinicalTrials.gov for ${n1(IE.resultsAnyShare)}% of completed phase 2 to 4 trials (${ord(R.resultsAnyShare.ie)}), but only ${n1(IE.results12Share)}% within 12 months of completion, the usual legal deadline.` },
  { k: n1(IE.earlyShare) + '%', l: `of new trials are early phase, ${R.earlyShare.tiedWith.length ? 'joint ' : ''}${ord(R.earlyShare.ie)} of ${R.earlyShare.of}`,
    t: `${IE.earlyStarts} early-phase trials in five years, against ${n1(C.Netherlands.earlyShare)}% in the Netherlands and ${n1(C.Belgium.earlyShare)}% in Belgium. Registration before the first patient is also low: ${n1(IE.prospectiveShare)}% (${ord(R.prospectiveShare.ie)}).` },
];

const scoreRows = D.indicators.filter(i => i.dir !== 0).map(i => `
  <div class="ti-sc-row">
    <div class="ti-sc-lab"><h3>${esc(i.label)}</h3><p>${esc(i.unit)}${i.dir === -1 ? ' · lower is better' : ''}</p></div>
    ${strip(i.key)}
    <div class="ti-sc-rank">${signal(i.key)}<b>${ord(R[i.key].ie)}</b><span>of ${R[i.key].of}${R[i.key].tiedWith?.length ? `, joint with ${R[i.key].tiedWith.join(', ')}` : ''}</span></div>
  </div>`).join('');

const tableHead = D.indicators.map(i => `<th scope="col">${esc(i.label)}<small>${esc(i.unit)}</small></th>`).join('');
const tableRows = [...countries].sort((a, b) => C[b].startsPm - C[a].startsPm).map(c => `<tr${c === 'Ireland' ? ' class="is-ie"' : ''}><th scope="row">${c}</th>${D.indicators.map(i => `<td>${fmt(i.key, C[c][i.key])}</td>`).join('')}</tr>`).join('');

const why = Object.entries(I.whyStopped).sort((a, b) => b[1] - a[1]);
const areas = I.areas.map(a => ({ name: a.area, total: a.n, industry: a.industry }));
const hosp = I.hospitals.map(h => { const [name, city] = h.site.replace(/\bSt\. /g, 'St ').split(/, (?=[^,]+$)/); return [city && !name.includes(city) ? `${name}, ${city}` : name, h.n]; });
const spons = I.sponsors.slice(0, 10);
const prov = ['2026 Q2', '2026 Q3'];
// citation formats (no DOI until the edition is archived on Zenodo; the page says so rather than inventing one)
const ED_LABEL = EDITION.toUpperCase().replace('-', ' ');
const URL_TI = 'https://priyalifescience.com/trials-index';
const YEAR = D.published.slice(0, 4);
const pubLong = pubDate;
const CITES = [
  ['apa', 'APA 7', `Priya Life Science. (${YEAR}). Ireland Clinical Trials Performance Index (Edition 1, ${ED_LABEL}) [Data set]. ${URL_TI}`],
  ['harvard', 'Harvard', `Priya Life Science (${YEAR}) Ireland Clinical Trials Performance Index, edition 1 (${ED_LABEL}) [Dataset]. Available at: ${URL_TI} (Accessed: ${pubLong}).`],
  ['vancouver', 'Vancouver', `Priya Life Science. Ireland Clinical Trials Performance Index, edition 1 (${ED_LABEL}) [dataset on the Internet]. Priya Life Science; ${YEAR} [cited ${D.published}]. Available from: ${URL_TI}`],
  ['bibtex', 'BibTeX', `@misc{pls_trials_index_${EDITION.replace('-', '')},
  author       = {{Priya Life Science}},
  title        = {Ireland Clinical Trials Performance Index, edition 1 (${ED_LABEL})},
  year         = {${YEAR}},
  howpublished = {\\url{${URL_TI}}},
  note         = {Data set. Licence CC BY 4.0. Published ${D.published}}
}`],
  ['ris', 'RIS', `TY  - DATA
AU  - Priya Life Science
TI  - Ireland Clinical Trials Performance Index, edition 1 (${ED_LABEL})
PY  - ${YEAR}
DA  - ${D.published.replace(/-/g, '/')}
PB  - Priya Life Science
UR  - ${URL_TI}
N1  - Licence CC BY 4.0
ER  - `],
];
const creditLine = `Source: Priya Life Science, Ireland Clinical Trials Performance Index, ${ED_LABEL} (CC BY 4.0)`;

const html = `<div class="ti" id="ti">
<header class="ti-mast">
  <div class="ti-wrap">
    <a class="ti-logo" href="/" aria-label="Priya Life Science home"><img src="/assets/images/logo/logo-main.svg?v=20261014" alt="Priya Life Science" width="192" height="48"></a>
    <p class="ti-eyebrow"><span>Data desk</span><span>Edition 1</span><span>${EDITION.toUpperCase().replace('-', ' ')}</span></p>
    <h1>Ireland Clinical Trials Performance&nbsp;Index</h1>
    <p class="ti-stand">How Ireland compares with ten European countries of similar size on starting, running and reporting clinical trials. Built from ${n0(D.uniqueTrials)} registered trials (${n0(D.countryRecords)} country records), every number traceable to the public registry.</p>
    <dl class="ti-meta">
      <div><dt>Published</dt><dd>${pubDate}</dd></div>
      <div><dt>Data to</dt><dd>${dataDate}</dd></div>
      <div><dt>Countries</dt><dd>${countries.length}</dd></div>
      <div><dt>Licence</dt><dd>CC BY 4.0</dd></div>
      <div><dt>Next edition</dt><dd>January 2027</dd></div>
    </dl>
    <nav class="ti-actions" aria-label="Index tools">
      <a class="ti-btn ti-btn-p" href="#data">Download the data</a>
      <a class="ti-btn" href="#method">Methodology</a>
      <a class="ti-btn" href="#cite">Cite this index</a>
    </nav>
  </div>
  <p class="ti-credit">Photo: CDC laboratory, via <a href="https://unsplash.com/photos/pipette-dripping-liquid-into-glass-vial-IFpQtennlj8" rel="noopener" target="_blank">Unsplash</a></p>
</header>

<section class="ti-wrap ti-hero" aria-labelledby="ti-h-headline">
  <h2 id="ti-h-headline" class="ti-vh">Headline figures</h2>
  <article class="ti-heroCard">
    <p class="ti-k">Trials started per million people a year, ${D.windows.starts[0]} to ${D.windows.starts[1]}</p>
    <p class="ti-hero-n">${n1(IE.startsPm)}</p>
    <div class="ti-vs">
      <div class="ti-vs-row is-ie"><span>Ireland</span><span class="ti-vs-t"><span style="width:${(IE.startsPm / C[top].startsPm * 100).toFixed(1)}%"></span></span><b>${n1(IE.startsPm)}</b></div>
      <div class="ti-vs-row"><span>Peer median</span><span class="ti-vs-t"><span style="width:${(R.startsPm.median / C[top].startsPm * 100).toFixed(1)}%"></span></span><b>${n1(R.startsPm.median)}</b></div>
      <div class="ti-vs-row"><span>${top}</span><span class="ti-vs-t"><span style="width:100%"></span></span><b>${n1(C[top].startsPm)}</b></div>
    </div>
    <p class="ti-rankpill">${ord(R.startsPm.ie)} of ${R.startsPm.of} countries</p>
  </article>
  <div class="ti-tiles">
    <article class="ti-tile"><p class="ti-k">The gap</p><p class="ti-tile-n">${n0(D.gap.perYear)}</p><p class="ti-tile-s">more trials a year would bring Ireland to the median</p></article>
    <article class="ti-tile"><p class="ti-k">Recruiting now</p><p class="ti-tile-n">${n0(I.recruitingNow)}</p><p class="ti-tile-s">interventional trials with an Irish site listed as recruiting on ${dataDate}</p></article>
    <article class="ti-tile"><p class="ti-k">Strength</p><p class="ti-tile-n">${ord(R.resultsAnyShare.ie)}</p><p class="ti-tile-s">of ${R.resultsAnyShare.of} for posting results (${n1(IE.resultsAnyShare)}% of completed phase 2 to 4 trials)</p></article>
    <article class="ti-tile"><p class="ti-k">Early-phase share</p><p class="ti-tile-n">${n1(IE.earlyShare)}%</p><p class="ti-tile-s">of new trials are early phase; the Netherlands is at ${n1(C.Netherlands.earlyShare)}%</p></article>
  </div>
</section>

<section class="ti-wrap ti-sec ti-findings" aria-labelledby="ti-h-find">
  <div class="ti-sechead"><p class="ti-num">01</p><h2 id="ti-h-find">What the index shows</h2></div>
  <ol class="ti-findlist">${findings.map(f => `<li><p class="ti-find-k">${f.k}</p><p class="ti-find-l">${esc(f.l)}</p><p class="ti-find-t">${f.t}</p></li>`).join('')}</ol>
</section>

<section class="ti-wrap ti-sec" id="scorecard" aria-labelledby="ti-h-sc">
  <div class="ti-sechead"><p class="ti-num">02</p><h2 id="ti-h-sc">The scorecard</h2><p class="ti-dek">Eight indicators, eleven countries. Each dot is a country; better is always to the right. Hover or tap a dot for its value.</p></div>
  <div class="ti-legend ti-sc-legend"><span><i class="dt dt-ie"></i>Ireland</span><span><i class="dt"></i>Comparison country</span><span><i class="dt dt-med"></i>Median of the 10 comparison countries</span><span class="ti-better">Better &rarr;</span></div>
  <div class="ti-sc">${scoreRows}</div>
  <p class="ti-note">Comparison countries: ${peers.join(', ')}. Chosen as European countries of 5 to 18 million people with established clinical research systems. A trial with sites in several countries counts in each of them.</p>
</section>

<section class="ti-wrap ti-sec" aria-labelledby="ti-h-act">
  <div class="ti-sechead"><p class="ti-num">03</p><h2 id="ti-h-act">Activity: a gap that has not closed</h2><p class="ti-dek">Trials started per million people, by year. ${belowAll ? `Ireland has been below the median of the comparison countries in every year since ${D.trend[0].year}.` : ''} In ${lastT.year} Ireland started ${n1(lastT.ie)} trials per million against a median of ${n1(lastT.peerMedian)}.</p></div>
  <div class="ti-grid2">
    <figure class="ti-fig ti-fig-wide">
      <figcaption><h3>Trials started per million people, ${D.trend[0].year} to ${D.trend[D.trend.length - 1].year}</h3></figcaption>
      ${lineChart(D.trend)}
      <p class="ti-src">Interventional trials with an actual start date and at least one site in the country. Source: ClinicalTrials.gov; Eurostat population 2025.</p>
    </figure>
    <figure class="ti-fig">
      <figcaption><h3>All trials per million a year, ${D.windows.starts[0]} to ${D.windows.starts[1]}</h3></figcaption>
      ${hbars(R.startsPm.order.map(c => [c, C[c].startsPm]))}
    </figure>
    <figure class="ti-fig">
      <figcaption><h3>Industry-sponsored trials per million a year</h3></figcaption>
      ${hbars(R.industryPm.order.map(c => [c, C[c].industryPm]))}
    </figure>
  </div>
</section>

<section class="ti-wrap ti-sec" aria-labelledby="ti-h-q">
  <div class="ti-sechead"><p class="ti-num">04</p><h2 id="ti-h-q">The quarterly pulse</h2><p class="ti-dek">Trials that started at Irish sites each quarter since 2023. Sponsors often confirm a start date months later, so the latest two quarters will rise in the next edition.</p></div>
  <figure class="ti-fig">${quarterCols(I.quarters, prov)}</figure>
</section>

<section class="ti-wrap ti-sec" aria-labelledby="ti-h-qual">
  <div class="ti-sechead"><p class="ti-num">05</p><h2 id="ti-h-qual">Running and reporting trials</h2><p class="ti-dek">Ireland's record once a trial is open is better than its volume. Completion and results reporting sit at or above the middle of the group.</p></div>
  <div class="ti-grid3">
    <article class="ti-stat"><p class="ti-k">Completed, not stopped early</p><p class="ti-stat-n">${n1(IE.completedShare)}%</p><p class="ti-stat-s">of ${n0(IE.closed)} trials that closed in ${D.windows.completion[0]} to ${D.windows.completion[1]}.</p><p class="ti-stat-m">Peer median ${n1(R.completedShare.median)}% · ${ord(R.completedShare.ie)} of ${R.completedShare.of}</p></article>
    <article class="ti-stat"><p class="ti-k">Results posted</p><p class="ti-stat-n">${n1(IE.resultsAnyShare)}%</p><p class="ti-stat-s">of ${n0(IE.resultsBase)} completed phase 2 to 4 trials; ${n1(IE.results12Share)}% within 12 months.</p><p class="ti-stat-m">Peer median ${n1(R.resultsAnyShare.median)}% · ${ord(R.resultsAnyShare.ie)} of ${R.resultsAnyShare.of}</p></article>
    <article class="ti-stat"><p class="ti-k">Registered before the first patient</p><p class="ti-stat-n">${n1(IE.prospectiveShare)}%</p><p class="ti-stat-s">of trials started in ${D.windows.starts[0]} to ${D.windows.starts[1]}.</p><p class="ti-stat-m">Peer median ${n1(R.prospectiveShare.median)}% · ${ord(R.prospectiveShare.ie)} of ${R.prospectiveShare.of}</p></article>
  </div>
  <figure class="ti-fig">
    <figcaption><h3>Why trials with Irish sites stopped early</h3><p>${I.terminatedBase} terminated trials, primary completion ${D.windows.completion[0]} to ${D.windows.completion[1]}, each reason read and grouped by hand.</p></figcaption>
    ${hbars(why, { emph: 'Too few patients enrolled', valFmt: n0 })}
    <p class="ti-src">Highlighted: recruitment, the reason Irish hospitals, networks and funders can act on directly.</p>
  </figure>
</section>

<section class="ti-wrap ti-sec" aria-labelledby="ti-h-ie">
  <div class="ti-sechead"><p class="ti-num">06</p><h2 id="ti-h-ie">Inside Ireland: where, what and who</h2><p class="ti-dek">The ${n0(I.windowStarts)} trials that started at Irish sites in ${D.windows.starts[0]} to ${D.windows.starts[1]}.</p></div>
  <div class="ti-grid2">
    <figure class="ti-fig">
      <figcaption><h3>Hospitals and units with the most trials</h3><p>Named sites only: ${n1(I.namedSiteShare)}% of trials name at least one Irish site.</p></figcaption>
      ${hbars(hosp, { emph: '', valFmt: n0 })}
    </figure>
    <figure class="ti-fig">
      <figcaption><h3>Therapy areas</h3><p>A trial can count in more than one area.</p></figcaption>
      ${hstack(areas, ['industry'], ['Industry sponsored', 'Other sponsors'])}
    </figure>
    <figure class="ti-fig">
      <figcaption><h3>Phase mix</h3><p>Phase 3 and non-phased studies make up ${n1((pm['Phase 3'] + pm['Not phased (devices, procedures, behaviour)']) / pmTot * 100)}% of Irish trials.</p></figcaption>
      ${phaseBar(I.phaseMix)}
      <div class="ti-cmps">
        ${compare('nationalOnlyShare', 'Run only in this country, % of new trials', '%')}
        ${compare('medianMonthsIndustryLate', 'Median trial length in months, industry phase 2 to 4')}
      </div>
    </figure>
    <figure class="ti-fig">
      <figcaption><h3>Lead sponsors</h3></figcaption>
      <table class="ti-tbl ti-tbl-s"><thead><tr><th scope="col">Sponsor</th><th scope="col">Type</th><th scope="col">Trials</th></tr></thead>
      <tbody>${spons.map(s => `<tr><th scope="row">${esc(s.sponsor)}</th><td><span class="ti-tag${s.industry ? ' is-ind' : ''}">${s.industry ? 'Industry' : 'Academic'}</span></td><td>${s.n}</td></tr>`).join('')}</tbody></table>
    </figure>
  </div>
</section>

<section class="ti-wrap ti-sec" id="data" aria-labelledby="ti-h-data">
  <div class="ti-sechead"><p class="ti-num">07</p><h2 id="ti-h-data">The full table and the data</h2><p class="ti-dek">Every indicator for every country. Free to reuse under CC BY 4.0 with credit to Priya Life Science.</p></div>
  <div class="ti-tblwrap" tabindex="0" role="region" aria-label="Indicators by country, scrollable table"><table class="ti-tbl"><caption class="ti-vh">Indicators by country, edition ${EDITION}</caption><thead><tr><th scope="col">Country</th>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table></div>
  <ul class="ti-dl">
    <li><a href="${DL}/indicators_by_country.csv" download>Indicators by country <span>CSV</span></a></li>
    <li><a href="${DL}/ireland_starts_by_year.csv" download>Ireland, starts by year <span>CSV</span></a></li>
    <li><a href="${DL}/ireland_starts_by_quarter.csv" download>Ireland, starts by quarter <span>CSV</span></a></li>
    <li><a href="${DL}/ireland_hospitals_2021_2025.csv" download>Ireland, hospitals <span>CSV</span></a></li>
    <li><a href="${DL}/ireland_therapy_areas_2021_2025.csv" download>Ireland, therapy areas <span>CSV</span></a></li>
    <li><a href="${DL}/index.json" download>Full edition <span>JSON</span></a></li>
    <li><a href="${DL}/why_stopped_reviewed.json" download>Reviewed stopping reasons <span>JSON</span></a></li>
    <li><a href="${DL}/qc_report.md" download>Quality-check report <span>MD</span></a></li>
  </ul>
</section>

<section class="ti-wrap ti-sec ti-method" id="method" aria-labelledby="ti-h-m">
  <div class="ti-sechead"><p class="ti-num">08</p><h2 id="ti-h-m">Methodology and limits</h2></div>
  <div class="ti-cols2">
    <div>
      <h3>What is counted</h3>
      <p>Every interventional study on ClinicalTrials.gov with at least one site in the country and a start date from 2014, downloaded through the registry's public API on ${dataDate}. Population is Eurostat's figure for 1 January 2025. No figure is estimated or modelled.</p>
      <p>A start or completion date counts as having happened when the registry marks it actual. Records last updated before 2017 carry no date type; for those, a past date counts when the trial's status shows it ran.</p>
      <h3>The indicators</h3>
      <dl class="ti-defs">
        <dt>Trials started per million</dt><dd>Trials with an actual start date in ${D.windows.starts[0]} to ${D.windows.starts[1]}, divided by five and by population in millions.</dd>
        <dt>Industry-sponsored trials per million</dt><dd>The same, for trials whose lead sponsor is a company.</dd>
        <dt>Early-phase share</dt><dd>Share of those trials registered as early phase 1, phase 1 or phase 1/2.</dd>
        <dt>Registered before the first patient</dt><dd>Share first submitted to the registry in or before the month the trial started.</dd>
        <dt>Completed rather than stopped early</dt><dd>Of trials with an actual primary completion in ${D.windows.completion[0]} to ${D.windows.completion[1]} that are now completed or terminated, the share completed.</dd>
        <dt>Results posted</dt><dd>Of completed phase 2, 3 and 4 trials with primary completion in ${D.windows.results[0]} to ${D.windows.results[1]}, the share with results on ClinicalTrials.gov at all, and within 365 days.</dd>
        <dt>Records gone stale</dt><dd>Share of trials started since 2014 whose status is Unknown: the registry's label for a trial still listed as open whose status has not been verified for more than two years past its expected completion date.</dd>
      </dl>
    </div>
    <div>
      <h3>Limits to keep in mind</h3>
      <ul class="ti-limits">
        <li>One registry only. Trials registered only in the EU Clinical Trials Information System or EudraCT are not counted, and results posted only to EU registers are not seen. This affects every country, but not equally.</li>
        <li>A multinational trial counts in every country where it has a site. The index measures participation, not where a trial is led.</li>
        <li>Dates, phases and sponsor types are as sponsors registered them. Recent quarters are provisional because start dates are often confirmed late.</li>
        <li>Hospital names are matched across spellings; sites listed only as "Research Site" cannot be attributed.</li>
        <li>Reasons for stopping were read one by one and grouped by hand; the grouping is ours, not the sponsor's.</li>
      </ul>
      <h3>Process</h3>
      <p>The scripts that <a href="${DL}/code/fetch.mjs">download</a>, <a href="${DL}/code/compute.mjs">count</a> and <a href="${DL}/code/render.mjs">draw</a> this edition, and the <a href="${DL}/code/review_why_stopped.py">hand-review of stopping reasons</a>, are published with the data. Each figure was produced by code, reviewed, verified and approved by a human editor. Before publication every figure was recomputed by separately written code and key counts were re-queried from the live registry; the quality-check report is published with the data. Errors are fixed openly on our <a href="/corrections">corrections page</a>.</p>
    </div>
  </div>
</section>

<section class="ti-wrap ti-sec ti-endsec" id="cite" aria-labelledby="ti-h-c">
  <div class="ti-sechead"><p class="ti-num">09</p><h2 id="ti-h-c">Cite and reuse</h2><p class="ti-dek">Free to reuse under CC BY 4.0. Credit Priya Life Science and name the edition, so readers can find the exact figures you used.</p></div>
  <div class="ti-citegrid">
    <div class="ti-cite">
      <div class="ti-tabs" role="tablist" aria-label="Citation format">
        ${CITES.map(([id, name], i) => `<button type="button" role="tab" id="ti-tab-${id}" aria-controls="ti-cp-${id}" aria-selected="${i ? 'false' : 'true'}"${i ? ' tabindex="-1"' : ''}>${name}</button>`).join('')}
      </div>
      ${CITES.map(([id, name, text], i) => `<div class="ti-cp" id="ti-cp-${id}" role="tabpanel" aria-labelledby="ti-tab-${id}"${i ? ' data-hide' : ''}>
        <pre class="ti-citetext" id="ti-ct-${id}">${esc(text)}</pre>
        <button type="button" class="ti-btn ti-btn-p" data-copy="#ti-ct-${id}">Copy ${name}</button>
      </div>`).join('')}
      <div class="ti-credit-line">
        <p class="ti-k">Credit line for charts and articles</p>
        <p class="ti-cl" id="ti-cl">${esc(creditLine)}</p>
        <button type="button" class="ti-btn" data-copy="#ti-cl">Copy credit line</button>
      </div>
      <p class="ti-files">Reference manager files: <a href="${DL}/citation.bib" download>citation.bib</a> · <a href="${DL}/citation.ris" download>citation.ris</a></p>
    </div>
    <aside class="ti-record" aria-label="Edition record">
      <p class="ti-k">Edition record</p>
      <dl>
        <div><dt>Title</dt><dd>Ireland Clinical Trials Performance Index</dd></div>
        <div><dt>Edition</dt><dd>1 · ${ED_LABEL}</dd></div>
        <div><dt>Published</dt><dd>${pubDate}</dd></div>
        <div><dt>Data to</dt><dd>${dataDate}</dd></div>
        <div><dt>Version</dt><dd>1.0, checked before release (<a href="${DL}/qc_report.md">quality-check report</a>)</dd></div>
        <div><dt>Licence</dt><dd><a href="https://creativecommons.org/licenses/by/4.0/" rel="license noopener" target="_blank">CC BY 4.0</a></dd></div>
        <div><dt>DOI</dt><dd>Assigned when this edition is archived on Zenodo</dd></div>
        <div><dt>Permanent link</dt><dd><a href="${URL_TI}">priyalifescience.com/trials-index</a></dd></div>
        <div><dt>Next edition</dt><dd>January 2027</dd></div>
      </dl>
    </aside>
  </div>
  <div class="ti-partner">
    <img class="ti-partner-logo" src="/assets/images/logo/logo-main.svg?v=20261014" alt="Priya Life Science" width="160" height="40" loading="lazy">
    <div><h2>Partner on the 2027 editions</h2>
    <p>The index is free and open. Organisations that want to support the quarterly editions, or a deeper cut for their therapy area, can talk to our team. Supporters never see or change findings before release.</p></div>
    <a class="ti-btn" href="mailto:info@priyalifescience.com?subject=Trials%20Performance%20Index">info@priyalifescience.com</a>
  </div>
</section>
<div class="ti-tip" id="ti-tip" role="tooltip" hidden></div>
</div>
`;
fs.writeFileSync(OUT, html);
fs.writeFileSync(`public_html/downloads/trials-index/${EDITION}/citation.bib`, CITES.find(c => c[0] === 'bibtex')[2] + '\n');
fs.writeFileSync(`public_html/downloads/trials-index/${EDITION}/citation.ris`, CITES.find(c => c[0] === 'ris')[2].replace(/\n/g, '\r\n') + '\r\n');
fs.copyFileSync(`public_html/data/trials_index/${EDITION}.json`, `public_html/downloads/trials-index/${EDITION}/index.json`);
console.log('wrote', OUT, html.length, 'bytes');
