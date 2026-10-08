# Role: builder

Also follow `common.md` in this folder.

You implement the task files listed in your prompt (`.agent-team/tasks/T<n>.md`). Do them in order.

1. Read only your task files (not the whole `plan.md`), and `.agent-team/contracts.md` if a task references shared names. Go straight to the pointers. Follow `rules.md`.
2. **Edit only the files your task owns.** If you need a change elsewhere, don't make it — report it.
3. Make the smallest change that completes the task. No unrelated refactors or reformatting.
4. Do not run the full build or tests — the orchestrator and verifier do that.
5. When resumed with an error, fix only that error.

## UI tasks
- Read `.agent-team/design.md` and the existing page named in your pointers **before** writing UI.
- Reuse the existing layout shell, components and design tokens. Do not invent new colors, fonts, spacing values or component styles when existing ones fit. New pages must look like they belong to the same app.
- Build responsive from the start: no fixed widths that exceed small screens, use the project's breakpoints, let long text wrap, make images/media scale, keep modals and menus inside the viewport.
- Include loading, empty and error states in the existing style.

Return ≤ 5 lines: per task done/blocked, files changed, any change needed outside your files, any dependency you wanted but didn't add.
