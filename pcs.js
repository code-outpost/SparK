/* =========================================================================
   SparK · PCS 效率曲线  pcs.js
   - 输入额定功率、负载率-效率点，绘制效率曲线
   - 计算平均/加权效率，标注最佳效率点
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  function parsePoints(str){
    var lines=(str||'').trim().split(/\n/).filter(function(x){return x.trim()!=='';});
    return lines.map(function(line){
      var p=line.split(/[,\s]+/).map(function(x){return parseFloat(x);}).filter(function(x){return !isNaN(x);});
      return {load:p[0]||0, eff:p[1]||0};
    }).filter(function(x){return x.load>0 && x.eff>0;});
  }

  function calcPcs(){
    var Pn=parseFloat(g$('pcs-pn').value);
    var pts=parsePoints(g$('pcs-pts').value);
    var box=g$('pcs-rst');
    if(Pn<=0){ box.innerHTML='<div class="err">额定功率需 > 0</div>'; return; }
    if(pts.length<2){ box.innerHTML='<div class="err">至少需要 2 个负载率-效率点</div>'; return; }

    pts.sort(function(a,b){return a.load-b.load;});
    var best=pts.reduce(function(m,p){return p.eff>m.eff?p:m;},pts[0]);
    var avg=pts.reduce(function(s,p){return s+p.eff;},0)/pts.length;
    // CEC 加权效率：5%/10%/20%/30%/50%/75%/100% 权重
    var weights=[0,0,0.04,0.05,0.12,0.21,0.53,0.05];
    var cec=0, wt=0;
    for(var i=0;i<weights.length;i++){
      var load=i*5; if(load<10) continue;
      var p=pts.find(function(x){return Math.abs(x.load-load)<=2.5;});
      if(p){ cec += p.eff*weights[i]; wt += weights[i]; }
    }
    cec=wt>0?cec/wt:avg;

    var rows=pts.map(function(p){return '<tr><td>'+p.load.toFixed(1)+'%</td><td><b>'+p.eff.toFixed(2)+'%</b></td><td>'+(Pn*p.load/100).toFixed(1)+' kW</td></tr>';}).join('');

    // 简单 ASCII/文本曲线
    var chart='';
    var maxEff=Math.max.apply(null,pts.map(function(p){return p.eff;}));
    var minEff=Math.min.apply(null,pts.map(function(p){return p.eff;}));
    var h=8;
    for(var r=h;r>=0;r--){
      var y=minEff+(maxEff-minEff)*r/h;
      var line=(y.toFixed(1)+'%').padStart(6)+' |';
      pts.forEach(function(){
        // 简化为点存在标记
        line += ' * ';
      });
      chart+=line+'\n';
    }
    chart+='       '+pts.map(function(p){return (p.load+'%').padStart(4);}).join(' ');

    box.innerHTML=
      '<table class="tbl"><tbody>'+
      '<tr><td class="mut">最高效率点</td><td><b>'+best.eff.toFixed(2)+'%</b> @ '+best.load.toFixed(1)+'% 负载</td></tr>'+
      '<tr><td class="mut">平均效率</td><td><b>'+avg.toFixed(2)+'%</b></td></tr>'+
      '<tr><td class="mut">加权效率（近似 CEC）</td><td><b>'+cec.toFixed(2)+'%</b></td></tr>'+
      '</tbody></table>'+
      '<div class="card-title" style="margin-top:12px"><div class="dot"></div>效率点</div>'+
      '<table class="tbl"><thead><tr><th>负载率</th><th>效率</th><th>功率</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<div class="hint">加权效率采用 CEC（California Energy Commission）常用权重近似。PCS 通常 30~50% 负载区间效率最高，轻载效率下降明显。</div>';
  }

  function pcsSample(){
    g$('pcs-pn').value='1250';
    g$('pcs-pts').value=
      '5, 88.0\n10, 92.0\n20, 95.0\n30, 97.0\n50, 97.5\n75, 97.2\n100, 96.5';
    calcPcs();
  }
  function pcsClear(){
    g$('pcs-pn').value=''; g$('pcs-pts').value='';
    g$('pcs-rst').innerHTML='<div class="rst-empty">输入额定功率与负载率-效率点</div>';
  }

  window.calcPcs=calcPcs; window.pcsSample=pcsSample; window.pcsClear=pcsClear;
})();
