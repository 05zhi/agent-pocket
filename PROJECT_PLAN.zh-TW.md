# Agent Pocket：AI 工作手機通知與人工回覆中心

> 計畫版本：1.0｜日期：2026-11-05
> 狀態：開發計畫；尚未代表程式已完成或 GitHub repo 已建立。
> 主要支援：Codex、Claude Code。電腦端優先 Windows；手機端以 Telegram 支援 iOS／Android。

## 1. 專案目標

使用者讓 AI 在電腦執行工作後離開座位，常不知道 AI 已停下來等待核准、選擇或文字回答。本專案在需要人介入時把事件送到手機，讓使用者看清楚操作內容並回覆，再確認原工作已收到決定。

產品定位：跨 AI 工具的人工介入收件匣。第一版為個人使用、自行執行的開源工具，不提供多人 SaaS。

核心承諾：

1. 分辨「仍在執行」「需要核准」「需要回答」「回合完成」「失敗」「電腦離線」。
2. 每筆通知清楚標示工具、電腦、專案、工作與原因。
3. 支援允許一次、拒絕、選項及文字回答；只呈現原工具實際允許的操作。
4. 手機回覆只能作用於原本那一筆仍有效的請求。
5. 網路中斷、程序重啟或競爭回答時，不誤報已核准或已恢復工作。

不把模型寫出的「我需要你確認」當成可靠權限事件，也不要求模型記得呼叫通知工具。

## 2. 使用情境與成功指標

### 2.1 主要情境

- 使用者搭車時，Codex 需要批准執行命令；手機查看命令、工作目錄與原因，選擇允許一次。
- Claude Code 詢問資料庫或匯出格式；手機選取選項或輸入答案，對應工作繼續。
- 同時執行三個專案；手機收件匣只突出仍待處理的項目。
- 使用者已在電腦回答，稍後點手機舊按鈕；系統提示已處理，不再次送出。
- 電腦休眠或網路中斷；手機顯示離線，尚未送達原工具的回答不顯示為成功。

### 2.2 可量測目標

以下為待驗證的產品目標，不是既有測試結果：

| 指標 | v1 目標 | 測量方式 |
| --- | --- | --- |
| 事件到 Telegram API 接受 | 正常網路下 p95 小於 3 秒 | 記錄產生、入列、送出、API 回應時間 |
| 手機實際顯示時間 | 記錄中位數與 p95，不承諾固定秒數 | iOS／Android 真機各 30 次人工計時 |
| 重複核准 | 測試情境中 0 次 | 重送、雙擊、併發及斷線測試 |
| 過期請求被執行 | 0 次 | 取消、失效與程序重啟測試 |
| 跨工作錯誤路由 | 0 次 | 同時至少 10 個工作、100 筆模擬請求 |
| 安裝體驗 | 有先備工具者 15 分鐘完成測試通知 | 從乾淨設定依 README 操作 |

推播受網路、通知權限、省電、勿擾模式及服務狀況影響；Telegram 接受訊息不等於手機已顯示或使用者已讀。

## 3. 既有方案與差異

Codex 已有原生手機操作方式，包含查看進度、核准與指示；可用性受帳號推出進度與工作區設定影響。[來源 S1]

ntfy 提供 HTTP 發送通知；Telegram Bot API 提供訊息、按鈕與回覆接收機制。[來源 S5、S6]

因此不主張「首個 AI 手機通知工具」。本專案的可展示差異是：

- Codex 與 Claude Code 共用一致的待處理收件匣。
- 明確區分通知已送出、回答已收到、原工具已接受。
- 用請求版本、工作生命週期和一次性決定避免核准錯誤操作。
- 可測試的斷線恢復、去重、競爭回答與相容性矩陣。
- 個人部署，模型帳號憑證留在電腦；支援減少通知內容外流的模式。

正式開發 M0 仍需盤點當時同類專案與原生功能，更新比較表；不把此處列出的工具當作完整市場調查。

## 4. 支援範圍與必要限制

### 4.1 兩種整合模式

**受管理模式：v1 的完整支援路線。**

使用者由本專案 CLI 啟動工作，電腦端持有該工作的官方協定連線。Codex 使用 app-server；Claude Code 使用 Agent SDK。這使程式能接收結構化事件、呈現問題並交回答案。

