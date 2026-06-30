# 報告產出標準

目前先以 QA 文件為主，PM 摘要先視為選用產物。

## QA 報告應該包含

| 區塊 | 內容 |
|---|---|
| 摘要 | 功能數量、測試案例數量、產生時間、整體狀態、回填來源。 |
| 情境可測性統計 | `scenario` 的 Approved / Ready / Need Confirm / Blocked / Not Marked。 |
| 測試案例執行統計 | `test_case` 的 Pass / Fail / Blocked / N/A / Not Run。 |
| 佐證覆蓋 | 已填測試網址、截圖、其他佐證的數量。 |
| 功能狀態明細 | 每個 feature 的狀態、待確認情境、通過/失敗/未執行數量。 |
| 待釐清問題 | 尚未回答的 PM 問題數量。 |
| QA 結論 | QA 對目前測試狀態的判斷。 |

## QA 報告不應該放

| 不建議內容 | 原因 |
|---|---|
| 大量測試步驟全文 | 會讓報告太長，步驟應保留在 `test-cases.json` 或 Excel。 |
| 原始 stack trace 全文 | QA report 只放摘要與連結，細節放 Allure / CI artifact。 |
| 沒有來源的結論 | 每個風險應能追到情境、案例、問題或佐證。 |
| PM 對外敘述 | 目前還沒開始整理 PM 文件，先不要混進 QA report。 |

## QA 主要產物

| 產物 | 用途 |
|---|---|
| `qa-workspace/execution-results.csv` | QA 唯一主要回填來源。 |
| `artifacts/generated/qa/scenario-matrix.xlsx` | Excel 檢視情境、案例、狀態、佐證。 |
| `artifacts/generated/qa/scenario-matrix.md` | GitHub / PR 可讀的矩陣。 |
| `artifacts/generated/qa/test-report.md` | QA 測試報告。 |

## 自動化佐證

Cypress / pytest 的輸出應集中到：

```txt
artifacts/raw/
artifacts/raw/allure-results/
artifacts/generated/allure-report/
```

若要讓系統自動對應截圖或影片，檔名或測試名稱需要包含測試案例 ID：

```txt
TC-FORGOT-PASSWORD-001
TC-LOGIN-001
```

## 建議命名

```txt
SC-{FEATURE}-001 = 測試情境
TC-{FEATURE}-001 = 測試案例
```

範例：

```txt
SC-LOGIN-001
TC-LOGIN-001
```

## 一次產出 QA 文件

```powershell
.\scripts\refresh-qa-artifacts.ps1
```

預設只產 QA 文件。需要 PM 摘要時才加：

```powershell
.\scripts\refresh-qa-artifacts.ps1 -IncludePm
```
