# Telegram 只通知模式

首次設定請依 [README](../README.md#3-建立-telegram-bot-並配對) 建立 bot 並完成配對。已有配對時可沿用本機設定。

- `npm run telegram:status`：查看配對狀態。
- `npm run telegram:test`：發送測試通知。
- `npm run telegram:unpair`：解除配對。
- `npm run telegram:pair`：未配對時，以一次性私訊碼及本機 YES 確認綁定。

服務只傳送摘要通知，不含命令、問題答案或操作按鈕。手機文字、舊按鈕均不會被服務接收或套用。配對時的 getUpdates 只供收取配對碼，不是工作回答入口。

日常工作由 `npm run serve -- --project <path>` 啟動，收到提醒後回電腦終端回答。`npm run test:live:telegram` 保留通知＋本機處理的合成測試；`--remote` 已停用。

開發 token 使用忽略追蹤的 .env，正式 OS 秘密儲存尚未實作。API 接受不等於手機已讀。通知遇到網路錯誤採有界重試，可能重複，但沒有可重複執行的手機操作。

原生 Codex 桌面 App 的問題框通知請參考 [桌面通知設定](DESKTOP-NOTIFICATIONS.md)。過去手機核准與回答測試紀錄僅供歷史參考。
