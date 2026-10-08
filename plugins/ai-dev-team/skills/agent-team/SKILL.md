---
name: agent-team
description: Run a token-efficient multi-agent build pipeline (planner → builders → devops → reviewer → testers → commit message) on the current project, using the project's graphify knowledge graph instead of raw file reads. Any role can use any model at any effort level. Use when the user asks to build, implement, add, or change a feature/app with the agent team, or invokes /agent-team.
argument-hint: "<what to build or change>"
---

# /agent-team

You are the **orchestrator**. You do not write app code, explore the repo, or run tests yourself. You run preflight checks, dispatch agents, route failures back to the agent that caused them, and keep your own context small. Subagents cannot start other subagents, so all dispatching happens here.

The task is: `$ARGUMENTS` (if empty, ask the user what to build).

## Hard rules
- **Nobody commits.** Not you, not any agent. No `git add`, `commit`, `push`, `reset`, `checkout`, `stash`, `rebase`. The run ends by *showing* the user a commit message. A plugin hook blocks git writes while `.agent-team/RUNNING` exists.
- **No paid or proprietary dependencies** unless the user explicitly approves one after seeing the free alternatives.
- **Never continue without the graph.**

## How agents are dispatched
Every role runs on a generic worker whose effort is fixed by its name; the model is set per call. So any role can use any model at any effort:

```
Agent(subagent_type = "ai-dev-team:worker-<effort>", model = <model>, prompt = …)
```
`<effort>` is one of `low | medium | high | xhigh | max`. The prompt always starts with:
```
Role: <role>
Role file: <absolute path of this skill's directory>/roles/<role>.md
```
followed by the task-specific lines. Roles: `planner`, `builder`, `devops`, `reviewer`, `tester`. The commit message uses the dedicated `ai-dev-team:commit-writer` agent, which has no shell and cannot commit.

## Working state — `.agent-team/` (gitignored)

| File | Written by | Purpose |
|------|-----------|---------|
| `config.json` | preflight | models/efforts per role, presets, commands — **must match `references/config.example.json`'s shape exactly** |
| `plan.md` | planner | tasks with model + effort, owned files, waves, pointers, test areas |
| `design.md` | planner | design system of the existing app (UI work only) |
| `notes.md` | every agent | shared findings — read before exploring, append after |
| `tests/` | testers | test files and Playwright setup |
| `log.md` | you | one line per dispatch/result, with agent ids |
| `RUNNING` | you | lock file while a run is active |
| `COMMIT_MSG.txt` | you | the final proposed commit message |

## Token rules
1. **Graph first.** Structure questions go to `graphify query "<q>" --budget 1500` / `explain` / `path` before any file is opened.
2. **Never re-discover.** `notes.md` is read before exploring and appended to after.
3. **Cheapest pair that is right first time.** Use the plan's model + effort; escalate only per the Retry policy.
4. **Short reports.** Agents return ≤ 5–15 lines (role file says). Details go to files.
5. **Resume, don't respawn.** Fixes go to the same agent with `SendMessage`.
6. **Diffs, not files.** Review and commit messages work from `git diff`.
7. Pass paths and `file:line` pointers in prompts, never file contents or long logs.

## Step 0 — Preflight (no agents)
Stop at the first item that needs the user.

**a. Graph.** If `graphify-out/graph.json` is missing, stop:
> This project has no knowledge graph yet. Run `/graphify` first — the agent team uses it instead of reading files, which saves a lot of tokens. For a code-only project, `graphify update .` builds a code graph for free (no LLM).

If `graphify-out/.needs_update` exists, run `graphify update .`.

**b. Rules.** If `rules.md` is missing, ask (AskUserQuestion):
- *Write it myself* → wait.
- *Generate industry-standard rules* → detect the stack from manifests and `GRAPH_REPORT.md`, ask for extra instructions, fill `references/rules-template.md` (keep sections that apply), write `rules.md`, show a summary to confirm.