CLI 指令的產品草案：

```text
agent-pocket setup
agent-pocket doctor
agent-pocket run codex --project <path>
agent-pocket run claude --project <path>
agent-pocket status
agent-pocket stop <session-id>
```

以上為本專案預計提供的介面，不是現有官方指令。

**既有工作整合：依能力提供，不與受管理模式混為一談。**

Claude Code 的既有工作可透過 hooks 接入通知；手機核准需另外驗證該啟動模式、hook 期限與競爭處理。Codex 已在桌面 App／CLI 啟動的工作，是否可透過正式介面附接及回覆，列為研究項目；沒有證實前不宣稱完整支援。

| 場景 | 通知 | 手機核准／回答 | v1 定位 |
| --- | --- | --- | --- |
| 本專案啟動的 Codex app-server 工作 | 目標支援 | 依協定能力支援 | 核心 |
| 本專案啟動的 Claude Agent SDK 工作 | 目標支援 | 核准及 AskUserQuestion | 核心 |
| 既有 Claude Code hooks 工作 | 先支援明確事件 | 分模式驗證，必要時回原工具處理 | 擴充 |
| 既有 Codex 原生桌面／CLI 工作 | 需官方接點驗證 | 不預先承諾 | 研究 |
| 任意 AI 網頁或沒有事件介面的工具 | 不保證 | 不支援 | 不在 v1 |

### 4.2 不做的功能

- 不以 OCR、截圖或模擬鍵盤作主要核准介面。
- 不自動批准全部權限，不繞過組織政策或原工具的拒絕規則。
- 不提供通用手機遠端 shell；手機文字只回答指定問題或送入明確工作。
- 不在第一版開發原生 iOS／Android App、多人管理、計費及 Slack／LINE 等多通道。
- 不把回合結束推論成整個專案完成；使用「本回合完成」等準確文字。
- 密碼、登入驗證、付款及不能安全代理的互動，引導回原工具完成。

## 5. 官方整合策略

### 5.1 Codex adapter

官方 app-server 提供雙向協定、核准請求與使用者輸入機制；型別可從安裝版本產生。部分輸入及傳輸能力具有實驗性，必須固定版本驗證。[來源 S2]

實作設計：

1. 以子程序的 stdio 連接，避免直接公開 app-server 到網際網路。
2. 保留原始 request ID、thread、turn 與 item 關聯；不得把一般 notification 當成待回答 request。
3. 分開處理命令、檔案變更、網路／檔案系統權限與問題輸入。
4. 允許選項以該版本 schema 與實際請求為準；預設只提供單次決定。
5. 收到原工具已處理、取消或回合終止的事件，即使手機尚未回答也要撤銷請求。
6. 產生並檢查版本對應 schema；文件中的輸入方法名稱有差異時，以固定版本產物與整合測試確認，不憑標題手寫猜測。
7. 未知 request 不自動批准；記錄不含敏感內容的診斷並提示本機處理。

### 5.2 Claude Code adapter

Agent SDK 的 `canUseTool` 可處理權限和 `AskUserQuestion`，讓程式等待使用者決定後返回結果。[來源 S3]

實作設計：

1. 受管理模式由 SDK 啟動並保存 session 關聯。
2. 工具核准保留原輸入，拒絕時提供使用者選填原因。
3. 問題保留原 question ID、文字、選項與單選／多選限制；文字答案經長度及格式驗證。
4. 中止、callback 失效與工作結束時取消相應請求。
5. 原權限規則可能讓工具不觸發人工詢問；產品不能假設每次工具呼叫都有通知。
6. SDK 的登入方式、可用帳號及費用，於 M0 依當時官方要求驗證，不假設訂閱必然可供任何整合使用。

既有工作 hooks 擴充採 `Notification` 作提醒來源。`PermissionRequest` 可處理核准，但不是所有提示都走同一事件，須依官方說明測試覆蓋範圍與 timeout。[來源 S4]

不要把 `idle_prompt` 一律標示為待回答；也不要把正常回合結束通知等同需要核准。

### 5.3 能力探測

