# Rubric: scenarios.md 評分維度

定義 scenarios.md 應被評估的面向。判斷條件見 `criteria/flow-gates.md`，基準值見 `benchmarks/qa-baseline.md`。

## 評分項目

| # | 檢查項目 | 說明 | 權重 |
|---|---------|------|------|
| 1 | **Given/When/Then 格式** | 每個情境都有完整的 GWT 三段 | 高 |
| 2 | **Happy path 存在** | 至少一個正常流程情境 | 高 |
| 3 | **Negative path 存在** | 至少一個錯誤 / 例外情境 | 高 |
| 4 | **Boundary path 存在** | 至少一個邊界條件情境 | 中 |
| 5 | **對應 spec 驗收標準** | 每條 acceptance criteria 至少有一個對應情境 | 高 |
| 6 | **無重複情境** | 沒有完全相同的前置條件 + 操作組合 | 中 |
| 7 | **Security / Permission path** | 若功能有權限控制，有對應的情境 | 中 |
