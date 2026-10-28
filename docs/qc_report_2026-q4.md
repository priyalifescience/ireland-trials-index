# Ireland Clinical Trials Performance Index, edition 1 (2026 Q4): quality-check report

**Report date:** 27 October 2026
**Covers:** the web page `/trials-index`, its data and download files, and the 17-slide presentation deck
**Result:** passed after corrections. Four errors were found and fixed, and eight wording problems were corrected. None of the headline figures changed.
**Status:** awaiting the editor's approval before publication

---

## 1. Summary

Every figure in the index was checked in three independent ways:

1. Key counts were re-queried from the live ClinicalTrials.gov registry.
2. All indicators were recomputed by separately written code, in a different programming language.
3. Every number printed on the page and in the deck was traced back to the data.

Every claim taken from outside sources was checked against a primary source.

The headline findings are confirmed:
- Ireland started **21.3** interventional trials per million people a year in 2021 to 2025.
- The median of the ten comparison countries is **34.7**, so Ireland ranks **10th of 11**.
- Closing that gap would take about **73** more trials a year.

The check found four errors, all now corrected (section 5):

| # | Error | Effect |
|---|---|---|
| E1 | Trials registered before 2017 were partly missed when counting trial starts | Trend chart, 2014 to 2016 |
| E2 | The automatic grouping of reasons for stopping trials early was unreliable | One headline claim on the page and in the deck was wrong |
| E3 | The number of trials was overstated | Page header and deck |
| E4 | A tied rank was shown as an outright rank | Scorecard |

## 2. What the index is built from

| Source | What is taken | How it was checked |
|---|---|---|
| ClinicalTrials.gov API v2 (US National Library of Medicine) | Every interventional study with at least one site in the country and a start date from 2014: dates and date types, status, phase, lead sponsor type, results date, reason for stopping; for Ireland also titles, sponsors, conditions and sites | Counts re-queried from the live registry (section 4.1) |
| Eurostat table tps00001 | Population on 1 January 2025 for the 11 countries | Re-downloaded from Eurostat's raw data service and compared value by value (section 4.2) |
| Department of Health press release, 21 November 2025 | The context statement on deck slide 2 | Read at gov.ie (section 4.6) |
| Unsplash, photo IFpQtennlj8 (a US Centers for Disease Control and Prevention laboratory) | Page masthead, share image and deck cover | Licence page read: "Free to use under the Unsplash License" |

**Data flow.** The data passes through five steps, in this order:

1. `fetch.mjs` downloads the raw registry records.
2. `review_why_stopped.py` records a reason, reviewed by hand, for every trial that stopped early.
3. `compute.mjs` calculates the indicators and writes the edition file and the CSV downloads.
4. `render.mjs` draws the web page.
5. The deck's figures were copied from the edition file. Every deck number has since been traced back to it (section 4.5).

The scripts are published with the data.

**Comparison countries:** Denmark, Finland, Norway, Sweden, Belgium, the Netherlands, Austria, Switzerland, Portugal and Czechia.

## 3. The checks

| # | Check | Method |
|---|---|---|
| 4.1 | Registry counts | Six counts for Ireland, and one each for Denmark and Portugal, queried directly from the live API with filters written separately from the collector |
| 4.2 | Population | Eurostat raw data compared with the 11 values in the code |
| 4.3 | Independent recomputation | All 8 indicators for 11 countries, the ranks, the peer medians, the gap, 12 years of trend, 16 quarters, phase mix, sponsors, cancer trials and reasons for stopping, recomputed in Python and compared with the published file |
| 4.4 | Data rules | A look at how registry fields behave in older records |
| 4.5 | Every printed number | An audit script traced all 390 numbers on the page and every number on the 17 slides to the data. It was itself tested with a deliberately wrong number, which it caught |
| 4.6 | Claims from outside sources | Read against the primary source |
| 4.7 | Hand review | All 95 reasons for stopping early read one by one |
| 4.8 | Visual check | Page viewed on desktop, at phone width and in dark mode |

## 4. Results

### 4.1 Live registry counts: all match

