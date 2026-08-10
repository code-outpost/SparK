const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const out = {};

files.forEach(file => {
  const full = path.join(dir, file);
  const raw = fs.readFileSync(full, 'utf-8');
  const data = JSON.parse(raw);
  const pdfMatch = file.match(/([0-9a-f]{6})\.json$/i);
  if (pdfMatch) data.pdfId = pdfMatch[1].toLowerCase();
  if (data.templateId) out[data.templateId] = data;
});

const js = '/* AUTO-GENERATED from jl/*.json — run: node jl/build_templates.js */\nwindow.RESUME_TEMPLATES=' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(dir, '..', 'jl', 'templates.js'), js);
console.log('templates.js generated with ' + Object.keys(out).length + ' templates');
