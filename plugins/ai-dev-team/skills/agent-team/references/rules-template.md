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
6. Dependencies, in order of preference: what the project already uses → the standard library → free open-source (MIT/Apache/BSD), actively maintained. **No paid or proprietary libraries or services** without explicit user approval.
7. Match `.agent-team/style.md` (the repo's conventions and the user's decisions).

## Correctness and errors
8. Validate all external input (user input, API responses, files, env vars) at the boundary.
9. Never swallow errors. Handle them or propagate them with context.
10. Handle empty, null/undefined, zero and very large inputs explicitly.
11. Money and precise quantities use integer minor units or a decimal type, never floats.
12. Dates are stored in UTC; convert to local time only for display.

## Security
13. No secrets, tokens or credentials in code, logs or commits. Read them from environment/config.
14. Parameterised queries only — no string-built SQL/shell commands with user input.
15. Escape/encode output to prevent XSS; never render raw user HTML.
16. Check authorisation on every server-side action, not only in the UI.
17. Log security-relevant events without logging personal data or secrets.

## TypeScript / JavaScript
18. `strict` TypeScript; no `any` (use `unknown` + narrowing). No non-null `!` unless proven.
19. `async`/`await` with error handling; no floating promises.
20. `const` by default; no `var`.
21. React: function components and hooks; stable `key`s; no state derived from props without reason; effects clean up after themselves.

## Python
22. Type hints on public functions; pass `mypy`/`pyright` if configured.
23. Follow PEP 8 (enforced by `ruff`/`black` if present). No bare `except:`.
24. Use context managers for files, locks and connections.

## Go
25. Check every returned error; wrap with `fmt.Errorf("...: %w", err)`.
26. Pass `context.Context` as the first parameter for I/O; no goroutine without a way to stop it.

## UI and design consistency
D1. New pages and components reuse the existing layout shell, components and design tokens (colors, fonts, spacing, radii, breakpoints). No new hard-coded colors or sizes where a token exists.
D2. Every page works from 320px to 1920px wide: no horizontal scroll, nothing outside the viewport, long text wraps, media scales.
D3. Modals, menus and dropdowns stay inside the viewport and scroll when taller than it.
D4. Tap targets are at least 44×44px on mobile; focus is visible; colour contrast meets WCAG AA.
D5. Every data view has loading, empty and error states in the app's existing style.

## Backend: APIs and data
27. Consistent response/error shape across endpoints; correct HTTP status codes.
28. Database changes go through migrations; never edit applied migrations.
29. Paginate list endpoints; avoid N+1 queries.
30. Keep the layering in `.agent-team/backend.md`; validate input at the boundary; check authorisation server-side.
31. Multi-step writes use a transaction; handlers that clients may retry are idempotent.
32. API changes are backward compatible, or the break is stated. No secrets in logs.

## Tests
33. New logic comes with tests covering the normal path and at least one edge case.
34. Tests are deterministic: no real network, no sleeps, fixed clocks/seeds.

## Git
35. One logical change per commit; message format `<type>: <summary>` with a bullet body.
36. Never commit generated build output, `.env` files, or `.agent-team/`.
