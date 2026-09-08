// 把 Web 版 examimport.js（题库导入解析器）同步到小程序端
// 单一数据源：解析器只改 Web 版，重跑本脚本即可双端一致。
// examimport.js 同时支持 module.exports / window.ExamImport，故小程序可直接 require。
// 用法：node export_examimport_to_mp.js
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'examimport.js');
const OUT_DIR = path.join(__dirname, '微信小程序版本', 'utils');
const OUT = path.join(OUT_DIR, 'examimport.js');

if (!fs.existsSync(SRC)) { console.error('未找到 examimport.js'); process.exit(1); }
const code = fs.readFileSync(SRC, 'utf8');

// 基本校验：必须同时具备双端导出能力
if (code.indexOf('module.exports') < 0 || code.indexOf('window.ExamImport') < 0) {
  console.error('examimport.js 缺少双端导出（module.exports / window.ExamImport）');
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const head =
  '// SparK 小程序 · 题库导入解析器（TXT / CSV / JSON）\n' +
  '// ⚠️ 本文件由根目录 export_examimport_to_mp.js 从 Web 版 examimport.js 自动同步，请勿手工编辑。\n' +
  '//    修改请改 Web 版 examimport.js 后重新运行：node export_examimport_to_mp.js\n\n';

fs.writeFileSync(OUT, head + code, 'utf8');

// 冒烟：在 Node 里 require 一遍，确认解析能力正常
try {
  const API = require(OUT);
  const r = API.parse('1、电动机外壳一定要有可靠的保护接地或接零。(✔)\n2、特种作业人员必须年满( )周岁。 A、19 B、18 C、20【答案】B');
  if (r.list.length !== 2) throw new Error('冒烟解析题数异常: ' + r.list.length);
  console.log('同步并冒烟通过 ->', OUT);
  console.log('  版本:', API.VERSION, ' 冒烟解析:', r.list.length, '题');
} catch (e) {
  console.error('冒烟失败:', e.message);
  process.exit(1);
}
console.log('  文件大小:', (fs.statSync(OUT).size / 1024).toFixed(1), 'KB');
