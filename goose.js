/* =========================================================================
   SparK · GOOSE 报文解析  goose.js  (v20260827-1)
   IEC 61850 GOOSE 报文解析：以太网帧 / PCAP(.pcap/.pcapng) 输入，
   ASN.1 BER 解码 GOOSE PDU，可选 SCD/ICD/CID 进行 Dataset 语义解读。
   纯前端、无网络依赖。核心解码逻辑为纯函数，可在 Node 中单测。
   ========================================================================= */
(function(){
'use strict';

/* ===================== 基础工具 ===================== */
function gxToHex(n, pad){ n=+n||0; var s=n.toString(16).toUpperCase(); while(s.length<(pad||2))s='0'+s; return s; }

function gxHexToBytes(s){
  if(typeof s!=='string') return null;
  var cleaned=s.replace(/0x/gi,'').replace(/[^0-9A-Fa-f]/g,'');
  if(cleaned.length%2!==0) cleaned='0'+cleaned; // 容错：补前导0
  var arr=new Uint8Array(cleaned.length/2);
  for(var i=0;i<arr.length;i++) arr[i]=parseInt(cleaned.substr(i*2,2),16);
  return arr;
}

function gxBytesToHex(arr, sep){
  sep = (sep===undefined)?' ':sep;
  var out=[];
  for(var i=0;i<arr.length;i++) out.push(gxToHex(arr[i],2));
  return out.join(sep);
}

// 大端读取整数
function gxReadInt(bytes, off, len, signed){
  var v=0;
  for(var i=0;i<len;i++){ v=(v*256)+bytes[off+i]; }
  if(signed){
    var bits=len*8;
    if(v>=Math.pow(2,bits-1)) v-=Math.pow(2,bits);
  }
  return v;
}
function gxReadIntLE(bytes, off, len, signed){
  var v=0;
  for(var i=len-1;i>=0;i--){ v=(v*256)+bytes[off+i]; }
  if(signed){
    var bits=len*8;
    if(v>=Math.pow(2,bits-1)) v-=Math.pow(2,bits);
  }
  return v;
}

// UtcTime（IEC 61850）= 8 字节：前4字节秒(大端) + 3字节小数(1/2^24 s) + 1字节时间品质
function gxUtcTime(bytes, off){
  off=off||0;
  var sec=gxReadInt(bytes, off, 4, false);
  var frac=gxReadInt(bytes, off+4, 3, false);
  var q=bytes[off+7]||0;
  var d=new Date(sec*1000);
  var iso=d.toISOString().replace('T',' ').replace(/\.\d+Z$/,'');
  var fracMs=Math.round(frac/Math.pow(2,24)*1000);
  // 时间品质位
  var qbits=[];
  if(q&0x01) qbits.push('闰年已校');
  if(q&0x02) qbits.push('闰秒待删');
  if(q&0x04) qbits.push('闰秒待加');
  if(q&0x08) qbits.push('时钟故障');
  if(q&0x10) qbits.push('时钟未同步');
  var clockClass=q>>4; // 高4位为时钟类别
  return {sec:sec, iso:iso, fracMs:fracMs, quality:q, clockClass:clockClass,
          qdesc:(qbits.length?qbits.join('/'):'正常')+' (cls'+clockClass+')'};
}

// 位串展开
function gxBitString(bytes, unused){
  unused=unused||0;
  var bits=[];
  for(var i=0;i<bytes.length;i++){
    for(var b=7;b>=0;b--){
      bits.push((bytes[i]>>b)&1);
    }
  }
  // 去掉末尾 unused 个无关位
  if(unused>0) bits=bits.slice(0, bits.length-unused);
  return bits;
}

/* ===================== ASN.1 BER 解码 ===================== */
// 解析一段字节为 TLV 节点数组
function gxBerDecode(bytes, off, end){
  off=off||0; if(end===undefined) end=bytes.length;
  var nodes=[]; var p=off;
  while(p<end){
    if(p>=end) break;
    var fb=bytes[p++];
    var cls=(fb&0xC0)>>6;
    var constructed=(fb&0x20)?true:false;
    var tagNum=fb&0x1F;
    if(tagNum===0x1F){
      tagNum=0;
      while(p<end){ var b=bytes[p++]; tagNum=(tagNum<<7)|(b&0x7F); if(!(b&0x80)) break; }
    }
    // 长度
    if(p>=end) break;
    var l0=bytes[p++];
    var len=0;
    if(l0===0x80){
      // 不定长：读到 00 00
      var startContent=p;
      while(p<end-1){ if(bytes[p]===0x00&&bytes[p+1]===0x00) break; p++; }
      len=p-startContent; p+=2; // 跳过 00 00
    } else if(l0&0x80){
      var nbytes=l0&0x7F; len=0;
      for(var i=0;i<nbytes;i++){ len=(len*256)+(bytes[p++]||0); }
    } else {
      len=l0;
    }
    var valueStart=p;
    var valueEnd=p+len;
    if(valueEnd>end) valueEnd=end;
    var node={cls:cls, constructed:constructed, tagNum:tagNum, len:len,
              vs:valueStart, ve:valueEnd, rawOff:p-(len)-1-( (l0&0x80?( (l0&0x7F) ):0 ) )};
    if(constructed && valueEnd>valueStart){
      node.children=gxBerDecode(bytes, valueStart, valueEnd);
    }
    nodes.push(node);
    p=valueEnd;
  }
  return nodes;
}

// 通用标签名
function gxTagLabel(cls, constructed, tagNum){
  if(cls===2){ // context-specific
    return '[C'+tagNum+(constructed?' CONSTRUCTED':'')+']';
  }
  if(cls===0){ // universal
    var m={1:'BOOLEAN',2:'INTEGER',3:'BIT STRING',4:'OCTET STRING',5:'NULL',6:'OBJECT ID',9:'REAL',10:'ENUMERATED',
           12:'UTF8String',13:'RELATIVE-OID',16:'SEQUENCE',17:'SET',18:'NumericString',19:'PrintableString',
           20:'TeletexString',21:'VideotexString',22:'IA5String',23:'UTCTime',24:'GeneralizedTime',25:'GraphicString',
           26:'VisibleString',27:'GeneralString',28:'UniversalString',30:'BMPString'};
    return m[tagNum]||('UNIV['+tagNum+']');
  }
  if(cls===1) return 'APPL['+tagNum+']';
  return 'PRIV['+tagNum+']';
}

// 解码一个值节点为可读对象 {type, value, raw}
function gxDecodeValue(bytes, node){
  var cls=node.cls, tn=node.tagNum;
  var raw=Array.prototype.slice.call(bytes.subarray?bytes.subarray(node.vs,node.ve):bytes.slice(node.vs,node.ve));
  // context-specific：通常 [0] 包裹真实值
  if(cls===2){
    if(node.children && node.children.length){
      // 取第一个子节点再解码
      return gxDecodeValue(bytes, node.children[0]);
    }
    return {type:'[C'+tn+']', value:gxBytesToHex(raw,''), raw:raw};
  }
  var rlen=node.ve-node.vs;
  switch(tn){
    case 1: // BOOLEAN
      return {type:'BOOLEAN', value:(raw[0]?true:false), raw:raw};
    case 2: // INTEGER
    case 10: // ENUMERATED
      { var iv=gxReadInt(raw,0,raw.length,true);
        return {type:(tn===10?'ENUMERATED':'INTEGER'), value:iv, raw:raw}; }
    case 3: // BIT STRING
      { var unused=raw[0]||0;
        var bs=gxBitString(raw.slice(1), unused);
        return {type:'BIT STRING', value:'0x'+gxBytesToHex(raw.slice(1),''), bits:bs, unused:unused, raw:raw}; }
    case 4: // OCTET STRING
      return {type:'OCTET STRING', value:gxBytesToHex(raw,''), raw:raw};
    case 6:
      return {type:'OID', value:raw.join('.'), raw:raw};
    case 9: // REAL (常见 32 位 IEEE754，首字节 0x08)
      { if(rlen===4){
          // 0x08 + 3 字节 构成 IEEE754 单精度
          var buf=new ArrayBuffer(4); var u8=new Uint8Array(buf);
          u8[0]=raw[1]; u8[1]=raw[2]; u8[2]=raw[3]; u8[3]=raw[0]; // 0x08 标志不计，其余大端
          var f=new DataView(buf).getFloat32(0,false);
          return {type:'REAL(32)', value:f, raw:raw};
        } else if(rlen===8){
          var buf2=new ArrayBuffer(8); var u82=new Uint8Array(buf2);
          for(var i=0;i<8;i++) u82[i]=raw[i];
          var f2=new DataView(buf2).getFloat64(0,false);
          return {type:'REAL(64)', value:f2, raw:raw};
        }
        return {type:'REAL', value:gxBytesToHex(raw,''), raw:raw}; }
    case 23: // UTCTime
    case 24: // GeneralizedTime
      return {type:(tn===23?'UTCTime':'GeneralizedTime'), value:String.fromCharCode.apply(null,raw), raw:raw};
    case 18: case 19: case 20: case 21: case 22: case 25: case 26: case 27: case 28: case 30:
      return {type:'STRING', value:String.fromCharCode.apply(null,raw), raw:raw};
    case 16: // SEQUENCE -> 结构
      { var members=node.children.map(function(c,i){ return {i:i, label:gxTagLabel(c.cls,c.constructed,c.tagNum), val:gxDecodeValue(bytes,c)}; });
        return {type:'SEQUENCE', members:members, raw:raw}; }
    case 5: return {type:'NULL', value:null, raw:raw};
    default:
      return {type:gxTagLabel(cls,constructed,tn), value:gxBytesToHex(raw,''), raw:raw};
  }
}

/* ===================== GOOSE PDU 解析 ===================== */
// GOOSE APDU (APPLICATION [1] = 0x61) 字段映射
var GX_FIELDS=[
  {tag:0x00, name:'gocbRef',          type:'STRING'},
  {tag:0x01, name:'timeAllowedToLive',type:'INTEGER'},
  {tag:0x02, name:'datSet',           type:'STRING'},
  {tag:0x03, name:'goID',             type:'STRING'},
  {tag:0x04, name:'t',                type:'UTCTime'},
  {tag:0x05, name:'stNum',            type:'INTEGER'},
  {tag:0x06, name:'sqNum',            type:'INTEGER'},
  {tag:0x07, name:'simulation',       type:'BOOLEAN'},
  {tag:0x08, name:'confRev',          type:'INTEGER'},
  {tag:0x09, name:'ndsCom',           type:'BOOLEAN'},
  {tag:0x0A, name:'numDatSetEntries', type:'INTEGER'},
  {tag:0x0B, name:'datSet(数据)',     type:'DATASET'}
];

function gxParseGoosePdu(pdu, pduLen){
  pduLen=(pduLen===undefined)?pdu.length:pduLen;
  var top=gxBerDecode(pdu,0,pduLen);
  if(!top.length){ throw new Error('GOOSE PDU 不是有效 BER 结构'); }
  var pduNode=top[0];
  // 期望 APPLICATION [1] 节点；若首节点本身就是字段 SEQUENCE 则直接用其 children
  if(!(pduNode.cls===1 && pduNode.tagNum===1) && pduNode.children && pduNode.children.length===0 && top.length>1){
    pduNode={children:top};
  }
  var fields={};
  var datasetNode=null;
  (pduNode.children||[]).forEach(function(n){
    var f=null;
    for(var i=0;i<GX_FIELDS.length;i++){ if(GX_FIELDS[i].tag===n.tagNum){ f=GX_FIELDS[i]; break; } }
    if(!f) return;
    if(f.type==='STRING'){
      fields[f.name]=String.fromCharCode.apply(null, Array.prototype.slice.call(pdu.subarray?pdu.subarray(n.vs,n.ve):pdu.slice(n.vs,n.ve)));
    } else if(f.type==='INTEGER'){
      fields[f.name]=gxReadInt(pdu,n.vs,n.ve-n.vs,true);
    } else if(f.type==='BOOLEAN'){
      fields[f.name]=(pdu[n.vs]?true:false);
    } else if(f.type==='UTCTime'){
      fields[f.name]=gxUtcTime(pdu,n.vs);
    } else if(f.type==='DATASET'){
      datasetNode=n;
    }
  });
  // 解析 Dataset 条目
  var entries=[];
  if(datasetNode && datasetNode.children){
    datasetNode.children.forEach(function(dataNode, idx){
      // Data = SEQUENCE (0x30)
      entries.push(gxDecodeDataElement(pdu, dataNode, idx));
    });
  }
  return {fields:fields, entries:entries, raw:pdu};
}

function gxDecodeDataElement(bytes, dataNode, idx){
  // Data SEQUENCE -> [0] 值, [1] quality, [2] timeStamp ...
  var value=null, quality=null, timeStamp=null;
  (dataNode.children||[]).forEach(function(c){
    if(c.cls===2 && c.tagNum===0){ // [0] 值
      value=gxDecodeValue(bytes, c);
    } else if(c.cls===2 && c.tagNum===1){ // [1] quality (BIT STRING)
      var qbytes=Array.prototype.slice.call(bytes.subarray?bytes.subarray(c.vs,c.ve):bytes.slice(c.vs,c.ve));
      quality={type:'Quality', raw:gxBytesToHex(qbytes,''), bits:gxBitString((qbytes.length>1?qbytes.slice(1):[]), qbytes[0]||0)};
    } else if(c.cls===2 && c.tagNum===2){ // [2] timeStamp
      if(c.ve-c.vs>=8) timeStamp=gxUtcTime(bytes,c.vs);
    }
  });
  var rawBytes=Array.prototype.slice.call(bytes.subarray?bytes.subarray(dataNode.vs,dataNode.ve):bytes.slice(dataNode.vs,dataNode.ve));
  return {idx:idx, value:value, quality:quality, timeStamp:timeStamp, rawHex:gxBytesToHex(rawBytes,'')};
}

/* ===================== 以太网帧 / 报文定位 ===================== */
// 从一段字节中定位 GOOSE PDU。mode: 'auto' | 'frame' | 'appid' | 'pdu'
function gxExtractGoose(bytes, mode){
  mode=mode||'auto';
  var i, k;
  function findEthertype(){
    // 搜索 0x88 0xB8
    for(var j=0;j<bytes.length-1;j++){ if(bytes[j]===0x88 && bytes[j+1]===0xB8) return j; }
    return -1;
  }
  if(mode==='pdu'){
    return {pduStart:0, pduLen:bytes.length, header:null, note:'原始 PDU（跳过帧头）'};
  }
  if(mode==='appid'){
    // 前8字节：APPID(2)+Len(2)+Res1(2)+Res2(2)
    if(bytes.length<8) throw new Error('长度不足，无法按「仅APPID头」解析');
    return {pduStart:8, pduLen:bytes.length-8, header:gxReadHeader(bytes,0), note:'从 APPID 头起'};
  }
  if(mode==='frame'){
    var et=findEthertype();
    if(et<0) throw new Error('未找到 GOOSE EtherType 0x88B8');
    return buildFromEthertype(bytes, et);
  }
  // auto
  var et2=findEthertype();
  if(et2>=0){ return buildFromEthertype(bytes, et2); }
  // 没找到 0x88B8：尝试从开头按 APPID 头解析（APPID 通常 0x0001..0x3FFF）
  if(bytes.length>=10){
    var appid=gxReadInt(bytes,0,2,false);
    if(appid>=0x0001 && appid<=0x3FFF){
      return {pduStart:8, pduLen:bytes.length-8, header:gxReadHeader(bytes,0), note:'自动：按 APPID 头解析（未发现 0x88B8）'};
    }
  }
  // 兜底：当原始 PDU
  return {pduStart:0, pduLen:bytes.length, header:null, note:'自动：未发现帧特征，按原始 PDU 解析'};
}

function gxReadHeader(bytes, off){
  var dst=gxBytesToHex(bytes.subarray(off,off+6),':');
  var src=gxBytesToHex(bytes.subarray(off+6,off+12),':');
  var vlan=null, etOff=off+12;
  if(bytes[off+12]===0x81 && bytes[off+13]===0x00){
    var tci=gxReadInt(bytes,off+14,2,false);
    vlan={pri:(tci>>13)&0x7, cfi:(tci>>12)&0x1, vid:tci&0x0FFF};
    etOff=off+16;
  }
  var ethertype=gxBytesToHex(bytes[etOff],2)+gxBytesToHex(bytes[etOff+1],2);
  var appid=gxReadInt(bytes,etOff+2,2,false);
  var length=gxReadInt(bytes,etOff+4,2,false);
  var res1=gxReadInt(bytes,etOff+6,2,false);
  var res2=gxReadInt(bytes,etOff+8,2,false);
  return {dst:dst, src:src, vlan:vlan, ethertype:ethertype, appid:appid, length:length, res1:res1, res2:res2};
}

function buildFromEthertype(bytes, et){
  var hdr=gxReadHeader(bytes,0);
  var pduStart=et+2+8; // ethertype 2 + 8 字节头
  return {pduStart:pduStart, pduLen:bytes.length-pduStart, header:hdr, note:'以太网帧（EtherType 0x88B8 @ '+et+'）'};
}

/* ===================== PCAP 解析 ===================== */
// 返回以太网帧数组 [{bytes, ts}]
function gxParsePcap(buf){
  var u8=new Uint8Array(buf);
  var dv=new DataView(buf);
  var magic=gxReadInt(u8,0,4,false);
  var le, tsMul=1e6;
  if(magic===0xa1b2c3d4){ le=false; }
  else if(magic===0xd4c3b2a1){ le=true; }
  else if(magic===0xa1b23c4d){ le=false; tsMul=1e9; } // nanosecond
  else if(magic===0x4d3cb2a1){ le=true; tsMul=1e9; }
  else { throw new Error('不是有效的 classic PCAP（magic=0x'+gxToHex(magic,8)+'）'); }
  var read32=le?function(o){return dv.getUint32(o,true);}:function(o){return dv.getUint32(o,false);};
  var linkType=read32(20);
  if(linkType!==1 && linkType!==0 && linkType!==113){ /* 1=Ethernet, 0=NULL, 113=Linux cooked */ }
  var p=24, frames=[];
  while(p+16<=buf.byteLength){
    var tsSec=read32(p), tsUsec=read32(p+4), incl=read32(p+8), orig=read32(p+12);
    p+=16;
    if(p+incl>buf.byteLength) break;
    var fb=new Uint8Array(buf, p, incl);
    frames.push({bytes:fb, ts:tsSec+tsUsec/tsMul});
    p+=incl;
  }
  return frames;
}

// PCAPNG 解析（SHB/IDB/EPB）
function gxParsePcapNg(buf){
  var u8=new Uint8Array(buf);
  var dv=new DataView(buf);
  // 检查 SHB magic
  if(!(u8[0]===0x0a && u8[1]===0x0d && u8[2]===0x0d && u8[3]===0x0a)){
    throw new Error('不是 PCAPNG（缺少 SHB magic）');
  }
  // 通过 SHB 字节序魔数确定序
  var bom=gxReadInt(u8,8,4,false); // 应为 0x1A2B3C4D
  var le = (bom===0x4d3cb2a1)?true:(bom===0x1a2b3c4d?false:false);
  var read32=le?function(o){return dv.getUint32(o,true);}:function(o){return dv.getUint32(o,false);};
  var p=0, frames=[], linkType=1;
  while(p+8<=buf.byteLength){
    var type=read32(p), total=read32(p+4);
    if(total<12 || p+total>buf.byteLength+1) break;
    if(type===0x0A0D0D0A){ /* SHB */ }
    else if(type===1){ /* IDB */
      linkType=(dv.getUint16? (le?dv.getUint16(p+8,true):dv.getUint16(p+8,false)) : read32(p+8)&0xffff);
    }
    else if(type===6){ /* EPB */
      var capLen=read32(p+20), origLen=read32(p+24);
      var dataOff=p+28;
      // 选项区在 data 之后，但 capLen 直接给出数据长度
      if(dataOff+capLen<=buf.byteLength){
        var fb=new Uint8Array(buf, dataOff, capLen);
        frames.push({bytes:fb, ts:0});
      }
    }
    p+=total;
  }
  return frames;
}

function gxExtractGooseFrames(frames){
  // 从以太网帧中过滤出 GOOSE（EtherType 0x88B8）并解析
  var out=[];
  frames.forEach(function(fr, i){
    var b=fr.bytes;
    var et=-1;
    for(var j=0;j<b.length-1;j++){ if(b[j]===0x88 && b[j+1]===0xB8){ et=j; break; } }
    if(et<0) return;
    try{
      var ext=buildFromEthertype(b, et);
      var pdu=Array.prototype.slice.call(b.subarray(ext.pduStart, ext.pduStart+ext.pduLen));
      var parsed=gxParseGoosePdu(pdu, ext.pduLen);
      parsed.frameIndex=i; parsed.ts=(fr.ts||0); parsed.header=ext.header; parsed.note=ext.note;
      out.push(parsed);
    }catch(e){ /* 跳过无法解析的帧 */ }
  });
  return out;
}

/* ===================== SCL (SCD/ICD/CID) 解析 ===================== */
// 正则提取属性
function gxAttr(str, name){
  var m=str.match(new RegExp(name+'\\s*=\\s*["\']([^"\']*)["\']','i'));
  return m?m[1]:'';
}
function gxParseScl(text){
  var datasets={};   // name(归一化) -> {name, fcda:[{ldInst,lnClass,lnInst,doName,daName,fc,prefix,desc}]}
  var gseControls=[]; // {name, appID, datSet, iedName, ldInst, lnClass, lnInst}
  var iedName='';
  // IED 名称
  var iedm=text.match(/<IED\b[^>]*\bname\s*=\s*["']([^"\']*)["']/i);
  if(iedm) iedName=iedm[1];

  // GSEControl
  var gseRe=/<GSEControl\b[^>]*>/gi, mm;
  while((mm=gseRe.exec(text))){
    var tag=mm[0];
    var gc={
      name:gxAttr(tag,'name'), appID:gxAttr(tag,'appID'), datSet:gxAttr(tag,'datSet'),
      iedName:iedName, ldInst:gxAttr(tag,'ldInst'), lnClass:gxAttr(tag,'lnClass'), lnInst:gxAttr(tag,'lnInst')
    };
    gseControls.push(gc);
  }

  // DataSet + FCDA
  var dsRe=/<DataSet\b[^>]*>([\s\S]*?)<\/DataSet>/gi;
  while((mm=dsRe.exec(text))){
    var dsTag=mm[0].match(/<DataSet\b[^>]*>/i)[0];
    var dsName=gxAttr(dsTag,'name');
    var dsDesc=gxAttr(dsTag,'desc');
    var body=mm[1];
    var fcda=[];
    var fcdaRe=/<FCDA\b[^>]*\/?>/gi, fm;
    while((fm=fcdaRe.exec(body))){
      var ft=fm[0];
      fcda.push({
        ldInst:gxAttr(ft,'ldInst'), prefix:gxAttr(ft,'prefix'), lnClass:gxAttr(ft,'lnClass'),
        lnInst:gxAttr(ft,'lnInst'), doName:gxAttr(ft,'doName'), daName:gxAttr(ft,'daName'),
        fc:gxAttr(ft,'fc'), desc:gxAttr(ft,'desc')
      });
    }
    var key=gxNormDsName(dsName);
    datasets[key]={name:dsName, desc:dsDesc, fcda:fcda};
  }
  return {iedName:iedName, datasets:datasets, gseControls:gseControls};
}

function gxNormDsName(n){
  if(!n) return '';
  n=String(n);
  if(n.indexOf('$')>=0) n=n.split('$').pop();
  if(n.indexOf('/')>=0) n=n.split('/').pop();
  return n.trim();
}

// 根据解析出的 GOOSE 报文匹配 SCL 语义
function gxMatchDataset(msg, scl){
  if(!scl) return null;
  var fields=msg.fields||{};
  var goID=fields.goID||'';
  var appid=(msg.header&&msg.header.appid)!=null?msg.header.appid:undefined;
  var msgDsName=gxNormDsName(fields.datSet||'');
  // 找 GSEControl
  var gc=null;
  for(var i=0;i<scl.gseControls.length;i++){
    var g=scl.gseControls[i];
    if(goID && g.name && g.name===goID){ gc=g; break; }
    if(appid!=null && g.appID && String(g.appID)===String(appid)){ gc=g; break; }
    if(msgDsName && g.datSet && gxNormDsName(g.datSet)===msgDsName){ gc=g; break; }
  }
  if(!gc) return null;
  var dsName=gxNormDsName(gc.datSet);
  var ds=scl.datasets[dsName];
  if(!ds) return null;
  return {gseControl:gc, dataset:ds};
}

// 生成 FCDA 可读路径
function gxFcdaPath(fcda, iedName){
  var parts=[];
  if(iedName) parts.push(iedName);
  var ld=fcda.ldInst||'';
  var ln=fcda.lnClass||'';
  if(fcda.prefix) ln=fcda.prefix+ln;
  if(fcda.lnInst) ln=ln+fcda.lnInst;
  var head=(ld?(ld+'/'):'')+(ln||'');
  if(head) parts.push(head);
  var path=parts.join('') ? parts.join('') : '';
  var tail='';
  if(fcda.doName) tail+=fcda.doName;
  if(fcda.daName) tail+='.'+fcda.daName;
  var full=(path?path+'.':'')+tail;
  return {path:path, da:(fcda.doName||'')+(fcda.daName?'.'+fcda.daName:''), fc:fcda.fc, desc:fcda.desc, full:full};
}

/* ===================== 样本构造（示例 / 测试用） ===================== */
function gxTlv(tag, val){ return [tag].concat(gxLenBytes(val.length), val); }
function gxLenBytes(n){ if(n<128) return [n]; var a=[]; while(n>0){a.unshift(n&0xff);n=Math.floor(n/256);} return [0x80|a.length].concat(a); }
function gxUtf8(s){ return Array.from(s).map(function(c){return c.charCodeAt(0);}); }
function gxLd(val){ var a=[]; if(val===0)a=[0]; while(val>0){a.unshift(val&0xff);val=Math.floor(val/256);} if(a.length===0)a=[0]; return a; }

function gxBuildSamplePdu(){
  var gocbRef=gxTlv(0x80, gxUtf8("IED1LD0/LLN0.gocb0"));
  var ttl=gxTlv(0x81, gxLd(1000));
  var datSet=gxTlv(0x82, gxUtf8("LD0/LLN0$Ind01"));
  var goID=gxTlv(0x83, gxUtf8("gocb0"));
  var t8=[0x00,0x00,0x01,0x7a,0x2e,0x3c,0x00,0x00];
  var tnode=[0x84,0x08].concat(t8);
  var stNum=gxTlv(0x85,[1]);
  var sqNum=gxTlv(0x86,[0]);
  var sim=[0x87,0x01,0x00];
  var confRev=gxTlv(0x88,[1]);
  var ndsCom=[0x89,0x01,0x00];
  var num=gxTlv(0x8a,[3]);
  // Data[0] BOOLEAN true
  var d0val=[0xA0].concat(gxLenBytes(3),[0x01,0x01,0x01]);
  var d0=[0x30].concat(gxLenBytes(d0val.length),d0val);
  // Data[1] INTEGER 10
  var d1val=[0xA0].concat(gxLenBytes(3),[0x02,0x01,0x0A]);
  var d1=[0x30].concat(gxLenBytes(d1val.length),d1val);
  // Data[2] BIT STRING 0x1B
  var d2val=[0xA0].concat(gxLenBytes(4),[0x03,0x02,0x00,0x1B]);
  var d2=[0x30].concat(gxLenBytes(d2val.length),d2val);
  var ds=d0.concat(d1,d2);
  var dsTlv=[0xAB].concat(gxLenBytes(ds.length),ds);
  var pdu=gocbRef.concat(ttl,datSet,goID,tnode,stNum,sqNum,sim,confRev,ndsCom,num,dsTlv);
  var pduTlv=[0x61].concat(gxLenBytes(pdu.length),pdu);
  return pduTlv;
}
function gxBuildSampleFrame(){
  var dst=[0x01,0x0C,0xCD,0x01,0x00,0x01];
  var src=[0x00,0x11,0x22,0x33,0x44,0x55];
  var eth=[0x88,0xB8];
  var pdu=gxBuildSamplePdu();
  var appid=[0x00,0x01];
  var L=8+pdu.length; var len=[(L>>8)&0xff, L&0xff]; // GOOSE 头部 Length 固定 2 字节
  var res=[0x00,0x00,0x00,0x00];
  var frame=dst.concat(src,eth,appid,len,res,pdu);
  return frame;
}
function gxBuildSamplePcap(){
  // classic pcap, big-endian magic (0xa1b2c3d4)
  function w32(v){ return [(v>>>24)&0xff,(v>>>16)&0xff,(v>>>8)&0xff,v&0xff]; }
  var frame=gxBuildSampleFrame();
  var gh=[0xa1,0xb2,0xc3,0xd4, 0x00,0x02, 0x00,0x04, 0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00, 0xff,0xff,0x00,0x00, 0x01,0x00,0x00,0x00];
  var rec=w32(102).concat(w32(0), w32(frame.length), w32(frame.length));
  return gh.concat(rec, frame);
}
function gxBuildSampleScl(){
  return '<?xml version="1.0"?>\n'+
  '<SCL xmlns="http://www.iec.ch/61850/2003/SCL">\n'+
  ' <IED name="IED1">\n'+
  '  <AccessPoint name="S1">\n'+
  '   <Server>\n'+
  '    <LDevice inst="LD0">\n'+
  '     <LN0 lnClass="LLN0" lnType="LLN0" inst="">\n'+
  '      <DataSet name="Ind01" desc="GOOSE 数据集示例">\n'+
  '       <FCDA ldInst="LD0" lnClass="LLN0" doName="Beh" daName="stVal" fc="ST"/>\n'+
  '       <FCDA ldInst="LD0" lnClass="LLN0" doName="Mod" daName="stVal" fc="ST"/>\n'+
  '       <FCDA ldInst="LD0" lnClass="LLN0" doName="Health" daName="stVal" fc="ST"/>\n'+
  '      </DataSet>\n'+
  '      <GSEControl name="gocb0" appID="0x0001" datSet="Ind01"/>\n'+
  '     </LN0>\n'+
  '    </LDevice>\n'+
  '   </Server>\n'+
  '  </AccessPoint>\n'+
  ' </IED>\n'+
  '</SCL>';
}

/* ===================== CID 生成 (IEC 61850-6) ===================== */
function gxEscapeXml(s){
  return String(s==null?'':s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c];
  });
}
function gxPad3(n){ n=+n||0; var s=String(n); while(s.length<3)s='0'+s; return s; }
function gxMacToBytes(s){
  if(Array.isArray(s)) return s.map(function(x){return x&0xff;});
  var m=String(s).match(/[0-9A-Fa-f]{2}/g);
  if(!m || m.length<6) return [1,12,205,1,0,1];
  return m.slice(0,6).map(function(x){return parseInt(x,16);});
}
function gxNowUtc8(){
  var sec=Math.floor(Date.now()/1000);
  return [(sec>>>24)&0xff,(sec>>>16)&0xff,(sec>>>8)&0xff,sec&0xff, 0,0,0, 0x0A];
}
// 生成一个 IEC 61850-6 CID 配置文件（字符串）
function gxBuildCid(cfg){
  cfg=cfg||{};
  var ied=cfg.ied||'IED1', ap=cfg.ap||'S1', ld=cfg.ld||'LD0', gse=cfg.gse||'gocb0';
  var appId=(cfg.appId||'0001').replace(/0x/gi,''); // 仅十六进制串
  var mac=gxMacToBytes(cfg.mac); mac=mac.map(function(x){return gxToHex(x,2);}).join('-').toUpperCase();
  var nl='\n';
  var s='';
  s+='<?xml version="1.0" encoding="UTF-8"?>'+nl;
  s+='<SCL xmlns="http://www.iec.ch/61850/2003/SCL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.iec.ch/61850/2003/SCL SCL.xsd">'+nl;
  s+='  <Header id="'+gxEscapeXml(ied)+'" toolID="SparK-GOOSE" version="1.0" revision="1"/>'+nl;
  s+='  <Communication>'+nl;
  s+='    <SubNetwork name="'+gxEscapeXml(ap)+'" type="8-MMS">'+nl;
  s+='      <ConnectedAccessPoint iedName="'+gxEscapeXml(ied)+'" apName="'+gxEscapeXml(ap)+'">'+nl;
  s+='        <GSE ldInst="'+gxEscapeXml(ld)+'" apName="'+gxEscapeXml(ap)+'" cbName="'+gxEscapeXml(gse)+'">'+nl;
  s+='          <Address>'+nl;
  s+='            <P type="MAC-Address">'+gxEscapeXml(mac)+'</P>'+nl;
  s+='            <P type="APPID">'+gxEscapeXml(appId)+'</P>'+nl;
  s+='            <P type="VLAN-ID">'+gxEscapeXml(gxPad3(cfg.vlanId||0))+'</P>'+nl;
  s+='            <P type="VLAN-PRIORITY">'+gxEscapeXml(String(cfg.vlanPri!=null?cfg.vlanPri:4))+'</P>'+nl;
  s+='          </Address>'+nl;
  s+='        </GSE>'+nl;
  s+='      </ConnectedAccessPoint>'+nl;
  s+='    </SubNetwork>'+nl;
  s+='  </Communication>'+nl;
  s+='  <IED name="'+gxEscapeXml(ied)+'" type="'+gxEscapeXml(ied)+'" manufacturer="'+gxEscapeXml(cfg.mfr||'SparK')+'">'+nl;
  s+='    <AccessPoint name="'+gxEscapeXml(ap)+'">'+nl;
  s+='      <Server>'+nl;
  s+='        <LDevice inst="'+gxEscapeXml(ld)+'">'+nl;
  s+='          <LN0 lnClass="LLN0" lnType="'+gxEscapeXml(ied)+'_LLN0" inst="">'+nl;
  s+='            <DataSet name="'+gxEscapeXml(cfg.dsName||'Ind01')+'" desc="'+gxEscapeXml(cfg.dsDesc||'GOOSE 数据集')+'">'+nl;
  (cfg.dsEntries||[]).forEach(function(e){
    var attrs='';
    attrs+=' ldInst="'+gxEscapeXml(e.ldInst||ld)+'"';
    attrs+=' lnClass="'+gxEscapeXml(e.lnClass||'LLN0')+'"';
    if(e.lnInst) attrs+=' lnInst="'+gxEscapeXml(e.lnInst)+'"';
    if(e.prefix) attrs+=' prefix="'+gxEscapeXml(e.prefix)+'"';
    attrs+=' doName="'+gxEscapeXml(e.doName||'')+'"';
    if(e.daName) attrs+=' daName="'+gxEscapeXml(e.daName)+'"';
    attrs+=' fc="'+gxEscapeXml(e.fc||'ST')+'"';
    if(e.desc) attrs+=' desc="'+gxEscapeXml(e.desc)+'"';
    s+='              <FCDA'+attrs+'/>'+nl;
  });
  s+='            </DataSet>'+nl;
  s+='            <GSEControl name="'+gxEscapeXml(gse)+'" appID="0x'+gxEscapeXml(appId)+'" datSet="'+gxEscapeXml(cfg.dsName||'Ind01')+'" confRev="'+(cfg.confRev||1)+'" type="GOOSE" fixedOffs="false"/>'+nl;
  s+='          </LN0>'+nl;
  s+='        </LDevice>'+nl;
  s+='      </Server>'+nl;
  s+='    </AccessPoint>'+nl;
  s+='  </IED>'+nl;
  s+='</SCL>'+nl;
  return s;
}

