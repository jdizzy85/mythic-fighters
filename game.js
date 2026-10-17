'use strict';
/* Mythic Fighters - game logic, scenes, input. */
const QS=new URLSearchParams(location.search);
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let scale=1,offx=0,offy=0,dpr=1;
function resize(){dpr=Math.min(window.devicePixelRatio||1,2);const w=innerWidth,h=innerHeight;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);scale=Math.min(w/W,h/H);offx=(w-W*scale)/2;offy=(h-H*scale)/2}
addEventListener('resize',resize);resize();

/* ---------- save ---------- */
const SAVE_KEY='mythicFightersV1';
let save={cleared:0,best:0,muted:false};
try{Object.assign(save,JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'))}catch(e){}
if(QS.get('cleared'))save.cleared=+QS.get('cleared');
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}}
SND.setMuted(!!save.muted);
const START=['dragon','minotaur','unicorn'];
const REWARD=['centaur','werewolf','kraken','griffin','phoenix','yeti','golem'];
function isUnlocked(i){const id=SPECIES[i].id;if(QS.get('unlock'))return true;if(START.includes(id))return true;const r=REWARD.indexOf(id);return r>=0&&save.cleared>=r+1}
function unlockLevel(i){return REWARD.indexOf(SPECIES[i].id)+1}
const LEVELS=[
 {arena:1,enemy:'centaur',diff:.12,name:'Whisperwood Welcome'},
 {arena:1,enemy:'werewolf',diff:.22,name:'Howl at the Moon'},
 {arena:4,enemy:'kraken',diff:.32,name:'Tides of Trouble'},
 {arena:2,enemy:'griffin',diff:.42,name:'Above the Clouds'},
 {arena:2,enemy:'minotaur',diff:.52,boss:1,name:'BOSS: The Labyrinth King',scale:1.3,hpm:1.8},
 {arena:3,enemy:'yeti',diff:.58,name:'Frozen Fury'},
 {arena:3,enemy:'golem',diff:.68,name:'Crystal Guardian'},
 {arena:0,enemy:'phoenix',diff:.78,name:'Rise From Ashes'},
 {arena:0,enemy:'unicorn',diff:.88,name:'Rainbow Rampage'},
 {arena:0,enemy:'dragon',diff:1,boss:1,name:'FINAL BOSS: The Elder Drake',scale:1.35,hpm:2.2}];

/* ---------- input ---------- */
const inp={held:{},press:{}};
const KEYMAP={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyW:'jump',ArrowUp:'jump',Space:'jump',KeyS:'shield',ArrowDown:'shield',ShiftLeft:'shield',ShiftRight:'shield',KeyL:'shield',KeyJ:'punch',KeyZ:'punch',KeyK:'kick',KeyX:'kick',KeyI:'special',KeyC:'special',KeyU:'dodge',KeyV:'dodge'};
function press(n){if(!inp.held[n])inp.press[n]=true;inp.held[n]=true}
function release(n){inp.held[n]=false}
let touchMode=!!QS.get('touch')||navigator.maxTouchPoints>0||('ontouchstart' in window);
const TB=[{n:'left',x:70,y:486,r:42},{n:'right',x:176,y:486,r:42},{n:'jump',x:123,y:408,r:38},
 {n:'punch',x:888,y:476,r:46,l:'PUNCH',c:'#ff7a3a'},{n:'kick',x:792,y:496,r:40,l:'KICK',c:'#ffc23a'},{n:'special',x:872,y:380,r:38,l:'NITRO',c:'#b66bff'},
 {n:'dodge',x:782,y:412,r:30,l:'DODGE',c:'#5ad0ff'},{n:'shield',x:700,y:496,r:34,l:'BLOCK',c:'#5aff9a'}];
const ptrs=new Map();
function lpos(e){return[(e.clientX-offx)/scale,(e.clientY-offy)/scale]}
function tbAt(x,y){let best=null,bd=1e9;for(const b of TB){const d=Math.hypot(x-b.x,y-b.y);if(d<b.r+12&&d<bd){bd=d;best=b}}return best}
cv.addEventListener('pointerdown',e=>{
  e.preventDefault();SND.resume();SND.startPending();
  if(e.pointerType==='touch')touchMode=true;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const[x,y]=lpos(e);
  if(scene===S.fight&&!G.paused&&G.state!=='end'){
    if(Math.hypot(x-480,y-58)<26){pauseGame();return}
    if(touchMode){const b=tbAt(x,y);if(b){ptrs.set(e.pointerId,b.n);press(b.n);return}}
    return;
  }
  uiClick(curUI(),x,y);
});
cv.addEventListener('pointermove',e=>{
  const[x,y]=lpos(e);
  if(ptrs.has(e.pointerId)){const old=ptrs.get(e.pointerId);if(old==='left'||old==='right'){const b=tbAt(x,y);if(b&&(b.n==='left'||b.n==='right')&&b.n!==old){release(old);press(b.n);ptrs.set(e.pointerId,b.n)}}return}
  if(e.pointerType!=='touch')uiHover(curUI(),x,y);
});
function up(e){if(ptrs.has(e.pointerId)){release(ptrs.get(e.pointerId));ptrs.delete(e.pointerId)}}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
addEventListener('blur',()=>{for(const k in inp.held)inp.held[k]=false;ptrs.clear()});
document.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{
  SND.resume();SND.startPending();
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(scene===S.fight&&!G.paused&&G.state!=='end'){
    if(e.code==='KeyP'||e.code==='Escape'){pauseGame();return}
    const n=KEYMAP[e.code];if(n&&!e.repeat)press(n);else if(n)inp.held[n]=true;return;
  }
  uiKey(curUI(),e.code);
});
addEventListener('keyup',e=>{const n=KEYMAP[e.code];if(n)release(n)});

/* ---------- UI helpers ---------- */
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
const FONT='"Trebuchet MS","Arial Rounded MT Bold",Verdana,sans-serif';
function txt(c,s,x,y,size,col,al,stroke,w){c.font=`900 ${size}px ${FONT}`;c.textAlign=al||'center';c.textBaseline='middle';
  if(stroke){c.lineJoin='round';c.strokeStyle=stroke;c.lineWidth=w||size/5;c.strokeText(s,x,y)}c.fillStyle=col||'#fff';c.fillText(s,x,y)}
function wrapText(c,s,x,y,mw,lh,size,col){c.font=`700 ${size}px ${FONT}`;c.textAlign='left';c.textBaseline='top';c.fillStyle=col;let line='';
  for(const w of s.split(' ')){const t=line?line+' '+w:w;if(c.measureText(t).width>mw&&line){c.fillText(line,x,y);y+=lh;line=w}else line=t}c.fillText(line,x,y)}
function uiBtn(c,b,focus,t){
  if(b.draw){b.draw(c,b,focus,t);return}
  const dis=b.disabled,pulse=focus?Math.sin(t*8)*.5+.5:0;
  c.save();
  if(focus){glow(c,b.x+b.w/2,b.y+b.h/2,b.w*.7,'#ffd24a',.35+pulse*.2)}
  rr(c,b.x,b.y+4,b.w,b.h,14);c.fillStyle='rgba(0,0,0,.45)';c.fill();
  rr(c,b.x,b.y,b.w,b.h,14);c.fillStyle=dis?grad(c,0,b.y,0,b.y+b.h,['#555','#333']):focus?grad(c,0,b.y,0,b.y+b.h,['#ffe27a','#ff9a2a']):grad(c,0,b.y,0,b.y+b.h,['#7a5cff','#3a2a9a']);c.fill();
  c.lineWidth=3;c.strokeStyle=focus?'#fff':'rgba(255,255,255,.5)';c.stroke();
  txt(c,b.label,b.x+b.w/2,b.y+b.h/2+1,b.size||24,focus?'#4a1a00':'#fff');
  c.restore();
}
const hit=(b,x,y)=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;
function uiDrawBtns(c,u,t){u.btns.forEach((b,i)=>{if(!b.hidden)uiBtn(c,b,u.focus===i,t)})}
function uiClick(u,x,y){if(!u)return;
  for(let i=0;i<u.btns.length;i++){const b=u.btns[i];if(b.hidden||b.disabled&&!b.clickLocked)continue;if(hit(b,x,y)){
    if(u.focus===i||!b.twoTap){u.focus=i;SND.play('click');b.fn&&b.fn()}else{u.focus=i;SND.play('click')}return}}}
