# Selector Policy

此文件定義 E2E 測試使用 selector 的優先順序。
適用系統：國衛院學齡前兒童發展數位評估系統（wetpaint）

## 目前限制（2026-06-10 起）

**禁止在 `.cy.ts` 中使用 `data-testid` 作為 selector。**

原因：SIT 環境的 DOM 目前尚未加入 `data-testid`，用 `[data-testid="..."]` 會導致測試全部失敗。

**遇到沒有穩定 selector 的元素，依下列優先順序選用：**

| 優先順序 | 情況 | 替代 selector |
|---------|------|-------------|
| 1 | 元素有唯一穩定 `id` | `cy.get('#element-id')` |
| 2 | 元素有語意明確的穩定 `class` | `cy.get('.class-name')` |
| 3 | input 欄位有 placeholder | `input[placeholder="實際文字"]` |
| 4 | 按鈕、連結有文字 | `cy.contains('button', '按鈕文字')` |
| 5 | 連結有固定 href | `a[href="/path"]` |
| 6 | 標題確認 | `cy.contains('h1,h2,h3', '標題文字')` |
| 7 | 表格欄位 | `cy.get('table thead').within(() => cy.contains('欄位名稱'))` |

**class 使用條件**：只用語意明確、不因 UI 改版而變動的 class（例如 `.btn-primary`、`.error-message`）。避免使用 Tailwind utility class（如 `.bg-white`、`.text-sm`）或框架自動產生的 hash class。

若以上替代方案也無法確認 selector，該 TC 改為 `it.skip()`，並在頂部加 `[SDET TODO]` 說明需確認哪個屬性或 URL。

## Preferred Selector（data-testid 可用後的長期目標）

1. `data-testid`（待 SIT DOM 補上後再啟用）
2. semantic role，例如 `button`、`input`
3. `placeholder` 或 `label` 文字
4. 穩定且唯一的中文文字（`cy.contains`）

## Avoid

避免使用：

```txt
[data-testid="..."]                    ← 目前禁用，DOM 尚未加入
CSS nth-child（如 li:nth-child(2)）
Tailwind / hash class（如 .bg-white、.text-sm、.jsx-abc123）
完整 XPath
依賴畫面位置的 selector
```

## Grep 掃描清單（QA-5 驗證用）

執行 QA-5 產出驗證時，依此表對 `automation/e2e/specs/` 執行 Grep，只 Read 有命中的檔案：

| 禁用類型 | Grep Pattern |
|---------|-------------|
| data-testid | `data-testid` |

> 此清單是禁用 selector 的唯一來源。需新增禁用規則時，在此表加入對應 Pattern。

## Naming Convention（data-testid 可用後的命名規範）

```txt
data-testid="login-email-input"
data-testid="login-password-input"
data-testid="login-submit-button"
data-testid="login-error-message"
```

## RXCLM 特定 DOM 規則

### Angular Dialog（`[role="dialog"]`）

RXCLM 使用 Angular `<app-dialog-host>` 元件，**非原生 `<dialog>` 元素**：

```html
<div class="dlg-backdrop">
  <div role="dialog" class="dlg-card dlg-success|dlg-danger">...</div>
</div>
```

| 規則 | 正確寫法 | 錯誤寫法 |
|------|---------|---------|
| 取得 dialog | `cy.get('[role="dialog"]')` | `cy.get('dialog')` ← 永遠找不到 |
| 成功 dialog | `cy.get('.dlg-success')` 含「確認」按鈕，**必須點確認** | 不可不點確認就繼續 |
| 危險 dialog（刪除） | `cy.get('.dlg-danger')` 含「刪除」按鈕 | — |
| 等 dialog 消失 | `cy.get('[role="dialog"]').should('not.exist')` | 不可用 `.dlg-backdrop`（持久 div，不自動消失） |

### 表單 label + select

DOM 結構：`<label>欄位名 *</label><div><select>...</select></div>`

```typescript
// ✅ 正確：只取 label 的直接下一個 div 內的 select
cy.contains('label', '欄位名').next().find('select')

// ❌ 錯誤：parent() 範圍太廣，會抓到全頁所有 select
cy.contains('欄位名').parent().find('select')
```

### 表單類 combobox vs 列表頁篩選 combobox

| 類型 | selector | 說明 |
|------|---------|------|
| 表單內欄位（label 結尾有 `*`） | `cy.contains('label', '類型 *').next().find('select')` | label 必含 `*` 星號 |
| 列表頁篩選（label 結尾有 `:`） | `cy.contains('label', '類型:').next().find('select')` | label 必含 `:` 冒號 |

兩者雖然都是 `<select>`，但 label 結尾符號不同，不可互換使用。

### 重複文字按鈕

頁面有多個含相同文字的按鈕時，`cy.contains('button', '文字')` 會匹配到第一個（可能是錯的）：

```typescript
// ✅ 正確：用兄弟元素定位
cy.contains('button', '取消').prev('button')  // 「匯入」按鈕在「取消」左邊

// ❌ 錯誤：模糊匹配到「批次匯入 (Excel)」
cy.contains('button', '匯入')
```

## Review Rule

AI 產生測試碼時：

- **不可寫** `cy.get('[data-testid="..."]')`
- 必須使用從 Playwright snapshot 或 WETPAINT 參考資料中確認的真實 selector
- 無法確認 selector 的 TC 一律寫 `it.skip()`，並在檔案頂部加 `[SDET TODO]`
- `[SDET TODO]` 說明需確認哪個 URL、selector 或 DOM 屬性
