import json
from pathlib import Path

transcript = Path(
    r"C:\Users\zarak\.cursor\projects\f-coding-LMS-lms-cursor\agent-transcripts"
    r"\b971e186-236b-48e3-bcb6-01ee6395dc3d\b971e186-236b-48e3-bcb6-01ee6395dc3d.jsonl"
)
repo = Path(r"F:\coding\LMS\lms-cursor")
out_dir = repo / ".transcript-recovery"
out_dir.mkdir(exist_ok=True)

priority = [
    "frontend/src/pages/admin/AdminDashboard.tsx",
    "frontend/src/pages/shared/IssueReturnPage.tsx",
    "frontend/src/pages/shared/FinesPage.tsx",
    "frontend/src/pages/shared/BookRequestsPage.tsx",
    "frontend/src/components/layout/AuthLayout.tsx",
    "frontend/src/index.css",
    "frontend/src/index.html",
    "frontend/src/api/borrow.api.ts",
    "frontend/src/api/dashboard.api.ts",
    "frontend/src/api/fine.api.ts",
    "backend/src/services/dashboard.service.ts",
    "frontend/src/schemas/auth.schema.ts",
    "backend/src/validators/auth.validator.ts",
    "frontend/src/pages/auth/RegisterPage.tsx",
]


def rel(p: str) -> str:
    return str(Path(p).relative_to(repo)).replace("\\", "/")


events = []
for i, line in enumerate(transcript.read_text(encoding="utf-8").splitlines(), 1):
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        continue
    if obj.get("role") != "assistant":
        continue
    content = obj.get("message", {}).get("content", [])
    if not isinstance(content, list):
        continue
    for item in content:
        if not isinstance(item, dict) or item.get("type") != "tool_use":
            continue
        name = item.get("name")
        inp = item.get("input", {})
        path = inp.get("path", "")
        if not path:
            continue
        try:
            rp = rel(path)
        except ValueError:
            continue
        if name == "Write" and "contents" in inp:
            events.append((i, rp, "write", inp["contents"]))
        elif name == "StrReplace":
            events.append(
                (
                    i,
                    rp,
                    "replace",
                    (
                        inp.get("old_string", ""),
                        inp.get("new_string", ""),
                        inp.get("replace_all", False),
                    ),
                )
            )

reads = {}
for pf in priority:
    fp = repo / pf
    if fp.exists():
        reads[pf] = fp.read_text(encoding="utf-8")

file_state: dict[str, str] = {}
file_has_write: set[str] = set()
failed_replaces: dict[str, list[int]] = {}

for line_no, rp, kind, data in events:
    if rp not in priority:
        continue
    if kind == "write":
        file_state[rp] = data
        file_has_write.add(rp)
    elif kind == "replace":
        old, new, replace_all = data
        if rp not in file_state:
            if rp in reads:
                file_state[rp] = reads[rp]
            else:
                continue
        content = file_state[rp]
        if replace_all:
            if old in content:
                file_state[rp] = content.replace(old, new)
            else:
                failed_replaces.setdefault(rp, []).append(line_no)
        else:
            if old in content:
                file_state[rp] = content.replace(old, new, 1)
            else:
                failed_replaces.setdefault(rp, []).append(line_no)

for pf in priority:
    if pf in file_state:
        out_path = out_dir / pf.replace("/", "__")
        out_path.write_text(file_state[pf], encoding="utf-8")
        print(
            f"OK {pf} lines={len(file_state[pf].splitlines())} "
            f"write_base={pf in file_has_write} failed={len(failed_replaces.get(pf, []))}"
        )
    else:
        print(f"MISSING {pf}")
