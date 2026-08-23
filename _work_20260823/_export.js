(async () => {
  const tpl = window.__TPL;
  function ensureLib(){
    if (window.html2pdf) return Promise.resolve();
    return new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='jl/html2pdf.bundle.min.js';
      s.onload=()=>res(); s.onerror=()=>rej(new Error('lib load fail'));
      document.head.appendChild(s);
    });
  }
  await ensureLib();
  let d;
  if(window.__OVERRIDE_DATA){
    d = JSON.parse(JSON.stringify(window.__OVERRIDE_DATA));
    d.templateId = tpl;
  }else{
    const T = window.RESUME_TEMPLATES;
    if(!T || !T[tpl]) return {error:'no tpl '+tpl};
    d = JSON.parse(JSON.stringify(T[tpl]));
    d.templateId = tpl;
  }
  const para='主导核心模块架构设计与落地，负责技术方案评审与跨团队协同，推动项目按期高质量交付；持续进行性能优化、稳定性建设与线上问题排查，沉淀可复用工程方法论与团队协作经验。';
  function mkExp(i){return {id:'exp'+i,company:'星辰科技'+i,position:'高级前端工程师',date:'201'+(9-i)+'.03 - 201'+(9-i)+'.12',visible:true,details:para.repeat(3)};}
  function mkProj(i){return {id:'prj'+i,name:'项目'+i+'：智能平台重构',role:'技术负责人',date:'201'+(9-i)+'.01 - 201'+(9-i)+'.11',visible:true,description:para.repeat(2)};}
  function mkEdu(i){return {id:'edu'+i,school:'示范大学'+i,major:'计算机科学与技术',degree:'硕士',startDate:'201'+(9-i)+'.09',endDate:'201'+(9-i+3)+'.06',gpa:'3.8/4.0',visible:true,description:para};}
  d.experience=[]; for(let i=0;i<6;i++) d.experience.push(mkExp(i));
  d.projects=[]; for(let i=0;i<5;i++) d.projects.push(mkProj(i));
  d.education=[]; for(let i=0;i<3;i++) d.education.push(mkEdu(i));
  d.skillContent=['JavaScript / TypeScript','React / Vue / Angular','Node.js / Deno','Webpack / Vite / Rollup','性能优化与监控','数据可视化','CI/CD 与工程化','团队协作与带人'].map(s=>'<li>'+s+'</li>').join('');
  d.selfEvaluationContent='<p>'+para.repeat(4)+'</p>';
  if(d.menuSections) d.menuSections.forEach(m=>m.enabled=true);
  if(d.basic){d.basic.name=d.basic.name||'张三'; d.basic.title=d.basic.title||'高级前端工程师';}
  const full = window.SparKResume.buildResumeHTML(d);
  const parsed = new DOMParser().parseFromString(full,'text/html');
  const cssText = parsed.querySelector('style').textContent;
  const bodyInner = parsed.body.innerHTML;
  const holder=document.createElement('div');
  holder.setAttribute('data-resume-holder','1');
  holder.style.cssText='position:fixed;left:0;top:0;width:794px;z-index:-1;margin:0;padding:0;pointer-events:none;opacity:0';
  const st=document.createElement('style'); st.textContent=cssText; holder.appendChild(st);
  const page=document.createElement('div'); page.innerHTML=bodyInner; holder.appendChild(page);
  document.body.appendChild(holder);
  const pageEl=holder.querySelector('.page')||page;
  // 手动分页保护：用真实 spacer 把跨页的 .r-item 推到下一页，避免经历条目被拦腰截断
  const PAGE_H=1123;
  var itemRects=Array.from(holder.querySelectorAll('.r-item')).map(function(el){return {el:el,top:el.offsetTop,ih:el.offsetHeight};});
  var pushed=0;
  for(var i=0;i<itemRects.length;i++){
    var it=itemRects[i];
    var top=it.top+pushed, ih=it.ih;
    var startPage=Math.floor(top/PAGE_H), endPage=Math.floor((top+ih-1)/PAGE_H);
    if(endPage>startPage){
      var push=PAGE_H-(top%PAGE_H);
      if(push>0 && push<PAGE_H*0.85){
        var spacer=document.createElement('div');
        spacer.style.height=push+'px';
        it.el.parentNode.insertBefore(spacer, it.el);
        pushed+=push;
      }
    }
  }
  const w=holder.offsetWidth||794;
  const h=Math.max(holder.scrollHeight,pageEl.scrollHeight,Math.round(pageEl.getBoundingClientRect().height),holder.offsetHeight)||1123;
  holder.style.height=h+'px';
  const pageScrollH = pageEl.scrollHeight;
  const scaleEl = page.querySelector('.r-scale')||page;
  const scaleScrollH = scaleEl.scrollHeight;
  const opt={margin:0,image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,width:w,height:h,x:0,y:0,scrollX:0,scrollY:0,backgroundColor:'#ffffff',logging:false,windowWidth:794,windowHeight:h,useCORS:true,allowTaint:true,
    onclone:function(doc){
      var list=doc.querySelectorAll('[data-resume-holder]');
      for(var i=0;i<list.length;i++){ list[i].style.opacity='1'; }
    }}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}};
  let canvas, pdf;
  try{
    const worker = window.html2pdf().set(opt).from(holder);
    await worker.toCanvas();
    canvas = worker.prop.canvas;
    await worker.toPdf();
    pdf = worker.prop.pdf;
  }catch(e){ document.body.removeChild(holder); return {error:'export fail: '+e.message, w, h, pageScrollH, scaleScrollH}; }
  const cw=canvas.width, ch=canvas.height;
  const dataUri = pdf.output('datauristring');
  const pageCount = pdf.internal.getNumberOfPages();
  document.body.removeChild(holder);
  return {ok:true, tpl, w, h, pageScrollH, scaleScrollH, cw, ch, pageCount, dataUri};
})();
