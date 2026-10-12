# Scoring

Every recruiter scores the same 7 sections on 0-10. `scripts/score.py` does the math. The recruiter's own weights are in its block in `panel.md`.

## Sections
| key | Section | Covers |
|-----|---------|--------|
| `header` | Header & contact | name, phone, email, location, links; contact in the body, not a page header |
| `summary` | Summary | top-of-page pitch: role fit, level, 1-2 proof points |
| `experience` | Experience | titles, dates, scope, results, progression, relevance to the target |
| `skills` | Skills | target keywords with supporting bullets, recency, no stuffing |
| `projects` | Projects | own work that proves the skills; link, stack, outcome |
| `education` | Education & certs | degrees, courses, certificates that matter for the target |
| `formatting` | Formatting & ATS | single column, standard headings, plain-text parse order, length, no tables or graphics |

## Anchors
| Score | Meaning | Example mark |
|-------|---------|--------------|
| 0-3 | weak or missing | no dates on jobs; skills list with no proof; section needed but empty |
| 4-5 | below the bar | duties only, no results: "Responsible for backend services" |
| 6-7 | acceptable | clear role and scope, some numbers: "Cut API latency 30%" with no baseline |
| 8-9 | strong | most bullets give action, scope and a checkable result |
| 10 | exemplary | nothing to change for this target; every line earns its place |

Use one decimal only when it helps (6.5). Give a reason with the quoted line for every score.

## Absent section
- The role does not need it (for example no projects for a senior hire): `"absent-ok"`. Its weight is dropped and spread over the other sections.
- The role needs it: score 0-3, never `absent-ok`.

## Weights (percent per recruiter; each column sums to 100)
| key | ats | skim | tech | hm | agency | skeptic |
|-----|----:|-----:|-----:|---:|-------:|--------:|
| header | 10 | 10 | 0 | 0 | 5 | 5 |
| summary | 5 | 15 | 5 | 10 | 15 | 5 |
| experience | 20 | 30 | 30 | 45 | 35 | 40 |
| skills | 25 | 5 | 30 | 10 | 15 | 10 |
| projects | 5 | 5 | 20 | 15 | 5 | 15 |
| education | 5 | 15 | 5 | 5 | 10 | 5 |
| formatting | 30 | 20 | 10 | 15 | 15 | 20 |
| panel weight | 0.15 | 0.15 | 0.20 | 0.25 | 0.10 | 0.15 |

## Math
- Recruiter score = sum(section x weight) / sum(weights used), one decimal.
- Final = sum(panel weight x unrounded recruiter score), rounded half-up to one decimal (7.45 becomes 7.5).
- Verdict from the rounded final: 7.5 or more **Accept**, 6.0-7.4 **Maybe**, below 6.0 **Reject**.
- `score.py` ignores knock-outs when it picks the verdict. The orchestrator sets Reject only after verifying a knock-out.
- Spread = highest minus lowest recruiter score (the one-decimal scores).

## Knock-out
Flag one only for:
- a **required** item quoted from the JD, or a stated must-have for the role, that the resume clearly lacks, or
- a resume that cannot be read (scan with no text, garbled extraction).

Gaps, short tenures and missing nice-to-haves are never knock-outs: score a small deduction and list them as questions. The orchestrator checks that the quote is in the JD and that the resume really lacks the item.

## Disagreement
Spread above 3.0: the report says so and names the highest and lowest recruiter, with the reason each gave.

## Score line
The last fenced `json` block in each recruiter file. All 7 keys are required; a value is a number 0-10 or `"absent-ok"`; `knockout` is `null` or a string.
```json
{"id":"hm","sections":{"header":7,"summary":6.5,"experience":7,"skills":8,"projects":"absent-ok","education":6,"formatting":7},"knockout":null}
```
Knock-out string: `Required: "<quoted JD item>" - <what the resume lacks>` or `Unreadable: <why>`.

## If python3 is missing
1. Per recruiter: multiply each score by its weight, add them, divide by the sum of the weights used (leave out `absent-ok`). Round to one decimal.
2. Final: multiply each unrounded recruiter score by its panel weight, add, round half-up to one decimal.
3. Pick the verdict from the bands above; take the spread; build the two tables by hand.
