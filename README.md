# Agent Pocket

在 Windows 的 Codex 桌面 App 出現需要你回答的問題框時，透過 Telegram 提醒你回電腦作答。Telegram 訊息只有提醒和聊天室短碼。一般新訊息、工作完成與自動審查不會發通知。**桌面 App 的人工核准提醒目前暫停**，因為現有事件無法可靠區分自動審查與等待人工核准。

## 1. 下載

[下載 Agent Pocket 原始碼 ZIP](https://github.com/05zhi/agent-pocket/archive/refs/heads/main.zip)。解壓縮到固定資料夾，開啟 PowerShell 並進入含 `package.json` 的資料夾。

也可以用 Git 下載，方便日後更新。

```powershell
git clone https://github.com/05zhi/agent-pocket.git
Set-Location agent-pocket
```

## 2. 安裝

先安裝並登入 Codex 桌面 App，準備 Telegram 帳號，並安裝 [Node.js 24.x](https://nodejs.org/en/download)（至少 24.18.1，包含 npm）。以下命令都在 Agent Pocket 資料夾執行。

```powershell
node --version
npm.cmd ci
npm.cmd run build
```

## 3. 建立 Telegram bot 並配對

1. 在 Telegram 私訊 [@BotFather](https://t.me/BotFather)，輸入 `/newbot`，依提示設定顯示名稱及未被使用、以 `bot` 結尾的帳號名稱。完成後，BotFather 會給你 token。
2. 第一次設定時，複製設定範本，再用記事本開啟。

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

   把 `.env` 中的 `TELEGRAM_BOT_TOKEN=` 填上 token 並儲存。Token 只留在這個本機檔案，請勿貼進聊天或提交到 Git。若已配對，沿用既有的 `.env` 與 `.cache`，直接測試通知即可。
3. 執行配對命令。

   ```powershell
   npm.cmd run telegram:pair
   ```

   在 Telegram 開啟終端顯示的 bot 私聊，按 **Start**，並在五分鐘內傳送終端顯示的一次性配對碼。回到 PowerShell 確認配對提示並輸入 `YES`。
4. 發一則測試提醒，確認手機看得到。

   ```powershell
   npm.cmd run telegram:test
   ```

## 4. 啟用 Codex 桌面通知

```powershell
node scripts/install-desktop-hooks.mjs
node scripts/install-desktop-hooks.mjs --install
```

第一行產生預覽檔 `.cache/desktop-hooks.preview.json`。第二行將 Agent Pocket 的 Hooks 合併到使用者的 Codex 設定，保留其他 Hooks。

在 Codex 桌面 App 開啟 **Settings → Hooks**，或從輸入框選 **Review hooks**。檢查 Agent Pocket 的 `PreToolUse` 命令指向剛安裝的 `scripts/desktop-hook.mjs`，再信任並啟用它。`PermissionRequest` 項目可以保持停用。若 App 尚未讀取設定，重新開啟 Codex 再查看。

## 5. 日常使用

照常在 Codex 桌面 App 開聊天室即可。當 Codex 顯示支援的問題回答框，手機會收到提醒。回到原聊天室，在電腦回答後繼續工作。電腦須保持開機、連網，並保留安裝資料夾。這個模式無需另外啟動終端服務。

要測試桌面流程，可以請 Codex 用選項回答框問你要選 A 還是 B。看到回答框後查看手機，再從電腦回答。若 Codex 只用聊天文字提問，這不會觸發通知。

| 想做什麼 | 操作 |
| --- | --- |
| 確認 bot 是否已配對 | `npm.cmd run telegram:status` |
| 確認手機收得到通知 | `npm.cmd run telegram:test`，再查看手機 |
| 檢查桌面 Hook 與發送紀錄 | `node scripts/desktop-status.mjs`。是否已信任以 App 內的設定為準 |
| 暫停桌面通知 | 在 Codex 的 **Settings → Hooks** 停用 Agent Pocket 的 Hooks |
| 解除 Telegram 配對 | `npm.cmd run telegram:unpair` |

Git 安裝可用 `git pull --ff-only` 更新，ZIP 安裝可重新下載。更新時保留本機的 `.env` 與 `.cache`，並重新執行 `npm.cmd ci` 和 `npm.cmd run build`。若移動安裝位置，請在新位置重新執行 Hook 安裝並檢查信任狀態。

另有可選的終端服務，適合直接從終端啟動獨立工作。平常在 Codex 桌面 App 開的聊天室使用上述 Hook 流程。詳見 [終端服務操作](docs/SERVICE.md)。

[桌面通知細節與驗證範圍](docs/DESKTOP-NOTIFICATIONS.md) · [Telegram 設定](docs/TELEGRAM.md) · [開發進度](docs/PROGRESS.md)
