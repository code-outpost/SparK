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
    var wrap=document.createElement('div');
    wrap.innerHTML=html;
    var page=wrap.querySelector('.page');
    if(!page){flash('页面元素未找到');return;}
    // Render off-screen in the parent document so html2pdf always has a stable DOM,
    // regardless of whether the mobile preview iframe is currently visible.
    wrap.style.position='fixed';
    wrap.style.left='-9999px';
    wrap.style.top='0';
    wrap.style.width='794px';
    wrap.style.zIndex='-1';
    wrap.style.pointerEvents='none';
    document.body.appendChild(wrap);
    var opt={margin:0,filename:name+'.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#fff',logging:false},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}};
    function cleanup(){if(wrap.parentNode)wrap.parentNode.removeChild(wrap);}
    try{
      lib().set(opt).from(page).save().then(function(){flash('PDF 已下载');cleanup();}).catch(function(err){console.error(err);cleanup();try{window.print();}catch(e){}flash('PDF 生成失败，已改为打印');});
    }catch(e){cleanup(); try{window.print();}catch(e2){} flash('PDF 生成失败，已改为打印');}
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
/* 面试题库                                                              */
/* ====================================================================== */
var IV_BANK=[
  {c:'数采',q:'数采（子阵级）与 SPPC（站级）的职责边界是什么？',a:'数采负责子阵/设备级的运行数据采集、协议转换与上报；SPPC 负责站级的多子阵协调控制、功率分配与调度指令执行。测试时数采关注点表/通信/实时性，SPPC 关注协调策略/越限/切换。'},
  {c:'数采',q:'数采对接逆变器常用哪些协议？点表如何核对？',a:'常用 Modbus（TCP/RTU）与 SunSpec 模型，部分场景用 IEC 61850。点表核对靠四遥点位计算：起始地址 + 相对位置 + 序号，确认 0-based 与 1-based、字节序、系数偏移一致。'},
  {c:'数采',q:'遥测值跳变/异常通常怎么定位？',a:'先看系数与字节序是否配错（大小端、比例系数、偏移），再核对点表映射偏移；必要时抓包对比原始值与工程量换算结果。'},
  {c:'SPPC',q:'SPPC 站级功率分配有哪些策略？',a:'常见按额定容量比例、按 SOC 均衡、按最大可用功率限制等。目标是让各子阵在总目标功率下协同，同时满足各自 SOC 上下限。工具内「储能分配」模块可直接演练。'},
  {c:'SPPC',q:'光储并离网切换测试要关注什么？',a:'关注切换时间、冲击电流、电压/频率平稳性、离网带载能力、重新并网同步条件；以及切换前后储能 SOC 与功率是否被合理接管。'},
  {c:'SPPC',q:'站级调度指令响应超时怎么测？',a:'构造指令下发→设备响应链路，测量端到端响应时间，模拟通信中断/延迟/丢包，验证超时重试与降级策略。'},
  {c:'光储',q:'纯储、纯光、光储一体的测试重点有何不同？',a:'纯储关注充放电曲线、SOC 管理与并离网；纯光关注 MPPT、并网电能质量；光储一体额外关注光储协调功率分配、防逆流、削峰填谷策略。'},
  {c:'光储',q:'工商业光伏的防逆流（防倒灌）怎么验证？',a:'在并网点叠加负载/发电，验证 SPPC 根据并网点功率动态下调光伏/储能出力，使潮流不倒送；边界测试负荷突变与通信延迟。'},
  {c:'协议',q:'Modbus 保持寄存器 40001 在协议帧里是几号？',a:'40001 是 1-based PLC 地址，协议帧里寄存器地址为 0-based，即 40001−40001=0（偏移 40001 对应 0）。工具「通信速查」可自动换算。'},
  {c:'协议',q:'IEC 61850 里 MMS / GOOSE / SV 分别干什么？',a:'MMS 用于报告与控制（TCP 102）；GOOSE 用于快速状态/跳闸报文（组播，ms 级）；SV 用于合并单元采样值（电流电压）。'},
  {c:'方法论',q:'等价类划分和边界值分析怎么用在数采测试？',a:'等价类：把通信状态、SOC 区间、功率区间分成有效/无效类；边界值：测 SOC=0/20/90/100、频率死区边界、电压上下限等临界点。'},
  {c:'方法论',q:'错误推测法在新能源测试里常用哪些猜测？',a:'通信中断、字节序错、系数错、掉电恢复、时钟不同步、极端温度、多子阵同时动作、调度指令风暴。'},
  {c:'行业',q:'说说你对数字能源行业趋势的理解。',a:'储能从发电侧/电网侧向工商业用户侧延伸，光储一体与微网成为主流；站级控制器（SPPC）价值上升，强调协调控制、安全与可运维性，测试也更重系统级与场景级。'},
  {c:'频率',q:'一次调频的原理、调差率与死区是什么？',a:'电源利用本体调速/下垂特性对频率偏差秒级自动响应：ΔP=-(1/R)·(Δf/fn)·Pn。R 为调差率（如5%），死区 fd（±0.03~0.06Hz）避免频繁动作。一次调频只调偏差比例、不消除稳态偏差，由二次调频接管。测试看响应时间、调差率、死区与超调。'},
  {c:'频率',q:'新能源（光伏/风机）为何需要附加调频能力？',a:'风光无旋转惯量，不能像同步机那样靠转子自然响应频率。需通过限功率预留备用+有功-频率下垂+虚拟惯量+AGC 跟踪来提供调频。难点是资源间歇、预测误差、减载即弃电。'},
  {c:'频率',q:'二次调频（AGC）与一次调频如何分工？',a:'一次调频秒级、就地、调偏差比例；二次调频分钟级、由调度按 ACE=ΔPtie+K·Δf（K=区域频率偏差系数 MW/Hz；%偏置写作 10B·Δf）下发 AGC 指令，消除稳态频率与联络线偏差。二者不抵消：二次动作慢、不干扰一次。'},
  {c:'频率',q:'虚拟惯量 / VSG 是怎么给系统“加惯量”的？',a:'用控制算法让逆变器模拟同步机转子方程 J·dω/dt=(Pm-Pe)/ω-D(ω-ω0)，惯性支撑功率     P_ine≈−2H·S·(df/dt)/fn（df/dt<0 即频率下降时发出正功率支撑电网）。提供瞬时功率支撑、减缓 df/dt，为一次调频争取时间。H 越大支撑越强，但过载与稳定性需权衡。'},
  {c:'频率',q:'POD（功率振荡阻尼）的原理是什么？储能为何适合做 POD？',a:'在低频振荡（0.1~2.5Hz）模态上注入与振荡同相的功率调制 ΔP=Kd·Δω，提供正阻尼。储能响应 ms 级、可双向、位置灵活，是理想 POD 执行器；常用 WAMS 广域测量选主导模态。'},
  {c:'频率',q:'频率振荡抑制还要关注什么？（SSR/SSO）',a:'除低频振荡外，新能源经串补或弱网易激发次/超同步振荡（SSR/SSO），源于逆变器控制与电网 L/C 交互。措施：PSS、FACTS、储能快速有功、虚拟阻尼。关键在识别振荡源与主导模式、测阻尼比 ζ。'},
  {c:'调度',q:'有功紧急控制（如低频减载 UFLS）如何工作？',a:'事件触发、就地/集中紧急措施防崩溃：UFLS 按频率轮次（如49.0/48.8/48.6Hz）与级差切除负荷；还有高频减载、解列、紧急功率支援。测试看阈值/轮次/级差精度、动作时延(<几百ms)、复位与重合逻辑。'},
  {c:'调度',q:'日本“远程出力制御”是什么？测什么？',a:'日本高渗透光伏/风电在区域电力过剩时，由电网公司 / 广域运行机构 OCCTO 经“広域出力制御”系统下发“出力制御指令（抑制率 α）”，强制按比例下调或停止出力——属调度侧供需调节(需給調整)，非就地保护。2015 九州电力首创。测指令接收/执行时延、抑制率精度、分档切换、复位逻辑、与防逆流优先级、通信中断 fail-safe。'},
  {c:'通信',q:'Modbus TCP 的帧结构、功能码与字节序要点？',a:'帧=MBAP头(事务2+协议0+长度2+单元1)+PDU(功能码+数据)，端口502。功能码 0x03读保持/0x04读输入/0x06单寄存器/0x10写多寄存器等。32位占2寄存器，注意字序(高低字)与字节序(ABCD/BADC/CDAB/DCBA)。测试重地址映射、字节序、系数偏移、超时重连。'},
  {c:'通信',q:'IEC 60870-5-104 的 ASDU 与传送原因(COT)怎么理解？',a:'基于 TCP(2404)平衡式传输。ASDU=类型标识TI+可变结构限定词VSQ+传送原因COT+公共地址+信息对象(IOA+元素)。COT 区分是周期/突发/总召唤/遥控等，是排障关键。测链路建立、COT 正确性、SOE 时标、总召唤、遥控选择-执行、超时复活。'},
  {c:'通信',q:'GOOSE 的 StNum/SqNum 起什么作用？',a:'StNum(状态号)变化代表数据变位，SqNum(顺序号)标识同一状态内的重传序号；心跳+TimeAllowedToLive 超时判断链。链路层组播、VLAN 高优先级。测报文周期、St/Sq、丢失检测、网络风暴与断链告警。'},
  {c:'有功无功',q:'无功-电压调节（QU 曲线）的原理？',a:'按并网点电压偏差调无功：Q=-ΔU/k，ΔU=U_real-U_cons。电压偏低发无功升压、偏高吸无功；偏差率>15%通常判越限。测试看斜率 k、电压偏差率告警、调节方向、与 AVC 协调。'},
  {c:'光储',q:'光储优化的目标与策略有哪些？',a:'目标常为经济运行(峰谷价差)+功率平滑(RMSE约束)+SOC约束+寿命。策略：规则控制、模型预测(MPC)、动态规划(DP)。SPPC 站级协调光伏与储能分配。测试看各场景功率分配、SOC 上下限、切换冲击、防逆流与调频贡献。'},
  {c:'黑启动',q:'黑启动中“构网型(grid-forming)”与“跟网型(grid-following)”区别？',a:'构网型是电压源，可自主建立电压/频率，能做黑启动首启电源；跟网型是电流源，需外部电压才能工作、不能独立黑启动。新能源黑启动靠储能/构网型先建压，光伏作为被启动电源接入。测试看孤网建立、频率/电压稳定、带负荷爬坡、同期并网条件。'},

  /* ========== 数字能源测试扩展题库 ========== */
  {c:'数采',q:'储能系统绝缘测试的步骤和注意事项是什么？',a:'步骤：①断开所有负载和电源并放电；②用1000V兆欧表测高压侧/低压侧对地绝缘；③记录绝缘电阻值（正常≥10MΩ，湿热≥2MΩ）。注意：测试前必须放电、接地可靠、环境温度15-30℃、测试后充分放电。绝缘电阻偏低时排查线缆破损、端子受潮、绝缘老化。'},
  {c:'数采',q:'电池均衡功能验证一般怎么做？',a:'①用高精度万用表记录各单体电压；②在不同荷电态（满充/半充/放空）观察电压分布；③记录均衡前后压差变化；④检查均衡电流是否在BMS规格范围内；⑤确认温度补偿系数正确。判断标准：静态压差一般<30mV，动态<50mV（按厂家规范）。'},
  {c:'数采',q:'BMS 与 PCS/逆变器通信中断如何快速定位？',a:'①物理层：检查CAN/RS485终端电阻、线缆、屏蔽接地、端口定义；②协议层：抓包确认波特率、帧ID、报文周期、CRC；③应用层：核对协议版本、信号映射、心跳/超时机制；④逐步复位BMS与PCS，观察链路恢复；⑤模拟通信中断验证PCS降功率或停机策略。'},
  {c:'数采',q:'数采 SOE 与时钟同步测试要点是什么？',a:'SOE（事件顺序记录）测试：①产生已知顺序的遥信变位（如开关分合）；②检查数采上报时标分辨率（通常≤1ms或≤10ms）；③与GPS/BDS/IRIG-B对时源比对；④断链后守时精度测试；⑤多子阵间对时一致性比对。关键：时标准确、顺序不颠倒、缓存不丢。'},
  {c:'数采',q:'如何验证储能系统并网保护的阈值与时延？',a:'用继电保护测试仪或功率硬件在环注入故障：①过压/欠压保护：阶跃至1.1/0.85倍额定，测动作电压与脱网时间；②过频/欠频保护：49.5/50.5Hz等；③反孤岛：电网断开后2s内脱网；④恢复并网：电压/频率回到允许范围并持续后再并网。记录动作值、返回值、时延。'},
  {c:'SPPC',q:'SPPC 多子阵功率分配出现偏差的常见原因有哪些？',a:'①各子阵额定容量、SOC、SOH、可用功率不同；②通信延迟或丢包导致指令不同步；③子阵本地控制环（PCS）响应特性差异；④限功率/保护动作使子阵无法跟踪目标；⑤站级策略参数（均衡系数、死区）设置不当。测试方法：注入相同/不同目标功率，对比各子阵实际出力与指令误差。'},
  {c:'SPPC',q:'站级 SOC 均衡策略测试怎么设计？',a:'①构造各子阵不同SOC初态；②下发充/放电总功率目标；③记录SOC变化曲线与分配功率；④验证是否按SOC高低反向分配（SOC高的少充/多放，SOC低的多充/少放）；⑤校验均衡收敛时间、SOC差阈值、到限保护。关键：不越限、不震荡、收敛可预期。'},
  {c:'SPPC',q:'SPPC 通信中断 fail-safe 如何验证？',a:'①模拟SPPC与子阵/调度通信中断；②观察SPPC是否按预设策略执行（如保持最后指令、按本地计划运行、逐步降至0功率或停机）；③确认故障恢复后能否平滑接管，不造成功率冲击；④检查告警上报与复位逻辑。边界：短时闪断、长时中断、通道冗余切换。'},
  {c:'SPPC',q:'防逆流（防倒灌）功能在站级如何测试？',a:'①在并网点加负载/发电，使潮流趋于倒送；②验证SPPC动态下调光伏/储能出力；③测试负荷突变、通信延迟、测量误差场景；④确认无倒送且用户侧供电不受影响；⑤检查防逆流与调度发电计划的优先级、死区、响应时延。'},
  {c:'SPPC',q:'SPPC 收到调度限功率指令后的响应时延怎么测？',a:'①在调度通道注入带时标的目标功率指令；②用数采/PMU记录全站有功响应曲线；③测90%响应时间、超调量、稳态误差；④模拟指令跳变、斜坡、上下限场景；⑤验证多子阵同步跟踪能力。一般要求秒级响应、稳态误差<2%。'},
  {c:'光储',q:'光储系统中光伏与储能功率耦合的测试点有哪些？',a:'①并网点功率潮流方向与幅值；②光伏出力波动时储能平滑功率的跟踪精度；③防逆流/限功率下光储协调动作；④储能SOC约束对光伏消纳的影响；⑤并离网切换时光伏限功率与储能建压的配合；⑥谐波、闪变等电能质量。'},
  {c:'光储',q:'削峰填谷策略在工商业场景如何测试？',a:'①导入分时电价/需量限制曲线；②设置储能充放电计划；③验证峰段放电、谷段充电、需量不越限；④模拟负荷预测偏差、电价突变、设备故障；⑤检查收益计算与SOC约束（峰前充满、谷后不低于下限）。'},
  {c:'光储',q:'光储电站并网测试的核心要求有哪些？',a:'①电压/频率偏差：电压±10%、频率±0.5Hz内不脱网；②功率因数≥0.95（滞后/超前可调）；③谐波、闪变、三相不平衡符合GB/T 14549/GB/T 12326；④低电压/高电压穿越；⑤防孤岛2s内脱网；⑥保护动作时间、绝缘、漏电流合格。'},
  {c:'协议',q:'Modbus 功能码 0x03/0x04/0x06/0x10 的区别与应用场景是什么？',a:'0x03读保持寄存器（配置/电量）；0x04读输入寄存器（实时采样，只读）；0x06写单个寄存器（遥控/参数）；0x10写多个寄存器（批量设点/曲线）。测试时核对地址、数量、字节数、异常码0x01/0x02/0x03/0x04的处理。'},
  {c:'协议',q:'DL/T 645 与 Modbus 在电表/数采场景的差异是什么？',a:'DL/T 645面向多功能电能表，数据标识DI_DI为2字节+2字节，有主从问答与主动上报，常见波特率1200/2400；Modbus通用RTU/TCP，地址+功能码+数据+CRC，更灵活。测试中都要核对数据标识/寄存器映射、波特率、校验、字节序。'},
  {c:'协议',q:'IEC 61850 建模中 LN、DO、DA 的含义与测试关系？',a:'LN逻辑节点（如MMXU、GGIO、PDIF）代表功能实体；DO数据对象（如TotW、Hz）代表测量/控制量；DA数据属性（如mag.f、q、t）代表值、品质、时标。测试时核对SCD/CID文件，确保数据集、报告控制块、GOOSE/SV映射与点表一致。'},
  {c:'协议',q:'SCL 文件（SCD/CID/ICD）在测试交接中起什么作用？',a:'ICD是装置能力描述，CID是已配置实例，SCD是全站系统配置。测试中用SCD/CID核对IED名称、IP、数据集、GOOSE订阅、控制块触发选项、报告使能。变更SCL后必须重新下装并做一致性验证。'},
  {c:'方法论',q:'储能系统调试的基本流程和关键节点有哪些？',a:'流程：准备→设备检查→单体测试→分系统测试→系统联调→性能测试→验收。关键节点：设备型号/安装核对；电池单体电压/内阻；PCS空载/带载；BMS通信；充放电曲线；绝缘/保护；并网切换；效率/响应时间。每步留记录、签字、可追溯。'},
  {c:'方法论',q:'缺陷闭环管理在控制器测试中的关键动作是什么？',a:'①准确复现并记录现象、环境、版本；②定位根因（软件/配置/硬件/标准理解）；③修复后回归验证，确保不引入新问题；④更新用例库与checklist；⑤评审缺陷趋势，推动设计/流程改进。闭环证据：截图、日志、报文、测试报告。'},
  {c:'方法论',q:'如何设计一条可复现的站级切换测试用例？',a:'明确前置条件（拓扑、SOC、负载、电网状态）、操作步骤（指令/触发条件）、期望结果（电压/频率/功率曲线、切换时间、冲击电流）、判定标准（阈值、时延）、测试设备（录波仪/功率分析仪/数采）、环境复位步骤。关键：参数化、可重复、独立可调。'},
  {c:'方法论',q:'新能源测试中回归测试重点关注什么？',a:'①已修复缺陷不再复现；②核心计算逻辑（功率分配、SOC、频率响应）数值一致性；③通信协议版本兼容；④配置参数下装不丢失；⑤多场景组合边界（光储/并离网/通信中断）；⑥新增功能不影响旧功能。'},
  {c:'行业',q:'储能系统能量效率（Round-Trip Efficiency）如何定义与测试？',a:'定义：一次完整充放电循环中放电能量/充电能量×100%。测试：在额定功率、标准温度下，从SOC下限充到上限再放到下限，用高精度功率分析仪积分P-t。注意扣除辅助用电、温升影响、静置损耗，报告需注明功率、SOC区间、环境温度。'},
  {c:'行业',q:'工商业储能盈利模式对测试验证提出了哪些要求？',a:'主要模式：峰谷套利、需量管理、动态增容、需求响应、备用电源。测试要求：分时电价策略执行准确；SOC状态满足峰段放电；需量不越限；响应电网调度/DR事件；备用电源切换可靠。需用真实电价/负荷曲线做场景回归。'},
  {c:'行业',q:'构网型与跟网型逆变器在行业应用中的趋势差异是什么？',a:'跟网型依赖电网电压，成本低、成熟度高，适合强网；构网型可提供电压源特性、惯量支撑、黑启动，适合高比例新能源/弱网/微网。趋势：大型风光基地、孤岛/微网、储能替代同步调相机更多采用构网型，测试重点从并网性能扩展到构网稳定性。'},
  {c:'频率',q:'一次调频响应时间与调差率测试怎么做？',a:'用频率扰动发生器或仿真注入阶跃频率偏差，录波记录有功响应曲线。测试指标：①响应时间（频率越死区到功率开始变化，一般≤3s）；②调差率R（实测ΔP/Pn / Δf/fn，误差<±10%R）；③超调量；④稳态功率。需测上/下扰双向。'},
  {c:'频率',q:'AGC 指令跟踪精度与响应时延如何测试？',a:'下发阶跃/斜坡AGC目标值，记录全站有功。指标：①响应时间（目标变化10%到90%响应，一般≤1min）；②调节速率（额定%/min）；③稳态误差（<±2%Pn或按调度要求）；④反向调节死区。需区分一次调频与AGC贡献。'},
  {c:'调度',q:'远程调度指令的优先级与本地策略冲突怎么测？',a:'构造调度限功率、防逆流、本地计划、SOC保护等多目标冲突场景。验证：①调度指令在通信正常时是否优先；②本地安全保护（过压/过频/逆流）是否能覆盖调度；③冲突时告警与记录；④通信恢复后是否按调度接管。'},
  {c:'调度',q:'调度计划曲线（日前/日内/实时）下发与执行如何验证？',a:'①按时间轴下发计划曲线；②对比计划值与实测值偏差；③验证曲线插值/断点处理；④模拟曲线更新、撤回、越限裁剪；⑤检查执行率统计与上报。测试中需覆盖整点、半点、分钟级更新。'},
  {c:'调度',q:'需求响应（DR）事件中储能调度测试要点是什么？',a:'①DR信号接收（平台/调度/Aggregator）；②响应确认与容量锁定；③事件触发后功率调节方向/幅度/持续时间；④事件结束后平滑退出；⑤结算数据（响应时长、实际削减/增加量）准确性。关键：不触发防逆流、SOC留有余量。'},
  {c:'通信',q:'IEC 60870-5-104 总召唤、遥控选择-执行流程怎么测？',a:'总召唤：链路建立后主站下发总召唤命令，检查终端是否按 ASDU 100/1/8 上送全数据。遥控：①主站下发选择命令（ASDU 45/46）；②终端返校成功后下发执行；③验证动作与SOE；④测试取消、双点、超时未执行、返校失败等异常。'},
  {c:'通信',q:'通信中断、延迟、丢包如何模拟与验证？',a:'可用网络损伤仪、交换机ACL限速、防火墙、软件代理（如tc/netem）模拟：①断链（拔线/禁端口）看超时重连与fail-safe；②延迟100/500/1000ms看控制稳定性；③丢包1%/5%/10%看数据完整性与重传；④乱序/重复报文看协议容错。'},
  {c:'通信',q:'冗余通信通道切换测试关注什么？',a:'①主通道故障时备用通道应在秒级接管；②切换过程数据不丢、控制不中断或按fail-safe过渡；③主通道恢复后是否回切及回切策略；④双发双收场景下数据一致性；⑤通道状态告警准确。测试：拔网线、关端口、模拟链路震荡。'},
  {c:'通信',q:'数采与后台通信链路频繁闪断怎么排查？',a:'①物理层：网线、水晶头、接地、EMC干扰；②网络层：IP冲突、路由抖动、MTU、防火墙会话老化；③应用层：心跳周期过短、并发连接数超限、报文过大；④日志：记录断链/重连时间戳、错误码；⑤逐步隔离定位是网络问题还是协议实现问题。'},
  {c:'有功无功',q:'功率因数、有功/无功解耦控制测试要点是什么？',a:'设置不同有功出力点，分别给定功率因数、无功目标、电压目标，验证PCS能否独立调节Q而不影响P。指标：功率因数精度（±0.01）、无功响应时间、电压调节稳态误差、过调量。注意有功满发时无功能力受限。'},
  {c:'有功无功',q:'谐波与电能质量测试关注哪些指标？',a:'①谐波：2~25次电压/电流谐波含有率、THD；②间谐波、直流注入；③电压闪变Pst/Plt；④三相不平衡度；⑤电压偏差与频率偏差。依据GB/T 14549、GB/T 12325、NB/T 32004等。测试工况：满载、半载、不同功率因数、启停。'},
  {c:'有功无功',q:'AVC/AGC 协调控制测试的关键点是什么？',a:'①AGC（有功）与AVC（无功）指令同时下发时，验证有功/无功独立跟踪且不互相耦合；②站级策略分配至多子阵的功率/无功是否均衡；③限功率时无功优先还是有功优先；④通信异常时本地保持策略；⑤记录响应时间、稳态误差、越限保护动作。'},
  {c:'有功无功',q:'三相不平衡/对称分量在测试中怎么判断？',a:'用功率分析仪或对称分量法计算正序、负序、零序分量。判断：①三相电压/电流幅值差<2%；②负序不平衡度一般<2%（正常）、<4%（短时）；③零序在接地故障或三相负载严重不对称时增大。测试中应记录A/B/C波形与序分量。'},
  {c:'黑启动',q:'黑启动试验的前提条件与步骤是什么？',a:'前提：电网全黑、储能/柴油机等具备构网能力、关键负载清单确认、保护定值切换为黑启动模式。步骤：①构网型储能建立电压/频率；②分批接入可控负荷；③逐步启动光伏/风机（跟网型需等压）；④监测系统频率/电压稳定；⑤与主网同期后并网。'},
  {c:'黑启动',q:'孤网带负荷爬坡测试关注什么？',a:'关注：①负荷突加/突卸时频率/电压最大跌落与恢复时间；②有功-频率下垂特性是否满足设计要求；③储能SOC是否支撑到负荷稳定；④无功补偿/电压调节是否跟上；⑤保护不误动。测试方法：按10%/25%/50%/75%/100%负荷阶梯投切。'},
  {c:'黑启动',q:'同期并网条件与同期装置测试要点是什么？',a:'同期条件：电压差<5%、频率差<0.1Hz、相角差<10°。测试：用同期表/同期装置记录压差、频差、相角差曲线，验证合闸令在相角差允许窗口内发出；测试手动/自动同期、滑差过大闭锁、电压/频率越限闭锁、非同期合闸保护。'}
];
var IV_CAT='全部';
function renderIV(){
  var cats=['全部'].concat(Array.from(new Set(IV_BANK.map(function(x){return x.c;}))));
  document.getElementById('iv-cats').innerHTML=cats.map(function(c){
    return '<div class="tab'+(c===IV_CAT?' on':'')+'" onclick="ivCat(\''+c+'\')">'+c+'</div>';
  }).join('');
  var term=(document.getElementById('iv-search')||{value:''}).value.trim().toLowerCase();
  var list=IV_BANK.filter(function(x){
    var catOk=IV_CAT==='全部'||x.c===IV_CAT;
    var termOk=!term || (x.q+' '+x.a).toLowerCase().indexOf(term)>-1;
    return catOk && termOk;
  });
  var box=document.getElementById('iv-list');
  if(!list.length){
    box.innerHTML='<div class="rst-empty">未找到匹配题目，换个关键词试试</div>';
    return;
  }
  box.innerHTML=list.map(function(it,i){
    return '<div class="acc-item"><div class="acc-h" onclick="acc(this)"><span class="acc-cat">'+it.c+'</span><span class="acc-t">'+it.q+'</span><span class="acc-ar">▶</span></div>'+
      '<div class="acc-body"><div class="step-c">'+it.a+'</div></div></div>';
  }).join('');
}
function ivCat(c){IV_CAT=c;renderIV();}
window.ivCat=ivCat;

