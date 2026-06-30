# QA 執行結果回填說明

QA 現階段只維護一份總表：

```txt
qa-workspace/execution-results.csv
```

不要逐一手改各功能資料夾底下的 `execution-results.json`。那些 JSON 是系統同步與驗證用的中介檔，會由整理流程自動更新。

## 操作流程

```txt
打開 qa-workspace/execution-results.csv
        ↓
QA 填狀態、測試網址、截圖、佐證、備註
        ↓
執行 .\scripts\refresh-qa-artifacts.ps1
        ↓
產出 QA Excel / Markdown / QA report
```

## QA 要填的欄位

| 欄位 | 要填什麼 |
|---|---|
| `record_type` | 不要改。`scenario` 是測試情境，`test_case` 是測試案例。 |
| `feature` | 不要改。功能資料夾名稱。 |
| `item_id` | 不要改。`SC-...` 或 `TC-...` 編號。 |
| `title` | 不要改。情境或案例標題。 |
| `platform` | 測試平台，例如 `Desktop / Win Chrome`。 |
| `status` | 執行狀態，請用下方固定值。 |
| `test_url` | 實際測試網址，例如 SIT / QA 環境網址。 |
| `screenshot` | 截圖路徑或連結。失敗、阻塞、重要流程建議填。 |
| `evidence` | Allure、CI artifact、Issue、PR、Log 或影片連結。 |
| `notes` | 補充說明，例如失敗原因、阻塞原因、等待誰處理。 |

## status 怎麼填

| status | 使用時機 |
|---|---|
| `Not Run` | 尚未測試。 |
| `Ready` | 已準備好可以測，但還沒執行。 |
| `Pass` | 測試通過。 |
| `Fail` | 測試失敗。 |
| `Blocked` | 因環境、帳號、API、需求不清楚等原因無法測。 |
| `N/A` | 這個平台或情境不適用。 |

## 情境和案例的差別

```txt
scenario  = 確認這個功能情境是否可測、是否還有需求問題
test_case = 實際測試步驟的執行結果
```

常見狀況：

```txt
scenario = Need Confirm
test_case = Pass
```

這代表測試案例可以先跑過，但需求或驗收條件還沒有完全確認，所以報告會保留風險。

## 一次整理全部 QA 產物

```powershell
.\scripts\refresh-qa-artifacts.ps1
```

這個指令會做：

```txt
匯入 CSV
  ↓
驗證 SDD
  ↓
驗證 test-cases.json
  ↓
同步自動化截圖 / 佐證
  ↓
自動補 executed_at
  ↓
產出 scenario-matrix.md / scenario-matrix.xlsx
  ↓
產出 QA report
```

## 產出要看哪裡

| 產物 | 用途 |
|---|---|
| `artifacts/generated/qa/scenario-matrix.xlsx` | 給 QA 用 Excel 看情境、案例、狀態、佐證。 |
| `artifacts/generated/qa/scenario-matrix.md` | 給 GitHub / PR 看文字版矩陣。 |
| `artifacts/generated/qa/test-report.md` | QA 測試報告。 |

PM 摘要目前不是主要流程。需要時才執行：

```powershell
.\scripts\refresh-qa-artifacts.ps1 -IncludePm
```

需要 PM Word 時：

```powershell
.\scripts\refresh-qa-artifacts.ps1 -IncludePm -IncludeWord
```
