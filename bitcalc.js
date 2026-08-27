/* =========================================================================
   SparK · 位运算 / 比特位计算  bitcalc.js  (v20260827-2)
   - 位值解析（二进制带位号标注 / 置位集合 / 2^i / 十六进制）
   - 置 1 / 清 0 / 翻转（按位号）
   - 位范围掩码计算
   - IEC 61850-7-3 品质位（Quality）解码预设
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  // 解析输入：支持十进制、0x 十六进制、0b 二进制；返回 {ok, val, msg}
  function bitParse(s, width){
    s=(s||'').trim();
    if(!s) return {ok:false, msg:'请输入数值'};
    var v, base=10, body=s;
    if(/^0x/i.test(s)){ base=16; body=s.slice(2); }
    else if(/^0b/i.test(s)){ base=2; body=s.slice(2); }
    else if(/^-?0o/i.test(s)){ base=8; body=s.slice(s[0]==='-'?3:2); }
    if(base!==10){
      if(!/^[01]+$/.test(body) && base===2) return {ok:false, msg:'二进制只能是 0/1'};
      v=parseInt(body, base);
    } else {
      // 十进制允许负数
      if(!/^-?\d+$/.test(body)) return {ok:false, msg:'仅支持整数（十进制 / 0x十六进制 / 0b二进制）'};
      v=parseInt(body,10);
    }
    if(isNaN(v)) return {ok:false, msg:'无法解析'};
    var mask=(width>=32)?0xFFFFFFFF:((1<<width)-1);
    v = v & mask;            // 截断到指定位宽（取低 width 位，等价于无符号处理）
    return {ok:true, val:v, mask:mask};
  }

  function bitToBin(v, width){
    var s='';
    for(var i=width-1;i>=0;i--) s += ((v>>i)&1);
    return s;
  }
  function bitToHex(v, width){
    var bytes=Math.ceil(width/8);
    var h=v.toString(16).toUpperCase();
    while(h.length<bytes*2) h='0'+h;
    return '0x'+h;
  }
  function bitSetList(v, width){
    var out=[];
    for(var i=0;i<width;i++) if((v>>i)&1) out.push(i);
    return out;
  }
  // 2^i 字符串（宽度足够即够用）
  function pow2(i){ return Math.pow(2,i); }

  function bitCalc(){
    var width=parseInt(g$('b-width').value,10)||16;
    var r=bitParse(g$('b-val').value, width);
    var box=g$('b-rst');
    if(!r.ok){ box.innerHTML='<div class="err">'+r.msg+'</div>'; return; }
    var v=r.val;
    var bin=bitToBin(v,width);
    // 带位号标注：每 4 位一组
    var grouped='';
    for(var i=0;i<width;i++){
      var idx=width-1-i;
      grouped += bin[idx];
      if(i%4===3 && i<width-1) grouped+=' ';
    }
    var sets=bitSetList(v,width);
    var sumExpr = sets.length? sets.map(function(b){return '2^'+b;}).join(' + ')+' = '+v : '0';
    // 横向二进制位图：每 4 位一组，高位在左；位号在上，值在下
    var groups=[];
    for(var gi=0;gi<width;gi+=4){
      var gCells='';
      for(var j=gi+3;j>=gi;j--){
        if(j>=width) continue;
        var on=((v>>j)&1)?1:0;
        var bg=on?'var(--acc)':'var(--bg2)';
        var fg=on?'#fff':'var(--tx3)';
        gCells+='<div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:30px;height:42px;border:1px solid var(--bd);border-radius:4px;margin:0 2px;background:'+bg+';color:'+fg+';"><div style="font-size:10px;opacity:.75;line-height:1">bit'+j+'</div><div style="font-size:16px;font-weight:700;line-height:1;margin-top:3px">'+on+'</div></div>';
      }
      groups.push('<div style="display:inline-flex;align-items:center;padding:4px 6px;border:1px solid var(--bd);border-radius:6px;background:var(--bg1);margin:0 4px 4px 0">'+gCells+'</div>');
    }
    var rows=[
      ['十进制', v],
      ['十六进制', bitToHex(v,width)],
      ['二进制', bin],
      ['奇偶', (v&1)?'奇数（最低位 bit0 = 1）':'偶数（最低位 bit0 = 0）'],
      ['置位集合', sets.length?('bit '+sets.join(', ')):'无（全 0）'],
      ['展开式', sumExpr]
    ];
    var tbl='<table class="tbl"><tbody>';
    rows.forEach(function(rw){ tbl+='<tr><td class="mut">'+rw[0]+'</td><td><b>'+rw[1]+'</b></td></tr>'; });
    tbl+='</tbody></table>';
    var html=''+
      '<div class="card-title" style="margin-top:12px"><div class="dot"></div>位图（高位在左，bit0 在最右 / LSB）</div>'+
      '<div style="display:flex;flex-wrap:wrap;align-items:center;margin:8px 0">'+groups.join('')+'</div>'+
      tbl+
      '<div class="hint">“怎么算”：整数 = Σ 每个置位 bit<i> 的 2<sup>i</sup>。橙色=1，灰色=0；位号即 2 的指数。例如 bit0=1→2⁰=1，bit3=1→2³=8。</div>';
    box.innerHTML=html;
  }

  // 对当前值做 置1/清0/翻转（按位号），回写输入框并重新解析
  function bitApply(op){
    var width=parseInt(g$('b-width').value,10)||16;
    var r=bitParse(g$('b-val').value, width);
    if(!r.ok){ g$('b-rst').innerHTML='<div class="err">'+r.msg+'</div>'; return; }
    var b=parseInt(g$('b-bit').value,10);
    if(isNaN(b)||b<0||b>=width){ g$('b-rst').innerHTML='<div class="err">位号需在 0 ~ '+(width-1)+' 之间</div>'; return; }
    var v=r.val;
    if(op==='set') v = v | (1<<b);
    else if(op==='clr') v = v & ~(1<<b);
    else if(op==='tog') v = v ^ (1<<b);
    g$('b-val').value=v;
    bitCalc();
  }

  // 位范围掩码：[lo, hi] 闭区间
  function bitRange(){
    var width=parseInt(g$('b-width').value,10)||16;
    var lo=parseInt(g$('b-lo').value,10);
    var hi=parseInt(g$('b-hi').value,10);
    var box=g$('b-range-rst');
    if(isNaN(lo)||isNaN(hi)||lo<0||hi>=width||lo>hi){
      box.innerHTML='<div class="err">位范围需满足 0 ≤ lo ≤ hi < '+width+'</div>'; return;
    }
    var mask=0;
    for(var i=lo;i<=hi;i++) mask |= (1<<i);
    box.innerHTML='<table class="tbl"><tbody>'+
      '<tr><td class="mut">覆盖位</td><td><b>bit '+lo+' ~ '+hi+'</b></td></tr>'+
      '<tr><td class="mut">十进制</td><td><b>'+mask+'</b></td></tr>'+
      '<tr><td class="mut">十六进制</td><td><b>'+bitToHex(mask,width)+'</b></td></tr>'+
      '<tr><td class="mut">二进制</td><td><b>'+bitToBin(mask,width)+'</b></td></tr>'+
      '</tbody></table>'+
      '<div class="hint">范围掩码公式：mask = ((1 « (hi−lo+1)) − 1) « lo。常用于“取出/置位某几个连续 bit”。</div>';
  }

  // IEC 61850-7-3 品质位（16 位，常用约定）
  var Q_FLAGS=[
    {b:0, t:'Validity (位0)', f:'validity0'},
    {b:1, t:'Validity (位1)', f:'validity1'},
    {b:2, t:'Overflow 溢出'},
    {b:3, t:'Out of range 超量程'},
    {b:4, t:'Bad reference 坏基准'},
    {b:5, t:'Oscillatory 振荡'},
    {b:6, t:'Failure 故障'},
    {b:7, t:'Old data 旧数据'},
    {b:8, t:'Inconsistent 不一致'},
    {b:9, t:'Inaccurate 不精确'},
    {b:10, t:'Source (位10)'},
    {b:11, t:'Source (位11)'},
    {b:12, t:'Test 测试标志'},
    {b:13, t:'OperatorBlocked 操作员闭锁'}
  ];
  function bitQuality(){
    var box=g$('b-q-rst');
    var r=bitParse(g$('b-q').value, 16);
    if(!r.ok){ box.innerHTML='<div class="err">'+r.msg+'</div>'; return; }
    var v=r.val;
    var valBits=(v&3);
    var validity=['Good 良好','Invalid 无效','Reserved 保留','Questionable 可疑'][valBits];
    var srcBits=((v>>10)&3);
    var source=['Process 过程量','Substituted 取代','Default 缺省','Reserved 保留'][srcBits];
    var rows=[];
    rows.push(['Validity 有效性', validity, valBits===0]);
    Q_FLAGS.forEach(function(f){
      if(f.f==='validity0'||f.f==='validity1') return; // 已合并展示
      if(f.f==='source0'||f.f==='source1') return;
      var on=!!((v>>f.b)&1);
      rows.push([f.t, on?'1（置位）':'0（未置）', on]);
    });
    rows.push(['Source 数据源', source, srcBits!==0]);
    var tbl='<table class="tbl"><thead><tr><th>品质字段</th><th>状态</th></tr></thead><tbody>';
    rows.forEach(function(rw){
      tbl+='<tr><td>'+rw[0]+'</td><td'+(rw[2]?' style="color:var(--acc)"':'')+'><b>'+rw[1]+'</b></td></tr>';
    });
    tbl+='</tbody></table>';
    box.innerHTML=tbl+'<div class="hint">约定依据 IEC 61850-7-3 品质位（16 位）。不同装置/厂家对个别位的实现可能略有差异，关键判断以现场装置说明书为准。</div>';
  }

  function bitSample(){
    g$('b-width').value='16';
    g$('b-val').value='0x1B0A';   // bit1,3,8,12,13
    bitCalc();
    g$('b-q').value='0x0003';      // validity=Questionable(3)
    bitQuality();
  }
  function bitClearAll(){
    g$('b-val').value='0';
    g$('b-q').value='0';
    bitCalc();
    g$('b-range-rst').innerHTML='';
    g$('b-q-rst').innerHTML='';
  }

  // 浏览器导出
  window.bitCalc=bitCalc; window.bitSet=function(){bitApply('set');};
  window.bitClr=function(){bitApply('clr');}; window.bitTog=function(){bitApply('tog');};
  window.bitRange=bitRange; window.bitQuality=bitQuality;
  window.bitSample=bitSample; window.bitClearAll=bitClearAll;
})();
