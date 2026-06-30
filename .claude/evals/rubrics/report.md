# Rubric: report 評分維度

定義 test-report.md 與 release-summary.md 應被評估的面向。判斷條件見 `criteria/flow-gates.md`，基準值見 `benchmarks/qa-baseline.md`。

## QA Report (test-report.md)

| # | 檢查項目 | 說明 | 權重 |
|---|---------|------|------|
| 1 | **Pass/Fail 來源正確** | 所有狀態來自 execution-results.json，不是 AI 推斷 | 高 |
| 2 | **覆蓋率計算正確** | 通過數 / 總 TC 數，與 execution-results 一致 | 高 |
| 3 | **Failed TC 有說明** | 每個 Failed TC 有失敗原因說明 | 高 |
| 4 | **Blocked TC 有說明** | Blocked TC 有記錄阻塞原因 | 中 |
| 5 | **風險結論** | 有整體風險評估（可 release / 建議修復後 release / 不建議 release） | 高 |

## PM Release Summary (release-summary.md)

| # | 檢查項目 | 說明 | 權重 |
|---|---------|------|------|
| 1 | **語言適合 PM** | 無技術術語，使用功能性描述 | 高 |
| 2 | **結論在最前** | 第一段即說明此次 release 是否建議上線 | 高 |
| 3 | **已知問題列出** | Failed 或 Blocked 的功能有明確列出 | 高 |
| 4 | **不含未執行功能** | 沒有 execution-results 的功能不出現在報告中 | 高 |