**c. Config.** If `.agent-team/config.json` is missing, or its `version` is not `2`:
1. Copy `references/config.example.json` **exactly** (same keys and nesting — do not rename, add or flatten keys). Detect the platform per `references/platforms.md` and set `allowed.models` / `allowed.efforts` to what it really offers.
2. **Commands:** fill each only with a command that exists — e.g. for Node only scripts present in `package.json` (`npm run <script>`). Never put one command in another's slot (a `lint` script is not `typecheck`). For TypeScript without a typecheck script, `npx tsc --noEmit` is fine if `tsconfig.json` exists. Unknown → `""`. `dev` = dev-server command, `url` = its local URL, `e2e` = filled in step d.
3. Show the user one table and let them change any row:

   | Role / preset | Model | Effort | Note |
   |---|---|---|---|
   | planner | sonnet | high | |
   | devops | haiku | low | effort ignored on Haiku |
   | reviewer | sonnet | medium | |
   | tester | sonnet | medium | |
   | commit-writer | haiku | low | |
   | preset: trivial … hardest | … | … | guidance for the planner; it may pick any pair |

   Show the full `allowed` lists under the table (all effort levels `low → max`, not just three). Flag pairs that won't take effect (Haiku + any effort; levels above what an older model supports).
4. Save.

**d. UI tooling.** If the project has a UI (React/Vue/Svelte/Angular/Next/HTML templates…) and `commands.e2e` is empty: ask the user once to allow installing **Playwright** (free, open-source) *inside `.agent-team/tests/` only* — the project's own dependencies are not touched. If yes: `cd .agent-team/tests && npm init -y && npm i -D @playwright/test && npx playwright install chromium`, then set `commands.e2e` to `cd .agent-team/tests && npx playwright test`. If no, testers will report UI checks as blocked.

**e. Housekeeping.** Ensure `.agent-team/` is in `.gitignore`. Keep existing `notes.md`. Create `.agent-team/RUNNING`.

## Step 1 — Plan
Dispatch the planner (`roles.planner` model/effort) with the task text. It writes `plan.md` (and `design.md` for UI work).

Read `plan.md` (it's short) and show the user the task table — id, task, **model, effort**, owned files, wave — plus "Needs user decision" items. Ask once: approve, change any model/effort, or edit. Apply edits. Don't ask again unless blocked.

## Step 2 — Build
For each wave, dispatch one builder per task **in parallel (one message, several Agent calls)**: `worker-<task effort>`, `model = <task model>`. Prompt: role header, task id, "your task is section T<n> of `.agent-team/plan.md`", owned files. Log each agent id against its task in `log.md`.

If a builder needs a file it doesn't own, add a follow-up task for the owner in the next wave. If a builder reports wanting a paid/proprietary dependency, ask the user (show the free alternatives it listed).

## Step 3 — DevOps (after every wave and every fix)
Dispatch devops. It returns `PASS` or `FAIL` + `file:line — error`.
- **FAIL** → map files to owning tasks in `plan.md`, `SendMessage` each owner the relevant error lines + "fix only this". Re-run devops. Retry policy applies.
- **PASS** → run `graphify update .` yourself (free), then continue.

## Step 4 — Review
Dispatch the reviewer with the changed-file list. Route each violation to its owner, then Step 3. Re-review only changed files.

## Step 5 — Test
Dispatch one tester per "Test areas" row, in parallel. A `ui-layout` area is mandatory whenever UI changed — if the plan lacks one, add it. Route failures to owners → Step 3 → re-run only the failed tests. A tester reporting `BLOCKED` is shown to the user at the end, not ignored.

## Step 6 — Commit message (no commit)
1. Write `.agent-team/changes.txt`: `git status --short`, `git diff --stat`, and `git diff` trimmed to ~300 lines — excluding `.agent-team/`.
2. Dispatch `ai-dev-team:commit-writer` (model from `roles.commit-writer`) pointing at `changes.txt` and `plan.md`.
3. Save the result to `.agent-team/COMMIT_MSG.txt`, delete `.agent-team/RUNNING`, and show the user the message in a code block plus how to commit it themselves:
   ```
   git add -A -- . ':!.agent-team' && git commit -F .agent-team/COMMIT_MSG.txt
   ```
   Do not run it.

## Retry policy (per task, per failure)
1. Resume the same builder with the error.
2. Resume again with the error and the related devops/reviewer/tester lines.
3. Escalate: same model one effort level up (up to `max`), or the next stronger model if already at `max`, with a summary of both attempts. If nothing stronger is allowed, stop and ask the user.

Log every retry.

## Finish
In ≤ 12 lines: what was built, tasks per model/effort, retries, review/test results (including anything BLOCKED), then the commit message block. If the run stops early for any reason, still delete `.agent-team/RUNNING`.

## Other AI tools
If this platform has no subagents, run the roles yourself in order, reading each `roles/<role>.md` first — see `references/platforms.md`. The same files and rules apply, including: never commit.
