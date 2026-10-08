# OpenCode

- **Install.** `~/.agents/skills/agent-team/` or `~/.config/opencode/skills/`. OpenCode also reads `~/.claude/skills/`, so keep only one copy.
- **Models.** `opencode models` lists every available model as `provider/model`. Use that list, then confirm it with the user. `opencode models --verbose` adds costs, which helps with cheapest → strongest ordering.
- **Efforts.** None per run, so use `efforts: []`.
- **Sub-agents.**
  - `native`: sub-agents are agents in `opencode.json` with `"mode": "subagent"` and a fixed `"model"`, started through the Task tool. To pick models per task, create one sub-agent per model tier. Ask before editing `opencode.json`.
  - `headless`: command template `opencode run -m {model} {prompt}`
- **Asking the user.** Ask in chat with numbered options.
- **Make it the default.** Add to `AGENTS.md`: "For any request that changes code, use the agent-team skill."
