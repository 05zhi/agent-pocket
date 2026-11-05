# 相容性與證據

查核日期：2026-11-05。所有正式支援目前均未驗證。

| 元件 | 版本／環境 | 證據 | 限制 |
| --- | --- | --- | --- |
| Node.js | Windows / 24.18.1 | 本機可執行 | 乾淨環境未測 |
| Codex | 0.166.0-alpha.5.1 | 本機產生 schema | alpha 版；真實核准／問題／取消未測 |
| Claude CLI | 未安裝於 PATH | 環境盤點 | 登入與模型權限未確認 |
| Claude Agent SDK | registry 查得 0.3.318 | 僅版本查詢 | 尚未安裝或固定依賴 |
| Telegram / iOS / Android | 未測 | 無 | 無手機展示 |

官方文件：[Codex app-server](https://learn.chatgpt.com/docs/app-server)、[Claude 使用者輸入](https://code.claude.com/docs/en/agent-sdk/user-input)。文件能力不能替代實機驗收。

Codex 需以 request ID 回覆雙向協定。Claude 的 canUseTool 可接核准與 AskUserQuestion，但既有權限規則可能先行處理。兩者皆須實測取消與中止。
