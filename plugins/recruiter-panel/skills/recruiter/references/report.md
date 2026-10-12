# Report template: `resume-review.md`

Write this file in the current folder. R = required, O = optional (skip the block if empty). Quote resume lines exactly.

```markdown
# Resume review: <name of file or "pasted resume">
**Target:** <role> at <company> | **Date:** <YYYY-MM-DD>            (R)

**Score:** <final> / 10 | **Verdict:** <Accept|Maybe|Reject>        (R)
**Knock-out:** <reason with the JD quote and what the resume lacks>  (O: only if verified)

## Panel scores                                                     (R)
<paste the recruiter table from score.py>

<paste the section table from score.py>

## Where the panel disagrees                                        (O: only if spread > 3.0)
<highest and lowest recruiter, their scores, the reason each gave, which view you trust and why>

## Strengths                                                        (R)
- <strength> - "<resume line>"

## Must fix                                                         (R)
Raised by 2+ recruiters or tied to a knock-out.
1. **<section>** [<recruiter ids>]: "<quoted line>"
   - Problem: <one line>
   - Rewrite: <suggested line, only facts from the resume; [?] where a number is missing>

## Should fix                                                       (O)
<same shape as Must fix>

## Nice to have                                                     (O)
<same shape as Must fix>

## Red flags                                                        (O)
- <flag> - "<resume line>" [<recruiter ids>]

## Interview prep                                                   (R)
5-10 questions, highest likelihood first.
1. **<question>** (likelihood: high|med|low, from <interviewer id>)
   - Triggered by: "<resume line>"
   - Tests: <what the interviewer is checking>
   - Tip: <one-line answer tip; for behavioral: Situation, Task, Action, Result with the story to use>

## ATS plain-text check                                             (R)
<what the plain-text extraction showed: reading order, lost headings, broken contact info, or "clean">

## LaTeX changes                                                   (O: only when a .tex was given)
1. **<section>** [<recruiter ids or ats-parse>]: "<before>" → "<after>" — <why>

### Needs your input
- <each `% TODO(recruiter)` question and the line it affects>

### Updated LaTeX
Saved as `resume-fixed.tex` (compiled: yes|no). Paste this into Overleaf:
```latex
<the full resume-fixed.tex>
```

## What was judged                                                  (R)
Job-related content only. Name, photo, age, gender, ethnicity, religion, nationality, marital status and disability were not scored.
<If the target came from general role knowledge, not a pasted JD: "The target is based on general knowledge of <role>; items marked [?] and the must-haves are assumptions.">

## Next step                                                        (R)
Want a rebuild guide and a rewritten draft? It will be saved as `resume-rebuild.md`.
```
