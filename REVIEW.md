#### 0. 本次变更一句话
- 收口请求入口并加入审计台账，同时同步版本号与分支规则。

#### 1. 改动范围（Scope）
**1.1 改了什么**
- app.js：realtime 数据入口改为调用 DataProvider；等价逻辑与输出保持不变。
- ui.js：kp/ovation/clouds 仍返回相同结构与 note 语义，仅改为转调 DataProvider。
- dataProvider.js：新增统一入口与台账记录；集中处理 rtsw/mirror/fmi/kp/ovation/clouds 请求与样本摘要。
- requestPolicy.js：新增统一请求封装（timeout/no-store/错误结构）。
- audit.js：新增 `?audit=1` 隐藏审计页逻辑，仅解锁后渲染台账。
- index.html：新增审计容器与脚本引用；版本号统一到 `0324`。
- i18n.js：页脚版本号更新为 `v3.0.0324`。
- adapter.js：标注 legacy/unused，保留导出。
- FRONTEND_BEHAVIOR_BASELINE.md：新增前台行为基线断言与验收步骤。
- AGENTS.md：测试分支命名同步为 `staging-clean`。
- REVIEW.md：重写为本轮提交汇总。

**1.2 明确没改什么（Hard No）**
- 业务阈值与模型逻辑
- statusKey 与前台文案
- 数据源域名与 fallback 顺序
- 顶层 realtime 调用与 Run 按钮行为

#### 2. 行为变化（Behavior Change）
- Before：请求入口分散在 app.js/ui.js。
  After：请求入口统一在 DataProvider，前台结果保持一致。
- Before：无审计台账页面。
  After：`?audit=1` 可解锁只读台账（默认不触发新请求）。
- Before：请求层错误信息无统一结构。
  After：requestPolicy 统一返回 `{ok,httpStatus,errorType,errorMsg,latencyMs,fetchedAt}`。
- Before：版本号为 `0323`。
  After：版本号同步为 `0324`（index.html 与 i18n.js 一致）。
- Before：分支规则中测试分支为 `staging`。
  After：分支规则同步为 `staging-clean`。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：DataProvider 转调导致返回结构变化。
  触发条件：ui.js 的 try/catch 或缓存逻辑被改动。
  护栏：保持原返回结构与 note 语义，仅替换取数语句。
- 风险：审计页误触发新请求。
  触发条件：audit 渲染阶段调用请求函数。
  护栏：audit.js 仅读取台账快照，不调用 DataProvider 拉取。
- 风险：版本号两处不一致。
  触发条件：只更新 index.html 或 i18n.js。
  护栏：本轮同步更新并列入验收。
- 风险：分支规则替换不完整（Unverified）。
  触发条件：遗漏某处 `staging` 文本。
  护栏：全文检索并逐处替换测试分支语义。

#### 4. 验收清单（Acceptance Checklist）
- [ ] 普通访问（无 `?audit=1`）前台行为与基线一致（Pass/Fail）
- [ ] `?audit=1` 未解锁不展示台账；输入 `yoyoyoyo` 后展示（Pass/Fail）
- [ ] 审计页不主动发起新请求（除现有顶层 realtime）（Pass/Fail）
- [ ] kp/ovation/clouds 失败时 fallback 与状态点语义不变（Pass/Fail）
- [ ] solar wind 仍保留 LKG fallback（Pass/Fail）
- [ ] 版本号已同步为 `0324`（index.html 与 i18n.js 一致）（Pass/Fail）
- [ ] 分支规则已更新为 `staging-clean`（Pass/Fail）

#### 5. 回滚方案（Rollback）
- 依次 `git revert` 本次将要 push 的提交序列即可回滚。