每個 adapter 回報 `supportsApproval`、`supportsQuestions`、`supportsCancel`、`supportsReconcile` 及版本。UI 依能力顯示按鈕。相容性文件記錄「已實測／未驗證／不支援」，不只列最低版本。

## 6. 功能規格

### F1 配對與設定

- 安裝後執行 setup，檢查工具版本、登入狀態與作業系統。
- 使用者自行建立 Telegram bot，token 留在本機秘密儲存區，不進 Git。
- 本機產生短效一次性配對碼；使用者在 bot 私訊輸入後，本機確認綁定。
- 同時鎖定 Telegram user ID 與 private chat ID；不開放群組核准。
- 提供測試通知、解除綁定、token 更換及 doctor 診斷。

### F2 收件匣與通知

- 事件種類：approval_required、input_required、turn_completed、session_failed、host_offline。
- 顯示專案別名、工具、工作簡稱、問題摘要與等待時間。
- 核准提示必須能查看完整命令及工作目錄；檔案變更提供完整差異入口或本機處理。
- 過長內容分頁；不能只憑截斷內容顯示允許按鈕。
- 敏感模式只推送「某專案需要處理」，不外送完整命令；無安全詳情介面時只能回本機處理。
- 已處理訊息更新狀態並移除操作按鈕；更新失敗仍由伺服端狀態阻擋舊操作。

### F3 核准

- 預設允許一次／拒絕；不提供永久放行。
- 使用者看見的操作內容必須與執行請求的版本一致。
- 在送回原工具前重新檢查有效期、session、程序世代、請求雜湊與允許選項。
- 先顯示「已收到決定」，原工具確認後才顯示「已交付」或「工作已繼續」。
- 無法確認結果時顯示未知，不透過重跑命令猜測執行結果。

### F4 回答問題

- 支援單選、多選及自由文字，保留原始語意。
- 自由文字必須回覆指定訊息或使用明確請求編號，不把最新訊息猜作任一工作的答案。
- 多題全部有效才送出；允許送出前修改。
- 取消不等於選第一個選項；空答案不當成核准。
- 問題已被原工具撤銷時，拒收並通知使用者。

### F5 通知策略

- 需要人介入優先通知；進度更新預設不通知。
- 同一請求去重；可設等待 5 分鐘後提醒一次。
- 完成／失敗通知可分別開關，支援安靜時段。
- 區分正常進行、等待人及未知狀態；單純長時間無輸出不判定卡死。
- 網路錯誤採指數退避與 jitter；處理 Telegram 限流及永久失敗。

### F6 診斷與資料管理

- 本機顯示活躍工作、待處理請求、最近送達錯誤及版本。
- 結構化日誌預設不記完整 prompt、命令參數、token 或答案。
- 可匯出去識別診斷包；匯出前檢視內容。
- 預設事件中繼資料保留 30 天，可清除；敏感原文盡量只留記憶體。
- 明確說明 Telegram 會接收所發送內容，不能宣稱端到端加密或完全不經第三方。

## 7. 系統架構與技術選擇

```text
Codex app-server ── Codex adapter ──┐
                                  ├─ Event core ─ SQLite/outbox ─ Telegram Bot API
Claude Agent SDK ─ Claude adapter ─┘       ↑                             ↕
                                        Decision router              手機 Telegram
```

v1 選擇 TypeScript、Node.js 當時仍受支援的 LTS、SQLite 與 Telegram Bot API。以 lockfile 固定套件；不在計畫預設未驗證的版本號。

- TypeScript：協定型別、兩個 adapter、CLI 與 bot 共用語言。
- SQLite：個人單主機的狀態及 outbox，避免第一版架設資料庫服務。
- Telegram long polling：電腦主動連線接收回覆，不要求開放家用路由器入站連接埠。
- 一個 bot token 只由一個協調程序消費 updates；第一版一個主機，可管理多個工作。
- 多電腦需中央協調者或每機不同 bot，列入 v1.1，不讓多主機爭搶同一 polling stream。
- 不以 LLM 判定是否核准或決定路由，因此核心通知服務不需要額外模型推論。

電腦休眠後本機程式也不能運作。真正的離線通知需要第二個常駐節點監測心跳；v1 只顯示最後連線資訊，不能宣稱離線主機能自行通知手機。v1.1 才新增可選 relay 與心跳監測。

