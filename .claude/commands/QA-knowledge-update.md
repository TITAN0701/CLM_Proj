# QA Knowledge Update

審視 `qa-knowledge/` 四個檔案是否與目前專案的 spec、scenarios 一致，列出過時或缺漏的內容，確認後更新。

## 觸發時機

- 系統功能有重大改版（新功能上線、舊功能下架或改名）
- 發現 AI 產出的 TC 或 .cy.ts 用詞與 spec 不一致
- 新增功能後跑完 /QA-5，懷疑 qa-knowledge 描述已過時

## Steps

### Step 1 — 讀取現有 qa-knowledge

讀取以下四個檔案的完整內容：

```txt
qa-knowledge/glossary.md
qa-knowledge/risk-rules.md
qa-knowledge/selector-policy.md
qa-knowledge/test-strategy.md
```

### Step 2 — 掃描現有功能清單與 spec

用 Glob 取得：

```txt
qa-workspace/specs/*/spec.md
qa-workspace/specs/*/scenarios.md
```

逐一比對 qa-knowledge 的描述與 spec/scenarios 的實際內容，找出：

1. **過時描述** — qa-knowledge 提到的功能、術語、URL、欄位，與現有 spec 不符
2. **缺漏術語** — spec/scenarios 出現的專有名詞，glossary 沒有定義
3. **矛盾規則** — risk-rules 或 test-strategy 的判斷邏輯，與實際 scenarios 的自動化標記不一致
4. **selector 規則是否仍適用** — 若 DOM 已加入 data-testid，selector-policy 的禁用規則需解除

### Step 3 — 產出差異報告，等待確認

以下格式列出發現的差異，**不要直接修改檔案**，先讓使用者確認：

```
## qa-knowledge 差異報告

### glossary.md
- [過時] ...
- [缺漏] ...

### risk-rules.md
- [過時] ...
- [建議新增] ...

### selector-policy.md
- [過時] ...
- [建議調整] ...

### test-strategy.md
- [過時] ...
- [建議新增] ...

---
確認後輸入「更新」，AI 將依上述差異修改 qa-knowledge 並 commit。
```

### Step 4 — 使用者確認後執行更新

使用者回覆「更新」或指定要更新哪些項目後：

1. 依確認內容修改對應的 qa-knowledge 檔案
2. 若有新術語加入 glossary，同步確認 QA-clarify、QA-design、QA-5、QA-6 的 Read 清單是否需要調整
3. commit 所有變更，message 格式：

```
update qa-knowledge: {簡述變更內容}
```

## Rules

- Step 3 產出差異報告後必須停下來等使用者確認，不可直接修改
- 只修改使用者明確確認的項目，不順手優化其他內容
- selector-policy 的 data-testid 禁用規則，只有在使用者確認 DOM 已加入 data-testid 後才解除
- 若某個功能已從系統下架（如 register、forgot-password 目前無功能），相關術語從 glossary 標注為「目前停用」而非直接刪除
