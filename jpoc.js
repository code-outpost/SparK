/* =========================================================================
   SparK · 日本 遠隔出力制御（出力制御）計算  jpoc.js  (v20260829-3)
   依据：経済産業省 資源エネルギー庁「出力制御に関するルール」
        東京電力パワーグリッド「FIT太陽光・風力発電設備の出力制御」
        九州電力送配電「出力制御機能付PCS等（66kV未満）技術仕様書」
              （2019-11-20 制定 / 2023-06-30 改定）
              ─ スケジュールは30分単位・1%単位、400日先まで登録可
   ⚠ ルール判定は簡化版。最終判定は各送配電事業者の接続契約回答書に従うこと。
   纯前端，无网络依赖。
   ========================================================================= */
(function(){
  'use strict';
  function g$(id){return document.getElementById(id);}
  function num(id){ var v=parseFloat(g$(id).value); return isNaN(v)?NaN:v; }
  function fmt(v,d){ d=(d===undefined?2:d); return (isFinite(v)?v.toFixed(d):'—'); }
  function vbadge(ok,txt){ return '<b style="color:'+(ok?'var(--ok)':'var(--acc)')+'">'+txt+'</b>'; }

  // ---------- 1) 出力制御ルール判定 ----------
  // 依据：接続申込日 + 認定出力 + 電源種別
  function judgeRule(){
    var kind  = g$('jp-kind').value;        // pv | wind
    var date  = g$('jp-date').value;        // YYYY-MM-DD
    var kw    = num('jp-kw');               // 認定出力 kW
    var box   = g$('jp-rule-rst');
    if(!date || isNaN(kw) || kw<0){ box.innerHTML='<div class="err">请填写接続申込日与認定出力</div>'; return; }

    var d = new Date(date+'T00:00:00');
    if(isNaN(d.getTime())){ box.innerHTML='<div class="err">日期格式应为 YYYY-MM-DD</div>'; return; }
    var t = d.getTime();
    var T_20150126 = new Date('2015-01-26T00:00:00').getTime();
    var T_20210401 = new Date('2021-04-01T00:00:00').getTime();

    var rule='', ctrl='', note='';

    if(kind==='pv'){
      if(t < T_20150126){
        if(kw>=500){ rule='旧ルール（30日ルール）'; ctrl='オフライン制御（電話・メール連絡、手動制御）';
          note='年間30日まで無補償。2015/1/26 前接続申込・500kW以上。'; }
        else { rule='制御対象外（旧ルールの対象外容量）'; ctrl='—';
          note='2015/1/26 前接続申込でも 500kW 未満は旧ルール対象外。'; }
      } else if(t < T_20210401){
        if(kw>=50){ rule='新ルール（360時間ルール・オンライン制御）'; ctrl='オンライン制御（出力制御装置の設置＋通信環境整備が必須）';
          note='年間360時間上限。2015/1/26〜2021/3/31 接続申込・50kW以上。'; }
        else if(kw>=10){ rule='新ルール（代理制御対象）'; ctrl='オンライン代理制御（他設備が代理で制御、後日精算）';
          note='年間360時間上限。10kW以上50kW未満。出力制御装置の設置が推奨される。'; }
        else { rule='当面 制御対象外'; ctrl='—'; note='10kW未満は当面の間、制御対象外。'; }
      } else {
        if(kw>=10){ rule='無制限・無補償ルール'; ctrl='オンライン制御';
          note='2021/4/1 以降接続申込・10kW以上。上限時間なし・無補償。'; }
        else { rule='当面 制御対象外'; ctrl='—'; note='10kW未満の無制限・無補償対象設備は当面制御対象外。'; }
      }
    } else { // wind
      if(t < T_20150126){
        if(kw>=500){ rule='旧ルール（30日ルール）'; ctrl='オフライン制御';
          note='年間30日まで無補償。2015/1/26 前接続申込・500kW以上。'; }
        else { rule='制御対象外'; ctrl='—'; note=''; }
      } else if(t < T_20210401){
        if(kw>=20){ rule='新ルール（720時間ルール）'; ctrl='オンライン制御';
          note='年間720時間上限（風力）。2015/1/26〜2021/3/31 接続申込・20kW以上。'; }
        else { rule='当面 制御対象外'; ctrl='—'; note='20kW未満の風力は当分の間、新ルール適用外。'; }
      } else {
        rule='無制限・無補償ルール'; ctrl='オンライン制御';
        note='2021/4/1 以降接続申込の風力。上限時間なし・無補償。';
      }
    }

    // 指定ルール補足
    var extra = '<div class="hint" style="margin-top:6px">別途「指定ルール」あり：接続可能量を超えた後に接続申込した設備は<b>上限時間なし・無補償</b>で制御要請される。本判定は簡化版であり、実際の適用ルールは<b>各送配電事業者が発行する接続契約の回答書</b>で確認すること。</div>';

    box.innerHTML='<table class="tbl"><tbody>'+
      '<tr><td class="mut">電源種別</td><td><b>'+(kind==='pv'?'太陽光':'風力')+'</b></td></tr>'+
      '<tr><td class="mut">接続申込日</td><td><b>'+date+'</b></td></tr>'+
      '<tr><td class="mut">認定出力</td><td><b>'+fmt(kw,1)+' kW</b></td></tr>'+
      '<tr><td class="mut">適用ルール</td><td><b style="color:var(--acc)">'+rule+'</b></td></tr>'+
      '<tr><td class="mut">制御方式</td><td>'+ctrl+'</td></tr>'+
      '<tr><td class="mut">上限時間</td><td>'+note+'</td></tr>'+
      '</tbody></table>'+extra;
  }

  // ---------- 2) スケジュールによる抑制電力量・売電損失 ----------
  // 入力行格式：開始時刻 終了時刻 出力上限%（例：09:00 11:00 40）
  function parseSched(text){
    var lines=(text||'').split(/\n/), out=[];
    for(var i=0;i<lines.length;i++){
      var s=lines[i].trim(); if(!s) continue;
      var p=s.split(/[\s,\t]+/);
      if(p.length<3) continue;
      var h1=parseHm(p[0]), h2=parseHm(p[1]), cap=parseFloat(p[2]);
      if(h1===null||h2===null||isNaN(cap)) continue;
      out.push({h1:h1,h2:h2,cap:cap,label:p[0]+'–'+p[1]});
    }
    return out;
  }
  function parseHm(s){
    var m=/^(\d{1,2}):?(\d{2})?$/.exec((s||'').trim());
    if(!m) return null;
    var h=parseInt(m[1],10), mi=m[2]?parseInt(m[2],10):0;
    if(h>24||mi>59) return null;
    return h+mi/60;
  }

  function calcJpoc(){
    var kw    = num('jp-kw2');        // 認定出力 kW
    var price = num('jp-price');      // 売電単価 円/kWh
    var self  = num('jp-self');       // 自家消費電力 kW（余剰買取時）
    var buyMode = g$('jp-buy').value; // all | surplus
    var rows  = parseSched(g$('jp-sched').value);
    var box   = g$('jp-rst');

    if(isNaN(kw)||kw<=0){ box.innerHTML='<div class="err">请填写認定出力（kW）</div>'; return; }
    if(!rows.length){ box.innerHTML='<div class="err">请填写出力制御スケジュール（每行：開始 終了 出力上限%）<br>例：09:00 11:00 40</div>'; return; }

    var tbl='<table class="tbl"><thead><tr><th>時間帯</th><th>出力上限</th><th>抑制電力 kW</th><th>時間 h</th><th>抑制電力量 kWh</th></tr></thead><tbody>';
    var sumE=0, sumH=0;
    rows.forEach(function(r){
      var hours = Math.max(0, r.h2-r.h1);
      var cap = Math.min(100, Math.max(0, r.cap));
      // 抑制電力 = 認定出力 ×（1 − 上限%）
      var suppress = kw*(1-cap/100);
      // 余剰買取：自家消費分は制御しない（逆潮流分のみが制御対象）
      if(buyMode==='surplus' && !isNaN(self) && self>0){
        // 制御後の出力上限が自家消費を上回る場合のみ、超過分が実際の抑制対象
        var allowed = kw*cap/100;
        suppress = Math.max(0, Math.min(suppress, allowed<self ? 0 : (kw - Math.max(allowed, self))));
      }
      var e = suppress*hours;
      sumE += e; sumH += hours;
      tbl+='<tr><td>'+r.label+'</td><td>'+fmt(cap,0)+' %</td><td><b>'+fmt(suppress,2)+'</b></td><td>'+fmt(hours,2)+'</td><td><b>'+fmt(e,2)+'</b></td></tr>';
    });
    tbl+='</tbody></table>';

    var loss = (!isNaN(price)&&price>0) ? sumE*price : NaN;
    var out='<div class="card-title" style="margin-top:12px"><div class="dot"></div>各時間帯の抑制量</div>'+tbl;
    out+='<table class="tbl"><tbody>'+
      '<tr><td class="mut">合計制御時間</td><td><b>'+fmt(sumH,2)+' h</b></td></tr>'+
      '<tr><td class="mut">合計抑制電力量</td><td><b>'+fmt(sumE,2)+' kWh</b></td></tr>'+
      (!isNaN(loss)?'<tr><td class="mut">売電機会損失（試算）</td><td><b>'+fmt(loss,0)+' 円</b> （単価 '+fmt(price,1)+' 円/kWh）</td></tr>':'')+
      '</tbody></table>';

    box.innerHTML = out +
      '<div class="hint">「出力上限 %」は九電技術仕様書の表記（100%=制御なし、0%=全停止、40%=認定出力の40%まで出力可）。スケジュールは<b>30分単位・1%単位</b>で設定され、固定スケジュールは最大400日先まで登録可。余剰買取の場合、自家消費分は原則制御対象外（逆潮流分のみ制御）。売電損失は<FIT/FIP>買取単価による試算であり、実際の補償の有無はルールにより異なる（30日/360時間/720時間ルールは無補償）。</div>';
  }

  // ---------- 3) 年間上限の残管理 ----------
  function calcJpQuota(){
    var kind = g$('jp-kind2').value;   // d30 | h360 | h720 | unlimited
    var used = num('jp-used');
    var box  = g$('jp-quota-rst');
    if(isNaN(used)||used<0){ box.innerHTML='<div class="err">请填写已使用量</div>'; return; }

    var rows=[], limit=NaN, unit='';
    if(kind==='d30'){ limit=30; unit='日'; rows.push(['年間上限', '30 日', '旧ルール（太陽光・風力 500kW以上）']); }
    else if(kind==='h360'){ limit=360; unit='時間'; rows.push(['年間上限', '360 時間', '新ルール（太陽光）']); }
    else if(kind==='h720'){ limit=720; unit='時間'; rows.push(['年間上限', '720 時間', '新ルール（風力）']); }
    else { rows.push(['年間上限', '上限なし', '無制限・無補償ルール']); }

    if(!isNaN(limit)){
      var remain = limit-used;
      var pct = used/limit*100;
      rows.push(['已使用', fmt(used,1)+' '+unit, '進捗 '+fmt(pct,1)+' %']);
      rows.push(['残り', fmt(remain,1)+' '+unit,
        vbadge(remain>=0, remain>=0?'仍在额度内':'已超出上限')]);
    } else {
      rows.push(['已使用', fmt(used,1)+' （日または時間）', '無制限のため上限管理なし']);
    }

    var tbl='<table class="tbl"><thead><tr><th>项目</th><th>结果</th><th>说明</th></tr></thead><tbody>';
    rows.forEach(function(r){ tbl+='<tr><td>'+r[0]+'</td><td><b>'+r[1]+'</b></td><td style="font-size:11px">'+r[2]+'</td></tr>'; });
    tbl+='</tbody></table>';
    box.innerHTML = tbl +
      '<div class="hint">30日ルールは「出力制御を実施した<b>日数</b>」、360/720時間ルールは「制御した<b>累計時間</b>」で管理される（単位が異なる点に注意）。いずれも無補償。運用上は旧ルール事業者の制御機会を最大限活用する「公平性の確保に係る指針」に基づき、新ルール・無制限ルール事業者との間で制御順が調整される（例：九州エリアは2022年12月以降オンライン代理制御を導入）。</div>';
  }

  function jpSample(){
    g$('jp-kind').value='pv'; g$('jp-date').value='2018-06-01'; g$('jp-kw').value='80';
    judgeRule();
    g$('jp-kw2').value='80'; g$('jp-price').value='36'; g$('jp-self').value='5'; g$('jp-buy').value='all';
    g$('jp-sched').value='09:00 11:00 40\n11:00 13:00 0\n13:00 15:00 40';
    calcJpoc();
    g$('jp-kind2').value='h360'; g$('jp-used').value='120';
    calcJpQuota();
  }
  function jpClear(){
    ['jp-date','jp-kw','jp-kw2','jp-price','jp-self','jp-sched','jp-used'].forEach(function(id){ g$(id).value=''; });
    g$('jp-rule-rst').innerHTML='<div class="rst-empty">填写接続申込日与認定出力后判定</div>';
    g$('jp-rst').innerHTML='<div class="rst-empty">填写認定出力与スケジュール</div>';
    g$('jp-quota-rst').innerHTML='';
  }

  window.judgeRule=judgeRule; window.calcJpoc=calcJpoc; window.calcJpQuota=calcJpQuota;
  window.jpSample=jpSample; window.jpClear=jpClear;
})();
