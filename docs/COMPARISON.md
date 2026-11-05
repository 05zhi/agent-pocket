# 初步方案比較

查核日期：2026-11-05。這是官方方案能力比較，不是完整市場調查或本機實測結果。

| 方案 | 官方能力／定位 | 本專案需要補的部分 |
| --- | --- | --- |
| Codex 原生 mobile | 官方提供手機存取 Codex 的路線 | 評估自建是否有必要；目前專注可測試的個人 Telegram 工作流程 |
| Telegram Bot API | 訊息及 bot 互動介面 | Codex request 關聯、身份驗證、生命週期及回覆交付 |
| ntfy | HTTP PUT／POST 發送通知，提供 action buttons | 工具協定、請求有效性與回答確認不能只靠通知通道 |
| Agent Pocket | 目前只有 Codex 本機真實雙向 spike | Telegram、持久化與可靠性仍待實作 |

來源：[Codex mobile](https://learn.chatgpt.com/docs/mobile)、[Telegram Bot API](https://core.telegram.org/bots/api)、[ntfy publishing](https://docs.ntfy.sh/publish/)。

決策：繼續驗證 Codex + Telegram 個人工具，展示重點為請求有效性與可驗證交付，不主張首創手機核准或已優於原生功能。原生 mobile 的本帳號可用性尚未實測。
