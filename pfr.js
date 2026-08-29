/* =========================================================================
   SparK · 一次调频标准校验  pfr.js  (v20260829-3)
   依据：GB/T 19963.1-2021《风电场接入电力系统技术规定》5.3
        DL/T 1870-2018《电力系统网源协调技术规范》附录A / 附录B
   核心公式：ΔPt = -Kf × (Δf / fN) × Pt
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}
  function num(id){ var v=parseFloat(g$(id).value); return isNaN(v)?NaN:v; }

  // Kf（有功调频系数）与调差率 σ% 互换：Kf = 100/σ
  function kfToSigma(kf){ return 100/kf; }
  function sigmaToKf(s){ return 100/s; }

  function fmt(v,d){ d=(d===undefined?3:d); return (isFinite(v)?v.toFixed(d):'—'); }

  // 判定：返回 'ok' | 'warn' | 'bad'
  function verdict(cond){ return cond?'ok':'bad'; }
  function vbadge(v,txt){
    var color = v==='ok' ? 'var(--ok)' : (v==='warn' ? 'var(--acc)' : 'var(--err)');
    return '<b style="color:'+color+'">'+txt+'</b>';
  }

  function calcPfr(){
    var type  = g$('pfr-type').value;      // 'renew' | 'sync'
    var fN    = num('pfr-fn');
    var f     = num('pfr-f');
    var fd    = num('pfr-fd');
    var Pt    = num('pfr-pt');             // 当前有功 MW
    var PN    = num('pfr-pn');             // 额定 MW
    var kf    = num('pfr-kf');
    var limUp = num('pfr-limup');          // 增功率限幅 %
    var limDn = num('pfr-limdn');          // 减功率限幅 %
    var tLag  = num('pfr-tlag');
    var tRise = num('pfr-trise');
    var tSet  = num('pfr-tset');
    var dev   = num('pfr-dev');
    var box   = g$('pfr-rst');

    if([fN,f,fd,Pt,PN,kf].some(function(x){return isNaN(x);})){
      box.innerHTML='<div class="err">请完整填写频率、功率与调频系数</div>'; return;
    }
    if(fN<=0||PN<=0||kf<=0){ box.innerHTML='<div class="err">额定频率、额定功率、Kf 需 &gt; 0</div>'; return; }

    var df = f - fN;                       // 频率偏差
    var adf = Math.abs(df);
    var engaged = (adf > fd) && (Pt > 0.20*PN);   // 死区 + 20%PN 功率门槛

    // 一次调频目标变化量（未限幅）
    var dP = -kf * (df/fN) * Pt;
    // 限幅（% 以当前运行功率 Pt 为基准，GB/T 19963.1 5.3.3/5.3.4）
    var limPct = dP>0 ? limUp : limDn;
    var dPlim = limPct/100*Pt;
    var dPout = Math.max(Math.min(dP, dPlim), -dPlim);
    var clipped = Math.abs(dP) > dPlim + 1e-9;

    // ---- 标准判据 ----
    var isRenew = (type==='renew');
    var sigma = kfToSigma(kf);
    var rows=[], v;

    // 死区
    if(isRenew){
      v = verdict(fd>=0.03 && fd<=0.10);
      rows.push(['一次调频死区', fmt(fd,3)+' Hz', vbadge(v, v==='ok'?'符合':'不符合')+' GB/T 19963.1 5.3.1：宜 ±(0.03~0.10) Hz']);
    } else {
      var fdLim = 0.033;  // 火电电液 / 燃机最严一档
      v = verdict(fd<=fdLim+1e-9);
      rows.push(['一次调频死区', fmt(fd,3)+' Hz', vbadge(v, v==='ok'?'符合':'偏大')+' DL/T 1870 附录A：火电电液/燃机 ±0.033Hz（水电±0.05、核电≤0.08、机械液压±0.1）']);
    }

    // 调频系数 / 调差率
    if(isRenew){
      v = verdict(kf>=10 && kf<=50);
      rows.push(['有功调频系数 Kf', fmt(kf,1)+' （调差率 '+fmt(sigma,2)+'%）', vbadge(v, v==='ok'?'符合':'不符合')+' GB/T 19963.1 5.3.2：Kf 宜 10~50']);
    } else {
      v = verdict(sigma>=4 && sigma<=5);
      rows.push(['调差率 σ', fmt(sigma,2)+'%（Kf='+fmt(sigmaToKf(sigma),1)+'）', vbadge(v, v==='ok'?'符合':'不符合')+' DL/T 1870 附录A：火电/燃机/核电 4%~5%，水电 ≤3%']);
    }

    // 限幅
    if(isRenew){
      v = verdict(limUp>=6 && limDn>=10);
      rows.push(['限幅（增/减）', fmt(limUp,1)+'% / '+fmt(limDn,1)+'% Pt', vbadge(v, v==='ok'?'符合':'不足')+' GB/T 19963.1 5.3.3/5.3.4：增 ≥6%Pt、减 ≥10%Pt']);
    } else {
      v = verdict(limUp>=6);
      rows.push(['限幅（增）', fmt(limUp,1)+'% PN', vbadge(v, v==='ok'?'符合':'不足')+' DL/T 1870 附录A：火电/燃机增 ≥6%，水电上调 ≥10%']);
    }

    // 动态性能（若填写）
    if(!isNaN(tLag)){
      v = verdict(tLag<=2);
      rows.push(['响应滞后时间', fmt(tLag,2)+' s', vbadge(v, v==='ok'?'符合':'超标')+' GB/T 19963.1 5.3.5：≤2 s']);
    }
    if(!isNaN(tRise)){
      v = verdict(tRise<=9);
      rows.push(['上升时间', fmt(tRise,2)+' s', vbadge(v, v==='ok'?'符合':'超标')+' GB/T 19963.1 5.3.5：≤9 s']);
    }
    if(!isNaN(tSet)){
      v = verdict(tSet<=15);
      rows.push(['调节时间', fmt(tSet,2)+' s', vbadge(v, v==='ok'?'符合':'超标')+' GB/T 19963.1 5.3.5：≤15 s']);
    }
    if(!isNaN(dev)){
      v = verdict(Math.abs(dev)<=1);
      rows.push(['调节偏差', fmt(dev,2)+' % PN', vbadge(v, v==='ok'?'符合':'超标')+' GB/T 19963.1 5.3.5：≤±1% PN']);
    }

    // ---- 输出 ----
    var tbl='<table class="tbl"><thead><tr><th>校验项</th><th>输入值</th><th>判定与依据</th></tr></thead><tbody>';
    rows.forEach(function(r){ tbl+='<tr><td>'+r[0]+'</td><td><b>'+r[1]+'</b></td><td style="font-size:11px">'+r[2]+'</td></tr>'; });
    tbl+='</tbody></table>';

    var calc='<table class="tbl"><tbody>'+
      '<tr><td class="mut">频率偏差 Δf</td><td><b>'+fmt(df,3)+' Hz</b></td></tr>'+
      '<tr><td class="mut">是否满足动作条件</td><td><b>'+(engaged?'是（|Δf|&gt;死区 且 P&gt;20%PN）':'否（在死区内或功率低于 20%PN）')+'</b></td></tr>'+
      '<tr><td class="mut">目标变化量 ΔPt</td><td><b>'+fmt(dP,3)+' MW</b></td></tr>'+
      '<tr><td class="mut">限幅后输出</td><td><b>'+fmt(dPout,3)+' MW</b>'+(clipped?' <span style="color:var(--acc)">（已限幅）</span>':'')+'</td></tr>'+
      '<tr><td class="mut">调节后功率</td><td><b>'+fmt(Pt+dPout,3)+' MW</b></td></tr>'+
      '</tbody></table>';

    box.innerHTML =
      '<div class="card-title" style="margin-top:12px"><div class="dot"></div>计算结果</div>'+ calc +
      '<div class="card-title" style="margin-top:12px"><div class="dot"></div>标准符合性校验</div>'+ tbl +
      '<div class="hint">公式：ΔPt = −Kf × (Δf / fN) × Pt。新能源场站判据依据 GB/T 19963.1-2021 5.3，同步发电机组依据 DL/T 1870-2018 附录A；光伏电站对应 GB/T 19964 系列，条款精神一致，具体限值以并网协议为准。</div>';

    if(window.pfrDrawWave) pfrDrawWave(dPout, dPlim);
  }

  // 一次调频阶跃响应示意波形
  function pfrDrawWave(dPout, dPlim){
    if(!window.drawWave) return;
    var tLag = num('pfr-tlag'); if(isNaN(tLag)) tLag=1.2;
    var tRise = num('pfr-trise'); if(isNaN(tRise)) tRise=6;
    var tau = Math.max(tRise/2.3, 0.5);          // 一阶 90% 上升时间 ≈ 2.3τ
    var data=[], target=[];
    var T=15, N=120;
    for(var i=0;i<=N;i++){
      var t=T*i/N;
      var v = t<tLag ? 0 : dPout*(1-Math.exp(-(t-tLag)/tau));
      data.push(v);
      target.push(dPout);
    }
    window.drawWave('pfr-wave',{
      xmax:T, xlabel:'时间 t (s)', ymin:null, ymax:null,
      series:[
        {data:target, color:'#10B981', width:1.5},
        {data:data,   color:'#FF8C42', width:2}
      ]
    });
  }

  function pfrSample(){
    g$('pfr-type').value='renew';
    g$('pfr-fn').value='50'; g$('pfr-f').value='49.90'; g$('pfr-fd').value='0.05';
    g$('pfr-pt').value='120'; g$('pfr-pn').value='200'; g$('pfr-kf').value='20';
    g$('pfr-limup').value='6'; g$('pfr-limdn').value='10';
    g$('pfr-tlag').value='1.2'; g$('pfr-trise').value='6'; g$('pfr-tset').value='12'; g$('pfr-dev').value='0.6';
    calcPfr();
  }
  function pfrClear(){
    ['pfr-fn','pfr-f','pfr-fd','pfr-pt','pfr-pn','pfr-kf','pfr-limup','pfr-limdn','pfr-tlag','pfr-trise','pfr-tset','pfr-dev']
      .forEach(function(id){ g$(id).value=''; });
    g$('pfr-rst').innerHTML='<div class="rst-empty">填写参数后点击「计算并校验」</div>';
  }

  window.calcPfr=calcPfr;
  window.pfrDrawWave=pfrDrawWave;
  window.pfrSample=pfrSample; window.pfrClear=pfrClear;
})();
