/* =========================================================================
   SparK · POD 功率振荡阻尼 / 低频振荡分析  pod.js  (v20260829-3)
   参考：DL/T 1870-2018《电力系统网源协调技术规范》6.7（振荡防控）
        GB/T 26399-2011《电力系统安全稳定控制技术导则》
        PSS/POD 经典整定方法（washout + lead-lag + gain）
   纯前端，无网络依赖。
   ⚠ 阻尼比门槛属"工程惯例"，非国标强制数值，模块内已显著标注。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}
  function num(id){ var v=parseFloat(g$(id).value); return isNaN(v)?NaN:v; }
  function fmt(v,d){ d=(d===undefined?3:d); return (isFinite(v)?v.toFixed(d):'—'); }
  function vbadge(ok,txt){ return '<b style="color:'+(ok?'var(--ok)':'var(--acc)')+'">'+txt+'</b>'; }

  // ---------- 1) 由衰减振荡峰值求阻尼比（对数衰减率法） ----------
  function calcDampPeaks(){
    var A1=num('pod-a1'), An=num('pod-an'), n=num('pod-n'), fd=num('pod-fd');
    var box=g$('pod-damp-rst');
    if([A1,An,n].some(isNaN) || A1<=0 || An<=0 || n<1){
      box.innerHTML='<div class="err">请填写首峰幅值、第 n+1 峰幅值、间隔周期数（均需 &gt;0）</div>'; return;
    }
    // 对数衰减率 δ = (1/n)·ln(A1 / A_{n+1})
    var delta = Math.log(A1/An)/n;
    // ζ = δ / √(4π² + δ²)
    var zeta = delta / Math.sqrt(4*Math.PI*Math.PI + delta*delta);
    var sigma = (!isNaN(fd)&&fd>0) ? (zeta*2*Math.PI*fd)/Math.sqrt(1-zeta*zeta) : NaN; // 衰减系数 1/s
    var tHalf = (!isNaN(sigma)&&sigma>0) ? Math.log(2)/sigma : NaN;  // 半衰时间 s
    var mode = (!isNaN(fd)) ? ((fd>=0.8&&fd<=2.0)?'本地模式（Local mode，0.8~2.0 Hz）'
                              :(fd>=0.1&&fd<0.8)?'区间模式（Inter-area mode，0.1~0.8 Hz）'
                              :'超出典型低频振荡频带（0.1~2.0 Hz）') : '—';

    var rows=[
      ['对数衰减率 δ', fmt(delta,5), 'δ = (1/n)·ln(A₁ / Aₙ₊₁)'],
      ['阻尼比 ζ', fmt(zeta*100,3)+' %', 'ζ = δ / √(4π² + δ²)'],
      ['振荡模式', mode, '按频率 '+(isNaN(fd)?'—':fmt(fd,3)+' Hz')+' 归类']
    ];
    if(!isNaN(sigma)) rows.push(['衰减系数 σ', fmt(sigma,4)+' 1/s', 'σ = ζωn = 2πf_d·ζ/√(1−ζ²)']);
    if(!isNaN(tHalf)) rows.push(['幅值半衰时间', fmt(tHalf,2)+' s', 't½ = ln2 / σ']);

    // 阻尼比门槛（工程惯例，非国标强制）
    var ok3 = zeta>=0.03;
    rows.push(['阻尼比校核（3% 门槛）', fmt(zeta*100,3)+' %',
      vbadge(ok3, ok3?'满足 3% 门槛':'低于 3%')+' <span style="font-size:11px">工程常用门槛；部分电网要求 ≥5%。<b>非国标强制值</b>，以所在电网稳定计算规范为准</span>']);
    var ok5 = zeta>=0.05;
    rows.push(['阻尼比校核（5% 门槛）', fmt(zeta*100,3)+' %',
      vbadge(ok5, ok5?'满足 5% 门槛':'低于 5%')+' <span style="font-size:11px">严格电网常按此值考核</span>']);

    var tbl='<table class="tbl"><thead><tr><th>指标</th><th>结果</th><th>公式/说明</th></tr></thead><tbody>';
    rows.forEach(function(r){ tbl+='<tr><td>'+r[0]+'</td><td><b>'+r[1]+'</b></td><td style="font-size:11px">'+r[2]+'</td></tr>'; });
    tbl+='</tbody></table>';
    box.innerHTML = tbl +
      '<div class="hint">用法：在功率/转速振荡录波上量取第 1 个峰值 A₁ 与相隔 n 个周期后的峰值 Aₙ₊₁，即可反推阻尼比。幅值取相对稳态值的偏移量（不是绝对值）。</div>';
    podDrawWave();
  }

  // 绘制阻尼振荡衰减参考波形
  function podDrawWave(){
    var A1=num('pod-a1'), An=num('pod-an'), n=num('pod-n'), fd=num('pod-fd');
    if([A1,An,n,fd].some(isNaN) || A1<=0 || An<=0 || n<1 || fd<=0) return;
    var T=1/fd;
    var delta=Math.log(A1/An)/n;
    var tMax=(n+3)*T, N=420, osc=[], up=[], lo=[];
    for(var k=0;k<=N;k++){
      var t=tMax*k/N;
      var amp=A1*Math.exp(-delta*t/T);
      osc.push(amp*Math.cos(2*Math.PI*fd*t));
      up.push(amp); lo.push(-amp);
    }
    if(window.drawWave) window.drawWave('pod-wave',{
      series:[
        {data:osc,color:'#FF8C42',width:2},
        {data:up,color:'#10B981',width:1.2},
        {data:lo,color:'#10B981',width:1.2}
      ],
      xmax:tMax, xlabel:'t (s)'
    });
  }

  // ---------- 2) 由特征根实部/虚部求阻尼比 ----------
  function calcDampRoot(){
    var re=num('pod-re'), im=num('pod-im');
    var box=g$('pod-damp-rst');
    if(isNaN(re)||isNaN(im)||im===0){ box.innerHTML='<div class="err">请填写特征根实部 σ 与虚部 ω（ω≠0）</div>'; return; }
    var wn = Math.sqrt(re*re+im*im);
    var zeta = -re/wn;                 // 稳定时 re<0，ζ>0
    var fd = im/(2*Math.PI);
    var rows=[
      ['无阻尼自然频率 ωn', fmt(wn,4)+' rad/s', 'ωn = √(σ² + ω²)'],
      ['振荡频率 f_d', fmt(fd,4)+' Hz', 'f = ω / 2π'],
      ['阻尼比 ζ', fmt(zeta*100,3)+' %', 'ζ = −σ / ωn'],
      ['稳定性', zeta>0?'衰减（稳定）':(zeta===0?'等幅（临界）':'发散（不稳定）'), 'ζ&gt;0 时振荡衰减']
    ];
    var tbl='<table class="tbl"><thead><tr><th>指标</th><th>结果</th><th>公式</th></tr></thead><tbody>';
    rows.forEach(function(r){ tbl+='<tr><td>'+r[0]+'</td><td><b>'+r[1]+'</b></td><td style="font-size:11px">'+r[2]+'</td></tr>'; });
    tbl+='</tbody></table>';
    box.innerHTML = tbl;
  }

  // ---------- 3) POD 相位补偿整定（lead-lag） ----------
  function calcPodTune(){
    var f0=num('pod-f0'), phi=num('pod-phi'), Tw=num('pod-tw'), nst=parseInt(g$('pod-nstage').value,10)||1;
    var box=g$('pod-tune-rst');
    if(isNaN(f0)||f0<=0||isNaN(phi)){ box.innerHTML='<div class="err">请填写目标振荡频率与所需补偿相位</div>'; return; }
    if(Math.abs(phi)>=90){ box.innerHTML='<div class="err">单级 lead-lag 最大补偿不足 90°，请减小相位或增加级数</div>'; return; }

    var w = 2*Math.PI*f0;                 // rad/s
    // 单级需提供的相位
    var phi1 = phi/nst;
    var sp = Math.sin(phi1*Math.PI/180);
    // α = (1+sinφ)/(1−sinφ) ；T1·T2 = 1/ω² ，T1/T2 = α
    var alpha = (1+sp)/(1-sp);
    var T1 = Math.sqrt(alpha)/w;
    var T2 = 1/(w*Math.sqrt(alpha));
    // washout 在 f0 处的相位与增益
    var tw = isNaN(Tw)?NaN:Tw;
    var washPhi = isNaN(tw)?NaN:(90 - Math.atan(w*tw)*180/Math.PI);
    var washGain = isNaN(tw)?NaN:(w*tw/Math.sqrt(1+(w*tw)*(w*tw)));

    var rows=[
      ['目标频率', fmt(f0,3)+' Hz （ω='+fmt(w,3)+' rad/s）', ''],
      ['总补偿相位', fmt(phi,2)+'°', '分 '+nst+' 级，单级 '+fmt(phi1,2)+'°'],
      ['超前时间常数 T1', fmt(T1,5)+' s', 'T1 = √α / ω，α = (1+sinφ)/(1−sinφ) = '+fmt(alpha,4)],
      ['滞后时间常数 T2', fmt(T2,5)+' s', 'T2 = 1 / (ω·√α)'],
      ['校核 T1/T2', fmt(T1/T2,4), '应等于 α = '+fmt(alpha,4)]
    ];
    if(!isNaN(washPhi)){
      rows.push(['隔直(washout)在 f₀ 相位', fmt(washPhi,2)+'°', 'φ_w = 90° − arctan(ωTw)，Tw='+fmt(tw,2)+' s']);
      rows.push(['隔直在 f₀ 增益', fmt(washGain,4), '|G_w| = ωTw / √(1+(ωTw)²)；Tw 宜 3~10 s 使工频附近增益≈1']);
    }

    var tbl='<table class="tbl"><thead><tr><th>参数</th><th>结果</th><th>公式/说明</th></tr></thead><tbody>';
    rows.forEach(function(r){ tbl+='<tr><td>'+r[0]+'</td><td><b>'+r[1]+'</b></td><td style="font-size:11px">'+r[2]+'</td></tr>'; });
    tbl+='</tbody></table>';
    box.innerHTML = tbl +
      '<div class="hint">POD/PSS 典型结构：G(s) = K · (sTw/(1+sTw)) · [(1+sT1)/(1+sT2)]^n。隔直环节阻挡稳态分量；lead-lag 提供相位补偿以抵消励磁/线路滞后，使附加阻尼转矩落在 Δω 轴上。整定后须经现场试验验证。</div>';
  }

  function podSample(){
    g$('pod-a1').value='12.5'; g$('pod-an').value='4.1'; g$('pod-n').value='3'; g$('pod-fd').value='0.65';
    calcDampPeaks();
    g$('pod-f0').value='0.65'; g$('pod-phi').value='45'; g$('pod-tw').value='5'; g$('pod-nstage').value='2';
    calcPodTune();
  }
  function podClear(){
    ['pod-a1','pod-an','pod-n','pod-fd','pod-re','pod-im','pod-f0','pod-phi','pod-tw']
      .forEach(function(id){ g$(id).value=''; });
    g$('pod-damp-rst').innerHTML='<div class="rst-empty">量取振荡峰值或输入特征根</div>';
    g$('pod-tune-rst').innerHTML='';
  }

  window.calcDampPeaks=calcDampPeaks; window.calcDampRoot=calcDampRoot; window.calcPodTune=calcPodTune;
  window.podDrawWave=podDrawWave;
  window.podSample=podSample; window.podClear=podClear;
})();
