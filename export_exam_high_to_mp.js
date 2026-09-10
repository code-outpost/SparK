// 从 Web 版 exam_high.js 导出高压题库，生成小程序 utils/exam_high.js
// 保证双端高压题库完全一致（单一数据源）
// 用法：node export_exam_high_to_mp.js
const fs = require('fs');
const path = require('path');

const WEB = path.join(__dirname, 'exam_high.js');
if (!fs.existsSync(WEB)) { console.log('未找到 exam_high.js'); process.exit(1); }
const code = fs.readFileSync(WEB, 'utf8');

const a = code.indexOf('var EXAM_HIGH = {');
const b = code.indexOf('/* === EXAM_HIGH_DATA_END === */');
if (a < 0 || b < 0) { console.log('未找到 EXAM_HIGH 数据区块'); process.exit(1); }
const EH = new Function(code.slice(a, b).trim() + '\nreturn EXAM_HIGH;')();

// 校验
let bad = 0;
const seen = new Set();
EH.q.forEach((q) => {
  if (seen.has(q.id)) { console.log('重复 id', q.id); bad++; }
  seen.add(q.id);
  if (EH.cats.indexOf(q.cat) < 0) { console.log('非法分类', q.id, q.cat); bad++; }
  const opts = ['a', 'b', 'c', 'd'].filter((k) => q[k] != null && q[k] !== '');
  if (q.type === 'judge' && opts.length !== 2) { console.log('判断题非 2 选项', q.id); bad++; }
  if ((q.type === 'single' || q.type === 'multi') && opts.length < 2) { console.log('选项过少', q.id); bad++; }
  if (!q.ans) { console.log('缺答案', q.id); bad++; }
  q.ans.toLowerCase().split('').forEach((l) => {
    if (opts.indexOf(l) < 0) { console.log('答案指向不存在选项', q.id, l); bad++; }
  });
  // 解析(exp)为内容可选项：公开题库（未校验）多数无官方解析，缺解析不阻断导出，仅告警。
  if (!q.exp) { console.log('[warn] 缺解析', q.id); }
});
if (bad) { console.log('数据校验失败，共', bad, '处'); process.exit(1); }

const outDir = path.join(__dirname, '微信小程序版本', 'utils');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'exam_high.js');

const body =
  '// SparK 小程序 · 高压电工证（高压电工作业）理论考试题库数据\n' +
  '// ⚠️ 本文件由根目录 export_exam_high_to_mp.js 从 Web 版 exam_high.js 自动导出，请勿手工编辑。\n' +
  '//    修改请改 Web 版后重新运行：node __build_high.js && node export_exam_high_to_mp.js\n\n' +
  'var META = ' + JSON.stringify(EH.meta, null, 2) + ';\n\n' +
  'var CATS = ' + JSON.stringify(EH.cats, null, 2) + ';\n\n' +
  'var Q = ' + JSON.stringify(EH.q, null, 2) + ';\n\n' +
  'module.exports = { META: META, CATS: CATS, Q: Q };\n';

fs.writeFileSync(outFile, body, 'utf8');

console.log('导出成功 -> ' + outFile);
console.log('题数: ' + EH.q.length + '  分类数: ' + EH.cats.length);
const cnt = {};
EH.q.forEach((q) => { cnt[q.cat] = (cnt[q.cat] || 0) + 1; });
console.log('分类分布: ' + JSON.stringify(cnt));
console.log('文件大小: ' + (fs.statSync(outFile).size / 1024).toFixed(1) + ' KB');