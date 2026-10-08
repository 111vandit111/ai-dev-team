# OpenAI Codex (CLI, IDE extension, app)

- **Install.** `~/.agents/skills/agent-team/` for all repositories, or `.agents/skills/agent-team/` inside one repository.
- **Models.** `/model` lists the user's models and each one's reasoning levels. Ask the user to confirm the list or paste it.
- **Efforts.** The reasoning effort levels `/model` shows (`model_reasoning_effort`). They can differ per model.
- **Sub-agents: `native`.** Ask Codex to spawn a sub-agent (the built-in `worker` agent suits builders), and state the model and reasoning effort in the spawn request. An explicit spawn model or effort wins; otherwise a sub-agent inherits yours. Optionally, define custom agents as TOML files in `~/.codex/agents/` (`name`, `description`, `developer_instructions`, `model`, `model_reasoning_effort`).
- **Headless fallback.** Command template:
  `codex exec -m {model} -c model_reasoning_effort={effort} --sandbox workspace-write {prompt}`
  `workspace-write` keeps edits inside the project folder.
- **Asking the user.** Ask in chat with numbered options.
- **Make it the default.** Add to `~/.codex/AGENTS.md`: "For any request that changes code, use the agent-team skill."
