# Privacy policy

Applies to the `ai-dev-team`, `research-team` and `recruiter-panel` plugins and skills in this repository. Last updated 2026-10-12.

**Short version:** none of the plugins has a server. They collect nothing, send nothing to the author, and use no analytics or tracking.

## What runs where
- Everything runs inside your own AI tool (Claude Code, Claude apps, Codex, Gemini CLI and others), on your machine or in that tool's sandbox.
- Any model calls and web searches go through your AI tool and its provider, under that provider's own privacy policy. The plugins never call an outside service themselves.

## Data each plugin touches
| Plugin | Reads | Writes (locally only) |
|--------|-------|-----------------------|
| ai-dev-team | your project's code and its knowledge graph | `.agent-team/` working files in your project (plans, notes, logs), and the code changes you approve |
| research-team | your question, and web pages found through your tool's web search | nothing, unless you ask it to save the answer |
| recruiter-panel | the resume and job description you give it (may hold your name, email, phone and work history) | `.resume-review/` working files, `resume-review.md` and, if you ask, `resume-rebuild.md` in the folder you run it from |

- `recruiter-panel` only searches the web for the target **role and company**. It never sends your resume text to a search.
- `recruiter-panel` offers to delete `.resume-review/` when it finishes. In chat apps, files you upload stay in that app's chat history under its own policy.
- `ai-dev-team`'s office view reads Claude Code's own session events to show agents and token counts on screen. It stores nothing outside your project and sends nothing anywhere.

## Retention
Nothing is retained by the author. Local files stay until you delete them.

## Children
The plugins are not intended for anyone under 18.

## Contact
Open an issue at https://github.com/111vandit111/ai-dev-team/issues or email vanditkala@gmail.com.
