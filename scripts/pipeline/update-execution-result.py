from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path


EXECUTED_STATUSES = {"Pass", "Fail", "Blocked", "N/A"}
VALID_STATUSES = {"Not Run", "Ready", "Pass", "Fail", "Blocked", "N/A"}


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def dump_json(path: Path, data: dict) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def now_text() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def update_result(
    specs_root: Path,
    feature: str,
    test_case_id: str,
    status: str,
    platform: str,
    test_url: str | None,
    screenshot: str | None,
    evidence: str | None,
    notes: str | None,
    executed_at: str | None,
) -> Path:
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status {status!r}. Valid values: {', '.join(sorted(VALID_STATUSES))}")

    results_path = specs_root / feature / "execution-results.json"
    if not results_path.exists():
        raise FileNotFoundError(f"execution-results.json not found: {results_path}")

    data = load_json(results_path)
    results = data.get("test_results")
    if not isinstance(results, list):
        raise ValueError(f"{results_path} must contain test_results array")

    target = None
    for item in results:
        if isinstance(item, dict) and item.get("test_case_id") == test_case_id and item.get("platform") == platform:
            target = item
            break

    if target is None:
        target = {
            "test_case_id": test_case_id,
            "platform": platform,
            "status": "Not Run",
            "executed_at": "",
            "test_url": "",
            "screenshot": "",
            "evidence": "",
            "notes": "",
        }
        results.append(target)

    target["status"] = status
    if status in EXECUTED_STATUSES:
        target["executed_at"] = executed_at or now_text()
    elif executed_at is not None:
        target["executed_at"] = executed_at
    elif status == "Not Run":
        target["executed_at"] = ""

    if evidence is not None:
        target["evidence"] = evidence
    if test_url is not None:
        target["test_url"] = test_url
    if screenshot is not None:
        target["screenshot"] = screenshot
    if notes is not None:
        target["notes"] = notes

    dump_json(results_path, data)
    return results_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Update QA execution result and auto-fill executed_at.")
    parser.add_argument("--specs-root", default="qa-workspace/specs")
    parser.add_argument("--feature", required=True)
    parser.add_argument("--test-case-id", required=True)
    parser.add_argument("--status", required=True, choices=sorted(VALID_STATUSES))
    parser.add_argument("--platform", default="Desktop / Win Chrome")
    parser.add_argument("--test-url", help="Page URL used for this execution.")
    parser.add_argument("--screenshot", help="Screenshot file path or URL.")
    parser.add_argument("--evidence")
    parser.add_argument("--notes")
    parser.add_argument("--executed-at", help="Override timestamp. Default: current local time for Pass/Fail/Blocked/N/A.")
    args = parser.parse_args()

    try:
        path = update_result(
            specs_root=Path(args.specs_root),
            feature=args.feature,
            test_case_id=args.test_case_id,
            status=args.status,
            platform=args.platform,
            test_url=args.test_url,
            screenshot=args.screenshot,
            evidence=args.evidence,
            notes=args.notes,
            executed_at=args.executed_at,
        )
    except Exception as exc:
        print(f"Failed to update execution result: {exc}", file=sys.stderr)
        return 1

    print(f"Updated execution result: {path}")
    print(f"  {args.test_case_id} / {args.platform} = {args.status}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
