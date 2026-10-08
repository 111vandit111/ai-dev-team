---
name: agent-team
description: Run a token-efficient multi-agent build pipeline (plan → build → check → verify → commit message) on the current project, sized to the task, using the project's graphify knowledge graph instead of raw file reads. Any role can use any model at any effort level. Use when the user asks to build, implement, add, or change a feature/app with the agent team, or invokes /agent-team.
argument-hint: "<what to build or change>"
---

# /agent-team

You are the **orchestrator**. You dispatch agents, run cheap shell checks yourself, route failures to the agent that caused them, and keep your context small. Subagents cannot start other subagents, so all dispatching happens here.

The task is: `$ARGUMENTS` (if empty, ask the user what to build).

## Hard rules
- **Nobody commits.** Not you, not any agent: no `git add/commit/push/reset/checkout/stash/rebase`. The run ends by *showing* a commit message. A plugin hook blocks git writes while `.agent-team/RUNNING` exists.
- **No paid or proprietary dependencies** unless the user approves one after seeing free alternatives.
- **Never continue without the graph.**
- If plan mode is active, stop and ask the user to exit it — agents must write files.

## The biggest cost is starting agents
Every new agent costs ~10–20K tokens of fixed overhead before it does anything. So:
- **Don't use an agent for what a shell command does.** Build, typecheck, lint, test runs and `graphify update` are run by *you* with Bash, output filtered to errors.
- **Group tasks.** One builder per *(model, effort)* group per wave — never one agent per task.
- **Size the team to the task** (Step 1). Small jobs use one or two agents total.
- **Resume, don't respawn** (`SendMessage` to the same agent for fixes).

## Dispatching
Every role runs on a generic worker whose effort is fixed by its name; the model is set per call:
```
Agent(subagent_type = "ai-dev-team:worker-<effort>", model = <model>, prompt = …)
```
`<effort>` ∈ `low | medium | high | xhigh | max`. The prompt starts with:
```
Role: <planner | builder | verifier | reviewer | tester>
Role file: <absolute path of this skill's directory>/roles/<role>.md
```
then only task-specific lines: paths and `file:line` pointers, never file contents or long logs.

## Working state — `.agent-team/` (gitignored)
| File | Purpose |
|------|---------|
| `config.json` | models/efforts per role, presets, commands — **exact shape of `references/config.example.json`** |
| `plan.md` | short table only: tasks, model, effort, wave, group |
| `contracts.md` | names shared across tasks (functions, routes, keys, props) — short |
| `tasks/T<n>.md` | one small file per task: do, pointers, owned files, done-when |
| `design.md` | existing app's design system (UI work only) |
| `notes.md` | shared findings, read before exploring, appended after |
| `tests/` | verifier/tester files and Playwright |
| `log.md` | one line per dispatch: agent id, role, model, effort, tasks, **tokens used** |
| `RUNNING` | lock while a run is active |
| `COMMIT_MSG.txt` | proposed commit message |

## Step 0 — Preflight (no agents)
Stop at the first item that needs the user.

**a. Graph.** If `graphify-out/graph.json` is missing, stop:
> This project has no knowledge graph yet. Run `/graphify` first — the agent team uses it instead of reading files. For a code-only project, `graphify update .` builds a code graph for free (no LLM).

If `graphify-out/.needs_update` exists, run `graphify update .`.

**b. Rules.** If `rules.md` is missing, ask: *write it myself* (wait) or *generate industry-standard rules* (detect stack, ask for extra instructions, fill `references/rules-template.md` keeping only relevant sections, show a summary to confirm).

**c. Config.** If `.agent-team/config.json` is missing or `version` ≠ `3`:
1. Copy `references/config.example.json` **exactly** — same keys and nesting. Set `allowed.models`/`allowed.efforts` to what the platform offers (`references/platforms.md`).
2. Commands: only commands that exist (for Node, scripts present in `package.json`). Never put one command in another's slot. TypeScript without a typecheck script → `npx tsc --noEmit` if `tsconfig.json` exists. Unknown → `""`.
3. Show one table — every role and preset with model + effort, the full `allowed` lists (`low → max`), and flags for pairs that won't take effect (Haiku ignores effort; older models cap lower). Let the user change any row. Save.

