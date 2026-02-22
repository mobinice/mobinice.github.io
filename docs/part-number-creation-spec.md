# 新料號建立（取號）模組 工程師開發規格文件

> **版本：** 2.0.0
> **最後更新：** 2026-02-22
> **對應原始碼：** `part_number_mapping02.html`（桌面版 Demo）
> **相關頁面：** `AttributeGroup.html`（屬性組維護）
> **專案名稱：** 京永（Jingyong）
> **語言：** 繁體中文

---

## 目錄

1. [概覽](#1-概覽)
2. [資料模型](#2-資料模型)
3. [AttributeGroup.html 串接](#3-attributegrouphtml-串接)
4. [UI 結構](#4-ui-結構)
5. [功能規格](#5-功能規格)
6. [料號產生邏輯](#6-料號產生邏輯)
7. [國際化 i18n](#7-國際化-i18n)
8. [狀態機](#8-狀態機)
9. [後端整合建議](#9-後端整合建議)
10. [待開發項目](#10-待開發項目)

---

## 1. 概覽

### 1.1 功能定位

「新料號建立」模組供**品管/工程人員**使用，依據 SAP 模板與屬性組規則，自動組合並產生唯一料號，再（模擬）寫入 SAP 系統。核心流程：

```
選擇建立方式 → 選工廠別 → 填寫屬性值與額外特性值 → 系統取號（流水碼）→ 組合料號 → 寫入 SAP
```

v2.0.0 新增三項主要功能：
- **C. 直接輸入品號**：輸入既有料號自動解析屬性，再取新流水碼建立新料號
- **工廠別多選**：必選至少一個工廠，存入 `model.factories`（`Set`）
- **群組額外特性值**：依屬性組顯示額外必填欄位（GRP-A：廠商；GRP-B：車種、架高、烤漆色）

### 1.2 使用者角色

| 角色 | 說明 |
|------|------|
| 工程/品管人員 | 填寫屬性值、選擇建立方式、選工廠別、觸發確認 |
| 系統管理員 | 透過 `AttributeGroup.html` 維護屬性組、字典選項（不在本頁面實作）|

### 1.3 技術環境

- **平台：** 純靜態 HTML + Vanilla JavaScript（無框架）
- **持久化：** 流水碼計數器、語言偏好、SAP 模板偏好存於 `localStorage`；屬性組定義由 `AttributeGroup.html` 寫出至 `localStorage["JY_ATTR_V3_FINAL"]`
- **相容性：** 桌面優先（≥ 1080px），具備響應式降級 `@media (max-width: 1080px)`
- **相依：** 無第三方 JS 函式庫
- **SAP 整合：** 目前為前端 mock 模擬，需對接後端 API

### 1.4 與 AttributeGroup.html 的關係

`AttributeGroup.html` 是獨立的**屬性組維護工具**，功能如下：

| 功能 | 說明 |
|------|------|
| 屬性組規則維護 | 新增/編輯屬性組（代碼、段落定義、流水碼長度、SAP 模板關聯）|
| 全域字典主檔 | 維護各屬性代碼的選項值（啟/停用、說明）|
| 資料寫出 | 每次儲存後自動將 `state` 寫入 `localStorage["JY_ATTR_V3_FINAL"]` |

`part_number_mapping02.html` 在初始化時呼叫 `loadFromAttributeGroup()`，從 `JY_ATTR_V3_FINAL` 讀取並**覆蓋** hardcoded 的 `GROUPS`、`OPTION_STATUS`、`TEMPLATE_GROUPS`。若無此 key，則使用 hardcoded fallback 資料繼續運作。

---

## 2. 資料模型

### 2.1 屬性組定義（GROUPS）

```typescript
interface AttributeGroupDef {
  label:     string;            // 顯示名稱，例："GRP-A（1-2-2-1-5）"
  segments:  SegmentDef[];      // 屬性段清單（依序串接即為料號）
  serialLen: number;            // SERIAL 流水碼長度（位數）
}

interface SegmentDef {
  seq:          number;         // 序號（從 1 開始）
  code:         string;         // 屬性代碼，例："IDENT"
  meaning:      string;         // 定義說明，例："識別碼"
  length:       number;         // 固定位數
  type:         "select" | "input" | "system";
  options?:     string[];       // type="select" 時的選項清單（含 desc 時格式為 "值-說明"）
  placeholder?: string;        // type="input" 時的輸入提示
  required:     boolean;        // 是否必填
}
```

**Hardcoded Fallback（無 AttributeGroup 資料時使用）：**

| 屬性組 | 格式 | SERIAL 長度 | 總長度 |
|--------|------|------------|-------|
| GRP-A | 1-2-2-1-5 | 5 位 | 11 碼 |
| GRP-B | 1-2-2-1-4 | 4 位 | 10 碼 |

| Seq | Code | 定義 | 長度 | 類型 | 選項 |
|-----|------|------|------|------|------|
| 1 | IDENT | 識別碼 | 1 | select | `5-手機`, `6-平板`, `7` |
| 2 | PART | 零件類型 | 2 | select | `A0`, `B0`, `C0` |
| 3 | CUST | 客戶碼 | 2 | select | `00`, `01`, `02` |
| 4 | RSV | 預留碼 | 1 | input | placeholder: `"0"` |
| 5 | SERIAL | 流水碼（系統產生）| 5（GRP-A）/ 4（GRP-B）| system | 自動產生 |

### 2.2 選項啟停狀態（OPTION_STATUS）

```typescript
type OptionStatus = {
  [attrCode: string]: {
    [optionValue: string]: boolean;  // true = 啟用, false = 停用
  }
}
```

Hardcoded fallback 中所有選項均為 `true`（啟用）。停用選項在 UI 顯示為「已停用」並 `disabled`，選取後驗證報錯。動態載入時由 `convertDictOptions()` 從 `JY_ATTR_V3_FINAL` 的 `dict[code].options[val].active` 轉換。

### 2.3 工廠別選項（FACTORY_OPTIONS）

```typescript
interface FactoryOption {
  code:  string;   // 工廠代碼，用於 model.factories
  label: string;   // 下拉顯示名稱
}
```

目前 mock 資料：

| code | label |
|------|-------|
| `TA11` | TA11 |
| `KA11` | KA11 |
| `TV11` | TV11 |
| `VA11` | VA11 |
| `KV21` | KV21（待報廢倉）|
| `TV21` | TV21（待報廢倉）|
| `VV21` | VV21（待報廢倉）|

`FACTORY_OPTIONS` 為靜態常數陣列，不受 `JY_ATTR_V3_FINAL` 影響。正式環境需從後端 API 取得。

### 2.4 群組額外特性值映射（GROUP_EXTRA_FIELDS / EXTRA_FIELD_DEF）

#### GROUP_EXTRA_FIELDS

定義各屬性組需顯示哪些額外特性值欄位：

```typescript
const GROUP_EXTRA_FIELDS: { [groupKey: string]: string[] } = {
  "GRP-A": ["vendor"],
  "GRP-B": ["vehicleType", "height", "color"]
};
```

#### EXTRA_FIELD_DEF

定義每個額外特性值欄位的 DOM ID 與 i18n 鍵值：

```typescript
interface ExtraFieldDef {
  id:       string;   // input 元素 ID
  lblId:    string;   // label 元素 ID
  i18nKey:  string;   // I18N 中的標籤 key
  phKey:    string;   // I18N 中的 placeholder key
}

const EXTRA_FIELD_DEF: { [fieldKey: string]: ExtraFieldDef } = {
  vendor:      { id:"fldVendor",      lblId:"lblVendor",      i18nKey:"fldVendor",      phKey:"fldVendorPH" },
  vehicleType: { id:"fldVehicleType", lblId:"lblVehicleType", i18nKey:"fldVehicleType", phKey:"fldVehicleTypePH" },
  height:      { id:"fldHeight",      lblId:"lblHeight",      i18nKey:"fldHeight",      phKey:"fldHeightPH" },
  color:       { id:"fldColor",       lblId:"lblColor",       i18nKey:"fldColor",       phKey:"fldColorPH" },
};
```

對應關係：

| fieldKey | 所屬群組 | i18n 標籤（中文）| i18n 標籤（英文）|
|----------|---------|----------------|----------------|
| `vendor` | GRP-A | 零件特性值-廠商 | Part Characteristic - Vendor |
| `vehicleType` | GRP-B | 半成品特性值-車種 | Semi-fin. - Vehicle Type |
| `height` | GRP-B | 半成品特性值-架高 | Semi-fin. - Height |
| `color` | GRP-B | 半成品特性值-烤漆色 | Semi-fin. - Paint Color |

### 2.5 BOM 預設資料（BOM_PRESETS / BOM_OPTIONS）

#### BOM_PRESETS

```typescript
interface BomPreset {
  attrGroup: string;                     // 對應屬性組 key
  values:    { [code: string]: string }; // 各屬性段的預設值（不含 SERIAL）
  partSpec:  string;                     // 規格/描述
}
```

> ⚠️ **v2.0.0 變更：** `partName` 欄位已移除，BOM_PRESETS 僅含 `partSpec`（規格描述）。

目前 mock 資料：

| BOM No | 屬性組 | IDENT | PART | CUST | RSV | 規格 |
|--------|--------|-------|------|------|-----|------|
| BOM-1001 | GRP-A | 5-手機 | A0 | 01 | 0 | 24" x 12.5" / Korea |
| BOM-1002 | GRP-A | 5-手機 | A0 | 01 | 0 | 24" x 12.5" / Korea / ECN |
| BOM-2001 | GRP-B | 6-平板 | B0 | 02 | 0 | Vietnam line |

#### BOM_OPTIONS

供搜尋式下拉顯示使用（與 BOM_PRESETS 分開維護）：

```typescript
interface BomOption {
  value: string;   // BOM 編號（對應 BOM_PRESETS 的 key）
  label: string;   // 下拉顯示文字
}
```

| value | label |
|-------|-------|
| `BOM-1001` | BOM-1001 / Model A / Korea |
| `BOM-1002` | BOM-1002 / Model A (Rev.B) / Korea |
| `BOM-2001` | BOM-2001 / Model B / Vietnam |

### 2.6 SAP 模板（SAP_TEMPLATES / TEMPLATE_GROUPS）

```typescript
interface SapTemplate {
  key: string;    // 模板 key
  zh:  string;    // 中文顯示名稱
  en:  string;    // 英文顯示名稱
}
```

```typescript
// TEMPLATE_GROUPS 為 let（可被 loadFromAttributeGroup() 動態覆蓋）
let TEMPLATE_GROUPS: { [tplKey: string]: string[] }
```

Hardcoded 預設值：

| 模板 key | 中文名稱 | 英文名稱 | 可用屬性組 |
|---------|---------|---------|-----------|
| `SAP_MODEL_A` | SAP 模板 A | SAP Template A | GRP-A |
| `SAP_MODEL_B` | SAP 模板 B | SAP Template B | GRP-B |
| `SAP_MODEL_ALL` | 全部模板 | All Templates | GRP-A, GRP-B |

### 2.7 工作狀態物件（model）

```typescript
interface WorkingModel {
  group:     string;                    // 目前選取的屬性組 key
  values:    { [code: string]: string }; // 各段目前填入的值（SERIAL 除外）
  serial:    string;                    // 最近產生的流水碼（空字串 = 尚未產生）
  preview:   string;                    // 完整料號預覽字串
  factories: Set<string>;              // 已選工廠代碼集合（多選）
  extra:     { [fieldKey: string]: string }; // 額外特性值（依群組顯示）
}
```

初始值：

```javascript
let model = {
  group:     attrGroup.value,   // 初始屬性組（由 rebuildAttrGroupOptions 決定）
  values:    {},
  serial:    "",
  preview:   "",
  factories: new Set(),
  extra:     {}
};
```

### 2.8 localStorage 鍵值

| Key | 型別 | 說明 |
|-----|------|------|
| `JY_LANG_NEW_PART` | `"zh"` \| `"en"` | 語言偏好（本頁面持久）|
| `JY_SAPTPL_NEW_PART` | string | SAP 模板偏好（本頁面持久）|
| `SERIAL_COUNTER_GRP-A` | number（string 存儲）| GRP-A 已取號次數 |
| `SERIAL_COUNTER_GRP-B` | number（string 存儲）| GRP-B 已取號次數 |
| `JY_ATTR_V3_FINAL` | JSON string | 由 `AttributeGroup.html` 寫出的屬性組完整定義 |

> ⚠️ 流水碼計數器目前存於前端 localStorage，**正式環境必須移至後端**，否則不同瀏覽器/裝置之間計數不同步，會產生重複料號。

---

## 3. AttributeGroup.html 串接

### 3.1 串接概覽與資料流

```
AttributeGroup.html
│
│  使用者在屬性組維護頁編輯完成後，每次 renderAll() 觸發：
│  localStorage.setItem('JY_ATTR_V3_FINAL', JSON.stringify(state))
│
▼
localStorage["JY_ATTR_V3_FINAL"]   ← JSON 字串
│
│  part_number_mapping02.html 初始化時：
│  init() → loadFromAttributeGroup()
│
▼
loadFromAttributeGroup()
├─ 讀取並解析 JSON
├─ 篩選 active 屬性組
├─ 呼叫 buildDynamicGroup()（每個 group）
│   └─ 呼叫 convertDictOptions()（每個 select 段）
├─ 覆蓋全域 GROUPS（let）
├─ 覆蓋全域 OPTION_STATUS（let）
└─ 重建 TEMPLATE_GROUPS（let）
```

### 3.2 AttributeGroup localStorage 寫出格式（JY_ATTR_V3_FINAL 完整 Schema）

```typescript
interface JyAttrV3Final {
  lang:   "zh" | "en";      // 目前介面語言（不影響讀取）
  dict:   DictMap;           // 全域字典
  groups: GroupMap;          // 屬性組規則
}

interface DictMap {
  [attrCode: string]: DictEntry;
}

interface DictEntry {
  meta:    { zh: string; en: string }; // 代碼定義（多語系）
  options: { [optValue: string]: DictOption };
}

interface DictOption {
  active: boolean;  // true = 啟用, false = 停用
  desc:   string;   // 選項說明（可空字串）
}

interface GroupMap {
  [groupCode: string]: GroupDef;
}

interface GroupDef {
  code:      string;         // 屬性組代碼，例："GRP-A"
  label:     string;         // 定義名稱，例："標準電子料"
  serialLen: number;         // 流水碼長度
  active:    boolean;        // true = 啟用（false 時 loadFromAttributeGroup 略過）
  segments:  SegmentRaw[];   // 段落定義
}

interface SegmentRaw {
  code:    string;                      // 屬性代碼，例："IDENT" 或 "SERIAL"
  meaning: string;                      // 定義說明
  len:     number;                      // 長度
  type:    "select" | "input" | "system";
}
```

**範例 JSON：**

```json
{
  "lang": "zh",
  "dict": {
    "IDENT": {
      "meta": { "zh": "識別碼", "en": "Identifier" },
      "options": {
        "5": { "active": true,  "desc": "手機" },
        "6": { "active": true,  "desc": "平板" },
        "7": { "active": false, "desc": "" }
      }
    },
    "PART": {
      "meta": { "zh": "零件類型", "en": "Part Type" },
      "options": {
        "AA": { "active": true, "desc": "電阻" },
        "BB": { "active": true, "desc": "電容" }
      }
    }
  },
  "groups": {
    "GRP-A": {
      "code": "GRP-A",
      "label": "標準電子料",
      "serialLen": 5,
      "active": true,
      "segments": [
        { "code": "IDENT", "meaning": "識別碼", "len": 1, "type": "select" },
        { "code": "PART",  "meaning": "零件類型", "len": 2, "type": "select" },
        { "code": "SERIAL","meaning": "系統流水",  "len": 5, "type": "system" }
      ]
    }
  }
}
```

### 3.3 loadFromAttributeGroup() 流程

```javascript
function loadFromAttributeGroup() {
  try {
    const raw = localStorage.getItem('JY_ATTR_V3_FINAL');
    if (!raw) return;                         // 1. 無資料 → 使用 fallback
    const state = JSON.parse(raw);
    const activeGroups = Object.values(state.groups || {})
                               .filter(g => g.active);  // 2. 篩選 active 群組
    if (activeGroups.length === 0) return;    // 3. 無啟用群組 → 使用 fallback

    const newGroups = {};
    const newOptionStatus = {};

    for (const groupDef of activeGroups) {   // 4. 逐一轉換
      const { groupEntry, optionStatusPatch } =
        buildDynamicGroup(groupDef, state.dict || {});
      newGroups[groupDef.code] = groupEntry;
      Object.assign(newOptionStatus, optionStatusPatch);
    }

    const allKeys = Object.keys(newGroups);
    // 5. 重建 TEMPLATE_GROUPS：
    //    保留原分配給 MODEL_A / MODEL_B 的群組（若仍存在），
    //    否則 fallback 到全部啟用群組
    const existingA = TEMPLATE_GROUPS.SAP_MODEL_A.filter(k => newGroups[k]);
    const existingB = TEMPLATE_GROUPS.SAP_MODEL_B.filter(k => newGroups[k]);

    GROUPS         = newGroups;
    OPTION_STATUS  = newOptionStatus;
    TEMPLATE_GROUPS = {
      SAP_MODEL_A:   existingA.length > 0 ? existingA : allKeys,
      SAP_MODEL_B:   existingB.length > 0 ? existingB : allKeys,
      SAP_MODEL_ALL: allKeys
    };
  } catch (e) {
    // 6. 解析失敗 → 使用 hardcoded fallback，印 warning
    console.warn('[loadFromAttributeGroup] Failed to parse localStorage data, using hardcoded fallback.', e);
  }
}
```

### 3.4 buildDynamicGroup() 轉換邏輯

將 `JY_ATTR_V3_FINAL` 格式的單一 `GroupDef` 轉換為 `GROUPS` 所需格式：

```javascript
function buildDynamicGroup(groupDef, dict) {
  const optionStatusPatch = {};

  const segments = groupDef.segments.map((s, idx) => {
    const seg = {
      seq:      idx + 1,
      code:     s.code,
      meaning:  s.meaning || s.code,
      length:   s.len,
      type:     s.type === 'system' ? 'system'
              : s.type === 'input'  ? 'input'
              : 'select',
      required: true
    };

    if (seg.type === 'select') {
      const dictEntry = dict[s.code];
      if (dictEntry && dictEntry.options) {
        const { optArr, statusMap } = convertDictOptions(dictEntry.options);
        seg.options = optArr;
        optionStatusPatch[s.code] = statusMap;  // 合入 OPTION_STATUS
      } else {
        seg.options = [];  // 代碼未定義 → 空選項
      }
    } else if (seg.type === 'input') {
      seg.placeholder = s.placeholder || '';
    }
    return seg;
  });

  const label = buildGroupLabel(groupDef.code, groupDef.segments);
  const groupEntry = {
    label,
    segments,
    serialLen: groupDef.serialLen || 5
  };
  return { groupEntry, optionStatusPatch };
}
```

**buildGroupLabel() 輔助函式：**

```javascript
function buildGroupLabel(code, segments) {
  // 組出 "GRP-A（1-2-5）" 格式
  const lengths = segments.map(s => s.len).join('-');
  return `${code}（${lengths}）`;
}
```

### 3.5 convertDictOptions() 說明

將 `DictEntry.options` 的 dict 格式轉換為 segment 的 `options[]` 陣列與 `OPTION_STATUS` 物件：

```javascript
function convertDictOptions(dictOptions) {
  // Input:  {"5": {active:true, desc:"手機"}, "6": {active:false, desc:""}}
  // Output: {
  //   optArr:    ["5-手機", "6"],
  //   statusMap: {"5-手機": true, "6": false}
  // }
  const optArr = [];
  const statusMap = {};
  for (const [val, info] of Object.entries(dictOptions)) {
    const label = info.desc ? `${val}-${info.desc}` : val;
    optArr.push(label);
    statusMap[label] = !!info.active;
  }
  return { optArr, statusMap };
}
```

**轉換規則：**
- 有 `desc`：label = `"值-說明"`（例：`"5-手機"`）
- 無 `desc`：label = `"值"`（例：`"6"`）
- `active === false` 的選項：仍存入 `statusMap`，值為 `false`；`renderAttrTable()` 渲染時加 `disabled`

### 3.6 TEMPLATE_GROUPS 動態重建邏輯

`loadFromAttributeGroup()` 結束前會重建 `TEMPLATE_GROUPS`，規則如下：

| 條件 | SAP_MODEL_A 的值 | SAP_MODEL_B 的值 |
|------|-----------------|-----------------|
| 舊 MODEL_A 清單中有群組仍存在 | 保留交集 | — |
| 舊 MODEL_A 清單中無群組存在 | 全部啟用群組 | — |
| 舊 MODEL_B 清單中有群組仍存在 | — | 保留交集 |
| 舊 MODEL_B 清單中無群組存在 | — | 全部啟用群組 |
| SAP_MODEL_ALL | 永遠 = 全部啟用群組 | — |

### 3.7 Fallback 行為（無 localStorage 資料時）

下列情況均使用 hardcoded `GROUPS` / `OPTION_STATUS` / `TEMPLATE_GROUPS` 繼續運作，頁面功能不受影響：

| 情況 | 說明 |
|------|------|
| `JY_ATTR_V3_FINAL` 不存在 | `localStorage.getItem` 回傳 `null` → `return` |
| JSON 解析失敗 | `catch` → `console.warn` → `return` |
| `state.groups` 中無 `active` 群組 | `activeGroups.length === 0` → `return` |
| 某個 select 段的 dict 代碼不存在 | `seg.options = []`（空選項）|

---

## 4. UI 結構

### 4.1 頁面整體佈局

```
.app（單欄 grid，min-height: 100vh）
└─ main.main（max-width: 1200px, margin: 0 auto）
    ├─ .topbar（頂部工具列）
    │   ├─ div > #pageTitleText（頁面標題，.page-title）
    │   └─ .row（右側工具）
    │       ├─ .field > #langSel（語言選擇，width: 180px）
    │       └─ .field > #sapTplSel（SAP 模板選擇，width: 240px）
    │
    ├─ .card（主要操作區）
    │   ├─ .row（justify-content: space-between）
    │   │   ├─ .chips
    │   │   │   ├─ #chipA
    │   │   │   └─ #chipB
    │   │   └─ .chips > #serialInfo（流水碼顯示，.mono chip）
    │   ├─ .divider
    │   ├─ .grid（3 欄）
    │   │   ├─ .field > #creationMethod（建立方式 select）
    │   │   ├─ .field
    │   │   │   ├─ #existingBomWrap（copy/blank 模式）
    │   │   │   │   └─ #bomDropdown（搜尋式下拉）
    │   │   │   └─ #directPartNoWrap（direct 模式，display:none）
    │   │   │       └─ #directPartNo
    │   │   ├─ .field > #attrGroup（屬性組 select）
    │   │   ├─ .field[grid-column:span 2] > #partSpec（規格 textarea, maxlength=2000）
    │   │   │   └─ #specCounter / 2000
    │   │   └─ .field > #previewPartNo（料號預覽，readonly）
    │   ├─ （額外特性值欄位，條件顯示）
    │   │   ├─ #wrapVendor > #fldVendor
    │   │   ├─ #wrapVehicleType > #fldVehicleType
    │   │   ├─ #wrapHeight > #fldHeight
    │   │   └─ #wrapColor > #fldColor
    │   ├─ .field > #factoryDropdown（工廠別多選搜尋式下拉）
    │   │   └─ #factoryHint（說明文字）
    │   ├─ .toggle
    │   │   └─ #sapFailToggle（checkbox）+ 說明
    │   ├─ .divider
    │   ├─ .row（justify-content: space-between）
    │   │   ├─ div > #attrTitle + #attrHint
    │   │   └─ .row > #btnReset + #btnConfirm
    │   ├─ #attrTable（屬性段清單表格）
    │   │   └─ tbody（動態渲染）
    │   └─ #alertBox（狀態訊息區，三種樣式）
    │       ├─ #alertTitle
    │       ├─ #alertMsg
    │       └─ #alertHint
    │
    └─ .card（BOM 示例展示區，margin-top:14px）
        ├─ #demoTitle + #demoHint
        └─ table > tbody#bomList（靜態展示）
```

### 4.2 上方表單欄位

| ID | 元件類型 | 說明 | 預設值 |
|----|---------|------|--------|
| `#creationMethod` | `<select>` | 建立方式（blank / copy / direct）| `"blank"` |
| `#existingBomWrap` | `<div>` | BOM 搜尋下拉容器；copy 模式顯示，direct 模式隱藏 | 顯示 |
| `#bomDropdown` | 自訂搜尋下拉 | 既有 BOM 選擇；非 copy 模式時 `aria-disabled="true"` | disabled |
| `#directPartNoWrap` | `<div>` | 直接輸入品號容器；direct 模式顯示，其餘隱藏 | `display:none` |
| `#directPartNo` | `<input>` | 直接輸入既有品號 | 空 |
| `#attrGroup` | `<select>` | 屬性組；選項由 SAP 模板過濾；copy 模式 disabled | 依模板決定 |
| `#partSpec` | `<textarea>` | 規格/描述（非必填，maxlength=2000，自動換行）| 空 |
| `#specCounter` | `<span>` | `partSpec` 字元計數 | `0` |
| `#previewPartNo` | `<input readonly>` | 新料號預覽（Confirm 後填入）| 空 |

> ⚠️ **v2.0.0 變更：** `#partName`（品名）欄位已移除。BOM 搜尋下拉由原本的 `<select>` 升級為自訂搜尋式下拉（`.search-dropdown`）。`#partSpec` 由 `<input>` 升級為 `<textarea>`，格式：`grid-column: span 2`。

### 4.3 群組額外特性值欄位（wrapVendor 等）

以下四個欄位依 `GROUP_EXTRA_FIELDS[model.group]` 動態顯示/隱藏。所有欄位均為必填（Confirm Phase 1 驗證）。

| wrap ID | input ID | label ID | 顯示群組 |
|---------|---------|---------|---------|
| `#wrapVendor` | `#fldVendor` | `#lblVendor` | GRP-A |
| `#wrapVehicleType` | `#fldVehicleType` | `#lblVehicleType` | GRP-B |
| `#wrapHeight` | `#fldHeight` | `#lblHeight` | GRP-B |
| `#wrapColor` | `#fldColor` | `#lblColor` | GRP-B |

`renderExtraFields(group)` 依據群組決定各 wrap 的 `display` 屬性，並同步 `input.value`（從 `model.extra[key]`）與 placeholder（從 i18n）。

### 4.4 工廠別多選下拉

以自訂搜尋式下拉（`.search-dropdown`）實作多選行為：

| DOM ID | 說明 |
|--------|------|
| `#factoryDropdown` | 下拉容器（`.search-dropdown`）|
| `#factoryTrigger` | 觸發按鈕，含 `tabindex="0"` 支援鍵盤 |
| `#factoryDisplay` | 選取後顯示標籤（`.sd-tag`）或 placeholder 文字 |
| `#factoryPanel` | 下拉面板（`display:none` 時收合）|
| `#factorySearch` | 搜尋輸入框（過濾 `FACTORY_OPTIONS`）|
| `#factoryList` | 選項清單容器（動態渲染 `.sd-item`）|
| `#factoryHint` | 說明文字（目前為空字串）|
| `#lblFactory` | 欄位標籤（i18n key：`factoryLabel`）|

**互動行為：**
- 點擊 `#factoryTrigger` → 開/關 panel
- 鍵盤 Enter/Space → 開/關 panel
- `#factorySearch` 輸入 → 過濾並重繪 `#factoryList`
- 點擊 `.sd-item` → toggle `model.factories`（Set 加/刪），重繪 tag 區
- 點擊 tag 上的 `×` 按鈕 → 從 `model.factories` 移除對應 code
- 點擊外部 → 收合 panel（`document.addEventListener("click")`）

### 4.5 屬性段表格欄位

| th ID | 欄位名稱 | 說明 |
|-------|---------|------|
| `#thSeq` | Seq | 序號 |
| `#thCode` | Attribute Code | 屬性代碼（monospace 加粗）|
| `#thMeaning` | Meaning | 定義說明（優先使用 `t.segMeanings[seg.code]`）|
| `#thLen` | Length | 固定位數 |
| `#thVal` | Value (Editable) | 輸入控制項（依 type 決定）|
| `#thStatus` | Status | 選項啟停狀態 chip |

### 4.6 Alert Box 樣式

| class | 用途 | 色系 |
|-------|------|------|
| `.alert.ok` | 成功/提示 | 綠色（`background: #ecfdf5; border-color: #a7f3d0`）|
| `.alert.warn` | 警示/提醒 | 黃色（`background: #fffbeb; border-color: #fde68a`）|
| `.alert.bad` | 錯誤/失敗 | 紅色（`background: #fef2f2; border-color: #fecaca`）|

Alert 結構：
- `.title` > `#alertTitle`（粗體標題）
- `#alertMsg`（內文）
- `#alertHint`（補充提示，`.small`，font-size 12px）

顯示：`alertBox.className = "alert show " + kind`
隱藏：`alertBox.className = "alert"`

---

## 5. 功能規格

### 5.1 建立方式切換（三選項）

#### 選項

| value | 中文 | 說明 |
|-------|------|------|
| `"blank"` | A. 建立全新品號 | 所有欄位從空白開始 |
| `"copy"` | B. 複製現有品號 | 從既有 BOM 搜尋下拉預帶資料 |
| `"direct"` | C. 直接輸入品號 | 輸入既有料號自動解析屬性，再取新號 |

#### 切換行為（`creationMethod.addEventListener("change")`）

**共同行為（任何模式切換）：**
- `#existingBomWrap` 在 direct 模式隱藏（`display:none`），其餘顯示
- `#directPartNoWrap` 在 direct 模式顯示，其餘隱藏（`display:none`）
- `setBomDropdownEnabled(mode === "copy")`
- `attrGroup.disabled = (mode === "copy")`（copy 模式鎖定屬性組）

**切換至 blank：**
1. 清空 `selectedBom`、`#directPartNo.value`
2. `resetForm(attrGroup.value)`（含清空 `model.factories`、`model.extra`）
3. Alert `warn`：`modeBlankMsg`

**切換至 copy：**
1. 清空 `#directPartNo.value`
2. Alert `warn`：`modeCopyMsg`（不清空現有資料）

**切換至 direct：**
1. 清空 `selectedBom`、重繪 `#bomDisplay`
2. `resetForm(attrGroup.value)`
3. Alert `warn`：`modeDirectMsg`

### 5.2 直接輸入品號（parsePartNo）

#### 觸發條件

`#directPartNo` 的 `input` 事件（即時解析）

#### 流程

```
1. 呼叫 parsePartNo(directPartNo.value)
2. 若回傳 null：
   └─ 若輸入長度 >= 10 → showAlert("bad", parseFailTitle, parseFailMsg)
   └─ 否則靜默（等待使用者繼續輸入）
3. 若解析成功（result 非 null）：
   ├─ attrGroup.value = result.group
   ├─ model.group = result.group
   ├─ model.values = result.values  // 不含 SERIAL
   ├─ model.serial = ""
   ├─ model.preview = ""
   ├─ previewPartNo.value = ""
   ├─ renderAttrTable()
   └─ showAlert("ok", parsedTitle, `${parsedMsg}${result.group}`, parsedHint)
```

**注意：** `parsePartNo()` 的詳細邏輯見 [6.4 料號解析](#64-料號解析parsepartno)。

### 5.3 複製既有 BOM（搜尋式下拉）

#### 觸發條件

`#creationMethod = "copy"` 且使用者在 `#bomDropdown` 選取一筆 BOM

#### 流程（BOM 選取 click handler）

```
1. selectedBom = item.dataset.value
2. 關閉 panel（bomPanel.style.display = "none"）
3. renderBomDisplay()（顯示選取的 BOM label）
4. applyPreset(selectedBom)：
   a. 讀取 BOM_PRESETS[bomNo]
   b. attrGroup.value = preset.attrGroup
   c. model.group = preset.attrGroup
   d. model.values = { ...preset.values }
   e. partSpec.value = preset.partSpec
   f. 更新 #specCounter
   g. 清空 model.serial、model.preview、previewPartNo.value
   h. renderAttrTable()
5. model.extra = {}
6. renderExtraFields(model.group)
7. showAlert("ok", copiedTitle, copiedMsg.replace("{bom}", selectedBom), copiedHint)
```

#### 搜尋行為

- `#bomSearch` 輸入即時過濾 `BOM_OPTIONS`（code 與 label 均列入搜尋範圍）
- 無結果時顯示 `t.noMatchItems`
- 選取後不支援「取消選取」（需切換到 blank 模式再切回 copy）

### 5.4 SAP 模板切換

#### 觸發條件

`#sapTplSel` 值變更

#### 流程（`rebuildAttrGroupOptions()`）

```
1. 讀取 TEMPLATE_GROUPS[currentTpl] → allowed 清單
2. 嘗試保留前一個屬性組（若在 allowed 內），否則取清單第一項
3. 重建 #attrGroup <option> 清單（label 取自 GROUPS[gKey].label）
4. 同步 model.group、清空 model.values、serial、preview
5. previewPartNo.value = ""
6. renderAttrTable()
7. currentTpl 存入 localStorage["JY_SAPTPL_NEW_PART"]
8. showAlert("warn", sapTplSwitchedTitle, sapTplSwitchedMsg)
```

### 5.5 屬性組變更

#### 觸發條件

`#attrGroup` 值變更（使用者手動選擇；copy 模式時 disabled，不可手動切換）

#### 流程

```
1. model.group = attrGroup.value
2. model.values = {}
3. model.serial = ""
4. model.preview = ""
5. model.extra = {}
6. previewPartNo.value = ""
7. renderAttrTable()
8. renderExtraFields(newGroup)   ← 同步顯示/隱藏額外特性值欄位
9. showAlert("warn", groupChangedTitle, groupChangedMsg)
```

### 5.6 工廠別選擇

工廠別欄位為**必填**（至少選一個），在 Confirm Phase 0 驗證。

**初始化（`initFactoryDropdown()`）：**
- 綁定 trigger click、keydown（Enter/Space）事件
- 綁定 search input 事件
- 綁定 document click 事件（外部點擊關閉）
- 呼叫 `renderFactoryList("")` 渲染初始清單
- 呼叫 `renderFactoryDisplay()` 渲染觸發按鈕顯示

**`renderFactoryList(query)`：**
- 過濾 `FACTORY_OPTIONS`（code 與 label 均列入搜尋範圍）
- 已選取項目加 `.checked` class，圖示為勾選 SVG；未選為空框 SVG
- 點擊 item → toggle `model.factories`（Set）→ 重繪 list + display

**`renderFactoryDisplay()`：**
- `model.factories.size === 0`：顯示 `t.factoryPlaceholder`（灰色）
- 否則：顯示各 code 的 `.sd-tag`，含 `×` 移除按鈕

**Reset 時：** `model.factories = new Set()`，重新呼叫 `renderFactoryDisplay()` 與 `renderFactoryList("")`

### 5.7 群組額外特性值欄位

**渲染（`renderExtraFields(group)`）：**
```
1. 讀取 GROUP_EXTRA_FIELDS[group] → active 清單
2. 遍歷 EXTRA_FIELD_DEF 所有 key：
   - 若 key 在 active 清單中 → wrap 顯示（display: ""），input 值 = model.extra[key]
   - 否則 → wrap 隱藏（display: "none"），input 值 = model.extra[key]（同步但不顯示）
3. 更新各 input 的 placeholder（從 t[def.phKey]）
```

**事件（`initExtraFieldEvents()`）：**
- 每個 `#fldXxx` 的 `input` 事件：`model.extra[key] = e.target.value; hideAlert()`

**Reset 時：** `model.extra = {}`；`renderExtraFields(model.group)` 清空所有 input 值

**切換屬性組時：** `model.extra = {}`；`renderExtraFields(newGroup)` 重新決定顯示哪些欄位

### 5.8 Confirm 完整流程（7 Phase）

點擊 `#btnConfirm` → `hideAlert()` → 依序執行：

```
Phase 0 ── 工廠別驗證
   if (model.factories.size === 0)
     → showAlert("bad", validateFailTitle, errFactory)
     → return（流程中止）

Phase 1 ── 群組額外特性值驗證
   取 GROUP_EXTRA_FIELDS[model.group]，逐一檢查 model.extra[key].trim()
   if 有空值
     → showAlert("bad", validateFailTitle, extraRequired.replace("{field}", t[def.i18nKey]))
     → return（流程中止）

Phase 2 ── 屬性值第一次驗證
   errs = validateModel(model.group, model.values, t)
   if (errs.length)
     → showAlert("bad", validateFailTitle, errs[0], moreErrors（若 > 1 個錯誤）)
     → return（流程中止）

Phase 3 ── 取號
   serial = getNextSerial(model.group)    // 計數器 +1，已占號
   model.serial = serial

Phase 4 ── 組合料號
   preview = buildPreview(model.group, model.values, model.serial)
   model.preview = preview
   previewPartNo.value = preview
   serialInfo.textContent = `${t.serialLabel}${serial}`

Phase 5 ── Pre-SAP 屬性值第二次驗證
   errs2 = validateModel(model.group, model.values, t)
   if (errs2.length)
     → showAlert("bad", preSapFailTitle, errs2[0], preSapFailHint)
     → return（流程中止，但流水碼已占用）

Phase 6 ── SAP 寫入模擬
   if (sapFailToggle.checked)
     → showAlert("bad", sapWriteFailTitle, sapWriteFailMsg, sapWriteFailHint)
     → return（流程中止，料號不成立，但流水碼已占用）

成功
   showAlert("ok", successTitle, `${newPartGenerated}${preview}`, successHint)
   renderAttrTable()   ← 更新 SERIAL 欄位顯示
```

> ⚠️ **流水碼回收問題：** Phase 3 之後，無論 Phase 5、6 是否失敗，流水碼均**已被消耗**。見 [10.2 流水碼策略](#102-流水碼策略)。

### 5.9 驗證規則（validateModel）

`validateModel(group, values, t)` 回傳 `string[]`（錯誤訊息陣列）：

| 檢查項目 | 條件 | 錯誤訊息（i18n template）|
|---------|------|------------------------|
| 必填屬性 | `seg.required && !value.trim()` | `errMissingAttr`（含 `{code}`, `{meaning}`）|
| 位數正確 | `value.length !== seg.length` | `errWrongLen`（含 `{code}`, `{len}`, `{curr}`）|
| 選項啟停 | `OPTION_STATUS[code][value] === false` | `errDisabledOpt`（含 `{code}`, `{val}`）|

**注意：**
- `SERIAL` 段跳過驗證（系統自動產生）
- 顯示第一個錯誤；若 > 1 個，hint 顯示 `moreErrors.replace("{n}", errs.length - 1)`
- 品名驗證已移除（v2.0.0 無 `#partName` 欄位）
- 工廠別與額外特性值驗證在 Phase 0/1，不在 `validateModel()` 內

### 5.10 屬性表格渲染（renderAttrTable）

依 `model.group` 對應的 `segments` 逐行渲染：

| seg.type | 渲染元件 | 說明 |
|---------|---------|------|
| `"system"` | `<input readonly>` | 顯示 `model.serial`；placeholder = `t.generateOnConfirm`；背景灰 |
| `"select"` | `<select>` | 停用選項加 `disabled`，顯示 `"值" + t.disabledSuffix`；首項為 `t.selectOption` |
| `"input"` | `<input>` | 自由輸入，即時同步 `model.values[seg.code]` |

Meaning 欄：優先顯示 `t.segMeanings[seg.code]`（i18n 翻譯），不存在時 fallback 到 `seg.meaning`。

Status chip 規則：
- `system` → 「系統產生」（`t.statusSystem`）
- `select` + 目前值啟用（或未選）→「啟用」（`t.statusEnabled`，綠色預設 chip）
- `select` + 目前值停用 → 「已停用」（`t.statusDisabled`，紅色 chip）
- `input` → 「可編輯」（`t.statusEditable`）

渲染後同步更新：
- `serialInfo.textContent = t.serialLabel + (model.serial || t.notGenerated)`
- `previewPartNo.value = model.preview || ""`

### 5.11 SAP 寫入失敗模擬

`.toggle` 區塊含 `#sapFailToggle`（checkbox）：
- 勾選後按 Confirm → Phase 6 走失敗分支
- Alert `bad`：`sapWriteFailTitle` / `sapWriteFailMsg` / `sapWriteFailHint`
- 流水碼已占用（Phase 3 已執行），回收需另行處理

### 5.12 Reset

點擊 `#btnReset`：
```
1. partSpec.value = ""
2. #specCounter.textContent = "0"
3. previewPartNo.value = ""
4. resetForm(attrGroup.value)：
   a. hideAlert()
   b. model.group = toGroup || attrGroup.value
   c. model.values = {}
   d. model.serial = ""
   e. model.preview = ""
   f. model.factories = new Set()
   g. model.extra = {}
   h. previewPartNo.value = ""
   i. attrGroup.disabled = false
   j. serialInfo.textContent = serialLabel + notGenerated
   k. renderAttrTable()
   l. renderFactoryDisplay()
   m. renderFactoryList("")
   n. renderExtraFields(model.group)
5. showAlert("warn", resetTitle, resetMsg)
```

**注意：** Reset **不影響** `localStorage` 中的流水碼計數器。

---

## 6. 料號產生邏輯

### 6.1 料號格式

料號由屬性組的各 Segment **依序串接**（無分隔符）：

```
GRP-A: {IDENT:1}{PART:2}{CUST:2}{RSV:1}{SERIAL:5}  → 共 11 碼
GRP-B: {IDENT:1}{PART:2}{CUST:2}{RSV:1}{SERIAL:4}  → 共 10 碼
```

範例（GRP-A）：
```
IDENT=5, PART=A0, CUST=01, RSV=0, SERIAL=00001
→ "5A001000001"（11 碼）
```

IDENT 選項 `"5-手機"` 長度為 1（僅取第 1 碼 `"5"`）——注意 `buildPreview()` 直接使用 `values[seg.code]` 的完整值，**不截斷**，因此選項格式 `"值-說明"` 的長度驗證由 `validateModel()` 的位數檢查負責攔截。

> ⚠️ 若選項 label 格式為 `"5-手機"`（長度 4）而 seg.length=1，`validateModel()` 會報 errWrongLen。v2.0.0 中 IDENT 選項值為 `"5-手機"` 是 hardcoded fallback 的問題；使用 AttributeGroup 動態載入時，選項標籤已正確格式化，需確認 `convertDictOptions()` 輸出的 label 長度符合 seg.length。**正式環境應在屬性組維護時嚴格限制選項值長度。**

### 6.2 流水碼產生（getNextSerial）

```javascript
function getNextSerial(group) {
  const len  = GROUPS[group].serialLen;
  const key  = `SERIAL_COUNTER_${group}`;
  const curr = Number(localStorage.getItem(key) || "0");
  const next = curr + 1;
  localStorage.setItem(key, String(next));
  return padSerial(next, len);  // padStart 至 len 位
}

function padSerial(n, len) {
  const s = String(n);
  return s.length >= len ? s : "0".repeat(len - s.length) + s;
}
```

- GRP-A：5 位，最大 99999（超出後不截斷，料號長度異常）
- GRP-B：4 位，最大 9999
- 計數器**不跨屬性組共享**（key 含 group 名稱）

### 6.3 料號組合（buildPreview）

```javascript
function buildPreview(group, values, serial) {
  let out = "";
  for (const seg of GROUPS[group].segments) {
    if (seg.code === "SERIAL") out += (serial || "");
    else out += (values[seg.code] ?? "");
  }
  return out;
}
```

任一段值為空字串時，對應位置補空（料號長度不足）。驗證步驟應在 `buildPreview()` 之前攔截此情況。

### 6.4 料號解析（parsePartNo）

用於「C. 直接輸入品號」模式，將已知料號逆向解析出各段值：

```javascript
function parsePartNo(str) {
  const s = str.trim();
  // 逐一嘗試每個屬性組
  for (const [gKey, gDef] of Object.entries(GROUPS)) {
    const totalLen = gDef.segments.reduce((acc, seg) => acc + seg.length, 0);
    if (s.length === totalLen) {
      let pos = 0;
      const vals = {};
      for (const seg of gDef.segments) {
        const chunk = s.slice(pos, pos + seg.length);
        if (seg.code !== "SERIAL") vals[seg.code] = chunk;
        pos += seg.length;
      }
      return { group: gKey, values: vals };
    }
  }
  return null;  // 無任何屬性組長度匹配
}
```

**解析規則：**
- 依輸入字串長度與各屬性組 `totalLen`（所有 seg.length 之和）比對
- 找到第一個長度匹配的屬性組即停止
- `SERIAL` 段不寫入 `values`（`model.serial` 需另行取號）
- 回傳 `{ group: gKey, values: {code: chunk, ...} }` 或 `null`

**注意：** 多個屬性組若總長度相同（例如兩組都是 11 碼），解析順序取決於 `Object.entries(GROUPS)` 的迭代順序，無法保證解析到正確的屬性組。設計上應確保各屬性組總長度唯一，或提供使用者手動選擇屬性組的機制。

---

## 7. 國際化 i18n

### 7.1 支援語系

| key | 語系 | 說明 |
|-----|------|------|
| `zh` | 中文（預設）| `<option value="zh">中文</option>` |
| `en` | English | `<option value="en">English</option>` |

初始語系：`localStorage.getItem("JY_LANG_NEW_PART") || "zh"`

### 7.2 切換機制

1. `#langSel` 值變更 → 更新 `currentLang`
2. 存入 `localStorage["JY_LANG_NEW_PART"]`
3. `renderSapTplOptions()`（同步模板選單文字）
4. `applyTexts()`：
   - `hideAlert()`（**切換語系時隱藏現有 Alert**）
   - 更新所有靜態文字（含 placeholder、label）
   - 呼叫 `renderBomDisplay()`、`renderFactoryDisplay()`
   - 更新 `#serialInfo.textContent`
   - 呼叫 `renderAttrTable()`（更新 Status chip 文字）
5. **不重置表單資料**（`model.values`、`model.serial` 等均保留）

### 7.3 完整 i18n Key 清單

| Key | 中文 | English | 說明 |
|-----|------|---------|------|
| `pageTitle` | 新料號建立（取號）| New Part Number Creation | 頁面標題 |
| `langLabel` | 語言 | Language | 語言選擇器標籤 |
| `sapTplLabel` | SAP 模板 | SAP Template | 模板選擇器標籤 |
| `chipA` | 本系統產生料號 → 寫入 SAP（模擬）| Generate part number → write to SAP (simulated) | 資訊 chip |
| `chipB` | 含「屬性定義值」異動驗證 | Includes attribute value change validation | 資訊 chip |
| `creationMethod` | 建立方式 | Creation Method | 欄位標籤 |
| `optBlank` | A. 建立全新品號 | A. Create Blank Data | 建立方式選項 |
| `optCopy` | B. 複製現有品號 | B. Copy Existing BOM | 建立方式選項 |
| `optDirect` | C. 直接輸入品號 | C. Direct Input Part No. | 建立方式選項（v2.0.0 新增）|
| `existingBom` | 既有 BOM（複製用）| Existing BOM (for Copy) | 欄位標籤 |
| `optSelectBom` | -- 選擇 BOM -- | -- Select BOM -- | BOM 下拉預設文字 |
| `attrGroup` | 屬性組 | Attribute Group | 欄位標籤 |
| `lblDirectPartNo` | 輸入品號 | Enter Part No. | 直接輸入欄位標籤 |
| `directPartNoPH` | 輸入既有品號以帶入屬性... | Enter part no. to prefill attributes... | placeholder |
| `partSpec` | 規格 / 描述 | Spec / Description | textarea 標籤 |
| `preview` | 新料號預覽（唯讀）| Preview New Part No (read-only) | 欄位標籤 |
| `sapFailTitle` | 模擬 SAP 寫入失敗 | Simulate SAP write failure | toggle 標題 |
| `sapFailHint` | 打勾後按 Confirm，會走失敗回滾分支（不成立新料號）。| If checked, Confirm will go to rollback branch... | toggle 說明 |
| `attrTitle` | 屬性清單 | Attributes | 屬性區塊標題 |
| `attrHint` | 變更屬性組會清空已選屬性值並載入新清單（順序/位數）。| Changing Attribute Group clears selected values... | 屬性區塊說明 |
| `btnReset` | 重置 | Reset | 按鈕文字 |
| `btnConfirm` | 確認 | Confirm | 按鈕文字 |
| `thSeq` | 序 | Seq | 表格欄標題 |
| `thCode` | 屬性代碼 | Attribute Code | 表格欄標題 |
| `thMeaning` | 定義 | Meaning | 表格欄標題 |
| `thLen` | 長度 | Length | 表格欄標題 |
| `thVal` | 值（可編輯）| Value (Editable) | 表格欄標題 |
| `thStatus` | 狀態 | Status | 表格欄標題 |
| `statusSystem` | 系統產生 | System | Status chip |
| `statusEnabled` | 啟用 | Enabled | Status chip |
| `statusDisabled` | 已停用 | Disabled | Status chip |
| `statusEditable` | 可編輯 | Editable | Status chip |
| `demoTitle` | 示例：可複製的 BOM 清單 | Demo: Existing BOMs (for Copy) | 展示區標題 |
| `demoHint` | 這區純展示：你可以在 Copy 模式選 BOM... | Display only: choose a BOM in Copy mode... | 展示區說明 |
| `demoThBom` | BOM 編號 | BOM No | 展示表欄標題 |
| `demoThProd` | 成品 | Final Product | 展示表欄標題 |
| `demoThOrigin` | 產地 | Origin | 展示表欄標題 |
| `demoThNote` | 備註 | Note | 展示表欄標題 |
| `initHintTitle` | 提示 | Hint | Alert 標題（初始化）|
| `initHintMsg` | 這是本地可開啟的原型（純前端）... | Local demo (front-end only)... | Alert 內文（初始化）|
| `modeBlankMsg` | 目前為「新增空白」模式... | You are in Blank mode... | Alert 內文（切換 blank）|
| `modeCopyMsg` | 目前為「複製現有品號 BOM」模式... | You are in Copy mode... | Alert 內文（切換 copy）|
| `modeDirectMsg` | 目前為「直接輸入品號」模式... | Direct Input mode... | Alert 內文（切換 direct，v2.0.0）|
| `copiedTitle` | 已預帶資料 | Prefilled | Alert 標題（BOM 套用成功）|
| `copiedMsg` | 已從 {bom} 預帶屬性組、屬性值與規格描述。| Prefilled from {bom}: attr. group, values & spec. | Alert 內文（`{bom}` 置換）|
| `copiedHint` | 若你修改 Attribute Group，系統會清空屬性值並要求重選。| If you change Attribute Group, values will be cleared... | Alert hint |
| `groupChangedTitle` | 屬性組已變更 | Attribute Group Changed | Alert 標題 |
| `groupChangedMsg` | 已清空所有屬性值並載入新屬性清單，請重新選擇屬性值。| All attribute values cleared. Please select values again. | Alert 內文 |
| `validateFailTitle` | 驗證失敗 | Validation Failed | Alert 標題（Phase 0/1/2）|
| `preSapFailTitle` | 送 SAP 前驗證失敗 | Pre-SAP Validation Failed | Alert 標題（Phase 5）|
| `preSapFailHint` | 請重新選擇屬性值後再按 Confirm。| Please re-select attribute values and Confirm again. | Alert hint |
| `sapWriteFailTitle` | SAP 寫入失敗（模擬）| SAP Write Failed (Simulated) | Alert 標題（Phase 6）|
| `sapWriteFailMsg` | SAP 回傳建立失敗，系統已回滾... | SAP returned failure. This creation has been rolled back... | Alert 內文 |
| `sapWriteFailHint` | 注意：流水碼回收策略需在規格明確定義... | Serial recycle policy must be defined... | Alert hint |
| `successTitle` | 建立成功 | Created | Alert 標題（成功）|
| `successHint` | 下一步：寫入 SAP（此版本為模擬）... | Next: write to SAP (simulated)... | Alert hint |
| `resetTitle` | 已重置 | Reset | Alert 標題 |
| `resetMsg` | 已清空畫面資料（不影響已產生的流水碼計數）。| Cleared form data (does not affect serial counters). | Alert 內文 |
| `serialLabel` | SERIAL:  | SERIAL:  | 流水碼 chip 前綴 |
| `parsedTitle` | 已帶入屬性值 | Attributes prefilled | Alert 標題（解析成功，v2.0.0）|
| `parsedMsg` | 已解析料號，屬性組：| Parsed. Attribute Group:  | Alert 內文（後接 group key）|
| `parsedHint` | 按 Confirm 產生新流水碼與料號 | Click Confirm to generate new serial and part no. | Alert hint |
| `parseFailTitle` | 無法解析料號 | Cannot parse part no. | Alert 標題（解析失敗）|
| `parseFailMsg` | 請確認品號長度與格式（GRP-A: 11碼, GRP-B: 10碼）| Check length/format (GRP-A: 11, GRP-B: 10) | Alert 內文 |
| `factoryLabel` | 建立工廠別 * | Factory * | 工廠別欄位標籤（v2.0.0）|
| `errFactory` | 請至少選擇一個工廠別 | Please select at least one factory | Phase 0 錯誤訊息 |
| `fldVendor` | 零件特性值-廠商 | Part Characteristic - Vendor | 欄位標籤（v2.0.0）|
| `fldVehicleType` | 半成品特性值-車種 | Semi-fin. - Vehicle Type | 欄位標籤（v2.0.0）|
| `fldHeight` | 半成品特性值-架高 | Semi-fin. - Height | 欄位標籤（v2.0.0）|
| `fldColor` | 半成品特性值-烤漆色 | Semi-fin. - Paint Color | 欄位標籤（v2.0.0）|
| `factoryPlaceholder` | -- 請選擇工廠別 -- | -- Select factory -- | 工廠下拉 placeholder |
| `factorySearchPH` | 搜尋工廠... | Search factory... | 工廠搜尋框 placeholder |
| `bomSearchPH` | 搜尋 BOM... | Search BOM... | BOM 搜尋框 placeholder |
| `noMatchItems` | 無符合項目 | No matches found | 搜尋無結果文字 |
| `generateOnConfirm` | （確認後系統產生）| (Generated on Confirm) | SERIAL input placeholder |
| `selectOption` | -- 請選擇 -- | -- Select -- | select 首個空選項 |
| `disabledSuffix` | （已停用）|  (Disabled) | 停用選項後綴 |
| `notGenerated` | (尚未產生) | (not generated) | serialInfo 未取號時 |
| `sapTplSwitchedTitle` | 已切換 SAP 模板 | SAP template switched | Alert 標題 |
| `sapTplSwitchedMsg` | 已更新可用的屬性組清單。請重新選擇屬性值後再建立。| Attribute group list updated. Please re-select values... | Alert 內文 |
| `newPartGenerated` | 新料號已產生：| New part number generated:  | 成功 Alert 內文前綴 |
| `errMissingAttr` | 缺少必填屬性：{code}（{meaning}）| Missing required attribute: {code} ({meaning}) | 驗證錯誤 template |
| `errWrongLen` | {code} 位數需為 {len}，目前為 {curr} | {code} must be {len} chars, currently {curr} | 驗證錯誤 template |
| `errDisabledOpt` | {code} 選項「{val}」已停用，請重新選擇 | {code} option "{val}" is disabled, please reselect | 驗證錯誤 template |
| `specPH` | 例：24" x 12.5" / 包裝說明 | e.g., 24" x 12.5" / Packaging note | partSpec placeholder |
| `previewPH` | （確認後產生）| (Generated on Confirm) | previewPartNo placeholder |
| `fldVendorPH` | 請輸入廠商名稱 | Enter vendor name | 廠商欄位 placeholder |
| `fldVehicleTypePH` | 請輸入車種 | Enter vehicle type | 車種欄位 placeholder |
| `fldHeightPH` | 請輸入架高 | Enter height | 架高欄位 placeholder |
| `fldColorPH` | 請輸入烤漆色 | Enter paint color | 烤漆色欄位 placeholder |
| `segMeanings` | `{IDENT:"識別碼", PART:"零件類型", CUST:"客戶碼", RSV:"預留碼", SERIAL:"流水碼（系統產生）"}` | `{IDENT:"Identifier", PART:"Part Type", CUST:"Customer Code", RSV:"Reserved", SERIAL:"Serial (System)"}` | 屬性段 Meaning 翻譯（物件）|
| `extraRequired` | {field} 不可為空 | {field} is required | Phase 1 錯誤訊息 template |
| `moreErrors` | 另有 {n} 項問題，請逐一修正。| {n} more issue(s), please fix them. | 多重驗證錯誤 hint |

---

## 8. 狀態機

### 8.1 建立流程狀態（三種建立模式）

```
初始化完成
    │
    ▼
[ 空白表單（blank 模式）] ←─────────────────────────── Reset
    │ 切至 Copy         │ 切至 Direct                     │
    ▼                   ▼                                  │
[ Copy 模式 ]       [ Direct 模式 ]                        │
  selectBom=""        directPartNo=""                      │
    │                   │                                  │
  選 BOM            輸入料號（input 事件）                  │
  applyPreset()      parsePartNo()                         │
    │                   │                                  │
    ▼                   ▼                                  │
[ 表單已預帶 ]      [ 屬性值已解析 ]                       │
    │                   │                                  │
    ├──────────────────┤                                   │
    │    手動修改屬性值  │                                   │
    ▼                   ▼                                  │
              [ 填寫中 ] ──────────────────────────────────┘
                    │
        Click Confirm
                    │
                    ▼
           ┌── Phase 0: 工廠驗證 ──┐
           │通過                   │失敗
           ▼                       ▼ Alert:bad(errFactory)
    Phase 1: 額外欄位驗證
           │通過                   │失敗
           ▼                       ▼ Alert:bad(extraRequired)
    Phase 2: validateModel()
           │通過                   │失敗
           ▼                       ▼ Alert:bad(validateFail)
    Phase 3: getNextSerial()  ← 計數器 +1（已占號）
           │
           ▼
    Phase 4: buildPreview()
           │
           ▼
    Phase 5: validateModel() (Pre-SAP)
           │通過                   │失敗
           ▼                       ▼ Alert:bad(preSapFail) ← 流水碼已占用
    Phase 6: SAP 寫入模擬
           │成功                   │失敗（sapFailToggle）
           ▼                       ▼ Alert:bad(sapWriteFail) ← 流水碼已占用
    Alert:ok（建立成功）
    料號顯示於 previewPartNo
```

### 8.2 屬性組/模板切換狀態

```
[ 已填值 ] → 手動切換 attrGroup → [ model.values/extra 清空，Alert:warn ]
[ 已填值 ] → 切換 sapTplSel   → [ 屬性組清單更新 + model 清空，Alert:warn ]
[ Copy 模式 + 已預帶 ] → attrGroup 被 disabled，無法手動切換
[ 已解析（direct）] → 切換 attrGroup → [ 值已清空，Alert:warn ]
```

---

## 9. 後端整合建議

### 9.1 API 端點設計

#### 料號建立

```
POST   /api/part-numbers              建立新料號（取號 + 寫入 SAP）
GET    /api/part-numbers              查詢料號清單
GET    /api/part-numbers/:partNo      查詢單一料號
```

#### 流水碼管理（取代 localStorage）

```
POST   /api/serial/next               取得下一個流水碼（原子操作）
  Body:     { "attrGroup": "GRP-A" }
  Response: { "serial": "00042", "counter": 42 }

POST   /api/serial/recycle            回收未成立的流水碼（選做）
  Body:     { "attrGroup": "GRP-A", "serial": "00042" }
```

> ⚠️ 取號必須為**原子操作**（資料庫 row-level lock 或 sequence），避免併發重號。

#### 屬性組與選項管理

```
GET    /api/attr-groups               取得所有啟用屬性組定義
GET    /api/attr-groups/:key          取得單一屬性組 + 段定義

GET    /api/attr-options/:attrCode    取得屬性代碼的可用選項（含啟停狀態）
PATCH  /api/attr-options/:attrCode/:value   更新選項啟停狀態
```

#### SAP 模板管理

```
GET    /api/sap-templates             取得所有模板（含可用屬性組清單）
```

#### BOM 查詢（Copy 模式）

```
GET    /api/boms                      取得可複製的 BOM 清單（分頁 + 關鍵字搜尋）
GET    /api/boms/:bomNo               取得單一 BOM 預設值
```

#### 工廠別管理

```
GET    /api/factories                 取得工廠別選項清單
```

### 9.2 請求/回應格式建議

#### POST /api/part-numbers — 建立新料號

**Request：**
```json
{
  "attrGroup":   "GRP-A",
  "sapTemplate": "SAP_MODEL_A",
  "values": {
    "IDENT": "5",
    "PART":  "A0",
    "CUST":  "01",
    "RSV":   "0"
  },
  "partSpec":    "24\" x 12.5\"",
  "factories":   ["TA11", "KA11"],
  "extra": {
    "vendor": "Samsung"
  },
  "sourceBom":   "BOM-1001"
}
```

**Response（成功）：**
```json
{
  "partNo":    "5A001000001",
  "serial":    "00001",
  "attrGroup": "GRP-A",
  "createdAt": "2026-02-22T10:30:00Z",
  "createdBy": "user-id"
}
```

**Response（失敗）：**
```json
{
  "error":      "SAP_WRITE_FAILED",
  "message":    "SAP returned BAPI error code ...",
  "rolledBack": true
}
```

### 9.3 前端整合替換點

| 目前行為 | 替換方式 |
|---------|---------|
| `localStorage[SERIAL_COUNTER_*]` | `POST /api/serial/next`（原子取號）|
| `GROUPS` hardcoded | `GET /api/attr-groups`（初始化時載入）|
| `OPTION_STATUS` hardcoded | 包含在 `attr-groups` 回應或 `GET /api/attr-options/:code` |
| `JY_ATTR_V3_FINAL` localStorage | 可保留前端預載，但以 API 為權威資料源 |
| `BOM_PRESETS` / `BOM_OPTIONS` hardcoded | `GET /api/boms`（含分頁搜尋）|
| `SAP_TEMPLATES` / `TEMPLATE_GROUPS` hardcoded | `GET /api/sap-templates` |
| `FACTORY_OPTIONS` hardcoded | `GET /api/factories` |
| SAP 寫入模擬（toggle）| 正式呼叫 SAP BAPI 或 RFC（後端負責）|
| `model.extra`（額外特性值）| 包含在 `POST /api/part-numbers` 的 `extra` 欄位 |
| `model.factories`（工廠別）| 包含在 `POST /api/part-numbers` 的 `factories` 陣列 |

### 9.4 安全注意事項

1. **重複料號防護：** 後端資料庫對 `partNo` 加 unique constraint，即使前端重送也不重複成立
2. **流水碼一致性：** 使用資料庫 sequence 或 SELECT FOR UPDATE，不可信任前端計數
3. **屬性組驗證：** 後端重新執行 `validateModel` 等效邏輯（位數、必填、選項啟停）
4. **SAP 模板授權：** API 層驗證使用者是否有權使用指定模板
5. **工廠別授權：** API 層驗證使用者是否有權建立指定工廠的料號
6. **額外特性值驗證：** 後端依屬性組規則驗證 `extra` 物件的欄位必填與格式
7. **操作日誌：** 每次成功建立料號應記錄 `createdBy`、`createdAt`、來源 BOM、屬性值快照、工廠別、額外特性值

---

## 10. 待開發項目

### 10.1 功能缺漏（前端）

| 功能 | 狀態 | 說明 |
|------|------|------|
| BOM Demo 展開子列 | ❌ 未實作 | 展示表格第一欄有 `›`（`.expander`）但無展開事件 |
| 流水碼超出上限處理 | ❌ 未實作 | GRP-A 最大 99999、GRP-B 最大 9999；超出後 `padSerial` 不截斷，料號變長 |
| 料號唯一性前端提示 | ❌ 未實作 | 產生重複料號時無前端提示（依賴後端報錯）|
| 流水碼占號失敗的明確回收 | ⚠️ 部分 | `sapWriteFailHint` 有文字警示，但無自動回收機制 |
| `#partSpec` 自動換行邏輯 | ✅ 已實作 | `enforceLineWrap()`：每行 ≤70 字元，總長 ≤2000；cursor 位置保留 |
| `#attrGroup` disabled（copy 模式）| ✅ 已實作 | Reset 時會恢復 `attrGroup.disabled = false` |
| Sidebar 導覽 | ❌ 已移除 | CSS 保留 `.sidebar`、`.nav`、`.logout` 樣式，但 HTML 無 sidebar 結構 |
| parsePartNo 多群組長度衝突 | ⚠️ 潛在問題 | 若多個屬性組總長度相同，解析順序依 `Object.entries(GROUPS)` 決定，無法保證正確 |
| `factoryHint` 文字 | ❌ 未使用 | DOM 存在但 `textContent` 為空，後續可補提示文字 |

### 10.2 流水碼策略（需規格決策）

目前流水碼**一旦取出即計數增加**（Phase 3），不論後續是否成功建立。正式環境需決策：

| 策略 | 說明 | 建議 |
|------|------|------|
| 不占號直到確認 | 後端先 reserve，SAP 成功後才 commit | ✅ 推薦（需兩段式交易）|
| 占號後回收 | 失敗時將號碼標記為「已回收」可重用 | 複雜度較高 |
| 直接跳過 | 失敗的號碼廢棄，下次取下一號 | 最簡單，但號碼有空洞 |

### 10.3 Meaning 欄 i18n 正式方案

目前 `t.segMeanings` 僅含 hardcoded fallback 群組的屬性代碼（IDENT、PART、CUST、RSV、SERIAL）。動態載入的屬性組（來自 `AttributeGroup.html`）若有不同的 code，`segMeanings` 無對應翻譯，`renderAttrTable()` 會 fallback 到 `seg.meaning`（`GroupDef.segments[i].meaning`，固定語系）。

正式方案：`AttributeGroup.html` 寫出的 `JY_ATTR_V3_FINAL` 中，`dict[code].meta` 已含 `{ zh, en }`，`buildDynamicGroup()` 應將 `seg.meaning` 依語系設定；或 `renderAttrTable()` 直接查 `state.dict[seg.code].meta[currentLang]`。

### 10.4 響應式行為

- `@media (max-width: 1080px)`：`.grid` 切換為單欄；`.topbar` 縱向排列
- **尚未處理：** 手機版屬性表格橫向捲動（段落多時超出視窗）；搜尋式下拉（`.sd-panel`）在小螢幕的定位問題

### 10.5 無障礙（Accessibility）

| 項目 | 狀態 |
|------|------|
| `<main>` 語意元素 | ✅ 已使用 |
| 表格 `<th>` | ✅ 已使用 |
| `#sapFailToggle` 有關聯文字 | ✅（`.toggle div` 內文字）|
| BOM 下拉 `aria-disabled` | ✅ 已實作（`setBomDropdownEnabled` 設定 `aria-disabled`）|
| 工廠別下拉 `aria-disabled` | ❌ 未加 |
| Alert 區域 `role="alert"` | ❌ 未加 |
| 屬性表格 `aria-label` | ❌ 未加 |
| 鍵盤導航 | ⚠️ factory/BOM trigger 有 `tabindex="0"` + keydown 支援 Enter/Space；其餘依賴瀏覽器預設 |
| Focus management | ❌ 無（切換模式後 focus 不回任何元素）|
