# 屬性組維護 & 全域字典主檔 產品規格文件

> **版本：** 1.0.0
> **最後更新：** 2026-02-22
> **對應原始碼：** `AttributeGroup.html`
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

屬性組維護模組供**系統管理員**操作，用於定義料號結構所需的屬性規則與字典主檔。
系統採**兩層架構**：
- **全域字典**（Global Dictionary）：管理可複用的屬性代碼與其合法選項值。
- **屬性組規則**（Group Rules）：將字典代碼組合為具體的料號段落結構（Segments），並關聯 SAP 模板。

### 1.2 使用者角色

| 角色 | 說明 |
|------|------|
| 系統管理員 | 唯一可操作此頁面的內部使用者；可管理字典主檔與屬性組規則 |
| 料號系統（下游） | 讀取屬性組的 Segments 結構，據以驗證及產生料號 |

### 1.3 技術環境

- **平台：** 純靜態 HTML + Vanilla JavaScript（無框架）
- **相依：** 無第三方 JS 函式庫；CSS 使用 CSS Custom Properties
- **持久化：** 使用 `localStorage`（key：`JY_ATTR_V3_FINAL`）儲存 `state`
- **資料層：** 目前為前端記憶體 + localStorage，需對接後端 REST API

---

## 2. 資料模型

### 2.1 全域 State 物件

```typescript
interface State {
  lang:   "zh" | "en";   // 當前介面語系
  dict:   DictMap;        // 全域字典主檔
  groups: GroupMap;       // 屬性組規則
}
```

持久化方式：每次 `renderAll()` 執行後呼叫 `localStorage.setItem('JY_ATTR_V3_FINAL', JSON.stringify(state))`。
頁面初始化（`init()`）時優先從 localStorage 載入；若無記錄則使用內建預設 mock 資料。

### 2.2 全域字典（DictMap）

```typescript
type DictMap = Record<string, DictEntry>;

interface DictEntry {
  meta:    { zh: string; en: string };  // 屬性代碼的雙語定義
  options: OptionMap;                   // 該代碼下的合法選項值
}

type OptionMap = Record<string, OptionValue>;

interface OptionValue {
  active: boolean;  // 選項是否啟用
  desc:   string;   // 選項說明（中文）
}
```

目前 mock 中包含 2 筆靜態資料：

| 代碼 | 中文定義 | 英文定義 | 選項範例 |
|------|----------|----------|---------|
| `IDENT` | 識別碼 | Identifier | `5`（手機）、`6`（平板） |
| `PART` | 零件類型 | Part Type | `AA`（電阻）、`BB`（電容） |

### 2.3 屬性組規則（GroupMap）

```typescript
type GroupMap = Record<string, Group>;

interface Group {
  code:      string;     // 屬性組代碼（主鍵），例："GRP-A"
  label:     string;     // 中文定義名稱
  serialLen: number;     // 系統流水碼的位數（1–10）
  active:    boolean;    // 是否啟用
  segments:  Segment[];  // 組碼段定義（有序陣列）
}
```

### 2.4 組碼段（Segment）

```typescript
interface Segment {
  code:    string;              // 對應字典代碼（type="select"）或 "SERIAL"（type="system"）
  meaning: string;              // 段落顯示名稱（由字典 meta 自動帶入）
  len:     number;              // 段落字元長度
  type:    "select" | "system"; // 段落類型
}
```

**段落類型說明：**

| type | 說明 | 代碼 | 長度 |
|------|------|------|------|
| `select` | 字典挑選型：從字典 options 中取值 | 對應 DictEntry 的 key | 手動設定 |
| `system` | 系統流水型：由系統自動產生流水號 | 固定為 `"SERIAL"` | 等同 Group.serialLen |

目前 mock 中包含 1 筆預設屬性組：

| 代碼 | 定義 | 流水碼長度 | 狀態 | Segments |
|------|------|-----------|------|---------|
| `GRP-A` | 標準電子料 | 5 | 啟用 | IDENT(1) - PART(2) - SERIAL(5) |

---

## 3. UI 結構

### 3.1 頁面整體佈局

