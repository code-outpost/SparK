/* =========================================================================
   SparK · 三相不平衡度计算  unbalance.js  (v20260827-2)
   对称分量法：U1 正序、U2 负序，不平衡度% = |U2|/|U1| × 100。
   输入三相幅值（默认按 120° 标准相位角），用于并网/电能质量校验。
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  // 复数乘
  function cmul(x,y){ return {re:x.re*y.re - x.im*y.im, im:x.re*y.im + x.im*y.re}; }
  function cadd(x,y){ return {re:x.re+y.re, im:x.im+y.im}; }
  function cscale(x,k){ return {re:x.re*k, im:x.im*k}; }
  function cabs(x){ return Math.sqrt(x.re*x.re + x.im*x.im); }

  var A  = {re:-0.5, im: 0.8660254037844386};   // 1∠120°
  var A2 = {re:-0.5, im:-0.8660254037844386};   // 1∠240° (= 1∠-120°)

  // 由三相幅值（默认标准相位 Va∠0, Vb∠-120°, Vc∠-240°）求 U1/U2
  function seq(Va, Vb, Vc){
    var ca={re:Va, im:0}, cb={re:Vb*Math.cos(-2*Math.PI/3), im:Vb*Math.sin(-2*Math.PI/3)}, cc={re:Vc*Math.cos(2*Math.PI/3), im:Vc*Math.sin(2*Math.PI/3)};
    var U1=cscale(cadd(cadd(ca, cmul(A, cb)), cmul(A2, cc)), 1/3);
    var U2=cscale(cadd(cadd(ca, cmul(A2, cb)), cmul(A, cc)), 1/3);
    return {U1:U1, U2:U2, m1:cabs(U1), m2:cabs(U2)};
  }

  function calcUnb(){
    var type=g$('u-type').value==='I'?'电流':'电压';
    var Va=parseFloat(g$('u-a').value), Vb=parseFloat(g$('u-b').value), Vc=parseFloat(g$('u-c').value);
    var box=g$('u-rst');
    if(isNaN(Va)||isNaN(Vb)||isNaN(Vc)||Va<=0||Vb<=0||Vc<=0){
      box.innerHTML='<div class="err">请填写三相'+type+'有效值（正数）</div>'; return;
    }
    var avg=(Va+Vb+Vc)/3;
    var vmax=Math.max(Va,Vb,Vc), vmin=Math.min(Va,Vb,Vc);
    var s=seq(Va,Vb,Vc);
    var pctSeq = s.m1>1e-9 ? (s.m2/s.m1*100) : 0;
    var pctDev = avg>0 ? ((vmax-vmin)/avg*100) : 0;     // NEMA / 幅值偏差法
    var limit=2.0;                                       // GB/T 15543、IEEE 519 常用电压不平衡限值
    var ok = pctSeq<=limit;
    var html='<table class="tbl"><tbody>'+
      '<tr><td class="mut">三相'+type+'</td><td><b>'+Va+' / '+Vb+' / '+Vc+'</b></td></tr>'+
      '<tr><td class="mut">平均值</td><td>'+avg.toFixed(3)+'</td></tr>'+
      '<tr><td class="mut">正序分量 U1</td><td>'+s.m1.toFixed(3)+'</td></tr>'+
      '<tr><td class="mut">负序分量 U2</td><td>'+s.m2.toFixed(4)+'</td></tr>'+
      '<tr><td class="mut">不平衡度（序分量法 U2/U1）</td><td><b>'+pctSeq.toFixed(2)+' %</b></td></tr>'+
      '<tr><td class="mut">不平衡度（幅值偏差法）</td><td>'+pctDev.toFixed(2)+' %</td></tr>'+
      '<tr><td class="mut">判定（限值 '+limit+'%）</td><td'+(ok?' style="color:var(--ok,#2e9e5b)"':' style="color:var(--acc)"')+'><b>'+(ok?'合格':'超限')+'</b></td></tr>'+
      '</tbody></table>'+
      '<div class="hint">序分量法为 IEC / IEEE 519 推荐算法；幅值偏差法（(最大−最小)/平均）为现场快速估算，二者略有差异。阈值 '+limit+'% 为电压不平衡常用限值（GB/T 15543、IEEE 519），电流不平衡限值以装置/设计规范为准。</div>';
    box.innerHTML=html;
  }

  function unbSample(){
    g$('u-type').value='U';
    g$('u-a').value='231.0'; g$('u-b').value='225.5'; g$('u-c').value='228.3';
    calcUnb();
  }
  function unbClear(){ g$('u-a').value=''; g$('u-b').value=''; g$('u-c').value=''; g$('u-rst').innerHTML='<div class="rst-empty">输入三相值后点击「计算」</div>'; }

  window.calcUnb=calcUnb; window.unbSample=unbSample; window.unbClear=unbClear;
})();
