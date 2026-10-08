# Claude Code

- **Install.** Use the plugin, which adds the effort-level workers, the live office pane and a git-write block:
  `/plugin marketplace add 111vandit111/ai-dev-team`, then `/plugin install ai-dev-team@ai-dev-team`.
  As a plain skill instead, copy `agent-team/` to `~/.claude/skills/`. You get no workers and no pane.
- **Models.** The values your Agent tool's `model` parameter accepts (aliases such as `haiku`, `sonnet`, `opus`). Confirm them with the user against `/model`.
- **Efforts.** `low medium high xhigh max`. The `/model` picker shows which levels each model supports. A model without effort support ignores it, and a level above a model's maximum falls back to its highest.
- **Sub-agents: `native`.**
  - With the plugin: `Agent(subagent_type: "ai-dev-team:worker-<effort>", model: "<model>", prompt: …)`. The worker's name sets the effort; the model is set per call.
  - As a plain skill: `Agent(subagent_type: "general-purpose", model: "<model>", prompt: …)`. Effort can't be set, so use `efforts: []`.
  - Send fixes with `SendMessage` to the same agent, which keeps its context.
  - Agent results report token usage. Log it.
- **Asking the user.** The AskUserQuestion tool.
- **Read-only mode.** Plan mode. Ask the user to exit it.
- **Make it the default.** Add to `~/.claude/CLAUDE.md`: "For any request that changes code, use the agent-team skill."