```
┌─────────────────────────────────────────────────────────────────┐
│ .app-container (max-width: 1400px, padding: 20px)               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ header                                                      │ │
│ │  ├─ h1#txt-app-title + p#txt-app-subtitle                   │ │
│ │  ├─ .nav-tabs                                               │ │
│ │  │   ├─ #tab-btn-groups（屬性組規則）                        │ │
│ │  │   └─ #tab-btn-dict（全域字典主檔）                        │ │
│ │  └─ 右側控制列                                               │ │
│ │      ├─ #langSelector（語言切換 select）                     │ │
│ │      └─ #sapTemplateSelector（SAP 模板篩選 select）          │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ #tab-groups（.tab-content）                                  │ │
│ │  ├─ .controls                                               │ │
│ │  │   ├─ #searchGroup（搜尋輸入）+ #btn-search               │ │
│ │  │   └─ #btn-add-group（+ 新增屬性組）                      │ │
│ │  └─ .card                                                   │ │
│ │      └─ #groupsTable（屬性組清單表格）                       │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ #tab-dict（.tab-content，預設隱藏）                          │ │
│ │  └─ .grid-2                                                 │ │
│ │      ├─ .card（左）：#dictCodeTable 屬性代碼清單             │ │
│ │      └─ .card（右）：屬性值維護編輯器                        │ │
│ │          ├─ #editMetaZh / #editMetaEn（雙語定義）            │ │
│ │          ├─ #dictOptionTable（選項清單）                     │ │
│ │          └─ #btn-add-opt（+ 新增選項）                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 屬性組清單表格欄位（Tab 1）

| ID | 欄位名稱 | 說明 |
|----|----------|------|
| `#th-g-code` | 代碼 | monospace 字體，加粗 |
| `#th-g-name` | 定義 | 純文字 |
| `#th-g-pattern` | 樣式 | 各段長度以 `-` 連接，例：`1-2-5` |
| `#th-g-serial` | 流水碼 | Group.serialLen 數字 |
| `#th-g-sap` | SAP 模板 | 當前篩選值的本地化標籤，以 `.badge.badge-info` 顯示 |
| `#th-g-status` | 狀態 | `.badge.badge-success`（啟用）/ 無 badge 樣式（停用） |
| `#th-g-action` | 操作 | 編輯 / 刪除 兩個按鈕 |

**操作欄按鈕：**

| 按鈕文字 | 樣式 | 行為 |
|---------|------|------|
| 編輯 | `.btn.btn-outline.btn-small` | 開啟屬性組 Modal（edit 模式） |
| 刪除 | `.btn.btn-danger.btn-small` | `confirm()` 確認後刪除群組 |

### 3.3 字典代碼清單表格欄位（Tab 2 左側）

| ID | 欄位名稱 | 說明 |
|----|----------|------|
| `#th-d-code` | 代碼 | monospace 字體，加粗 |
| `#th-d-def` | 定義 | 依語系顯示 `meta.zh` 或 `meta.en` |
| `#th-d-ref` | 引用 | 被幾個 Group Segments 引用，以 `.badge.badge-info` 顯示 |
| `#th-d-action` | 操作 | ✕ 刪除按鈕（`.btn.btn-danger.btn-small`） |

點擊任意列（row.onclick）→ 在右側編輯器開啟該代碼的選項維護。

### 3.4 Modal A — 屬性組編輯（`#groupModal`）

```
#groupModal（.overlay）
└─ .modal（max-width: 1150px）
    ├─ .modal-header
    │   ├─ #modalTitle（"新增屬性組" / "編輯屬性組"）
    │   └─ 關閉按鈕 ✕（onclick="closeModal()"）
    ├─ .modal-body
    │   ├─ .grid-2（基本資料，2欄）
    │   │   ├─ #gCode（屬性組代碼，monospace）
    │   │   ├─ #gLabel（定義）
    │   │   ├─ #gSerialLen（流水碼長度，number input，1~10）
    │   │   └─ #gActive（狀態 select：啟用 / 停用）
    │   ├─ 組碼段定義區
    │   │   ├─ #txt-modal-seg（標題）
    │   │   ├─ #btn-modal-addseg（+ 新增段落）
    │   │   └─ #segmentTable（Segments 列表）
    │   └─ 預覽區（.card，dashed border）
    │       ├─ #txt-pre-pattern + #patternPreview（樣式預覽）
    │       └─ #txt-pre-part + #partNoPreview（範例料號）
    └─ .modal-footer
        ├─ #btn-modal-cancel（取消）
        └─ #btn-modal-save（儲存）
```

