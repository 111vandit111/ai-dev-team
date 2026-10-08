# AI Dev Team — Multi-Agent Skills for Claude Code

**A token-efficient team of AI coding agents for Claude Code.** A planner, parallel builders, devops, a code reviewer, testers and a git agent work together. Each task gets the cheapest model that can do it (Haiku, Sonnet or Opus), and agents share what they find so nothing is researched twice.

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

Running one large model on every step of a coding task wastes tokens. A one-word text change doesn't need Opus. AI Dev Team splits the work and sends each piece to the right model:

| Agent | Default model | Effort | Job |
|-------|---------------|--------|-----|
| **planner** | Sonnet | high | Splits the task, picks the cheapest capable tier for each part, assigns files so no two builders touch the same one |
| **builder-low** | Haiku | low | Text, copy, config, renames |
| **builder-mid** | Sonnet | medium | Normal features and fixes |
| **builder-high** | Opus | high | Complex, interdependent logic |
| **devops** | Haiku | low | Runs build, typecheck and lint, and sends failures back to the builder that caused them |
| **reviewer** | Sonnet | medium | Checks the diff against your project's `rules.md` |
| **tester** | Sonnet | medium | Writes edge-case tests and tries to break the app |
| **git-committer** | Haiku | low | Writes one detailed multi-line commit. Never pushes |

On the first run, the skill shows this table. You can change any model, and your choices are saved in `.agent-team/config.json`.

## How it works

```
preflight ─► planner ─► builders (parallel, by wave) ─► devops ─► reviewer ─► testers ─► git commit
                              ▲                            │          │           │
                              └──── failure routed back to the builder that caused it ┘
```

1. **Preflight** checks for a knowledge graph, a `rules.md` and a model config. If any is missing, it asks you before continuing.
2. **The planner** reads the knowledge graph, not raw files. It writes a plan with tasks, tiers, owned files, waves and exact `file:line` pointers.
3. **Builders** run in parallel within each wave. Each one edits only the files it owns.
4. **Devops** checks the build after every wave. A failure goes back to the builder that caused it, which is resumed with its context. After two failures, the task moves up a tier.
5. After every successful build, **the graph is refreshed** with `graphify update .`, which costs no LLM tokens.
6. **The reviewer** checks the diff against `rules.md`. **Testers** write tests in `.agent-team/tests/`, which is gitignored, and try to break the app.
7. **The git agent** commits with a detailed multi-line message.

## How it saves tokens

- **Knowledge graph first.** Agents query a [graphify](https://github.com/Graphify-Labs/graphify) graph of your codebase instead of reading files.
- **Shared notes.** Every agent reads `.agent-team/notes.md` before exploring and adds what it found.
- **Exact pointers.** The planner gives builders `file:line` locations, so they don't need to search.
- **Right-sized models.** Each task gets the cheapest capable model and effort. A task moves up a tier only after failing twice.
- **Resume, don't restart.** Builders that need to fix their own work keep their context.
- **Diff-only review.**
- **Small agents.** Minimal tool lists, turn caps and reports of five lines or fewer keep every context small.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- **graphify**: `pip install graphifyy`, then run `/graphify` once in your project. The skill asks you to do this if the graph is missing.
- **`rules.md`** in your project root. If it's missing, the skill offers to generate an industry-standard one for your stack, including your own instructions.

## Other AI coding tools

`SKILL.md` uses the open Agent Skills format, so it also loads in other tools that support skills, such as Codex CLI, Gemini CLI and Cursor. On first run the skill lists that tool's models for you to map. On tools without subagents, the roles run one after another using the same files. You still get the token savings, but not the parallelism. See [`platforms.md`](plugins/ai-dev-team/skills/agent-team/references/platforms.md).

## FAQ

**Does it push to GitHub?** No. The git agent only commits locally.

**Are the test files committed?** No. They live in `.agent-team/tests/`, which is added to `.gitignore`.

**Can I change which model does what?** Yes. Edit `.agent-team/config.json`, or change the table on the first run.

**Can I use just the skill, without the agents?** Copy `plugins/ai-dev-team/skills/agent-team` into `~/.claude/skills/`. The agents come with the plugin install, so install the plugin to get the full team.

## Contributing

Issues and pull requests are welcome. If you find this useful, a ⭐ helps other people find it.

## License

MIT
