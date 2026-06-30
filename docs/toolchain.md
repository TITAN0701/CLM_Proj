# Toolchain

本專案測試工具先固定為：

```txt
E2E: Cypress
API: Python + pytest
CI: GitHub Actions
Report: Allure
```

## Responsibility

| Layer | Tool | Purpose |
|---|---|---|
| E2E | Cypress | 瀏覽器操作、UI flow、主要使用者流程 |
| API | Python + pytest | API contract、狀態驗證、資料規則 |
| Report | Allure | 統一整理 Cypress 與 pytest 測試結果 |
| CI | GitHub Actions | PR / main branch 自動執行測試 |

## Directory Mapping

```txt
automation/
  e2e/
    specs/          # Cypress spec files: *.cy.ts
    pages/          # Page object
    flows/          # Reusable user flows
    fixtures/       # Cypress fixtures
    support/        # Cypress support files
  api/
    tests/          # pytest tests: test_*.py
    clients/        # API clients
    schemas/        # Response schema helpers
  testdata/         # Shared test data

artifacts/
  raw/
    allure-results/ # Raw Allure result files
  generated/
    qa/             # AI-generated QA report
    pm/             # AI-generated PM summary
```

## Execution Flow

```txt
QA approves test cases
        ↓
AI/QA creates Cypress and pytest draft
        ↓
SDET reviews code
        ↓
GitHub Actions runs Cypress and pytest
        ↓
Both tools write Allure results
        ↓
Allure generates HTML report
        ↓
AI reads raw result and creates summary
```

## Commands

Local E2E:

```powershell
npm install
npm run test:e2e
```

Local API:

```powershell
pip install -r requirements.txt
pytest
```

Generate Allure report locally:

```powershell
npm run allure:generate
npm run allure:open
```

## Rule

- Cypress and pytest are responsible for pass/fail.
- Allure is responsible for raw and visual report.
- AI can summarize reports, but cannot invent test results.