### 3.5 Segment 表格欄位（Modal 內）

| ID | 欄位名稱 | 說明 |
|----|----------|------|
| `#` | 序號 | 從 1 開始 |
| `#th-s-code` | 屬性代碼 | `<input>` + `<datalist>`，可從字典代碼選取；`system` 型固定為 `SERIAL` |
| `#th-s-def` | 定義內容 | `select` 型顯示字典 meta；`system` 型顯示 `⚙️ 由系統自動產生流水號` |
| `#th-s-len` | 長度 | `<input type="number">`；`system` 型 disabled（同步 serialLen） |
| `#th-s-type` | 型態 | `<select>`：字典挑選 / 系統流水 |
| `#th-s-status` | 連動狀態 | `select` 型：已連動（綠 badge，顯示 options 數）/ 未定義代碼（紅 badge）；`system` 型：`-` |
| 操作 | - | ↑ / ↓ 換序按鈕 + ✕ 刪除按鈕 |

**列背景色：**
- `type="select"` → `.row-select`（`#f0fdfa`，淺綠）
- `type="system"` → `.row-system`（`#fffbeb`，淺黃）

### 3.6 Modal B — 新增屬性代碼（`#newCodeModal`）

```
#newCodeModal（.overlay）
└─ .modal（max-width: 400px）
    ├─ .modal-header
    │   ├─ #newCodeModalTitle（"新增屬性代碼"）
    │   └─ 關閉按鈕 ✕
    ├─ .modal-body
    │   └─ #newCodeInput（monospace input，placeholder："例：COLOR"）
    └─ .modal-footer
        ├─ #btn-new-code-cancel（取消）
        └─ #btn-new-code-confirm（確認）
```

Enter 鍵可直接觸發確認（`onkeydown="if(event.key==='Enter') confirmNewCode()"`）。

---

## 4. 功能規格

### 4.1 頁籤切換

#### 觸發條件
- 點擊 `.nav-tabs` 內的 `#tab-btn-groups` 或 `#tab-btn-dict`

#### 行為
1. 呼叫 `switchTab(tab)`
2. 移除所有 `.tab` 的 `.active` class，加回被點擊的 tab
3. 隱藏所有 `.tab-content`，顯示目標 `#tab-{tab}`

### 4.2 SAP 模板篩選

#### 觸發條件
- 變更 `#sapTemplateSelector`（值：`ALL` / `MODEL_A` / `MODEL_B`）

#### 行為
- 觸發 `renderGroups()`，屬性組清單的「SAP 模板」欄顯示目前選擇的本地化標籤
- 目前所有群組均顯示相同篩選標籤（**未依群組本身的 SAP 模板屬性過濾**，詳見 §8.1）

### 4.3 搜尋屬性組

#### 觸發條件
- 在 `#searchGroup` 輸入文字（`oninput`）→ 即時篩選
- 點擊 `#btn-search` → 重新執行渲染

#### 篩選邏輯

```
若 q 不為空（toLowerCase）：
  AND (group.code.toLowerCase().includes(q)
       OR group.label.toLowerCase().includes(q))
```

### 4.4 新增屬性組

#### 觸發條件
- 點擊 `#btn-add-group`

#### 流程

1. `openGroupModal('new')` 執行：
   - `currentEditingGroup` 初始化為空物件（`code:"", label:"", serialLen:5, active:true, segments:[]`）
   - 清空所有欄位，`#gSerialLen` 預設 `5`，`#gActive` 預設 `true`
   - 清空 Segment 列表，更新預覽
2. 使用者填寫基本資料並新增 Segments
3. 點擊「儲存」→ 執行 `saveGroup()`

#### 驗證規則

| 欄位 | 規則 |
|------|------|
| `#gCode` | 必填；若為空則 `alert(msgRequiredCode)` 並中止 |

