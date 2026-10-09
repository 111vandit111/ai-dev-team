# Code style guide

Follow this only when `.agent-team/style.md` is missing (or the user asks for a refresh, or the stack changed). The planner (M/L) or orchestrator (S/XS) builds it once from the **existing** code; every later run reuses it. Keep it cheap: a few dozen tool calls at most.

## 1. Find what to sample
Run `graphify query "main modules by layer" --budget 1000` and read `.agent-team/design.md` / `backend.md` if they exist. Pick 4–6 files across layers: one UI file (if any), one handler or service, one data or util module, one test. Prefer files that are typical and recently touched over the biggest or oldest. Read only enough lines to see the habits (about 60–100 each).

## 2. Count, don't guess
Use `grep -c` / `grep -rl` over the source folder to turn impressions into numbers:
- **structure:** `class ` vs plain functions/modules
- **recursion:** functions that call themselves (compare with loops over the same data)
- **error handling:** `try`/`catch` or `except` vs result/option values vs error codes; empty catches
- **async:** `async`/`await` vs `.then(` chains vs callbacks
- **mutability:** `let`/`var` and in-place mutation vs `const`/immutable updates
- **naming, file & folder layout, function size, imports, dependency injection, comments & docs density, test style, logging**

## 3. Write `.agent-team/style.md`
Use exactly this format:
```
# Code style   (sampled: <files>, <date>)
## Conventions
| area | the repo's way | evidence (file:line) | status |
## Decisions
- <YYYY-MM-DD> <area>: <keep repo way | use: <recommended way>> — <one-line reason given>
```
Record a convention only with **≥ 2 pieces of evidence** (two `file:line`s or a grep count). One sighting is an accident, not a convention; leave it out. Absence counts as evidence: "never uses recursion" = a grep count of 0 plus two loop examples (`file:line`) over tree or list data. Those loop examples are the `<file:line>` of a later `style:` item. An area with no evidence either way is left out. Status:
- `follow`: just follow it.
- `flag`: worth asking (see step 4).
- `decided`: a Decisions line exists; that line wins.

## 4. When to mark `flag`
Mark `flag` when the convention would force a worse design for the current task, or it is a known risk:
- recursion over unbounded input with no depth limit
- swallowed errors (empty catch, ignored return codes)
- god files (hundreds of lines doing many jobs) or huge functions
- global mutable state
- no input validation at the edges
Plain taste (quotes, naming, tabs) is never `flag`. Don't flag what the task doesn't touch.

## 5. Write a recommendation
When a task would naturally use something the repo avoids, or an area is `flag`, the planner adds one `style:` item to "Needs user decision" in the exact contract format:
`- style: <area> — repo: <repo way> (<file:line>) — recommend: <better structure> because <reason> — if declined: repo way`
Each item states the concrete alternative, why it is better here, and the cost to adopt (files touched, new pattern to learn, mixed styles in the repo). The default is always the repo's way: no answer, "no" or skipped means keep it.

## 6. After the answer
The orchestrator records **both** answers as a Decisions line and sets the area to `decided`: `use: <recommended way>`, or `keep repo way` (a "no", a skip and no answer all mean keep repo way, recorded so it is never re-asked). A decided area is never asked again, and the planner never plans around it. A "use: …" decision applies to new and changed code only; never refactor old code to match unless a task says so.