## 8. 資料模型與一致性

| 資料 | 核心欄位 |
| --- | --- |
| hosts | id、alias、last_seen_at、version |
| sessions | id、provider、native_session_id、generation、project_alias、status |
| requests | id、session_id、native_request_id、kind、version、payload_hash、state、expires_at |
| deliveries | id、request_id、channel、message_id、attempts、next_retry_at、status |
| decisions | id、request_id、actor_id、action、answer_ref、created_at、delivery_state |
| audit_events | id、request_id、event_type、timestamp、redacted_metadata |
| pairings | allowed_user_id、allowed_chat_id、revoked_at |

資料表不存模型登入 token；Telegram token 使用作業系統秘密儲存機制，開發環境才允許本機未追蹤的環境設定檔。

請求狀態：

```text
pending → decision_received → delivering → resolved
   ├→ expired
   ├→ cancelled
   └→ superseded
delivering → outcome_unknown（連線中斷且無法確認）
```

- 以 transaction／compare-and-set 讓同一請求只有一個決定勝出。
- Telegram update ID、callback ID 及內部 request ID 分別去重。
- callback data 只放不透明短 ID，不把命令或憑證放入按鈕資料。
- 使用者身份、配對狀態與請求狀態皆在服務端驗證。
- 只允許安全重送通知；送回原工具的決定不得盲目重送。
- SQLite 保存請求不等於保存活的 SDK callback／協定連線。
- 重啟後先對帳；不能驗證原請求仍存在就標記失效或未知，要求重新產生請求。
- 不承諾跨程序崩潰的端到端 exactly-once；驗收重點是重複決定不導致重複操作。

## 9. 安全與操作邊界

核准本身能觸發真實電腦操作，因此以下是功能必要條件：

1. 核准綁定原請求與內容，不能把手機任意文字當 shell 執行。
2. 本機入口只接 loopback 或 stdio；不公開未驗證的管理埠。
3. token、chat 配對、日誌與資料庫採最小檔案權限。
4. 預覽資訊中的 Markdown／控制字元需處理，避免工具輸出偽裝成按鈕或系統訊息。
5. 對外分享的截圖、fixtures、錄影全部使用合成專案與假憑證。
6. 撤銷手機配對後，舊訊息按鈕立即失效。
7. 原工具拒絕、組織政策與使用者明確取消永遠優先。
8. 超時預設不核准；不能把「使用者沒有回答」當允許。

## 10. 開發里程碑與時間

估算對象：一位熟悉 TypeScript 的開發者，使用 AI 協作；包含測試、文件與實機驗證。不含等待外部帳號開通，初學者可能增加 50–100%。

| 階段 | 交付內容 | 驗收門檻 | 工時 |
| --- | --- | --- | --- |
| M0 可行性與 repo | 建 repo、固定版本、兩工具最小 spike、比較表 | 兩工具各觸發一筆核准和問題，確認可回答 | 16–24 h |
| M1 核心與模擬器 | adapter contract、狀態機、SQLite、outbox、CLI | 模擬重複、撤銷、過期與競爭皆正確 | 24–36 h |
| M2 手機通知 | 配對、Telegram polling、通知、重試、去重 | 真機收通知，未配對使用者不能操作 | 16–24 h |
| M3 Codex 整合 | 啟動工作、事件解析、核准、問題回覆 | 真實工作由手機回答後繼續；取消失效 | 24–40 h |
| M4 Claude 整合 | SDK callback、AskUserQuestion、取消 | 核准／拒絕／單選／多選／文字均驗證 | 24–40 h |
| M5 可靠性 | 崩潰恢復、對帳、限流、雙答、診斷 | 故障矩陣通過，不誤報成功 | 24–40 h |
| M6 發布與作品展示 | Windows 安裝、文件、CI、錄影、版本相容表 | 乾淨環境依文件完成雙工具展示 | 16–24 h |
| 合計 | 可展示 v1 | 兩工具受管理模式完整流程 | 144–228 h |

每週投入 15 小時約 10–16 週；每週 30 小時約 5–8 週。原型約 20–40 小時可驗證一工具通知及回答，但不等於可靠的雙工具產品。

