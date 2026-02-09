#### 0. 本次变更一句话
- 移除 FMI 数据源并同步版本号。

#### 1. 改动范围（Scope）
**1.1 改了什么**
- dataProvider.js：删除 FMI 常量、fetchFmiHint 与对应 ledger 记录。
- app.js：移除 realtime 链路中的 FMI 调用与合并字段。
- style.css：移除与 FMI 相关的注释文案。
- Lately-PRD.md：移除文档中 FMI 提及。
- index.html：静态资源版本号升级到 `0326`。
- i18n.js：页脚版本号同步为 `v3.0.0326`。
- REVIEW.md：更新为本轮 FMI 移除与版本号更新说明。

**1.2 明确没改什么（Hard No）**
- NOAA/SWPC/RTSW/OVATION 的数据源与判断阈值
- 太阳风/KP/OVATION 的业务逻辑与 UI 文案
- 审计页 UI 结构（audit.js 未改）

#### 2. 行为变化（Behavior Change）
- Before：系统包含 FMI R-index 拉取与审计条目。
  After：FMI 完全移除，不再发起请求或出现在台账。
- Before：realtime 合并链路包含 FMI hint。
  After：realtime 仅依赖 NOAA/SWPC/RTSW 等既有链路。
- Before：审计台账可能出现 fmi_hint。
  After：台账不再出现 FMI 相关条目。
- Before：资源版本号为 `0325`。
  After：资源版本号统一为 `0326`，页脚版本同步更新。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：移除 FMI 后误影响主链路状态（Unverified）。
  触发条件：误删与 NOAA/RTSW 共享的合并逻辑。
  护栏：仅删除 FMI 专属路径与调用点，不触碰 NOAA/RTSW 逻辑。
- 风险：遗留引用导致运行时报错（Unverified）。
  触发条件：删除函数但未移除调用点。
  护栏：全局搜索 FMI 关键字并逐处确认。
- 风险：版本号更新不一致。
  触发条件：只更新 index.html 或 i18n.js。
  护栏：本轮同步更新两处并列入验收。

#### 4. 验收清单（Acceptance Checklist）
- [ ] 全局搜索 FMI 关键字无运行时代码残留（见下方证据）（Pass/Fail）
- [ ] 预览/生产环境不再发起 FMI 请求（需在浏览器 Network 验证）（Pass/Fail）
- [ ] Audit Ledger 不再出现 fmi/fmi_hint 相关条目（需在审计页验证）（Pass/Fail）
- [ ] Solar wind/KP/OVATION 行为与现状一致（Pass/Fail）
- [ ] 版本号在 index.html 与 i18n.js 中一致为 `0326`（Pass/Fail）

**执行版证据**
A) 全局无残留（rg 结果）
- 命中仅剩以下非运行时位置：
  - `REVIEW.md`（本说明文档）
- 运行时代码（app.js/dataProvider.js/audit.js 等）无 FMI 命中。

B) 无网络请求（浏览器证据，Unverified）
- 需在预览站打开 DevTools → Network，触发一次预测/审计刷新，确认无 `space.fmi.fi` 请求。

C) 主链路不受影响（浏览器证据，Unverified）
- 审计页刷新后应无 `fmi`/`fmi_hint` 条目；Solar wind/KP/OVATION 指示灯与现状一致。

#### 5. 回滚方案（Rollback）
- 执行 `git revert <本次提交SHA>` 回滚本轮改动。
