# Codex 桌面全域通知（驗證中）

最新修正：已在執行時停用 PermissionRequest 通知，避免自動審查造成連續提醒；既有安裝立即生效。只保留問題回答工具通知，一般新訊息及完成事件不通知。人工核准提醒暫不支援，需找到可靠的人工等待訊號。以下核准實測為歷史紀錄。

目標：平常在桌面 App 開的聊天室需要核准／回答時，Telegram 只發提醒，原回答框與決定仍留在電腦。不是 `npm run serve` 啟動的另一個 Codex 工作。

2026-11-05 原生桌面實測：使用者已信任兩個 Hooks。`request_user_input_async` 回答框 → Hook → Telegram API 接受 → iPhone 看見 → 電腦回答 → 原聊天室繼續，通過。核准事件 → Telegram → iPhone 看見亦通過，但自動審查已處理請求，使用者確認**沒有人工核准框**；人工允許／拒絕驗收仍未完成。[去識別化證據](evidence/desktop-global-notifications.json)。

## 安裝

先完成既有 Telegram 配對，保留本機 `.env` 與 `.cache/telegram.sqlite`，然後：

```powershell
npm run build
node scripts/install-desktop-hooks.mjs
node scripts/install-desktop-hooks.mjs --install
```

第一個命令產生 `.cache/desktop-hooks.preview.json`；`--install` 合併使用者 `CODEX_HOME/hooks.json`（預設 `~/.codex/hooks.json`），保留其他 hooks。原檔若存在且有變更，先產生同目錄備份。重跑不重複新增。

在 Codex Settings > Hooks 或輸入框的 Review hooks 檢查並信任問題通知的 `PreToolUse` Hook。`PermissionRequest` 可保持停用。若目前聊天室未重新載入設定，請重新開啟 App 或恢復聊天室後再測。

## 事件與資料

- `PermissionRequest`：執行時略過，不發通知。
- `PreToolUse`：只比對 `request_user_input`、`request_user_input_async`（含命名空間）。已在原生桌面聊天室驗證 `request_user_input_async`。
- 非同步執行，無 stdout、無任何 allow／deny／答案輸出；不接收手機回覆。
- 訊息只有需求類別與 session 雜湊的短碼，不含命令、問題、路徑或聊天內容。
- 使用獨立 `.cache/desktop-notifications.sqlite` 留下雜湊去重鍵、類別、時間、發送狀態及次數，保留 30 天（下次事件時清除）。不讀 transcript。
- 事件提供工具呼叫 ID 時，以該 ID 協助辨識重複事件。
- 每次發送重新讀取既有配對，核對 token 的 bot ID；不修改既有任務資料庫。
- 暫時性錯誤最多嘗試 3 次，每次網路上限 2.5 秒，長時間 rate limit 不阻塞原工作。

## 限制與驗收

API 接受不代表 iPhone 已顯示。網路結果不明時重試可能重複通知；程序中止／離線／長時間限流可能漏通知，不提供持久化背景重送。`sending` 記錄代表結果不明，不能當作送達。

實測發現 `PermissionRequest` 可在自動審查前觸發，因此目前已停用這類通知。相同 Codex home 的 CLI 也可能載入全域 Hooks。

官方指出特殊工具路徑可略過 Hooks，故不能從合約測試推論所有回答框都涵蓋。一般文字問句也不等於呼叫回答工具。主機須開機且連網；在其他主機或雲端執行的聊天室不會使用此電腦的 hook。

安裝後可在原生桌面聊天室觸發回答框，確認手機收到提醒，再從電腦回答並確認原工作繼續。人工核准提醒仍未驗收。

執行 `node scripts/desktop-status.mjs` 可查看設定存在與各類事件/API 接受數量，不會顯示私人內容。不能從設定檔存在推論已獲信任，也不能從事件數量推論手機可見。

停用：在 Settings > Hooks 停用兩個 Agent Pocket hooks，或從 `hooks.json` 移除 `description: agent-pocket-desktop-notify` 的兩組設定，保留其他設定。

官方規格：https://learn.chatgpt.com/docs/hooks
