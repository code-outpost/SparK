/* =========================================================================
   SparK · 电池簇 SOC 均衡与充放电效率  battery.js
   - 输入各簇 SOC，计算极差、标准差、建议均衡策略
   - 输入充放电参数，计算能量效率、库仑效率、循环效率
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  function parseSocList(str){
    return (str||'').split(/[,\s]+/).filter(function(x){return x!=='';}).map(function(x){return parseFloat(x);}).filter(function(x){return !isNaN(x);});
  }

  function calcSocBalance(){
    var socs=parseSocList(g$('bat-socs').value);
    var box=g$('bat-soc-rst');
    if(socs.length<2){ box.innerHTML='<div class="err">至少需要 2 簇 SOC</div>'; return; }
    var min=Math.min.apply(null,socs), max=Math.max.apply(null,socs);
    var avg=socs.reduce(function(a,b){return a+b;},0)/socs.length;
    var variance=socs.reduce(function(a,b){return a+Math.pow(b-avg,2);},0)/socs.length;
    var std=Math.sqrt(variance);
    var range=max-min;

    var strategy='';
    if(range<=3) strategy='SOC 一致性良好（极差 ≤3%），保持被动均衡即可。';
    else if(range<=8) strategy='SOC 极差 3~8%，建议开启主动均衡或适度补电/放电，避免单簇过充/过放。';
    else strategy='SOC 极差 >8%，需停机排查：容量衰减差异、温度不均、BMS 采样误差或连接电阻异常。';

    box.innerHTML=
      '<table class="tbl"><tbody>'+
      '<tr><td class="mut">簇数</td><td><b>'+socs.length+'</b></td></tr>'+
      '<tr><td class="mut">平均 SOC</td><td><b>'+avg.toFixed(2)+'%</b></td></tr>'+
      '<tr><td class="mut">SOC 极差</td><td><b>'+range.toFixed(2)+'%</b></td></tr>'+
      '<tr><td class="mut">标准差</td><td><b>'+std.toFixed(2)+'%</b></td></tr>'+
      '<tr><td class="mut">均衡建议</td><td>'+strategy+'</td></tr>'+
      '</tbody></table>';
  }

  function calcBatEff(){
    var cap=parseFloat(g$('bat-cap').value);
    var v=parseFloat(g$('bat-v').value);
    var ich=parseFloat(g$('bat-ich').value);
    var idis=parseFloat(g$('bat-idis').value);
    var etaC=parseFloat(g$('bat-etac').value)/100;
    var etaD=parseFloat(g$('bat-etad').value)/100;
    var box=g$('bat-eff-rst');
    if(cap<=0||v<=0||ich<=0||idis<=0){ box.innerHTML='<div class="err">容量、电压、电流需 > 0</div>'; return; }

    var pCh=v*ich/1000; // kW
    var pDis=v*idis/1000;
    var eCh=cap*v/1000; // kWh（标称）
    var eOut=eCh*etaC*etaD;
    var roundEff=etaC*etaD*100;

    box.innerHTML=
      '<table class="tbl"><tbody>'+
      '<tr><td class="mut">充电功率</td><td><b>'+pCh.toFixed(3)+' kW</b></td></tr>'+
      '<tr><td class="mut">放电功率</td><td><b>'+pDis.toFixed(3)+' kW</b></td></tr>'+
      '<tr><td class="mut">库仑充电效率</td><td><b>'+(etaC*100).toFixed(1)+'%</b></td></tr>'+
      '<tr><td class="mut">库仑放电效率</td><td><b>'+(etaD*100).toFixed(1)+'%</b></td></tr>'+
      '<tr><td class="mut">往返能量效率</td><td><b>'+roundEff.toFixed(2)+'%</b></td></tr>'+
      '<tr><td class="mut">可用放电能量</td><td><b>'+eOut.toFixed(3)+' kWh</b></td></tr>'+
      '</tbody></table>'+
      '<div class="hint">往返效率 = η充电 × η放电 × 100%。实际还需考虑 PCS、变压器、线损、温度、老化，综合效率通常 85~92%。</div>';
  }

  function batSample(){
    g$('bat-socs').value='82, 79, 85, 74, 80';
    g$('bat-cap').value='280'; g$('bat-v').value='3.2';
    g$('bat-ich').value='140'; g$('bat-idis').value='140';
    g$('bat-etac').value='96'; g$('bat-etad').value='96';
    calcSocBalance(); calcBatEff();
  }
  function batClear(){
    g$('bat-socs').value=''; g$('bat-cap').value=''; g$('bat-v').value='';
    g$('bat-ich').value=''; g$('bat-idis').value='';
    g$('bat-soc-rst').innerHTML='<div class="rst-empty">输入 SOC 列表</div>';
    g$('bat-eff-rst').innerHTML='<div class="rst-empty">输入充放电参数</div>';
  }

  window.calcSocBalance=calcSocBalance; window.calcBatEff=calcBatEff;
  window.batSample=batSample; window.batClear=batClear;
})();
