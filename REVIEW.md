#### 0. 本次变更一句话
- 三处 UI 对齐：按钮等宽、因素条满宽、72h 去大面板

#### 1. 改动范围（Scope）
**1.1 改了什么**
- index.html：`#t72` 中移除 `card hero` 外层与两行文案，仅保留 `#daysTri` 三张日卡并提升为 pane 直接子元素。
- style.css：` .actions` 增加 `width:100%`，并给 `.actions .btn` 增加 `flex:1 1 0; min-width:0;`，实现同排等宽撑满。
- style.css：`#oneBlockers .blockerExplain` 增加 `display:block; width:100%;`（带 `!important`），确保主要影响因素条横向铺满。
- REVIEW.md：重写为本轮改动说明。

**1.2 明确没改什么（Hard No）**
- 预测计算/评分/状态判断逻辑
- 数据结构、i18n key、API 与模型流程
- 其他页面模块的文案与交互行为
- 依赖与构建配置

#### 2. 行为变化（Behavior Change）
- Before：顶部两个按钮宽度由内容决定，可能不等宽。
  After：按钮在同一行时等宽并横向撑满容器，窄屏允许换行。
- Before：「主要影响因素」背景条在部分场景呈现短条感。
  After：背景条固定横向占满 `#oneBlockers` 可用宽度。
- Before：「未来3天」有一层 `card hero` 大面板，并显示标题与说明文案。
  After：仅保留三张日卡容器 `#daysTri`，无大底板、无标题/说明两行文字。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：按钮文本过长时视觉拥挤。
  触发条件：极窄屏或语言切换后文本更长。
  护栏：保留 `flex-wrap: wrap`，并使用 `min-width:0` 防止挤压溢出。
- 风险：`#oneBlockers` 未来若改为复杂布局，满宽规则可能影响内部排版。
  触发条件：后续在该容器内增加多列结构。
  护栏：本次仅对 `.blockerExplain` 设满宽，不改颜色/圆角体系（Unverified）。
- 风险：移除 `#t72` 外层 `card hero` 后，页签顶部间距感受变化。
  触发条件：不同设备对 `#t72` 现有 padding 呈现不同。
  护栏：未新增间距样式，保持现有 `#t72` 顶部规则不变。

#### 4. 验收清单（Acceptance Checklist）
- [ ] 桌面宽屏：顶部两按钮同一行、等宽、左右贴齐卡片内边距且中间有 gap（Pass/Fail）
- [ ] 窄屏：顶部两按钮可自动换行且无挤压溢出（Pass/Fail）
- [ ] 1小时卡片中「主要影响因素」背景条横向铺满内容区（Pass/Fail）
- [ ] 切换到「未来3天」仅见三张日卡，无大底板且无标题/说明文案（Pass/Fail）
- [ ] 版本号联动更新（index.html + i18n.js）本轮未执行 commit/push，Not in scope

#### 5. 回滚方案（Rollback）
- 回滚本次提交（revert 对应 commit）即可恢复原 UI 结构与样式。
