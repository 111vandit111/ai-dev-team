#!/usr/bin/env python3
"""Agent office: watch the agent team work, from a side terminal.

Reads .agent-team/log.md, which the agent-team skill writes as it works, and
draws every sub-agent as a person at a desk, with the main agent at the center
desk. It runs outside your AI tool, so it costs no tokens.

Usage:
  python3 office.py [project folder]          live view; Ctrl+C to quit
  python3 office.py [project folder] --once   print one frame and exit
"""
import os
import shutil
import sys
import time

DESK = 24
REFRESH_SECONDS = 0.4

SPRITES = {
    "working": (
        [" o   .----.", "/|\\_ |=== |", "/ \\  '----'"],
        [" o   .----.", "/|_/ |==  |", "/ \\  '----'"],
    ),
    "done": ([" o/  .----.", "/|   | ok |", "/ \\  '----'"],),
    "failed": ([" o   .----.", "/|\\  | !! |", "/ \\  '----'"],),
    "idle": ([" o   .----.", "/|\\  |    |", "/ \\  '----'"],),
}
COLORS = {"working": "33", "done": "32", "failed": "31", "main": "35"}
ROUND = ("╭", "─", "╮", "│", "╰", "╯")
DOUBLE = ("╔", "═", "╗", "║", "╚", "╝")


def parse(text):
    """Turn log lines into the desks' state.

    Line format: - HH:MM:SS | who | role | model | effort | event | tokens | note
    """
    agents = {}
    main = {"model": "", "effort": "", "note": "waiting to start"}
    for raw in text.splitlines():
        line = raw.strip()
        if not line.startswith("- "):
            continue
        parts = [part.strip() for part in line[2:].split("|")]
        if len(parts) < 7:
            continue
        who, role, model, effort, event, tokens = parts[1:7]
        note = " | ".join(parts[7:])
        if who == "main":
            main["model"] = model or main["model"]
            main["effort"] = effort or main["effort"]
            if event == "step" and note:
                main["note"] = note
            continue
        agent = agents.setdefault(
            who,
            {"id": who, "role": role, "model": model, "effort": effort, "status": "working", "tokens": 0},
        )
        agent["role"] = role or agent["role"]
        agent["model"] = model or agent["model"]
        agent["effort"] = effort or agent["effort"]
        if event in ("start", "retry"):
            agent["status"] = "working"
        elif event in ("done", "failed"):
            agent["status"] = event
        count = tokens.replace(",", "")
        if count.isdigit():
            agent["tokens"] += int(count)
    return list(agents.values()), main


def fmt_tokens(n):
    if n <= 0:
        return "-"
    return f"{n / 1000:.1f}k" if n >= 1000 else str(n)


def paint(text, code, color):
    return f"\x1b[{code}m{text}\x1b[0m" if color and code else text


def box(lines, width, style, code, color, sprite_rows):
    tl, h, tr, v, bl, br = style
    inner = width - 2
    out = [paint(tl + h * inner + tr, code, color)]
    for index, line in enumerate(lines):
        text = line[: inner - 1].ljust(inner - 1)
        text = paint(text, code, color) if index < sprite_rows else text
        out.append(paint(v, code, color) + " " + text + paint(v, code, color))
    out.append(paint(bl + h * inner + br, code, color))
    return out


def desk(agent, tick, color):
    status = agent["status"]
    frames = SPRITES.get(status, SPRITES["idle"])
    sprite = frames[tick % len(frames)]
    pick = " · ".join(x for x in (agent["model"], agent["effort"]) if x and x != "-")
    lines = sprite + [f"{agent['role']} {agent['id']}", pick, f"{status} · {fmt_tokens(agent['tokens'])} tok"]
    return box(lines, DESK, ROUND, COLORS.get(status), color, len(sprite))


def main_desk(agents, main, tick, color, running):
    working = sum(1 for a in agents if a["status"] == "working")
    done = sum(1 for a in agents if a["status"] == "done")
    failed = sum(1 for a in agents if a["status"] == "failed")
    total = sum(a["tokens"] for a in agents)
    frames = SPRITES["working"] if running else SPRITES["idle"]
    sprite = frames[tick % len(frames)]
    note = main["note"] if running else "finished" if agents else "idle"
    counts = f"{working} working · {done} done" + (f" · {failed} failed" if failed else "")
    lines = sprite + ["main agent", note, counts, f"team: {fmt_tokens(total)} tok"]
    return box(lines, DESK + 8, DOUBLE, COLORS["main"], color, len(sprite))


def visible_len(text):
    out, skipping = 0, False
    for ch in text:
        if ch == "\x1b":
            skipping = True
        elif skipping and ch == "m":
            skipping = False
        elif not skipping:
            out += 1
    return out


def center(block, columns):
    width = max((visible_len(line) for line in block), default=0)
    pad = " " * max(0, (columns - width) // 2)
    return [pad + line for line in block]


def row_of(boxes):
    lines = []
    for parts in zip(*boxes):
        lines.append(" ".join(parts))
    return lines


def render(text, tick, columns, color, running, root):
    agents, main = parse(text)
    per_row = max(1, (columns + 1) // (DESK + 1))
    half = (len(agents) + 1) // 2
    out = [paint(f"Agent office: {os.path.basename(root) or root}", "1", color), ""]

    def rows(group):
        lines = []
        for start in range(0, len(group), per_row):
            boxes = [desk(a, tick, color) for a in group[start : start + per_row]]
            lines += center(row_of(boxes), columns)
        return lines

    out += rows(agents[:half])
    out += center(main_desk(agents, main, tick, color, running), columns)
    out += rows(agents[half:])
    if not agents:
        out += ["", center(["No agents yet. They appear here when the team starts."], columns)[0]]
    out += ["", paint("Ctrl+C to quit", "2", color)]
    return "\n".join(out)


def read(path):
    try:
        with open(path, encoding="utf-8") as handle:
            return handle.read()
    except OSError:
        return ""


def main():
    args = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    once = "--once" in sys.argv
    root = os.path.abspath(args[0] if args else ".")
    state = os.path.join(root, ".agent-team")
    color = sys.stdout.isatty() and not os.environ.get("NO_COLOR") and not once
    tick = 0
    if not once:
        sys.stdout.write("\x1b[?25l")
    try:
        while True:
            columns = shutil.get_terminal_size((100, 40)).columns
            running = os.path.exists(os.path.join(state, "RUNNING"))
            frame = render(read(os.path.join(state, "log.md")), tick, columns, color, running, root)
            if once:
                print(frame)
                return
            sys.stdout.write("\x1b[H\x1b[2J" + frame + "\n")
            sys.stdout.flush()
            tick += 1
            time.sleep(REFRESH_SECONDS)
    except KeyboardInterrupt:
        pass
    finally:
        if not once:
            sys.stdout.write("\x1b[?25h\n")


if __name__ == "__main__":
    main()
