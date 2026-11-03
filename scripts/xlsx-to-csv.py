#!/usr/bin/env python3
"""
Convert the club's member spreadsheet into data/participants.csv (id,name,dept).

    pip install openpyxl
    python3 scripts/xlsx-to-csv.py "R_D_view (ALL Members till Summer 26).xlsx"
    npm run build:data

Expects a header row with "Student Id", "Name" and "Department" (extra columns such as
"Designation" are ignored). Fixes the things Excel does to IDs (22301342.0 -> 22301342),
maps full department names onto the ids in src/config/departments.ts, and refuses to write
anything if a row is incomplete, a department is unknown, or an ID appears twice.
"""
import csv
import re
import sys
from collections import Counter
from pathlib import Path

import openpyxl

# Department name (lower-case, "&" already turned into "and") -> id in src/config/departments.ts
DEPT_IDS = {
    "communication and marketing": "comms",
    "creative": "creative",
    "event management": "events",
    "finance": "finance",
    "human resources": "hr",
    "press release and publications": "press",
    "research and development": "rnd",
}


def clean_id(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).strip()
    return re.sub(r"\.0+$", "", s)  # "22301342.0" saved as text


def dept_key(v):
    s = str(v or "").replace("&", " and ")
    return re.sub(r"\s+", " ", s).strip().lower()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "data" / "participants.csv"

    ws = openpyxl.load_workbook(src, read_only=True, data_only=True).active
    rows = ws.iter_rows(values_only=True)
    header = [str(h or "").strip().lower() for h in next(rows)]
    try:
        i_id, i_name, i_dept = header.index("student id"), header.index("name"), header.index("department")
    except ValueError:
        sys.exit(f'Header must contain "Student Id", "Name" and "Department" (found: {header[:6]})')

    errors, seen, result = [], {}, []
    for n, r in enumerate(rows, start=2):
        if not any(c not in (None, "") for c in r[:4]):
            continue  # blank row
        sid = clean_id(r[i_id])
        name = re.sub(r"\s+", " ", str(r[i_name] or "")).strip()
        raw_dept = r[i_dept]
        dept = DEPT_IDS.get(dept_key(raw_dept))
        if not sid or not name:
            errors.append(f"Row {n}: missing {'id' if not sid else 'name'} ({name or sid or 'empty'})")
            continue
        if dept is None:
            errors.append(f'Row {n}: unknown department "{raw_dept}" for {name}')
            continue
        if sid in seen:
            errors.append(f"Row {n}: duplicate ID {sid} ({seen[sid]} and {name})")
            continue
        seen[sid] = name
        result.append((sid, name, dept))

    if errors:
        print(f"{len(errors)} problem(s) in {src.name}, nothing written:")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "name", "dept"])
        w.writerows(result)

    print(f"Wrote {out} ({len(result)} members)")
    for d, c in sorted(Counter(r[2] for r in result).items(), key=lambda x: -x[1]):
        print(f"  {d:<9} {c}")
    odd = [s for s in seen if not re.fullmatch(r"\d{8}", s)]
    if odd:
        print(f"Note: {len(odd)} ID(s) are not 8 digits, e.g. {', '.join(odd[:5])}")


if __name__ == "__main__":
    main()