M0 必須先驗證最難的雙向介面，再做 UI。如果某工具的指定版本不能安全回答，記錄阻礙並調整相容版本／模式；不得默默把完整支援降成只通知後宣稱完成。

## 11. 測試與驗收

### 11.1 單元與合約測試

- 狀態轉移、身份驗證、有效期、請求內容版本、一次性決定。
- Codex 固定版本 schema 與去識別事件 fixtures。
- Claude SDK 核准及問題輸入輸出格式。
- 未知事件、欄位缺漏、超長字串、特殊字元與多語文字。
- 敏感資訊不出現在日誌與診斷包。

### 11.2 整合與故障測試

| 情境 | 預期結果 |
| --- | --- |
| 同一按鈕連點／Telegram 重送 | 只接受一個決定 |
| 本機與手機同時回答 | 原工具已處理者優先，另一方顯示已失效 |
| 使用者回答前取消工作 | 舊按鈕無法恢復或執行工作 |
| 送通知前崩潰 | outbox 恢復後補送有效請求 |
| 原工具收到答案但 bridge 未收到確認 | 顯示未知並對帳，不再次執行 |
| 電腦重新啟動 | 舊 callback 不被誤認為可恢復 |
| 429／5xx／網路逾時 | 有界重試、退避與可見錯誤 |
| 不同 Telegram 帳號按按鈕 | 拒絕且不洩漏完整請求 |
| 同時十個工作 | 答案不跨 session 路由 |
| 工具正常結束回合 | 不誤報專案全部完成 |

### 11.3 真機展示

兩工具各錄製：提出工作 → 需要核准 → 手機通知 → 查看操作 → 核准／回答 → 原工作繼續。另錄製拒絕及舊按鈕失效案例。

沒有 iPhone 或 Android 實機驗證的那一端必須標示未驗證，不可只因 Telegram 支援該平台就宣稱測試通過。

## 12. 建議 repository 結構

```text
agent-pocket/
  apps/cli/
  packages/core/
  packages/adapter-codex/
  packages/adapter-claude/
  packages/channel-telegram/
  packages/storage/
  tests/contracts/
  tests/integration/
  tests/fixtures/
  docs/PROJECT_PLAN.zh-TW.md
  docs/PROGRESS.md
  docs/COMPATIBILITY.md
  docs/SECURITY.md
  docs/adr/
  .github/workflows/ci.yml
  AGENTS.md
  README.md
  .env.example
  .gitignore
```

CI 階段執行 lint、typecheck、單元／合約測試與 build；整合測試優先使用模擬器。需要真實帳號與模型費用的測試由開發者明確執行，不將登入憑證寫入 repo。

## 13. GitHub 建立、commit 與自動 push 規則

本節是後續執行此計畫時必須遵守的工作規範；此次文件交付不等於已執行以下動作。

### 13.1 建立 repo

1. 開發開始即在使用者已登入的 GitHub 帳號建立獨立 repo，建議名稱 `agent-pocket`，預設 private。
2. 先檢查帳號、同名 repo、目前目錄與既有 remote；不得將其他專案推到此 repo。
3. 使用獨立專案目錄，主分支 `main`；同名已存在時確認是否屬於本專案，不覆蓋。
4. 首次建立 README、計畫書、AGENTS.md、PROGRESS.md、.gitignore 與 .env.example。
5. 記錄實際 repo URL。只有建立成功並驗證遠端後才能回報已建立。
6. 公開展示前再檢查授權、第三方來源及敏感內容；不自動把 private 改成 public。

### 13.2 每完成一個部分就 commit 並自動 push

「部分」指可獨立驗證的功能、修復、合約測試或文件交付；一個里程碑通常有數個部分，不等整個里程碑結束才存檔。

每個部分遵循：

```text
讀取目前狀態 → 實作一個部分 → 執行相應檢查
→ 更新進度 → 檢查 diff 與敏感資料 → 明確 stage
→ commit → 自動 push → 驗證遠端 commit → 繼續下一部分
```

