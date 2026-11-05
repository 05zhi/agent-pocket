# M1 核心與 Codex bridge

使用 Node 24.18.1 內建 node:sqlite，無額外資料庫套件。

Store 以 BEGIN IMMEDIATE 與條件 UPDATE 保證只有一筆決定勝出。請求與通知 outbox 同 transaction 建立；資料庫只保存識別、hash、狀態與決定，不存命令、prompt、答案或 token。

決定與送出前均檢查身份、session、generation、native request ID、version、hash、有效期及狀態。取消等待請求使其失效；取消已進入 delivering 的請求標為 outcome_unknown，不能宣稱原工具尚未執行。只有確認交付才 resolved。

程序重啟必須在接受工作前呼叫 recoverAfterRestart：無法恢復的等待請求取消，已開始交付標為未知，所有舊 session 停用。開啟另一條 DB connection 不會自動觸發恢復。

目前提供可信本機 library API、doctor、simulate 與 opt-in 真實測試；不是公開管理 API。pair 尚未實作 Telegram 配對流程。部署時仍需單一協調程序、秘密與檔案權限、完整 schema migration 管理及產品 daemon。

問題驗證支援單選、多選、自由文字與多題全部有效才提交。Codex 固定版本的 question schema 不含多選旗標，bridge 只映射單選；自由文字依 isOther／無選項判定。secret 與非 blocking 問題不遠端代理。答案不落盤，重啟後不可重建回答。

notifyOnce 透過可注入的通道送通知，10 秒逾時、30 秒 lease、最多 5 次、指數退避與 jitter，尊重通道 retryAfterMs。傳送端需把 429／5xx 映射成 retry，永久錯誤映射 failed。lease token 阻擋舊 worker 回寫；崩潰後未知通知可重送，因此通知可能重複。取消後停止新領取，但已在網路中的通知無法收回；舊操作由核心狀態拒絕。尚無 Telegram channel。

稽核用 SQLite trigger 與狀態更新同交易寫入，只含內部 request ID、固定事件名、時間。pruneAudit 提供 30 天清除，需未來 daemon 定時呼叫；不是自動排程。無原始答案、命令或身份資料匯出。

CodexBridge 綁定 process generation、thread、turn、item 與保留型別的 wire ID。支援命令核准與阻塞問題；其他 request 由 transport 提示本機處理，不自動允許。回覆後保持 delivering，只有相同 item/completed 才 resolved，表示工具已解除等待，不等同命令成功。回合終止、上游競爭回答或 disconnect 使待處理失效；交付不明標 outcome_unknown。檔案／網路／額外權限核准屬 M3 待做，不能宣稱完整 adapter。

目前既有資料表以可重跑 ADD COLUMN 擴展，保留既有記錄；多程序同時初始化 schema 不在支援範圍。

真實 question 回覆已觀測模型收到合成答案，但這個版本的事件序列沒有提供 bridge 可使用的相同 item 完成證據；核心保守保持 outcome_unknown。serverRequest/resolved 單獨不能證明是哪一方的答案被採用，因此不用它把 delivering 標為 resolved。這是目前交付確認的限制，後續 M3 需要更完整的對帳，不能以模型文字通用判定成功。

驗證包含十個 session／一百筆請求、雙 connection 競爭、重送、錯誤身份／內容、取消、過期、撤銷配對、重啟與未知結果。雙 connection 測試依序競爭同一列，尚非跨程序壓力測試。

更新：上述 question 未知限制已在固定版本受管理連線解決。serverRequest/resolved 加同 turn 後續 agentMessage item/started 才確認；單獨清除事件仍不算成功。若在繼續生成前取消或斷線，保持未知。驗證不依賴模型文字，且不支援其他客戶端共用／附接同一工作。
