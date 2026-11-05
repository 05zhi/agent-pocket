# Agent Pocket

AI 工作的手機通知與人工回覆中心，目前專注 Codex 與 Telegram；Claude 延後。

目前已通過 **Codex M0 核心雙向流程驗證**：真實拒絕、單次允許與問題回覆。尚不能傳送通知或從手機核准，產品 adapter 尚未完成。

## 開發

使用 Node.js 24.18.1、npm 11.16.0。

```powershell
npm ci
npm run typecheck
npm run build
npm test
npm run doctor
npm run simulate
npm run probe:codex
```

probe 固定本機 Codex 0.166.0-alpha.5.1；只產生協定，不呼叫模型。其他版本會明確失敗。

計畫：[docs/PROJECT_PLAN.zh-TW.md](docs/PROJECT_PLAN.zh-TW.md)
進度：[docs/PROGRESS.md](docs/PROGRESS.md)
相容性：[docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)

驗證方式與證據：[M0 真實測試](docs/M0-LIVE-TESTS.md)。目前範圍：[範圍決策](docs/adr/0001-codex-first.md)。

尚未完成：核心與 Codex adapter 串接、Telegram 配對、通知重試、Windows 安裝與手機實測。Claude 不再是目前里程碑的阻礙。

M1 已有首個核准核心：SQLite 原子入列、身份與請求綁定、一次性決定、取消／過期、重啟失效及未知結果處理。`npm run simulate` 展示合成流程，不啟動模型或發送通知。完整產品串接、問題回答與 outbox 重試仍未完成。
