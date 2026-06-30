# Document Writing Guide

這份文件是給 PM、QA 與 AI 使用的撰寫指南。

目標是讓文件「可驗收、可測試、可追蹤」，而不是只記錄大方向。

## 好文件的標準

好的功能文件應該符合：

- 明確：不要只寫抽象描述。
- 可測：QA 可以根據內容寫測試案例。
- 可追蹤：每個需求能對應到情境或測試案例。
- 可釐清：不確定的地方要放到 `questions.md`。
- 可維護：同一個規則不要散落在很多段落。

## 常見壞寫法與改法

### 例 1: 驗收條件太模糊

不建議：

```md
- 使用者可以正常登入。
```

建議：

```md
- 使用者輸入正確帳號與密碼時，應成功登入並導向 `/dashboard`。
```

原因：後者有輸入、行為與預期結果，QA 可以直接測。

### 例 2: 錯誤情境沒寫清楚

不建議：

```md
- 登入失敗時顯示錯誤。
```

建議：

```md
| Situation | Message |
|---|---|
| 帳號或密碼錯誤 | 帳號或密碼錯誤 |
| 帳號停用 | 帳號已停用，請聯絡管理員 |
```

原因：不同失敗原因可能有不同測試情境。

### 例 3: 範圍沒切清楚

不建議：

```md
- 登入相關功能。
```

建議：

```md
### In Scope
- 帳號密碼登入
- 登入成功導向首頁
- 登入失敗顯示錯誤訊息

### Out of Scope
- 第三方登入
- 忘記密碼
- MFA
```

原因：AI 和 QA 不會誤把 out of scope 功能拿去設計測試。

## PM 撰寫 inbox 需求的規則

PM 不需要直接寫 `spec.md`。PM 只需要在 `pm-inbox/{feature}.md` 記錄客戶需求。

PM 寫 inbox 需求時，請優先回答這些問題：

1. 客戶是誰或哪個部門提出？
2. 客戶原始說法是什麼？
3. 為什麼客戶需要這個需求？
4. 客戶希望達成什麼結果？
5. 目前已經知道哪些範圍？
6. 有哪些地方 PM 還不知道？
7. 優先級或時程是否已確認？
8. 有沒有 ticket、會議紀錄、截圖或文件連結？

如果 PM 不知道答案，不需要硬補。請先寫：

```md
尚未確認。
```

或放到：

```md
## 尚未確認

- 待確認問題
```

後續由 QA/AI 整理成 `spec.md` 與 `questions.md`。

## QA/AI 撰寫 questions.md 的規則

`questions.md` 的目的不是挑錯，而是把「會影響驗收或測試的未知資訊」整理成 PM 可以回答的問題。

每個問題建議包含：

```md
1. 問題
   - Impact: 這會影響什麼測試、驗收或風險？
   - QA Assumption: QA 暫時假設的答案（讓流程能繼續推進）
```

好問題：

```md
1. 使用者輸入未註冊 Email 時，畫面要顯示成功提示還是錯誤訊息？
   - Impact: 會影響錯誤訊息測試，也會影響是否需要避免帳號枚舉風險。
   - QA Assumption: 假設顯示成功提示（避免帳號枚舉），待 Playwright snapshot 確認。
```

壞問題：

```md
1. 忘記密碼流程要怎麼做？
```

原因：太大，PM 不知道要回答哪個決策。

## QA 撰寫 scenarios.md 的規則

QA 寫 `scenarios.md` 時，建議至少包含：

- Happy path：正常成功流程
- Negative path：錯誤輸入或失敗流程
- Permission path：權限不足或角色差異
- State path：不同資料狀態
- Boundary path：邊界值
- Regression path：每次 release 都要確認的核心流程

## AI 產生文件的規則

AI 產出內容時應遵守：

- 如果規格沒有寫，不要自行補商業規則。
- 如果缺少必要資訊，先寫進 `questions.md`。
- 產出的測試案例要能追溯到 `spec.md` 或 `scenarios.md`。
- 報告只能根據 raw test result，不可自己創造 pass/fail。
- 所有 AI 產物都先視為 draft。

## 建議狀態用語

為了避免每個人寫法不同，建議狀態固定使用：

| 狀態 | 用途 |
|---|---|
| Draft | 初稿 |
| In Review | 審核中 |
| Approved | 已確認 |
| Need Clarification | 需要釐清 |
| Not Started | 尚未開始 |
| In Progress | 進行中 |
| Done | 完成 |
| Blocked | 被阻擋 |

## 文件完成標準

`spec.md` 完成標準：

- 有清楚的 Scope / Out of Scope。
- 每個 Acceptance Criteria 都可測。
- 主要錯誤情境有寫出 expected result。
- 商業規則沒有藏在描述文字中。
- Open Questions 沒有高風險未決問題。

`scenarios.md` 完成標準：

- 至少包含一個成功情境。
- 重要失敗情境都有覆蓋。
- 每個情境都有明確 Given / When / Then。
- 每個 Then 都能被驗證。

`plan.md` 完成標準：

- 有測試範圍與不測範圍。
- 有測試資料需求。
- 有自動化建議。
- 有主要風險。
