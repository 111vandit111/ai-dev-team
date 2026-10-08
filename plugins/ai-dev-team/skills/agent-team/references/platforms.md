# Platforms, models and effort levels

The agent-team skill is written for Claude Code but loads anywhere that reads SKILL.md files. Detect the platform, list what it really offers, and let the user edit the table.

## Detecting the platform
- **Claude Code** — the `Agent` tool is available. Workers appear as `ai-dev-team:worker-<effort>`.
- **OpenAI Codex CLI** — `~/.codex/config.toml` exists, or the user says so.
- **Gemini CLI** — `~/.gemini/settings.json` exists.
- **Cursor** — `.cursor/` in the project.
- Otherwise ask the user which tool and which models they can use.

Model lists change often. Prefer what the platform reports (model picker, config, `--help`). The tables below are defaults only.

## Claude Code
- Models (aliases): `haiku`, `sonnet`, `opus`, `fable`. `fable` is the most capable and most expensive; include it only if the user wants it.
- Effort levels: `low`, `medium`, `high`, `xhigh`, `max`. **Any model can be paired with any effort** — the effort comes from which worker is called (`worker-<effort>`), the model from the call's `model` parameter.
- Not every model supports every level. Current Sonnet/Opus/Fable support all five. **Haiku does not support effort** — any effort set on Haiku has no effect. Older models fall back to the highest level they support at or below the one set (e.g. `xhigh` → `high`). Mark these in the table so the user isn't surprised.
- An organisation or user `maxEffortLevel` cap can lower what actually runs.

## OpenAI Codex CLI
Models: from the user's config/profiles. Reasoning effort usually `minimal`/`low`/`medium`/`high` (some versions add more) — map `xhigh`/`max` to the highest available. Subagents: check the installed version; otherwise run sequentially.

## Gemini CLI
Models: Flash-Lite, Flash, Pro (check `/model`). Thinking budget maps roughly low → small budget, max → largest. Run sequentially if no subagents.

## Cursor and others
Use the model picker list; map efforts to the tool's reasoning setting if it has one, otherwise ignore effort.

## Running without subagents
Run each role yourself, one at a time: planner → builders (task by task) → devops → reviewer → tester → commit message. Before each role, read `roles/<role>.md` and the "Rules for every role" section of `agents/worker-low.md`. Use the same `.agent-team/` files. Switch model per role if the platform allows; otherwise tell the user once that every role uses the current model.
