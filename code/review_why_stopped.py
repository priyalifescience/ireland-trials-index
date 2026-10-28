"""Hand-reviewed reasons for Irish trials that stopped early (QC 2026-10-27).
Each terminated trial's free-text reason was read by a person; the keyword grouping is only a first pass and these
corrections override it. Writes public_html/data/trials_index/why_stopped_reviewed.json ({nct_id: label}), which
compute.mjs uses for every trial listed. New terminated trials in later editions must be reviewed and added here.
Run: python -I scripts/trials_index/review_why_stopped.py"""
import json, re, pathlib

ENROL, BUS, SAFE, COVID, OTHER = ('Too few patients enrolled', 'Sponsor business or programme decision',
    'Safety, lack of benefit or interim analysis', 'Covid-19 disruption', 'Other or not stated')
AUTO = [(ENROL, r'enrol|enrol?ment|recruit|accrual|accru|participant|subjects?\b|slow'),
        (BUS, r'business|strateg|portfolio|commercial|funding|sponsor decision|company decision|financ|priorit|budget'),
        (SAFE, r'safety|futility|efficacy|benefit|adverse|toxicit|interim|DSMB|DMC'), (COVID, r'covid|pandemic|sars-cov')]
# reviewed corrections: start of the sponsor's text -> label (case-insensitive prefix match)
FIX = {
    'The AVP-786 program was discontinued': BUS,
    'development program for filgotinib': BUS,
    'Sponsor decision. All remaining participants': BUS,
    'Enrollment for trial was terminated on January 26, 2021 after a third interim analysis': SAFE,
    'Inadequate recruitment due to COVID-19': COVID,
    'The Sublimity Board of Directors carefully evaluated the IA data': SAFE,
    "At Sponsor's Discretion": BUS,
    'The AFFIRM-AL clinical trial did not meet its primary endpoint': SAFE,
    'BeiGene and Celgene Corporation terminated': BUS,
    "Study drug dosing was permanently discontinued at the Sponsor's discretion based on frequency and nature of skin": SAFE,
    'VTL-308 failed to meet its primary endpoint': SAFE,
    'The Sponsor has decided to stop the phase 4 study Sobi': BUS,
    'Development project was discontinued': BUS,
    'Company decided to terminate this study due to study did not meet the primary endpoint': SAFE,
    'discontinuation of all ongoing studies involving xevinapant': BUS,
    'Due to a change in the development program': BUS,
    'Insufficient randomizations due to changes in clinical practice': ENROL,
    'Development of next-generation device': BUS,
    'Trial failed to meet primary endpoint': SAFE,
    'Based on available data, UCB has decided to stop development of padsevonil': BUS,
    'Study SPR001-203 did not meet its primary and secondary endpoints': SAFE,
    'Top line analysis indicated that the study had failed to achieve its primary endpoint': SAFE,
    'The sponsor decided to terminate this study before the protocol-defined end-of-study': BUS,
}
rows = json.load(open('scratch/trials_index/raw_Ireland.json', encoding='utf-8'))['rows']
done = lambda r: r['pct'] == 'ACTUAL' or (r['pct'] == '' and r['pc'] and r['o'] in ('COMPLETED', 'TERMINATED'))
term = [r for r in rows if r['o'] == 'TERMINATED' and done(r) and 2016 <= int(r['pc'][:4]) <= 2025]
out, used = {}, set()
for r in term:
    why = (r['why'] or '').strip()
    lab = next((l for p, l in FIX.items() if why.lower().startswith(p.lower()) and not used.add(p)), None)
    if lab is None:
        lab = next((l for l, rx in AUTO if re.search(rx, why, re.I)), OTHER)
    out[r['id']] = lab
unused = [p for p in FIX if p not in used]
assert not unused, f'corrections that matched no trial: {unused}'
pathlib.Path('public_html/data/trials_index/why_stopped_reviewed.json').write_text(json.dumps(dict(sorted(out.items())), indent=1), encoding='utf-8')
tally = {}
for l in out.values(): tally[l] = tally.get(l, 0) + 1
print(len(out), 'reviewed;', dict(sorted(tally.items(), key=lambda x: -x[1])))
