import json
from collections import defaultdict
from pathlib import Path

transcript = Path(
    r"C:\Users\zarak\.cursor\projects\f-coding-LMS-lms-cursor\agent-transcripts"
    r"\b971e186-236b-48e3-bcb6-01ee6395dc3d\b971e186-236b-48e3-bcb6-01ee6395dc3d.jsonl"
)
repo = Path(r"F:\coding\LMS\lms-cursor")
out_base = repo / ".transcript-recovery" / "restored2"

priority = [
    "frontend/src/components/layout/DashboardLayout.tsx",
    "frontend/src/components/layout/StatCard.tsx",
    "frontend/tailwind.config.js",
    "frontend/src/components/ui/button.tsx",
    "frontend/src/components/ui/card.tsx",
    "frontend/src/components/ui/input.tsx",
    "frontend/src/components/ui/dialog.tsx",
    "frontend/src/components/ui/skeleton.tsx",
    "frontend/src/pages/auth/LoginPage.tsx",
    "backend/src/models/Payment.model.ts",
    "backend/src/services/fine.service.ts",
    "backend/src/validators/fine.validator.ts",
    "backend/src/routes/fine.routes.ts",
]
priority_set = set(priority)


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
        if rp not in priority_set:
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

counts = defaultdict(lambda: {"write": 0, "replace": 0})
for _, rp, kind, _ in events:
    counts[rp][kind] += 1

print("Events per file:")
for pf in priority:
    c = counts[pf]
    print(f"  {pf}: write={c['write']} replace={c['replace']}")

reads = {}
for pf in priority:
    fp = repo / pf
    if fp.exists():
        reads[pf] = fp.read_text(encoding="utf-8")

file_state: dict[str, str] = {}
failed_replaces: dict[str, list[tuple[int, str]]] = defaultdict(list)

for line_no, rp, kind, data in events:
    if kind == "write":
        file_state[rp] = data
    elif kind == "replace":
        old, new, replace_all = data
        if rp not in file_state:
            if rp in reads:
                file_state[rp] = reads[rp]
            else:
                failed_replaces[rp].append((line_no, "no_base"))
                continue
        content = file_state[rp]
        if replace_all:
            if old in content:
                file_state[rp] = content.replace(old, new)
            else:
                failed_replaces[rp].append((line_no, "old_not_found"))
        else:
            if old in content:
                file_state[rp] = content.replace(old, new, 1)
            else:
                failed_replaces[rp].append((line_no, "old_not_found"))

results = []
for pf in priority:
    if pf in file_state:
        out_path = out_base / pf
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(file_state[pf], encoding="utf-8")
        lines = len(file_state[pf].splitlines())
        failed = len(failed_replaces.get(pf, []))
        results.append((pf, lines, failed))
        print(f"SAVED {pf} lines={lines} failed_replaces={failed}")
        if failed:
            for ln, reason in failed_replaces[pf]:
                print(f"  FAIL line {ln}: {reason}")
    else:
        print(f"MISSING {pf}")
        results.append((pf, 0, -1))

print("---SUMMARY---")
for pf, lines, failed in results:
    status = "OK" if lines > 0 else "MISSING"
    print(f"{status}|{pf}|{lines}|{failed}")
