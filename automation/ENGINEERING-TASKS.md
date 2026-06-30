# SDET 前置確認清單

> 執行自動化測試前需確認的項目（URL、測試資料、環境）。
> 更新：2026-06-12

## Priority Legend

| 優先度 | 說明 |
|--------|------|
| 🔴 P1 | 阻塞所有測試執行 |
| 🟠 P2 | 阻塞特定功能測試 |

---

## Global

| # | 優先度 | Task |
|---|--------|------|
| 1 | 🔴 P1 | 確認 `.env` 的 `CYPRESS_BASE_URL` 與 `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` 正確 |

## 跳題邏輯 (question-logic.cy.ts)

| # | 優先度 | Task |
|---|--------|------|
| 2 | 🟠 P2 | 確認從年齡帶入測驗的 URL pattern（例如 `/exam/start?age=4`） |
| 3 | 🟠 P2 | 確認是否有 API 或 URL 參數可直接從特定年齡層開始測驗（邊界條件用） |

## 圖卡配對 (card-matching.cy.ts)

> 更新：2026-06-15 — step code 已確認，data-testid 已清除，改用 cy.intercept() 架構

| # | 優先度 | Task |
|---|--------|------|
| 4 | 🟠 P2 | **TC-001~003**：在 cases.json 填入真實 4M / 6M / 8M childId，並確認 quiz API `POST /cskapi/api/child/*/quizattempts/` response 中 steps 陣列的欄位名稱（目前用 `JSON.stringify` 搜尋 `"picture-pairing"` 字串，若欄位名稱不同需調整 assertion） |
| 4a | 🟠 P2 | **TC-004~005**：對 `/question?step=picture-pairing` 執行 Playwright snapshot，取得圖卡選項 selector（按鈕文字 / img alt / 穩定 class）及正向回饋文字後補齊兩個 skip test |
| 4b | 🔵 參考 | **已確認**（2026-06-15 bundle 分析）：圖卡配對 step code = `picture-pairing`，quiz API pattern = `**/cskapi/api/child/*/quizattempts/**` |

## 影片錄製 (video-recording.cy.ts)

| # | 優先度 | Task |
|---|--------|------|
| 5 | 🟠 P2 | 確認大肢體模組錄製頁 URL（目前假設 `/exam/module/gross-motor/record`） |
| 6 | 🟠 P2 | 確認走路側面模組錄製頁 URL（目前假設 `/exam/module/gait-side/record`） |

## 口語表達 (verbal-expression.cy.ts)

| # | 優先度 | Task |
|---|--------|------|
| 7 | 🟠 P2 | 確認口語表達題頁面 URL |
| 8 | 🟠 P2 | 確認計時器是否相容 `cy.clock()` / `cy.tick()`（計時邊界測試用） |

## 手繪圖形辨識 (handwriting-recognition.cy.ts)

| # | 優先度 | Task |
|---|--------|------|
| 9 | 🟠 P2 | 確認手繪辨識頁面 URL |

## 走路步態 (gait-analysis.cy.ts)

| # | 優先度 | Task |
|---|--------|------|
| 10 | 🟠 P2 | 確認各子模組 URL：提示頁、正面錄製、側面錄製 |

## 重新錄製 (re-recording.cy.ts)

| # | 優先度 | Task |
|---|--------|------|
| 11 | 🟠 P2 | 準備測試資料：有 2 個以上待補錄模組的個案（TC-REREC-002 用） |
| 12 | 🟠 P2 | 準備測試資料：有 3 個待補錄模組、其中 1 個已完成的個案（TC-REREC-004 用） |
| 13 | 🟠 P2 | 確認檢測紀錄頁面 URL（目前假設 `/records`） |

## 帳號註冊 (account-register.cy.ts)

| # | 優先度 | Task |
|---|--------|------|
| 14 | 🟠 P2 | 確認 OTP 驗證 API endpoint（目前假設 `**/verify-otp`） |

## 後台管理 (admin-backend.cy.ts)

| # | 優先度 | Task |
|---|--------|------|
| 15 | 🟠 P2 | 確認後台 URL（目前假設 `/admin`） |
| 16 | 🟠 P2 | 準備測試資料：已停用狀態的測試帳號（`disabled_user` fixture 用） |

## 資料驗證 API (data-validation.test.py)

| # | 優先度 | Task |
|---|--------|------|
| 17 | 🟠 P2 | 確認身分證字號驗證 API endpoint（目前假設 `POST /api/validate/id-number`） |
| 18 | 🟠 P2 | 確認 request body key（`id_number`?）與 response key（`valid`?） |

## 帳號申請 (register.cy.ts) — snapshot-12 更新發現（2026-06-12）

| # | 優先度 | Task |
|---|--------|------|
| 19 | 🟠 P2 | 密碼欄位 placeholder 為空字串，目前用 `cy.contains('.label', '密碼').parent().find('input')` 定位，建議補 `data-testid="register-password-input"` |
| 20 | 🟠 P2 | 確認密碼欄位 placeholder 同為空字串，建議補 `data-testid="register-confirm-password-input"` |
| 21 | 🟠 P2 | TC-REGISTER-001（登入頁入口）— snapshot-11 確認登入頁無「創立帳號」按鈕，需 PM/工程確認入口位置 |

## 帳號申請 (account-register.cy.ts) — selector 修正

| # | 優先度 | Task |
|---|--------|------|
| 22 | 🟠 P2 | `account-register.cy.ts` 第 22 行密碼 placeholder 用 `"請輸入 8 碼以上含大小寫英文"`，snapshot 確認 placeholder 為空字串，改用 label 定位或補 data-testid |