function uiHover(u,x,y){if(!u)return;for(let i=0;i<u.btns.length;i++)if(!u.btns[i].hidden&&hit(u.btns[i],x,y)){u.focus=i;return}}
function uiKey(u,code){if(!u)return;const n=u.btns.length,cols=u.cols||1;
  const mv=d=>{let i=u.focus;for(let k=0;k<n;k++){i=(i+d+n)%n;if(!u.btns[i].hidden)break}u.focus=i;SND.play('click')};
  if(code==='ArrowDown'||code==='KeyS')mv(cols);else if(code==='ArrowUp'||code==='KeyW')mv(-cols);
  else if(code==='ArrowRight'||code==='KeyD')mv(1);else if(code==='ArrowLeft'||code==='KeyA')mv(-1);
  else if(code==='Enter'||code==='Space'||code==='KeyJ'){const b=u.btns[u.focus];if(b&&!b.disabled||b&&b.clickLocked){SND.play('click');b.fn&&b.fn()}}
  else if((code==='Escape'||code==='Backspace')&&u.back){SND.play('back');u.back()}}
function vmenu(labels,y0,gap){return labels.map((l,i)=>({x:330,y:y0+i*(gap||62),w:300,h:52,label:l[0],fn:l[1]}))}

/* ---------- Fighters ---------- */
const EDGES=['jump','punch','kick','special','dodge'];
const ATK={punch:{dur:.3,hs:.07,he:.18,dmg:5,range:82,kb:190,up:0,stun:.28,en:7},kick:{dur:.46,hs:.14,he:.27,dmg:8.5,range:98,kb:330,up:140,stun:.4,en:9}};
const SPDUR={proj:.65,dash:.7,slam:.85,flurry:.95};
function mkF(idx,x,face,o){o=o||{};const sp=SPECIES[idx],maxhp=100*sp.hp*(o.hpm||1);
  return{idx,sp,x,y:groundY(x),vx:0,vy:0,face,hp:maxhp,maxhp,chip:maxhp,en:o.en==null?25:o.en,combo:0,comboT:0,maxCombo:0,atk:null,stun:0,dodgeT:0,dodgeCd:0,shield:false,sh:100,ko:false,rot:0,rotV:0,t:Math.random()*5,
    sc:sp.sc*(o.scale||1),in:{},buf:{},ai:o.ai||null,pose:newPose(),flash:0,onGround:true,boss:!!o.boss,player:!!o.player,lock:0,dmgM:o.dmgM||1,hitsTaken:0,rdy:false}}
let G=null;
function inRange(f,foe,R){const dx=(foe.x-f.x)*f.face;return dx>-12&&dx<R*f.sc+24*foe.sc&&Math.abs(foe.y-f.y)<100*Math.max(f.sc,foe.sc)}
function pop(x,y,text,col,size){G.pops.push({x,y,t:0,text,col:col||'#fff',size:size||22})}
function healF(f,n){f.hp=Math.min(f.maxhp,f.hp+n);f.chip=Math.max(f.chip,f.hp);SND.play('heal');for(let i=0;i<14;i++)spawnP(f.x+rnd(-30,30),f.y-rnd(0,120),0,-rnd(40,120),.8,5,'#7aff9a','star');pop(f.x,f.y-150*f.sc,'+'+Math.round(n),'#7aff9a')}
function startAtk(f,type){
  if(type==='special'){if(f.en<50)return false;f.en-=50;const d=f.sp.sp;f.atk={type:'special',kind:d.type,dur:SPDUR[d.type],t:0,hit:false,fired:false,n:0,range:d.type==='dash'?70:100,hs:0,he:0};SND.play('special');
    for(let i=0;i<20;i++)spawnP(f.x+rnd(-40,40),f.y-rnd(0,140),0,-rnd(50,200),.7,6,d.col,'glow')}
  else{const d=ATK[type];f.atk=Object.assign({type,t:0,hit:false,kind:type},d);SND.play('swing');f.vx=f.face*(type==='punch'?110:70)}
  return true}
function takeHit(att,def,o){
  if(def.ko||G.state==='end')return false;
  if(def.dodgeT>0){if(!o.dodgeNoted){pop(def.x,def.y-140*def.sc,'DODGE!','#5ad0ff',20);o.dodgeNoted=1}return false}
  let dmg=o.dmg*att.dmgM*(1+.06*Math.min(att.combo,8));
  const hx=def.x-att.face*8*def.sc+ (att.x-def.x)*.0,hy=def.y-80*def.sc;
  const facing=(att.x-def.x)*def.face>0;
  if(def.shield&&facing&&def.onGround){
    def.sh-=dmg*2.2;def.vx=att.face*Math.min(o.kb,220)*.5;att.vx-=att.face*(o.proj?0:120);
    SND.play('block');burst(hx+def.face*30,hy,10,'#bfe9ff',200,5,'star');ring(hx+def.face*30,hy,'#9ad8ff',40);G.shake=Math.max(G.shake,3);G.hitstop=.04;
    def.hp-=dmg*.08;def.chip=Math.max(def.chip,def.hp);def.en=Math.min(100,def.en+3);
    if(def.sh<=0){def.sh=45;def.stun=1;def.shield=false;pop(def.x,def.y-150*def.sc,'GUARD BREAK!','#ffd24a',22);SND.play('heavy');G.shake=8}
    if(def.hp<=0)koF(att,def,o);
    return false}
  def.hp-=dmg;def.hitsTaken++;def.flash=.18;def.atk=null;def.shield=false;
  att.combo++;att.comboT=1.5;att.maxCombo=Math.max(att.maxCombo,att.combo);
  att.en=Math.min(100,att.en+(o.en||6));def.en=Math.min(100,def.en+5);
  def.vx=att.face*o.kb;def.stun=Math.max(def.stun,o.stun||.3);
  if(o.up){def.vy=-o.up*3.2;def.onGround=false;def.y-=2}
  const heavy=!!o.heavy||dmg>=14;
  G.hitstop=heavy?.11:.06;G.shake=Math.max(G.shake,heavy?13:6);
  SND.play(heavy?'heavy':'hit');
  const col=att.sp.glow;burst(hx,hy,heavy?18:10,col,heavy?420:300,heavy?9:6,'star');burst(hx,hy,8,'#fff',240,4,'glow');ring(hx,hy,col,heavy?70:46);
  pop(def.x+rnd(-14,14),def.y-130*def.sc,Math.round(dmg),'#fff',heavy?30:22);
  if(att.combo>=2){SND.play('combo');if(att.combo>=3)pop(att.x+att.face*30,att.y-170*att.sc,att.combo+' HIT COMBO!','#ffd24a',26)}
  if(def.hp<=0)koF(att,def,o);
  return true}
function koF(att,def,o){def.hp=0;def.ko=true;def.atk=null;def.shield=false;def.vx=att.face*((o.kb||200)+330);def.vy=-560;def.onGround=false;def.rotV=att.face*8;
  G.slow=1.3;G.shake=20;G.flashW=.35;SND.play('ko');burst(def.x,def.y-70,40,att.sp.glow,600,10,'star');ring(def.x,def.y-70,'#fff',140);ring(def.x,def.y-70,att.sp.glow,200);
  if(G.state==='fight'){G.state='ko';G.stateT=0}}
