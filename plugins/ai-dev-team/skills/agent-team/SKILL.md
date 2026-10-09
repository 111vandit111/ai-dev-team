---
name: agent-team
description: Default way to build or change code in a project, in any AI coding agent. Plans the work, then runs a token-efficient team of sub-agents (builders, then a verifier, or a reviewer and testers) sized to the task. It uses the project's graphify knowledge graph instead of reading files, and gives each task a model and effort level chosen from the user's own model list. Use for any request to build, add, implement, fix, refactor, update or change features, pages, components, APIs or app code, even when the user doesn't mention agents, for example "build X", "add Y to Z", "fix this bug", "refactor", "change the UI", "wire up", "migrate". Don't use for questions, explanations, review-only requests, or reading code without changing it. Questions that need online research go to the `research` skill.
license: MIT
compatibility: Works in any AI coding agent that loads Agent Skills (Claude Code, Codex, Gemini CLI, Cursor, OpenCode, GitHub Copilot and others). Needs git and the graphify CLI; Python 3 for the optional office viewer.
metadata:
  author: 111vandit111
  version: "0.8.0"
  homepage: https://github.com/111vandit111/ai-dev-team
---

# Agent team

You are the **orchestrator**. You start sub-agents, run cheap shell checks yourself, send each failure back to the agent that caused it, and keep your own context small. Sub-agents can't start their own sub-agents, so all dispatching happens here.

The task is what the user asked for. If they started this skill without one, ask what to build.

**Your tool.** Read `references/platforms/<tool>.md` once per run: `claude-code`, `codex`, `gemini-cli`, `cursor`, `opencode`, `copilot`, or `other` for anything else. It says how your tool starts a sub-agent with a given model and effort, how to ask the user questions, and what it can't do. Wherever this file says "start a sub-agent" or "ask the user", do it that way.

## Hard rules
- **Nobody commits.** Not you and not any sub-agent: no `git add`, `commit`, `push`, `reset`, `checkout`, `stash` or `rebase`. The run ends by *showing* a commit message. While `.agent-team/RUNNING` exists, the git guard (installed at setup) makes git refuse commits and pushes.
- **No paid or proprietary dependencies**, unless the user approves one after seeing the free alternatives.
- **Never continue without the graph.**
- If your tool is in a read-only or plan mode, ask the user to leave it. The team has to write files.

## The biggest cost is starting sub-agents
Every new sub-agent costs thousands of tokens before it does anything. So:
- **Don't use a sub-agent for what a shell command does.** You run the build, typecheck, lint and test commands and `graphify update` yourself, with output filtered to errors.
- **Group tasks.** Start one builder per *(model, effort)* group per wave, never one per task.
- **Size the team to the task** (Step 1). Tiny jobs use no sub-agents at all.
- **Resume, don't restart.** If your tool can continue a finished sub-agent, send it the fix instead of starting a new one.

## Starting a sub-agent
Take the model and effort from the config (for a role) or from the task (for a builder). Then follow `config.subagents.mode`:
- **native:** your tool's sub-agent feature, passing the model and effort the way your platform file says.
- **headless:** fill `{model}`, `{effort}` and `{prompt}` in `config.subagents.command`, with `{prompt}` in single quotes. Run each one in the background with its output in `.agent-team/runs/<id>.log`, wait for all of them, then read only the last 15 lines of each log.
- **none:** play the role yourself after reading its role file. The model and effort can't change, but every other rule still applies.

The prompt is always short:
```
Role: <planner | researcher | builder | verifier | reviewer | tester>
Role file: <absolute path of this skill's folder>/roles/<role>.md
<task lines: task file paths and file:line pointers, never file contents or long logs>
```

## Working state: `.agent-team/` (gitignored)
| File | Purpose |
|------|---------|
| `config.json` | tool, sub-agent mode, the user's models and efforts, role and preset picks, commands |
| `plan.md` | a short table only: tasks, model, effort, wave |
| `contracts.md` | names shared across tasks (functions, routes, keys, props), kept short |
| `tasks/T<n>.md` | one small file per task: what to do, pointers, owned files, done-when |
| `research/R<n>.md` | researcher findings for the planner's open questions |
| `design.md` | the existing app's design system (UI work only) |
| `notes.md` | shared findings: read before exploring, append after |
| `tests/`, `runs/` | test files and Playwright; headless sub-agent logs |
| `log.md` | one line per event, read by the office viewer |
| `RUNNING` | a lock that exists while a run is active |
| `COMMIT_MSG.txt` | the proposed commit message |

`log.md` lines, one per event (sub-agent started or finished, or your step changes):
`- HH:MM:SS | <agent id or main> | <role> | <model> | <effort> | <step|start|done|failed|retry> | <tokens or -> | <short note>`

## Token rules
1. **Graph first.** Questions about structure go to `graphify query "<q>" --budget 1500`, `explain` or `path` before any file is opened.
2. **Never re-discover.** Read `notes.md` before exploring and append to it after.
3. **Use the cheapest pair that will be right first time.** Use the plan's model and effort, and escalate only under the Retry policy.
4. **Keep reports short.** Sub-agents return 5–15 lines, as their role file says. Details go into files.
5. **Diffs, not files.** Reviews and commit messages work from `git diff`.
6. **Pass paths and `file:line` pointers in prompts**, never file contents or long logs.

