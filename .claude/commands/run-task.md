# Run Task

> 此指令是使用者的**啟動動作**。
> 使用者填好 `qa-workspace/current-task.md` 後，執行 `/run-task` 啟動執行。

## 執行規則

載入 `.claude/modules/task-registry.md`，依其規則執行。

執行流程：
1. 讀取 `qa-workspace/current-task.md`
2. 確認任務清單不為空
3. 建立 TodoWrite 宣告任務清單
4. 依序執行每個任務
5. 完成後回報摘要
