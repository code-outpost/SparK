/* =========================================================================
   SparK · 数字能源测试效率工具箱  app.js  (v1.0)
   全部逻辑本地运行，无网络依赖。
   ========================================================================= */
(function(){
'use strict';

/* ---------- 时钟 ---------- */
function tick(){
  var d=new Date();
  var s=[d.getHours(),d.getMinutes(),d.getSeconds()].map(function(v){return ('0'+v).slice(-2);});
  document.getElementById('clk').textContent=s[0]+':'+s[1]+':'+s[2];
}
setInterval(tick,1000);tick();

/* ---------- 侧边栏抽屉 ---------- */
function toggleSidebar(){
  var sb=document.getElementById('sidebar');
  var ov=document.getElementById('sidebarOverlay');
  var hb=document.getElementById('hamburger');
  if(!sb)return;
  var isOpen=sb.classList.toggle('on');
  if(ov)ov.classList.toggle('on',isOpen);
  if(hb)hb.classList.toggle('on',isOpen);
  document.body.style.overflow=isOpen?'hidden':'';
}
window.toggleSidebar=toggleSidebar;

/* ---------- 导航 ---------- */
function nav(el,id){
  var sb=document.getElementById('sidebar');
  var ov=document.getElementById('sidebarOverlay');
  var hb=document.getElementById('hamburger');
  if(sb)sb.classList.remove('on');
  if(ov)ov.classList.remove('on');
  if(hb)hb.classList.remove('on');
  document.body.style.overflow='';
  document.querySelectorAll('.nav-item').forEach(function(x){x.classList.remove('on')});
  el.classList.add('on');
  document.querySelectorAll('.sect').forEach(function(x){x.classList.remove('on')});
  var t=document.getElementById('s-'+id);
  if(t){t.classList.add('on');setTimeout(resizeCharts,60);}
}
window.nav=nav;

/* ---------- 清空结果 ---------- */
function rst(id){
  var r=document.getElementById(id+'-rst');
  if(r)r.innerHTML='<div class="rst-empty">点击「开始计算」查看结果</div>';
  var c=document.getElementById('c-'+id);
  if(c&&c._chart)c._chart.clear();
}
window.rst=rst;

/* ====================================================================== */
/* 简历生成器                                                            */
/* ====================================================================== */
/* ====================================================================== */
/* 简历生成器（模板化可视化编辑器：选模板→左编辑→右预览→导出）            */
/* ====================================================================== */
var TPL_NAMES={modern:'现代两栏',elegant:'优雅',creative:'创意',timeline:'时间轴',minimalist:'极简','left-right':'模块标题',swiss:'瑞士美学',classic:'经典',editorial:'西报风'};
var TPL_TWO=['modern'];
var TPL_SIDE=['basic','skills','education'];
var RESUME_STATE={tplId:null,data:null,_t:null};
var RESUME_LS='spark_resume_';
var RESUME_ICONS={
  Mail:'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  Phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  MapPin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  CalendarRange:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
  Briefcase:'<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  Globe:'<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>'
};
function rEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function rIcon(name,color){if(!RESUME_ICONS[name])return '';return '<svg class="ri" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+RESUME_ICONS[name]+'"/></svg>';}
function htmlToList(str){
  if(!str)return [];
  var m=str.match(/<li[^>]*>(.*?)<\/li>/gi);
  if(!m){
    return str.split(/\n|<br\s*\/?>/i).map(function(s){return s.replace(/<[^>]+>/g,'').trim();}).filter(Boolean);
  }
  return m.map(function(s){return s.replace(/<li[^>]*>|<\/li>/gi,'').replace(/<[^>]+>/g,'').trim();}).filter(Boolean);
}
function listToHtml(arr){
  var items=(arr||[]).map(function(s){return String(s==null?'':s).trim();}).filter(Boolean);
  return items.length?'<ul>'+items.map(function(s){return '<li>'+rEsc(s)+'</li>';}).join('')+'</ul>':'';
}
function cleanResumeData(d){
  var x=JSON.parse(JSON.stringify(d));
  delete x._skillArr;
  (x.experience||[]).forEach(function(it){delete it._detailsArr;});
  (x.projects||[]).forEach(function(it){delete it._detailsArr;});
  (x.education||[]).forEach(function(it){delete it._detailsArr;});
  return x;
}
function resumeSet(path,val){
  var d=RESUME_STATE.data,keys=path.split('.'),o=d,i;
  for(i=0;i<keys.length-1;i++){
    var k=keys[i];
    if(Array.isArray(o[k])){
      var id=keys[i+1],found=null;
      o[k].forEach(function(x){if(String(x.id)===id)found=x;});
      if(!found){found={id:id};o[k].push(found);}
      o=found;i++;
    }else{if(o[k]==null)o[k]={};o=o[k];}
  }
  o[keys[keys.length-1]]=val;
  resumeSched();
}
function rNewItem(sec){
  var id='u'+Date.now()+Math.floor(Math.random()*999);
  if(sec==='experience')return {id:id,company:'',position:'',date:'',visible:true,details:''};
  if(sec==='projects')return {id:id,name:'',role:'',date:'',description:'',visible:true};
  if(sec==='education')return {id:id,school:'',major:'',degree:'',startDate:'',endDate:'',gpa:'',description:'',visible:true};
  return {id:id};
}
function resumePick(){
  var box=document.getElementById('r-tpl-grid');if(!box)return;
  var T=window.RESUME_TEMPLATES||{},keys=Object.keys(T);
  if(!keys.length){box.innerHTML='<div class="rst-empty">未找到模板文件（jl/templates.js）</div>';return;}
  box.innerHTML=keys.map(function(id){
    var t=T[id],b=t.basic||{},tc=(t.globalSettings&&t.globalSettings.themeColor)||'#000';
    var pdf=t.pdfId||(t.id&&String(t.id).split('-')[0].slice(0,6))||'';
    var pdfEl=pdf?'<embed src="jl/'+rEsc(pdf)+'.pdf#toolbar=0&navpanes=0&scrollbar=0" type="application/pdf" class="r-tpl-pdf">':'<span style="color:'+rEsc(tc)+'">'+rEsc(b.name||'简历')+'</span>';
    return '<div class="r-tpl" onclick="resumeOpen(\''+id+'\')">'+
      '<div class="r-tpl-prev" style="background:'+rEsc(tc)+'14">'+pdfEl+'</div>'+
      '<div class="r-tpl-name">'+rEsc(TPL_NAMES[id]||id)+'</div>'+
      '<div class="r-tpl-sub">'+rEsc(b.title||'')+'</div></div>';
  }).join('');
}
function resumeOpen(id){
  var T=window.RESUME_TEMPLATES||{};if(!T[id])return;
  var saved=null;try{var raw=localStorage.getItem(RESUME_LS+id);if(raw)saved=JSON.parse(raw);}catch(e){}
  RESUME_STATE.tplId=id;
  RESUME_STATE.data=saved?saved:JSON.parse(JSON.stringify(T[id]));
  var pk=document.getElementById('r-tpl-pick'),ed=document.getElementById('r-editor');
  if(pk)pk.style.display='none';if(ed)ed.style.display='';
  var ct=document.getElementById('r-cur-tpl');if(ct)ct.textContent=TPL_NAMES[id]||id;
  resumeForm();resumePreview();
  if(typeof window!=='undefined'&&window.innerWidth<=900){var eb=document.querySelector('#r-editor .r-editor-body');if(eb){eb.classList.add('r-show-form');var mb=document.querySelectorAll('.r-mtoggle button');for(var i=0;i<mb.length;i++){mb[i].classList.toggle('on',mb[i].getAttribute('data-mode')==='form');}}}
}
function resumeBack(){
  var ed=document.getElementById('r-editor'),pk=document.getElementById('r-tpl-pick');
  if(ed)ed.style.display='none';if(pk)pk.style.display='';
  RESUME_STATE.data=null;RESUME_STATE.tplId=null;resumePick();
}
function resumeForm(){
  var d=RESUME_STATE.data;if(!d)return;var box=document.getElementById('r-form');if(!box)return;
  // Preserve in-progress editing arrays; only (re)build them from the stored
  // HTML when they don't yet exist. Rebuilding on every call used to strip the
  // empty row that "添加技能 / 添加要点" just appended (htmlToList filters blanks).
  if(!d._skillArr)d._skillArr=htmlToList(d.skillContent||'');
  (d.experience||[]).forEach(function(it){if(!it._detailsArr)it._detailsArr=htmlToList(it.details||'');});
  (d.projects||[]).forEach(function(it){if(!it._detailsArr)it._detailsArr=htmlToList(it.description||'');});
  (d.education||[]).forEach(function(it){if(!it._detailsArr)it._detailsArr=htmlToList(it.description||'');});
  var html='';
  (d.menuSections||[]).forEach(function(ms){
    if(!ms.enabled)return;
    html+='<div class="r-fsec"><div class="r-fsec-t">'+rEsc(ms.title)+'</div>';
    if(ms.id==='basic')html+=rFormBasic(d);
    else if(ms.id==='skills')html+=rFormSkills(d);
    else if(ms.id==='experience')html+=rFormList(d,'experience','公司','职位','关键职责 / 业绩','details',true);
    else if(ms.id==='projects')html+=rFormList(d,'projects','项目名','角色','项目描述','description',false);
    else if(ms.id==='education')html+=rFormList(d,'education','学校','专业','在校经历 / 主修课程','description',false);
    html+='</div>';
  });
  box.innerHTML=html;
}
function rFormSkills(d){
  var arr=d._skillArr||[],h='';
  h+='<div class="r-list" id="r-skill-list">';
  arr.forEach(function(s,i){
    h+='<div class="r-row"><input type="text" data-skill-idx="'+i+'" value="'+rEsc(s)+'" placeholder="如：熟练使用 Modbus / IEC 104 协议">';
    h+='<button class="r-x" data-action="del-skill" data-idx="'+i+'" title="删除">×</button></div>';
  });
  h+='</div>';
  h+='<button class="r-add" data-action="add-skill">+ 添加技能</button>';
  return h;
}
function rFormBasic(d){
  var b=d.basic||{},h='';
  (b.fieldOrder||[]).forEach(function(f){
    var v=b[f.key]||'';
    h+='<div class="lbl"><div class="lbl-txt">'+rEsc(f.label)+'</div><input type="text" data-bind="basic.'+rEsc(f.key)+'" value="'+rEsc(v)+'"></div>';
  });
  h+='<div class="r-sub">自定义字段</div>';
  (b.customFields||[]).forEach(function(cf){
    h+='<div class="r-cf"><input class="r-cf-l" type="text" data-bind="basic.customFields.'+rEsc(cf.id)+'.label" value="'+rEsc(cf.label)+'" placeholder="标签"><input class="r-cf-v" type="text" data-bind="basic.customFields.'+rEsc(cf.id)+'.value" value="'+rEsc(cf.value)+'" placeholder="内容"><button class="r-x" data-action="del-cf" data-id="'+rEsc(cf.id)+'" title="删除">×</button></div>';
  });
  h+='<button class="r-add" data-action="add-cf">+ 自定义字段</button>';
  h+='<label class="r-chk"><input type="checkbox" data-bind="basic.photoConfig.visible" '+(b.photoConfig&&b.photoConfig.visible?'checked':'')+'> 显示头像</label>';
  h+='<input type="file" id="r-photo" accept="image/*" class="r-photo-in" title="上传头像图片">';
  h+='<div class="r-hint" style="margin-top:2px">支持 jpg/png，图片仅存在本地浏览器，不会上传服务器。</div>';
  h+='<div class="r-sub">个人评价</div><textarea class="r-ta" data-bind="selfEvaluationContent" rows="4" placeholder="一句话概括你的优势与方向，将显示在简历中">'+(d.selfEvaluationContent||'')+'</textarea>';
  return h;
}
function rFormList(d,sec,ph1,ph2,phDetail,bindDetail,hasRole){
  var mainF=sec==='education'?'school':(sec==='projects'?'name':'company');
  var h='';
  (d[sec]||[]).forEach(function(it){
    h+='<div class="r-li">';
    h+='<div class="r-li-h"><input class="r-in1" type="text" data-bind="'+sec+'.'+rEsc(it.id)+'.'+mainF+'" value="'+rEsc(it[mainF]||'')+'" placeholder="'+ph1+'">';
    if(hasRole)h+='<input class="r-in2" type="text" data-bind="'+sec+'.'+rEsc(it.id)+'.position" value="'+rEsc(it.position||'')+'" placeholder="'+ph2+'">';
    h+='<button class="r-x" data-action="del" data-sec="'+sec+'" data-id="'+rEsc(it.id)+'" title="删除">×</button></div>';
    h+='<input class="r-in3" type="text" data-bind="'+sec+'.'+rEsc(it.id)+'.date" value="'+rEsc(it.date||'')+'" placeholder="时间，如 2021.07 - 2024.12">';
    if(sec==='education'){
      h+='<div class="r-inline"><input type="text" data-bind="'+sec+'.'+rEsc(it.id)+'.major" value="'+rEsc(it.major||'')+'" placeholder="专业"><input type="text" data-bind="'+sec+'.'+rEsc(it.id)+'.degree" value="'+rEsc(it.degree||'')+'" placeholder="学位"><input type="text" data-bind="'+sec+'.'+rEsc(it.id)+'.gpa" value="'+rEsc(it.gpa||'')+'" placeholder="GPA"></div>';
    }
    var arr=it._detailsArr||[];
    h+='<div class="r-sub">'+phDetail+'（逐条填写）</div>';
    h+='<div class="r-list">';
    arr.forEach(function(s,i){
      h+='<div class="r-row"><input type="text" data-detail-sec="'+sec+'" data-detail-id="'+rEsc(it.id)+'" data-detail-idx="'+i+'" value="'+rEsc(s)+'" placeholder="输入一条具体成果 / 职责">';
      h+='<button class="r-x" data-action="del-detail" data-sec="'+sec+'" data-id="'+rEsc(it.id)+'" data-idx="'+i+'" title="删除">×</button></div>';
    });
    h+='</div>';
    h+='<button class="r-add" data-action="add-detail" data-sec="'+sec+'" data-id="'+rEsc(it.id)+'">+ 添加要点</button>';
    h+='</div>';
  });
  h+='<button class="r-add" data-action="add-'+sec+'">+ 添加一条</button>';
  return h;
}
function resumeSched(){if(RESUME_STATE._t)clearTimeout(RESUME_STATE._t);RESUME_STATE._t=setTimeout(function(){resumePreview();},180);}
function fitResumePreview(ifr){
  if(!ifr)return;
  var doc=ifr.contentDocument;if(!doc)return;
  var host=doc.querySelector('.r-scale'),pg=doc.querySelector('.page');
  if(!host||!pg)return;
  var design=pg.offsetWidth||0;
  if(design<10){setTimeout(function(){fitResumePreview(ifr);},120);return;}
  var avail=doc.documentElement.clientWidth||design;
  var s=Math.min(1,avail/design);
  // scale from top-left so the resume hugs the left edge and no blank gutter appears
  host.style.transformOrigin='top left';
  host.style.transform='scale('+s+')';
  host.style.width=design+'px';
  host.style.height=pg.offsetHeight+'px';
  host.style.margin='0';
  // let the parent CSS control the iframe height; clear any inline sizing from previous versions
  ifr.style.height='';
  ifr.style.minHeight='';
}
function rMToggle(mode){
  var body=document.querySelector('#r-editor .r-editor-body');if(!body)return;
  body.classList.toggle('r-show-form',mode==='form');
  body.classList.toggle('r-show-prev',mode==='prev');
  var btns=document.querySelectorAll('.r-mtoggle button');
  for(var i=0;i<btns.length;i++){btns[i].classList.toggle('on',btns[i].getAttribute('data-mode')===mode);}
  if(mode==='prev'){var ifr=document.getElementById('r-preview');if(ifr)setTimeout(function(){fitResumePreview(ifr);},40);}
}
window.rMToggle=rMToggle;
function resumePreview(){
  var d=RESUME_STATE.data;if(!d)return;var ifr=document.getElementById('r-preview');if(!ifr)return;
  ifr.onload=function(){fitResumePreview(ifr);};
  ifr.srcdoc=buildResumeHTML(d);
  setTimeout(function(){fitResumePreview(ifr);},120);
  try{localStorage.setItem(RESUME_LS+d.templateId,JSON.stringify(cleanResumeData(d)));}catch(e){}
}
function buildResumeHTML(d){
  var g=d.globalSettings||{},tc=g.themeColor||'#111',b=d.basic||{},tpl=d.templateId||'classic';
  var two=TPL_TWO.indexOf(tpl)>-1;
  var hCenter=b.layout==='center';
  var rawContacts=[];
  (b.fieldOrder||[]).forEach(function(f){
    if(!f.visible||['name','title','employementStatus'].indexOf(f.key)>-1)return;
    var v=b[f.key];if(!v)return;
    var ic=(b.icons&&b.icons[f.key])||'';
    var display=f.key==='birthDate'?v.replace(/-/g,'/'):v;
    rawContacts.push({key:f.key,html:'<span class="ct">'+(ic?rIcon(ic,tc):'')+'<span>'+rEsc(display)+'</span></span>'});
  });
  (b.customFields||[]).forEach(function(cf){if(cf.value)rawContacts.push({key:'custom',html:'<span class="ct">'+(cf.icon?rIcon(cf.icon,tc):'')+'<span>'+rEsc(cf.value)+'</span></span>'});});
  var contactsAll=rawContacts.filter(function(c){return c.key!=='birthDate';}).map(function(c){return c.html;}).join('');
  var photo='';
  if(b.photoConfig&&b.photoConfig.visible){
    var pc=b.photoConfig||{},pw=pc.width||90,ph=pc.height||120,pbr=(!pc.borderRadius||pc.borderRadius==='none')?'0':(pc.borderRadius||'4px');
    photo='<div class="photo" style="width:'+pw+'px;height:'+ph+'px;border-radius:'+pbr+'"><img src="'+rEsc(b.photo||'')+'" alt="" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'ph\');this.parentNode.textContent=\''+rEsc((b.name||' ').slice(0,1))+'\'"></div>';
  }
  var coreInner='<div class="r-name">'+rEsc(b.name||'姓名')+'</div>'+(b.title?'<div class="r-title">'+rEsc(b.title)+'</div>':'')+(b.employementStatus?'<div class="r-status">'+rEsc(b.employementStatus)+'</div>':'');
  var birthModern=two&&b.birthDate?'<div class="r-birth">'+rEsc(b.birthDate.replace(/-/g,'/'))+'</div>':'';
  var info=coreInner+(contactsAll?'<div class="r-contacts">'+contactsAll+'</div>':'');
  function secHTML(id){
    if(id==='skills')return rSecHTML({id:'skills',title:'专业技能',icon:'⚡'},d,tc);
    if(id==='experience')return rSecHTML({id:'experience',title:'工作经验',icon:'💼'},d,tc);
    if(id==='projects')return rSecHTML({id:'projects',title:'项目经历',icon:'🚀'},d,tc);
    if(id==='education')return rSecHTML({id:'education',title:'教育经历',icon:'🎓'},d,tc);
    return '';
  }
  var enabled=(d.menuSections||[]).filter(function(ms){return ms.enabled;});
  var selfEval=(d.selfEvaluationContent||'').trim();
  function selfSec(){return '<section class="r-sec" data-sec="self"><div class="r-sec-title">✨ 个人评价</div><div class="r-html">'+selfEval+'</div></section>';}
  var docOpen='<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+(b.name||'简历')+'</title><style>'+RESUME_CSS(tpl,g,tc)+'</style></head><body class="tpl-'+tpl+'">';
  if(two){
    var side='';
    if(photo)side+=photo;
    side+='<div class="r-side-info"><div class="r-side-core">'+coreInner+birthModern+'</div>'+(contactsAll?'<div class="r-side-contact"><div class="r-contacts">'+contactsAll+'</div></div>':'')+'</div>';
    enabled.forEach(function(ms){if(ms.id==='education')side+=rSec('education',secHTML('education'));});
    var main='';
    enabled.forEach(function(ms){if(['skills','experience','projects'].indexOf(ms.id)>-1)main+=rSec(ms.id,secHTML(ms.id));});
    if(selfEval)main+=selfSec();
    return docOpen+'<div class="r-scale"><div class="page"><div class="r-cols"><aside class="r-side">'+side+'</aside><div class="r-main">'+main+'</div></div></div></div></body></html>';
  }
  var hStyle=hCenter?'r-head-center':'r-head-left';
  var header='<header class="r-head '+hStyle+'"><div class="r-head-main">'+photo+'<div class="r-head-tx">'+info+'</div></div></header>';
  var main='';
  enabled.forEach(function(ms){if(ms.id==='basic')return;main+=rSec(ms.id,secHTML(ms.id));});
  if(selfEval)main=selfSec()+main;
  return docOpen+'<div class="r-scale"><div class="page">'+header+main+'</div></div></body></html>';
}
function rSecIco(ms){return ms&&ms.icon?('<span class="r-sec-ic">'+ms.icon+'</span>'):'';}
function rSec(id,h){return '<section class="r-sec" data-sec="'+rEsc(id)+'">'+h+'</section>';}
function rSecHTML(ms,d,tc){
  var id=ms.id;
  if(id==='skills')return '<div class="r-sec-title">'+rSecIco(ms)+'专业技能</div><div class="r-html">'+(d.skillContent||'')+'</div>';
  if(id==='experience'){
    var items=(d.experience||[]).filter(function(x){return x.visible!==false;}).map(function(e){
      return '<div class="r-item"><div class="r-item-h"><span class="r-item-t">'+rEsc(e.company||'')+(e.position?' · '+rEsc(e.position):'')+'</span><span class="r-item-d">'+rEsc(e.date||'')+'</span></div><div class="r-html">'+(e.details||'')+'</div></div>';
    }).join('');
    return '<div class="r-sec-title">'+rSecIco(ms)+'工作经验</div>'+items;
  }
  if(id==='projects'){
    var items=(d.projects||[]).filter(function(x){return x.visible!==false;}).map(function(p){
      return '<div class="r-item"><div class="r-item-h"><span class="r-item-t">'+rEsc(p.name||'')+(p.role?' · '+rEsc(p.role):'')+'</span><span class="r-item-d">'+rEsc(p.date||'')+'</span></div><div class="r-html">'+(p.description||'')+'</div></div>';
    }).join('');
    return '<div class="r-sec-title">'+rSecIco(ms)+'项目经历</div>'+items;
  }
  if(id==='education'){
    var items=(d.education||[]).filter(function(x){return x.visible!==false;}).map(function(e){
      var head=rEsc(e.school||'')+(e.major?' · '+rEsc(e.major):'')+(e.degree?' · '+rEsc(e.degree):'');
      var meta=[e.startDate,e.endDate].filter(Boolean).join(' ~ ');
      return '<div class="r-item"><div class="r-item-h"><span class="r-item-t">'+head+'</span><span class="r-item-d">'+rEsc(meta)+'</span></div>'+(e.gpa?'<div class="r-item-s">GPA：'+rEsc(e.gpa)+'</div>':'')+'<div class="r-html">'+(e.description||'')+'</div></div>';
    }).join('');
    return '<div class="r-sec-title">'+rSecIco(ms)+'教育经历</div>'+items;
  }
  return '';
}
function RESUME_CSS(tpl,g,tc){
  var two=tpl==='modern';
  var fs=(g.baseFontSize||15),pad=Math.max(g.pagePadding||0,28),lh=(g.lineHeight||1.5),ss=Math.max((typeof g.sectionSpacing==='number'?g.sectionSpacing:18),6),hs=(g.headerSize||16),shs=(g.subheaderSize||14);
  var base='*{box-sizing:border-box;margin:0;padding:0}'+
    'html,body{width:100%;min-height:100%;overflow-x:hidden;background:#fff;}'+
    '.r-scale{display:block;width:100%;transform-origin:top left}'+
    'body{color:#222;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;font-size:'+fs+'px;line-height:'+lh+';}'+
    '.page{max-width:820px;min-width:760px;margin:0 auto;padding:'+pad+'px;box-sizing:border-box;background:#fff;}'+
    '.r-head{margin-bottom:'+ss+'px;}'+
    '.r-head-main{display:flex;align-items:flex-start;gap:16px;}'+
    '.r-head-left .r-head-main{justify-content:flex-start;}'+
    '.r-head-center{text-align:center;}'+
    '.r-head-center .r-head-main{justify-content:center;flex-direction:column;align-items:center;text-align:center;}'+
    '.r-head-center .r-contacts{justify-content:center;}'+
    '.r-head-center .photo{margin-bottom:10px;}'+
    '.photo{width:90px;height:120px;flex:0 0 auto;background:#ececec;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:40px;font-weight:700;overflow:hidden;}'+
    '.photo img{width:100%;height:100%;object-fit:cover;}'+
    '.photo.ph{background:'+tc+'1a;color:'+tc+';}'+
    '.r-name{font-size:'+(fs*1.4).toFixed(1)+'px;font-weight:800;letter-spacing:.4px;line-height:1.15;word-break:break-word;}'+
    '.r-title{font-size:'+shs+'px;color:#555;margin-top:3px;}'+
    '.r-status{display:inline-block;font-size:11px;color:#666;margin-top:6px;padding:1px 9px;border:1px solid #ddd;border-radius:20px;}'+
    '.r-contacts{display:flex;flex-wrap:wrap;gap:3px 14px;margin-top:9px;font-size:'+(fs*0.78).toFixed(1)+'px;color:#555;}'+
    '.ct{display:inline-flex;align-items:center;gap:4px;}'+
    '.ri{width:13px;height:13px;flex:0 0 auto;}'+
    '.r-cols{display:grid;grid-template-columns:200px 1fr;gap:34px;align-items:start;}'+
    '.r-side{min-width:0;}'+
    '.r-side-info{margin-bottom:'+ss+'px;}'+
    '.r-side .r-sec{margin-bottom:'+ss+'px;}'+
    '.r-main{min-width:0;}'+
    '.r-sec{margin-bottom:'+ss+'px;}'+
    '.r-sec-title{font-size:'+hs+'px;font-weight:700;margin-bottom:9px;display:flex;align-items:center;gap:6px;}'+
    '.r-sec-ic{font-size:'+(hs*0.95).toFixed(1)+'px;}'+
    '.r-item{margin-bottom:13px;}'+
    '.r-item-h{display:flex;justify-content:space-between;align-items:baseline;gap:12px;}'+
    '.r-item-t{font-weight:700;font-size:'+(fs*0.95).toFixed(1)+'px;word-break:break-word;}'+
    '.r-item-s{color:#666;font-size:'+(fs*0.8).toFixed(1)+'px;margin:2px 0;}'+
    '.r-item-d{color:#999;font-size:'+(fs*0.78).toFixed(1)+'px;white-space:nowrap;flex:0 0 auto;}'+
    '.r-html{font-size:'+(fs*0.82).toFixed(1)+'px;color:#333;}'+
    '.r-html ul,.r-html ol{margin-left:18px;}'+
    '.r-html li{margin:3px 0;}'+
    '.r-html p{margin:4px 0;}'+
    tplCSS(tpl,g,tc)+
    '@media screen and (max-width:760px){.page{padding:22px 16px}.r-cols{grid-template-columns:170px 1fr;gap:18px}}'+
    '@media screen and (max-width:560px){.r-cols{grid-template-columns:1fr}.r-name{font-size:'+(fs*1.2).toFixed(1)+'px}.r-contacts{font-size:'+(fs*0.72).toFixed(1)+'px}.photo{width:72px;height:90px;font-size:32px}}'+
    '@media screen and (max-width:900px){.page{box-shadow:0 4px 18px rgba(0,0,0,.15)}}'+
    '@media print{body{font-size:11pt}.page{min-width:auto;max-width:none;padding:12mm 14mm}.r-cols{grid-template-columns:200px 1fr}.photo{width:90px;height:120px;font-size:40px}}';
  return base;
}
function tplCSS(tpl,g,tc){
  var s='';
  var fs=(g&&g.baseFontSize)||15;
  if(tpl==='modern'){
    s+='.tpl-modern .page{width:794px;max-width:794px;min-width:0;padding:0 !important;background:#fff}'+
      '.tpl-modern .r-cols{grid-template-columns:265px 1fr;gap:0;align-items:stretch;min-height:1123px}'+
      '.tpl-modern .r-side{background:'+tc+';color:#fff;padding:28px 22px}'+
      '.tpl-modern .r-side-core{text-align:center;border-bottom:1px solid rgba(255,255,255,.35);padding-bottom:14px;margin-bottom:14px}'+
      '.tpl-modern .r-side-contact{border-bottom:1px solid rgba(255,255,255,.35);padding-bottom:14px;margin-bottom:14px}'+
      '.tpl-modern .r-side-info .r-name{color:#fff;font-size:'+(fs*1.7).toFixed(1)+'px;margin-bottom:6px}'+
      '.tpl-modern .r-side-info .r-title{color:rgba(255,255,255,.85);font-size:'+(fs*0.95).toFixed(1)+'px;margin-bottom:6px}'+
      '.tpl-modern .r-side-info .r-status{border:none;padding:0;color:rgba(255,255,255,.75);font-size:'+(fs*0.85).toFixed(1)+'px;margin-top:0;margin-bottom:4px}'+
      '.tpl-modern .r-side-info .r-birth{color:rgba(255,255,255,.75);font-size:'+(fs*0.85).toFixed(1)+'px;margin-bottom:2px}'+
      '.tpl-modern .r-contacts{color:rgba(255,255,255,.85);font-size:'+(fs*0.85).toFixed(1)+'px;flex-direction:column;gap:10px;margin-top:0}'+
      '.tpl-modern .r-contacts .ct{gap:8px}'+
      '.tpl-modern .r-contacts .ri{stroke:#fff;width:14px;height:14px}'+
      '.tpl-modern .photo{background:transparent;border:2px solid rgba(255,255,255,.35);color:#fff;margin:0 auto 18px}'+
      '.tpl-modern .photo.ph{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.4)}'+
      '.tpl-modern .photo img{border-radius:inherit}'+
      '.tpl-modern .r-side .r-sec-title{color:#fff;border-left:3px solid #fff;padding-left:8px;margin-bottom:10px}'+
      '.tpl-modern .r-side .r-item{margin-bottom:10px}'+
      '.tpl-modern .r-side .r-item-h{flex-direction:column;align-items:flex-start;gap:2px;margin-bottom:3px}'+
      '.tpl-modern .r-side .r-item-t{color:#fff;font-size:'+(fs*0.9).toFixed(1)+'px}'+
      '.tpl-modern .r-side .r-item-d{color:rgba(255,255,255,.7);font-size:'+(fs*0.78).toFixed(1)+'px}'+
      '.tpl-modern .r-side .r-html{color:rgba(255,255,255,.85);font-size:'+(fs*0.8).toFixed(1)+'px}'+
      '.tpl-modern .r-main{background:#fff;padding:28px 18px}'+
      '.tpl-modern .r-main .r-sec-title{color:'+tc+';border-bottom:2px solid '+tc+';padding-bottom:5px;margin-bottom:10px}'+
      '@media print{.tpl-modern .page{max-width:none;width:210mm;min-height:297mm}.tpl-modern .r-cols{grid-template-columns:265px 1fr}}';
  }else if(tpl==='left-right'){
    s+='.tpl-left-right .r-sec-title{background:'+tc+';color:#fff;padding:7px 12px;border-radius:6px;font-size:14px;display:flex;align-items:center;gap:7px}'+
      '.tpl-left-right .r-sec-title .r-sec-ic{filter:brightness(2.2)}';
  }else if(tpl==='classic'){
    s+='.tpl-classic .r-head{border-bottom:3px double '+tc+';padding-bottom:14px}'+
      '.tpl-classic .r-contacts{justify-content:center}'+
      '.tpl-classic .r-sec-title{color:#222;text-transform:uppercase;letter-spacing:.05em;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:5px;font-size:14px}'+
      '.tpl-classic .r-name{letter-spacing:.1em}';
  }else if(tpl==='elegant'){
    s+='.tpl-elegant .r-head-center .photo{border-radius:50%}'+
      '.tpl-elegant .r-sec-title{color:'+tc+';font-weight:600;display:flex;align-items:center;gap:8px;font-size:15px}'+
      '.tpl-elegant .r-sec-title::before{content:"";width:16px;height:3px;background:'+tc+';border-radius:2px;flex:0 0 auto}'+
      '.tpl-elegant .r-item-t{color:#222}';
  }else if(tpl==='minimalist'){
    s+='.tpl-minimalist .r-name{font-weight:200;letter-spacing:.14em}'+
      '.tpl-minimalist .r-title{font-weight:300}'+
      '.tpl-minimalist .r-sec-title{font-weight:500;text-transform:uppercase;letter-spacing:.14em;font-size:12px;color:#999;border-bottom:1px solid #eee;padding-bottom:7px}'+
      '.tpl-minimalist .r-item-t{font-weight:500}'+
      '.tpl-minimalist .r-contacts{color:#777}'+
      '.tpl-minimalist .r-head-main{gap:14px}';
  }else if(tpl==='creative'){
    s+='.tpl-creative .r-sec-title{color:'+tc+';font-weight:700;display:flex;align-items:center;gap:8px}'+
      '.tpl-creative .r-sec-title .r-sec-ic{background:'+tc+';color:#fff;border-radius:5px;padding:2px 6px;font-size:12px}'+
      '.tpl-creative .r-item{background:#fff;border:1px solid #eee;border-radius:10px;padding:12px 14px}';
  }else if(tpl==='timeline'){
    s+='.tpl-timeline .r-sec-title{color:'+tc+';font-weight:700;font-size:15px}'+
      '.tpl-timeline .r-item{position:relative;padding-left:22px;margin-bottom:14px}'+
      '.tpl-timeline .r-item::before{content:"";position:absolute;left:2px;top:6px;width:10px;height:10px;border-radius:50%;background:'+tc+';box-shadow:0 0 0 3px '+tc+'22}'+
      '.tpl-timeline .r-item::after{content:"";position:absolute;left:6px;top:16px;bottom:-14px;width:2px;background:#e6e6e6}'+
      '.tpl-timeline .r-item:last-child::after{display:none}';
  }else if(tpl==='swiss'){
    s+='.tpl-swiss{font-family:Helvetica,Arial,"PingFang SC","Microsoft YaHei",sans-serif}'+
      '.tpl-swiss .page{border-top:6px solid '+tc+';padding-top:24px}'+
      '.tpl-swiss .r-name{text-transform:uppercase;letter-spacing:.03em;font-weight:800;font-size:30px}'+
      '.tpl-swiss .r-title{text-transform:uppercase;letter-spacing:.08em;font-size:13px;color:#555}'+
      '.tpl-swiss .r-sec-title{text-transform:uppercase;letter-spacing:.1em;font-weight:700;border-top:2px solid '+tc+';padding-top:7px;font-size:13px}'+
      '.tpl-swiss .r-item-t{color:'+tc+';font-weight:700}'+
      '.tpl-swiss .r-contacts{text-transform:uppercase;font-size:11px;letter-spacing:.04em;color:#555}';
  }else if(tpl==='editorial'){
    s+='.tpl-editorial{font-family:Georgia,"Times New Roman","Songti SC","SimSun",serif}'+
      '.tpl-editorial .r-head{border-bottom:2px solid #111;padding-bottom:12px}'+
      '.tpl-editorial .r-name{font-style:italic;font-weight:700;font-size:34px}'+
      '.tpl-editorial .r-title{font-style:italic;color:#444}'+
      '.tpl-editorial .r-sec-title{font-variant:small-caps;letter-spacing:.04em;font-weight:700;border-bottom:1px solid #333;padding-bottom:4px;font-size:15px}'+
      '.tpl-editorial .r-html{text-align:justify}'+
      '.tpl-editorial .r-item-d{font-style:italic}'+
      '.tpl-editorial .r-contacts{font-size:12px;color:#444}';
  }
  return s;
}
var _h2p=null,_h2pLoading=false,_h2pWait=[];
var H2P_LOCAL='jl/html2pdf.bundle.min.js';
var H2P_CDN='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
function loadHtml2pdf(cb){
  if(_h2p){cb(_h2p);return;}
  if(_h2pLoading){_h2pWait.push(cb);return;}
  _h2pLoading=true;
  function done(lib){_h2pLoading=false;_h2p=lib;_h2pWait.forEach(function(f){f(lib);});_h2pWait=[];}
  var s=document.createElement('script');
  s.src=H2P_LOCAL;
  s.onload=function(){done(window.html2pdf);};
  s.onerror=function(){
    var s2=document.createElement('script');
    s2.src=H2P_CDN;
    s2.onload=function(){done(window.html2pdf);};
    s2.onerror=function(){done(null);};
    document.head.appendChild(s2);
  };
  document.head.appendChild(s);
}
function resumeExportPDF(){
  var d=RESUME_STATE.data;
  if(!d){flash('没有可导出的简历数据');return;}
  flash('正在生成 PDF…');
  loadHtml2pdf(function(lib){
    if(!lib){flash('PDF 库加载失败，已切换为浏览器打印'); try{window.print();}catch(e){} return;}
    var name=(d.basic&&d.basic.name)?(d.basic.name+'的简历'):'简历';
    var html=buildResumeHTML(d);
    // Use an off-screen iframe so html2pdf/html2canvas render in an isolated A4-width
    // document. This avoids mobile viewport clipping and iframe-preview visibility issues.
    var iframe=document.createElement('iframe');
    iframe.setAttribute('aria-hidden','true');
    iframe.style.cssText='position:fixed;left:-9999px;top:0;width:794px;height:1200px;border:none;pointer-events:none;z-index:-1;opacity:0';
    document.body.appendChild(iframe);
    var idoc=iframe.contentDocument||iframe.contentWindow.document;
    idoc.open();idoc.write(html);idoc.close();
    function doExport(){
      var page=idoc.querySelector('.page');
      if(!page){flash('页面元素未找到');if(iframe.parentNode)iframe.parentNode.removeChild(iframe);return;}
      var opt={margin:0,filename:name+'.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#fff',logging:false,scrollX:0,scrollY:0},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}};
      function cleanup(){if(iframe.parentNode)iframe.parentNode.removeChild(iframe);}
      try{
        lib().set(opt).from(page).save().then(function(){flash('PDF 已下载');cleanup();}).catch(function(err){console.error(err);cleanup();try{window.print();}catch(e){}flash('PDF 生成失败，已改为打印');});
      }catch(e){cleanup(); try{window.print();}catch(e2){} flash('PDF 生成失败，已改为打印');}
    }
    // Give the iframe a moment to apply CSS before rendering.
    setTimeout(doExport, 300);
  });
}
function downloadBlob(content,fn,type){var blob=new Blob([content],{type:type+';charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(e){}},1500);}
function resumeExportJSON(){var d=RESUME_STATE.data;if(!d)return;var x=cleanResumeData(d);downloadBlob(JSON.stringify(x,null,2),(d.basic&&d.basic.name||'resume')+'.json','application/json');}
function resumeExportHTML(){var d=RESUME_STATE.data;if(!d)return;downloadBlob(buildResumeHTML(d),(d.basic&&d.basic.name||'resume')+'.html','text/html');}
function resumeReset(){
  var id=RESUME_STATE.tplId;if(!id)return;
  try{localStorage.removeItem(RESUME_LS+id);}catch(e){}
  var T=window.RESUME_TEMPLATES||{};RESUME_STATE.data=JSON.parse(JSON.stringify(T[id]));
  resumeForm();resumePreview();flash('已重置为模板初始内容');
}
function resumeOnInput(e){
  var el=e.target,bin=el.getAttribute('data-bind');
  if(el.hasAttribute('data-skill-idx')){
    var idx=+el.getAttribute('data-skill-idx'),d=RESUME_STATE.data;
    d._skillArr[idx]=el.value;
    d.skillContent=listToHtml(d._skillArr);
    resumeSched();return;
  }
  if(el.hasAttribute('data-detail-sec')){
    var sec=el.getAttribute('data-detail-sec'),id=el.getAttribute('data-detail-id'),idx=+el.getAttribute('data-detail-idx'),d=RESUME_STATE.data;
    var it=(d[sec]||[]).find(function(x){return String(x.id)===id;});
    if(it){it._detailsArr[idx]=el.value;it[sec==='experience'?'details':'description']=listToHtml(it._detailsArr);}
    resumeSched();return;
  }
  if(!bin)return;
  var v=el.type==='checkbox'?(el.checked?true:false):el.value;
  resumeSet(bin,v);
}
function resumeFormClick(e){
  var btn=e.target.closest('[data-action]');if(!btn)return;
  var a=btn.getAttribute('data-action'),d=RESUME_STATE.data;if(!d)return;
  if(a==='add-experience'){d.experience.push(rNewItem('experience'));resumeForm();resumePreview();}
  else if(a==='add-projects'){d.projects.push(rNewItem('projects'));resumeForm();resumePreview();}
  else if(a==='add-education'){d.education.push(rNewItem('education'));resumeForm();resumePreview();}
  else if(a==='add-cf'){if(!d.basic.customFields)d.basic.customFields=[];d.basic.customFields.push({id:'cf'+Date.now(),label:'',value:'',icon:'Globe'});resumeForm();resumePreview();}
  else if(a==='del'){var sec=btn.getAttribute('data-sec'),id=btn.getAttribute('data-id');if(d[sec])d[sec]=d[sec].filter(function(x){return String(x.id)!==id;});resumeForm();resumePreview();}
  else if(a==='del-cf'){var cid=btn.getAttribute('data-id');if(d.basic.customFields)d.basic.customFields=d.basic.customFields.filter(function(x){return x.id!==cid;});resumeForm();resumePreview();}
  else if(a==='add-skill'){d._skillArr.push('');d.skillContent=listToHtml(d._skillArr);resumeForm();resumePreview();}
  else if(a==='del-skill'){var sidx=+btn.getAttribute('data-idx');d._skillArr.splice(sidx,1);d.skillContent=listToHtml(d._skillArr);resumeForm();resumePreview();}
  else if(a==='add-detail'){
    var sec=btn.getAttribute('data-sec'),id=btn.getAttribute('data-id');
    var it=(d[sec]||[]).find(function(x){return String(x.id)===id;});
    if(it){it._detailsArr.push('');it[sec==='experience'?'details':'description']=listToHtml(it._detailsArr);resumeForm();resumePreview();}
  }
  else if(a==='del-detail'){
    var sec=btn.getAttribute('data-sec'),id=btn.getAttribute('data-id'),idx=+btn.getAttribute('data-idx');
    var it=(d[sec]||[]).find(function(x){return String(x.id)===id;});
    if(it){it._detailsArr.splice(idx,1);it[sec==='experience'?'details':'description']=listToHtml(it._detailsArr);resumeForm();resumePreview();}
  }
}
function resumeOnChange(e){
  var el=e.target;
  if(el.id==='r-photo'&&el.files&&el.files[0]){
    var f=el.files[0];
    if(!f.type.match(/^image\//)){flash('请选择图片文件（jpg/png）');return;}
    if(f.size>4*1024*1024){flash('图片超过 4MB，请压缩后重试');return;}
    var reader=new FileReader();
    reader.onload=function(ev){
      var d=RESUME_STATE.data;if(!d||!d.basic)return;
      d.basic.photo=ev.target.result;
      if(d.basic.photoConfig)d.basic.photoConfig.visible=true;
      resumeForm();resumePreview();flash('头像已上传并显示');
    };
    reader.onerror=function(){flash('图片读取失败');};
    reader.readAsDataURL(f);
  }
}
window.resumePick=resumePick;window.resumeOpen=resumeOpen;window.resumeBack=resumeBack;window.resumeExportPDF=resumeExportPDF;window.resumeExportHTML=resumeExportHTML;window.resumeExportJSON=resumeExportJSON;window.resumeReset=resumeReset;window.resumeOnChange=resumeOnChange;



/* ====================================================================== */
/* 新能源岗位 JD 库 · 能力提炼                                           */
/* ====================================================================== */
/* 数据来源：各企业公开招聘信息（宁德时代 / 阳光电源 / 比亚迪 / 华为数字
   能源 / 远景能源 / 许继电气 / 特来电·星星充电 等），离线内置，零网络依赖。
   每条 JD 预标注 6 类能力标签，便于「能力提炼」自动聚合统计。            */
var JD_LIB=[
  {
    "id": "jd-sg-ess",
    "company": "阳光电源",
    "role": "储能系统工程师",
    "cat": "储能系统",
    "req": [
      "储能系统需求评审、方案设计与技术攻关",
      "优化储能系统/单元模块控制策略(PCS/EMS)",
      "跨部门(EMS/PCS/DCDC/消防/热设计)拉通与降本",
      "熟悉工商业及大型储能场景与 BMS 主要功能"
    ],
    "skills": {
      "proto": [
        "Modbus",
        "IEC 61850"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "DSP(TI C2000)",
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "GB/T 14549·12325",
        "IEEE 1547"
      ],
      "dom": [
        "电力电子拓扑(LLC/DCAC/DCDC)",
        "PCS并网/离网",
        "EMS能量管理",
        "SOC/SOH估算",
        "微网/SPPC协调"
      ],
      "soft": [
        "跨部门协调",
        "项目管理"
      ]
    }
  },
  {
    "id": "jd-hbsc-ess",
    "company": "海博思创",
    "role": "储能系统集成工程师",
    "cat": "储能系统",
    "req": [
      "储能集装箱/柜系统级集成与 BOM 设计",
      "PCS、BMS、EMS、消防、液冷多部件联调",
      "现场并网调试与交付，客户技术对接",
      "系统降本与可靠性提升"
    ],
    "skills": {
      "proto": [
        "Modbus",
        "IEC 61850",
        "IEC 60870-5-104"
      ],
      "lang": [
        "Python",
        "C/C++"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪",
        "ARM/STM32"
      ],
      "std": [
        "IEEE 1547",
        "GB/T 36276"
      ],
      "dom": [
        "EMS能量管理",
        "PCS并网/离网",
        "BMS控制策略",
        "微网/SPPC协调"
      ],
      "soft": [
        "跨部门协调",
        "现场调试/出差",
        "项目管理"
      ]
    }
  },
  {
    "id": "jd-kehua-pcs",
    "company": "科华数据",
    "role": "PCS 软件工程师",
    "cat": "储能系统",
    "req": [
      "储能变流器(PCS)嵌入式软件开发",
      "三相并网/离网逆变控制算法实现",
      "并离网无缝切换、黑启动逻辑开发",
      "CAN/Modbus 与 EMS、调度通信"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus",
        "IEC 61850"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "DSP(TI C2000)",
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "IEEE 1547"
      ],
      "dom": [
        "电力电子拓扑(LLC/DCAC/DCDC)",
        "PCS并网/离网",
        "微网/SPPC协调"
      ],
      "soft": [
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-clou-ems",
    "company": "科陆电子",
    "role": "储能 EMS 开发工程师",
    "cat": "储能系统",
    "req": [
      "储能能量管理系统(EMS)软件架构与开发",
      "削峰填谷/需量管理/防逆流策略实现",
      "与 PCS/BMS/调度(104/61850/MQTT)交互",
      "分时电价与负荷曲线场景回归"
    ],
    "skills": {
      "proto": [
        "Modbus",
        "IEC 60870-5-104",
        "IEC 61850",
        "MQTT"
      ],
      "lang": [
        "C/C++",
        "Python",
        "Go"
      ],
      "hw": [
        "Linux"
      ],
      "std": [
        "IEEE 1547"
      ],
      "dom": [
        "EMS能量管理",
        "微网/SPPC协调",
        "PCS并网/离网",
        "一次/二次调频",
        "SOC/SOH估算"
      ],
      "soft": [
        "跨部门协调",
        "项目管理"
      ]
    }
  },
  {
    "id": "jd-zt-ess",
    "company": "中天科技",
    "role": "储能系统应用工程师",
    "cat": "储能系统",
    "req": [
      "储能系统方案设计与客户技术交流",
      "通信接口(Modbus/104)点位表与联调",
      "并网测试与验收资料编制",
      "现场问题排查与支持"
    ],
    "skills": {
      "proto": [
        "Modbus",
        "IEC 60870-5-104",
        "DL/T 645"
      ],
      "lang": [
        "Python",
        "C/C++"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪"
      ],
      "std": [
        "GB/T 14549·12325"
      ],
      "dom": [
        "PCS并网/离网",
        "EMS能量管理",
        "BMS控制策略",
        "对称分量/电能质量"
      ],
      "soft": [
        "现场调试/出差",
        "技术售前/支持",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-ctl-bms1",
    "company": "宁德时代",
    "role": "BMS 系统工程师(乘用车)",
    "cat": "BMS",
    "req": [
      "BMS 项目系统方案设计、客户需求沟通与维护",
      "BMS 软件集成与测试支持、客户端问题排查",
      "熟悉汽车动力/电池系统工作原理与 ECU 电控逻辑",
      "熟悉 CAN 总线及协议，熟练 CANalyzer/CANoe/CANape",
      "了解功能安全(ISO 26262)与 ASPICE 流程"
    ],
    "skills": {
      "proto": [
        "CAN",
        "CANoe/CANalyzer"
      ],
      "lang": [
        "C/C++"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "ISO 26262 功能安全",
        "ASPICE"
      ],
      "dom": [
        "BMS控制策略",
        "SOC/SOH估算",
        "电池电化学"
      ],
      "soft": [
        "跨部门协调",
        "英语/日语",
        "项目管理",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-ctl-bms2",
    "company": "宁德时代",
    "role": "BMS 软件工程师",
    "cat": "BMS",
    "req": [
      "BMS 嵌入式软件开发(控制策略 / SOC 估算)",
      "CAN / SAE J1939 等总线通信软件",
      "功能安全(ISO 26262)与 ASPICE 流程落地",
      "标定(CANape)与 HIL / 台架测试支持"
    ],
    "skills": {
      "proto": [
        "CAN",
        "CANoe/CANalyzer",
        "SAE J1939"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "DSP(TI C2000)",
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "ISO 26262 功能安全",
        "ASPICE"
      ],
      "dom": [
        "BMS控制策略",
        "SOC/SOH估算",
        "电池电化学"
      ],
      "soft": [
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-byc-bms",
    "company": "比亚迪",
    "role": "BMS 软件工程师",
    "cat": "BMS",
    "req": [
      "动力电池 BMS 嵌入式软件开发与建模",
      "SOC/SOH 算法与热管理策略实现",
      "CAN/CANoe 通信与整车联调",
      "功能安全(ISO 26262)与 ASPICE 落地"
    ],
    "skills": {
      "proto": [
        "CAN",
        "CANoe/CANalyzer",
        "SAE J1939"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "ISO 26262 功能安全",
        "ASPICE",
        "GB 38031"
      ],
      "dom": [
        "BMS控制策略",
        "SOC/SOH估算",
        "电池电化学"
      ],
      "soft": [
        "跨部门协调",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-ey-bms",
    "company": "亿纬锂能",
    "role": "BMS 算法工程师",
    "cat": "BMS",
    "req": [
      "储能/动力 BMS 核心算法(SOC/SOH/SOP)研发",
      "电芯模型与状态估计算法仿真验证",
      "算法代码工程化与 HIL 测试",
      "支持系统联调与现场问题定位"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink",
        "Python"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "ISO 26262 功能安全",
        "GB/T 36276"
      ],
      "dom": [
        "BMS控制策略",
        "SOC/SOH估算",
        "电池电化学"
      ],
      "soft": [
        "算法/建模",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-gx-bms",
    "company": "国轩高科",
    "role": "BMS 硬件工程师",
    "cat": "BMS",
    "req": [
      "BMS 采集/主控板硬件原理图与 PCB 设计",
      "AFE/采样电路、绝缘检测与均衡电路设计",
      "EMC/安规设计与硬件测试",
      "与软件/算法团队联调"
    ],
    "skills": {
      "proto": [
        "CAN"
      ],
      "lang": [
        "C/C++"
      ],
      "hw": [
        "BMS采样板/AFE",
        "示波器/功率分析仪/录波仪"
      ],
      "std": [
        "ISO 26262 功能安全",
        "GB 38031",
        "UN 38.3"
      ],
      "dom": [
        "BMS控制策略",
        "SOC/SOH估算"
      ],
      "soft": [
        "跨部门协调",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-ctl-cell",
    "company": "宁德时代",
    "role": "电芯研发工程师(电化学)",
    "cat": "储能电芯",
    "req": [
      "锂离子电池电芯材料体系与电化学机理研究",
      "电芯设计、配方优化与性能验证",
      "循环寿命/倍率/安全机理分析与改善",
      "专利与前沿技术跟踪"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "GB/T 36276",
        "UL 1973"
      ],
      "dom": [
        "电池电化学",
        "SOC/SOH估算",
        "电芯工艺/制造"
      ],
      "soft": [
        "算法/建模",
        "英语/日语"
      ]
    }
  },
  {
    "id": "jd-byc-cell",
    "company": "比亚迪",
    "role": "电池研发工程师(刀片电池)",
    "cat": "储能电芯",
    "req": [
      "刀片电池结构/电芯设计与工艺开发",
      "安全/能量密度/快充综合优化",
      "中试到量产的技术转移与良率提升",
      "竞品拆解与对标"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "GB 38031",
        "GB/T 36276"
      ],
      "dom": [
        "电池电化学",
        "电芯工艺/制造"
      ],
      "soft": [
        "产线/工艺工程",
        "跨部门协调"
      ]
    }
  },
  {
    "id": "jd-ey-cell",
    "company": "亿纬锂能",
    "role": "电芯工艺工程师",
    "cat": "储能电芯",
    "req": [
      "储能电芯制造工艺(涂布/辊压/装配/化成)开发与优化",
      "良率提升与制程异常分析",
      "工艺参数 DOE 与 SPC 管控",
      "支持量产爬坡"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "SQL"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "ISO 9001",
        "IATF 16949",
        "GB/T 36276"
      ],
      "dom": [
        "电芯工艺/制造",
        "电池电化学"
      ],
      "soft": [
        "产线/工艺工程",
        "RCA根因分析",
        "可靠性/DFMEA"
      ]
    }
  },
  {
    "id": "jd-zcx-cell",
    "company": "中创新航",
    "role": "电芯设计工程师",
    "cat": "储能电芯",
    "req": [
      "储能电芯产品设计(尺寸/容量/结构)",
      "热安全设计与仿真协同",
      "新产品导入(NPI)与验证",
      "成本与性能权衡"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "GB/T 36276",
        "UL 1973"
      ],
      "dom": [
        "电池电化学",
        "电芯工艺/制造",
        "有限元/热仿真"
      ],
      "soft": [
        "跨部门协调",
        "项目管理"
      ]
    }
  },
  {
    "id": "jd-fc-cell",
    "company": "蜂巢能源",
    "role": "电芯研发工程师",
    "cat": "储能电芯",
    "req": [
      "动力/储能电芯材料与体系开发",
      "无钴/短刀等差异化技术路线研发",
      "电芯性能与安全验证",
      "文献/专利分析与技术规划"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "GB/T 36276"
      ],
      "dom": [
        "电池电化学",
        "电芯工艺/制造"
      ],
      "soft": [
        "英语/日语",
        "算法/建模"
      ]
    }
  },
  {
    "id": "jd-rb-cathode",
    "company": "容百科技",
    "role": "正极材料研发(高镍)",
    "cat": "电池材料",
    "req": [
      "高镍三元正极材料体系研发与改性",
      "合成工艺(共沉淀/烧结)优化",
      "材料结构/形貌/电化学性能表征",
      "中试放大与量产工艺衔接"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "ISO 9001",
        "IATF 16949"
      ],
      "dom": [
        "电池材料(正/负/隔膜/电解液)",
        "电池电化学"
      ],
      "soft": [
        "产线/工艺工程",
        "英语/日语"
      ]
    }
  },
  {
    "id": "jd-ds-cathode",
    "company": "当升科技",
    "role": "正极材料工程师",
    "cat": "电池材料",
    "req": [
      "钴酸锂/三元/磷酸锰铁锂正极研发",
      "单晶化、包覆、掺杂等改性技术",
      "客户送样与指标对标",
      "产线工艺稳定性支持"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "ISO 9001"
      ],
      "dom": [
        "电池材料(正/负/隔膜/电解液)",
        "电池电化学"
      ],
      "soft": [
        "产线/工艺工程",
        "技术售前/支持"
      ]
    }
  },
  {
    "id": "jd-btr-anode",
    "company": "贝特瑞",
    "role": "负极材料研发(硅基)",
    "cat": "电池材料",
    "req": [
      "硅基/石墨负极材料体系研发",
      "首效、膨胀与循环性能改善",
      "材料表征与失效分析",
      "中试到量产放大"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "ISO 9001",
        "IATF 16949"
      ],
      "dom": [
        "电池材料(正/负/隔膜/电解液)",
        "电池电化学"
      ],
      "soft": [
        "产线/工艺工程"
      ]
    }
  },
  {
    "id": "jd-ptl-anode",
    "company": "璞泰来",
    "role": "负极/涂覆工艺工程师",
    "cat": "电池材料",
    "req": [
      "负极材料与涂覆隔膜工艺开发",
      "浆料配方、涂布均匀性与良率优化",
      "设备参数与制程管控",
      "降本与产能提升"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "SQL"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "ISO 9001",
        "IATF 16949"
      ],
      "dom": [
        "电池材料(正/负/隔膜/电解液)",
        "电芯工艺/制造"
      ],
      "soft": [
        "产线/工艺工程",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-enj-sep",
    "company": "恩捷股份",
    "role": "隔膜研发工程师",
    "cat": "电池材料",
    "req": [
      "湿法/干法锂电池隔膜研发与改性",
      "涂覆(陶瓷/PVDF)工艺开发",
      "孔隙率、穿刺强度等性能优化",
      "量产一致性与良率提升"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "ISO 9001",
        "IATF 16949"
      ],
      "dom": [
        "电池材料(正/负/隔膜/电解液)",
        "电芯工艺/制造"
      ],
      "soft": [
        "产线/工艺工程"
      ]
    }
  },
  {
    "id": "jd-tc-electro",
    "company": "天赐材料",
    "role": "电解液研发工程师",
    "cat": "电池材料",
    "req": [
      "液态/固态电解质与新型锂盐研发",
      "添加剂配方与稳定性/安全优化",
      "电解液与正负极兼容性评估",
      "客户定制与量产支持"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "ISO 9001",
        "IATF 16949"
      ],
      "dom": [
        "电池材料(正/负/隔膜/电解液)",
        "电池电化学"
      ],
      "soft": [
        "产线/工艺工程",
        "技术售前/支持"
      ]
    }
  },
  {
    "id": "jd-hw-inv",
    "company": "华为数字能源",
    "role": "电力电子·逆变器软件工程师",
    "cat": "光伏",
    "req": [
      "逆变器 / PCS 嵌入式软件模块化设计与重构",
      "DSP / ARM 芯片底层驱动开发",
      "功率拓扑控制算法(LLC / DCDC / DCAC)与并网技术",
      "数字电源特性仿真、设计、调试与落地"
    ],
    "skills": {
      "proto": [
        "Modbus",
        "IEC 61850"
      ],
      "lang": [
        "C/C++",
        "Verilog",
        "MATLAB/Simulink"
      ],
      "hw": [
        "DSP(TI C2000)",
        "ARM/STM32",
        "FPGA/CPLD",
        "RTOS"
      ],
      "std": [
        "IEC 61850",
        "IEEE 1547"
      ],
      "dom": [
        "电力电子拓扑(LLC/DCAC/DCDC)",
        "PCS并网/离网",
        "光伏MPPT"
      ],
      "soft": []
    }
  },
  {
    "id": "jd-sg-invhw",
    "company": "阳光电源",
    "role": "光伏逆变器硬件工程师",
    "cat": "光伏",
    "req": [
      "组串/集中式逆变器主功率硬件设计",
      "DC/DC、DC/AC 拓扑与磁件设计",
      "效率、温升与 EMC 优化",
      "BOM 成本与可制造性设计"
    ],
    "skills": {
      "proto": [
        "Modbus"
      ],
      "lang": [
        "C/C++",
        "Verilog"
      ],
      "hw": [
        "DSP(TI C2000)",
        "FPGA/CPLD"
      ],
      "std": [
        "IEEE 1547"
      ],
      "dom": [
        "电力电子拓扑(LLC/DCAC/DCDC)",
        "光伏MPPT"
      ],
      "soft": [
        "跨部门协调",
        "可靠性/DFMEA"
      ]
    }
  },
  {
    "id": "jd-lk-cell",
    "company": "隆基绿能",
    "role": "电池片研发(PERC/TOPCon/HJT)",
    "cat": "光伏",
    "req": [
      "高效晶硅电池(PERC/TOPCon/HJT)工艺研发",
      "钝化、镀膜、金属化等工序优化",
      "效率提升与衰减机理分析",
      "中试线验证与量产转化"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "ISO 9001"
      ],
      "dom": [
        "光伏MPPT",
        "电芯工艺/制造",
        "有限元/热仿真"
      ],
      "soft": [
        "产线/工艺工程",
        "算法/建模"
      ]
    }
  },
  {
    "id": "jd-jk-module",
    "company": "晶科能源",
    "role": "组件研发工程师",
    "cat": "光伏",
    "req": [
      "光伏组件(含 TOPCon/BC)产品设计",
      "封装材料与可靠性(PID/热斑/机械)验证",
      "功率衰减与 BOM 优化",
      "认证对接与新品导入"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python"
      ],
      "hw": [
        "AutoCAD/EPLAN"
      ],
      "std": [
        "IEC 61215",
        "IEC 61730",
        "UL 1703"
      ],
      "dom": [
        "光伏MPPT",
        "有限元/热仿真"
      ],
      "soft": [
        "产线/工艺工程",
        "标准/认证"
      ]
    }
  },
  {
    "id": "jd-th-ts",
    "company": "天合光能",
    "role": "跟踪支架控制工程师",
    "cat": "光伏",
    "req": [
      "智能跟踪支架控制算法与驱动设计",
      "风载/雪载保护策略与地形适配",
      "CAN/Modbus 通信与 SCADA 对接",
      "现场调试与故障分析"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus"
      ],
      "lang": [
        "C/C++",
        "Python"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "IEC 62817"
      ],
      "dom": [
        "光伏MPPT",
        "控制理论",
        "微网/SPPC协调"
      ],
      "soft": [
        "现场调试/出差",
        "算法/建模"
      ]
    }
  },
  {
    "id": "jd-jl-inv",
    "company": "锦浪科技",
    "role": "组串式逆变器软件工程师",
    "cat": "光伏",
    "req": [
      "组串式逆变器控制软件开发",
      "MPPT 算法与并网友好性实现",
      "CAN/Modbus 通信与监控对接",
      "HIL/台架测试与现场问题定位"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "DSP(TI C2000)",
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "IEEE 1547"
      ],
      "dom": [
        "电力电子拓扑(LLC/DCAC/DCDC)",
        "光伏MPPT",
        "PCS并网/离网"
      ],
      "soft": [
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-gdw-inv",
    "company": "固德威",
    "role": "储能逆变器软件工程师",
    "cat": "光伏",
    "req": [
      "户用/工商业储能逆变器软件开发",
      "并离网切换与能量管理策略",
      "电池/BMS 通信与保护逻辑",
      "云平台对接与 OTA"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus",
        "OCPP"
      ],
      "lang": [
        "C/C++",
        "Python"
      ],
      "hw": [
        "DSP(TI C2000)",
        "ARM/STM32",
        "RTOS",
        "Linux"
      ],
      "std": [
        "IEEE 1547"
      ],
      "dom": [
        "电力电子拓扑(LLC/DCAC/DCDC)",
        "光伏MPPT",
        "PCS并网/离网",
        "EMS能量管理"
      ],
      "soft": [
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-tw-cell",
    "company": "通威股份",
    "role": "电池片工艺工程师",
    "cat": "光伏",
    "req": [
      "太阳能电池片(PECVD/丝网印刷等)工艺开发",
      "良率提升与制程异常分析",
      "工艺 DOE 与 SPC 管控",
      "量产爬坡支持"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "SQL"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [
        "ISO 9001"
      ],
      "dom": [
        "光伏MPPT",
        "电芯工艺/制造"
      ],
      "soft": [
        "产线/工艺工程",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-gf-mc",
    "company": "金风科技",
    "role": "风机主控工程师",
    "cat": "风电",
    "req": [
      "风电机组主控系统软件设计与开发",
      "转矩/转速控制、对风与载荷优化",
      "CAN/Modbus 与变桨/变流通信",
      "故障诊断与现场调试"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS",
        "DSP(TI C2000)"
      ],
      "std": [
        "IEC 61400"
      ],
      "dom": [
        "风电主控/变桨",
        "电机控制",
        "控制理论"
      ],
      "soft": [
        "现场调试/出差",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-my-wind",
    "company": "明阳智能",
    "role": "风电机组控制工程师",
    "cat": "风电",
    "req": [
      "大型风机整机控制策略研发",
      "独立变桨、载荷抑制与并网优化",
      "硬件在环(HIL)与仿真验证",
      "现场问题定位与算法迭代"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS",
        "DSP(TI C2000)"
      ],
      "std": [
        "IEC 61400"
      ],
      "dom": [
        "风电主控/变桨",
        "电机控制",
        "控制理论",
        "数字孪生/仿真"
      ],
      "soft": [
        "算法/建模",
        "现场调试/出差"
      ]
    }
  },
  {
    "id": "jd-zc-blade",
    "company": "中材科技",
    "role": "叶片设计工程师",
    "cat": "风电",
    "req": [
      "风电叶片气动/结构设计与优化",
      "复合材料铺层与有限元分析",
      "载荷与疲劳寿命校核",
      "模具与工艺协同"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "AutoCAD/EPLAN"
      ],
      "std": [
        "IEC 61400",
        "GL 认证"
      ],
      "dom": [
        "有限元/热仿真",
        "风电主控/变桨"
      ],
      "soft": [
        "跨部门协调"
      ]
    }
  },
  {
    "id": "jd-yd-pitch",
    "company": "运达股份",
    "role": "变桨控制工程师",
    "cat": "风电",
    "req": [
      "变桨系统控制软件与驱动设计",
      "顺桨保护、载荷均衡与故障容错",
      "与主控 CAN 通信与同步",
      "现场调试与备件支持"
    ],
    "skills": {
      "proto": [
        "CAN"
      ],
      "lang": [
        "C/C++"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "IEC 61400"
      ],
      "dom": [
        "风电主控/变桨",
        "电机控制"
      ],
      "soft": [
        "现场调试/出差",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-sy-wind",
    "company": "三一重能",
    "role": "风电整机电气工程师",
    "cat": "风电",
    "req": [
      "风电机组电气系统(变流/变桨/主控)集成",
      "电气原理图与 BOM 设计",
      "EMC/安规与并网测试",
      "产线支持与现场问题处理"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus"
      ],
      "lang": [
        "C/C++",
        "Verilog"
      ],
      "hw": [
        "DSP(TI C2000)",
        "ARM/STM32",
        "FPGA/CPLD"
      ],
      "std": [
        "IEC 61400",
        "IEEE 1547"
      ],
      "dom": [
        "风电主控/变桨",
        "电力电子拓扑(LLC/DCAC/DCDC)"
      ],
      "soft": [
        "跨部门协调",
        "产线/工艺工程",
        "现场调试/出差"
      ]
    }
  },
  {
    "id": "jd-star-igbt",
    "company": "斯达半导",
    "role": "IGBT 模块应用工程师",
    "cat": "功率半导体",
    "req": [
      "IGBT/SiC 功率模块应用方案设计",
      "逆变器/电控客户技术支持和评估板调试",
      "并联均流、驱动与保护设计",
      "失效分析与可靠性评估"
    ],
    "skills": {
      "proto": [
        "CAN"
      ],
      "lang": [
        "C/C++"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪"
      ],
      "std": [
        "IEC 60747",
        "AEC-Q101"
      ],
      "dom": [
        "功率器件(SiC/IGBT)",
        "电力电子拓扑(LLC/DCAC/DCDC)"
      ],
      "soft": [
        "技术售前/支持",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-crrc-power",
    "company": "中车时代电气",
    "role": "功率半导体器件工程师",
    "cat": "功率半导体",
    "req": [
      "IGBT/SiC 芯片与器件设计/工艺开发",
      "晶圆工艺、封装与可靠性验证",
      "器件建模与测试表征",
      "产线良率提升"
    ],
    "skills": {
      "proto": [
        "Verilog"
      ],
      "lang": [
        "Python",
        "C/C++"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪"
      ],
      "std": [
        "IEC 60747",
        "AEC-Q101"
      ],
      "dom": [
        "功率器件(SiC/IGBT)",
        "半导体器件"
      ],
      "soft": [
        "产线/工艺工程",
        "算法/建模"
      ]
    }
  },
  {
    "id": "jd-byc-sic",
    "company": "比亚迪半导体",
    "role": "SiC 功率模块工程师",
    "cat": "功率半导体",
    "req": [
      "车规 SiC 功率模块研发与封装",
      "车规可靠性(AEC-Q)与电性能验证",
      "与电控/充电桩客户协同",
      "量产导入"
    ],
    "skills": {
      "proto": [
        "CAN"
      ],
      "lang": [
        "C/C++"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪"
      ],
      "std": [
        "AEC-Q101",
        "IEC 60747"
      ],
      "dom": [
        "功率器件(SiC/IGBT)",
        "半导体器件"
      ],
      "soft": [
        "产线/工艺工程",
        "可靠性/DFMEA"
      ]
    }
  },
  {
    "id": "jd-silan-device",
    "company": "士兰微",
    "role": "功率器件研发工程师",
    "cat": "功率半导体",
    "req": [
      "MOSFET/IGBT 器件研发与工艺集成",
      "晶圆流片、测试与器件建模",
      "可靠性与失效分析",
      "中试放大"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "C/C++"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪"
      ],
      "std": [
        "IEC 60747",
        "AEC-Q101"
      ],
      "dom": [
        "功率器件(SiC/IGBT)",
        "半导体器件"
      ],
      "soft": [
        "产线/工艺工程"
      ]
    }
  },
  {
    "id": "jd-nce-mos",
    "company": "新洁能",
    "role": "MOSFET 应用工程师",
    "cat": "功率半导体",
    "req": [
      "高压/超结 MOSFET 应用方案设计",
      "客户评估板调试与技术支持",
      "驱动、散热与 EMI 优化",
      "竞品对标"
    ],
    "skills": {
      "proto": [
        "CAN"
      ],
      "lang": [
        "C/C++"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪"
      ],
      "std": [
        "IEC 60747"
      ],
      "dom": [
        "功率器件(SiC/IGBT)",
        "电力电子拓扑(LLC/DCAC/DCDC)"
      ],
      "soft": [
        "技术售前/支持"
      ]
    }
  },
  {
    "id": "jd-byc-evse",
    "company": "比亚迪",
    "role": "充电桩嵌入式软件工程师",
    "cat": "充电桩/换电",
    "req": [
      "充电枪/桩嵌入式软件全流程开发(需求→架构→编码→量产)",
      "充电协议(CAN / Modbus / GB-T 27930 / CCS)解析与车桩/BMS/云交互",
      "全场景保护逻辑：过压/过流/过温/短路/绝缘/反接",
      "4G/以太网/CAN 通讯、远程 OTA、后台平台对接"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus",
        "GB/T 27930",
        "CCS",
        "OCPP",
        "DL/T 645",
        "PLC/HPLC"
      ],
      "lang": [
        "C/C++",
        "Python"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS",
        "Linux"
      ],
      "std": [
        "GB/T 27930",
        "GB/T 18487"
      ],
      "dom": [
        "BMS控制策略",
        "PCS并网/离网"
      ],
      "soft": [
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-evse-chg",
    "company": "特来电·星星充电",
    "role": "充电桩嵌入式软件(充电方向)",
    "cat": "充电桩/换电",
    "req": [
      "充电桩软件开发与车桩兼容性构筑",
      "BMS 业务开发、控制导引与控制时序",
      "熟悉国标 27930 / 欧标 15118 / CHAdeMO 中一个或多个",
      "RTOS / Linux 系统、多线程、外设驱动设计"
    ],
    "skills": {
      "proto": [
        "CAN",
        "GB/T 27930",
        "ISO 15118",
        "CHAdeMO",
        "OCPP",
        "Modbus"
      ],
      "lang": [
        "C/C++"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS",
        "Linux"
      ],
      "std": [
        "GB/T 27930",
        "GB/T 18487"
      ],
      "dom": [
        "BMS控制策略",
        "PCS并网/离网"
      ],
      "soft": []
    }
  },
  {
    "id": "jd-nio-swap",
    "company": "蔚来",
    "role": "换电系统软件工程师",
    "cat": "充电桩/换电",
    "req": [
      "换电站控制系统与调度软件研发",
      "车辆识别、电池调度与换电时序控制",
      "与云端/车辆/电池 BMS 通信",
      "高可用与故障自愈设计"
    ],
    "skills": {
      "proto": [
        "CAN",
        "GB/T 27930",
        "MQTT"
      ],
      "lang": [
        "C/C++",
        "Python",
        "Go"
      ],
      "hw": [
        "ARM/STM32",
        "Linux",
        "RTOS"
      ],
      "std": [
        "GB/T 27930",
        "GB/T 18487"
      ],
      "dom": [
        "BMS控制策略",
        "EMS能量管理"
      ],
      "soft": [
        "现场调试/出差",
        "项目管理"
      ]
    }
  },
  {
    "id": "jd-ado-swap",
    "company": "奥动新能源",
    "role": "换电设备控制工程师",
    "cat": "充电桩/换电",
    "req": [
      "换电设备(加解锁/转运/存储)控制开发",
      "PLC/运动控制与视觉定位集成",
      "安全联锁与异常处理",
      "现场调试与运维支持"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus",
        "PROFINET",
        "EtherCAT"
      ],
      "lang": [
        "C/C++",
        "Python"
      ],
      "hw": [
        "PLC/变频器",
        "ARM/STM32"
      ],
      "std": [
        "GB/T 27930"
      ],
      "dom": [
        "电机控制",
        "控制理论"
      ],
      "soft": [
        "现场调试/出差",
        "产线/工艺工程"
      ]
    }
  },
  {
    "id": "jd-xj-platform",
    "company": "小桔充电",
    "role": "充电运营平台开发",
    "cat": "充电桩/换电",
    "req": [
      "充电运营/计费/监控平台后端开发",
      "设备接入(MQTT/104/OCPP)与高并发处理",
      "订单、结算与互联互通(互联互通协议)",
      "数据看板与运营分析"
    ],
    "skills": {
      "proto": [
        "OCPP",
        "MQTT",
        "IEC 60870-5-104"
      ],
      "lang": [
        "Go",
        "Java",
        "Python"
      ],
      "hw": [
        "Linux"
      ],
      "std": [
        "GB/T 27930"
      ],
      "dom": [
        "EMS能量管理",
        "数字孪生/仿真"
      ],
      "soft": [
        "数据/SQL",
        "团队管理"
      ]
    }
  },
  {
    "id": "jd-spcs",
    "company": "微网 / SPPC 集成商",
    "role": "微网·SPPC 站控工程师",
    "cat": "微网/虚拟电厂",
    "req": [
      "站级协调控制(SPPC)，多子阵功率分配",
      "并离网切换、调度指令响应与 fail-safe",
      "拉通 PCS / BMS / EMS 与调度通信",
      "系统级与场景级问题定位"
    ],
    "skills": {
      "proto": [
        "Modbus",
        "IEC 60870-5-104",
        "IEC 61850",
        "MQTT"
      ],
      "lang": [
        "C/C++",
        "Python"
      ],
      "hw": [
        "Linux",
        "RTOS"
      ],
      "std": [
        "IEEE 1547"
      ],
      "dom": [
        "微网/SPPC协调",
        "PCS并网/离网",
        "EMS能量管理",
        "一次/二次调频",
        "对称分量/电能质量"
      ],
      "soft": [
        "跨部门协调",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-vpp-ops",
    "company": "国网综能·南网综能",
    "role": "虚拟电厂运营工程师",
    "cat": "微网/虚拟电厂",
    "req": [
      "虚拟电厂资源聚合与调度策略设计",
      "需求响应(DR)/辅助服务交易执行",
      "与调度/负荷/储能通信(104/61850/MQTT)",
      "聚合容量评估与收益测算"
    ],
    "skills": {
      "proto": [
        "IEC 60870-5-104",
        "IEC 61850",
        "MQTT"
      ],
      "lang": [
        "Python",
        "Go"
      ],
      "hw": [
        "Linux"
      ],
      "std": [
        "IEEE 1547"
      ],
      "dom": [
        "微网/SPPC协调",
        "EMS能量管理",
        "一次/二次调频",
        "预测/优化算法"
      ],
      "soft": [
        "数据/SQL",
        "项目管理"
      ]
    }
  },
  {
    "id": "jd-xinao-ies",
    "company": "新奥",
    "role": "综合能源系统工程师",
    "cat": "微网/虚拟电厂",
    "req": [
      "园区综合能源(光储充热)系统规划",
      "多能互补优化与能量管理",
      "仿真建模与经济运行分析",
      "客户方案与交付"
    ],
    "skills": {
      "proto": [
        "Modbus",
        "IEC 61850",
        "MQTT"
      ],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "Linux"
      ],
      "std": [
        "IEEE 1547"
      ],
      "dom": [
        "EMS能量管理",
        "微网/SPPC协调",
        "数字孪生/仿真",
        "预测/优化算法"
      ],
      "soft": [
        "跨部门协调",
        "技术售前/支持"
      ]
    }
  },
  {
    "id": "jd-yj-ens",
    "company": "远景智能",
    "role": "能量管理软件(ENS)工程师",
    "cat": "微网/虚拟电厂",
    "req": [
      "EnOS 能源物联平台能量管理应用开发",
      "风光储协同优化与预测接入",
      "时序数据/数字孪生建模",
      "客户交付与算法迭代"
    ],
    "skills": {
      "proto": [
        "MQTT",
        "IEC 60870-5-104",
        "Modbus"
      ],
      "lang": [
        "Python",
        "Go",
        "Java"
      ],
      "hw": [
        "Linux"
      ],
      "std": [
        "IEEE 1547"
      ],
      "dom": [
        "EMS能量管理",
        "微网/SPPC协调",
        "数字孪生/仿真",
        "预测/优化算法"
      ],
      "soft": [
        "算法/建模",
        "数据/SQL"
      ]
    }
  },
  {
    "id": "jd-xj-proto",
    "company": "许继电气",
    "role": "电力通信协议开发工程师(主站方向)",
    "cat": "电网通信",
    "req": [
      "IEC 60870-5-101/104、DNP3.0、IEC 61850(MMS/GOOSE/SV) 规约开发/移植/调试",
      "电力终端经 MQTT 等物联网协议接入云平台",
      "终端与各级配网/调度/监控主站接入联调、四遥标准化",
      "现场通信中断/数据异常根因分析(RCA)、Wireshark 报文分析"
    ],
    "skills": {
      "proto": [
        "IEC 61850",
        "IEC 60870-5-104",
        "IEC 60870-5-101",
        "Modbus",
        "DNP3.0",
        "MQTT"
      ],
      "lang": [
        "C/C++",
        "Python",
        "Go"
      ],
      "hw": [
        "Linux"
      ],
      "std": [
        "IEC 61850",
        "电力二次安防"
      ],
      "dom": [
        "对称分量/电能质量",
        "微网/SPPC协调"
      ],
      "soft": [
        "RCA根因分析",
        "现场调试/出差",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-pv-scada",
    "company": "光伏电站",
    "role": "SCADA 及通信工程师",
    "cat": "电网通信",
    "req": [
      "光伏电站 SCADA / 服务器 / 工业通信网运行维护",
      "通信链路故障诊断(RS485 / 工业以太网 / 光纤 / 无线)",
      "规约转换器、工业交换机/路由器/防火墙配置维护",
      "技术文件、维护计划与故障分析报告编写"
    ],
    "skills": {
      "proto": [
        "IEC 60870-5-104",
        "IEC 60870-5-101",
        "Modbus",
        "DL/T 645"
      ],
      "lang": [
        "Python",
        "C/C++"
      ],
      "hw": [
        "Linux"
      ],
      "std": [],
      "dom": [
        "对称分量/电能质量",
        "微网/SPPC协调"
      ],
      "soft": [
        "测试报告/文档",
        "现场调试/出差"
      ]
    }
  },
  {
    "id": "jd-nari-dispatch",
    "company": "国电南瑞",
    "role": "调度自动化工程师",
    "cat": "电网通信",
    "req": [
      "调度自动化系统(EMS/DMS)开发与维护",
      "AGC/AVC、状态估计、网络建模",
      "IEC 104/61850 与主站/子站联调",
      "电网运行数据分析与告警"
    ],
    "skills": {
      "proto": [
        "IEC 61850",
        "IEC 60870-5-104",
        "DNP3.0",
        "Modbus"
      ],
      "lang": [
        "C/C++",
        "Python",
        "Go"
      ],
      "hw": [
        "Linux"
      ],
      "std": [
        "IEC 61850",
        "电力二次安防"
      ],
      "dom": [
        "对称分量/电能质量",
        "一次/二次调频",
        "微网/SPPC协调"
      ],
      "soft": [
        "数据/SQL",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-pg-61850",
    "company": "平高·特变",
    "role": "变电站通信(IEC61850)工程师",
    "cat": "电网通信",
    "req": [
      "智能变电站 IEC 61850 建模(SCD/CID)与调试",
      "MMS/GOOSE/SV 配置与报文分析",
      "继保/测控装置通信联调",
      "工程现场实施与验收"
    ],
    "skills": {
      "proto": [
        "IEC 61850",
        "IEC 60870-5-104",
        "Modbus"
      ],
      "lang": [
        "C/C++",
        "Python"
      ],
      "hw": [
        "Linux"
      ],
      "std": [
        "IEC 61850",
        "电力二次安防"
      ],
      "dom": [
        "对称分量/电能质量"
      ],
      "soft": [
        "现场调试/出差",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-sion-relay",
    "company": "思源电气",
    "role": "继保通信工程师",
    "cat": "电网通信",
    "req": [
      "继电保护装置通信与网络化保护开发",
      "IEC 61850 GOOSE/SV 应用与测试",
      "故障录波与报文分析",
      "现场调试与标准符合性验证"
    ],
    "skills": {
      "proto": [
        "IEC 61850",
        "IEC 60870-5-104"
      ],
      "lang": [
        "C/C++",
        "Python"
      ],
      "hw": [
        "ARM/STM32",
        "Linux"
      ],
      "std": [
        "IEC 61850",
        "电力二次安防"
      ],
      "dom": [
        "对称分量/电能质量"
      ],
      "soft": [
        "现场调试/出差",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-tbea-trans",
    "company": "特变电工",
    "role": "变压器/电抗器设计工程师",
    "cat": "电力设备",
    "req": [
      "电力变压器/电抗器电磁与结构设计",
      "绝缘、温升与短路强度计算",
      "BOM 与可制造性设计",
      "型式试验对接"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "AutoCAD/EPLAN"
      ],
      "std": [
        "GB 1094",
        "IEC 60076"
      ],
      "dom": [
        "有限元/热仿真"
      ],
      "soft": [
        "跨部门协调",
        "可靠性/DFMEA"
      ]
    }
  },
  {
    "id": "jd-xd-gis",
    "company": "中国西电",
    "role": "高压开关/GIS 工程师",
    "cat": "电力设备",
    "req": [
      "GIS/高压开关产品设计",
      "绝缘与开断性能仿真",
      "操动机构与控制回路设计",
      "试验与工程交付"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "AutoCAD/EPLAN"
      ],
      "std": [
        "GB 1984",
        "IEC 62271"
      ],
      "dom": [
        "有限元/热仿真",
        "半导体器件"
      ],
      "soft": [
        "产线/工艺工程",
        "现场调试/出差"
      ]
    }
  },
  {
    "id": "jd-sion-power",
    "company": "思源电气",
    "role": "电力电子(SVG/APF)工程师",
    "cat": "电力设备",
    "req": [
      "静止无功发生器(SVG)/有源滤波(APF)研发",
      "无功补偿与电能质量治理算法",
      "并网控制与谐波抑制",
      "HIL 与现场调试"
    ],
    "skills": {
      "proto": [
        "Modbus"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "DSP(TI C2000)",
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "IEEE 1547",
        "GB/T 14549·12325"
      ],
      "dom": [
        "电力电子拓扑(LLC/DCAC/DCDC)",
        "对称分量/电能质量"
      ],
      "soft": [
        "现场调试/出差",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-nari-prot",
    "company": "国电南瑞",
    "role": "继电保护工程师",
    "cat": "电力设备",
    "req": [
      "线路/变压器/母线保护装置研发",
      "保护算法(差动/距离/零序)与逻辑实现",
      "故障仿真与定值整定",
      "标准符合性与型式试验"
    ],
    "skills": {
      "proto": [
        "IEC 61850"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "DSP(TI C2000)",
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "IEC 61850",
        "电力二次安防"
      ],
      "dom": [
        "对称分量/电能质量"
      ],
      "soft": [
        "RCA根因分析",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-oem-vcu",
    "company": "蔚来·小鹏·理想",
    "role": "整车 BMS / VCU 工程师",
    "cat": "整车/三电",
    "req": [
      "整车 BMS / VCU 软件开发与整车控制策略",
      "CAN / CANoe 标定与总线开发",
      "功能安全(ISO 26262)与 ASPICE 流程",
      "跨部门(三电 / 整车 / 测试)协调"
    ],
    "skills": {
      "proto": [
        "CAN",
        "CANoe/CANalyzer",
        "SAE J1939"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "DSP(TI C2000)",
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "ISO 26262 功能安全",
        "ASPICE"
      ],
      "dom": [
        "BMS控制策略",
        "SOC/SOH估算",
        "电池电化学"
      ],
      "soft": [
        "跨部门协调"
      ]
    }
  },
  {
    "id": "jd-byc-trielec",
    "company": "比亚迪",
    "role": "三电系统集成工程师",
    "cat": "整车/三电",
    "req": [
      "电池/电机/电控三电系统集成与匹配",
      "整车能量管理与热管理策略",
      "CAN 总线网络设计与标定",
      "功能安全与整车联调"
    ],
    "skills": {
      "proto": [
        "CAN",
        "CANoe/CANalyzer",
        "SAE J1939"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS",
        "DSP(TI C2000)"
      ],
      "std": [
        "ISO 26262 功能安全",
        "ASPICE",
        "GB 38031"
      ],
      "dom": [
        "BMS控制策略",
        "SOC/SOH估算",
        "电机控制",
        "电池电化学"
      ],
      "soft": [
        "跨部门协调",
        "项目管理"
      ]
    }
  },
  {
    "id": "jd-gac-batt",
    "company": "广汽埃安",
    "role": "电池系统工程师",
    "cat": "整车/三电",
    "req": [
      "动力电池包系统设计与集成",
      "热管理/安全与 BMS 协同",
      "整车适配与标定",
      "验证计划与问题解决"
    ],
    "skills": {
      "proto": [
        "CAN",
        "CANoe/CANalyzer"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "ISO 26262 功能安全",
        "GB 38031"
      ],
      "dom": [
        "BMS控制策略",
        "SOC/SOH估算",
        "电池电化学",
        "有限元/热仿真"
      ],
      "soft": [
        "跨部门协调",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-xiaomi-trielec",
    "company": "小米汽车",
    "role": "三电控制工程师",
    "cat": "整车/三电",
    "req": [
      "三电域控制器软件与整车控制策略",
      "高低压架构与充电(含 800V)控制",
      "功能安全(ISO 26262)与 ASPICE",
      "HIL/台架与整车联调"
    ],
    "skills": {
      "proto": [
        "CAN",
        "CANoe/CANalyzer",
        "SAE J1939"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS",
        "DSP(TI C2000)"
      ],
      "std": [
        "ISO 26262 功能安全",
        "ASPICE",
        "GB 38031"
      ],
      "dom": [
        "BMS控制策略",
        "SOC/SOH估算",
        "电机控制"
      ],
      "soft": [
        "跨部门协调",
        "算法/建模"
      ]
    }
  },
  {
    "id": "jd-hw-autodomain",
    "company": "华为车BU",
    "role": "动力域控制工程师",
    "cat": "整车/三电",
    "req": [
      "动力域控制器(电机/电池/整车)软件架构",
      "多合一电控与整车能量管理",
      "功能安全与 AUTOSAR 落地",
      "算法与平台化设计"
    ],
    "skills": {
      "proto": [
        "CAN",
        "CANoe/CANalyzer",
        "SAE J1939"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "ISO 26262 功能安全",
        "ASPICE"
      ],
      "dom": [
        "BMS控制策略",
        "电机控制",
        "电池电化学"
      ],
      "soft": [
        "算法/建模",
        "团队管理"
      ]
    }
  },
  {
    "id": "jd-yht-fuelcell",
    "company": "亿华通",
    "role": "燃料电池系统工程师",
    "cat": "氢能",
    "req": [
      "氢燃料电池发动机系统设计与集成",
      "电堆/空压机/氢循环/BOP 匹配",
      "控制策略(启停/功率分配/热管理)",
      "台架与整车联调"
    ],
    "skills": {
      "proto": [
        "CAN",
        "CANoe/CANalyzer"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS",
        "DSP(TI C2000)"
      ],
      "std": [
        "ISO 26262 功能安全",
        "GB/T 24554"
      ],
      "dom": [
        "燃料电池/电堆",
        "电机控制",
        "控制理论",
        "电池电化学"
      ],
      "soft": [
        "现场调试/出差",
        "跨部门协调"
      ]
    }
  },
  {
    "id": "jd-weichai-h2",
    "company": "潍柴动力",
    "role": "氢燃料电池研发工程师",
    "cat": "氢能",
    "req": [
      "燃料电池系统与关键部件研发",
      "电堆衰减机理与寿命提升",
      "系统集成与整车应用",
      "前沿技术(氨/固态)跟踪"
    ],
    "skills": {
      "proto": [
        "CAN"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink",
        "Python"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "ISO 26262 功能安全"
      ],
      "dom": [
        "燃料电池/电堆",
        "电池电化学"
      ],
      "soft": [
        "产线/工艺工程",
        "算法/建模"
      ]
    }
  },
  {
    "id": "jd-guohong-stack",
    "company": "国鸿氢能",
    "role": "电堆研发工程师",
    "cat": "氢能",
    "req": [
      "燃料电池电堆设计与开发",
      "双极板/膜电极(MEA)与密封设计",
      "性能/寿命/水热管理优化",
      "中试与量产工艺"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "电化学工作站/粒度仪",
        "AutoCAD/EPLAN"
      ],
      "std": [
        "GB/T 24554"
      ],
      "dom": [
        "燃料电池/电堆",
        "电池电化学"
      ],
      "soft": [
        "产线/工艺工程"
      ]
    }
  },
  {
    "id": "jd-refire-ctrl",
    "company": "重塑科技",
    "role": "燃料电池控制工程师",
    "cat": "氢能",
    "req": [
      "燃料电池发动机控制器与 BOP 控制",
      "空压机/氢泵/电子节温控制策略",
      "CAN 通信与故障诊断",
      "HIL 与整车标定"
    ],
    "skills": {
      "proto": [
        "CAN",
        "CANoe/CANalyzer"
      ],
      "lang": [
        "C/C++",
        "MATLAB/Simulink"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS",
        "DSP(TI C2000)"
      ],
      "std": [
        "ISO 26262 功能安全"
      ],
      "dom": [
        "燃料电池/电堆",
        "电机控制",
        "控制理论"
      ],
      "soft": [
        "测试报告/文档",
        "现场调试/出差"
      ]
    }
  },
  {
    "id": "jd-jh-h2sys",
    "company": "捷氢科技",
    "role": "氢系统工程师",
    "cat": "氢能",
    "req": [
      "氢系统设计(储氢/供氢/安全)",
      "氢安全、泄漏检测与吹扫逻辑",
      "与燃料电池系统联调",
      "标准与认证对接"
    ],
    "skills": {
      "proto": [
        "CAN"
      ],
      "lang": [
        "C/C++",
        "Python"
      ],
      "hw": [
        "ARM/STM32",
        "RTOS"
      ],
      "std": [
        "ISO 26262 功能安全",
        "GB/T 24554"
      ],
      "dom": [
        "燃料电池/电堆"
      ],
      "soft": [
        "标准/认证",
        "现场调试/出差"
      ]
    }
  },
  {
    "id": "jd-yj-ess",
    "company": "远景能源",
    "role": "ESS 系统测试工程师",
    "cat": "测试/认证",
    "req": [
      "电池舱 + PCS + EMS + BMS 整柜联调(功能/性能/安全保护)",
      "出厂测试与报告，现场并网调试配合",
      "读报文(CAN / Modbus TCP)、跑功率曲线、用示波器/功率分析仪/录波仪",
      "问题反推：BMS 采样漂移 / PCS 谐波 / EMS 策略下发"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus",
        "IEC 61850",
        "IEC 60870-5-104"
      ],
      "lang": [
        "Python",
        "C/C++"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪"
      ],
      "std": [
        "GB/T 14549·12325",
        "IEEE 1547"
      ],
      "dom": [
        "PCS并网/离网",
        "EMS能量管理",
        "BMS控制策略",
        "对称分量/电能质量",
        "一次/二次调频"
      ],
      "soft": [
        "测试报告/文档",
        "现场调试/出差",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-yj-lab",
    "company": "远景能源",
    "role": "电池储能实验室测试工程师",
    "cat": "测试/认证",
    "req": [
      "扣式电池制作与测试",
      "仪器操作维护：激光粒度仪 / 电化学工作站(EIS) / KF 水分 / 流变仪",
      "协助开发新的分析测试方法、优化测试准确性",
      "锂电公司或研究所分析检测中心经历"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "电化学工作站/粒度仪"
      ],
      "std": [],
      "dom": [
        "电池电化学",
        "SOC/SOH估算"
      ],
      "soft": [
        "英语/日语",
        "测试报告/文档"
      ]
    }
  },
  {
    "id": "jd-ess-fa",
    "company": "储能集成商",
    "role": "储能系统现场调试工程师",
    "cat": "测试/认证",
    "req": [
      "储能集装箱 / 柜现场调试，BMS / PCS / EMS 联调",
      "并网测试配合(电压/频率/电能质量)",
      "编制现场调试方案、组织调试实施",
      "编制调试 / 故障分析报告"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus",
        "IEC 61850",
        "IEC 60870-5-104"
      ],
      "lang": [
        "Python",
        "C/C++"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪",
        "ARM/STM32"
      ],
      "std": [
        "GB/T 14549·12325"
      ],
      "dom": [
        "PCS并网/离网",
        "BMS控制策略",
        "EMS能量管理",
        "对称分量/电能质量"
      ],
      "soft": [
        "现场调试/出差",
        "测试报告/文档",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-tuv-cert",
    "company": "TÜV·鉴衡",
    "role": "储能产品认证工程师",
    "cat": "测试/认证",
    "req": [
      "储能电池/系统国际国内认证(UL 1973 / UL 9540A / IEC 62619 / GB)",
      "测试计划、目击与报告编制",
      "标准解读与客户技术辅导",
      "工厂审核与不符合项闭环"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "SQL"
      ],
      "hw": [],
      "std": [
        "UL 1973",
        "UL 9540A",
        "IEC 62619",
        "GB/T 36276",
        "UN 38.3"
      ],
      "dom": [
        "电池电化学",
        "BMS控制策略"
      ],
      "soft": [
        "标准/认证",
        "英语/日语",
        "技术售前/支持"
      ]
    }
  },
  {
    "id": "jd-catarc-safety",
    "company": "中汽研",
    "role": "电池安全测试工程师",
    "cat": "测试/认证",
    "req": [
      "动力电池/储能电池安全测试(热失控/针刺/过充)",
      "试验方案设计与数据判定",
      "失效机理分析与报告",
      "标准符合性研究"
    ],
    "skills": {
      "proto": [],
      "lang": [
        "Python",
        "MATLAB/Simulink"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪"
      ],
      "std": [
        "GB 38031",
        "GB/T 36276",
        "UN 38.3"
      ],
      "dom": [
        "电池电化学",
        "BMS控制策略"
      ],
      "soft": [
        "测试报告/文档",
        "RCA根因分析"
      ]
    }
  },
  {
    "id": "jd-grg-emc",
    "company": "广电计量",
    "role": "EMC 测试工程师",
    "cat": "测试/认证",
    "req": [
      "新能源产品 EMC/安规测试(辐射/传导/浪涌/EFT)",
      "测试方案与整改建议",
      "仪器操作与不确定度管理",
      "报告编制与客户沟通"
    ],
    "skills": {
      "proto": [
        "CAN",
        "Modbus"
      ],
      "lang": [
        "Python"
      ],
      "hw": [
        "示波器/功率分析仪/录波仪"
      ],
      "std": [
        "GB/T 17626",
        "CISPR",
        "IEC 61000"
      ],
      "dom": [
        "电力电子拓扑(LLC/DCAC/DCDC)"
      ],
      "soft": [
        "测试报告/文档",
        "技术售前/支持"
      ]
    }
  },
  {
    "id": "jd-ai-forecast",
    "company": "新能源企业·AI 团队",
    "role": "功率预测算法工程师",
    "cat": "数字化/算法",
    "req": [
      "光伏/风电出力与负荷短期/超短期预测",
      "时序模型(统计/机器学习/深度学习)研发",
      "气象数据融合与特征工程",
      "预测精度评估与业务落地"
    ],
    "skills": {
      "proto": [
        "MQTT"
      ],
      "lang": [
        "Python",
        "SQL",
        "Go"
      ],
      "hw": [
        "Linux"
      ],
      "std": [],
      "dom": [
        "预测/优化算法",
        "数字孪生/仿真"
      ],
      "soft": [
        "机器学习/AI",
        "数据/SQL",
        "算法/建模"
      ]
    }
  },
  {
    "id": "jd-dt-sim",
    "company": "系统集成商",
    "role": "数字孪生/仿真工程师",
    "cat": "数字化/算法",
    "req": [
      "风光储微网数字孪生建模与仿真",
      "系统级控制策略离线验证",
      "实时仿真(HIL/RT-LAB)搭建",
      "仿真平台与业务系统集成"
    ],
    "skills": {
      "proto": [
        "Modbus",
        "IEC 61850"
      ],
      "lang": [
        "Python",
        "MATLAB/Simulink",
        "C/C++"
      ],
      "hw": [
        "Linux",
        "FPGA/CPLD"
      ],
      "std": [],
      "dom": [
        "数字孪生/仿真",
        "微网/SPPC协调",
        "EMS能量管理",
        "预测/优化算法"
      ],
      "soft": [
        "算法/建模"
      ]
    }
  },
  {
    "id": "jd-data-platform",
    "company": "能源科技公司",
    "role": "能源大数据平台工程师",
    "cat": "数字化/算法",
    "req": [
      "能源/设备时序数据平台(采集/存储/计算)开发",
      "数据治理、指标计算与可视化",
      "与 SCADA/EMS/MQTT 对接",
      "性能优化与稳定性保障"
    ],
    "skills": {
      "proto": [
        "MQTT",
        "IEC 60870-5-104",
        "Modbus"
      ],
      "lang": [
        "Go",
        "Java",
        "Python"
      ],
      "hw": [
        "Linux"
      ],
      "std": [],
      "dom": [
        "EMS能量管理",
        "数字孪生/仿真"
      ],
      "soft": [
        "数据/SQL",
        "团队管理"
      ]
    }
  },
  {
    "id": "jd-overseas-cert",
    "company": "出海企业·海外事业部",
    "role": "国际认证工程师",
    "cat": "海外业务",
    "req": [
      "海外市场准入认证(UL / IEEE 1547 / CE / VDE / G99)",
      "标准解读、测试对接与合规文档",
      "海外项目技术资料本地化",
      "认证项目进度与客户沟通"
    ],
    "skills": {
      "proto": [
        "Modbus",
        "IEC 61850"
      ],
      "lang": [
        "Python",
        "English"
      ],
      "hw": [
        "Linux"
      ],
      "std": [
        "UL 1973",
        "UL 9540A",
        "IEEE 1547",
        "IEC 62477",
        "CE"
      ],
      "dom": [
        "PCS并网/离网",
        "EMS能量管理",
        "BMS控制策略"
      ],
      "soft": [
        "标准/认证",
        "英语/日语",
        "技术售前/支持"
      ]
    }
  },
  {
    "id": "jd-overseas-pre",
    "company": "出海企业·解决方案",
    "role": "海外技术售前/解决方案工程师",
    "cat": "海外业务",
    "req": [
      "海外客户光储充解决方案设计与宣讲",
      "招投标技术支持与方案编写",
      "现场勘测与系统配置",
      "跨部门(研发/交付)协同"
    ],
    "skills": {
      "proto": [
        "Modbus",
        "IEC 61850",
        "OCPP"
      ],
      "lang": [
        "Python",
        "English"
      ],
      "hw": [
        "Linux"
      ],
      "std": [
        "IEEE 1547",
        "IEC 62477"
      ],
      "dom": [
        "EMS能量管理",
        "微网/SPPC协调",
        "PCS并网/离网",
        "光伏MPPT"
      ],
      "soft": [
        "技术售前/支持",
        "英语/日语",
        "跨部门协调",
        "项目管理"
      ]
    }
  }
];
var JD_CATS=["全部", "BMS", "储能电芯", "储能系统", "充电桩/换电", "光伏", "功率半导体", "微网/虚拟电厂", "数字化/算法", "整车/三电", "氢能", "测试/认证", "海外业务", "电力设备", "电池材料", "电网通信", "风电"];
var JD_CAT='全部';
var JD_SEL={};
var JD_SKILL_CATS=[
  {k:'proto',t:'通信协议'},
  {k:'lang', t:'软件语言'},
  {k:'hw',   t:'硬件/工具'},
  {k:'std',  t:'标准规范'},
  {k:'dom',  t:'领域知识'},
  {k:'soft', t:'软技能'}
];
function jdAccColor(){try{return getComputedStyle(document.documentElement).getPropertyValue('--acc').trim()||'#FF8C42';}catch(e){return '#FF8C42';}}
function jdAllText(j){
  var t=j.company+' '+j.role+' '+j.cat;
  (j.req||[]).forEach(function(r){t+=' '+r;});
  JD_SKILL_CATS.forEach(function(c){(j.skills[c.k]||[]).forEach(function(s){t+=' '+s;});});
  return t.toLowerCase();
}
function renderJD(){
  document.getElementById('jd-cats').innerHTML=JD_CATS.map(function(c){
    return '<div class="tab'+(c===JD_CAT?' on':'')+'" onclick="jdCat(\''+c+'\')">'+c+'</div>';
  }).join('');
  var term=(document.getElementById('jd-search')||{value:''}).value.trim().toLowerCase();
  var list=JD_LIB.filter(function(j){
    var catOk=JD_CAT==='全部'||j.cat===JD_CAT;
    var termOk=!term || jdAllText(j).indexOf(term)>-1;
    return catOk && termOk;
  });
  var box=document.getElementById('jd-list');
  if(!list.length){box.innerHTML='<div class="rst-empty">没有匹配的岗位，换个关键词试试</div>';return;}
  box.innerHTML=list.map(function(j){
    var tags=JD_SKILL_CATS.map(function(c){
      var arr=j.skills[c.k]||[];
      if(!arr.length)return '';
      return '<div class="jd-taggrp"><span class="jd-taglabel">'+c.t+'</span>'+arr.map(function(s){return '<span class="jd-chip">'+s+'</span>';}).join('')+'</div>';
    }).join('');
    return '<div class="acc-item jd-item" id="'+j.id+'">'+
      '<div class="acc-h" onclick="acc(this)">'+
        '<label class="jd-check" onclick="event.stopPropagation()"><input type="checkbox" '+(JD_SEL[j.id]?'checked':'')+' onchange="jdToggle(this,\''+j.id+'\')"></label>'+
        '<span class="acc-cat">'+j.company+'</span>'+
        '<span class="acc-t">'+j.role+'</span>'+
        '<span class="jd-dom">'+j.cat+'</span>'+
        '<span class="acc-ar">▶</span>'+
      '</div>'+
      '<div class="acc-body"><ul class="jd-req">'+(j.req||[]).map(function(r){return '<li>'+r+'</li>';}).join('')+'</ul>'+
        '<div class="jd-tags">'+tags+'</div></div></div>';
  }).join('');
  jdUpdateBar();
}
function jdCat(c){JD_CAT=c;renderJD();}
function jdToggle(chk,id){JD_SEL[id]=chk.checked;jdUpdateBar();}
function jdUpdateBar(){
  var n=Object.keys(JD_SEL).filter(function(k){return JD_SEL[k];}).length;
  var el=document.getElementById('jd-bar-info');
  if(el)el.textContent='已选 '+n+' 个岗位'+(n?'（点击「生成能力图谱」对比共性）':'');
}
function jdClearSel(){JD_SEL={};renderJD();var a=document.getElementById('jd-analysis');if(a)a.style.display='none';}
function jdAnalyze(){
  var sel=JD_LIB.filter(function(j){return JD_SEL[j.id];});
  if(!sel.length){alert('请先在左侧岗位前勾选至少一个（可多选对比）');return;}
  var N=sel.length;
  var agg={};JD_SKILL_CATS.forEach(function(c){agg[c.k]={};});
  sel.forEach(function(j){JD_SKILL_CATS.forEach(function(c){(j.skills[c.k]||[]).forEach(function(s){agg[c.k][s]=(agg[c.k][s]||0)+1;});});});
  var common=[];
  JD_SKILL_CATS.forEach(function(c){Object.keys(agg[c.k]).forEach(function(s){if(agg[c.k][s]===N)common.push({cat:c.t,s:s});});});
  var html='';
  html+='<div class="jd-an-sum">已选 <b>'+N+'</b> 个岗位。'+
    (common.length?('跨岗位<b>共性能力</b>（全部岗位都要求）：'+common.map(function(x){return x.s;}).join('、')+'。'):'尚未出现全员共性能力，详见下方各维度分布与高频 Top。')+'</div>';
  JD_SKILL_CATS.forEach(function(c){
    var items=Object.keys(agg[c.k]).map(function(s){return {s:s,n:agg[c.k][s]};}).sort(function(a,b){return b.n-a.n;});
    if(!items.length)return;
    html+='<div class="jd-an-grp"><div class="jd-taglabel">'+c.t+'</div>';
    items.forEach(function(it){
      var pct=Math.round(it.n/N*100);
      html+='<div class="jd-an-bar"><div class="jd-an-name" title="'+it.s+'">'+it.s+'</div>'+
        '<div class="jd-an-track"><div class="jd-an-fill" style="width:'+pct+'%">'+it.n+'/'+N+'</div></div>'+
        (it.n===N?'<span class="jd-an-common">共性</span>':'')+'</div>';
    });
    html+='</div>';
  });
  var all=[];
  JD_SKILL_CATS.forEach(function(c){Object.keys(agg[c.k]).forEach(function(s){all.push({s:s,n:agg[c.k][s]});});});
  all.sort(function(a,b){return b.n-a.n;});
  var top=all.slice(0,12);
  html+='<div class="card-title" style="margin-top:14px"><div class="dot"></div>高频能力 Top '+(top.length)+'（跨所选岗位出现次数）</div>';
  html+='<div class="chart-wrap" style="height:320px"><canvas id="c-jd"></canvas></div>';
  html+='<div class="hint" style="margin-top:8px">说明：本库 JD 与能力标签整理自各企业公开招聘信息，用于求职准备与能力对标，具体以官方最新 JD 为准。</div>';
  var body=document.getElementById('jd-analysis-body');
  body.innerHTML=html;
  document.getElementById('jd-analysis').style.display='';
  var cv=document.getElementById('c-jd');
  if(cv){if(!cv._chart)cv._chart=new CanvasChart(cv.getContext('2d'),cv);cv._chart.hBar(top.map(function(x){return x.s;}),top.map(function(x){return x.n;}),top.map(function(){return jdAccColor();}));}
  var card=document.getElementById('jd-analysis');
  if(card&&card.scrollIntoView)card.scrollIntoView({behavior:'smooth',block:'start'});
}
window.renderJD=renderJD;window.jdCat=jdCat;window.jdToggle=jdToggle;window.jdAnalyze=jdAnalyze;window.jdClearSel=jdClearSel;

/* ====================================================================== */
/* 能力雷达图                                                            */
/* ====================================================================== */
var RADAR_DIMS=[
  {k:'dc',t:'数采(子阵级)',skills:['proto','dom'],w:[0.5,0.5]},
  {k:'sp',t:'SPPC(站级)',skills:['dom','proto'],w:[0.7,0.3]},
  {k:'sc',t:'场景广度',skills:['dom','soft'],w:[0.8,0.2]},
  {k:'cm',t:'协议与通信',skills:['proto'],w:[1.0]},
  {k:'au',t:'自动化/脚本',skills:['lang','hw'],w:[0.6,0.4]},
  {k:'doc',t:'文档与报告',skills:['soft'],w:[1.0]}
];
function buildRadarInputs(){
  document.getElementById('radar-inputs').innerHTML=RADAR_DIMS.map(function(d){
    return '<div class="lbl"><div class="lbl-txt">'+d.t+'</div><input type="number" id="rad_'+d.k+'" min="0" max="10" value="5" step="1"></div>';
  }).join('');
  var sel=document.getElementById('radar-target');
  if(sel && typeof JD_CATS!=='undefined'){
    var cur=sel.value;
    sel.innerHTML='<option value="">-- 不对比，仅自评 --</option><option value="__ALL__">全部岗位平均要求</option>'+
      JD_CATS.filter(function(c){return c!=='全部';}).map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
    sel.value=cur;
  }
}
function readRadar(){
  return RADAR_DIMS.map(function(d){var v=+document.getElementById('rad_'+d.k).value;return isNaN(v)?0:Math.max(0,Math.min(10,v));});
}
function getRadarTarget(cat){
  var list=JD_LIB;
  if(cat && cat!=='__ALL__') list=JD_LIB.filter(function(j){return j.cat===cat;});
  if(!list.length) return null;
  var n=list.length;
  return RADAR_DIMS.map(function(dim){
    var sum=0;
    list.forEach(function(j){
      var cov=0;
      dim.skills.forEach(function(sk,idx){cov+=((j.skills[sk]||[]).length>0?1:0)*(dim.w[idx]||0);});
      sum+=Math.min(cov,1);
    });
    return Math.round(sum/n*10);
  });
}
function getRadarSkills(cat){
  var list=JD_LIB;
  if(cat && cat!=='__ALL__') list=JD_LIB.filter(function(j){return j.cat===cat;});
  var map={};
  list.forEach(function(j){
    RADAR_DIMS.forEach(function(dim){
      dim.skills.forEach(function(sk){
        (j.skills[sk]||[]).forEach(function(s){var key=dim.k+'|'+s;map[key]=(map[key]||0)+1;});
      });
    });
  });
  var res={};
  RADAR_DIMS.forEach(function(dim){
    var arr=[];
    Object.keys(map).forEach(function(k){if(k.indexOf(dim.k+'|')===0) arr.push({s:k.split('|')[1],n:map[k]});});
    arr.sort(function(a,b){return b.n-a.n;});
    res[dim.k]=arr.slice(0,5);
  });
  return res;
}
function renderRadarAnalysis(current,target){
  var box=document.getElementById('radar-analysis');
  if(!box) return;
  if(!target){box.innerHTML='';return;}
  var gaps=[];
  RADAR_DIMS.forEach(function(dim,i){
    var c=current[i],t=target[i],gap=t-c;
    gaps.push({dim:dim,t:t,c:c,gap:gap,i:i});
  });
  gaps.sort(function(a,b){return b.gap-a.gap;});
  var html='<div class="radar-analysis"><div class="card-title" style="font-size:10px;margin-bottom:8px"><div class="dot" style="width:4px;height:4px"></div>差距分析</div>';
  var avg=current.reduce(function(s,v){return s+v;},0)/current.length;
  html+='<div class="gap-row"><span class="gap-name">平均自评</span><span class="gap-val">'+avg.toFixed(1)+' / 10</span></div>';
  gaps.forEach(function(g){
    var cls=g.gap>0?'under':(g.gap<0?'ok':'');
    html+='<div class="gap-row"><span class="gap-name">'+g.dim.t+'</span><span class="gap-bar"><i class="'+cls+'" style="width:'+Math.min(100,g.t*10)+'%"></i></span><span class="gap-val">'+g.c+' / '+g.t+'</span></div>';
  });
  html+='</div>';
  var topGap=gaps.filter(function(g){return g.gap>0;}).slice(0,3);
  if(topGap.length){
    var sel=document.getElementById('radar-target');
    var skillMap=getRadarSkills(sel?sel.value:'');
    html+='<div class="radar-skills"><strong>建议优先补强（按 JD 高频技能）：</strong><br>';
    topGap.forEach(function(g){
      var skills=(skillMap[g.dim.k]||[]).map(function(x){return x.s;}).join('、');
      html+='• <b>'+g.dim.t+'</b>：'+skills+'<br>';
    });
    html+='</div>';
  }
  box.innerHTML=html;
}
function drawRadar(prev){
  var vals=readRadar();
  var labels=RADAR_DIMS.map(function(d){return d.t;});
  var sel=document.getElementById('radar-target');
  var target=(sel&&sel.value)?getRadarTarget(sel.value):null;
  var c=document.getElementById('c-radar');
  if(!c._chart)c._chart=new CanvasChart(c.getContext('2d'),c);
  c._chart.radar(labels,vals,'#FF8C42',prev,target);
  var tip='各维度 0~10 自评。';
  if(prev && target) tip='当前(橙) vs 上次(蓝) vs 目标(蓝虚线)';
  else if(prev) tip='当前(橙) vs 上次(蓝) 对比';
  else if(target) tip='当前(橙) vs 目标岗位(蓝虚线)。差距与建议见下方。';
  else tip='各维度 0~10 自评。可「保存本次」后用「对比上次」看成长。';
  document.getElementById('radar-tip').textContent=tip;
  renderRadarAnalysis(vals,target);
}
function saveRadar(){
  try{localStorage.setItem('spark_radar_prev',JSON.stringify(readRadar()));document.getElementById('radar-tip').textContent='已保存本次为「上次」，下次可对比。';}catch(e){}
}
function cmpRadar(){
  var prev=null;
  try{prev=JSON.parse(localStorage.getItem('spark_radar_prev')||'null');}catch(e){}
  if(!prev){document.getElementById('radar-tip').textContent='暂无「上次」数据，请先「保存本次」。';return;}
  drawRadar(prev);
}
function rstRadar(){
  RADAR_DIMS.forEach(function(d){var e=document.getElementById('rad_'+d.k);if(e)e.value=0;});
  var sel=document.getElementById('radar-target');if(sel)sel.value='';
  drawRadar();
}
window.drawRadar=drawRadar;window.saveRadar=saveRadar;window.cmpRadar=cmpRadar;window.rstRadar=rstRadar;

/* ====================================================================== */
/* 光伏计算器                                                            */
/* ====================================================================== */
function calcPV(){
  var voc=+document.getElementById('pv_voc').value;
  var vmin=+document.getElementById('pv_vmin').value;
  var vmax=+document.getElementById('pv_vmax').value;
  var beta=(+document.getElementById('pv_beta').value)/100;
  var tmin=+document.getElementById('pv_tmin').value;
  var tmax=+document.getElementById('pv_tmax').value;
  var pload=+document.getElementById('pv_load').value;
  var hours=+document.getElementById('pv_hours').value;
  var vbat=+document.getElementById('pv_vbat').value;
  var eff=(+document.getElementById('pv_eff').value)/100;
  var dod=(+document.getElementById('pv_dod').value)/100;
  var pmp=+document.getElementById('pv_pmp').value;
  var vocLow=voc*(1+beta*(tmin-25));
  var vocHigh=voc*(1+beta*(tmax-25));
  var nMax=Math.floor(vmax/vocLow);
  var nMin=Math.ceil(vmin/vocHigh);
  var ah=pload*hours/(vbat*eff*dod);
  var nMod=Math.ceil(pload/pmp);
  var rec=(nMin<=nMax)?('推荐每串 '+nMin+'~'+nMax+' 块，常用 '+Math.round((nMin+nMax)/2)+' 块'):'参数冲突：下限>上限，请检查电压范围/温度系数';
  document.getElementById('pv-rst').innerHTML=
    '<div class="rst-grid">'+
    '<div class="rst-item"><div class="rst-lbl">低温 Voc</div><div class="rst-val">'+vocLow.toFixed(2)+'</div><div class="rst-unit">V</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">每串上限 Nmax</div><div class="rst-val">'+nMax+'</div><div class="rst-unit">块</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">每串下限 Nmin</div><div class="rst-val">'+nMin+'</div><div class="rst-unit">块</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">电池容量</div><div class="rst-val">'+ah.toFixed(0)+'</div><div class="rst-unit">Ah</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">估算组件数</div><div class="rst-val">'+nMod+'</div><div class="rst-unit">块</div></div>'+
    '</div>'+
    '<div style="font-size:11px;color:var(--tx2);margin-top:8px">'+rec+'</div>';
  var c=document.getElementById('c-pv');
  if(!c._chart)c._chart=new CanvasChart(c.getContext('2d'),c);
  c._chart.bar(['Voc_low','Nmax','Nmin','容量Ah','组件数'],[vocLow,nMax,nMin,ah,nMod],['#FF8C42','#10B981','#38BDF8','#FFB020','#E879F9']);
}
window.calcPV=calcPV;

/* ====================================================================== */
/* 一次调频（移植自电力系统计算器内核）                                  */
/* ====================================================================== */
var _PFTPL={
  '欠频单段':{formula:'(f < fn - fd) ? k1 * Pn * (fn - f) / fn : 0',vars:[{id:'k1',lbl:'调差系数 k1',val:'0.04',hint:'欠频方向 droop 系数'}],desc:'ΔP = k₁·Pn·(fn−f)/fn  仅欠频生效'},
  '欠超频各段':{formula:'f < fn - fd ? k1 * Pn * (fn - f) / fn : f > fn + fd ? k2 * Pn * (fn - f) / fn : 0',vars:[{id:'k1',lbl:'欠频 droop k1',val:'0.04',hint:'f<fn−fd 的 droop'},{id:'k2',lbl:'超频 droop k2',val:'0.04',hint:'f>fn+fd 的 droop'}],desc:'欠频用 k1，超频用 k2'},
  '欠频双段':{formula:'f < u2 ? k2 * Pn * (fn - f) / fn : f < fn - fd ? k1 * Pn * (fn - f) / fn : 0',vars:[{id:'u2',lbl:'二段启动频率 u2',val:'49.5',hint:'第二段启动频率 Hz'},{id:'k1',lbl:'一段 droop k1',val:'0.03',hint:'浅降 droop'},{id:'k2',lbl:'二段 droop k2',val:'0.06',hint:'陡降 droop'}],desc:'f<u2 用 k2，否则用 k1'},
  '欠超频对称':{formula:'(f < fn - fd || f > fn + fd) ? k1 * Pn * Math.abs(fn - f) / fn : 0',vars:[{id:'k1',lbl:'统一 droop k1',val:'0.04',hint:'共用 droop'}],desc:'ΔP = k₁·Pn·|fn−f|/fn'}
};
function pfTab(el){
  document.querySelectorAll('#pf-tabs .tab').forEach(function(x){x.classList.remove('on')});
  el.classList.add('on');
  var q=el.textContent.trim()==='快速模式';
  document.getElementById('pf-quick').style.display=q?'block':'none';
  document.getElementById('pf-custom').style.display=q?'none':'block';
}
function pfTplChange(t){
  var tpl=_PFTPL[t];if(!tpl)return;
  document.getElementById('pf-formula').value=tpl.formula;
  var c=document.getElementById('pf-tpl-params');
  c.innerHTML='<div class="fm" style="margin:6px 0 8px;font-size:11px;color:var(--acc2)">'+tpl.desc+'</div>';
  tpl.vars.forEach(function(v){
    var row=document.createElement('div');row.className='lbl';
    row.innerHTML='<div class="lbl-txt">'+v.lbl+'<span class="lbl-unit" style="margin-left:6px">'+v.hint+'</span></div><input type="number" id="pfv_'+v.id+'" value="'+v.val+'" step="0.001" style="font-size:12px">';
    c.appendChild(row);
  });
}
function addPfRow(){var b=document.getElementById('pf-body'),n=b.rows.length+1;if(n>5){alert('最多5段');return;}
  var tr=document.createElement('tr');
  tr.innerHTML='<td style="color:var(--tx3);font-size:9px;text-align:center">'+n+'</td><td><input type="number" value="0" step="0.001"></td><td><input type="number" value="0" step="0.1"></td><td><button class="btn btn-dng btn-sm" onclick="this.closest(\'tr\').remove();renumPf()">x</button></td>';
  b.appendChild(tr);
}
function renumPf(){var b=document.getElementById('pf-body');Array.from(b.rows).forEach(function(r,i){r.cells[0].textContent=i+1});}
function evalFormula(formula,vars){
  try{var k=Object.keys(vars),val=k.map(function(x){return vars[x];});
    var f=new Function(k.join(','),'return '+formula);
    var r=f.apply(null,val);
    return (r===null||r===undefined||isNaN(r)||!isFinite(r))?0:r;
  }catch(e){return 0;}
}
function calcPf(){
  var f=+document.getElementById('pf_f').value,fn=+document.getElementById('pf_fn').value,
      fd=+document.getElementById('pf_fd').value,Pn=+document.getElementById('pf_pn').value;
  var formula=document.getElementById('pf-formula').value.trim();if(!formula){alert('请先选择或输入公式');return;}
  var vars={f:f,fn:fn,fd:fd,Pn:Pn};
  for(var i=1;i<=5;i++){
    var e=document.getElementById('pfv_k'+i);vars['k'+i]=e?(+e.value||0):0;
    var eu=document.getElementById('pfv_u'+i);vars['u'+i]=eu?(+eu.value||0):0;
  }
  var total=evalFormula(formula,vars);
  var dF=f-fn,absDF=Math.abs(dF),dead=absDF<=fd;
  var stCls=dead?'bdg-info':(dF<0?'bdg-warn':'bdg-err');
  var stTxt=dead?'死区范围内 · 无动作':(dF<0?'频率偏低 · 增出力':'频率偏高 · 减出力');
  document.getElementById('pf-rst').innerHTML=
    '<div style="margin-bottom:10px"><span class="bdg '+stCls+'">'+stTxt+'</span></div>'+
    '<div class="rst-grid">'+
    '<div class="rst-item"><div class="rst-lbl">频率偏差 |Δf|</div><div class="rst-val">'+absDF.toFixed(4)+'</div><div class="rst-unit">Hz</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">总调频功率</div><div class="rst-val" style="color:'+(total>0?'var(--ok)':total<0?'var(--err)':'var(--tx2)')+'">'+total.toFixed(2)+'</div><div class="rst-unit">kW</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">占基准功率</div><div class="rst-val">'+((100*total)/Math.max(Pn,1)).toFixed(2)+'</div><div class="rst-unit">%</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">动作状态</div><div class="rst-val">'+(dead?'N/A':(dF<0?'UP':'DOWN'))+'</div><div class="rst-unit">'+(dead?'无动作':(dF<0?'增出力':'减出力'))+'</div></div>'+
    '</div><div class="sep"></div><div style="font-size:11px;color:var(--tx2);font-family:var(--mono);word-break:break-all">公式：'+formula.replace(/</g,'&lt;')+'</div>';
  var c=document.getElementById('c-pf');if(!c._chart)c._chart=new CanvasChart(c.getContext('2d'),c);
  var xs=[],ys=[],baseF=vars.fn,deadF=vars.fd;
  for(var ff=baseF-0.5;ff<=baseF+0.5;ff+=0.005){
    var v={f:ff,fn:vars.fn,fd:vars.fd,Pn:vars.Pn};
    Object.keys(vars).forEach(function(key){if(key!=='f'&&key!=='fn'&&key!=='fd'&&key!=='Pn')v[key]=vars[key];});
    xs.push(+ff.toFixed(3));ys.push(+evalFormula(formula,v).toFixed(3));
  }
  c._chart.pfCurve(xs,ys,baseF,deadF,f,total);
}
window.pfTab=pfTab;window.pfTplChange=pfTplChange;window.addPfRow=addPfRow;window.renumPf=renumPf;window.calcPf=calcPf;

/* ====================================================================== */
/* QU曲线                                                                */
/* ====================================================================== */
var quMethod='slope';
function quTab(el,m){document.querySelectorAll('#qu-tabs .tab').forEach(function(x){x.classList.remove('on')});el.classList.add('on');quMethod=m;
  document.getElementById('qu-slope').style.display=m==='slope'?'block':'none';
  document.getElementById('qu-point').style.display=m==='point'?'block':'none';}
function addQuRow(){var b=document.getElementById('qu-body'),n=b.rows.length+1;var tr=document.createElement('tr');tr.dataset.idx=n-1;
  tr.innerHTML='<td style="color:var(--tx3);font-size:9px;text-align:center">'+n+'</td><td><input type="number" value="1.00" step="0.01"></td><td><input type="number" value="0.00" step="0.01"></td><td><button class="btn btn-dng btn-sm" onclick="delQuRow(this)">×</button></td>';b.appendChild(tr);}
function delQuRow(btn){var tr=btn.parentNode.parentNode,b=document.getElementById('qu-body');tr.remove();Array.from(b.rows).forEach(function(r,i){r.querySelector('td').textContent=i+1;r.dataset.idx=i;});}
function getQuPts(){var rows=document.getElementById('qu-body').rows,pts=[];for(var i=0;i<rows.length;i++){var v=rows[i].querySelectorAll('input');var u=+v[0].value,q=+v[1].value;if(!isNaN(u)&&!isNaN(q))pts.push([u,q]);}pts.sort(function(a,b){return a[0]-b[0];});return pts;}
function calcQu(){quMethod==='slope'?calcQuSlope():calcQuPoint();}
function calcQuSlope(){var k=+document.getElementById('qu-k').value,Uc=+document.getElementById('qu-ucons').value,Ur=+document.getElementById('qu-ureal').value;
  var dU=Ur-Uc,dUp=(dU/Uc*100).toFixed(3),Q=k!==0?(-dU/k).toFixed(3):'0',ok=Math.abs(dUp)<=15;
  document.getElementById('qu-rst').innerHTML='<div style="margin-bottom:10px"><span class="bdg '+(ok?'bdg-ok':'bdg-warn')+'">'+(ok?'在曲线范围内':'超出15%偏差限制')+'</span></div><div class="rst-grid">'+
    '<div class="rst-item"><div class="rst-lbl">电压偏差 ΔU</div><div class="rst-val">'+dU.toFixed(3)+'</div><div class="rst-unit">kV</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">电压偏差率</div><div class="rst-val">'+dUp+'</div><div class="rst-unit">%</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">目标无功 Q</div><div class="rst-val">'+Q+'</div><div class="rst-unit">MVar</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">曲线斜率 k</div><div class="rst-val">'+k+'</div><div class="rst-unit">kV/MVar</div></div></div>';
  var c=document.getElementById('c-qu');if(!c._chart)c._chart=new CanvasChart(c.getContext('2d'),c);
  var xs=[],ys=[];for(var du=-2;du<=2;du+=0.05){xs.push(+(Uc+du).toFixed(2));ys.push(+(-du/k).toFixed(3));}
  c._chart.quLine(xs,ys,Ur,+Q);}
function calcQuPoint(){var Uc=+document.getElementById('qu-ucons-p').value,Ur=+document.getElementById('qu-ureal-p').value,pts=getQuPts(),Upu=Ur/Uc,Q=0;
  for(var i=0;i<pts.length-1;i++){if(Upu>=pts[i][0]&&Upu<=pts[i+1][0]){var t=(Upu-pts[i][0])/(pts[i+1][0]-pts[i][0]);Q=pts[i][1]+t*(pts[i+1][1]-pts[i][1]);break;}}
  var dU=Ur-Uc,dUp=(dU/Uc*100).toFixed(3),ok=Math.abs(dUp)<=15;
  document.getElementById('qu-rst').innerHTML='<div style="margin-bottom:10px"><span class="bdg '+(ok?'bdg-ok':'bdg-warn')+'">'+(ok?'在曲线范围内':'超出15%偏差限制')+'</span></div><div class="rst-grid">'+
    '<div class="rst-item"><div class="rst-lbl">电压偏差 ΔU</div><div class="rst-val">'+dU.toFixed(3)+'</div><div class="rst-unit">kV</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">电压偏差率</div><div class="rst-val">'+dUp+'</div><div class="rst-unit">%</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">目标无功 Q</div><div class="rst-val">'+Q.toFixed(3)+'</div><div class="rst-unit">p.u.</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">电压标幺</div><div class="rst-val">'+Upu.toFixed(4)+'</div><div class="rst-unit">p.u.</div></div></div>';
  var c=document.getElementById('c-qu');if(!c._chart)c._chart=new CanvasChart(c.getContext('2d'),c);
  c._chart.quLine(pts.map(function(p){return p[0]}),pts.map(function(p){return p[1]}),Upu,Q);}
window.quTab=quTab;window.addQuRow=addQuRow;window.delQuRow=delQuRow;window.calcQu=calcQu;window.getQuPts=getQuPts;

/* ====================================================================== */
/* 储能分配                                                              */
/* ====================================================================== */
var saStratMode='rated';
function saStrat(el){document.querySelectorAll('.sp-card').forEach(function(x){x.classList.remove('on')});el.classList.add('on');saStratMode=el.dataset.s;}
function addSaRow(){var b=document.getElementById('sa-body'),n=b.rows.length+1;var tr=document.createElement('tr');
  tr.innerHTML='<td style="color:var(--tx3);font-size:9px;text-align:center">'+n+'</td><td><input type="text" value="新子阵"></td><td><input type="number" value="0" step="1"></td><td><input type="number" value="0" step="1"></td><td><input type="number" value="0" step="1"></td><td><input type="number" value="0" step="1"></td><td><input type="number" value="100" step="0.1"></td><td><input type="number" value="50" step="1"></td><td><button class="btn btn-dng btn-sm" onclick="this.closest(\'tr\').remove();renumSa()">×</button></td>';
  b.appendChild(tr);}
function renumSa(){var b=document.getElementById('sa-body');Array.from(b.rows).forEach(function(r,i){r.cells[0].textContent=i+1});}
function getSaData(){var rows=document.getElementById('sa-body').rows,data=[];for(var i=0;i<rows.length;i++){var inp=rows[i].querySelectorAll('input');data.push({name:inp[0].value||'',Pn:+inp[1].value||0,PmaxD:+inp[2].value||0,PmaxC:+inp[3].value||0,Cap:+inp[4].value||0,SOH:+inp[5].value||100,SOC:+inp[6].value||50});}return data;}
function calcSa(){var Ptot=+document.getElementById('sa-total').value,chg=+document.getElementById('sa-chg').value,dis=+document.getElementById('sa-disch').value,arrs=getSaData();if(!arrs.length)return;
  var alloc=[];
  if(saStratMode==='rated'){var tp=arrs.reduce(function(s,a){return s+a.Pn;},0);arrs.forEach(function(a){var r=tp>0?a.Pn/tp:1/arrs.length;alloc.push({name:a.name,P:Ptot*r,r:r});});}
  else if(saStratMode==='soc'){arrs.forEach(function(a){alloc.push({name:a.name,w:1/Math.max(a.SOC,1)});});var tw=alloc.reduce(function(s,a){return s+a.w;},0);alloc.forEach(function(a){var r=tw>0?a.w/tw:1/arrs.length;a.r=r;a.P=Ptot*r;});}
  else{var tl=arrs.reduce(function(s,a){return s+Math.min(a.PmaxD,a.Pn);},0);arrs.forEach(function(a){var lim=Math.min(a.PmaxD,a.Pn);var r=tl>0?lim/tl:1/arrs.length;alloc.push({name:a.name,P:Ptot*r,r:r,lim:lim});});}
  alloc.forEach(function(a,i){if(Ptot>0&&arrs[i].SOC>=chg)a.warn='充电截至SOC';if(Ptot<0&&arrs[i].SOC<=dis)a.warn='放电截至SOC';});
  var tp2=alloc.reduce(function(s,a){return s+a.P;},0);
  var rows2=alloc.map(function(a,i){var cls=a.warn?'bdg-warn':'bdg-ok';var txt=a.warn||'正常';
    return '<tr><td style="color:var(--tx3);font-size:9px;text-align:center">'+(i+1)+'</td><td>'+a.name+'</td><td style="font-family:var(--mono);color:'+(a.P>0?'var(--ok)':'var(--err)')+'">'+a.P.toFixed(1)+'</td><td style="font-family:var(--mono)">'+(a.r*100).toFixed(1)+'</td><td><span class="bdg '+cls+'">'+txt+'</span></td></tr>';}).join('');
  var sn={rated:'额定功率分配',soc:'SOC均衡分配',max:'最大可用分配'};
  document.getElementById('sa-rst').innerHTML='<div class="rst-grid" style="margin-bottom:10px">'+
    '<div class="rst-item"><div class="rst-lbl">总目标值</div><div class="rst-val">'+Ptot.toFixed(0)+'</div><div class="rst-unit">kW</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">实际分配</div><div class="rst-val">'+tp2.toFixed(1)+'</div><div class="rst-unit">kW</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">子阵数量</div><div class="rst-val">'+arrs.length+'</div><div class="rst-unit">个</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">分配策略</div><div class="rst-val" style="font-size:13px">'+sn[saStratMode]+'</div><div class="rst-unit">策略</div></div></div>'+
    '<div class="tbl-scroll" style="max-height:160px"><table class="tbl"><thead><tr><th style="width:28px">#</th><th>子阵</th><th>分配kW</th><th>占比%</th><th>状态</th></tr></thead><tbody>'+rows2+'</tbody></table></div>';
  var c=document.getElementById('c-sa');if(!c._chart)c._chart=new CanvasChart(c.getContext('2d'),c);
  c._chart.hBar(alloc.map(function(a){return a.name;}),alloc.map(function(a){return a.P.toFixed(1);}),alloc.map(function(a){return a.P>0?'#FF8C42':'#EF4444';}));}
window.saStrat=saStrat;window.addSaRow=addSaRow;window.calcSa=calcSa;

/* ====================================================================== */
/* 功率计算                                                              */
/* ====================================================================== */
var pcMode='direct';
function pcTab(el,m){document.querySelectorAll('#s-pc .tab').forEach(function(x){x.classList.remove('on')});el.classList.add('on');pcMode=m;
  ['direct','pf','pq','sq'].forEach(function(x){var e=document.getElementById('pc-'+x);if(e)e.style.display=x===m?'block':'none';});}
function calcPc(){var P,Q,S,PF,phi;
  if(pcMode==='direct'){var U=+document.getElementById('pc-u').value,I=+document.getElementById('pc-i').value,tu=(+document.getElementById('pc-tu').value)*Math.PI/180,ti=(+document.getElementById('pc-ti').value)*Math.PI/180,dth=tu-ti;S=Math.sqrt(3)*U*I;P=S*Math.cos(dth);Q=S*Math.sin(dth);PF=Math.cos(dth);phi=dth*180/Math.PI;}
  else if(pcMode==='pf'){var U=+document.getElementById('pc-pf-u').value,I=+document.getElementById('pc-pf-i').value;PF=+document.getElementById('pc-pf-pf').value;S=Math.sqrt(3)*U*I;P=S*PF;Q=Math.sqrt(Math.max(0,S*S-P*P));phi=Math.acos(PF)*180/Math.PI;}
  else if(pcMode==='pq'){P=+document.getElementById('pc-pq-p').value;PF=+document.getElementById('pc-pq-pf').value;S=P/PF;Q=Math.sqrt(Math.max(0,S*S-P*P));phi=Math.acos(PF)*180/Math.PI;}
  else{S=+document.getElementById('pc-sq-s').value;P=+document.getElementById('pc-sq-p').value;Q=Math.sqrt(Math.max(0,S*S-P*P));PF=P/S;phi=Math.acos(PF)*180/Math.PI;}
  var pfCls=Math.abs(PF)>=0.8?'bdg-ok':Math.abs(PF)>=0.5?'bdg-warn':'bdg-err',pfTxt=PF>=0?(Math.abs(PF)>=0.8?'正常':'偏低'):'容性';
  function fmt(v){if(Math.abs(v)>=1e6)return(v/1e6).toFixed(3)+'M';if(Math.abs(v)>=1e3)return(v/1e3).toFixed(2)+'k';return v.toFixed(2);}
  var mn={direct:'直接计算',pf:'根据PF算无功',pq:'由P算Q',sq:'由S算Q'};
  document.getElementById('pc-rst').innerHTML='<div style="margin-bottom:10px"><span class="bdg bdg-info">'+mn[pcMode]+'</span></div><div class="rst-grid" style="margin-bottom:10px">'+
    '<div class="rst-item"><div class="rst-lbl">有功 P</div><div class="rst-val" style="color:var(--ok)">'+fmt(P)+'</div><div class="rst-unit">W</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">无功 Q</div><div class="rst-val" style="color:var(--warn)">'+fmt(Q)+'</div><div class="rst-unit">Var</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">视在 S</div><div class="rst-val" style="color:var(--acc)">'+fmt(S)+'</div><div class="rst-unit">VA</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">功率因数</div><div class="rst-val">'+PF.toFixed(4)+'</div><div class="rst-unit">'+pfTxt+'</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">相位角</div><div class="rst-val">'+phi.toFixed(2)+'</div><div class="rst-unit">deg</div></div></div>';
  var c=document.getElementById('c-pc');if(!c._chart)c._chart=new CanvasChart(c.getContext('2d'),c);
  c._chart.bar(['P','Q','S'],[P/1000,Q/1000,S/1000],['#10B981','#FFB020','#FF8C42']);}
window.pcTab=pcTab;window.calcPc=calcPc;

/* ====================================================================== */
/* 站级SOC                                                               */
/* ====================================================================== */
function addSocRow(){var b=document.getElementById('soc-body'),n=b.rows.length+1;var tr=document.createElement('tr');
  tr.innerHTML='<td style="color:var(--tx3);font-size:9px;text-align:center">'+n+'</td><td><input type="text" value="新子阵"></td><td><input type="number" value="0" step="1"></td><td><input type="number" value="0" step="1"></td><td><input type="number" value="100" step="0.1"></td><td><input type="number" value="50" step="1"></td><td><button class="btn btn-dng btn-sm" onclick="this.closest(\'tr\').remove();renumSoc()">×</button></td>';
  b.appendChild(tr);}
function renumSoc(){var b=document.getElementById('soc-body');Array.from(b.rows).forEach(function(r,i){r.cells[0].textContent=i+1});}
function calcSoc(){var rows=document.getElementById('soc-body').rows,arrs=[];for(var i=0;i<rows.length;i++){var inp=rows[i].querySelectorAll('input');arrs.push({name:inp[0].value||'',Pn:+inp[1].value||0,Cap:+inp[2].value||0,SOH:+inp[3].value||100,SOC:+inp[4].value||50});}if(!arrs.length)return;
  var totCap=arrs.reduce(function(s,a){return s+a.Cap;},0),wSoc=arrs.reduce(function(s,a){return s+a.SOC*a.Cap;},0)/totCap,avgSOH=arrs.reduce(function(s,a){return s+a.SOH;},0)/arrs.length;
  var minS=Math.min.apply(null,arrs.map(function(a){return a.SOC;})),maxS=Math.max.apply(null,arrs.map(function(a){return a.SOC;}));
  var minA=arrs.find(function(a){return a.SOC===minS;}),maxA=arrs.find(function(a){return a.SOC===maxS;});
  var st=wSoc<30?'danger':wSoc<50?'warning':'ok',cls=st==='danger'?'bdg-err':st==='warning'?'bdg-warn':'bdg-ok',txt=st==='danger'?'低电量告警':st==='warning'?'低电量预警':'电量正常';
  document.getElementById('soc-rst').innerHTML='<div class="rst-grid" style="margin-bottom:10px">'+
    '<div class="rst-item"><div class="rst-lbl">站级加权SOC</div><div class="rst-val" style="font-size:20px">'+wSoc.toFixed(2)+'</div><div class="rst-unit">%</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">平均SOH</div><div class="rst-val" style="font-size:17px">'+avgSOH.toFixed(2)+'</div><div class="rst-unit">%</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">最低SOC</div><div class="rst-val" style="font-size:15px">'+minS.toFixed(1)+'</div><div class="rst-unit">'+minA.name+'</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">最高SOC</div><div class="rst-val" style="font-size:15px">'+maxS.toFixed(1)+'</div><div class="rst-unit">'+maxA.name+'</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">告警级别</div><div><span class="bdg '+cls+'">'+txt+'</span></div></div></div>';
  var c=document.getElementById('c-soc');if(!c._chart)c._chart=new CanvasChart(c.getContext('2d'),c);
  c._chart.hBar(arrs.map(function(a){return a.name;}),arrs.map(function(a){return a.SOC.toFixed(1);}),arrs.map(function(a){return a.SOC<30?'#EF4444':a.SOC<50?'#FFB020':'#10B981';}));}
window.addSocRow=addSocRow;window.calcSoc=calcSoc;

/* ====================================================================== */
/* 对称分量                                                              */
/* ====================================================================== */
function calcSym(){var Va=+document.getElementById('sym-va').value||0,Vb=+document.getElementById('sym-vb').value||0,Vc=+document.getElementById('sym-vc').value||0;
  var ta=(+document.getElementById('sym-ta').value)*Math.PI/180,tb=(+document.getElementById('sym-tb').value)*Math.PI/180,tc=(+document.getElementById('sym-tc').value)*Math.PI/180;
  var Ua={r:Va*Math.cos(ta),i:Va*Math.sin(ta)},Ub={r:Vb*Math.cos(tb),i:Vb*Math.sin(tb)},Uc={r:Vc*Math.cos(tc),i:Vc*Math.sin(tc)};
  var ar=-0.5,ai=0.866025,a2r=-0.5,a2i=-0.866025;
  function cmul(a,b){return{r:a.r*b.r-a.i*b.i,i:a.r*b.i+a.i*b.r};}function cadd(a,b){return{r:a.r+b.r,i:a.i+b.i};}function cdiv(a,n){return{r:a.r/n,i:a.i/n};}
  var U1=cdiv(cadd(Ua,cadd(cmul({r:ar,i:ai},Ub),cmul({r:a2r,i:a2i},Uc))),3);
  var U2=cdiv(cadd(Ua,cadd(cmul({r:a2r,i:a2i},Ub),cmul({r:ar,i:ai},Uc))),3);
  var U0=cdiv(cadd(Ua,cadd(Ub,Uc)),3);
  var U1m=Math.sqrt(U1.r*U1.r+U1.i*U1.i),U2m=Math.sqrt(U2.r*U2.r+U2.i*U2.i),U0m=Math.sqrt(U0.r*U0.r+U0.i*U0.i);
  var U1p=Math.atan2(U1.i,U1.r)*180/Math.PI,U2p=Math.atan2(U2.i,U2.r)*180/Math.PI,U0p=Math.atan2(U0.i,U0.r)*180/Math.PI;
  var ratio=U1m>0?(U2m/U1m*100).toFixed(3):'0.000',bal=U2m<U1m*0.05,plus=U0.r>=0?'+':'';
  document.getElementById('sym-rst').innerHTML='<div style="margin-bottom:10px"><span class="bdg '+(bal?'bdg-ok':'bdg-warn')+'">'+(bal?'三相平衡':'三相不平衡')+'</span></div><div class="rst-grid" style="margin-bottom:10px">'+
    '<div class="rst-item" style="border-color:rgba(16,185,129,.4)"><div class="rst-lbl" style="color:var(--ok)">正序 U1</div><div class="rst-val" style="color:var(--ok)">'+U1m.toFixed(2)+'</div><div class="rst-unit">V @ '+U1p.toFixed(1)+'°</div></div>'+
    '<div class="rst-item" style="border-color:rgba(239,68,68,.4)"><div class="rst-lbl" style="color:var(--err)">负序 U2</div><div class="rst-val" style="color:var(--err)">'+U2m.toFixed(2)+'</div><div class="rst-unit">V @ '+U2p.toFixed(1)+'°</div></div>'+
    '<div class="rst-item" style="border-color:rgba(255,176,32,.4)"><div class="rst-lbl" style="color:var(--warn)">零序 U0</div><div class="rst-val" style="color:var(--warn)">'+U0m.toFixed(2)+'</div><div class="rst-unit">V @ '+U0p.toFixed(1)+'°</div></div>'+
    '<div class="rst-item"><div class="rst-lbl">不平衡度</div><div class="rst-val">'+ratio+'</div><div class="rst-unit">% (U2/U1)</div></div></div>'+
    '<div style="background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:8px 10px"><div class="rst-lbl" style="margin-bottom:4px">相量表达式</div><div style="font-family:var(--mono);font-size:10px;line-height:1.8;color:var(--tx2)">U1 = '+U1.r.toFixed(3)+' '+plus+U1.i.toFixed(3)+'j | U2 = '+U2.r.toFixed(3)+' '+plus+U2.i.toFixed(3)+'j | U0 = '+U0.r.toFixed(3)+' '+plus+U0.i.toFixed(3)+'j</div></div>';
  var c=document.getElementById('c-sym');if(!c._chart)c._chart=new CanvasChart(c.getContext('2d'),c);
  c._chart.bar(['U0','U1','U2'],[U0m,U1m,U2m],['#FFB020','#10B981','#EF4444']);}
window.calcSym=calcSym;

/* ====================================================================== */
/* 四遥点位 / 进制 / 浮点（移植内核）                                    */
/* ====================================================================== */
function parseSeqs(s){s=String(s).trim();if(!s)return[];var m=s.match(/^(\d+)\s*-\s*(\d+)$/);if(m){var a=+m[1],b=+m[2],r=[],lo=Math.min(a,b),hi=Math.max(a,b);for(var i=lo;i<=hi;i++)r.push(i);return r.slice(0,2000);}return s.split(/[,\s]+/).map(function(x){return x.trim();}).filter(Boolean).map(Number).filter(function(n){return !isNaN(n);});}
function calcPoint(st,pos,seq){return (Number(st)-1)+(Number(pos)-1)+Number(seq);}
var _seqTimer=null;function debounceCalc(){clearTimeout(_seqTimer);_seqTimer=setTimeout(calcSiYao,200);}
function calcSiYao(){var cfg={yx:+document.getElementById('yx').value||0,yc:+document.getElementById('yc').value||0,yk:+document.getElementById('yk').value||0,yt:+document.getElementById('yt').value||0};
  var pos=+document.getElementById('pos').value||0,seqs=parseSeqs(document.getElementById('seq').value),box=document.getElementById('siyaoResult');
  if(!seqs.length){box.innerHTML='<div class="hint">在「序号」中输入单个数字（如 5）或范围（如 1-20），实时计算四遥点位。</div>';return;}
  var single=seqs[0];
  var sum='<div class="siyao-grid">'+
    '<div class="siyao yx"><div class="name">遥信 YX</div><div class="val">'+calcPoint(cfg.yx,pos,single)+'</div></div>'+
    '<div class="siyao yc"><div class="name">遥测 YC</div><div class="val">'+calcPoint(cfg.yc,pos,single)+'</div></div>'+
    '<div class="siyao yk"><div class="name">遥控 YK</div><div class="val">'+calcPoint(cfg.yk,pos,single)+'</div></div>'+
    '<div class="siyao yt"><div class="name">遥调 YT</div><div class="val">'+calcPoint(cfg.yt,pos,single)+'</div></div></div>'+
    '<div class="hint">当前显示序号 = '+single+'（若输入为范围，下方表格列出全部）</div>';
  var table='';if(seqs.length>1){table='<div class="tbl-scroll"><table class="tbl"><thead><tr><th style="width:28px">序号</th><th>遥信 YX</th><th>遥测 YC</th><th>遥控 YK</th><th>遥调 YT</th></tr></thead><tbody>';
    seqs.forEach(function(s){table+='<tr><td>'+s+'</td><td>'+calcPoint(cfg.yx,pos,s)+'</td><td>'+calcPoint(cfg.yc,pos,s)+'</td><td>'+calcPoint(cfg.yk,pos,s)+'</td><td>'+calcPoint(cfg.yt,pos,s)+'</td></tr>';});
    table+='</tbody></table></div><div class="hint">共 '+seqs.length+' 行</div>';}
  box.innerHTML=sum+table;}
function rstSiyao(){['yx','yc','yk','yt','pos'].forEach(function(id){var e=document.getElementById(id);if(e)e.value=1;});var s=document.getElementById('seq');if(s)s.value='1';clearTimeout(_seqTimer);calcSiYao();}
function toBig(str,base){str=String(str).trim().toLowerCase();var body;if(base===16)body=str.replace(/^0x/,'');else if(base===2)body=str.replace(/^0b/,'');else if(base===8)body=str.replace(/^0o/,'');else body=str;
  if(/[^\-0-9a-f]/.test(body.replace('-','')))throw new Error('输入与所选进制不匹配');var prefix=base===2?'0b':base===8?'0o':base===16?'0x':'';return BigInt(prefix+body);}
function convBase(){var box=document.getElementById('baseResult');try{var val=toBig(document.getElementById('bIn').value,+document.getElementById('bFrom').value);
  var out=[['二进制 (2)',val.toString(2)],['八进制 (8)',val.toString(8)],['十进制 (10)',val.toString(10)],['十六进制 (16)','0x'+val.toString(16).toUpperCase()]];
  box.innerHTML='<div class="res-box">'+out.map(function(o){return '<div class="res-row"><span class="k">'+o[0]+'</span><span class="v"><span class="rv">'+o[1]+'</span><button class="copy" onclick="copyText(this)">复制</button></span></div>';}).join('')+'</div>';
}catch(e){box.innerHTML='<div class="err">转换失败：'+e.message+'</div>';}}
function float32(f,le){var buf=new ArrayBuffer(4),dv=new DataView(buf);dv.setFloat32(0,f,false);var be=dv.getUint32(0,false);var bin=be.toString(2).padStart(32,'0');var sign=(be>>>31)&1,exp=(be>>>23)&0xFF,frac=be&0x7FFFFF;dv.setFloat32(0,f,le);var bytes=[];for(var i=0;i<4;i++)bytes.push(dv.getUint8(i));return {hex:'0x'+be.toString(16).padStart(8,'0').toUpperCase(),bin:bin,sign:sign,exp:exp,frac:frac,seq:bytes.map(function(b){return b.toString(16).padStart(2,'0');}).join(' ')};}
function float64(f,le){var buf=new ArrayBuffer(8),dv=new DataView(buf);dv.setFloat64(0,f,false);var hi=dv.getUint32(0,false),lo=dv.getUint32(4,false);var bin=(hi.toString(2).padStart(32,'0')+lo.toString(2).padStart(32,'0'));var sign=(hi>>>31)&1,exp=((hi&0x7FF00000)>>>20);dv.setFloat64(0,f,le);var bytes=[];for(var i=0;i<8;i++)bytes.push(dv.getUint8(i));return {hex:'0x'+(hi.toString(16).padStart(8,'0')+lo.toString(16).padStart(8,'0')).toUpperCase(),bin:bin,sign:sign,exp:exp,seq:bytes.map(function(b){return b.toString(16).padStart(2,'0');}).join(' ')};}
function convFloat(){var box=document.getElementById('floatResult');var f=parseFloat(document.getElementById('fIn').value);var le=document.getElementById('fEndian').value==='true';if(isNaN(f)){box.innerHTML='<div class="err">请输入有效的十进制浮点数。</div>';return;}
  var a=float32(f,le),b=float64(f,le);
  box.innerHTML='<div class="res-box" style="margin-top:14px">'+
    '<div class="res-row"><span class="k">32位 十六进制</span><span class="v"><span class="rv">'+a.hex+'</span><button class="copy" onclick="copyText(this)">复制</button></span></div>'+
    '<div class="res-row"><span class="k">32位 二进制</span><span class="v"><span class="bits"><span class="s">'+a.bin[0]+'</span><span class="e">'+a.bin.slice(1,9)+'</span><span class="m">'+a.bin.slice(9)+'</span></span></span></div>'+
    '<div class="res-row"><span class="k">32位 符号/指数/尾数</span><span class="v">'+a.sign+' / '+a.exp+' / '+a.frac+'</span></div>'+
    '<div class="res-row"><span class="k">32位 字节序('+(le?'LE':'BE')+')</span><span class="v">'+a.seq+'</span></div></div>'+
    '<div class="res-box" style="margin-top:14px">'+
    '<div class="res-row"><span class="k">64位 十六进制</span><span class="v"><span class="rv">'+b.hex+'</span><button class="copy" onclick="copyText(this)">复制</button></span></div>'+
    '<div class="res-row"><span class="k">64位 二进制</span><span class="v"><span class="bits"><span class="s">'+b.bin[0]+'</span><span class="e">'+b.bin.slice(1,12)+'</span><span class="m">'+b.bin.slice(12)+'</span></span></span></div>'+
    '<div class="res-row"><span class="k">64位 符号/指数/尾数</span><span class="v">'+b.sign+' / '+b.exp+' / (52位)</span></div>'+
    '<div class="res-row"><span class="k">64位 字节序('+(le?'LE':'BE')+')</span><span class="v">'+b.seq+'</span></div></div>';}
function hex2f32(){var box=document.getElementById('hexFloatResult');var hex=document.getElementById('h32').value.trim().replace(/^0x/i,'').replace(/\s/g,'');var le=document.getElementById('hEndian32').value==='true';if(!hex){box.innerHTML='<div class="hint">输入 32 位十六进制（如 40490FD8）实时转换。</div>';return;}if(!/^[0-9a-fA-F]+$/.test(hex)){box.innerHTML='<div class="err">只允许十六进制字符。</div>';return;}hex=hex.padStart(8,'0');var buf=new ArrayBuffer(4),dv=new DataView(buf);for(var i=0;i<4;i++)dv.setUint8(i,parseInt(hex.slice(i*2,i*2+2),16));var val=dv.getFloat32(0,le);box.innerHTML='<div class="res-box"><div class="res-row"><span class="k">浮点值 (32位)</span><span class="v"><span class="rv">'+val+'</span><button class="copy" onclick="copyText(this)">复制</button></span></div></div>';}
function hex2f64(){var box=document.getElementById('hexFloatResult');var hex=document.getElementById('h64').value.trim().replace(/^0x/i,'').replace(/\s/g,'');var le=document.getElementById('hEndian64').value==='true';if(!hex){box.innerHTML='<div class="hint">输入 64 位十六进制（如 400921FB54442D18）实时转换。</div>';return;}if(!/^[0-9a-fA-F]+$/.test(hex)){box.innerHTML='<div class="err">只允许十六进制字符。</div>';return;}hex=hex.padStart(16,'0');var buf=new ArrayBuffer(8),dv=new DataView(buf);for(var i=0;i<8;i++)dv.setUint8(i,parseInt(hex.slice(i*2,i*2+2),16));var val=dv.getFloat64(0,le);box.innerHTML='<div class="res-box"><div class="res-row"><span class="k">浮点值 (64位)</span><span class="v"><span class="rv">'+val+'</span><button class="copy" onclick="copyText(this)">复制</button></span></div></div>';}
function copyText(btn,fromId){var t='';if(fromId){var e=document.getElementById(fromId);t=e?e.textContent:'';}else{var v=btn.parentNode.querySelector('.rv');t=v?v.textContent:'';}if(!t)return;function done(){btn.textContent='已复制';setTimeout(function(){btn.textContent='复制';},1000);}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(String(t)).then(done).catch(function(){});}else{var ta=document.createElement('textarea');ta.value=String(t);document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch(e){}document.body.removeChild(ta);}}
window.calcSiYao=calcSiYao;window.debounceCalc=debounceCalc;window.rstSiyao=rstSiyao;window.convBase=convBase;window.convFloat=convFloat;window.hex2f32=hex2f32;window.hex2f64=hex2f64;window.copyText=copyText;

/* ====================================================================== */
/* 通信速查                                                              */
/* ====================================================================== */
function calcMb(){
  var fc=document.getElementById('mb-fc').value;
  var addr=+document.getElementById('mb-addr').value;
  var base;var area;
  if(fc==='0x03'){base=addr-40001;area='保持寄存器(4xxxx)';}
  else if(fc==='0x04'){base=addr-30001;area='输入寄存器(3xxxx)';}
  else if(fc==='0x01'){base=addr-1;area='线圈(0xxxx)';}
  else{base=addr-10001;area='离散输入(1xxxx)';}
  document.getElementById('mb-rst').innerHTML='<div class="res-box"><div class="res-row"><span class="k">功能码</span><span class="v">'+fc+'</span></div>'+
    '<div class="res-row"><span class="k">数据区</span><span class="v">'+area+'</span></div>'+
    '<div class="res-row"><span class="k">PLC 地址(1-based)</span><span class="v">'+addr+'</span></div>'+
    '<div class="res-row"><span class="k">协议帧寄存器(0-based)</span><span class="v" style="color:var(--acc)">'+base+'</span></div></div>'+
    '<div class="hint">报文中的寄存器地址填写「0-based」值；'+area+'首地址即 0。</div>';
}
function calcYc(){
  var raw=+document.getElementById('yc-raw').value,k=+document.getElementById('yc-k').value,b=+document.getElementById('yc-b').value,u=(document.getElementById('yc-unit').value||'').trim();
  var eng=raw*k+b;
  document.getElementById('yc-rst').innerHTML='<div class="res-box"><div class="res-row"><span class="k">工程量</span><span class="v"><span id="yc-eng">'+eng.toFixed(4)+' '+(u||'')+'</span></span></div></div>'+
    '<div class="hint">raw('+raw+') × k('+k+') + b('+b+') = '+eng.toFixed(4)+' '+(u||'')+'</div>';
}
window.calcMb=calcMb;window.calcYc=calcYc;

/* ====================================================================== */
/* 测试场景库                                                            */
/* ====================================================================== */
var SCENARIOS=[
  {cat:'SPPC·站级',name:'纯光并网启动',pre:['SPPC 与光伏子阵通信正常','电网电压/频率在允许范围','无并网闭锁信号'],
   steps:['下发站级启动指令','确认光伏子阵按 MPPT 模式并网','监测并网点电压/频率/电能质量','记录从启动到额定功率时间'],
   exp:['并网点电压 0.9~1.1pu，频率 49.5~50.5Hz','无异常告警，功率平滑上升','启动时间符合规格']},
  {cat:'SPPC·站级',name:'纯储充放电切换',pre:['储能子阵 SOC 在 20%~90%','PCS 与 BMS 通信正常'],
   steps:['下发充电指令，记录充电功率/电流','下发放电指令，记录放电功率','切换间隙监测冲击电流与 SOC 变化'],
   exp:['充/放电功率与指令一致','切换无过流，SOC 按预期变化','PCS 无保护停机']},
  {cat:'SPPC·站级',name:'光储协调功率分配',pre:['光伏与储能子阵在线','站级总目标功率已设定'],
   steps:['设定站级总有功目标','观察 SPPC 向光伏/储能分配功率','调整目标功率，观察再分配','注入通信延迟，观察策略鲁棒性'],
   exp:['各子阵功率之和≈总目标','SOC 高时多放/少充，低时反之','延迟下不出现功率越限或震荡']},
  {cat:'SPPC·站级',name:'并离网切换',pre:['系统处于并网稳态','储能具备离网带载能力'],
   steps:['模拟电网失电（或下发离网指令）','测量切换时间与离网电压频率','带载运行后恢复并网','验证重新并网同步条件'],
   exp:['切换时间 < 规格要求','离网电压频率稳定，无大冲击','并网前满足同步判据']},
  {cat:'SPPC·站级',name:'工商业防逆流',pre:['并网点电表/功率采集可用','负载可调节'],
   steps:['降低负载使光伏出力>负载','观察 SPPC 是否下调光伏/储能出力','突增负载，观察功率回充','注入通信延迟'],
   exp:['并网点潮流不倒送（≥0）','负载突变后快速恢复','延迟下不出现倒灌']},
  {cat:'数采·子阵级',name:'数采点表对接',pre:['数采与设备站号/波特率一致'],
   steps:['导入设备点表','用四遥点位计算器核对地址','读取遥测，验证系数/字节序','触发遥信，验证状态上报'],
   exp:['遥测工程量与现场一致','遥信变位实时上报','无地址偏移/错位']},
  {cat:'数采·子阵级',name:'通信中断恢复',pre:['数采与子阵正常通信'],
   steps:['断开通信链路','观察数采告警/数据冻结','恢复链路','确认数据续传与时钟对齐'],
   exp:['断链有清晰告警','恢复后数据连续、时钟同步']}
];
var SC_CAT='全部';var SC_TABS=['全部'].concat(Array.from(new Set(SCENARIOS.map(function(s){return s.cat;}))));
function renderSC(){
  document.getElementById('sc-tabs').innerHTML=SC_TABS.map(function(c){return '<div class="tab'+(c===SC_CAT?' on':'')+'" onclick="scCat(\''+c+'\')">'+c+'</div>';}).join('');
  var list=SCENARIOS.filter(function(s){return SC_CAT==='全部'||s.cat===SC_CAT;});
  document.getElementById('sc-list').innerHTML=list.map(function(s,i){
    var pre=s.pre.map(function(p,j){return '<div class="step-line"><div class="step-n">'+(j+1)+'</div><div class="step-c">'+p+'</div></div>';}).join('');
    var st=s.steps.map(function(p,j){return '<div class="step-line"><div class="step-n">'+(j+1)+'</div><div class="step-c">'+p+'</div></div>';}).join('');
    var ex=s.exp.map(function(p,j){return '<div class="step-line"><div class="step-n">'+(j+1)+'</div><div class="step-c">'+p+'</div></div>';}).join('');
    return '<div class="acc-item"><div class="acc-h" onclick="acc(this)"><span class="acc-cat">'+s.cat+'</span><span class="acc-t">'+s.name+'</span><span class="acc-ar">▶</span></div>'+
      '<div class="acc-body"><div class="card-title" style="font-size:10px;margin-top:6px">前置条件</div>'+pre+
      '<div class="card-title" style="font-size:10px;margin-top:8px">测试步骤</div>'+st+
      '<div class="card-title" style="font-size:10px;margin-top:8px">预期结果</div>'+ex+
      '<div class="card-title" style="font-size:10px;margin-top:8px">执行记录</div>'+
      '<div class="lbl"><textarea rows="3" placeholder="实际结果 / 偏差 / 结论（Pass/Fail）..."></textarea></div></div></div>';
  }).join('');
}
function scCat(c){SC_CAT=c;renderSC();}
function exportScenario(){
  var open=document.querySelector('#sc-list .acc-item.on');
  if(!open){document.getElementById('sc-out').textContent='请先在上方展开一个场景再导出。';return;}
  var cat=open.querySelector('.acc-cat').textContent;
  var name=open.querySelector('.acc-t').textContent;
  var body=open.querySelector('.acc-body');
  var blocks=body.querySelectorAll('.card-title');
  var getLines=function(title){var idx=-1;Array.from(blocks).forEach(function(b,i){if(b.textContent.indexOf(title)===0)idx=i;});
    if(idx<0)return[];var lines=[];for(var i=idx+1;i<blocks.length;i++){var sl=blocks[i].parentElement?null:null;
      var nxt=blocks[i].nextElementSibling;if(!nxt||nxt.classList.contains('card-title'))break;
      nxt.querySelectorAll('.step-line,.lbl').forEach(function(node){if(node.classList.contains('step-line'))lines.push(node.textContent.replace(/\s+/g,' ').trim());});break;}
    return lines;};
  var pre=body.querySelectorAll('.acc-body .step-line').length?null:null;
  // 重新抓取：按 card-title 顺序分组
  var groups={};var cur=null;
  Array.from(body.children).forEach(function(ch){if(ch.classList.contains('card-title')){cur=ch.textContent.trim();groups[cur]=[];}else if(cur){if(ch.classList.contains('step-line'))groups[cur].push(ch.textContent.replace(/\s+/g,' ').trim());else if(ch.querySelector('textarea'))groups[cur].push('（记录）'+ch.querySelector('textarea').value);}});
  var md='# 测试场景：'+name+'  ['+cat+']\n\n';
  md+='## 前置条件\n'+(groups['前置条件']||[]).map(function(x){return '- '+x;}).join('\n')+'\n\n';
  md+='## 测试步骤\n'+(groups['测试步骤']||[]).map(function(x){return '1. '+x;}).join('\n')+'\n\n';
  md+='## 预期结果\n'+(groups['预期结果']||[]).map(function(x){return '- '+x;}).join('\n')+'\n\n';
  md+='## 执行记录\n'+(groups['执行记录']||[]).map(function(x){return '- '+x;}).join('\n')+'\n';
  document.getElementById('sc-out').textContent=md;
}
window.scCat=scCat;window.exportScenario=exportScenario;

/* ====================================================================== */
/* 报告模板                                                              */
/* ====================================================================== */
function addRpItem(){var box=document.getElementById('rp-items');var n=box.children.length+1;
  var div=document.createElement('div');div.style.cssText='border:1px solid var(--bd);border-radius:8px;padding:10px;margin-bottom:10px;background:var(--bg2)';
  div.innerHTML='<div style="font-size:10px;color:var(--acc);font-weight:700;margin-bottom:8px">结论 '+n+'</div><div class="frm">'+
    '<div class="lbl"><div class="lbl-txt">测试项</div><input type="text" data-k="item" placeholder="如 并离网切换"></div>'+
    '<div class="lbl"><div class="lbl-txt">结果 (Pass/Fail)</div><input type="text" data-k="res" placeholder="Pass / Fail"></div></div>'+
    '<div class="lbl" style="margin-top:8px"><div class="lbl-txt">备注</div><input type="text" data-k="note" placeholder="关键数据 / 偏差"></div>';
  box.appendChild(div);}
function genReport(){
  var proj=(document.getElementById('rp-proj').value||'').trim()||'（未填）';
  var obj=(document.getElementById('rp-obj').value||'').trim()||'（未填）';
  var who=(document.getElementById('rp-who').value||'').trim()||'（未填）';
  var date=(document.getElementById('rp-date').value||'').trim()||'（未填）';
  var dev=(document.getElementById('rp-dev').value||'').trim()||'—';
  var ver=(document.getElementById('rp-ver').value||'').trim()||'—';
  var items=[];document.getElementById('rp-items').querySelectorAll('input[data-k="item"]').forEach(function(inp,i){
    items.push({item:inp.value.trim(),res:document.getElementById('rp-items').children[i].querySelector('[data-k="res"]').value.trim(),note:document.getElementById('rp-items').children[i].querySelector('[data-k="note"]').value.trim()});
  });
  var md='# 测试报告 · '+proj+'\n\n';
  md+='| 项目 | 内容 |\n|---|---|\n';
  md+='| 测试对象 | '+obj+' |\n| 测试人员 | '+who+' |\n| 测试日期 | '+date+' |\n| 设备型号 | '+dev+' |\n| 软件版本 | '+ver+' |\n\n';
  md+='## 测试结论\n\n';
  if(items.length===0)md+='_（请添加测试结论项）_\n';
  else{md+='| 序号 | 测试项 | 结果 | 备注 |\n|---|---|---|---|\n';items.forEach(function(it,i){md+='| '+(i+1)+' | '+(it.item||'—')+' | '+(it.res||'—')+' | '+(it.note||'—')+' |\n';});}
  md+='\n## 结论与建议\n\n_（在此填写总体结论、遗留问题、改进建议）_\n';
  document.getElementById('rp-out').textContent=md;
}
window.addRpItem=addRpItem;window.genReport=genReport;

/* ====================================================================== */
/* 知识库                                                                */
/* ====================================================================== */
/* 知识库：原理 + 公式/标准 + 测试要点 */
var KB_CAT='频率与调度';
var KB=[
  /* ---------- 频率与调度 ---------- */
  {cat:'频率与调度',t:'一次调频',f:'ΔP = -(1/R)·(Δf/fn)·Pn',p:'电源利用本体调速/下垂特性，对频率偏差做出秒级自动响应，无需调度指令。传统机组靠调速器，新能源靠有功-频率下垂：ΔP=-k·Δf，k=Pn/(R·fn)，R 为调差率（如 5%→R=0.05）。通常设死区 fd（±0.03~0.06Hz）避免频繁动作。一次调频只调偏差比例，不消除稳态偏差，由二次调频接管。',test:'注入频率阶跃，测响应时间、调差率、死区边界、功率变化方向、稳态误差与超调。'},
  {cat:'频率与调度',t:'新能源调频',f:'P_avail = P_max - P_op',p:'光伏/风机无旋转惯量，调频靠附加控制：①预留备用（限功率留上调裕度）②一次调频下垂 ③虚拟惯量 ④二次调频AGC跟踪。难点：资源间歇、预测误差、并网点约束、减载即弃电损失。高比例新能源下系统惯量下降，调频资源稀缺，需储能与构网型支撑。',test:'不同光照/风速下的可用调频容量、限功率精度、调频与MPPT协调、弃电损失评估。'},
  {cat:'频率与调度',t:'二次调频 / AGC',f:'ACE = ΔPtie + K·Δf',p:'调度中心按区域控制偏差 ACE 计算调节需求，下发 AGC 指令给机组，消除稳态频率偏差与联络线功率偏差。K 为区域频率偏差系数(MW/Hz)；若偏置以%表示则常见写作 ACE=ΔPtie+10B·Δf。时间尺度分钟级，分上浮/下浮。一次调频负责瞬时，二次调频负责恢复，二者分工不抵消（二次动作慢，不干扰一次）。',test:'指令跟踪延迟、调节速率、控制死区、ACE 收敛、与一次调频配合。'},
  {cat:'频率与调度',t:'虚拟惯量 / VSG',f:'P_ine ≈ −2H·S·(df/dt)/fn',p:'通过控制算法让逆变器模拟同步机转子运动方程，提供瞬时功率支撑以减缓 df/dt。运动方程 J·dω/dt=(Pm-Pe)/ω - D·(ω-ω0)；惯性支撑指令功率 P_ine≈−2H·S·(df/dt)/fn——df/dt<0（频率下降）时发出正功率支撑电网，H 越大支撑越强。构网型(grid-forming)是实现基础。',test:'频率扰动下 df/dt 与功率支撑关系、H 参数扫描、小信号稳定性、过载能力。'},
  {cat:'频率与调度',t:'POD 功率振荡阻尼',f:'ΔP_damp = Kd·Δω',p:'抑制低频振荡（0.1~2.5Hz 区间模式），通过附加阻尼控制器注入与振荡同相的功率调制。储能因响应快(ms)、可双向，是理想 POD 执行器；常用 WAMS 广域测量选模态。在振荡模态上附加 ΔPref=K·Δω(或模态量)，提供正阻尼。',test:'模式识别/阻尼比、注入信号相位、闭环稳定、不同振荡频率下的有效性。'},
  {cat:'频率与调度',t:'频率振荡抑制',f:'阻尼比 ζ = σ/√(σ²+ω²)  (λ=−σ±jω, σ>0 稳定)',p:'广义含低频振荡与次/超同步振荡(SSR/SSO)。新能源经串补或弱网易激发 SSO（逆变器控制与电网 L/C 交互）。措施：PSS、FACTS、储能快速有功、虚拟阻尼、附加滤波。关键是识别振荡源与主导模式、测阻尼比 ζ。',test:'扫频/扰动激励、振荡频率与阻尼比测量、低短路比(SCR)下的 SSO 风险。'},
  {cat:'频率与调度',t:'有功紧急控制',f:'第i轮: 动作频率 fi, 级差 Δf',p:'事件触发的就地/集中紧急措施，防系统崩溃：低频减载(UFLS)按轮次切负荷、高频减载、解列、紧急功率支援/切除。UFLS 在最严重故障后频率仍低于阈值时动作，按频率轮次(如49.0/48.8/48.6Hz)与级差切除。',test:'阈值/轮次/级差精度、动作时延(<几百ms)、复位与重合逻辑、与一次调频优先级。'},
  {cat:'频率与调度',t:'日本远程出力制御',f:'制御率 α: 出力 = (1−α)·P_avail',p:'日本光伏/风电高渗透，当某区域电力过剩（大发而负荷低、跨区联络线受限）时，由电网公司 / 广域运行机构 **OCCTO（広域系統運用機関）** 经 **広域出力制御** 系统向可再生能源下发 **出力制御指令（抑制率 α）**，强制按比例下调或停止出力——这是 **调度侧的供需调节（需給調整）** 手段，并非就地保护。2015 年九州电力首创，后纳入 OCCTO 广域运行；指令经 SCADA / 专用通信（常经 Modbus 或电力公司专用协议）下发到光伏逆变器 / PCS 的出力制御接口，按 α·P_rated 限功率。与防逆流（就地逆潮保护）互补。',test:'指令接收与执行时延、抑制率精度、分档切换平滑性、解除/复位逻辑、与防逆流/电压越限的优先级、通信中断时 fail-safe 行为。'},
  /* ---------- 通信协议 ---------- */
  {cat:'通信协议',t:'Modbus TCP',f:'MBAP(事务2+协议0+长度2+单元1)+PDU(功能码+数据)',p:'基于 TCP/IP(端口502)的客户-服务器规约。常用功能码：0x01读线圈、0x02读离散输入、0x03读保持寄存器、0x04读输入寄存器、0x05单线圈、0x06单寄存器、0x0F多线圈、0x10写多寄存器。32位值占连续2寄存器，注意字序(高低字)与字节序(ABCD/BADC/CDAB/DCBA)。',test:'地址 0/1-based 映射、字节序、系数/偏移、超时重连、并发请求、断链恢复。'},
  {cat:'通信协议',t:'IEC 60870-5-104',f:'APCI(U/I/S) + ASDU(TI,VSQ,COT,CA,IOA)',p:'远动规约，基于 TCP(端口2404)的平衡式传输，主站/子站。ASDU=类型标识TI+可变结构限定词VSQ+传送原因COT+公共地址+信息对象(IOA+信息元素)。支持遥测(归一化/标度化/短浮点)、遥信(单点/双点)、遥控(单/双命令)、累计量、SOE 时标、总召唤。比 Modbus 多了 COT、信息对象寻址与完整链路控制。',test:'链路建立、COT 正确性、SOE 时标、总召唤、遥控返校(选择-执行)、超时与复活。'},
  {cat:'通信协议',t:'GOOSE',f:'StNum(变位)+SqNum(顺序); TAL 超时=断链',p:'IEC 61850 中用于快速(ms级)状态/跳闸的组播报文，发布-订阅模型，链路层传输(不走IP路由)，VLAN 优先级高。StNum/SqNum 防重与检测丢失；心跳报文+TimeAllowedToLive 超时报警。用于间隔层联锁、跳闸、状态联动。',test:'报文周期、StNum/SqNum、VLAN/优先级、丢失检测、网络风暴/镜像、GOOSE 断链告警。'},
  {cat:'通信协议',t:'IEC 61850 总体',f:'MMS(报告/控制) · GOOSE(快速) · SV(采样值)',p:'变电站通信网络与系统标准。核心：信息模型(LN/DO/DA)、SV 采样值(9-2LE, 电流电压)、MMS 报告与控制(TCP 102)、GOOSE 快速报文、配置语言 SCL(ICD/SCD/CID)。站控层-间隔层-过程层三层架构；面向对象统一建模使互操作成为可能。',test:'模型一致性(ICD/CID)、MMS 报告触发、GOOSE/SV 收发、定值读写、时间同步(PTP)。'},
  /* ---------- 有功无功 ---------- */
  {cat:'有功无功',t:'有功与无功基础',f:'S²=P²+Q², cosφ=P/S, Q=P·tanφ',p:'有功 P=VIcosφ 决定频率(功率-频率平衡)，无功 Q=VIsinφ 决定电压(无功-电压平衡)。新能源逆变器可解耦控制：有功-频率下垂、无功-电压(Q-V)下垂。P/Q 独立可调是并网逆变器优势。',test:'功率因数 PF、有功/无功解耦、限流下的 P-Q 圆约束、电压支撑能力。'},
  {cat:'有功无功',t:'无功电压调节 / QU 曲线',f:'Q = -ΔU/k  (k: 斜率 kV/MVar)',p:'电站按并网点电压偏差自动调节无功：ΔU=U_real-U_cons，Q=-ΔU/k。电压偏低→发无功升压；偏高→吸无功。偏差率>15%通常判越限。有连续可调与分段(电压-无功)曲线两种。',test:'斜率 k、电压偏差率告警阈值、调节方向、与 AVC 协调、稳态精度。'},
  {cat:'有功无功',t:'AVC 自动电压控制',f:'Q_ref = f(U_grid, U_set, 斜率)',p:'调度 / 站级自动电压控制：根据并网点电压与设定值偏差，按电压-无功特性（或最优潮流）自动调节无功源（逆变器、SVG、电容器）出力，维持电压合格并优化网损。常与 AGC 协同（AVC+AGC）。',test:'电压设定值跟踪、调节方向、与 QU 曲线 / 就地保护的优先级、多无功源协调、稳态精度与振荡。'},
  {cat:'有功无功',t:'功率因数与电能质量',f:'THD = √(ΣVn²)/V1',p:'并网要求 PF 通常≥0.95(超前/滞后)，关注谐波、电压波动与闪变、三相不平衡。逆变器通过调制与滤波满足并网电能质量；AVC/AVQ 协调无功。',test:'PF 边界、谐波 THD、电压闪变、不平衡度(用对称分量测)。'},
  /* ---------- 光储与黑启动 ---------- */
  {cat:'光储与黑启动',t:'光储优化',f:'min Σ成本 + λ·RMSE(P); SOC_min≤SOC≤SOC_max',p:'储能平抑光伏波动、削峰填谷、防逆流、参与一次/二次调频、减少弃光。优化目标常为经济运行(峰谷价差)+功率平滑(RMSE约束)+SOC约束+寿命。策略：规则控制、模型预测(MPC)、动态规划(DP)。SPPC 站级协调光伏与储能功率分配。',test:'各场景功率分配、SOC 上下限、切换冲击、防逆流有效性、调频贡献。'},
  {cat:'光储与黑启动',t:'黑启动与构网型',f:'grid-forming: 电压源(可黑启动); grid-following: 电流源(需并网)',p:'无外部电源下，电源自启动建压并逐步恢复负荷与网络，最终同期并网。新能源黑启动难点：需先有电压源。构网型(grid-forming)逆变器可作为电压源建立初始电压/频率，光伏作为被启动电源，储能提供黑启动首启功率。grid-following 需外部电压才能工作，不能独立黑启动。',test:'孤网建立、频率/电压稳定、带负荷爬坡率、同期并网条件、多机并联稳定性。'},
  /* ---------- 测试方法 ---------- */
  {cat:'测试方法',t:'等价类划分',p:'把输入域分成有效等价类与无效等价类，每类取一个代表值。如 SOC 区间、功率区间、通信状态。用最少用例覆盖最多情况。',test:'列等价类表，标注有效/无效，每类至少一例；重点关注无效类的异常处理。'},
  {cat:'测试方法',t:'边界值分析',p:'测等价类边界及其相邻值。如 SOC=0/20/90/100、频率死区边界、电压上下限、寄存器首尾地址。错误最易发生在边界。',test:'取边界值与紧邻值(边界±1)组合；对死区/阈值做上下穿越测试。'},
  {cat:'测试方法',t:'错误推测法',p:'凭经验猜易错点：通信中断、字节序错、系数错、掉电恢复、时钟不同步、极端温度、多子阵同时动作、调度指令风暴。',test:'构造故障注入清单，逐条验证设备行为与恢复。'},
  {cat:'测试方法',t:'场景法',p:'用业务流程串起测试路径。如 纯光并网→限发→离网→并网，覆盖真实运行工况；强调状态迁移的完整性。',test:'画出主流程与异常分支，确保每条路径有对应用例。'},
  {cat:'测试方法',t:'探索性测试',p:'无既定脚本，边测边学。适合未知系统或新协议对接，记录发现的问题与线索，再固化成回归用例。',test:'设定时间盒与目标(如“找出 GOOSE 断链表现”)，事后沉淀用例。'}
];
function renderKB(){
  var cats=Array.from(new Set(KB.map(function(x){return x.cat;})));
  var catHtml=cats.map(function(c){return '<div class="tab'+(c===KB_CAT?' on':'')+'" onclick="kbCat(this)">'+c+'</div>';}).join('');
  document.getElementById('kb-cats').innerHTML=catHtml;
  var list=KB.filter(function(x){return x.cat===KB_CAT;});
  var fstyle="font-family:var(--mono);font-size:11px;background:var(--bg);border:1px solid var(--bd);border-radius:6px;padding:8px 10px;color:var(--acc2);white-space:pre-wrap;margin-top:4px";
  document.getElementById('kb-list').innerHTML=list.map(function(x){
    var fbox=x.f?'<div class="card-title" style="margin-top:8px">公式 / 标准</div><div style="'+fstyle+'">'+x.f.replace(/</g,'&lt;')+'</div>':'';
    return '<div class="acc-item"><div class="acc-h" onclick="acc(this)"><span class="acc-cat">'+x.cat+'</span><span class="acc-t">'+x.t+'</span><span class="acc-ar">▶</span></div><div class="acc-body"><div class="card-title">原理</div><div class="step-c">'+x.p.replace(/\n/g,'<br>')+'</div>'+fbox+'<div class="card-title" style="margin-top:8px">测试要点</div><div class="step-c">'+x.test.replace(/\n/g,'<br>')+'</div></div></div>';
  }).join('');
}
function kbCat(e){KB_CAT=(typeof e==='string')?e:e.textContent;renderKB();}
window.kbCat=kbCat;window.renderKB=renderKB;

/* ====================================================================== */
/* 公式速算器 Formula Lab                                                  */
/* ====================================================================== */
var LAB=[
  {id:'droop',t:'一次调频下垂',f:'ΔP = -(1/R)·(Δf/fn)·Pn',
   fields:[{k:'R',t:'调差率 R',u:'%',v:5},{k:'df',t:'频率偏差 Δf',u:'Hz',v:-0.1},{k:'fn',t:'额定频率 fn',u:'Hz',v:50},{k:'Pn',t:'额定功率 Pn',u:'MW',v:100}],
   calc:function(o){var R=o.R/100;return {val:-(1/R)*(o.df/o.fn)*o.Pn,u:'MW'};}},
  {id:'ace',t:'ACE 区域控制偏差',f:'ACE = ΔPtie + K·Δf',
   fields:[{k:'dPtie',t:'联络线偏差 ΔPtie',u:'MW',v:5},{k:'K',t:'频率偏差系数 K',u:'MW/Hz',v:800},{k:'df',t:'频率偏差 Δf',u:'Hz',v:-0.08}],
   calc:function(o){return {val:o.dPtie+o.K*o.df,u:'MW'};}},
  {id:'zeta',t:'阻尼比 ζ',f:'ζ = σ/√(σ²+ω²)',
   fields:[{k:'sig',t:'实部 σ',u:'',v:1.2},{k:'w',t:'虚部 ω',u:'rad/s',v:3.0}],
   calc:function(o){return {val:o.sig/Math.sqrt(o.sig*o.sig+o.w*o.w),u:''};}},
  {id:'vine',t:'虚拟惯量支撑功率',f:'P_ine = −2H·S·(df/dt)/fn',
   fields:[{k:'H',t:'惯量常数 H',u:'s',v:4},{k:'S',t:'额定容量 S',u:'MVA',v:100},{k:'dfdt',t:'df/dt',u:'Hz/s',v:-0.5},{k:'fn',t:'额定频率 fn',u:'Hz',v:50}],
   calc:function(o){return {val:-2*o.H*o.S*(o.dfdt)/o.fn,u:'MW'};}},
  {id:'qu',t:'QU 无功调节',f:'Q = -ΔU/k',
   fields:[{k:'dU',t:'电压偏差 ΔU',u:'kV',v:-1.5},{k:'k',t:'斜率 k',u:'kV/MVar',v:5}],
   calc:function(o){return {val:-(o.dU/o.k),u:'MVar'};}}
];
var LAB_ID='droop';
function renderLab(){
  document.getElementById('lab-tabs').innerHTML=LAB.map(function(x){
    return '<div class="tab'+(x.id===LAB_ID?' on':'')+'" onclick="labPick(\''+x.id+'\')">'+x.t+'</div>';}).join('');
  var m=LAB.filter(function(x){return x.id===LAB_ID;})[0];
  var html='<div class="fm" style="margin:0 0 12px">'+m.f+'</div>';
  html+='<div class="frm frm4">'+m.fields.map(function(f){
    return '<div class="lbl"><div class="lbl-txt">'+f.t+' <span class="lbl-unit">'+f.u+'</span></div><input type="number" step="any" value="'+f.v+'" id="lab-'+f.k+'" oninput="labCalc()"></div>';}).join('')+'</div>';
  html+='<div class="sep"></div>';
  html+='<div class="rst-grid"><div class="rst-item" style="min-width:200px"><div class="rst-lbl">计算结果</div><div class="rst-val" id="lab-out">—</div></div></div>';
  html+='<div class="hint">fn 取额定频率（工频 50Hz）；R 为调差率百分数。所有结果为输入即时计算，单位随公式。可用于验证报表/联调中手算的偏差。</div>';
  document.getElementById('lab-body').innerHTML=html;
  labCalc();
}
function labPick(id){LAB_ID=id;renderLab();}
function labCalc(){
  var m=LAB.filter(function(x){return x.id===LAB_ID;})[0];
  var o={};m.fields.forEach(function(f){o[f.k]=parseFloat(document.getElementById('lab-'+f.k).value)||0;});
  var r=m.calc(o);
  document.getElementById('lab-out').textContent=(Math.round(r.val*1e6)/1e6)+' '+r.u;
}
window.labPick=labPick;window.renderLab=renderLab;window.LAB=LAB;

/* ====================================================================== */
/* 首页粒子动画（轻量 canvas，纯离线）                                       */
/* ====================================================================== */
function initHero(){
  var cv=document.getElementById('hero-cv');if(!cv)return;
  var ctx=cv.getContext&&cv.getContext('2d');
  if(!ctx||typeof requestAnimationFrame==='undefined')return;
  var DPR=(typeof devicePixelRatio!=='undefined'&&devicePixelRatio>1)?devicePixelRatio:1;
  var W=0,H=0,nodes=[],lines=[],dataPackets=[],time=0;
  function resize(){var w=cv.clientWidth||600,h=cv.clientHeight||240;cv.width=w*DPR;cv.height=h*DPR;W=cv.width;H=cv.height;}
  function seed(){
    nodes=[];lines=[];dataPackets=[];time=0;
    var n=Math.max(20,Math.min(50,Math.floor(W/20)));
    for(var i=0;i<n;i++){
      nodes.push({x:Math.random()*W*0.9+W*0.05,y:Math.random()*H*0.8+H*0.1,r:(Math.random()*2+1)*DPR,vx:(Math.random()-.5)*0.15*DPR,vy:(Math.random()-.5)*0.15*DPR,o:Math.random()*0.5+0.3,pulse:Math.random()*6.28});
    }
    for(var i=0;i<nodes.length;i++){
      for(var j=i+1;j<nodes.length;j++){
        var dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<W*0.25&&Math.random()>0.6)lines.push({a:i,b:j,d:d});
      }
    }
  }
  function addPacket(){if(lines.length<1)return;var l=lines[Math.floor(Math.random()*lines.length)];dataPackets.push({line:l,prog:0,speed:0.008+Math.random()*0.012,life:1});}
  function step(){
    if(!W)resize();time+=0.016;
    ctx.clearRect(0,0,W,H);
    // 连接线
    for(var i=0;i<lines.length;i++){
      var l=lines[i],na=nodes[l.a],nb=nodes[l.b];
      ctx.beginPath();ctx.moveTo(na.x,na.y);ctx.lineTo(nb.x,nb.y);
      ctx.strokeStyle='rgba(57,230,195,'+(0.08+Math.sin(time+l.a)*0.04)+')';ctx.lineWidth=1*DPR;ctx.stroke();
    }
    // 数据包流动
    if(Math.random()<0.03)addPacket();
    for(var i=dataPackets.length-1;i>=0;i--){
      var pk=dataPackets[i],l=pk.line,na=nodes[l.a],nb=nodes[l.b];
      pk.prog+=pk.speed;
      if(pk.prog>=1){dataPackets.splice(i,1);continue;}
      var x=na.x+(nb.x-na.x)*pk.prog,y=na.y+(nb.y-na.y)*pk.prog;
      ctx.beginPath();ctx.arc(x,y,2.5*DPR,0,6.283);
      var grad=ctx.createRadialGradient(x,y,0,x,y,8*DPR);
      grad.addColorStop(0,'rgba(57,230,195,0.9)');grad.addColorStop(1,'rgba(57,230,195,0)');
      ctx.fillStyle=grad;ctx.fill();
      ctx.beginPath();ctx.arc(x,y,1.2*DPR,0,6.283);ctx.fillStyle='#39e6c3';ctx.fill();
    }
    // 节点
    for(var i=0;i<nodes.length;i++){
      var p=nodes[i];p.x+=p.vx;p.y+=p.vy;p.pulse+=0.05;
      if(p.x<p.r||p.x>W-p.r)p.vx*=-1;if(p.y<p.r||p.y>H-p.r)p.vy*=-1;
      var pulseR=p.r+Math.sin(p.pulse)*0.5;
      ctx.beginPath();ctx.arc(p.x,p.y,pulseR*2,0,6.283);
      var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,pulseR*3);
      g.addColorStop(0,'rgba(57,230,195,0.25)');g.addColorStop(1,'rgba(57,230,195,0)');
      ctx.fillStyle=g;ctx.fill();
      ctx.beginPath();ctx.arc(p.x,p.y,pulseR,0,6.283);
      ctx.fillStyle='rgba(57,230,195,'+p.o+')';ctx.fill();
    }
    requestAnimationFrame(step);
  }
  try{resize();seed();requestAnimationFrame(step);}catch(e){}
  if(typeof window!=='undefined'&&window.addEventListener){window.addEventListener('resize',function(){try{resize();seed();}catch(e){}});}
}
window.initHero=initHero;

/* ====================================================================== */
/* 自我介绍页 CSS 插画场景（纯 CSS，无 Three.js）                          */
/* ====================================================================== */
function initIntro3D() {
  // CSS 动画已在样式表中定义，无需 JS 初始化
  // 保留此函数作为占位，避免调用报错
}
window.initIntro3D = initIntro3D;

/* 折叠 */
function acc(el){el.parentElement.classList.toggle('on');}
window.acc=acc;

/* ====================================================================== */
/* 通用：复制 / 下载                                                    */
/* ====================================================================== */
function copyOut(id){var e=document.getElementById(id);if(!e)return;var t=e.textContent||'';
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){flash('已复制');});}else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');flash('已复制');}catch(e){}document.body.removeChild(ta);}}
function flash(msg){var d=document.createElement('div');d.textContent=msg;d.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--acc);color:#000;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;z-index:999';document.body.appendChild(d);setTimeout(function(){document.body.removeChild(d);},1200);}
function downloadTxt(id,fn){var e=document.getElementById(id);if(!e)return;var blob=new Blob([e.textContent||''],{type:'text/markdown;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(a.href);}
window.copyOut=copyOut;window.downloadTxt=downloadTxt;

/* ====================================================================== */
/* Canvas 图表引擎                                                      */
/* ====================================================================== */
function CanvasChart(ctx,canvas){this.ctx=ctx;this.canvas=canvas;var self=this;
  this.resize=function(){var p=canvas.parentElement;if(!p)return;var pw=p.clientWidth||400,ph=p.clientHeight||220;canvas.width=Math.min(pw-16,800);canvas.height=Math.min(ph-16,300);};
  this.resize();window.addEventListener('resize',function(){self.resize();if(self._drawFn)self._drawFn();});}
CanvasChart.prototype.clear=function(){var c=this.canvas,c2d=this.ctx;c2d.clearRect(0,0,c.width,c.height);};
CanvasChart.prototype.bar=function(labels,vals,colors){var c2d=this.ctx,c=this.canvas,W=c.width,H=c.height,pad={t:20,r:20,b:42,l:60},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b,n=vals.length,maxV=Math.max.apply(null,vals.concat([1]).map(Math.abs)),barW=Math.min(40,(cW/n)*0.55),gap=(cW-barW*n)/(n+1),self=this;
  this._drawFn=function(){c2d.clearRect(0,0,W,H);c2d.setLineDash([3,3]);c2d.strokeStyle='rgba(35,48,63,.8)';c2d.lineWidth=1;for(var i=0;i<=4;i++){var y=pad.t+cH*i/4;c2d.beginPath();c2d.moveTo(pad.l,y);c2d.lineTo(pad.l+cW,y);c2d.stroke();c2d.fillStyle='rgba(154,167,184,.7)';c2d.font='9px Consolas,monospace';c2d.textAlign='right';c2d.fillText((maxV*(4-i)/4).toFixed(1),pad.l-4,y+3);}c2d.setLineDash([]);c2d.strokeStyle='#23303F';c2d.lineWidth=1;c2d.beginPath();c2d.moveTo(pad.l,pad.t);c2d.lineTo(pad.l,pad.t+cH);c2d.lineTo(pad.l+cW,pad.t+cH);c2d.stroke();
    vals.forEach(function(v,i){var bh=Math.abs(v)/maxV*cH,bx=pad.l+gap*(i+1)+barW*i,by=v>=0?pad.t+cH-bh:pad.t+cH;c2d.fillStyle=colors[i]||'#FF8C42';c2d.fillRect(bx,by,barW,bh);c2d.fillStyle='#E6EAF0';c2d.font='9px Consolas,monospace';c2d.textAlign='center';c2d.fillText(v.toFixed(1),bx+barW/2,by-3);c2d.fillStyle='#9AA7B8';c2d.font='9px system-ui,sans-serif';c2d.textAlign='center';c2d.fillText(labels[i],bx+barW/2,pad.t+cH+14);});};this._drawFn();};
CanvasChart.prototype.hBar=function(labels,vals,colors){var c2d=this.ctx,c=this.canvas,W=c.width,H=c.height,pad={t:10,r:20,b:20,l:80},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b,n=vals.length,maxV=Math.max.apply(null,Array.from(vals).map(function(v){return Math.abs(parseFloat(v)||0);}).concat([1])),barH=Math.min(22,(cH/n)-4),gapY=(cH-barH*n)/(n+1),self=this;
  this._drawFn=function(){c2d.clearRect(0,0,W,H);c2d.setLineDash([3,3]);c2d.strokeStyle='rgba(35,48,63,.8)';c2d.lineWidth=1;for(var i=0;i<=4;i++){var x=pad.l+cW*i/4;c2d.beginPath();c2d.moveTo(x,pad.t);c2d.lineTo(x,pad.t+cH);c2d.stroke();c2d.fillStyle='rgba(154,167,184,.7)';c2d.font='9px Consolas,monospace';c2d.textAlign='center';c2d.fillText((maxV*i/4).toFixed(1),x,pad.t-3);}c2d.setLineDash([]);
    vals.forEach(function(v,i){var vi=parseFloat(v)||0,bw=vi/maxV*cW,bx=pad.l,by=pad.t+gapY*(i+1)+barH*i;c2d.fillStyle=colors[i]||'#FF8C42';c2d.fillRect(bx,by,bw,barH);c2d.fillStyle='#E6EAF0';c2d.font='9px Consolas,monospace';c2d.textAlign='left';c2d.fillText(v,bx+bw+4,by+barH/2+3);c2d.fillStyle='#9AA7B8';c2d.font='10px system-ui,sans-serif';c2d.textAlign='right';c2d.fillText(labels[i],pad.l-6,by+barH/2+3);});c2d.strokeStyle='#23303F';c2d.lineWidth=1;c2d.beginPath();c2d.moveTo(pad.l,pad.t);c2d.lineTo(pad.l,pad.t+cH);c2d.lineTo(pad.l+cW,pad.t+cH);c2d.stroke();};this._drawFn();};
CanvasChart.prototype.quLine=function(xs,ys,cx,cy){var c2d=this.ctx,c=this.canvas,W=c.width,H=c.height,pad={t:15,r:20,b:45,l:50},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b,xMin=Math.min.apply(null,xs),xMax=Math.max.apply(null,xs),yMin=Math.min.apply(null,ys),yMax=Math.max.apply(null,ys),xR=xMax-xMin||1,yR=yMax-yMin||1;if(yMin===yMax){yMin-=0.5;yMax+=0.5;yR=1;}
  var toX=function(x){return pad.l+(x-xMin)/xR*cW;},toY=function(y){return pad.t+cH-(y-yMin)/yR*cH;},self=this;
  this._drawFn=function(){c2d.clearRect(0,0,W,H);c2d.setLineDash([3,3]);c2d.strokeStyle='rgba(35,48,63,.8)';c2d.lineWidth=1;for(var i=0;i<=4;i++){var y=pad.t+cH*i/4;c2d.beginPath();c2d.moveTo(pad.l,y);c2d.lineTo(pad.l+cW,y);c2d.stroke();var val=yMin+yR*(4-i)/4;c2d.fillStyle='rgba(154,167,184,.7)';c2d.font='9px Consolas,monospace';c2d.textAlign='right';c2d.fillText(val.toFixed(2),pad.l-4,y+3);}c2d.setLineDash([]);
    if(yMin<=0&&yMax>=0){var zy=toY(0);c2d.strokeStyle='rgba(35,48,63,1)';c2d.lineWidth=1;c2d.beginPath();c2d.moveTo(pad.l,zy);c2d.lineTo(pad.l+cW,zy);c2d.stroke();}
    c2d.strokeStyle='#FF8C42';c2d.lineWidth=2;c2d.beginPath();xs.forEach(function(x,i){var px=toX(x),py=toY(ys[i]);if(i===0)c2d.moveTo(px,py);else c2d.lineTo(px,py);});c2d.stroke();
    xs.forEach(function(x,i){var px=toX(x),py=toY(ys[i]);c2d.fillStyle='#FF8C42';c2d.beginPath();c2d.arc(px,py,3,0,Math.PI*2);c2d.fill();});
    var px=toX(cx),py=toY(cy),ok=Math.abs(cx-(xMin+xR/2))/xR<0.15;c2d.fillStyle=ok?'#10B981':'#EF4444';c2d.beginPath();c2d.arc(px,py,5,0,Math.PI*2);c2d.fill();c2d.strokeStyle='#fff';c2d.lineWidth=2;c2d.stroke();c2d.fillStyle='#E6EAF0';c2d.font='9px Consolas,monospace';c2d.textAlign='center';c2d.fillText('('+cx.toFixed(2)+','+cy.toFixed(2)+')',px,py-10);
    c2d.strokeStyle='#23303F';c2d.lineWidth=1;c2d.beginPath();c2d.moveTo(pad.l,pad.t);c2d.lineTo(pad.l,pad.t+cH);c2d.lineTo(pad.l+cW,pad.t+cH);c2d.stroke();c2d.fillStyle='#5B6B7E';c2d.font='9px system-ui,sans-serif';c2d.textAlign='center';c2d.fillText('U (kV)',pad.l+cW/2,pad.t+cH+28);c2d.save();c2d.translate(10,pad.t+cH/2);c2d.rotate(-Math.PI/2);c2d.textAlign='center';c2d.fillText('Q (MVar)',0,0);c2d.restore();};this._drawFn();};
CanvasChart.prototype.pfCurve=function(xs,ys,fn,fd,f_real,total){var c2d=this.ctx,c=this.canvas,W=c.width,H=c.height,pad={t:15,r:20,b:45,l:55},cW=W-pad.l-pad.r,cH=H-pad.t-pad.b,xMin=Math.min.apply(null,xs),xMax=Math.max.apply(null,xs),yAll=ys.concat([0,total]),yMin=Math.min.apply(null,yAll),yMax=Math.max.apply(null,yAll),yR=yMax-yMin||1;
  var toX=function(x){return pad.l+(x-xMin)/(xMax-xMin||1)*cW;},toY=function(y){return pad.t+cH-(y-yMin)/yR*cH;},self=this;
  this._drawFn=function(){c2d.clearRect(0,0,W,H);c2d.setLineDash([3,3]);c2d.strokeStyle='rgba(35,48,63,.8)';c2d.lineWidth=1;for(var i=0;i<=4;i++){var y=pad.t+cH*i/4;c2d.beginPath();c2d.moveTo(pad.l,y);c2d.lineTo(pad.l+cW,y);c2d.stroke();var val=yMin+yR*(4-i)/4;c2d.fillStyle='rgba(154,167,184,.7)';c2d.font='9px Consolas,monospace';c2d.textAlign='right';c2d.fillText(val.toFixed(1),pad.l-4,y+3);}
    var dLo=toX(fn-fd),dHi=toX(fn+fd);c2d.fillStyle='rgba(255,176,32,.06)';c2d.fillRect(dLo,pad.t,dHi-dLo,cH);
    if(yMin<0&&yMax>0){var zy=toY(0);c2d.strokeStyle='rgba(35,48,63,1)';c2d.lineWidth=1;c2d.setLineDash([]);c2d.beginPath();c2d.moveTo(pad.l,zy);c2d.lineTo(pad.l+cW,zy);c2d.stroke();}
    var nx=toX(fn);c2d.strokeStyle='rgba(154,167,184,.4)';c2d.lineWidth=1;c2d.setLineDash([5,3]);c2d.beginPath();c2d.moveTo(nx,pad.t);c2d.lineTo(nx,pad.t+cH);c2d.stroke();c2d.setLineDash([]);
    c2d.strokeStyle='#FF8C42';c2d.lineWidth=2;c2d.beginPath();xs.forEach(function(x,i){var px=toX(x),py=toY(ys[i]);if(i===0)c2d.moveTo(px,py);else c2d.lineTo(px,py);});c2d.stroke();
    var px=toX(f_real),py=toY(total);c2d.fillStyle=total>0?'#10B981':total<0?'#EF4444':'#9AA7B8';c2d.beginPath();c2d.arc(px,py,6,0,Math.PI*2);c2d.fill();c2d.strokeStyle='#fff';c2d.lineWidth=2;c2d.stroke();c2d.fillStyle='#E6EAF0';c2d.font='9px Consolas,monospace';c2d.textAlign='center';c2d.fillText('f='+f_real.toFixed(3)+' ΔP='+total.toFixed(2),px,py-12);
    c2d.strokeStyle='#23303F';c2d.lineWidth=1;c2d.beginPath();c2d.moveTo(pad.l,pad.t);c2d.lineTo(pad.l,pad.t+cH);c2d.lineTo(pad.l+cW,pad.t+cH);c2d.stroke();c2d.fillStyle='#5B6B7E';c2d.font='9px system-ui,sans-serif';c2d.textAlign='center';c2d.fillText('f (Hz)',pad.l+cW/2,pad.t+cH+28);c2d.save();c2d.translate(10,pad.t+cH/2);c2d.rotate(-Math.PI/2);c2d.textAlign='center';c2d.fillText('ΔP (kW)',0,0);c2d.restore();};this._drawFn();};
CanvasChart.prototype.radar=function(labels,vals,color,prev,target){var c2d=this.ctx,c=this.canvas,W=c.width,H=c.height,cx=W/2,cy=H/2,R=Math.min(W,H)/2-42,n=labels.length,self=this;
  this._drawFn=function(){c2d.clearRect(0,0,W,H);for(var ring=1;ring<=4;ring++){c2d.beginPath();for(var i=0;i<=n;i++){var ang=-Math.PI/2+i*2*Math.PI/n,rr=R*ring/4,x=cx+rr*Math.cos(ang),y=cy+rr*Math.sin(ang);if(i===0)c2d.moveTo(x,y);else c2d.lineTo(x,y);}c2d.strokeStyle='rgba(35,48,63,.7)';c2d.lineWidth=1;c2d.stroke();}
    c2d.fillStyle='#9AA7B8';c2d.font='10px system-ui,sans-serif';c2d.textAlign='center';
    for(var i=0;i<n;i++){var ang=-Math.PI/2+i*2*Math.PI/n,x=cx+R*Math.cos(ang),y=cy+R*Math.sin(ang);c2d.strokeStyle='rgba(35,48,63,.7)';c2d.lineWidth=1;c2d.beginPath();c2d.moveTo(cx,cy);c2d.lineTo(x,y);c2d.stroke();var lx=cx+(R+16)*Math.cos(ang),ly=cy+(R+16)*Math.sin(ang);c2d.fillText(labels[i],lx,ly+3);}
    function poly(valsArr,col,fillA,lineDash){c2d.beginPath();for(var i=0;i<=n;i++){var idx=i%n,ang=-Math.PI/2+idx*2*Math.PI/n,rr=R*(valsArr[idx]/10),x=cx+rr*Math.cos(ang),y=cy+rr*Math.sin(ang);if(i===0)c2d.moveTo(x,y);else c2d.lineTo(x,y);}c2d.closePath();c2d.fillStyle=hexToRgba(col,fillA);c2d.fill();c2d.strokeStyle=col;c2d.lineWidth=2;if(lineDash)c2d.setLineDash(lineDash);else c2d.setLineDash([]);c2d.stroke();c2d.setLineDash([]);for(var i=0;i<n;i++){var ang=-Math.PI/2+i*2*Math.PI/n,rr=R*(valsArr[i]/10),x=cx+rr*Math.cos(ang),y=cy+rr*Math.sin(ang);c2d.fillStyle=col;c2d.beginPath();c2d.arc(x,y,3,0,Math.PI*2);c2d.fill();}}
    if(prev)poly(prev,'#38BDF8',0.12);
    if(target)poly(target,'#38BDF8',0.0,[4,3]);
    poly(vals,color,0.18);};this._drawFn();};

/* 图表 resize 总控 */
var CHART_IDS=['pv','pf','qu','sa','pc','soc','sym','radar'];
function resizeCharts(){CHART_IDS.forEach(function(id){var c=document.getElementById('c-'+id);if(c&&c._chart){c._chart.resize();if(c._chart._drawFn)c._chart._drawFn();}});}
/* 简历预览随容器宽度自适应缩放（仅缩放包裹器，不影响 .page，导出 PDF 仍为真实 A4） */
var _fitRT;
if(typeof window!=='undefined'){window.addEventListener('resize',function(){clearTimeout(_fitRT);_fitRT=setTimeout(function(){var ifr=document.getElementById('r-preview');if(ifr)fitResumePreview(ifr);},160);});}

/* ====================================================================== */
/* 设置 / 主题                                                          */
/* ====================================================================== */
var _ACC_PRESETS=['#FF8C42','#10B981','#FFB020','#A78BFA','#F472B6','#3B82F6','#EF4444','#38BDF8'];
var _THEMES=[{n:0,label:'青',acc:'#FF8C42'},{n:1,label:'绿',acc:'#10B981'},{n:2,label:'橙',acc:'#FF8C42'},{n:3,label:'紫',acc:'#A78BFA'},{n:4,label:'粉',acc:'#F472B6'},{n:5,label:'蓝',acc:'#3B82F6'},{n:6,label:'红',acc:'#EF4444'},{n:7,label:'黄',acc:'#FFB020'},{n:8,label:'浅',acc:'#FF8C42'}];
function hexToRgba(hex,a){hex=String(hex).replace('#','');if(hex.length===3)hex=hex.split('').map(function(c){return c+c;}).join('');var n=parseInt(hex,16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';}
function applyAcc(hex){var r=document.documentElement.style;r.setProperty('--acc',hex);r.setProperty('--acc2',hexToRgba(hex,1));r.setProperty('--acc3',hexToRgba(hex,.12));r.setProperty('--acc4',hexToRgba(hex,.28));}
function applyFont(s){document.documentElement.style.setProperty('--fs',s);}
function applyTheme(n){var b=document.body;for(var i=0;i<=8;i++)b.classList.remove('t'+i);b.classList.add('t'+n);}
function saveSettings(s){try{localStorage.setItem('spark_settings',JSON.stringify(s));}catch(e){}}
function loadSettings(){var def={acc:'#FF8C42',fs:1,theme:0},s=def;try{var raw=localStorage.getItem('spark_settings');if(raw)s=Object.assign(def,JSON.parse(raw));}catch(e){}return s;}
function _markAcc(hex){document.querySelectorAll('#accSwatches .swatch').forEach(function(el){el.classList.toggle('on',el.dataset.c&&el.dataset.c.toLowerCase()===String(hex).toLowerCase());});}
function _markTheme(n){document.querySelectorAll('#themeBtns .theme-btn').forEach(function(el){el.classList.toggle('on',+el.dataset.t===n);});}
function setAcc(hex,fromPicker){applyAcc(hex);var p=document.getElementById('accPicker');if(p)p.value=hex;_markAcc(hex);var s=loadSettings();s.acc=hex;saveSettings(s);}
function setTheme(n,fromBtn){applyTheme(n);_markTheme(n);var s=loadSettings();s.theme=n;var tDef=_THEMES[n]&&_THEMES[n].acc;if(tDef&&!fromBtn){applyAcc(tDef);_markAcc(tDef);s.acc=tDef;}saveSettings(s);}
function setFont(v){v=parseFloat(v)||1;applyFont(v);var l=document.getElementById('fsVal');if(l)l.textContent=Math.round(v*100)+'%';var s=loadSettings();s.fs=v;saveSettings(s);}
function resetSettings(){applyAcc('#FF8C42');applyFont(1);applyTheme(0);var p=document.getElementById('accPicker');if(p)p.value='#FF8C42';var r=document.getElementById('fsRange');if(r)r.value=1;var l=document.getElementById('fsVal');if(l)l.textContent='100%';_markAcc('#FF8C42');_markTheme(0);try{localStorage.removeItem('spark_settings');}catch(e){}}
function buildSwatches(){var box=document.getElementById('accSwatches');if(box){box.innerHTML='';_ACC_PRESETS.forEach(function(c){var d=document.createElement('div');d.className='swatch';d.dataset.c=c;d.style.background=c;d.title=c;d.onclick=function(){setAcc(c,false);};box.appendChild(d);});}
  var tBox=document.getElementById('themeBtns');if(tBox){tBox.innerHTML='';_THEMES.forEach(function(t){var d=document.createElement('div');d.className='swatch theme-btn';d.dataset.t=t.n;d.title=t.label+' 主题';d.style.background=t.acc;d.onclick=function(){setTheme(t.n,true);};tBox.appendChild(d);});}}
window.setAcc=setAcc;window.setFont=setFont;window.setTheme=setTheme;window.resetSettings=resetSettings;window.buildSwatches=buildSwatches;window.loadSettings=loadSettings;window.hexToRgba=hexToRgba;

/* ====================================================================== */
/* 初始化                                                                */
/* ====================================================================== */
function initData(){
  // 一次调频分段示例
  var pfBody=document.getElementById('pf-body');
  [[49.8,4],[49.5,5],[50.5,4],[51.0,6]].forEach(function(s,i){var tr=document.createElement('tr');
    tr.innerHTML='<td style="color:var(--tx3);font-size:9px;text-align:center">'+(i+1)+'</td><td><input type="number" value="'+s[0]+'" step="0.001"></td><td><input type="number" value="'+s[1]+'" step="0.1"></td><td><button class="btn btn-dng btn-sm" onclick="this.closest(\'tr\').remove();renumPf()">x</button></td>';pfBody.appendChild(tr);});
  // 储能子阵示例
  [['储能子阵A',500,550,450,2000,98,75],['储能子阵B',500,500,480,2000,95,60],['储能子阵C',500,520,460,2000,97,85],['储能子阵D',500,480,500,2000,96,50]].forEach(function(s,i){var tr=document.createElement('tr');
    tr.innerHTML='<td style="color:var(--tx3);font-size:9px;text-align:center">'+(i+1)+'</td><td><input type="text" value="'+s[0]+'"></td><td><input type="number" value="'+s[1]+'" step="1"></td><td><input type="number" value="'+s[2]+'" step="1"></td><td><input type="number" value="'+s[3]+'" step="1"></td><td><input type="number" value="'+s[4]+'" step="1"></td><td><input type="number" value="'+s[5]+'" step="0.1"></td><td><input type="number" value="'+s[6]+'" step="1"></td><td><button class="btn btn-dng btn-sm" onclick="this.closest(\'tr\').remove();renumSa()">x</button></td>';document.getElementById('sa-body').appendChild(tr);});
  // 站级SOC示例
  [['储能子阵A',500,2000,98,75],['储能子阵B',500,2000,95,60],['储能子阵C',500,2000,97,85],['储能子阵D',500,2000,96,50]].forEach(function(s,i){var tr=document.createElement('tr');
    tr.innerHTML='<td style="color:var(--tx3);font-size:9px;text-align:center">'+(i+1)+'</td><td><input type="text" value="'+s[0]+'"></td><td><input type="number" value="'+s[1]+'" step="1"></td><td><input type="number" value="'+s[2]+'" step="1"></td><td><input type="number" value="'+s[3]+'" step="0.1"></td><td><input type="number" value="'+s[4]+'" step="1"></td><td><button class="btn btn-dng btn-sm" onclick="this.closest(\'tr\').remove();renumSoc()">x</button></td>';document.getElementById('soc-body').appendChild(tr);});
  // 简历模块：渲染模板网格并绑定表单事件委托
  try{resumePick();}catch(e){}
  var _rf=document.getElementById('r-form');
  if(_rf){_rf.addEventListener('input',resumeOnInput);_rf.addEventListener('click',resumeFormClick);_rf.addEventListener('change',resumeOnChange);}
  // 报告默认一条
  addRpItem();
  // 雷达输入
  buildRadarInputs();
  // 新能源岗位 JD 库
  renderJD();
  // 场景库
  renderSC();
  // 知识库
  renderKB();
  // 公式速算器
  renderLab();
}

try{
  initData();
  try{initHero();}catch(e){}
  try{init3D&&init3D();}catch(e){}
  try{pfTplChange('欠频单段');}catch(e){}
  try{calcSiYao();}catch(e){}
  try{convBase();}catch(e){}
  try{convFloat();}catch(e){}
  try{buildSwatches();}catch(e){}
  try{var _s=loadSettings();applyTheme(_s.theme||0);applyAcc(_s.acc||'#FF8C42');applyFont(_s.fs||1);
    var _p=document.getElementById('accPicker');if(_p)_p.value=_s.acc||'#FF8C42';
    var _r=document.getElementById('fsRange');if(_r)_r.value=_s.fs||1;
    var _l=document.getElementById('fsVal');if(_l)_l.textContent=Math.round((_s.fs||1)*100)+'%';
    _markAcc(_s.acc||'#FF8C42');_markTheme(_s.theme||0);
  }catch(e){}
}catch(e){console.error(e);}

})();
