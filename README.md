# Agent Pocket

AI 工作的手機通知與人工回覆中心，規劃整合 Codex、Claude Code 與 Telegram。

目前為 **M0 開發起步**，只有環境診斷與 Codex schema 探測；尚不能傳送通知或從手機核准。

## 開發

使用 Node.js 24.18.1、npm 11.16.0。

```powershell
npm ci
npm run typecheck
npm run build
npm test
npm run doctor
npm run probe:codex
```

probe 固定本機 Codex 0.166.0-alpha.5.1；只產生協定，不呼叫模型。其他版本會明確失敗。

計畫：[docs/PROJECT_PLAN.zh-TW.md](docs/PROJECT_PLAN.zh-TW.md)
進度：[docs/PROGRESS.md](docs/PROGRESS.md)
相容性：[docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)

尚未完成：雙工具真實核准／問題 spike、SQLite 核心、Telegram 配對、重試、Windows 安裝與手機實測。
