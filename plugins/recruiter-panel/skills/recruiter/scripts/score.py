#!/usr/bin/env python3
"""Resume panel scorer: turns the recruiters' score lines into one verdict.

Reads the last fenced json block that has an "id" in each recruiter file,
checks it, and prints the per-recruiter scores, the final score, the verdict,
the spread and any knock-out claims. All math is exact (fractions), no floats.
Python 3 standard library only.

Usage:
  python3 score.py FILE...                   all six recruiters must be present
  python3 score.py --allow-partial FILE...   score the recruiters that exist

Exit 0 on success. Exit 2 with `score.py: <file>: <problem>` on stderr when the
input is missing or invalid.
"""
import json
import math
import re
import sys
from decimal import Decimal
from fractions import Fraction

RECRUITERS = ["ats", "skim", "tech", "hm", "agency", "skeptic"]
SECTIONS = [
    ("header", "Header & contact"),
    ("summary", "Summary"),
    ("experience", "Experience"),
    ("skills", "Skills"),
    ("projects", "Projects"),
    ("education", "Education & certs"),
    ("formatting", "Formatting & ATS"),
]
# Section weights per recruiter, in the order of SECTIONS. Each list sums to 100.
WEIGHTS = {
    "ats": [10, 5, 20, 25, 5, 5, 30],
    "skim": [10, 15, 30, 5, 5, 15, 20],
    "tech": [0, 5, 30, 30, 20, 5, 10],
    "hm": [0, 10, 45, 10, 15, 5, 15],
    "agency": [5, 15, 35, 15, 5, 10, 15],
    "skeptic": [5, 5, 40, 10, 15, 5, 20],
}
# Panel weights, in percent. They sum to 100.
PANEL = {"ats": 15, "skim": 15, "tech": 20, "hm": 25, "agency": 10, "skeptic": 15}

FENCE = re.compile(
    r"^[ \t]*`{3,}[ \t]*json[ \t]*\n(.*?)^[ \t]*`{3,}[ \t]*$",
    re.DOTALL | re.MULTILINE | re.IGNORECASE,
)


class Num(str):
    """A json number kept as its original text (so "absent-ok" stays distinct)."""


class Problem(Exception):
    def __init__(self, where, text):
        super().__init__(text)
        self.where = where
        self.text = text


def no_constant(name):
    raise ValueError("bad number " + name)


def last_score_line(path, text):
    blocks = FENCE.findall(text.replace("\r\n", "\n"))
    for block in reversed(blocks):
        try:
            data = json.loads(
                block, parse_int=Num, parse_float=Num, parse_constant=no_constant
            )
        except ValueError as err:
            if '"id"' in block:
                raise Problem(path, "invalid json: %s" % err)
            continue
        if isinstance(data, dict) and "id" in data:
            return data
    raise Problem(path, "no fenced json block with an id")


def read_file(path):
    try:
        with open(path, encoding="utf-8") as handle:
            return last_score_line(path, handle.read())
    except (OSError, UnicodeDecodeError) as err:
        raise Problem(path, "unreadable: %s" % err)


def check(path, data, seen):
    rid = data["id"]
    if not isinstance(rid, str) or rid not in WEIGHTS:
        raise Problem(path, "unknown id %r" % (rid,))
    if rid in seen:
        raise Problem(path, "duplicate id %s (also in %s)" % (rid, seen[rid]))
    sections = data.get("sections")
    if not isinstance(sections, dict):
        raise Problem(path, "sections must be an object")
    keys = [key for key, _ in SECTIONS]
    for key in keys:
        if key not in sections:
            raise Problem(path, "missing section key %s" % key)
    for key in sections:
        if key not in keys:
            raise Problem(path, "unknown section key %s" % key)
    values = {}
    for key in keys:
        raw = sections[key]
        if isinstance(raw, Num):
            if len(raw) > 12 or "e" in raw.lower():
                raise Problem(path, "section %s: number %s is too long or uses an exponent" % (key, raw[:20]))
            value = Fraction(str(raw))
            if not 0 <= value <= 10:
                raise Problem(path, "section %s: %s is not between 0 and 10" % (key, raw))
            values[key] = value
        elif raw == "absent-ok":
            values[key] = None
        else:
            raise Problem(path, "section %s: value must be 0-10 or \"absent-ok\"" % key)
    if all(v is None for v in values.values()):
        raise Problem(path, "all sections are absent-ok")
    knock = data.get("knockout")
    if knock is not None and not (type(knock) is str and knock.strip()):
        raise Problem(path, "knockout must be null or a non-empty string")
    return values, (" ".join(knock.split()) if knock else None)


