import argparse
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape


PLATFORM_STATUS_OPTIONS = "Not Run,Ready,Pass,Fail,Blocked,N/A"
SCENARIO_STATUS_OPTIONS = "Not Marked,Ready,Need Confirm,Approved,Blocked"
TEST_CASE_STATUS_OPTIONS = "Not Run,Ready,Pass,Fail,Blocked,N/A"


def get_field(block: str, field: str, default: str = "") -> str:
    pattern = rf"(?m)^-\s+\**{re.escape(field)}\**\s*:\s*(.+?)\s*$"
    match = re.search(pattern, block)
    return match.group(1).strip() if match else default


def get_title(path: Path, fallback: str) -> str:
    if not path.exists():
        return fallback
    content = path.read_text(encoding="utf-8")
    match = re.search(r"(?m)^#\s+(.+?)\s*$", content)
    return match.group(1).strip() if match else fallback


def simplify_acceptance(text: str) -> str:
    text = text.strip()
    replacements = [
        ("使用者", "使用者"),
        ("，則系統應", " -> "),
        ("則系統應", " -> "),
        ("。", ""),
    ]
    for old, new in replacements:
        text = text.replace(old, new)
    return text


def normalize_platform_status(status: str) -> str:
    normalized = status.strip().lower()
    if normalized in {"passed", "pass", "通過"}:
        return "Pass"
    if normalized in {"failed", "fail", "失敗"}:
        return "Fail"
    if normalized in {"blocked", "阻擋"}:
        return "Blocked"
    if normalized in {"skipped", "skip", "n/a", "略過"}:
        return "N/A"
    if normalized == "ready":
        return "Ready"
    return "Not Run"


def platform_style(status: str) -> int:
    normalized = normalize_platform_status(status)
    if normalized == "Pass":
        return 7
    if normalized == "Fail":
        return 8
    if normalized == "Blocked":
        return 9
    if normalized == "N/A":
        return 10
    return 11


def split_lines(items: list[str] | None) -> str:
    if not items:
        return ""
    return "\n".join(f"{index}. {item}" for index, item in enumerate(items, start=1))


