# Project rules

<!--
Template for the agent-team skill. When generating a project's rules.md:
- keep sections that apply to the detected stack, delete the rest
- replace <placeholders> with concrete values from the project (paths, commands, libraries)
- add the user's own instructions under "Project-specific rules" — they take priority
- keep rules short, concrete and checkable; the reviewer checks diffs against them line by line
-->

## Project-specific rules
<user instructions go here — these override everything below>

## General
1. Follow the existing style of the file you are editing (naming, imports, formatting). Run the project formatter: `<formatter command>`.
2. Functions do one thing. Keep functions under ~50 lines and files under ~400 lines unless the codebase already does otherwise.
3. No dead code, commented-out code, debug prints, or `TODO` without an owner/issue.
4. No magic numbers or strings — use named constants or config.
5. Names describe intent: no single-letter names outside short loops; booleans read as `is/has/should`.
6. Do not add a dependency without a clear need; prefer what the project already uses.

## Correctness and errors
7. Validate all external input (user input, API responses, files, env vars) at the boundary.
8. Never swallow errors. Handle them or propagate them with context.
9. Handle empty, null/undefined, zero and very large inputs explicitly.
10. Money and precise quantities use integer minor units or a decimal type, never floats.
11. Dates are stored in UTC; convert to local time only for display.

## Security
12. No secrets, tokens or credentials in code, logs or commits. Read them from environment/config.
13. Parameterised queries only — no string-built SQL/shell commands with user input.
14. Escape/encode output to prevent XSS; never render raw user HTML.
15. Check authorisation on every server-side action, not only in the UI.
16. Log security-relevant events without logging personal data or secrets.

## TypeScript / JavaScript
17. `strict` TypeScript; no `any` (use `unknown` + narrowing). No non-null `!` unless proven.
18. `async`/`await` with error handling; no floating promises.
19. `const` by default; no `var`.
20. React: function components and hooks; stable `key`s; no state derived from props without reason; effects clean up after themselves.

## Python
21. Type hints on public functions; pass `mypy`/`pyright` if configured.
22. Follow PEP 8 (enforced by `ruff`/`black` if present). No bare `except:`.
23. Use context managers for files, locks and connections.

## Go
24. Check every returned error; wrap with `fmt.Errorf("...: %w", err)`.
25. Pass `context.Context` as the first parameter for I/O; no goroutine without a way to stop it.

## APIs and data
26. Consistent response/error shape across endpoints; correct HTTP status codes.
27. Database changes go through migrations; never edit applied migrations.
28. Paginate list endpoints; avoid N+1 queries.

## Tests
29. New logic comes with tests covering the normal path and at least one edge case.
30. Tests are deterministic: no real network, no sleeps, fixed clocks/seeds.

## Git
31. One logical change per commit; message format `<type>: <summary>` with a bullet body.
32. Never commit generated build output, `.env` files, or `.agent-team/`.
