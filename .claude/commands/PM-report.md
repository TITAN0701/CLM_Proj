# PM Report

> 執行前先讀：`.claude/modules/eval-loader.md`

審查 PM 發布摘要，確認 Google Sheets 與 Drive xlsx 是最新狀態。

> **報告流程說明**：PM 報告不再產出 .md 或 .docx 中間檔。
> 資料來源為 `qa-workspace/.pipeline-state.json`，交付物為 Google Sheets 與 Drive xlsx。

## Goal

```txt
讀取：qa-workspace/.pipeline-state.json
審查：Release Summary 內容是否正確
同步：npm run sync:sheet（若需要更新）
上傳：node scripts/sheets/upload-to-drive.js（若需要產出最新 xlsx）
```

Arguments:

```txt
$ARGUMENTS
```

## Steps

### Step 1 — 讀取 pipeline-state

讀取 `qa-workspace/.pipeline-state.json`。

若不存在或 totals 全為 0，告知使用者：「尚未執行測試，請先執行 /QA-pipeline-run。」直接結束。

### Step 2 — 評估報告品質

對照 `.claude/evals/rubrics/report.md` 執行評估，依 `.claude/evals/criteria/flow-gates.md` 判斷結果代碼：
- `REPORT_INVALID`：pipeline-state 缺少 pass/pending/fail 來源 → 停止，告知使用者先執行 `/QA-pipeline-run`
- `REPORT_OK`：繼續審查

審查以下項目（從 pipeline-state 讀取）：
- 功能清單是否完整（對照 `qa-workspace/specs/` 下的 feature 數量）
- totals Pass / Pending / Fail 是否合理
- pending_breakdown.legitimate_skip 理由是否清楚
- 是否有需要 PM 決策的未決事項

列出審查結果，若有問題項目逐一說明。

### Step 3 — 確認或更新

若 pipeline-state 資料有誤或過期，詢問使用者是否要重新執行 `/QA-pipeline-run` 或手動修正。

### Step 4 — 同步與上傳

資料確認後依需要執行：

```powershell
npm run sync:sheet
node scripts/sheets/upload-to-drive.js
```

回報 Google Sheets 連結與 Drive xlsx 連結。

## Rules

- 不產出任何 .md 或 .docx 報告檔
- 不執行 `export-pm-report-docx.ps1`
- Pass/Fail 數字必須來自 pipeline-state.json，不得捏造
- 不包含 stack trace 或技術細節
- 報告重點：發布風險、受影響功能、需要 PM 決策的事項
- 若原始執行結果缺失，明確說明「無法評估」
