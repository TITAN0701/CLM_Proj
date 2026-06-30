from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path


DEFAULT_SHEET = Path("qa-workspace/execution-results.csv")
DEFAULT_PLATFORM = "Desktop / Win Chrome"

FIELDNAMES = [
    "record_type",
    "feature",
    "item_id",
    "title",
    "platform",
    "status",
    "test_url",
    "evidence",
    "notes",
]

SCENARIO_STATUSES = {"Not Marked", "Ready", "Need Confirm", "Approved", "Blocked"}
TEST_STATUSES = {"Not Run", "Ready", "Pass", "Fail", "Blocked", "N/A"}


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def dump_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def get_field(block: str, field: str, default: str = "") -> str:
    match = re.search(rf"(?m)^-\s+{re.escape(field)}\s*:\s*(.+?)\s*$", block)
    return match.group(1).strip() if match else default


def read_scenarios(feature_dir: Path) -> list[dict[str, str]]:
    path = feature_dir / "scenarios.md"
    if not path.exists():
        return []
    content = path.read_text(encoding="utf-8-sig")
    matches = list(re.finditer(r"(?m)^###\s+(SC-[A-Z0-9_-]+)\s*$", content))
    rows: list[dict[str, str]] = []
    for index, match in enumerate(matches):
        next_start = matches[index + 1].start() if index + 1 < len(matches) else len(content)
        block = content[match.start():next_start]
        rows.append({
            "scenario_id": match.group(1),
            "title": get_field(block, "Source acceptance"),
        })
    return rows


def read_test_cases(feature_dir: Path) -> list[dict[str, str]]:
    path = feature_dir / "test-cases.json"
    if not path.exists():
        return []
    data = load_json(path)
    return [
        {
            "test_case_id": item.get("id", ""),
            "title": item.get("title", ""),
        }
        for item in data.get("test_cases", [])
        if isinstance(item, dict) and item.get("id")
    ]


def load_results(feature_dir: Path) -> dict:
    path = feature_dir / "execution-results.json"
    if path.exists():
        return load_json(path)
    return {
        "feature": feature_dir.name,
        "source_test_cases": str(feature_dir / "test-cases.json").replace("\\", "/"),
        "scenario_reviews": [],
        "test_results": [],
    }


def export_sheet(specs_root: Path, output: Path) -> None:
    rows: list[dict[str, str]] = []
    for feature_dir in sorted(path for path in specs_root.iterdir() if path.is_dir() and not path.name.startswith((".", "_"))):
        results = load_results(feature_dir)
        scenario_reviews = {
            item.get("scenario_id"): item
            for item in results.get("scenario_reviews", [])
            if isinstance(item, dict)
        }
        test_results = {
            (item.get("test_case_id"), item.get("platform", DEFAULT_PLATFORM)): item
            for item in results.get("test_results", [])
            if isinstance(item, dict)
        }

        for scenario in read_scenarios(feature_dir):
            review = scenario_reviews.get(scenario["scenario_id"], {})
            rows.append({
                "record_type": "scenario",
                "feature": feature_dir.name,
                "item_id": scenario["scenario_id"],
                "title": scenario["title"],
                "platform": "",
                "status": review.get("status", "Not Marked"),
                "test_url": "",
                "evidence": "",
                "notes": review.get("notes", ""),
            })

        for test_case in read_test_cases(feature_dir):
            result = test_results.get((test_case["test_case_id"], DEFAULT_PLATFORM), {})
            rows.append({
                "record_type": "test_case",
                "feature": feature_dir.name,
                "item_id": test_case["test_case_id"],
                "title": test_case["title"],
                "platform": result.get("platform", DEFAULT_PLATFORM),
                "status": result.get("status", "Not Run"),
                "test_url": result.get("test_url", ""),
                "evidence": result.get("evidence", ""),
                "notes": result.get("notes", ""),
            })

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Exported execution result sheet: {output}")
    print(f"Rows: {len(rows)}")


def import_sheet(specs_root: Path, sheet: Path) -> None:
    if not sheet.exists():
        print(f"Execution result sheet not found, skipping import: {sheet}")
        return

    rows_by_feature: dict[str, list[dict[str, str]]] = {}
    with sheet.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        missing = [name for name in FIELDNAMES if name not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"{sheet} missing required columns: {', '.join(missing)}")
        for row in reader:
            feature = (row.get("feature") or "").strip()
            if feature:
                rows_by_feature.setdefault(feature, []).append({key: (row.get(key) or "").strip() for key in FIELDNAMES})

    changed_files: list[str] = []
    for feature, rows in sorted(rows_by_feature.items()):
        feature_dir = specs_root / feature
        if not feature_dir.exists():
            raise ValueError(f"Feature folder not found for sheet row: {feature}")

        data = load_results(feature_dir)
        data["feature"] = feature
        data["source_test_cases"] = str(feature_dir / "test-cases.json").replace("\\", "/")

        scenario_reviews: dict[str, dict[str, str]] = {
            item.get("scenario_id"): item
            for item in data.get("scenario_reviews", [])
            if isinstance(item, dict)
        }
        test_results: dict[tuple[str, str], dict[str, str]] = {
            (item.get("test_case_id"), item.get("platform", DEFAULT_PLATFORM)): item
            for item in data.get("test_results", [])
            if isinstance(item, dict)
        }

        for row in rows:
            record_type = row["record_type"]
            item_id = row["item_id"]
            if record_type == "scenario":
                status = row["status"] or "Not Marked"
                if status not in SCENARIO_STATUSES:
                    raise ValueError(f"{feature} {item_id}: invalid scenario status {status!r}")
                item = scenario_reviews.setdefault(item_id, {"scenario_id": item_id})
                item["status"] = status
                item["notes"] = row["notes"]
            elif record_type == "test_case":
                status = row["status"] or "Not Run"
                if status not in TEST_STATUSES:
                    raise ValueError(f"{feature} {item_id}: invalid test status {status!r}")
                platform = row["platform"] or DEFAULT_PLATFORM
                item = test_results.setdefault((item_id, platform), {
                    "test_case_id": item_id,
                    "platform": platform,
                })
                item["status"] = status
                item["test_url"] = row["test_url"]
                item["evidence"] = row["evidence"]
                item["notes"] = row["notes"]
                item.setdefault("executed_at", "")
            else:
                raise ValueError(f"{feature} {item_id}: invalid record_type {record_type!r}")

        data["scenario_reviews"] = sorted(scenario_reviews.values(), key=lambda item: item.get("scenario_id", ""))
        data["test_results"] = sorted(test_results.values(), key=lambda item: (item.get("test_case_id", ""), item.get("platform", "")))
        dump_json(feature_dir / "execution-results.json", data)
        changed_files.append(str(feature_dir / "execution-results.json").replace("\\", "/"))

    if changed_files:
        print("Imported execution result sheet:")
        for path in changed_files:
            print(f"  - {path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Import/export a single CSV sheet for QA execution results.")
    parser.add_argument("--specs-root", default="qa-workspace/specs")
    parser.add_argument("--sheet", default=str(DEFAULT_SHEET))
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--export", action="store_true")
    mode.add_argument("--import", dest="do_import", action="store_true")
    args = parser.parse_args()

    specs_root = Path(args.specs_root)
    sheet = Path(args.sheet)
    if args.export:
        export_sheet(specs_root, sheet)
    else:
        import_sheet(specs_root, sheet)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
