/* =========================================================================
   SparK · 电工证题库「导入解析器」 examimport.js  (v20260909-1)
   -------------------------------------------------------------------------
   用户在培训机构 / 官方 App / 可靠渠道拿到的完整题库（常见 1400 题左右），
   往往以 TXT、CSV、JSON 三种形式存在。本文件把这三种格式统一解析成
   SparK 内部题目结构，导入后与内置题库合并使用。

   ⚠️ 设计原则：本文件只做「格式解析」，不校验答案的专业正确性。
      答案准确性由导入数据的来源保证，导入界面会提示用户自行核对。

   内部题目结构（与 exam.js 完全一致）：
     { id, type:'judge'|'single'|'multi', cat, q, a, b, c, d, ans, exp }
     · judge  : a='正确' b='错误'，ans 取 'a' 或 'b'
     · single : a~d 四选一，ans 取单字母
     · multi  : a~d 四选多，ans 取排序后的字母串，如 'bcd'

   对外 API：
     ExamImport.detect(text)  -> 'json' | 'csv' | 'txt' | 'empty'
     ExamImport.parse(text, opts) -> { ok, format, list, errors, stats }
       opts: { defaultCat:'导入题库', keepExp:true }
   同时兼容 CommonJS（小程序端 require）与浏览器（window.ExamImport）。
   ========================================================================= */
