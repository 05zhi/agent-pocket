# M1 首個核准核心

使用 Node 24.18.1 內建 node:sqlite，無額外資料庫套件。

Store 以 BEGIN IMMEDIATE 與條件 UPDATE 保證只有一筆決定勝出。請求與通知 outbox 同 transaction 建立；資料庫只保存識別、hash、狀態與決定，不存命令、prompt、答案或 token。

決定與送出前均檢查身份、session、generation、native request ID、version、hash、有效期及狀態。取消等待請求使其失效；取消已進入 delivering 的請求標為 outcome_unknown，不能宣稱原工具尚未執行。只有確認交付才 resolved。

程序重啟必須在接受工作前呼叫 recoverAfterRestart：無法恢復的等待請求取消，已開始交付標為未知，所有舊 session 停用。開啟另一條 DB connection 不會自動觸發恢復。

目前只提供可信本機程式呼叫的 library API；不是公開管理 API。pair 尚未實作 Telegram 配對流程。部署時仍需單一協調程序、秘密與檔案權限、DB migrations、retention、audit、問題輸入、outbox worker／重試與 live adapter 串接。outbox 的 markNotified 只能由未來通道在 API 確認接受後呼叫，不能用它表示手機已讀。

驗證包含十個 session／一百筆請求、雙 connection 競爭、重送、錯誤身份／內容、取消、過期、撤銷配對、重啟與未知結果。雙 connection 測試依序競爭同一列，尚非跨程序壓力測試。
