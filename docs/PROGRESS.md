# 開發進度

## 目前狀態（以此節為準）

2026-11-05 使用者改為只做 Codex，Claude 延後，取消其登入需求。Codex M0 核心雙向流程驗收通過；不代表手機產品或完整 adapter 已完成。原雙工具 M0 不宣稱完成。

- 已有真實拒絕、單次允許、問題回覆證據，見 docs/evidence。
- 已移除 Claude SDK 的目前依賴，保留研究腳本供未來恢復；不再要求 Claude 帳號。
- 已補初步方案比較與 Codex-first 範圍決策。
- 下一部分為 Codex 的取消／中止觀測，再建立 M1 狀態機、SQLite、outbox 與模擬器；Telegram 在 M2。
- 以下保留歷史紀錄，當時的 Claude 阻礙及雙工具下一步已被本節取代。

2026-11-05：開始 M0，尚未通過 M0 驗收。

- 已建立獨立 private repo：https://github.com/05zhi/agent-pocket
- 建立 TypeScript CLI、環境診斷、版本固定的 Codex schema 探測及合約檢查。
- 保留原始計畫書，docs 內為開發參照副本。
- 尚未啟動真實模型工作，未使用 Telegram token 或發送訊息。
- 驗證：typecheck、build、2 項 CLI 合約測試及 Codex schema probe 通過。schema 包含命令核准、檔案核准、權限核准與使用者輸入 request。
- ServerRequest schema SHA-256：f339be472737a0003efa25fba2e6e6c9237e621cd065b6d6995c51256e9dc1fb。

下一步：Codex stdio initialize／request 回覆 spike、安裝並固定 Claude SDK、驗證雙工具核准和問題回覆。M0 通過後才擴展產品流程。

## M0 第二部分：Codex 真實回覆（2026-11-05）

- 真實 app-server：initialize → thread/start → turn/start → server request → 原 request ID 回覆 → turn/completed。
- 核准拒絕：收到 requestApproval，回 decline，模型繼續且回合完成。
- 單次允許：完整比對固定 PowerShell 路徑及固定 Write-Output 命令，回 accept；觀測 commandExecution exitCode=0 與指定輸出，回合完成。
- 問題：plan mode 收到 requestUserInput，以 question ID 回 POCKET_BLUE；模型最終訊息包含該答案，回合完成。
- 僅提交不含 session ID、路徑與原始對話的證據摘要。原始對話不保存至 repo。
- 尚未驗證取消競爭、重啟恢復、手機通道；不得宣稱完整 adapter 已完成。

## Claude 現況

- SDK 已固定 0.3.318；Windows binary 已安裝，npm audit 0 vulnerabilities。
- auth status 為 loggedIn=false；真實 SDK question 呼叫回報 Not logged in。登入是目前阻礙，未通過 Claude 真實流程。
- 已準備 opt-in 腳本；成功驗收前保持 M0 未完成。
