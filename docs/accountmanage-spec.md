# 帳號管理模組 產品規格文件

> **版本：** 2.0.0
> **最後更新：** 2026-02-22
> **對應原始碼：** `accountmanage.html`
> **語言：** 繁體中文

---

## 目錄

1. [概覽](#1-概覽)
2. [資料模型](#2-資料模型)
3. [UI 結構](#3-ui-結構)
4. [功能規格](#4-功能規格)
5. [狀態機](#5-狀態機)
6. [國際化 i18n](#6-國際化-i18n)
7. [後端整合建議](#7-後端整合建議)
8. [待開發項目](#8-待開發項目)

---

## 1. 概覽

### 1.1 功能定位

帳號管理模組供**系統管理員**操作，用於建立、維護外部合作夥伴（客戶／廠商）的登入帳號。
帳號以 **SAP 客戶代碼**為主鍵，管理員手動指定初始密碼及 BOM 查閱權限。

### 1.2 使用者角色

| 角色 | 說明 |
|------|------|
| 系統管理員 | 唯一可操作此頁面的內部使用者；可新增、編輯、停用、啟用、刪除帳號並重設密碼 |
| 外部帳號持有人 | 以 SAP 代碼 + 密碼登入，不可自行管理帳號 |

### 1.3 技術環境

- **平台：** 純靜態 HTML + Vanilla JavaScript（無框架）
- **相容性：** 桌面優先（≥ 820px），具備 `@media (max-width:820px)` 響應式降級
- **相依：** 無第三方 JS 函式庫；CSS 使用 CSS Custom Properties
- **資料層：** 目前為前端記憶體 mock，需對接後端 REST API

---

## 2. 資料模型

### 2.1 帳號物件 (Account)

```typescript
interface Account {
  id:          string;   // UUID，系統自動產生，不可修改
  status:      "enabled" | "disabled";  // 帳號狀態，預設 "enabled"
  custCode:    string;   // SAP 客戶代碼（主鍵），例："SAP-C001"
  password:    string;   // 登入密碼（明文儲存於 mock；正式需 hash）
  org:         string;   // 公司/單位名稱，可由 SAP 資料自動帶入
  type:        "customer" | "vendor";  // 帳號類型
  email:       string;   // 聯絡 Email（非必填，可為空字串）
  contactName: string;   // 聯絡人姓名（非必填，可為空字串）
  notes:       string;   // 備註（非必填，可為空字串）
  scope:       Scope;    // BOM 權限範圍
  lastLogin:   string;   // 最後登入時間（格式："YYYY-MM-DD HH:mm" 或 "—"）
  createdAt:   string;   // 建立時間（格式："YYYY-MM-DD HH:mm"）
}
```

### 2.2 Scope（BOM 權限範圍）

目前 mock 中存在兩種格式，正式開發應統一為 **格式 B**：

```typescript
// 格式 A（舊版，初始 seed 資料中使用）
interface ScopeV1 {
  orgIds:  string[];  // 組織 ID 清單
  bomIds:  string[];  // BOM ID 清單
  prefix:  string;    // BOM 前綴篩選（未完整實作）
  range:   string;    // 範圍描述（未完整實作）
}

// 格式 B（新版，saveDraft() 儲存時使用）
interface ScopeV2 {
  selected: string[];  // 統一的選取 ID 清單（orgId 或 bomId 混合）
}
```

> ⚠️ `summarizeScope()` 與 `openScopeView()` 中均有相容舊格式的邏輯，**後端 API 應統一回傳格式 B**，前端相容邏輯可於整合後移除。

### 2.3 SAP 客戶主檔（sapCustomers，唯讀）

```typescript
interface SapCustomer {
  code: string;  // SAP 代碼，例："SAP-C001"
  name: string;  // 客戶名稱，例："華東電子"
}
```

目前為 4 筆靜態 mock：

| code | name |
|------|------|
| SAP-C001 | 華東電子 |
| SAP-C002 | 北海貿易 |
| SAP-V009 | 精工零件 |
| SAP-V010 | 宏盛代工 |

### 2.4 BOM 權限選項（allScopeOptions，唯讀）

```typescript
interface ScopeOption {
  id:      string;  // 唯一識別碼，例："CUST-A"、"BOM-101"
  labelZH: string;  // 繁中顯示名稱
  labelEN: string;  // 英文顯示名稱
}
```

目前為 3 筆靜態 mock：

| id | labelZH | labelEN |
|----|---------|---------|
| CUST-A | 客戶 A | Cust A |
| VEND-X | 廠商 X | Vend X |
| BOM-101 | BOM-101｜主板 | BOM-101 \| Board |

---

## 3. UI 結構

### 3.1 頁面整體佈局

```
┌─────────────────────────────────────────────────────┐
│ .wrap (max-width: 1200px, margin: 22px auto)        │
│ ┌────────────────────────────────────────────────┐  │
│ │ .topbar                                        │  │
│ │  ├─ h1#pageTitle + .subtitle#pageSubtitle      │  │
│ │  └─ .rightbox                                  │  │
│ │      ├─ .lang（語系切換）                       │  │
│ │      ├─ #btnExport（匯出 CSV）                  │  │
│ │      └─ #btnCreate（新增帳號）                  │  │
│ ├────────────────────────────────────────────────┤  │
│ │ .panel                                         │  │
│ │  ├─ .controls（篩選列）                         │  │
│ │  │   ├─ .control-left                          │  │
│ │  │   │   ├─ #q（搜尋輸入）+ #qDropdown         │  │
│ │  │   │   ├─ #filterStatus（狀態篩選）           │  │
│ │  │   │   ├─ #filterType（類型篩選）             │  │
│ │  │   │   ├─ #btnSearch                         │  │
│ │  │   │   └─ #countHint（筆數提示）              │  │
│ │  │   └─ .control-right                         │  │
│ │  │       └─ #btnClear（清除條件）               │  │
│ │  └─ table[aria-label="accounts table"]         │  │
│ │      ├─ thead（9 欄表頭）                       │  │
│ │      └─ tbody#tbody（動態渲染）                 │  │
│ └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 3.2 表格欄位

| ID | 欄位名稱 | 說明 |
|----|----------|------|
| `#thStatus` | 狀態 | `.badge.good` / `.badge.bad` |
| `#thCustCode` | 客戶代碼 | monospace 字體，加粗 |
| `#thOrg` | 公司/單位 | 純文字 |
| `#thType` | 類型 | `.chip`（客戶 / 廠商） |
| `#thInfo` | 附加資訊 (Memo) | Email + 聯絡人，各佔一行 |
| `#thScope` | BOM 權限 | 按鈕顯示已選筆數；點擊開啟檢視 Modal |
| `#thLastLogin` | 最後登入 | monospace，格式 `YYYY-MM-DD HH:mm` |
| `#thCreatedAt` | 建立時間 | monospace，格式 `YYYY-MM-DD HH:mm` |
| `#thActions` | 操作 | 編輯 / 重設密碼 / 停用(啟用) / 刪除 四個按鈕 |

**操作欄按鈕說明：**

| `data-act` | 樣式 | 說明 |
|------------|------|------|
| `edit` | `.btn.secondary.small` | 開啟編輯 Modal |
| `pwd` | `.btn.secondary.small` | 開啟重設密碼 Modal |
| `toggle` | `.btn.secondary.small` | 帳號啟用時顯示「停用」；停用時顯示「啟用」 |
| `delete` | `.btn.danger.small` | 開啟確認 Dialog 後刪除帳號 |

### 3.3 Modal A — 新增／編輯帳號（`#overlay`）

```
#overlay（.overlay）
└─ .modal（max-width: 860px）
    ├─ .modal-head
    │   ├─ #modalTitle（動態：t("modalCreate") / t("modalEdit")）
    │   ├─ #modalHint（說明文字）
    │   └─ #btnClose（✕）
    ├─ .modal-body
    │   ├─ .section（基本資料）
    │   │   └─ .grid（2 欄）
    │   │       ├─ #fCustCode（select，SAP 代碼）+ #hintCustCode
    │   │       ├─ #fPassword（password input）
    │   │       ├─ #fOrg（text input）
    │   │       ├─ #fType（select：customer / vendor）
    │   │       ├─ #fEmail（text input）
    │   │       ├─ #fContactName（text input）
    │   │       ├─ #fNotes（textarea，.full）
    │   │       └─ #fEnabled（select：enabled / disabled，.full）
    │   └─ .section（BOM 權限範圍）
    │       ├─ #scopeSelectedTags（已選標籤列）
    │       ├─ #scopeSearchInput（搜尋輸入）
    │       └─ #scopeDropdown（下拉選單）
    └─ .modal-foot
        ├─ #btnCancel
        └─ #btnSave
```

### 3.4 Modal B — 重設密碼（`#pwdOverlay`）

```
#pwdOverlay（.overlay）
└─ .modal（max-width: 400px）
    ├─ .modal-head
    │   ├─ #pwdModalTitle（"重設密碼"）
    │   └─ #btnPwdClose（✕）
    ├─ .modal-body
    │   ├─ label#lbNewPwd + #fNewPwd（password input）
    │   ├─ label#lbConfirmPwd + #fConfirmPwd（password input）
    │   └─ #pwdError（錯誤訊息區，預設隱藏）
    └─ .modal-foot
        ├─ #btnPwdCancel
        └─ #btnPwdConfirm
```

### 3.5 Modal C — BOM 權限檢視（`#scopeViewOverlay`）

```
#scopeViewOverlay（.overlay）
└─ .modal（max-width: 480px）
    ├─ .modal-head
    │   ├─ #scopeViewTitle（"BOM 權限範圍"）
    │   ├─ #scopeViewSubtitle（"SAP代碼｜公司名稱"）
    │   └─ #btnScopeViewClose（✕）
    └─ .modal-body
        └─ #scopeViewList（ul，各項 BOM/Org ID + 名稱）
```

### 3.6 Modal D — 確認 Dialog（`#confirmOverlay`）

```
#confirmOverlay（.overlay）
└─ .modal（max-width: 420px）
    ├─ .modal-head
    │   ├─ #confirmTitle（動態標題，例："確認刪除"）
    │   └─ #btnConfirmClose（✕）
    ├─ .modal-body
    │   └─ #confirmMsg（動態說明文字）
    └─ .modal-foot
        ├─ #btnConfirmCancel（取消）
        └─ #btnConfirmOk（確認，`.btn.danger`）
```

確認 Dialog 由 `openConfirm(title, msg, okCallback)` 呼叫，`okCallback` 於使用者點擊「確認」後執行。

### 3.7 Toast 通知

```
#toast（.toast，fixed，bottom: 22px，全局單例）
```

---

## 4. 功能規格

### 4.1 搜尋與篩選

#### 觸發條件
- 在 `#q` 輸入文字 → 同時觸發即時下拉建議（`renderQDropdown()`）
- 點擊 `#btnSearch` → 執行 `renderTable()`（套用目前所有條件）
- 下拉項目點擊 → 自動填入 `#q` 並關閉下拉

#### 篩選邏輯（AND 條件）

```
若 q 不為空：
  AND (custCode.includes(q) OR org.includes(q))
若 filterStatus !== "all"：
  AND (account.status === filterStatus)
若 filterType !== "all"：
  AND (account.type === filterType)
```

- 搜尋為**大小寫不敏感**（`.toLowerCase()`）
- 結果更新 `#countHint`，顯示 `顯示 N / Total 筆`

#### 清除條件
- 點擊 `#btnClear` → 清空 `#q`、重置兩個 select 為 `"all"`、關閉下拉、重新渲染

#### 下拉自動關閉
- 點擊頁面任意非下拉區域 → 關閉 `#qDropdown`

### 4.2 新增帳號

#### 觸發條件
- 點擊 Topbar 的 `#btnCreate`

#### 流程

1. `openModal("create")` 執行：
   - `#modalTitle` 設為 `t("modalCreate")`
   - `#fCustCode` 填入 SAP 客戶清單（`select` 可選）
   - `#fPassword`、`#fOrg`、`#fEmail`、`#fContactName`、`#fNotes` 清空
   - `#fCustCode.disabled = false`、`#fPassword.disabled = false`
   - `state.draftScope.selected` 重置為空 `Set`
   - 清空 `#scopeSearchInput`、隱藏 `#scopeDropdown`
2. 使用者填寫表單
3. SAP 代碼 `onChange` → 自動帶入 `#fOrg`（非編輯模式）
4. 點擊 `#btnSave` → 執行 `saveDraft()`

#### 驗證規則

| 欄位 | 規則 |
|------|------|
| `#fCustCode` | 必填 |
| `#fPassword` | 必填（新增時）|
| `#fOrg` | 必填 |
| `scope.selected` | size > 0（至少一項 BOM/Org 權限）|
| `custCode` 唯一性 | 不可與既有帳號重複（前端驗證）|

- 驗證失敗 → Toast 顯示錯誤訊息，**不關閉 Modal**
- 錯誤優先序：`errRequired` > `errScope` > `errUnique`

#### 成功行為
- 以 `crypto.randomUUID()` 產生 `id`
- `createdAt` 固定為 `"2026-02-11 23:00"`（mock，正式由後端產生）
- `lastLogin` 初始為 `"—"`
- 新帳號 **插入陣列最前面**（`unshift`）
- 關閉 Modal，Toast 顯示「帳號已儲存」，重新渲染表格

### 4.3 編輯帳號

#### 觸發條件
- 點擊表格列的「編輯」按鈕（`data-act="edit"`）

#### 流程

1. `openModal("edit", acc)` 執行：
   - `#modalTitle` 設為 `t("modalEdit")`
   - `#fCustCode` 設定為該帳號代碼，**`disabled = true`**（不可修改）
   - `#fPassword` 設定為 `"********"`，**`disabled = true`**（密碼需透過重設功能修改）
   - 填入 `org`、`email`、`contactName`、`notes`、`status`、`type`
   - `state.draftScope.selected` 從 `acc.scope.selected`（或相容舊格式 `orgIds + bomIds`）載入
2. 點擊 `#btnSave` → `saveDraft()`

#### 可修改欄位

| 欄位 ID | 欄位名稱 | 備註 |
|---------|---------|------|
| `#fOrg` | 公司/單位 | 可修改 |
| `#fType` | 類型 | 可修改 |
| `#fEmail` | 聯絡 Email | 可修改 |
| `#fContactName` | 聯絡人 | 可修改 |
| `#fNotes` | 備註 | 可修改 |
| `#fEnabled` | 狀態 | 可修改（啟用/停用） |
| Scope | BOM 權限 | 可修改 |

#### **不可修改欄位**（UI 層鎖定）

| 欄位 | 原因 |
|------|------|
| `custCode` | SAP 主鍵，不可更換 |
| `password` | 需透過「重設密碼」Modal 操作 |

#### 成功行為
- 直接修改 `state.accounts` 陣列中對應物件（`id` 不變）
- 關閉 Modal，Toast「帳號已儲存」，重新渲染

### 4.4 重設密碼

#### 觸發條件
- 點擊表格列的「重設密碼」按鈕（`data-act="pwd"`）

#### 流程

1. 記錄 `state.resetingId = id`
2. 清空 `#fNewPwd`、`#fConfirmPwd`，隱藏 `#pwdError`
3. 顯示 `#pwdOverlay`
4. 使用者輸入新密碼與確認密碼
5. 點擊「確認」→ 執行驗證

#### 驗證規則

| 條件 | 錯誤訊息 key |
|------|------------|
| `#fNewPwd` 為空 | `t("errPwdEmpty")` |
| `#fNewPwd !== #fConfirmPwd` | `t("errPwdMismatch")` |

- 錯誤顯示於 `#pwdError`，**不關閉 Modal**

#### 成功行為
- 更新 `acc.password = p1`
- 關閉 Modal，重置 `state.resetingId = null`
- Toast `t("msgPwdUpdated")`

> ⚠️ **安全注意：** 目前 mock 中密碼以明文儲存於 JS state。正式實作必須對接後端 API，後端負責 hash 儲存。

### 4.5 啟用 / 停用

#### 觸發條件
- 點擊表格列的「停用」或「啟用」按鈕（`data-act="toggle"`）

#### 流程

**停用（enabled → disabled）：**
1. 開啟確認 Dialog（`t("confirmDisableTitle")` / `t("confirmDisableMsg")`）
2. 使用者確認後 → `acc.status = "disabled"`
3. 重新渲染表格，Toast `t("msgDisabled")`

**啟用（disabled → enabled）：**
1. 直接執行（無確認 Dialog）→ `acc.status = "enabled"`
2. 重新渲染表格，Toast `t("msgEnabled")`

### 4.6 刪除帳號

#### 觸發條件
- 點擊表格列的「刪除」按鈕（`data-act="delete"`，`.btn.danger.small`）

#### 流程

1. 開啟確認 Dialog（`t("confirmDeleteTitle")` / `t("confirmDeleteMsg")`）
2. 使用者確認後 → `state.accounts = state.accounts.filter(a => a.id !== id)`
3. 重新渲染表格，Toast `t("msgDeleted")`

> ⚠️ **此動作無法復原（前端 mock 層）。** 正式實作需後端 `DELETE /api/accounts/:id`，並考慮軟刪除策略。

### 4.7 匯出 CSV
觸發條件
點擊 Topbar 的 #btnExport 按鈕。

匯出欄位:Status, CustCode, Org, Type, Email, ContactName, LastLogin, CreatedAt
行為與技術規範
資料範圍：匯出 所有帳號（排除前端搜尋篩選，確保資料完整性）。

編碼處理：
必須在內容開頭加入 BOM (\uFEFF)，確保 Excel (Windows) 開啟檔案時能正確識別為 UTF-8，防止中文字體出現亂碼。

實作方式：

使用 Blob 建構 CSV 內容。
透過動態產生 <a> 標籤觸發下載，下載完成後須立即執行 URL.revokeObjectURL() 清理內存，避免洩漏。

檔案命名：
格式：accounts-YYYYMMDD.csv（例如：accounts-20260222.csv）。

### 4.8 BOM 權限設定

#### 設定入口
新增/編輯帳號 Modal 下方的「BOM 權限範圍」區塊

#### 流程

1. 在 `#scopeSearchInput` 輸入關鍵字
2. `renderScopeDropdown(query)` 過濾 `allScopeOptions`（排除已選取）
3. 點擊下拉項目 → `state.draftScope.selected.add(id)`
4. `renderScopeTags()` 更新已選標籤顯示
5. 標籤上的「✕」 → `state.draftScope.selected.delete(id)`

#### BOM 搜尋下拉自動關閉
- 點擊非 `#scopeSearchInput`、非 `#scopeDropdown` 區域 → 隱藏下拉

#### 驗證
- 儲存時 `scope.selected.size > 0`，否則 Toast `t("errScope")`

### 4.9 BOM 權限檢視

#### 觸發條件
- 點擊表格列 BOM 權限欄的按鈕（`data-act="scope"`）

#### 流程
1. `openScopeView(acc)` 執行
2. 讀取 `acc.scope.selected`（相容舊格式 `orgIds + bomIds`）
3. 對每個 ID 在 `allScopeOptions` 查找對應名稱
4. 顯示為 `#scopeViewList` 的 `<li>` 清單
5. `#scopeViewSubtitle` 顯示 `"SAP代碼｜公司名稱"`

### 4.10 鍵盤操作

| 按鍵 | 行為 |
|------|------|
| `Escape` | 依優先序關閉：確認 Dialog → 帳號 Modal → 密碼 Modal → BOM 檢視 Modal |
| `Tab` / `Shift+Tab` | 各 Modal 內有 Focus Trap，Tab 循環於可聚焦元素之間 |

---

## 5. 狀態機

### 5.1 帳號 status 流轉

```
                ┌──────────────┐
   新增帳號      │              │
  （預設啟用）   │   enabled    │◄────────────────┐
──────────────► │   （啟用）    │                  │
                │              │                  │
                └──────┬───────┘                  │
                       │                          │
           toggle 停用  │                          │ toggle 啟用
           （需確認）    ▼                          │
                ┌──────────────┐                  │
                │              │                  │
                │   disabled   ├──────────────────┘
                │   （停用）    │
                │              │
                └──────┬───────┘
                       │
                  刪除  │（需確認）
                       ▼
                  [從清單移除]
```

**備註：**
- 新增時可在 `#fEnabled` 選擇初始狀態（`enabled` 或 `disabled`）
- 停用需確認 Dialog；啟用直接執行
- 刪除需確認 Dialog；刪除後帳號從 `state.accounts` 移除（不可復原）

---

## 6. 國際化 i18n

### 6.1 支援語系

| key | 語系 | 切換按鈕 |
|-----|------|---------|
| `zh` | 繁體中文（預設） | `#btnZH` |
| `en` | English | `#btnEN` |

### 6.2 切換機制

1. 點擊語系按鈕 → 更新 `state.lang`
2. 執行 `applyI18n()`：
   - **第一步** 同步 `#btnZH` / `#btnEN` 的 `.active` class（`classList.toggle`）
   - 更新所有靜態文字（標題、按鈕、label、placeholder、select 選項）
3. 執行 `renderTable()`（更新動態內容：徽章、chip、BOM 標籤名稱）

`applyI18n()` 更新範圍：
- 語系按鈕 active 狀態
- 頁面標題、副標題
- Topbar 所有按鈕文字
- 篩選下拉的選項文字
- 表頭欄位名稱
- 帳號 Modal 的所有 label、placeholder、select 選項
- 重設密碼 Modal 的 label、placeholder、按鈕文字
- BOM 權限檢視標題

### 6.3 翻譯 Key 清單

| Key | 繁中 | English |
|-----|------|---------|
| `pageTitle` | 帳號管理 | Account Management |
| `pageSubtitle` | 管理員手動建立/維護外部帳號… | Admin sets accounts based on SAP codes… |
| `exportCSV` | 匯出 CSV | Export CSV |
| `create` | + 新增帳號 | + Create |
| `searchPH` | 搜尋 客戶代碼 / 公司 | Search code / org |
| `clear` | 清除條件 | Clear |
| `search` | 搜尋 | Search |
| `statusAll` | 全部狀態 | All status |
| `statusEnabled` | 啟用 | Enabled |
| `statusDisabled` | 停用 | Disabled |
| `typeAll` | 全部類型 | All types |
| `typeCustomer` | 客戶 | Customer |
| `typeVendor` | 廠商 | Vendor |
| `thStatus` | 狀態 | Status |
| `thCustCode` | 客戶代碼 | Customer Code |
| `thOrg` | 公司/單位 | Org / Unit |
| `thType` | 類型 | Type |
| `thInfo` | 附加資訊 (Memo) | Info (Memo) |
| `thScope` | BOM 權限 | BOM Scope |
| `thLastLogin` | 最後登入 | Last Login |
| `thCreatedAt` | 建立時間 | Created At |
| `thActions` | 操作 | Actions |
| `enabled` | 啟用 | Enabled |
| `disabled` | 停用 | Disabled |
| `customer` | 客戶 | Customer |
| `vendor` | 廠商 | Vendor |
| `never` | — | — |
| `edit` | 編輯 | Edit |
| `disable` | 停用 | Disable |
| `enable` | 啟用 | Enable |
| `delete` | 刪除 | Delete |
| `resetPwd` | 重設密碼 | Reset PWD |
| `modalCreate` | 新增帳號 | New Account |
| `modalEdit` | 編輯帳號 | Edit Account |
| `modalHint` | 直接設定客戶代碼與登入密碼。 | Set SAP code credentials and BOM permissions. |
| `secBasic` | 基本資料 | Basic Info |
| `lbCustCode` | 客戶代碼 * | Customer Code * |
| `lbPassword` | 密碼 * | Password * |
| `lbEmail` | 聯絡 Email | Contact Email |
| `lbOrg` | 公司/單位 * | Org / Unit * |
| `lbType` | 類型 * | Type * |
| `lbContactName` | 聯絡人 | Contact Name |
| `lbNotes` | 備註 (Memo) | Notes (Memo) |
| `lbEnabled` | 初始狀態 | Initial Status |
| `hintCustCode` | 由 SAP 資料自動帶入 | Auto-filled from SAP data |
| `fPasswordPH` | 請設定初始密碼 | Set initial password |
| `fOrgPH` | 系統自動帶入或手動輸入 | Auto-filled or enter manually |
| `fOptionalPH` | 非必填 | Optional |
| `fNotesPH` | 額外記錄欄位 | Additional notes |
| `secScope` | BOM 權限範圍（必填） | BOM Scope (required) |
| `scopeSearchPH` | 輸入關鍵字搜尋 BOM 權限... | Search BOM permissions... |
| `scopeViewTitle` | BOM 權限範圍 | BOM Scope |
| `previewPrefix` | 權限概覽： | Scope preview: |
| `previewEmpty` | 至少需設定一種範圍 | At least one scope required |
| `itemsSelected` | 項已選 | items selected |
| `cancel` | 取消 | Cancel |
| `save` | 保存 | Save |
| `confirm` | 確認 | Confirm |
| `pwdModalTitle` | 重設密碼 | Reset Password |
| `lbNewPwd` | 新密碼 | New Password |
| `lbConfirmPwd` | 確認新密碼 | Confirm Password |
| `fNewPwdPH` | 請輸入新密碼 | Enter new password |
| `fConfirmPwdPH` | 請再次輸入新密碼 | Re-enter new password |
| `confirmDeleteTitle` | 確認刪除 | Confirm Delete |
| `confirmDeleteMsg` | 確定要刪除此帳號？此動作無法復原。 | Are you sure you want to delete this account? This cannot be undone. |
| `confirmDisableTitle` | 確認停用 | Confirm Disable |
| `confirmDisableMsg` | 確定要停用此帳號？ | Are you sure you want to disable this account? |
| `msgSaved` | 帳號已儲存 | Saved |
| `msgDisabled` | 已停用 | Account disabled |
| `msgEnabled` | 已啟用 | Account enabled |
| `msgDeleted` | 帳號已刪除 | Account deleted |
| `msgPwdUpdated` | 密碼已更新 | Password updated |
| `errRequired` | 請填寫必填欄位 | Required fields missing |
| `errUnique` | 此代碼帳號已存在 | This SAP code already exists |
| `errScope` | 請設定權限範圍 | Scope required |
| `errPwdEmpty` | 密碼不可為空 | Password cannot be empty |
| `errPwdMismatch` | 兩次密碼不一致 | Passwords do not match |
| `viewScope` | 查看 | View |
| `countHint` | 顯示 N / Total 筆（函式） | Showing N / Total（函式） |

---

## 7. 後端整合建議

### 7.1 API 端點設計

#### 帳號 CRUD

```
GET    /api/accounts              取得帳號列表（含篩選：status, type, q）
POST   /api/accounts              新增帳號
GET    /api/accounts/:id          取得單一帳號
PATCH  /api/accounts/:id          更新帳號（org, type, email, contactName, notes, status, scope）
DELETE /api/accounts/:id          刪除帳號
```

#### 密碼管理

```
POST   /api/accounts/:id/reset-password   重設密碼（body: { newPassword }）
```

#### SAP 主檔查詢

```
GET    /api/sap/customers          取得 SAP 客戶代碼清單
GET    /api/sap/customers/:code    取得單一客戶資料（含自動帶入 org）
```

#### BOM 權限選項

```
GET    /api/scope-options          取得可選的 org / BOM 清單（含 labelZH, labelEN）
```

### 7.2 請求/回應格式建議

#### POST /api/accounts — 新增帳號請求體

```json
{
  "custCode":     "SAP-C001",
  "password":     "（需 hash，前端傳明文由後端處理）",
  "org":          "華東電子",
  "type":         "customer",
  "email":        "buyer@example.com",
  "contactName":  "王小明",
  "notes":        "備註內容（可為空）",
  "status":       "enabled",
  "scope": {
    "selected": ["CUST-A", "BOM-101"]
  }
}
```

#### 帳號列表回應體

```json
{
  "total": 10,
  "items": [
    {
      "id":          "uuid",
      "status":      "enabled",
      "custCode":    "SAP-C001",
      "org":         "華東電子",
      "type":        "customer",
      "email":       "buyer@example.com",
      "contactName": "王小明",
      "notes":       "",
      "scope":       { "selected": ["CUST-A"] },
      "lastLogin":   "2026-02-10 09:21",
      "createdAt":   "2026-02-01 14:05"
    }
  ]
}
```

> **注意：** 回應體**不應**包含 `password` 欄位。

### 7.3 前端整合替換點

| 目前行為 | 替換方式 |
|---------|---------|
| `state.accounts` 陣列（記憶體） | API 呼叫 + 狀態管理（或框架 store） |
| `crypto.randomUUID()` 產生 ID | 由後端回傳 |
| `createdAt` 硬寫 mock 時間 | 由後端回傳 |
| `sapCustomers` 靜態陣列 | `GET /api/sap/customers` |
| `allScopeOptions` 靜態陣列 | `GET /api/scope-options` |
| 重設密碼直接修改 `acc.password` | `POST /api/accounts/:id/reset-password` |
| 刪除直接 filter 陣列 | `DELETE /api/accounts/:id` |

### 7.4 安全注意事項

1. **密碼：** 前端傳送明文密碼至後端，後端使用 bcrypt 或 Argon2 hash 儲存
2. **權限控管：** 此頁面應僅管理員 session 可存取，後端每個 API 端點須驗證 admin 角色
3. **custCode 唯一性：** 前端 `saveDraft()` 已做唯一性驗證，後端仍須於 DB 層加 unique constraint
4. **API 輸入驗證：** 後端需重新驗證所有必填欄位，不可信任前端驗證
5. **刪除操作：** 建議後端採軟刪除（soft delete）而非實體刪除，保留審計軌跡

---

## 8. 待開發項目

### 8.1 功能缺漏（前端）

| 功能 | 狀態 | 說明 |
|------|------|------|
| BOM `prefix` / `range` 欄位 | ⚠️ 未使用 | 資料模型有此欄位（ScopeV1），UI 未呈現，整合後可移除 |
| 搜尋框鍵盤導航 | ❌ 未實作 | `#qDropdown` / `#scopeDropdown` 無方向鍵操作支援 |
| 表格排序 | ❌ 未實作 | 無欄位排序功能 |
| 分頁 | ❌ 未實作 | 帳號數量大時需分頁或虛擬捲動 |

### 8.2 響應式行為

- `@media (max-width: 820px)` 已有基本響應式降級（table 轉 block、grid 單欄）
- Mobile Modal 高度限制為 `min(72vh, 720px)`
- **尚未處理：** Modal 在小螢幕的捲動行為與鍵盤遮擋問題
- **尚未處理：** `tbody td` 未設定 `data-label` 屬性（CSS `::before` 對應欄位名稱無資料）

### 8.3 無障礙（Accessibility）

| 項目 | 狀態 |
|------|------|
| `role="dialog"` + `aria-modal="true"` | ✅ 已加（所有 Modal） |
| `aria-label` 在語系切換區 | ✅ 已加 |
| `aria-label="accounts table"` | ✅ 已加 |
| `aria-label="移除"` 在 scope-tag 按鈕 | ✅ 已加 |
| Focus Trap 在所有 Modal 中 | ✅ 已實作 |
| ESC 鍵關閉 Modal | ✅ 已實作 |
| 鍵盤導航下拉選單（方向鍵） | ❌ 未實作 |
| `data-label` 行動版表格欄位標籤 | ❌ `tbody td` 未設定此屬性 |