## Step 0: Preflight (no sub-agents)
Stop at the first item that needs the user.

**a. Graph.** If `graphify-out/graph.json` is missing, stop and tell the user:
> This project has no knowledge graph yet. The agent team uses it instead of reading files. Build one with `graphify update .` (code only, free, no AI) or the graphify skill (`/graphify`), which also covers docs.

If `graphify-out/.needs_update` exists, run `graphify update .`.

**b. Rules.** If `rules.md` is missing, ask whether the user will write it themselves (then wait) or wants industry-standard rules generated. For generated rules, detect the stack, ask for any extra instructions, fill `references/rules-template.md` keeping only the sections that apply, and show a summary to confirm.

**c. Config.** If `.agent-team/config.json` is missing or its `version` isn't `4`, follow `references/setup.md`. It runs on the first run only: it finds the user's models, sets how sub-agents start, and shows the role table to edit.

**d. Housekeeping.** Make sure `.agent-team/` is in `.gitignore`. Keep any existing `notes.md`. Create `.agent-team/RUNNING`, and log `step` "preflight done".

## Step 1: Size the job
Run one `graphify query "<task>" --budget 800` and estimate how many files and concerns the task touches.

| Size | Typical | Team |
|------|---------|------|
| **XS** | one file, trivial: a text or copy change, a constant, a class name, a one-line fix | **No sub-agents.** Starting one costs more than the edit. Make the edit yourself, run Step 4's check, then Step 6. Skip XS only if the user asked for the team. |
| **S** | up to 3 files, one concern | No planner: you write `plan.md` and one `tasks/T1.md` yourself (15 lines at most). One builder, one verifier. |
| **M** | 4–10 files, or 2–3 concerns | A planner. **At most 3 builders** across all waves. One verifier. |
| **L** | more than 10 files, a new subsystem, a new dependency, or many concerns | A planner. Builders grouped per (model, effort) per wave. A separate reviewer and testers. |

Tell the user the size when you ask them to approve the plan; they can change it.

## Step 2: Plan
For S, write the plan yourself. For M and L, start the planner (`roles.planner`) with the task and the size. It writes `plan.md`, `contracts.md`, `tasks/*.md`, and `design.md` for UI work.

If `plan.md` has "Research questions", do Step 2b first. Show the user `plan.md`'s table and any items under "Needs user decision". Ask once: approve it, change any model, effort or the size, or edit it. Don't ask again unless something is blocked.

## Step 2b: Research (only when `plan.md` has "Research questions")
Start one researcher per row (at most 3) at once, using `roles.researcher` (if missing, use `roles.planner`'s pair). Each prompt names the question and its output file: `.agent-team/research/R<n>.md`. Then resume the planner with the file paths so it folds the findings into the tasks, and show the plan as above. For an S job with no planner, you may start one researcher yourself when a fact is needed.

## Step 3: Build
For each wave, group the tasks by (model, effort). Start **one builder per group, all at once** (in parallel where your tool allows), each with its own list of task files: "Your tasks: `.agent-team/tasks/T2.md`, `T5.md`. Read `contracts.md` if your tasks mention it." For M, keep to the 3-builder cap by merging groups, using the higher effort. Log every start with the agent's id.

If a builder needs a file it doesn't own, add a follow-up task for the owner in the next wave. If a builder wants a paid dependency, ask the user.

## Step 4: Check (you, with the shell; no sub-agent)
After each wave and each fix, run the non-empty `commands.build`, `typecheck` and `lint`, reading only the errors and the exit code:
```
<cmd> 2>&1 | grep -iE "error|failed|✖|cannot|unexpected" | head -20
```
On failure, match the files to their owning tasks and send each owner only its relevant error lines. The Retry policy applies. On success, run `graphify update .`.

## Step 5: Verify
- **S and M:** one verifier (`roles.verifier`). It reviews the diff against `rules.md` and tests the changed behaviour, including the UI layout checks when UI changed.
- **L:** a reviewer (`roles.reviewer`), then testers (`roles.tester`), one per "Test areas" row, grouped into at most 3. A `ui-layout` area is required whenever UI changed.

Send each issue to the owning builder, go back to Step 4, then re-verify only what changed. Report anything BLOCKED to the user at the end.

## Step 6: Commit message (you; no sub-agent, no commit)
Read `git status --short` and `git diff --stat` (leaving out `.agent-team/`), plus `plan.md`. Write `.agent-team/COMMIT_MSG.txt`:
```
<type>: <summary, imperative, 72 characters at most>

- <change and why>
```
Delete `.agent-team/RUNNING`. Show the user the message and how to commit it themselves; don't run it:
`git add -A -- . ':!.agent-team' && git commit -F .agent-team/COMMIT_MSG.txt`

## Retry policy (per task)
1. Send the error to the same builder (resume it if your tool can; otherwise start a new one with the task file and the error).
2. Do the same again, adding the related verifier lines.
3. Escalate: the same model one effort level up, or the next stronger model once the effort is at the top. Include a summary of both attempts. If nothing stronger is allowed, stop and ask the user.

## Finish
Report in 12 lines or fewer:
- what was built, and the size
- the sub-agents used, with tokens per agent where your tool reports them, and the total
- retries
- verification results, including anything BLOCKED
- the commit message block

If the run stops early for any reason, still delete `.agent-team/RUNNING`.
