/* ====================================================================== */
/* 简历生成器（模板化可视化编辑器：选模板→左编辑→右预览→导出）            */
/* ====================================================================== */
var TPL_NAMES={modern:'现代两栏',elegant:'优雅',creative:'创意',timeline:'时间轴',minimalist:'极简','left-right':'模块标题',swiss:'瑞士美学',classic:'经典',editorial:'西报风'};
var TPL_TWO=['modern','left-right','classic'];
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
  if(sec==='education')return {id:id,school:''
