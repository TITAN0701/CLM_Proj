# Module: MCP Fallback

此模組定義當 MCP 工具不可用時的降級行為，確保框架不會因 MCP 斷線而卡死。

## 使用方式

在需要 MCP 的 command 開頭加入：「先讀 `.claude/modules/mcp-fallback.md` 確認 MCP 狀態」

## 各 Command 的 MCP 依賴

| Command | 需要 MCP | 離線可用 |
|---------|---------|---------|
| `/PM-import` | ❌ | ✅ |
| `/PM-report` | ❌ | ✅ |
| `/QA-1-import-pm-request` | ❌ | ✅ |
| `/QA-clarify` | ❌ | ✅ |
| `/QA-design` | ❌ | ✅ |
| `/QA-5-generate-automation` | ❌（snapshot 可選） | ✅ |
| `/QA-6-generate-report` | ❌ | ✅ |
| `/QA-bug-report` | ❌ | ✅ |
| `/playwright-smoke-test` | ✅ Playwright MCP | ❌ |
| `/check-project` | ❌ | ✅ |
| `/project-init` | ❌ | ✅ |

## Playwright MCP 不可用時

若 `mcp__playwright__browser_navigate` 工具不存在：

```
⚠️  Playwright MCP 無法使用。
請確認：
1. Claude Code MCP 設定是否已啟用 Playwright
2. 重啟 VSCode 後再試
3. 或改用 /QA-5-generate-automation（不帶 snapshot，selector 會標記 [SDET TODO]）
```

直接結束，不繼續執行。

## QA-5 無 Snapshot 時的降級

若 `artifacts/raw/screenshots/snapshots/` 不存在或為空：

- 繼續執行，但 selector 全部標記 `[SDET TODO]`
- 在產出檔案頂部加入提示：
  ```
  // [SDET TODO] Snapshot 不存在，建議先執行 /playwright-smoke-test 再重跑 QA-5
  ```
- 不中斷流程
