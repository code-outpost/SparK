/* =========================================================================
   SparK · 版式紧凑优化  layout.js  (v20260829-4)
   - 把各 section 尾部连续排列的「说明类」卡片（计算原理 / 参考资料 /
     学习教程 / 使用说明 / 计算方法）收进两列栅格，减少竖向留白、铺满宽度
   - 仅处理 .sect 的直接子卡片，不破坏 section 内已有的 panel-grid 结构
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';

  var AUX = ['计算原理','参考资料','学习教程','使用说明','计算方法','可用变量说明'];

  function isAux(el){
    if(!el || el.nodeType!==1) return false;
    if(!/\bcard\b/.test(el.className||'')) return false;
    var t = el.querySelector('.card-title');
    if(!t) return false;
    var txt = (t.textContent||'').trim();
    for(var i=0;i<AUX.length;i++){ if(txt.indexOf(AUX[i])>=0) return true; }
    return false;
  }

  function wrapRun(run){
    if(run.length<2) return;
    var wrap = document.createElement('div');
    wrap.className = 'card-grid';
    run[0].parentNode.insertBefore(wrap, run[0]);
    run.forEach(function(c, idx){
      // 栅格自带 gap，清掉原本用于堆叠间距的 inline margin-top
      if(c.style && c.style.marginTop) c.style.marginTop = '';
      // 奇数张时最后一张通栏，避免 2 列 grid 末行留空
      if(run.length % 2 === 1 && idx === run.length-1) c.classList.add('span-full');
      wrap.appendChild(c);
    });
  }

  function compact(){
    var sects = document.querySelectorAll('.sect');
    for(var s=0;s<sects.length;s++){
      var sect = sects[s];
      if(sect.querySelector('.card-grid')) continue;   // 已处理过，避免重复
      var run = [];
      var kids = Array.prototype.slice.call(sect.children);
      for(var i=0;i<kids.length;i++){
        if(isAux(kids[i])){
          run.push(kids[i]);
        } else {
          wrapRun(run);
          run = [];
        }
      }
      wrapRun(run);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', compact);
  } else {
    compact();
  }
})();