function shootProj(f,p){G.projs.push(Object.assign({owner:f,t:0,life:3,rot:0},p))}
function updateAtk(f,foe,dt){
  const a=f.atk;a.t+=dt;const S=f.sp.sp,pw=f.sp.pow;
  if(a.type!=='special'){
    if(!a.hit&&a.t>=a.hs&&a.t<=a.he&&inRange(f,foe,a.range)){a.hit=true;takeHit(f,foe,{dmg:a.dmg*pw,kb:a.kb,up:a.up,stun:a.stun,en:a.en,heavy:a.type==='kick'})}
    f.vx*=Math.pow(.01,dt)
  }else if(a.kind==='proj'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.3){a.fired=true;const n=S.n||1;SND.play(S.kind==='fire'?'fire':'special');G.shake=Math.max(G.shake,4);
      for(let i=0;i<n;i++)shootProj(f,{x:f.x+f.face*50*f.sc,y:f.y-(S.kind==='rock'?55:92)*f.sc+(i-(n-1)/2)*30,vx:f.face*S.speed,vy:0,dmg:S.dmg*pw,r:S.r,col:S.col,kind:S.kind,ground:false});
      if(S.heal)healF(f,S.heal);burst(f.x+f.face*50,f.y-90*f.sc,14,S.col,300,6,'glow')}
  }else if(a.kind==='dash'){
    if(a.t>.12&&a.t<.55){f.vx=f.face*S.speed;if(Math.random()<.8)spawnP(f.x-f.face*30,f.y-rnd(10,100),-f.face*60,rnd(-40,40),.5,rnd(6,12),S.col,S.kind==='dust'?'dust':'glow');
      if(!a.hit&&inRange(f,foe,70)){a.hit=true;takeHit(f,foe,{dmg:S.dmg*pw,kb:480,up:160,stun:.6,en:12,heavy:true});if(S.heal)healF(f,S.heal);f.vx*=.3}}
    else if(a.t>=.55)f.vx*=.8
  }else if(a.kind==='slam'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.35){a.fired=true;SND.play('shock');G.shake=Math.max(G.shake,14);G.flashW=.12;ring(f.x,f.y,S.col,120);ring(f.x,f.y,'#fff',80);burst(f.x,f.y-10,30,S.col,450,8,'star',500);
      for(const d of[-1,1])shootProj(f,{x:f.x+d*40,y:groundY(f.x+d*40),vx:d*420,vy:0,dmg:S.dmg*pw*.8,r:30,col:S.col,kind:S.kind,ground:true,life:1.6});
      if(foe.onGround&&Math.abs(foe.x-f.x)<120*f.sc)takeHit(f,foe,{dmg:S.dmg*pw,kb:420,up:220,stun:.7,en:12,heavy:true})}
  }else if(a.kind==='flurry'){
    const last=S.hits;
    while(a.n<last&&a.t>=.2+.15*a.n){a.n++;f.vx=f.face*170;SND.play('punch');const fin=a.n===last;
      for(let i=0;i<8;i++)spawnP(f.x+f.face*(50+i*6),f.y-rnd(50,110),f.face*200,rnd(-80,80),.3,5,S.col,'star');
      if(inRange(f,foe,100)){takeHit(f,foe,{dmg:S.dmg*pw*(fin?1.8:1),kb:fin?420:60,up:fin?150:0,stun:.32,en:3,heavy:fin})}}
  }
  if(a.t>=a.dur)f.atk=null}
function updF(f,foe,dt){
  f.t+=dt;if(f.flash>0)f.flash-=dt;f.comboT-=dt;if(f.comboT<=0)f.combo=0;f.dodgeCd-=dt;
  for(const k of EDGES){if(f.buf[k]>0)f.buf[k]-=dt;if(f.in[k]){f.buf[k]=.2;f.in[k]=false}}
  const was=f.en;f.en=Math.min(100,f.en+dt*1.6);if(f.player&&was<50&&f.en>=50)SND.play('ready');
  f.chip=Math.max(f.hp,f.chip-dt*28);
  if(f.ko){
    f.vy+=2300*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
    if(f.rotV){f.rot+=f.rotV*dt;if(Math.abs(f.rot)>1.45){f.rot=Math.sign(f.rotV)*1.5;f.rotV=0}}
    const g=groundY(f.x);if(f.y>=g){f.y=g;if(f.vy>250){f.vy=-f.vy*.3;G.shake=Math.max(G.shake,6);burst(f.x,f.y,10,'#ddd',200,5,'dust')}else f.vy=0;f.vx*=Math.pow(.05,dt);f.onGround=true}
    f.x=clamp(f.x,30,W-30);updatePose(f,dt);return}
  const i=f.in,sp=f.sp,locked=f.lock>0;if(locked)f.lock-=dt;
  if(f.stun>0){f.stun-=dt;f.shield=false;f.vx*=Math.pow(.04,dt)}
  else if(f.atk){updateAtk(f,foe,dt)}
  else if(!locked){
    f.shield=!!(i.sh&&f.onGround&&f.sh>0&&f.dodgeT<=0);
    if(f.dodgeT>0)f.dodgeT-=dt;
    else{
      const dir=(i.r?1:0)-(i.l?1:0),spd=235*sp.spd*(f.shield?.18:1);
      const acc=f.onGround?18:6;f.vx+=(dir*spd-f.vx)*Math.min(1,acc*dt);
      if(f.buf.jump>0&&f.onGround&&!f.shield){f.buf.jump=0;f.vy=-800*(.88+.12*sp.jmp)*(f.sc>1.2?.95:1);f.onGround=false;SND.play('jump');burst(f.x,f.y,6,'#ddd',120,5,'dust')}
      if(f.buf.dodge>0&&f.dodgeCd<=0&&f.onGround){f.buf.dodge=0;f.dodgeT=.3;f.dodgeCd=.85;f.vx=(dir||-f.face)*560;SND.play('dodge');burst(f.x,f.y-60,8,sp.glow,160,6,'glow')}
      else if(f.buf.punch>0){f.buf.punch=0;startAtk(f,'punch')}
      else if(f.buf.kick>0){f.buf.kick=0;startAtk(f,'kick')}
      else if(f.buf.special>0){f.buf.special=0;startAtk(f,'special')}
    }
  }else f.vx*=.8;
  if(!f.shield&&f.sh<100)f.sh=Math.min(100,f.sh+25*dt);
  if(f.onGround&&!f.atk&&f.stun<=0&&f.dodgeT<=0&&Math.abs(foe.x-f.x)>6)f.face=foe.x>f.x?1:-1;
  // physics
  f.vy+=2300*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
  if(f.x<40){f.x=40;f.vx=Math.max(0,f.vx)}if(f.x>W-40){f.x=W-40;f.vx=Math.min(0,f.vx)}
  const g=groundY(f.x);
  if(f.y>=g){if(!f.onGround&&f.vy>250){SND.play('land');burst(f.x,g,6,'#ddd',130,5,'dust')}f.y=g;f.vy=0;f.onGround=true}
  else if(f.onGround&&f.vy>=0&&g-f.y<20)f.y=g;else f.onGround=false;
  // soft body separation
  if(!foe.ko&&f.onGround&&foe.onGround){const d=foe.x-f.x,m=34*(f.sc+foe.sc)/2;if(Math.abs(d)<m){const push=(m-Math.abs(d))*.5*Math.sign(d||f.face);f.x-=push*.5;foe.x+=push*.5}}
  updatePose(f,dt);
}