(function () {
  'use strict';

  var LETTERS = ['a', 'b', 'c', 'd'];

  /* ---------------- 通用工具 ---------------- */
  function trim(s) {
    return (s == null ? '' : String(s)).replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  }
  // 题干归一化：用于去重与交叉验证（去空白/标点/大小写）
  function norm(s) {
    return trim(s)
      .replace(/[\s\u3000]/g, '')
      .replace(/[（）()【】\[\]{}，,、。.；;：:？?！!""''《》<>\-—_/\\|]/g, '')
      .toLowerCase();
  }
  // 全角数字/字母转半角
  function toHalf(s) {
    return String(s == null ? '' : s)
      .replace(/[\uFF01-\uFF5E]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
      })
      .replace(/\u3000/g, ' ');
  }
  function uniq(arr) {
    var o = {}, r = [];
    for (var i = 0; i < arr.length; i++) { if (!o[arr[i]]) { o[arr[i]] = 1; r.push(arr[i]); } }
    return r;
  }

  /* ---------------- 格式识别 ---------------- */
  function detect(text) {
    var t = trim(text);
    if (!t) return 'empty';
    var head = t.charAt(0);
    if (head === '[' || head === '{') {
      try {
        var o = JSON.parse(t);
        if (Array.isArray(o)) return 'json';
        if (o && (Array.isArray(o.q) || Array.isArray(o.questions) || Array.isArray(o.list) || Array.isArray(o.data))) return 'json';
      } catch (e) { /* 继续往下判断 */ }
    }
    // CSV：首行按分隔符切出的列里能认出题干/答案表头
    var lines = t.split(/\r?\n/);
    for (var li = 0; li < Math.min(3, lines.length); li++) {
      var d = pickDelim(lines[li]);
      if (!d) continue;
      var cols = splitCSVLine(lines[li], d).map(trim);
      if (cols.length >= 3 && (matchCol(cols, 'stem') >= 0 || matchCol(cols, 'answer') >= 0)) return 'csv';
    }
    return 'txt';
  }

  function pickDelim(line) {
    var cands = [',', '\t', ';', '|'], best = null, bn = 0;
    for (var i = 0; i < cands.length; i++) {
      var n = (line.split(cands[i]).length - 1);
      if (n > bn) { bn = n; best = cands[i]; }
    }
    return bn >= 1 ? best : null;
  }

  function splitCSVLine(line, d) {
    var out = [], cur = '', inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === '"') {
        if (inQ && line.charAt(i + 1) === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === d && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  /* ---------------- 表头 / 字段映射 ---------------- */
  var ALIAS = {
    stem:   ['题干', '题目', '题目内容', '问题', '题名', 'question', 'q', 'title', 'content', 'stem', 'name', 'text'],
    a:      ['a', '选项a', '选项1', 'optiona', 'option_a', 'opt_a', 'opt1', 'a选项', 'choicea'],
    b:      ['b', '选项b', '选项2', 'optionb', 'option_b', 'opt_b', 'opt2', 'b选项', 'choiceb'],
    c:      ['c', '选项c', '选项3', 'optionc', 'option_c', 'opt_c', 'opt3', 'c选项', 'choicec'],
    d:      ['d', '选项d', '选项4', 'optiond', 'option_d', 'opt_d', 'opt4', 'd选项', 'choiced'],
    answer: ['答案', '正确答案', '正确选项', 'answer', 'ans', 'result', 'correct', 'key', 'right'],
    exp:    ['解析', '解释', '分析', 'explanation', 'exp', 'remark', 'note', '说明', '备注'],
    cat:    ['分类', '类别', '章节', '知识点', 'category', 'cat', 'chapter', 'type2', 'group'],
    type:   ['题型', '题目类型', 'type', 'qtype', 'kind']
  };

  function matchCol(cols, key) {
    var names = ALIAS[key] || [];
    for (var i = 0; i < cols.length; i++) {
      var c = trim(cols[i]).toLowerCase().replace(/[\s\u3000]/g, '');
      if (!c) continue;
      for (var j = 0; j < names.length; j++) {
        if (c === names[j]) return i;
      }
    }
    // 次优：包含匹配（避免"选项A"被当成"答案"等误判，仅对 answer/exp/cat/type 用）
    if (key === 'answer' || key === 'exp' || key === 'cat' || key === 'type' || key === 'stem') {
      for (var k = 0; k < cols.length; k++) {
        var c2 = trim(cols[k]).toLowerCase().replace(/[\s\u3000]/g, '');
        for (var m = 0; m < names.length; m++) {
          if (c2 && c2.indexOf(names[m]) >= 0 && c2.length <= names[m].length + 2) return k;
        }
      }
    }
    return -1;
  }

  /* ---------------- 答案解析 ----------------
     支持：A / a / AB / A,B / 【答案】B / 答案：B / （ B ） / 第2项 / 2
     判断题支持：✔ √ 对 正确 true T  → a ；✘ × 错 错误 false F → b
     返回 { letters:'b' 或 'bcd' 或 null, isJudge:bool }
  ------------------------------------------- */
  function parseAnswer(raw) {
    var s = trim(toHalf(raw));
    if (!s) return { letters: null, isJudge: false };

    // 判断题：对/错 语义
    if (/^(✔|√|√|对|正确|true|t|yes|y|是|√√)$/i.test(s)) return { letters: 'a', isJudge: true };
    if (/^(✘|×|x|错|错误|false|f|no|n|否)$/i.test(s)) return { letters: 'b', isJudge: true };

    // 提取字母集合（允许 A、B、C、D，忽略分隔符）
    var m = s.match(/[a-dA-D]/g);
    if (m && m.length) {
      var ls = uniq(m.map(function (x) { return x.toLowerCase(); })).sort();
      if (ls.length) return { letters: ls.join(''), isJudge: false };
    }
    // 纯数字：视为 1 基选项序号
    if (/^\d+$/.test(s)) {
      var n = parseInt(s, 10);
      if (n >= 1 && n <= 4) return { letters: LETTERS[n - 1], isJudge: false };
      // 判断题用 1/0 表示对错的情况
      if (n === 1) return { letters: 'a', isJudge: true };
      if (n === 0) return { letters: 'b', isJudge: true };
    }
    return { letters: null, isJudge: false };
  }

  /* ---------------- 单题规范化 ---------------- */
  // raw: { q, a,b,c,d, ans, type, cat, exp }
  function toQuestion(raw, idx, defaultCat) {
    var q = trim(raw.q || '');
    if (!q) return null;

    var opts = [raw.a, raw.b, raw.c, raw.d].map(function (x) { return trim(x); });
    var hasOpt = opts.filter(function (x) { return x !== ''; }).length;

    var pr = parseAnswer(raw.ans);
    var letters = pr.letters;

    var type = trim(raw.type || '').toLowerCase();
    var isJudge = pr.isJudge || /判|judge|tf|bool/.test(type) ||
      (hasOpt === 0 && letters && letters.length === 1);

    if (isJudge) {
      // 判断题：固定 正确/错误 两选项
      return {
        id: 'imp' + (idx + 1),
        type: 'judge',
        cat: trim(raw.cat) || defaultCat,
        q: q,
        a: '正确', b: '错误',
        ans: letters === 'b' ? 'b' : 'a',
        exp: trim(raw.exp || '')
      };
    }

    if (!letters) return null;                       // 无答案，丢弃
    if (hasOpt < 2) return null;                     // 选项不足，丢弃
    // 答案字母必须都落在已有选项内
    for (var i = 0; i < letters.length; i++) {
      if (LETTERS.indexOf(letters.charAt(i)) < 0 || !opts[LETTERS.indexOf(letters.charAt(i))]) return null;
    }
    var t = (letters.length > 1) ? 'multi' : 'single';
    if (/多|multi|m$/.test(type)) t = 'multi';
    if (/单|single|s$/.test(type) && letters.length === 1) t = 'single';

    var out = {
      id: 'imp' + (idx + 1),
      type: t,
      cat: trim(raw.cat) || defaultCat,
      q: q,
      ans: letters,
      exp: trim(raw.exp || '')
    };
    for (var k = 0; k < 4; k++) { if (opts[k]) out[LETTERS[k]] = opts[k]; }
    return out;
  }

  /* =======================================================
     TXT 解析（网页/文档复制出来的主流写法）
     ======================================================= */
  var RE_NUM  = /(^|\n)\s*(\d{1,4})\s*[、.．､,，:：)）]\s*/g;   // 题号
  var RE_OPT  = /^\s*[\(（\[【]?\s*([A-Da-d])\s*[\)）\]】]?\s*[、.．､,，:：)（(]\s*(.+?)\s*$/;
  var RE_ANS1 = /[【\[（(]\s*答\s*案\s*[】\]）)]?\s*[：:]?\s*([^（(【\[\n\r）)】\]]{1,12})/;  // 【答案】B / (答案:B)
  var RE_ANS2 = /(?:正确答案|答案|参考答案)\s*[：:＝=]?\s*([^（(【\[\n\r）)】\]]{1,12})/;
  var RE_ANS3 = /[（(]\s*([A-Da-d]{1,4})\s*[）)]\s*$/;          // 行尾 （B）
  var RE_ANS4 = /[（(]\s*([A-Da-d]{1,4})\s*[）)]/;              // 任意 （B）
  var RE_EXP  = /(?:【\s*解析\s*】|【\s*解释\s*】|解析\s*[：:])\s*([\s\S]*)$/;
  var RE_TYPE = /[【\[（(]\s*(单选题|多选题|判断题|单项选择|多项选择|判断)\s*[】\]）)]/;
  var RE_CAT_LINE = /^\s*[（(【\[]?\s*([一二三四五六七八九十百]+[、.．]|[A-Za-z]\s*[、.．])?\s*([\u4e00-\u9fa5A-Za-z0-9（）()·\/＋+\-—\s]{2,20}?)\s*[】\]）)]?\s*$/;

  // 字符位置 -> 0 基行号
  function lineAt(s, pos) {
    var n = 0;
    for (var i = 0; i < pos; i++) if (s.charAt(i) === '\n') n++;
    return n;
  }

  function parseTXT(text, defaultCat) {
    var t = toHalf(text).replace(/\r\n?/g, '\n');
    var lines = t.split('\n');

    // 1) 识别章节/分类标题行（形如「一、安全生产与法规」「【电气安全】」），
    //    并给每一行记录"当前所属分类"，供后续切块时归属使用。
    var catOf = [], cur = '';
    for (var i = 0; i < lines.length; i++) {
      var ln = trim(lines[i]);
      var isTitle = false, name = '';
      if (ln && !/^\d{1,4}\s*[、.．､]/.test(ln)) {
        var mx = ln.match(/^[一二三四五六七八九十]+\s*[、.．]\s*(.+)$/);
        if (mx && ln.length <= 30) { isTitle = true; name = trim(mx[1]); }
        if (!isTitle) {
          var my = ln.match(/^[（(【\[]\s*(.+?)\s*[）)】\]]$/);
          if (my && ln.length <= 30 && !RE_TYPE.test(ln)) { isTitle = true; name = trim(my[1]); }
        }
      }
      // 排除"A、xxx"这类被误判为标题的选项行
      if (isTitle && name && !/^[（(【\[]?[A-Da-d][）)】\]]?\s*[、.．､]/.test(name)) {
        cur = name;
        lines[i] = '';                       // 标题行从正文移除
      }
      catOf[i] = cur;
    }
    t = lines.join('\n');

    // 2) 按题号切块
    var marks = [], m;
    RE_NUM.lastIndex = 0;
    while ((m = RE_NUM.exec(t)) !== null) {
      // idx : 题号「之后」，本块正文起点
      // mark: 题号「之前」，上一块的终点（否则上一块会把下一题题号吞进题干）
      marks.push({ idx: m.index + m[0].length, mark: m.index + m[1].length });
    }

    var blocks = [], cats = [];
    if (marks.length >= 1) {
      for (var b = 0; b < marks.length; b++) {
        var start = marks[b].idx;
        var end = (b + 1 < marks.length) ? marks[b + 1].mark : t.length;
        var ls = t.lastIndexOf('\n', start) + 1;   // 回退到本行行首，保证题号完整
        blocks.push(t.slice(ls, end));
        cats.push(catOf[lineAt(t, ls)] || '');
      }
    } else {
      // 无题号：按空行分块
      var segs = t.split(/\n\s*\n+/).filter(function (x) { return trim(x); });
      for (var s = 0; s < segs.length; s++) { blocks.push(segs[s]); cats.push(cur || ''); }
    }

    var list = [], errors = [];
    for (var k = 0; k < blocks.length; k++) {
      var blk = trim(blocks[k]);
      if (!blk) continue;
      var item = parseBlock(blk, cats[k]);
      if (!item) { errors.push('第 ' + (k + 1) + ' 块解析失败（缺题干/选项/答案）：' + blk.slice(0, 40)); continue; }
      item.cat = item.cat || defaultCat;
      list.push(item);
    }
    // 重新编号（过滤失败项后 id 连续）
    list.forEach(function (it, i) { it.id = 'imp' + (i + 1); });
    return { list: list, errors: errors };
  }

  function parseBlock(blk, hintCat) {
    var body = blk.replace(/^\s*\d{1,4}\s*[、.．､,，:：)）]\s*/, '');
    if (!trim(body)) return null;

    var typeHint = '', cat = hintCat, exp = '', ansRaw = '';

    // 题型标记
    var mt = body.match(RE_TYPE);
    if (mt) {
      typeHint = /多/.test(mt[1]) ? 'multi' : (/判/.test(mt[1]) ? 'judge' : 'single');
      body = body.replace(mt[0], ' ');
    }
    // 【分类】xxx
    var mc = body.match(/[【\[]\s*(?:分类|类别|章节|知识点)\s*[：:]?\s*([^】\]\n]{1,20})\s*[】\]]/);
    if (mc) { cat = trim(mc[1]); body = body.replace(mc[0], ' '); }

    // 解析
    var mexp = body.match(RE_EXP);
    if (mexp) { exp = trim(mexp[1]); body = body.slice(0, mexp.index); }

    // 答案
    var ma = body.match(RE_ANS1) || body.match(RE_ANS2);
    if (ma) { ansRaw = ma[1]; body = body.replace(ma[0], ' '); }
    if (!ansRaw) {
      // 仅在块尾 40 字内找「（B）」式答案，避免题干里的（A）被误当成答案
      var tail = body.slice(-40);
      var ma3 = tail.match(RE_ANS3) || tail.match(RE_ANS4);
      if (ma3) {
        ansRaw = ma3[1];
        body = body.slice(0, body.length - tail.length) + tail.replace(ma3[0], ' ');
      }
    }
    // 判断题行尾 ✔/✘
    if (!ansRaw) {
      var mj = body.match(/[（(【\[]\s*([✔√✘×对错])\s*[）)】\]]/);
      if (mj) { ansRaw = mj[1]; body = body.replace(mj[0], ' '); }
    }
    // 独立成行的纯字母答案（多选题常见写法：选项后另起一行只有 "ABCD"）
    if (!ansRaw) {
      var mline = body.match(/(?:^|\n)[ \t\u3000]*([A-Da-d]{1,4})[ \t\u3000]*(?=\n|$)/);
      if (mline) { ansRaw = mline[1]; body = body.replace(mline[0], '\n'); }
    }

    // 选项（逐行）
    var opts = {}, qLines = [];
    body.split('\n').forEach(function (ln) {
      var s = trim(ln);
      if (!s) return;
      // ① 一行挤了多个选项："A、最低 B、最高 C、平均"（必须优先于单选项判定，
      //    否则整行会被当成一个 A 选项）
      var keys = s.match(/[（(【\[]?[A-Da-d][）)】\]]?\s*[、.．､,，:：]/g) || [];
      if (keys.length >= 2) {
        var parts = s.split(/[（(【\[]?[A-Da-d][）)】\]]?\s*[、.．､,，:：]\s*/);
        var got = 0;
        for (var i = 0; i < keys.length; i++) {
          var kk = (keys[i].match(/[A-Da-d]/) || [''])[0].toLowerCase();
          if (kk && parts[i + 1] && trim(parts[i + 1])) { opts[kk] = trim(parts[i + 1]); got++; }
        }
        if (got >= 2) {
          // 题干与选项挤在同一行时，第一个选项之前的那一段就是题干，必须保留
          if (parts[0] && trim(parts[0])) qLines.push(trim(parts[0]));
          return;
        }
      }
      // ② 单个选项行："A、最低" / "(A) 最低" / "A. 最低"
      var mo = s.match(RE_OPT);
      if (mo && /^[（(【\[]?[A-Da-d][）)】\]]?\s*[、.．､,，:：]/.test(s)) {
        opts[mo[1].toLowerCase()] = trim(mo[2]);
        return;
      }
      qLines.push(s);
    });

    var q = trim(qLines.join(' '));
    if (!q) return null;

    // 判断题题干里可能残留括号答案
    if (/判/.test(typeHint) || (!Object.keys(opts).length && ansRaw)) {
      var pr0 = parseAnswer(ansRaw);
      if (pr0.isJudge) {
        return toQuestion({
          q: q, ans: pr0.letters === 'b' ? 'b' : 'a', type: 'judge', cat: cat, exp: exp
        }, 0, '');
      }
    }

    return toQuestion({
      q: q, a: opts.a, b: opts.b, c: opts.c, d: opts.d,
      ans: ansRaw, type: typeHint, cat: cat, exp: exp
    }, 0, '');
  }

  /* =======================================================
     CSV 解析
     ======================================================= */
  function parseCSV(text, defaultCat) {
    var t = toHalf(text).replace(/\r\n?/g, '\n');
    var lines = t.split('\n').filter(function (l) { return trim(l) !== ''; });
    if (lines.length < 2) return { list: [], errors: ['CSV 内容不足两行'] };
    var d = pickDelim(lines[0]);
    if (!d) return { list: [], errors: ['未识别 CSV 分隔符'] };

    var head = splitCSVLine(lines[0], d).map(trim);
    var iStem = matchCol(head, 'stem');
    var iA = matchCol(head, 'a'), iB = matchCol(head, 'b');
    var iC = matchCol(head, 'c'), iD = matchCol(head, 'd');
    var iAns = matchCol(head, 'answer');
    var iExp = matchCol(head, 'exp');
    var iCat = matchCol(head, 'cat');
    var iType = matchCol(head, 'type');

    if (iStem < 0) return { list: [], errors: ['CSV 未找到「题干/题目」列'] };
    if (iAns < 0) return { list: [], errors: ['CSV 未找到「答案」列'] };

    var list = [], errors = [];
    for (var i = 1; i < lines.length; i++) {
      var cols = splitCSVLine(lines[i], d);
      function gc(ix) { return ix >= 0 ? trim(cols[ix] || '') : ''; }
      var item = toQuestion({
        q: gc(iStem), a: gc(iA), b: gc(iB), c: gc(iC), d: gc(iD),
        ans: gc(iAns), type: gc(iType), cat: gc(iCat), exp: gc(iExp)
      }, list.length, defaultCat || '导入题库');
      if (item) list.push(item);
      else if (gc(iStem)) errors.push('第 ' + (i + 1) + ' 行解析失败：' + gc(iStem).slice(0, 30));
    }
    return { list: list, errors: errors };
  }

  /* =======================================================
     JSON 解析
     ======================================================= */
  function getField(o, key) {
    if (!o) return '';
    var names = ALIAS[key] || [];
    for (var i = 0; i < names.length; i++) {
      if (o[names[i]] != null && o[names[i]] !== '') return String(o[names[i]]);
    }
    // 大小写/空格不敏感兜底
    var keys = Object.keys(o);
    for (var j = 0; j < keys.length; j++) {
      var k = String(keys[j]).toLowerCase().replace(/[\s\u3000_]/g, '');
      for (var m = 0; m < names.length; m++) {
        if (k === String(names[m]).toLowerCase().replace(/[\s\u3000_]/g, '')) return String(o[keys[j]]);
      }
    }
    return '';
  }

  function parseJSON(text, defaultCat) {
    var o;
    try { o = JSON.parse(trim(text)); }
    catch (e) { return { list: [], errors: ['JSON 解析失败：' + e.message] }; }

    var arr = Array.isArray(o) ? o
      : (Array.isArray(o.q) ? o.q
        : Array.isArray(o.questions) ? o.questions
          : Array.isArray(o.list) ? o.list
            : Array.isArray(o.data) ? o.data : null);
    if (!arr) return { list: [], errors: ['JSON 结构未识别：需要题目数组'] };

    var list = [], errors = [];
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      if (!it || typeof it !== 'object') continue;

      var optsArr = it.options || it.choices || it.items ||
        (Array.isArray(it.opts) ? it.opts : null);
      var a = getField(it, 'a'), b = getField(it, 'b'),
        c = getField(it, 'c'), d = getField(it, 'd');
      if ((!a || !b) && Array.isArray(optsArr)) {
        a = optsArr[0] != null ? String(optsArr[0]) : '';
        b = optsArr[1] != null ? String(optsArr[1]) : '';
        c = optsArr[2] != null ? String(optsArr[2]) : '';
        d = optsArr[3] != null ? String(optsArr[3]) : '';
      }
      var stem = getField(it, 'stem') || it.question || it.q || it.title || '';
      var ans = getField(it, 'answer');
      if (!ans && it.answer != null) ans = String(it.answer);

      var item = toQuestion({
        q: stem, a: a, b: b, c: c, d: d, ans: ans,
        type: getField(it, 'type'), cat: getField(it, 'cat'), exp: getField(it, 'exp')
      }, list.length, defaultCat || '导入题库');
      if (item) list.push(item);
      else if (stem) errors.push('第 ' + (i + 1) + ' 项解析失败：' + String(stem).slice(0, 30));
    }
    return { list: list, errors: errors };
  }

  /* ---------------- 统一入口 ---------------- */
  function parse(text, opts) {
    opts = opts || {};
    var dflt = opts.defaultCat || '导入题库';
    var fmt = detect(text);
    var r = { list: [], errors: [] };

    if (fmt === 'empty') return { ok: false, format: fmt, list: [], errors: ['内容为空'], stats: null };
    if (fmt === 'json') r = parseJSON(text, dflt);
    else if (fmt === 'csv') r = parseCSV(text, dflt);
    else r = parseTXT(text, dflt);

    // 去重（同题干 + 同答案视为重复）
    var seen = {}, final = [], dup = 0;
    for (var i = 0; i < r.list.length; i++) {
      var it = r.list[i];
      var key = norm(it.q) + '|' + it.ans;
      if (seen[key]) { dup++; continue; }
      seen[key] = 1;
      it.id = 'imp' + (final.length + 1);
      final.push(it);
    }

    var by = { judge: 0, single: 0, multi: 0 }, cats = {};
    final.forEach(function (x) { by[x.type] = (by[x.type] || 0) + 1; cats[x.cat] = (cats[x.cat] || 0) + 1; });

    return {
      ok: final.length > 0,
      format: fmt,
      list: final,
      errors: r.errors,
      stats: {
        total: final.length, dup: dup,
        judge: by.judge, single: by.single, multi: by.multi,
        cats: cats,
        noExp: final.filter(function (x) { return !x.exp; }).length
      }
    };
  }

  var API = {
    detect: detect,
    parse: parse,
    norm: norm,
    trim: trim,
    parseAnswer: parseAnswer,
    VERSION: '20260909-1'
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.ExamImport = API;
})();
