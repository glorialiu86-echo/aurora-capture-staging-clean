# FRONTEND Behavior Baseline (A1)

## 用户感知断言（必须保持不变）
- A1-01：点击 `Run` 会触发 4 组数据流程：`realtime(solar wind)`、`kp`、`ovation`、`clouds`。
- A1-02：Solar wind 状态点映射保持：`OK -> ✅`、`DEGRADED -> ⚠️`、其他状态（含 OUTAGE/空）`-> ❌`。
- A1-03：`kp` 请求失败时：若 `localStorage cache_kp` 存在，则状态为 `warn(⚠️)` 并继续使用缓存数据。
- A1-04：`kp` 请求失败且无缓存时：状态为 `bad(❌)`，数据为 `null`。
- A1-05：`ovation` 请求失败时：若 `localStorage cache_ovation` 存在，则状态为 `warn(⚠️)` 并继续使用缓存数据。
- A1-06：`ovation` 请求失败且无缓存时：状态为 `bad(❌)`，数据为 `null`。
- A1-07：`clouds` 请求失败时：若位置缓存存在（`cache_clouds_{lat2}_{lon2}`），则状态为 `warn(⚠️)` 并继续使用缓存数据。
- A1-08：`clouds` 请求失败且无缓存时：状态为 `bad(❌)`，数据为 `null`。
- A1-09：solar wind 保留现有 LKG（last-known-good）回填行为，不改变顺序与结果。
- A1-10：页面加载后仍执行一次顶层 realtime 调用（不依赖点击 Run）。

## 手动验收步骤
1. 正常打开页面，未点击 `Run` 时观察控制台：应存在一次 realtime 顶层调用日志（若当前版本保留该日志）。
2. 输入合法经纬度，点击 `Run`，观察 Network：应出现 realtime + kp + ovation + clouds 的请求。
3. 人为阻断 kp 接口并保留 `cache_kp` 后点击 `Run`：kp 状态应为 `⚠️`；清空 `cache_kp` 后再次点击应为 `❌`。
4. 人为阻断 ovation 接口并保留 `cache_ovation` 后点击 `Run`：ovation 状态应为 `⚠️`；清空缓存后应为 `❌`。
5. 人为阻断 clouds 接口并保留当前位置缓存后点击 `Run`：clouds 状态应为 `⚠️`；清空对应缓存后应为 `❌`。
6. 在实时源异常场景下重复点击 `Run`：solar wind 仍按现有逻辑走 LKG 回填，不出现新行为分支。
7. 在 `OK / DEGRADED / OUTAGE(或空)` 三种 realtime 状态样本下，核对 Solar wind 状态点是否仍为 `✅ / ⚠️ / ❌`。
