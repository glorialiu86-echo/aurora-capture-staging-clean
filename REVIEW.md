#### 0. 本次变更一句话
- 同步测试分支推送目标为 clean/main。

#### 1. 改动范围（Scope）
**1.1 改了什么**
- AGENTS.md：在分支规则中明确测试发布目标为 clean remote 的 main 分支。
- REVIEW.md：重写为本轮分支/推送规则同步说明。

**1.2 明确没改什么（Hard No）**
- 业务逻辑与数据流程
- 前台 UI 结构与文案
- 版本号与发布流程

#### 2. 行为变化（Behavior Change）
- Before：测试分支仅描述为 staging-clean，未明确推送目标分支。
  After：明确测试发布目标为 clean/main。
- Before：测试分支推送目标不清晰。
  After：规则中明确 push 目标为 clean remote 的 main。
- Before：分支治理规则对部署分支描述不完整。
  After：分支治理规则包含部署分支指向。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：规则描述遗漏导致执行混乱。
  触发条件：未明确测试发布的目标分支。
  护栏：在 Branch 规则中新增明确表述。
- 风险：误解为修改了业务流程（Unverified）。
  触发条件：文档更新被误读为逻辑变更。
  护栏：本轮仅改 AGENTS.md 与 REVIEW.md。

#### 4. 验收清单（Acceptance Checklist）
- [ ] AGENTS.md 的 Branch 规则明确 clean/main 为测试发布目标（Pass/Fail）
- [ ] 仅 AGENTS.md 与 REVIEW.md 发生变更（Pass/Fail）
- [ ] 其他代码与配置未改动（Pass/Fail）

#### 5. 回滚方案（Rollback）
- 执行 `git revert <本次提交SHA>` 回滚本次文档同步。
