from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

from jsonschema import Draft202012Validator

EXECUTED_STATUSES = {"Pass", "Fail", "Blocked", "N/A"}
RESULT_DEFAULTS = {
    "executed_at": "",
    "test_url": "",
    "screenshot": "",
    "evidence": "",
    "notes": "",
}


def load_json(path: Path) -> object:
    with path.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def dump_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def now_text() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def normalize_execution_result_file(path: Path, data: dict, write: bool = True) -> bool:
    changed = False
    for item in data.get("test_results", []):
        if not isinstance(item, dict):
            continue

        for key, default in RESULT_DEFAULTS.items():
            if key not in item:
                item[key] = default
                changed = True

        if item.get("status") in EXECUTED_STATUSES and not item.get("executed_at"):
            item["executed_at"] = now_text()
            changed = True

    if changed and write:
        dump_json(path, data)
    return changed


def ensure_execution_result_rows(
    path: Path,
    data: dict,
    scenario_ids: list[str],
    test_case_ids: list[str],
    write: bool = True,
) -> bool:
    changed = False

    scenario_reviews = data.setdefault("scenario_reviews", [])
    existing_scenarios = {
        item.get("scenario_id")
        for item in scenario_reviews
        if isinstance(item, dict)
    }
    for scenario_id in scenario_ids:
        if scenario_id not in existing_scenarios:
            scenario_reviews.append({
                "scenario_id": scenario_id,
                "status": "Not Marked",
                "notes": "",
            })
            changed = True

    test_results = data.setdefault("test_results", [])
    default_platform = "Desktop / Win Chrome"
    existing_results = {
        (item.get("test_case_id"), item.get("platform"))
        for item in test_results
        if isinstance(item, dict)
    }
    for test_case_id in test_case_ids:
        key = (test_case_id, default_platform)
        if key not in existing_results:
            row = {
                "test_case_id": test_case_id,
                "platform": default_platform,
                "status": "Not Run",
            }
            row.update(RESULT_DEFAULTS)
            test_results.append(row)
            changed = True

    if changed and write:
        dump_json(path, data)
    return changed


def get_scenario_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    content = path.read_text(encoding="utf-8-sig")
    return set(re.findall(r"(?m)^###\s+(SC-[A-Z0-9_-]+)\s*$", content))


def get_scenario_id_list(path: Path) -> list[str]:
    if not path.exists():
        return []
    content = path.read_text(encoding="utf-8-sig")
    return re.findall(r"(?m)^###\s+(SC-[A-Z0-9_-]+)\s*$", content)


def get_test_case_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    data = load_json(path)
    if not isinstance(data, dict):
        return set()
    return {
        item.get("id")
        for item in data.get("test_cases", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }


def get_test_case_id_list(path: Path) -> list[str]:
    if not path.exists():
        return []
    data = load_json(path)
    if not isinstance(data, dict):
        return []
    return [
        item.get("id")
        for item in data.get("test_cases", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    ]


def format_json_path(path_parts: list[object]) -> str:
    formatted = "$"
    for part in path_parts:
        formatted += f"[{part}]" if isinstance(part, int) else f".{part}"
    return formatted


def validate_execution_results(specs_root: Path, schema_path: Path, fix: bool = False, check: bool = False) -> int:
    schema = load_json(schema_path)
    validator = Draft202012Validator(schema)
    errors: list[str] = []
    fixed_files: list[str] = []

    feature_dirs = sorted(
        path for path in specs_root.iterdir() if path.is_dir() and not path.name.startswith((".", "_"))
    )

    for feature_dir in feature_dirs:
        results_path = feature_dir / "execution-results.json"
        if not results_path.exists():
            errors.append(f"{feature_dir.name}: missing execution-results.json")
            continue

        try:
            data = load_json(results_path)
        except json.JSONDecodeError as exc:
            errors.append(f"{feature_dir.name}: invalid JSON: {exc}")
            continue

        for error in sorted(validator.iter_errors(data), key=lambda item: list(item.path)):
            errors.append(
                f"{feature_dir.name}: schema error at {format_json_path(list(error.path))}: {error.message}"
            )

        if not isinstance(data, dict):
            continue

        if data.get("feature") != feature_dir.name:
            errors.append(f"{feature_dir.name}: feature field must match folder name")

        scenario_id_list = get_scenario_id_list(feature_dir / "scenarios.md")
        test_case_id_list = get_test_case_id_list(feature_dir / "test-cases.json")
        scenario_ids = set(scenario_id_list)
        test_case_ids = set(test_case_id_list)

        if fix or check:
            needs_fix = False
            needs_fix = ensure_execution_result_rows(
                results_path,
                data,
                scenario_id_list,
                test_case_id_list,
                write=fix,
            ) or needs_fix
            needs_fix = normalize_execution_result_file(results_path, data, write=fix) or needs_fix
            if fix and needs_fix:
                fixed_files.append(str(results_path).replace("\\", "/"))
            elif check and needs_fix:
                errors.append(
                    f"{feature_dir.name}: execution-results.json has missing rows or fields "
                    "(run with --fix locally to auto-fill)"
                )

        for index, item in enumerate(data.get("scenario_reviews", [])):
            scenario_id = item.get("scenario_id") if isinstance(item, dict) else None
            if scenario_id not in scenario_ids:
                errors.append(
                    f"{feature_dir.name}: scenario_reviews[{index}].scenario_id {scenario_id!r} "
                    "does not exist in scenarios.md"
                )

        seen_results: set[tuple[str, str]] = set()
        for index, item in enumerate(data.get("test_results", [])):
            if not isinstance(item, dict):
                continue
            test_case_id = item.get("test_case_id")
            platform = item.get("platform")
            if test_case_id not in test_case_ids:
                errors.append(
                    f"{feature_dir.name}: test_results[{index}].test_case_id {test_case_id!r} "
                    "does not exist in test-cases.json"
                )
            key = (test_case_id, platform)
            if key in seen_results:
                errors.append(f"{feature_dir.name}: duplicate test result for {test_case_id} / {platform}")
            seen_results.add(key)

    if errors:
        print("Execution result validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    if fixed_files:
        print("Execution result auto-filled:")
        for path in fixed_files:
            print(f"  - {path}")

    print(f"Execution result validation passed. Checked {len(feature_dirs)} feature workspace(s).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate QA execution-results.json files.")
    parser.add_argument("--specs-root", default="qa-workspace/specs")
    parser.add_argument("--schema", default="qa-workspace/schemas/execution-results.schema.json")
    parser.add_argument("--fix", action="store_true", help="Auto-fill missing executed_at and optional result fields.")
    parser.add_argument("--check", action="store_true", help="Fail if any file would need --fix; does not write files.")
    args = parser.parse_args()
    return validate_execution_results(Path(args.specs_root), Path(args.schema), fix=args.fix, check=args.check)


if __name__ == "__main__":
    sys.exit(main())
