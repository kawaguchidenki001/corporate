/* トップページ ヒーロー「まちに明かりが灯っていく」（Canvas 2D）
   ─ 2つのモード ─
   【タイムラプス】canvas に data-photo(夜) / data-photo-day(昼) / data-photo-dusk(夕・任意)
     を指定すると、ページを開いて一拍おいたのち「昼 → 夕暮れ → 夜」と自動でクロスフェード。
     まちの明かりが灯っていく様子を、右下カウンターが数えていく。
   【描画モード】写真が無い/読めない環境では、コードで描いた3層の夜のまちなみを表示。
   共通: 静的な絵は一度だけオフスクリーンに焼き込み、毎フレームは合成のみ。
   rAFは1本・DPR上限2。resize は間引き、スマホのアドレスバー伸縮では再構築しない。 */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas=document.getElementById('fx');if(!canvas)return;
  var hero=document.querySelector('.hero-fx');
  var ctx=canvas.getContext('2d');
  var cntEl=document.getElementById('cnt'),totEl=document.getElementById('tot');
  var W,H,DPR,mode='drawn';
  /* 描画モード用 */
  var windows=[],lamps=[],beacons=[],litCount=0,staticL=null;
  /* タイムラプス用 */
  var imgNight=null,imgDay=null,imgDusk=null,dayL=null,duskL=null,nightL=null,scrimL=null;
  var PROG=0,transStart=0,totalLights=0,DURATION=7500;
  /* コア数の少ない端末は最初から低解像度で開始（描画負荷を1/4に） */
  var degraded=!!(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
  /* 光のグラデーションは毎フレーム作らず、事前に1枚のスプライトにしておく（低速機対策） */
  function glowSprite(rgb){var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d');var gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba('+rgb+',1)');gr.addColorStop(.55,'rgba('+rgb+',.28)');gr.addColorStop(1,'rgba('+rgb+',0)');g.fillStyle=gr;g.beginPath();g.arc(32,32,32,0,7);g.fill();return c;}
  var warmGlow=glowSprite('255,231,184'),coolGlow=glowSprite('157,184,220');
  function layer(){var c=document.createElement('canvas');c.width=W*DPR;c.height=H*DPR;var g=c.getContext('2d');g.setTransform(DPR,0,0,DPR,0,0);return c;}
  function cover(g,img){var iw=img.naturalWidth,ih=img.naturalHeight,s=Math.max(W/iw,H/ih),dw=iw*s,dh=ih*s;g.drawImage(img,(W-dw)/2,(H-dh)/2,dw,dh);}
  function updateCnt(){var tot=mode==='timelapse'?totalLights:windows.length;cntEl.innerHTML='<b>'+litCount+'</b> / '+tot+' lights';}

  /* ============================================================
     タイムラプス: 昼→夕→夜の実写クロスフェード
     ============================================================ */
  /* 夜写真の明かりの数を数える（カウンターの総数用・局所コントラスト方式） */
  function countLights(img){
    try{
      var ds=Math.min(1,400/W),cw=Math.max(1,Math.round(W*ds)),ch=Math.max(1,Math.round(H*ds));
      var c=document.createElement('canvas');c.width=cw;c.height=ch;var g=c.getContext('2d');
      var iw=img.naturalWidth,ih=img.naturalHeight,s=Math.max(cw/iw,ch/ih),dw=iw*s,dh=ih*s;
      g.drawImage(img,(cw-dw)/2,(ch-dh)/2,dw,dh);
      var data=g.getImageData(0,0,cw,ch).data;
      var L=new Float32Array(cw*ch),y,x,o;
      for(y=0;y<ch;y++)for(x=0;x<cw;x++){o=(y*cw+x)*4;L[y*cw+x]=data[o]*.2126+data[o+1]*.7152+data[o+2]*.0722;}
      var iw2=cw+1,I=new Float64Array(iw2*(ch+1));
      for(y=1;y<=ch;y++){var rs=0;for(x=1;x<=cw;x++){rs+=L[(y-1)*cw+(x-1)];I[y*iw2+x]=I[(y-1)*iw2+x]+rs;}}
      function bx(cx,cy,rr){var x0=cx-rr<0?0:cx-rr,y0=cy-rr<0?0:cy-rr,x1=cx+rr+1>cw?cw:cx+rr+1,y1=cy+rr+1>ch?ch:cy+rr+1;return (I[y1*iw2+x1]-I[y0*iw2+x1]-I[y1*iw2+x0]+I[y0*iw2+x0])/((x1-x0)*(y1-y0));}
      var R=Math.max(2,Math.round(cw*0.014)),cand=[],contrast;
      for(y=1;y<ch-1;y++)for(x=1;x<cw-1;x++){var lv=L[y*cw+x];if(lv<45)continue;var bg=bx(x,y,R);contrast=lv-bg;if(contrast<20)continue;if(lv<L[y*cw+x-1]||lv<L[y*cw+x+1]||lv<L[(y-1)*cw+x]||lv<L[(y+1)*cw+x])continue;cand.push(contrast);}
      cand.sort(function(a,b){return b-a});
      var n=Math.min(cand.length,600);
      return n<40?480:n;
    }catch(e){return 480;}
  }
  function buildTimelapse(){
    dayL=layer();cover(dayL.getContext('2d'),imgDay);
    nightL=layer();cover(nightL.getContext('2d'),imgNight);
    duskL=null;if(imgDusk){duskL=layer();cover(duskL.getContext('2d'),imgDusk);}
    /* 白い見出しを守る陰り（左＋上）。夜が深まるにつれて薄くなる */
    scrimL=layer();var sg=scrimL.getContext('2d');
    var g1=sg.createLinearGradient(0,0,W*0.68,0);
    g1.addColorStop(0,'rgba(9,14,26,.62)');g1.addColorStop(1,'rgba(9,14,26,0)');
    sg.fillStyle=g1;sg.fillRect(0,0,W,H);
    var g2=sg.createLinearGradient(0,0,0,H*0.5);
    g2.addColorStop(0,'rgba(9,14,26,.42)');g2.addColorStop(1,'rgba(9,14,26,0)');
    sg.fillStyle=g2;sg.fillRect(0,0,W,H);
    if(!totalLights)totalLights=countLights(imgNight);
    litCount=0;PROG=0;transStart=0;
    totEl.textContent=totalLights;updateCnt();
    var hint=document.querySelector('.fx-hint');if(hint)hint.style.display='none';
  }
  function drawTimelapse(){
    /* 開始時刻は「ページ読み込み完了+2.2秒」に確定（ローダー明けに昼景を一拍見せる） */
    if(!transStart){if(document.readyState==='complete')transStart=performance.now()+2200;PROG=0;}
    var tt=transStart?Math.min(1,Math.max(0,(performance.now()-transStart)/DURATION)):0;
    PROG=tt<.5?4*tt*tt*tt:1-Math.pow(-2*tt+2,3)/2;   /* イーズ・イン・アウト */
    if(duskL){
      if(PROG<0.5){ctx.drawImage(dayL,0,0,W,H);var a=PROG/0.5;if(a>0){ctx.globalAlpha=a;ctx.drawImage(duskL,0,0,W,H);ctx.globalAlpha=1;}}
      else{ctx.drawImage(duskL,0,0,W,H);ctx.globalAlpha=(PROG-0.5)/0.5;ctx.drawImage(nightL,0,0,W,H);ctx.globalAlpha=1;}
    }else{
      ctx.drawImage(dayL,0,0,W,H);if(PROG>0){ctx.globalAlpha=PROG;ctx.drawImage(nightL,0,0,W,H);ctx.globalAlpha=1;}
    }
    if(scrimL){ctx.globalAlpha=0.22+0.78*(1-PROG);ctx.drawImage(scrimL,0,0,W,H);ctx.globalAlpha=1;}
    /* カウンター: 夕暮れ以降に明かりが増えていく */
    var lp=Math.min(1,Math.max(0,(PROG-0.45)/0.5)),lc=Math.round(lp*totalLights);
    if(lc!==litCount){litCount=lc;updateCnt();}
  }

  /* ============================================================
     描画モード: コードで描く3層のまちなみ（フォールバック）
     ============================================================ */
  function buildTown(){
    windows=[];lamps=[];beacons=[];litCount=0;
    var ground=H*0.86,x,c,r;
    staticL=layer();
    var s=staticL.getContext('2d');

    var g=s.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0a1322');g.addColorStop(.55,'#0e1a2e');g.addColorStop(1,'#101d33');
    s.fillStyle=g;s.fillRect(0,0,W,H);
    s.fillStyle='rgba(200,215,240,.25)';
    for(var i=0;i<40;i++){s.fillRect((i*97)%W,((i*61)%Math.floor(H*.5)),1,1);}
    var mx=W*0.76,my=H*0.16;
    var mg=s.createRadialGradient(mx,my,0,mx,my,64);
    mg.addColorStop(0,'rgba(215,226,244,.3)');mg.addColorStop(.3,'rgba(210,222,242,.09)');mg.addColorStop(1,'rgba(210,222,242,0)');
    s.fillStyle=mg;s.beginPath();s.arc(mx,my,64,0,7);s.fill();
    s.fillStyle='rgba(226,234,248,.8)';s.beginPath();s.arc(mx,my,6.5,0,7);s.fill();
    var hz=s.createLinearGradient(0,ground-110,0,ground);
    hz.addColorStop(0,'rgba(125,148,198,0)');hz.addColorStop(1,'rgba(130,152,200,.12)');
    s.fillStyle=hz;s.fillRect(0,ground-110,W,110);

    x=-30;
    while(x<W+40){
      var bw=22+Math.random()*52,bh=28+Math.random()*Math.min(92,H*0.15),by=ground-14-bh;
      s.fillStyle='#16202f';s.fillRect(x,by,bw,bh);
      if(Math.random()<0.3){s.strokeStyle='rgba(120,140,170,.35)';s.lineWidth=1;s.beginPath();s.moveTo(x+bw*0.5,by);s.lineTo(x+bw*0.5,by-5-Math.random()*8);s.stroke();}
      s.fillStyle='rgba(220,205,180,.15)';
      for(c=x+4;c<x+bw-4;c+=7)for(r=by+5;r<by+bh-4;r+=9)if(Math.random()<0.26)s.fillRect(c,r,1.6,2.2);
      x+=bw+2+Math.random()*14;
    }
    x=-30;
    while(x<W+40){
      var mw=30+Math.random()*70,mh=42+Math.random()*Math.min(128,H*0.2),myy=ground-7-mh;
      s.fillStyle='#0e1728';s.fillRect(x,myy,mw,mh);
      s.fillStyle='rgba(0,0,0,.2)';s.fillRect(x+mw*0.8,myy,mw*0.2,mh);
      s.fillStyle='rgba(157,184,220,.07)';s.fillRect(x,myy,mw,1);
      if(Math.random()<0.3){s.fillStyle='#101b2e';s.fillRect(x+mw*0.15,myy-7,Math.min(mw*0.3,22),7);}
      if(Math.random()<0.2){s.fillStyle='#111d31';s.fillRect(x+mw*0.6,myy-9,9,9);s.fillStyle='#0c1526';s.fillRect(x+mw*0.6-1,myy-11,11,2);}
      s.fillStyle='rgba(235,215,180,.12)';
      for(c=x+6;c<x+mw-6;c+=10)for(r=myy+7;r<myy+mh-6;r+=12)if(Math.random()<0.2)s.fillRect(c,r,2.6,3.4);
      if(mh>H*0.15&&Math.random()<0.28)beacons.push({x:x+mw*0.5,y:myy-9,phase:Math.random()*6.28,far:true});
      x+=mw+4+Math.random()*20;
    }
    x=-20;
    while(x<W+40){
      var fw=38+Math.random()*74,fh=46+Math.random()*Math.min(158,H*0.24),fy=ground-fh;
      var tone=(Math.random()*3)|0,col=['#0a1120','#0b1223','#091022'][tone];
      s.fillStyle=col;s.fillRect(x,fy,fw,fh);
      if(Math.random()<0.22&&fw>60){var sw=fw*0.5,sh=12+Math.random()*20;s.fillRect(x+(fw-sw)/2,fy-sh,sw,sh);s.fillStyle='rgba(157,184,220,.1)';s.fillRect(x+(fw-sw)/2,fy-sh,sw,1);s.fillStyle=col;}
      s.fillStyle='rgba(0,0,0,.25)';s.fillRect(x+fw*0.82,fy,fw*0.18,fh);
      s.fillStyle='rgba(157,184,220,.12)';s.fillRect(x,fy,fw,1);
      if(Math.random()<0.3){s.fillStyle='#0d1830';s.fillRect(x+4+Math.random()*Math.max(1,fw-24),fy-6,14,6);}
      if(Math.random()<0.25){
        var tx=x+6+Math.random()*Math.max(1,fw-20);
        s.fillStyle='#13223c';s.fillRect(tx,fy-12,10,12);
        s.fillStyle='#0b1424';s.fillRect(tx-1,fy-14,12,3);
        s.strokeStyle='rgba(120,140,170,.35)';s.lineWidth=1;
        s.beginPath();s.moveTo(tx+2,fy);s.lineTo(tx+2,fy-12);s.moveTo(tx+8,fy);s.lineTo(tx+8,fy-12);s.stroke();
      }
      if(Math.random()<0.3){
        var ax=x+fw*(0.3+Math.random()*0.4),ah=8+Math.random()*16;
        s.strokeStyle='rgba(120,140,170,.5)';s.lineWidth=1;
        s.beginPath();s.moveTo(ax,fy);s.lineTo(ax,fy-ah);s.stroke();
        if(fh>H*0.18)beacons.push({x:ax,y:fy-ah,phase:Math.random()*6.28});
      }
      var cols=Math.max(2,Math.floor((fw-14)/11)),floors=Math.max(2,Math.floor((fh-16)/13));
      var wx0=x+(fw-(cols*11-6))/2;
      for(var fl=0;fl<floors;fl++)for(var cc=0;cc<cols;cc++){
        if(Math.random()<0.82)windows.push({x:wx0+cc*11,y:fy+9+fl*13,lit:0,target:0,flick:.05+Math.random()*.1,phase:Math.random()*6.28,cool:Math.random()<0.13});
      }
      x+=fw+5+Math.random()*24;
    }
    s.fillStyle='#080e1a';s.fillRect(0,ground,W,H-ground);
    s.fillStyle='rgba(157,184,220,.06)';s.fillRect(0,ground,W,1);

    var want=Math.round(windows.length*0.15),guard=0;
    while(litCount<want&&guard++<6000){
      var w0=windows[(Math.random()*windows.length)|0];
      for(var k=0;k<windows.length&&litCount<want;k++){
        var wk=windows[k];
        if(wk.target===0&&wk.y===w0.y&&Math.abs(wk.x-w0.x)<=22){wk.target=1;wk.lit=1;litCount++;}
      }
    }
    for(var li=0;li<Math.floor(W/180);li++)lamps.push({x:60+li*180+Math.random()*60,y:ground,lit:0,target:0});
    totEl.textContent=windows.length;updateCnt();
  }
  function drawTown(t){
    ctx.drawImage(staticL,0,0,W,H);
    for(var i=0;i<beacons.length;i++){
      var bc=beacons[i];
      var a=reduce?0.3:(0.12+0.3*(0.5+0.5*Math.sin(t*.0015+bc.phase)));
      if(bc.far)a*=0.6;
      ctx.fillStyle='rgba(255,92,86,'+a+')';
      ctx.beginPath();ctx.arc(bc.x,bc.y,bc.far?1.2:1.6,0,7);ctx.fill();
    }
    transitioning=0;
    windows.forEach(function(w){
      if(w.target>0&&w.lit<1){w.lit=Math.min(1,w.lit+.05);transitioning++;}
      if(w.lit<=0)return;
      var a=w.lit*(0.62+Math.sin(t*.0011+w.phase)*w.flick);
      ctx.fillStyle=(w.cool?'rgba(196,218,246,':'rgba(242,207,141,')+Math.min(.9,Math.max(0,a))+')';
      ctx.fillRect(w.x,w.y,5,7);
      if(w.lit>0&&w.lit<1){ctx.globalAlpha=0.5*(1-w.lit);ctx.drawImage(warmGlow,w.x-12,w.y-11,28,28);ctx.globalAlpha=1;}
    });
    lamps.forEach(function(l){
      ctx.strokeStyle='rgba(120,140,170,.5)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x,l.y-34);ctx.stroke();
      if(l.target>0&&l.lit<1)l.lit=Math.min(1,l.lit+.04);
      if(l.lit>0){ctx.globalAlpha=.8*l.lit;ctx.drawImage(warmGlow,l.x-26,l.y-62,52,52);ctx.globalAlpha=.12*l.lit;ctx.drawImage(warmGlow,l.x-20,l.y-3,40,10);ctx.globalAlpha=1;ctx.fillStyle='rgba(255,231,184,'+l.lit+')';ctx.beginPath();ctx.arc(l.x,l.y-36,2,0,7);ctx.fill();}
    });
    drawRipples();drawSparks();
  }

  /* ============================================================
     共通: サイズ / 入力 / ループ
     ============================================================ */
  function size(){DPR=Math.min(devicePixelRatio||1,degraded?1:2);W=hero.clientWidth;H=hero.clientHeight;canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);if(mode==='timelapse')buildTimelapse();else buildTown();}
  var rzT=null;
  addEventListener('resize',function(){
    clearTimeout(rzT);
    rzT=setTimeout(function(){
      var w=hero.clientWidth,h=hero.clientHeight;
      if(w===W&&Math.abs(h-H)<140)return;
      size();
      if(reduce)paintStatic();
    },180);
  });
  /* 描画モードだけ波紋インタラクション（タイムラプスは自動演出のみ） */
  var ripples=[],sparks=[],pointer={x:-999,y:-999,px:-999,py:-999,moved:0};
  function addRipple(x,y){
    for(var i=0;i<3;i++)ripples.push({x:x,y:y,r:2+i*10,v:2.5-i*.35,life:1,max:Math.max(W,H)*.45,warm:i%2===0});
    for(var j=0;j<14;j++){var a=Math.random()*6.283,sp=.4+Math.random()*1.5;sparks.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.3,life:1,size:.8+Math.random()*1.8,warm:Math.random()<.7});}
    if(sparks.length>240)sparks.splice(0,sparks.length-240);
    if(ripples.length>36)ripples.splice(0,ripples.length-36);
  }
  function pos(e){var r=canvas.getBoundingClientRect();var t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};}
  hero.addEventListener('pointerdown',function(e){if(mode==='timelapse')return;var p=pos(e);addRipple(p.x,p.y);});
  hero.addEventListener('pointermove',function(e){
    if(mode==='timelapse')return;
    var p=pos(e);pointer.px=pointer.x;pointer.py=pointer.y;pointer.x=p.x;pointer.y=p.y;
    var dx=pointer.x-pointer.px,dy=pointer.y-pointer.py,d=Math.hypot(dx,dy);
    if(d>3&&pointer.px>-500){pointer.moved+=d;
      if(pointer.moved>10){pointer.moved=0;sparks.push({x:p.x,y:p.y,vx:dx*.06+(Math.random()-.5)*.5,vy:dy*.06-(.2+Math.random()*.5),life:1,size:.8+Math.random()*1.4,warm:Math.random()<.6});if(sparks.length>240)sparks.splice(0,sparks.length-240);}}
  },{passive:true});
  hero.addEventListener('touchstart',function(e){if(mode==='timelapse')return;var p=pos(e);addRipple(p.x,p.y);},{passive:true});
  function drawRipples(){
    var changed=false;
    for(var i=ripples.length-1;i>=0;i--){
      var p=ripples[i];p.r+=p.v;p.v*=.995;p.life=1-(p.r/p.max);
      if(p.life<=0){ripples.splice(i,1);continue;}
      var a=Math.max(0,p.life)*.5,col=p.warm?'242,207,141':'157,184,220';
      ctx.strokeStyle='rgba('+col+','+a+')';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.stroke();
      if(p.life>.5){ctx.strokeStyle='rgba('+col+','+(a*.4)+')';ctx.beginPath();ctx.arc(p.x,p.y,p.r*.86,0,7);ctx.stroke();}
      windows.forEach(function(w){if(w.target===0){var d=Math.hypot(w.x-p.x,w.y-p.y);if(Math.abs(d-p.r)<10){w.target=1;litCount++;changed=true;}}});
      lamps.forEach(function(l){if(l.target===0){var d=Math.hypot(l.x-p.x,(l.y-36)-p.y);if(Math.abs(d-p.r)<12)l.target=1;}});
    }
    if(changed)updateCnt();
  }
  function drawSparks(){
    for(var i=sparks.length-1;i>=0;i--){
      var s=sparks[i];s.x+=s.vx;s.y+=s.vy;s.vy-=.004;s.life-=.012;
      if(s.life<=0){sparks.splice(i,1);continue;}
      ctx.globalAlpha=s.life*.8;
      ctx.drawImage(s.warm?warmGlow:coolGlow,s.x-s.size*4,s.y-s.size*4,s.size*8,s.size*8);
      ctx.globalAlpha=1;
      ctx.fillStyle='rgba(255,255,255,'+(s.life*.85)+')';ctx.beginPath();ctx.arc(s.x,s.y,s.size*.7,0,7);ctx.fill();
    }
  }
  var perfN=0,perfSum=0,lastT=0,frameNo=0,transitioning=0;
  function frame(t){
    frameNo++;
    var busy=(mode==='timelapse')?(PROG<1):(ripples.length>0||sparks.length>0||transitioning>0);
    if(!busy&&(frameNo&1)){requestAnimationFrame(frame);lastT=t;return;}
    if(lastT){var dt=t-lastT;if(dt<500){perfSum+=dt;perfN++;}
      if(!degraded&&perfN===40&&perfSum/perfN>40&&DPR>1){degraded=true;DPR=1;canvas.width=W;canvas.height=H;ctx.setTransform(1,0,0,1,0,0);}
    }
    lastT=t;
    if(mode==='timelapse')drawTimelapse();else drawTown(t);
    requestAnimationFrame(frame);
  }
  /* reduced-motion 時の静止画（初回・resize後で共用） */
  function paintStatic(){
    if(mode==='timelapse'){litCount=totalLights;ctx.drawImage(nightL,0,0,W,H);if(scrimL){ctx.globalAlpha=0.22;ctx.drawImage(scrimL,0,0,W,H);ctx.globalAlpha=1;}updateCnt();return;}
    litCount=windows.length;windows.forEach(function(w){w.lit=w.target=1});lamps.forEach(function(l){l.lit=l.target=1});drawTown(0);updateCnt();
  }
  function start(){
    size();
    if(reduce){paintStatic();return;}
    requestAnimationFrame(frame);
    if(mode!=='timelapse')setTimeout(function(){addRipple(W*.62,H*.58)},1700);
  }

  /* ★写真の指定: data-photo(夜) / data-photo-day(昼) / data-photo-dusk(夕・任意) */
  var nightSrc=canvas.getAttribute('data-photo'),daySrc=canvas.getAttribute('data-photo-day'),duskSrc=canvas.getAttribute('data-photo-dusk');
  if(nightSrc&&daySrc){
    var pending=0;
    function settle(key,im){if(key==='night')imgNight=im;else if(key==='day')imgDay=im;else imgDusk=im;pending--;if(pending===0){if(imgNight&&imgDay)mode='timelapse';start();}}
    function load(src,key){pending++;var im=new Image();im.onload=function(){settle(key,im);};im.onerror=function(){settle(key,null);};im.src=src;}
    load(nightSrc,'night');load(daySrc,'day');if(duskSrc)load(duskSrc,'dusk');
  }else{
    start(); /* 写真指定なし → 描画モード */
  }
})();
