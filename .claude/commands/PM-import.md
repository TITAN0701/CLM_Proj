# PM Import

將 PM 需求匯入工作區。支援 Markdown 直接撰寫，或從 `pm-inbox/` 的 `.xlsx` 檔匯入。

## Goal

依輸入類型，執行以下其中一條路徑，最終在 `pm-inbox/` 產出結構化的需求 `.md` 文件。

Arguments:

```txt
$ARGUMENTS
```

---

## 路徑判斷

### 情況 A — 使用者直接貼上或描述需求文字

不帶參數，或 `$ARGUMENTS` 是需求描述文字 → 執行「**撰寫需求**」流程。

### 情況 B — 指定 .xlsx 檔案

`$ARGUMENTS` 包含 `.xlsx` 檔名，或 `pm-inbox/` 下有 .xlsx 檔 → 執行「**匯入 XLSX**」流程。

若 `pm-inbox/` 下有多個 .xlsx，列出清單讓使用者選擇。

---

## 流程 A — 撰寫需求

將使用者提供的需求整理成 PM 需求文件，存入 `pm-inbox/`。

### 單一功能格式

```md
# 客戶需求：功能名稱

## 需求來源

- 客戶/部門:
- 來源:
- 日期:
- PM:

## 客戶原始說法

## 需求背景

## 期望結果

## 目前已知內容

-

## 尚未確認

-

## 優先級與時程

- 優先級:
- 期望上線時間:
- 是否影響 release:

## 相關資料

- Ticket:
- 會議紀錄:
- 截圖:
- 文件連結:
```

### 批次需求格式（多功能）

```md
# 需求彙整：名稱

## 需求來源

- 客戶/部門:
- 來源:
- 日期:
- PM:

## 背景

## 需求清單

### 需求 1：需求名稱

目前已知：

-

尚未確認：

-

### 需求 2：需求名稱

目前已知：

-

尚未確認：

-

## 優先級與時程

- 優先級:
- 期望上線時間:
- 是否影響 release:

## 相關資料

- Ticket:
- 會議紀錄:
- 截圖:
- 文件連結:
```

---

## 流程 B — 匯入 XLSX

### Step 1 — 確認檔案

從 `pm-inbox/` 找到指定的 .xlsx，或列出清單讓使用者選擇。

### Step 2 — 列出所有分頁

```python
import openpyxl, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
wb = openpyxl.load_workbook('pm-inbox/<filename>', data_only=True)
for name in wb.sheetnames:
    print(name)
```

列出所有分頁名稱，請使用者選擇要匯入哪個（可多選）。

### Step 3 — 讀取選定分頁

讀取所有非空列，偵測標題列，保留儲存格內的換行。

### Step 4 — 分析並結構化內容

依分頁內容類型選擇格式：
- **Issue / bug tracker** → 依分類欄位分組，每組一個表格，最後加摘要
- **需求清單** → 每項需求用標題分段
- **時程 / 里程碑** → 含日期欄的表格
- **一般平表** → 單一 Markdown 表格

### Step 5 — 寫出 .md 檔

檔名從分頁名稱衍生（小寫 + 連字號）：
- `0507_Issue與處理狀況追蹤` → `issue-tracking-0507.md`
- `需求說明` → `requirements.md`

檔案頂部加：
```md
## 來源
- 原始檔案：<xlsx filename>
- 分頁：<sheet name>
- 匯入日期：<today's date>
```

若同名檔案已存在，先詢問使用者再覆寫。

### Step 6 — 回報結果

- 輸出檔案路徑
- 匯入列數
- 略過的空列數
- 資料品質問題（缺值、狀態標籤不一致等）

---

## Rules

- 只寫 PM 視角的需求內容，不寫 test cases、不寫自動化程式碼
- 資訊不明的欄位寫 `尚未確認`
- 保留客戶原始用詞，不改寫
- 所有輸出只存到 `pm-inbox/`，不在其他目錄建立檔案
- 使用 `openpyxl` 讀取 xlsx；未安裝時先執行 `pip install openpyxl -q`
- Python stdout 一律使用 `encoding='utf-8'` 避免 Windows cp950 編碼錯誤
- 不修改原始 xlsx 檔案
