#### 0. 本次变更一句话
- 修复 NOAA Mirror workflow 的 URL 为空问题。

#### 1. 改动范围（Scope）
**1.1 改了什么**
- .github/workflows/noaa-mirror.yml：为 NOAA_URL / NOAA_MAG_URL 增加默认值与空值硬失败护栏。
- REVIEW.md：更新为本轮 workflow 修复与证据说明。

**1.2 明确没改什么（Hard No）**
- 前端取数与业务逻辑
- NOAA/RTSW/OVATION/KP 的调用路径
- 其他 workflows 或配置

#### 2. 行为变化（Behavior Change）
- Before：NOAA_URL/NOAA_MAG_URL 为空导致 curl 失败，mirror 不更新。
  After：URL 为空时使用默认 NOAA 5-minute 产品，仍为空则硬失败。
- Before：镜像更新仅依赖 secrets 配置。
  After：默认值确保无 secrets 也可运行。

#### 3. 风险与护栏（Risk & Guardrails）
- 风险：默认 URL 不符合期望产品（Unverified）。
  触发条件：需要不同分辨率或产品。
  护栏：默认使用官方 5-minute plasma/mag 产品，需时可调整为自定义 URL。
- 风险：workflow 仍未写入 clean/main（Unverified）。
  触发条件：Actions 运行失败或权限不足。
  护栏：需执行 workflow_dispatch 并核对 run 结果与 commit。

#### 4. 验收清单（Acceptance Checklist）
- [ ] Actions 运行时日志显示 NOAA_URL/NOAA_MAG_URL 为非空 URL（Pass/Fail）
- [ ] “Fetch NOAA data” 步骤成功（Pass/Fail）
- [ ] “Commit & push if changed” 成功或显示 No changes（Pass/Fail）
- [ ] noaa/*.json 在 clean/main 上更新时间刷新（Pass/Fail）

**执行版证据（待补充）**
- 请提供 workflow_dispatch 的 run 链接或截图，包含：
  - NOAA_URL / NOAA_MAG_URL 的输出
  - Fetch / Wrap / Commit 步骤状态

#### 5. 回滚方案（Rollback）
- 执行 `git revert <本次提交SHA>` 回滚本轮 workflow 修复。

**执行前自检输出**
1) git status -sb
```
## clean-main...clean/main
 M .github/workflows/noaa-mirror.yml
 M REVIEW.md
```
2) git remote -v
```
clean	https://github.com/glorialiu86-echo/aurora-capture-staging-clean.git (fetch)
clean	https://github.com/glorialiu86-echo/aurora-capture-staging-clean.git (push)
origin	https://github.com/glorialiu86-echo/aurora-capture.git (fetch)
origin	DISABLED (push)
```
3) git branch --show-current
```
clean-main
```
