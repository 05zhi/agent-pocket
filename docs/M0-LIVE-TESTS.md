# M0 真實流程驗證

測試會使用已登入帳號的模型配額，不在 CI 自動執行。只傳送合成 prompt；工作目錄在忽略追蹤的 .cache。不要用此腳本處理正式工作。

```text
node scripts/live-codex.mjs approval
node scripts/live-codex.mjs approval-allow
node scripts/live-codex.mjs question
```

Codex 僅固定版本可執行。approval 回拒絕；approval-allow 只接受固定 PowerShell 路徑及固定輸出命令，其他內容一律拒絕。question 回覆合成答案 POCKET_BLUE。

成功必須同時觀測真實請求、送出回覆、工具／模型繼續與回合完成。單次允許另外要求命令成功及預期輸出。寫入 pipe 不等於成功。摘要保存在 .cache，沒有 token 或原始對話。

2026-11-05：Codex 三項通過。Claude 問題真實呼叫因未登入失敗，不能以 fixture 替代。尚未測手機、取消競爭及崩潰恢復。

Claude 已依使用者指示延後，以下僅保留未來恢復時的操作備註，目前不需登入。研究腳本需先重新安裝固定版本 SDK 才能執行。

Claude 登入（CMD，延後）：

```cmd
"node_modules\@anthropic-ai\claude-agent-sdk-win32-x64\claude.exe" auth login
```

PowerShell 在上述命令前加 `&`。登入由使用者在本機完成，不將憑證貼入聊天。

取消測試：node scripts/live-codex.mjs cancel-approval 與 cancel-question，兩者皆已通過。成功需觀測請求、interrupt 回應與 interrupted 終態。沒有把未回答當作允許，也不宣稱已驗證上游接受舊回覆的行為。

