/* =========================================================================
   SparK · 谐波 / THD 计算  harmonics.js
   - 输入 2~31 次谐波含有率，计算 THD-F / THD-R
   - 单次谐波排序、电话谐波系数 THF
   - 给出 GB/T 14549 / IEEE 519 简要限值参考
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  function parseList(str){
    // 支持逗号/空格/换行分隔；未指定补 0
    var parts=(str||'').split(/[,\s]+/).filter(function(x){return x!=='';});
    var out=[];
    for(var i=0;i<31;i++) out.push(0);
    parts.forEach(function(p,idx){
      if(idx>=31) return;
      var v=parseFloat(p);
      out[idx]=isNaN(v)?0:v;
    });
    return out;
  }

  function calcHarmonics(){
    var fundamental=parseFloat(g$('h-fund').value)||1;
    var h=parseList(g$('h-list').value);
    var box=g$('h-rst');
    if(fundamental<=0){ box.innerHTML='<div class="err">基波有效值需 > 0</div>'; return; }

    var sumSq=0, sumSqTotal=0;
    for(var i=0;i<h.length;i++){
      var hr=h[i]/100;
      var hi=(i+2)*fundamental*hr; // 第 i 个对应 (i+2) 次
      sumSq += hi*hi;
      sumSqTotal += hi*hi;
    }
    sumSqTotal += fundamental*fundamental;

    var thdF=100*Math.sqrt(sumSq)/fundamental;
    var thdR=100*Math.sqrt(sumSqTotal);

    // 单次谐波排序
    var order=[];
    for(var j=0;j<h.length;j++){
      if(h[j]>0) order.push({n:j+2, hr:h[j], rms:fundamental*h[j]/100});
    }
    order.sort(function(a,b){return b.hr-a.hr;});

    // 电话谐波系数 THF（简化版，按 800Hz 以内 加权近似）
    var thf=0;
    for(var k=0;k<h.length;k++){
      var n=k+2, f=n*50; // 默认 50Hz 系统
      if(f<=800){
        var weight= (5*f*f)/800000; // 近似 C-message 权重
        thf += Math.pow((h[k]/100)*weight,2);
      }
    }
    thf=100*Math.sqrt(thf);

    var rows=order.slice(0,8).map(function(o){return '<tr><td>'+o.n+' 次</td><td><b>'+o.hr.toFixed(3)+'%</b></td><td>'+o.rms.toFixed(3)+'</td></tr>';}).join('');
    if(!rows) rows='<tr><td colspan="3">无谐波数据</td></tr>';

    var html=
      '<table class="tbl"><tbody>'+
      '<tr><td class="mut">THD-F（相对基波）</td><td><b>'+thdF.toFixed(4)+'%</b></td></tr>'+
      '<tr><td class="mut">THD-R（相对总有效值）</td><td><b>'+thdR.toFixed(4)+'%</b></td></tr>'+
      '<tr><td class="mut">THF（电话谐波系数，近似）</td><td><b>'+thf.toFixed(4)+'%</b></td></tr>'+
      '</tbody></table>'+
      '<div class="card-title" style="margin-top:12px"><div class="dot"></div>主要谐波分量（按含有率降序）</div>'+
      '<table class="tbl"><thead><tr><th>次数</th><th>含有率</th><th>有效值</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<div class="hint">参考限值（以现场标准为准）：低压电网奇次谐波电压 ≤4%，偶次 ≤2%；THD-U 一般 ≤5%（GB/T 14549）。IEEE 519 对 2.4~69kV 系统 THD-V ≤5%。</div>';
    box.innerHTML=html;
  }

  function harmSample(){
    g$('h-fund').value='220';
    g$('h-list').value='3.2, 2.1, 1.5, 0.8, 0.5, 0.4, 0.3, 0.2';
    calcHarmonics();
  }
  function harmClear(){
    g$('h-fund').value='';
    g$('h-list').value='';
    g$('h-rst').innerHTML='<div class="rst-empty">输入基波与谐波含有率后计算</div>';
  }

  window.calcHarmonics=calcHarmonics;
  window.harmSample=harmSample;
  window.harmClear=harmClear;
})();