/* ====================================================================== */
/* 能力雷达图                                                            */
/* ====================================================================== */
var RADAR_DIMS=[
  {k:'dc',t:'数采(子阵级)'},
  {k:'sp',t:'SPPC(站级)'},
  {k:'sc',t:'场景广度'},
  {k:'cm',t:'协议与通信'},
  {k:'au',t:'自动化/脚本'},
  {k:'doc',t:'文档与报告'}
];
function buildRadarInputs(){
  document.getElementById('radar-inputs').innerHTML=RADAR_DIMS.map(function(d){
    return '<div class="lbl"><div class="lbl-txt">'+d.t+'</div><input type="number" id="rad_'+d.k+'" min="0" max="10" value="5" step="1"></div>';
  }).join('');
}
function readRadar(){
  return RADAR_DIMS.map(function(d){var v=+document.getElementById('rad_'+d.k).value;return isNaN(v)?0:Math.max(0,Math.min(10,v));});
}
function drawRadar(prev){
  var vals=readRadar();
  var labels=RADAR_DIMS.map(function(d){return d.t;});
  var c=document.getElementById('c-radar');
  if(!c._chart)c._chart=new CanvasChart(c.getContext('2d'),c);
  c._chart.radar(labels,vals,'#FF8C42',prev);
  document.getElementById('radar-tip').textContent=prev?'当前(橙) vs 上次(蓝) 对比':'各维度 0~10 自评。可「保存本次」后用「对比上次」看成长。';
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
  if(pcMode==='direct'){var U=+document.getElementById('pc-u').value,I=+document.getElementById('pc-i').value,tu=(+document.getElementById('pc-tu').value)*Math.PI/180,ti=(+document.getElementById('pc-ti').value)*Math.PI/180,dth=tu-ti;S=3*U*I;P=S*Math.cos(dth);Q=S*Math.sin(dth);PF=Math.cos(dth);phi=dth*180/Math.PI;}
  else if(pcMode==='pf'){var U=+document.getElementById('pc-pf-u').value,I=+document.getElementById('pc-pf-i').value;PF=+document.getElementById('pc-pf-pf').value;S=3*U*I;P=S*PF;Q=Math.sqrt(Math.max(0,S*S-P*P));phi=Math.acos(PF)*180/Math.PI;}
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
  var Ua={r:Va,i:0},Ub={r:Vb*Math.cos(tb),i:Vb*Math.sin(tb)},Uc={r:Vc*Math.cos(tc),i:Vc*Math.sin(tc)};
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
  this._drawFn=function(){c2d.clearRect(0,0,W,H);c2d.setLineDash([3,3]);c2d.strokeStyle='rgba(35,48,63,.8)';c2d.lineWidth=1;for(var i=0;i<=4;i++){var x=pad.l+cW*i/4;c2d.beginPath();c2d.moveTo(x,pad.t);c2d.lineTo(x,pad.t+cH);c2d.stroke();c2d.fillStyle='rgba(154,167,184,.7)';c2d.font='9px Consolas,monospace';c2d.textAlign='center';c2d.fillText((maxV*(4-i)/4).toFixed(1),x,pad.t-3);}c2d.setLineDash([]);
    vals.forEach(function(v,i){var vi=parseFloat(v)||0,bw=vi/maxV*cW,bx=pad.l,by=pad.t+gapY*(i+1)+barH*i;c2d.fillStyle=colors[i]||'#FF8C42';c2d.fillRect(bx,by,bw,barH);c2d.fillStyle='#E6EAF0';c2d.font='9px Consolas,monospace';c2d.textAlign='right';c2d.fillText(v,bx+cW+4,by+barH/2+3);c2d.fillStyle='#9AA7B8';c2d.font='10px system-ui,sans-serif';c2d.textAlign='right';c2d.fillText(labels[i],pad.l-6,by+barH/2+3);});c2d.strokeStyle='#23303F';c2d.lineWidth=1;c2d.beginPath();c2d.moveTo(pad.l,pad.t);c2d.lineTo(pad.l,pad.t+cH);c2d.stroke();};this._drawFn();};
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
CanvasChart.prototype.radar=function(labels,vals,color,prev){var c2d=this.ctx,c=this.canvas,W=c.width,H=c.height,cx=W/2,cy=H/2,R=Math.min(W,H)/2-42,n=labels.length,self=this;
  this._drawFn=function(){c2d.clearRect(0,0,W,H);for(var ring=1;ring<=4;ring++){c2d.beginPath();for(var i=0;i<=n;i++){var ang=-Math.PI/2+i*2*Math.PI/n,rr=R*ring/4,x=cx+rr*Math.cos(ang),y=cy+rr*Math.sin(ang);if(i===0)c2d.moveTo(x,y);else c2d.lineTo(x,y);}c2d.strokeStyle='rgba(35,48,63,.7)';c2d.lineWidth=1;c2d.stroke();}
    c2d.fillStyle='#9AA7B8';c2d.font='10px system-ui,sans-serif';c2d.textAlign='center';
    for(var i=0;i<n;i++){var ang=-Math.PI/2+i*2*Math.PI/n,x=cx+R*Math.cos(ang),y=cy+R*Math.sin(ang);c2d.strokeStyle='rgba(35,48,63,.7)';c2d.lineWidth=1;c2d.beginPath();c2d.moveTo(cx,cy);c2d.lineTo(x,y);c2d.stroke();var lx=cx+(R+16)*Math.cos(ang),ly=cy+(R+16)*Math.sin(ang);c2d.fillText(labels[i],lx,ly+3);}
    function poly(valsArr,col,fillA){c2d.beginPath();for(var i=0;i<=n;i++){var idx=i%n,ang=-Math.PI/2+idx*2*Math.PI/n,rr=R*(valsArr[idx]/10),x=cx+rr*Math.cos(ang),y=cy+rr*Math.sin(ang);if(i===0)c2d.moveTo(x,y);else c2d.lineTo(x,y);}c2d.closePath();c2d.fillStyle=hexToRgba(col,fillA);c2d.fill();c2d.strokeStyle=col;c2d.lineWidth=2;c2d.stroke();for(var i=0;i<n;i++){var ang=-Math.PI/2+i*2*Math.PI/n,rr=R*(valsArr[i]/10),x=cx+rr*Math.cos(ang),y=cy+rr*Math.sin(ang);c2d.fillStyle=col;c2d.beginPath();c2d.arc(x,y,3,0,Math.PI*2);c2d.fill();}}
    if(prev)poly(prev,'#38BDF8',0.12);
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
  // 面试题库
  renderIV();
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
