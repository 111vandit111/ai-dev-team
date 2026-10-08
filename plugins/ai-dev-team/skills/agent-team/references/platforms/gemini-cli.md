# Gemini CLI

- **Install.** `~/.agents/skills/agent-team/` (or `~/.gemini/skills/`). Check with `/skills list`; after installing, run `/skills reload`. Gemini asks for consent the first time it activates a skill.
- **Models.** `/model`. Ask the user to confirm the list or paste it.
- **Efforts.** None per run, so use `efforts: []`.
- **Sub-agents: `headless`** (the way to pick a model per task). Command template:
  `gemini -m {model} --approval-mode auto_edit -p {prompt}`
  `auto_edit` approves file edits only. Other tools still need approval, which headless runs can't give, so sub-agents must not run shell commands; you run all checks.
- **Native alternative.** Sub-agents are Markdown files in `~/.gemini/agents/` or `.gemini/agents/`, each with a fixed `model:` in its frontmatter. To use them, create one per model tier (ask first) and set `mode` to `native`.
- **Asking the user.** Ask in chat with numbered options.
- **Make it the default.** Add to `~/.gemini/GEMINI.md`: "For any request that changes code, use the agent-team skill."
