import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), music = $('music');
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
let gentle = reduceQuery.matches;
$('gentle').checked = gentle;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
} catch (error) {
  $('welcome').hidden = true; $('error').hidden = false; throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, innerWidth/innerHeight, .1, 550);
camera.rotation.order = 'YXZ';
let maxUnlocked = 0;
let stage = 0, started = false, busy = false, auto = false, final = false;
let yaw = 0, pitch = 0, joy = {x:0,y:0}, pointer = null, joyPointer = null;
let elapsed = 0, clock = new THREE.Clock(), burstClock = 0, fireworksUntil = 0;
let gate, guide, world = new THREE.Group(), water, particles, skyStars;
let floating = [], flames = [], bursts = [], lights = [];
let activities = [], butterflies = [], skyLanterns = [], fountainDrops, meteor;
let nearActivity = null, toastTimer, activitySerial = 0;
const collected = new Set();
const noteTexts = [
  'If I could choose a thousand beginnings, every one would lead to you.',
  'My favorite place is wherever I get to be with you.',
  'You turn the smallest moments into memories I want to keep.',
  'There is a little more magic in the world because you are in it.',
  'Your happiness will always be one of my favorite things.',
  'Some days are ordinary. Loving you never is.',
  'Out of all these stars, you would still be the one I wished for.',
  'This adventure ends, but my love for you keeps going. Always, Shayal.'
];
scene.add(world);
const target = new THREE.Vector3(0,1.8,-14);
const keys = new Set();
const ray = new THREE.Raycaster();
const random = (a,b) => a+Math.random()*(b-a);
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const ease = t => t*t*(3-2*t);
const palette = [
  {sky:0x9eb8b5,fog:0xbed0c3,ground:0x344e43,sun:0xffdab0,water:0x708e88},
  {sky:0xeab8c7,fog:0xf1c8d1,ground:0xb87f94,sun:0xffe4c8,water:0xc995b1},
  {sky:0xbcced0,fog:0xd6dbbf,ground:0x57714b,sun:0xffdcab,water:0x759d91},
  {sky:0x080f23,fog:0x18233b,ground:0x172b36,sun:0x99b8f4,water:0x142539}
];
const materials = {};
function material(color, options={}) {
  const key = color+JSON.stringify(options);
  return materials[key] ||= new THREE.MeshStandardMaterial({color,roughness:.78,...options});
}
function mesh(geometry, mat, x=0,y=0,z=0, parent=world) {
  const m = new THREE.Mesh(geometry,mat); m.position.set(x,y,z); parent.add(m); return m;
}
function box(w,h,d,mat,x,y,z,parent=world) {return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);}
function sphere(r,mat,x,y,z,parent=world,sx=1,sy=1,sz=1) {
  const m=mesh(new THREE.SphereGeometry(r,20,14),mat,x,y,z,parent);m.scale.set(sx,sy,sz);return m;
}
function glowTexture() {
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(.15,'#fff');g.addColorStop(.4,'#ffffff70');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
}
const glow=glowTexture();
function textSprite(lines, color='#fff4df', size=3.5, subtitle=false) {
  const c=document.createElement('canvas');c.width=2048;c.height=768;
  const x=c.getContext('2d');x.textAlign='center';x.textBaseline='middle';
  x.shadowColor='#382542';x.shadowBlur=12;x.fillStyle=color;
  x.font=`${subtitle?'italic ':''}130px Georgia`;
  lines.forEach((line,i)=>x.fillText(line,1024,384+(i-(lines.length-1)/2)*140,1900));
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false,fog:false}));
  sprite.userData.skyMessage=true;
  sprite.scale.set(size*2.666,size,1);world.add(sprite);return sprite;
}
function terrain() {
  const p=palette[stage];
  const geo=new THREE.PlaneGeometry(650,650,100,100);geo.rotateX(-Math.PI/2);
  const attr=geo.attributes.position;
  for(let i=0;i<attr.count;i++) {
    const x=attr.getX(i),z=attr.getZ(i);
    const edge=THREE.MathUtils.smoothstep(Math.abs(x),5,40);
    attr.setY(i,edge*(Math.sin(x*.035+z*.016)*2.7+Math.cos(z*.045)*2.5)-.15);
  }
  geo.computeVertexNormals();const ground=mesh(geo,material(p.ground));ground.receiveShadow=true;
  // An inlaid, luminous stone path leads all the way to the horizon.
  const pathMat=material(stage===3?0x354858:stage===1?0xe3bec7:0xc4bba2,{roughness:.62});
  box(3,.14,135,pathMat,0,-.03,-40).receiveShadow=true;
  for(let i=0;i<55;i++) {
    const z=28-i*2.4;
    box(3.05,.018,.035,material(0x8e8c7c),0,.05,z);
    for(const side of [-1,1]) {
      const m=box(.025,.025,1.1,material(0xffe5b3,{emissive:0xffb76c,emissiveIntensity:1.5}),side*1.47,.07,z);
    }
  }
  const waterGeo=new THREE.PlaneGeometry(300,220,35,35);waterGeo.rotateX(-Math.PI/2);
  water=mesh(waterGeo,material(p.water,{metalness:.72,roughness:.22,transparent:true,opacity:.85}),0,-.6,-160);
  // Distant ridgelines give the world a sense of scale.
  const mountainMat=material(stage===3?0x26374d:stage===1?0xb58caa:0x698880,{roughness:1});
  for(let i=0;i<35;i++) {
    const a=i/35*Math.PI*2,r=random(140,235),h=random(20,65);
    const mountainGeo=new THREE.ConeGeometry(random(25,55),h,24,9);
    const vertices=mountainGeo.attributes.position;
    for(let v=0;v<vertices.count;v++){const x=vertices.getX(v),y=vertices.getY(v),z=vertices.getZ(v);vertices.setY(v,y+Math.sin(x*.2+z*.17)*Math.cos(z*.12)*4);}
    mountainGeo.computeVertexNormals();
    const m=mesh(mountainGeo,mountainMat,Math.sin(a)*r,h/2-8,Math.cos(a)*r);
    m.scale.z=random(.7,1.5);
  }
}
function foliage() {
  const count=stage===3?1000:stage===2?16000:6500;
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,.035,0,0,-.025,.32,.025,.025,.32,.025,.055,.67,.08],3));
  geo.setIndex([0,1,2,1,3,2,2,3,4]);geo.computeVertexNormals();
  const mat=material(stage===1?0xd2a9ba:stage===3?0x30515b:0x547e48,{side:THREE.DoubleSide});
  const grass=new THREE.InstancedMesh(geo,mat,count);
  const dummy=new THREE.Object3D(),col=new THREE.Color();
  for(let i=0;i<count;i++) {
    const x=random(-90,90),z=random(-110,45);
    dummy.position.set(Math.abs(x)<2.1?x+(x<0?-2.4:2.4):x,-.05,z);
    dummy.rotation.set(random(-.2,.2),random(0,6.28),random(-.25,.25));
    const s=random(.5,1.7);dummy.scale.set(s,s,s);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
    col.setHSL(stage===1?random(.87,.94):random(.23,.34),stage===3?.2:.3,random(.23,.48));grass.setColorAt(i,col);
  }
  world.add(grass);
  if(stage===0||stage===2) trees();
  if(stage===1||stage===2) flowers(stage===2?1300:230);
}
function trees() {
  const trunk=material(0x4f4940),leafMat=material(stage===2?0x637b52:0x41665c);
  const trunkGeo=new THREE.CylinderGeometry(.15,.3,5,7),crownGeo=new THREE.IcosahedronGeometry(2,2);
  for(let i=0;i<48;i++) {
    const side=i%2?1:-1,x=side*random(12,85),z=random(-110,30),s=random(.8,2.5);
    const t=new THREE.Group();t.position.set(x,0,z);t.scale.setScalar(s);world.add(t);
    mesh(trunkGeo,trunk,0,2.3,0,t);
    const crown=mesh(crownGeo,leafMat,0,5.5,0,t);crown.scale.set(1.7,1.1,1.3);
    mesh(crownGeo,leafMat,-1,4.6,0,t).scale.setScalar(.9);
  }
}
function flowers(count) {
  const dummy=new THREE.Object3D();
  const petalGeo=new THREE.SphereGeometry(.14,6,4);petalGeo.scale(1,.35,1.8);
  const petals=new THREE.InstancedMesh(petalGeo,material(0xffe8e3,{roughness:.7}),count*5);
  const centers=new THREE.InstancedMesh(new THREE.SphereGeometry(.095,6,4),material(0xecc577),count);
  const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.018,.025,.75,4),material(0x4c7443),count);
  const col=new THREE.Color();
  for(let i=0;i<count;i++) {
    let x=random(-65,65),z=random(-100,35);if(Math.abs(x)<2.3)x+=(x<0?-3:3);
    const h=random(.5,1.15);dummy.position.set(x,h*.5-.1,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,h/.75,1);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
    dummy.position.set(x,h-.1,z);dummy.scale.setScalar(1);dummy.updateMatrix();centers.setMatrixAt(i,dummy.matrix);
    col.set(['#f9e2cf','#e6a9be','#e5d6ec','#faf3e0'][i%4]);
    for(let k=0;k<5;k++){const a=k*6.283/5;dummy.position.set(x+Math.sin(a)*.15,h-.1,z+Math.cos(a)*.15);dummy.rotation.set(0,a,random(-.1,.1));dummy.updateMatrix();petals.setMatrixAt(i*5+k,dummy.matrix);petals.setColorAt(i*5+k,col);}
  }
  world.add(petals,centers,stems);
}
function makeGate(z=-16) {
  const g=new THREE.Group();g.position.set(0,0,z);world.add(g);
  const stone=material(stage===3?0x526879:0xd5c6b4,{roughness:.65}),gold=material(0xc49e6e,{metalness:.72,roughness:.28});
  for(const side of [-1,1]) {
    box(.9,7.7,.85,stone,side*3.1,3.85,0,g).castShadow=true;
    box(1.3,.35,1.2,stone,side*3.1,.15,0,g);
    box(1.2,.2,1.1,gold,side*3.1,6.2,0,g);
  }
  const arch=mesh(new THREE.TorusGeometry(3.1,.43,10,48,Math.PI),stone,0,7.6,0,g);arch.castShadow=true;
  mesh(new THREE.TorusGeometry(3.1,.055,6,48,Math.PI),gold,0,7.6,.47,g);
  const frameMat=material(0xffdbad,{emissive:0xffbc88,emissiveIntensity:1.1});
  for(const side of [-1,1])box(.045,7.5,.06,frameMat,side*2.62,3.8,.5,g);
  const leafMat=material(stage===2?0x6b6e78:0x604e54,{roughness:.4,metalness:.2});
  const leaves=[];
  for(const side of [-1,1]) {
    const pivot=new THREE.Group();pivot.position.set(side*2.65,0,0);g.add(pivot);
    const center=-side*1.325;
    box(2.65,7.45,.22,leafMat,center,3.75,0,pivot).castShadow=true;
    box(2.15,5.8,.04,gold,center,3.8,.135,pivot);
    box(2.02,5.65,.06,leafMat,center,3.8,.17,pivot);
    const handle=mesh(new THREE.TorusGeometry(.16,.035,8,16),gold,-side*2.35,3,.28,pivot);
    box(.04,5.4,.05,gold,center,3.8,.22,pivot);
    leaves.push(pivot);
  }
  const glowMat=new THREE.MeshBasicMaterial({color:stage===2?0xa4c7fa:0xffdfc0});
  const opening=box(5.2,8.5,.04,glowMat,0,4.25,-.25,g);opening.visible=false;
  g.userData={leaves,opening,open:0};return g;
}
function lanterns() {
  const bronze=material(0x6c5e4a,{metalness:.55,roughness:.4});
  for(let i=0;i<12;i++)for(const side of [-1,1]) {
    const z=18-i*7,x=side*4;
    box(.34,.16,.34,bronze,x,.13,z);
    box(.045,.7,.045,bronze,x,.48,z);
    const flame=sphere(.15,material(0xffdeb0,{emissive:0xffad50,emissiveIntensity:2}),x,.9,z);flames.push(flame);
    if(i<4){const l=new THREE.PointLight(0xffbd80,5,6,2);l.position.set(x,1,z);world.add(l);}
  }
}
function bunny() {
  const g=new THREE.Group();world.add(g);g.position.set(1.2,0,-12);
  const fur=material(0xf5e9df),pink=material(0xdba8b3),black=material(0x3e3439);
  sphere(.62,fur,0,.75,0,g,.85,1.15,.8);
  sphere(.57,fur,0,1.55,.03,g,1,1,.88);
  for(const side of [-1,1]) {
    sphere(.18,fur,side*.25,2.25,0,g,.9,3.1,.65);
    sphere(.115,pink,side*.25,2.28,.105,g,.8,3,.4);
    sphere(.055,black,side*.2,1.62,.5,g);
    sphere(.085,pink,side*.33,1.44,.45,g,1,.6,.3);
    sphere(.22,fur,side*.39,.17,.22,g,1,.65,1.4);
    sphere(.18,fur,side*.5,.97,.25,g,.7,1.5,.8);
  }
  sphere(.06,pink,0,1.44,.55,g,1,.7,.6);
  sphere(.22,fur,.52,.6,-.34,g);
  sign(g,0,.9,.54,'NEXT →');return g;
}
function sign(parent,x,y,z,label) {
  const board=box(1.18,.46,.08,material(0xcda877),x,y,z,parent);
  const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#eedbb6';ctx.fillRect(0,0,512,192);ctx.fillStyle='#65513e';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='48px Georgia';ctx.fillText(label,256,96);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(1.13,.42),new THREE.MeshBasicMaterial({map:tex}),x,y,z+.045,parent);
}
function flowerGuide() {
  const g=new THREE.Group();g.position.set(1.2,0,-12);world.add(g);
  const stemMat=material(0x628248),cream=material(0xffedcc),gold=material(0xe3bd71),black=material(0x594535);
  mesh(new THREE.CylinderGeometry(.065,.09,1.8,8),stemMat,0,.9,0,g);
  const leaf=sphere(.3,stemMat,.25,.7,0,g,1.5,.35,.7);leaf.rotation.z=.5;
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;const p=sphere(.27,cream,Math.sin(a)*.47,2+Math.cos(a)*.47,0,g,.8,1.5,.5);p.rotation.z=-a;}
  sphere(.35,gold,0,2,.08,g,1,1,.4);
  for(const s of [-1,1])sphere(.035,black,s*.12,2.04,.225,g);
  const smile=mesh(new THREE.TorusGeometry(.075,.014,5,12,Math.PI),black,0,1.96,.23,g);smile.rotation.z=Math.PI;
  sign(g,0,1,.25,'NEXT →');return g;
}
function floatingHearts() {
  const shape=new THREE.Shape();shape.moveTo(0,.1);shape.bezierCurveTo(-.6,.8,-1,.1,0,-.65);shape.bezierCurveTo(1,.1,.6,.8,0,.1);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:2,steps:1,curveSegments:10});
  for(let i=0;i<18;i++) {
    const m=mesh(geo,material(0xdc9cb3,{metalness:.4,roughness:.3}),random(-24,24),random(5,18),random(-55,-5));
    m.scale.setScalar(random(.15,.6));floating.push({mesh:m,y:m.position.y,phase:random(0,6.28)});
  }
}
function toast(message) {
  $('activity-toast').textContent=message;$('activity-toast').hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('activity-toast').hidden=true,7000);
}
function activity(kind,label,object,data={}) {
  activities.push({kind,label,object,...data});return object;
}
function gardenBench(x,z) {
  const g=new THREE.Group();g.position.set(x,0,z);world.add(g);
  const wood=material(0x94745d),iron=material(0x445958,{metalness:.5});
  for(let i=0;i<4;i++)box(2,.09,.16,wood,0,.6,(i-1.5)*.19,g);
  for(let i=0;i<3;i++)box(2,.13,.08,wood,0,.95+i*.17,-.38,g);
  for(const s of [-1,1]){box(.09,.6,.65,iron,s*.78,.3,0,g);box(.08,1.3,.08,iron,s*.78,.65,-.4,g);}
}
function noteObjects() {
  for(let i=0;i<2;i++) {
    const id=stage*2+i;if(collected.has(id))continue;
    const g=new THREE.Group();g.position.set(i===0?0:(stage%2?-5:5),1.05,i===0?8:-2);world.add(g);
    const paper=material(0xffedd6,{roughness:.5}),rose=material(0xc47b98,{metalness:.3});
    box(.65,.43,.035,paper,0,0,0,g);
    const flap=mesh(new THREE.ConeGeometry(.21,.18,3),rose,0,.04,.03,g);flap.rotation.z=Math.PI;flap.scale.z=.12;
    sphere(.065,material(0xf0bcd2,{emissive:0xd67b9f,emissiveIntensity:1}),0,-.055,.06,g);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffd7ad,transparent:true,opacity:.28,depthWrite:false}));halo.scale.set(1.6,1.6,1);g.add(halo);
    floating.push({mesh:g,y:1.05,phase:i});activity('note','Read this love note ♡',g,{id});
  }
}
function wishingFountain() {
  const g=new THREE.Group();g.position.set(-6,0,-2);world.add(g);
  const stone=material(0xd3b7b5,{roughness:.45}),gold=material(0xc9a47c,{metalness:.7,roughness:.3});
  mesh(new THREE.CylinderGeometry(1.8,2,.35,40),stone,0,.16,0,g);
  mesh(new THREE.TorusGeometry(1.65,.18,8,40),gold,0,.5,0,g).rotation.x=Math.PI/2;
  mesh(new THREE.CylinderGeometry(1.52,1.52,.04,40),material(0xdbaac7,{metalness:.7,roughness:.15}),0,.45,0,g);
  mesh(new THREE.CylinderGeometry(.12,.2,1.1,12),stone,0,.9,0,g);
  mesh(new THREE.SphereGeometry(.28,16,12),gold,0,1.55,0,g);
  const points=[];for(let i=0;i<160;i++)points.push(0,0,0);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  fountainDrops=new THREE.Points(geo,new THREE.PointsMaterial({color:0xffecd9,size:.08,map:glow,transparent:true,opacity:.8,depthWrite:false}));g.add(fountainDrops);
  activity('wish','Make a wish ✧',g,{uses:0});
}
function chimes() {
  const g=new THREE.Group();g.position.set(5,0,1);world.add(g);
  const bronze=material(0xc8b18b,{metalness:.75,roughness:.25});
  box(.12,3.7,.12,material(0x716c5b),0,1.85,0,g);box(1.3,.1,.14,bronze,-.45,3.65,0,g);
  for(let i=0;i<5;i++)mesh(new THREE.CylinderGeometry(.045,.045,.6+i*.1,8),bronze,-.95+i*.24,2.8-i*.05,0,g);
  activity('chime','Ring the garden chimes ♪',g);
}
function butterflyTrail() {
  const colors=[0xe6b7d5,0xf3d49e,0xb5d1ec];
  for(let i=0;i<18;i++) {
    const g=new THREE.Group();g.position.set(random(-9,9),random(.8,2.7),random(-12,16));world.add(g);
    const mat=material(colors[i%3],{side:THREE.DoubleSide,roughness:.4,emissive:colors[i%3],emissiveIntensity:.15});
    const wings=[];
    for(const s of [-1,1]){const pivot=new THREE.Group();g.add(pivot);const w=mesh(new THREE.SphereGeometry(.13,7,5),mat,s*.12,0,0,pivot);w.scale.set(1,.12,1.5);wings.push(pivot);}
    butterflies.push({group:g,wings,base:g.position.clone(),phase:random(0,6.28)});
  }
}
function bloomGarden() {
  const g=new THREE.Group();g.position.set(-5,0,-2);world.add(g);
  const ring=mesh(new THREE.TorusGeometry(.65,.045,6,32),material(0xc7b87c,{emissive:0xb59a4a,emissiveIntensity:.5}),0,.12,0,g);ring.rotation.x=Math.PI/2;
  sphere(.19,material(0xeec4d7,{emissive:0xcc819f,emissiveIntensity:.6}),0,.55,0,g);
  activity('bloom','Wake up the flower garden ✿',g,{uses:0});
}
function lanternStand() {
  const g=new THREE.Group();g.position.set(5,0,-2);world.add(g);
  box(1.6,.1,.65,material(0x6b6872),0,.9,0,g);
  for(const s of [-1,1])box(.1,.9,.1,material(0x8a7c78),s*.65,.45,0,g);
  for(let i=0;i<3;i++)mesh(new THREE.CylinderGeometry(.15,.13,.35,8),material(0xffd0a0,{emissive:0xffb36c,emissiveIntensity:.8}),-.45+i*.45,1.13,0,g);
  activity('lantern','Release a sky lantern ✧',g,{uses:0});
  // Distant lanterns are already rising above the lake.
  for(let i=0;i<15;i++)spawnLantern(random(-30,30),random(8,25),random(-80,-25),false);
}
function spawnLantern(x,y,z,released=true) {
  const g=new THREE.Group();g.position.set(x,y,z);world.add(g);
  const shell=material(0xffd1a4,{emissive:0xffaa60,emissiveIntensity:1.2,transparent:true,opacity:.9});
  const paper=mesh(new THREE.CylinderGeometry(.22,.18,.5,8,1,true),shell,0,0,0,g);
  box(.32,.025,.32,material(0xe0aa74),0,-.26,0,g);
  const light=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffb266,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));light.scale.set(1.4,1.4,1);g.add(light);
  skyLanterns.push({group:g,startY:y,phase:random(0,6.28),released});
}
let audioContext;
function ringChimes() {
  try {
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();
    [523.25,659.25,783.99,1046.5].forEach((f,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=audioContext.currentTime+i*.17;osc.type='sine';osc.frequency.value=f;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.07,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+1.5);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+1.6);});
  } catch { /* The visual interaction still works when audio is unavailable. */ }
}
function useActivity() {
  const a=nearActivity;if(!a||busy||!$('journal').hidden)return;
  if(a.kind==='note') {
    collected.add(a.id);a.object.visible=false;toast(`Love note ${collected.size}/8: ${noteTexts[a.id]}`);updateJournal();
    if(collected.size===8)toast('All eight notes found. Every path in this world leads back to you, Shayal. ♡');
  } else if(a.kind==='wish') {
    if(a.uses>=3){toast('Three wishes for us, held safely by the fountain. ♡');return;}
    const wishes=['More sunsets together. More ordinary days made beautiful.','A thousand little adventures, with you beside me.','A lifetime of finding new reasons to love you.'];
    toast(`A wish for us: ${wishes[a.uses%3]}`);a.uses++;
    for(let i=0;i<5;i++){const m=sphere(.065,material(0xffd7ab,{emissive:0xffbc85,emissiveIntensity:1}),a.object.position.x+random(-1,1),random(1.5,3),a.object.position.z+random(-1,1));floating.push({mesh:m,y:m.position.y,phase:i});}
    if(a.uses>=3)a.label='Three wishes made ♡';
  } else if(a.kind==='chime') {ringChimes();toast('A little melody, just for you. ♪');}
  else if(a.kind==='bloom') {
    if(a.uses){toast('You made this little garden bloom. Just by being here.');return;}a.uses++;
    const x=a.object.position.x,z=a.object.position.z;
    for(let i=0;i<24;i++){const angle=i/24*Math.PI*2,r=1+(i%3)*.5,px=x+Math.sin(angle)*r,pz=z+Math.cos(angle)*r;mesh(new THREE.CylinderGeometry(.018,.025,.55,4),material(0x69874e),px,.25,pz);for(let j=0;j<5;j++){const p=j/5*Math.PI*2;sphere(.12,material(i%2?0xf0bdd4:0xffe6a5),px+Math.sin(p)*.13,.55,pz+Math.cos(p)*.13,world,1,.3,1);}sphere(.07,material(0xe2b361),px,.56,pz);}
    a.label='Your flowers are blooming ✿';toast('A whole circle of flowers, because you make everything bloom.');
  } else if(a.kind==='lantern') {
    if(a.uses>=6){toast('Six little wishes are already on their way to the stars. ♡');return;}
    spawnLantern(a.object.position.x,1.7,a.object.position.z);a.uses++;toast(`Lantern ${a.uses}/6 released. Somewhere, a star is keeping your wish.`);
  }
}
function updateJournal() {
  $('journal-open').textContent=`♡ ${collected.size} / 8`;
  $('journal-open').setAttribute('aria-label',`Love notes journal. ${collected.size} of 8 notes found.`);
  const list=$('journal-list');list.replaceChildren();
  for(let i=0;i<8;i++){const item=document.createElement('li');item.textContent=collected.has(i)?noteTexts[i]:`Note ${i+1} — waiting in ${['the entrance garden','the rosewater gardens','the flower meadow','the night world'][Math.floor(i/2)]}`;if(!collected.has(i))item.className='unfound';list.append(item);}
  [...$('travel-stage').options].forEach((option,i)=>option.disabled=i>maxUnlocked);
  $('travel-stage').value=String(stage);
}
function openJournal() {
  if(busy)return;
  auto=false;keys.clear();resetJoy();$('journal').hidden=false;
  for(const id of ['hud','welcome','ending'])$(id).inert=true;
  $('journal-close').focus();
}
function closeJournal() {
  $('journal').hidden=true;for(const id of ['hud','welcome','ending'])$(id).inert=false;$('journal-open').focus();
}
function extras() {
  noteObjects();gardenBench(-5,10);gardenBench(6,-9);
  if(stage===0)chimes();
  if(stage===1)wishingFountain();
  if(stage===1||stage===2)butterflyTrail();
  if(stage===2)bloomGarden();
  if(stage===3){lanternStand();const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(8,2,0)]);meteor=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xc9dfff,transparent:true,opacity:0}));meteor.position.set(50,50,-130);world.add(meteor);}
}
function atmosphere() {
  const n=stage===3?2100:260,positions=new Float32Array(n*3),colors=new Float32Array(n*3);
  for(let i=0;i<n;i++) {
    if(stage===3){const a=random(0,Math.PI*2),b=random(.08,1.45),r=220;positions[i*3]=Math.cos(a)*Math.cos(b)*r;positions[i*3+1]=Math.sin(b)*r;positions[i*3+2]=Math.sin(a)*Math.cos(b)*r;}
    else {positions[i*3]=random(-40,40);positions[i*3+1]=random(.5,18);positions[i*3+2]=random(-70,25);}
    colors.set([1,random(.7,1),random(.65,1)],i*3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3));
  particles=new THREE.Points(g,new THREE.PointsMaterial({size:stage===3?1.35:.14,map:glow,transparent:true,opacity:1,vertexColors:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:stage!==3,toneMapped:false}));world.add(particles);
  if(stage===3) {
    const moon=mesh(new THREE.SphereGeometry(8,28,20),new THREE.MeshBasicMaterial({color:0xffe6be}),-70,75,-180);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xb5cfff,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));halo.position.copy(moon.position);halo.scale.set(50,50,1);world.add(halo);
    for(let j=0;j<3;j++) {
      const geo=new THREE.PlaneGeometry(500,20,70,1),pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++)pos.setY(i,pos.getY(i)+Math.sin(pos.getX(i)*.02+j)*12);
      const aurora=mesh(geo,new THREE.MeshBasicMaterial({color:[0x669a9c,0x8174af,0x698aaf][j],transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false}),0,65+j*10,-190-j*10);aurora.rotation.x=-.2;
    }
  } else {
    const sun=mesh(new THREE.SphereGeometry(9,20,16),new THREE.MeshBasicMaterial({color:0xffe1b0}),-85,55,-200);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffd4a6,transparent:true,opacity:.5,depthWrite:false}));halo.position.copy(sun.position);halo.scale.set(70,70,1);world.add(halo);
    const c=document.createElement('canvas');c.width=512;c.height=192;const cx=c.getContext('2d');
    for(let i=0;i<24;i++){const x=random(90,420),y=random(75,120),r=random(35,75),gr=cx.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'#ffffff4a');gr.addColorStop(.5,'#ffffff24');gr.addColorStop(1,'#ffffff00');cx.fillStyle=gr;cx.fillRect(0,0,512,192);}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const cloudMat=new THREE.SpriteMaterial({map:tex,color:stage===1?0xffe1e6:0xfff4e4,transparent:true,opacity:.65,depthWrite:false});
    for(let i=0;i<16;i++){const s=new THREE.Sprite(cloudMat);s.position.set(random(-180,180),random(35,65),random(-220,-100));s.scale.set(random(40,80),random(15,25),1);world.add(s);}
  }
}
function clearWorld() {
  const geometries=new Set(),textures=new Set(),mats=new Set();
  world.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map&&m.map!==glow)textures.add(m.map);if(!Object.values(materials).includes(m))mats.add(m);}}});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());mats.forEach(m=>m.dispose());
  scene.remove(world);world=new THREE.Group();scene.add(world);floating=[];flames=[];bursts=[];water=null;guide=null;gate=null;activities=[];butterflies=[];skyLanterns=[];fountainDrops=null;meteor=null;nearActivity=null;
  lights.forEach(l=>scene.remove(l));lights=[];
}
function build(next) {
  clearWorld();stage=next;maxUnlocked=Math.max(maxUnlocked,next);updateJournal();
  const p=palette[stage];scene.background=new THREE.Color(p.sky);scene.fog=new THREE.FogExp2(p.fog,stage===3?.004:.006);
  const hemi=new THREE.HemisphereLight(stage===3?0xadc8ff:0xffe8d6,p.ground,stage===3?1.5:2.2);scene.add(hemi);lights.push(hemi);
  const sun=new THREE.DirectionalLight(p.sun,stage===3?1.8:3.8);sun.position.set(-35,45,25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-23;sun.shadow.camera.right=23;sun.shadow.camera.top=23;sun.shadow.camera.bottom=-23;sun.shadow.bias=-.001;scene.add(sun);lights.push(sun);
  terrain();foliage();lanterns();atmosphere();extras();
  $('activity-button').hidden=true;$('activity-toast').hidden=true;clearTimeout(toastTimer);$('subtitle').textContent='';$('subtitle').classList.remove('visible');
  camera.position.set(0,1.8,stage===0?18:17);yaw=0;pitch=0;auto=false;
  if(stage===0){gate=makeGate(-12);target.set(0,1.8,-8);}
  if(stage===1){guide=bunny();floatingHearts();gate=makeGate(-39);target.set(0,1.8,-9);const s=textSprite(['I have to tell you','something.'],'#fff5ef',7,true);s.position.set(0,10,-29);}
  if(stage===2){guide=flowerGuide();gate=makeGate(-39);target.set(0,1.8,-9);const s=textSprite(['You make me the happiest','person in the world.'],'#fff9e3',7,true);s.position.set(0,10,-29);}
  if(stage===3){target.set(0,1.8,-9);const s=textSprite(['I just want you','to know that…'],'#f8e9f3',18,true);s.position.set(0,22,-65);const pedestal=mesh(new THREE.CylinderGeometry(.65,.8,.45,32),material(0x687889,{metalness:.6}),0,.25,-13);const heart=sphere(.23,material(0xe3b6cf,{emissive:0xa56b95,emissiveIntensity:1.5}),0,1.25,-13);floating.push({mesh:heart,y:1.25,phase:0});}
  const names=['The threshold','The rosewater gardens','A thousand little happinesses','Where the stars listen'];
  const objectives=['Find the towering door. Your world is on the other side.','Follow the path. A little bunny has a secret.','Find the flower waiting in the meadow.','Walk to the glowing light. Ask me anything.'];
  const actions=['Open the door ↗','Next — follow the bunny →','Next — through the door →','what what what? ♡'];
  $('chapter-num').textContent=`0${stage+1} / 04`;$('chapter-name').textContent=names[stage];$('objective').textContent=objectives[stage];$('action').textContent=actions[stage];$('location').textContent=names[stage].toUpperCase();
}
async function tweenCamera(destination,duration=2600) {
  const start=camera.position.clone(),startYaw=yaw,startPitch=pitch,begin=performance.now();
  return new Promise(resolve=>{
    function frame(now){const t=Math.min(1,(now-begin)/duration),e=ease(t);camera.position.lerpVectors(start,destination,e);yaw=startYaw*(1-e);pitch=startPitch*(1-e);if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);
  });
}
async function openGate() {
  if(!gate)return;
  gate.userData.open=1;gate.userData.opening.visible=true;
  await tweenCamera(new THREE.Vector3(0,1.8,gate.position.z-4),gentle?100:3800);
}
async function action() {
  if(!started||busy||final)return;
  if(camera.position.distanceTo(target)>8){toast(stage===0?'Walk along the glowing path to the door.':stage===3?'Walk along the path toward the glowing light.':'Walk along the path to your little guide.');return;}
  busy=true;auto=false;
  if(stage===3){reveal();busy=false;return;}
  $('action').disabled=true;
  if(!gentle){if(stage===0)await openGate();else{await tweenCamera(new THREE.Vector3(0,1.8,-33),2900);await openGate();}}
  $('fade').classList.add('on');await sleep(gentle?80:650);
  build(stage+1);$('fade').classList.remove('on');$('action').disabled=false;busy=false;
  const lines=['','I have to tell you something.','You make me the happiest person in the world.','I just want you to know that…'];
  $('subtitle').textContent=lines[stage];$('subtitle').classList.add('visible');setTimeout(()=>$('subtitle').classList.remove('visible'),6500);
}
function reveal() {
  final=true;music.currentTime=85;music.volume=.65;
  music.play().then(()=>{$('sound').textContent='♫ Pause';$('sound').setAttribute('aria-pressed','true');}).catch(()=>{$('sound').textContent='♫ Play song';});
  $('sound').hidden=false;$('ending').hidden=false;$('hud').hidden=true;
  pitch=.16;fireworksUntil=elapsed+25;burstClock=0;
  world.traverse(o=>{if(o.userData.skyMessage)o.visible=false;});
  const s=textSprite(['I LOVE YOU SO MUCH','SHAYAL'],'#ffe2c1',25);s.position.set(0,28,-100);s.visible=false;s.userData.finalMessage=true;
}
function firework() {
  const n=110,positions=new Float32Array(n*3),velocities=[];
  const center=new THREE.Vector3(random(-30,30),random(16,40),random(-70,-35));
  for(let i=0;i<n;i++){positions.set(center.toArray(),i*3);const v=new THREE.Vector3(random(-1,1),random(-1,1),random(-1,1)).normalize().multiplyScalar(random(4,11));velocities.push(v);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const mat=new THREE.PointsMaterial({map:glow,size:.52,color:[0xffc6dd,0xffe1a0,0xbdd6ff,0xd2b9ff][Math.floor(random(0,4))],transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  const points=new THREE.Points(geo,mat);world.add(points);bursts.push({points,velocities,life:1});
}
function resetJoy(){joy={x:0,y:0};joyPointer=null;$('stick').style.transform='';}
function joystickMove(e) {
  const r=$('joystick').getBoundingClientRect(),max=r.width*.35;
  const dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),s=len>max?max/len:1;
  joy={x:dx*s/max,y:dy*s/max};$('stick').style.transform=`translate(${dx*s}px,${dy*s}px)`;auto=false;
}
$('joystick').addEventListener('pointerdown',e=>{joyPointer=e.pointerId;$('joystick').setPointerCapture(e.pointerId);joystickMove(e);});
$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)joystickMove(e);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(event,resetJoy);
canvas.addEventListener('pointerdown',e=>{if(!started||busy)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId||busy)return;yaw-=(e.clientX-pointer.x)*.003;pitch-= (e.clientY-pointer.y)*.0025;pitch=THREE.MathUtils.clamp(pitch,-.65,.65);pointer.x=e.clientX;pointer.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(pointer&&Math.hypot(e.clientX-pointer.ox,e.clientY-pointer.oy)<9&&!final){ray.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1),camera);const objects=guide?[guide]:gate?[gate]:[];if(ray.intersectObjects(objects,true).length)action();}pointer=null;});
canvas.addEventListener('pointercancel',()=>{pointer=null;});
addEventListener('keydown',e=>{if(!$('journal').hidden){if(e.key==='Escape'){closeJournal();e.preventDefault();}return;}if(['INPUT','SELECT'].includes(document.activeElement.tagName)||!$('instructions').hidden)return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','e'].includes(key))e.preventDefault();keys.add(key);if(key==='e'&&!e.repeat){if(nearActivity)useActivity();else action();}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{keys.clear();resetJoy();pointer=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();resetJoy();clock.getDelta();}});
$('start').addEventListener('click',()=>{started=true;$('welcome').hidden=true;$('hud').hidden=false;});
$('action').addEventListener('click',action);
$('activity-button').addEventListener('click',useActivity);
$('journal-open').addEventListener('click',openJournal);
$('journal-close').addEventListener('click',closeJournal);
$('journal-travel').addEventListener('click',async()=>{
  const next=Number($('travel-stage').value);if(busy||next>maxUnlocked)return;
  closeJournal();busy=true;$('fade').classList.add('on');await sleep(gentle?80:650);
  music.pause();$('sound').hidden=true;final=false;fireworksUntil=0;started=true;
  $('welcome').hidden=true;$('ending').hidden=true;$('hud').hidden=false;build(next);
  $('fade').classList.remove('on');busy=false;
});
$('journal').addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const items=[...$('journal').querySelectorAll('button,select')],first=items[0],last=items.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});

