# REVIEW

## Round 1 — i18n 基础设施

### 本轮变更
- 新增最小 i18n 层（`i18n.js`），提供 `setLang/getLang/t/th` 与最小资源表（仅 `HDR_TITLE_BRAND`）。
- 在 `index.html` 中引入 `i18n.js`，并将 `ui.js` 的语言切换与 i18n 绑定。
- 最小 rerender：语言切换时仅更新品牌标题文本（`HDR_TITLE_BRAND`）。

### 验证步骤
1) 打开页面。
2) 点击头部 CN/EN 切换。
3) 预期：品牌标题在“极光捕手”(CN) 与 “Aurora Capture”(EN) 之间切换。

### 声明
- 未触碰任何业务逻辑。
- 未修改 UI 结构。
- `index.html` 仅新增脚本引入与挂接，未改动文本内容。
- `th()` 已实现但本轮未使用。

## Round 2 — 静态 UI Key 化

### 本轮变更
- index.html：静态文案全部改为 data-i18n 驱动，不改 DOM 结构，仅替换文本内容与添加最小属性。
- ui.js：重写 applyLang 静态渲染逻辑，基于 i18n 渲染静态文本；About/Footer 仅用 th() 注入。
- i18n.js：补齐 Round 2 静态文本资源（含 About/Footer HTML 块）。

### 验证步骤
1) 打开页面，确认无 JS 报错。
2) 点击 CN/EN 切换：tabs、标题、分级说明、alert 按钮文案随语言变化。
3) 打开 About：正文与 Footer 在切换后为对应语言（仅 About/Footer 使用 HTML 注入）。

### 声明
- 未触碰任何业务逻辑。
- 未修改 UI 结构，仅替换静态文案渲染方式。
- 非 About/Footer 文案均为 text/template 渲染，无 innerHTML 注入。

## Round 2.1 — 纠偏修补

### 本轮变更
- alert body 改为纯文本渲染（textContent），并对 `#alertBody` 启用 `white-space: pre-line` 以支持换行。
- status dots 完全改为 `DOT_LABEL_* + DOT_ICON_*` 组合渲染，移除 “云量”等裸字符串拼接。
- 全站移除 About/Footer 之外的 HTML 注入路径：`safeHTML` 改为 textContent；`openAlertOverlay` 改为纯文本；动态块使用 DOM 组装。
- 新增/补充的技术类 key 已在 Round 2 资源中体现（例如 `ABOUT_MODAL_TITLE` / `ABOUT_CLOSE_ARIA` / `STATUS_ROW_ARIA` / `T1_SW_LABEL_*`）。

### 验证步骤
1) 触发任一 alert：body 为纯文本，换行正常显示。
2) 切换 CN/EN：status dots label 随语言切换，icon 使用 DOT_ICON_*。
3) 全仓检查：除 About/Footer 外无 innerHTML 注入路径。

### 声明
- 未触碰任何业务逻辑与判断分支。
- About/Footer 仍为唯一允许的 HTML 注入点。

## Round 2.1 — dots 收敛说明
- status dots item 结构统一为 `{ level, labelKey, iconKey }`，已移除旧的 text 路径。

## Round 3 — model 输出 Key 化

### 本轮变更
- `model.js`：`labelByScore5` 结论输出改为 `STATUS_C5..C1`（保留 `t` 字段但值为 key，并新增 `statusKey` 字段便于后续渲染层接入）。
- `model.js`：`state3h` 的 `state/hint` 输出改为 `T3_BURST_STATE_* / T3_BURST_HINT_*` key。
- `model.js`：`explainUnobservable` 的 `primary/primaryText` 改为 `REASON_*` key（不改原因判定逻辑）。
- `app.js`：仅新增一次 console.log（`[key-debug]`）透传打印 statusKey/reasonKey/state3hKey/hint3hKey；未改渲染逻辑。

### 验证步骤
1) 点击 Run Forecast 生成一次。
2) 预期：控制台出现 `[key-debug]`，包含 `STATUS_*` / `REASON_*` / `T3_BURST_STATE_*` / `T3_BURST_HINT_*`。
3) 预期：页面可运行，无新增报错（外部数据链路错误不在本轮处理范围）。

### 声明
- 未修改任何算法/阈值/分支逻辑，仅替换输出字符串为 key。
- 未推进到 Round 4（未删除翻译映射、未大改渲染）。

## Round 3 修正（R3-fix）

### 原因
- Round 3 产生的 key 被 UI 直接渲染，违反“R3 不改渲染逻辑、不暴露 key”的硬约束。

### 修正点
- UI 渲染回退为原有中文文案路径；key 仅用于 console.log 验证，不再进入可见文本。
- 新增 key→中文的临时映射函数，仅用于恢复 UI 文案显示（不影响 model 的 key 输出）。

### 结果
- 页面不再出现 `STATUS_* / REASON_* / T3_BURST_*` 字样。
- 控制台仍输出 `[key-debug]` 以验证 key 流。
- Round 3 现已可封版。

## Round 4 — R4-0 禁止映射基线搜索（仅记录）

### translateConclusionTextIfEN
- 命中 7 处
- app.js：
  - translateConclusionTextIfEN（函数定义）
  - run() 内渲染：oneHeroLabel / threeSlot*Conclusion / day*Conclusion 等调用

### translateReasonIfEN
- 命中 4 处
- app.js：
  - translateReasonIfEN（函数定义）
  - run() 内渲染：blockerText / threeSlot*Reason 等调用

### translate
- 命中 11 处
- app.js：
  - translateConclusionTextIfEN / translateReasonIfEN 相关定义与调用
- style.css：
  - transform: translateY(...)（非翻译映射，样式用途）

### data-cn
- 命中 0 处

### data-en
- 命中 0 处

### mapCN / mapEN
- 命中 0 处

### trans toggle
- 命中 0 处

### safeHTML(
- 命中 3 处
- app.js：
  - safeHTML wrapper 定义
  - 注释中的 safeHTML 调用（被注释掉）
- ui.js：
  - safeHTML 函数定义

### innerHTML
- 命中 7 处
- ui.js：
  - about/footer 注入（UI_ABOUT_BODY / UI_FOOTER_BLOCK）
- app.js / REVIEW.md / KEY_DRAFT.md：
  - 文档/注释中提及（非执行路径）

### textContent = (h == null ? "" : String(h))
- 命中 2 处
- app.js：safeHTML fallback
- ui.js：safeHTML 实现

### primaryPrefixIfEN
- 命中 4 处
- app.js：
  - primaryPrefixIfEN（函数定义）
  - run() 内 blockerText / threeSlot*Reason 调用

## Round 4 — R4-2c 完成记录

### 变更点
- app.js → run() → 3h burst 渲染段落：
  - threeState：使用 `s3Burst.state` 作为 key，优先 `tKey(key-like)`，否则 `maybeText(...)`。
  - threeBurst：使用 `s3Burst.hint` 作为 key，优先 `tKey(key-like)`，否则 `maybeText(...)`。

### 验收记录
1) Run Forecast 后切 CN/EN：threeState 与 threeBurst 随语言切换变化。
2) 控制台无新增报错（外部链路报错可忽略）。

### Known edge-case / TODO（可选）
- hard-stop 分支仍存在 threeState="静默" 的写死中文（未在本步修复）。