/* ===================== 生成 GOOSE 示例报文 ===================== */
function gxIntBytes(n){
  n=Math.trunc(+n||0);
  if(n>=-128 && n<=255) return [n&0xff];
  // 2 字节补码
  var v=((n<<16)>>16)&0xffff; return [(v>>>8)&0xff, v&0xff];
}
function gxBuildDataElement(v){
  var inner;
  v=v||{}; var t=v.type||'BOOL';
  if(t==='BOOL') inner=[0x01,0x01,(v.value?1:0)];
  else if(t==='INT') inner=[0x02,0x01,(Math.trunc(+v.value||0)&0xff)];
  else if(t==='BIT') inner=[0x03,0x02,0x00,((v.value|0)&0xff)];
  else inner=[0x05]; // NULL（不支持的类型按空值处理）
  var aval=[0xA0].concat(gxLenBytes(inner.length), inner);
  return [0x30].concat(gxLenBytes(aval.length), aval);
}
function gxBuildGooseFrameFromCfg(cfg, values){
  cfg=cfg||{}; values=values||[];
  var gocbRef=gxTlv(0x80, gxUtf8(cfg.gocbRef||'IED1LD0/LLN0.gocb0'));
  var ttl=gxTlv(0x81, gxLd(cfg.ttl!=null?cfg.ttl:1000));
  var datSet=gxTlv(0x82, gxUtf8(cfg.datSet||'LD0/LLN0$Ind01'));
  var goID=gxTlv(0x83, gxUtf8(cfg.goID||'gocb0'));
  var t8=gxNowUtc8();
  var tnode=[0x84,0x08].concat(t8);
  var stNum=gxTlv(0x85,[1]);
  var sqNum=gxTlv(0x86,[0]);
  var sim=[0x87,0x01,(cfg.sim?1:0)];
  var confRev=gxTlv(0x88, gxLd(cfg.confRev||1));
  var ndsCom=[0x89,0x01,(cfg.ndsCom?1:0)];
  var num=gxTlv(0x8a,[values.length]);
  var ds=[];
  values.forEach(function(v){ ds=ds.concat(gxBuildDataElement(v)); });
  var dsTlv=[0xAB].concat(gxLenBytes(ds.length), ds);
  var pdu=gocbRef.concat(ttl,datSet,goID,tnode,stNum,sqNum,sim,confRev,ndsCom,num,dsTlv);
  var pduTlv=[0x61].concat(gxLenBytes(pdu.length), pdu);
  var dst=gxMacToBytes(cfg.mac||'01-0C-CD-01-00-01');
  var src=gxMacToBytes(cfg.srcMac||'00-11-22-33-44-55');
  var eth=[0x88,0xB8];
  var appidRaw=parseInt(String(cfg.appId||'0001').replace(/0x/gi,''),16)||1;
  var appid=[(appidRaw>>8)&0xff, appidRaw&0xff];
  var L=8+pduTlv.length; var len=[(L>>8)&0xff, L&0xff];
  var res=[0x00,0x00,0x00,0x00];
  return dst.concat(src,eth,appid,len,res,pduTlv);
}

