/* =========================================================================
   SparK · 局域网 IP 扫描  ipscan.js  (v20260906-2)
   -------------------------------------------------------------------------
   交互与结果呈现对齐 Advanced IP Scanner / Angry IP Scanner：
     状态灯 · 图标 · IP · 分类 · 开放端口 · 响应时间 · 推测类型 · 打开
     在线/离线/按分类筛选、按 IP 或响应时间排序、ETA、速率、导出、复制。

   【扫描原理（决定能力边界，不是偷懒）】
   浏览器沙箱没有原始套接字，不能发 ICMP ping、不能做 ARP 扫描。
   本工具只能对「IP:端口」发起 HTTP 建连探测：
     · 通道一  fetch(no-cors) GET /      —— 收到任何 HTTP 响应即判在线
     · 通道二  <img> 加载 /favicon.ico   —— 双保险，且能拿到设备图标
   因此：
     1. 只开放非 HTTP 端口的设备（22/SSH、502/Modbus-TCP、445/SMB、
        3389/远程桌面、23/Telnet）扫不出来 —— 建连后协议不合法，浏览器
        统一报错，与「端口关闭」无法区分。此类请用 nmap / Advanced IP Scanner。
     2. 拿不到 MAC 地址、主机名、厂商（需 ARP / NetBIOS / mDNS，浏览器不支持）。
     3. Chrome 86+ 会把本机 IP 混淆成 mDNS 名（xxx-xxx.local）防指纹，
        此时需手动填网段；Firefox / Safari 通常能拿到真实 IP。
     4. 页面若通过 https 打开，http:// 请求会被混合内容拦截，
        请用 file:// 或本地 http 打开。

   仅做普通 GET 探测，无 payload；结果只在本页显示，不上传。
   ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- 状态 */
  var S = {
    running: false,
    abort: false,
    localIPs: [],     // [{ip, port, mdns}] host candidate
    publicIPs: [],    // [{ip, port}]       srflx（NAT 公网出口）
    results: [],      // 在线主机 [{ip, kind, ports, ms, icon}]
    dead: [],         // 离线 IP
    scanned: 0,
    total: 0,
    t0: 0,
    filter: 'all',    // all | alive | dead | self | gw | dev | remote | apipa
    sortKey: 'ip',    // ip | ms
    sortDir: 1,
    lastRender: 0
  };

  /* ------------------------------------------------------------- 小工具 */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function clamp(v, lo, hi) { v = Number(v); if (!isFinite(v)) return lo; return Math.max(lo, Math.min(hi, v)); }

  var IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

  function ip2int(ip) {
    var p = ip.split('.');
    return ((+p[0] << 24) >>> 0) + ((+p[1] << 16) | (+p[2] << 8) | (+p[3]));
  }
  function int2ip(n) {
    n = n >>> 0;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  /* 解析网段：192.168.1.0/24 或 192.168.1.1-254 或单个 IP
     ------------------------------------------------------------------
     opt.skipBc：是否剔除「网段地址」与「广播地址」。
       /24 网段的 .0 是网段地址、.255 是广播地址，这两个地址永远不会分配给
       任何一台主机，扫它们纯属浪费（每个都要等一个超时）。默认开启剔除，
       实际扫描区间落在 .1~.254，共 254 个可用主机地址。
       /31、/32（点对点 / 单主机）不存在这个约定，不做剔除。 */
  function parseRange(str, opt) {
    opt = opt || {};
    var skipBc = opt.skipBc !== false;
    str = String(str || '').trim();
    if (!str) return { err: '网段为空：请先点「探测本机 IP」自动填入，或手动填写（如 192.168.1.1-254）' };

    var m = /^(\d+\.\d+\.\d+\.)\[?(\d{1,3})\-(\d{1,3})\]?$/.exec(str) ||
            /^(\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{1,3})\-(\d{1,3})$/.exec(str);
    if (m) {
      var pre = m[1].charAt(m[1].length - 1) === '.' ? m[1] : m[1] + '.';
      var a = parseInt(m[2], 10), b = parseInt(m[3], 10);
      if (a > b) { var t = a; a = b; b = t; }
      if (a < 0 || b > 255) return { err: '末段范围需在 0~255' };
      var sk1 = 0;
      if (skipBc) {
        if (a === 0 && b > 0) { a = 1; sk1++; }        // 去掉 .0 网段地址
        if (b === 255 && a < 255) { b = 254; sk1++; }  // 去掉 .255 广播地址
      }
      var out = [];
      for (var i = a; i <= b; i++) out.push(pre + i);
      return { ips: out, skipped: sk1 };
    }

    var c = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/.exec(str);
    if (c) {
      if (!IPV4_RE.test(c[1])) return { err: 'IP 格式不正确' };
      var bits = parseInt(c[2], 10);
      if (bits < 8 || bits > 32) return { err: '掩码需在 /8 ~ /32 之间' };
      var size = Math.pow(2, 32 - bits);
      if (size > 4096) return { err: '/8~/19 网段过大（' + size + ' 个地址），请缩小到 /20 以内' };
      var base = ip2int(c[1]) & ((0xFFFFFFFF << (32 - bits)) >>> 0);
      var lo = 0, hi = size - 1, sk2 = 0;
      if (skipBc && bits <= 30 && size > 2) { lo = 1; hi = size - 2; sk2 = 2; }
      var list = [];
      for (var k = lo; k <= hi; k++) list.push(int2ip(base + k));
      return { ips: list, base: int2ip(base), bits: bits, skipped: sk2 };
    }

    if (IPV4_RE.test(str)) return { ips: [str], skipped: 0 };
    return { err: '格式示例：192.168.1.1-254 或 192.168.1.0/24 或 192.168.1.10' };
  }

  /* 由已探测到的本机 IP 推断「可用主机区间」：192.168.1.1-254 */
  function suggestRange() {
    for (var i = 0; i < S.localIPs.length; i++) {
      var r = S.localIPs[i];
      if (r && !r.mdns && IPV4_RE.test(r.ip || '')) {
        var s = r.ip.split('.');
        return s[0] + '.' + s[1] + '.' + s[2] + '.1-254';
      }
    }
    return '';
  }

  /* 解析端口：80, 443, 8080-8090 */
  function parsePorts(str) {
    var out = [];
    String(str || '').split(/[,，\s;]+/).forEach(function (seg) {
      if (!seg) return;
      var r = /^(\d{1,5})\-(\d{1,5})$/.exec(seg);
      if (r) {
        var a = parseInt(r[1], 10), b = parseInt(r[2], 10);
        if (a > b) { var t = a; a = b; b = t; }
        for (var i = a; i <= b && i <= 65535; i++) out.push(i);
        return;
      }
      var n = parseInt(seg, 10);
      if (isFinite(n) && n > 0 && n <= 65535) out.push(n);
    });
    var res = [], seen = {};
    out.forEach(function (p) { if (!seen[p]) { seen[p] = 1; res.push(p); } });
    return res;
  }

  /* ------------------------------------------- 本机 IP（WebRTC ICE） */
  function detectLocalIPs(timeoutMs) {
    return new Promise(function (resolve) {
      var RTCP = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
      if (!RTCP) return resolve({ err: '当前浏览器不支持 WebRTC，无法自动探测本机 IP，请手动填写网段。' });

      var pc = null, finished = false, hosts = [], srflx = [], other = [];
      function done() {
        if (finished) return; finished = true;
        try { if (pc) pc.close(); } catch (e) {}
        resolve({ hosts: hosts, srflx: srflx, other: other });
      }

      try {
        pc = new RTCP({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      } catch (e) {
        try { pc = new RTCP(null); } catch (e2) { return resolve({ err: 'WebRTC 初始化失败：' + (e2 && e2.message || e2) }); }
      }

      pc.onicecandidate = function (ev) {
        if (!ev || !ev.candidate || !ev.candidate.candidate) return;
        var t = String(ev.candidate.candidate).split(/\s+/);
        if (t.length < 8) return;
        var addr = t[4], port = t[5], typ = (t[7] || '').toLowerCase();
        if (addr.indexOf(':') >= 0) return;               // 跳过 IPv6
        var rec = { ip: addr, port: port, mdns: /\.local$/i.test(addr) };
        if (typ === 'host') { if (addr !== '0.0.0.0') hosts.push(rec); }
        else if (typ === 'srflx') srflx.push(rec);
        else other.push({ ip: addr, port: port, typ: typ, mdns: rec.mdns });
      };

      try { pc.createDataChannel('spark-ip-probe'); } catch (e) {}
      var made = false;
      try {
        pc.createOffer().then(function (offer) { return pc.setLocalDescription(offer); }).catch(function () {});
        made = true;
      } catch (e) {}
      if (!made) { try { pc.createOffer(function (o) { pc.setLocalDescription(o, function () {}, function () {}); }, function () {}); } catch (e2) {} }

      setTimeout(done, timeoutMs || 2500);
    });
  }

  /* ------------------------------------- 探测通道一：fetch(no-cors) */
  function probeHTTP(ip, port, timeoutMs, scheme) {
    return new Promise(function (resolve) {
      var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var finished = false, t0 = now(), timer = null;
      function finish(ok) {
        if (finished) return; finished = true;
        if (timer) clearTimeout(timer);
        resolve({ ok: ok, ms: Math.round(now() - t0) });
      }
      timer = setTimeout(function () {
        if (ctl) { try { ctl.abort(); } catch (e) {} }
        finish(false);
      }, timeoutMs);

      var url = scheme + '://' + ip + ':' + port + '/';
      var opt = { method: 'GET', mode: 'no-cors', cache: 'no-store', credentials: 'omit' };
      if (ctl) opt.signal = ctl.signal;
      try {
        fetch(url, opt).then(function () { finish(true); }, function () { finish(false); });
      } catch (e) { finish(false); }
    });
  }

  /* ------------------------ 探测通道二：<img> 加载 favicon（双保险） */
  /* onload = 服务器确实返回了图片 → 高置信在线，且拿到图标；onerror = 无法判定 */
  function probeIcon(ip, port, timeoutMs) {
    return new Promise(function (resolve) {
      var img = new Image();
      var finished = false, t0 = now(), timer = null;
      function finish(ok) {
        if (finished) return; finished = true;
        if (timer) clearTimeout(timer);
        img.onload = img.onerror = null;
        resolve({ ok: ok, ms: Math.round(now() - t0), url: 'http://' + ip + ':' + port + '/favicon.ico' });
      }
      timer = setTimeout(function () { img.src = ''; finish(false); }, timeoutMs);
      img.onload = function () { finish(true); };
      img.onerror = function () { finish(false); };
      try { img.src = 'http://' + ip + ':' + port + '/favicon.ico'; } catch (e) { finish(false); }
    });
  }

  /* ------------------------------------------------------- 并发任务池 */
  function pool(tasks, limit, onOne) {
    return new Promise(function (resolveAll) {
      var idx = 0, n = tasks.length;
      if (!n) return resolveAll();
      var workers = Math.min(limit, n), live = workers;
      function step() {
        if (S.abort || idx >= n) { live--; if (live <= 0) resolveAll(); return; }
        var t = tasks[idx++];
        var i = idx;
        Promise.resolve(t()).then(function () {
          if (onOne) onOne(i, n);
          step();
        }, function () {
          if (onOne) onOne(i, n);
          step();
        });
      }
      for (var i = 0; i < workers; i++) step();
    });
  }

  /* --------------------------------------------------------- 分类逻辑 */
  function localNetSet() {   // {'192.168.1': true, ...} 本机所在 /24
    var m = {};
    S.localIPs.forEach(function (r) {
      if (r.mdns) return;
      var p = r.ip.split('.');
      m[p[0] + '.' + p[1] + '.' + p[2]] = true;
    });
    return m;
  }
  function isSelf(ip) {
    for (var i = 0; i < S.localIPs.length; i++) if (S.localIPs[i].ip === ip && !S.localIPs[i].mdns) return true;
    return false;
  }
  function isAPIPA(ip) { return /^169\.254\./.test(ip); }

  function classify(ip) {
    if (isSelf(ip)) return 'self';
    if (isAPIPA(ip)) return 'apipa';
    var p = ip.split('.');
    var nets = localNetSet();
    if (nets[p[0] + '.' + p[1] + '.' + p[2]]) {
      var last = parseInt(p[3], 10);
      return (last === 1 || last === 254) ? 'gw' : 'dev';
    }
    // 本机网段未识别时，退化为「同网段设备」
    var last2 = parseInt(p[3], 10);
    if (last2 === 1 || last2 === 254) return 'gw';
    return 'dev';
  }

  var KIND = {
    self:   { label: '本机',        color: 'var(--info)', bg: 'rgba(56,189,248,.14)',  note: '本电脑网卡地址（WebRTC 识别）' },
    gw:     { label: '网关/路由器', color: 'var(--warn)', bg: 'rgba(255,176,32,.14)',  note: '网段首/末地址，通常为网关' },
    dev:    { label: '接入设备',    color: 'var(--ok)',   bg: 'rgba(16,185,129,.14)',  note: '同网段内其它在线主机' },
    remote: { label: '跨网段设备',  color: 'var(--acc)',  bg: 'var(--acc3)',           note: '不在本机网段内' },
    apipa:  { label: 'APIPA',       color: 'var(--tx3)',  bg: 'rgba(91,107,126,.16)',  note: '169.254.x.x，未取到 DHCP 地址' }
  };

  /* -------------------------------- 按开放端口推测设备类型（仅提示） */
  var TYPE_RULES = [
    { t: '投屏 / Chromecast',    p: [8008, 8009, 8443] },
    { t: '打印机（JetDirect）',  p: [9100, 631, 515] },
    { t: 'NAS / 群晖类',         p: [5000, 5001, 7000] },
    { t: 'IPC 摄像头 / NVR',     p: [37777, 34567, 8000, 554] },
    { t: '路由器 / 交换机管理页', p: [8080, 8888, 8081, 8443] },
    { t: 'HTTPS 服务',           p: [443] },
    { t: 'HTTP 服务',            p: [80] }
  ];
  function guessType(ports) {
    var set = {};
    ports.forEach(function (x) { set[x.port] = true; });
    for (var i = 0; i < TYPE_RULES.length; i++) {
      for (var j = 0; j < TYPE_RULES[i].p.length; j++) {
        if (set[TYPE_RULES[i].p[j]]) return TYPE_RULES[i].t;
      }
    }
    return '—';
  }

  /* ------------------------------------------------------------- 渲染 */
  function renderLocal(info) {
    var box = $('ip-local-box');
    if (!box) return;
    if (info && info.err) {
      box.innerHTML = '<div class="ip-note err">无法自动探测：' + esc(info.err) + '</div>';
      return;
    }
    var h = '';
    var real = (info.hosts || []).filter(function (r) { return !r.mdns; });
    var mdns = (info.hosts || []).filter(function (r) { return r.mdns; });

    if (real.length) {
      h += '<div class="ip-note ok">识别到本机 <b>' + real.length + '</b> 个局域网地址' +
           (real.length > 1 ? '（多网卡：Wi-Fi / 以太网 / 虚拟机会各有一个）' : '') + '：</div>';
      h += '<div class="ip-local-list">';
      real.forEach(function (r) {
        h += '<div class="ip-self"><span class="ip-self-ip">' + esc(r.ip) + '</span>' +
             '<span class="ip-self-tag">本机</span></div>';
      });
      h += '</div>';
    } else {
      h += '<div class="ip-note warn">未识别到本机局域网 IP，请在下方<b>手动填写网段</b>后扫描（本机将不会高亮）。</div>';
    }
    if (mdns.length) {
      h += '<div class="ip-note warn">浏览器把本机地址混淆成了 mDNS 名字（' +
           esc(mdns.map(function (r) { return r.ip; }).join('、')) +
           '）—— Chrome 86+ 的防指纹策略。请<b>手动填写网段</b>，或改用 Firefox / Safari。</div>';
    }
    if (info.srflx && info.srflx.length) {
      h += '<div class="ip-note">NAT 公网出口（参考）：' +
           esc(info.srflx.map(function (r) { return r.ip; }).join('、')) + '</div>';
    }
    box.innerHTML = h;

    if (real.length) {
      // 直接填「可用主机区间」.1-254，而不是 .0/24：
      // .0 是网段地址、.255 是广播地址，永远不会有主机，扫它们只是白等两个超时。
      var seg = real[0].ip.split('.');
      var guess = seg[0] + '.' + seg[1] + '.' + seg[2] + '.1-254';
      var inp = $('ip-range');
      var old = inp ? String(inp.value || '').trim() : '';
      var isDefault = !old || /^\d{1,3}(\.\d{1,3}){3}$/.test(old) === false &&
                      (/^192\.168\.\d{1,3}\.0(\/24|-255)$/.test(old) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.0\/24$/.test(old));
      if (inp && (isDefault || !old)) inp.value = guess;
      var nets = {};
      real.forEach(function (r) { var s = r.ip.split('.'); nets[s[0] + '.' + s[1] + '.' + s[2] + '.1-254'] = 1; });
      var ks = Object.keys(nets);
      if (ks.length > 1) {
        box.insertAdjacentHTML('beforeend',
          '<div class="ip-note">本机分布在多个网段：' + esc(ks.join('、')) +
          '。已填入第一个，扫其它网段请手动改。</div>');
      }
      box.insertAdjacentHTML('beforeend',
        '<div class="ip-note ok">已按本机网段填入扫描范围 <b>' + esc(guess) +
        '</b>（.1~.254 共 254 个可用主机地址，已自动跳过网段地址 .0 与广播地址 .255）。</div>');
    }
  }

  function setProgress(pct, txt) {
    var bar = $('ip-bar'), t = $('ip-prog-txt');
    if (bar) bar.style.width = clamp(pct, 0, 100) + '%';
    if (t) t.innerHTML = txt || '';
  }

  function visibleRows() {
    var alive = S.results.slice();
    var rows = [];
    if (S.filter === 'alive' || S.filter === 'all' || KIND[S.filter]) {
      alive.forEach(function (r) {
        if (S.filter === 'all' || S.filter === 'alive' || r.kind === S.filter) rows.push(r);
      });
    }
    if (S.filter === 'all' || S.filter === 'dead') {
      S.dead.forEach(function (ip) { rows.push({ ip: ip, kind: 'dead', ports: [], ms: 0 }); });
    }
    rows.sort(function (a, b) {
      if (S.sortKey === 'ms') return (a.ms - b.ms) * S.sortDir;
      return (ip2int(a.ip) - ip2int(b.ip)) * S.sortDir;
    });
    return rows;
  }

  function renderResults(force) {
    var box = $('ip-rst');
    if (!box) return;
    var el = S.t0 ? (now() - S.t0) : 0;
    var rate = el > 200 ? (S.scanned / (el / 1000)) : 0;

    var cnt = { self: 0, gw: 0, dev: 0, remote: 0, apipa: 0 };
    S.results.forEach(function (r) { cnt[r.kind] = (cnt[r.kind] || 0) + 1; });

    var h = '<div class="rst-grid">';
    h += '<div class="rst-item"><div class="rst-lbl">已扫地址</div><div class="rst-val">' + S.scanned + ' / ' + S.total + '</div></div>';
    h += '<div class="rst-item"><div class="rst-lbl">在线主机</div><div class="rst-val" style="color:var(--ok)">' + S.results.length + '</div></div>';
    h += '<div class="rst-item"><div class="rst-lbl">本机</div><div class="rst-val" style="color:var(--info)">' + cnt.self + '</div></div>';
    h += '<div class="rst-item"><div class="rst-lbl">网关</div><div class="rst-val" style="color:var(--warn)">' + cnt.gw + '</div></div>';
    h += '<div class="rst-item"><div class="rst-lbl">接入设备</div><div class="rst-val" style="color:var(--ok)">' + cnt.dev + '</div></div>';
    h += '<div class="rst-item"><div class="rst-lbl">耗时</div><div class="rst-val">' + (el / 1000).toFixed(1) + 's</div></div>';
    h += '</div>';

    /* 筛选 / 排序工具条 */
    h += '<div class="ip-toolbar">';
    var flt = [
      ['all', '全部 ' + (S.results.length + S.dead.length)],
      ['alive', '仅在线 ' + S.results.length],
      ['dead', '仅离线 ' + S.dead.length],
      ['self', '本机 ' + cnt.self],
      ['gw', '网关 ' + cnt.gw],
      ['dev', '接入设备 ' + cnt.dev]
    ];
    flt.forEach(function (f) {
      if (f[0] !== 'all' && f[0] !== 'alive' && f[0] !== 'dead' && !cnt[f[0]]) return;
      h += '<button class="ip-fbtn' + (S.filter === f[0] ? ' on' : '') + '" onclick="ipSetFilter(\'' + f[0] + '\')">' + f[1] + '</button>';
    });
    h += '<span class="ip-tb-sep"></span>';
    h += '<button class="ip-fbtn' + (S.sortKey === 'ip' ? ' on' : '') + '" onclick="ipSetSort(\'ip\')">按 IP ' + (S.sortKey === 'ip' ? (S.sortDir > 0 ? '↑' : '↓') : '') + '</button>';
    h += '<button class="ip-fbtn' + (S.sortKey === 'ms' ? ' on' : '') + '" onclick="ipSetSort(\'ms\')">按响应 ' + (S.sortKey === 'ms' ? (S.sortDir > 0 ? '↑' : '↓') : '') + '</button>';
    h += '</div>';

    var rows = visibleRows();
    if (!rows.length) {
      h += '<div class="rst-empty">' + (S.scanned ? '当前筛选下没有记录。' : '暂无结果。先点「探测本机 IP」，再点「开始扫描」。') + '</div>';
      box.innerHTML = h;
      return;
    }

    var cap = 300, shown = rows.slice(0, cap);
    h += '<div class="tbl-scroll"><table class="tbl"><thead><tr>' +
         '<th style="width:52px">状态</th><th style="width:26px"></th><th style="width:118px">IP 地址</th>' +
         '<th style="width:120px">分类</th><th style="width:190px">开放端口</th>' +
         '<th style="width:74px">响应</th><th style="width:150px">推测类型</th><th style="width:64px">操作</th>' +
         '</tr></thead><tbody>';
    shown.forEach(function (r) {
      if (r.kind === 'dead') {
        h += '<tr class="ip-row-dead">' +
          '<td><span class="ip-dot off"></span></td><td></td>' +
          '<td class="ip-mono">' + esc(r.ip) + '</td>' +
          '<td colspan="4" style="color:var(--tx3)">无响应（未开放 HTTP 端口，或设备禁 ping / 不在本机网段）</td>' +
          '<td></td></tr>';
        return;
      }
      var k = KIND[r.kind] || KIND.dev;
      var ports = r.ports.map(function (p) {
        return '<span class="ip-port">' + (p.scheme === 'https' ? '🔒' : '') + p.port + '</span>';
      }).join('') || '<span style="color:var(--tx3)">—</span>';
      var openUrl = r.ports.length
        ? (r.ports[0].scheme === 'https' ? 'https' : 'http') + '://' + r.ip + ':' + r.ports[0].port + '/'
        : '';
      h += '<tr>' +
        '<td><span class="ip-dot on"></span></td>' +
        '<td>' + (r.icon ? '<img class="ip-ico" src="' + esc(r.icon) + '" alt="" onerror="this.style.display=\'none\'">' : '') + '</td>' +
        '<td class="ip-mono ip-ipcell">' + esc(r.ip) + '</td>' +
        '<td><span class="ip-badge" style="color:' + k.color + ';background:' + k.bg + '">' + k.label + '</span></td>' +
        '<td>' + ports + '</td>' +
        '<td class="ip-mono">' + (r.ms ? r.ms + 'ms' : '—') + '</td>' +
        '<td>' + esc(guessType(r.ports)) + '</td>' +
        '<td>' + (openUrl ? '<a class="ip-open" href="' + esc(openUrl) + '" target="_blank" rel="noopener">打开</a>' : '') + '</td>' +
        '</tr>';
    });
    h += '</tbody></table></div>';
    if (rows.length > cap) {
      h += '<div class="hint">共 ' + rows.length + ' 条，仅显示前 ' + cap + ' 条（导出 CSV 可获取全部）。</div>';
    }
    box.innerHTML = h;
  }

  /* ------------------------------------------------------ 单机扫描逻辑 */
  function scanHost(ip, ports, discCount, timeout, innerConc, useIcon) {
    var found = [];
    var discPorts = (discCount > 0 && discCount < ports.length) ? ports.slice(0, discCount) : ports;

    function runList(list) {
      var tasks = list.map(function (p) {
        return function () {
          if (S.abort) return null;
          return probeHTTP(ip, p, timeout, 'http').then(function (r) {
            if (r.ok) { found.push({ port: p, scheme: 'http', ms: r.ms }); return; }
            if (p === 443 || p === 8443) {
              return probeHTTP(ip, p, timeout, 'https').then(function (r2) {
                if (r2.ok) found.push({ port: p, scheme: 'https', ms: r2.ms });
              });
            }
          });
        };
      });
      return pool(tasks, Math.max(1, Math.min(innerConc, tasks.length)));
    }

    function finish() {
      found.sort(function (a, b) { return a.port - b.port; });
      var out = { alive: true, ports: found, icon: '' };
      if (!useIcon || !found.length) return Promise.resolve(out);
      var hp = null;
      for (var i = 0; i < found.length; i++) if (found[i].scheme === 'http') { hp = found[i].port; break; }
      if (hp == null) return Promise.resolve(out);
      return probeIcon(ip, hp, Math.max(timeout, 1200)).then(function (ic) {
        if (ic.ok) out.icon = ic.url;
        return out;
      });
    }

    return runList(discPorts).then(function () {
      if (S.abort) return { alive: false, aborted: true };
      if (!found.length) return { alive: false };
      var known = {};
      found.forEach(function (f) { known[f.port] = 1; });
      var rest = ports.filter(function (p) { return !known[p]; });
      if (!rest.length) return finish();
      return runList(rest).then(finish);
    });
  }

  /* ------------------------------------------------------------- 动作 */
  window.ipDetectLocal = function () {
    var btn = $('ip-detect-btn');
    var box = $('ip-local-box');
    if (box) box.innerHTML = '<div class="rst-empty">正在探测本机网卡地址…</div>';
    if (btn) btn.disabled = true;
    detectLocalIPs(2600).then(function (info) {
      if (btn) btn.disabled = false;
      if (info.err) { S.localIPs = []; S.publicIPs = []; renderLocal(info); return; }
      S.localIPs = info.hosts || [];
      S.publicIPs = info.srflx || [];
      renderLocal(info);
      renderResults(true);
    });
  };

  function discCountOf(mode, portsLen) {
    if (mode === 'deep') return 0;                 // 0 = 全端口
    if (mode === 'fast') return Math.min(2, portsLen);
    return Math.min(6, portsLen);                  // std
  }

  window.ipScanStart = function () {
    if (S.running) return;
    var rangeInp = $('ip-range');
    // 网段留空时不猜、不默认扫 .0-.255：优先用已探测到的本机网段自动补齐，
    // 探测不到就明确报错让用户填，避免默认扫一整个与本机无关的网段。
    if (rangeInp && !String(rangeInp.value || '').trim()) {
      var sug = suggestRange();
      if (sug) {
        rangeInp.value = sug;
        window.ipScanMsg('网段为空，已自动使用本机网段 ' + sug + '（.1~.254）', false);
      }
    }
    var skipEl = $('ip-skipbc');
    var r = parseRange((rangeInp || {}).value, { skipBc: skipEl ? !!skipEl.checked : true });
    if (r.err) { window.ipScanMsg(r.err, true); return; }
    var ports = parsePorts(($('ip-ports') || {}).value);
    if (!ports.length) { window.ipScanMsg('请至少填写一个端口', true); return; }
    var conc = clamp(($('ip-conc') || {}).value, 1, 120) || 24;
    var timeout = clamp(($('ip-timeout') || {}).value, 100, 8000) || 900;
    var mode = (($('ip-mode') || {}).value) || 'std';
    var useIcon = !!(($('ip-icon') || {}).checked);
    var innerConc = clamp(($('ip-pconc') || {}).value, 1, 16) || 4;
    var discCount = discCountOf(mode, ports.length);

    S.running = true; S.abort = false;
    S.results = []; S.dead = []; S.scanned = 0; S.total = r.ips.length; S.t0 = now();
    if (r.skipped) {
      window.ipScanMsg('已跳过 ' + r.skipped + ' 个不可分配地址（网段地址 / 广播地址），实际扫描 ' +
                       r.ips.length + ' 个可用主机地址。', false);
    } else {
      window.ipScanMsg('', false);
    }
    setProgress(0, '0 / ' + S.total);
    renderResults(true);

    var ips = r.ips;
    var lastPaint = 0;

    var hostTasks = ips.map(function (ip) {
      return function () {
        if (S.abort) return null;
        return scanHost(ip, ports, discCount, timeout, innerConc, useIcon).then(function (res) {
          S.scanned++;
          if (res.alive) {
            var ms = Math.min.apply(null, res.ports.map(function (x) { return x.ms; }));
            S.results.push({ ip: ip, kind: classify(ip), ports: res.ports, ms: ms, icon: res.icon || '' });
          } else if (!res.aborted) {
            S.dead.push(ip);
          }
        });
      };
    });

    pool(hostTasks, conc, function (i, n) {
      var pct = (i / n) * 100;
      var el = now() - S.t0;
      var rate = el > 200 ? (i / (el / 1000)) : 0;
      var eta = rate ? ((n - i) / rate) : 0;
      setProgress(pct, i + ' / ' + n + '　·　在线 ' + S.results.length +
        (rate ? '　·　' + rate.toFixed(0) + ' 台/秒' : '') +
        (eta > 0.5 ? '　·　剩余 ' + eta.toFixed(0) + 's' : ''));
      if (now() - lastPaint > 350 || i === n) { lastPaint = now(); renderResults(); }
    }).then(function () {
      S.running = false;
      renderResults(true);
      setProgress(100, '完成 ' + S.scanned + ' / ' + S.total + '　·　在线 ' + S.results.length);
      window.ipScanMsg(S.abort ? '已中止扫描（结果保留）' :
        ('扫描完成：共 ' + S.total + ' 个地址，在线 ' + S.results.length +
         ' 台，离线 ' + S.dead.length + ' 个。' +
         (S.results.length ? '' : ' 若确认网段内有设备却一台都没扫到，多半是这些设备没开 HTTP 端口（见下方「原理与能力边界」）。')), S.abort);
    });
  };

  window.ipScanStop = function () {
    if (!S.running) return;
    S.abort = true;
    window.ipScanMsg('正在中止…', false);
  };

  window.ipScanClear = function () {
    S.results = []; S.dead = []; S.scanned = 0; S.total = 0;
    renderResults(true);
    setProgress(0, '');
    window.ipScanMsg('', false);
  };

  window.ipSetFilter = function (f) {
    S.filter = f;
    if (f === 'dead' || f === 'all') S.sortKey = 'ip';
    renderResults(true);
  };

  window.ipSetSort = function (k) {
    if (S.sortKey === k) S.sortDir = -S.sortDir;
    else { S.sortKey = k; S.sortDir = 1; }
    renderResults(true);
  };

  window.ipScanMsg = function (txt, isErr) {
    var e = $('ip-msg');
    if (!e) return;
    e.textContent = txt || '';
    e.style.color = isErr ? 'var(--err)' : 'var(--tx2)';
  };

  /* --------------------------------------------------------- 导出/复制 */
  function sortedAlive() {
    return S.results.slice().sort(function (a, b) { return ip2int(a.ip) - ip2int(b.ip); });
  }

  function buildCSV() {
    var rows = [['IP', '状态', '分类', '开放端口', '推测类型', '响应(ms)', '备注']];
    sortedAlive().forEach(function (r) {
      var k = KIND[r.kind] || KIND.dev;
      rows.push([
        r.ip, '在线', k.label,
        r.ports.map(function (p) { return (p.scheme === 'https' ? 'https:' : '') + p.port; }).join(' '),
        guessType(r.ports), r.ms || '', k.note
      ]);
    });
    S.dead.slice().sort(function (a, b) { return ip2int(a) - ip2int(b); }).forEach(function (ip) {
      rows.push([ip, '离线', '', '', '', '', '无 HTTP 响应']);
    });
    return '\uFEFF' + rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
  }

  function buildText() {
    var out = sortedAlive().map(function (r) {
      var k = KIND[r.kind] || KIND.dev;
      return r.ip + '  [' + k.label + ']  ' +
        (r.ports.map(function (p) { return p.port; }).join(',') || '-') + '  ' + guessType(r.ports);
    });
    if (S.dead.length) {
      out.push('');
      out.push('离线地址（' + S.dead.length + '）：' + S.dead.slice().sort(function (a, b) { return ip2int(a) - ip2int(b); }).join(', '));
    }
    return out.join('\n');
  }

  window.ipExportCSV = function () {
    if (!S.results.length && !S.dead.length) { window.ipScanMsg('没有可导出的结果', true); return; }
    try {
      var blob = new Blob([buildCSV()], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'SparK-LAN扫描-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '') + '.csv';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
      window.ipScanMsg('已导出 CSV（含在线 ' + S.results.length + ' + 离线 ' + S.dead.length + '）', false);
    } catch (e) { window.ipScanMsg('导出失败：' + (e && e.message || e), true); }
  };

  window.ipCopyResult = function () {
    if (!S.results.length && !S.dead.length) { window.ipScanMsg('没有可复制的结果', true); return; }
    var txt = buildText();
    function ok() { window.ipScanMsg('已复制到剪贴板', false); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var r = document.execCommand('copy');
        ta.remove();
        r ? ok() : window.ipScanMsg('复制失败，请手动选中结果', true);
      } catch (e) { window.ipScanMsg('复制失败：' + (e && e.message || e), true); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(ok, fallback);
    } else fallback();
  };

  /* --------------------------------------------------------------- 初始化 */
  // 不随页面加载自动探测：本工具主打离线，探测本机 IP 需触发一次 WebRTC/STUN，
  // 只在用户真正打开这一页时才做，避免每次开首页都发起无谓的网络活动。
  function init() {
    var sec = $('s-ipscan');
    if (!sec) return;
    var fired = false;
    function check() {
      if (fired) return;
      if (sec.classList && sec.classList.contains('on')) {
        fired = true;
        if (window.ipDetectLocal) window.ipDetectLocal();
      }
    }
    if (typeof MutationObserver !== 'undefined') {
      try { new MutationObserver(check).observe(sec, { attributes: true, attributeFilter: ['class'] }); } catch (e) {}
    }
    var inp = $('ip-range');
    if (inp && !String(inp.value || '').trim()) check();   // 网段留空 ⇒ 还没探测过
    setTimeout(check, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
