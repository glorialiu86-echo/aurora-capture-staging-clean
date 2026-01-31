// i18n.js (Phase 1 Round 2: static UI texts)
(() => {
  const STORAGE_KEY = "ac_lang"; // reuse existing storage key
  let currentLang = "zh";

  const resources = {
    // --- meta / header ---
    META_TITLE: { type: "text", zh: "Aurora Capture 极光捕手", en: "Aurora Capture" },
    META_DESC: { type: "text", zh: "现在要不要出门追光？一键给出观测窗口", en: "Should you go out for aurora tonight? One-click viewing guidance." },
    META_OG_DESC: { type: "text", zh: "现在要不要出门追光？一键给出观测窗口", en: "Should you go out for aurora tonight? One-click viewing guidance." },

    HDR_TITLE_BRAND: { type: "text", zh: "极光捕手", en: "Aurora Capture" },
    HDR_LOGO_ALT: { type: "text", zh: "Aurora Capture logo", en: "Aurora Capture logo" },
    HDR_BTN_ABOUT: { type: "text", zh: "📖 工具介绍", en: "📖 User Guide" },
    HDR_BTN_ABOUT_ARIA: { type: "text", zh: "工具介绍", en: "User Guide" },
    HDR_LANG_TOGGLE_ARIA: { type: "text", zh: "语言", en: "Language" },
    HDR_LANG_CN_LABEL: { type: "text", zh: "CN", en: "CN" },
    HDR_LANG_EN_LABEL: { type: "text", zh: "EN", en: "EN" },

    // --- about modal ---
    ABOUT_MODAL_TITLE: { type: "text", zh: "📖 工具介绍", en: "📖 User Guide" },
    ABOUT_CLOSE_ARIA: { type: "text", zh: "关闭", en: "Close" },

    // --- form ---
    FORM_LABEL_LAT: { type: "text", zh: "纬度 Latitude", en: "Latitude" },
    FORM_LABEL_LON: { type: "text", zh: "经度 Longitude", en: "Longitude" },
    FORM_PLACEHOLDER_LAT: { type: "text", zh: "例如 53.47", en: "e.g. 53.47" },
    FORM_PLACEHOLDER_LON: { type: "text", zh: "例如 122.35", en: "e.g. 122.35" },
    FORM_BTN_GEO: { type: "text", zh: "📍 获取当前位置", en: "📍 Get Location" },
    FORM_BTN_RUN: { type: "text", zh: "✍️ 生成即时预测", en: "✍️ Run Forecast" },
    FORM_BTN_PREDICT: { type: "text", zh: "✍️ Run Forecast", en: "✍️ Run Forecast" },
    FORM_GEO_HINT_SUMMARY: { type: "text", zh: "推荐直接“获取当前位置”，也可手动输入经纬度", en: "We recommend using \"Get Location\". You can also enter coordinates manually." },
    FORM_GEO_HINT_BODY_MAIN: {
      type: "text",
      zh: "目的地经纬度：可通过奥维地图长按获取，或使用腾讯地图坐标拾取器（网页端）：https://lbs.qq.com/getPoint/。",
      en: "To get destination coordinates, right-click a point in Google Maps to copy the latitude and longitude. You can also use any online coordinate picker."
    },

    // --- status row ---
    STATUS_ROW_ARIA: { type: "text", zh: "数据状态", en: "Data status" },
    STATUS_TEXT_WAITING: { type: "text", zh: "等待生成。", en: "Ready." },
    STATUS_TEXT_FETCHING: { type: "text", zh: "拉取数据中…", en: "Fetching data..." },
    STATUS_TEXT_DONE: { type: "text", zh: "已生成。", en: "Done." },
    STATUS_TEXT_DATA_CONFIDENCE: { type: "text", zh: "⚠️ 数据可信度提醒", en: "⚠️ Data confidence notice" },
    STATUS_TEXT_SW_OUTAGE: { type: "text", zh: "⚠️ 太阳风数据源长时间不可用：已进入弱模式（保守估算）", en: "⚠️ Solar wind data source long outage: weak mode (conservative)" },
    STATUS_TEXT_MLAT_STOP: { type: "text", zh: "⚠️ 磁纬过低：已停止生成。", en: "⚠️ MLAT too low: generation stopped." },
    STATUS_TEXT_SUNCALC_MISSING: { type: "text", zh: "关键计算模块未加载（SunCalc）。", en: "Required module missing (SunCalc)." },
    STATUS_TEXT_INPUT_INVALID: { type: "text", zh: "请先输入有效经纬度。", en: "Please enter valid latitude/longitude." },
    STATUS_TEXT_RANGE_INVALID: { type: "text", zh: "⚠️ 经纬度超出范围", en: "⚠️ Coordinates out of range" },
    STATUS_TEXT_GEO_FETCHING: { type: "text", zh: "📍 正在获取当前位置…", en: "📍 Getting current location..." },
    STATUS_TEXT_GEO_INVALID: { type: "text", zh: "⚠️ 定位返回无效坐标", en: "⚠️ Invalid coordinates returned" },
    STATUS_TEXT_GEO_SUCCESS: { type: "template", params: ["acc"], zh: "已获取当前位置 {acc}", en: "Location acquired {acc}" },
    STATUS_TEXT_GEO_PROCESS_ERR: { type: "text", zh: "⚠️ 定位处理异常", en: "⚠️ Location processing error" },
    STATUS_TEXT_GEO_UNAVAILABLE: { type: "text", zh: "⚠️ 无法获取定位", en: "⚠️ Unable to get location" },
    STATUS_TEXT_RUN_ERROR: { type: "text", zh: "生成失败：请打开控制台查看错误。", en: "Generation failed. Please check console." },
    UI_PREFIX_PRIMARY_FACTOR: { type: "text", zh: "主要影响因素：", en: "Primary factor: " },

    // --- status / reason keys (model outputs) ---
    STATUS_C5: { type: "text", zh: "强烈推荐", en: "Highly Recommended" },
    STATUS_C4: { type: "text", zh: "值得出门", en: "Worth Going Out" },
    STATUS_C3: { type: "text", zh: "可蹲守", en: "Worth Waiting" },
    STATUS_C2: { type: "text", zh: "低概率", en: "Low Probability" },
    STATUS_C1: { type: "text", zh: "不可观测", en: "Not Observable" },

    REASON_CLOUD_COVER_BLOCKS: { type: "text", zh: "天空被云层遮挡，不利于观测", en: "Cloud cover blocks the sky." },
    REASON_SKY_TOO_BRIGHT_WEAK_AURORA_HARD_TO_SEE: { type: "text", zh: "天色偏亮，微弱极光难以分辨", en: "Bright sky. Faint aurora is hard to discern." },
    REASON_ENERGY_INPUT_TOO_WEAK: { type: "text", zh: "能量注入弱，难以形成有效极光", en: "Weak energy coupling. Effective aurora is unlikely." },
    REASON_MLAT_TOO_LOW_STOP: { type: "text", zh: "磁纬过低，已停止生成", en: "MLAT too low. Generation stopped." },

    T3_BURST_STATE_ACTIVE: { type: "text", zh: "爆发进行中", en: "Burst in progress" },
    T3_BURST_STATE_RISING: { type: "text", zh: "爆发概率上升", en: "Burst likelihood rising" },
    T3_BURST_STATE_DECAY: { type: "text", zh: "爆发后衰落期", en: "Post-burst decay" },
    T3_BURST_STATE_QUIET: { type: "text", zh: "静默", en: "Quiet" },
    T3_BURST_HINT_ACTIVE: { type: "text", zh: "离子触发更明确。", en: "Ion triggering is clearer." },
    T3_BURST_HINT_RISING: { type: "text", zh: "系统更容易发生，但未到持续触发。", en: "More likely, but not in sustained triggering yet." },
    T3_BURST_HINT_DECAY: { type: "text", zh: "刚有过波动，仍可能余震一会儿。", en: "Recent fluctuation; aftershocks still possible." },
    T3_BURST_HINT_QUIET: { type: "text", zh: "背景不足或触发不清晰。", en: "Background insufficient or triggers unclear." },

    // --- placeholders / symbols ---
    UI_PLACEHOLDER_DASH: { type: "symbol", value: "—" },
    UI_PLACEHOLDER_ELLIPSIS: { type: "symbol", value: "…" },
    DOT_ICON_OK: { type: "symbol", value: "✅" },
    DOT_ICON_WARN: { type: "symbol", value: "⚠️" },
    DOT_ICON_BAD: { type: "symbol", value: "❌" },

    // --- dot labels ---
    DOT_LABEL_SW: { type: "text", zh: "太阳风", en: "Solar wind" },
    DOT_LABEL_KP: { type: "text", zh: "KP", en: "KP" },
    DOT_LABEL_CLOUDS: { type: "text", zh: "云量", en: "Clouds" },
    DOT_LABEL_OVATION: { type: "text", zh: "OVATION", en: "OVATION" },

    // --- tabs ---
    TAB_T1_LABEL: { type: "text", zh: "1小时精准", en: "1H Precision" },
    TAB_T3_LABEL: { type: "text", zh: "3小时预测", en: "3H Window" },
    TAB_T72_LABEL: { type: "text", zh: "72小时范围", en: "72H Outlook" },

    // --- T1 ---
    T1_HERO_TITLE: { type: "text", zh: "当前建议（1小时内，10分钟粒度）", en: "Current Recommendation (1H, 10-min resolution)" },
    T1_UPSTREAM_TITLE: { type: "text", zh: "上游实况（近实时）", en: "Upstream Status (Near Real-Time)" },
    T1_SW_LABEL_V: { type: "text", zh: "V", en: "V" },
    T1_SW_LABEL_BT: { type: "text", zh: "Bt", en: "Bt" },
    T1_SW_LABEL_BZ: { type: "text", zh: "Bz", en: "Bz" },
    T1_SW_LABEL_N: { type: "text", zh: "N", en: "N" },
    T1_SW_CLOUD_LINE: { type: "template", params: ["l", "m", "h"], zh: "云 L/M/H {l}/{m}/{h}%", en: "Clouds L/M/H {l}/{m}/{h}%" },
    T1_SW_MOON_LINE: { type: "template", params: ["deg"], zh: "月角 {deg}°", en: "Moon Alt {deg}°" },
    T1_SW_META_TEMPLATE: { type: "template", params: ["tsText", "magAgeMin", "plasmaAgeMin", "backfillAgeMin"], zh: "更新时间：{tsText} ・ 新鲜度：mag {magAgeMin}m / plasma {plasmaAgeMin}m{backfillAgeMin}", en: "Updated: {tsText} · Freshness: mag {magAgeMin}m / plasma {plasmaAgeMin}m{backfillAgeMin}" },
    T1_CHART_TITLE: { type: "text", zh: "1小时 C值（Capture）柱状图", en: "1H C-Index (Capture) Bar Chart" },
    T1_CHART_SUB: { type: "text", zh: "C值越高，越建议投入。", en: "Higher C-Index means stronger recommendation." },
    T1_UNIT_10M: { type: "text", zh: "单位：10分钟", en: "Unit: 10 min" },

    T1_LEVEL_TITLE: { type: "text", zh: "1小时预测结论分级（C值）", en: "1H Conclusion Levels (C-Index)" },
    T1_LEVEL_C5: { type: "text", zh: "【C值5】强烈推荐：投入回报高，建议立即行动。", en: "C5 Strongly Recommended: High payoff. Go now." },
    T1_LEVEL_C4: { type: "text", zh: "【C值4】值得出门：条件不错，建议准备与试拍。", en: "C4 Worth Going Out: Solid conditions. Prepare and test shots." },
    T1_LEVEL_C3: { type: "text", zh: "【C值3】可蹲守：存在机会，建议架机等待触发。", en: "C3 Worth Waiting: There is a chance. Set up and watch for triggers." },
    T1_LEVEL_C2: { type: "text", zh: "【C值2】低概率：机会小，可低成本尝试。", en: "C2 Low Chance: Small opportunity. Try only at low cost." },
    T1_LEVEL_C1: { type: "text", zh: "【C值1】不可观测：当前时段不建议投入。", en: "C1 Not Observable: Not worth investing time right now." },
    T1_ACTION_LOW: { type: "text", zh: "当前时段不建议投入。", en: "Not recommended to invest effort now." },
    T1_ACTION_MID: { type: "text", zh: "可尝试短时观测。", en: "Try a short watch." },
    T1_ACTION_HIGH: { type: "text", zh: "值得出门尝试。", en: "Worth going out to try." },

    // --- T3 ---
    T3_STATE_TITLE: { type: "text", zh: "近期极光状态", en: "Recent Aurora State" },
    T3_STATE_NOTE: { type: "text", zh: "备注：爆发 ≠ 可观测，仍受云量与天光影响。", en: "Note: Burst ≠ Observable. Still affected by clouds and sky brightness." },
    T3_DELIVER_TITLE: { type: "text", zh: "太阳风送达能力综合模型", en: "Solar Wind Delivery Model" },

    T3_LEVEL_TITLE: { type: "text", zh: "3小时结论分级（C值）", en: "3H Conclusion Levels (C-Index)" },
    T3_LEVEL_C5: { type: "text", zh: "【C值5】强烈推荐：投入回报高，建议立即行动。", en: "C5 Strongly Recommended: High payoff. Go now." },
    T3_LEVEL_C4: { type: "text", zh: "【C值4】值得出门：条件不错，建议准备与试拍。", en: "C4 Worth Going Out: Solid conditions. Prepare and test shots." },
    T3_LEVEL_C3: { type: "text", zh: "【C值3】可蹲守：存在机会，建议架机等待触发。", en: "C3 Worth Waiting: There is a chance. Set up and watch for triggers." },
    T3_LEVEL_C2: { type: "text", zh: "【C值2】低概率：机会小，可低成本尝试。", en: "C2 Low Chance: Small opportunity. Try only at low cost." },
    T3_LEVEL_C1: { type: "text", zh: "【C值1】不可观测：当前时段不建议投入。", en: "C1 Not Observable: Not worth investing time right now." },

    // --- T72 ---
    T72_TITLE: { type: "text", zh: "72小时范围预测", en: "72H Outlook" },
    T72_SUBTITLE: { type: "text", zh: "按天评估极光出现的可能性，用于行程与时间规划。", en: "Day-level aurora probability for travel planning." },
    T72_DAY_TODAY: { type: "text", zh: "今天", en: "Today" },
    T72_DAY_TOMORROW: { type: "text", zh: "明天", en: "Tomorrow" },
    T72_DAY_AFTER_TOMORROW: { type: "text", zh: "后天", en: "Day After" },

    T72_LEVEL_TITLE: { type: "text", zh: "72小时结论分级（C值）", en: "72H Conclusion Levels (C-Index)" },
    T72_LEVEL_C5: { type: "text", zh: "【C值5】强烈推荐：能量背景+送达能力更强，值得提前规划。", en: "C5 Strongly Recommended: Stronger background + better delivery. Plan ahead." },
    T72_LEVEL_C4: { type: "text", zh: "【C值4】值得出门：存在机会，重点看云与当晚即时模块。", en: "C4 Worth Going Out: A real chance. Check clouds and the 1H module tonight." },
    T72_LEVEL_C3: { type: "text", zh: "【C值3】可蹲守：机会少，除非位置/条件极佳。", en: "C3 Worth Waiting: Limited opportunity unless your location/sky is excellent." },
    T72_LEVEL_C2: { type: "text", zh: "【C值2】低概率：综合偏弱，提前投入意义不大。", en: "C2 Low Chance: Overall weak. Early investment is not worth it." },
    T72_LEVEL_C1: { type: "text", zh: "【C值1】不可观测：不建议投入。", en: "C1 Not Observable: Not recommended to invest effort." },
    T72_ACTION_LOW: { type: "text", zh: "暂不建议为此规划行程。", en: "Not recommended to plan a trip for this yet." },
    T72_ACTION_MID: { type: "text", zh: "可提前关注，临近再决定。", en: "Keep an eye on it; decide closer to the date." },
    T72_ACTION_HIGH: { type: "text", zh: "值得提前规划行程。", en: "Worth planning ahead." },

    // --- alert ---
    ALERT_TITLE_DATA_CONF: { type: "text", zh: "⚠️ 数据可信度提醒", en: "⚠️ Data Confidence Notice" },
    ALERT_NOTE_DATA_CONF: { type: "text", zh: "不代表无法观测，仅表示模型输入存在不确定性。", en: "Not necessarily unobservable. Inputs may be uncertain." },
    ALERT_OK_BTN: { type: "text", zh: "知道了", en: "OK" },
    ALERT_CLOSE_ARIA: { type: "text", zh: "关闭", en: "Close" },
    ALERT_TITLE_INPUT_INVALID: { type: "text", zh: "⚠️ 经纬度输入无效", en: "⚠️ Invalid coordinates" },
    ALERT_BODY_INPUT_INVALID: { type: "text", zh: "请输入数字格式的纬度/经度。\n纬度范围：-90° ～ +90°；经度范围：-180° ～ +180°。", en: "Please enter numeric latitude/longitude.\nLatitude: -90° to +90°; Longitude: -180° to +180°." },
    ALERT_FOOTER_INPUT_INVALID: { type: "text", zh: "示例：纬度 53.47，经度 122.35", en: "Example: 53.47, 122.35" },
    ALERT_TITLE_RANGE_INVALID: { type: "text", zh: "⚠️ 经纬度超出范围", en: "⚠️ Coordinates out of range" },
    ALERT_BODY_RANGE_INVALID: { type: "template", params: ["lat", "lon"], zh: "你输入的是：Latitude {lat}，Longitude {lon}。\n允许范围：\n纬度（Latitude）：-90° ～ +90°\n经度（Longitude）：-180° ～ +180°", en: "You entered: Latitude {lat}, Longitude {lon}.\nAllowed:\nLatitude: -90° to +90°\nLongitude: -180° to +180°" },
    ALERT_FOOTER_RANGE_INVALID: { type: "text", zh: "请修正后再点击生成。", en: "Please correct and try again." },

    // --- frozen html blocks ---
    UI_ABOUT_BODY: {
      type: "html",
      zh: `
        <p class="aboutSectionTitle">
          工具应该怎么使用？
        </p>

        <p>
          输入经纬度，系统会自动读取你当前所在的时间与时区，生成极光观测预告。
        </p>

        <p>
          <b>【1 小时精准】</b><br>
          以 10 分钟为粒度，即时回答：<br>
          「我现在要不要出门？要不要架机？」
        </p>

        <p>
          <b>【3 小时预测】</b><br>
          呈现逐小时状态，选出最适合观测极光的一个小时。<br>
          同时告诉你当前极光是处在爆发中还是已衰落，并回答：<br>
          「接下来 3 小时值不值得守？」
        </p>

        <p>
          <b>【72 小时范围】</b><br>
          引入更多 CH 与 CME 日冕物质抛射的信息，以天为单位，预测极光爆发的可能性。<br>
          从更宏观的数据视角，回答：<br>
          「未来三天，哪一天最值得安排时间？」
        </p>

        <p class="aboutSectionTitle">
          极光预测，为什么不能只是 KP？
        </p>

        <p>
          KP 是为全球空间天气监测而设计的宏观指标。<br>
          它在航天器运行、电力系统防护、长期磁扰评估中非常有效，<br>
          但它的设计目标，从来不是服务于具体地点、具体时段的地面观测者。
        </p>

        <p>
          对于普通极光观测与拍摄来说，KP 的粒度过于粗糙。<br>
          它不区分 IMF 的瞬时方向变化，也难以反映短时稳定性与局地响应。<br>
          这也是为什么在真实体验中，常常会出现：<br>
          KP 看似“非常合适”，却完全无法观测或拍摄的情况。
        </p>
        <p>
          于是，在漠河零下40度的寒夜中，Aurora Capture 诞生了。
        </p>
        <p>
          C 值（Capture指数）并不是用来替代 KP 的。<br>
          它更像是一个面向摄影师与追光者的【可拍可观指数】。
        </p>

        <p>
          作为一名理工科出身的风光摄影爱好者，<br>
          我尝试从更接近观测者的角度出发，直接调用太阳风与磁场的原始参数建模，<br>
          在更短的时间尺度上，评估它们是否正在形成一个对拍摄友好的窗口。
        </p>

        <p>
          让我们一起看看：<br>
          此刻，地球手里握着的，究竟是一副什么样的牌？
        </p>

        <p class="aboutSectionTitle" style="margin-top:18px;">
          反馈与建议
        </p>
        <p>
          报错 / 建议 / 数据异常 请发送邮件至：<br>
          <a href="mailto:auroracapture.feedback@gmail.com" style="color:rgba(255,255,255,.85); text-decoration:underline;">auroracapture.feedback@gmail.com</a><br>
          <span style="display:inline-block; margin-top:6px; color:rgba(255,255,255,.55); font-size:12px;">个人维护，可能延迟回复。</span>
        </p>

        <p style="margin-top:18px; text-align:right; color:rgba(255,255,255,.55); font-size:12px;">
          —— @小狮子佑酱
        </p>
      `,
      en: `
        <p class="aboutSectionTitle">
          How to Use This Tool
        </p>

        <p>
          Enter latitude and longitude. The tool automatically detects your local time and time zone, then generates an aurora viewing forecast for your location.
        </p>

        <p>
          <b>【1-Hour Precision】</b><br>
          Updated at 10-minute resolution to answer one question:<br>
          “Should I go out right now? Should I set up the camera?”
        </p>

        <p>
          <b>【3-Hour Forecast】</b><br>
          Shows hour-by-hour conditions and highlights the best hour within the next 3 hours.<br>
          It also indicates whether activity is intensifying or fading, and answers:<br>
          “Is it worth waiting in the next 3 hours?”
        </p>

        <p>
          <b>【72-Hour Outlook】</b><br>
          Incorporates broader solar drivers such as coronal holes (CH) and CME context.<br>
          Provides a day-level probability range to answer:<br>
          “Which day in the next 3 days is most worth planning for?”
        </p>

        <p class="aboutSectionTitle">
          Why KP Alone Is Not Enough
        </p>

        <p>
          Kp is a global geomagnetic index designed for space-weather monitoring.<br>
          It works well for spacecraft operations, power-grid protection, and long-term geomagnetic disturbance assessment.<br>
          But it was never designed for ground observers making location- and time-specific decisions.
        </p>

        <p>
          For aurora chasing and photography, Kp is often too coarse.<br>
          It does not reflect rapid changes in IMF orientation, and it struggles to represent short-term stability and local response.<br>
          That’s why real-world outcomes can look like this:<br>
          Kp seems “perfect”, yet nothing is visible.
        </p>

        <p>
          Aurora Capture was born from nights spent waiting in the cold—trying to turn uncertainty into a usable decision.<br>
          <span style="display:inline-block; margin-top:6px; color:rgba(255,255,255,.55); font-size:12px;">
            Note: MLAT shown on this page may be an approximation by default; if an AACGMv2 conversion endpoint is available, the tool can switch to true AACGMv2 MLAT automatically.
          </span>
        </p>

        <p>
          The C-Index (Capture Index) is not meant to replace Kp.<br>
          It is a photographer-oriented “shootability” indicator.
        </p>

        <p>
          Instead of relying on a single global index, Aurora Capture models directly from upstream solar-wind and magnetic-field parameters.<br>
          On shorter time scales, it evaluates whether conditions are forming a window that is realistically worth your time and effort.
        </p>

        <p>
          Let’s see what kind of hand Earth is holding—right now.
        </p>

        <p class="aboutSectionTitle" style="margin-top:18px;">
          Feedback & Suggestions
        </p>
        <p>
          Bug reports / suggestions / suspicious data can be sent to:<br>
          <a href="mailto:auroracapture.feedback@gmail.com" style="color:rgba(255,255,255,.85); text-decoration:underline;">auroracapture.feedback@gmail.com</a><br>
          <span style="display:inline-block; margin-top:6px; color:rgba(255,255,255,.55); font-size:12px;">Independently maintained. Replies may be delayed.</span>
        </p>

        <p style="margin-top:18px; text-align:right; color:rgba(255,255,255,.55); font-size:12px;">
          —— @小狮子佑酱
        </p>
      `
    },

    UI_FOOTER_BLOCK: {
      type: "html",
      zh: "佑酱已吐血更新到版本号：v3.0.0319 ； 备案许可证编号：沪ICP备2026001760号<br>数据源：NOAA SWPC（实时太阳风、OVATION nowcast、Kp 预报）与 Open-Meteo 云量预报。磁纬（MLAT）当前为估算（偶极近似）；若接入 AACGMv2 换算服务，将自动切换为真实 AACGMv2。",
      en: "Version v3.0.0319 · ICP Filing No. 沪ICP备2026001760号<br>Data sources: NOAA SWPC (solar wind, OVATION nowcast, Kp forecast) and Open-Meteo cloud forecast. MLAT is currently estimated (dipole approximation); if an AACGMv2 endpoint is available, it will switch to true AACGMv2 automatically."
    }
  };

  function _normalizeLang(lang){
    if(lang === "en") return "en";
    if(lang === "cn" || lang === "zh") return "zh";
    return "zh";
  }

  function setLang(lang){
    currentLang = _normalizeLang(lang);
    try{
      const v = (currentLang === "en") ? "en" : "cn";
      localStorage.setItem(STORAGE_KEY, v);
    }catch(_){ /* ignore */ }
  }

  function getLang(){
    if(currentLang) return currentLang;
    try{
      const v = localStorage.getItem(STORAGE_KEY);
      return _normalizeLang(v);
    }catch(_){
      return "zh";
    }
  }

  function _resolve(key){
    const entry = resources[key];
    if(!entry){
      console.warn(`[i18n] missing key: ${key}`);
      return { type: "text", value: key };
    }
    return entry;
  }

  function t(key, params){
    const entry = _resolve(key);
    if(entry.type === "symbol") return entry.value;
    const lang = getLang();
    const raw = (entry[lang] != null) ? entry[lang] : (entry.zh ?? "");
    if(entry.type !== "template") return String(raw);

    const dict = params || {};
    return String(raw).replace(/\{([a-zA-Z0-9_]+)\}/g, (m, p1) => {
      if(Object.prototype.hasOwnProperty.call(dict, p1)) return String(dict[p1]);
      console.warn(`[i18n] missing param: ${key}.${p1}`);
      return m;
    });
  }

  function th(key){
    const entry = _resolve(key);
    if(entry.type !== "html"){
      throw new Error(`[i18n] th() only accepts type=html: ${key}`);
    }
    const lang = getLang();
    const raw = (entry[lang] != null) ? entry[lang] : (entry.zh ?? "");
    return String(raw);
  }

  // initialize from storage
  try{
    const v = localStorage.getItem(STORAGE_KEY);
    currentLang = _normalizeLang(v);
  }catch(_){
    currentLang = "zh";
  }

  window.I18N = { setLang, getLang, t, th, resources };
})();
