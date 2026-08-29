/* =========================================================================
   SparK · 直流侧绝缘阻抗估算  insulation.js  (v20260829-3)
   - 光伏/储能直流侧不平衡桥法：已知正负极对地电压，估算 R+、R-
   - 也可输入绝缘监测仪给出的母线对地电阻，直接判断
   - 给出 GB/T / IEC 判定参考
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  function calcInsulation(){
    var mode=g$('ins-mode').value;
    var V=parseFloat(g$('ins-v').value);
    var box=g$('ins-rst');
    if(V<=0){ box.innerHTML='<div class="err">系统电压需 > 0</div>'; return; }

    var Rp=0, Rn=0, Riso=0, status='';
    if(mode==='voltage'){
      var Vp=parseFloat(g$('ins-vp').value);
      var Vn=parseFloat(g$('ins-vn').value);
      if(isNaN(Vp)||isNaN(Vn)||Vp<=0||Vn<=0){ box.innerHTML='<div class="err">请输入正负极对地电压</div>'; return; }
      // 不平衡桥近似：R+/R- ≈ Vn/Vp，且 Rp||Rn = V*R_probe/(Vp+Vn) 形式；此处用工程近似
      // 假设正负桥臂等效电阻 Re 相同：Vp = V*Rp/(Rp+Rn)*Rn/(Rp+Rn) ... 简化用比例
      var ratio=Vn/Vp;
      var Rnom=parseFloat(g$('ins-rnom').value)||1000; // 默认 1kΩ 桥臂
      Rp=Rnom*(1+ratio);
      Rn=Rp/ratio;
      Riso=(Rp*Rn)/(Rp+Rn);
      status='不平衡桥法估算（近似值）。';
    } else {
      Rp=parseFloat(g$('ins-rp').value)||0;
      Rn=parseFloat(g$('ins-rn').value)||0;
      if(Rp<=0 && Rn<=0){ box.innerHTML='<div class="err">请至少输入一个对地电阻</div>'; return; }
      if(Rp>0 && Rn>0) Riso=(Rp*Rn)/(Rp+Rn);
      else Riso=Math.max(Rp,Rn);
      status='直接测量值。';
    }

    // 判定：GB/T 18216 / IEC 61543 类参考；光伏组件侧一般要求 > 1MΩ/V 或装置阈值
    var limit=V*1000; // 1kΩ/V -> MΩ/V = 1000Ω/V；这里用 MΩ
    var limitM=V; // 1MΩ/V
    var rmK=Riso/1000; // kΩ
    var pass=rmK>=limitM*1000; // 若 Riso 单位 kΩ，limitM MΩ -> kΩ = MΩ*1000
    // 修正：Riso 单位 Ω，limitM 单位 MΩ；limitM*1e6 Ω
    pass = Riso >= limitM*1e6;

    var html=
      '<table class="tbl"><tbody>'+
      '<tr><td class="mut">正极对地电阻 R+</td><td><b>'+(Rp/1e6).toFixed(3)+' MΩ</b></td></tr>'+
      '<tr><td class="mut">负极对地电阻 R-</td><td><b>'+(Rn/1e6).toFixed(3)+' MΩ</b></td></tr>'+
      '<tr><td class="mut">等效总绝缘电阻</td><td><b>'+(Riso/1e6).toFixed(3)+' MΩ</b></td></tr>'+
      '<tr><td class="mut">参考判据（≥'+limitM.toFixed(1)+' MΩ）</td><td><b style="color:'+(pass?'var(--ok)':'var(--acc)')+'">'+(pass?'合格':'偏低')+'</b></td></tr>'+
      '</tbody></table>'+
      '<div class="hint">'+status+' 工程上常按“绝缘电阻 ≥ 1MΩ/V”作为经验阈值；光伏并网/储能系统请以装置整定值及现场规程为准。注：不平衡桥法为估算，精确值需用专用绝缘监测仪。</div>';
    box.innerHTML=html;
  }

  function insMode(){
    var m=g$('ins-mode').value;
    g$('ins-voltage-inputs').style.display=m==='voltage'?'block':'none';
    g$('ins-res-inputs').style.display=m==='res'?'block':'none';
  }
  function insSample(){
    g$('ins-mode').value='voltage';
    g$('ins-v').value='800';
    g$('ins-vp').value='520';
    g$('ins-vn').value='280';
    g$('ins-rnom').value='1000';
    insMode(); calcInsulation();
  }
  function insClear(){
    g$('ins-v').value=''; g$('ins-vp').value=''; g$('ins-vn').value=''; g$('ins-rp').value=''; g$('ins-rn').value='';
    g$('ins-rst').innerHTML='<div class="rst-empty">选择模式并输入参数</div>';
  }

  window.calcInsulation=calcInsulation; window.insMode=insMode;
  window.insSample=insSample; window.insClear=insClear;
})();