/* ---------- AI ---------- */
function mkAI(diff,boss){return{diff,boss,t:rnd(.3,.8),shT:0}}
function aiThink(f,foe,dt){
  const a=f.ai,i=f.in;let diff=a.diff;if(a.boss&&f.hp<f.maxhp*.5)diff=Math.min(1.1,diff+.15);
  if(a.shT>0){a.shT-=dt;i.sh=true}else i.sh=false;
  if(foe.ko||f.ko||G.state!=='fight'){i.l=i.r=false;return}
  a.t-=dt;if(a.t>0)return;a.t=rnd(.07,.2)*(1.35-diff*.7);
  const dx=foe.x-f.x,d=Math.abs(dx),S=f.sp.sp,tw=dx>0?'r':'l',aw=dx>0?'l':'r';
  i.l=i.r=false;
  if(f.stun>0||f.atk)return;
  if(foe.atk&&d<150&&Math.random()<.18+diff*.5){const r=Math.random();
    if(r<.55)a.shT=rnd(.35,.7);else if(r<.8&&f.dodgeCd<=0)i.dodge=true;else i.jump=true;return}
  if(f.en>=50&&Math.random()<.2+diff*.35){
    const ok=S.type==='proj'?d>180:S.type==='dash'?(d>150&&d<430):S.type==='slam'?d<150:d<110;
    if(ok){i.special=true;return}}
  if(f.boss&&Math.random()<.04)i.jump=true;
  if(d>88+rnd(-8,14)){i[tw]=true;if(Math.random()<.05)i.jump=true;if(Math.random()<.05&&f.dodgeCd<=0&&d>200)i.dodge=true}
  else{const r=Math.random(),ag=.45+.4*diff;
    if(r<ag*.6)i.punch=true;else if(r<ag)i.kick=true;else if(r<ag+.12)i[aw]=true;else if(r<ag+.2)a.shT=rnd(.3,.6)}
}

/* ---------- Fight ---------- */
function pauseGame(){G.paused=true;pauseUI.focus=0;SND.play('back')}
function startFight(cfg){
  G={cfg,mode:cfg.mode,projs:[],pops:[],shake:0,hitstop:0,slow:0,t:0,state:'intro',stateT:0,paused:false,round:1,wins:[0,0],wave:1,score:0,flashW:0,time:0,start:performance.now(),carry:null,banner:''};
  setArena(cfg.arena);
  initRound();go(S.fight);
  SND.music(cfg.boss?'boss':'battle');
}
function enemyFor(cfg){
  if(cfg.mode==='story'){const L=LEVELS[cfg.level];return{idx:SPI[L.enemy],scale:L.scale,hpm:L.hpm||1+L.diff*.3,diff:L.diff,boss:L.boss,dmgM:L.boss?1.05:.75+.35*L.diff}}
  if(cfg.mode==='survival'){const w=G.wave,d=Math.min(1,.1+w*.075);let idx=(Math.random()*SPECIES.length)|0;if(idx===cfg.hero)idx=(idx+1)%SPECIES.length;
    const boss=w%5===0;return{idx,scale:boss?1.25:1,hpm:1+w*.06+(boss?.7:0),diff:d,boss,dmgM:.7+.4*d}}
  return{idx:cfg.enemy,hpm:1,diff:cfg.diff,dmgM:.75+.35*cfg.diff}
}
function spawnEnemy(side){const o=enemyFor(G.cfg);const e=mkF(o.idx,side>0?790:170,side>0?-1:1,{scale:o.scale,hpm:o.hpm,boss:o.boss,dmgM:o.dmgM,ai:mkAI(o.diff,o.boss),en:20});e.lock=1.4;e.ename=o.boss&&G.cfg.mode==='story'?LEVELS[G.cfg.level].name.replace(/^.*?: /,''):SPECIES[o.idx].name;return e}
function initRound(){
  const cfg=G.cfg;
  G.p=mkF(cfg.hero,170,1,{player:true,en:25});G.p.lock=1.4;
  G.e=spawnEnemy(1);G.projs=[];G.state='intro';G.stateT=0;G.slow=0;
  if(cfg.mode==='survival'&&G.carry){G.p.hp=G.carry.hp;G.p.en=G.carry.en}
  G.banner=cfg.mode==='duel'?'ROUND '+G.round:cfg.mode==='story'?'LEVEL '+(cfg.level+1):'WAVE '+G.wave;
  SND.play('fight');
}
function updateProj(dt){
  for(let i=G.projs.length-1;i>=0;i--){
    const p=G.projs[i],foe=p.owner===G.p?G.e:G.p;p.t+=dt;p.x+=p.vx*dt;p.rot+=dt*8;
    if(p.ground)p.y=groundY(p.x)-6;
    // trails
    if(p.kind==='fire')spawnP(p.x,p.y+rnd(-10,10),-p.vx*.1,rnd(-60,20),.4,p.r*rnd(.3,.6),Math.random()<.5?'#ff9a2a':'#ff4a1a','glow');
    else if(p.kind==='rainbow')spawnP(p.x,p.y+rnd(-8,8),0,0,.5,9,['#ff7ab8','#ffb347','#ffe45a','#7aff9a','#6fc8ff','#b58cff'][(p.t*30|0)%6],'glow');
    else if(p.kind==='arrow')spawnP(p.x,p.y,0,0,.25,3,'#fff6b0','glow');
    else if(p.kind==='rock')spawnP(p.x,p.y+rnd(-14,14),0,rnd(-20,40),.4,5,'#5ff0ff','glow');
    else if(Math.random()<.5)spawnP(p.x,p.y-rnd(0,30),0,-rnd(20,80),.4,rnd(3,7),p.col,'glow');
    if(p.t>p.life||p.x<-60||p.x>W+60){G.projs.splice(i,1);continue}
    if(foe.ko)continue;
    const near=Math.abs(p.x-foe.x)<p.r+26*foe.sc;
    const vert=p.ground?foe.y>=groundY(foe.x)-34:(p.y>foe.y-135*foe.sc-p.r*.5&&p.y<foe.y+p.r*.5);
    if(near&&vert){
      const dir=Math.sign(p.vx);const att=p.owner;const sv=att.face;att.face=dir;
      const r=takeHit(att,foe,{dmg:p.dmg,kb:380,up:p.ground?200:120,stun:.5,en:8,heavy:true,proj:true});att.face=sv;
      if(r||foe.shield||foe.dodgeT<=0){burst(p.x,p.y,16,p.col,350,7,'star');ring(p.x,p.y,p.col,60);G.projs.splice(i,1)}
    }
  }
}
function updateFight(dt){
  if(G.paused)return;
  G.flashW=Math.max(0,G.flashW-dt);
  if(G.hitstop>0){G.hitstop-=dt;return}
  let sdt=dt;if(G.slow>0){G.slow-=dt;sdt=dt*.3}
  G.shake=Math.max(0,G.shake-dt*40);G.t+=sdt;G.stateT+=dt;
  const p=G.p,e=G.e;
  // player input
  p.in.l=inp.held.left;p.in.r=inp.held.right;p.in.sh=inp.held.shield;
  for(const k of EDGES)if(inp.press[k])p.in[k]=true;
  inp.press={};
  if(G.state==='intro'){if(G.stateT>1.5){G.state='fight';G.stateT=0}}
  if(G.state==='fight'||G.state==='ko'||G.state==='intro'){
    if(e.ai&&G.state!=='intro')aiThink(e,p,sdt);
    updF(p,e,sdt);updF(e,p,sdt);updateProj(sdt);
  }
  updateParts(sdt);
  for(let i=G.pops.length-1;i>=0;i--){const q=G.pops[i];q.t+=sdt;if(q.t>1.1)G.pops.splice(i,1)}
  if(G.state==='fight')G.time+=dt;
  if(G.state==='ko'&&G.stateT>2.3)resolveRound();
}
function resolveRound(){
  const cfg=G.cfg,pw=!G.p.ko;
  if(cfg.mode==='story'){endFight(pw)}
  else if(cfg.mode==='duel'){
    G.wins[pw?0:1]++;
    if(G.wins[0]>=2||G.wins[1]>=2)endFight(G.wins[0]>=2);
    else{G.round++;initRound()}}
  else{
    if(pw){G.score+=100*G.wave+Math.round(G.p.hp);G.wave++;G.carry={hp:Math.min(G.p.maxhp,G.p.hp+G.p.maxhp*.25),en:Math.min(100,G.p.en+30)};
      G.e=spawnEnemy(G.p.x<480?1:-1);G.e.lock=1.2;G.p.hp=G.carry.hp;G.p.chip=G.p.hp;G.p.en=G.carry.en;G.p.ko=false;G.state='intro';G.stateT=0;G.banner='WAVE '+G.wave;G.projs=[];SND.play('fight');
      pop(G.p.x,G.p.y-150,'+25% HEALTH','#7aff9a',24)}
    else endFight(false)}
}
function endFight(win){
  const cfg=G.cfg;G.state='end';
  const r={win,mode:cfg.mode,time:G.time,combo:Math.max(G.p.maxCombo,0),hp:Math.round(G.p.hp),cfg,newUnlock:null,wave:G.wave,score:G.score};
  if(cfg.mode==='story'&&win){const L=cfg.level;if(save.cleared<L+1){save.cleared=L+1;const rid=REWARD[L];if(rid)r.newUnlock=SPI[rid];persist()}}
  if(cfg.mode==='survival'){r.waveReached=G.wave-(0);if(G.wave>save.best){save.best=G.wave;r.record=true;persist()}}
  SND.play(win||cfg.mode==='survival'&&G.wave>1?'win':'lose');if(r.newUnlock!=null)setTimeout(()=>SND.play('unlock'),900);
  showResult(r);
}

