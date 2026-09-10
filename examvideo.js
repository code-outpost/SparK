/* =========================================================================
   SparK · 电工证实操视频导航  examvideo.js  (v20260910-1)
   -------------------------------------------------------------------------
   ⚠️ 本模块只做「资源导航」，不搬运、不内嵌、不转存任何视频：
      · 每条资源给出标题 / 来源 / 适用工种 / 简介 / 跳转链接
      · 点击在新标签打开原站，遵守原站版权与播放规则
      · 优先收录官方与权威机构（国家智慧教育平台、应急管理局）的免费课程

   为什么不做内嵌播放：
      B站、腾讯课堂等绝大多数站点有防盗链与 iframe 限制，实际可内嵌的极少，
      内嵌失败会让页面出现大片「无法播放」的空白。跳转原站更稳定也更合规。

   链接可能会因原站调整而失效——这是外部资源的固有属性，发现失效请反馈。
   ========================================================================= */
(function () {
  'use strict';

  /* 分类：按实操考核科目组织 */
  var CATS = [
    { k: 'course', n: '系统课程', icon: '🎓', d: '成体系的免费实操课程，建议先看' },
    { k: 'cpr', n: '触电急救', icon: '🫀', d: '脱离电源、心肺复苏、人工呼吸（K4 科目）' },
    { k: 'safety', n: '安全用具', icon: '🧰', d: '验电器、绝缘手套、绝缘杆、接地线、标示牌（K1 科目）' },
    { k: 'meter', n: '电工仪表', icon: '🔧', d: '万用表、钳形表、兆欧表、接地电阻测试仪（K1 科目）' },
    { k: 'wiring', n: '线路安装', icon: '🔌', d: '电动机控制回路、照明线路、故障排查（K2 科目）' },
    { k: 'fire', n: '消防灭火', icon: '🔥', d: '灭火器选用与电气火灾处置（K4 科目）' },
    { k: 'hv', n: '高压专项', icon: '⚡', d: '倒闸操作、高压成套装置、变压器巡视（高压适用）' }
  ];

  /* 适用工种：low=低压  high=高压 */
  var LV = { low: '低压', high: '高压' };

  var LIST = [
    /* ---------- 系统课程（权威 / 免费） ---------- */
    {
      t: '电力安全生产及防护（国家高等教育智慧教育平台）',
      cat: 'course', src: '国家智慧教育平台', lv: ['low', 'high'], free: true,
      url: 'https://higher.smartedu.cn/course/623e5676964163244e392a62',
      d: '教育部官方平台免费课程。含触电体感实训、跨步电压实训、安全用具正确使用、触电急救演练等视频与动画，覆盖电气安全基础到急救全流程，质量高且无广告。需注册登录后观看。'
    },
    {
      t: '特种作业人员实操培训标准化课程（广州市应急管理局）',
      cat: 'course', src: '广州市应急管理局', lv: ['low', 'high'], free: true,
      url: 'https://www.aqscwlxy.com/gzsyjj/login',
      d: '官方按《特种作业人员安全技术培训大纲》录制，含低压电工作业、高压电工作业两个工种，涵盖安全用具使用、线路安装调试、高压成套装置维护、灭火器使用、心肺复苏等。免费学习。'
    },
    {
      t: '低压电工作业实操考试通关课（9 课时）',
      cat: 'course', src: '定西建达职业培训学校', lv: ['low'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '按实操考试科目组织的完整课程。科目一含万用表测交直流电压/电阻、钳形电流表、接地电阻检测、电缆绝缘检测、电动机与电容器绝缘摇测、登杆演示、绝缘手套与验电笔使用、挂标示牌；科目二含接触器控制电动机单向/正反向运行接线。课时时长 3～22 分钟。'
    },
    {
      t: '电工技能操作精品课（微课合集）',
      cat: 'course', src: '职业技能证网', lv: ['low'], free: false,
      url: 'https://zyjnz.com/zxkc/11294.html',
      d: '短微课为主（1～6 分钟），含口对口人工呼吸法、胸外心脏挤压法、钢丝钳/剥线钳使用、导线连接与绝缘恢复、万用表/兆欧表/电桥/钳形表使用、二极管与三极管判别、变频器操作等，适合碎片化补短板。'
    },

    /* ---------- 触电急救 ---------- */
    {
      t: '触电紧急救护的方法（急救基本技能演练视频）',
      cat: 'cpr', src: '国家智慧教育平台', lv: ['low', 'high'], free: true,
      url: 'https://higher.smartedu.cn/course/623e5676964163244e392a62',
      d: '课程第三章内容：触电紧急救护方法、触电急救训练、外伤急救上下。理论结合演练，讲解脱离电源后的判断与处置流程。'
    },
    {
      t: '口对口人工呼吸法 / 胸外心脏挤压法（微课）',
      cat: 'cpr', src: '职业技能证网', lv: ['low', 'high'], free: false,
      url: 'https://zyjnz.com/zxkc/11294.html',
      d: '第 1 章「电工安全急救」微课，分别演示口对口人工呼吸法（约 2 分钟）、胸外心脏挤压法（约 1.5 分钟）、两者配合（约 1.3 分钟）。对应实操 K4 科目。'
    },
    {
      t: '心肺复苏 + 触电急救（B 站检索）',
      cat: 'cpr', src: '哔哩哔哩', lv: ['low', 'high'], free: true,
      url: 'https://search.bilibili.com/all?keyword=电工%20心肺复苏%20触电急救',
      d: '按关键词检索 B 站上的实操演示视频，可筛选播放量高、更新时间近的内容。注意对照最新指南：按压频率 100～120 次/分、深度 5～6cm、按压通气比 30:2。'
    },
    {
      t: '人体触电体感系统实训 / 跨步电压实训',
      cat: 'cpr', src: '国家智慧教育平台', lv: ['low', 'high'], free: true,
      url: 'https://higher.smartedu.cn/course/623e5676964163244e392a62',
      d: '课程第二章：人体触电体感系统实训（实操）、跨步电压体感设备实训（虚拟仿真+实操）、带电剪线体感实训。体感设备能直观建立安全意识，比看图解更有效。'
    },

    /* ---------- 安全用具 ---------- */
    {
      t: '电气安全用具的正确使用（基本 / 一般防护）',
      cat: 'safety', src: '国家智慧教育平台', lv: ['low', 'high'], free: true,
      url: 'https://higher.smartedu.cn/course/623e5676964163244e392a62',
      d: '课程 2.5 节：基本安全用具与一般防护安全用具的正确使用动画，并有典型案例讲解。区分清楚"基本"（可承受工作电压）与"辅助"（不能单独使用）是考试高频点。'
    },
    {
      t: '低压验电笔的检查与使用（约 11 分钟）',
      cat: 'safety', src: '定西建达职业培训学校', lv: ['low'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '含验电前的自检（在确认有电处验证）、正确握持姿势（手指接触笔尾金属体）、氖管亮度判读。验电器必须"先验证其良好，再验检修设备"。'
    },
    {
      t: '电工绝缘手套的检查与使用（约 3 分钟）',
      cat: 'safety', src: '定西建达职业培训学校', lv: ['low', 'high'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '演示外观检查、卷曲法查漏气、有效期与试验标签核对。绝缘手套属辅助安全用具，不能单独接触带电体。'
    },
    {
      t: '登杆作业安全用具检查及登杆演示（约 6 分钟）',
      cat: 'safety', src: '定西建达职业培训学校', lv: ['low', 'high'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '安全带、登高板（踏板）、脚扣的检查与登杆动作要领。含登杆前的冲击试验与杆上站位要求。'
    },
    {
      t: '停电检修时配电箱（柜）挂标示牌操作（约 3 分钟）',
      cat: 'safety', src: '定西建达职业培训学校', lv: ['low', 'high'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '演示"禁止合闸，有人工作！"等标示牌的悬挂位置与顺序，以及遮栏设置。对应技术措施第 4 项，常与接地线配合考核。'
    },
    {
      t: '临时接地线（携带型）挂设演示（B 站检索）',
      cat: 'safety', src: '哔哩哔哩', lv: ['high'], free: true,
      url: 'https://search.bilibili.com/all?keyword=高压%20接地线%20挂设%20操作',
      d: '重点看挂设顺序：必须先接接地端、后接导体端，拆除时相反；必须用绝缘杆操作，戴绝缘手套。这是高压实操必考且最易扣分的项目。'
    },

    /* ---------- 电工仪表 ---------- */
    {
      t: '指针式 / 数字式万用表测量交流、直流电压与电阻',
      cat: 'meter', src: '定西建达职业培训学校', lv: ['low'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '5 个课时分别演示指针式与数字式万用表测交流电压、直流电压、电阻。重点：欧姆档每次换倍率都要重新调零、量程由大到小、读数时视线垂直表盘。'
    },
    {
      t: '交流钳形电流表测量交流电流（约 9 分钟）',
      cat: 'meter', src: '定西建达职业培训学校', lv: ['low', 'high'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '演示钳口只夹单根导线、由大量程向小量程切换、测量中不可换档。钳形表原理相当于电流互感器，夹两根线会因磁场抵消读数为零。'
    },
    {
      t: '车间接地装置接地电阻值检测（约 19 分钟）',
      cat: 'meter', src: '定西建达职业培训学校', lv: ['low', 'high'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '接地电阻测试仪（摇表）的完整操作：断开被测接地极、辅助极布置（20m/40m）、匀速摇柄、读数取值。保护接地一般要求 ≤4Ω。'
    },
    {
      t: '电力电缆 / 电动机 / 电容器绝缘电阻检测',
      cat: 'meter', src: '定西建达职业培训学校', lv: ['low', 'high'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '含低压四芯铠装电缆绝缘检测（约 7 分钟）、380V 三相异步电动机绝缘摇测（约 8 分钟）、低压电力电容器绝缘检测（约 9 分钟）。要点：兆欧表选型（500V/1000V/2500V）、测量前后必须放电。'
    },
    {
      t: '兆欧表使用前的检查与电动机绝缘测量（微课）',
      cat: 'meter', src: '职业技能证网', lv: ['low', 'high'], free: false,
      url: 'https://zyjnz.com/zxkc/11294.html',
      d: '微课形式，含兆欧表使用前的开路/短路试验（校表）、接线（L/E/G 三端）、摇测转速与读数时机、测量后放电。'
    },

    /* ---------- 线路安装 ---------- */
    {
      t: '接触器控制三相异步电动机单向运行（主回路 + 控制回路）',
      cat: 'wiring', src: '定西建达职业培训学校', lv: ['low'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '两个课时（主回路约 22 分钟、控制回路约 14 分钟），演示 380V/11kW 电动机的元件选型与接线，含自锁回路的构成与检查。'
    },
    {
      t: '三相异步电动机正反向运行控制线路接线',
      cat: 'wiring', src: '定西建达职业培训学校', lv: ['low'], free: false,
      url: 'http://www.gsdxjd.com/coursesDetail.html?id=40',
      d: '5.5kW 电动机正反转主回路元件选择与接线，重点是接触器互锁（电气互锁 + 机械互锁）的实现，防止相间短路。'
    },
    {
      t: '电动机控制线路 / 照明电路故障排查（B 站检索）',
      cat: 'wiring', src: '哔哩哔哩', lv: ['low'], free: true,
      url: 'https://search.bilibili.com/all?keyword=低压电工实操%20正反转%20星三角%20接线',
      d: '检索星-三角降压启动、双联开关楼道双控、照明电路短路/断路/漏电排查等演示。看的时候注意对照评分标准里的扣分点（线号、压接、走线）。'
    },

    /* ---------- 消防灭火 ---------- */
    {
      t: '灭火器设备使用操作（官方标准化课程）',
      cat: 'fire', src: '广州市应急管理局', lv: ['low', 'high'], free: true,
      url: 'https://www.aqscwlxy.com/gzsyjj/login',
      d: '官方课程含灭火器选用与操作。核心考点：电气火灾未断电时严禁用水或泡沫，必须用二氧化碳、干粉等不导电灭火剂；带电灭火喷嘴与 10kV 带电体距离不小于 0.4m。'
    },
    {
      t: '电气火灾应急处置演示（B 站检索）',
      cat: 'fire', src: '哔哩哔哩', lv: ['low', 'high'], free: true,
      url: 'https://search.bilibili.com/all?keyword=电气火灾%20灭火器%20选择%20使用%20实操',
      d: '检索灭火器选型（干粉/二氧化碳/水基）与扑救演示。注意区分不同火源：带电设备、油类、固体物质适用的灭火剂不同。'
    },

    /* ---------- 高压专项 ---------- */
    {
      t: '高压成套装置的使用和维护（官方标准化课程）',
      cat: 'hv', src: '广州市应急管理局', lv: ['high'], free: true,
      url: 'https://www.aqscwlxy.com/gzsyjj/login',
      d: '官方课程高压部分，含固定型/移开式/环网式高压开关柜的安装、使用、维护与检查，以及"五防"联锁的实操验证。'
    },
    {
      t: '变电站倒闸操作（仿真 + 实操）',
      cat: 'hv', src: '哔哩哔哩', lv: ['high'], free: true,
      url: 'https://search.bilibili.com/all?keyword=高压%20倒闸操作%20操作票%20演示',
      d: '检索倒闸操作票填写与执行演示。核心顺序：停电时先断路器、再负荷侧刀闸、最后母线侧刀闸；送电相反。操作中必须唱票复诵、两人进行（一人操作一人监护）。'
    },
    {
      t: '10kV 配电变压器停送电与跌落式熔断器操作',
      cat: 'hv', src: '哔哩哔哩', lv: ['high'], free: true,
      url: 'https://search.bilibili.com/all?keyword=10kV%20变压器%20停送电%20跌落式熔断器%20操作',
      d: '检索变压器停送电操作顺序、跌落式熔断器拉合顺序（先中间后两边、先下风后上风）与绝缘杆使用的演示。'
    },
    {
      t: '高压设备巡视与异常判断（B 站检索）',
      cat: 'hv', src: '哔哩哔哩', lv: ['high'], free: true,
      url: 'https://search.bilibili.com/all?keyword=变配电所%20巡视%20变压器%20异常%20判断',
      d: '检索变配电所巡视内容、变压器异常运行判断（油温、油位、声响、渗漏）、二次设备运行监视等实操讲解。'
    }
  ];

  /* 统计各分类条数 */
  function countOf(k) {
    var n = 0;
    LIST.forEach(function (v) { if (v.cat === k) n++; });
    return n;
  }

  window.EXAM_VIDEO = { cats: CATS, list: LIST, lv: LV };

  /* ---------------------------------------------------------------
     渲染：分类筛选 + 卡片列表
     state: { cat:'all'|key, kw:'' }
     --------------------------------------------------------------- */
  window.examVideoRender = function (state) {
    var st = state || { cat: 'all', kw: '' };
    var kw = String(st.kw || '').trim().toLowerCase();
    var h = '';

    h += '<div class="exam-v-intro">以下为<b>外部资源导航</b>，点击卡片会在新标签打开原站观看。' +
         '优先收录官方与权威机构的免费课程；标注「免费」的无需付费即可学习。' +
         '<b>链接可能因原站调整而失效</b>，如发现请通过「关于」页反馈。</div>';

    // 分类筛选
    h += '<div class="exam-v-cats">';
    h += '<button class="exam-v-cat' + (st.cat === 'all' ? ' on' : '') +
         '" onclick="examVideoSetCat(\'all\')">全部 ' + LIST.length + '</button>';
    CATS.forEach(function (c) {
      h += '<button class="exam-v-cat' + (st.cat === c.k ? ' on' : '') +
           '" onclick="examVideoSetCat(\'' + c.k + '\')" title="' + esc(c.d) + '">' +
           c.icon + ' ' + esc(c.n) + ' ' + countOf(c.k) + '</button>';
    });
    h += '</div>';

    // 搜索框
    h += '<div class="exam-v-search">' +
         '<input id="exam-v-kw" class="exam-v-input" type="text" placeholder="搜索标题 / 简介 / 来源…" ' +
         'value="' + esc(st.kw || '') + '" oninput="examVideoKw(this.value)">' +
         (kw ? '<button class="exam-v-clr" onclick="examVideoKw(\'\')">清除</button>' : '') +
         '</div>';

    // 列表
    var list = LIST.filter(function (v) {
      if (st.cat !== 'all' && v.cat !== st.cat) return false;
      if (!kw) return true;
      var hay = (v.t + ' ' + v.d + ' ' + v.src + ' ' + v.cat).toLowerCase();
      return hay.indexOf(kw) >= 0;
    });

    if (!list.length) {
      h += '<div class="exam-v-empty">没有匹配的视频资源，试试其它关键词或切换分类。</div>';
      return h;
    }

    // 当前分类说明
    if (st.cat !== 'all') {
      for (var i = 0; i < CATS.length; i++) {
        if (CATS[i].k === st.cat) {
          h += '<div class="exam-v-catd">' + CATS[i].icon + ' <b>' + esc(CATS[i].n) + '</b> · ' + esc(CATS[i].d) + '</div>';
          break;
        }
      }
    }

    h += '<div class="exam-v-list">';
    list.forEach(function (v) {
      var lvTags = v.lv.map(function (k) {
        return '<span class="exam-v-lv lv-' + k + '">' + (LV[k] || k) + '</span>';
      }).join('');
      h += '<a class="exam-v-card" href="' + esc(v.url) + '" target="_blank" rel="noopener noreferrer">';
      h += '<div class="exam-v-card-hd"><span class="exam-v-t">' + esc(v.t) + '</span>';
      h += '<span class="exam-v-open" aria-hidden="true">↗</span></div>';
      h += '<div class="exam-v-meta">' + lvTags +
           '<span class="exam-v-src">' + esc(v.src) + '</span>' +
           (v.free ? '<span class="exam-v-free">免费</span>' : '<span class="exam-v-pay">部分收费</span>') +
           '</div>';
      h += '<div class="exam-v-d">' + esc(v.d) + '</div>';
      h += '<div class="exam-v-url">' + esc(v.url) + '</div>';
      h += '</a>';
    });
    h += '</div>';

    h += '<div class="exam-v-tip"><b>学习建议：</b>先看系统课程建立整体框架，再按自己的薄弱科目（K1 安全用具 / K2 线路安装 / K3 隐患排查 / K4 应急处置）逐项突破；' +
         '看视频时同步对照评分标准，注意操作顺序——实操考试大量扣分点都在"顺序错了"上。</div>';
    return h;
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
})();