/* ===================== 导出（Node 测试用） ===================== */
if(typeof module!=='undefined' && module.exports){
  module.exports={
    gxHexToBytes:gxHexToBytes, gxBytesToHex:gxBytesToHex,
    gxBerDecode:gxBerDecode, gxDecodeValue:gxDecodeValue,
    gxParseGoosePdu:gxParseGoosePdu, gxExtractGoose:gxExtractGoose,
    gxParsePcap:gxParsePcap, gxParsePcapNg:gxParsePcapNg, gxExtractGooseFrames:gxExtractGooseFrames,
    gxParseScl:gxParseScl, gxMatchDataset:gxMatchDataset, gxFcdaPath:gxFcdaPath,
    gxBuildSampleFrame:gxBuildSampleFrame, gxBuildSamplePcap:gxBuildSamplePcap, gxBuildSampleScl:gxBuildSampleScl, gxBuildSamplePdu:gxBuildSamplePdu,
    gxBuildCid:gxBuildCid, gxBuildGooseFrameFromCfg:gxBuildGooseFrameFromCfg, gxMacToBytes:gxMacToBytes
  };
}

/* ===================== 浏览器 UI ===================== */
if(typeof document!=='undefined'){
  var GOO={frames:[], scl:null, current:0, mode:'hex'};

  function gx$(id){ return document.getElementById(id); }
  function gxEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function gooseTab(m){
    GOO.mode=m;
    document.querySelectorAll('#g-tabs .tab').forEach(function(t){
      t.classList.toggle('on', t.getAttribute('data-m')===m);
    });
    gx$('g-hex-wrap').style.display = (m==='hex')?'':'none';
    gx$('g-pcap-wrap').style.display = (m==='pcap')?'':'none';
  }

  function gooseSample(){
    var f=gxBuildSampleFrame();
    gx$('g-hex').value = gxBytesToHex(f, ' ');
    gx$('g-hexmode').value='auto';
    gx$('g-info').textContent='已填入示例报文（IED1 → LLN0.gocb0，3 个数据集条目：BOOL/INT/BITSTRING）。';
  }

  function gooseReadFile(file, asText){
    return new Promise(function(res,rej){
      if(!file){ rej(new Error('未选择文件')); return; }
      var rd=new FileReader();
      rd.onload=function(){ res(rd.result); };
      rd.onerror=function(){ rej(rd.error||new Error('读取失败')); };
      if(asText) rd.readAsText(file); else rd.readAsArrayBuffer(file);
    });
  }

  function gooseLoadPcap(){
    var f=gx$('g-pcap').files[0];
    if(!f){ gx$('g-info').textContent='请先选择 .pcap / .pcapng 文件。'; return; }
    gx$('g-info').textContent='正在解析抓包文件…';
    gooseReadFile(f,false).then(function(buf){
      var frames;
      try{ frames=gxParsePcap(buf); }
      catch(e1){
        try{ frames=gxParsePcapNg(buf); }
        catch(e2){ throw new Error('抓包解析失败：既不是 classic pcap 也不是 pcapng。'); }
      }
      var msgs=gxExtractGooseFrames(frames);
      if(!msgs.length){ gx$('g-info').textContent='未在抓包中找到 GOOSE 帧（EtherType 0x88B8）。'; gx$('g-rst').innerHTML='<div class="rst-empty">无 GOOSE 帧</div>'; return; }
      GOO.frames=msgs; GOO.current=0;
      gx$('g-info').textContent='从抓包解析出 '+msgs.length+' 个 GOOSE 帧。';
      gooseRender();
    }).catch(function(e){ gx$('g-info').textContent='解析失败：'+(e&&e.message?e.message:e); });
  }

  function gooseLoadScl(){
    var f=gx$('g-scl').files[0];
    if(!f){ gx$('g-info').textContent='请选择 SCD/ICD/CID 文件。'; return; }
    gooseReadFile(f,true).then(function(txt){
      var scl=gxParseScl(txt);
      GOO.scl=scl;
      gx$('g-info').textContent='已加载 SCL：IED='+scl.iedName+'，数据集 '+Object.keys(scl.datasets).length+' 个，GSEControl '+scl.gseControls.length+' 个。';
      if(GOO.frames.length) gooseRender();
    }).catch(function(e){ gx$('g-info').textContent='SCL 解析失败：'+(e&&e.message?e.message:e); });
  }

  function gooseParseHex(){
    if(GOO.mode==='pcap'){ gooseLoadPcap(); return; }
    var hex=gx$('g-hex').value;
    var bytes=gxHexToBytes(hex);
    if(!bytes || !bytes.length){ gx$('g-rst').innerHTML='<div class="err">请输入十六进制报文。</div>'; return; }
    var mode=gx$('g-hexmode').value;
    try{
      var ext=gxExtractGoose(bytes, mode);
      var pdu=Array.prototype.slice.call(bytes.subarray(ext.pduStart, ext.pduStart+ext.pduLen));
      var parsed=gxParseGoosePdu(pdu, ext.pduLen);
      parsed.header=ext.header; parsed.note=ext.note; parsed.frameIndex=0; parsed.ts=0;
      GOO.frames=[parsed]; GOO.current=0;
      gx$('g-info').textContent='十六进制解析完成。';
      gooseRender();
    }catch(e){ gx$('g-rst').innerHTML='<div class="err">解析失败：'+(e&&e.message?e.message:e)+'</div>'; }
  }

  function gooseRender(){
    if(!GOO.frames.length){ gx$('g-rst').innerHTML='<div class="rst-empty">暂无数据</div>'; return; }
    // 多帧选择器
    var selHtml='';
    if(GOO.frames.length>1){
      selHtml='<div class="g-frame-sel">帧：'+GOO.frames.map(function(f,i){
        var g=f.fields||{};
        return '<button class="g-fbtn'+(i===GOO.current?' on':'')+'" onclick="gooseSelectFrame('+i+')">#'+(i+1)+
          (g.goID?(' '+g.goID):'')+(g.stNum!=null?(' S'+g.stNum):'')+'</button>';
      }).join('')+'</div>';
    }
    var f=GOO.frames[GOO.current];
    var fields=f.fields||{};
    var match=null;
    if(GOO.scl) match=gxMatchDataset(f, GOO.scl);

    var out='';
    // 帧头
    if(f.header){
      out+='<div class="card-title" style="margin:6px 0 4px">以太网帧头</div>';
      out+='<div class="res-box">';
      out+=gResRow('目的 MAC', f.header.dst);
      out+=gResRow('源 MAC', f.header.src);
      if(f.header.vlan) out+=gResRow('VLAN', 'PRI='+f.header.vlan.pri+' CFI='+f.header.vlan.cfi+' ID='+f.header.vlan.vid);
      out+=gResRow('EtherType', '0x'+f.header.ethertype+' (GOOSE)');
      out+=gResRow('APPID', '0x'+gxToHex(f.header.appid,4));
      out+=gResRow('Length', f.header.length);
      out+=gResRow('Reserved', f.header.res1+' / '+f.header.res2);
      out+='</div>';
    }
    // PDU 字段
    out+='<div class="card-title" style="margin:10px 0 4px">GOOSE PDU 字段</div>';
    out+='<div class="tbl-scroll"><table class="tbl"><thead><tr><th>字段</th><th>值</th></tr></thead><tbody>';
    var fieldRows=[
      ['gocbRef', fields.gocbRef],
      ['datSet', fields.datSet],
      ['goID', fields.goID],
      ['StNum', fields.stNum],
      ['SqNum', fields.sqNum],
      ['ConfRev', fields.confRev],
      ['TimeAllowedToLive', fields.timeAllowedToLive!=null?(fields.timeAllowedToLive+' ms'):''],
      ['t (UTC)', fields.t?((fields.t.iso||'')+(fields.t.fracMs?('.'+fields.t.fracMs):'')+'  ['+fields.t.qdesc+']'):''],
      ['simulation', fields.simulation],
      ['ndsCom', fields.ndsCom],
      ['numDatSetEntries', fields.numDatSetEntries]
    ];
    fieldRows.forEach(function(r){
      if(r[1]===undefined||r[1]===''||r[1]===null) return;
      out+='<tr><td>'+gxEsc(r[0])+'</td><td>'+gxEsc(r[1])+'</td></tr>';
    });
    out+='</tbody></table></div>';

    // Dataset 条目
    out+='<div class="card-title" style="margin:10px 0 4px">数据集（Dataset）· '+f.entries.length+' 项'+
         (match?' <span class="g-ok">已匹配 SCL：'+(match.gseControl.name||'')+'</span>':' <span class="g-warn">未匹配 SCL（仅结构解析）</span>')+'</div>';
    out+='<div class="tbl-scroll"><table class="tbl"><thead><tr><th>#</th>'+(match?'<th>SCL 路径</th><th>FC</th>':'')+'<th>类型</th><th>值</th><th>原始字节</th></tr></thead><tbody>';
    f.entries.forEach(function(en, i){
      var valTxt='', typ='';
      if(en.value){ typ=en.value.type; valTxt=gxValText(en.value); }
      var pathCell='';
      if(match){
        var fcda=match.dataset.fcda[i];
        if(fcda){ var p=gxFcdaPath(fcda, GOO.scl.iedName);
          pathCell='<td title="'+gxEsc(p.full)+'">'+gxEsc(p.da||'-')+'</td><td>'+(fcda.fc||'-')+'</td>';
        } else { pathCell='<td>-</td><td>-</td>'; }
      }
      out+='<tr><td>'+(i+1)+'</td>'+pathCell+'<td>'+gxEsc(typ)+'</td><td>'+gxEsc(valTxt)+'</td><td class="mono">'+gxEsc(en.rawHex||'')+'</td></tr>';
    });
    out+='</tbody></table></div>';
    if(match && match.dataset.desc){ out+='<div class="hint" style="margin-top:6px">数据集说明：'+gxEsc(match.dataset.desc)+'</div>'; }

    gx$('g-rst').innerHTML=selHtml+out;
  }

  function gxValText(v){
    if(v==null) return '';
    if(v.type==='BIT STRING'){
      if(v.bits && v.bits.length){
        return v.value+'  ['+v.bits.join('')+' ]';
      }
      return v.value;
    }
    if(v.type==='SEQUENCE'){
      return '('+(v.members?v.members.length:0)+' 成员)';
    }
    if(typeof v.value==='boolean') return v.value?'TRUE':'FALSE';
    return String(v.value);
  }
  function gResRow(k,v){ return '<div class="res-row"><span class="k">'+gxEsc(k)+'</span><span class="v">'+gxEsc(v)+'</span></div>'; }

  function gooseSelectFrame(i){ GOO.current=i; gooseRender(); }

  function gooseClear(){
    GOO.frames=[]; GOO.current=0;
    gx$('g-rst').innerHTML='<div class="rst-empty">等待输入</div>';
    gx$('g-info').textContent='已清空。';
  }

  function gooseExport(){
    if(!GOO.frames.length){ return; }
    var data={exported:'SparK GOOSE', count:GOO.frames.length, frames:GOO.frames.map(function(f){
      var o={index:f.frameIndex, header:f.header, fields:f.fields, entries:(f.entries||[]).map(function(e){
        return {idx:e.idx, value:e.value, quality:e.quality, timeStamp:e.timeStamp};
      })};
      if(GOO.scl){ var m=gxMatchDataset(f,GOO.scl); if(m) o.scl={gse:m.gseControl.name, dataset:m.dataset.name, fcda:m.dataset.fcda}; }
      return o;
    })};
    var txt=JSON.stringify(data,null,2);
    var blob=new Blob([txt],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a'); a.href=url; a.download='SparK_GOOSE_'+Date.now()+'.json'; a.click();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }

  function gooseCopy(){
    if(!GOO.frames.length){ gx$('g-info').textContent='没有可复制的内容。'; return; }
    var txt=gx$('g-rst').innerText;
    function done(){ if(window.toast)toast('已复制'); else gx$('g-info').textContent='已复制到剪贴板。'; }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(done, function(){ gxFallbackCopy(txt); });
    } else { gxFallbackCopy(txt); }
  }
  function gxFallbackCopy(txt){
    try{
      var ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      var ok=document.execCommand && document.execCommand('copy');
      document.body.removeChild(ta);
      gx$('g-info').textContent= ok?'已复制到剪贴板。':'复制失败，请手动选择。';
    }catch(e){ gx$('g-info').textContent='复制失败，请手动选择文本。'; }
  }

  /* ---------- CID / 示例报文 生成 UI ---------- */
  function gooseMainTab(m){
    GOO.main=m;
    document.querySelectorAll('#g-maintabs .tab').forEach(function(t){
      t.classList.toggle('on', t.getAttribute('data-m')===m);
    });
    var show=function(id,on){ var el=gx$(id); if(el) el.style.display=on?'':'none'; };
    show('g-parse-wrap', m==='parse');
    show('g-cid-wrap', m==='cid');
    show('g-help-wrap', m==='help');
  }

  function gooseCidAddRow(d){
    d=d||{};
    var tr=document.createElement('tr');
    function cell(html){ var td=document.createElement('td'); td.innerHTML=html; return td; }
    tr.appendChild(cell('<input class="g-cid-i" data-k="lnClass" value="'+gxEsc(d.lnClass||'LLN0')+'" style="width:62px">'));
    tr.appendChild(cell('<input class="g-cid-i" data-k="lnInst" value="'+gxEsc(d.lnInst||'')+'" style="width:38px">'));
    tr.appendChild(cell('<input class="g-cid-i" data-k="prefix" value="'+gxEsc(d.prefix||'')+'" style="width:38px">'));
    tr.appendChild(cell('<input class="g-cid-i" data-k="doName" value="'+gxEsc(d.doName||'')+'" style="width:62px">'));
    tr.appendChild(cell('<input class="g-cid-i" data-k="daName" value="'+gxEsc(d.daName||'stVal')+'" style="width:54px">'));
    tr.appendChild(cell('<select class="g-cid-i" data-k="fc"><option'+(d.fc==='ST'?' selected':'')+'>ST</option><option'+(d.fc==='MX'?' selected':'')+'>MX</option><option'+(d.fc==='CF'?' selected':'')+'>CF</option><option'+(d.fc==='DC'?' selected':'')+'>DC</option></select>'));
    tr.appendChild(cell('<select class="g-cid-i" data-k="vtype"><option'+(d.vtype==='BOOL'?' selected':'')+'>BOOL</option><option'+(d.vtype==='INT'?' selected':'')+'>INT</option><option'+(d.vtype==='BIT'?' selected':'')+'>BIT</option></select>'));
    tr.appendChild(cell('<input class="g-cid-i" data-k="value" value="'+gxEsc(d.value!=null?d.value:'0')+'" style="width:48px">'));
    tr.appendChild(cell('<input class="g-cid-i" data-k="desc" value="'+gxEsc(d.desc||'')+'" style="width:78px">'));
    var td=document.createElement('td');
    var b=document.createElement('button'); b.className='copy'; b.textContent='✕'; b.title='删除';
    b.onclick=function(){ if(tr.parentNode) tr.parentNode.removeChild(tr); };
    td.appendChild(b); tr.appendChild(td);
    gx$('g-cid-rows').appendChild(tr);
  }

  function gooseCidReadRows(){
    var rows=[];
    Array.prototype.forEach.call(gx$('g-cid-rows').querySelectorAll('tr'), function(tr){
      var o={};
      Array.prototype.forEach.call(tr.querySelectorAll('.g-cid-i'), function(inp){
        o[inp.getAttribute('data-k')]=inp.value;
      });
      rows.push(o);
    });
    return rows;
  }

  function gooseCidPrefill(){
    var f=GOO.frames[GOO.current];
    if(!f){ gx$('g-cid-info').textContent='请先在「解析报文」里解析一条 GOOSE 报文，再点此预填。'; return; }
    var fields=f.fields||{};
    var gr=fields.gocbRef||'';
    var m=gr.match(/^([A-Za-z0-9_]+?)(LD\d+)\/([A-Za-z0-9]+)\.([A-Za-z0-9]+)/);
    if(m){ gx$('g-cid-ied').value=m[1]; gx$('g-cid-ld').value=m[2]; gx$('g-cid-gse').value=m[4]; }
    if(fields.datSet){ var dm=fields.datSet.match(/([A-Za-z0-9]+)\$([A-Za-z0-9]+)/); if(dm){ gx$('g-cid-ld').value=dm[1]; gx$('g-cid-ds').value=dm[2]; } else { gx$('g-cid-ds').value=fields.datSet; } }
    if(fields.goID) gx$('g-cid-goid').value=fields.goID;
    if(fields.confRev!=null) gx$('g-cid-cr').value=fields.confRev;
    if(f.header){
      if(f.header.appid!=null) gx$('g-cid-appid').value=gxToHex(f.header.appid,4);
      if(f.header.dst) gx$('g-cid-mac').value=f.header.dst.toUpperCase();
    }
    gx$('g-cid-rows').innerHTML='';
    (f.entries||[]).forEach(function(e){
      var typ='BOOL', val='0';
      if(e.value){ typ=e.value.type==='INTEGER'?'INT':(e.value.type==='BIT STRING'?'BIT':(e.value.type==='REAL'?'REAL':'BOOL')); val=String(e.value.value); }
      gooseCidAddRow({lnClass:'LLN0', doName:'', daName:'stVal', fc:'ST', vtype:typ, value:val});
    });
    if(!(f.entries||[]).length) gooseCidAddRow();
    gooseCidGen(true);
    gx$('g-cid-info').textContent='已从当前报文预填控制块与通信参数，数据集条目请按实际点表补全。';
  }

  function gooseCidCfg(){
    return {
      ied:gx$('g-cid-ied').value, mfr:gx$('g-cid-mfr').value, ap:gx$('g-cid-ap').value,
      ld:gx$('g-cid-ld').value, gse:gx$('g-cid-gse').value, appId:gx$('g-cid-appid').value,
      mac:gx$('g-cid-mac').value, vlanId:(+gx$('g-cid-vid').value||0), vlanPri:(+gx$('g-cid-vp').value||4),
      confRev:(+gx$('g-cid-cr').value||1), goID:gx$('g-cid-goid').value, dsName:gx$('g-cid-ds').value,
      dsEntries:gooseCidReadRows()
    };
  }

  function gooseCidGen(silent){
    try{
      var cfg=gooseCidCfg();
      if(!cfg.dsEntries.length){ gx$('g-cid-info').textContent='请至少添加一个数据集(FCDA)条目。'; return; }
      var xml=gxBuildCid(cfg);
      gx$('g-cid-prv').textContent=xml;
      if(silent) return;
      var blob=new Blob([xml],{type:'application/xml'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a'); a.href=url; a.download=(cfg.ied||'IED')+'_'+(cfg.gse||'gocb0')+'.cid'; a.click();
      setTimeout(function(){URL.revokeObjectURL(url);},1000);
      gx$('g-cid-info').textContent='已生成并下载 CID：'+(cfg.ied||'IED')+'_'+(cfg.gse||'gocb0')+'.cid';
    }catch(e){ gx$('g-cid-info').textContent='生成失败：'+(e&&e.message?e.message:e); }
  }

  function gooseCidGenFrame(){
    try{
      var cfg=gooseCidCfg();
      var rows=cfg.dsEntries;
      if(!rows.length){ gx$('g-cid-info').textContent='请先添加数据集条目（含示例值）。'; return; }
      var values=rows.map(function(r){ return {type:r.vtype||'BOOL', value:r.value}; });
      var fc={ ied:cfg.ied, ld:cfg.ld, gse:cfg.gse, appId:cfg.appId, mac:cfg.mac,
               gocbRef:(cfg.ied||'IED1')+(cfg.ld||'LD0')+'/LLN0.'+(cfg.gse||'gocb0'),
               datSet:(cfg.dsName||'Ind01'), goID:cfg.goID, confRev:cfg.confRev };
      var frame=gxBuildGooseFrameFromCfg(fc, values);
      var hex=gxBytesToHex(frame,' ');
      gooseMainTab('parse');
      gx$('g-hex').value=hex;
      gx$('g-hexmode').value='auto';
      gooseParseHex();
      if(window.toast) toast('已生成 GOOSE 示例报文并解析'); else gx$('g-cid-info').textContent='已生成 GOOSE 示例报文并解析。';
    }catch(e){ gx$('g-cid-info').textContent='生成失败：'+(e&&e.message?e.message:e); }
  }

  // 初始给 CID 表加一行
  if(gx$('g-cid-rows') && !gx$('g-cid-rows').children.length) gooseCidAddRow();

  // 浏览器：导出 UI 函数
  window.gooseTab=gooseTab; window.gooseSample=gooseSample;
  window.gooseLoadPcap=gooseLoadPcap; window.gooseLoadScl=gooseLoadScl;
  window.gooseParseHex=gooseParseHex; window.gooseRender=gooseRender;
  window.gooseSelectFrame=gooseSelectFrame; window.gooseClear=gooseClear;
  window.gooseExport=gooseExport; window.gooseCopy=gooseCopy;
  window.gooseMainTab=gooseMainTab; window.gooseCidAddRow=gooseCidAddRow;
  window.gooseCidPrefill=gooseCidPrefill; window.gooseCidGen=gooseCidGen;
  window.gooseCidGenFrame=gooseCidGenFrame;
}

})();
