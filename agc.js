/* =========================================================================
   SparK · 二次调频（AGC）计算与考核  agc.js  (v20260829-3)
   依据：GB/T 19963.1-2021 4.1/4.2（有功功率与变化率）
        DL/T 1870-2018 附录C（AGC 试验技术要求）
        南方能源监管局 并网辅助服务考核（投运率/合格率）
   核心：ACE = ΔPtie + B × Δf ；调节速率与变化率限值校核
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}
  function num(id){ var v=parseFloat(g$(id).value); return isNaN(v)?NaN:v; }
  function fmt(v,d){ d=(d===undefined?3:d); return (isFinite(v)?v.toFixed(d):'—'); }
  function vbadge(ok,txt){
    return '<b style="color:'+(ok?'var(--ok)':'var(--acc)')+'">'+txt+'</b>';
  }

  // 变化率限值查表（GB/T 19963.1-2021 表1）
  function rateLimit(Pn){
    if(Pn<30)  return {m1:3,        m10:10};
    if(Pn<=150) return {m1:Pn/10,   m10:Pn/3};
    return {m1:15, m10:50};
  }

  function calcAgc(){
    var mode  = g$('agc-mode').value;   // TBC / FFC / FTC
    var dPtie = num('agc-dptie');       // 联络线功率偏差 MW（实际-计划）
    var B     = num('agc-b');           // 频率偏差系数 MW/Hz
    var df    = num('agc-df');          // 频率偏差 Hz
    var Pn    = num('agc-pn');          // 场站额定容量 MW
    var P0    = num('agc-p0');          // 当前出力 MW
    var P1    = num('agc-p1');          // 目标出力 MW（调度指令）
    var tSpan = num('agc-tspan');       // 计划完成时间 min
    var box   = g$('agc-rst');

    if(isNaN(Pn)||Pn<=0){ box.innerHTML='<div class="err">请填写场站额定容量 Pn</div>'; return; }

    // ---- ACE ----
    var ace=NaN, term='';
    if(!isNaN(B) && !isNaN(df)){
      if(mode==='TBC'){ ace = (isNaN(dPtie)?0:dPtie) + B*df; term='ΔPtie + B×Δf'; }
      else if(mode==='FFC'){ ace = B*df; term='B×Δf（忽略联络线分量）'; }
      else { ace = (isNaN(dPtie)?0:dPtie); term='ΔPtie（忽略频率分量）'; }
    } else if(!isNaN(dPtie)){
      ace = dPtie; term='仅 ΔPtie（未填 B/Δf）';
    }

    // ---- 调节量与时限 ----
    var dPcmd = (isNaN(P1)||isNaN(P0)) ? NaN : (P1-P0);
    var rate  = (!isNaN(dPcmd) && !isNaN(tSpan) && tSpan>0) ? Math.abs(dPcmd)/tSpan : NaN;  // MW/min

    var lim = rateLimit(Pn);
    var rows=[];

    rows.push(['AGC 控制模式', {'TBC':'联络线频率偏差控制 TBC','FFC':'恒定频率控制 FFC','FTC':'恒定联络线控制 FTC'}[mode], '']);
    if(!isNaN(ace)) rows.push(['区域控制偏差 ACE', fmt(ace,3)+' MW', '<span style="font-size:11px">ACE = '+term+'</span>']);
    if(!isNaN(dPcmd)) rows.push(['指令调节量 ΔP', fmt(dPcmd,3)+' MW', '目标 '+fmt(P1,2)+' MW ← 当前 '+fmt(P0,2)+' MW']);
    if(!isNaN(rate)) rows.push(['所需调节速率', fmt(rate,3)+' MW/min', '用时 '+fmt(tSpan,1)+' min']);

    // 变化率限值校核（1min / 10min）
    if(!isNaN(rate)){
      var ok1 = rate<=lim.m1+1e-9;
      rows.push(['1 min 变化率限值', fmt(lim.m1,3)+' MW/min',
        vbadge(ok1, ok1?'符合':'超标')+' <span style="font-size:11px">GB/T 19963.1 表1（Pn='+fmt(Pn,1)+'MW）</span>']);
    }
    rows.push(['10 min 变化量限值', fmt(lim.m10,3)+' MW',
      '<span style="font-size:11px">GB/T 19963.1 表1：Pn&lt;30MW→10MW；30~150MW→Pn/3；&gt;150MW→50MW</span>']);

    // 20%PN 门槛（是否应具备 AGC 能力）
    var Pthr = 0.20*Pn;
    var need = (!isNaN(P0)) ? (P0>=Pthr) : null;
    if(need!==null){
      rows.push(['AGC 投入门槛', '出力 '+fmt(P0,2)+' MW vs 20%PN='+fmt(Pthr,2)+' MW',
        vbadge(need, need?'应投入 AGC':'低于门槛')+' <span style="font-size:11px">月装机容量 20% 以上应接收并执行调度 AGC 指令</span>']);
    }

    var tbl='<table class="tbl"><thead><tr><th>项目</th><th>数值</th><th>说明/依据</th></tr></thead><tbody>';
    rows.forEach(function(r){ tbl+='<tr><td>'+r[0]+'</td><td><b>'+r[1]+'</b></td><td style="font-size:11px">'+(r[2]||'')+'</td></tr>'; });
    tbl+='</tbody></table>';

    box.innerHTML = tbl +
      '<div class="hint">ACE 符号约定按 NERC/国内常见写法 ACE = ΔPtie + B×Δf（B 为频率偏差系数 MW/Hz，带符号）。不同调度机构对 B 的正负与单位（MW/Hz 或 MW/0.1Hz）约定可能不同，请以本调度机构下发的 AGC 定值单为准。</div>';
  }

  // 投运率 / 合格率 考核计算
  function calcAgcKpi(){
    var runH  = num('agc-runh');    // 场站运行时间 h
    var closeH= num('agc-closeh');  // 子站闭环运行时间 h
    var nTot  = num('agc-ntot');    // AGC 指令总次数
    var nOk   = num('agc-nok');     // 响应合格次数
    var box   = g$('agc-kpi-rst');

    var rows=[];
    if(!isNaN(runH) && !isNaN(closeH) && runH>0){
      var rate = closeH/runH*100;
      rows.push(['AGC 投运率', fmt(rate,3)+' %',
        vbadge(rate>=99.9, rate>=99.9?'符合':'低于考核线')+' <span style="font-size:11px">= 子站闭环运行时间 / 场站运行时间；全月 &lt;99.9% 考核</span>']);
    }
    if(!isNaN(nTot) && !isNaN(nOk) && nTot>0){
      var qr = nOk/nTot*100;
      rows.push(['指令响应合格率', fmt(qr,2)+' %',
        vbadge(qr>=98, qr>=98?'符合':'低于要求')+' <span style="font-size:11px">按日统计、以 1 min 平均值为采样基准，要求 ≥98%</span>']);
    }
    if(!rows.length){ box.innerHTML='<div class="err">请填写运行时间与指令统计数据</div>'; return; }

    var tbl='<table class="tbl"><thead><tr><th>考核指标</th><th>结果</th><th>判定与依据</th></tr></thead><tbody>';
    rows.forEach(function(r){ tbl+='<tr><td>'+r[0]+'</td><td><b>'+r[1]+'</b></td><td style="font-size:11px">'+r[2]+'</td></tr>'; });
    tbl+='</tbody></table>';
    box.innerHTML = tbl;
  }

  function agcSample(){
    g$('agc-mode').value='TBC';
    g$('agc-dptie').value='-12'; g$('agc-b').value='-80'; g$('agc-df').value='-0.04';
    g$('agc-pn').value='200'; g$('agc-p0').value='100'; g$('agc-p1').value='180'; g$('agc-tspan').value='10';
    calcAgc();
    g$('agc-runh').value='720'; g$('agc-closeh').value='719.5';
    g$('agc-ntot').value='1200'; g$('agc-nok').value='1190';
    calcAgcKpi();
  }
  function agcClear(){
    ['agc-dptie','agc-b','agc-df','agc-pn','agc-p0','agc-p1','agc-tspan','agc-runh','agc-closeh','agc-ntot','agc-nok']
      .forEach(function(id){ g$(id).value=''; });
    g$('agc-rst').innerHTML='<div class="rst-empty">填写参数后计算</div>';
    g$('agc-kpi-rst').innerHTML='';
  }

  window.calcAgc=calcAgc; window.calcAgcKpi=calcAgcKpi;
  window.agcSample=agcSample; window.agcClear=agcClear;
})();
