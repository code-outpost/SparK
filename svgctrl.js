/* =========================================================================
   SparK · SVG/逆变器无功调节（Q/U、PF 控制）整定校验  svgctrl.js  (v20260829-3)
   - Q/U 下垂曲线：死区、斜率、容量上下限
   - PF 控制目标校验
   - 判断运行点是否在无功调节能力包络内
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  function calcSvg(){
    var Sn=parseFloat(g$('svg-sn').value);
    var qMax=parseFloat(g$('svg-qmax').value);
    var mode=g$('svg-mode').value;
    var box=g$('svg-rst');
    if(Sn<=0){ box.innerHTML='<div class="err">额定容量需 > 0</div>'; return; }

    var html='';
    if(mode==='pf'){
      var pf=parseFloat(g$('svg-pf').value);
      var P=parseFloat(g$('svg-p').value);
      if(isNaN(pf)||pf<=0||pf>1||isNaN(P)){ box.innerHTML='<div class="err">PF ∈ (0,1]，P 有效</div>'; return; }
      var S=P/pf;
      var Q=P*Math.tan(Math.acos(pf));
      var cap=Math.min(qMax, Sn); // 可用无功容量
      var ok=Q<=cap*1.001;
      html=
        '<table class="tbl"><tbody>'+
        '<tr><td class="mut">视在功率 S</td><td><b>'+S.toFixed(2)+' kVA</b></td></tr>'+
        '<tr><td class="mut">无功需求 Q</td><td><b>'+Q.toFixed(2)+' kvar</b></td></tr>'+
        '<tr><td class="mut">可用无功容量</td><td><b>'+cap.toFixed(2)+' kvar</b></td></tr>'+
        '<tr><td class="mut">PF 目标可行性</td><td><b style="color:'+(ok?'var(--ok)':'var(--acc)')+'">'+(ok?'可满足':'超出容量')+'</b></td></tr>'+
        '</tbody></table>'+
        '<div class="hint">PF 控制时 Q = P×tan(arccos PF)。注意正负号约定：感性无功通常取正，容性取负。</div>';
    } else {
      var u0=parseFloat(g$('svg-u0').value);
      var u=parseFloat(g$('svg-u').value);
      var droop=parseFloat(g$('svg-droop').value);
      if(isNaN(u0)||isNaN(u)||isNaN(droop)){ box.innerHTML='<div class="err">请输入电压与斜率参数</div>'; return; }
      var du=(u-u0)/u0*100; // %
      var qRef=-du*droop/100*qMax; // 下垂：电压高则发感性无功（正）/ 电压低则发容性（负），符号按常用约定
      var qRefAbs=Math.abs(qRef);
      var satur=qRefAbs>qMax;
      var qOut=satur?(qRef>0?qMax:-qMax):qRef;
      html=
        '<table class="tbl"><tbody>'+
        '<tr><td class="mut">电压偏差 ΔU</td><td><b>'+du.toFixed(2)+'%</b></td></tr>'+
        '<tr><td class="mut">Q/U 目标无功</td><td><b>'+qRef.toFixed(2)+' kvar</b></td></tr>'+
        '<tr><td class="mut">是否饱和</td><td><b>'+(satur?'是（容量限制）':'否')+'</b></td></tr>'+
        '<tr><td class="mut">实际输出无功</td><td><b>'+qOut.toFixed(2)+' kvar</b></td></tr>'+
        '</tbody></table>'+
        '<div class="hint">Q/U 下垂：电压高于死区则输出感性无功（吸收过剩无功），低于死区则输出容性无功（支撑电压）。斜率单位：%Sn/%U。</div>';
    }
    box.innerHTML=html;
  }

  function svgMode(){
    var m=g$('svg-mode').value;
    g$('svg-pf-wrap').style.display=m==='pf'?'block':'none';
    g$('svg-qu-wrap').style.display=m==='qu'?'block':'none';
  }
  function svgSample(){
    g$('svg-sn').value='1000'; g$('svg-qmax').value='1000';
    g$('svg-mode').value='qu'; g$('svg-u0').value='400'; g$('svg-u').value='408'; g$('svg-droop').value='5';
    g$('svg-pf').value='0.95'; g$('svg-p').value='800';
    svgMode(); calcSvg();
  }
  function svgClear(){
    g$('svg-u').value=''; g$('svg-pf').value=''; g$('svg-p').value='';
    g$('svg-rst').innerHTML='<div class="rst-empty">选择模式并输入参数</div>';
  }

  window.calcSvg=calcSvg; window.svgMode=svgMode;
  window.svgSample=svgSample; window.svgClear=svgClear;
})();