def recruiter_score(rid, values):
    used = [(v, w) for v, w in zip((values[k] for k, _ in SECTIONS), WEIGHTS[rid]) if v is not None]
    return sum(v * w for v, w in used) / sum(w for _, w in used)


def tenth(x):
    """Round half-up to one decimal; returns tenths as an int."""
    return math.floor(x * 10 + Fraction(1, 2))


def show_tenths(n):
    return "%d.%d" % (n // 10, n % 10)


def show_input(value):
    if value is None:
        return "n/a"
    if value.denominator == 1:
        return str(value.numerator)
    return format(Decimal(value.numerator) / Decimal(value.denominator), "f")


def main(argv):
    allow_partial = "--allow-partial" in argv
    files = [a for a in argv if a != "--allow-partial"]
    if not files:
        raise Problem("(none)", "no files given")
    seen, rows = {}, {}
    for path in files:
        data = read_file(path)
        values, knock = check(path, data, seen)
        seen[data["id"]] = path
        rows[data["id"]] = (values, knock, recruiter_score(data["id"], values))
    present = [r for r in RECRUITERS if r in rows]
    missing = [r for r in RECRUITERS if r not in rows]
    if missing and not allow_partial:
        raise Problem("input", "missing recruiter %s" % ", ".join(missing))

    scores = {r: tenth(rows[r][2]) for r in present}
    final = tenth(
        sum(PANEL[r] * rows[r][2] for r in present) / sum(PANEL[r] for r in present)
    )
    verdict = "Accept" if final >= 75 else "Maybe" if final >= 60 else "Reject"

    out = ["| Recruiter | Score | Knock-out |", "|---|---:|---|"]
    for r in present:
        knock = rows[r][1]
        out.append("| %s | %s | %s |" % (r, show_tenths(scores[r]), knock.replace("|", "/") if knock else "none"))
    out += ["", "| Section | " + " | ".join(RECRUITERS) + " | Avg |", "|---|" + "---:|" * (len(RECRUITERS) + 1)]
    for key, name in SECTIONS:
        cells = [show_input(rows[r][0][key]) if r in rows else "-" for r in RECRUITERS]
        nums = [rows[r][0][key] for r in present if rows[r][0][key] is not None]
        avg = show_tenths(tenth(sum(nums) / len(nums))) if nums else "n/a"
        out.append("| %s | %s | %s |" % (name, " | ".join(cells), avg))
    out.append("")

    top = max(present, key=lambda r: scores[r])
    low = min(present, key=lambda r: scores[r])
    spread = scores[top] - scores[low]
    out.append("final: " + show_tenths(final))
    out.append("verdict: " + verdict)
    out.append("spread: " + show_tenths(spread))
    if spread > 30:
        out.append("outliers: %s %s (high), %s %s (low)" % (top, show_tenths(scores[top]), low, show_tenths(scores[low])))
    else:
        out.append("outliers: none")
    claims = ["knockout: %s: %s" % (r, rows[r][1]) for r in present if rows[r][1]]
    out += claims or ["knockout: none"]
    out.append("partial: missing " + ", ".join(missing) if missing else "partial: none")
    print("\n".join(out))


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except Problem as err:
        sys.stderr.write("score.py: %s: %s\n" % (err.where, err.text))
        sys.exit(2)
