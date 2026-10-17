'use strict';
/* Mythic Fighters - game logic, scenes, input. */
const QS=new URLSearchParams(location.search);
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let scale=1,offx=0,offy=0,dpr=1;
function resize(){dpr=Math.min(window.devicePixelRatio||1,2);const w=innerWidth,h=innerHeight;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);scale=Math.min(w/W,h/H);offx=(w-W*scale)/2;offy=(h-H*scale)/2}
addEventListener('resize',resize);resize();

/* ---------- save ---------- */
const SAVE_KEY='mythicFightersV1';
let save={cleared:0,best:0,muted:false,coins:0,heroes:{},weapons:['fists','sword'],loadout:{},bought:0};
try{Object.assign(save,JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'))}catch(e){}
if(!save.heroes||typeof save.heroes!=='object')save.heroes={};
if(!Array.isArray(save.weapons))save.weapons=['fists','sword'];
if(!save.loadout||typeof save.loadout!=='object')save.loadout={};
save.coins=+save.coins||0;save.bought=+save.bought||0;
save.armor=Object.assign({helm:0,chest:0,limbs:0},save.armor&&typeof save.armor==='object'?save.armor:{});
for(const k of['helm','chest','limbs'])save.armor[k]=Math.max(0,Math.min(5,+save.armor[k]||0));
if(!Array.isArray(save.board))save.board=[];
save.diff=[0,1,2].includes(+save.diff)&&save.diff!==undefined&&save.diff!==null?+save.diff:1;
if(!save.mis||typeof save.mis!=='object')save.mis={};
if(QS.get('gear'))for(const k of['helm','chest','limbs'])save.armor[k]=+QS.get('gear');
if(QS.get('cleared'))save.cleared=+QS.get('cleared');
if(QS.get('coins'))save.coins=+QS.get('coins');
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}}
SND.setMuted(!!save.muted);
const START=['dragon','minotaur','unicorn'];
const REWARD=['centaur','werewolf','kraken','griffin','phoenix','yeti','golem'];
function isUnlocked(i){const id=SPECIES[i].id;if(QS.get('unlock'))return true;if(START.includes(id))return true;const r=REWARD.indexOf(id);return r>=0&&save.cleared>=r+1}
function unlockLevel(i){return REWARD.indexOf(SPECIES[i].id)+1}
/* ---------- hero progression ---------- */
const UPS=[
 {k:'hp',g:'LIFE',gc:'#ff6a7a',n:'Max Health',d:'More max life points',f:l=>'+'+6*l+'% life'},
 {k:'regen',g:'LIFE',gc:'#ff6a7a',n:'Regeneration',d:'Heal a little every second in battle',f:l=>'+'+(.15*l).toFixed(2)+'% life/sec'},
 {k:'steal',g:'LIFE',gc:'#ff6a7a',n:'Lifesteal',d:'Heal for part of the damage you deal',f:l=>(1.2*l).toFixed(1)+'% of damage'},
 {k:'def',g:'ARMOR',gc:'#7ac8ff',n:'Armor Plating',d:'More armor = less damage taken',f:l=>'+'+3*l+' armor'},
 {k:'spd',g:'SPEED',gc:'#c8ff5a',n:'Move Speed',d:'Run and jump faster',f:l=>'+'+(2.5*l).toFixed(1)+'% speed'},
 {k:'aspd',g:'SPEED',gc:'#c8ff5a',n:'Attack Speed',d:'Swing, shoot and cast faster',f:l=>'+'+3*l+'% speed'},
 {k:'atk',g:'POWER',gc:'#ffb347',n:'Attack Power',d:'All your attacks hit harder',f:l=>'+'+5*l+'% damage'},
 {k:'wp',g:'POWER',gc:'#ffb347',n:'Weapon Power',d:'Weapon + weapon skill damage',f:l=>'+'+6*l+'% weapon'},
 {k:'cd',g:'POWER',gc:'#ffb347',n:'Cooldowns',d:'Skills, ultimate, ranged recharge faster',f:l=>'-'+4*l+'% cooldown'},
 {k:'en',g:'POWER',gc:'#ffb347',n:'Nitro Charge',d:'Nitro bar fills faster',f:l=>'+'+10*l+'% charge'}];
const UPMAX=10,MAXLV=40,xpNeed=l=>40+14*(l-1);
const GEAR=[{k:'helm',n:'HELM',per:3},{k:'chest',n:'CHEST ARMOR',per:6},{k:'limbs',n:'GLOVES & BOOTS',per:3}];
const GTIER=['None','Leather','Bronze','Iron','Mythril','Dragon Gold'],GCOST=[100,200,350,550,800],GMAX=5;
const gearArmor=()=>GEAR.reduce((a,g)=>a+g.per*save.armor[g.k],0);
const armRed=a=>Math.min(.6,a/(a+120));
function hs(id){let h=save.heroes[id];if(!h||typeof h!=='object')h=save.heroes[id]={};h.xp=+h.xp||0;h.lvl=+h.lvl||1;h.pts=+h.pts||0;h.up=h.up||{};UPS.forEach(u=>h.up[u.k]=+h.up[u.k]||0);return h}
function addXP(id,n){const h=hs(id),from=h.lvl;h.xp+=n;while(h.lvl<MAXLV&&h.xp>=xpNeed(h.lvl)){h.xp-=xpNeed(h.lvl);h.lvl++;h.pts+=h.lvl%5===0?2:1}if(h.lvl>=MAXLV)h.xp=0;return h.lvl-from}
function statsOf(id){const u=hs(id).up;return{hp:1+.06*u.hp,atk:1+.05*u.atk,armor:gearArmor()+3*u.def,spd:1+.025*u.spd,en:1+.1*u.en,cd:1-.04*u.cd,wp:1+.06*u.wp,regen:.0015*u.regen,steal:.012*u.steal,aspd:1+.03*u.aspd}}
function spentPts(id){const u=hs(id).up;return UPS.reduce((a,x)=>a+u[x.k],0)}
const pointCost=()=>120+30*save.bought;

/* ---------- weapons ---------- */
const WEAPONS=[
 {id:'fists',name:'Mythic Fists',style:'punch',len:0,idle:0,dmg:5,range:82,dur:.3,hs:.07,he:.18,kb:190,up:0,stun:.28,en:7,cost:0,lvl:0,desc:'Fast and reliable. Your creature\'s own power.',
  skill:{name:'Power Punch',type:'dash',dmg:14,speed:700,cd:7,col:'#ffd27a',kind:'dust',wskill:1,desc:'Charge and land a huge punch'}},
 {id:'sword',name:'Star Sword',style:'slash',len:62,idle:-1,dmg:6.5,range:102,dur:.36,hs:.09,he:.2,kb:210,up:0,stun:.28,en:7,cost:0,lvl:0,desc:'Balanced blade with a wide slash.',
  skill:{name:'Crescent Wave',type:'proj',dmg:12,speed:700,r:24,cd:6,col:'#bfe9ff',kind:'crescent',wskill:1,desc:'Fire a glowing slash wave'}},
 {id:'axe',name:'Thunder Axe',style:'chop',len:58,idle:-1.1,dmg:8.5,range:96,dur:.5,hs:.16,he:.3,kb:280,up:0,stun:.36,en:8,cost:150,lvl:3,desc:'Slow, heavy chops that hit hard.',
  skill:{name:'Whirlwind',type:'spin',dmg:6,rad:110,cd:8,col:'#ffe27a',wskill:1,desc:'Spin and hit both sides 4 times'}},
 {id:'spear',name:'Sky Spear',style:'thrust',len:100,idle:-.5,dmg:6,range:142,dur:.4,hs:.12,he:.22,kb:170,up:0,stun:.26,en:7,cost:250,lvl:6,desc:'Longest reach. Poke from afar!',
  skill:{name:'Lunge',type:'dash',dmg:15,speed:820,cd:6,col:'#ffffff',kind:'glow',wskill:1,desc:'Dash forward with a piercing thrust'}},
 {id:'staff',name:'Moon Staff',style:'slash',len:74,idle:-1.45,dmg:5.5,range:108,dur:.36,hs:.1,he:.2,kb:180,up:0,stun:.3,en:12,cost:350,lvl:9,desc:'Magic staff. Hits charge your nitro faster.',
  skill:{name:'Starlight Heal',type:'heal',pct:22,cd:12,col:'#7aff9a',wskill:1,desc:'Heal 22% of your health'}},
 {id:'hammer',name:'Titan Hammer',style:'chop',len:62,idle:-1,dmg:11,range:94,dur:.68,hs:.26,he:.38,kb:380,up:90,stun:.5,en:9,heavy:1,cost:450,lvl:12,desc:'Super slow but smashes and launches foes.',
  skill:{name:'Earth Smash',type:'slam',dmg:18,cd:9,col:'#ffb36a',kind:'rock',wskill:1,desc:'Smash the ground with shockwaves'}},
 {id:'shield',name:'Guardian Shield',style:'thrust',len:24,idle:0,dmg:4.5,range:70,dur:.32,hs:.08,he:.18,kb:240,up:0,stun:.4,en:6,cost:300,lvl:15,desc:'Bash foes. Blocking drains less shield.',
  skill:{name:'Shield Bash',type:'dash',dmg:11,speed:700,cd:8,col:'#9ad8ff',kind:'glow',guard:3,wskill:1,desc:'Charge in and take less damage for 3s'}},
 {id:'bow',name:'Wind Bow',style:'shoot',len:40,idle:0,dmg:6,range:480,dur:.45,hs:.18,he:.3,kb:120,up:0,stun:.22,en:6,cost:500,lvl:18,ranged:1,desc:'Shoot arrows from across the arena.',
  skill:{name:'Triple Shot',type:'proj',dmg:7,speed:900,r:12,n:3,cd:6,col:'#ffe27a',kind:'warrow',wskill:1,desc:'Fire 3 arrows at once'}},
 {id:'boomerang',name:'Comet Boomerang',style:'throw',len:30,idle:-.6,dmg:5.5,range:480,dur:.42,hs:.16,he:.3,kb:140,up:0,stun:.24,en:7,cost:600,lvl:21,ranged:1,desc:'Throw it out and it flies back, hitting twice!',
  skill:{name:'Great Boomerang',type:'proj',dmg:9,speed:620,r:30,cd:7,col:'#ffb347',kind:'boom',ret:1,wskill:1,desc:'A giant boomerang that returns'}},
 {id:'claws',name:'Shadow Claws',style:'thrust',len:28,idle:0,dmg:3.5,range:66,dur:.2,hs:.05,he:.12,kb:70,up:0,stun:.18,en:4,cost:700,lvl:24,desc:'Lightning-fast slashes. Great for combos.',
  skill:{name:'Fury Flurry',type:'flurry',dmg:4.5,hits:6,cd:7,col:'#b9c8ff',wskill:1,desc:'6 rapid claw strikes'}}];
const WI={};WEAPONS.forEach(w=>WI[w.id]=w);
function weaponOwned(id){const w=WI[id];return !!QS.get('unlock')||save.weapons.includes(id)||(w.lvl>0&&save.cleared>=w.lvl)}
function equipped(heroIdx){const o=QS.get('w');if(o&&WI[o])return WI[o];const id=save.loadout[SPECIES[heroIdx].id]||'sword';return WI[weaponOwned(id)?id:'fists']}
const CULT={
 dragon:{name:'Dragon Rage',type:'buff',buff:'atk',time:7,col:'#ff8a1f',cd:13,desc:'+40% damage for 7s'},
 minotaur:{name:'Earth Stomp',type:'nova',dmg:16,rad:190,col:'#ffb347',cd:11,desc:'Shockwave stomp all around'},
 unicorn:{name:'Healing Light',type:'heal',pct:28,col:'#ff9ae8',cd:14,desc:'Heal 28% health'},
 centaur:{name:'Sky Leap',type:'leap',dmg:20,rad:150,speed:420,col:'#ffe27a',cd:10,desc:'Leap high and crash down'},
 werewolf:{name:'Moon Howl',type:'buff',buff:'spd',time:7,col:'#b9c8ff',cd:13,desc:'Faster + stronger for 7s'},
 kraken:{name:'Ink Wave',type:'proj',dmg:15,speed:420,r:40,col:'#b66bff',kind:'ink',cd:10,desc:'Big slow wave of ink'},
 griffin:{name:'Sky Dive',type:'leap',dmg:22,rad:140,speed:520,col:'#ffd54a',cd:10,desc:'Dive-bomb from above'},
 phoenix:{name:'Flame Nova',type:'nova',dmg:17,rad:230,col:'#ffb02a',cd:11,desc:'Burst of fire all around'},
 yeti:{name:'Ice Armor',type:'buff',buff:'def',time:7,col:'#8fe0ff',cd:14,desc:'Take half damage for 7s'},
 golem:{name:'Quake',type:'slam',dmg:20,col:'#c9c5b8',cd:11,kind:'rock',desc:'Giant ground-shaking quake'}};
const RB={dragon:{name:'Fire Bolt',kind:'fire',col:'#ff8a1f',r:17,speed:640},minotaur:{name:'Stone Hurl',kind:'rock',col:'#ffb347',r:15,speed:560},unicorn:{name:'Rainbow Bolt',kind:'rainbow',col:'#ff9ae8',r:14,speed:700},centaur:{name:'Star Arrow',kind:'warrow',col:'#ffe27a',r:12,speed:860},werewolf:{name:'Moon Slash',kind:'crescent',col:'#b9c8ff',r:18,speed:700},kraken:{name:'Ink Shot',kind:'ink',col:'#b66bff',r:17,speed:560},griffin:{name:'Wind Slash',kind:'crescent',col:'#ffd54a',r:18,speed:720},phoenix:{name:'Ember Shot',kind:'fire',col:'#ffb02a',r:16,speed:660},yeti:{name:'Ice Shard',kind:'crescent',col:'#8fe0ff',r:18,speed:640},golem:{name:'Boulder Chip',kind:'rock',col:'#c9c5b8',r:17,speed:520}};
const wType=w=>w.ranged?'RANGED WEAPON':'CLOSE WEAPON';
const BUFFTXT={atk:'RAGE!',spd:'FRENZY!',def:'ARMOR UP!'};
const CHAPTERS=[{name:'The Mythic Trials',sub:'Whisperwood to the Sky Temple'},{name:'Ember & Ice',sub:'Frozen caves and the Elder Drake'},{name:'Sands of Time',sub:'Ancient desert ruins'},{name:'Drowned Kingdom',sub:'Beneath the waves'},{name:'Storm Realms',sub:'Thunder skies and glaciers'},{name:'Shadow Citadel',sub:'The final fortress'}];
const VARS={armored:{tag:'ARMORED',aura:'#7ac8ff',defM:.8,hpm:1.1,spdM:.92},berserk:{tag:'BERSERKER',aura:'#ff4a3a',dmgM:1.15,spdM:1.12,defM:1.15},swift:{tag:'SWIFT',aura:'#c8ff5a',spdM:1.3,hpm:.85,fast:1},mystic:{tag:'MYSTIC',aura:'#c08aff',cdM:.55,dmgM:1.05},giant:{tag:'GIANT',aura:'#ffb36a',scale:1.25,hpm:1.3,spdM:.88,dmgM:1.15},shadow:{tag:'SHADOW',aura:'#7a3aff',dodge:1,dmgM:1.1,cdM:.8}};
const LEVELS=[
 {arena:1,enemy:'centaur',diff:.12,name:'Whisperwood Welcome'},
 {arena:1,enemy:'werewolf',diff:.22,name:'Howl at the Moon',wp:'claws'},
 {arena:4,enemy:'kraken',diff:.32,name:'Tides of Trouble'},
 {arena:2,enemy:'griffin',diff:.42,name:'Above the Clouds',wp:'sword'},
 {arena:2,enemy:'minotaur',diff:.52,boss:1,name:'BOSS: The Labyrinth King',scale:1.3,hpm:1.5,wp:'axe'},
 {arena:3,enemy:'yeti',diff:.58,name:'Frozen Fury',wp:'hammer'},
 {arena:3,enemy:'golem',diff:.68,name:'Crystal Guardian'},
 {arena:0,enemy:'phoenix',diff:.78,name:'Rise From Ashes',wp:'sword'},
 {arena:0,enemy:'unicorn',diff:.88,name:'Rainbow Rampage',wp:'staff'},
 {arena:0,enemy:'dragon',diff:1,boss:1,name:'BOSS: The Elder Drake',scale:1.35,hpm:1.65,wp:'axe'},
 {arena:5,enemy:'centaur',diff:.72,name:'Mirage Runners',var:'swift',wp:'spear'},
 {arena:5,enemy:'griffin',diff:.76,name:'Sandstorm Soar',wp:'bow'},
 {arena:5,enemy:'golem',diff:.8,name:'Pharaoh\'s Guard',var:'armored',wp:'hammer'},
 {arena:5,enemy:'phoenix',diff:.84,name:'Scarab Flames',var:'mystic',wp:'staff'},
 {arena:5,enemy:'minotaur',diff:.9,boss:1,name:'BOSS: The Sand Tyrant',scale:1.35,hpm:1.8,wp:'axe'},
 {arena:4,enemy:'kraken',diff:.9,name:'Whirlpool Welcome',wp:'shield'},
 {arena:4,enemy:'unicorn',diff:.92,name:'Coral Mirage',var:'mystic',wp:'staff'},
 {arena:1,enemy:'yeti',diff:.95,name:'Lost in the Woods',var:'armored',wp:'spear'},
 {arena:1,enemy:'werewolf',diff:.98,name:'Full Moon Fury',var:'berserk',wp:'claws'},
 {arena:4,enemy:'kraken',diff:1.05,boss:1,name:'BOSS: The Leviathan',scale:1.4,hpm:2.3,wp:'shield'},
 {arena:2,enemy:'griffin',diff:1,name:'Thunder Flight',var:'swift',wp:'bow'},
 {arena:2,enemy:'dragon',diff:1.03,name:'Storm Drake',wp:'sword'},
 {arena:3,enemy:'yeti',diff:1.06,name:'Blizzard Behemoth',var:'giant',wp:'hammer'},
 {arena:3,enemy:'unicorn',diff:1.09,name:'Frostlight Mare',var:'mystic',wp:'staff'},
 {arena:3,enemy:'golem',diff:1.12,boss:1,name:'BOSS: The Glacier Colossus',scale:1.4,hpm:2.3,wp:'hammer'},
 {arena:6,enemy:'werewolf',diff:1.14,name:'Moonless Gate',var:'shadow',wp:'claws'},
 {arena:6,enemy:'phoenix',diff:1.16,name:'Ashen Knight',var:'berserk',wp:'sword'},
 {arena:6,enemy:'centaur',diff:1.05,name:'The Dark Archer',var:'armored',wp:'bow'},
 {arena:6,enemy:'minotaur',diff:1.12,name:'Citadel Gatekeeper',var:'giant',wp:'axe'},
 {arena:6,enemy:'dragon',diff:1.2,boss:1,name:'FINAL BOSS: The Shadow Dragon King',scale:1.5,hpm:2.8,var:'shadow',wp:'sword'}];
