/* =========================================================================
   SparK · 通用波形绘制助手  wave.js  (v20260829-3)
   - drawWave(canvasId, opts)：绘制带坐标轴/网格的折线（支持多序列）
   - 供 POD / 一次调频 / 虚拟惯量 等工具的「波形图参考」复用
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';

  var _waves = [];

  function draw(id, opts){
    var cv = document.getElementById(id);
    if(!cv) return;
    var dpr = window.devicePixelRatio || 1;
    var rect = cv.getBoundingClientRect();
    var W = Math.max(rect.width || cv.clientWidth || 0, 0);
    if(W < 2) W = 600;                       // 隐藏时给个默认宽，避免 0
    var H = 240;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);

    var pl=46, pr=12, pt=14, pb=26;
    var gw=W-pl-pr, gh=H-pt-pb;

    var ymin=opts.ymin, ymax=opts.ymax;
    if(ymin==null||ymax==null){
      var mn=Infinity,mx=-Infinity;
      opts.series.forEach(function(s){ s.data.forEach(function(v){ if(v<mn)mn=v; if(v>mx)mx=v; }); });
      if(!isFinite(mn)||!isFinite(mx)||mn===mx){ mn=mn||0; mx=(mx||0)+1; }
      var pad=(mx-mn)*0.12 || 1;
      if(ymin==null) ymin=mn-pad;
      if(ymax==null) ymax=mx+pad;
    }

    // 横向网格 + y 轴刻度
    ctx.lineWidth=1; ctx.font='10px Consolas,monospace';
    var rows=4;
    for(var i=0;i<=rows;i++){
      var y=pt+gh*i/rows;
      ctx.strokeStyle='rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.moveTo(pl,y); ctx.lineTo(pl+gw,y); ctx.stroke();
      var val=ymax-(ymax-ymin)*i/rows;
      ctx.fillStyle='#9AA7B8'; ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillText(val.toFixed(2), pl-6, y);
    }
    // 零线
    if(ymin<0 && ymax>0){
      var yz=pt+gh*(ymax-0)/(ymax-ymin);
      ctx.strokeStyle='rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.moveTo(pl,yz); ctx.lineTo(pl+gw,yz); ctx.stroke();
    }
    // x 轴刻度
    ctx.fillStyle='#9AA7B8'; ctx.textAlign='center'; ctx.textBaseline='top';
    var cols=4;
    for(var j=0;j<=cols;j++){
      var x=pl+gw*j/cols;
      var lbl = opts.xmax!=null ? (opts.xmax*j/cols).toFixed(2) : String(j);
      ctx.fillText(lbl, x, pt+gh+6);
    }
    // 序列
    opts.series.forEach(function(s){
      var n=s.data.length; if(n<2) return;
      ctx.strokeStyle=s.color||'#FF8C42'; ctx.lineWidth=s.width||2;
      ctx.beginPath();
      for(var k=0;k<n;k++){
        var x=pl+gw*k/(n-1);
        var y=pt+gh*(ymax-s.data[k])/(ymax-ymin);
        if(k===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    });
    // 轴标题
    ctx.fillStyle='#9AA7B8'; ctx.textAlign='left'; ctx.textBaseline='top';
    if(opts.xlabel) ctx.fillText(opts.xlabel, pl, pt+gh+14);
  }

  window.drawWave = function(id, opts){
    var cv = document.getElementById(id);
    if(!cv) return;
    cv._waveOpts = opts;
    if(_waves.indexOf(id)<0) _waves.push(id);
    draw(id, opts);
  };

  // 仅重绘当前可见 section 内的波形（导航切换/窗口缩放时调用）
  window.redrawVisibleWaves = function(){
    _waves.forEach(function(id){
      var cv=document.getElementById(id);
      if(!cv || !cv._waveOpts) return;
      var sec=cv.closest ? cv.closest('.sect') : null;
      if(!sec || sec.classList.contains('on')) draw(id, cv._waveOpts);
    });
  };

  window.addEventListener('resize', function(){ if(window.redrawVisibleWaves) window.redrawVisibleWaves(); });
})();
