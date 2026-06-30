# Module: Eval Loader

此模組定義 AI 在每個產出步驟後，應對照哪個 rubric 進行自我評估。
評估使用三層結構：rubrics（評什麼）→ criteria（怎麼判斷）→ benchmarks（對比什麼）。

## 使用方式

在 command 的產出步驟後加入：
「對照 `.claude/evals/rubrics/{rubric}.md`，依 `.claude/evals/criteria/flow-gates.md` 判斷，基準值參照 `.claude/evals/benchmarks/qa-baseline.md`」

## Rubric 對照表

| 產出物 | Rubric 檔案 | 評估時機 |
|--------|------------|---------|
| `spec.md` | `.claude/evals/rubrics/spec.md` | `/QA-1` 讀取 spec 後 |
| `scenarios.md` | `.claude/evals/rubrics/scenarios.md` | `/QA-design` 產出後 |
| `test-cases.json` | `.claude/evals/rubrics/test-cases.md` | `/QA-design` 產出後 |
| `.cy.ts` / `.py` | `.claude/evals/rubrics/automation.md` | `/QA-5` 產出後 |
| `test-report.md` / `release-summary.md` | `.claude/evals/rubrics/report.md` | `/QA-6` 產出後 |

## 三層評估流程

參考來源：microsoft/LLM-Rubric（多維度評分）、vladfeigin/llm-agents-evaluation（可量測指標）

```
Step 1 — rubrics/    對照評分維度清單，逐項列出評估項目
Step 2 — criteria/   用 metrics.md 的四個維度（Completeness/Consistency/Executability/Traceability）
           對每個高權重項目評 1–5 分
           依 flow-gates.md 判斷是否阻擋
Step 3 — benchmarks/ 對照 qa-baseline.md 的目標分數，輸出「目前 vs 基準」差距
輸出：結果代碼 + 維度分數 + 與基準的差距說明
```

## 評估結果代碼

| 代碼 | 意義 | 行動 |
|------|------|------|
| `SPEC_OK` | spec 品質足夠 | 繼續流程 |
| `SPEC_INCOMPLETE` | spec 缺少高權重項目 | 停止，告知使用者補充 |
| `SCENARIOS_OK` | scenarios 品質足夠 | 繼續產 test-cases |
| `SCENARIOS_INCOMPLETE` | scenarios 缺失太多 | 重新產出 |
| `TC_OK` | test-cases 品質足夠 | 繼續產 automation |
| `TC_INVALID` | test-cases 有高權重錯誤 | 修正後繼續 |
| `AUTOMATION_OK` | automation 可提交 | 列出 SDET 待確認項 |
| `AUTOMATION_BLOCKED` | automation 有安全/規則違反 | 必須修正後才可提交 |
| `REPORT_OK` | 報告品質足夠 | 可交付 |
| `REPORT_INVALID` | 缺少 execution-results | 告知使用者先執行測試 |

## 適用 Commands

- `/QA-design` — 評估 scenarios + test-cases
- `/QA-5-generate-automation` — 評估 .cy.ts / .py
- `/QA-6-generate-report` — 評估 report
