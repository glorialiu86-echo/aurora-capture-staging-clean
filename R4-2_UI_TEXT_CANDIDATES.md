# R4-2 UI 文案候选清单（全仓中文残留扫描）

说明
- 扫描命令：
  - `rg -n --hidden --no-ignore-vcs "[\u4e00-\u9fff]" .`
  - `rg -n --hidden --no-ignore-vcs "textContent|innerText|innerHTML|insertAdjacentHTML|setAttribute\(|placeholder|aria-|title=|alt=" .`
- 去噪规则：仅保留“可能被用户看到的文案字符串字面量/属性文本”。注释与历史文档不作为 UI 候选。
- 排除目录/文件：`node_modules/`、`dist/`、`build/`、`.git/`、`*.min.js`、`noaa/`、以及历史/审计文档（如 `trans-zh-en*.md`、`G2_CHANGESET.json`、`AUDIT_*.md`、`REVIEW.md`、`KEY_DRAFT.md`）。
- 归类规则：
  - A｜UI 可见硬编码：页面直接可见且不随语言切换 → 必须 key 化
  - B｜UI 半可见（属性/辅助信息）：aria-label/title/alt/placeholder → 建议 key 化
  - C｜仅调试/日志/注释：非 UI → 可保留
  - D｜数据源/合规/专名：默认保留
  - E｜i18n 已有 key 但接线未用 → 修接线
  - F｜不确定：需人工判定

---

## app.js

### [E] app.js:L57-L58
- 片段：`<span class="swAuxItem">云 L/M/H —/—/—%</span>` / `<span class="swAuxItem">月角 —°</span>`
- 触发路径：上游实况 swAux placeholder HTML
- 建议：用既有模板 key 填充占位（`T1_SW_CLOUD_LINE` / `T1_SW_MOON_LINE` + `UI_PLACEHOLDER_DASH`）
- 可能对应 key：`T1_SW_CLOUD_LINE`, `T1_SW_MOON_LINE`

### [A] app.js:L572-L578
- 片段：`"优" / "中" / "差"`
- 触发路径：`cloudGradeFromBest()`（72h 云量评分）
- 建议：新增 UI_72H_CLOUD_GRADE_*（或 OUTLOOK72_CLOUD_GRADE_*）并用 tKey
- 可能对应 key：`UI_72H_CLOUD_GRADE_GOOD` / `UI_72H_CLOUD_GRADE_MED` / `UI_72H_CLOUD_GRADE_BAD`

### [A] app.js:L748
- 片段：`（精度约 ${Math.round(accuracy)}m）`
- 触发路径：定位成功状态 `STATUS_TEXT_GEO_SUCCESS` 的 `acc` 片段
- 建议：新增模板 key 作为精度后缀，或把精度文案并入现有 `STATUS_TEXT_GEO_SUCCESS`
- 可能对应 key：`STATUS_TEXT_GEO_ACCURACY_SUFFIX`（template）

### [A] app.js:L1378-L1379
- 片段：`趋势：Bz 在过去 30 分钟明显转南… / 过去 15 分钟快速转南…`
- 触发路径：`trendPlus` 生成的说明文本
- 建议：新增模板 key（含 drop 值）并用 tKey
- 可能对应 key：`T1_TREND_BZ_DROP_30` / `T1_TREND_BZ_DROP_15`

### [A] app.js:L1500
- 片段：`・ V/N回溯：${sw._plasmaBackfillAgeMin}m`
- 触发路径：上游实况 `swMeta` 追加回溯信息
- 建议：新增模板 key；避免中文拼接入 `backfillAgeMin`
- 可能对应 key：`T1_SW_META_BACKFILL`（template）

### [A] app.js:L1518
- 片段：`NOAA 数据口径变动或部分数据缺失…`
- 触发路径：数据可信度提醒 `warnText`（alert body）
- 建议：新增模板 key（含 missCN 参数），改为 tKey
- 可能对应 key：`ALERT_DATA_CONF_BODY`（template）

### [A] app.js:L1523
- 片段：`点击查看数据可信度说明`
- 触发路径：`statusText` 的 `title` 提示
- 建议：新增 uiTextKey
- 可能对应 key：`STATUS_TEXT_DATA_CONF_TITLE`

### [A] app.js:L1620
- 片段：`"失败"`
- 触发路径：OVATION meta 文案（status note）
- 建议：新增 uiTextKey
- 可能对应 key：`T1_OVATION_STATUS_FAIL`

### [E] app.js:L1636 / L1664
- 片段：`"天色偏亮，微弱极光难以分辨"`
- 触发路径：1h 主因 fallback 文案
- 建议：改用已存在 reason key
- 可能对应 key：`REASON_SKY_TOO_BRIGHT_WEAK_AURORA_HARD_TO_SEE`

### [E] app.js:L1849
- 片段：`"值得出门" / "可蹲守" / "低概率" / "不可观测"`
- 触发路径：3h 小时卡 fallback label（`labelByScore5` 不可用时）
- 建议：改用 statusKey（或 `STATUS_C*`）
- 可能对应 key：`STATUS_C4/STATUS_C3/STATUS_C2/STATUS_C1`

---

## ui.js

### [A] ui.js:L52-L55
- 片段：`"刚刚" / "${m} 分钟前" / "${h} 小时前"`
- 触发路径：`fmtAge()`
- 建议：新增 template keys，使用 tKey
- 可能对应 key：`UI_TIMEAGO_JUST_NOW`, `UI_TIMEAGO_MINUTES`, `UI_TIMEAGO_HOURS`

---

## model.js

### [F] model.js:L183-L203
- 片段：
  - `"你的位置处于主发生区附近（更容易头顶/高仰角出现）。"`
  - `"你的位置更接近主发生区（更容易头顶/高仰角出现）。"`
  - `"你在椭圆外缘的可视区：更可能是北向低仰角/高空极光，成败更吃云与天色。"`
  - `"你离主发生区较远：更像“赌边缘天边光”，需要更强触发或更长持续。"`
- 触发路径：模型内椭圆区域提示（是否展示到 UI 不确定）
- 建议：确认是否直接显示给用户；若是，改为 key 输出
- 可能对应 key：`T1_OVAL_HINT_IN/EDGE/OUT`（示例）

---

## index.html

### [C] index.html:L14-L16
- 片段：`SunCalc: 太阳/月亮高度… / Chart.js: 1小时 C值柱状图`
- 触发路径：注释（非 UI）
- 建议：无需处理

### [C] index.html:L81-L215
- 片段：`1小时 / 上：结论条 / 送达能力模型 / 分级说明保持不变 ...`
- 触发路径：注释（非 UI）
- 建议：无需处理

### [C] index.html:L239-L245
- 片段：`72小时 / 72h 三列日卡…`
- 触发路径：注释（非 UI）
- 建议：无需处理

### [C] index.html:L305-L341
- 片段：`背景介绍 Modal / NOAA 强提示弹窗 / 近似 AACGM …`
- 触发路径：注释（非 UI）
- 建议：无需处理

---

## i18n.js

- 说明：`i18n.js` 内中文均为资源表与冻结 HTML（合规），不作为 UI 硬编码候选。

