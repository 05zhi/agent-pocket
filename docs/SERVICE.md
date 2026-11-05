# 只通知的前景服務

目前僅適用 Agent Pocket 啟動的受管理工作，不支援附接 Codex 桌面 App 原生工作。

在專案根目錄執行：

```powershell
npm run build
npm run serve -- --project "C:\path\to\project"
```

輸入任務並按 Enter；`/plan 任務文字` 使用 plan 模式。Codex 需要核准／答案時，Telegram 只收到一般提醒，完整請求及編號顯示於電腦終端。

電腦端指令：

- `/reply <request-id> allow`：允許一次，僅原請求有提供此選項時可用。
- `/reply <request-id> deny`：拒絕，僅原請求有提供此選項時可用。
- `/reply <request-id> cancel`：取消回合。
- `/reply <request-id> 答案文字`：回答單題；必須符合原問題限制。
- `/reply <request-id> {"city":["Taipei"],"format":["JSON"]}`：完整回答多題，使用實際題目 ID。
- `/status`：目前狀態；`/interrupt`：中止回合；`/quit`：退出服務。

本機回答也經過身份、請求版本、有效期及一次性狀態驗證。Telegram 不處理答案，不發送核准按鈕。歷史 `--remote` 入口已停用。

服務持續等待下一個本機任務，但不是 Windows 開機服務。使用固定 Codex 版本、workspace-write sandbox 與 on-request approval，不設定永久放行。未知權限類型會中止，檔案／網路權限完整支援仍待開發。

配對與資料庫保留在 .cache，token 僅在本機 .env；同時只允許一個程序持有 lock。啟動時失效舊程序的請求。關閉服務不取消 Telegram 配對。
