// Ireland Clinical Trials Performance Index: raw collector (2026-10-27).
// Pulls every interventional ClinicalTrials.gov study with a site in each country and a start date from 2014,
// keeping only the fields the indicators need. Output: scratch/trials_index/raw_<country>.json (compact rows).
// Usage: node scripts/trials_index/fetch.mjs [Country ...]   (default: Ireland + 10 European peers)
import fs from 'fs';

const OUT = 'scratch/trials_index';
const PEERS = ['Ireland', 'Denmark', 'Finland', 'Norway', 'Sweden', 'Belgium', 'Netherlands', 'Austria', 'Switzerland', 'Portugal', 'Czechia'];
const BASE_FIELDS = 'NCTId,StartDate,StartDateType,PrimaryCompletionDate,PrimaryCompletionDateType,OverallStatus,Phase,LeadSponsorClass,StudyFirstSubmitDate,ResultsFirstPostDate,HasResults,LocationCountry,EnrollmentCount';
const IE_FIELDS = BASE_FIELDS + ',BriefTitle,LeadSponsorName,Condition,ConditionMeshTerm,LocationFacility,LocationCity,WhyStopped';
const UA = 'PriyaLifeScience/1.0 (+https://priyalifescience.com; trials index)';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (r.ok) return await r.json();
      console.error('HTTP', r.status, 'retry', i + 1);
    } catch (e) { console.error('fetch error', e.message, 'retry', i + 1); }
    await sleep(3000 * (i + 1));
  }
  throw new Error('failed: ' + url);
}

function row(s, ie) {
  const p = s.protocolSection || {};
  const st = p.statusModule || {};
  const locs = p.contactsLocationsModule?.locations || [];
  const countries = [...new Set(locs.map(l => (l.country || '').trim()).filter(Boolean))];
  const r = {
    id: p.identificationModule?.nctId,
    // date types as registered: 'ACTUAL', 'ESTIMATED'/'ANTICIPATED', or '' (records not updated since the 2017 rule have none)
    s: st.startDateStruct?.date || '', st: st.startDateStruct?.type || '',
    pc: st.primaryCompletionDateStruct?.date || '', pct: st.primaryCompletionDateStruct?.type || '',
    o: st.overallStatus || '', sub: st.studyFirstSubmitDate || '',
    res: st.resultsFirstPostDateStruct?.date || '', hr: s.hasResults ? 1 : 0,
    ph: p.designModule?.phases || [], cl: p.sponsorCollaboratorsModule?.leadSponsor?.class || '',
    e: p.designModule?.enrollmentInfo?.count ?? null, nc: countries.length,
  };
  if (ie) {
    r.t = (p.identificationModule?.briefTitle || '').slice(0, 160);
    r.sp = p.sponsorCollaboratorsModule?.leadSponsor?.name || '';
    r.cond = (p.conditionsModule?.conditions || []).slice(0, 4);
    r.mesh = (s.derivedSection?.conditionBrowseModule?.ancestors || []).map(a => a.term).slice(0, 12);
    r.sites = [...new Set(locs.filter(l => l.country === 'Ireland').map(l => [l.facility || '', l.city || ''].join('|')))];
    r.why = (st.whyStopped || '').slice(0, 160);
  }
  return r;
}

const list = process.argv.slice(2).length ? process.argv.slice(2) : PEERS;
fs.mkdirSync(OUT, { recursive: true });
for (const c of list) {
  const ie = c === 'Ireland';
  const fields = ie ? IE_FIELDS + ',ConditionAncestorTerm' : BASE_FIELDS;
  const q = new URLSearchParams({
    'query.locn': `AREA[LocationCountry]${c}`,
    'filter.advanced': 'AREA[StudyType]INTERVENTIONAL AND AREA[StartDate]RANGE[2014-01-01,MAX]',
    countTotal: 'true', pageSize: '1000', fields,
  });
  let token = '', rows = [], total = 0, page = 0;
  do {
    const j = await get('https://clinicaltrials.gov/api/v2/studies?' + q + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    if (page === 0) total = j.totalCount || 0;
    for (const s of j.studies || []) {
      const r = row(s, ie);
      // the API's location filter is per study; keep it only if the country is really a site country
      if (r.id && (s.protocolSection?.contactsLocationsModule?.locations || []).some(l => l.country === c)) rows.push(r);
    }
    token = j.nextPageToken || '';
    page++;
    await sleep(500);
  } while (token);
  fs.writeFileSync(`${OUT}/raw_${c}.json`, JSON.stringify({ country: c, fetchedAt: new Date().toISOString(), totalCount: total, rows }));
  console.log(c, 'total', total, 'kept', rows.length, 'pages', page);
}
