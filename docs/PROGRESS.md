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

## Codex 取消驗證（2026-11-05）
真實核准等待及問題等待皆收到 turn/interrupt acknowledgement 與 turn/completed interrupted，未送出任何決定。兩項通過。未測直接送舊回覆給 Codex 的行為；產品將由核心拒收舊回覆。

## M1 首個核准核心（2026-11-05）
實作 TypeScript contract、SQLite 請求與原子 outbox、身份及版本檢查、一次性決定、取消／過期／重啟失效與未知結果。CLI simulate 可重跑合成流程。8 項測試通過，包含 10 session／100 request 與雙 connection 競爭。詳見 M1-CORE.md。M1 尚未完成：問題輸入、完整 outbox worker／重試、audit 與 live adapter 串接待做。

## M1 問題回答
新增單選、多選、自由文字與多題完整驗證；問題與核准共用有效期、身份及一次性狀態，拒絕將核准動作套到問題。答案保持記憶體，不寫入 SQLite。10 項測試通過。

## M1 通知重試
新增 outbox lease、防舊 worker 回寫、逾時、指數退避與 jitter、retry-after、永久失敗及最多 5 次嘗試。只重送通知，不重送決定。13 項測試通過。通知 API 接受不等於手機已讀，網路未知結果可能產生重複通知。

## M1 稽核紀錄
SQLite trigger 在相同 transaction 記錄請求／通知狀態、配對與撤銷；僅保存內部 request ID、事件與時間，無 actor、原生 request ID、命令或答案。提供 30 天清除介面。15 項測試通過，並修正第 5 次通知成功後不得變成 failed 的邊界。

## M1 Codex bridge 串接
命令核准與阻塞問題已經過 SQLite 核心路由，保留 wire ID 型別、thread／turn／item／generation；重複、上游取消、競爭處理及斷線會失效舊請求。5 項真實流程重新驗證，19 項合約測試通過。核准核心為 resolved；問題模型收到答案但核心無足夠 item 證據，保守 outcome_unknown。該限制已記錄，並不宣稱完整 M3 adapter 或手機支援。M1 要求的問題驗證、可注入通知重試、狀態稽核與初步 Codex 串接已實作；產品 daemon／Telegram 與更完整交付對帳屬後續工作。

## 問題交付確認修正
固定版本下使用同 request 的 serverRequest/resolved，再要求同 turn 的 agentMessage item/started，確認阻塞問題已解除且生成繼續。不讀模型文字推論。清除、取消或其他 turn 不算交付。20 項測試及真實 question／cancel-question 通過；question coreState 已為 resolved。此結論限本專案獨占的受管理 stdio 連線。

## M2 Telegram 配對與通知初版
新增 Telegram API client（錯誤遮罩）、五分鐘一次性碼、private user/chat 綁定、本機 YES 確認、持久化 cursor、單程序 lock、解除配對及測試通知命令。通知 channel 已對接 M1 retry-after／重試語意，預設僅一般摘要。23 項測試通過。尚未完成 bot 配對或手機實測；目前本機 token 格式檢查未通過。沒有宣稱通知已送達手機。開發使用忽略追蹤的 .env，正式秘密儲存與常駐整合待做。
