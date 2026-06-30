from __future__ import annotations

import argparse
import json
import os
from pathlib import Path


SCREENSHOT_ROOT = Path("artifacts/raw/cypress/screenshots")
VIDEO_ROOT = Path("artifacts/raw/cypress/videos")
ALLURE_REPORT = Path("artifacts/generated/allure-report/index.html")


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def dump_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def rel(path: Path) -> str:
    return path.as_posix()


def find_matching_file(root: Path, test_case_id: str, suffixes: tuple[str, ...]) -> str:
    if not root.exists():
        return ""
    token = test_case_id.lower()
    matches = [
        path
        for path in root.rglob("*")
        if path.is_file()
        and path.suffix.lower() in suffixes
        and token in path.as_posix().lower()
    ]
    if not matches:
        return ""
    matches.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    return rel(matches[0])


def sync_evidence(specs_root: Path, base_url: str = "", overwrite: bool = False) -> list[str]:
    changed_files: list[str] = []
    allure_path = rel(ALLURE_REPORT) if ALLURE_REPORT.exists() else ""

    for results_path in sorted(specs_root.glob("*/execution-results.json")):
        data = load_json(results_path)
        changed = False

        for item in data.get("test_results", []):
            if not isinstance(item, dict):
                continue

            test_case_id = item.get("test_case_id", "")
            if not test_case_id:
                continue

            if base_url and (overwrite or not item.get("test_url")):
                item["test_url"] = base_url
                changed = True

            screenshot = find_matching_file(SCREENSHOT_ROOT, test_case_id, (".png", ".jpg", ".jpeg"))
            if screenshot and (overwrite or not item.get("screenshot")):
                item["screenshot"] = screenshot
                changed = True

            video = find_matching_file(VIDEO_ROOT, test_case_id, (".mp4", ".mov", ".webm"))
            evidence = video or allure_path
            if evidence and (overwrite or not item.get("evidence")):
                item["evidence"] = evidence
                changed = True

        if changed:
            dump_json(results_path, data)
            changed_files.append(rel(results_path))

    return changed_files


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Cypress screenshots/videos and Allure report into execution-results.json.")
    parser.add_argument("--specs-root", default="qa-workspace/specs")
    parser.add_argument("--base-url", default=os.getenv("CYPRESS_BASE_URL", ""))
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    changed_files = sync_evidence(Path(args.specs_root), base_url=args.base_url, overwrite=args.overwrite)
    if changed_files:
        print("Automation evidence synced:")
        for path in changed_files:
            print(f"  - {path}")
    else:
        print("Automation evidence sync skipped: no matching Cypress evidence found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