| Count | Live registry | Index |
|---|---|---|
| Ireland, interventional trials with a start date from 2014 | 1,439 | 1,439 |
| Ireland, trials started 2021 to 2025 (start marked actual) | 579 | 579 |
| Ireland, industry-sponsored, started 2021 to 2025 | 339 | 339 |
| Ireland, recruiting (interventional, start date from 2014) | 230 | 230 |
| Denmark, trials started 2021 to 2025 | 2,476 | 2,476 |
| Portugal, trials started 2021 to 2025 | 1,101 | 1,101 |

The registry lists 300 Irish-site studies of every type as recruiting. The index counts 230 because it covers interventional trials started from 2014 only. The page wording now says this (correction W1).

### 4.2 Population: all 11 values match Eurostat exactly

Ireland's population is 5,440,278 and the Netherlands' is 18,044,027. Eurostat last updated the table on 30 September 2026.

### 4.3 Independent recomputation: no differences

- **Indicators:** 132 values (12 measures for 11 countries) recomputed, with 0 differences.
- **Ranks and peer medians:** all 8 match.
- **Gap:** 73 trials a year in total and 18 for industry, both matching.
- **Other figures:** all 12 trend years, all 16 quarters, the phase mix, the top 12 sponsors and the 154 cancer trials match.
- **Distinct trials:** 30,943.

### 4.4 Data rules: one error found (E1)

The registry's date-type field is missing from older records. See E1 in section 5.

### 4.5 Every printed number: none untraced

- **Web page:** 390 numbers scanned, 0 that cannot be traced.
- **Deck:** 17 slides scanned, 0 that cannot be traced.

The audit proves that each number exists in the data. Whether each number sits in the right sentence was checked by reading: the Denmark-to-Ireland ratio, "only Portugal is lower", the share of cancer trials sponsored by industry, the strongest quarter, and the hospital order.

### 4.6 Claims from outside sources: confirmed, with clearer wording

The Department of Health press release of 21 November 2025 lists "an open-access performance dashboard to enhance accountability" among the planned measures. It also plans a National Clinical Trials Body by autumn 2027. Deck slide 2 now quotes that wording and names the source.

### 4.7 Hand review of stopping reasons: one error found (E2)

25 of the 95 keyword labels were wrong. See E2 in section 5.

## 5. Errors found and corrected

| # | Error | Cause | Effect before the fix | Correction |
|---|---|---|---|---|
| E1 | Older trials were missed when counting starts | The registry added its date-type field (actual or anticipated) in 2017. Records not updated since then carry no type, and the code counted only starts marked "actual". 104 of Ireland's 311 records from 2014 to 2016 have no type (33%), as do 650 of Denmark's 1,325 (49%). | The trend chart understated 2014 to 2016 for every country. Ireland showed 7.9, 16.0 and 13.8 per million; the peer median showed 16.1, 20.4 and 21.9. | A start or completion date with no type now counts when the date has passed and the trial's status shows it ran. Corrected values: Ireland 14.7, 22.8 and 19.3; peer median 31.1, 31.4 and 29.8. The 2017 values moved slightly (Ireland 22.8 to 23.0; median 33.5 to 34.0). The 2021 to 2025 figures and all ranks are unchanged. Ireland is still below the median in every year. |
| E2 | Reasons for stopping early were mislabelled | Reasons were sorted by keyword. For example, "the filgotinib programme for participants with Crohn's was stopped" was counted as an enrolment problem because it contains the word "participants". 25 of 95 trials were in the wrong group. | The page and deck said slow recruitment was the most common reason. The groups were shown as 26 recruitment, 23 safety or benefit, 15 business, 5 Covid-19 and 26 other. | Every reason was read and labelled by hand. The labels are stored by trial ID and published. Corrected groups: 32 safety, lack of benefit or interim analysis; 29 sponsor business or programme decision; 22 too few patients; 6 Covid-19; 6 other or not stated. The deck slide was rewritten: recruitment is third, and it is the reason a country can act on. Future editions stop if any stopped trial lacks a reviewed label. |
| E3 | The number of trials was overstated | The page said "44,770 trial records". That total counts a multinational trial once for every country it runs in. | The scale of the evidence was overstated by about 45% where a reader takes "records" to mean trials. | Now reads "30,943 registered trials (44,770 country records)" on the page and the deck. |
| E4 | A tie was hidden | Ireland and Finland both have a 6.0% early-phase share. | The early-phase rank was shown as 7th, not joint 7th. | The page shows "joint with Finland"; the deck shows "joint 7th". Ties are now detected automatically for every indicator. |