/* ---------- HUD & fight draw ---------- */
function drawBar(c,x,y,w,h,f,col,flip,chip){
  c.save();rr(c,x,y,w,h,h/2);c.fillStyle='rgba(0,0,0,.55)';c.fill();c.clip();
  const fw=w*clamp(f,0,1),cw=w*clamp(chip==null?f:chip,0,1);
  if(chip!=null){c.fillStyle='#fff6';c.fillRect(flip?x+w-cw:x,y,cw,h)}
  c.fillStyle=col;c.fillRect(flip?x+w-fw:x,y,fw,h);c.fillStyle='rgba(255,255,255,.28)';c.fillRect(x,y+1,w,h*.35);c.restore();
  rr(c,x,y,w,h,h/2);c.strokeStyle='#fff';c.lineWidth=2.5;c.stroke()}
function hpCol(c,r,x,w){return r>.5?'#4ade5a':r>.25?'#ffd23a':'#ff4a3a'}
function drawHUD(c,t){
  const p=G.p,e=G.e;
  const side=(f,x,flip,name)=>{
    const w=340,r=f.hp/f.maxhp;
    rr(c,x-6,8,w+12,74,14);c.fillStyle='rgba(10,5,30,.55)';c.fill();
    txt(c,name,flip?x+w:x,20,17,'#fff',flip?'right':'left','#000',4);
    drawBar(c,x,32,w,20,r,hpCol(c,r),flip,f.chip/f.maxhp);
    const rdy=f.en>=50;
    drawBar(c,x,58,w*.75,12,f.en/100,rdy?grad(c,x,0,x+w,0,['#b66bff','#5ad0ff','#b66bff']):'#7a5aff',flip);
    if(rdy&&Math.sin(t*10)>0)txt(c,'NITRO READY',flip?x+w:x+w*.75+8,64,12,'#ffe27a',flip?'right':'left','#000',3);
    if(f.sh<100)drawBar(c,flip?x+w*.78:x+w*.78-0,58,w*.2,6,f.sh/100,'#5aff9a',flip);
  };
  side(p,22,false,SPECIES[p.idx].name+' · '+SPECIES[p.idx].short||'');
  side(e,W-22-340,true,(e.ename||SPECIES[e.idx].name)+(e.boss?' ☠':''));
  // center
  const cfg=G.cfg;
  let top=cfg.mode==='story'?'LEVEL '+(cfg.level+1):cfg.mode==='survival'?'WAVE '+G.wave:'ROUND '+G.round;
  txt(c,top,480,22,18,'#ffe27a','center','#000',4);
  if(cfg.mode==='duel')txt(c,G.wins[0]+' - '+G.wins[1],480,42,16,'#fff','center','#000',3);
  if(cfg.mode==='survival')txt(c,'SCORE '+G.score,480,42,14,'#fff','center','#000',3);
  c.beginPath();c.arc(480,58,16,0,TAU);c.fillStyle='rgba(10,5,30,.6)';c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.stroke();
  c.fillStyle='#fff';c.fillRect(474,50,4,16);c.fillRect(483,50,4,16);
  if(p.combo>=2){const s=1+Math.min(.5,p.combo*.05);txt(c,p.combo+' HIT COMBO',22+0,100,26*s,'#ffd24a','left','#7a2a00',6)}
}
function drawTouch(c,t){
  if(!touchMode)return;
  c.save();
  for(const b of TB){
    const on=inp.held[b.n];c.globalAlpha=on?.85:.5;
    c.beginPath();c.arc(b.x,b.y,b.r,0,TAU);c.fillStyle=b.c?(on?b.c:'rgba(20,10,50,.7)'):(on?'#9a8aff':'rgba(20,10,50,.7)');c.fill();
    c.lineWidth=4;c.strokeStyle=b.c||'#9a8aff';c.stroke();
    c.fillStyle='#fff';
    if(b.l)txt(c,b.l,b.x,b.y,b.r>40?15:12,'#fff','center','#000',3);
    else{c.beginPath();const s=b.r*.4;
      if(b.n==='left'){c.moveTo(b.x-s,b.y);c.lineTo(b.x+s*.6,b.y-s);c.lineTo(b.x+s*.6,b.y+s)}
      else if(b.n==='right'){c.moveTo(b.x+s,b.y);c.lineTo(b.x-s*.6,b.y-s);c.lineTo(b.x-s*.6,b.y+s)}
      else{c.moveTo(b.x,b.y-s);c.lineTo(b.x-s,b.y+s*.7);c.lineTo(b.x+s,b.y+s*.7)}
      c.fill()}
  }
  c.restore();
}
function drawFight(c,t){
  const p=G.p,e=G.e;
  c.save();
  if(G.shake>0)c.translate(rnd(-G.shake,G.shake)*.7,rnd(-G.shake,G.shake)*.7);
  const zoom=G.slow>0?1.05:1;if(zoom!==1){c.translate(W/2,H/2);c.scale(zoom,zoom);c.translate(-W/2,-H/2)}
  drawArena(c,G.t,(p.x+e.x)/2);
  const order=[p,e].sort((a,b)=>a.y-b.y);
  if(e.boss&&!e.ko){glow(c,e.x,e.y-80*e.sc,150,e.sp.glow,.3+.1*Math.sin(t*5))}
  order.forEach(f=>drawFighter(c,f));
  for(const q of G.projs)drawProj(c,q);
  drawParts(c);
  for(const q of G.pops){const k=q.t/1.1;c.globalAlpha=1-k*k;txt(c,q.text,q.x,q.y-k*50,q.size,q.col,'center','#000',5);c.globalAlpha=1}
  c.restore();
  if(G.flashW>0){c.fillStyle=`rgba(255,255,255,${G.flashW*1.6})`;c.fillRect(0,0,W,H)}
  // vignette
  c.fillStyle=rgrad(c,W/2,H/2,H*.45,H*.95,['rgba(0,0,0,0)','rgba(0,0,0,.45)']);c.fillRect(0,0,W,H);
  drawHUD(c,t);
  if(G.state==='intro'){const k=G.stateT;
    if(k<.9)txt(c,G.banner,480,200,64*(1+(1-Math.min(1,k*4))*.5),'#fff','center','#2a0a5a',12);
    else{const s=1+(k-.9)*.8;c.globalAlpha=Math.max(0,1-(k-.9)*1.5);txt(c,'FIGHT!',480,200,80*s,'#ffd24a','center','#7a1a00',14);c.globalAlpha=1}
    if(G.cfg.mode==='story'&&G.e.boss&&k<1.3){txt(c,'⚠ BOSS ⚠',480,262,30,'#ff5a4a','center','#000',6)}}
  if(G.state==='ko'&&G.stateT>.2&&G.stateT<2)txt(c,'K.O.!',480,190,110,'#fff','center','#c01a1a',16);
  drawTouch(c,t);
  if(G.paused){c.fillStyle='rgba(5,0,20,.7)';c.fillRect(0,0,W,H);txt(c,'PAUSED',480,110,64,'#fff','center','#3a1a9a',10);uiDrawBtns(c,pauseUI,t)}
}
function drawProj(c,q){
  c.save();const x=q.x,y=q.y,d=Math.sign(q.vx)||1;
  switch(q.kind){
  case'fire':glow(c,x,y,q.r*2.6,'#ff6a1a',.9);ell(c,x,y,q.r,q.r*.8,grad(c,x-q.r,0,x+q.r,0,['#ffcf4a','#ff5a1a']));ell(c,x+d*4,y,q.r*.5,q.r*.4,'#fff4c0');break;
  case'rainbow':glow(c,x,y,q.r*2.6,'#ff9ae8',.8);['#ff7ab8','#ffb347','#ffe45a','#7aff9a','#6fc8ff','#b58cff'].forEach((col,i)=>ell(c,x-d*i*5,y,q.r-i*2.2,q.r-i*2.2,col));break;
  case'arrow':glow(c,x,y,22,'#ffe27a',.7);c.strokeStyle='#fff6b0';c.lineWidth=4;c.beginPath();c.moveTo(x-d*28,y);c.lineTo(x+d*14,y);c.stroke();poly(c,[x+d*24,y,x+d*10,y-7,x+d*10,y+7],'#ffe27a');break;
  case'rock':glow(c,x,y,q.r*2.2,'#5ff0ff',.5);c.translate(x,y);c.rotate(q.rot);poly(c,[-q.r,-q.r*.4,-q.r*.3,-q.r,q.r*.8,-q.r*.7,q.r,q.r*.2,q.r*.2,q.r,-q.r*.8,q.r*.7],grad(c,0,-q.r,0,q.r,['#c9c5b8','#6a665c']),'#3d3b38',3);glow(c,0,0,q.r*.7,'#5ff0ff',.6);break;
  default:{ // ground waves
    const col=q.col;glow(c,x,y-10,70,col,.5);c.fillStyle=col;c.strokeStyle='#fff';c.lineWidth=2;
    for(let i=-2;i<=2;i++){const hh=(q.kind==='ice'?46:34)-Math.abs(i)*8;poly(c,[x+i*16-9,y+4,x+i*16,y-hh,x+i*16+9,y+4],col,'#fff',1.5)}}
  }
  c.restore();
}