$('help').addEventListener('click',()=>{$('instructions').hidden=!$('instructions').hidden;keys.clear();resetJoy();auto=false;});
$('close-help').addEventListener('click',()=>{$('instructions').hidden=true;});
$('gentle').addEventListener('change',e=>{gentle=e.target.checked;});
reduceQuery.addEventListener('change',e=>{gentle=e.matches;$('gentle').checked=gentle;});
$('sound').addEventListener('click',()=>{if(music.paused)music.play().catch(()=>{$('sound').textContent='Tap to retry music';});else music.pause();});
music.addEventListener('play',()=>{$('sound').textContent='♫ Pause';$('sound').setAttribute('aria-pressed','true');});
music.addEventListener('pause',()=>{$('sound').textContent='♫ Play';$('sound').setAttribute('aria-pressed','false');});
$('replay').addEventListener('click',async()=>{if(busy)return;busy=true;$('fade').classList.add('on');await sleep(650);music.pause();music.currentTime=85;$('sound').hidden=true;final=false;collected.clear();maxUnlocked=0;$('ending').hidden=true;build(0);$('hud').hidden=false;fireworksUntil=0;busy=false;$('fade').classList.remove('on');});
$('explore').addEventListener('click',()=>{$('ending').hidden=true;$('hud').hidden=false;$('action').textContent='See your love letter ♡';$('objective').textContent='Stay a little. This whole sky is yours.';world.traverse(o=>{if(o.userData.finalMessage)o.visible=true;});});
$('action').addEventListener('click',()=>{if(final){$('ending').hidden=false;world.traverse(o=>{if(o.userData.finalMessage)o.visible=false;});}});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('error').hidden=false;});

