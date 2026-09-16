# Copaws PC／管理後台原型交付

日期：2026-09-16

> PC部分已由同日後續修復版取代，請以`copaws-pc-prototype-repair-2026-09-16.md`及90張Figma狀態對照為準。下方手機引擎延伸、44頁與舊版PC測試數字僅保留歷史，不再代表現行PC交付。管理後台未於此次修復變更。

## 入口與來源

- PC：`https://mobinice.github.io/copaws/pc.html`
- 管理後台：`https://mobinice.github.io/copaws/admin.html`
- 手機：`https://mobinice.github.io/copaws/index.html`（本次不覆蓋）
- PC Figma來源832:822；管理後台856:227，同檔uWL0e55ygAvF9cmBSIU0Mr。Figma本次未修改。
- PC以既有手機互動引擎產生獨立HTML，額外載入桌面樣式與互動；來源`outputs/build-pc-prototype.mjs`、`outputs/assets/copaws-pc.*`。建置：`node outputs/build-pc-prototype.mjs`。
- 管理後台：`outputs/admin.html`、`outputs/assets/copaws-admin.*`。靜態檔可直接開啟，無正式API呼叫。

## 原型涵蓋

PC包括44個流程容器及共用動態彈窗，涵蓋登入／註冊、找保母、需求列表／編輯／申請、地圖／分頁、詳情／時段／需求／付款確認、預約／回報／訊息、個人／寵物／資格／財務，以及保母接案／地圖／案件／回報／時段／個人等。此數字不等同Figma90張狀態稿逐張獨立頁，也未宣稱90張逐像素對照驗收。

管理後台涵蓋示範登入錯誤、營運／新增保母／每日明細、日期與空資料、Excel產生／下載／失敗重試、使用者搜尋分頁詳情、資格審核、個別費率與全站活動新增確認、期間衝突、終止、操作紀錄。

## 驗證

- `outputs/verify-pc-admin.js`：Playwright CLI執行的核心互動驗證，36項通過。
- PC44頁，768／1280／1440／1920×960，各0橫向溢出。
- 後台11種主要頁同寬度檢查0橫向溢出；無JavaScript pageerror。
- 實際xlsx檔案下載並讀回，4工作表，新增保母7日加總36。
- 原型內嵌JS靜態檢查、PC/admin外部JS語法檢查。
- 本機截圖與xlsx：`output/playwright/copaws-*-final.png`、`copaws-demo-report.xlsx`；機器可讀摘要`outputs/verification/pc-admin-2026-09-16.json`。
- 實際主代理一人，無新增sub-agent。不是獨立QA簽核，不代表正式產品驗收。

## 試用與限制

- 後台示範帳號與密碼均為`demo`，請勿輸入任何真實帳號或文件。公開靜態頁無真正認證／權限安全邊界。
- 可用`admin.html?state=error`示範報表讀取失敗／重試；`admin.html?role=viewer`示範無費率管理權限，均不是後端權限控制。
- 資料採固定示例日期2026/09/09–09/15，其他歷史日期為示範資料；不是營運結果。缺少可靠前期基準不虛報比較百分比。
- 後台共48位示意使用者，每頁20／50；不以假總數2486誤導分頁。
- 表單、資格／費率更新僅本次瀏覽器記憶體；重新整理即重置。OTP、密碼變更、訊息、付款、退款、開通與Excel資料都不連正式系統。
- PC共用部分手機文字與示例資料；不是每張Figma稿的完整逐像素實作。API、DB、真實地圖定位、跨帳號同步、付款快照、正式審核儲存及完整可及性仍屬正式開發工作。
- Excel使用本地vendored SheetJS 0.18.5，只匯出自有示例資料，不提供外部試算表匯入；保留授權。Lucide0.468.0本地資源，無執行時CDN依赖。

交付結論：可供互動與流程檢視；不等於可正式營運或已通過產品長驗收。
