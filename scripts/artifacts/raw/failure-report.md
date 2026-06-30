# Cypress 失敗報告

> spec: `automation/e2e/specs/dashboard.cy.ts`
> 失敗數: 1 / 1
> 產出時間: 2026-06-25T03:59:40.207Z

---

## ❌ 儀表板 "before each" hook for "TC-F01-01: 儀表板統計卡正確顯示"

**錯誤訊息：**
```
`cy.visit()` failed trying to load:

/login

We failed looking for this file at the path:

/Users/suppo/Desktop/RXCLM/login

The internal Cypress web server responded with:

  > 404: Not Found

This error occurred while creating the session. Because the session setup failed, we failed the test.

Because this error occurred during a `before each` hook we are skipping all of the remaining tests.
```

**推算頁面：** `/dashboard`

**建議動作：**
1. 用 Playwright MCP 截圖：navigate to `/dashboard`
2. 確認實際 DOM 結構中是否有 `對應元素`
3. 將正確 selector 告知 AI 修正 spec

---
