# Bug Report: CA 機構管理頁面路由 404

**ID**: BUG-001  
**嚴重程度**: High  
**狀態**: Closed  
受影響功能: CA 機構管理  
**日期**: 2026-06-18

---

## 問題描述

直接導航至 `/admin/ca-providers` 返回 404，頁面被重導回首頁（`/`）。  
Console 顯示錯誤訊息。

## 重現步驟

1. 以 admin 身分登入系統
2. 於瀏覽器網址列直接輸入 `http://192.168.0.122:19010/admin/ca-providers`
3. 頁面重導至 `http://192.168.0.122:19010/`，無 CA 機構內容

## 預期結果

應顯示 CA 機構管理頁面，列出已設定的 CA Provider（letsencrypt、twca 等）

## 實際結果

頁面重導回首頁（Dashboard），Console 有錯誤紀錄

## 環境

- URL: http://192.168.0.122:19010
- 測試帳號: admin@local
- 測試日期: 2026-06-18
- 測試工具: Playwright MCP

## 備註

- 透過「管理項目」下拉選單是否可進入尚未驗證
- 其他管理路由（`/admin/users`、`/admin/groups`、`/admin/endpoints`、`/admin/dns-providers`）均正常
- 相關 TC: TC-F09-01