#### 成功行為
- `state.groups[g.code] = g`（以代碼為 key 寫入）
- 執行 `renderAll()`（重新渲染並持久化至 localStorage）
- 關閉 Modal

> ⚠️ 若 `#gCode` 與現有群組相同，將**直接覆蓋**現有群組，無唯一性警告。

### 4.5 編輯屬性組

#### 觸發條件
- 點擊屬性組清單列的「編輯」按鈕

#### 流程

1. `openGroupModal('edit', code)` 執行：
   - 使用 `JSON.parse(JSON.stringify(state.groups[code]))` 深拷貝至 `currentEditingGroup`
   - 填入 `#gCode`、`#gLabel`、`#gSerialLen`、`#gActive`
   - 渲染 Segment 列表
2. 使用者修改資料
3. 點擊「儲存」→ `saveGroup()`

#### 成功行為
- `state.groups[g.code] = g`（覆寫對應 key）
- `renderAll()`、關閉 Modal

### 4.6 刪除屬性組

#### 觸發條件
- 點擊屬性組清單列的「刪除」按鈕

#### 流程
1. `confirm(msgConfirmDelete)` → 使用者取消則中止
2. `delete state.groups[code]`
3. `renderAll()`（重新渲染並持久化）

> ⚠️ **此動作無法復原（前端層）。** 正式實作需後端 `DELETE /api/groups/:code`。

### 4.7 Segment 管理

#### 新增段落
- 點擊 `#btn-modal-addseg` → `addSegment()`
- 預設加入 `{code:"", meaning:"", len:1, type:"select"}`

#### 移除段落
- 點擊段落列 ✕ → `removeSeg(idx)` → 從 `currentEditingGroup.segments` splice 並重新渲染

#### 換序
- ↑ / ↓ 按鈕 → `moveSeg(idx, dir)` → swap 陣列元素並重新渲染
- 首列 ↑ 與末列 ↓ 按鈕 disabled

#### 更新段落屬性（`updateSeg(idx, key, val)`）

| 操作 | 行為 |
|------|------|
| 變更 `type` 為 `"system"` | 強制 `code = "SERIAL"`，`len = serialLen` |
| 從 `system` 切回 `"select"` | 重置 `code = ""`、`meaning = ""` |
| 變更 `code`（select型）| 自動從字典帶入 `meta[lang]` 至 `meaning`；代碼不存在則清空 |
| 變更 `len` | 更新數字（parseInt） |

#### 同步流水碼長度（`syncSerialLen()`）
- `#gSerialLen` 變更時觸發
- 將所有 `type="system"` 且 `code="SERIAL"` 的 segments 長度同步更新

### 4.8 料號樣式預覽

`renderSegments()` 每次執行後呼叫 `updatePreview()`：

| 元素 | 內容邏輯 |
|------|---------|
| `#patternPreview` | segments 各 `len` 以 `-` 連接，例：`1-2-5` |
| `#partNoPreview` | `system` 型補 `0`；`select` 型取字典第一個 option key，不足補 `?`，超出截斷 |

### 4.9 字典代碼管理

#### 新增代碼
1. 點擊 `#btn-add-dict` → `addNewDictCode()`
2. 開啟 `#newCodeModal`，focus `#newCodeInput`
3. 點擊「確認」或按 Enter → `confirmNewCode()`
4. 代碼轉為大寫，`state.dict[code.toUpperCase()] = { meta:{zh:"",en:""}, options:{} }`
5. `renderAll()`

#### 刪除代碼
- 點擊代碼列 ✕ → `deleteDictCode(code)` → `delete state.dict[code]`
- `event.stopPropagation()` 防止觸發 `selectDictCode()`

#### 選取代碼（開啟右側編輯器）
- 點擊代碼列（除 ✕ 外） → `selectDictCode(code)`
- 設定 `currentEditDict = code`
- 顯示 `#dictValueActions`，填入 `#editMetaZh`、`#editMetaEn`
- 渲染 `#dictOptionTable`

### 4.10 字典選項維護

#### 更新雙語定義
- `#editMetaZh` / `#editMetaEn` 即時輸入 → `updateDictMeta()`
- 同步更新 `state.dict[currentEditDict].meta` 並重新渲染代碼清單

