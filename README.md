# AI Dev Team: a multi-agent skill for any AI coding agent

**A token-efficient team of AI coding agents** for Claude Code, OpenAI Codex, Gemini CLI, Cursor, OpenCode, GitHub Copilot and any tool that supports [Agent Skills](https://agentskills.io).

A planner, parallel builders and a verifier (or a reviewer and testers on big jobs) work together, sized to the task. Researchers look up open questions online, so the team builds on current best solutions. Each task gets the cheapest model and effort level from **your own model list** that will get it right. Agents share what they find, so nothing is researched twice.

> multi-agent workflow · sub-agents · per-task model selection · lower token usage · automated code review · AI testing · commit messages · Agent Skills · AGENTS.md

## Install

**Codex, Gemini CLI, Cursor, OpenCode, GitHub Copilot and other Agent Skills tools.** One command installs both skills (`agent-team` and `research`) to `~/.agents/skills`, which all of them read:

```bash
curl -fsSL https://raw.githubusercontent.com/111vandit111/ai-dev-team/main/install.sh | bash
```

**Claude Code.** Install as a plugin. It adds effort-level workers, a live office pane and a git-write block:

```
/plugin marketplace add 111vandit111/ai-dev-team
/plugin install ai-dev-team@ai-dev-team
```

Other options (`./install.sh --help`): `--project` installs into this project's `.agents/skills`, `--dir PATH` installs into any skills folder (for example `~/.kiro/skills`), `--claude` also installs the Claude Code plugin, `--link` symlinks for development, and `--uninstall` removes it.

Then ask your AI tool for what you want. The skill starts on its own for build, add, fix and change requests:

```
add a dark-mode toggle to the settings page
```

## Your models, not ours

Nothing is hard-coded. On the first run in a project, the skill builds your model list from your own tool:

1. It looks for your models where it can: your tool's sub-agent model options, or a list command such as `opencode models` or `agent --list-models`.
2. It shows you what it found and asks you to check it against your model picker (`/model` or `/models`), or to paste the list if it found nothing.
3. It shows a table that works like a model picker. Every role and task tier gets a model and an effort level from your lists, and you can change any row:

| Row | Default | Used for |
|-----|---------|----------|
| trivial | cheapest model · lowest effort | text, copy, config, renames |
| normal | mid model · medium effort | normal features and fixes |
| tricky | mid model · high effort | tricky logic in one place |
| complex | strongest model · high effort | interdependent logic, security, migrations |
| hardest | strongest model · top effort | deep reasoning |
| planner | mid model · high effort | splits the task, picks a model and effort per task |
| verifier / reviewer / tester | mid model · medium effort | review against your `rules.md`, and trying to break the app |
| researcher | mid model · medium effort | looks up current best solutions online for open questions |

Your choices are saved in `.agent-team/config.json`. You can also save them as your default for new projects, and change the model or effort of any task when you approve the plan.

## How it works

```
preflight ─► size ─► plan ─► builders (parallel, by wave) ─► build check ─► verify ─► commit message (shown, never committed)
                               ▲                                 │              │
                               └──── each failure goes back to the builder that caused it
```

1. **Preflight** checks for a knowledge graph, a `rules.md` and your model setup. It asks you before continuing if anything is missing.
2. **The job is sized.** Tiny edits use no sub-agents at all. Small jobs use one builder and one verifier. Big jobs get the full team.
3. **The planner** reads the knowledge graph, not raw files. It writes one small task file per task, with exact `file:line` pointers, owned files and the model and effort to use. If the plan depends on an open question, such as which library to use, the planner sends it to researchers first, and you see their sourced answers before you approve.
4. **Builders** run in parallel, one per model/effort group, and each edits only the files it owns.
5. **The build is checked** with shell commands after every wave, with no agent involved. A failure goes to the builder that caused it, and moves up one effort level, then to a stronger model, only after failing twice.
6. **Verification** reviews the diff against `rules.md` and your design, and tries to break the app, including **responsive layout at 9 screen widths** from 320 to 1920 px with Playwright.
7. **You get a commit message.** Nothing is ever committed or pushed for you.

### How sub-agents start in your tool

| Tool | Sub-agents | Model per task |
|------|-----------|----------------|
| Claude Code | native (plugin workers) | ✓ model and effort |
| Codex | native (spawned `worker` agents), or `codex exec` | ✓ model and reasoning effort |
| Gemini CLI | headless `gemini -m … -p …`, or one agent file per model | ✓ model |
| OpenCode | `mode: subagent` agents, or `opencode run -m …` | ✓ model |
| GitHub Copilot CLI | custom agents with `model` and `reasoning-effort` | ✓ model and effort |
| Cursor | Cursor CLI `agent -p --model …`; in the editor, roles run one after another | ✓ with the CLI |
| Anything else | its sub-agent feature or headless mode if it has one; otherwise one after another | depends on the tool |

Headless runs edit files without asking each time, so the skill asks for your OK first and uses the narrowest permission flags. Details are in [`references/platforms/`](plugins/ai-dev-team/skills/agent-team/references/platforms).

## How it saves tokens

- **Knowledge graph first.** Agents query a [graphify](https://github.com/Graphify-Labs/graphify) graph of your code instead of reading files.
- **Fewer sub-agents.** Each one costs thousands of tokens before it does anything, so shell commands replace agents wherever possible, tasks are grouped, and the team is sized to the job.
- **Shared notes.** Every agent reads `.agent-team/notes.md` before exploring and adds what it found.
- **Small task files.** Each builder reads only its own task file, not the whole plan.
- **Right-sized models.** Each task gets the cheapest model and effort that will be right first time.
- **Resume, don't restart.** Builders fix their own work with their context kept, where your tool allows it.
- **Diff-only review**, and short reports from every agent.
- **First-run setup lives in its own file**, so normal runs never read it.

## Research skill

Ask a question instead of asking for a build. The `research` skill splits it into 2–4 angles, runs a researcher for each in parallel, and writes one answer with sources, trade-offs, a recommendation and a confidence level. It never changes your code.

```
which PDF parsing library should I use for a Python service in 2026, and is it still maintained?
```

## Guardrails

- **Nothing gets committed.** An optional git guard makes git itself refuse commits and pushes while a run is active, whichever AI tool is running. The Claude Code plugin also blocks git writes with a hook.
- **No paid libraries.** The order of preference is what the project already uses, then the standard library, then free open-source. A paid option only ever reaches you as a question, next to the free alternatives.
- **Consistent design.** New UI has to match your existing pages, components and design tokens.

## Watch the team work

**In any tool**, open a second terminal in your project:

```bash
python3 ~/.agents/skills/agent-team/scripts/office.py
```

Every agent is a person at a desk, and the main agent sits at the center desk. Each desk shows the agent's role, model, effort, status and tokens. The viewer reads the team's log file, so it costs no tokens.

```
        ╭──────────────────────╮ ╭──────────────────────╮
        │  o/  .----.          │ │  o   .----.          │
        │ /|   | ok |          │ │ /|\_ |=== |          │
        │ / \  '----'          │ │ / \  '----'          │
        │ planner A1           │ │ builder A2           │
        │ mid-model · high     │ │ cheap-model · low    │
        │ done · 14.1k tok     │ │ working · - tok      │
        ╰──────────────────────╯ ╰──────────────────────╯
                  ╔══════════════════════════════╗
                  ║  o   .----.                  ║
                  ║ /|_/ |==  |                  ║
                  ║ / \  '----'                  ║
                  ║ main agent                   ║
                  ║ Step 3 build, wave 1         ║
                  ║ 1 working · 1 done           ║
                  ║ team: 14.1k tok              ║
                  ╚══════════════════════════════╝
```

**In Claude Code**, the plugin also draws the office inside Claude Code itself: a band above the prompt, or a side panel in the fullscreen layout. It shows each agent's current tool and real token counts. Use `/office` to make it bigger, and `/office off` to hide it.

## Requirements

- An AI coding tool (any of the ones above)
- **graphify**: `pip install graphifyy`, then build the graph with `graphify update .` (code only, free) or your tool's graphify skill
- **git**, and **Python 3** for the office viewer
- **`rules.md`** in your project root. If it's missing, the skill offers to generate an industry-standard one for your stack, including your own instructions.

## FAQ

**Does it commit or push?** No. It shows you a commit message and saves it to `.agent-team/COMMIT_MSG.txt`. You commit with `git commit -F .agent-team/COMMIT_MSG.txt`.

**Are test files committed?** No. They live in `.agent-team/tests/`, which is added to `.gitignore`.

**My tool has no sub-agents. Does it still work?** Yes. The roles run one after another in the same session, with the same files and token rules. You lose parallel work and per-task models, nothing else.

**How do I make it my tool's default?** Each [platform file](plugins/ai-dev-team/skills/agent-team/references/platforms) gives the one line to add to your tool's instructions file (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md` or a Cursor rule).

**Where are the instructions?** [`SKILL.md`](plugins/ai-dev-team/skills/agent-team/SKILL.md) holds the main run, and `roles/` holds what each agent follows.

## Contributing

Issues and pull requests are welcome, especially platform notes for more AI tools. If you find this useful, a ⭐ helps other people find it.

## License

MIT
