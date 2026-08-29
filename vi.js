/* =========================================================================
   SparK · 虚拟惯量 / 惯量响应  vi.js  (v20260829-3)
   依据：GB/T 19963.1-2021《风电场接入电力系统技术规定》5.2 惯量响应
   核心公式：ΔPt = −(TJ / fN) × (df/dt) × Pt
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}
  function num(id){ var v=parseFloat(g$(id).value); return isNaN(v)?NaN:v; }
  function fmt(v,d){ d=(d===undefined?3:d); return (isFinite(v)?v.toFixed(d):'—'); }
  function vbadge(ok,txt){ return '<b style="color:'+(ok?'var(--ok)':'var(--acc)')+'">'+txt+'</b>'; }

  // ---------- 1) 惯量响应功率 ----------
  function calcVi(){
    var fN=num('vi-fn'), Pt=num('vi-pt'), PN=num('vi-pn'),
        TJ=num('vi-tj'), dfdt=num('vi-dfdt'), fd=num('vi-fd'), df=num('vi-df'),
        tRise=num('vi-trise'), dev=num('vi-dev'), lim=num('vi-lim');
    var box=g$('vi-rst');
    if([fN,Pt,PN,TJ,dfdt].some(isNaN) || fN<=0){
      box.innerHTML='<div class="err">请填写额定频率、当前/额定功率、等效惯性时间常数 TJ、频率变化率 df/dt</div>'; return;
    }

    // GB/T 19963.1 5.2.1 触发条件：|Δf| > 死区 且 Pt > 20%PN 且 Δf × df/dt > 0
    var adf = isNaN(df)?NaN:Math.abs(df);
    var condDead = isNaN(fd)||isNaN(adf) ? null : (adf > fd);
    var condP    = (Pt > 0.20*PN);
    var condDir  = isNaN(df) ? null : ((df)*(dfdt) > 0);

    // 5.2.1 公式(2)：ΔPt = −(TJ/fN)·(df/dt)·Pt
    var dP = -(TJ/fN)*dfdt*Pt;
    // 限幅（若有）
    var dPout = dP, clipped=false;
    if(!isNaN(lim) && lim>=0){
      var cap = lim/100*Pt;
      if(Math.abs(dP)>cap){ dPout = dP>0?cap:-cap; clipped=true; }
    }

    var rows=[];
    rows.push(['惯量响应附加功率 ΔPt', fmt(dP,3)+' MW', 'ΔPt = −(TJ/fN)·(df/dt)·Pt']);
    rows.push(['限幅后输出', fmt(dPout,3)+' MW'+(clipped?' <span style="color:var(--acc)">（已限幅）</span>':''),
      isNaN(lim)?'未设置限幅':'限幅 '+fmt(lim,1)+'% Pt']);
    rows.push(['响应后功率', fmt(Pt+dPout,3)+' MW', '当前 '+fmt(Pt,2)+' MW']);

    // 触发条件
    if(condDead!==null) rows.push(['条件①：|Δf| &gt; 死区',
      '|Δf|='+fmt(adf,3)+' Hz vs 死区 '+fmt(fd,3)+' Hz',
      vbadge(condDead, condDead?'满足':'不满足')]);
    rows.push(['条件②：Pt &gt; 20%PN', fmt(Pt,2)+' MW vs '+fmt(0.20*PN,2)+' MW',
      vbadge(condP, condP?'满足':'不满足')+' <span style="font-size:11px">GB/T 19963.1 5.2.1</span>']);
    if(condDir!==null) rows.push(['条件③：Δf × df/dt &gt; 0',
      fmt(df,3)+' × '+fmt(dfdt,4)+' = '+fmt(df*dfdt,5),
      vbadge(condDir, condDir?'满足（方向一致）':'不满足（方向相反，不动作）')+' <span style="font-size:11px">仅频率偏差与变化方向一致时响应</span>']);

    // 校核
    rows.push(['TJ 取值校核', fmt(TJ,2)+' s',
      vbadge(TJ>=8&&TJ<=12, (TJ>=8&&TJ<=12)?'在 8~12 s 范围内':'超出常规 8~12 s')+' <span style="font-size:11px">GB/T 19963.1 5.2.2：TJ 一般取 8~12 s</span>']);
    if(!isNaN(tRise)) rows.push(['上升时间', fmt(tRise,3)+' s',
      vbadge(tRise<=1, tRise<=1?'符合':'超标')+' <span style="font-size:11px">GB/T 19963.1 5.2.4：≤1 s</span>']);
    if(!isNaN(dev)) rows.push(['有功变化量偏差', fmt(dev,2)+' % PN',
      vbadge(Math.abs(dev)<=1, Math.abs(dev)<=1?'符合':'超标')+' <span style="font-size:11px">GB/T 19963.1 5.2.4：≤±1% PN</span>']);

    var tbl='<table class="tbl"><thead><tr><th>项目</th><th>结果</th><th>依据/说明</th></tr></thead><tbody>';
    rows.forEach(function(r){ tbl+='<tr><td>'+r[0]+'</td><td><b>'+r[1]+'</b></td><td style="font-size:11px">'+r[2]+'</td></tr>'; });
    tbl+='</tbody></table>';

    box.innerHTML = tbl +
      '<div class="hint">惯量响应看的是 <b>频率变化速度 df/dt（ROCOF）</b>，而非频差大小：频率快速下跌瞬间先"刹住车"，为一次调频争取时间。三者时序：惯量响应（&lt;1 s）→ 一次调频（2~15 s）→ 二次调频 AGC（分钟级）。</div>';

    if(window.viDrawWave) viDrawWave();
  }

  // 虚拟惯量频率响应示意波形（频率先快速下跌，被惯量"刹住"后缓慢回稳）
  function viDrawWave(){
    if(!window.drawWave) return;
    var dfdt=num('vi-dfdt'); if(isNaN(dfdt)) dfdt=-0.5;
    var TJ=num('vi-tj'); if(isNaN(TJ)) TJ=10;
    var fN=num('vi-fn'); if(isNaN(fN)) fN=50;
    var mag=Math.min(Math.abs(dfdt)*3, 0.4);            // 跌落幅度（示意）
    var tauSlow=Math.max(TJ*0.4, 1.5);
    var data=[], T=12, N=120;
    for(var i=0;i<=N;i++){
      var t=T*i/N;
      var fast=1-Math.exp(-t/0.8);                       // 快速跌落
      var slow=1-Math.exp(-t/tauSlow);                   // 惯量缓释回稳
      data.push(fN - mag*fast + mag*0.55*slow);
    }
    window.drawWave('vi-wave',{ xmax:T, xlabel:'时间 t (s)', ymin:null, ymax:null,
      series:[{data:data, color:'#FF8C42', width:2}] });
  }

  // ---------- 2) 由两个时刻的频率求 ROCOF ----------
  function calcRocof(){
    var f1=num('vi-f1'), f2=num('vi-f2'), dt=num('vi-dt');
    var box=g$('vi-rocof-rst');
    if([f1,f2,dt].some(isNaN) || dt<=0){ box.innerHTML='<div class="err">请填写两个时刻频率与时间间隔（ms，&gt;0）</div>'; return; }
    var dtS = dt/1000;
    var rocof = (f2-f1)/dtS;
    var okWin = (dt>=100 && dt<=200);
    var tbl='<table class="tbl"><tbody>'+
      '<tr><td class="mut">频率变化率 ROCOF</td><td><b>'+fmt(rocof,4)+' Hz/s</b></td></tr>'+
      '<tr><td class="mut">计算窗口</td><td>'+fmt(dt,0)+' ms '+
        vbadge(okWin, okWin?'符合 100~200 ms':'超出建议窗口')+'</td></tr>'+
      '<tr><td class="mut">窗口依据</td><td style="font-size:11px">GB/T 19963.1 5.2.3：计算 df/dt 的时间窗口宜 ≤200 ms 且 ≥100 ms（过短噪声放大误判，过长响应迟钝）</td></tr>'+
      '</tbody></table>';
    box.innerHTML = tbl;
    // 同步回填主计算
    if(!isNaN(rocof)) g$('vi-dfdt').value = rocof.toFixed(4);
  }

  function viSample(){
    g$('vi-fn').value='50'; g$('vi-pt').value='200'; g$('vi-pn').value='200';
    g$('vi-tj').value='10'; g$('vi-dfdt').value='-0.5';
    g$('vi-fd').value='0.05'; g$('vi-df').value='-0.12'; g$('vi-lim').value='10';
    g$('vi-trise').value='0.8'; g$('vi-dev').value='0.6';
    calcVi();
    g$('vi-f1').value='49.95'; g$('vi-f2').value='49.87'; g$('vi-dt').value='160';
    calcRocof();
  }
  function viClear(){
    ['vi-fn','vi-pt','vi-pn','vi-tj','vi-dfdt','vi-fd','vi-df','vi-lim','vi-trise','vi-dev','vi-f1','vi-f2','vi-dt']
      .forEach(function(id){ g$(id).value=''; });
    g$('vi-rst').innerHTML='<div class="rst-empty">填写参数后计算</div>';
    g$('vi-rocof-rst').innerHTML='';
  }

  window.calcVi=calcVi; window.calcRocof=calcRocof;
  window.viDrawWave=viDrawWave;
  window.viSample=viSample; window.viClear=viClear;
})();
