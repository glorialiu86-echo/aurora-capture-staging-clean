#### 0. 本次变更一句话
- 同步测试分支命名为 `staging-clean`。

#### 1. 改动范围（Scope）
**1.1 改了什么**
- AGENTS.md：将测试分支描述与工作流中的 `staging` 统一改为 `staging-clean`。
- REVIEW.md：重写为本轮分支规则同步说明。

**1.2 明确没改什么（Hard No）**
- 业务逻辑与数据流程
- 前台 UI 结构与文案
- 版本号与发布流程

#### 2. 行为变化（Behavior Change）
- Before：测试分支在规则中标记为 `staging`。
  After：测试分支在规则中标记为 `staging-clean`。
- Before：工作流要求在 `staging` 实施。
  After：工作流要求在 `staging-clean` 实施。
- Before：分支命名与实际使用不一致。
  After：分支命名与实际使用对齐。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：遗漏某处 `staging` 描述导致规则不一致。
  触发条件：文本替换不完整。
  护栏：全文检索 `staging` 并逐条替换测试分支语义。
- 风险：误改非分支语义（Unverified）。
  触发条件：替换覆盖到 `aurora-capture-staging` 等非分支标识。
  护栏：仅替换明确指向测试分支的行，保留 URL 文本。

#### 4. 验收清单（Acceptance Checklist）
- [ ] `AGENTS.md` 的测试分支描述全部为 `staging-clean`（Pass/Fail）
- [ ] `Workflow Summary` 中步骤 2 为 `staging-clean`（Pass/Fail）
- [ ] 其他文件未改动（Pass/Fail）

#### 5. 回滚方案（Rollback）
- 执行 `git revert <本次提交SHA>` 回滚本次规则同步。
