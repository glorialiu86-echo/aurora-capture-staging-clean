#### 0. 本次变更一句话
- 品牌标题统一为单一节点渲染并同步版本号到 0322

#### 1. 改动范围（Scope）
**1.1 改了什么**
- index.html：品牌标题改为单一 .brandMain 节点，并将所有 ?v=0321 更新为 ?v=0322
- ui.js：applyLang 改为统一写入 .brandMain 文案（移除 brandEn/brandCn 逻辑）
- i18n.js：UI_FOOTER_BLOCK 版本号更新为 v3.0.0322
- REVIEW.md：记录本次 UI 结构与版本号更新

**1.2 明确没改什么（Hard No）**
- 预测流程与模型逻辑
- i18n 体系与 key 集（未新增/未改 key）
- 其他 header/footer/about 结构与交互
- CSS 与样式规则

#### 2. 行为变化（Behavior Change）
- Before：标题用 brandEn/brandCn 双节点切换
  After：标题改为单一 .brandMain 节点切换文案
- Before：CN/EN 标题可能有颜色与紧凑度差异
  After：CN/EN 标题视觉一致（沿用现有 EN 表现）
- Before：静态资源缓存参数为 ?v=0321
  After：静态资源缓存参数为 ?v=0322
- Before：页脚显示 v3.0.0321
  After：页脚显示 v3.0.0322

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：.brandMain 未渲染导致标题为空
  触发条件：DOM 未更新或选择器不匹配
  护栏：index.html 已替换为单一节点，applyLang 仅写入该节点
- 风险：HDR_TITLE_BRAND 被 data-i18n 自动渲染覆盖
  触发条件：renderNode 未跳过 HDR_TITLE_BRAND
  护栏：保留了 if(key === "HDR_TITLE_BRAND") return;（Unverified）
- 风险：版本号更新不一致
  触发条件：index.html 与 UI_FOOTER_BLOCK 版本号不同步
  护栏：本次两处统一为 0322，并在验收清单固定核对

#### 4. 验收清单（Acceptance Checklist）
- [ ] 切换 CN/EN，标题文案正确切换且颜色/字重/紧凑度一致（Pass/Fail）
- [ ] DOM 中仅存在一个 .brandMain，且不存在 brandEn/brandCn（Pass/Fail）
- [ ] Console 无 i18n missing key 与 JS error（Pass/Fail）
- [ ] 资源 URL 参数为 ?v=0322，页脚显示 v3.0.0322（Pass/Fail）
- [ ] 其他 header/footer/about 行为未变化（Not in scope）

#### 5. 回滚方案（Rollback）
- 回滚本次提交（revert 对应 commit）
