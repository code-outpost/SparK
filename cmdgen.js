/* =========================================================================
   SparK · Modbus TCP 指令生成 / 调度命令下发助手  cmdgen.js  (v20260829-5)
   - Modbus TCP = MBAP(7B) + PDU，无 CRC（与 RTU 的关键区别）
     MBAP: 事务标识TID(2) | 协议标识(2)=0000 | 长度(2) | 单元标识UID(1)
   - 支持 03/06/10/05 功能码，32 位数据四种字序 ABCD/CDAB/BADC/DCBA
   - 调度命令模板：AGC有功 / AVC无功 / AVC电压 / 启停机 / 限幅 / 模式切换
   纯前端，无网络依赖。所有数值以现场点表为准。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}
  function num(id){ var v=parseFloat(g$(id).value); return isNaN(v)?NaN:v; }
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  function b2h(b){ return (b<16?'0':'')+b.toString(16).toUpperCase(); }
  function bytesToHex(a){ return a.map(b2h).join(' '); }
  function bswap16(w){ return ((w&0xFF)<<8)|((w>>>8)&0xFF); }
  function u16(v){ return ((v>>>0)&0xFFFF); }
  function hi16(v){ return ((v>>>16)&0xFFFF); }
  // 16 位量拆成两个「字节」——Modbus 报文中所有 16 位字段都是高字节在前
  function hi8(v){ return ((v>>>8)&0xFF); }
  function lo8(v){ return (v&0xFF); }
  function hex16(v){ return b2h(hi8(v))+b2h(lo8(v)); }
  // JS number → IEEE754 单精度位模式（用于把数值写进 FLOAT32 寄存器）
  function f32ToU32(f){
    if(!isFinite(f)) return f>0?0x7F800000:(f<0?0xFF800000:0x7FC00000);
    try{
      var buf=new ArrayBuffer(4), dv=new DataView(buf);
      dv.setFloat32(0,f,false);      // 大端写入
      return dv.getUint32(0,false)>>>0;
    }catch(e){ return 0; }
  }

  /* ---------- 地址基准 ---------- */
  // 40001 基准（人机习惯）→ 协议地址（报文实际使用，0x0000 起）
  function protoAddr(raw, base){
    var a=parseInt(raw,10);
    if(isNaN(a)) return NaN;
    if(base==='40001') return a-40001;
    return a;
  }
  function parseAddr(raw){
    var s=String(raw||'').trim();
    if(/^0x/i.test(s)) return parseInt(s,16);
    return parseInt(s,10);
  }

  /* ---------- 32 位数据 → 2 个寄存器 ---------- */
  function u32ToRegs(u32, order){
    var hi=hi16(u32), lo=u16(u32);
    switch(order){
      case 'CDAB': return [lo, hi];                     // 低字在前
      case 'BADC': return [bswap16(hi), bswap16(lo)];   // 字内字节交换
      case 'DCBA': return [bswap16(lo), bswap16(hi)];   // 低字在前 + 字节交换
      default:     return [hi, lo];                     // ABCD 高字在前
    }
  }
  // 工程量 → 寄存器整数（考虑分辨率与偏移）
  function engToReg(eng, res, off, type){
    var v = eng/(res||1) + (off||0);
    if(type==='i16'||type==='i32') return Math.round(v);
    return Math.round(v);
  }
  function clampByType(v, type){
    if(type==='i16'){ v=v&0xFFFF; }
    else if(type==='u16'){ v=v&0xFFFF; }
    else if(type==='i32'){ v=v>>>0; }
    else if(type==='u32'){ v=v>>>0; }
    return v>>>0;
  }

  /* ---------- 构造 Modbus TCP 帧 ----------
     注意：报文中每个 16 位字段都要拆成「高字节 + 低字节」两个字节，
     不能用 32 位的高/低 16 位拆分（那是字拆分，会多出字节）。 */
  function buildTcp(uid, tid, pdu){
    var len = 1 + pdu.length;                 // UnitID(1) + PDU
    var mbap = [hi8(tid), lo8(tid), 0x00, 0x00, hi8(len), lo8(len), lo8(uid)];
    return mbap.concat(pdu);
  }

  function pduRead03(addr, qty){
    return [0x03, hi8(addr), lo8(addr), hi8(qty), lo8(qty)];
  }
  function pduWrite06(addr, val){
    return [0x06, hi8(addr), lo8(addr), hi8(val), lo8(val)];
  }
  function pduWrite10(addr, regs){
    var n=regs.length, byteCount=n*2;
    var pdu=[0x10, hi8(addr), lo8(addr), hi8(n), lo8(n), byteCount];
    regs.forEach(function(r){ pdu.push(hi8(r), lo8(r)); });
    return pdu;
  }
  function pduWrite05(addr, on){
    return [0x05, hi8(addr), lo8(addr), on?0xFF:0x00, 0x00];
  }

  /* ---------- Tab1：通用指令生成 ---------- */
  function cmdBuildTcp(){
    var box=g$('cmd-tcp-rst');
    if(!box) return;
    var uid=parseInt(g$('cmd-uid').value,10);
    var tid=parseInt(g$('cmd-tid').value,10);
    var fc=g$('cmd-fc').value;
    var base=g$('cmd-base').value;
    var order=g$('cmd-order').value;
    var dtype=g$('cmd-dtype').value;
    if(isNaN(uid)) uid=1;
    if(isNaN(tid)) tid=1;

    var rawAddr=g$('cmd-addr').value;
    var addr=protoAddr(parseAddr(rawAddr), base);
    if(isNaN(addr)||addr<0||addr>0xFFFF){ box.innerHTML='<div class="err">寄存器地址无效（协议地址范围 0~65535；若填 40001 基准请选对应选项）</div>'; return; }

    var pdu, valNote='', regs=[];
    if(fc==='03'||fc==='04'){
      var qty=parseInt(g$('cmd-qty').value,10); if(isNaN(qty)||qty<1) qty=1;
      pdu = fc==='03' ? pduRead03(addr,qty) : [0x04, hi16(addr), u16(addr), hi16(qty), u16(qty)];
      valNote='读 '+qty+' 个寄存器';
    } else if(fc==='06'){
      var v=num('cmd-val');
      if(isNaN(v)){ box.innerHTML='<div class="err">请填写要写入的数值</div>'; return; }
      var iv=clampByType(Math.round(v), dtype);
      regs=[u16(iv)];
      pdu=pduWrite06(addr, regs[0]);
      valNote='写入值 '+v+' → 寄存器 0x'+hex16(regs[0]);
    } else if(fc==='10'){
      var v2=num('cmd-val');
      if(isNaN(v2)){ box.innerHTML='<div class="err">请填写要写入的数值</div>'; return; }
      // FLOAT32 要先转成 IEEE754 位模式，不能直接把整数拆两半
      var u32 = (dtype==='f32') ? f32ToU32(v2) : clampByType(Math.round(v2), dtype);
      regs = (dtype==='i32'||dtype==='u32'||dtype==='f32') ? u32ToRegs(u32, order) : [u32&0xFFFF];
      pdu=pduWrite10(addr, regs);
      valNote='写入值 '+v2+' → 寄存器 [ '+regs.map(function(r){return '0x'+hex16(r);}).join(', ')+' ]';
    } else if(fc==='05'){
      var on=g$('cmd-val').value.trim();
      var isOn = !(on==='0'||on===''||/^off|false/i.test(on));
      pdu=pduWrite05(addr, isOn);
      valNote='写线圈 '+(isOn?'ON (FF00)':'OFF (0000)');
    } else {
      box.innerHTML='<div class="err">不支持的功能码</div>'; return;
    }

    var frame=buildTcp(uid, tid, pdu);
    var len=1+pdu.length;
    var tbl='<table class="tbl"><thead><tr><th>字段</th><th>字节</th><th>说明</th></tr></thead><tbody>'+
      '<tr><td>事务标识 TID</td><td><b>'+b2h(hi8(tid))+' '+b2h(lo8(tid))+'</b></td><td>请求/响应配对，每发一帧 +1</td></tr>'+
      '<tr><td>协议标识</td><td><b>00 00</b></td><td>Modbus 固定为 0</td></tr>'+
      '<tr><td>长度</td><td><b>'+b2h(hi8(len))+' '+b2h(lo8(len))+'</b></td><td>其后字节数 = UnitID(1) + PDU('+pdu.length+')</td></tr>'+
      '<tr><td>单元标识 UID</td><td><b>'+b2h(lo8(uid))+'</b></td><td>从站地址；经网关时填实际从站号</td></tr>'+
      '<tr><td>PDU</td><td><b>'+bytesToHex(pdu)+'</b></td><td>功能码 0x'+b2h(pdu[0])+' + 数据</td></tr>'+
      '</tbody></table>';

    var frameHex=bytesToHex(frame);
    var frameCont=frame.map(b2h).join('');
    box.innerHTML =
      '<div class="card-title" style="margin-top:4px"><div class="dot"></div>MBAP 报文分解</div>'+ tbl +
      '<div class="card-title" style="margin-top:12px"><div class="dot"></div>完整 TCP 帧（HEX）</div>'+
      '<div class="fm">'+frameHex+'</div>'+
      '<div class="fm" style="border-left-color:var(--info)">'+frameCont+'</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'+
        '<button class="btn btn-pri btn-sm" onclick="cmdCopy(\''+frameHex+'\')">复制（空格分隔）</button>'+
        '<button class="btn btn-gho btn-sm" onclick="cmdCopy(\''+frameCont+'\')">复制（连续）</button>'+
      '</div>'+
      '<div class="hint"><b>'+esc(valNote)+'</b>　协议地址 0x'+hex16(addr)+'（'+(base==='40001'?('用户输入 '+esc(rawAddr)+' − 40001 偏移'):('直接填协议地址 '+addr))+'）<br>'+
      '<b style="color:var(--acc)">注意</b>：Modbus <b>TCP 没有 CRC</b>（校验由 TCP 层负责），这是它和 RTU 最容易混用的地方。若你的工具要求填 CRC，说明它走的是 RTU/串口模式。</div>';
  }

  /* ---------- Tab2：调度命令模板 ---------- */
  var DISPATCH = {
    agc:  {name:'AGC 有功功率设定', unit:'kW',   res:0.1, hint:'下发有功目标值。注意正/负号定义（部分厂家以负值表示放电）。'},
    avcq: {name:'AVC 无功功率设定', unit:'kVar', res:0.1, hint:'下发无功目标值，容性/感性方向以点表符号约定为准。'},
    avcv: {name:'AVC 电压设定',     unit:'V',    res:0.1, hint:'下发并网点电压目标，一次/二次侧需按变比换算。'},
    onoff:{name:'启停机 / 并离网',  unit:'—',    res:1,   hint:'遥控类命令：先确认"远方/调度"模式已投入，否则写不进去。'},
    limit:{name:'出力限幅设定',     unit:'%',    res:0.1, hint:'出力上限百分比，100% = 不限。'},
    mode: {name:'控制模式切换',     unit:'—',    res:1,   hint:'常见编码：0=本地 1=远方 2=调度/AGC，具体以点表为准。'}
  };

  function cmdFillDispatch(){
    var k=g$('cmd-disp-type').value;
    var d=DISPATCH[k]; if(!d) return;
    g$('cmd-disp-unit').textContent=d.unit;
    g$('cmd-disp-res').value=d.res;
    g$('cmd-disp-hint').innerHTML='<b>'+esc(d.name)+'</b>：'+esc(d.hint);
    if(k==='onoff'||k==='mode'){
      g$('cmd-disp-val').value = (k==='onoff')?'1':'1';
      g$('cmd-disp-dtype').value='u16';
    }
  }

  // 选 FLOAT32 时把分辨率置 1：浮点本身已带小数，通常不需要再乘倍率
  function cmdDtypeSync(){
    var dt=g$('cmd-disp-dtype');
    if(dt && dt.value==='f32' && g$('cmd-disp-res')) g$('cmd-disp-res').value=1;
  }

  function cmdBuildDispatch(){
    var box=g$('cmd-disp-rst');
    if(!box) return;
    var k=g$('cmd-disp-type').value, d=DISPATCH[k];
    var uid=parseInt(g$('cmd-duid').value,10); if(isNaN(uid)) uid=1;
    var tid=parseInt(g$('cmd-dtid').value,10); if(isNaN(tid)) tid=1;
    var base=g$('cmd-dbase').value, order=g$('cmd-dorder').value, dtype=g$('cmd-disp-dtype').value;
    var addr=protoAddr(parseAddr(g$('cmd-daddr').value), base);
    if(isNaN(addr)||addr<0||addr>0xFFFF){ box.innerHTML='<div class="err">寄存器地址无效</div>'; return; }

    var eng=num('cmd-disp-val');
    var res=num('cmd-disp-res'); if(isNaN(res)||res===0) res=1;
    var off=num('cmd-disp-off'); if(isNaN(off)) off=0;
    if(isNaN(eng)){ box.innerHTML='<div class="err">请填写工程量数值</div>'; return; }

    var intVal=engToReg(eng,res,off,dtype);
    // FLOAT32 写 IEEE754 位模式；整数类型按位宽截断
    var u32v = (dtype==='f32') ? f32ToU32(intVal) : clampByType(intVal,dtype);
    var is32=(dtype==='i32'||dtype==='u32'||dtype==='f32');
    var regs=is32?u32ToRegs(u32v,order):[u32v&0xFFFF];

    var pdu = regs.length>1 ? pduWrite10(addr,regs) : pduWrite06(addr,regs[0]);
    var frame=buildTcp(uid,tid,pdu);
    var rdFrame=buildTcp(uid,tid,pduRead03(addr,regs.length));

    var tbl='<table class="tbl"><tbody>'+
      '<tr><td class="mut">命令</td><td><b>'+esc(d.name)+'</b></td></tr>'+
      '<tr><td class="mut">工程量 → 寄存器值</td><td><b>'+eng+' '+d.unit+'</b> ÷ '+res+' + '+off+' = <b>'+intVal+'</b></td></tr>'+
      (is32?'<tr><td class="mut">32位拆分（'+order+'）</td><td><b>'+regs.map(function(r){return '0x'+hex16(r);}).join('  ')+'</b></td></tr>':'')+
      '<tr><td class="mut">协议地址</td><td><b>0x'+hex16(addr)+'（'+addr+'）</b></td></tr>'+
      '<tr><td class="mut">功能码</td><td><b>0x'+b2h(pdu[0])+'</b>　'+(regs.length>1?'写多寄存器(16)':'写单寄存器(6)')+'</td></tr>'+
      '</tbody></table>';

    box.innerHTML =
      '<div class="card-title" style="margin-top:4px"><div class="dot"></div>下发指令（'+esc(d.name)+'）</div>'+
      '<div class="fm">'+bytesToHex(frame)+'</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn btn-pri btn-sm" onclick="cmdCopy(\''+bytesToHex(frame)+'\')">复制下发帧</button></div>'+
      '<div class="card-title" style="margin-top:12px"><div class="dot"></div>回读校验指令（0x03）</div>'+
      '<div class="fm" style="border-left-color:var(--ok)">'+bytesToHex(rdFrame)+'</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn btn-gho btn-sm" onclick="cmdCopy(\''+bytesToHex(rdFrame)+'\')">复制回读帧</button></div>'+
      tbl +
      '<div class="hint">'+esc(d.hint)+'<br><b style="color:var(--acc)">下发前必查</b>：① 控制模式是否在「远方/调度」；② 该寄存器是否可写（有些是只读遥测）；③ 分辨率与偏移是否和点表一致；④ 下发后务必<b>回读核对</b>。</div>';
  }

  function cmdCopy(txt){
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt);
      } else {
        var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      if(window.toast) window.toast('已复制');
    }catch(e){ if(window.toast) window.toast('复制失败，请手动选择'); }
  }

  window.cmdBuildTcp=cmdBuildTcp;
  window.cmdFillDispatch=cmdFillDispatch;
  window.cmdDtypeSync=cmdDtypeSync;
  window.cmdBuildDispatch=cmdBuildDispatch;
  window.cmdCopy=cmdCopy;
})();
