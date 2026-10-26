import json
from pathlib import Path

transcript = Path(
    r"C:\Users\zarak\.cursor\projects\f-coding-LMS-lms-cursor\agent-transcripts"
    r"\b971e186-236b-48e3-bcb6-01ee6395dc3d\b971e186-236b-48e3-bcb6-01ee6395dc3d.jsonl"
)
repo = Path(r"F:\coding\LMS\lms-cursor")
out_base = repo / ".transcript-recovery" / "restored-full"
out_base.mkdir(parents=True, exist_ok=True)


def rel(p: str) -> str:
    return str(Path(p).relative_to(repo)).replace("\\", "/")


def is_project_file(rp: str) -> bool:
    if rp.startswith("frontend/") or rp.startswith("backend/src/"):
        return True
    return False


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
        if not is_project_file(rp):
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
for fp in repo.rglob("*"):
    if not fp.is_file():
        continue
    try:
        rp = str(fp.relative_to(repo)).replace("\\", "/")
    except ValueError:
        continue
    if is_project_file(rp) and fp.suffix in {".ts", ".tsx", ".js", ".css", ".html"}:
        reads[rp] = fp.read_text(encoding="utf-8")

file_state: dict[str, str] = {}
file_has_write: set[str] = set()
failed: dict[str, list[int]] = {}

for line_no, rp, kind, data in events:
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
                failed.setdefault(rp, []).append(line_no)
        else:
            if old in content:
                file_state[rp] = content.replace(old, new, 1)
            else:
                failed.setdefault(rp, []).append(line_no)

for rp, content in sorted(file_state.items()):
    out_path = out_base / rp
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content, encoding="utf-8")
    fail_count = len(failed.get(rp, []))
    print(f"OK {rp} lines={len(content.splitlines())} failed={fail_count}")

print(f"\nTotal files: {len(file_state)}")
print(f"Files with failed replaces: {len(failed)}")