**d. UI tooling.** If the project has a UI and `commands.e2e` is empty, ask once to allow **Playwright** (free) installed *only inside `.agent-team/tests/`*: `cd .agent-team/tests && npm init -y && npm i -D @playwright/test && npx playwright install chromium`; set `commands.e2e` to `cd .agent-team/tests && npx playwright test`. If declined, UI checks are reported as BLOCKED.

**e. Housekeeping.** `.agent-team/` in `.gitignore`; keep existing `notes.md`; create `.agent-team/RUNNING`.

## Step 1 — Size the job
Run one `graphify query "<task>" --budget 800` yourself and estimate files touched and concerns involved.

| Size | Typical | Team |
|------|---------|------|
| **S** | ≤ 3 files, one concern (copy change, small fix, one component tweak) | No planner agent: you write `plan.md` + one `tasks/T1.md` yourself (≤ 15 lines). One builder. One verifier. |
| **M** | 4–10 files or 2–3 concerns | Planner. **At most 3 builder agents total** across all waves. One verifier. |
| **L** | > 10 files, new subsystem, new dependency, many concerns | Planner. Builders grouped per (model, effort) per wave. Separate reviewer and tester(s). |

Tell the user the size in the plan approval; they can override it.

## Step 2 — Plan
(S: write it yourself.) M/L: dispatch the planner (`roles.planner`) with the task text and size. It writes `plan.md`, `contracts.md`, `tasks/*.md`, and `design.md` for UI work.

Show the user `plan.md`'s table plus any "Needs user decision" items. Ask once: approve, change model/effort/size, or edit. Don't ask again unless blocked.

## Step 3 — Build
For each wave, group tasks by (model, effort). Dispatch **one builder per group, in parallel** (one message, several Agent calls), with its list of task files: "Your tasks: `.agent-team/tasks/T2.md`, `T5.md`. Read `contracts.md` if your tasks reference it." For M, respect the 3-builder cap by merging groups (use the higher effort of the merged tasks). Log agent ids against tasks.

A builder needing a file it doesn't own → follow-up task next wave. A builder wanting a paid dependency → ask the user.

## Step 4 — Check (you, with Bash — no agent)
After each wave and each fix, run the non-empty `commands.build`, `typecheck`, `lint` with errors only:
```
<cmd> 2>&1 | grep -iE "error|failed|✖|cannot|unexpected" | head -20
```
(plus the exit code). On failure, map files to owning tasks and `SendMessage` the owning builder only the relevant error lines. Retry policy applies. On success, run `graphify update .`.

## Step 5 — Verify
- **S / M:** one verifier agent (`roles.verifier`): reviews the diff against `rules.md` and tests the changed behaviour, including the UI layout checks when UI changed.
- **L:** reviewer (`roles.reviewer`), then tester(s) (`roles.tester`) — one per "Test areas" row, grouped to at most 3 agents. `ui-layout` is mandatory when UI changed.

Route each issue to the owning builder → Step 4 → re-verify only what changed. Report BLOCKED items to the user at the end.

## Step 6 — Commit message (you; no agent, no commit)
Read `git status --short` and `git diff --stat` (excluding `.agent-team/`), plus `plan.md`. Write `.agent-team/COMMIT_MSG.txt`:
```
<type>: <summary, imperative, ≤ 72 chars>

- <change and why>
```
Delete `.agent-team/RUNNING`. Show the message and how the user commits it:
`git add -A -- . ':!.agent-team' && git commit -F .agent-team/COMMIT_MSG.txt` — do not run it.

## Retry policy (per task)
1. Resume the same builder with the error. 2. Resume again with error + related verifier lines. 3. Escalate one effort level (up to `max`), then a stronger model, with a summary of both attempts. Nothing stronger allowed → ask the user.

## Finish
≤ 12 lines: what was built, size, agents used with **actual tokens per agent** (from each Agent result's usage, logged in `log.md`) and the total, retries, verification results incl. BLOCKED, then the commit message block. If the run stops early, still delete `.agent-team/RUNNING`.

## Other AI tools
No subagents → run the roles yourself in order, reading each `roles/<role>.md` first (`references/platforms.md`). Same files and rules, including never commit.