def read_scenarios(specs_root: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    feature_dirs = sorted(
        p for p in specs_root.iterdir()
        if p.is_dir() and not p.name.startswith((".", "_"))
    )

    for feature_dir in feature_dirs:
        scenario_path = feature_dir / "scenarios.md"
        if not scenario_path.exists():
            continue

        module_name = get_title(feature_dir / "README.md", feature_dir.name)
        content = scenario_path.read_text(encoding="utf-8")
        matches = list(re.finditer(r"(?m)^###\s+(SC-[A-Z0-9_-]+)(?:\s*[：:]\s*(.+?))?\s*$", content))

        for index, match in enumerate(matches):
            next_start = matches[index + 1].start() if index + 1 < len(matches) else len(content)
            block = content[match.start():next_start]
            status = get_field(block, "Status", "Not Marked")
            title = (match.group(2) or "").strip()
            then_text = get_field(block, "Then")
            item = title or then_text or match.group(1)
            rows.append(
                {
                    "feature": feature_dir.name,
                    "module": module_name,
                    "scenario_id": match.group(1),
                    "item": item,
                    "type": get_field(block, "Type"),
                    "priority": get_field(block, "Priority"),
                    "status": status,
                    "source": str(scenario_path).replace("\\", "/"),
                }
            )

    return rows


def read_test_cases(specs_root: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for test_case_path in sorted(specs_root.glob("*/test-cases.json")):
        data = json.loads(test_case_path.read_text(encoding="utf-8"))
        feature = data.get("feature") or test_case_path.parent.name
        module_name = get_title(test_case_path.parent / "README.md", feature)
        for test_case in data.get("test_cases", []):
            rows.append(
                {
                    "feature": module_name,
                    "id": test_case.get("id", ""),
                    "requirement_id": test_case.get("requirement_id", ""),
                    "title": test_case.get("title", ""),
                    "type": test_case.get("type", ""),
                    "priority": test_case.get("priority", ""),
                    "preconditions": split_lines(test_case.get("preconditions")),
                    "test_data": split_lines(test_case.get("test_data")),
                    "steps": split_lines(test_case.get("steps")),
                    "expected": split_lines(test_case.get("expected")),
                    "automation": "Yes" if test_case.get("automation_candidate") else "No",
                    "status": "Not Run",
                    "platform": "Desktop / Win Chrome",
                    "executed_at": "",
                    "test_url": "",
                    "screenshot": "",
                    "evidence": "",
                    "notes": test_case.get("notes", ""),
                    "source": str(test_case_path).replace("\\", "/"),
                }
            )
    return rows


def read_execution_results(specs_root: Path) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    scenario_reviews: dict[str, str] = {}
    test_results: dict[str, dict[str, str]] = {}
    for results_path in sorted(specs_root.glob("*/execution-results.json")):
        data = json.loads(results_path.read_text(encoding="utf-8"))
        for item in data.get("scenario_reviews", []):
            scenario_id = item.get("scenario_id")
            if scenario_id:
                scenario_reviews[scenario_id] = item.get("status", "Not Marked")
        for item in data.get("test_results", []):
            test_case_id = item.get("test_case_id")
            if test_case_id:
                test_results[test_case_id] = {
                    "status": item.get("status", "Not Run"),
                    "platform": item.get("platform", "Desktop / Win Chrome"),
                    "executed_at": item.get("executed_at", ""),
                    "test_url": item.get("test_url", ""),
                    "screenshot": item.get("screenshot", ""),
                    "evidence": item.get("evidence", ""),
                    "notes": item.get("notes", ""),
                }
    return scenario_reviews, test_results


def apply_execution_results(
    scenario_rows: list[dict[str, str]],
    test_case_rows: list[dict[str, str]],
    scenario_reviews: dict[str, str],
    test_results: dict[str, dict[str, str]],
) -> None:
    scenario_to_statuses: dict[str, list[str]] = {}
    for item in test_case_rows:
        result = test_results.get(item["id"])
        if result:
            item.update(result)
        scenario_to_statuses.setdefault(item["requirement_id"], []).append(item["status"])

    for item in scenario_rows:
        item["review_status"] = scenario_reviews.get(item["scenario_id"], "Not Marked")
        item["status"] = summarize_status(scenario_to_statuses.get(item["scenario_id"], []))


def summarize_status(statuses: list[str]) -> str:
    normalized = [normalize_platform_status(status) for status in statuses]
    if not normalized:
        return "Not Run"
    if any(status == "Fail" for status in normalized):
        return "Fail"
    if any(status == "Blocked" for status in normalized):
        return "Blocked"
    if all(status == "Pass" for status in normalized):
        return "Pass"
    if any(status == "Ready" for status in normalized):
        return "Ready"
    if all(status == "N/A" for status in normalized):
        return "N/A"
    return "Not Run"


def col_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def cell_xml(row: int, col: int, value: str, style: int = 0) -> str:
    ref = f"{col_name(col)}{row}"
    return (
        f'<c r="{ref}" t="inlineStr" s="{style}">'
        f"<is><t>{escape(str(value))}</t></is>"
        "</c>"
    )


def row_xml(row: int, cells: list[tuple[int, str, int]], height: int | None = None) -> str:
    height_attr = f' ht="{height}" customHeight="1"' if height else ""
    return f'<row r="{row}"{height_attr}>{"".join(cell_xml(row, col, value, style) for col, value, style in cells)}</row>'


def build_scenario_sheet(rows: list[dict[str, str]]) -> str:
    sheet_rows: list[str] = []
    merges: list[str] = []

    sheet_rows.append(row_xml(1, [
        (1, "功能模組", 1),
        (2, "測試編號", 1),
        (3, "測試項目", 1),
        (4, "類型", 1),
        (5, "優先級", 1),
        (6, "Desktop", 2),
        (7, "情境狀態", 1),
    ], height=26))
    sheet_rows.append(row_xml(2, [
        (6, "Win Chrome", 1),
    ], height=30))
    merges.extend(["A1:A2", "B1:B2", "C1:C2", "D1:D2", "E1:E2", "G1:G2"])

    module_styles = [3, 4, 5, 6]
    row_index = 3
    grouped: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        grouped.setdefault(row["module"], []).append(row)

    for module_index, (module, module_rows) in enumerate(grouped.items()):
        start_row = row_index
        module_style = module_styles[module_index % len(module_styles)]
        for item in module_rows:
            platform_status = normalize_platform_status(item["status"])
            sheet_rows.append(row_xml(row_index, [
                (1, module if row_index == start_row else "", module_style),
                (2, item["scenario_id"], 13),
                (3, item["item"], 12),
                (4, item.get("type", ""), 13),
                (5, item.get("priority", ""), 13),
                (6, platform_status, platform_style(platform_status)),
                (7, item.get("review_status", "Not Marked"), 13),
            ], height=23))
            row_index += 1

        if row_index - start_row > 1:
            merges.append(f"A{start_row}:A{row_index - 1}")

    last_row = max(2, row_index - 1)
    merge_xml = ""
    if merges:
        merge_xml = f'<mergeCells count="{len(merges)}">' + "".join(f'<mergeCell ref="{m}"/>' for m in merges) + "</mergeCells>"

    validation_last_row = max(3, last_row)
    data_validations = f'''
  <dataValidations count="2">
    <dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="F3:F{validation_last_row}">
      <formula1>"{PLATFORM_STATUS_OPTIONS}"</formula1>
    </dataValidation>
    <dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="G3:G{validation_last_row}">
      <formula1>"{SCENARIO_STATUS_OPTIONS}"</formula1>
    </dataValidation>
  </dataValidations>'''

    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>
    <col min="1" max="1" width="20" customWidth="1"/>
    <col min="2" max="2" width="24" customWidth="1"/>
    <col min="3" max="3" width="52" customWidth="1"/>
    <col min="4" max="4" width="12" customWidth="1"/>
    <col min="5" max="5" width="12" customWidth="1"/>
    <col min="6" max="6" width="14" customWidth="1"/>
    <col min="7" max="7" width="18" customWidth="1"/>
  </cols>
  <sheetData>
    {''.join(sheet_rows)}
  </sheetData>
  {merge_xml}
  {data_validations}
</worksheet>'''


def build_test_case_sheet(rows: list[dict[str, str]]) -> str:
    headers = [
        "功能模組",
        "測試案例 ID",
        "標題",
        "優先級",
        "平台",
        "執行狀態",
        "執行時間",
        "測試位址",
        "截圖 / 佐證",
        "備註",
    ]
    sheet_rows = [row_xml(1, [(index, header, 1) for index, header in enumerate(headers, start=1)], height=30)]

    for row_index, item in enumerate(rows, start=2):
        sheet_rows.append(row_xml(row_index, [
            (1, item["feature"], 13),
            (2, item["id"], 13),
            (3, item["title"], 12),
            (4, item["priority"], 13),
            (5, item["platform"], 13),
            (6, item["status"], platform_style(item["status"])),
            (7, item["executed_at"], 13),
            (8, item["test_url"], 12),
            (9, item["screenshot"] or item["evidence"], 12),
            (10, item["notes"], 12),
        ], height=46))

    last_row = max(2, len(rows) + 1)
    data_validations = f'''
  <dataValidations count="1">
    <dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="F2:F{last_row}">
      <formula1>"{TEST_CASE_STATUS_OPTIONS}"</formula1>
    </dataValidation>
  </dataValidations>'''

    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>
    <col min="1" max="1" width="18" customWidth="1"/>
    <col min="2" max="2" width="30" customWidth="1"/>
    <col min="3" max="3" width="34" customWidth="1"/>
    <col min="4" max="7" width="16" customWidth="1"/>
    <col min="8" max="10" width="38" customWidth="1"/>
  </cols>
  <sheetData>
    {''.join(sheet_rows)}
  </sheetData>
  {data_validations}
</worksheet>'''


def build_id_rule_sheet() -> str:
    rows = [
        ("項目", "規則", "範例", "用途"),
        ("測試情境 ID", "SC-{FEATURE}-{NNN}", "SC-LOGIN-001", "代表一個需求/情境"),
        ("測試案例 ID", "TC-{FEATURE}-{NNN}", "TC-LOGIN-001", "代表一個可執行的測試案例"),
        ("執行結果", "寫在 qa-workspace/execution-results.csv", "Pass / Fail / Blocked", "避免重新產生 Excel 時覆蓋人工結果"),
        ("FEATURE", "使用 specs 資料夾名稱的大寫", "forgot-password -> FORGOT-PASSWORD", "讓 ID 可回推功能模組"),
        ("NNN", "三碼流水號，從 001 開始", "001, 002, 003", "讓排序穩定、方便追蹤"),
    ]
    sheet_rows = [
        row_xml(index, [(col, value, 1 if index == 1 else 12) for col, value in enumerate(row, start=1)], height=32)
        for index, row in enumerate(rows, start=1)
    ]

    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="20" customWidth="1"/>
    <col min="2" max="2" width="34" customWidth="1"/>
    <col min="3" max="3" width="28" customWidth="1"/>
    <col min="4" max="4" width="42" customWidth="1"/>
  </cols>
  <sheetData>
    {''.join(sheet_rows)}
  </sheetData>
</worksheet>'''


def build_guide_sheet() -> str:
    rows = [
        ("區塊", "欄位 / 狀態", "填寫方式"),
        ("原則", "Excel", "Excel 是產出報告，不建議當唯一人工維護來源。"),
        ("原則", "qa-workspace/execution-results.csv", "QA 主要回填來源；一張表管理所有功能的情境與案例狀態。"),
        ("原則", "execution-results.json", "由 CSV 同步產生，保留給 schema 驗證與報告流程使用。"),
        ("欄位", "record_type", "scenario 代表情境可測性；test_case 代表測試案例執行結果。"),
        ("欄位", "item_id", "SC-... 或 TC-... 編號。"),
        ("欄位", "test_case_id", "對應 test-cases.json 的測試案例 ID，不要手動改。"),
        ("欄位", "platform", "測試平台，例如 Desktop / Win Chrome。"),
        ("欄位", "status", "只能填 Not Run、Ready、Pass、Fail、Blocked、N/A。"),
        ("欄位", "executed_at", "實際執行時間；status 填 Pass、Fail、Blocked、N/A 後，產生 Excel 時會自動補。"),
        ("欄位", "test_url", "測試時使用的頁面位址，例如 https://qa.example.com/forgot-password。"),
        ("欄位", "screenshot", "截圖檔案路徑或連結，例如 artifacts/screenshots/forgot-password-001.png。"),
        ("欄位", "evidence", "影片、Allure、CI artifact、Issue 或 PR 連結。"),
        ("欄位", "notes", "失敗原因、阻擋原因或補充說明。"),
        ("自動截圖", "Cypress", "截圖或測試名稱包含 TC-... 時，sync-automation-evidence.py 會自動回填 screenshot/evidence。"),
        ("狀態", "Not Run", "還沒測。"),
        ("狀態", "Ready", "已準備好可以測，但尚未執行。"),
        ("狀態", "Pass", "已測試通過。"),
        ("狀態", "Fail", "已測試失敗。"),
        ("狀態", "Blocked", "因環境、帳號、API、需求不清楚等原因無法測。"),
        ("狀態", "N/A", "這個平台或情境不適用。"),
        ("填寫方式", "人工回填", "QA 直接編輯 qa-workspace/execution-results.csv 的 status、test_url、screenshot、evidence、notes。"),
        ("自動補齊", "一次執行", ".\\scripts\\refresh-qa-artifacts.ps1 會匯入 CSV、同步自動化佐證、補欄位、補 executed_at、驗證、產 Excel、產報告。"),
        ("建議指令", "重建 CSV", "python scripts\\sync-execution-results-sheet.py --export --sheet qa-workspace\\execution-results.csv"),
        ("建議指令", "一次執行", ".\\scripts\\refresh-qa-artifacts.ps1"),
        ("建議指令", "包含 PM Word", ".\\scripts\\refresh-qa-artifacts.ps1 -IncludePm -IncludeWord"),
    ]
    sheet_rows = [
        row_xml(index, [(col, value, 1 if index == 1 else 12) for col, value in enumerate(row, start=1)], height=34)
        for index, row in enumerate(rows, start=1)
    ]

    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>
    <col min="1" max="1" width="18" customWidth="1"/>
    <col min="2" max="2" width="26" customWidth="1"/>
    <col min="3" max="3" width="86" customWidth="1"/>
  </cols>
  <sheetData>
    {''.join(sheet_rows)}
  </sheetData>
</worksheet>'''


def build_overview_sheet(rows: list[dict[str, str]], test_case_rows: list[dict[str, str]]) -> str:
    scenario_total = len(rows)
    test_case_total = len(test_case_rows)
    ready_reviews = sum(1 for item in rows if item.get("review_status") in {"Ready", "Approved"})
    need_confirm = sum(1 for item in rows if item.get("review_status") == "Need Confirm")
    blocked_reviews = sum(1 for item in rows if item.get("review_status") == "Blocked")
    passed = sum(1 for item in test_case_rows if item.get("status") == "Pass")
    failed = sum(1 for item in test_case_rows if item.get("status") == "Fail")
    blocked = sum(1 for item in test_case_rows if item.get("status") == "Blocked")
    not_run = sum(1 for item in test_case_rows if item.get("status") in {"Not Run", "Ready"})

    rows_data = [
        ("項目", "數量 / 說明", "資料來源"),
        ("測試情境總數", str(scenario_total), "scenarios.md"),
        ("測試案例總數", str(test_case_total), "test-cases.json"),
        ("情境可測 / 已確認", str(ready_reviews), "execution-results.json / scenario_reviews"),
        ("情境待確認", str(need_confirm), "execution-results.json / scenario_reviews"),
        ("情境阻擋", str(blocked_reviews), "execution-results.json / scenario_reviews"),
        ("案例 Pass", str(passed), "execution-results.json / test_results"),
        ("案例 Fail", str(failed), "execution-results.json / test_results"),
        ("案例 Blocked", str(blocked), "execution-results.json / test_results"),
        ("案例 Not Run / Ready", str(not_run), "execution-results.json / test_results"),
        ("流程", "scenarios.md -> test-cases.json -> qa-workspace/execution-results.csv -> scenario-matrix.xlsx", "README.md"),
        ("提醒", "請回填 qa-workspace/execution-results.csv，不要手動逐一修改 execution-results.json。", "QA workflow"),
    ]
    sheet_rows = [
        row_xml(index, [(col, value, 1 if index == 1 else 12) for col, value in enumerate(row, start=1)], height=32)
        for index, row in enumerate(rows_data, start=1)
    ]

    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="24" customWidth="1"/>
    <col min="2" max="2" width="72" customWidth="1"/>
    <col min="3" max="3" width="44" customWidth="1"/>
  </cols>
  <sheetData>
    {''.join(sheet_rows)}
  </sheetData>
</worksheet>'''


def build_styles() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF1F4E79"/><name val="Calibri"/></font>
    <font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="12">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F3A63"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2F75B5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2F0D9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFCE4D6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF2F8"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFB7B7B7"/></left>
      <right style="thin"><color rgb="FFB7B7B7"/></right>
      <top style="thin"><color rgb="FFB7B7B7"/></top>
      <bottom style="thin"><color rgb="FFB7B7B7"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="14">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>'''


def write_xlsx(rows: list[dict[str, str]], test_case_rows: list[dict[str, str]], output: Path) -> Path:
    output.parent.mkdir(parents=True, exist_ok=True)
    overview_sheet_xml = build_overview_sheet(rows, test_case_rows)
    scenario_sheet_xml = build_scenario_sheet(rows)
    test_case_sheet_xml = build_test_case_sheet(test_case_rows)
    id_rule_sheet_xml = build_id_rule_sheet()
    guide_sheet_xml = build_guide_sheet()
    created = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    files = {
        "[Content_Types].xml": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet5.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>''',
        "_rels/.rels": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>''',
        "xl/workbook.xml": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="總覽" sheetId="1" r:id="rId1"/>
    <sheet name="測試情境" sheetId="2" r:id="rId2"/>
    <sheet name="測試案例" sheetId="3" r:id="rId3"/>
    <sheet name="編碼規則" sheetId="4" r:id="rId4"/>
    <sheet name="填寫說明" sheetId="5" r:id="rId5"/>
  </sheets>
</workbook>''',
        "xl/_rels/workbook.xml.rels": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet5.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>''',
        "xl/worksheets/sheet1.xml": overview_sheet_xml,
        "xl/worksheets/sheet2.xml": scenario_sheet_xml,
        "xl/worksheets/sheet3.xml": test_case_sheet_xml,
        "xl/worksheets/sheet4.xml": id_rule_sheet_xml,
        "xl/worksheets/sheet5.xml": guide_sheet_xml,
        "xl/styles.xml": build_styles(),
        "docProps/core.xml": f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Scenario Matrix</dc:title>
  <dc:creator>QAAI</dc:creator>
  <cp:lastModifiedBy>QAAI</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{created}</dcterms:modified>
</cp:coreProperties>''',
        "docProps/app.xml": '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>QAAI</Application>
</Properties>''',
    }

    actual_output = output
    try:
        zf = zipfile.ZipFile(actual_output, "w", zipfile.ZIP_DEFLATED)
    except PermissionError:
        suffix = datetime.now().strftime("%Y%m%d-%H%M%S")
        actual_output = output.with_name(f"{output.stem}-{suffix}{output.suffix}")
        zf = zipfile.ZipFile(actual_output, "w", zipfile.ZIP_DEFLATED)

    with zf:
        for name, content in files.items():
            zf.writestr(name, content)

    return actual_output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--specs-root", default="qa-workspace/specs")
    parser.add_argument("--output", default="artifacts/generated/qa/scenario-matrix.xlsx")
    args = parser.parse_args()

    specs_root = Path(args.specs_root)
    rows = read_scenarios(specs_root)
    test_case_rows = read_test_cases(specs_root)
    scenario_reviews, test_results = read_execution_results(specs_root)
    apply_execution_results(rows, test_case_rows, scenario_reviews, test_results)
    actual_output = write_xlsx(rows, test_case_rows, Path(args.output))
    print(f"Generated Excel scenario matrix: {actual_output}")
    print(f"Total scenarios: {len(rows)}")
    print(f"Total test cases: {len(test_case_rows)}")


if __name__ == "__main__":
    main()
