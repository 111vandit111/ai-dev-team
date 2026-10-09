# First-run setup

Follow this only when `.agent-team/config.json` is missing or its `version` isn't `4`. It runs once per project, and its result is reused by every later run.

Write the config with exactly the shape of `config.example.json` (same keys and nesting; don't rename, add or flatten keys).

## 1. Your tool

You know which AI tool you're running in. Set `tool` (`claude-code`, `codex`, `gemini-cli`, `cursor`, `opencode`, `copilot`, or the tool's own name) and read `platforms/<tool>.md` (`platforms/other.md` for anything not listed).

## 2. The user's models: never assume names

Model lists differ by tool, plan and account, and they change often. Build the list from the user's own tool:

1. **Look first.** Use what you can find without the user, as your platform file says: the model choices your sub-agent feature accepts, or a model-list command (for example `opencode models` or `agent --list-models`).
2. **Then ask.** Show what you found and ask the user to check it against their model picker (`/model` or `/models`): "Is anything missing or wrong? Which are cheapest?" If you found nothing, ask them to paste the list their picker shows.
3. **Order it cheapest → strongest.** Ask if prices or tiers aren't clear.
4. **Effort levels.** Record the reasoning or effort levels the tool offers (the picker or your platform file shows them), lowest first. If the tool has none, use `[]`, and every `effort` below stays `""`.

Save them as `models` and `efforts`.

## 3. How sub-agents start

Set `subagents.mode` from your platform file:

- `native`: your tool starts sub-agents itself and can give each one a model (and effort, if it has them).
- `headless`: you start your tool's command-line mode as a background process for each sub-agent. Set `subagents.command` to the template from your platform file, using the placeholders `{model}`, `{effort}` and `{prompt}`. **Ask the user first.** These runs edit files without asking each time, so use the narrowest permission flags the platform file gives.
- `none`: you run every role yourself, one after another. Model and effort can't change mid-run, but everything else still applies.

## 4. Roles and presets: one table, like a model picker

Fill defaults from the ordered list. *cheap* = first, *strong* = last, *mid* = the middle one. For efforts, *low* = first, *high* = the second-highest, *top* = the highest.

| Row | Model | Effort | Used for |
|---|---|---|---|
| preset: trivial | cheap | low | text, copy, config values, renames |
| preset: normal | mid | middle | normal features and fixes |
| preset: tricky | mid | high | tricky logic in one place |
| preset: complex | strong | high | interdependent logic, security, migrations |
| preset: hardest | strong | top | deep reasoning |
| role: planner | mid | high | planning, choosing model + effort per task |
| role: researcher | mid | middle | web research for open questions |
| role: verifier | mid | middle | review + test for small and medium jobs |
| role: reviewer | mid | middle | review for large jobs |
| role: tester | mid | middle | testing for large jobs |

With one model, every row uses it and only the effort changes.

Show the user this table and the full `models` and `efforts` lists, and let them change any row. Mark pairs that won't take effect (for example, an effort on a model that doesn't support effort). Presets guide the planner; it may pick any pair from the lists.

Then ask once: "Save this as your default for new projects?" If yes, also write it to `~/.agent-team/defaults.json`. Next time this setup runs and that file exists, offer it first (still show the table).

## 5. Commands

Fill `commands` only with commands that exist, such as scripts present in `package.json` (`npm run <script>`). Never put one command in another's slot: a `lint` script is not `typecheck`. For TypeScript without a typecheck script, `npx tsc --noEmit` is fine if `tsconfig.json` exists. Unknown → `""`. `dev` is the dev-server command, `url` its local address, and `e2e` is set in step 7. `migrate` applies migrations: set it only to a command that targets a local/test database, never production. `apiUrl` is the base URL of the running backend.

## 6. Git guard

Ask once: "Install a git guard so nothing can commit or push while the team runs?" (recommended). If yes, run `sh <this skill's folder>/scripts/git-guard.sh install` and set `gitGuard` to `true`. It adds a few lines to `.git/hooks/pre-commit` and `pre-push`, which works with every tool because git itself refuses. If it reports that hooks are managed elsewhere (husky, `core.hooksPath`), show the user its message.

## 7. UI tooling

If the project has a UI and `commands.e2e` is empty, ask once to allow **Playwright** (free, open-source) installed only inside `.agent-team/tests/`:

```
cd .agent-team/tests && npm init -y && npm i -D @playwright/test && npx playwright install chromium
```

Then set `commands.e2e` to `cd .agent-team/tests && npx playwright test`. If they decline, UI checks are reported as BLOCKED.

## 7b. Backend tooling

If the project has a backend, check that `commands.test` runs its tests and how to start it (`commands.dev`). If integration tests need a database, ask once whether a local/test database is available (for example a docker compose service already in the repo, or sqlite). Never create cloud resources. If there is none, API and migration checks are reported as BLOCKED.

## 8. The office

Tell the user once: they can watch the team work in a side terminal with `python3 <this skill's folder>/scripts/office.py`. It reads `.agent-team/log.md` and costs no tokens. Claude Code plugin users also get a built-in pane.
