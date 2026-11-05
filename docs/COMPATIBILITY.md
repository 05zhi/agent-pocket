# 相容性與證據

查核日期：2026-11-05。所有正式支援目前均未驗證。

| 元件 | 版本／環境 | 證據 | 限制 |
| --- | --- | --- | --- |
| Node.js | Windows / 24.18.1 | 本機可執行 | 乾淨環境未測 |
| Codex | 0.166.0-alpha.5.1 | 真實拒絕、單次允許、問題回覆與等待中止通過 | alpha 版；上游舊回覆行為／手機未測 |
| Claude CLI | 未安裝於 PATH | 環境盤點 | 登入與模型權限未確認 |
| Claude Agent SDK | 曾測試 0.3.318；已移除目前依賴 | 真實呼叫曾回 Not logged in | 使用者決定延後，不需登入，不列目前驗收 |
| Telegram / iPhone | 2026-11-05 | 配對、通知、手機單次允許、單選回答與取消，原 Codex 工作確認交付 | 合成受管理工作；自由文字／多題／真實 decline 未測，未量測手機延遲 |
| Telegram / Android | 未測 | 無 | 不宣稱實測支援 |

官方文件：[Codex app-server](https://learn.chatgpt.com/docs/app-server)、[Claude 使用者輸入](https://code.claude.com/docs/en/agent-sdk/user-input)。文件能力不能替代實機驗收。

Codex 需以 request ID 回覆雙向協定。Claude 的 canUseTool 可接核准與 AskUserQuestion，但既有權限規則可能先行處理。兩者皆須實測取消與中止。
