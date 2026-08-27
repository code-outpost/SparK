/* =========================================================================
   SparK · Modbus RTU CRC 校验/解析  modbus.js
   - 输入十六进制 RTU 帧，校验 CRC16（Modbus 多项式 0xA001）
   - 构造请求帧自动生成 CRC
   - 解析 0x01/0x02/0x03/0x04 响应
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}

  function hexToBytes(str){
    var s=str.replace(/[^0-9A-Fa-f]/g,'');
    var out=[];
    for(var i=0;i<s.length;i+=2) out.push(parseInt(s.substr(i,2),16));
    return out;
  }
  function bytesToHex(a){return a.map(function(b){return (b<16?'0':'')+b.toString(16).toUpperCase();}).join(' ');}

  function modbusCrc16(data){
    var crc=0xFFFF;
    for(var i=0;i<data.length;i++){
      crc ^= data[i];
      for(var j=0;j<8;j++){
        if(crc&1) crc=(crc>>>1)^0xA001;
        else crc=crc>>>1;
      }
    }
    return [crc&0xFF, (crc>>>8)&0xFF];
  }

  function mbCheck(){
    var box=g$('mb-rst2');
    var bytes=hexToBytes(g$('mb-frame').value);
    if(bytes.length<3){ box.innerHTML='<div class="err">帧长至少 3 字节（地址+功能码+CRC）</div>'; return; }
    var payload=bytes.slice(0,-2);
    var recv=bytes.slice(-2);
    var calc=modbusCrc16(payload);
    var ok=recv[0]===calc[0] && recv[1]===calc[1];
    var fc=bytes[1];
    var parse='';
    if(fc===0x03 || fc===0x04){
      if(bytes.length>=3) parse='读寄存器响应：字节数 '+bytes[2]+'，寄存器值可进一步按 16/32 位解析。';
    } else if(fc===0x01 || fc===0x02){
      parse='读线圈/离散量响应：字节数 '+bytes[2]+'。';
    } else if(fc>=0x80){
      parse='异常响应：异常码 0x'+bytesToHex([bytes[2]])+'。';
    }
    box.innerHTML=
      '<table class="tbl"><tbody>'+
      '<tr><td class="mut">接收 CRC</td><td><b>'+bytesToHex(recv)+'</b></td></tr>'+
      '<tr><td class="mut">计算 CRC</td><td><b>'+bytesToHex(calc)+'</b></td></tr>'+
      '<tr><td class="mut">校验结果</td><td><b style="color:'+(ok?'var(--ok)':'var(--acc)')+'">'+(ok?'CRC 正确':'CRC 错误')+'</b></td></tr>'+
      '<tr><td class="mut">解析</td><td>'+parse+'</td></tr>'+
      '</tbody></table>';
  }

  function mbBuild(){
    var slave=parseInt(g$('mb-slave').value,10);
    var fc=parseInt(g$('mb-fc2').value,10);
    var addr=parseInt(g$('mb-reg').value,10);
    var qty=parseInt(g$('mb-qty').value,10);
    var box=g$('mb-build-rst');
    if(isNaN(slave)||isNaN(fc)||isNaN(addr)||isNaN(qty)){ box.innerHTML='<div class="err">请填写完整参数</div>'; return; }
    var payload=[slave, fc, (addr>>>8)&0xFF, addr&0xFF, (qty>>>8)&0xFF, qty&0xFF];
    var crc=modbusCrc16(payload);
    var frame=payload.concat(crc);
    box.innerHTML=
      '<table class="tbl"><tbody>'+
      '<tr><td class="mut">请求帧（HEX）</td><td><b>'+bytesToHex(frame)+'</b></td></tr>'+
      '<tr><td class="mut">CRC</td><td><b>'+bytesToHex(crc)+'</b></td></tr>'+
      '</tbody></table>';
  }

  function mbSample(){ g$('mb-frame').value='01 03 00 00 00 0A C5 CD'; mbCheck(); }
  function mbClear(){ g$('mb-frame').value=''; g$('mb-rst2').innerHTML='<div class="rst-empty">粘贴十六进制 RTU 帧</div>'; g$('mb-build-rst').innerHTML=''; }

  window.mbCheck=mbCheck; window.mbBuild=mbBuild;
  window.mbSample=mbSample; window.mbClear=mbClear;
})();