- 使用者已要求在本專案每部分完成後自動 push；一般 commit／push 不需反覆詢問。
- 這項授權只涵蓋本 repo 的開發同步，不延伸成產品自動批准任意操作。
- 使用 Conventional Commits，例如 `feat(codex): route approval requests to mobile`。
- 每次開始前查看 `git status`，保留使用者已有修改；stage 明確路徑，不盲目加入全部檔案。
- commit 前檢查 staged diff、密鑰、個資與真實聊天內容。
- 不提交 token、.env、SQLite 使用者資料、原始 session transcript、私人程式碼及大檔錄影。
- 每次 commit 對應完成的邏輯單位；驗證失敗先修復，不宣稱該部分完成。
- 更新 PROGRESS.md：完成內容、測試結果、限制、下一步；commit hash 可於 push 驗證紀錄或後續進度中記載，避免自我引用。
- push 使用追蹤分支；禁止 force push、覆寫歷史或刪除遠端分支。
- 遠端有新提交時先 fetch、理解差異，整合後重新驗證再 push；不覆蓋未知修改。
- 網路／認證／保護規則導致 push 失敗時保留本機 commit，記錄「尚未同步」；不得回報已推送。
- push 成功後比對本機 HEAD 與遠端分支 hash；若有 CI，再回報 CI 實際狀態。
- 不因推送失敗而丟棄工作；需要登入或權限時說明具體阻礙。

### 13.3 AGENTS.md 應寫入的核心規則

```text
依 docs/PROJECT_PLAN.zh-TW.md 分段實作。
每個可驗證部分完成後，執行相應檢查、更新進度、commit 並自動 push。
不得把未測試或只通知的 adapter 宣稱為完整遠端核准支援。
不得自動擴大 AI 權限，或把超時／未回答視為核准。
不得推送秘密、真實聊天、使用者資料庫或未授權的其他專案檔案。
不得 force push、丟棄使用者修改或覆寫未知遠端提交。
回報實際完成、測試、commit、push 與未解決限制。
```

## 14. v1.1 與後續擴充

- Claude Code 既有工作 hooks 的可靠通知與可驗證核准橋接。
- Codex 既有工作官方附接方式研究；有確定能力才加入支援表。
- 多電腦 relay、主機心跳與離線通知；設備分別配對及撤銷。
- 手機 Web 收件匣與安全詳情頁；認證、CSRF、session 有效期需獨立設計。
- ntfy 通知通道；依 iOS／Android 各自能力驗證，不假設按鈕完全一致。
- macOS／Linux 支援與服務管理；Windows 自動啟動／休眠提示。
- 團隊 RBAC、核准責任分派與組織稽核另立版本，不塞入個人 MVP。

## 15. 作品集交付標準

README 應提供問題背景、實際支援矩陣、兩工具展示、安裝方式、架構、測試結果、限制與後續方向。

履歷敘述範本（完成並量測後才填數字）：

> 開發支援 Codex 與 Claude Code 的手機人工介入中心，以 TypeScript、SQLite 與 Telegram 整合權限核准和問題回覆；實作請求生命週期、去重與故障恢復，並以併發及失效請求測試驗證操作不被重複套用。

最重要的展示不是通知截圖，而是正常流程、拒絕流程、過期操作及斷線情境都能解釋清楚並重現。

## 16. 官方參考與待驗證事項

查閱日期：2026-11-05。實作前重新確認文件與版本，本文的架構、估時及驗收門檻為專案設計，非官方保證。

- S1：[Codex on mobile](https://learn.chatgpt.com/docs/mobile)
- S2：[Codex App Server](https://learn.chatgpt.com/docs/app-server)
- S3：[Claude Agent SDK：Handle approvals and user input](https://code.claude.com/docs/en/agent-sdk/user-input)
- S4：[Claude Code hooks reference](https://code.claude.com/docs/en/hooks)
- S5：[Telegram Bot API](https://core.telegram.org/bots/api)
- S6：[ntfy：Sending messages](https://docs.ntfy.sh/publish/)

M0 待驗證：Windows 上兩種受管理模式、帳號登入與費用條件、Codex 輸入事件實際 schema、原工具取消通知、Claude callback 結束行為、各模式期限、兩種手機的推播表現。結果寫入 COMPATIBILITY.md，不能僅憑文件存在就當成實作已通過。
