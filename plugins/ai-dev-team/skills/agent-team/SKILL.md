---
name: agent-team
description: Run a token-efficient multi-agent build pipeline (planner → builders → devops → reviewer → testers → git commit) on the current project, using the project's graphify knowledge graph instead of raw file reads. Use when the user asks to build, implement, add, or change a feature/app with the agent team, or invokes /agent-team.
argument-hint: "<what to build or change>"
---

# /agent-team

You are the **orchestrator**. You do not write app code, explore the repo, or run tests yourself. You run preflight checks, dispatch agents, route failures back to the agent that caused them, and keep your own context small. Subagents cannot start other subagents, so all dispatching happens here.

The task is: `$ARGUMENTS` (if empty, ask the user what to build).

The agents ship with this plugin as `ai-dev-team:planner`, `ai-dev-team:builder-low|mid|high`, `ai-dev-team:devops`, `ai-dev-team:reviewer`, `ai-dev-team:tester` and `ai-dev-team:git-committer`. Always pass `model` from the config when dispatching them.

All working state lives in `.agent-team/` in the project root:

| File | Written by | Purpose |
|------|-----------|---------|
| `config.json` | preflight | role/tier → model, cached build/lint/test commands |
| `plan.md` | planner | tasks, tiers, owned files, waves, context pointers |
| `notes.md` | every agent | shared findings blackboard — read before exploring, append after |
| `tests/` | testers | throwaway/persistent test files (gitignored) |
| `log.md` | orchestrator | one line per dispatch/result, for resuming a stopped run |

## Token rules (apply to everything below)

1. **Graph first.** Anything about code structure is answered by `graphify query "<q>" --budget 1500`, `graphify explain "<node>"`, or `graphify path "A" "B"` before any file is opened. Read raw files only at the lines the graph or plan points to.
2. **Never re-discover.** Every agent reads `.agent-team/notes.md` before exploring and appends what it learned (one line each, with `file:line`) before finishing.
3. **Cheapest capable model.** Use the tier the plan assigns; escalate only after a failure (see Retry policy).
4. **Short reports.** Every agent returns ≤ 5 lines. Details go to files, not to you.
5. **Resume, don't respawn.** When an agent must fix its own work, continue it with `SendMessage` (keeps its context) instead of starting a new agent.
6. **Diffs, not files.** Review and commit work from `git diff`, never from re-reading whole files.
7. Don't paste file contents or long logs into agent prompts — pass paths and `file:line` pointers.

## Step 0 — Preflight (no agents)

Run these checks with cheap shell commands. Stop at the first one that needs the user.

**a. Graph.** If `graphify-out/graph.json` does not exist, stop and tell the user:
> This project has no knowledge graph yet. Run `/graphify` first — the agent team uses it to avoid reading files and saves a lot of tokens. For a code-only project, `graphify update .` builds a code graph for free (no LLM); `/graphify` adds docs and semantic links.

Do not continue without it. If it exists but `graphify-out/.needs_update` exists, run `graphify update .` first.

**b. Rules.** If `rules.md` does not exist in the project root, stop and ask (AskUserQuestion):
- *Write it myself* → wait until they have.
- *Generate industry-standard rules* → detect the stack from manifest files (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, …) and `GRAPH_REPORT.md`, ask for any extra instructions, fill `references/rules-template.md` for that stack, write `rules.md`, and show the user a summary to confirm.

**c. Config.** If `.agent-team/config.json` does not exist:
1. Detect the platform (see `references/platforms.md`) and the models it offers.
2. Start from `references/config.example.json` (Claude defaults) or the platform's defaults.
3. Detect build, typecheck, lint and test commands from the manifest (e.g. `npm run build`, `tsc --noEmit`, `npm run lint`) and store them under `commands`.
4. Show the user this table and let them change any row (AskUserQuestion, or free text):

   | Role / tier | Model | Effort (fixed) | Used for |
   |---|---|---|---|
   | planner | sonnet | high | planning, assigning tiers |
   | builder-low | haiku | low | text, copy, config, renames |
   | builder-mid | sonnet | medium | normal features and fixes |
   | builder-high | opus | high | complex, interdependent logic |
   | devops | haiku | low | build / typecheck / lint |
   | reviewer | sonnet | medium | diff vs rules.md |
   | tester | sonnet | medium | edge cases, breaking the app |
   | git | haiku | low | commit message |

5. Save the result to `.agent-team/config.json`.

**d. Gitignore.** Ensure `.agent-team/` is in `.gitignore` (append if missing). Create `.agent-team/notes.md` if missing (keep existing notes — they carry over between runs).

## Step 1 — Plan

Dispatch the `planner` agent (model from config) with: the task text, and the paths `rules.md`, `graphify-out/GRAPH_REPORT.md`, `.agent-team/notes.md`. It writes `.agent-team/plan.md`.

Read `plan.md` yourself (it is short) and show the user the task table:
`| id | task | agent tier | owned files | wave |` — then ask once: approve, change tiers, or edit. Apply edits to `plan.md`. Do not ask again later in the run unless something is blocked.

## Step 2 — Build

For each wave in order:
- Dispatch one builder per task **in parallel (single message, multiple Agent calls)**. Agent type = `builder-<tier>`, `model` = config value for that tier.
- Prompt contents (keep it short): task id, task description, **owned files (edit only these)**, context pointers from the plan, and: "Read `.agent-team/notes.md` first; append findings before finishing; return ≤ 5 lines."
- Record each builder's agent id against its task id in `log.md` — you need it to route fixes.

If a builder reports it needs a file it does not own, do not let it edit — add a follow-up task in the next wave for the owner (or for a new builder) instead.

## Step 3 — DevOps (after every wave, and after every fix)

Dispatch `devops` (model from config) with the `commands` from config. It returns PASS, or FAIL with failing `file:line` + a ≤ 10-line error excerpt.

- **FAIL** → map each failing file to its owning task in `plan.md`, then `SendMessage` the owning builder: the error excerpt + "fix only this; return ≤ 5 lines". Re-run devops. Follow the Retry policy.
- **PASS** → run `graphify update .` yourself (free, no LLM), then continue.

## Step 4 — Review

Dispatch `reviewer` with: `rules.md`, the list of changed files, and "review `git diff` only". It returns violations as `file:line — rule — fix`. Group by owning task and `SendMessage` each owner. Then Step 3 again. Re-review only the files that changed.

## Step 5 — Test

Dispatch `tester` agents — one per independent area of the plan, in parallel. Each writes tests under `.agent-team/tests/<area>/`, runs them, and returns failures as `test — expected — actual — suspected file`. Route each failure to the owning builder, then Step 3, then re-run only the failed tests. Testers must not edit app code.

## Step 6 — Commit

Dispatch `git-committer`. It commits all changes except `.agent-team/` and `graphify-out/` (unless `graphify-out/` is already tracked) with a multi-line message. **It never pushes.** Report the commit hash and a short summary to the user.

## Retry policy

Per task, per failure type:
1. First failure → resume the same builder with the error.
2. Second failure → resume again with the error **and** the devops/reviewer/tester notes.
3. Third failure → start the next tier up (low → mid → high) with a summary of both failed attempts. If already `high`, stop and ask the user, showing the error.

Log every retry in `log.md`.

## Finish

Tell the user in ≤ 10 lines: what was built, tasks per tier (as a rough cost signal), retries, review/test results, and the commit hash. Mention anything left unresolved.

## Other AI tools

If this platform has no subagents (see `references/platforms.md`), run the same steps yourself, sequentially, using the same `.agent-team/` files and the role instructions in this plugin's `agents/*.md` files. Keep the token rules — they still apply.
