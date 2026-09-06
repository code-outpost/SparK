// 从 Web 版 toolbox.js 导出 TOOLS 数据，生成小程序 utils/toolbox.js
// 保证双端数据完全一致（单一数据源，避免手工转录出错）
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const WEB = path.join(__dirname, 'toolbox.js');
let code = fs.readFileSync(WEB, 'utf8');

// 在 IIFE 内把内部 TOOLS 暴露到 sandbox 上
const marker = 'var TOOLS = [';
if (code.indexOf(marker) < 0) { console.log('未找到 TOOLS 定义'); process.exit(1); }
code = code.replace(marker, 'var TOOLS = globalThis.__TOOLS = [');

function mockEl(id) {
  return {
    _id: id,
    innerHTML: '', textContent: '',
    addEventListener() {}, querySelector() { return null; },
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}, value: '', dataset: {}
  };
}
const els = {};
const sandbox = {
  console,
  document: {
    readyState: 'complete',
    getElementById(id) { return els[id] || (els[id] = mockEl(id)); },
    addEventListener() {}, querySelector() { return null; },
    createElement() { return mockEl('x'); }
  },
  setTimeout, clearTimeout
};
sandbox.window = sandbox;
vm.createContext(sandbox);
try {
  vm.runInContext(code, sandbox, { filename: 'toolbox.js' });
} catch (e) {
  console.log('执行失败:', e.message);
  process.exit(1);
}

const TOOLS = sandbox.__TOOLS;
if (!Array.isArray(TOOLS)) { console.log('未取到 TOOLS'); process.exit(1); }

const CATS = ['电力规约','Modbus','网络调试','抓包分析','文件传输','接口测试','串口调试','辅助工具'];

// 校验
let bad = 0;
const seen = new Set();
TOOLS.forEach((t, i) => {
  if (seen.has(t.key)) { console.log('重复 key', t.key); bad++; }
  seen.add(t.key);
  if (CATS.indexOf(t.cat) < 0) { console.log('非法分类', t.key, t.cat); bad++; }
  if (!t.links || !t.links.length) { console.log('缺下载链接', t.key); bad++; }
  if (!t.steps || !t.steps.length) { console.log('缺步骤', t.key); bad++; }
  if (!t.notes || !t.notes.length) { console.log('缺注意事项', t.key); bad++; }
});
if (bad) { console.log('数据校验失败，共', bad, '处'); process.exit(1); }

const outDir = path.join(__dirname, '微信小程序版本', 'utils');
const outFile = path.join(outDir, 'toolbox.js');
const body = '// SparK 小程序 · 测试工具集合数据\n' +
  '// ⚠️ 本文件由根目录 export_toolbox_to_mp.js 从 Web 版 toolbox.js 自动导出，请勿手工编辑。\n' +
  '//    修改请改 Web 版 toolbox.js 后重新运行导出脚本，保证双端数据一致。\n\n' +
  'var CATS = ' + JSON.stringify(CATS, null, 2) + ';\n\n' +
  'var TOOLS = ' + JSON.stringify(TOOLS, null, 2) + ';\n\n' +
  'module.exports = { CATS: CATS, TOOLS: TOOLS };\n';

fs.writeFileSync(outFile, body, 'utf8');

const stat = fs.statSync(outFile);
console.log('导出成功 ->', outFile);
console.log('工具数:', TOOLS.length, ' 分类数:', CATS.length);
console.log('文件大小:', (stat.size / 1024).toFixed(1), 'KB');
const byCat = {};
TOOLS.forEach(t => { byCat[t.cat] = (byCat[t.cat] || 0) + 1; });
console.log('分类分布:', JSON.stringify(byCat));
