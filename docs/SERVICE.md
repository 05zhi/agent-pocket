# 一般任務前景常駐服務

完成本機 Telegram 配對後，在專案根目錄執行：

```powershell
npm run build
npm run serve -- --project "C:\path\to\your-project"
```

終端出現 SERVICE_READY 後輸入任務並按 Enter。服務使用同一 Codex thread 連續處理回合；每次只接受一個進行中任務，忙碌時拒收新任務。手機不能隨意發送新 shell 任務，只能回答已存在的請求。

| 指令 | 行為 |
| --- | --- |
| 任意任務文字 | 啟動一般模式回合 |
| `/plan 任務文字` | 啟動 plan 模式，支援結構化問題 |
| `/status` | 顯示 busy 與不含內容的統計 |
| `/interrupt` | 中止目前回合；服務繼續等待下一個任務 |
| `/quit` | 中止工作、失效舊請求、結束輪詢並釋放 lock |

多行初始任務可放本機文字檔，用 `--prompt-file <path>` 載入，加 `--plan` 選 plan 模式。後續終端每一行是一個任務。回到一般模式會明確重設 collaboration mode，避免承襲上一回合的 plan 模式。

服務採 Codex 0.166.0-alpha.5.1、workspace-write sandbox、on-request approval；不設定 bypass 或永久允許。一般任務可能依 Codex 既有政策在專案內操作，並非每個工具呼叫都會詢問。支援命令核准及 blocking question，尚未支援的 file/network/additional permission request 會拒絕並中止回合，需回原工具操作，不能當成完整 Codex 桌面附接功能。

Telegram 長輪詢、通知 outbox、有效期檢查及訊息狀態更新持續執行。回合完成後服務保持開啟；啟動時會使前次程序的舊請求失效。只有單一程序持有 `.cache/telegram.lock`，請勿同時跑另一個 pair/test/serve。秘密與資料庫留在 .env／.cache，不提交 Git；此版本尚未提供 OS 秘密儲存或 Windows 開機自啟動。

自由文字：對 bot 的問題訊息使用「回覆」，輸入答案。多題會在同一訊息標示題數，逐行填入：

```text
1: Taipei
2: JSON
```

也相容 `{"city":["Taipei"],"format":["JSON"]}` 格式。必須每題有效才送出；手機文字不會被當作 shell。真機多題驗證使用 JSON，編號格式另有自動測試。訊息變為「Codex 已確認交付」時，表示原請求解除等待並觀測到對應完成或同回合繼續事件，不表示整個專案完成。

2026-11-05：同一服務程序歷經 4 回合：1 個測試提示未產生結構化問題，手動中止；接著手機自由文字、手機兩題回答、一般文字任務共 3 回合完成。兩筆 input request 均 resolved。使用者確認 iPhone 操作，並看到交付狀態。測試後已 /quit，未留下背景服務。此為一般任務入口與多回合 smoke test，尚非長時間負載或自動重啟驗收。