## 6. Wording corrections

| # | Before | After | Why |
|---|---|---|---|
| W1 | "230 trials recruiting at Irish sites" | "230 interventional trials with an Irish site listed as recruiting" | The status is the trial's overall status, and observational studies are excluded |
| W2 | "Trials that finished as planned" | "Completed rather than stopped early" | The registry records completion, not whether a trial went to plan |
| W3 | "posted within the 12 months that US and EU rules set" | "within 12 months of the main completion date, the usual legal deadline; results posted only to EU registers are not counted" | EU results are filed with EU registers, which the index does not read |
| W4 | "6.0% of new trials are phase 1" and "35 phase 1 trials" | "early phase" (phase 1, early phase 1 and phase 1/2) | The count includes phase 1/2 trials |
| W5 | "(80.1% of completed trials)" | "of completed phase 2 to 4 trials" | The base excludes phase 1 and trials without a phase |
| W6 | "Kidneys and urinary" | "Kidney, urinary and reproductive" (page) and "Urogenital" (deck) | The disease group also covers reproductive and pregnancy conditions |
| W7 | Stale records: "an open trial not verified for two years" | "a trial still listed as open whose status has not been verified for more than two years past its expected completion date" | Matches the registry's definition more closely |
| W8 | Deck slide 2: "recommended an open dashboard" | A direct quote from the press release, with the source named | Quote the primary source rather than paraphrase it |

## 7. Final verified figures (unchanged by the corrections)

| Indicator | Ireland | Peer median | Rank of 11 |
|---|---|---|---|
| Trials started per million a year, 2021 to 2025 | 21.3 | 34.7 | 10th |
| Industry trials per million a year | 12.5 | 15.9 | 9th |
| Early-phase share of new trials | 6.0% | 6.7% | joint 7th |
| Registered before the first patient | 82.6% | 84.8% | 9th |
| Completed rather than stopped early | 86.9% | 83.6% | 4th |
| Results posted at all (phase 2 to 4) | 80.1% | 74.8% | 3rd |
| Results posted within 12 months | 9.1% | 9.1% | 6th |
| Records gone stale (lower is better) | 10.7% | 9.6% | 8th |

## 8. Known limits (stated on the page; not errors)

- **One registry only.** Trials registered only in the EU's CTIS or EudraCT registers are not counted, and nor are results posted only there.
- **Participation, not leadership.** A multinational trial counts in every country where it has a site.
- **Dates as registered.** Dates, phases and sponsor types are as sponsors entered them. The last two quarters (2026 Q2 and Q3) are provisional.
- **Some sites can't be placed.** Hospital names are matched across spellings. 13.6% of trials name no identifiable Irish site.
- **The grouping is ours.** Therapy areas come from the registry's disease categories. The groups of reasons for stopping are Priya Life Science's own.
- **Limits of the audit.** The number audit proves each number exists in the data, not that it sits in the right sentence. That was checked by reading, for the claims listed in 4.5.

## 9. Check of this report

This report was itself checked before release:

- Every number in it was traced to the edition file, the file as it was before the corrections, the Eurostat download or the check outputs. Section references such as "4.1" were the only untraced numbers.
- Each derived figure was recalculated: 25 of 95 relabelled, 104 of 311 is 33%, 650 of 1,325 is 49%, 44,770 ÷ 30,943 is 1.45 (45%), and 100% − 86.4% is 13.6%.

One error was found and fixed: the share of old Irish records with no date type had been given as 34%.

## 10. How to repeat these checks

All check files are kept in `scratch/trials_index/qc/`:

| File | Check |
|---|---|
| `api_counts.mjs` | Live registry counts (4.1) |
| `eurostat_tps00001_2025.json` | Population download (4.2) |
| `recompute.py` | Independent recomputation (4.3, 4.4) |
| `text_audit.py` | Every printed number (4.5) |
| `why_review.txt` | The list of reasons for the hand review (4.7) |
| `2026-q4_before_qc.json` | The edition file as it was before the corrections |

The hand-reviewed labels are published as `why_stopped_reviewed.json`, alongside the code that builds them.

**Before the next edition (January 2027):**
1. Run `fetch.mjs`.
2. Run `review_why_stopped.py`, and review any newly stopped trials by hand.
3. Run `compute.mjs` and `render.mjs`.
4. Run all four checks again.
