# Telegram 開發配對與通知

目前提供私訊配對、測試通知及可接 outbox 的通知 channel，尚無手機核准按鈕或回答接收。

1. 用官方 @BotFather 的 /newbot 建立本專案專用 bot。
2. 將 token 存入本機 `.env`：`TELEGRAM_BOT_TOKEN=...`。不要貼入聊天或提交 Git。這是開發環境設定；正式 OS 秘密儲存尚未實作。
3. 在 Telegram 開啟該 bot，按 Start。
4. 在專案根目錄執行 `npm run build`，再 `npm run telegram:pair`。
5. 將終端顯示的一次性碼私訊給 bot。五分鐘有效，只接受 private chat，綁定 user ID 與 chat ID。
6. 回終端核對配對身份，輸入 `YES` 才落盤。不是 YES 或逾期則不綁定。
7. 執行 `npm run telegram:test`，在手機確認通知。API 接受不表示手機已顯示。

`npm run telegram:status` 查狀態；`npm run telegram:unpair` 立即撤銷本機配對。更換 bot 需先解除配對，再清除 `.cache/telegram-cursor.json`；同一 bot 輪替 token 可更新 `.env` 後重新執行。

使用 `.cache/telegram.sqlite` 保存配對，cursor 檔保存 update offset，均排除於 Git。一次只允許同專案一個 Telegram 程序，lock 避免並行消費。若程序崩潰，先確認原程序已結束，再刪除 `.cache/telegram.lock` 後重試；不自動搶占不明 lock。其他目錄／電腦仍不可共用同一 bot polling。

既有 webhook 不會自動移除，應使用專用 bot。只接受一筆有效碼；重送、群組、bot 身份及不同 user/chat 不通過。配對過程不回應陌生帳號。傳送純文字，預設無命令、問題或答案，不提供可誤用的核准按鈕。

通知 channel 將 429、5xx 與網路錯誤交由 M1 重試，尊重 retry_after；其他 API 錯誤為永久失敗。不輸出 token URL、原始 API error description 或訊息內容。任何真正的手機通知都經 Telegram 第三方。

真機驗收需填寫：配對成功、錯誤帳號拒絕、手機實際收到、解除配對後停止傳送。未完成前不得宣稱 iOS／Android 已實測。Codex 常駐 session 與 Telegram 一體化 daemon 仍是下一部分。
