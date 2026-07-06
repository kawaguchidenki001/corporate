/* トップページ インタラクティブヒーロー「波紋が灯していく」（Canvas 2D）
   まちなみは遠景・中景・近景の3層。シルエットは buildTown() で一度だけ
   オフスクリーンに描き、毎フレームは合成するだけ（rAFは1本のまま）。 */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas=document.getElementById('fx');if(!canvas)return;
  var hero=document.querySelector('.hero-fx');
  var ctx=canvas.getContext('2d');
  var cntEl=document.getElementById('cnt'),totEl=document.getElementById('tot');
  var W,H,DPR,windows=[],lamps=[],beacons=[],litCount=0;
  var backL,midL,frontL;
  function newLayer(){var c=document.createElement('canvas');c.width=W*DPR;c.height=H*DPR;var g=c.getContext('2d');g.setTransform(DPR,0,0,DPR,0,0);return c;}
  function buildTown(){
    windows=[];lamps=[];beacons=[];litCount=0;
    var ground=H*0.86,x,c,r;

    /* --- 遠景: 霞んだシルエット。空気遠近で明るめの色、窓は点描 --- */
    backL=newLayer();var b=backL.getContext('2d');
    x=-30;
    while(x<W+40){
      var bw=22+Math.random()*52,bh=28+Math.random()*Math.min(92,H*0.15),by=ground-14-bh;
      b.fillStyle='#16202f';b.fillRect(x,by,bw,bh);
      if(Math.random()<0.3){b.strokeStyle='rgba(120,140,170,.35)';b.lineWidth=1;b.beginPath();b.moveTo(x+bw*0.5,by);b.lineTo(x+bw*0.5,by-5-Math.random()*8);b.stroke();}
      b.fillStyle='rgba(220,205,180,.15)';
      for(c=x+4;c<x+bw-4;c+=7)for(r=by+5;r<by+bh-4;r+=9)if(Math.random()<0.26)b.fillRect(c,r,1.6,2.2);
      x+=bw+2+Math.random()*14;
    }

    /* --- 中景: 暗い面、薄明かりの窓、屋上の小屋・給水タンク --- */
    midL=newLayer();var m=midL.getContext('2d');
    x=-30;
    while(x<W+40){
      var mw=30+Math.random()*70,mh=42+Math.random()*Math.min(128,H*0.2),my=ground-7-mh;
      m.fillStyle='#0e1728';m.fillRect(x,my,mw,mh);
      m.fillStyle='rgba(0,0,0,.2)';m.fillRect(x+mw*0.8,my,mw*0.2,mh);
      m.fillStyle='rgba(157,184,220,.07)';m.fillRect(x,my,mw,1);
      if(Math.random()<0.3){m.fillStyle='#101b2e';m.fillRect(x+mw*0.15,my-7,Math.min(mw*0.3,22),7);}
      if(Math.random()<0.2){m.fillStyle='#111d31';m.fillRect(x+mw*0.6,my-9,9,9);m.fillStyle='#0c1526';m.fillRect(x+mw*0.6-1,my-11,11,2);}
      m.fillStyle='rgba(235,215,180,.12)';
      for(c=x+6;c<x+mw-6;c+=10)for(r=my+7;r<my+mh-6;r+=12)if(Math.random()<0.2)m.fillRect(c,r,2.6,3.4);
      if(mh>H*0.15&&Math.random()<0.28)beacons.push({x:x+mw*0.5,y:my-9,phase:Math.random()*6.28,far:true});
      x+=mw+4+Math.random()*20;
    }

    /* --- 近景: 表情のあるビル群。窓はフロアに揃えて配置（インタラクティブ） --- */
    frontL=newLayer();var f=frontL.getContext('2d');
    x=-20;
    while(x<W+40){
      var fw=38+Math.random()*74,fh=46+Math.random()*Math.min(158,H*0.24),fy=ground-fh;
      var tone=(Math.random()*3)|0;
      f.fillStyle=['#0a1120','#0b1223','#091022'][tone];
      f.fillRect(x,fy,fw,fh);
      if(Math.random()<0.22&&fw>60){var sw=fw*0.5,sh=12+Math.random()*20;f.fillRect(x+(fw-sw)/2,fy-sh,sw,sh);f.fillStyle='rgba(157,184,220,.1)';f.fillRect(x+(fw-sw)/2,fy-sh,sw,1);f.fillStyle=['#0a1120','#0b1223','#091022'][tone];}
      f.fillStyle='rgba(0,0,0,.25)';f.fillRect(x+fw*0.82,fy,fw*0.18,fh);
      f.fillStyle='rgba(157,184,220,.12)';f.fillRect(x,fy,fw,1);
      if(Math.random()<0.3){f.fillStyle='#0d1830';f.fillRect(x+4+Math.random()*Math.max(1,fw-24),fy-6,14,6);}
      if(Math.random()<0.25){
        var tx=x+6+Math.random()*Math.max(1,fw-20);
        f.fillStyle='#13223c';f.fillRect(tx,fy-12,10,12);
        f.fillStyle='#0b1424';f.fillRect(tx-1,fy-14,12,3);
        f.strokeStyle='rgba(120,140,170,.35)';f.lineWidth=1;
        f.beginPath();f.moveTo(tx+2,fy);f.lineTo(tx+2,fy-12);f.moveTo(tx+8,fy);f.lineTo(tx+8,fy-12);f.stroke();
      }
      if(Math.random()<0.3){
        var ax=x+fw*(0.3+Math.random()*0.4),ah=8+Math.random()*16;
        f.strokeStyle='rgba(120,140,170,.5)';f.lineWidth=1;
        f.beginPath();f.moveTo(ax,fy);f.lineTo(ax,fy-ah);f.stroke();
        if(fh>H*0.18)beacons.push({x:ax,y:fy-ah,phase:Math.random()*6.28});
      }
      var cols=Math.max(2,Math.floor((fw-14)/11)),floors=Math.max(2,Math.floor((fh-16)/13));
      var wx0=x+(fw-(cols*11-6))/2;
      for(var fl=0;fl<floors;fl++)for(var cc=0;cc<cols;cc++){
        if(Math.random()<0.82)windows.push({x:wx0+cc*11,y:fy+9+fl*13,lit:0,target:0,flick:.05+Math.random()*.1,phase:Math.random()*6.28,cool:Math.random()<0.13});
      }
      x+=fw+5+Math.random()*24;
    }

    /* 初期点灯は同じフロアの隣り合う窓のかたまりで（生活の気配） */
    var want=Math.round(windows.length*0.15),guard=0;
    while(litCount<want&&guard++<6000){
      var w0=windows[(Math.random()*windows.length)|0];
      for(var k=0;k<windows.length&&litCount<want;k++){
        var wk=windows[k];
        if(wk.target===0&&wk.y===w0.y&&Math.abs(wk.x-w0.x)<=22){wk.target=1;wk.lit=1;litCount++;}
      }
    }

    for(var i=0;i<Math.floor(W/180);i++)lamps.push({x:60+i*180+Math.random()*60,y:ground,lit:0,target:0});
    totEl.textContent=windows.length;updateCnt();
  }
  function updateCnt(){cntEl.innerHTML='<b>'+litCount+'</b> / '+windows.length+' lights';}
  function size(){DPR=Math.min(devicePixelRatio||1,2);W=hero.clientWidth;H=hero.clientHeight;canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);buildTown();}
  size();addEventListener('resize',function(){size();if(reduce)paintStatic();});
  var ripples=[],sparks=[],pointer={x:-999,y:-999,px:-999,py:-999,moved:0};
  function addRipple(x,y){
    for(var i=0;i<3;i++)ripples.push({x:x,y:y,r:2+i*10,v:2.5-i*.35,life:1,max:Math.max(W,H)*.45,warm:i%2===0});
    for(var j=0;j<14;j++){var a=Math.random()*6.283,sp=.4+Math.random()*1.5;sparks.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.3,life:1,size:.8+Math.random()*1.8,warm:Math.random()<.7});}
    if(sparks.length>240)sparks.splice(0,sparks.length-240);
    if(ripples.length>36)ripples.splice(0,ripples.length-36);
  }
  function pos(e){var r=canvas.getBoundingClientRect();var t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};}
  hero.addEventListener('pointerdown',function(e){var p=pos(e);addRipple(p.x,p.y);});
  hero.addEventListener('pointermove',function(e){
    var p=pos(e);pointer.px=pointer.x;pointer.py=pointer.y;pointer.x=p.x;pointer.y=p.y;
    var dx=pointer.x-pointer.px,dy=pointer.y-pointer.py,d=Math.hypot(dx,dy);
    if(d>3&&pointer.px>-500){pointer.moved+=d;
      if(pointer.moved>10){pointer.moved=0;sparks.push({x:p.x,y:p.y,vx:dx*.06+(Math.random()-.5)*.5,vy:dy*.06-(.2+Math.random()*.5),life:1,size:.8+Math.random()*1.4,warm:Math.random()<.6});if(sparks.length>240)sparks.splice(0,sparks.length-240);}}
  },{passive:true});
  hero.addEventListener('touchstart',function(e){var p=pos(e);addRipple(p.x,p.y);},{passive:true});
  function bg(){
    var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0a1322');g.addColorStop(.55,'#0e1a2e');g.addColorStop(1,'#101d33');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(200,215,240,.25)';for(var i=0;i<40;i++){ctx.fillRect((i*97)%W,((i*61)%Math.floor(H*.5)),1,1);}
    /* 薄雲ごしの月 */
    var mx=W*0.76,my=H*0.16;
    var mg=ctx.createRadialGradient(mx,my,0,mx,my,64);
    mg.addColorStop(0,'rgba(215,226,244,.3)');mg.addColorStop(.3,'rgba(210,222,242,.09)');mg.addColorStop(1,'rgba(210,222,242,0)');
    ctx.fillStyle=mg;ctx.beginPath();ctx.arc(mx,my,64,0,7);ctx.fill();
    ctx.fillStyle='rgba(226,234,248,.8)';ctx.beginPath();ctx.arc(mx,my,6.5,0,7);ctx.fill();
    /* 地平の街明かりのにじみ（光害） */
    var ground=H*0.86;
    var hz=ctx.createLinearGradient(0,ground-110,0,ground);
    hz.addColorStop(0,'rgba(125,148,198,0)');hz.addColorStop(1,'rgba(130,152,200,.12)');
    ctx.fillStyle=hz;ctx.fillRect(0,ground-110,W,110);
  }
  function town(t){
    var ground=H*0.86;
    ctx.drawImage(backL,0,0,W,H);
    ctx.drawImage(midL,0,0,W,H);
    ctx.drawImage(frontL,0,0,W,H);
    ctx.fillStyle='#080e1a';ctx.fillRect(0,ground,W,H-ground);
    ctx.fillStyle='rgba(157,184,220,.06)';ctx.fillRect(0,ground,W,1);
    /* 航空障害灯: ゆっくり明滅（reduced-motion時は静止） */
    for(var i=0;i<beacons.length;i++){
      var bc=beacons[i];
      var a=reduce?0.3:(0.12+0.3*(0.5+0.5*Math.sin(t*.0015+bc.phase)));
      if(bc.far)a*=0.6;
      ctx.fillStyle='rgba(255,92,86,'+a+')';
      ctx.beginPath();ctx.arc(bc.x,bc.y,bc.far?1.2:1.6,0,7);ctx.fill();
    }
    windows.forEach(function(w){
      if(w.target>0&&w.lit<1)w.lit=Math.min(1,w.lit+.05);
      if(w.lit<=0)return;
      var a=w.lit*(0.62+Math.sin(t*.0011+w.phase)*w.flick);
      ctx.fillStyle=(w.cool?'rgba(196,218,246,':'rgba(242,207,141,')+Math.min(.9,Math.max(0,a))+')';
      ctx.fillRect(w.x,w.y,5,7);
      if(w.lit>0&&w.lit<1){var g=ctx.createRadialGradient(w.x+2,w.y+3,0,w.x+2,w.y+3,14);g.addColorStop(0,'rgba(255,231,184,'+(0.5*(1-w.lit))+')');g.addColorStop(1,'rgba(255,231,184,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(w.x+2,w.y+3,14,0,7);ctx.fill();}
    });
    lamps.forEach(function(l){
      ctx.strokeStyle='rgba(120,140,170,.5)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x,l.y-34);ctx.stroke();
      if(l.target>0&&l.lit<1)l.lit=Math.min(1,l.lit+.04);
      if(l.lit>0){var g=ctx.createRadialGradient(l.x,l.y-36,0,l.x,l.y-36,26);g.addColorStop(0,'rgba(255,231,184,'+(.8*l.lit)+')');g.addColorStop(1,'rgba(255,231,184,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(l.x,l.y-36,26,0,7);ctx.fill();ctx.fillStyle='rgba(255,231,184,'+l.lit+')';ctx.beginPath();ctx.arc(l.x,l.y-36,2,0,7);ctx.fill();
        /* 路面のほのかな照り返し */
        var rg=ctx.createRadialGradient(l.x,l.y+2,0,l.x,l.y+2,20);rg.addColorStop(0,'rgba(255,231,184,'+(.12*l.lit)+')');rg.addColorStop(1,'rgba(255,231,184,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.ellipse(l.x,l.y+2,20,5,0,0,7);ctx.fill();}
    });
  }
  function drawRipples(){
    for(var i=ripples.length-1;i>=0;i--){
      var p=ripples[i];p.r+=p.v;p.v*=.995;p.life=1-(p.r/p.max);
      if(p.life<=0){ripples.splice(i,1);continue;}
      var a=Math.max(0,p.life)*.5,col=p.warm?'242,207,141':'157,184,220';
      ctx.strokeStyle='rgba('+col+','+a+')';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.stroke();
      if(p.life>.5){ctx.strokeStyle='rgba('+col+','+(a*.4)+')';ctx.beginPath();ctx.arc(p.x,p.y,p.r*.86,0,7);ctx.stroke();}
      windows.forEach(function(w){if(w.target===0){var d=Math.hypot(w.x-p.x,w.y-p.y);if(Math.abs(d-p.r)<10){w.target=1;litCount++;updateCnt();}}});
      lamps.forEach(function(l){if(l.target===0){var d=Math.hypot(l.x-p.x,(l.y-36)-p.y);if(Math.abs(d-p.r)<12)l.target=1;}});
    }
  }
  function drawSparks(){
    for(var i=sparks.length-1;i>=0;i--){
      var s=sparks[i];s.x+=s.vx;s.y+=s.vy;s.vy-=.004;s.life-=.012;
      if(s.life<=0){sparks.splice(i,1);continue;}
      var col=s.warm?'255,231,184':'157,184,220';
      var g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.size*4);
      g.addColorStop(0,'rgba('+col+','+(s.life*.8)+')');g.addColorStop(1,'rgba('+col+',0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,s.size*4,0,7);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,'+(s.life*.85)+')';ctx.beginPath();ctx.arc(s.x,s.y,s.size*.7,0,7);ctx.fill();
    }
  }
  function frame(t){bg();town(t);drawRipples();drawSparks();requestAnimationFrame(frame);}
  // reduced-motion 時の静止画（初回表示と resize 後の再描画で共用）
  function paintStatic(){windows.forEach(function(w){w.lit=w.target=1});lamps.forEach(function(l){l.lit=l.target=1});bg();town(0);litCount=windows.length;updateCnt();}
  if(!reduce){requestAnimationFrame(frame);setTimeout(function(){addRipple(W*.62,H*.58)},1700);}
  else{paintStatic();}
})();
