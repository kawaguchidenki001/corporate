/* トップページ インタラクティブヒーロー「波紋が灯していく」（Canvas 2D） */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas=document.getElementById('fx');if(!canvas)return;
  var hero=document.querySelector('.hero-fx');
  var ctx=canvas.getContext('2d');
  var cntEl=document.getElementById('cnt'),totEl=document.getElementById('tot');
  var W,H,DPR,windows=[],lamps=[],skyline=[],litCount=0;
  function buildTown(){
    windows=[];lamps=[];skyline=[];litCount=0;
    var ground=H*0.86,x=-20;
    while(x<W+40){
      var bw=30+Math.random()*70,bh=40+Math.random()*Math.min(150,H*0.22);
      skyline.push({x:x,y:ground-bh,w:bw,h:bh});
      var cols=Math.max(1,Math.floor(bw/16)),rows=Math.max(1,Math.floor(bh/20));
      for(var c=0;c<cols;c++)for(var r=0;r<rows;r++){
        if(Math.random()<0.5)windows.push({x:x+8+c*16,y:ground-bh+10+r*20,lit:0,target:0,flick:.06+Math.random()*.12,phase:Math.random()*6.28});
      }
      x+=bw+6+Math.random()*26;
    }
    for(var i=0;i<Math.floor(W/180);i++)lamps.push({x:60+i*180+Math.random()*60,y:ground,lit:0,target:0});
    windows.forEach(function(w){if(Math.random()<0.15){w.target=1;w.lit=1;}});
    litCount=windows.filter(function(w){return w.target>0}).length;
    totEl.textContent=windows.length;updateCnt();
  }
  function updateCnt(){cntEl.innerHTML='<b>'+litCount+'</b> / '+windows.length+' lights';}
  function size(){DPR=Math.min(devicePixelRatio||1,2);W=hero.clientWidth;H=hero.clientHeight;canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);buildTown();}
  size();addEventListener('resize',size);
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
  function bg(){var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0a1322');g.addColorStop(.55,'#0e1a2e');g.addColorStop(1,'#101d33');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(200,215,240,.25)';for(var i=0;i<40;i++){ctx.fillRect((i*97)%W,((i*61)%Math.floor(H*.5)),1,1);}}
  function town(t){
    var ground=H*0.86;ctx.fillStyle='#0a1120';
    skyline.forEach(function(b){ctx.fillRect(b.x,b.y,b.w,b.h)});
    ctx.fillStyle='#080e1a';ctx.fillRect(0,ground,W,H-ground);
    windows.forEach(function(w){
      if(w.target>0&&w.lit<1)w.lit=Math.min(1,w.lit+.05);
      if(w.lit<=0)return;
      var a=w.lit*(0.62+Math.sin(t*.0011+w.phase)*w.flick);
      ctx.fillStyle='rgba(242,207,141,'+Math.min(.9,Math.max(0,a))+')';
      ctx.fillRect(w.x,w.y,5,7);
      if(w.lit>0&&w.lit<1){var g=ctx.createRadialGradient(w.x+2,w.y+3,0,w.x+2,w.y+3,14);g.addColorStop(0,'rgba(255,231,184,'+(0.5*(1-w.lit))+')');g.addColorStop(1,'rgba(255,231,184,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(w.x+2,w.y+3,14,0,7);ctx.fill();}
    });
    lamps.forEach(function(l){
      ctx.strokeStyle='rgba(120,140,170,.5)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x,l.y-34);ctx.stroke();
      if(l.target>0&&l.lit<1)l.lit=Math.min(1,l.lit+.04);
      if(l.lit>0){var g=ctx.createRadialGradient(l.x,l.y-36,0,l.x,l.y-36,26);g.addColorStop(0,'rgba(255,231,184,'+(.8*l.lit)+')');g.addColorStop(1,'rgba(255,231,184,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(l.x,l.y-36,26,0,7);ctx.fill();ctx.fillStyle='rgba(255,231,184,'+l.lit+')';ctx.beginPath();ctx.arc(l.x,l.y-36,2,0,7);ctx.fill();}
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
  if(!reduce){requestAnimationFrame(frame);setTimeout(function(){addRipple(W*.62,H*.58)},1700);}
  else{windows.forEach(function(w){w.lit=w.target=1});lamps.forEach(function(l){l.lit=l.target=1});bg();town(0);litCount=windows.length;updateCnt();}
})();