LEVELS.forEach((L,i)=>L.ch=(i/5)|0);
const NLV=LEVELS.length;

/* ---------- input ---------- */
const inp={held:{},press:{}};
const KEYMAP={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyW:'jump',ArrowUp:'jump',Space:'jump',KeyS:'shield',ArrowDown:'shield',ShiftLeft:'shield',ShiftRight:'shield',KeyL:'skill',KeyO:'ult',KeyH:'ranged',KeyB:'ranged',KeyJ:'punch',KeyZ:'punch',KeyK:'kick',KeyX:'kick',KeyI:'special',KeyC:'special',KeyU:'dodge',KeyV:'dodge'};
function press(n){if(!inp.held[n])inp.press[n]=true;inp.held[n]=true}
function release(n){inp.held[n]=false}
let touchMode=!!QS.get('touch')||navigator.maxTouchPoints>0||('ontouchstart' in window);
const TB=[{n:'left',x:70,y:486,r:42},{n:'right',x:176,y:486,r:42},{n:'jump',x:123,y:408,r:38,l:['JUMP','W']},
 {n:'punch',x:888,y:478,r:50,l:['CLOSE','ATTACK','J'],c:'#ff7a3a'},{n:'kick',x:776,y:498,r:40,l:['KICK','K'],c:'#ffc23a'},{n:'ranged',x:790,y:404,r:38,l:['RANGED','ATTACK','H'],c:'#4ad0ff'},
 {n:'special',x:894,y:372,r:34,l:['NITRO','I'],c:'#b66bff'},
 {n:'skill',x:802,y:312,r:32,l:['WEAPON','SKILL','L'],c:'#5aff9a'},{n:'ult',x:900,y:286,r:32,l:['ULTI-','MATE','O'],c:'#ff7ac8'},
 {n:'dodge',x:690,y:424,r:30,l:['DODGE','U'],c:'#5ad0ff'},{n:'shield',x:672,y:506,r:30,l:['BLOCK','S'],c:'#5aff9a'}];
const ptrs=new Map();
function lpos(e){return[(e.clientX-offx)/scale,(e.clientY-offy)/scale]}
function tbAt(x,y){let best=null,bd=1e9;for(const b of TB){const d=Math.hypot(x-b.x,y-b.y);if(d<b.r+12&&d<bd){bd=d;best=b}}return best}
cv.addEventListener('pointerdown',e=>{
  e.preventDefault();SND.resume();SND.startPending();
  if(e.pointerType==='touch')touchMode=true;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const[x,y]=lpos(e);
  if(scene===S.fight&&!G.paused&&G.state!=='end'&&G.state!=='perk'){
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
  if(scene===S.fight&&!G.paused&&G.state!=='end'&&G.state!=='perk'){
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
  if(b.dot){const n=b.dot();if(n>0){const dx=b.x+b.w-6,dy=b.y+4;glow(c,dx,dy,22,'#ff2a2a',.6+.3*Math.sin(t*8));c.beginPath();c.arc(dx,dy,12,0,TAU);c.fillStyle='#ff3030';c.fill();c.lineWidth=2.5;c.strokeStyle='#fff';c.stroke();txt(c,String(n),dx,dy+1,14,'#fff')}}
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
const EDGES=['jump','punch','kick','special','dodge','skill','ult','ranged'];
const ATK={punch:{dur:.3,hs:.07,he:.18,dmg:5,range:82,kb:190,up:0,stun:.28,en:7},kick:{dur:.46,hs:.14,he:.27,dmg:8.5,range:98,kb:330,up:140,stun:.4,en:9}};
const SPDUR={proj:.65,dash:.7,slam:.85,flurry:.95,spin:.8,heal:.85,buff:.75,nova:.85,leap:1.7};
function mkF(idx,x,face,o){return armorInit(mkF0(idx,x,face,o))}
function mkF0(idx,x,face,o){o=o||{};const sp=SPECIES[idx],st=o.st||{},maxhp=100*sp.hp*(o.hpm||1)*(st.hp||1);
  return{idx,sp,x,y:groundY(x),vx:0,vy:0,face,hp:maxhp,maxhp,chip:maxhp,en:o.en==null?25:o.en,combo:0,comboT:0,maxCombo:0,atk:null,stun:0,dodgeT:0,dodgeCd:0,shield:false,sh:100,ko:false,rot:0,rotV:0,t:Math.random()*5,
    sc:sp.sc*(o.scale||1),in:{},buf:{},ai:o.ai||null,pose:newPose(),flash:0,onGround:true,boss:!!o.boss,player:!!o.player,lock:0,dmgM:(o.dmgM||1)*(st.atk||1),hitsTaken:0,rdy:false,defM:(o.defM||1),spdM:(o.spdM||1)*(st.spd||1),enM:st.en||1,cdM:(o.cdM||1)*(st.cd||1),wpM:st.wp||1,wp:o.wp||WI.fists,cd:{skill:0,ult:0,ranged:0},cdMax:{skill:1,ult:1,ranged:1},armor:(o.armor||0)+(st.armor||0),ap:0,apMax:0,apT:0,aspd:(o.aspd||1)*(st.aspd||1),regen:st.regen||0,steal:st.steal||0,gear:o.gear||null,phase:1,buffs:{atk:0,spd:0,def:0},boomOut:false,aura:o.aura||null,tag:o.tag||'',_a:(o.armor||0)+(st.armor||0)}}
function armorInit(f){f.apMax=f.armor>0?18+f.armor*1.2:0;f.ap=f.apMax;return f}
let G=null;
function inRange(f,foe,R){const dx=(foe.x-f.x)*f.face;return dx>-12&&dx<R*f.sc+24*foe.sc&&Math.abs(foe.y-f.y)<100*Math.max(f.sc,foe.sc)}
function pop(x,y,text,col,size){G.pops.push({x,y,t:0,text,col:col||'#fff',size:size||22})}
function healF(f,n){f.hp=Math.min(f.maxhp,f.hp+n);f.chip=Math.max(f.chip,f.hp);SND.play('heal');for(let i=0;i<14;i++)spawnP(f.x+rnd(-30,30),f.y-rnd(0,120),0,-rnd(40,120),.8,5,'#7aff9a','star');pop(f.x,f.y-150*f.sc,'+'+Math.round(n),'#7aff9a')}
function startAtk(f,type){
  if(type==='ranged'){
    if(f.cd.ranged>0)return false;const w=f.wp;let d,base;
    if(w.ranged){if(w.style==='throw'&&f.boomOut)return false;d=w;base=w.style==='throw'?.25:.6;
      f.atk={type:'punch',t:0,hit:false,fired:false,kind:'punch',style:w.style,dmg:d.dmg,range:d.range,dur:d.dur,hs:d.hs,he:d.he,kb:d.kb,up:0,stun:d.stun,en:d.en,heavy:false,w:d,rng:1}}
    else{base=1;f.atk={type:'punch',t:0,hit:false,fired:false,kind:'punch',style:'shoot',bolt:RB[f.sp.id],dmg:5.5,range:80,dur:.42,hs:.16,he:.3,kb:140,up:0,stun:.22,en:6,heavy:false,w:WI.fists,rng:1}}
    f.cd.ranged=f.cdMax.ranged=base*f.cdM;SND.play('swing');f.vx=-f.face*30;return true}
  if(f.player&&(type==='ult'||type==='skill')&&f.cd[type]<=0)track(type==='ult'?'ult':'skill',1);

  if(type==='special'||type==='skill'||type==='ult'){
    let d;
    if(type==='special'){if(f.en<50)return false;d=f.sp.sp;f.en-=50}
    else{if(f.cd[type]>0)return false;d=type==='skill'?f.wp.skill:CULT[f.sp.id];f.cd[type]=f.cdMax[type]=d.cd*f.cdM}
    f.atk={type:'special',slot:type,def:d,kind:d.type,dur:SPDUR[d.type],t:0,hit:false,fired:false,n:0,range:d.type==='dash'?70:100,hs:0,he:0};SND.play(d.type==='heal'?'heal':'special');
    if(d.guard)f.buffs.def=Math.max(f.buffs.def,d.guard);
    for(let i=0;i<20;i++)spawnP(f.x+rnd(-40,40),f.y-rnd(0,140),0,-rnd(50,200),.7,6,d.col,'glow')}
  else{
    let d=type==='kick'?ATK.kick:f.wp;if(type==='punch'&&f.wp.ranged)d=WI.fists;
    f.atk={type,t:0,hit:false,fired:false,kind:type,style:type==='punch'?d.style:undefined,dmg:d.dmg,range:d.range,dur:d.dur,hs:d.hs,he:d.he,kb:d.kb,up:d.up||0,stun:d.stun,en:d.en,heavy:!!d.heavy||type==='kick',w:d};
    SND.play('swing');f.vx=f.face*(type==='punch'?(d.style==='thrust'?150:110):70)}
  return true}
function hitFrom(att,foe,o){const sv=att.face;att.face=foe.x>=att.x?1:-1;const r=takeHit(att,foe,o);att.face=sv;return r}
function takeHit(att,def,o){
  if(def.ko||G.state==='end')return false;
  if(def.dodgeT>0){if(!o.dodgeNoted){pop(def.x,def.y-140*def.sc,'DODGE!','#5ad0ff',20);o.dodgeNoted=1;if(def.player)track('dodge',1)}return false}
  let dmg=o.dmg*att.dmgM*(att.buffs.atk>0?1.4:1)*(att.buffs.spd>0?1.15:1)*(o.wp?att.wpM:1)*(1+.06*Math.min(att.combo,8))*def.defM*(def.buffs.def>0?.5:1);
  if(def.armor>0&&!o.pierce){const full=def.ap>0,prev=dmg*(full?1:.5)*armRed(def.armor);dmg-=prev;def.apT=3;def.armFlash=.2;if(full){def.ap=Math.max(0,def.ap-prev*1.5);if(def.ap<=0)pop(def.x,def.y-168*def.sc,'ARMOR BROKEN!','#7ac8ff',20)}}
  const hx=def.x-att.face*8*def.sc+ (att.x-def.x)*.0,hy=def.y-80*def.sc;
  const facing=(att.x-def.x)*def.face>0;
  if(def.shield&&facing&&def.onGround){
    if(def.player)track('block',1);
    def.sh-=dmg*2.2*(def.wp.id==='shield'?.55:1);def.vx=att.face*Math.min(o.kb,220)*.5;att.vx-=att.face*(o.proj?0:120);
    SND.play('block');burst(hx+def.face*30,hy,10,'#bfe9ff',200,5,'star');ring(hx+def.face*30,hy,'#9ad8ff',40);G.shake=Math.max(G.shake,3);G.hitstop=.04;
    def.hp-=dmg*.08;def.chip=Math.max(def.chip,def.hp);def.en=Math.min(100,def.en+3);
    if(def.sh<=0){def.sh=45;def.stun=1;def.shield=false;pop(def.x,def.y-150*def.sc,'GUARD BREAK!','#ffd24a',22);SND.play('heavy');G.shake=8}
    if(def.hp<=0)koF(att,def,o);
    return false}
  def.hp-=dmg;def.hitsTaken++;if(att.player){G.dmgDealt=(G.dmgDealt||0)+dmg;track('damage',dmg);if(o.rk)track('rhit',1)}if(att.steal>0&&!att.ko)att.hp=Math.min(att.maxhp,att.hp+dmg*att.steal);def.flash=.18;def.atk=null;def.shield=false;
  att.combo++;att.comboT=1.5;att.maxCombo=Math.max(att.maxCombo,att.combo);if(att.player)track('combo',att.combo);
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
function koF(att,def,o){if(att.player)track('ko',1);def.hp=0;def.ko=true;def.atk=null;def.shield=false;def.vx=att.face*((o.kb||200)+330);def.vy=-560;def.onGround=false;def.rotV=att.face*8;
  G.slow=1.3;G.shake=20;G.flashW=.35;SND.play('ko');burst(def.x,def.y-70,40,att.sp.glow,600,10,'star');ring(def.x,def.y-70,'#fff',140);ring(def.x,def.y-70,att.sp.glow,200);
  if(G.state==='fight'){G.state='ko';G.stateT=0}}
function shootProj(f,p){G.projs.push(Object.assign({owner:f,t:0,life:3,rot:0},p))}
function updateAtk(f,foe,dt){
  const a=f.atk;a.t+=dt*(f.aspd||1);const S=a.def||f.sp.sp,pw=f.sp.pow,wf=!!S.wskill;
  if(a.type!=='special'){
    if(a.style==='shoot'){
      if(!a.fired&&a.t>=a.hs){a.fired=true;SND.play('swing');if(a.bolt){const B=a.bolt;shootProj(f,{x:f.x+f.face*56*f.sc,y:f.y-96*f.sc,vx:f.face*B.speed,vy:0,sp:B.speed,dmg:a.dmg*pw,r:B.r,col:B.col,kind:B.kind,ground:false,wp:false,rk:1});burst(f.x+f.face*56*f.sc,f.y-96*f.sc,8,B.col,200,5,'glow')}
      else{shootProj(f,{x:f.x+f.face*56*f.sc,y:f.y-96*f.sc,vx:f.face*880,vy:0,dmg:a.dmg*pw,r:12,col:'#ffe27a',kind:'warrow',ground:false,wp:true,rk:1});burst(f.x+f.face*56*f.sc,f.y-96*f.sc,6,'#ffe27a',160,4,'glow')}}
    }else if(a.style==='throw'){
      if(!a.fired&&a.t>=a.hs){a.fired=true;SND.play('swing');f.boomOut=true;shootProj(f,{x:f.x+f.face*50*f.sc,y:f.y-92*f.sc,vx:f.face*640,vy:0,sp:640,dmg:a.dmg*pw,r:22,col:'#ffb347',kind:'boom',ret:true,ground:false,wp:true,life:3,rk:1})}
    }else if(!a.hit&&a.t>=a.hs&&a.t<=a.he&&inRange(f,foe,a.range)){a.hit=true;takeHit(f,foe,{dmg:a.dmg*pw,kb:a.kb,up:a.up,stun:a.stun,en:a.en,heavy:a.heavy,wp:a.type==='punch'})}
    f.vx*=Math.pow(.01,dt)
  }else if(a.kind==='proj'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.3){a.fired=true;const n=S.n||1;SND.play(S.kind==='fire'?'fire':'special');G.shake=Math.max(G.shake,4);
      for(let i=0;i<n;i++)shootProj(f,{x:f.x+f.face*50*f.sc,y:f.y-(S.kind==='rock'?55:92)*f.sc+(i-(n-1)/2)*(S.kind==='warrow'?24:30),vx:f.face*S.speed,vy:0,sp:S.speed,dmg:S.dmg*pw,r:S.r,col:S.col,kind:S.kind,ground:false,wp:wf,ret:!!S.ret,life:S.ret?3:3});
      if(S.ret)f.boomOut=true;
      if(S.heal)healF(f,S.heal);burst(f.x+f.face*50,f.y-90*f.sc,14,S.col,300,6,'glow')}
  }else if(a.kind==='dash'){
    if(a.t>.12&&a.t<.55){f.vx=f.face*S.speed;if(Math.random()<.8)spawnP(f.x-f.face*30,f.y-rnd(10,100),-f.face*60,rnd(-40,40),.5,rnd(6,12),S.col,S.kind==='dust'?'dust':'glow');
      if(!a.hit&&inRange(f,foe,70)){a.hit=true;takeHit(f,foe,{dmg:S.dmg*pw,kb:480,up:160,stun:.6,en:12,heavy:true,wp:wf});if(S.heal)healF(f,S.heal);f.vx*=.3}}
    else if(a.t>=.55)f.vx*=.8
  }else if(a.kind==='slam'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.35){a.fired=true;SND.play('shock');G.shake=Math.max(G.shake,14);G.flashW=.12;ring(f.x,f.y,S.col,120);ring(f.x,f.y,'#fff',80);burst(f.x,f.y-10,30,S.col,450,8,'star',500);
      for(const d of[-1,1])shootProj(f,{x:f.x+d*40,y:groundY(f.x+d*40),vx:d*420,vy:0,dmg:S.dmg*pw*.8,r:30,col:S.col,kind:S.kind,ground:true,life:1.6,wp:wf});
      if(foe.onGround&&Math.abs(foe.x-f.x)<120*f.sc)takeHit(f,foe,{dmg:S.dmg*pw,kb:420,up:220,stun:.7,en:12,heavy:true,wp:wf})}
  }else if(a.kind==='flurry'){
    const last=S.hits;
    while(a.n<last&&a.t>=.2+(last>5?.12:.15)*a.n){a.n++;f.vx=f.face*170;SND.play('punch');const fin=a.n===last;
      for(let i=0;i<8;i++)spawnP(f.x+f.face*(50+i*6),f.y-rnd(50,110),f.face*200,rnd(-80,80),.3,5,S.col,'star');
      if(inRange(f,foe,100)){takeHit(f,foe,{dmg:S.dmg*pw*(fin?1.8:1),kb:fin?420:60,up:fin?150:0,stun:.32,en:3,heavy:fin,wp:wf})}}
  }else if(a.kind==='spin'){
    f.vx*=.92;
    while(a.n<4&&a.t>=.12+.16*a.n){a.n++;SND.play('swing');const y0=f.y-70*f.sc,fin=a.n===4;ring(f.x,y0,S.col,110);burst(f.x,y0,10,S.col,300,5,'star');
      const R=(S.rad||110)*f.sc+24*foe.sc;if(Math.abs(foe.x-f.x)<R&&Math.abs(foe.y-f.y)<100*Math.max(f.sc,foe.sc))hitFrom(f,foe,{dmg:S.dmg*pw*(fin?1.6:1),kb:fin?420:90,up:fin?150:0,stun:.3,en:4,heavy:fin,wp:wf})}
  }else if(a.kind==='heal'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.25){a.fired=true;healF(f,f.maxhp*S.pct/100);ring(f.x,f.y-70*f.sc,S.col,110);burst(f.x,f.y-70*f.sc,18,S.col,260,6,'star')}
  }else if(a.kind==='buff'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.25){a.fired=true;f.buffs[S.buff]=S.time;pop(f.x,f.y-160*f.sc,BUFFTXT[S.buff],S.col,26);ring(f.x,f.y-70*f.sc,S.col,120);ring(f.x,f.y-70*f.sc,'#fff',80);burst(f.x,f.y-70*f.sc,22,S.col,320,6,'star');G.shake=Math.max(G.shake,5)}
  }else if(a.kind==='nova'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.3){a.fired=true;SND.play('shock');G.shake=Math.max(G.shake,12);G.flashW=.1;ring(f.x,f.y-30,S.col,S.rad*.9);ring(f.x,f.y-30,'#fff',S.rad*.6);burst(f.x,f.y-40,34,S.col,480,8,'star');
      if(Math.abs(foe.x-f.x)<S.rad*f.sc+20&&foe.y>f.y-120)hitFrom(f,foe,{dmg:S.dmg*pw,kb:400,up:200,stun:.65,en:10,heavy:true,wp:wf})}
  }else if(a.kind==='leap'){
    if(!a.leapt){a.leapt=true;f.vy=-880;f.vx=f.face*S.speed;f.onGround=false;f.y-=3}
    else if(!a.fired&&f.onGround&&a.t>.25){a.fired=true;SND.play('shock');G.shake=Math.max(G.shake,13);ring(f.x,f.y,S.col,S.rad);ring(f.x,f.y,'#fff',S.rad*.6);burst(f.x,f.y-10,26,S.col,420,7,'star',500);
      if(Math.abs(foe.x-f.x)<S.rad*f.sc+20&&foe.onGround)hitFrom(f,foe,{dmg:S.dmg*pw,kb:420,up:220,stun:.7,en:12,heavy:true,wp:wf});a.t=Math.max(a.t,a.dur-.3)}
    if(!a.fired)f.vx+=((foe.x>f.x?1:-1)*S.speed*.5-f.vx)*dt*1.5;else f.vx*=.85
  }
  if(a.t>=a.dur)f.atk=null}
