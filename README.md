# Ireland Clinical Trials Performance Index

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23725680.svg)](https://doi.org/10.5281/zenodo.23725680)
Data: CC BY 4.0 · Code: EUPL-1.2

A quarterly, open index of how Ireland compares with ten European countries of similar size on starting, running and reporting clinical trials. It is published by [Priya Life Science](https://priyalifescience.com), an independent Irish life-science publication.

- **Web version:** https://priyalifescience.com/trials-index
- **Archived edition (DOI):** https://doi.org/10.5281/zenodo.23725680

## Edition 1 (2026 Q4) at a glance

Ireland started **21.3** interventional trials per million people a year in 2021 to 2025. The median of the ten comparison countries is **34.7**, so Ireland ranks **10th of 11**. Closing the gap would take about 73 more trials a year.

| Indicator | Ireland | Peer median | Rank of 11 |
|---|---|---|---|
| Trials started per million people a year | 21.3 | 34.7 | 10 |
| Industry-sponsored trials per million a year | 12.5 | 15.9 | 9 |
| Early-phase share of new trials | 6.0% | 6.7% | 7 (tied) |
| Registered before the first patient | 82.6% | 84.8% | 9 |
| Completed rather than stopped early | 86.9% | 83.6% | 4 |
| Results posted at all (completed phase 2 to 4) | 80.1% | 74.8% | 3 |
| Results posted within 12 months | 9.1% | 9.1% | 6 |
| Records gone stale | 10.7% | 9.6% | 8 |

The comparison countries are Denmark, Finland, Norway, Sweden, Belgium, the Netherlands, Austria, Switzerland, Portugal and Czechia.

## What is in this repository

| Path | Contents |
|---|---|
| `data/2026-q4/indicators_by_country.csv` | All eight indicators, plus the counts behind them, for the 11 countries |
| `data/2026-q4/ireland_starts_by_year.csv` | Irish trial starts per year since 2014, all and industry-sponsored |
| `data/2026-q4/ireland_starts_by_quarter.csv` | Irish trial starts per quarter |
| `data/2026-q4/ireland_therapy_areas_2021_2025.csv` | Irish trial starts by therapy area |
| `data/2026-q4/ireland_hospitals_2021_2025.csv` | Irish hospitals by number of trials started |
| `data/2026-q4/index.json` | The full edition file, with definitions, ranks and trend |
| `data/2026-q4/why_stopped_reviewed.json` | Hand-reviewed reasons why Irish trials stopped early |
| `code/` | `fetch.mjs` pulls the registry, `compute.mjs` builds the indicators, `render.mjs` draws the web page, `review_why_stopped.py` holds the hand labels |
| `docs/qc_report_2026-q4.md` | The independent quality-check report for this edition |

## Method in brief

- **Source.** ClinicalTrials.gov API v2, from the U.S. National Library of Medicine. The index covers interventional studies with at least one site in the country and a start date from 2014. Data were retrieved on 27 October 2026.
- **Population.** Rates per million people use Eurostat table tps00001, population on 1 January 2025.
- **Peer median.** The median of the ten comparison countries.
- **Checks.** Every indicator was recomputed by separate code in another language, and key counts were re-queried from the live registry. Every number on the page was traced back to the data. See the quality-check report.

## Limits

- Studies registered only in the EU's CTIS or EudraCT registers are not counted.
- Dates, status and enrolment are as the sponsors registered them.
- A trial with sites in several countries counts once for each country it runs in.

## Reproduce

```
node code/fetch.mjs            # writes scratch/trials_index/raw_<country>.json
node code/compute.mjs 2026-q4  # writes the edition JSON and CSVs
```

Node.js 18 or later. The code needs no packages.

## Cite

> Priya Life Science (2026). *Ireland Clinical Trials Performance Index, edition 1 (2026 Q4)* [Data set]. https://doi.org/10.5281/zenodo.23725680

BibTeX and RIS files are in `data/2026-q4/`. When you reuse the data, credit it as: "Source: Priya Life Science, Ireland Clinical Trials Performance Index, 2026 Q4 (CC BY 4.0)".

## Next edition

January 2027. Corrections are logged at https://priyalifescience.com/corrections. Send questions or corrections to info@priyalifescience.com.
