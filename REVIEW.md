#### 0. 本次变更一句话
- 预览站审计入口放行并同步版本号。

#### 1. 改动范围（Scope）
**1.1 改了什么**
- audit.js：预览环境放行规则（audit=1/AUDIT_MODE/ac_auth_stub）并保持生产门禁不变。
- index.html：静态资源版本号统一升级到 `0325`。
- i18n.js：页脚版本号同步为 `v3.0.0325`。
- REVIEW.md：重写为本轮审计入口与版本号更新说明。

**1.2 明确没改什么（Hard No）**
- 业务判断逻辑（极光/云量/数据源/阈值）
- 数据拉取与缓存顺序
- UI 文案与布局结构（除页脚版本号）

#### 2. 行为变化（Behavior Change）
- Before：预览站仅在 `?audit=1` 时进入审计模式。
  After：预览站 `audit=1` / `AUDIT_MODE` / `ac_auth_stub` 任一满足即可进入审计模式。
- Before：生产与预览环境门禁一致。
  After：生产环境保持原门禁；预览环境放行规则独立。
- Before：资源版本号为 `0324`。
  After：资源版本号统一为 `0325`，页脚版本同步更新。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：预览放行条件误作用于生产（Unverified）。
  触发条件：host 判定不准确。
  护栏：严格匹配 hostname 与 pathname。
- 风险：localStorage flag 解析不一致。
  触发条件：flag 值形态多样。
  护栏：兼容 "1"/"true"/JSON true。
- 风险：版本号更新不一致。
  触发条件：只更新 index.html 或 i18n.js。
  护栏：本轮同步更新两处并列入验收。

#### 4. 验收清单（Acceptance Checklist）
- [ ] 预览站 `?audit=1` 可进入审计模式并写入 `AUDIT_MODE=1`（Pass/Fail）
- [ ] 预览站移除参数但 `AUDIT_MODE=1` 仍可进入审计模式（Pass/Fail）
- [ ] 生产/非预览环境行为保持原门禁（Pass/Fail）
- [ ] 版本号在 index.html 与 i18n.js 中一致为 `0325`（Pass/Fail）
- [ ] 仅 audit.js/index.html/i18n.js/REVIEW.md 发生变更（Pass/Fail）

#### 5. 回滚方案（Rollback）
- 执行 `git revert <本次提交SHA>` 回滚本轮改动。