function updF(f,foe,dt){
  f.t+=dt;if(f.flash>0)f.flash-=dt;f.comboT-=dt;for(const k in f.cd)if(f.cd[k]>0)f.cd[k]-=dt;for(const k in f.buffs)if(f.buffs[k]>0)f.buffs[k]-=dt;if(f.comboT<=0)f.combo=0;f.dodgeCd-=dt;
  for(const k of EDGES){if(f.buf[k]>0)f.buf[k]-=dt;if(f.in[k]){f.buf[k]=.2;f.in[k]=false}}
  if(f.regen>0&&G.state==='fight'&&!f.ko)f.hp=Math.min(f.maxhp,f.hp+f.maxhp*f.regen*dt);
  if(f.armFlash>0)f.armFlash-=dt;f.apT-=dt;if(f.apMax>0&&f.apT<=0&&f.ap<f.apMax&&!f.ko)f.ap=Math.min(f.apMax,f.ap+dt*(2+f.armor*.04));
  const was=f.en;f.en=Math.min(100,f.en+dt*1.6*f.enM);if(f.player&&was<50&&f.en>=50)SND.play('ready');
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
      const dir=(i.r?1:0)-(i.l?1:0),spd=235*sp.spd*f.spdM*(f.buffs.spd>0?1.25:1)*(f.shield?.18:1);
      const acc=f.onGround?18:6;f.vx+=(dir*spd-f.vx)*Math.min(1,acc*dt);
      if(f.buf.jump>0&&f.onGround&&!f.shield){f.buf.jump=0;f.vy=-800*(.88+.12*sp.jmp)*(f.sc>1.2?.95:1);f.onGround=false;SND.play('jump');burst(f.x,f.y,6,'#ddd',120,5,'dust')}
      if(f.buf.dodge>0&&f.dodgeCd<=0&&f.onGround){f.buf.dodge=0;f.dodgeT=.3;f.dodgeCd=.85;f.vx=(dir||-f.face)*560;SND.play('dodge');burst(f.x,f.y-60,8,sp.glow,160,6,'glow')}
      else if(f.buf.punch>0){f.buf.punch=0;startAtk(f,'punch')}
      else if(f.buf.kick>0){f.buf.kick=0;startAtk(f,'kick')}
      else if(f.buf.ranged>0){f.buf.ranged=0;startAtk(f,'ranged')}
      else if(f.buf.special>0){f.buf.special=0;startAtk(f,'special')}
      else if(f.buf.skill>0){f.buf.skill=0;startAtk(f,'skill')}
      else if(f.buf.ult>0){f.buf.ult=0;startAtk(f,'ult')}
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
function mkAI(diff,boss,v){v=v||{};return{diff:v.fast?Math.min(1.5,diff+.1):diff,boss,t:rnd(.3,.8),shT:0,dodgy:!!v.dodge}}
function aiThink(f,foe,dt){
  const a=f.ai,i=f.in;let diff=a.diff+(f.phase>1?.08*(f.phase-1):0);diff=Math.max(0,Math.min(1.5,diff));
  if(a.shT>0){a.shT-=dt;i.sh=true}else i.sh=false;
  if(foe.ko||f.ko||G.state!=='fight'){i.l=i.r=false;return}
  a.t-=dt;if(a.t>0)return;a.t=rnd(.07,.2)*(1.4-Math.min(1.25,diff)*.7);
  const dx=foe.x-f.x,d=Math.abs(dx),S=f.sp.sp,tw=dx>0?'r':'l',aw=dx>0?'l':'r';
  i.l=i.r=false;
  if(f.stun>0||f.atk)return;
  if(foe.atk&&d<150&&Math.random()<Math.min(.9,.18+diff*.5)){const r=Math.random();
    if(r<(a.dodgy?.3:.55))a.shT=rnd(.35,.7);else if(r<.8&&f.dodgeCd<=0)i.dodge=true;else i.jump=true;return}
  if(diff>.3){const pr=G.projs.find(q=>q.owner===foe&&Math.abs(q.x-f.x)<200&&Math.sign(q.vx)===Math.sign(f.x-q.x));
    if(pr&&Math.random()<.08+diff*.4){const r=Math.random();if(r<.4)a.shT=rnd(.3,.5);else if(r<.7&&f.dodgeCd<=0)i.dodge=true;else i.jump=true;return}}
  if(diff>.45&&foe.atk&&foe.atk.type!=='special'&&foe.atk.t>(foe.atk.he||0)+.02&&d<(f.wp.ranged?80:f.wp.range)*.9*f.sc&&Math.random()<.15+diff*.5){if(f.wp.ranged)i.kick=true;else i.punch=true;return}
  const aiOk=X=>{switch(X.type){case'proj':return d>180;case'dash':return d>140&&d<430;case'slam':return d<150;case'flurry':return d<110;case'spin':return d<120;case'nova':return d<X.rad*.8;case'heal':return f.hp<f.maxhp*.55;case'buff':return d<420;case'leap':return d>170&&d<420;default:return false}};
  if(f.en>=50&&Math.random()<.2+diff*.4&&aiOk(S)){i.special=true;return}
  if(f.cd.skill<=0&&Math.random()<.15+diff*.45&&aiOk(f.wp.skill)){i.skill=true;return}
  const U=CULT[f.sp.id];if(f.cd.ult<=0&&Math.random()<.12+diff*.4&&aiOk(U)){i.ult=true;return}
  if(f.wp.ranged&&f.wp.style==='shoot'){if(d>430)i[tw]=true;else if(d<140){if(Math.random()<.5)i[aw]=true;else if(d<100)i.kick=true}else if(Math.random()<.45+.3*diff)i.ranged=true;return}
  if(f.wp.style==='throw'&&!f.boomOut&&d>150&&d<420&&Math.random()<.5){i.ranged=true;return}
  if(!f.wp.ranged&&f.cd.ranged<=0&&d>230&&d<560&&Math.random()<.25+.35*diff){i.ranged=true;return}
  if(f.boss&&Math.random()<.04)i.jump=true;
  if(d>Math.max(70,(f.wp.ranged?82:f.wp.range)*.85*f.sc)+6+rnd(-8,14)){i[tw]=true;if(Math.random()<.05)i.jump=true;if(Math.random()<.05&&f.dodgeCd<=0&&d>200)i.dodge=true}
  else{const r=Math.random(),ag=Math.min(.9,.45+.4*diff);
    if(r<ag*.6)i.punch=true;else if(r<ag)i.kick=true;else if(r<ag+.12)i[aw]=true;else if(r<ag+.2)a.shT=rnd(.3,.6)}
}

/* ---------- Fight ---------- */
function pauseGame(){G.paused=true;pauseUI.focus=0;SND.play('back')}
function startFight(cfg){cfg.level=cfg.level;
  G={cfg,mode:cfg.mode,dmgDealt:0,runXP:0,runCoins:0,kos:0,perks:[],toasts:[],prevBest:save.best,lvStart:hs(SPECIES[cfg.hero].id).lvl,projs:[],pops:[],shake:0,hitstop:0,slow:0,t:0,state:'intro',stateT:0,paused:false,round:1,wins:[0,0],wave:1,score:0,flashW:0,time:0,start:performance.now(),carry:null,banner:''};
  setArena(cfg.arena);
  if(cfg.mode==='survival')track('endless_wave',1);
  initRound();go(S.fight);
  SND.music(cfg.boss?'boss':'battle');
}
const ENW=WEAPONS.map(w=>w.id);
/* difficulty: tuned with AI-vs-AI sims (see tools/sim) */
const DIFFM=[{n:'EASY',hp:.85,dmg:.8,ai:-.12},{n:'NORMAL',hp:1,dmg:1,ai:0},{n:'HARD',hp:1.2,dmg:1.2,ai:.12}];
const STAGE={hp0:.8,hpK:.033,dm0:.55,dmK:.019,ar:1.1,ai0:.15,aiK:.035,sp0:.94,spK:.004,cd0:1.7,cdK:.025,bh0:.95,bhK:.05,bd:.9,ba:0};
function stageStats(i){i=Math.min(i,26);return{hp:STAGE.hp0+STAGE.hpK*i,dmg:STAGE.dm0+STAGE.dmK*i,armor:STAGE.ar*i,ai:Math.min(1.3,STAGE.ai0+STAGE.aiK*i),spd:STAGE.sp0+STAGE.spK*i,cd:Math.max(.9,STAGE.cd0-STAGE.cdK*i)}}
const BOSSN=['Ancient','Elder','Mythic','Titan','Dread','Alpha'];
function gearFor(armor){const t=Math.min(5,Math.round(armor/12));return t>0?{helm:t,chest:t,limbs:Math.max(0,t-1)}:null}
function enemyFor(cfg){
  const DM=DIFFM[save.diff];
  if(cfg.mode==='story'){const i=cfg.level,L=LEVELS[i],v=VARS[L.var]||{},st=stageStats(i),bossHp=STAGE.bh0+STAGE.bhK*L.ch;
    const armor=st.armor+(L.boss?STAGE.ba:0)+(L.var==='armored'?4:0);
    return{idx:SPI[L.enemy],scale:(L.scale||1)*(v.scale||1),hpm:st.hp*(L.boss?bossHp:1)*(v.hpm||1)*DM.hp,diff:st.ai+DM.ai,boss:L.boss,dmgM:st.dmg*(L.boss?STAGE.bd:1)*(v.dmgM||1)*DM.dmg*(L.wp==='bow'?.8:L.wp?.95:1),defM:v.defM,spdM:st.spd*(v.spdM||1),cdM:st.cd*(v.cdM||1),wp:WI[L.wp||'fists'],tag:v.tag,aura:v.aura,v,armor,gear:gearFor(armor)}}
  if(cfg.mode==='survival'){const w=G.wave,k=w-1;let idx=(Math.random()*SPECIES.length)|0;if(idx===cfg.hero)idx=(idx+1)%SPECIES.length;
    const boss=w%5===0,vk=Object.keys(VARS),v=w>=2&&Math.random()<Math.min(.85,.15+.1*w)?VARS[vk[(Math.random()*vk.length)|0]]:{};
    const armor=Math.min(95,1.6*w+(boss?4:0));
    return{idx,scale:(boss?1.3:1)*(v.scale||1),hpm:(.8+.08*k)*Math.pow(1.02,k)*(boss?1.7:1)*(v.hpm||1)*DM.hp,diff:Math.min(1.5,.15+.045*w)+DM.ai,boss,dmgM:(.55+.03*k)*Math.pow(1.008,k)*(boss?1:1)*(v.dmgM||1)*DM.dmg*.95,defM:v.defM,spdM:Math.min(1.3,.95+.006*w)*(v.spdM||1),cdM:Math.max(.7,1.6-.04*w)*(v.cdM||1),wp:WI[ENW[(Math.random()*ENW.length)|0]],tag:v.tag,aura:v.aura,v,armor,gear:gearFor(armor)}}
  return{idx:cfg.enemy,hpm:1,diff:cfg.diff,dmgM:(.75+.35*cfg.diff)*.92,cdM:1.6,wp:WI[ENW[(Math.random()*ENW.length)|0]],armor:cfg.diff*20,gear:gearFor(cfg.diff*20)}
}
function spawnEnemy(side){const o=enemyFor(G.cfg);const e=mkF(o.idx,side>0?790:170,side>0?-1:1,{scale:o.scale,hpm:o.hpm,boss:o.boss,dmgM:o.dmgM,defM:o.defM,spdM:o.spdM,cdM:o.cdM,wp:o.wp,tag:o.tag,aura:o.aura,armor:o.armor,gear:o.gear,ai:mkAI(o.diff,o.boss,o.v),en:20});e.lock=1.4;e.cd.skill=rnd(2,5)*e.cdM;e.cd.ult=rnd(4,8)*e.cdM;e.cd.ranged=rnd(.5,1.5);
  e.ename=o.boss&&G.cfg.mode==='story'?LEVELS[G.cfg.level].name.replace(/^.*?: /,''):o.boss&&G.cfg.mode==='survival'?BOSSN[(Math.random()*BOSSN.length)|0]+' '+SPECIES[o.idx].name:SPECIES[o.idx].name;return e}
function bossPhase(e){const ph=e.phase;pop(e.x,e.y-190*e.sc,'PHASE '+ph+'!','#ff5a4a',32);toast(ph===3?'BOSS ENRAGED! Hits harder and faster!':'BOSS PHASE 2: It gets angrier!','#ff8a7a');
  e.dmgM*=1.12;e.spdM*=1.07;e.cdM*=.8;e.cd.ult=0;e.cd.skill=Math.min(e.cd.skill,1);e.armor+=6;e.apMax=18+e.armor*1.2;e.ap=e.apMax*.7;e.aura=ph===3?'#ff2a2a':'#ff9a3a';
  G.shake=18;G.flashW=.25;SND.play('shock');ring(e.x,e.y-70,'#ff5a4a',220);ring(e.x,e.y-70,'#fff',140);burst(e.x,e.y-80,40,'#ff7a3a',560,9,'star')}
function toast(text,col){if(G){G.toasts=G.toasts||[];G.toasts.push({text,col:col||'#ffe27a',t:0})}}
const PERKS=[
 {id:'dmg',n:'+15% DAMAGE',d:'All your attacks hit harder',tag:'ATK',col:'#ff9a3a',fn:p=>{p.dmgM*=1.15}},
 {id:'heal',n:'HEAL 50%',d:'Restore half of your life now',tag:'LIFE',col:'#7aff9a',fn:p=>{healF(p,p.maxhp*.5)}},
 {id:'armor',n:'+10 ARMOR',d:'Tougher armor, less damage taken',tag:'ARM',col:'#7ac8ff',fn:p=>{p.armor+=10;p.apMax=18+p.armor*1.2;p.ap=p.apMax}},
 {id:'cd',n:'-15% COOLDOWNS',d:'Skill, ultimate and ranged recharge faster',tag:'CD',col:'#c08aff',fn:p=>{p.cdM*=.85}},
 {id:'spd',n:'+8% SPEED',d:'Move faster and attack 6% faster',tag:'SPD',col:'#c8ff5a',fn:p=>{p.spdM*=1.08;p.aspd*=1.06}},
 {id:'steal',n:'+4% LIFESTEAL',d:'Heal from damage you deal',tag:'STL',col:'#ff6a9a',fn:p=>{p.steal+=.04}},
 {id:'maxhp',n:'+20% MAX LIFE',d:'More max life, and heal that much',tag:'HP',col:'#ff6a7a',fn:p=>{const d=p.maxhp*.2;p.maxhp+=d;p.hp+=d;p.chip=p.hp}},
 {id:'regen',n:'+0.4% REGEN',d:'Heal slowly while fighting',tag:'REG',col:'#5aff9a',fn:p=>{p.regen+=.004}},
 {id:'nitro',n:'NITRO + ULT READY',d:'Fill nitro and refresh your ultimate',tag:'NIT',col:'#b66bff',fn:p=>{p.en=100;p.cd.ult=0}}];
function pickPerks(n){const a=PERKS.slice(),o=[];while(o.length<n&&a.length)o.push(a.splice((Math.random()*a.length)|0,1)[0]);return o}
function initRound(){
  const cfg=G.cfg;
  G.p=mkF(cfg.hero,170,1,{player:true,en:25,st:statsOf(SPECIES[cfg.hero].id),wp:equipped(cfg.hero),gear:save.armor});G.p.lock=1.4;
  G.e=spawnEnemy(1);G.projs=[];G.state='intro';G.stateT=0;G.slow=0;
  if(cfg.mode==='survival'&&G.carry){G.p.hp=G.carry.hp;G.p.en=G.carry.en}
  G.banner=cfg.mode==='duel'?'ROUND '+G.round:cfg.mode==='story'?'LEVEL '+(cfg.level+1):(G.e.boss?'BOSS ':'')+'WAVE '+G.wave;
  SND.play('fight');
}
function killProj(i){const p=G.projs[i];if(p&&p.ret&&p.owner)p.owner.boomOut=false;G.projs.splice(i,1)}
function updateProj(dt){
  for(let i=G.projs.length-1;i>=0;i--){
    const p=G.projs[i],foe=p.owner===G.p?G.e:G.p;p.t+=dt;p.rot+=dt*(p.ret?18:8);
    if(p.ret){const ow=p.owner;if(!p.back&&(p.t>.55||p.x<24||p.x>W-24))p.back=true;
      if(p.back){const tx=ow.x,ty=ow.y-90*ow.sc;p.vx=(tx>p.x?1:-1)*p.sp*1.15;p.y+=(ty-p.y)*Math.min(1,5*dt);if(Math.abs(tx-p.x)<34){killProj(i);continue}}
      if(ow.ko){killProj(i);continue}}
    p.x+=p.vx*dt;
    if(p.ground)p.y=groundY(p.x)-6;
    // trails
    if(p.kind==='fire')spawnP(p.x,p.y+rnd(-10,10),-p.vx*.1,rnd(-60,20),.4,p.r*rnd(.3,.6),Math.random()<.5?'#ff9a2a':'#ff4a1a','glow');
    else if(p.kind==='rainbow')spawnP(p.x,p.y+rnd(-8,8),0,0,.5,9,['#ff7ab8','#ffb347','#ffe45a','#7aff9a','#6fc8ff','#b58cff'][(p.t*30|0)%6],'glow');
    else if(p.kind==='arrow'||p.kind==='warrow')spawnP(p.x,p.y,0,0,.25,3,'#fff6b0','glow');
    else if(p.kind==='rock')spawnP(p.x,p.y+rnd(-14,14),0,rnd(-20,40),.4,5,'#5ff0ff','glow');
    else if(Math.random()<.5)spawnP(p.x,p.y-rnd(0,30),0,-rnd(20,80),.4,rnd(3,7),p.col,'glow');
    if(p.t>p.life||p.x<-60||p.x>W+60){killProj(i);continue}
    if(foe.ko)continue;
    const near=Math.abs(p.x-foe.x)<p.r+26*foe.sc;
    const vert=p.ground?foe.y>=groundY(foe.x)-34:(p.y>foe.y-135*foe.sc-p.r*.5&&p.y<foe.y+p.r*.5);
    if(near&&vert&&!(p.ret&&(p.back?p.hb:p.ho))){
      const dir=Math.sign(p.vx);const att=p.owner;const sv=att.face;att.face=dir;
      const r=takeHit(att,foe,{dmg:p.dmg,kb:p.rk?210:p.kind==='warrow'?200:380,up:p.ground?200:p.rk?40:120,stun:p.rk?.3:p.kind==='warrow'?.3:.5,en:8,heavy:p.kind!=='warrow'&&!p.rk,proj:true,wp:p.wp,rk:p.rk});att.face=sv;
      if(r||foe.shield||foe.dodgeT<=0){burst(p.x,p.y,p.ret?8:16,p.col,350,7,'star');ring(p.x,p.y,p.col,p.ret?40:60);
        if(p.ret){if(p.back)p.hb=true;else{p.ho=true;p.back=true}}else G.projs.splice(i,1)}
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
  if(p.ai){if(G.state==='fight')aiThink(p,e,sdt)}else{p.in.l=inp.held.left;p.in.r=inp.held.right;p.in.sh=inp.held.shield;
  for(const k of EDGES)if(inp.press[k])p.in[k]=true}
  inp.press={};
  if(G.state==='intro'){if(G.stateT>1.5){G.state='fight';G.stateT=0}}
  if(G.state==='fight'||G.state==='ko'||G.state==='intro'){
    if(e.ai&&G.state!=='intro')aiThink(e,p,sdt);
    updF(p,e,sdt);updF(e,p,sdt);updateProj(sdt);
    if(e.boss&&!e.ko&&G.state==='fight'){const r=e.hp/e.maxhp,ph=r<.34?3:r<.67?2:1;if(ph>e.phase){e.phase=ph;bossPhase(e)}}
  }
  updateParts(sdt);
  for(let i=G.pops.length-1;i>=0;i--){const q=G.pops[i];q.t+=sdt;if(q.t>1.1)G.pops.splice(i,1)}
  for(let i=G.toasts.length-1;i>=0;i--){G.toasts[i].t+=dt;if(G.toasts[i].t>3)G.toasts.splice(i,1)}
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
    if(pw){const wv=G.wave,boss=G.e.boss,hid=SPECIES[cfg.hero].id;G.score+=100*wv+Math.round(G.p.hp)+(boss?500:0);G.kos++;
      const xp=12+wv*6+(boss?40:0),co=8+wv*4+(boss?30:0);G.runXP+=xp;G.runCoins+=co;save.coins+=co;const lv=addXP(hid,xp);if(wv>save.best)save.best=wv;persist();
      G.wave++;track('endless_wave',G.wave);
      G.carry={hp:Math.min(G.p.maxhp,G.p.hp+G.p.maxhp*.2),en:Math.min(100,G.p.en+30)};G.p.hp=G.carry.hp;G.p.chip=G.p.hp;G.p.en=G.carry.en;G.p.ap=Math.min(G.p.apMax,G.p.ap+G.p.apMax*.5);
      G.projs=[];G.state='perk';G.stateT=0;G.perkInfo={wave:wv,xp,co,lv,boss};G.choices=pickPerks(3);buildPerkUI();SND.play('win');if(lv>0)SND.play('unlock')}
    else endFight(false)}
}
function nextWave(){G.e=spawnEnemy(G.p.x<480?1:-1);G.e.lock=1.2;G.p.ko=false;G.p.boomOut=false;G.state='intro';G.stateT=0;G.banner=(G.e.boss?'BOSS ':'')+'WAVE '+G.wave;G.projs=[];SND.play('fight')}
function endFight(win){
  const cfg=G.cfg;G.state='end';if(window.__SIM){G.simWin=win;return}
  const r={win,mode:cfg.mode,dmg:Math.round(G.dmgDealt||0),kos:G.kos,perks:G.perks.slice(),time:G.time,combo:Math.max(G.p.maxCombo,0),hp:Math.round(G.p.hp),cfg,newUnlock:null,newWeapon:null,wave:G.wave,score:G.score};
  const hid=SPECIES[cfg.hero].id,L=cfg.level;let xp=0,coins=0;
  if(cfg.mode==='story'){const LV=LEVELS[L],first=win&&save.cleared<L+1;
    xp=win?40+L*4:10;coins=win?22+L*3:5;xp+=Math.min(40,r.combo*(win?3:1));coins+=Math.min(30,r.combo*2);
    if(win&&LV.boss){xp+=60;coins+=50}if(win&&G.p.hitsTaken===0){xp+=25;coins+=15;r.perfect=true}if(first){xp+=30;coins+=40}
    if(win&&first){save.cleared=L+1;const rid=REWARD[L];if(rid)r.newUnlock=SPI[rid];const nw=WEAPONS.find(w=>w.lvl===L+1);if(nw)r.newWeapon=nw}}
  else if(cfg.mode==='duel'){xp=win?45+Math.round((cfg.diff||.5)*40):12;coins=win?25+Math.round((cfg.diff||.5)*20):5;xp+=Math.min(30,r.combo*2);coins+=Math.min(20,r.combo)}
  else{if(G.wave>G.prevBest){xp+=20;coins+=20}}
  const sv=cfg.mode==='survival';r.xp=xp+(sv?G.runXP:0);r.coins=coins+(sv?G.runCoins:0);r.hero=cfg.hero;const hb=hs(hid);r.lvFrom=sv?G.lvStart:hb.lvl;addXP(hid,xp);r.levels=hb.lvl-r.lvFrom;r.lvTo=hb.lvl;save.coins+=coins;
  if(cfg.mode==='story'&&win){track('win_story',1);if(LEVELS[L].boss)track('boss',1)}if(cfg.mode==='duel'&&win)track('win_duel',1);if(win&&r.perfect)track('perfect',1);
  if(cfg.mode==='survival'){r.waveReached=G.wave-(0);if(G.wave>G.prevBest)r.record=true;if(G.wave>save.best)save.best=G.wave;
    const ent={wave:G.wave,score:G.score,hero:hid,kos:G.kos,t:Date.now()};save.board.push(ent);save.board.sort((a,b)=>b.wave-a.wave||b.score-a.score);save.board=save.board.slice(0,10);r.rank=save.board.indexOf(ent)+1;r.rank=r.rank>0?r.rank:0}
  persist();
  SND.play(win||cfg.mode==='survival'&&G.wave>1?'win':'lose');if(r.newUnlock!=null||r.newWeapon||r.levels>0)setTimeout(()=>SND.play('unlock'),900);
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
function chip(c,x,y,w,h,key,label,col,f,slot,t,sub,fill){
  const cd=slot&&f.cd[slot]>0?f.cd[slot]:0,mx=slot?(f.cdMax[slot]||1):1,rdy=cd<=0&&(fill==null||fill>=1);
  c.save();rr(c,x,y,w,h,7);c.fillStyle='rgba(10,5,30,.8)';c.fill();
  c.save();rr(c,x,y,w,h,7);c.clip();
  if(fill!=null){c.fillStyle=col;c.globalAlpha=.5;c.fillRect(x,y+h*(1-clamp(fill,0,1)),w,h*clamp(fill,0,1));c.globalAlpha=1}
  else if(cd>0){c.fillStyle=col;c.globalAlpha=.4;c.fillRect(x,y,w*(1-cd/mx),h);c.globalAlpha=1}
  else{c.fillStyle=col;c.globalAlpha=.55+.2*Math.sin(t*8);c.fillRect(x,y,w,h);c.globalAlpha=1}
  c.restore();
  rr(c,x,y,w,h,7);c.lineWidth=2;c.strokeStyle=rdy?'#fff':'rgba(255,255,255,.45)';c.stroke();
  txt(c,label,x+w/2,y+10,10.5,'#fff','center','#000',3);
  c.beginPath();c.arc(x+11,y+26,7.5,0,TAU);c.fillStyle=rdy?'#fff':'#bbb';c.fill();txt(c,key,x+11,y+26.5,10.5,'#1a0a30');
  if(cd>0)txt(c,Math.ceil(cd)+'s',x+w/2+8,y+26,13,'#fff','center','#000',3);else if(sub)txt(c,sub,x+w/2+8,y+26,9.5,'#fff','center','#000',3);
  c.restore()}
function drawHUD(c,t){
  const p=G.p,e=G.e;
  const side=(f,x,flip,name)=>{
    const w=340,r=f.hp/f.maxhp,ax=flip?x+w:x,bx=flip?x+w-w*.62:x,bc=bx+w*.31;
    rr(c,x-6,6,w+12,f.player?176:96,14);c.fillStyle='rgba(10,5,30,.58)';c.fill();
    txt(c,name,ax,17,17,'#fff',flip?'right':'left','#000',4);
    drawBar(c,x,28,w,19,r,hpCol(c,r),flip,f.chip/f.maxhp);
    // boss phase ticks
    if(f.boss){for(const q of[.34,.67]){const tx=flip?x+w-w*q:x+w*q;c.fillStyle='#fff';c.fillRect(tx-1,28,2,19)}}
    txt(c,'LIFE '+Math.ceil(f.hp)+' / '+Math.round(f.maxhp),x+w/2,38,12,'#fff','center','#000',3);
    // armor
    if(f.armor>0){const ar=f.apMax?f.ap/f.apMax:0;drawBar(c,bx,51,w*.62,12,ar,f.armFlash>0?'#fff':'#6ab8ff',flip);
      txt(c,'ARMOR '+Math.round(f.armor)+'  (-'+Math.round(armRed(f.armor)*100)+'% dmg)'+(f.ap<=0?' BROKEN':''),bc,57.5,10,'#fff','center','#000',3)}
    else txt(c,'ARMOR 0',ax,57,10,'#9ab',flip?'right':'left');
    // nitro
    const rdy=f.en>=50;
    drawBar(c,bx,66,w*.62,11,f.en/100,rdy?grad(c,x,0,x+w,0,['#b66bff','#5ad0ff','#b66bff']):'#7a5aff',flip);
    txt(c,rdy?'NITRO READY - press I':'NITRO '+Math.round(f.en)+'%',bc,71.5,10,'#fff','center','#000',3);
    // block meter
    const kx=flip?x:x+w*.65;drawBar(c,kx,66,w*.35,11,f.sh/100,f.sh<30?'#ff9a5a':'#5aff9a',flip);txt(c,'BLOCK',kx+w*.175,71.5,10,'#fff','center','#000',3);
    if(f.player){
      const labels=[['J','CLOSE','#ff7a3a',null,null,'melee'],['H','RANGED','#4ad0ff','ranged',null,'shoot'],['K','KICK','#ffc23a',null,null,'strong'],['L','SKILL','#5aff9a','skill',null,'weapon'],['O','ULT','#ff7ac8','ult',null,'power'],['I','NITRO','#b66bff',null,Math.min(1,f.en/50),f.en>=50?'READY':'']];
      labels.forEach((l,k)=>chip(c,x+k*57,82,54,37,l[0],l[1],l[2],f,l[3],t,l[5],l[4]));
      const cw=f.wp.ranged;
      txt(c,'CLOSE ATTACK (J): '+(cw?'Punch (melee)':f.wp.name+' (melee)'),x,129,11,'#ffe9b0','left','#000',3);
      txt(c,'RANGED ATTACK (H): '+(cw?f.wp.name+' (ranged)':RB[f.sp.id].name+' (ranged)'),x,142,11,'#bfeaff','left','#000',3);
      txt(c,'WEAPON SKILL (L): '+f.wp.skill.name,x,155,11,'#d8ffd8','left','#000',3);
      txt(c,'ULTIMATE (O): '+CULT[f.sp.id].name,x,168,11,'#ffd0f0','left','#000',3);
    }else txt(c,f.wp.name+(f.wp.ranged?' (ranged)':' (melee)'),ax,88,11,'#ffe9b0',flip?'right':'left','#000',3);
    let by=f.player?192:106;for(const k in f.buffs)if(f.buffs[k]>0){txt(c,{atk:'RAGE',spd:'FRENZY',def:'ARMOR UP'}[k]+' '+Math.ceil(f.buffs[k]),ax,by,12,'#ffd24a',flip?'right':'left','#000',3);by+=14}
  };
  side(p,22,false,SPECIES[p.idx].name+' · '+SPECIES[p.idx].short);
  side(e,W-22-340,true,(e.tag&&!(e.boss&&G.cfg.mode==='story')?e.tag+' ':'')+(e.ename||SPECIES[e.idx].name)+(e.boss?' ☠':''));
  // center
  const cfg=G.cfg;
  let top=cfg.mode==='story'?'LEVEL '+(cfg.level+1):cfg.mode==='survival'?'ENDLESS · WAVE '+G.wave:'ROUND '+G.round;
  txt(c,top,480,22,18,'#ffe27a','center','#000',4);
  if(cfg.mode==='duel')txt(c,G.wins[0]+' - '+G.wins[1],480,42,16,'#fff','center','#000',3);
  if(cfg.mode==='survival')txt(c,'SCORE '+G.score+'   BEST '+Math.max(save.best,G.wave),480,42,13,'#fff','center','#000',3);
  c.beginPath();c.arc(480,66,16,0,TAU);c.fillStyle='rgba(10,5,30,.6)';c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.stroke();
  c.fillStyle='#fff';c.fillRect(474,58,4,16);c.fillRect(483,58,4,16);
  if(e.boss&&e.phase>1)txt(c,'BOSS PHASE '+e.phase,480,96,13,'#ff8a7a','center','#000',4);
  if(p.combo>=2){const s=1+Math.min(.5,p.combo*.05);txt(c,p.combo+' HIT COMBO',22+0,230,26*s,'#ffd24a','left','#7a2a00',6)}
  G.toasts.forEach((q,k)=>{const a=Math.min(1,(3-q.t)*2,q.t*5);c.globalAlpha=a;rr(c,250,120+k*34,460,28,10);c.fillStyle='rgba(10,5,30,.8)';c.fill();txt(c,q.text,480,134+k*34,15,q.col,'center','#000',3);c.globalAlpha=1});
}
function drawTouch(c,t){
  if(!touchMode)return;
  c.save();
  for(const b of TB){
    const on=inp.held[b.n];c.globalAlpha=on?.9:.62;
    c.beginPath();c.arc(b.x,b.y,b.r,0,TAU);c.fillStyle=b.c?(on?b.c:'rgba(20,10,50,.78)'):(on?'#9a8aff':'rgba(20,10,50,.7)');c.fill();
    c.lineWidth=4;c.strokeStyle=b.c||'#9a8aff';c.stroke();
    c.fillStyle='#fff';
    if((b.n==='skill'||b.n==='ult'||b.n==='ranged')&&G&&G.p){const f=G.p,cd=Math.max(0,f.cd[b.n]),mx=f.cdMax[b.n]||1;
      if(cd>0){c.save();c.globalAlpha=.8;c.beginPath();c.moveTo(b.x,b.y);c.arc(b.x,b.y,b.r-2,-Math.PI/2+TAU*(1-cd/mx),-Math.PI/2+TAU);c.closePath();c.fillStyle='rgba(0,0,0,.72)';c.fill();c.restore()}
      else{c.globalAlpha=.95;c.beginPath();c.arc(b.x,b.y,b.r+4+Math.sin(time*8)*2,0,TAU);c.strokeStyle=b.c;c.lineWidth=3;c.stroke();c.globalAlpha=on?.9:.75}
      if(cd>0){c.globalAlpha=.95;txt(c,Math.ceil(cd)+'s',b.x,b.y-b.r*.28,15,'#fff','center','#000',4);c.globalAlpha=.9}}
    if(b.n==='special'&&G&&G.p){const f=G.p,fr=Math.min(1,f.en/50);c.save();c.beginPath();c.arc(b.x,b.y,b.r-2,0,TAU);c.clip();c.globalAlpha=.55;c.fillStyle=b.c;c.fillRect(b.x-b.r,b.y+b.r-b.r*2*fr,b.r*2,b.r*2*fr);c.restore();if(fr>=1){c.beginPath();c.arc(b.x,b.y,b.r+4+Math.sin(time*8)*2,0,TAU);c.strokeStyle=b.c;c.lineWidth=3;c.stroke()}}
    c.globalAlpha=.98;
    if(b.l){const n=b.l.length,fs=b.r>=48?14:b.r>=36?12:b.r>=32?10.5:11;
      b.l.forEach((ln,k)=>{const last=k===n-1&&n>1&&ln.length===1;
        const y=b.y+(k-(n-1)/2)*(fs+1)+(last?3:0);
        if(last){c.beginPath();c.arc(b.x,y,fs*.62,0,TAU);c.fillStyle='rgba(255,255,255,.9)';c.fill();txt(c,ln,b.x,y+.5,fs*.85,'#1a0a30')}
        else txt(c,ln,b.x,y,fs,'#fff','center','#000',3)})}
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
  if(e.aura&&!e.ko){glow(c,e.x,e.y-80*e.sc,130*e.sc,e.aura,.32+.12*Math.sin(t*4))}
  for(const f of[p,e]){if(f.ko)continue;if(f.buffs.atk>0)glow(c,f.x,f.y-80*f.sc,110*f.sc,'#ff5a2a',.4);if(f.buffs.spd>0)glow(c,f.x,f.y-80*f.sc,110*f.sc,'#cfe0ff',.4);if(f.buffs.def>0){glow(c,f.x,f.y-80*f.sc,110*f.sc,'#7ad8ff',.35);c.save();c.strokeStyle='rgba(160,230,255,.7)';c.lineWidth=3;c.beginPath();c.arc(f.x,f.y-70*f.sc,70*f.sc,0,TAU);c.stroke();c.restore()}}
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
  if(G.state==='perk')drawPerk(c,t);else drawTouch(c,t);
  if(G.paused){c.fillStyle='rgba(5,0,20,.7)';c.fillRect(0,0,W,H);txt(c,'PAUSED',480,110,64,'#fff','center','#3a1a9a',10);uiDrawBtns(c,pauseUI,t)}
}
function drawProj(c,q){
  c.save();const x=q.x,y=q.y,d=Math.sign(q.vx)||1;
  switch(q.kind){
  case'fire':glow(c,x,y,q.r*2.6,'#ff6a1a',.9);ell(c,x,y,q.r,q.r*.8,grad(c,x-q.r,0,x+q.r,0,['#ffcf4a','#ff5a1a']));ell(c,x+d*4,y,q.r*.5,q.r*.4,'#fff4c0');break;
  case'rainbow':glow(c,x,y,q.r*2.6,'#ff9ae8',.8);['#ff7ab8','#ffb347','#ffe45a','#7aff9a','#6fc8ff','#b58cff'].forEach((col,i)=>ell(c,x-d*i*5,y,q.r-i*2.2,q.r-i*2.2,col));break;
  case'arrow':glow(c,x,y,22,'#ffe27a',.7);c.strokeStyle='#fff6b0';c.lineWidth=4;c.beginPath();c.moveTo(x-d*28,y);c.lineTo(x+d*14,y);c.stroke();poly(c,[x+d*24,y,x+d*10,y-7,x+d*10,y+7],'#ffe27a');break;
  case'warrow':glow(c,x,y,18,'#ffe27a',.6);c.strokeStyle='#d8b878';c.lineWidth=4;c.beginPath();c.moveTo(x-d*30,y);c.lineTo(x+d*14,y);c.stroke();poly(c,[x+d*26,y,x+d*12,y-6,x+d*12,y+6],'#e8eef8','#6a7a98',1.5);poly(c,[x-d*30,y,x-d*38,y-6,x-d*24,y-1],'#ff7a7a');break;
  case'crescent':glow(c,x,y,q.r*2.4,'#bfe9ff',.8);c.translate(x,y);c.scale(d,1);c.fillStyle=grad(c,-q.r,0,q.r,0,['#7ad8ff','#ffffff']);c.beginPath();c.arc(-q.r*.6,0,q.r*1.4,-1.1,1.1);c.arc(-q.r*.1,0,q.r*1.1,1.1,-1.1,true);c.fill();break;
  case'boom':glow(c,x,y,q.r*2.2,q.col,.6);c.translate(x,y);c.rotate(q.rot);c.strokeStyle='#5a2a08';c.lineWidth=q.r*.55;c.lineCap='round';c.beginPath();c.moveTo(-q.r*.9,-q.r*.9);c.quadraticCurveTo(q.r*.5,-q.r*.5,q.r*.9,q.r);c.stroke();c.strokeStyle='#ffc050';c.lineWidth=q.r*.33;c.stroke();break;
  case'ink':glow(c,x,y,q.r*2.4,'#b66bff',.7);for(let i=0;i<4;i++)ell(c,x-d*i*10,y+Math.sin(q.t*12+i)*6,q.r*(1-i*.15),q.r*.8*(1-i*.15),i%2?'#6a2aaa':'#9a4aea');ell(c,x+d*8,y-4,q.r*.25,q.r*.25,'#fff');break;
  case'rock':glow(c,x,y,q.r*2.2,'#5ff0ff',.5);c.translate(x,y);c.rotate(q.rot);poly(c,[-q.r,-q.r*.4,-q.r*.3,-q.r,q.r*.8,-q.r*.7,q.r,q.r*.2,q.r*.2,q.r,-q.r*.8,q.r*.7],grad(c,0,-q.r,0,q.r,['#c9c5b8','#6a665c']),'#3d3b38',3);glow(c,0,0,q.r*.7,'#5ff0ff',.6);break;
  default:{ // ground waves
    const col=q.col;glow(c,x,y-10,70,col,.5);c.fillStyle=col;c.strokeStyle='#fff';c.lineWidth=2;
    for(let i=-2;i<=2;i++){const hh=(q.kind==='ice'?46:34)-Math.abs(i)*8;poly(c,[x+i*16-9,y+4,x+i*16,y-hh,x+i*16+9,y+4],col,'#fff',1.5)}}
  }
  c.restore();
}

/* ---------- Missions ---------- */
const dayStr=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const todayStr=()=>QS.get('date')||dayStr();
const yesterStr=()=>{const t=QS.get('date')?new Date(QS.get('date')+'T12:00:00'):new Date();t.setDate(t.getDate()-1);return dayStr(t)};
const DAILY_POOL=[
 {id:'duel3',t:'Win 3 duels',ev:'win_duel',tgt:3,r:{c:70,x:60}},
 {id:'rhit20',t:'Land 20 ranged hits',ev:'rhit',tgt:20,r:{c:60,x:50}},
 {id:'ult5',t:'Use your ultimate 5 times',ev:'ult',tgt:5,r:{c:55,x:45}},
 {id:'wave5',t:'Reach wave 5 in Endless',ev:'endless_wave',max:1,tgt:5,r:{c:90,x:80,p:1}},
 {id:'story2',t:'Win 2 Story levels',ev:'win_story',tgt:2,r:{c:60,x:55}},
 {id:'combo5',t:'Land a 5-hit combo',ev:'combo',max:1,tgt:5,r:{c:45,x:40}},
 {id:'perfect1',t:'Win a fight without taking a hit',ev:'perfect',tgt:1,r:{c:80,x:70,p:1}},
 {id:'ko8',t:'Defeat 8 enemies',ev:'ko',tgt:8,r:{c:60,x:50}},
 {id:'skill8',t:'Use weapon skills 8 times',ev:'skill',tgt:8,r:{c:50,x:45}},
 {id:'dmg800',t:'Deal 800 damage',ev:'damage',tgt:800,r:{c:55,x:50}},
 {id:'block15',t:'Block 15 attacks',ev:'block',tgt:15,r:{c:45,x:40}},
 {id:'dodge10',t:'Dodge 10 attacks',ev:'dodge',tgt:10,r:{c:50,x:45}}];
const DP={};DAILY_POOL.forEach(d=>DP[d.id]=d);
const ACH=[
 {id:'chap',n:'Chapter Champion',d:'Clear story chapters',tiers:[1,2,4,6],get:()=>Math.floor(save.cleared/5)},
 {id:'boss',n:'Boss Slayer',d:'Defeat story bosses',tiers:[1,3,6,12],get:()=>mst('boss')},
 {id:'arsenal',n:'Arsenal',d:'Own different weapons',tiers:[3,5,8,10],get:()=>WEAPONS.filter(w=>weaponOwned(w.id)).length},
 {id:'hlvl',n:'Hero Training',d:'Reach hero level',tiers:[5,10,20,30],get:()=>Math.max(1,...SPECIES.map(sp=>hs(sp.id).lvl))},
 {id:'combo',n:'Combo Master',d:'Best combo in one fight',tiers:[5,10,15,25],get:()=>mst('combo')},
 {id:'endless',n:'Endless Explorer',d:'Reach an Endless wave',tiers:[5,10,20,30],get:()=>save.best},
 {id:'duel',n:'Duelist',d:'Win duels vs the AI',tiers:[3,10,25,50],get:()=>mst('win_duel')},
 {id:'shot',n:'Sharpshooter',d:'Land ranged attack hits',tiers:[25,100,300,1000],get:()=>mst('rhit')},
 {id:'gear',n:'Armor Collector',d:'Armor tiers owned (max 15)',tiers:[3,6,10,15],get:()=>save.armor.helm+save.armor.chest+save.armor.limbs},
 {id:'heroes',n:'Creature Collector',d:'Unlock heroes',tiers:[4,6,8,10],get:()=>SPECIES.filter((_,i)=>isUnlocked(i)).length},
 {id:'ult',n:'Ultimate Power',d:'Use creature ultimates',tiers:[10,50,150,400],get:()=>mst('ult')},
 {id:'perfect',n:'Untouchable',d:'Win fights taking no damage',tiers:[1,5,15],get:()=>mst('perfect')}];
const ACHR=[{c:60,x:40},{c:120,x:80,p:1},{c:200,x:140,p:1},{c:350,x:240,p:2}];
const mis=()=>save.mis;
function mst(k){const m=mis();m.st=m.st||{};return m.st[k]||0}
function hashS(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function ensureDay(){const m=mis(),t=todayStr();if(m.day!==t||!Array.isArray(m.d)||m.d.length!==3){
  const rn=mkRng(hashS(t)),pool=DAILY_POOL.slice(),pick=[];while(pick.length<3){pick.push(pool.splice((rn()*pool.length)|0,1)[0])}
  m.day=t;m.d=pick.map(d=>({id:d.id,p:0,cl:false}));m.bonusCl=false}
  m.st=m.st||{};m.ach=m.ach||{};m.streak=+m.streak||0;m.last=m.last||''}
function track(ev,n){
  try{ensureDay();const m=mis();n=n==null?1:n;
    if(ev==='combo'||ev==='endless_wave'){if(ev==='combo')m.st.combo=Math.max(m.st.combo||0,n)}else m.st[ev]=(m.st[ev]||0)+n;
    for(const q of m.d){const D=DP[q.id];if(D.ev!==ev||q.p>=D.tgt)continue;q.p=D.max?Math.max(q.p,Math.min(D.tgt,n)):Math.min(D.tgt,q.p+n);
      if(q.p>=D.tgt){toast('DAILY MISSION COMPLETE: '+D.t+'  (claim in Missions)','#7aff9a');SND.play('ready')}}
    persistSoon()}catch(e){console.error(e)}}
let _ps=0;function persistSoon(){if(_ps)return;_ps=setTimeout(()=>{_ps=0;persist()},400)}
function streakNow(){const m=mis();return m.last===todayStr()||m.last===yesterStr()?m.streak:0}
function bonusReward(){const m=mis(),ns=(m.last===yesterStr()?m.streak:m.last===todayStr()?m.streak:0)+1,k=Math.min(7,ns);return{c:50+25*k,x:30+15*k,p:ns%7===0?2:ns%3===0?1:0,ns}}
function achTier(a){return mis().ach[a.id]||0}
function achClaimable(a){const t=achTier(a);return t<a.tiers.length&&a.get()>=a.tiers[t]}
function missionsReady(){try{ensureDay();const m=mis();let n=0;m.d.forEach(q=>{if(!q.cl&&q.p>=DP[q.id].tgt)n++});if(m.d.every(q=>q.cl)&&!m.bonusCl)n++;ACH.forEach(a=>{if(achClaimable(a))n++});return n}catch(e){return 0}}
function giveReward(r){save.coins+=r.c||0;const h=hs(SPECIES[sel.hero].id);if(r.x)addXP(SPECIES[sel.hero].id,r.x);if(r.p)h.pts+=r.p;persist()}
const rewTxt=r=>'+'+r.c+' coins  +'+r.x+' XP'+(r.p?'  +'+r.p+' upgrade pt'+(r.p>1?'s':''):'');

/* ---------- Endless perks ---------- */
const perkUI=mkScene({cols:3,btns:[]});
function buildPerkUI(){perkUI.focus=1;perkUI.btns=G.choices.map((pk,i)=>({x:50+i*296,y:150,w:272,h:200,fn:()=>{if(G.stateT<.7)return;pickPerk(pk)},draw(c,b,focus,t){
  c.save();glow(c,b.x+b.w/2,b.y+b.h/2,b.w*.8,pk.col,focus?.5:.2);rr(c,b.x,b.y,b.w,b.h,16);c.fillStyle=grad(c,0,b.y,0,b.y+b.h,[rgba2(pk.col,focus?.85:.5),'#1a1040']);c.fill();c.lineWidth=focus?6:3;c.strokeStyle=focus?'#fff':'rgba(255,255,255,.55)';c.stroke();
  c.beginPath();c.arc(b.x+b.w/2,b.y+60,38,0,TAU);c.fillStyle='rgba(10,5,30,.7)';c.fill();c.lineWidth=4;c.strokeStyle=pk.col;c.stroke();txt(c,pk.tag,b.x+b.w/2,b.y+61,24,pk.col,'center','#000',4);
  txt(c,pk.n,b.x+b.w/2,b.y+122,22,'#fff','center','#000',5);wrapText(c,pk.d,b.x+22,b.y+144,b.w-44,17,14,'#ffe9b0');
  txt(c,(i+1)+'  ·  tap or press Enter',b.x+b.w/2,b.y+b.h-16,12,focus?'#fff':'#bbb','center','#000',3);c.restore()}}))}
function pickPerk(pk){pk.fn(G.p);G.perks.push(pk.n);SND.play('unlock');pop(G.p.x,G.p.y-160*G.p.sc,pk.n,pk.col,24);ring(G.p.x,G.p.y-70,pk.col,140);nextWave()}
function drawPerk(c,t){const I=G.perkInfo;c.fillStyle='rgba(5,0,25,.92)';c.fillRect(0,0,W,H);
  txt(c,I.boss?'BOSS DEFEATED!':'WAVE '+I.wave+' CLEARED!',480,52,46,'#ffd24a','center','#2a0a5a',10);
  txt(c,'+'+I.xp+' XP     +'+I.co+' COINS     Life +20%'+(I.lv>0?'     LEVEL UP!':''),480,100,20,'#fff','center','#000',5);
  txt(c,'CHOOSE A PERK for the next wave (lasts this run)',480,132,18,'#7ad8ff','center','#000',4);
  uiDrawBtns(c,perkUI,t);
  txt(c,'Next: WAVE '+G.wave+(G.wave%5===0?'  -  BOSS WAVE!':'')+'      Perks so far: '+(G.perks.length?G.perks.length:'none'),480,386,16,G.wave%5===0?'#ff8a7a':'#ffe9b0','center','#000',4);
  if(G.perks.length)wrapText(c,G.perks.slice(-8).join('  ·  '),120,410,720,18,13,'#bfe');
  txt(c,'Coins: '+save.coins+'   Hero Lv '+hs(SPECIES[G.cfg.hero].id).lvl,480,500,15,'#ffe27a','center','#000',4)}

/* ---------- Scenes ---------- */
const S={};let scene=null,sceneT=0;
function go(s){scene=s;sceneT=0;if(s.enter)s.enter();SND.startPending()}
function curUI(){return scene===S.fight?(G.paused?pauseUI:G.state==='perk'?perkUI:null):scene}
const demos=SPECIES.map((sp,i)=>{const f=mkF(i,0,1);f.demo=true;return f});
function drawDemo(c,i,x,y,sc,face,t,atkOn,wp,gear){const f=demos[i];f.gear=gear?save.armor:null;f.x=x;f.y=y;f.sc=SPECIES[i].sc*sc;f.face=face;f.onGround=true;f.t=t+i;f.vx=0;f.flash=0;f.wp=wp&&wp.id!=='fists'?wp:null;f.boomOut=false;
  const cyc=(t*.8+i*.37)%3;f.atk=null;
  if(atkOn&&cyc<.5)f.atk=wp?{type:'punch',style:wp.style,t:cyc/.5*wp.dur,hs:wp.hs,he:wp.he,dur:wp.dur,range:wp.range}:{type:'punch',t:cyc*.6,hs:.07,he:.18,dur:.3,range:80};
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
S.title=mkScene({cols:2,
  enter(){SND.music('menu');const B=[['STORY MODE',()=>{sel.mode='story';openSelect()}],['ENDLESS MODE',()=>{sel.mode='survival';openSelect()}],['DUEL VS AI',()=>{sel.mode='duel';openSelect()}],['MISSIONS',()=>go(S.missions)],['ARMORY & UPGRADES',()=>{sel.mode='lab';openSelect()}],['HOW TO PLAY',()=>go(S.how)],['DIFFICULTY: '+DIFFM[save.diff].n,()=>{save.diff=(save.diff+1)%3;persist();S.title.enter();S.title.focus=6}],['SOUND: '+(SND.muted?'OFF':'ON'),()=>{SND.setMuted(!SND.muted);save.muted=SND.muted;persist();S.title.enter();S.title.focus=7}]];
    this.btns=B.map((l,k)=>({x:150+(k%2)*370,y:238+((k/2)|0)*52,w:290,h:42,size:k===4?17:20,label:l[0],fn:l[1]}));this.btns[3].dot=missionsReady;SND.music('menu')},
  draw(c,t){bgDraw(c,t,0);floorStrip(c,0);
    drawDemo(c,0,110,GROUND+10,1.5,1,t,true);drawDemo(c,2,850,GROUND+10,1.4,-1,t+1,true);drawDemo(c,8,50,GROUND+120,.8,1,t+2,false);drawDemo(c,5,910,GROUND+125,.8,-1,t+3,false);
    logo(c,t,110);uiDrawBtns(c,this,t);
    const n=missionsReady();
    txt(c,'Coins: '+save.coins+'   Best Endless wave: '+save.best+'   Daily streak: '+streakNow()+(n?'   ★ '+n+' mission reward'+(n>1?'s':'')+' ready!':''),480,H-34,14,'#ffe9b0','center','#000',4);
    txt(c,'Clear Story levels to unlock creatures & weapons. Buy armor and upgrades to beat tougher foes!',480,H-14,13,'#bfe','center','#000',3)}});
// How to play
S.how=mkScene({back(){go(S.title)},pg:0,enter(){this.pg=0;this.build()},
  build(){this.btns=[{x:40,y:480,w:180,h:44,label:'BACK',fn:()=>go(S.title)},{x:720,y:480,w:200,h:44,label:this.pg?'◀ CONTROLS':'GUIDE ▶',fn:()=>{S.how.pg^=1;S.how.build();S.how.focus=1}}];this.focus=1},
  draw(c,t){bgDraw(c,t,2);c.fillStyle='rgba(10,5,40,.86)';rr(c,24,12,912,458,20);c.fill();
    if(!this.pg){
      txt(c,'HOW TO PLAY - CONTROLS',480,36,30,'#ffd24a','center','#000',7);
      txt(c,'ACTION',44,66,12,'#bfe','left');txt(c,'KEYBOARD',250,66,12,'#bfe','left');txt(c,'iPAD BUTTON',420,66,12,'#bfe','left');txt(c,'WHAT IT DOES',590,66,12,'#bfe','left');
      const L=[['MOVE','A / D  or  ◀ ▶','◀ ▶ pad','Walk left and right','#fff'],['JUMP','W / ↑ / Space','JUMP','Hop over attacks and shots','#fff'],
       ['CLOSE ATTACK','J  or  Z','CLOSE ATTACK','Melee hit with your weapon (short range)','#ff9a5a'],['RANGED ATTACK','H  or  B','RANGED ATTACK','Shoots a bolt/arrow/boomerang. Short cooldown','#7ad8ff'],
       ['KICK','K  or  X','KICK','Strong melee kick, launches foes','#ffc23a'],['BLOCK','Hold S / ↓ / Shift','BLOCK','Stops damage until shield breaks','#7aff9a'],
       ['DODGE','U  or  V','DODGE','Quick roll - cannot be hit','#7ad8ff'],['WEAPON SKILL','L','WEAPON SKILL','Your weapon\'s special move (cooldown)','#7aff9a'],
       ['ULTIMATE','O','ULTIMATE','Your creature\'s power move (long cooldown)','#ff9ae0'],['NITRO','I  or  C','NITRO','Creature special. Needs half a nitro bar','#c08aff'],['PAUSE','P or Esc','II button (top)','Pause menu','#fff']];
      L.forEach((r,i)=>{const y=90+i*32;txt(c,r[0],44,y,16,r[4],'left','#000',4);txt(c,r[1],250,y,15,'#fff','left');txt(c,r[2],420,y,13,'#ffe9b0','left');txt(c,r[3],590,y,12,'#cfe','left')});
      wrapText(c,'Every weapon is CLOSE or RANGED. Bow and Boomerang are ranged weapons: H shoots them and J becomes a quick punch. With any other weapon, H fires your creature\'s own bolt.',44,432,872,16,13,'#ffe9b0')}
    else{
      txt(c,'HOW TO PLAY - GUIDE',480,36,30,'#ffd24a','center','#000',7);
      const G2=[['BARS','LIFE (green) is your health. ARMOR (blue) cuts damage and its plating wears down, then slowly regrows. NITRO fills as you fight.'],
       ['UPGRADES','Win battles for XP + coins. Level up to earn points, then spend them on LIFE (health, regen, lifesteal), ARMOR, SPEED (move, attack) and POWER.'],
       ['ARMOR GEAR','Buy and upgrade a HELM, CHEST ARMOR and GLOVES & BOOTS with coins. You can see them on your creature!'],
       ['STORY','30 levels, 6 chapters. Each level is tougher. Bosses have 3 phases and get angry when hurt. Use difficulty on the title screen.'],
       ['ENDLESS','Fight wave after wave that never stops getting harder. Pick a PERK after each wave. Boss every 5 waves. Your best waves are saved.'],
       ['MISSIONS','3 new daily missions each day plus long-term goals. Claim coins, XP and upgrade points. Play daily for a streak bonus!']];
      G2.forEach((r,i)=>{const y=70+i*62;txt(c,r[0],44,y+8,16,'#7ad8ff','left','#000',4);wrapText(c,r[1],190,y,720,18,14.5,'#fff')});
      wrapText(c,'Tip: use RANGED ATTACK to chip foes from far away, CLOSE ATTACK up close, and BLOCK or DODGE when they swing!',44,446,872,18,14,'#ffe9b0')}
    uiDrawBtns(c,this,t)}});

const sel={mode:'story',hero:0,enemy:1,arena:0,diff:.55,level:-1};
function openSelect(){
  const lab=sel.mode==='lab';
  S.select.cfg={title:lab?'CHOOSE A HERO TO EQUIP':sel.mode==='story'?'CHOOSE YOUR HERO':sel.mode==='survival'?'ENDLESS: CHOOSE YOUR HERO':'CHOOSE YOUR FIGHTER',opp:false,onPick(i){sel.hero=i;
    if(lab)openArmory(()=>go(S.title),'DONE',()=>go(S.title),()=>openSelect());
    else if(sel.mode==='story'){sel.level=-1;openArmory(()=>go(S.map),'TO STORY MAP',()=>openSelect(),()=>openSelect())}
    else if(sel.mode==='survival')openArmory(()=>startFight({mode:'survival',hero:sel.hero,arena:(Math.random()*ARENAS.length)|0}),'FIGHT!',()=>openSelect(),()=>openSelect());
    else openArmory(()=>openOpp(),'CHOOSE FOE',()=>openSelect(),()=>openSelect())}};
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
      if(!S.select.cfg.opp&&!lock)txt(c,'Lv '+hs(sp.id).lvl,b.x+b.w-8,b.y+14,13,'#ffe27a','right','#000',3);
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
    txt(c,'NITRO SPECIAL',500,326,14,'#b8a0ff','left');txt(c,sp.sp.name,500,350,24,sp.glow,'left','#000',5);
    txt(c,{proj:'Ranged blast',dash:'Charging dash',slam:'Ground-shaking shockwave',flurry:'Multi-hit flurry'}[sp.sp.type]+(sp.sp.heal?' + heals you':''),500,378,14,'#fff','left');
    txt(c,'ULT: '+CULT[sp.id].name+' - '+CULT[sp.id].desc,500,402,13,'#ffd0f0','left');
    txt(c,lock?'Locked: clear Story level '+unlockLevel(i):'Tap again or press ENTER to choose',500,428,14,lock?'#ff9a8a':'#9aff9a','left')}});
// Arena select (duel)
S.arenaSel=mkScene({cols:4,back(){openOpp()},
  enter(){this.btns=ARENAS.map((A,i)=>({x:25+(i%4)*232,y:66+((i/4)|0)*140,w:215,h:121,twoTap:true,fn:()=>{sel.arena=i;startFight({mode:'duel',hero:sel.hero,enemy:sel.enemy,arena:i,diff:sel.diff})},draw(c,b,focus,t){
      c.save();rr(c,b.x,b.y,b.w,b.h,14);c.clip();c.translate(b.x,b.y);c.scale(b.w/W,b.w/W);A.draw.call(A,c,t,0);c.restore();
      c.save();rr(c,b.x,b.y,b.w,b.h,14);c.lineWidth=focus?6:2;c.strokeStyle=focus?'#ffd24a':'rgba(255,255,255,.5)';c.stroke();c.restore();
      c.fillStyle='rgba(0,0,0,.6)';c.fillRect(b.x+4,b.y+b.h-32,b.w-8,28);txt(c,A.name,b.x+b.w/2,b.y+b.h-18,17,'#fff','center','#000',4)}}))
    .concat([{x:640,y:350,w:280,h:56,label:'DIFFICULTY: '+(sel.diff<.4?'EASY':sel.diff<.7?'NORMAL':'HARD'),fn:()=>{sel.diff=sel.diff<.4?.55:sel.diff<.7?.9:.25;S.arenaSel.enter();S.arenaSel.focus=ARENAS.length}},{x:640,y:420,w:280,h:56,label:'BACK',fn:()=>openOpp()}]);},
  draw(c,t){bgDraw(c,t,4);txt(c,'CHOOSE ARENA',480,36,32,'#ffd24a','center','#000',7);uiDrawBtns(c,this,t)}});
// Story map
S.map=mkScene({cols:5,ch:0,selNode:0,back(){go(S.title)},
  enter(){SND.music('menu');const base=sel.level>=0?sel.level:Math.min(save.cleared,NLV-1);this.ch=(base/5)|0;this.selNode=base%5;this.build();this.focus=this.selNode},
  build(){const ch=this.ch,A=this,pos=i=>[130+i*175,(i%2?250:310)+Math.sin(i*1.3)*14];
    const nodes=[0,1,2,3,4].map(k=>{const i=ch*5+k,L=LEVELS[i];return{x:pos(k)[0]-34,y:pos(k)[1]-34,w:68,h:68,twoTap:true,clickLocked:true,lv:i,
      fn:()=>{if(i>save.cleared){SND.play('back');return}sel.level=i;startFight({mode:'story',hero:sel.hero,level:i,arena:L.arena,boss:L.boss})},
      draw(c,b,focus,t){const open=i<=save.cleared,done=i<save.cleared,Ar=ARENAS[L.arena],cx=b.x+34,cy=b.y+34,r=L.boss?42:32;
        glow(c,cx,cy,r*2,open?Ar.gLine:'#444',focus?.7:.25);
        c.beginPath();c.arc(cx,cy,r+(i===save.cleared?Math.sin(t*6)*3:0),0,TAU);c.fillStyle=open?grad(c,0,cy-r,0,cy+r,[Ar.gTop,Ar.gBot]):'#3a3a4a';c.fill();c.lineWidth=focus?6:3;c.strokeStyle=focus?'#fff':L.boss?'#ff5a4a':'#ffd24a';c.stroke();
        txt(c,open?String(i+1):'🔒',cx,cy,open?(L.boss?30:26):22,'#fff','center','#000',5);
        if(L.boss)poly(c,[cx-22,cy-r-2,cx-14,cy-r-20,cx-5,cy-r-6,cx,cy-r-22,cx+5,cy-r-6,cx+14,cy-r-20,cx+22,cy-r-2],'#ff5a4a','#000',2);
        if(L.var&&open)txt(c,VARS[L.var].tag,cx,cy+r+14,11,VARS[L.var].aura,'center','#000',3);
        if(done)txt(c,'★',cx+r-6,cy-r+6,24,'#ffe27a','center','#000',4)}}});
    const chOpen=k=>k*5<=save.cleared;
    this.btns=nodes.concat([{x:30,y:466,w:110,h:50,label:'BACK',fn:()=>go(S.title)},
      {x:150,y:466,w:150,h:50,label:'ARMORY',size:20,fn:()=>openArmory(()=>go(S.map),'DONE',()=>go(S.map),null,true)},
      {x:310,y:466,w:170,h:50,label:'UPGRADES',size:20,fn:()=>openUpgrade(()=>go(S.map))},
      {x:490,y:466,w:60,h:50,label:'◀',fn:()=>{if(A.ch>0){A.ch--;A.build();A.focus=0}}},
      {x:556,y:466,w:60,h:50,label:'▶',fn:()=>{if(A.ch<CHAPTERS.length-1&&chOpen(A.ch+1)){A.ch++;A.build();A.focus=0}else SND.play('back')}},
      {x:630,y:466,w:300,h:50,label:'START!',fn:()=>A.btns[A.selNode].fn()}]);
    this.btns[8].disabled=ch===0;this.btns[9].disabled=!(ch<CHAPTERS.length-1&&chOpen(ch+1))},
  draw(c,t){if(this.focus<5)this.selNode=this.focus;const i=this.ch*5+this.selNode,L=LEVELS[i],sp=SPECIES[SPI[L.enemy]],pos=k=>[130+k*175,(k%2?250:310)+Math.sin(k*1.3)*14];
    bgDraw(c,t,L.arena);
    txt(c,'STORY MODE',480,30,30,'#ffd24a','center','#000',7);
    c.fillStyle='rgba(10,5,40,.62)';rr(c,170,52,620,50,12);c.fill();
    txt(c,'CHAPTER '+(this.ch+1)+': '+CHAPTERS[this.ch].name.toUpperCase(),480,70,22,'#fff','center','#000',5);txt(c,CHAPTERS[this.ch].sub+'   •   '+Math.max(0,Math.min(5,save.cleared-this.ch*5))+'/5 cleared',480,91,13,'#bfe','center','#000',3);
    c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=6;c.setLineDash([12,10]);c.beginPath();for(let k=0;k<5;k++){const p=pos(k);k?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])}c.stroke();c.setLineDash([]);
    uiDrawBtns(c,this,t);
    c.fillStyle='rgba(10,5,40,.75)';rr(c,30,366,900,88,14);c.fill();
    const open=i<=save.cleared;
    txt(c,'Level '+(i+1)+': '+L.name,50,388,20,L.boss?'#ff8a7a':'#fff','left','#000',4);
    txt(c,open?'vs '+(L.var?VARS[L.var].tag+' ':'')+sp.name+' the '+sp.short+'  •  '+ARENAS[L.arena].sub+(L.wp?'  •  wields '+WI[L.wp].name:''):'Locked - clear the previous level',50,414,14,'#bfe','left');
    const nw=WEAPONS.find(w=>w.lvl===i+1);
    txt(c,(nw?'Clear this level to unlock the '+nw.name+'!  ':'')+(REWARD[i]&&i>=save.cleared?'Unlocks '+SPECIES[SPI[REWARD[i]]].name+'!':''),50,438,13,'#ffe27a','left','#000',3);
    if(open){c.save();drawDemo(c,SPI[L.enemy],860,196,.5,-1,t,true,L.wp?WI[L.wp]:null);c.restore()}
    txt(c,SPECIES[sel.hero].name+' Lv '+hs(SPECIES[sel.hero].id).lvl,100,216,13,'#ffe9b0','center','#000',3);
    drawDemo(c,sel.hero,100,196,.5,1,t,true,equipped(sel.hero),true);
    txt(c,'Coins: '+save.coins,900,30,16,'#ffe27a','right','#000',4);
    const pt=hs(SPECIES[sel.hero].id).pts;if(pt>0)txt(c,pt+' upgrade point'+(pt>1?'s':'')+' to spend!',480,126,15,'#7aff9a','center','#000',4);
  }});
// Pause
const pauseUI=mkScene({btns:vmenu([['RESUME',()=>{G.paused=false}],['RESTART',()=>{G.paused=false;startFight(G.cfg)}],['SOUND: ON/OFF',()=>{SND.setMuted(!SND.muted);save.muted=SND.muted;persist()}],['QUIT TO MENU',()=>{G.paused=false;go(S.title)}]],170,66),back(){G.paused=false}});
// Fight scene
S.fight={enter(){},update(dt){updateFight(dt)},draw(c,t){drawFight(c,t)}};
// Result
function showResult(r){S.result.r=r;
  const nx=r.mode==='story'&&r.win&&r.cfg.level<NLV-1;
  const b=[];
  if(nx)b.push(['NEXT LEVEL',()=>{const l=r.cfg.level+1;sel.level=l;startFight({mode:'story',hero:r.cfg.hero,level:l,arena:LEVELS[l].arena,boss:LEVELS[l].boss})}]);
  b.push([r.mode==='story'?(r.win?'REPLAY LEVEL':'TRY AGAIN'):r.mode==='duel'?'REMATCH':'PLAY AGAIN',()=>startFight(r.cfg.mode==='survival'?Object.assign({},r.cfg,{arena:(Math.random()*ARENAS.length)|0}):r.cfg)]);
  if(r.mode==='story')b.push(['LEVEL MAP',()=>{sel.level=r.cfg.level+(nx?1:0);go(S.map)}]);
  b.push(['ARMORY',()=>openArmory(()=>go(S.result),'DONE',()=>go(S.result),null,true)]);
  b.push(['UPGRADES'+(hs(SPECIES[r.hero].id).pts>0?' ('+hs(SPECIES[r.hero].id).pts+')':''),()=>openUpgrade(()=>go(S.result))]);
  b.push(['MAIN MENU',()=>go(S.title)]);
  S.result.btns=b.map((l,k)=>({x:k%2?500:160,y:r.mode==='survival'?396+((k/2)|0)*54:312+((k/2)|0)*56,w:300,h:46,label:l[0],fn:l[1]}));S.result.focus=0;
  setTimeout(()=>{if(scene!==S.result)go(S.result)},0)}
S.result=mkScene({r:null,cols:2,enter(){SND.music(this.r.win?'win':'menu')},
  draw(c,t){const r=this.r;drawFightFrozen(c,t);c.fillStyle=r.mode==='survival'?'rgba(5,0,25,.94)':'rgba(5,0,25,.78)';c.fillRect(0,0,W,H);
    if(r.mode==='survival'){drawEndlessOver(c,t,r);return}
    const vic=r.win||r.mode==='survival',hid=SPECIES[r.hero].id,h=hs(hid);
    txt(c,r.mode==='survival'?'GAME OVER':r.win?'VICTORY!':'DEFEATED',480,50,56,vic&&r.win?'#ffd24a':'#ff8a7a','center','#2a0a5a',12);
    if(r.mode==='survival'){txt(c,'Waves cleared: '+(r.wave-1)+'   Score: '+r.score+(r.record?'   ★ NEW RECORD! ★':''),480,100,20,'#fff','center','#000',5)}
    else txt(c,'Best combo: '+r.combo+'    Time: '+r.time.toFixed(1)+'s    HP left: '+r.hp+(r.perfect?'    ★ PERFECT!':''),480,100,19,'#fff','center','#000',5);
    // rewards
    c.fillStyle='rgba(30,15,80,.7)';rr(c,160,122,640,112,16);c.fill();c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=2;c.stroke();
    txt(c,'+'+r.xp+' XP',250,148,28,'#7ad8ff','center','#000',6);txt(c,'+'+r.coins+' COINS',480,148,28,'#ffe27a','center','#000',6);
    txt(c,SPECIES[r.hero].name+'  Lv '+h.lvl,710,148,22,'#fff','center','#000',5);
    const need=h.lvl>=MAXLV?1:xpNeed(h.lvl),fr=h.lvl>=MAXLV?1:h.xp/need;
    drawBar(c,200,176,560,18,fr,grad(c,200,0,760,0,['#3a9aff','#7ad8ff']),false);txt(c,h.lvl>=MAXLV?'MAX LEVEL':h.xp+' / '+need+' XP',480,186,12,'#fff','center','#000',3);
    if(r.levels>0)txt(c,'LEVEL UP!  Lv '+r.lvFrom+' → '+r.lvTo+'   ('+h.pts+' point'+(h.pts===1?'':'s')+' to spend in UPGRADES)',480,214,19,'#7aff9a','center','#000',5);
    else if(h.pts>0)txt(c,h.pts+' upgrade point'+(h.pts===1?'':'s')+' ready to spend!',480,214,17,'#ffd24a','center','#000',4);
    if(r.cfg.mode==='story'&&r.win&&r.cfg.level===NLV-1)txt(c,'YOU ARE THE MYTHIC CHAMPION!',480,262,26,'#ffd24a','center','#000',6);
    let ny=262;
    if(r.newUnlock!=null){const i=r.newUnlock;txt(c,'NEW CREATURE UNLOCKED: '+SPECIES[i].name+'!',480,ny,22,'#7aff9a','center','#000',6);ny+=0;c.save();c.beginPath();c.rect(0,0,W,H);c.clip();drawDemo(c,i,880,420,.7,-1,t,true);drawDemo(c,i,80,420,.7,1,t,true);c.restore();glow(c,880,360,100,SPECIES[i].glow,.4);glow(c,80,360,100,SPECIES[i].glow,.4)}
    if(r.newWeapon)txt(c,'NEW WEAPON UNLOCKED: '+r.newWeapon.name+'!',480,r.newUnlock!=null?288:ny,22,'#7aff9a','center','#000',6);
    uiDrawBtns(c,this,t)}});
function drawFightFrozen(c,t){if(G){drawFight(c,G.t)}}

/* ---------- Armory & Upgrades ---------- */
function openArmory(cont,label,back,heroBack,fromHub){
  const A=S.armory;A.cont=cont;A.contLabel=label;A.backFn=back;A.fromHub=!!fromHub;A.hero=sel.hero;A.focus=Math.max(0,WEAPONS.indexOf(equipped(sel.hero)));go(A)}
function openUpgrade(back){S.upgrade.backFn=back;S.upgrade.hero=sel.hero;S.upgrade.focus=0;go(S.upgrade)}
function bar2(c,x,y,w,v,col){drawBar(c,x,y,w,9,clamp(v,0,1),col,false)}
S.armory=mkScene({cols:5,cont:null,contLabel:'FIGHT!',backFn:null,hero:0,view:1,note:'',noteT:0,
  back(){this.backFn&&this.backFn()},
  enter(){const A=this;SND.music('menu');
    const cards=WEAPONS.map((w,i)=>({x:30+(i%5)*130,y:62+((i/5)|0)*112,w:122,h:104,idx:i,fn:()=>A.pick(i),draw(c,b,focus,t){
      const tagc=w.ranged?'#1a8ad0':'#c8601a';
      const own=weaponOwned(w.id),eq=equipped(A.hero).id===w.id;
      c.save();rr(c,b.x,b.y,b.w,b.h,12);c.fillStyle=grad(c,0,b.y,0,b.y+b.h,[eq?'#2a7a4a':own?'#4a3aa0':'#33304a','#1a1040']);c.fill();c.lineWidth=focus?5:2;c.strokeStyle=focus?'#fff':eq?'#7aff9a':'rgba(255,255,255,.35)';c.stroke();
      c.globalAlpha=own?1:.4;drawWeaponIcon(c,w,b.x+b.w/2,b.y+46,.8,SPECIES[A.hero].glow,t);c.globalAlpha=1;
      rr(c,b.x+6,b.y+6,w.ranged?52:46,15,7);c.fillStyle=tagc;c.fill();txt(c,w.ranged?'RANGED':'CLOSE',b.x+6+(w.ranged?26:23),b.y+14,9,'#fff');
      txt(c,w.name,b.x+b.w/2,b.y+b.h-30,12,'#fff','center','#000',3);
      if(eq)txt(c,'EQUIPPED',b.x+b.w/2,b.y+b.h-12,11,'#7aff9a','center','#000',3);
      else if(own)txt(c,'owned',b.x+b.w/2,b.y+b.h-12,11,'#cfc','center','#000',3);
      else{txt(c,'🔒 Lv '+w.lvl+' / '+w.cost+'c',b.x+b.w/2,b.y+b.h-12,11,'#ffe27a','center','#000',3)}
      c.restore()}}));
    this.act={x:434,y:466,w:258,h:50,label:'',size:19,fn:()=>A.action()};
    this.btns=cards.concat([{x:30,y:466,w:100,h:50,label:'BACK',fn:()=>{SND.play('back');A.back()}},{x:138,y:466,w:150,h:50,label:'UPGRADES',size:17,fn:()=>openUpgrade(()=>go(A))},{x:296,y:466,w:130,h:50,label:'ARMOR',size:17,fn:()=>openGear(()=>go(A))},this.act,{x:700,y:466,w:230,h:50,label:'',size:18,fn:()=>{A.cont&&A.cont()}}]);
    this.cb=this.btns[this.btns.length-1]},
  pick(i){const w=WEAPONS[i];this.view=i;if(weaponOwned(w.id)){save.loadout[SPECIES[this.hero].id]=w.id;persist();SND.play('ready');this.msg('Equipped '+w.name+'!')}else this.msg('Locked - see below')},
  msg(m){this.note=m;this.noteT=1.6},
  action(){const w=WEAPONS[this.view];if(weaponOwned(w.id)){this.pick(this.view);return}
    if(save.coins>=w.cost){save.coins-=w.cost;save.weapons.push(w.id);save.loadout[SPECIES[this.hero].id]=w.id;persist();SND.play('unlock');this.msg('Bought the '+w.name+'!')}else{SND.play('back');this.msg('Not enough coins - win more battles!')}},
  draw(c,t,dt){bgDraw(c,t,6);c.fillStyle='rgba(10,5,40,.6)';c.fillRect(0,0,W,H);
    if(this.noteT>0)this.noteT-=1/60;
    const hero=SPECIES[this.hero];if(this.focus<10)this.view=this.focus;
    const w=WEAPONS[this.view],own=weaponOwned(w.id),eq=equipped(this.hero).id===w.id;
    txt(c,'ARMORY',160,30,30,'#ffd24a','center','#000',7);txt(c,hero.name+' Lv '+hs(hero.id).lvl,440,30,20,'#fff','center','#000',5);txt(c,'Coins: '+save.coins,920,30,20,'#ffe27a','right','#000',5);
    uiDrawBtns(c,this,t);
    // hero preview
    c.save();rr(c,700,50,230,224,14);c.fillStyle='rgba(10,5,40,.65)';c.fill();c.clip();glow(c,815,200,120,hero.glow,.45);drawDemo(c,this.hero,815,252,.95,1,t,true,equipped(this.hero),true);c.restore();
    // detail
    c.fillStyle='rgba(10,5,40,.72)';rr(c,30,292,900,164,14);c.fill();
    drawWeaponIcon(c,w,90,380,1.3,hero.glow,t);
    txt(c,w.name,170,309,23,'#fff','left','#000',5);
    rr(c,170,322,w.ranged?132:122,17,8);c.fillStyle=w.ranged?'#1a8ad0':'#c8601a';c.fill();txt(c,wType(w),170+(w.ranged?66:61),331,10.5,'#fff');
    wrapText(c,w.desc,170,346,330,15,12.5,'#ffe9b0');
    [['DAMAGE',w.dmg/11],['REACH',Math.min(1,(w.ranged?400:w.range)/150)],['SPEED',clamp(1.4-w.dur*1.3,.1,1)]].forEach((r,k)=>{txt(c,r[0],170,398+k*18,11,'#bfe','left');bar2(c,236,393+k*18,150,r[1],'#ffb02a')});
    txt(c,'CLOSE ATTACK (J):',520,312,13,'#ff9a5a','left','#000',3);txt(c,w.ranged?'quick punch (melee)':w.name+' swing (melee)',668,312,13,'#fff','left');
    txt(c,'RANGED ATTACK (H):',520,332,13,'#7ad8ff','left','#000',3);txt(c,w.ranged?w.name+' shot (ranged, short cooldown)':RB[hero.id].name+' (ranged, 1s cooldown)',680,332,12,'#fff','left');
    txt(c,'WEAPON SKILL (L): '+w.skill.name,520,356,13,w.skill.col,'left','#000',3);txt(c,w.skill.desc+'  ·  cooldown '+w.skill.cd+'s',520,373,12,'#fff','left');
    txt(c,'ULTIMATE (O): '+CULT[hero.id].name,520,396,13,'#ffa0e0','left','#000',3);txt(c,CULT[hero.id].desc+'  ·  cooldown '+CULT[hero.id].cd+'s',520,413,12,'#fff','left');
    txt(c,own?(eq?'Equipped!':'Owned - tap EQUIP'):'Unlock: clear Story level '+w.lvl+' or buy for '+w.cost+' coins',520,440,13,own?'#7aff9a':'#ffd24a','left','#000',3);
    if(this.noteT>0){c.globalAlpha=Math.min(1,this.noteT);txt(c,this.note,365,274,20,'#fff','center','#000',5);c.globalAlpha=1}
    this.act.label=own?(eq?'EQUIPPED ✓':'EQUIP'):'BUY ('+w.cost+' COINS)';this.act.disabled=!own&&save.coins<w.cost;this.act.clickLocked=true;
    this.cb.label=this.contLabel}});
function openGear(back){S.gear.backFn=back;S.gear.hero=sel.hero;S.gear.focus=0;go(S.gear)}
function heroStats(id){const sp=SPECIES[SPI[id]],st=statsOf(id);return{hp:Math.round(100*sp.hp*st.hp),armor:st.armor,red:Math.round(armRed(st.armor)*100),spd:Math.round((st.spd-1)*1000)/10,aspd:Math.round((st.aspd-1)*100)}}
S.upgrade=mkScene({cols:1,backFn:null,hero:0,note:'',noteT:0,
  back(){this.backFn&&this.backFn()},
  enter(){const U=this;SND.music('menu');
    const rows=UPS.map((u,i)=>({x:250,y:46+i*39,w:680,h:36,idx:i,fn:()=>U.buy(u),draw(c,b,focus,t){
      const h=hs(SPECIES[U.hero].id),lv=h.up[u.k];
      c.save();rr(c,b.x,b.y,b.w,b.h,9);c.fillStyle=focus?'rgba(122,92,255,.65)':'rgba(20,10,60,.72)';c.fill();c.lineWidth=focus?4:2;c.strokeStyle=focus?'#fff':'rgba(255,255,255,.35)';c.stroke();
      rr(c,b.x+7,b.y+9,56,17,8);c.fillStyle=u.gc;c.globalAlpha=.9;c.fill();c.globalAlpha=1;txt(c,u.g,b.x+35,b.y+18,10.5,'#1a0a30');
      txt(c,u.n,b.x+72,b.y+11,15,'#fff','left','#000',4);txt(c,u.d,b.x+72,b.y+27,10.5,'#bfe','left');
      txt(c,'NOW  '+u.f(lv),b.x+318,b.y+11,12,'#fff','left');txt(c,lv<UPMAX?'NEXT '+u.f(lv+1):'MAXED OUT',b.x+318,b.y+27,12,lv<UPMAX?'#7aff9a':'#ffd24a','left');
      for(let k=0;k<UPMAX;k++){rr(c,b.x+452+k*16,b.y+11,13,14,4);c.fillStyle=k<lv?grad(c,0,b.y,0,b.y+b.h,['#ffe27a','#ff9a2a']):'rgba(255,255,255,.12)';c.fill()}
      const can=h.pts>0&&lv<UPMAX;
      rr(c,b.x+b.w-50,b.y+4,44,28,8);c.fillStyle=lv>=UPMAX?'#555':can?'#3ac060':'#444';c.fill();txt(c,lv>=UPMAX?'MAX':'+1',b.x+b.w-28,b.y+19,15,'#fff');
      c.restore()}}));
    this.btns=rows.concat([{x:30,y:466,w:110,h:50,label:'BACK',fn:()=>{SND.play('back');U.back()}},
      {x:150,y:466,w:150,h:50,label:'RESET POINTS',size:15,fn:()=>U.reset()},
      {x:310,y:466,w:150,h:50,label:'ARMOR GEAR',size:15,fn:()=>openGear(()=>go(U))},
      {x:470,y:466,w:460,h:50,label:'',size:16,fn:()=>U.buyPoint()}]);this.bp=this.btns[this.btns.length-1]},
  msg(m){this.note=m;this.noteT=1.8},
  buy(u){const h=hs(SPECIES[this.hero].id);if(h.up[u.k]>=UPMAX){SND.play('back');this.msg(u.n+' is maxed!');return}if(h.pts<=0){SND.play('back');this.msg('No points - win battles to level up!');return}
    h.pts--;h.up[u.k]++;persist();SND.play('unlock');this.msg(u.n+' upgraded!')},
  reset(){const id=SPECIES[this.hero].id,h=hs(id),n=spentPts(id);if(!n){this.msg('Nothing to reset');return}h.pts+=n;UPS.forEach(u=>h.up[u.k]=0);persist();SND.play('back');this.msg('Points refunded - spend them again!')},
  buyPoint(){const cost=pointCost();if(save.coins>=cost){save.coins-=cost;save.bought++;hs(SPECIES[this.hero].id).pts++;persist();SND.play('ready');this.msg('+1 upgrade point!')}else{SND.play('back');this.msg('Need '+cost+' coins')}},
  draw(c,t){bgDraw(c,t,3);c.fillStyle='rgba(10,5,40,.6)';c.fillRect(0,0,W,H);
    const hero=SPECIES[this.hero],h=hs(hero.id),hsx=heroStats(hero.id);if(this.noteT>0)this.noteT-=1/60;
    txt(c,'UPGRADES',130,26,26,'#ffd24a','center','#000',7);txt(c,'Coins: '+save.coins,920,26,18,'#ffe27a','right','#000',5);
    uiDrawBtns(c,this,t);
    c.save();rr(c,20,46,222,408,14);c.fillStyle='rgba(10,5,40,.65)';c.fill();c.clip();glow(c,131,150,110,hero.glow,.45);drawDemo(c,this.hero,131,222,.82,1,t,true,equipped(this.hero),true);c.restore();
    txt(c,hero.name+' the '+hero.title.split(' ').slice(-1)[0],131,64,16,'#fff','center','#000',5);
    txt(c,'LEVEL '+h.lvl,131,244,22,'#ffd24a','center','#000',6);
    const need=h.lvl>=MAXLV?1:xpNeed(h.lvl);drawBar(c,40,258,182,13,h.lvl>=MAXLV?1:h.xp/need,grad(c,40,0,222,0,['#3a9aff','#7ad8ff']),false);
    txt(c,h.lvl>=MAXLV?'MAX LEVEL':h.xp+' / '+need+' XP',131,265,10,'#fff','center','#000',3);
    txt(c,'POINTS: '+h.pts,131,288,22,h.pts>0?'#7aff9a':'#ccc','center','#000',6);
    [['LIFE',hsx.hp+' HP','#ff6a7a'],['ARMOR',Math.round(hsx.armor)+'  (-'+hsx.red+'% dmg)','#7ac8ff'],['MOVE SPEED','+'+hsx.spd+'%','#c8ff5a'],['ATTACK SPEED','+'+hsx.aspd+'%','#c8ff5a']].forEach((r,k)=>{txt(c,r[0],34,316+k*21,12,r[2],'left','#000',3);txt(c,r[1],228,316+k*21,12,'#fff','right','#000',3)});
    txt(c,'Armor total includes gear + plating',131,408,10,'#bfe','center');txt(c,'Points: +1 per level, +2 every 5th',131,423,10,'#bfe','center');
    this.bp.label='BUY 1 POINT ('+pointCost()+' coins)';this.bp.disabled=save.coins<pointCost();this.bp.clickLocked=true;
    if(this.noteT>0){c.globalAlpha=Math.min(1,this.noteT);rr(c,330,436,420,26,10);c.fillStyle='rgba(10,5,30,.85)';c.fill();txt(c,this.note,540,449,16,'#fff','center','#000',4);c.globalAlpha=1}}});

// Armor gear shop
S.gear=mkScene({cols:1,backFn:null,hero:0,note:'',noteT:0,back(){this.backFn&&this.backFn()},
  enter(){const Gs=this;SND.music('menu');
    const rows=GEAR.map((g,i)=>({x:270,y:60+i*128,w:660,h:118,fn:()=>Gs.buy(g),draw(c,b,focus,t){
      const tr=save.armor[g.k];c.save();rr(c,b.x,b.y,b.w,b.h,14);c.fillStyle=focus?'rgba(122,92,255,.6)':'rgba(20,10,60,.72)';c.fill();c.lineWidth=focus?5:2;c.strokeStyle=focus?'#fff':'rgba(255,255,255,.35)';c.stroke();
      c.save();rr(c,b.x+8,b.y+8,100,b.h-16,10);c.fillStyle='rgba(0,0,0,.35)';c.fill();c.clip();armorIcon(c,g.k,Math.max(1,tr||1),b.x+58,b.y+b.h/2,1.35,tr===0);c.restore();
      txt(c,g.n,b.x+124,b.y+22,22,'#fff','left','#000',5);
      txt(c,tr?GTIER[tr]+'  (tier '+tr+' / '+GMAX+')':'Not owned',b.x+124,b.y+48,15,tr?GCOL[tr]:'#aaa','left','#000',4);
      txt(c,'Armor +'+g.per*tr+(tr<GMAX?'   →   +'+g.per*(tr+1)+'  ('+GTIER[tr+1]+')':'   MAX'),b.x+124,b.y+72,14,tr<GMAX?'#7aff9a':'#ffd24a','left','#000',3);
      for(let k=0;k<GMAX;k++){rr(c,b.x+124+k*34,b.y+88,28,12,5);c.fillStyle=k<tr?GCOL[k+1]:'rgba(255,255,255,.14)';c.fill()}
      const can=tr<GMAX&&save.coins>=GCOST[tr];rr(c,b.x+b.w-190,b.y+24,174,70,12);c.fillStyle=tr>=GMAX?'#555':can?'#3ac060':'#6a4a4a';c.fill();c.lineWidth=2;c.strokeStyle='#fff';c.stroke();
      txt(c,tr>=GMAX?'MAXED':tr?'UPGRADE':'BUY',b.x+b.w-103,b.y+48,20,'#fff','center','#000',4);if(tr<GMAX)txt(c,GCOST[tr]+' coins',b.x+b.w-103,b.y+74,15,can?'#fff':'#ffb0a0','center','#000',3);
      c.restore()}}));
    this.btns=rows.concat([{x:30,y:466,w:130,h:50,label:'BACK',fn:()=>{SND.play('back');Gs.back()}},{x:170,y:466,w:200,h:50,label:'UPGRADES',size:18,fn:()=>openUpgrade(()=>go(Gs))}])},
  buy(g){const tr=save.armor[g.k];if(tr>=GMAX){SND.play('back');this.note=g.n+' is maxed!';this.noteT=1.8;return}if(save.coins<GCOST[tr]){SND.play('back');this.note='Need '+GCOST[tr]+' coins - win more battles!';this.noteT=1.8;return}
    save.coins-=GCOST[tr];save.armor[g.k]++;persist();SND.play('unlock');this.note=GTIER[save.armor[g.k]]+' '+g.n+' equipped!';this.noteT=1.8},
  draw(c,t){bgDraw(c,t,6);c.fillStyle='rgba(10,5,40,.62)';c.fillRect(0,0,W,H);if(this.noteT>0)this.noteT-=1/60;
    const hero=SPECIES[this.hero],hsx=heroStats(hero.id),tot=gearArmor();
    txt(c,'ARMOR & GEAR',160,28,28,'#ffd24a','center','#000',7);txt(c,'Coins: '+save.coins,920,28,20,'#ffe27a','right','#000',5);
    uiDrawBtns(c,this,t);
    c.save();rr(c,20,52,236,396,14);c.fillStyle='rgba(10,5,40,.65)';c.fill();c.clip();glow(c,138,190,120,hero.glow,.45);drawDemo(c,this.hero,138,300,1.25,1,t,true,equipped(this.hero),true);c.restore();
    txt(c,hero.name,138,72,18,'#fff','center','#000',5);
    txt(c,'GEAR ARMOR  '+tot,138,336,15,'#7ac8ff','center','#000',4);txt(c,'TOTAL ARMOR  '+Math.round(hsx.armor),138,358,18,'#fff','center','#000',5);
    txt(c,'Damage taken  -'+hsx.red+'%',138,382,14,'#7aff9a','center','#000',4);
    wrapText(c,'Armor also has plating: a blue bar that soaks hits, breaks, then regrows.',36,396,206,14,11.5,'#bfe');
    if(this.noteT>0){c.globalAlpha=Math.min(1,this.noteT);rr(c,380,436,400,26,10);c.fillStyle='rgba(10,5,30,.85)';c.fill();txt(c,this.note,580,449,16,'#fff','center','#000',4);c.globalAlpha=1}}});

// Missions
S.missions=mkScene({cols:1,tab:0,page:0,note:'',noteT:0,back(){go(S.title)},
  enter(){ensureDay();this.build()},
  msg(m){this.note=m;this.noteT=2},
  build(){const M=this;ensureDay();const m=mis();let B=[];
    B.push({x:170,y:42,w:300,h:36,label:'DAILY MISSIONS',size:17,fn:()=>{M.tab=0;M.build();M.focus=0}},{x:490,y:42,w:300,h:36,label:'ACHIEVEMENTS',size:17,fn:()=>{M.tab=1;M.page=0;M.build();M.focus=1}});
    B[0].dot=()=>m.d.filter(q=>!q.cl&&q.p>=DP[q.id].tgt).length+(m.d.every(q=>q.cl)&&!m.bonusCl?1:0);B[1].dot=()=>ACH.filter(achClaimable).length;
    if(this.tab===0){
      m.d.forEach((q,i)=>{const D=DP[q.id];B.push({x:50,y:100+i*84,w:860,h:76,fn:()=>M.claimDaily(i),draw(c,b,focus,t){
        const done=q.p>=D.tgt,rdy=done&&!q.cl;c.save();rr(c,b.x,b.y,b.w,b.h,14);c.fillStyle=q.cl?'rgba(30,60,40,.7)':focus?'rgba(122,92,255,.55)':'rgba(20,10,60,.75)';c.fill();c.lineWidth=focus?5:rdy?4:2;c.strokeStyle=rdy?'#7aff9a':focus?'#fff':'rgba(255,255,255,.35)';c.stroke();
        txt(c,'DAILY '+(i+1),b.x+16,b.y+16,11,'#7ad8ff','left','#000',3);txt(c,D.t,b.x+16,b.y+36,21,'#fff','left','#000',5);
        drawBar(c,b.x+16,b.y+52,420,14,q.p/D.tgt,done?'#4ade5a':'#ffb02a',false);txt(c,Math.min(q.p,D.tgt)+' / '+D.tgt,b.x+226,b.y+59,11,'#fff','center','#000',3);
        txt(c,'REWARD',b.x+470,b.y+16,11,'#bfe','left');txt(c,rewTxt(D.r),b.x+470,b.y+40,14,'#ffe27a','left','#000',3);
        rr(c,b.x+b.w-150,b.y+12,134,52,12);c.fillStyle=q.cl?'#4a5a4a':rdy?'#3ac060':'#444';c.fill();c.lineWidth=2;c.strokeStyle='#fff';c.stroke();
        if(rdy)glow(c,b.x+b.w-83,b.y+38,70,'#7aff9a',.35+.2*Math.sin(t*8));
        txt(c,q.cl?'CLAIMED ✓':rdy?'CLAIM!':'IN PROGRESS',b.x+b.w-83,b.y+39,q.cl||rdy?18:12,'#fff','center','#000',4);c.restore()}})});
      B.push({x:50,y:358,w:860,h:92,fn:()=>M.claimBonus(),draw(c,b,focus,t){
        const br=bonusReward(),all=m.d.every(q=>q.cl),rdy=all&&!m.bonusCl,sn=streakNow();c.save();rr(c,b.x,b.y,b.w,b.h,14);c.fillStyle=focus?'rgba(122,92,255,.55)':'rgba(40,20,80,.75)';c.fill();c.lineWidth=focus?5:rdy?4:2;c.strokeStyle=rdy?'#ffd24a':focus?'#fff':'rgba(255,255,255,.35)';c.stroke();
        txt(c,'DAILY STREAK: '+sn+' day'+(sn===1?'':'s'),b.x+16,b.y+20,19,'#ffb02a','left','#000',5);
        for(let k=0;k<7;k++){const cx=b.x+30+k*44,cy=b.y+58,on=k<sn%7||(sn>0&&sn%7===0);c.beginPath();c.arc(cx,cy,15,0,TAU);c.fillStyle=on?'#ff9a2a':'rgba(255,255,255,.12)';c.fill();c.strokeStyle=k===6?'#ffd24a':'rgba(255,255,255,.5)';c.lineWidth=2;c.stroke();txt(c,String(k+1),cx,cy+1,12,on?'#fff':'#999')}
        txt(c,m.bonusCl?'Streak bonus claimed today - come back tomorrow!':all?'All dailies done! Claim your streak bonus:':'Claim all 3 daily missions to unlock the streak bonus',b.x+350,b.y+20,13,'#fff','left','#000',3);
        txt(c,rewTxt(br)+'   (day '+br.ns+')',b.x+350,b.y+44,13,'#ffe27a','left','#000',3);txt(c,'Day 3, 6: +1 point  ·  Day 7: +2 points',b.x+350,b.y+66,11,'#bfe','left');
        rr(c,b.x+b.w-150,b.y+20,134,52,12);c.fillStyle=m.bonusCl?'#4a5a4a':rdy?'#3ac060':'#444';c.fill();c.lineWidth=2;c.strokeStyle='#fff';c.stroke();txt(c,m.bonusCl?'CLAIMED ✓':rdy?'CLAIM!':'LOCKED',b.x+b.w-83,b.y+46,18,'#fff','center','#000',4);c.restore()}});
    }else{
      const per=5,list=ACH.slice(this.page*per,this.page*per+per);
      list.forEach((a,i)=>B.push({x:50,y:98+i*70,w:860,h:64,fn:()=>M.claimAch(a),draw(c,b,focus,t){
        const ti=achTier(a),all=ti>=a.tiers.length,tgt=all?a.tiers[a.tiers.length-1]:a.tiers[ti],v=Math.min(a.get(),tgt),rdy=achClaimable(a);
        c.save();rr(c,b.x,b.y,b.w,b.h,12);c.fillStyle=focus?'rgba(122,92,255,.55)':'rgba(20,10,60,.75)';c.fill();c.lineWidth=focus?5:rdy?4:2;c.strokeStyle=rdy?'#7aff9a':focus?'#fff':'rgba(255,255,255,.35)';c.stroke();
        txt(c,a.n,b.x+14,b.y+17,18,'#fff','left','#000',4);txt(c,a.d,b.x+14,b.y+38,12,'#bfe','left');
        for(let k=0;k<a.tiers.length;k++){const cx=b.x+250+k*26,cy=b.y+18;poly(c,[cx,cy-10,cx+10,cy,cx,cy+10,cx-10,cy],k<ti?'#ffd24a':'rgba(255,255,255,.15)','#fff',1.5)}
        drawBar(c,b.x+14,b.y+46,300,12,v/tgt,all?'#ffd24a':'#ffb02a',false);txt(c,all?'ALL TIERS DONE':Math.min(a.get(),9999)+' / '+tgt,b.x+164,b.y+52,10,'#fff','center','#000',3);
        const r=all?null:ACHR[Math.min(3,ti+(a.tiers.length===3&&ti>=1?1:0))];
        txt(c,all?'Complete!':'TIER '+(ti+1)+' REWARD',b.x+380,b.y+17,11,'#bfe','left');if(r)txt(c,rewTxt(r),b.x+380,b.y+40,13,'#ffe27a','left','#000',3);
        rr(c,b.x+b.w-150,b.y+6,134,52,12);c.fillStyle=all?'#4a5a4a':rdy?'#3ac060':'#444';c.fill();c.lineWidth=2;c.strokeStyle='#fff';c.stroke();
        if(rdy)glow(c,b.x+b.w-83,b.y+32,70,'#7aff9a',.35+.2*Math.sin(t*8));
        txt(c,all?'DONE ✓':rdy?'CLAIM!':'IN PROGRESS',b.x+b.w-83,b.y+33,all||rdy?18:12,'#fff','center','#000',4);c.restore()}}));
      const np=Math.ceil(ACH.length/per);
      B.push({x:600,y:466,w:70,h:50,label:'◀',fn:()=>{if(M.page>0){M.page--;M.build();M.focus=B.length-2}}},{x:680,y:466,w:70,h:50,label:'▶',fn:()=>{if(M.page<np-1){M.page++;M.build();M.focus=B.length-1}}});
    }
    B.push({x:30,y:466,w:130,h:50,label:'BACK',fn:()=>{SND.play('back');M.back()}});
    this.btns=B;if(this.focus>=B.length)this.focus=0},
  claimDaily(i){const m=mis(),q=m.d[i],D=DP[q.id];if(q.cl)return;if(q.p<D.tgt){SND.play('back');this.msg('Not done yet - keep playing!');return}q.cl=true;giveReward(D.r);SND.play('unlock');this.msg('Claimed! '+rewTxt(D.r))},
  claimBonus(){const m=mis();if(m.bonusCl){SND.play('back');return}if(!m.d.every(q=>q.cl)){SND.play('back');this.msg('Claim all 3 daily missions first');return}
    const br=bonusReward();m.streak=br.ns;m.last=todayStr();m.bonusCl=true;giveReward(br);SND.play('unlock');this.msg('Streak bonus! '+rewTxt(br))},
  claimAch(a){if(!achClaimable(a)){SND.play('back');this.msg(achTier(a)>=a.tiers.length?'All tiers complete!':'Keep going - not there yet');return}
    const ti=achTier(a),r=ACHR[Math.min(3,ti+(a.tiers.length===3&&ti>=1?1:0))];mis().ach[a.id]=ti+1;giveReward(r);SND.play('unlock');this.msg(a.n+' tier '+(ti+1)+'! '+rewTxt(r))},
  draw(c,t){bgDraw(c,t,5);c.fillStyle='rgba(10,5,40,.66)';c.fillRect(0,0,W,H);if(this.noteT>0)this.noteT-=1/60;
    txt(c,'MISSIONS',90,28,28,'#ffd24a','center','#000',7);txt(c,'Coins: '+save.coins+'   Rewards go to '+SPECIES[sel.hero].name,920,28,14,'#ffe27a','right','#000',4);
    uiDrawBtns(c,this,t);
    if(this.tab===0)txt(c,'New daily missions every day (local time). Resets in '+(()=>{const n=new Date(),m=new Date(n);m.setHours(24,0,0,0);const h=((m-n)/36e5)|0;return h+'h'})(),480,88,12,'#bfe','center');
    else txt(c,'Page '+(this.page+1)+' / '+Math.ceil(ACH.length/5)+'   -   tiers give coins, XP and upgrade points',480,88,12,'#bfe','center');
    if(this.noteT>0){c.globalAlpha=Math.min(1,this.noteT);rr(c,230,430,500,28,10);c.fillStyle='rgba(10,5,30,.88)';c.fill();txt(c,this.note,480,444,16,'#fff','center','#000',4);c.globalAlpha=1}}});

// Endless game-over summary
function drawEndlessOver(c,t,r){
  const hero=SPECIES[r.hero],h=hs(hero.id);
  txt(c,'GAME OVER',480,40,50,'#ff8a7a','center','#2a0a5a',11);
  txt(c,'You reached WAVE '+r.wave+(r.record?'   ★ NEW BEST! ★':'   (best: '+save.best+')'),480,84,22,r.record?'#ffd24a':'#fff','center','#000',5);
  c.fillStyle='rgba(30,15,80,.7)';rr(c,30,104,900,56,14);c.fill();c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=2;c.stroke();
  txt(c,'+'+r.xp+' XP',190,132,24,'#7ad8ff','center','#000',5);txt(c,'+'+r.coins+' COINS',420,132,24,'#ffe27a','center','#000',5);
  txt(c,hero.name+'  Lv '+h.lvl+(r.levels>0?'  (+'+r.levels+' LEVELS!)':''),700,132,19,r.levels>0?'#7aff9a':'#fff','center','#000',5);
  c.fillStyle='rgba(10,5,40,.7)';rr(c,30,172,440,206,14);c.fill();rr(c,490,172,440,206,14);c.fill();
  txt(c,'RUN SUMMARY',250,190,17,'#ffd24a','center','#000',4);
  const L=[['Waves cleared',r.wave-1],['Score',r.score],['Enemies defeated',r.kos],['Bosses beaten',Math.floor((r.wave-1)/5)],['Best combo',r.combo],['Damage dealt',r.dmg],['Time',r.time.toFixed(0)+'s']];
  L.forEach((q,k)=>{txt(c,q[0],54,214+k*19,13,'#bfe','left');txt(c,String(q[1]),446,214+k*19,13,'#fff','right')});
  wrapText(c,'Perks: '+(r.perks.length?r.perks.join(', '):'none'),54,350,392,14,11,'#ffe9b0');
  txt(c,'BEST ENDLESS RUNS',710,190,17,'#ffd24a','center','#000',4);
  save.board.slice(0,6).forEach((e,k)=>{const me=r.rank===k+1,y=214+k*26;if(me){c.fillStyle='rgba(255,210,74,.25)';rr(c,500,y-11,420,23,8);c.fill()}
    txt(c,'#'+(k+1),512,y,15,me?'#ffd24a':'#fff','left','#000',3);txt(c,'Wave '+e.wave,560,y,15,me?'#ffd24a':'#fff','left','#000',3);txt(c,SPECIES[SPI[e.hero]||0].name,680,y,13,'#bfe','left');txt(c,e.score+' pts',910,y,13,'#fff','right')});
  if(!save.board.length)txt(c,'No runs yet',710,260,14,'#bbb');
  uiDrawBtns(c,S.result,t)}

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
window.__game={get G(){return G},SPECIES,S,go,startFight,save,inp,get scene(){return scene},LEVELS,WEAPONS,CULT,hs,addXP,statsOf,sel,openArmory,openUpgrade,equipped,WI,mkF,takeHit,updateFight,initRound,endFight,ARENAS,aiThink,mkAI,startAtk,UPS,xpNeed,PERKS,stageStats,DIFFM,STAGE,gearArmor,armRed,track,ensureDay,missionsReady,ACH,DAILY_POOL,openGear,RB,enemyFor,spawnEnemy,bossPhase,nextWave,resolveRound,mkAI,TB,pickPerk,gearFor};
setArena(0);
go(S.title);
if(QS.get('autostart')){if(QS.get('lvl')){const hh=hs(SPECIES[+(QS.get('autostart').split(',')[1])||0].id);hh.lvl=+QS.get('lvl');hh.pts=+(QS.get('pts')||0)}
  const[m,h,e,a]=QS.get('autostart').split(',');const cfg={mode:m,hero:+h||0,enemy:+e||1,arena:+a||0,diff:.6,level:+(QS.get('level')||0)};if(m==='story'){const L=LEVELS[cfg.level];cfg.arena=L.arena;cfg.boss=L.boss}else if(QS.get('arena'))cfg.arena=+QS.get('arena');startFight(cfg)}
requestAnimationFrame(frame);
['touchend','click','mousedown'].forEach(ev=>addEventListener(ev,()=>{SND.resume();SND.startPending()},{passive:true}));
