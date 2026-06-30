# Glossary

此文件定義跨角色、跨檔案容易產生歧義的專有名詞。
AI 在執行任何 QA 產出指令前必須讀取此文件，確保用詞一致。

## 框架通用術語

| Term | Definition |
|------|------------|
| spec.md | PM 整理後的可驗收需求規格 |
| Acceptance Criteria | 驗收條件，用來判斷需求是否完成 |
| Scenario | 測試情境，以 Given / When / Then 描述，存於 scenarios.md |
| Test Case | 結構化測試案例，存於 test-cases.json，每個 TC 有唯一 ID |
| automation_candidate | test-cases.json 中的布林欄位，true = 可自動化，false = 手動測試 |
| SDET TODO | 標記在 .cy.ts 頂部的 SDET 待辦事項，說明需確認哪個 URL、selector 或測試資料 |
| Raw Report | 測試框架或 CI 產生的原始結果 |
| AI Report | AI 根據 Raw Report 產生的摘要與分析 |

## wetpaint 系統專有術語

| Term | 別名／英文 | Definition |
|------|-----------|------------|
| 觀察題組 | observation group | 個案年齡達 15M 以上、完成 AI 模組後觸發的特殊題組，非所有個案都會進入 |
| AI 模組 | AI module | verbal expression、handwriting recognition、gait analysis 三個需 AI 分析的錄製模組，與一般問答題不同 |
| 檢測流程 | exam flow | 從選擇個案 → 依序完成各模組 → 顯示結果的完整流程 |
| 重新錄製 | re-recording | 針對已完成但需重錄的單一模組補錄，不重跑整個檢測流程 |
| CASEID | 個案編號、流水號 | 兒童個案的唯一識別碼，格式規則待群健所確認（progress-bar BLOCKED 原因） |
| 前台 | frontdesk | 一般使用者（照護者/治療師）操作的檢測介面，URL 格式為 /{userId}/developmental |
| 後台 | admin backend | 管理員操作的後台介面，URL 前綴為 /admin/ |
| 發展檢測 | 開始新檢測 | 前台個案卡片上的入口按鈕，點擊後進入檢測流程（SIT 環境操作前須確認） |
| 繼續檢測 | resume exam | 前台個案卡片上的入口按鈕，用於繼續未完成的檢測 |

## 角色對照

| 角色 | 說明 |
|------|------|
| 一般使用者 | 照護者或治療師，操作前台進行兒童發展檢測 |
| 管理員 | admin，操作後台管理帳號、孩童資料、題目內容 |
