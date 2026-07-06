/* 共通スクリプト: ローダー / 固定ヘッダー / モバイルメニュー / スクロールフェードイン */
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  addEventListener('load',()=>{const l=document.getElementById('loader');setTimeout(()=>l.classList.add('gone'),reduce?0:900);});
  const hdr=document.getElementById('hdr');const onScroll=()=>hdr.classList.toggle('solid',scrollY>60);onScroll();addEventListener('scroll',onScroll,{passive:true});
  const burger=document.getElementById('burger'),menu=document.getElementById('menu');
  burger.addEventListener('click',()=>{burger.classList.toggle('open');menu.classList.toggle('open');burger.setAttribute('aria-expanded',burger.classList.contains('open'))});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{burger.classList.remove('open');menu.classList.remove('open');burger.setAttribute('aria-expanded','false')}));
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.14});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
