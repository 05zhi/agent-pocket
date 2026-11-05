# ADR 0001：目前只實作 Codex

日期：2026-11-05。狀態：依使用者明確指示採用。

使用者要求「先不做 claude，做 codex 就好」。本決策優先於原計畫的雙工具里程碑；原計畫保留作為長期方向。

目前只開發由 Agent Pocket 啟動的 Codex app-server 受管理工作，以及後續 Telegram 通道。既有桌面工作附接仍不承諾支援。

Codex M0 的核心門檻為真實 requestApproval 與 requestUserInput 各至少一筆、回覆正確 request ID，並觀測原工作繼續。已通過拒絕、單次允許與問題回覆。這不是手機端驗收，也不代表原始雙工具 M0 完成。

Claude SDK 從目前安裝依賴移除；保留研究腳本與歷史失敗紀錄，不執行、不要求登入。若未來恢復，需重新固定版本及真實驗證。

M1–M3 以 Codex 為範圍，保留中立的 adapter contract；M4 Claude 延後。M5 可靠性與 M6 發布門檻仍適用 Codex，不因縮減工具數量而省略身份、去重、取消及未知結果處理。
