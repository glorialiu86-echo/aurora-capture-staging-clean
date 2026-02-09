#### 0. 本次变更一句话
- 更新测试分支与部署分支规则到 clean/main。

#### 1. 改动范围（Scope）
**1.1 改了什么**
- AGENTS.md：明确 staging-clean 为本地/测试分支，部署目标为 clean/main。
- REVIEW.md：重写为本轮规则同步说明。

**1.2 明确没改什么（Hard No）**
- 业务逻辑与数据流程
- 前台 UI 结构与文案
- 版本号与发布流程

#### 2. 行为变化（Behavior Change）
- Before：测试分支与部署分支关系不清晰。
  After：明确 staging-clean 为工作分支，部署目标为 clean/main。
- Before：规则未指向测试发布目标仓库分支。
  After：规则明确 clean/main 为测试发布分支。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：规则描述仍有歧义（Unverified）。
  触发条件：分支职责理解不一致。
  护栏：用明确表述区分工作分支与部署分支。

#### 4. 验收清单（Acceptance Checklist）
- [ ] AGENTS.md 中 staging-clean 与 clean/main 规则表述正确（Pass/Fail）
- [ ] 仅 AGENTS.md 与 REVIEW.md 发生变更（Pass/Fail）

#### 5. 回滚方案（Rollback）
- 执行 `git revert <本次提交SHA>` 回滚本次文档同步。
