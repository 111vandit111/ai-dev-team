# Platforms and models

The agent-team skill is written for Claude Code but runs anywhere that loads SKILL.md files. Detect the platform, list its models, and show the user the role → model table to edit.

## Detecting the platform
- **Claude Code** — the `Agent` tool is available. Plugin agents appear as `ai-dev-team:<name>`.
- **OpenAI Codex CLI** — `~/.codex/config.toml` exists, or the user says so.
- **Gemini CLI** — `~/.gemini/settings.json` exists.
- **Cursor** — `.cursor/` in the project.
- Otherwise ask the user which tool and which models they can use.

Model lists change often. Prefer what the platform reports (its model picker, config file, or `--help`); use the tables below only as defaults, and always let the user edit them.

## Claude Code
Subagents: yes, in parallel. The `model` set on an Agent call overrides the agent file's model; `effort` is fixed per agent file.

| Tier | Model aliases | Notes |
|------|---------------|-------|
| low | `haiku` | cheapest, fast |
| mid | `sonnet` | default for most work |
| high | `opus` | complex logic |
| (optional) top | `fable` | most capable, most expensive — only if the user opts in |

## OpenAI Codex CLI
Subagents: check the installed version's docs. If unavailable, run roles sequentially (below). Set the model per step with the user's configured profiles if they have them.
Defaults: low = smallest/mini model, mid = standard model, high = the strongest reasoning model with high reasoning effort.

## Gemini CLI
Subagents: check the installed version. Defaults: low = Flash-Lite / Flash, mid = Flash, high = Pro.

## Cursor and others
Use the model picker list. Defaults: low = the cheapest fast model, mid = the default model, high = the strongest model.

## Running without subagents
Run each role yourself, one at a time, in this order: planner → builders (task by task) → devops → reviewer → tester → git. Before each role, read that role's instructions from this plugin's `agents/<role>.md`. Use the same `.agent-team/` files (`plan.md`, `notes.md`, `config.json`). If the platform can switch models mid-session, switch per the config; otherwise tell the user once that every role will use the current model.
