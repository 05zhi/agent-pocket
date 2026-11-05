# Telegram 開發配對與通知

## 手機操作（最新）

先 `npm run build`。已配對後可執行：

```text
node --env-file=.env scripts/live-codex.mjs approval-allow --remote
node --env-file=.env scripts/live-codex.mjs question --remote
node --env-file=.env scripts/live-codex.mjs approval --remote
```

依序用於手機允許一次、選項答案及取消測試；不要同時執行。核准測試只允許固定的合成 Write-Output 命令，不能用此執行器核准一般任務。原請求提供 decline 才顯示拒絕，提供 cancel 則顯示取消此回合；不顯示永久規則修改。2026-11-05 iPhone 實測三條流程成功，當次命令提供 accept／規則修改／cancel，沒有 decline，故沒有宣稱真實手機 decline 已測。

訊息顯示完整原始 JSON，沒有 Markdown 解譯；超長內容只提醒回電腦，不提供核准鍵。按鈕只含隨機短碼，伺服端驗證配對 user/chat、message ID、請求 hash、有效期及原工具狀態。點擊後先顯示收到決定，等原工具確認才顯示已交付；失效後移除按鈕，更新失敗也不接受舊操作。

單題可點選選項，或對該 bot 訊息使用 Telegram「回覆」輸入文字；文字仍受原問題選項／自由文字規則驗證。多題可回覆 JSON（題目 ID 對應答案字串陣列），全部有效才送出。手機單選已實測；自由文字、多題只經自動測試，尚待真機驗收。Codex 固定版本沒有多選旗標，不宣稱原生多選已支援。

interactive 訊息目前直接傳送，傳送失敗結束測試而不盲目重送核准；普通摘要通知仍使用 outbox 重試。callback 與訊息對應只留記憶體，重啟後舊請求失效；更新 offset 保存在本機。五分鐘測試期限到達就停止，不構成常駐服務。既有 webhook 不會被移除。

下列為早期通知模式說明；`--telegram` 是手機通知＋本機處理，`--remote` 才是手機回答。

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

2026-11-05 實測：專用 bot 的一次性私訊配對及本機綁定成功，Telegram API 接受測試訊息，使用者確認 iPhone 已看見。僅 1 次，未量測延遲；Android、真實錯誤帳號與解除綁定情境尚未測。配對維持啟用供後續工作使用。見 docs/evidence/telegram-iphone-pairing.json。

端到端測試：先 npm run build，再 npm run test:live:telegram（核准測試只回拒絕）；問題測試執行 node --env-file=.env scripts/live-codex.mjs question --telegram。通知發出後 Codex 保持等待，查看手機再於終端輸入 FINISH。這是本機回答，不是手機核准。需專用 bot，執行期間不可同時跑其他 Telegram 程序。摘要含單次事件至 API 接受耗時，不代表手機顯示延遲或 p95。

實測結果：2026-11-05 核准與問題兩條流程均通過；使用者逐筆確認 iPhone 收到新通知，本機處理後 Codex 繼續且核心 resolved。notificationAttempts 都是 1；API 接受耗時為 897 ms／851 ms，僅限這兩筆。證據不保存 bot 名稱、token、user/chat ID、原始對話或配對碼。
