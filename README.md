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

Running one large model on every step of a coding task wastes tokens. A one-word text change doesn't need Opus. AI Dev Team splits the work, and **each task gets its own model and effort level**. You can use any model with any effort, from Haiku at low to Opus at `max`.

| Role | Default model · effort | Job |
|------|------------------------|-----|
| **planner** | Sonnet · high | Splits the task, picks a model + effort per task, gives each builder its own files, writes a design brief from your existing UI |
| **builders** | chosen per task | Make the changes in parallel. They reuse your existing components and design tokens, so new pages match the rest of the app |
| **devops** | Haiku · low | Runs build, typecheck and lint, and sends failures back to the builder that caused them |
| **reviewer** | Sonnet · medium | Checks the diff against your `rules.md` and your app's design |
| **tester** | Sonnet · medium | Tries to break the app: edge cases, bad input, auth, and **responsive layout at 9 viewport sizes from 320 to 1920px** (overflow, off-screen elements, clipped text, modals) using Playwright |
| **commit-writer** | Haiku · low | Writes a detailed multi-line commit message. **It has no shell access and can't commit.** You review the message and commit yourself |

On the first run, the skill shows every role with its model and effort (`low`, `medium`, `high`, `xhigh`, `max`). You can change any of them, and your choices are saved in `.agent-team/config.json`. You can also change the model and effort per task when you approve the plan.

## How it works

```
preflight ─► planner ─► builders (parallel, by wave) ─► devops ─► reviewer ─► testers ─► commit message (shown, not committed)
                              ▲                            │          │           │
                              └──── failure routed back to the builder that caused it ┘
```

1. **Preflight** checks for a knowledge graph, a `rules.md` and a model config. For UI projects, it offers to install Playwright in a gitignored folder, without touching your project's dependencies.
2. **The planner** reads the knowledge graph, not raw files. It writes a plan listing each task's model, effort, owned files, wave and exact `file:line` pointers.
3. **Builders** run in parallel within each wave. Each one edits only the files it owns.
4. **Devops** checks the build after every wave. A failure goes back to the builder that caused it, which is resumed with its context. After two failures, the task moves up one effort level, then to a stronger model.
5. After every successful build, **the graph is refreshed** with `graphify update .`, which costs no LLM tokens.
6. **The reviewer** checks the diff against `rules.md` and your design. **Testers** try to break the app.
7. **You get a commit message.** Nothing is ever committed or pushed for you. A plugin hook blocks git writes while a run is active.

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
