# 開發進度

2026-11-05：開始 M0，尚未通過 M0 驗收。

- 已建立獨立 private repo：https://github.com/05zhi/agent-pocket
- 建立 TypeScript CLI、環境診斷、版本固定的 Codex schema 探測及合約檢查。
- 保留原始計畫書，docs 內為開發參照副本。
- 尚未啟動真實模型工作，未使用 Telegram token 或發送訊息。
- 驗證：typecheck、build、2 項 CLI 合約測試及 Codex schema probe 通過。schema 包含命令核准、檔案核准、權限核准與使用者輸入 request。
- ServerRequest schema SHA-256：f339be472737a0003efa25fba2e6e6c9237e621cd065b6d6995c51256e9dc1fb。

下一步：Codex stdio initialize／request 回覆 spike、安裝並固定 Claude SDK、驗證雙工具核准和問題回覆。M0 通過後才擴展產品流程。
