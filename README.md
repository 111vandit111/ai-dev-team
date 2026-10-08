# AI Dev Team — Multi-Agent Skills for Claude Code

**A token-efficient team of AI coding agents for Claude Code.** A planner, parallel builders, and a verifier (or a reviewer and testers on big jobs) work together, sized to the task. Each task gets the cheapest model and effort that will get it right (Haiku, Sonnet, Opus, from low to max), and agents share what they find so nothing is researched twice.

> Claude Code subagents · multi-agent workflow · per-task model selection · lower token usage · automated code review · AI testing · auto commit messages

## Install

In Claude Code:

```
/plugin marketplace add 111vandit111/ai-dev-team
/plugin install ai-dev-team@ai-dev-team
```

Then, in any project:

```
/agent-team add a dark-mode toggle to the settings page
```

## Why use it

Running one large model on every step of a coding task wastes tokens. A one-word text change doesn't need Opus. AI Dev Team splits the work, and **each task gets its own model and effort level**. You can use any model with any effort, from Haiku at low to Opus at `max`.

| Role | Default model · effort | Job |
|------|------------------------|-----|
| **planner** | Sonnet · high | Splits the task, picks a model + effort per task, gives each builder its own files and a small task file, writes a design brief from your existing UI |
| **builders** | chosen per task | Make the changes in parallel, one agent per model/effort group. They reuse your existing components and design tokens |
| **verifier** | Sonnet · medium | Small and medium jobs: reviews the diff against `rules.md` **and** tries to break the app, in one pass |
| **reviewer + testers** | Sonnet · medium | Large jobs: separate review, then testers covering edge cases, auth, and **responsive layout at 9 viewport sizes from 320 to 1920px** (Playwright) |

The build, typecheck and lint checks, the graph refresh and the commit message are handled by the main session, not separate agents. Nothing is ever committed for you.

### Sized to the job

| Size | Example | Agents |
|------|---------|--------|
| **S** | Copy change, small fix, one component tweak | 1 builder + 1 verifier (no planner agent) |
| **M** | Feature touching 4–10 files | Planner + up to 3 builders + 1 verifier |
| **L** | New subsystem, new dependency, 10+ files | Planner + grouped builders + reviewer + up to 3 testers |

At the end you see the **real token count per agent**, not an estimate.

On the first run, the skill shows every role with its model and effort (`low`, `medium`, `high`, `xhigh`, `max`). You can change any of them, and your choices are saved in `.agent-team/config.json`. You can also change the model and effort per task when you approve the plan.

## How it works

```
preflight ─► size ─► planner ─► builders (parallel, by wave) ─► build check ─► verify ─► commit message (shown, not committed)
                              ▲                            │          │           │
                              └──── failure routed back to the builder that caused it ┘
```

1. **Preflight** checks for a knowledge graph, a `rules.md` and a model config. For UI projects, it offers to install Playwright in a gitignored folder, without touching your project's dependencies.
2. **The planner** reads the knowledge graph, not raw files. It writes a plan listing each task's model, effort, owned files, wave and exact `file:line` pointers.
3. **Builders** run in parallel within each wave. Each one edits only the files it owns.
4. **The build is checked** with shell commands after every wave, with no agent involved. A failure goes back to the builder that caused it, which is resumed with its context. After two failures, the task moves up one effort level, then to a stronger model.
5. After every successful build, **the graph is refreshed** with `graphify update .`, which costs no LLM tokens.
6. **Verification** checks the diff against `rules.md` and your design, and tries to break the app.
7. **You get a commit message.** Nothing is ever committed or pushed for you. A plugin hook blocks git writes while a run is active.

## Live agent office

While the team works, a side pane shows the office. Every agent is a person at a desk, and the main agent sits at the center desk:

```
╭──────────────────────╮╭──────────────────────╮
│ o   .----.           ││ o/  .----.           │
│/|\_ |=== |           ││/|   | ok |           │
│/ \  '----'           ││/ \  '----'           │
│builder               ││planner               │
│sonnet · medium       ││sonnet · high         │
│> Edit · 8.2k tok     ││done · 14.1k tok      │
╰──────────────────────╯╰──────────────────────╯
        ╔════════════════════════════╗
        ║ o   .----.                 ║
        ║/|_/ |==  |                 ║
        ║/ \  '----'                 ║
        ║main agent                  ║
        ║> Agent                     ║
        ║1 working · 1 done          ║
        ║team: 22.3k tok             ║
        ╚════════════════════════════╝
```

- Each desk shows the agent's role, model and effort, the tool it's using right now, and its **real** token count.
- Desks are yellow while working, green when done, and red when failed.
- The pane opens by itself when the first agent starts, if the terminal is at least 144 columns wide. Otherwise, type `/office` to open it, or `/office clear` to empty it.
- **It costs no tokens.** The pane is drawn by plugin hooks from Claude Code's own events, with no model calls. It needs a Claude Code version that supports plugin panes; on older versions the rest of the plugin works without it.

## Built-in guardrails

- **No paid libraries.** The order of preference is: what the project already uses, then the standard library, then free open-source. A paid option is only ever presented to you as a decision, next to the free alternatives.
- **Consistent design.** New UI has to match your existing pages, components and design tokens.
- **No commits.** Committing is up to you.

## How it saves tokens

- **Knowledge graph first.** Agents query a [graphify](https://github.com/Graphify-Labs/graphify) graph of your codebase instead of reading files.
- **Shared notes.** Every agent reads `.agent-team/notes.md` before exploring and adds what it found.
- **Exact pointers.** The planner gives builders `file:line` locations, so they don't need to search.
- **Right-sized models.** Each task gets the cheapest model + effort pair that will be right first time. It only escalates after failing twice.
- **Resume, don't restart.** Builders that need to fix their own work keep their context.
- **Diff-only review.**
- **Few agents.** Starting an agent costs 10–20K tokens before it does anything, so shell commands replace agents wherever possible, tasks are grouped, and the team is sized to the job.
- **Small task files.** Each builder reads only its own task file, not the whole plan.
- **Small agents.** Minimal tool lists, turn caps and reports of five lines or fewer keep every context small.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- **graphify**: `pip install graphifyy`, then run `/graphify` once in your project. The skill asks you to do this if the graph is missing.
- **`rules.md`** in your project root. If it's missing, the skill offers to generate an industry-standard one for your stack, including your own instructions.

## Other AI coding tools

`SKILL.md` uses the open Agent Skills format, so it also loads in other tools that support skills, such as Codex CLI, Gemini CLI and Cursor. On first run the skill lists that tool's models for you to map. On tools without subagents, the roles run one after another using the same files. You still get the token savings, but not the parallelism. See [`platforms.md`](plugins/ai-dev-team/skills/agent-team/references/platforms.md).

## FAQ

**Does it commit or push?** No. It shows you a commit message and saves it to `.agent-team/COMMIT_MSG.txt`. You commit with `git commit -F .agent-team/COMMIT_MSG.txt`.

**Are the test files committed?** No. They live in `.agent-team/tests/`, which is added to `.gitignore`.

**Can I change which model does what?** Yes, any role or task can use any model at any effort. Edit `.agent-team/config.json`, or change the plan table before the build starts. (Haiku doesn't support effort levels, so effort has no effect on it.)

**Can I use just the skill, without the agents?** Copy `plugins/ai-dev-team/skills/agent-team` into `~/.claude/skills/`. The agents come with the plugin install, so install the plugin to get the full team.

## Contributing

Issues and pull requests are welcome. If you find this useful, a ⭐ helps other people find it.

## License

MIT
