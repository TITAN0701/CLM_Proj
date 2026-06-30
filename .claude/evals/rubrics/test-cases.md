# Rubric: test-cases.json 評分維度

定義 test-cases.json 應被評估的面向。判斷條件見 `criteria/flow-gates.md`，基準值見 `benchmarks/qa-baseline.md`。

## 評分項目

| # | 檢查項目 | 說明 | 權重 |
|---|---------|------|------|
| 1 | **唯一 ID** | 每個 TC 有唯一且格式正確的 ID（如 TC-LOGIN-001） | 高 |
| 2 | **automation_candidate 標記** | 每個 TC 都有 `automation_candidate: true/false` | 高 |
| 3 | **scenarios 對應** | 每個 TC 對應 scenarios.md 的至少一個情境 | 高 |
| 4 | **預期結果明確** | 每個 TC 有 `expected_result`，可驗證 | 高 |
| 5 | **步驟完整** | 每個 TC 有 steps 陣列，至少達到 benchmarks 定義的最低步驟數 | 中 |
| 6 | **風險等級標記** | 每個 TC 有對應 risk-rules.md 的風險等級 | 中 |
| 7 | **不可自動化原因** | `automation_candidate: false` 的 TC 有說明原因 | 中 |
