/* トップページ インタラクティブヒーロー「波紋が灯していく」（Canvas 2D）
   ─ 2つのモード ─
   【フォトモード】canvas の data-photo 属性に夜景写真のパスを指定すると、
     写真の明るい点（窓・街灯）を自動検出し、暗くした写真の上で
     波紋が通過した明かりだけが元の明るさで灯っていく。
   【描画モード】写真が無い間は、コードで描いた3層のまちなみで同じ演出をする。
   共通: 静的な絵は一度だけオフスクリーンに焼き込み、毎フレームは合成のみ。
   rAFは1本・DPR上限2。resize は間引き、スマホのアドレスバー伸縮では再構築しない。 */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas=document.getElementById('fx');if(!canvas)return;
  var hero=document.querySelector('.hero-fx');
  var ctx=canvas.getContext('2d');
  var cntEl=document.getElementById('cnt'),totEl=document.getElementById('tot');
  var W,H,DPR,windows=[],lamps=[],beacons=[],litCount=0,staticL=null;
  var photo=null,photoDay=null,photoMode=false,timelapse=false,transStart=0,PROG=0,brightL=null,litL=null,litCtx=null,scrimL=null;
  /* コア数の少ない端末は最初から低解像度で開始（描画負荷を1/4に） */
  var degraded=!!(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
  /* 光のグラデーションは毎フレーム作らず、事前に1枚のスプライトにしておく（低速機対策） */
  function glowSprite(rgb){var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d');var gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba('+rgb+',1)');gr.addColorStop(.55,'rgba('+rgb+',.28)');gr.addColorStop(1,'rgba('+rgb+',0)');g.fillStyle=gr;g.beginPath();g.arc(32,32,32,0,7);g.fill();return c;}
  var warmGlow=glowSprite('255,231,184'),coolGlow=glowSprite('157,184,220');
  function layer(){var c=document.createElement('canvas');c.width=W*DPR;c.height=H*DPR;return c;}

  /* ============================================================
     フォトモード: 写真の明かり検出と「灯り」の焼き込み
     ============================================================ */
  function buildPhoto(){
    windows=[];lamps=[];beacons=[];litCount=0;
    var iw=photo.naturalWidth,ih=photo.naturalHeight;
    var sc=Math.max(W/iw,H/ih),dw=iw*sc,dh=ih*sc,dx=(W-dw)/2,dy=(H-dh)/2;

    /* 元の明るさの写真（点灯後の姿） */
    brightL=layer();var b=brightL.getContext('2d');b.setTransform(DPR,0,0,DPR,0,0);
    b.drawImage(photo,dx,dy,dw,dh);

    timelapse=!!photoDay;
    staticL=layer();var s=staticL.getContext('2d');s.setTransform(DPR,0,0,DPR,0,0);
    if(timelapse){
      /* タイムラプスの開始フレーム: 昼のまち */
      var iw2=photoDay.naturalWidth,ih2=photoDay.naturalHeight;
      var sc2=Math.max(W/iw2,H/ih2),dw2=iw2*sc2,dh2=ih2*sc2,dx2=(W-dw2)/2,dy2=(H-dh2)/2;
      s.drawImage(photoDay,dx2,dy2,dw2,dh2);
      /* 昼のあいだ白い見出しを守る陰り（夜が深まるにつれて消える） */
      scrimL=layer();var sg=scrimL.getContext('2d');sg.setTransform(DPR,0,0,DPR,0,0);
      var g1=sg.createLinearGradient(0,0,W*0.68,0);
      g1.addColorStop(0,'rgba(9,14,26,.66)');g1.addColorStop(1,'rgba(9,14,26,0)');
      sg.fillStyle=g1;sg.fillRect(0,0,W,H);
      var g2=sg.createLinearGradient(0,0,0,H*0.55);
      g2.addColorStop(0,'rgba(9,14,26,.5)');g2.addColorStop(1,'rgba(9,14,26,0)');
      sg.fillStyle=g2;sg.fillRect(0,0,W,H);
    }else{
      /* 消灯状態: 写真を落ち着いた夜の暗さに。見出し側（左）と空（上）は少し強めに沈める */
      s.drawImage(photo,dx,dy,dw,dh);
      s.fillStyle='rgba(6,10,20,.58)';s.fillRect(0,0,W,H);
      var lg=s.createLinearGradient(0,0,W*0.66,0);
      lg.addColorStop(0,'rgba(5,9,18,.5)');lg.addColorStop(1,'rgba(5,9,18,0)');
      s.fillStyle=lg;s.fillRect(0,0,W,H);
      var tg=s.createLinearGradient(0,0,0,H*0.5);
      tg.addColorStop(0,'rgba(5,9,18,.5)');tg.addColorStop(1,'rgba(5,9,18,0)');
      s.fillStyle=tg;s.fillRect(0,0,W,H);
    }

    /* 灯った明かりの焼き込み先（最初は透明） */
    litL=layer();litCtx=litL.getContext('2d');litCtx.setTransform(DPR,0,0,DPR,0,0);

    /* 明かりの検出: 縮小画像の輝点を拾い、近接をグリッドで間引く */
    var ds=Math.min(1,480/W);
    var dc=document.createElement('canvas');
    dc.width=Math.max(1,Math.round(W*ds));dc.height=Math.max(1,Math.round(H*ds));
    var dctx=dc.getContext('2d');
    dctx.drawImage(photo,dx*ds,dy*ds,dw*ds,dh*ds);
    var data;
    try{data=dctx.getImageData(0,0,dc.width,dc.height).data;}
    catch(e){data=null;} /* 万一CORSで読めない写真なら描画モードへ戻す */
    if(!data){photoMode=false;buildTown();return;}
    /* 明かりの検出（局所コントラスト方式）:
       「周囲の平均よりはっきり明るい点」だけを拾う。これにより、面としてなだらかに
       明るい夕焼け空は除外され、市街の窓明かり・街灯だけが灯りとして検出される。
       高速化のため積分画像（Summed-Area Table）で局所平均を求める。 */
    var w0=dc.width,h0=dc.height,y,x,o;
    var L=new Float32Array(w0*h0);
    for(y=0;y<h0;y++)for(x=0;x<w0;x++){o=(y*w0+x)*4;L[y*w0+x]=data[o]*.2126+data[o+1]*.7152+data[o+2]*.0722;}
    var iw=w0+1,I=new Float64Array(iw*(h0+1));
    for(y=1;y<=h0;y++){var rs=0;for(x=1;x<=w0;x++){rs+=L[(y-1)*w0+(x-1)];I[y*iw+x]=I[(y-1)*iw+x]+rs;}}
    function boxAvg(cx,cy,rr){
      var x0=cx-rr<0?0:cx-rr,y0=cy-rr<0?0:cy-rr,x1=cx+rr+1>w0?w0:cx+rr+1,y1=cy+rr+1>h0?h0:cy+rr+1;
      return (I[y1*iw+x1]-I[y0*iw+x1]-I[y1*iw+x0]+I[y0*iw+x0])/((x1-x0)*(y1-y0));
    }
    var R=Math.max(3,Math.round(w0*0.014)),cand=[];
    for(y=1;y<h0-1;y++)for(x=1;x<w0-1;x++){
      var lv=L[y*w0+x];
      if(lv<55)continue;                                   /* 暗すぎる */
      var bg=boxAvg(x,y,R);
      if(bg>140)continue;                                  /* 周囲が明るい＝空の中 → 除外 */
      var contrast=lv-bg;
      if(contrast<24)continue;                             /* 周囲と差が無い＝面 → 除外 */
      if(lv<L[y*w0+x-1]||lv<L[y*w0+x+1]||lv<L[(y-1)*w0+x]||lv<L[(y+1)*w0+x])continue; /* 局所最大のみ */
      cand.push({x:x,y:y,s:contrast});
    }
    cand.sort(function(a,b){return b.s-a.s});
    var occ={},cell=4;
    for(var i=0;i<cand.length&&windows.length<600;i++){
      var q=cand[i],cx=(q.x/cell)|0,cy=(q.y/cell)|0,ok=true;
      for(var oy=-1;oy<=1&&ok;oy++)for(var ox=-1;ox<=1;ox++){if(occ[(cx+ox)+'_'+(cy+oy)]){ok=false;break;}}
      if(!ok)continue;
      occ[cx+'_'+cy]=1;
      windows.push({x:q.x/ds,y:q.y/ds,r:6+Math.min(8,q.s/8),lit:0,target:0,sprite:null});
    }
    if(windows.length<40){photoMode=false;buildTown();return;} /* 検出できない写真は描画モードへ */

    if(timelapse){
      /* 点灯時刻の割り当て: 近所の明かりがまとまって灯るよう、種点の時刻を継承 */
      var seeds=[],si;
      for(si=0;si<24;si++)seeds.push({x:Math.random()*W,y:Math.random()*H,t:0.30+0.60*Math.random()});
      for(i=0;i<windows.length;i++){
        var wi=windows[i],best=1e18,bt=0.6;
        for(si=0;si<seeds.length;si++){var sd=seeds[si],ddx=sd.x-wi.x,ddy=sd.y-wi.y,dd=ddx*ddx+ddy*ddy;if(dd<best){best=dd;bt=sd.t;}}
        wi.onT=Math.min(0.97,Math.max(0.26,bt+(Math.random()-0.5)*0.12));
      }
      var hint=document.querySelector('.fx-hint');if(hint)hint.style.display='none';
      transStart=0;PROG=0; /* 開始時刻は「ページ読み込み完了+2.2秒」に描画側で確定（ローダー明けに昼を一拍見せる） */
    }else{
      /* 初期点灯（約15%）: 真っ暗にしない */
      for(i=0;i<windows.length;i++){
        if(Math.random()<0.15){var w=windows[i];w.target=1;w.lit=1;stampLit(w);litCount++;}
      }
    }
    totEl.textContent=windows.length;updateCnt();
  }
  /* 明かり1点ぶんの「点灯後の写真」を丸くくり抜いたスプライト */
  function blobSprite(p){
    var d=Math.max(4,Math.ceil(p.r*2));
    var c=document.createElement('canvas');c.width=c.height=Math.max(2,Math.round(d*DPR));
    var g=c.getContext('2d');g.setTransform(DPR,0,0,DPR,0,0);
    g.drawImage(brightL,(p.x-p.r)*DPR,(p.y-p.r)*DPR,d*DPR,d*DPR,0,0,d,d);
    g.globalCompositeOperation='destination-in';
    var rg=g.createRadialGradient(p.r,p.r,0,p.r,p.r,p.r);
    rg.addColorStop(0,'rgba(0,0,0,1)');rg.addColorStop(.6,'rgba(0,0,0,.85)');rg.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=rg;g.fillRect(0,0,d,d);
    return c;
  }
  function stampLit(w){
    if(!w.sprite)w.sprite=blobSprite(w);
    litCtx.drawImage(w.sprite,w.x-w.r,w.y-w.r,w.r*2,w.r*2);
    w.sprite=null;
  }
  function drawPhotoScene(){
    if(timelapse){
      /* 昼→夜のクロスフェード（イーズイン・アウト、約6.5秒） */
      if(!transStart){
        if(document.readyState==='complete')transStart=performance.now()+2200;
        PROG=0;
      }
      var tt=transStart?Math.min(1,Math.max(0,(performance.now()-transStart)/6500)):0;
      PROG=tt<.5?4*tt*tt*tt:1-Math.pow(-2*tt+2,3)/2;
      if(PROG>=1&&transitioning===0){ctx.drawImage(brightL,0,0,W,H);if(scrimL){ctx.globalAlpha=0.25;ctx.drawImage(scrimL,0,0,W,H);ctx.globalAlpha=1;}return;} /* 完了後は夜写真＋薄い陰り */
      ctx.drawImage(staticL,0,0,W,H);
      if(PROG>0){ctx.globalAlpha=PROG;ctx.drawImage(brightL,0,0,W,H);ctx.globalAlpha=1;}
      if(scrimL){ctx.globalAlpha=0.25+0.75*(1-PROG);ctx.drawImage(scrimL,0,0,W,H);ctx.globalAlpha=1;}
    }else{
      ctx.drawImage(staticL,0,0,W,H);
    }
    ctx.drawImage(litL,0,0,W,H);
    transitioning=0;
    var turned=false;
    for(var i=0;i<windows.length;i++){
      var w=windows[i];
      if(timelapse&&w.target===0&&PROG>=w.onT){w.target=1;litCount++;turned=true;}
      if(w.target>0&&w.lit<1){
        w.lit=Math.min(1,w.lit+.05);transitioning++;
        if(!w.sprite)w.sprite=blobSprite(w);
        ctx.globalAlpha=w.lit;
        ctx.drawImage(w.sprite,w.x-w.r,w.y-w.r,w.r*2,w.r*2);
        ctx.globalAlpha=(1-w.lit)*.4; /* 点灯の瞬間のふわっとした光 */
        ctx.drawImage(warmGlow,w.x-w.r*2,w.y-w.r*2,w.r*4,w.r*4);
        ctx.globalAlpha=1;
        if(w.lit>=1)stampLit(w);
      }
    }
    if(turned)updateCnt();
  }

  /* ============================================================
     描画モード: コードで描く3層のまちなみ（写真が無い間の姿）
     ============================================================ */
  function buildTown(){
    windows=[];lamps=[];beacons=[];litCount=0;
    var ground=H*0.86,x,c,r;
    staticL=layer();
    var s=staticL.getContext('2d');s.setTransform(DPR,0,0,DPR,0,0);

    /* --- 空・星・薄雲ごしの月・地平の街明かり --- */
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

    /* --- 遠景: 霞んだシルエット。空気遠近で明るめの色、窓は点描 --- */
    x=-30;
    while(x<W+40){
      var bw=22+Math.random()*52,bh=28+Math.random()*Math.min(92,H*0.15),by=ground-14-bh;
      s.fillStyle='#16202f';s.fillRect(x,by,bw,bh);
      if(Math.random()<0.3){s.strokeStyle='rgba(120,140,170,.35)';s.lineWidth=1;s.beginPath();s.moveTo(x+bw*0.5,by);s.lineTo(x+bw*0.5,by-5-Math.random()*8);s.stroke();}
      s.fillStyle='rgba(220,205,180,.15)';
      for(c=x+4;c<x+bw-4;c+=7)for(r=by+5;r<by+bh-4;r+=9)if(Math.random()<0.26)s.fillRect(c,r,1.6,2.2);
      x+=bw+2+Math.random()*14;
    }

    /* --- 中景: 暗い面、薄明かりの窓、屋上の小屋・給水タンク --- */
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

    /* --- 近景: 表情のあるビル群。窓はフロアに揃えて配置（インタラクティブ） --- */
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

    /* --- 地面 --- */
    s.fillStyle='#080e1a';s.fillRect(0,ground,W,H-ground);
    s.fillStyle='rgba(157,184,220,.06)';s.fillRect(0,ground,W,1);

    /* 初期点灯は同じフロアの隣り合う窓のかたまりで（生活の気配） */
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

  function updateCnt(){cntEl.innerHTML='<b>'+litCount+'</b> / '+windows.length+' lights';}
  function size(){DPR=Math.min(devicePixelRatio||1,degraded?1:2);W=hero.clientWidth;H=hero.clientHeight;canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);if(photoMode)buildPhoto();else buildTown();}
  size();
  /* ★フォトモード: <canvas id="fx" data-photo="assets/img/hero-night.jpg"> のように
     属性で写真パスを指定すると、読み込み完了後に自動で写真の演出へ切り替わる */
  var photoSrc=canvas.getAttribute('data-photo'),photoDaySrc=canvas.getAttribute('data-photo-day');
  if(photoSrc){
    var pimg=new Image();
    pimg.onload=function(){photo=pimg;photoMode=true;size();if(reduce)paintStatic();};
    pimg.src=photoSrc;
    if(photoDaySrc){
      var dimg=new Image();
      dimg.onload=function(){photoDay=dimg;if(photoMode){size();if(reduce)paintStatic();}};
      dimg.src=photoDaySrc;
    }
  }
  /* resize は間引く。スマホのアドレスバー伸縮（高さだけの小変化）では作り直さない */
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
  var ripples=[],sparks=[],pointer={x:-999,y:-999,px:-999,py:-999,moved:0};
  function addRipple(x,y){
    for(var i=0;i<3;i++)ripples.push({x:x,y:y,r:2+i*10,v:2.5-i*.35,life:1,max:Math.max(W,H)*.45,warm:i%2===0});
    for(var j=0;j<14;j++){var a=Math.random()*6.283,sp=.4+Math.random()*1.5;sparks.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.3,life:1,size:.8+Math.random()*1.8,warm:Math.random()<.7});}
    if(sparks.length>240)sparks.splice(0,sparks.length-240);
    if(ripples.length>36)ripples.splice(0,ripples.length-36);
  }
  function pos(e){var r=canvas.getBoundingClientRect();var t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};}
  hero.addEventListener('pointerdown',function(e){if(timelapse)return;var p=pos(e);addRipple(p.x,p.y);});
  hero.addEventListener('pointermove',function(e){
    var p=pos(e);pointer.px=pointer.x;pointer.py=pointer.y;pointer.x=p.x;pointer.y=p.y;
    var dx=pointer.x-pointer.px,dy=pointer.y-pointer.py,d=Math.hypot(dx,dy);
    if(d>3&&pointer.px>-500){pointer.moved+=d;
      if(pointer.moved>10){pointer.moved=0;sparks.push({x:p.x,y:p.y,vx:dx*.06+(Math.random()-.5)*.5,vy:dy*.06-(.2+Math.random()*.5),life:1,size:.8+Math.random()*1.4,warm:Math.random()<.6});if(sparks.length>240)sparks.splice(0,sparks.length-240);}}
  },{passive:true});
  hero.addEventListener('touchstart',function(e){if(timelapse)return;var p=pos(e);addRipple(p.x,p.y);},{passive:true});
  function drawScene(t){
    if(photoMode){drawPhotoScene();return;}
    ctx.drawImage(staticL,0,0,W,H);
    /* 航空障害灯: ゆっくり明滅（reduced-motion時は静止） */
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
  }
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
    if(changed)updateCnt(); /* DOM更新はフレームに1回まで */
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
  /* 最初の約40フレームが遅い端末では、まちの状態を保ったまま解像度を一段下げる。
     さらに、波紋も粒も点灯遷移もない待機中は描画を1フレームおきに間引く（負荷半減） */
  var perfN=0,perfSum=0,lastT=0,frameNo=0,transitioning=0;
  function frame(t){
    frameNo++;
    var busy=ripples.length>0||sparks.length>0||transitioning>0||(timelapse&&PROG<1);
    if(!busy&&(frameNo&1)){requestAnimationFrame(frame);lastT=t;return;}
    if(lastT){var dt=t-lastT;if(dt<500){perfSum+=dt;perfN++;}
      if(!degraded&&perfN===40&&perfSum/perfN>40&&DPR>1){degraded=true;DPR=1;canvas.width=W;canvas.height=H;ctx.setTransform(1,0,0,1,0,0);}
    }
    lastT=t;
    drawScene(t);drawRipples();drawSparks();requestAnimationFrame(frame);
  }
  // reduced-motion 時の静止画（初回表示と resize 後の再描画で共用）
  function paintStatic(){
    litCount=windows.length;
    if(photoMode){windows.forEach(function(w){w.lit=w.target=1;w.sprite=null});ctx.drawImage(brightL,0,0,W,H);updateCnt();return;}
    windows.forEach(function(w){w.lit=w.target=1});lamps.forEach(function(l){l.lit=l.target=1});drawScene(0);updateCnt();
  }
  if(!reduce){requestAnimationFrame(frame);setTimeout(function(){if(!timelapse)addRipple(W*.62,H*.58)},1700);}
  else{paintStatic();}
})();