#### 新增選項
- 點擊 `#btn-add-opt` → `addDictOption()`
- `prompt()` 請求新選項值，確認後 `state.dict[currentEditDict].options[v] = {active:true, desc:""}`

#### 選項操作（`renderDictOptions()` 中綁定）

| 操作 | 行為 |
|------|------|
| Checkbox 變更 | 即時更新 `opts[val].active`，`renderAll()` |
| 說明文字輸入 | 即時更新 `opts[val].desc`，寫入 localStorage（不重繪） |
| ✕ 刪除 | `delete state.dict[currentEditDict].options[val]`，重繪選項列 |

---

## 5. 狀態機

### 5.1 屬性組生命週期

```
                ┌───────────────┐
  新增群組       │               │
  (active=true) │    active      │◄──────────────────┐
 ─────────────► │    （啟用）    │                    │
                │               │                    │
                └──────┬────────┘                    │
                       │                             │
         編輯 active    │ → false                    │ 編輯 active → true
                       ▼                             │
                ┌───────────────┐                    │
                │               │                    │
                │   inactive    ├────────────────────┘
                │   （停用）    │
                │               │
                └──────┬────────┘
                       │
                  刪除  │（confirm 確認）
                       ▼
                  [從 state.groups 移除]
```

### 5.2 字典選項生命週期

```
  新增選項                啟用 (active=true)
 ─────────► [OptionValue] ◄────────────────┐
                  │                        │
     Checkbox off │                        │ Checkbox on
                  ▼                        │
            active=false ──────────────────┘
                  │
            ✕ 刪除 │
                  ▼
          [從 options 移除]
```

---

## 6. 國際化 i18n

### 6.1 支援語系

| key | 語系 | 切換方式 |
|-----|------|---------|
| `zh` | 繁體中文（預設） | `#langSelector` 選擇「中文」 |
| `en` | English | `#langSelector` 選擇「English」 |

### 6.2 切換機制

1. `#langSelector` onChange → `changeLang(val)`
2. `state.lang = val`
3. 執行 `applyLang()`：依 `i18n[state.lang]` 更新所有靜態元素 textContent / placeholder / select option 文字 / `document.title`
4. 執行 `renderAll()`：更新動態內容（badge 文字、Segment 定義欄、SAP 模板標籤）

### 6.3 翻譯 Key 清單

