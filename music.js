/* ====================================================================== */
/* SparK · 背景音乐                                                        */
/* 纯前端 HTML5 Audio 播放器：随机/顺序播放、歌单持久化、底部播放条        */
/* 注意：仅作本地播放，不读取音频数据，跨域直链可直接播放（无需 CORS）     */
/* ====================================================================== */
(function(){
  'use strict';
  var KEY='spark_music';

  /* 默认歌单：SoundHelix 提供的免费示例音频（可商用/可自由使用），
     仅作开箱即用演示，用户可在设置中替换为自有音频直链。 */
  var DEFAULT_PLAYLIST=[
    {name:'SoundHelix 示例 1', url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'},
    {name:'SoundHelix 示例 2', url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'},
    {name:'SoundHelix 示例 3', url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'},
    {name:'SoundHelix 示例 4', url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'},
    {name:'SoundHelix 示例 5', url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'},
    {name:'SoundHelix 示例 6', url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'},
    {name:'SoundHelix 示例 7', url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'},
    {name:'SoundHelix 示例 8', url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'}
  ];

  var state={on:false, random:true, volume:0.6, playlist:null, index:0};
  var audio=null;
  var order=[];      // 播放顺序（索引数组）
  var pos=0;         // 当前在 order 中的位置
  var errStreak=0;   // 连续出错计数，避免死循环
  var autoBound=false;

  /* ---------- 持久化 ---------- */
  function load(){
    try{
      var r=localStorage.getItem(KEY);
      if(r){
        var s=JSON.parse(r);
        state.on=!!s.on;
        state.random=!!(s.random!==false);
        state.volume=(typeof s.volume==='number')?Math.min(1,Math.max(0,s.volume)):0.6;
        if(s.playlist && s.playlist.length) state.playlist=s.playlist.slice();
      }
    }catch(e){}
    if(!state.playlist || !state.playlist.length) state.playlist=DEFAULT_PLAYLIST.slice();
  }
  function save(){
    try{
      localStorage.setItem(KEY, JSON.stringify({
        on:state.on, random:state.random, volume:state.volume, playlist:state.playlist
      }));
    }catch(e){}
  }

  /* ---------- 歌单解析 ---------- */
  function parseList(text){
    var out=[];
    (text||'').split('\n').forEach(function(ln){
      ln=(ln||'').trim(); if(!ln) return;
      var i=ln.indexOf('|');
      if(i<0){
        var name=ln.replace(/^https?:\/\//,'').replace(/\?.*$/,'').slice(0,42)||'未命名';
        out.push({name:name, url:ln});
      }else{
        out.push({name:(ln.slice(0,i).trim())||'未命名', url:ln.slice(i+1).trim()});
      }
    });
    return out;
  }
  function serializeList(list){
    return (list||[]).map(function(t){return (t.name||'')+'|'+(t.url||'');}).join('\n');
  }

  /* ---------- 音频元素 ---------- */
  function ensureAudio(){
    if(audio) return;
    audio=new Audio();
    audio.volume=state.volume;
    audio.preload='none';
    audio.addEventListener('ended', function(){ errStreak=0; next(false); });
    audio.addEventListener('error', function(){
      if(errStreak>6){ if(window.toast) window.toast('歌单中多首音频无法播放，请检查 URL'); stop(); return; }
      errStreak++; next(true);
    });
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('play', function(){ render(); });
    audio.addEventListener('pause', function(){ render(); });
  }

  /* ---------- 播放顺序 ---------- */
  function buildOrder(){
    order=state.playlist.map(function(_,i){return i;});
    if(state.random){
      for(var i=order.length-1;i>0;i--){
        var j=Math.floor(Math.random()*(i+1));
        var t=order[i]; order[i]=order[j]; order[j]=t;
      }
    }
  }
  function playAt(i){
    ensureAudio();
    if(i<0 || i>=state.playlist.length) return;
    state.index=i;
    var t=state.playlist[i];
    audio.src=t.url;
    audio.play().then(function(){ errStreak=0; }).catch(function(){
      // 浏览器自动播放限制或加载失败：提示用户手动点击
      if(window.toast) window.toast('点击「播放」以开始（浏览器需用户操作）');
    });
    render();
  }
  function play(){
    if(!state.playlist.length){ if(window.toast) window.toast('歌单为空，请先在设置中填写音频 URL'); return; }
    ensureAudio();
    if(!audio.src || audio.error){ playAt(order[pos]!==undefined?order[pos]:0); }
    else { audio.play().catch(function(){}); }
  }
  function pause(){ if(audio) audio.pause(); }
  function stop(){ pause(); if(audio) audio.src=''; pos=0; render(); }

  function next(skipErr){
    if(!state.playlist.length) return;
    pos++;
    if(pos>=order.length){ pos=0; if(state.random) buildOrder(); }
    playAt(order[pos]);
  }
  function prev(){
    if(!state.playlist.length) return;
    pos--;
    if(pos<0) pos=order.length-1;
    playAt(order[pos]);
  }
  function toggle(){
    state.on=!state.on;
    if(state.on){ buildOrder(); pos=0; play(); }
    else { stop(); }
    save(); render(); syncSettings();
  }

  /* ---------- 首点击自动续播（绕过自动播放限制） ---------- */
  function bindAutoStart(){
    if(autoBound) return; autoBound=true;
    function once(){
      if(state.on && audio && audio.paused){ play(); }
      document.removeEventListener('pointerdown', once);
      document.removeEventListener('keydown', once);
    }
    document.addEventListener('pointerdown', once);
    document.addEventListener('keydown', once);
  }

  /* ---------- 进度 / UI ---------- */
  function updateProgress(){
    var bar=document.getElementById('mbFill');
    if(!bar || !audio || !audio.duration) return;
    var p=Math.min(100, (audio.currentTime/audio.duration)*100);
    bar.style.width=p+'%';
  }

  function render(){
    var playing=audio && !audio.paused && !audio.ended;
    var name=state.playlist.length? (state.playlist[state.index]? state.playlist[state.index].name : '未播放') : '歌单为空';
    if(!playing && (!audio || !audio.src)) name='未播放';

    // 底部条
    var bar=document.getElementById('musicBar');
    if(bar) bar.classList.toggle('on', state.on);
    var mbName=document.getElementById('mbName');
    if(mbName) mbName.textContent=name;
    var mbPlay=document.getElementById('mbPlay');
    if(mbPlay) mbPlay.textContent=playing?'⏸':'▶';
    var mbVol=document.getElementById('mbVol');
    if(mbVol) mbVol.value=Math.round(state.volume*100);

    // 设置卡片
    var now=document.getElementById('musicNow');
    if(now) now.textContent=name;
    var pb=document.getElementById('musicPlayBtn');
    if(pb) pb.textContent=(playing?'⏸ 暂停':'▶ 播放');
  }

  function syncSettings(){
    var on=document.getElementById('musicOn');
    if(on) on.checked=state.on;
    var rnd=document.getElementById('musicRandom');
    if(rnd) rnd.checked=state.random;
    var vol=document.getElementById('musicVol');
    if(vol) vol.value=Math.round(state.volume*100);
    var list=document.getElementById('musicList');
    if(list && !list.value) list.value=serializeList(state.playlist);
  }

  /* ---------- 底部条构建 ---------- */
  function buildBar(){
    if(document.getElementById('musicBar')) return;
    var bar=document.createElement('div');
    bar.id='musicBar'; bar.className='music-bar';
    bar.innerHTML=
      '<button class="mb-btn" id="mbPrev" title="上一首">⏮</button>'+
      '<button class="mb-btn mb-play" id="mbPlay" title="播放/暂停">▶</button>'+
      '<button class="mb-btn" id="mbNext" title="下一首">⏭</button>'+
      '<div class="mb-meta"><div class="mb-name" id="mbName">未播放</div>'+
      '<div class="mb-prog" id="mbProg"><div class="mb-prog-fill" id="mbFill"></div></div></div>'+
      '<input type="range" class="mb-vol" id="mbVol" min="0" max="100" value="60" title="音量">';
    document.body.appendChild(bar);

    bar.querySelector('#mbPrev').onclick=function(){ prev(); };
    bar.querySelector('#mbPlay').onclick=function(){ if(audio && !audio.paused) pause(); else play(); render(); };
    bar.querySelector('#mbNext').onclick=function(){ next(false); };
    bar.querySelector('#mbVol').oninput=function(e){ musicSetVol(e.target.value); };
    bar.querySelector('#mbProg').onclick=function(e){
      if(!audio || !audio.duration) return;
      var r=e.currentTarget.getBoundingClientRect();
      var ratio=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));
      audio.currentTime=ratio*audio.duration;
    };
  }

  /* ---------- 注入样式 ---------- */
  function injectStyle(){
    if(document.getElementById('musicStyle')) return;
    var s=document.createElement('style'); s.id='musicStyle';
    s.textContent=
      '.switch{position:relative;display:inline-block;width:42px;height:22px;flex:none}'+
      '.switch input{opacity:0;width:0;height:0}'+
      '.switch .slider{position:absolute;cursor:pointer;inset:0;background:var(--bg4);border:1px solid var(--bd);border-radius:22px;transition:.2s}'+
      '.switch .slider:before{content:"";position:absolute;height:16px;width:16px;left:3px;top:2px;background:var(--tx2);border-radius:50%;transition:.2s}'+
      '.switch input:checked+.slider{background:var(--acc);border-color:var(--acc)}'+
      '.switch input:checked+.slider:before{transform:translateX(20px);background:#000}'+
      '.music-now{font-size:12px;color:var(--tx2);font-family:var(--mono);padding:8px 10px;background:var(--bg2);border:1px solid var(--bd);border-radius:6px}'+
      '.music-bar{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:none;align-items:center;gap:12px;padding:8px 16px;background:rgba(15,20,28,.96);border-top:1px solid var(--bd);backdrop-filter:blur(8px)}'+
      '.music-bar.on{display:flex}'+
      '.mb-btn{background:var(--bg3);border:1px solid var(--bd);color:var(--tx);width:34px;height:34px;border-radius:8px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex:none}'+
      '.mb-btn:hover{border-color:var(--acc)}'+
      '.mb-play{background:var(--acc);color:#000;border-color:var(--acc)}'+
      '.mb-meta{flex:1;min-width:0}'+
      '.mb-name{font-size:12px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px}'+
      '.mb-prog{height:5px;background:var(--bg4);border-radius:3px;cursor:pointer;overflow:hidden}'+
      '.mb-prog-fill{height:100%;width:0;background:var(--acc);border-radius:3px;transition:width .15s linear}'+
      '.mb-vol{width:90px;flex:none}'+
      'body.music-on{padding-bottom:52px}';
    document.head.appendChild(s);
  }

  /* ---------- 公开接口 ---------- */
  window.musicToggle=function(){ toggle(); };
  window.musicPlayPause=function(){ if(audio && !audio.paused) pause(); else play(); render(); };
  window.musicNext=function(){ next(false); };
  window.musicPrev=function(){ prev(); };
  window.musicSetRandom=function(v){ state.random=!!v; if(state.random) buildOrder(); save(); render(); };
  window.musicSetVol=function(v){ state.volume=Math.min(1,Math.max(0,(parseFloat(v)||0)/100)); if(audio) audio.volume=state.volume; save(); var mv=document.getElementById('mbVol'); if(mv) mv.value=Math.round(state.volume*100); var sv=document.getElementById('musicVol'); if(sv) sv.value=Math.round(state.volume*100); };
  window.musicSaveList=function(){ var ta=document.getElementById('musicList'); if(!ta) return; var list=parseList(ta.value); if(!list.length){ if(window.toast) window.toast('歌单为空，未保存'); return; } state.playlist=list; if(audio) audio.src=''; pos=0; save(); render(); if(window.toast) window.toast('歌单已保存（'+list.length+' 首）'); };
  window.musicResetList=function(){ state.playlist=DEFAULT_PLAYLIST.slice(); var ta=document.getElementById('musicList'); if(ta) ta.value=serializeList(state.playlist); if(audio) audio.src=''; pos=0; save(); render(); if(window.toast) window.toast('已恢复默认歌单'); };
  window.musicInit=function(){
    injectStyle(); buildBar(); load(); syncSettings(); render();
    document.body.classList.toggle('music-on', state.on);
    if(state.on) bindAutoStart();
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', window.musicInit);
  else window.musicInit();
})();
