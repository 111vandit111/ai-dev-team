# Any other AI tool

- **Install.** Most tools that support Agent Skills read `~/.agents/skills/`; others have their own folder, for example `~/.config/agents/skills/` (Amp), `~/.kiro/skills/` (Kiro) or `~/.factory/skills/` (Factory Droid). If your tool has no skills support, add a line to its instructions file (often `AGENTS.md`): "For any request that changes code, follow `<path>/agent-team/SKILL.md`."
- **Models.** Ask the user to open the tool's model picker (`/model`, `/models`, or settings) and paste the list, cheapest first.
- **Efforts.** Ask whether the tool has reasoning or effort levels. If not, use `[]`.
- **Sub-agents**, in order of preference:
  1. `native`, if you have a tool that starts sub-agents (often named agent, task, delegate or subagent) and it accepts a model.
  2. `headless`, if the tool has a non-interactive command-line mode with a model flag (check `<tool> --help`). Use the narrowest flag that allows file edits, and only with the user's OK.
  3. `none`: run the roles yourself, one after another.
- **Asking the user.** Ask in chat with numbered options.
