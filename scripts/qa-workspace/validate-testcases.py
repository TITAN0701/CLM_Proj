from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from jsonschema import Draft202012Validator


def load_json(path: Path) -> object:
    with path.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def get_scenario_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()

    content = path.read_text(encoding="utf-8-sig")
    return set(re.findall(r"(?m)^###\s+(SC-[A-Z0-9_-]+)\s*$", content))


def format_json_path(path_parts: list[object]) -> str:
    if not path_parts:
        return "$"

    formatted = "$"
    for part in path_parts:
        if isinstance(part, int):
            formatted += f"[{part}]"
        else:
            formatted += f".{part}"
    return formatted


# ID 前綴對照表：資料夾名稱 → (TC 縮寫前綴, SC 全名前綴)
# TC 用縮寫（如 TC-CARDMATCH-001），SC 用全名（如 SC-CARD-MATCHING-001）
# 新增功能時在此加一行即可；未列出的 feature 兩者皆預設使用資料夾名稱大寫
FEATURE_CODE_ALIASES: dict[str, tuple[str, str]] = {
    "account-register":       ("ACCREG",        "ACCOUNT-REGISTER"),
    "admin-backend":          ("ADMIN",          "ADMIN-BACKEND"),
    "card-matching":          ("CARDMATCH",      "CARD-MATCHING"),
    "data-validation":        ("DATAVAL",        "DATA-VALIDATION"),
    "gait-analysis":          ("GAIT",           "GAIT-ANALYSIS"),
    "handwriting-recognition":("HWRITE",         "HANDWRITING"),
    "observation-group":      ("OBSERVE",        "OBSERVATION-GROUP"),
    "question-content":       ("QCONTENT",       "QUESTION-CONTENT"),
    "question-logic":         ("QLOGIC",         "QUESTION-LOGIC"),
    "re-recording":           ("REREC",          "RE-RECORDING"),
    "verbal-expression":      ("VERBAL",         "VERBAL-EXPRESSION"),
    "video-recording":        ("VIDEO",          "VIDEO-RECORDING"),
    "forgot-password":        ("FORGOT-PASSWORD","FORGOT-PASSWORD"),
    "login":                  ("LOGIN",          "LOGIN"),
    "register":               ("REGISTER",       "REGISTER"),
    "progress-bar":           ("PROGRESS-BAR",   "PROGRESS-BAR"),
}


def validate_testcases(specs_root: Path, schema_path: Path) -> int:
    schema = load_json(schema_path)
    validator = Draft202012Validator(schema)
    errors: list[str] = []
    warnings: list[str] = []

    feature_dirs = sorted(
        path for path in specs_root.iterdir() if path.is_dir() and not path.name.startswith((".", "_"))
    )

    if not feature_dirs:
        errors.append(f"No feature directories found under {specs_root}")

    for feature_dir in feature_dirs:
        testcase_path = feature_dir / "test-cases.json"
        scenarios_path = feature_dir / "scenarios.md"

        if not testcase_path.exists():
            errors.append(f"{feature_dir.name}: missing test-cases.json")
            continue

        try:
            data = load_json(testcase_path)
        except json.JSONDecodeError as exc:
            errors.append(f"{feature_dir.name}: invalid JSON: {exc}")
            continue

        for error in sorted(validator.iter_errors(data), key=lambda item: list(item.path)):
            errors.append(
                f"{feature_dir.name}: schema error at {format_json_path(list(error.path))}: {error.message}"
            )

        if isinstance(data, dict):
            feature_name = data.get("feature")
            if feature_name != feature_dir.name:
                errors.append(
                    f"{feature_dir.name}: feature field must match folder name, got {feature_name!r}"
                )

            scenario_ids = get_scenario_ids(scenarios_path)
            if not scenario_ids:
                warnings.append(f"{feature_dir.name}: no scenarios found for requirement_id cross-check")

            seen_ids: set[str] = set()
            alias = FEATURE_CODE_ALIASES.get(feature_dir.name)
            tc_code = alias[0] if alias else feature_dir.name.upper()
            sc_code = alias[1] if alias else feature_dir.name.upper()
            expected_case_pattern = re.compile(rf"^TC-{re.escape(tc_code)}-\d{{3}}$")
            expected_requirement_pattern = re.compile(rf"^SC-{re.escape(sc_code)}-\d{{3}}$")
            for index, test_case in enumerate(data.get("test_cases", [])):
                if not isinstance(test_case, dict):
                    continue

                case_id = test_case.get("id")
                if case_id in seen_ids:
                    errors.append(f"{feature_dir.name}: duplicate test case id {case_id}")
                elif isinstance(case_id, str):
                    seen_ids.add(case_id)
                    if not expected_case_pattern.match(case_id):
                        errors.append(
                            f"{feature_dir.name}: test_cases[{index}].id must match "
                            f"TC-{tc_code}-001 format, got {case_id!r}"
                        )

                requirement_id = test_case.get("requirement_id")
                if isinstance(requirement_id, str) and not expected_requirement_pattern.match(requirement_id):
                    errors.append(
                        f"{feature_dir.name}: test_cases[{index}].requirement_id must match "
                        f"SC-{sc_code}-001 format, got {requirement_id!r}"
                    )
                if requirement_id and scenario_ids and requirement_id not in scenario_ids:
                    errors.append(
                        f"{feature_dir.name}: test_cases[{index}].requirement_id {requirement_id!r} "
                        f"does not exist in scenarios.md"
                    )

    if warnings:
        print("Test case validation warnings:")
        for warning in warnings:
            print(f"  - {warning}")

    if errors:
        print("Test case validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(f"Test case validation passed. Checked {len(feature_dirs)} feature workspace(s).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate QA test-cases.json files.")
    parser.add_argument("--specs-root", default="qa-workspace/specs")
    parser.add_argument("--schema", default="qa-workspace/schemas/testcase.schema.json")
    args = parser.parse_args()

    return validate_testcases(Path(args.specs_root), Path(args.schema))


if __name__ == "__main__":
    sys.exit(main())
