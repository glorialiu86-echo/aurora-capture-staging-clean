#### 0. 本次变更一句话
- 同步提升缓存与页脚版本号到 0321，并完成 i18n 静态审计

#### 1. 改动范围（Scope）
**1.1 改了什么**
- index.html：所有 ?v=0320 统一更新为 ?v=0321
- i18n.js：UI_FOOTER_BLOCK 版本号文本更新为 v3.0.0321
- REVIEW.md：记录版本纪律与 i18n 审计结果

**1.2 明确没改什么（Hard No）**
- 预测流程与模型逻辑
- 翻译规则与文案内容（除版本号）
- About/Modal 结构与交互

#### 2. 行为变化（Behavior Change）
- Before：静态资源缓存参数为 ?v=0320
  After：静态资源缓存参数为 ?v=0321
- Before：页脚显示 v3.0.0320
  After：页脚显示 v3.0.0321
- Before：版本号一致性未覆盖 UI_FOOTER_BLOCK
  After：版本号一致性规则纳入页脚与缓存参数同时更新

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：漏改任一处版本号导致不一致
  触发条件：commit/push 时只改一处
  护栏：本次已同步 +1，并在 Review 中固定记录版本纪律
- 风险：静态审计覆盖不足
  触发条件：运行态翻译缺失未被静态扫描发现
  护栏：本次仅做静态审计，运行检查标记为 Unverified

#### 4. 验收清单（Acceptance Checklist）
- [ ] 打开页面，页脚版本号显示 v3.0.0321（Pass/Fail）
- [ ] 刷新页面后资源加载 URL 参数为 ?v=0321（Pass/Fail）
- [ ] 静态审计结果核对：重复 key=0、template param 不匹配=0、type=html 仅 UI_ABOUT_BODY/UI_FOOTER_BLOCK（Pass/Fail）
- [ ] 运行审计（获取位置/Run forecast/About/语言切换）本次为 Not in scope

#### 5. 回滚方案（Rollback）
- 回滚本次提交（revert 对应 commit）
