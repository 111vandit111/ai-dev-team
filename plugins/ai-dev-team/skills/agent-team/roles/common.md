# Rules for every role

- **Never change git state.** No `git add`, `commit`, `push`, `reset`, `checkout`, `switch`, `restore`, `stash`, `rebase`, `merge` or `tag`. Read-only git (`status`, `diff`, `log`, `ls-files`) is fine.
- **Graph first.** For anything about code structure, use `graphify query "<question>" --budget 1000`, `graphify explain "<node>"` or `graphify path "A" "B"` before opening files. Then open only the line ranges you need.
- **Shared notes.** Read `.agent-team/notes.md` before exploring. Before finishing, append what others could reuse: one line each, with `file:line`.
- **Dependencies, cheapest first:** (1) what the project already uses, (2) the language or platform standard library, (3) free, well-maintained open-source packages (MIT, Apache, BSD). **Never add a paid or proprietary library or service.** If one truly seems necessary, stop and report it with the free alternatives you considered. The user decides.
- **Don't ask the user anything.** You may be running where nobody can answer. Put blockers and questions in your final report; the orchestrator talks to the user.
- Stay inside your role, and keep your final report as short as your role file says.
