/* =========================================================================
   SparK · 功率因数与无功补偿建议  pfc.js  (v20260829-3)
   - 输入有功 P、当前 PF、目标 PF，计算需补偿无功 Qc
   - 补偿后视在功率 S、电流下降百分比
   - SVG/逆变器补偿建议：容量裕度、响应时间参考
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  function calcPfComp(){
    var P=parseFloat(g$('pfcomp-p').value);
    var pf0=parseFloat(g$('pfcomp-pf0').value);
    var pf1=parseFloat(g$('pfcomp-pf1').value);
    var box=g$('pfcomp-rst');
    if(P<=0 || isNaN(pf0) || isNaN(pf1) || pf0<=0 || pf0>1 || pf1<=0 || pf1>1){
      box.innerHTML='<div class="err">P>0，且 PF 在 (0,1] 之间</div>'; return;
    }
    if(pf1<=pf0){
      box.innerHTML='<div class="err">目标 PF 必须大于当前 PF</div>'; return;
    }

    var phi0=Math.acos(pf0);
    var phi1=Math.acos(pf1);
    var tan0=Math.tan(phi0);
    var tan1=Math.tan(phi1);
    var Qc=P*(tan0-tan1); // kvar
    var S0=P/pf0;
    var S1=P/pf1;
    var Ired=(1-S1/S0)*100;
    var QcKvar=Math.round(Qc);

    // SVG/逆变器建议
    var suggest='';
    if(QcKvar<=30) suggest='建议用 SVG（静止无功发生器）或逆变器无功调节，容量 ≥ '+Math.ceil(QcKvar*1.2)+' kvar；响应时间 ≤ 20ms 为佳。';
    else if(QcKvar<=500) suggest='建议用 SVG 或组串式逆变器无功补偿，容量 ≥ '+Math.ceil(QcKvar*1.25)+' kvar；预留 20~25% 裕量。';
    else suggest='建议用 SVG/集中式逆变器或 FC+SVG 混合补偿，容量 ≥ '+Math.ceil(QcKvar*1.3)+' Mvar 级；需校核电压波动与谐波。';

    var html=
      '<table class="tbl"><tbody>'+
      '<tr><td class="mut">当前视在功率 S0</td><td><b>'+S0.toFixed(2)+' kVA</b></td></tr>'+
      '<tr><td class="mut">补偿后视在功率 S1</td><td><b>'+S1.toFixed(2)+' kVA</b></td></tr>'+
      '<tr><td class="mut">需补偿无功 Qc</td><td><b>'+Qc.toFixed(2)+' kvar</b>（约 '+QcKvar+' kvar）</td></tr>'+
      '<tr><td class="mut">电流下降</td><td><b>'+Ired.toFixed(2)+'%</b></td></tr>'+
      '<tr><td class="mut">SVG/逆变器建议</td><td>'+suggest+'</td></tr>'+
      '</tbody></table>'+
      '<div class="hint">公式：Qc = P×(tanφ₀ − tanφ₁)，其中 φ=arccos(PF)。补偿后 S=P/PF₁。常用目标 PF：0.95 免力调，0.98~1.0 可进一步降损。</div>';
    box.innerHTML=html;
  }

  function pfcompSample(){
    g$('pfcomp-p').value='500';
    g$('pfcomp-pf0').value='0.82';
    g$('pfcomp-pf1').value='0.98';
    calcPfComp();
  }
  function pfcompClear(){
    g$('pfcomp-p').value='';
    g$('pfcomp-pf0').value='';
    g$('pfcomp-pf1').value='';
    g$('pfcomp-rst').innerHTML='<div class="rst-empty">输入参数后计算</div>';
  }

  window.calcPfComp=calcPfComp;
  window.pfcompSample=pfcompSample;
  window.pfcompClear=pfcompClear;
})();