build(0);
// The first composition looks down the walkway at the monumental portal.
camera.position.set(-.6,1.8,18);yaw=-.03;
window.worldReady=true;$('start').disabled=false;$('start').textContent='Enter your world ↗';
function animate() {
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.04);elapsed+=dt;
  if(document.hidden)return;
  if(started&&!busy&&$('instructions').hidden&&$('journal').hidden && (!final||$('ending').hidden)) {
    let x=joy.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    let z=joy.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
    if(x||z){const length=Math.max(1,Math.hypot(x,z));x/=length;z/=length;camera.position.x+=(x*Math.cos(yaw)+z*Math.sin(yaw))*dt*5;camera.position.z+=(-x*Math.sin(yaw)+z*Math.cos(yaw))*dt*5;}
    camera.position.x=THREE.MathUtils.clamp(camera.position.x,-38,38);camera.position.z=THREE.MathUtils.clamp(camera.position.z,stage===0?-8:stage===3?-27:-17,35);
    const edge=THREE.MathUtils.smoothstep(Math.abs(camera.position.x),5,40);
    const groundY=edge*(Math.sin(camera.position.x*.035+camera.position.z*.016)*2.7+Math.cos(camera.position.z*.045)*2.5);
    camera.position.y=1.8+groundY+(!gentle&&(x||z||auto)?Math.sin(elapsed*9)*.035:0);
  }
  if(!started&&!gentle){yaw=-.03+Math.sin(elapsed*.07)*.025;}
  camera.rotation.set(pitch,yaw,0);
  if(gate){const d=gate.userData;d.leaves[0].rotation.y=THREE.MathUtils.lerp(d.leaves[0].rotation.y,-d.open*1.65,dt*2);d.leaves[1].rotation.y=THREE.MathUtils.lerp(d.leaves[1].rotation.y,d.open*1.65,dt*2);}
  if(!gentle){for(const f of floating){f.mesh.position.y=f.y+Math.sin(elapsed*.8+f.phase)*.18;f.mesh.rotation.y=Math.sin(elapsed*.3+f.phase)*.25;}flames.forEach((m,i)=>m.scale.setScalar(1+Math.sin(elapsed*3+i)*.08));if(particles&&stage!==3)particles.rotation.y=Math.sin(elapsed*.05)*.05;}
  if(water&&!gentle){const p=water.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,Math.sin(p.getX(i)*.08+elapsed*.6)*.08+Math.cos(p.getZ(i)*.08+elapsed*.4)*.06);p.needsUpdate=true;}
  if(started&&!busy&&$('journal').hidden&&$('instructions').hidden&&(!final||$('ending').hidden)) {
    let nearest=null,distance=3.1;
    for(const a of activities){if(!a.object.visible)continue;const d=Math.hypot(camera.position.x-a.object.position.x,camera.position.z-a.object.position.z);if(d<distance){nearest=a;distance=d;}}
    nearActivity=nearest;$('activity-button').hidden=!nearest;if(nearest)$('activity-button').textContent=nearest.label;
  } else {$('activity-button').hidden=true;nearActivity=null;}
  if(fountainDrops){const p=fountainDrops.geometry.attributes.position;for(let i=0;i<p.count;i++){const t=gentle?(i/p.count):((elapsed*.45+i/p.count)%1),a=i*2.399;p.setXYZ(i,Math.cos(a)*t*1.4,1.6+Math.sin(t*Math.PI)*1.4-t*1.2,Math.sin(a)*t*1.4);}p.needsUpdate=true;}
  if(!gentle)for(const b of butterflies){b.group.position.set(b.base.x+Math.sin(elapsed*.5+b.phase)*.6,b.base.y+Math.sin(elapsed*1.3+b.phase)*.25,b.base.z+Math.cos(elapsed*.4+b.phase)*.5);b.group.rotation.y=elapsed*.2+b.phase;b.wings[0].rotation.z=Math.sin(elapsed*10+b.phase)*.65;b.wings[1].rotation.z=-Math.sin(elapsed*10+b.phase)*.65;}
  for(const l of skyLanterns){if(!gentle){l.group.position.y+=dt*(l.released?.65:.15);l.group.position.x+=Math.sin(elapsed*.3+l.phase)*dt*.1;}if(l.group.position.y>48)l.group.position.y=l.startY;}
  if(meteor){const cycle=elapsed%13;if(!gentle&&cycle<1.4){meteor.material.opacity=Math.sin(cycle/1.4*Math.PI);meteor.position.set(65-cycle*65,55-cycle*15,-125);}else meteor.material.opacity=0;}
  if(final&&elapsed<fireworksUntil&&!gentle){burstClock-=dt;if(burstClock<0){firework();burstClock=.65;}}
  for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.life-=dt*.34;const pos=b.points.geometry.attributes.position;for(let j=0;j<b.velocities.length;j++){const v=b.velocities[j];v.y-=dt*2.2;pos.setXYZ(j,pos.getX(j)+v.x*dt,pos.getY(j)+v.y*dt,pos.getZ(j)+v.z*dt);}pos.needsUpdate=true;b.points.material.opacity=Math.max(0,b.life);if(b.life<=0){world.remove(b.points);b.points.geometry.dispose();b.points.material.dispose();bursts.splice(i,1);}}
  renderer.render(scene,camera);
}
animate();


