(() => {
  'use strict';
  const world = document.querySelector('#world');
  const music = document.querySelector('#music');
  const musicToggle = document.querySelector('#music-toggle');
  const musicStatus = document.querySelector('#music-status');
  // Begin at the requested 1:25 lyric cue.
  const MUSIC_START_SECONDS = 85;
  let musicStarted = false;
  music.volume = .45;
  function musicState() {
    musicToggle.textContent = music.paused ? '♫ Music' : '♫ Pause';
    musicToggle.setAttribute('aria-pressed', String(!music.paused));
    musicToggle.setAttribute('aria-label', music.paused ? 'Play background music' : 'Pause background music');
  }
  function playMusic() {
    if (!musicStarted) {
      music.currentTime = MUSIC_START_SECONDS;
      musicStarted = true;
    }
    music.play().then(() => { musicStatus.textContent = ''; musicState(); }).catch(() => {
      musicStatus.textContent = 'Music could not play. Add the song as music.mp3 beside index.html, then tap Music.';
      musicToggle.textContent = '♫ Try music';
      musicToggle.setAttribute('aria-pressed', 'false');
    });
  }
  musicToggle.addEventListener('click', () => {
    if (music.paused) playMusic(); else music.pause();
  });
  music.addEventListener('play', musicState);
  music.addEventListener('pause', musicState);
  const scenes = [...document.querySelectorAll('.scene')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.querySelector('#fireworks');
  const ctx = canvas.getContext('2d');
  let current = 0, busy = false, particles = [], raf = 0, timer = 0;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const random = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 65; i++) {
    const star = document.createElement('span');
    star.className = 'spark';
    star.textContent = i % 3 ? '✦' : '·';
    star.style.cssText = `--x:${random(2,98)}%;--y:${random(10,93)}%;--size:${random(5,17)}px;--duration:${random(2,5)}s;animation-delay:-${random(0,5)}s`;
    document.querySelector('#decor').append(star);
  }
  for (let i = 0; i < 52; i++) {
    const flower = document.createElement('span');
    flower.className = 'field-flower'; flower.textContent = i % 4 ? '✿' : '❀';
    flower.style.cssText = `left:${random(0,100)}%;top:${random(10,100)}%;font-size:${random(12,37)}px;animation-delay:-${random(0,4)}s;color:${['#fff1d4','#edb8c4','#f7e8a4'][i%3]}`;
    document.querySelector('#flowers').append(flower);
  }
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = world.clientWidth * ratio; canvas.height = world.clientHeight * ratio;
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  addEventListener('resize', resize); resize();
  function stopFireworks() { cancelAnimationFrame(raf); clearInterval(timer); particles = []; ctx.clearRect(0,0,world.clientWidth,world.clientHeight); }
  function explode(x, y) {
    for (let i=0;i<65;i++) {const angle = Math.PI*2*i/65, speed=random(1,4); particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:1,color:['#f9b8d4','#ffe6a6','#cabaff','#fff3df'][Math.floor(random(0,4))]});}
  }
  function fireworks() {
    stopFireworks();
    if (reduced.matches) { for(let i=0;i<25;i++){ctx.fillStyle='#f8d2e7';ctx.fillRect(random(0,world.clientWidth),random(80,world.clientHeight*.7),3,3);} return; }
    let last = performance.now(), started = last;
    const launch = () => explode(random(.1,.9)*world.clientWidth, random(.13,.55)*world.clientHeight);
    launch(); timer=setInterval(launch,750);
    function frame(now) {
      const dt = Math.min((now-last)/16.67,2);last=now;
      ctx.clearRect(0,0,world.clientWidth,world.clientHeight);
      particles = particles.filter(p=>p.life>0);
      for (const p of particles) {p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.025*dt;p.life-=.009*dt;ctx.globalAlpha=Math.max(p.life,0);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,1.8,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;
      if(now-started>14000)clearInterval(timer);
      if(particles.length || now-started<14000)raf=requestAnimationFrame(frame);
    }
    raf=requestAnimationFrame(frame);
  }
  async function go(next) {
    if(busy || next===current)return;
    busy=true;
    if (next===4) {
      musicToggle.hidden = false;
      playMusic();
    }
    if(current===0 && next===1){document.querySelector('.door').classList.add('opening');await wait(reduced.matches?0:650);scenes[0].classList.add('zoom-through');await wait(reduced.matches?0:650);}
    if(current===2 && next===3){document.querySelector('#portal').classList.add('visible');await wait(reduced.matches?0:700);}
    if(next===0){stopFireworks();music.pause();musicStarted=false;musicToggle.hidden=true;}
    scenes[current].classList.remove('active');scenes[current].inert=true;
    current=next;world.dataset.scene=String(next);
    scenes[next].inert=false;scenes[next].classList.add('active');
    document.querySelectorAll('.dot').forEach((dot,i)=>{dot.classList.toggle('current',i===next);if(i===next)dot.setAttribute('aria-current','step');else dot.removeAttribute('aria-current');});
    document.querySelectorAll('.spark').forEach(s=>s.classList.toggle('night-star',next>=3));
    document.querySelector('#announcement').textContent = scenes[next].querySelector('h1').textContent;
    scenes[next].querySelector('h1').focus({preventScroll:true});
    if(next===4)fireworks();
    await wait(reduced.matches?0:650);
    document.querySelector('#portal').classList.remove('visible');
    if(next===0){document.querySelector('.door').classList.remove('opening');scenes[0].classList.remove('zoom-through');}
    busy=false;
  }
  document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>go(Number(button.dataset.go))));
  document.querySelector('#reveal').addEventListener('click',()=>go(4));
  document.querySelector('#replay').addEventListener('click',()=>go(0));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopFireworks();});
  reduced.addEventListener('change',()=>{if(reduced.matches)stopFireworks();});
})();

