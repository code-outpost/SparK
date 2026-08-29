/* =========================================================================
   SparK · 位运算 / 寄存器比特位计算  bitcalc.js  (v20260829-3)
   按用户要求重构：支持
     - 寄存器地址（标签）
     - 寄存器个数（1 / 2）
     - 值类型（UINT16 / INT16 / UINT32 / INT32 / FLOAT32 / 位域）
     - BIT 起始 ~ 结束 提取字段
     - 单 BIT 置 1 / 清 0 / 翻转（可点击位图直接翻转）
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  // ---- 解析单个寄存器值：0x / 0b / 十进制（允许负数，仅用于输入语义） ----
  function parseReg(s){
    s=(s||'').trim();
    if(!s) return null;
    var base=10, body=s, neg=false;
    if(/^0x/i.test(s)){ base=16; body=s.slice(2); }
    else if(/^0b/i.test(s)){ base=2; body=s.slice(2); }
    else if(/^-/.test(s)){ neg=true; body=s.slice(1); }
    if(base!==10){
      if(base===2 && !/^[01]+$/.test(body)) return null;
      if(base===16 && !/^[0-9A-Fa-f]+$/.test(body)) return null;
    } else {
      if(!/^\d+$/.test(body)) return null;
    }
    var v=parseInt(body, base);
    if(isNaN(v)) return null;
    return neg ? -v : v;
  }

  function typeBits(type){ return (type==='u32'||type==='i32'||type==='f32')?32:16; }
  function hex(u32,bits){ var h=(u32>>>0).toString(16).toUpperCase(); while(h.length<bits/4) h='0'+h; return h; }
  function bin(u32,bits){ var s=''; for(var i=bits-1;i>=0;i--) s+=((u32>>i)&1); return s; }
  function binGrp(u32,bits){ var s=bin(u32,bits); var o=''; for(var i=0;i<bits;i++){ o+=s[i]; if(i%4===3 && i<bits-1) o+=' '; } return o; }

  function signedOf(u32,bits){
    if(bits===16) return (u32&0x8000)?(u32-0x10000):u32;
    return (u32&0x80000000)?(u32-0x100000000):u32;
  }
  function u32ToFloat(u32){
    var s=(u32>>>31)&1, e=(u32>>>23)&0xFF, m=u32&0x7FFFFF;
    if(e===255) return (m===0)?(s?-Infinity:Infinity):NaN;
    if(e===0){ var sub=(m/8388608)*Math.pow(2,-126); return s?-sub:sub; }
    var val=(1+m/8388608)*Math.pow(2,e-127);
    return s?-val:val;
  }

  // ---- 解析整个寄存器值（含两寄存器/字序） ----
  function bitParseVal(){
    var type=g$('b-type').value;
    var cnt=parseInt(g$('b-cnt').value,10)||1;
    var endian=g$('b-endian').value;
    var raw=g$('b-val').value.trim();
    var bits=typeBits(type);
    var u32;
    if(raw.indexOf(',')>=0){
      var ps=raw.split(',').map(function(x){return x.trim();});
      if(ps.length<2) return {ok:false,msg:'两寄存器请用逗号分隔，如 0xAB,0xCD'};
      var lo=parseReg(ps[0]), hi=parseReg(ps[1]);
      if(lo==null||hi==null) return {ok:false,msg:'寄存器值无法解析'};
      u32 = endian==='le' ? ((lo&0xFFFF)<<16 | (hi&0xFFFF))>>>0 : ((hi&0xFFFF)<<16 | (lo&0xFFFF))>>>0;
    } else {
      var r=parseReg(raw);
      if(r==null) return {ok:false,msg:'请输入十六进制(0x…)或十进制整数'};
      u32 = bits===32 ? (r>>>0) : (r & 0xFFFF);
    }
    return {ok:true,u32:u32>>>0,bits:bits,type:type,endian:endian,cnt:cnt};
  }

  function writeBack(u32){
    var bits=typeBits(g$('b-type').value);
    g$('b-val').value='0x'+hex(u32,bits);
    bitAnalyze();
  }

  // ---- 主解析：位图 + 数值表 ----
  function bitAnalyze(){
    var box=g$('b-rst');
    if(!box) return;
    var r=bitParseVal();
    if(!r.ok){ box.innerHTML='<div class="err">'+r.msg+'</div>'; return; }
    var u32=r.u32, bits=r.bits, type=r.type;

    // 位图：从小到大排列，bit0 在最左侧，每 4 位一组
    var grid='<div class="bitgrid">';
    for(var gi=0; gi<bits; gi+=4){
      grid+='<div class="bitgrp">';
      var hi=Math.min(gi+3,bits-1);
      for(var j=gi;j<=hi;j++){
        var on=((u32>>j)&1)?1:0;
        grid+='<div class="bitcell'+(on?' on':'')+'" data-bit="'+j+'" onclick="bitToggle('+j+')" title="bit'+j+'（点击切换）"><div class="bn">b'+j+'</div><div class="bv">'+on+'</div></div>';
      }
      grid+='</div>';
    }
    grid+='</div>';

    // 数值表
    var TYPE_LBL={u16:'UINT16 无符号16位',i16:'INT16 有符号16位',u32:'UINT32 无符号32位',
                  i32:'INT32 有符号32位',f32:'FLOAT32 IEEE754单精度',bf16:'BITFIELD 位域/标志字'};
    var rows=[];
    if(g$('b-addr').value.trim()) rows.push(['寄存器地址', g$('b-addr').value.trim()]);
    rows.push(['值类型', (TYPE_LBL[type]||type.toUpperCase())+(bits===32?`（32 位 / ${r.cnt} 寄存器）`:'（16 位）')]);
    rows.push(['十进制（无符号）', u32]);
    if(type==='i16'||type==='i32') rows.push(['十进制（有符号）', signedOf(u32,bits)]);
    rows.push(['十六进制', '0x'+hex(u32,bits)]);
    rows.push(['二进制（高位在左）', binGrp(u32,bits)]);
    if(bits===32){
      var hi16=(u32>>>16)&0xFFFF, lo16=u32&0xFFFF;
      if(r.endian==='le'){ var t=hi16; hi16=lo16; lo16=t; }
      rows.push(['寄存器拆分', 'Reg[n] = 0x'+hex(hi16,16)+' ， Reg[n+1] = 0x'+hex(lo16,16)]);
    }
    if(type==='f32'){
      var fl=u32ToFloat(u32);
      rows.push(['IEEE754 浮点', (isFinite(fl)?fl.toFixed(6):String(fl))]);
    }

    var tbl='<table class="tbl"><tbody>';
    rows.forEach(function(rw){ tbl+='<tr><td class="mut">'+rw[0]+'</td><td><b>'+rw[1]+'</b></td></tr>'; });
    tbl+='</tbody></table>';

    box.innerHTML =
      '<div class="card-title" style="margin-top:4px"><div class="dot"></div>位图（bit0 在最左侧，从小到大排列，点击格子可翻转）</div>'+
      grid + tbl +
      '<div class="hint">整数 = Σ 置位 bitᵢ 的 2ⁱ；橙色=1、灰=0，位号即 2 的指数。例如 bit0=1 → 2⁰=1，bit3=1 → 2³=8。<br>'+
      '<b style="color:var(--acc)">方向说明</b>：上方<b>位图</b>按你的习惯<b>从左到右为 bit0 → bit'+(bits-1)+'（从小到大）</b>；而下方<b>二进制串</b>按常规书写习惯<b>高位在左</b>（bit'+(bits-1)+' 在最左）。两者是同一组位，只是排列方向相反。</div>';
  }

  // 点击位图格子翻转
  function bitToggle(j){
    var r=bitParseVal(); if(!r.ok) return;
    var u32=r.u32 ^ (1<<j);
    writeBack(u32);
  }

  // 提取 BIT 字段 [bs..be]
  function bitExtract(){
    var r=bitParseVal(); var box=g$('b-field-rst');
    if(!r.ok){ box.innerHTML='<div class="err">'+r.msg+'</div>'; return; }
    var bs=parseInt(g$('b-bs').value,10), be=parseInt(g$('b-be').value,10);
    if(isNaN(bs)||isNaN(be)||bs<0||be>=r.bits||bs>be){
      box.innerHTML='<div class="err">BIT 区间需满足 0 ≤ 起始 ≤ 结束 < '+(r.bits)+'</div>'; return;
    }
    var width=be-bs+1;
    var mask=0; for(var i=bs;i<=be;i++) mask |= (1<<i);
    var maskAll = (width>=32)?(0xFFFFFFFF>>>0):((1<<width)-1);
    var field = ((r.u32>>>bs) & maskAll) >>> 0;
    var signedField = (width<32 && (field & (1<<(width-1)))) ? (field - (1<<width)) : field;
    var tbl='<table class="tbl"><tbody>'+
      '<tr><td class="mut">覆盖位</td><td><b>bit '+bs+' ~ '+be+'（共 '+width+' 位）</b></td></tr>'+
      '<tr><td class="mut">字段值（无符号）</td><td><b>'+field+'</b></td></tr>'+
      (width<32?'<tr><td class="mut">字段值（有符号）</td><td><b>'+signedField+'</b></td></tr>':'')+
      '<tr><td class="mut">掩码（十六进制）</td><td><b>0x'+hex(mask,r.bits)+'</b></td></tr>'+
      '<tr><td class="mut">掩码（二进制）</td><td><b>'+binGrp(mask,r.bits)+'</b></td></tr>'+
      '</tbody></table>';
    box.innerHTML = tbl +
      '<div class="hint">字段值 = (原值 » '+bs+') & 掩码；掩码 = ((1 « '+width+') − 1) « '+bs+'。常用于状态字/标志位解析。</div>';
  }

  // 单 BIT 置位/清位/翻转
  function bitApply(op){
    var r=bitParseVal();
    if(!r.ok){ g$('b-rst').innerHTML='<div class="err">'+r.msg+'</div>'; return; }
    var b=parseInt(g$('b-bit').value,10);
    if(isNaN(b)||b<0||b>=r.bits){ g$('b-rst').innerHTML='<div class="err">位号需在 0 ~ '+(r.bits-1)+' 之间</div>'; return; }
    var u32=r.u32;
    if(op==='set') u32 = u32 | (1<<b);
    else if(op==='clr') u32 = u32 & ~(1<<b);
    else if(op==='tog') u32 = u32 ^ (1<<b);
    writeBack(u32);
  }

  // 切换类型时同步寄存器个数并重新解析
  function bitTypeSync(){
    var type=g$('b-type').value;
    var cnt=(type==='u32'||type==='i32'||type==='f32')?'2':'1';
    g$('b-cnt').value=cnt;
    bitAnalyze();
  }

  function bitSample(){
    g$('b-addr').value='40001';
    g$('b-type').value='u16';
    g$('b-cnt').value='1';
    g$('b-val').value='0x1B0A';       // 置位 bit: 1,3,8,9,11,12（= 6922）
    g$('b-endian').value='be';
    g$('b-bs').value='0'; g$('b-be').value='3';   // 低 4 位 = 0xA = 10
    bitAnalyze();
    bitExtract();
    g$('b-q').value='0x0003';         // validity = Questionable(3)
    bitQuality();
  }
  function bitClearAll(){
    g$('b-addr').value=''; g$('b-val').value='0'; g$('b-bs').value='0'; g$('b-be').value='3'; g$('b-bit').value='3';
    bitAnalyze();
    g$('b-field-rst').innerHTML='';
    g$('b-q').value='0'; g$('b-q-rst').innerHTML='';
  }

  // ---- IEC 61850-7-3 品质位（16 位）解码 ----
  function parse16(s){
    s=(s||'').trim(); if(!s) return null;
    var v; if(/^0x/i.test(s)) v=parseInt(s.slice(2),16); else v=parseInt(s,10);
    if(isNaN(v)) return null; return v & 0xFFFF;
  }
  var Q_FLAGS=[
    {b:0,t:'Validity (位0)'},{b:1,t:'Validity (位1)'},
    {b:2,t:'Overflow 溢出'},{b:3,t:'Out of range 超量程'},
    {b:4,t:'Bad reference 坏基准'},{b:5,t:'Oscillatory 振荡'},
    {b:6,t:'Failure 故障'},{b:7,t:'Old data 旧数据'},
    {b:8,t:'Inconsistent 不一致'},{b:9,t:'Inaccurate 不精确'},
    {b:10,t:'Source (位10)'},{b:11,t:'Source (位11)'},
    {b:12,t:'Test 测试标志'},{b:13,t:'OperatorBlocked 操作员闭锁'}
  ];
  function bitQuality(){
    var box=g$('b-q-rst');
    var v=parse16(g$('b-q').value);
    if(v==null){ box.innerHTML='<div class="err">请输入有效品质字</div>'; return; }
    var valBits=v&3;
    var validity=['Good 良好','Invalid 无效','Reserved 保留','Questionable 可疑'][valBits];
    var srcBits=(v>>10)&3;
    var source=['Process 过程量','Substituted 取代','Default 缺省','Reserved 保留'][srcBits];
    var rows=[];
    rows.push(['Validity 有效性', validity, valBits===0]);
    Q_FLAGS.forEach(function(f){
      if(f.b<=1||f.b===10||f.b===11) return;
      var on=!!((v>>f.b)&1);
      rows.push([f.t, on?'1（置位）':'0（未置）', on]);
    });
    rows.push(['Source 数据源', source, srcBits!==0]);
    var tbl='<table class="tbl"><thead><tr><th>品质字段</th><th>状态</th></tr></thead><tbody>';
    rows.forEach(function(rw){ tbl+='<tr><td>'+rw[0]+'</td><td'+(rw[2]?' style="color:var(--acc)"':'')+'><b>'+rw[1]+'</b></td></tr>'; });
    tbl+='</tbody></table>';
    box.innerHTML=tbl+'<div class="hint">约定依据 IEC 61850-7-3 品质位（16 位）。不同装置/厂家对个别位实现可能略有差异，关键判断以现场装置说明书为准。</div>';
  }

  // 浏览器导出
  window.bitAnalyze=bitAnalyze;
  window.bitToggle=bitToggle;
  window.bitExtract=bitExtract;
  window.bitApply=bitApply;
  window.bitTypeSync=bitTypeSync;
  window.bitSample=bitSample;
  window.bitClearAll=bitClearAll;
  window.bitQuality=bitQuality;

  // 初始渲染（脚本在底部，DOM 已就绪）
  if(document.getElementById('b-rst')){
    bitAnalyze();
    if(document.getElementById('b-q')) bitQuality();
  }
})();