| Key | 繁中 | English |
|-----|------|---------|
| `appTitle` | 屬性組維護&全域字典主檔 | Part Architecture Management |
| `appSubtitle` | 維護主檔字典與屬性規則的分層系統 | Manage Dictionary & Attribute Rules Layered System |
| `tabGroups` | 屬性組規則 | Rules (Groups) |
| `tabDict` | 全域字典主檔 | Dictionary (Global) |
| `lblLang` | 語言 | Interface Language |
| `lblSapView` | SAP 模板 | SAP Template |
| `btnAddGroup` | + 新增屬性組 | + New Group |
| `btnReset` | 重置 | Reset |
| `btnSearch` | 搜尋 | Search |
| `thGCode` | 代碼 | Code |
| `thGName` | 定義 | Name |
| `thGPattern` | 樣式 | Pattern |
| `thGSerial` | 流水碼 | Serial |
| `thGSap` | SAP 模板 | SAP View |
| `thGStatus` | 狀態 | Status |
| `thGAction` | 操作 | Action |
| `txtDictList` | 屬性代碼清單 | Attribute Code List |
| `btnAddDict` | + 新增代碼 | + New Code |
| `thDCode` | 代碼 | Code |
| `thDDef` | 定義 | Definition |
| `thDRef` | 引用 | Refs |
| `thDAction` | 操作 | Action |
| `txtDictEditor` | 屬性值維護 | Value Maintenance |
| `txtDictHint` | 請選擇代碼進行編輯 | Select a code to edit |
| `lblMetaZh` | 中文定義 | ZH Definition |
| `lblMetaEn` | 英文定義 | EN Definition |
| `txtOptList` | 選項清單 | Option List |
| `btnAddOpt` | + 新增選項 | + New Option |
| `thOVal` | 選項值 | Value |
| `thOStatus` | 狀態 | Status |
| `thONote` | 說明 | Note |
| `modalGCode` | 屬性組代碼 | Group Code |
| `modalGLabel` | 定義 | Label |
| `modalGSLen` | 流水碼長度 | Serial Length |
| `modalGStatus` | 狀態 | Status |
| `modalSeg` | 組碼段定義 (Segments) | Segments Definition |
| `modalAddSeg` | + 新增段落 | + Add Segment |
| `thSCode` | 屬性代碼 | Attr Code |
| `thSDef` | 定義內容 | Definition Content |
| `thSLen` | 長度 | Len |
| `thSType` | 型態 | Type |
| `thSStatus` | 連動狀態 | Link Status |
| `prePattern` | 樣式預覽： | Pattern Preview: |
| `prePart` | 範例料號： | Sample Part No: |
| `btnCancel` | 取消 | Cancel |
| `btnSave` | 儲存 | Save |
| `btnConfirm` | 確認 | Confirm |
| `badgeActive` | 啟用 | Active |
| `badgeInactive` | 停用 | Inactive |
| `badgeLinked` | 已連動 | Linked |
| `badgeUnbound` | 未定義代碼 | Unbound |
| `typeSelect` | 字典挑選 | Select |
| `typeSystem` | 系統流水 | System |
| `hintSystem` | 由系統自動產生流水號 | Auto-generated by system |
| `btnEdit` | 編輯 | Edit |
| `btnDelete` | 刪除 | Delete |
| `optAllTemplate` | 全部模板 | All Templates |
| `optModelA` | SAP 模板 A | SAP Template A |
| `optModelB` | SAP 模板 B | SAP Template B |
| `optActive` | 啟用 / Active | Active |
| `optInactive` | 停用 / Inactive | Inactive |
| `lblZhLang` | 中文 | Chinese |
| `lblEnLang` | English | English |
| `placeholderSearch` | 搜尋代碼或定義... | Search code or definition... |
| `msgConfirmDelete` | 確定要刪除此屬性組嗎？ | Delete this group? |
| `msgConfirmReset` | 確定要重置嗎？ | Are you sure to reset? |
| `msgRequiredCode` | 請輸入屬性組代碼 | Required Code |
| `msgNewCode` | 請輸入新代碼 | New Code: |
| `msgNewValue` | 請輸入新選項值 | New Value: |
| `modalNewCodeTitle` | 新增屬性代碼 | Add Attribute Code |
| `lblNewCodeInput` | 屬性代碼 | Attribute Code |
| `placeholderNewCode` | 例：COLOR | e.g. COLOR |
| `pageTitle` | 京永 - 屬性與主檔管理系統 | Jing Yong - Attribute Master |

---

## 7. 後端整合建議

### 7.1 API 端點設計

#### 屬性組 CRUD

```
GET    /api/groups              取得屬性組清單（含搜尋參數 q、filter sap）
POST   /api/groups              新增屬性組
GET    /api/groups/:code        取得單一屬性組（含 segments）
PUT    /api/groups/:code        完整更新屬性組
DELETE /api/groups/:code        刪除屬性組
```

#### 全域字典 CRUD

```
GET    /api/dict                取得字典代碼清單（含 meta、引用數）
POST   /api/dict                新增字典代碼
GET    /api/dict/:code          取得單一代碼（含 meta + options）
PATCH  /api/dict/:code          更新 meta（zh/en）
DELETE /api/dict/:code          刪除代碼（需檢查 group 引用）

GET    /api/dict/:code/options         取得選項清單
POST   /api/dict/:code/options         新增選項
PATCH  /api/dict/:code/options/:val    更新選項（active, desc）
DELETE /api/dict/:code/options/:val    刪除選項
```

### 7.2 請求/回應格式建議

#### POST /api/groups — 新增屬性組請求體

```json
{
  "code":      "GRP-A",
  "label":     "標準電子料",
  "serialLen": 5,
  "active":    true,
  "segments": [
    { "code": "IDENT", "meaning": "識別碼", "len": 1, "type": "select" },
    { "code": "PART",  "meaning": "零件類型", "len": 2, "type": "select" },
    { "code": "SERIAL","meaning": "系統流水", "len": 5, "type": "system" }
  ]
}
```

#### GET /api/dict 回應體

