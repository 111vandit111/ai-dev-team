# Claude Code

- **Install.** Use the plugins: `/plugin marketplace add 111vandit111/ai-dev-team`, then any of `/plugin install ai-dev-team@ai-dev-team` (agent-team skill, effort-level workers, live office pane, git-write block), `/plugin install research-team@ai-dev-team` (research skill), `/plugin install recruiter-panel@ai-dev-team` (recruiter skill).
  The skills also work as plain skills: copy `agent-team/`, `research/` or `recruiter/` to `~/.claude/skills/`. For agent-team that means no workers and no pane.
- **Models.** The values your Agent tool's `model` parameter accepts (aliases such as `haiku`, `sonnet`, `opus`). Confirm them with the user against `/model`.
- **Efforts.** `low medium high xhigh max`. The `/model` picker shows which levels each model supports. A model without effort support ignores it, and a level above a model's maximum falls back to its highest.
- **Sub-agents: `native`.**
  - If the ai-dev-team plugin is installed: `Agent(subagent_type: "ai-dev-team:worker-<effort>", model: "<model>", prompt: …)`. The worker's name sets the effort; the model is set per call.
  - Otherwise: `Agent(subagent_type: "general-purpose", model: "<model>", prompt: …)`. Effort can't be set, so use `efforts: []`.
  - The workers include `WebSearch` and `WebFetch`, which researchers need. A plain `general-purpose` agent has them too.
  - Send fixes with `SendMessage` to the same agent, which keeps its context.
  - Agent results report token usage. Log it.
- **Asking the user.** The AskUserQuestion tool.
- **Read-only mode.** Plan mode. Ask the user to exit it.
- **Make it the default (agent-team skill only).** Add to `~/.claude/CLAUDE.md`: "For any request that changes code, use the agent-team skill."
