# GitHub Copilot CLI

- **Install.** `~/.agents/skills/agent-team/` or `~/.copilot/skills/` (per project: `.github/skills/` or `.agents/skills/`). Copilot also reads `~/.claude/skills/`, so keep only one copy.
- **Models.** `/model`. Ask the user to confirm the list or paste it.
- **Efforts.** The reasoning effort levels Copilot offers (`reasoning-effort` in agent files, `--reasoning-effort` on the command line).
- **Sub-agents: `native`.** Custom agents in `~/.copilot/agents/` or `.github/agents/` are offered to you as tools you can call. Each sets `model:` and `reasoning-effort:` in its frontmatter, so create one agent per model tier you use (ask first).
- **Headless alternative.** `copilot -p {prompt} --agent <tier-agent>`. Prompt mode can't answer permission prompts, so add the narrowest `--allow-tool` rules, or `--allow-all-tools` with the user's OK.
- **Asking the user.** Ask in chat with numbered options.
- **Make it the default.** Add to `.github/copilot-instructions.md` or `AGENTS.md`: "For any request that changes code, use the agent-team skill."