```json
[
  {
    "code": "IDENT",
    "meta": { "zh": "識別碼", "en": "Identifier" },
    "refCount": 2,
    "options": {
      "5": { "active": true,  "desc": "手機" },
      "6": { "active": true,  "desc": "平板" }
    }
  }
]
```

### 7.3 前端整合替換點

| 目前行為 | 替換方式 |
|---------|---------|
| `state.dict` / `state.groups`（記憶體） | API 呼叫 + 狀態管理 |
| `localStorage.setItem` 持久化 | 改為 API PATCH/PUT 呼叫 |
| `confirm()` / `alert()` 原生對話框 | 統一 UI Modal（參考 accountmanage 的 `openConfirm`） |
| `prompt()` 取得新代碼 / 新選項 | 統一 Modal 輸入框 |
| 無唯一性驗證（代碼覆蓋） | 後端 `POST /api/groups` 回傳 409 Conflict，前端顯示錯誤 |

### 7.4 資料一致性建議

1. **刪除字典代碼前**：後端須檢查是否有 Group Segments 仍引用此代碼，若有則拒絕刪除並回傳 `409 Conflict`
2. **Group code 唯一性**：目前前端直接覆蓋，後端需加 unique constraint
3. **Segment 排序**：以陣列索引（index）隱含排序，後端存入時須保序（ordered list）

---

## 8. 待開發項目

### 8.1 功能缺漏

| 功能 | 狀態 | 說明 |
|------|------|------|
| SAP 模板實際過濾 | ⚠️ 未完整 | 每個 Group 無 `sap` 屬性欄位；`#sapTemplateSelector` 只改顯示標籤，未依群組過濾 |
| 新增代碼唯一性驗證 | ❌ 未實作 | `confirmNewCode()` 直接覆蓋既有 key，不警告 |
| 新增群組代碼唯一性警告 | ❌ 未實作 | `saveGroup()` 直接覆蓋同 key 群組 |
| 刪除代碼引用檢查 | ❌ 未實作 | `deleteDictCode()` 未檢查 Segments 是否引用，直接刪除 |
| 刪除確認 Dialog | ⚠️ 使用原生 | 群組刪除使用 `confirm()`，字典選項刪除無確認 |
| 表格排序 | ❌ 未實作 | 群組/字典清單無欄位排序 |
| 分頁 | ❌ 未實作 | 資料量大時無分頁或虛擬捲動 |
| 選項 `prompt()` 輸入 | ⚠️ 原生 UI | `addDictOption()` 使用 `window.prompt()`，無法國際化 |
| 重置功能 | ⚠️ 已有函式 | `resetDemo()` 已實作（`localStorage.clear()` + `reload()`），但頁面上無對應入口按鈕 |

### 8.2 每個 Group 缺少 SAP 模板屬性

目前 Group 資料結構無 `sap` 欄位，`#sapTemplateSelector` 的篩選值僅作為 UI 標籤顯示，
**實際上對清單內容無任何過濾效果**。

建議在 Group 資料模型加入：

```typescript
interface Group {
  // ...現有欄位...
  sap: "ALL" | "MODEL_A" | "MODEL_B";  // 新增
}
```

並修改 `renderGroups()` 加入過濾邏輯：

```js
const sapFilter = document.getElementById('sapTemplateSelector').value;
// 過濾：
if (sapFilter !== 'ALL' && g.sap !== sapFilter) return;
```

### 8.3 無障礙（Accessibility）

| 項目 | 狀態 |
|------|------|
| Modal `role="dialog"` + `aria-modal` | ❌ 未加 |
| ESC 鍵關閉 Modal | ❌ 未實作 |
| Focus Trap 在 Modal 中 | ❌ 未實作 |
| 表格 `aria-label` | ❌ 未加 |
| 語言切換 `aria-label` | ❌ 未加 |
| 鍵盤操作下拉（datalist 以外） | ❌ 未實作 |

### 8.4 響應式行為

- 目前無 `@media` 查詢，頁面以固定最大寬度 1400px 顯示
- Mobile 環境下 `.grid-2` 雙欄佈局、Segment 寬表格均可能溢出
- Modal 最大高度 `90vh` 但小螢幕無捲動保護
