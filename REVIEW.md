# Review Summary

## What changed
- 72h 卡片标题改为使用 UI_72H_TITLE_C* 独立 key（不再复用 STATUS_C*）
- i18n.js 补齐 UI_72H_TITLE_C1~C5 的 zh/en 文案
- 72h 分数映射 map5 标题接线到新 key
- Geo button success toast（“已获取 ✓”）key 化：FORM_BTN_GEO_SUCCESS + app.js 接线
- 磁纬 hard-stop / strong-warn alerts 改为 ALERT_MLAT_* key 化

## Files touched
- Modified: app.js, i18n.js, REVIEW.md
- Added: 
- Deleted: 

## Behavior impact
- 72h 卡片标题在各档位使用独立 UI key，CN/EN 可随语言切换
- 未更改算法、阈值、分支逻辑与页面结构

## Risk assessment
- 可能风险：若新 key 缺失会导致标题显示占位或空字符串
- 性能/成本：无变化
- 部署风险：低，纯文案接线变更

## How to test
1. Run Forecast 后查看 72h 卡片标题是否正常显示
2. 切换 CN/EN，确认 72h 卡片标题随语言变化

## Rollback plan
- 回退本次提交即可恢复为上一版本

## Open questions / follow-ups
- Unverified：本地未执行运行时 missing key 观测

## R4-2 preflight：Upstream 与 Delivery 文案 key 化

### 变更摘要
- Upstream Status：云量行、月角行、更新时间行改用 T1_SW_* 模板 key。
- Delivery Model：Bt平台/速度背景/密度结构标签改用 T3_DELIVER_* key。

### 验证点
1) 切 EN：Upstream Status 三行不再出现中文（Unverified）。
2) 切 EN：Delivery Model 行显示英文标签（Unverified）。

## R4-2 preflight：delivery/72h 中文行 key 化

### 变更摘要
- “1/3 成立”改为 `DELIVERY_RATIO_OK` 模板 key。
- 72h 解释行标签与数值说明改为 `OUTLOOK72_*` key（含模板 value）。

### 验证点
1) 切 EN：Solar Wind Delivery Model 区域不再出现中文（Unverified）。
2) 72H Outlook 三张卡片解释行均为英文占位（Unverified）。

## R4-2 preflight A1 运行时核查
- 动作序列：CN/EN 切换、打开/关闭工具介绍、Run Forecast、点击获取当前位置、关闭 alert（X/知道了）
- 结果：A1=0（用户手动核查）

## R4-2 preflight：定位 alerts key 化
- 覆盖分支：不支持定位 / 无效坐标 / 处理异常 / 权限拒绝 / 不可用 / 超时 / 通用失败 / 异常
- 新增 key：ALERT_GEO_*（title/body/note）
- 结果：A1=0（用户手动核查）

## R4-2 E cleanup：接线已有 key（消除硬编码中文）

### 变更摘要
- swAux placeholder 移除“云 L/M/H”“月角”硬编码，保留占位符。
- 1h 主因 fallback 改为使用 REASON_SKY_TOO_BRIGHT_WEAK_AURORA_HARD_TO_SEE。
- 3h fallback label 改用 STATUS_C*（不再硬编码“值得出门/可蹲守/低概率/不可观测”）。

### 验证点
1) Run Forecast 后：1h 主因与 3h 小时卡结论在 EN 下不出现中文（Unverified）。
2) 切 CN/EN：swAux 占位不出现中文标签（Unverified）。

## R4-2 文案候选清单（扫雷证据）

### 变更摘要
- 新增 `R4-2_UI_TEXT_CANDIDATES.md` 作为中文残留候选清单（仅文档，不改代码逻辑）。

### 验证点
1) 确认新增文件已纳入版本控制。
2) 本轮无代码改动。

## R4-2 A-1：定位精度 + 时间相对 + OVATION 失败 + 云量评分

### 变更摘要
- 定位精度后缀改为 STATUS_TEXT_GEO_ACCURACY_SUFFIX（避免 EN 下中文括号/文案）。
- fmtAge 改为 UI_TIMEAGO_* 模板 key（刚刚/分钟前/小时前）。
- OVATION “失败”改为 T1_OVATION_STATUS_FAIL。
- 72h 云量评分优/中/差改为 UI_72H_CLOUD_GRADE_*。

### 验证点
1) 切 EN：不再出现“刚刚/分钟前/小时前/失败/优中差/精度约”等中文。
2) Run Forecast：72h 云量评分与定位精度后缀显示英文，console 无 missing key。
