# Agent Pocket

目前模式：**Telegram 只通知，回到電腦處理**。

- 手機收到「Codex 工作需要你處理」，不含操作按鈕，也不接收答案。
- Agent Pocket 受管理工作的完整請求顯示於電腦終端，由本機回答。
- 保留既有 Telegram 配對，停用 `--remote`。
- 以下 `serve` 是獨立受管理工作；原生桌面聊天室通知另使用下方全域 Hooks。

```powershell
npm ci
npm run build
npm run serve -- --project "C:\path\to\project"
```

[服務操作](docs/SERVICE.md) · [Telegram 設定](docs/TELEGRAM.md) · [進度](docs/PROGRESS.md)

驗證：41 項自動測試通過。過去手機核准／回答證據保留在 docs/evidence，僅代表歷史版本，不代表目前功能啟用。

## 桌面全域通知

全域 Hooks 已安裝，真正桌面聊天室的問題與核准事件通知均已獲 iPhone 確認。問題由電腦回答後原工作繼續；核准測試由自動審查處理，未出現人工核准框，因此人工允許／拒絕尚未驗收。核准通知可能包含已自動處理的請求。見 [安裝與驗收狀態](docs/DESKTOP-NOTIFICATIONS.md)。不接受手機回答或核准，未宣稱所有聊天室／工具路徑全覆蓋。
