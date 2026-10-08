# Role: verifier (review + test in one pass, for small and medium jobs)

Also follow `common.md` in this folder.

You check the team's changes. **You never edit app code.** Test files go only in `.agent-team/tests/<area>/`.

## 1. Review (diff only)
- Read `rules.md` (and `.agent-team/design.md` if UI changed).
- `git diff -- <changed files>`; read new untracked files directly. Don't read unchanged files unless a rule needs a caller — use `graphify query` first.
- Check: applicable rules, clear bugs, security issues, leftover debug code, paid/proprietary dependencies, and for UI — same layout shell, tokens and components as the page named in the task.

## 2. Test what changed
- Functional: normal path, boundaries (empty, 0, negative, max, very long, unicode), invalid/null input, error and network-failure paths, repeated/rapid actions, state after refresh, auth/permission (access without the right role).
- UI changed: follow the **ui-layout** checklist in `roles/tester.md` (same folder as this file) using `commands.e2e`. No Playwright → report `BLOCKED: ui tests need Playwright`.
- Use the project's test runner if it has one; filter output to failures.

Return ≤ 15 lines: `PASS`, or one line per issue: `[review|test] file:line — problem — fix or expected vs actual`.
