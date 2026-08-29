/* =========================================================================
   SparK · 光伏组串失配损耗估算  pvmismatch.js  (v20260829-3)
   - 输入各组串 Voc / Isc / Pmax，按电流/电压失配估算功率损失
   - 给出阴影/老化/遮挡等排查建议
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  function parseStrings(str){
    var lines=(str||'').trim().split(/\n/).filter(function(x){return x.trim()!=='';});
    return lines.map(function(line){
      var p=line.split(/[,\s]+/).map(function(x){return parseFloat(x);}).filter(function(x){return !isNaN(x);});
      return {voc:p[0]||0, isc:p[1]||0, pmax:p[2]||0};
    }).filter(function(x){return x.voc>0 || x.isc>0 || x.pmax>0;});
  }

  function calcPvMismatch(){
    var s=parseStrings(g$('pvm-strings').value);
    var box=g$('pvm-rst');
    if(s.length<2){ box.innerHTML='<div class="err">至少需要 2 条组串数据</div>'; return; }

    var sumPmax=0, sumIsc=0, sumVoc=0;
    s.forEach(function(x){ sumPmax+=x.pmax; sumIsc+=x.isc; sumVoc+=x.voc; });
    var avgIsc=sumIsc/s.length, avgVoc=sumVoc/s.length;

    // 电流失配：受限于最小 Isc 的组串
    var minIsc=Math.min.apply(null,s.map(function(x){return x.isc;}));
    var iMismatch=(avgIsc-minIsc)/avgIsc*100;
    // 电压失配：按 Voc 极差
    var maxVoc=Math.max.apply(null,s.map(function(x){return x.voc;}));
    var minVoc=Math.min.apply(null,s.map(function(x){return x.voc;}));
    var vMismatch=(maxVoc-minVoc)/avgVoc*100;
    // 功率损失估算：串联组串取电流最小值，并联取各串 Pmax 之和与实际可达最大 P 的差
    var pTheoretical=sumPmax;
    var pActual=0;
    s.forEach(function(x){ pActual += x.pmax * (x.isc>0?minIsc/x.isc:0); });
    var pLoss=pTheoretical-pActual;
    var lossPct=pTheoretical>0?pLoss/pTheoretical*100:0;

    var suggest='';
    if(iMismatch>10) suggest+='电流失配明显（>10%），重点排查遮挡、灰尘、组件衰减不一致或组串并联数量差异。';
    else suggest+='电流失配在可接受范围。';
    if(vMismatch>5) suggest+=' 电压失配较大（>5%），检查是否混入不同型号组件或局部阴影导致旁路二极管导通。';

    var html=
      '<table class="tbl"><tbody>'+
      '<tr><td class="mut">组串数</td><td><b>'+s.length+'</b></td></tr>'+
      '<tr><td class="mut">电流失配率</td><td><b>'+iMismatch.toFixed(2)+'%</b></td></tr>'+
      '<tr><td class="mut">电压失配率</td><td><b>'+vMismatch.toFixed(2)+'%</b></td></tr>'+
      '<tr><td class="mut">估算功率损失</td><td><b>'+pLoss.toFixed(1)+' W</b>（'+lossPct.toFixed(2)+'%）</td></tr>'+
      '<tr><td class="mut">排查建议</td><td>'+suggest+'</td></tr>'+
      '</tbody></table>'+
      '<div class="hint">说明：电流失配指组串间 Isc 差异，光伏组串并联后整体电流受最小 Isc 限制；电压失配指 Voc/Pmax 点电压差异。精确损失需用 IV 曲线测试仪或组件级监控。</div>';
    box.innerHTML=html;
  }

  function pvmSample(){
    g$('pvm-strings').value=
      '38.5, 9.2, 320\n'+ // voc, isc(A), pmax(W)
      '38.2, 8.8, 305\n'+
      '38.4, 9.1, 318\n'+
      '37.9, 7.5, 260';
    calcPvMismatch();
  }
  function pvmClear(){
    g$('pvm-strings').value='';
    g$('pvm-rst').innerHTML='<div class="rst-empty">每行输入一组串：Voc Isc Pmax</div>';
  }

  window.calcPvMismatch=calcPvMismatch;
  window.pvmSample=pvmSample; window.pvmClear=pvmClear;
})();
