# Module: Task Registry

此模組定義 AI 執行任何任務時的**任務來源、範圍控制與執行規則**。
任務由使用者在 `qa-workspace/current-task.md` 預先定義，AI 照著執行。

---

## Step 0 — 讀取任務定義（每次執行必做）

**啟動任何 command 或收到任何執行指示前，先讀 `qa-workspace/current-task.md`。**

- 有任務清單 → 以此為本次執行範圍，建立 TodoWrite，開始執行
- 任務清單為空 → 告知使用者：「`qa-workspace/current-task.md` 任務清單為空，請填寫後再執行」，停止

---

## 核心規則

### 1. current-task.md 是唯一任務來源

- 任務由使用者在 `qa-workspace/current-task.md` 定義，不在對話中臨時指定
- AI 不自行推導任務範圍，不根據「感覺應該做」來擴展
- 對話中的說明、討論、問答 → **不視為任務指示**，不執行

### 2. 執行前用 TodoWrite 宣告清單

讀完 current-task.md 後，依任務清單建立 TodoWrite：

```
TodoWrite([
  { content: "{任務清單第一項}",  activeForm: "{第一項}中",  status: "pending" },
  { content: "{任務清單第二項}",  activeForm: "{第二項}中",  status: "pending" },
  ...
])
```

宣告後即開始執行，不再詢問確認。

### 3. 清單就是範圍，清單外的事不做

- 執行中發現「順手可以做」的事 → **不做**，最多在完成摘要中列為建議
- 使用者沒有寫進清單的優化、清理、額外驗證 → **不做**
- 所有任務 completed → 停止，回報完成摘要

### 4. 狀態即時更新

- 每個任務**開始前**改為 `in_progress`（同時只有一個）
- 每個任務**完成後**立即改為 `completed`
- 遇到阻礙：保持 `in_progress`，新增一筆說明阻礙的任務，等待使用者指示

---

## current-task.md 格式說明

```markdown
## 任務清單
- {要完成的一件事，動詞開頭}
- {要完成的另一件事}

## 範圍限制（選填）
- {只處理哪些 feature 或檔案}

## 備註（選填）
- {給 AI 的補充說明}
```

---

## 範例

current-task.md 填寫：
```
## 任務清單
- 確定所有 skip 測試是否可解鎖並執行 Cypress
- 更新 pipeline-state.json 反映最新狀態
```

AI 建立的 TodoWrite：
```
TodoWrite([
  { content: "分析所有 it.skip 可解鎖性",   activeForm: "分析 skip 項目中",  status: "pending" },
  { content: "解鎖可改為 it() 的測試",       activeForm: "解鎖 skip 測試中",  status: "pending" },
  { content: "更新 pipeline-state.json",    activeForm: "更新狀態檔中",       status: "pending" },
])
```
