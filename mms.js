/* =========================================================================
   SparK · IEC 61850 MMS 报文查看  mms.js
   - 对 MMS/ACSE 报文做 BER 浅层解析
   - 识别 initiate-RequestPDU / confirmed-RequestPDU / read / write 等常见结构
   - 给出 ACSI 服务映射提示
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

  function berLen(d,i){
    if((d[i]&0x80)===0) return [d[i]&0x7F,1];
    var nb=d[i]&0x7F, len=0;
    for(var k=1;k<=nb;k++) len=(len<<8)|d[i+k];
    return [len,1+nb];
  }
  function berDecode(d,start,depth,out){
    var i=start;
    while(i<d.length){
      if(d[i]===0) break;
      var tag=d[i++];
      var constructed=(tag&0x20)!==0;
      var tagNum=tag&0x1F;
      if(tagNum===0x1F){ tagNum=0; while(i<d.length && d[i]&0x80){ tagNum=(tagNum<<7)|(d[i]&0x7F); i++; } tagNum=(tagNum<<7)|d[i]; i++; }
      var lr=berLen(d,i); var len=lr[0], ll=lr[1]; i+=ll;
      var end=i+len;
      if(end>d.length) end=d.length;
      var node={tag:tag.toString(16).toUpperCase(), tagNum:tagNum, constructed:constructed, len:len, start:i, end:end, children:[]};
      if(constructed) berDecode(d,i,depth+1,node.children);
      out.push(node);
      i=end;
    }
  }

  function tagName(tn){
    var map={0:'EOC',1:'BOOLEAN',2:'INTEGER',3:'BIT STRING',4:'OCTET STRING',5:'NULL',6:'OID',9:'REAL',10:'ENUMERATED',16:'SEQUENCE',17:'SET'};
    return map[tn]||('TAG '+tn);
  }

  function mmsParse(){
    var box=g$('mms-rst');
    var d=hexToBytes(g$('mms-frame').value);
    if(d.length<3){ box.innerHTML='<div class="err">报文太短</div>'; return; }
    var root=[]; berDecode(d,0,0,root);
    if(!root.length){ box.innerHTML='<div class="err">不是有效 BER 结构</div>'; return; }

    // 根节点通常为 ACSE AARQ/AASSOCIATE 或 MMS PDU
    var summary='';
    var top=root[0];
    if(top.tagNum===0 && top.constructed) summary='MMS initiate-RequestPDU（提议参数，如 maxServOutstandingCalling 等）。';
    else if(top.tagNum===1 && top.constructed) summary='MMS initiate-ResponsePDU。';
    else if(top.tagNum===2 && top.constructed) summary='MMS confirmed-RequestPDU（读/写/报告等 ACSI 服务请求）。';
    else if(top.tagNum===3 && top.constructed) summary='MMS confirmed-ResponsePDU。';
    else if(top.tagNum===96) summary='ACSE AARQ（关联请求）。';
    else if(top.tagNum===97) summary='ACSE AARE（关联响应）。';

    function dump(nodes,depth){
      var s='';
      for(var i=0;i<nodes.length;i++){
        var n=nodes[i];
        var indent='  '.repeat(depth);
        var name=tagName(n.tagNum);
        s+=indent+'['+n.tag+'] '+name+' len='+n.len;
        if(!n.constructed && n.len<=8 && n.len>0){
          s+=' value='+bytesToHex(d.slice(n.start,n.end));
        }
        s+='\n';
        if(n.children.length) s+=dump(n.children,depth+1);
      }
      return s;
    }

    box.innerHTML=
      '<div class="card-title"><div class="dot"></div>解析摘要</div>'+
      '<div class="step-c">'+summary+'</div>'+
      '<div class="card-title" style="margin-top:10px"><div class="dot"></div>BER 结构</div>'+
      '<pre style="background:var(--bg2);padding:10px;border-radius:6px;overflow:auto;font-family:var(--mono);font-size:12px;white-space:pre-wrap">'+dump(root,0)+'</pre>'+
      '<div class="hint">ACSI→MMS 映射提示：GetDataValues→Read，SetDataValues→Write，GetDataDirectory→GetNameList，Report→InformationReport/UnsetCB/SetCB。具体 tag 解析需结合 IEC 61850-8-1。</div>';
  }

  function mmsSample(){
    // 一个虚构但 BER 结构合理的 initiate-RequestPDU 样例（十六进制）
    g$('mms-frame').value='A0 1D 30 1B A0 03 80 01 01 A1 03 80 01 01 A2 05 80 03 00 80 00 A3 06 80 01 05 81 01 01';
    mmsParse();
  }
  function mmsClear(){ g$('mms-frame').value=''; g$('mms-rst').innerHTML='<div class="rst-empty">粘贴 MMS/ACSE 十六进制报文</div>'; }

  window.mmsParse=mmsParse; window.mmsSample=mmsSample; window.mmsClear=mmsClear;
})();
