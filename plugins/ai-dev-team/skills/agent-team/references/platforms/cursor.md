# Cursor (editor and CLI)

- **Install.** `~/.agents/skills/agent-team/` or `~/.cursor/skills/` (per project: `.agents/skills/` or `.cursor/skills/`). Cursor also reads `~/.claude/skills/`, so don't keep a copy in both places or it shows twice.
- **Models.** The model picker, or `agent --list-models` in the Cursor CLI. Ask the user to confirm.
- **Efforts.** None per run, so use `efforts: []`.
- **Sub-agents.**
  - In the editor: use `none` (run the roles yourself in order), unless your Cursor version can start sub-agents with a chosen model. Then use `native`.
  - With the Cursor CLI installed: `headless`. Command template:
    `agent -p --model {model} --force {prompt}`
    `--force` lets the run edit files without asking, so get the user's OK first.
- **Asking the user.** Ask in chat with numbered options.
- **Make it the default.** A project rule `.cursor/rules/agent-team.mdc` with `alwaysApply: true`: "For any request that changes code, use the agent-team skill."
