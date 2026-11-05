# Agent Pocket

目前模式：**Telegram 只通知，回到電腦處理**。

- 手機收到「Codex 工作需要你處理」，不含操作按鈕，也不接收答案。
- Agent Pocket 受管理工作的完整請求顯示於電腦終端，由本機回答。
- 保留既有 Telegram 配對，停用 `--remote`。
- 尚未接入 Codex 桌面 App 原生工作，也不會在該 App 額外跳出原生回答框。

```powershell
npm ci
npm run build
npm run serve -- --project "C:\path\to\project"
```

[服務操作](docs/SERVICE.md) · [Telegram 設定](docs/TELEGRAM.md) · [進度](docs/PROGRESS.md)

驗證：41 項自動測試通過。過去手機核准／回答證據保留在 docs/evidence，僅代表歷史版本，不代表目前功能啟用。

## 桌面全域通知

正在驗證真正 Codex 桌面聊天室的通知 Hooks，見 [安裝與驗收狀態](docs/DESKTOP-NOTIFICATIONS.md)。不接受手機回答或核准；尚未宣稱所有桌面聊天室驗收通過。
