/* =========================================================================
   SparK · 导航分组折叠  navgroup.js  (v20260829-3)
   - 各计算大类默认折叠，点击分组标题展开/收起
   - 切换工具时自动展开其所属分组、收起其它分组
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';

  function groups(){ return document.querySelectorAll('.nav-group'); }

  // 点击分组标题：展开 / 收起
  window.toggleNavGroup = function(el){
    var g = el.closest ? el.closest('.nav-group') : el.parentNode;
    if(g) g.classList.toggle('open');
    return false;
  };

  // 展开“当前激活项”所在分组，收起其余分组
  window.syncNavGroup = function(){
    var active = document.querySelector('.nav-item.on');
    groups().forEach(function(g){
      var inThis = active && g.contains(active);
      g.classList.toggle('open', !!inThis);
    });
  };

  // 包装全局 nav()：导航后同步分组展开状态，并重绘可见波形
  if(typeof window.nav === 'function'){
    var _nav = window.nav;
    window.nav = function(){
      var r = _nav.apply(this, arguments);
      if(window.syncNavGroup) window.syncNavGroup();
      // 切到该工具时按当前容器尺寸重绘图表/波形（此前处于隐藏状态时会跳过重绘）
      if(window.redrawVisibleWaves) setTimeout(window.redrawVisibleWaves, 80);
      if(window.resizeCharts) setTimeout(window.resizeCharts, 100);
      return r;
    };
  }

  function init(){ if(window.syncNavGroup) window.syncNavGroup(); }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