/* ---------- Scenes ---------- */
const S={};let scene=null,sceneT=0;
function go(s){scene=s;sceneT=0;if(s.enter)s.enter();SND.startPending()}
function curUI(){return scene===S.fight?(G.paused?pauseUI:null):scene}
const demos=SPECIES.map((sp,i)=>{const f=mkF(i,0,1);f.demo=true;return f});
function drawDemo(c,i,x,y,sc,face,t,atkOn){const f=demos[i];f.x=x;f.y=y;f.sc=SPECIES[i].sc*sc;f.face=face;f.onGround=true;f.t=t+i;f.vx=0;f.flash=0;
  const cyc=(t*.8+i*.37)%3;f.atk=atkOn&&cyc<.5?{type:'punch',t:cyc*.6,hs:.07,he:.18,dur:.3,range:80}:null;
  if(atkOn&&cyc>=1.2&&cyc<1.55)f.atk={type:'kick',t:(cyc-1.2)*1.1,hs:.14,he:.27,dur:.46,range:98};
  updatePose(f,1/60);drawFighter(c,f)}
const MENU_ARENA={ramps:[]};
function menuBG(c,t,ai){const keep=ARENA;ARENA=ARENAS[ai==null?0:ai];ARENA.draw(ARENA,t,0);ARENA=keep}
function bgDraw(c,t,ai){const A=ARENAS[ai];A.draw.call(A,c,t,0);c.fillStyle='rgba(5,0,20,.35)';c.fillRect(0,0,W,H)}
function floorStrip(c,ai){const A=ARENAS[ai];c.fillStyle=grad(c,0,GROUND,0,H,[A.gTop,A.gBot]);c.fillRect(0,GROUND,W,H-GROUND);c.fillStyle=A.gLine;c.fillRect(0,GROUND-2,W,4)}
function mkScene(o){o.focus=o.focus||0;o.btns=o.btns||[];return o}
function logo(c,t,y){
  c.save();const wob=Math.sin(t*2)*3;
  glow(c,480,y+30,260,'#ff7a2a',.35);
  c.font=`900 100px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
  c.strokeStyle='#2a0a5a';c.lineWidth=20;c.strokeText('MYTHIC',480,y+wob);
  c.fillStyle=grad(c,0,y-50,0,y+50,['#fff6b0','#ffb02a','#ff4a1a']);c.fillText('MYTHIC',480,y+wob);
  c.font=`900 72px ${FONT}`;c.strokeStyle='#2a0a5a';c.lineWidth=16;c.strokeText('FIGHTERS',480,y+78-wob);
  c.fillStyle=grad(c,0,y+36,0,y+116,['#e0f6ff','#6fc8ff','#7a5cff']);c.fillText('FIGHTERS',480,y+78-wob);
  c.restore()}

// Title
S.title=mkScene({
  enter(){SND.music('menu');this.btns=vmenu([['STORY MODE',()=>{sel.mode='story';openSelect()}],['DUEL VS AI',()=>{sel.mode='duel';openSelect()}],['SURVIVAL',()=>{sel.mode='survival';openSelect()}],['HOW TO PLAY',()=>go(S.how)],['SOUND: '+(SND.muted?'OFF':'ON'),()=>{SND.setMuted(!SND.muted);save.muted=SND.muted;persist();S.title.enter();S.title.focus=4}]],250,50);this.btns.forEach(b=>{b.h=42;b.size=21});this.btns[4].size=17;SND.music('menu')},
  draw(c,t){bgDraw(c,t,0);floorStrip(c,0);
    drawDemo(c,0,150,GROUND+10,1.5,1,t,true);drawDemo(c,2,810,GROUND+10,1.4,-1,t+1,true);drawDemo(c,8,70,GROUND+120,.8,1,t+2,false);drawDemo(c,5,890,GROUND+125,.8,-1,t+3,false);
    logo(c,t,110);uiDrawBtns(c,this,t);
    txt(c,'Clear Story levels to unlock new creatures!  Best survival wave: '+save.best,480,H-16,14,'#ffe9b0','center','#000',4)}});
// How to play
S.how=mkScene({back(){go(S.title)},enter(){this.btns=[{x:330,y:470,w:300,h:50,label:'BACK',fn:()=>go(S.title)}]},
  draw(c,t){bgDraw(c,t,2);c.fillStyle='rgba(10,5,40,.8)';rr(c,40,24,880,432,20);c.fill();
    txt(c,'HOW TO PLAY',480,56,38,'#ffd24a','center','#000',7);
    const L=[['MOVE','A / D  or  ◀ ▶'],['JUMP','W / ↑ / Space'],['PUNCH','J  or  Z   (fast)'],['KICK','K  or  X   (strong, knocks up)'],['BLOCK','Hold S / ↓ / Shift (shield breaks if hit too much)'],['DODGE','U  or  V   (quick roll, you can\'t be hit!)'],['NITRO SPECIAL','I  or  C   (needs half a nitro bar)'],['PAUSE','P or Esc']];
    L.forEach((r,i)=>{txt(c,r[0],80,110+i*38,20,'#7ad8ff','left','#000',4);txt(c,r[1],300,110+i*38,19,'#fff','left')});
    wrapText(c,'Land hits to fill your NITRO bar, then unleash your creature\'s special power! Chain hits for combos that do bonus damage. On iPad, use the on-screen buttons.',80,420,800,22,17,'#ffe9b0');
    uiDrawBtns(c,this,t)}});

const sel={mode:'story',hero:0,enemy:1,arena:0,diff:.55,level:0};
function openSelect(){
  S.select.cfg={title:sel.mode==='story'?'CHOOSE YOUR HERO':sel.mode==='survival'?'CHOOSE YOUR SURVIVOR':'CHOOSE YOUR FIGHTER',opp:false,onPick(i){sel.hero=i;
    if(sel.mode==='story')go(S.map);else if(sel.mode==='survival')startFight({mode:'survival',hero:sel.hero,arena:(Math.random()*5)|0});else openOpp()}};
  S.select.focus=sel.hero;go(S.select)}
function openOpp(){S.select.cfg={title:'CHOOSE YOUR OPPONENT',opp:true,onPick(i){sel.enemy=i;go(S.arenaSel)}};S.select.focus=sel.enemy;go(S.select)}
// Select
S.select=mkScene({cols:5,cfg:{},
  back(){go(S.title)},
  enter(){
    const cards=SPECIES.map((sp,i)=>({x:35+(i%5)*180,y:62+((i/5)|0)*118,w:170,h:108,twoTap:true,idx:i,fn:()=>{S.select.pick(i)},draw(c,b,focus,t){
      const lock=!S.select.cfg.opp&&!isUnlocked(i);
      c.save();rr(c,b.x,b.y,b.w,b.h,14);c.fillStyle=grad(c,0,b.y,0,b.y+b.h,[rgba2(sp.glow,focus?.9:.45),'#1a1040']);c.fill();c.lineWidth=focus?5:2;c.strokeStyle=focus?'#fff':'rgba(255,255,255,.4)';c.stroke();
      c.save();rr(c,b.x,b.y,b.w,b.h,14);c.clip();c.globalAlpha=lock?.18:1;drawDemo(c,i,b.x+b.w/2,b.y+b.h-12,.5,1,t,false);c.restore();
      txt(c,sp.name,b.x+b.w/2,b.y+14,17,'#fff','center','#000',4);
      if(lock){txt(c,'🔒',b.x+b.w/2,b.y+56,30);txt(c,'Story Lv '+unlockLevel(i),b.x+b.w/2,b.y+94,13,'#ffe27a','center','#000',3)}
      c.restore()}}));
    this.btns=cards.concat([{x:480,y:462,w:160,h:56,label:'BACK',fn:()=>{SND.play('back');this.back()}},{x:660,y:462,w:270,h:56,label:'CHOOSE!',fn:()=>this.pick(this.focus<10?this.focus:0,true)}]);
  },
  pick(i,force){if(i>=10)return;if(!S.select.cfg.opp&&!isUnlocked(i)){SND.play('back');return}S.select.cfg.onPick(i)},
  draw(c,t){bgDraw(c,t,1);c.fillStyle='rgba(10,5,40,.55)';c.fillRect(0,0,W,H);
    txt(c,this.cfg.title,480,32,28,'#ffd24a','center','#000',6);
    const i=this.focus<10?this.focus:(this.cfg.opp?sel.enemy:sel.hero),sp=SPECIES[i],lock=!this.cfg.opp&&!isUnlocked(i);
    uiDrawBtns(c,this,t);
    c.fillStyle='rgba(10,5,40,.6)';rr(c,20,306,440,214,16);c.fill();
    c.save();rr(c,20,306,440,214,16);c.clip();glow(c,130,430,140,sp.glow,.5);c.globalAlpha=lock?.2:1;drawDemo(c,i,130,500,.95,1,t,!lock);c.restore();
    txt(c,sp.name+' the '+sp.title.split(' ').slice(-1)[0],250,326,22,'#fff','left','#000',5);
    c.fillStyle='#fff';
    [['HEALTH',sp.hp/1.3],['POWER',sp.pow/1.25],['SPEED',sp.spd/1.15],['JUMP',sp.jmp/1.25]].forEach((s,k)=>{txt(c,s[0],250,356+k*20,12,'#bfe','left');drawBar(c,320,350+k*20,130,10,s[1],'#ffb02a',false)});
    wrapText(c,sp.bio,250,436,200,16,12,'#ffe9b0');
    c.fillStyle='rgba(10,5,40,.6)';rr(c,480,306,450,140,16);c.fill();
    txt(c,'NITRO SPECIAL',500,326,14,'#b8a0ff','left');txt(c,sp.sp.name,500,352,26,sp.glow,'left','#000',5);
    txt(c,{proj:'Ranged blast',dash:'Charging dash',slam:'Ground-shaking shockwave',flurry:'Multi-hit flurry'}[sp.sp.type]+(sp.sp.heal?' + heals you':''),500,386,15,'#fff','left');
    txt(c,lock?'Locked: clear Story level '+unlockLevel(i):'Tap again or press ENTER to choose',500,420,14,lock?'#ff9a8a':'#9aff9a','left')}});
// Arena select (duel)
S.arenaSel=mkScene({cols:3,back(){openOpp()},
  enter(){this.btns=ARENAS.map((A,i)=>({x:40+(i%3)*300,y:80+((i/3)|0)*170,w:280,h:155,twoTap:true,fn:()=>{sel.arena=i;startFight({mode:'duel',hero:sel.hero,enemy:sel.enemy,arena:i,diff:sel.diff})},draw(c,b,focus,t){
      c.save();rr(c,b.x,b.y,b.w,b.h,14);c.clip();c.translate(b.x,b.y);c.scale(b.w/W,b.w/W);A.draw.call(A,c,t,0);c.restore();
      c.save();rr(c,b.x,b.y,b.w,b.h,14);c.lineWidth=focus?6:2;c.strokeStyle=focus?'#ffd24a':'rgba(255,255,255,.5)';c.stroke();c.restore();
      c.fillStyle='rgba(0,0,0,.6)';c.fillRect(b.x+4,b.y+b.h-38,b.w-8,34);txt(c,A.name,b.x+b.w/2,b.y+b.h-21,20,'#fff','center','#000',4)}}))
    .concat([{x:640,y:250,w:280,h:60,label:'DIFFICULTY: '+(sel.diff<.4?'EASY':sel.diff<.7?'NORMAL':'HARD'),fn:()=>{sel.diff=sel.diff<.4?.55:sel.diff<.7?.9:.25;S.arenaSel.enter();S.arenaSel.focus=6}},{x:640,y:330,w:280,h:60,label:'BACK',fn:()=>openOpp()}]);},
  draw(c,t){bgDraw(c,t,4);txt(c,'CHOOSE ARENA',480,40,34,'#ffd24a','center','#000',7);uiDrawBtns(c,this,t)}});
// Story map
S.map=mkScene({cols:5,back(){go(S.title)},
  enter(){SND.music('menu');const pos=i=>[80+i*89,300+(i%2?-60:60)+Math.sin(i)*25];
    this.btns=LEVELS.map((L,i)=>({x:pos(i)[0]-32,y:pos(i)[1]-32,w:64,h:64,twoTap:true,clickLocked:true,fn:()=>{if(i>save.cleared){SND.play('back');return}sel.level=i;startFight({mode:'story',hero:sel.hero,level:i,arena:L.arena,boss:L.boss})},
      draw(c,b,focus,t){const open=i<=save.cleared,done=i<save.cleared,A=ARENAS[L.arena],cx=b.x+32,cy=b.y+32,r=L.boss?38:30;
        glow(c,cx,cy,r*2,open?A.gLine:'#444',focus?.7:.25);
        c.beginPath();c.arc(cx,cy,r+(i===save.cleared?Math.sin(t*6)*3:0),0,TAU);c.fillStyle=open?grad(c,0,cy-r,0,cy+r,[A.gTop,A.gBot]):'#3a3a4a';c.fill();c.lineWidth=focus?6:3;c.strokeStyle=focus?'#fff':L.boss?'#ff5a4a':'#ffd24a';c.stroke();
        txt(c,open?String(i+1):'🔒',cx,cy,open?26:22,'#fff','center','#000',5);
        if(L.boss)poly(c,[cx-20,cy-r-2,cx-12,cy-r-18,cx-4,cy-r-6,cx,cy-r-20,cx+4,cy-r-6,cx+12,cy-r-18,cx+20,cy-r-2],'#ff5a4a','#000',2);
        if(done)txt(c,'★',cx+r-6,cy-r+6,22,'#ffe27a','center','#000',4)}}))
      .concat([{x:40,y:462,w:160,h:56,label:'BACK',fn:()=>go(S.title)},{x:700,y:462,w:230,h:56,label:'START!',fn:()=>this.btns[this.focus<10?this.focus:0].fn()}]);
    this.focus=Math.min(save.cleared,9)},
  draw(c,t){bgDraw(c,t,this.focus<10?LEVELS[this.focus].arena:0);const pos=i=>[80+i*89,300+(i%2?-60:60)+Math.sin(i)*25];
    txt(c,'STORY MODE',480,36,36,'#ffd24a','center','#000',7);
    c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=6;c.setLineDash([12,10]);c.beginPath();LEVELS.forEach((L,i)=>{const p=pos(i);i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])});c.stroke();c.setLineDash([]);
    uiDrawBtns(c,this,t);
    const i=this.focus<10?this.focus:0,L=LEVELS[i],sp=SPECIES[SPI[L.enemy]];
    c.fillStyle='rgba(10,5,40,.7)';rr(c,230,452,450,72,14);c.fill();
    txt(c,'Level '+(i+1)+': '+L.name,250,474,19,L.boss?'#ff8a7a':'#fff','left','#000',4);
    txt(c,(i<=save.cleared?'vs '+sp.name+' the '+sp.short+'  •  '+ARENAS[L.arena].sub:'Locked - clear the previous level'),250,500,14,'#bfe','left');
    if(i<=save.cleared){c.save();c.beginPath();c.rect(0,0,W,H);c.clip();drawDemo(c,SPI[L.enemy],870,150,.55,-1,t,true);c.restore()}
    txt(c,'Hero: '+SPECIES[sel.hero].name,110,198,14,'#ffe9b0','center','#000',3);
    drawDemo(c,sel.hero,110,150,.55,1,t,true)}});
// Pause
const pauseUI=mkScene({btns:vmenu([['RESUME',()=>{G.paused=false}],['RESTART',()=>{G.paused=false;startFight(G.cfg)}],['SOUND: ON/OFF',()=>{SND.setMuted(!SND.muted);save.muted=SND.muted;persist()}],['QUIT TO MENU',()=>{G.paused=false;go(S.title)}]],170,66),back(){G.paused=false}});
// Fight scene
S.fight={enter(){},update(dt){updateFight(dt)},draw(c,t){drawFight(c,t)}};
// Result
function showResult(r){S.result.r=r;
  const nx=r.mode==='story'&&r.win&&r.cfg.level<9;
  const b=[];
  if(nx)b.push(['NEXT LEVEL',()=>{const l=r.cfg.level+1;sel.level=l;startFight({mode:'story',hero:r.cfg.hero,level:l,arena:LEVELS[l].arena,boss:LEVELS[l].boss})}]);
  b.push([r.mode==='story'?(r.win?'REPLAY LEVEL':'TRY AGAIN'):r.mode==='duel'?'REMATCH':'PLAY AGAIN',()=>startFight(r.cfg.mode==='survival'?Object.assign({},r.cfg,{arena:(Math.random()*5)|0}):r.cfg)]);
  if(r.mode==='story')b.push(['LEVEL MAP',()=>go(S.map)]);
  b.push(['MAIN MENU',()=>go(S.title)]);
  S.result.btns=vmenu(b,300-0,56).map(x=>{x.h=46;return x});S.result.focus=0;
  setTimeout(()=>{if(scene!==S.result)go(S.result)},0)}
S.result=mkScene({r:null,enter(){SND.music(this.r.win?'win':'menu')},
  draw(c,t){const r=this.r;drawFightFrozen(c,t);c.fillStyle='rgba(5,0,25,.72)';c.fillRect(0,0,W,H);
    const vic=r.win||r.mode==='survival';
    txt(c,r.mode==='survival'?'GAME OVER':r.win?'VICTORY!':'DEFEATED',480,70,64,vic&&r.win?'#ffd24a':'#ff8a7a','center','#2a0a5a',12);
    if(r.mode==='survival'){txt(c,'Waves cleared: '+(r.wave-1)+'   Score: '+r.score,480,130,24,'#fff','center','#000',5);if(r.record)txt(c,'★ NEW RECORD! ★',480,166,24,'#ffe27a','center','#000',5)}
    else txt(c,'Best combo: '+r.combo+'    Time: '+r.time.toFixed(1)+'s    HP left: '+r.hp,480,130,22,'#fff','center','#000',5);
    if(r.cfg.mode==='story'&&r.win&&r.cfg.level===9)txt(c,'YOU ARE THE MYTHIC CHAMPION!',480,170,28,'#ffd24a','center','#000',6);
    if(r.newUnlock!=null){const i=r.newUnlock;txt(c,'NEW CREATURE UNLOCKED: '+SPECIES[i].name+'!',480,206,26,'#7aff9a','center','#000',6);c.save();c.beginPath();c.rect(0,0,W,H);c.clip();drawDemo(c,i,810,330,1.0,-1,t,true);drawDemo(c,i,150,330,1.0,1,t,true);c.restore();glow(c,810,260,120,SPECIES[i].glow,.4);glow(c,150,260,120,SPECIES[i].glow,.4)}
    uiDrawBtns(c,this,t)}});
function drawFightFrozen(c,t){if(G){drawFight(c,G.t)}}

/* ---------- main loop ---------- */
let last=performance.now(),time=0;
function frame(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;time+=dt;sceneT+=dt;
  try{
    if(scene.update)scene.update(dt);
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#07040f';ctx.fillRect(0,0,cv.width,cv.height);
    ctx.setTransform(dpr*scale,0,0,dpr*scale,offx*dpr,offy*dpr);
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
    scene.draw(ctx,time);
    ctx.restore();
  }catch(err){console.error(err);window.__err=(window.__err||'')+err.stack+'\n'}
  requestAnimationFrame(frame);
}
window.__game={get G(){return G},SPECIES,S,go,startFight,save,inp,get scene(){return scene}};
setArena(0);
go(S.title);
if(QS.get('autostart')){const[m,h,e,a]=QS.get('autostart').split(',');const cfg={mode:m,hero:+h||0,enemy:+e||1,arena:+a||0,diff:.6,level:+(QS.get('level')||0)};if(m==='story'){const L=LEVELS[cfg.level];cfg.arena=L.arena;cfg.boss=L.boss}startFight(cfg)}
requestAnimationFrame(frame);
['touchend','click','mousedown'].forEach(ev=>addEventListener(ev,()=>{SND.resume();SND.startPending()},{passive:true}));
