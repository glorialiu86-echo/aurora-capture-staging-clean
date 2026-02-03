#### 0. 本次变更一句话
- 版本号从0322统一升级到0323

#### 1. 改动范围（Scope）
**1.1 改了什么**
- index.html：将现有静态资源缓存参数 `?v=0322` 统一改为 `?v=0323`。
- i18n.js：将 `UI_FOOTER_BLOCK` 的中英文版本文案从 `v3.0.0322` 更新为 `v3.0.0323`。
- REVIEW.md：重写为本轮版本号升级说明。

**1.2 明确没改什么（Hard No）**
- 预测流程与模型逻辑
- 数据结构与接口字段
- 页面布局与交互行为
- 任何非版本号文案与样式

#### 2. 行为变化（Behavior Change）
- Before：资源链接版本参数为 `?v=0322`。
  After：资源链接版本参数为 `?v=0323`。
- Before：页脚展示版本号为 `v3.0.0322`。
  After：页脚展示版本号为 `v3.0.0323`。
- Before：版本号两处为 0322。
  After：版本号两处保持一致并同步为 0323。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：版本号只更新一处导致不一致。
  触发条件：仅改 `index.html` 或仅改 `i18n.js`。
  护栏：本次同步更新两处并在提交前复核。
- 风险：误改非版本号数字。
  触发条件：批量替换范围过大。
  护栏：仅替换已存在版本位点（资源参数与页脚版本文案）。
- 风险：缓存未刷新导致仍加载旧资源（Unverified）。
  触发条件：浏览器或 CDN 缓存策略。
  护栏：通过 `?v=0323` 强制静态资源缓存失效。

#### 4. 验收清单（Acceptance Checklist）
- [ ] 查看页面源码，`index.html` 中所有现有 `?v=` 参数均为 `0323`（Pass/Fail）
- [ ] 打开页面底部，中英文版本号均显示 `v3.0.0323`（Pass/Fail）
- [ ] 预测结果、页面交互与布局无变化（Pass/Fail）
- [ ] 非版本号模块（模型、数据、流程）未改动（Pass/Fail）

#### 5. 回滚方案（Rollback）
- 执行 `git revert <本次提交SHA>` 回滚本轮版本号升级。

---

## Step 1（A1 前台行为基线）

#### 0. 本次变更一句话
- 新增前台行为基线断言文档。

#### 1. 改动范围（Scope）
**1.1 改了什么**
- FRONTEND_BEHAVIOR_BASELINE.md：新增 10 条用户感知断言与手动验收步骤。
- REVIEW.md：追加 Step 1 变更与验收记录。

**1.2 明确没改什么（Hard No）**
- app.js/ui.js/model.js 业务逻辑
- 任何请求地址、阈值、状态映射、文案
- 页面结构、样式、交互流程

#### 2. 行为变化（Behavior Change）
- Before：无 A1 基线断言文档。
  After：新增可手动验收的行为断言清单。
- Before：前台运行行为由代码隐式定义。
  After：前台运行行为被显式记录为可核对基线。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：文档描述与真实行为偏差。
  触发条件：后续代码变更但未同步更新基线文档。
  护栏：将断言写为可手动复现步骤，便于回归核对。
- 风险：误触发代码改动。
  触发条件：在编写文档时修改 JS/HTML 文件。
  护栏：本步仅新增 markdown 与 REVIEW 追加，无代码改动。

#### 4. 验收清单（Acceptance Checklist）
- [ ] `FRONTEND_BEHAVIOR_BASELINE.md` 存在并包含 5-10 条用户感知断言（Pass/Fail）
- [ ] 文档覆盖 Run 触发、状态映射、kp/ovation/clouds fallback、solar wind LKG、顶层 realtime 调用（Pass/Fail）
- [ ] 本步无 JS/HTML/CSS 逻辑改动（Pass/Fail）

#### 5. 回滚方案（Rollback）
- 执行 `git revert <Step 1 提交SHA>` 回滚本步文档变更。

---

## Step 2（B3 DataProvider 单点入口）

#### 0. 本次变更一句话
- 收口前端请求入口到 DataProvider，保持前台行为不变。

#### 1. 改动范围（Scope）
**1.1 改了什么**
- dataProvider.js：新增统一请求入口，承载 realtime/mirror/fmi/kp/ovation/clouds 的 fetch 实现。
- app.js：`_fetchRtsw1m/_fetchMirrorProducts/_fetchFmiHint` 与 plasma 回溯请求改为转调 `window.DataProvider`。
- ui.js：`fetchKp/fetchOvation/fetchClouds` 改为转调 `window.DataProvider`；保留原返回结构与 note/fallback 语义。
- index.html：新增 `dataProvider.js` 的 defer 脚本引用，不改现有 UI 结构。
- adapter.js：增加 legacy/unused 注释，保留 `window.getRealtimeState` 导出。
- REVIEW.md：追加 Step 2 记录。

**1.2 明确没改什么（Hard No）**
- 数据源域名与 URL
- fallback 顺序与业务判断阈值
- statusKey、文案、UI 结构与元素 id
- 顶层 realtime 调用与 Run 按钮触发方式

#### 2. 行为变化（Behavior Change）
- Before：app.js/ui.js 内部直接发起 fetch。
  After：app.js/ui.js 仅调用 DataProvider，前台结果保持一致。
- Before：`window.Data.fetch*` 为直接请求实现。
  After：`window.Data.fetch*` 作为兼容入口转调 DataProvider，返回结构不变。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：ui.js 的 `ok/warn/bad + data` 返回结构被改变。
  触发条件：转调后误改 catch/fallback 逻辑。
  护栏：保持原 `try/catch + cache fallback + note` 结构，仅替换取数语句。
- 风险：DataProvider 不可用导致流程中断。
  触发条件：脚本加载顺序错误或对象未挂载。
  护栏：index.html 在 ui/app 前引入 `dataProvider.js`；调用点保留 unavailable 兜底错误分支。
- 风险：realtime 行为改变（Unverified）。
  触发条件：realtime 入口迁移后输出对象形态偏差。
  护栏：DataProvider 复用原逻辑与字段名，app 侧 merge/status 逻辑未改。

#### 4. 验收清单（Acceptance Checklist）
- [ ] `app.js` 与 `ui.js` 不再直接 `fetch(` 外部 URL（Pass/Fail）
- [ ] `window.Data.fetchKp/fetchOvation/fetchClouds` 返回结构与 note 语义保持不变（Pass/Fail）
- [ ] Run 后四类数据仍按原流程刷新，状态点表现不变（Pass/Fail）
- [ ] 顶层 realtime 调用仍保留且可执行（Pass/Fail）
- [ ] `adapter.js` 保留 `window.getRealtimeState` 且已标记 legacy（Pass/Fail）

#### 5. 回滚方案（Rollback）
- 执行 `git revert <Step 2 提交SHA>` 回滚本步收口改动。
