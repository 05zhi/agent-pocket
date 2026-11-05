# 開發進度

## 目前範圍：只通知（2026-11-05，取代以下歷史規劃）

使用者要求恢復只有 Telegram 通知。serve 已改用摘要通知 channel，不讀取 Telegram updates；--remote 啟動立即拒絕。原始手機實作與驗收保留供歷史參考，不再作為執行入口。電腦終端顯示完整請求，以 /reply <id> <answer/action> 回答，原核心仍驗證一次性與有效期。Telegram 配對保留，舊未完成請求失效。

35 項測試、typecheck、build 通過。未再發送測試通知或要求手機操作。目前仍只監測 Agent Pocket 啟動的受管理工作；尚未接入 Codex 桌面 App 原生工作，不宣稱原生回答框同步已完成。

## 最新：常駐服務與手機文字／多題驗收（2026-11-05）

同一前景服務程序保持運作，完成自由文字、兩題 JSON 回覆、後續一般任務三個回合；最初一個提示未生成問題，已正常 interrupt。手機兩次答案均回到原 thread，原工具回覆對應內容，資料庫兩筆 input 均 resolved。使用者確認 iPhone 已回覆，訊息更新為已確認交付。

新增多題題數與編號格式，保留 JSON 相容；單選／自由文字按原問題限制驗證。使用者實測採 JSON，編號格式經自動測試。33 項測試通過。服務支援正常任務與 plan 模式切換、status、interrupt、quit；驗證後已正常退出並釋放 lock。啟動指南見 SERVICE.md。

仍待長時間負載、Windows 自啟動／秘密儲存、檔案與網路核准、Android 實測；不宣稱全功能正式版完成。

## 最新：Telegram 手機直接回覆 Codex（2026-11-05）

- iPhone 按允許一次：Codex 執行固定合成命令，輸出符合預期，原回合 completed，核心 resolved。
- iPhone 點 POCKET_BLUE：原 Codex 問題收到答案並完成，核心 resolved。
- iPhone 取消此回合：原回合 interrupted，核心 resolved 表示取消已交付，不代表工作正常完成。
- 使用者回報缺少拒絕鍵後查明原請求只有 accept、永久規則修改、cancel；新增取消鍵，未捏造 decline，也不提供永久規則修改。最初拒絕測試中止，不能算成功；修正後取消測試成功。
- 29 項自動測試通過。手機自由文字／多題與真實陌生帳號仍待驗證。所有新證據為合成資料，不包含 Telegram 身份或 token。
- 測試程序已結束；配對保留。尚無一般任務 daemon、檔案／網路權限完整支援、Android 真機驗證。

## Codex → Telegram → iPhone 真實端到端通過（2026-11-05）

完成核准等待與問題等待兩條真實流程：app-server request → CodexBridge → SQLite 原子 outbox → TelegramChannel → Telegram API 接受 → 使用者確認 iPhone 新通知 → 本機拒絕／回答 → Codex 原回合完成，核心 resolved。重複決定被阻擋；兩筆 notificationAttempts=1。

本機開始處理該請求至 API 接受：核准 897 ms、問題 851 ms。只有各一筆樣本，不是 p95，沒有量測手機顯示時間。24 項合約／整合測試通過。去識別證據：docs/evidence/codex-telegram-approval-evidence.json 與 codex-telegram-question-evidence.json。

配對保持啟用，測試工作已結束，沒有背景 daemon 留在執行。尚未包含手機核准／回答、Android、真實陌生帳號攻擊／撤銷／網路故障驗收，以及一般使用者任意任務的常駐整合。

## 最新驗證（2026-11-05）

Telegram token 已由使用者完成本機設定，取代先前格式錯誤紀錄。真實 private 配對成功，使用者確認親自送出一次性碼後完成本機綁定。API 接受測試通知，使用者確認 iPhone 實際看見。去識別證據存於 docs/evidence/telegram-iphone-pairing.json。

配對保持啟用；秘密、配對身份與 cursor 僅留本機，不提交 Git。這次是 1 筆測試通知，沒有延遲測量；Android、真實陌生帳號／撤銷及 Codex 到手機完整流程仍待驗證。上一程式版本 23 項測試與 CI 均通過。

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

## Codex → Telegram 端到端執行器
新增 --telegram 模式，沿用配對資料庫與單程序 lock，驗證 bot 身份後恢復舊請求，真實 Codex 請求經 bridge／SQLite outbox／Telegram channel。通知 API 接受後保持 Codex 等待，需本機 FINISH 才拒絕合成命令或回答合成問題。24 項測試通過；本部分先記錄程式，實機結果另記。

## Telegram 手機操作初版
新增原內容 hash 檢查、完整 JSON 預覽、不透明 callback token、身份／chat／message 綁定、單次核准／拒絕、選項及指定訊息文字回覆。長內容不顯示核准鍵，取消／過期後拒收。收到決定與原工具確認分開顯示，移除舊按鈕。--remote 執行器加入單一 long polling 與持久化 offset；真實驗證限固定合成命令，不擴大權限。27 項測試通過，手機實測結果另記。

## 手機取消選項修正
使用者回報只有允許按鈕；依 availableDecisions 新增取消此回合，bridge 拒收未提供的 decline。取消以 interrupted 確認。修正同回合多請求失效順序與解除配對後再配對不能復活舊按鈕；重複測試移到測試執行器。29 項測試通過。

## 一般任務前景常駐服務初版
新增 npm run serve -- --project <path>，固定版本 app-server、workspace-write sandbox、明確手機決定、連續任務／plan／status／interrupt／quit。輪詢與 outbox 持續運作，退出失效請求。未知協定中止回合，不自動核准；原始對話不保存至專案。31 項測試通過，真實多回合及手機文字驗收另記。不是 OS 開機服務。

## 手機多題輸入體驗
多題訊息附可複製 JSON 範本；缺題或格式不符不送出決定，僅對已配對帳號提示修正。終態訊息更新成功後清除記憶體中的內容與 callback 對應。32 項測試通過，含多題缺答拒收與完整回覆送出。

## 桌面全域通知 Hooks 第一部分

新增使用者全域 hooks 安裝器、PermissionRequest 與問題工具 PreToolUse 分類、非同步通知、遮罩資料、SQLite 去重與有界重試。保留原生電腦決定；沒有手機操作或自動核准。build、typecheck 與 41 項合約測試通過。安裝器檔案替換測試改在可寫工作區隔離目錄執行（Windows sandbox 暫存目錄不允許替換）。僅完成實作與合約驗證；真實桌面 Hooks 信任、事件觸發與 iPhone 顯示尚未驗收，詳見 DESKTOP-NOTIFICATIONS.md。

## 桌面全域通知安裝與診斷

第一部分 commit a96e433 已推送並核對遠端雜湊。已合併安裝兩個使用者全域 Hooks，未變更信任資料或核准政策。新增不含私人資料的 desktop-status 診斷命令，確認兩組設定存在；目前無桌面事件紀錄，等待使用者在 App 內 Review hooks／Settings > Hooks 信任啟用。修正無工具呼叫 ID 的事件不能依相同內容去重，避免重複命令的合法核准漏通知；6 項 Hooks 測試重跑通過。真實桌面核准、問題、iPhone 顯示與本機回答繼續仍待驗證，不能標記端到端通過。
