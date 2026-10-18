'use strict';
/* Mythic Fighters - game logic, scenes, input. */
const QS=new URLSearchParams(location.search);
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let scale=1,offx=0,offy=0,dpr=1;
let _sd=0;{const _s=ctx.save.bind(ctx),_r=ctx.restore.bind(ctx);ctx.save=()=>{_sd++;_s()};ctx.restore=()=>{if(_sd>0){_sd--;_r()}}}
function unwind(d){while(_sd>(d|0))ctx.restore()}
function safe(c,fn,tag){const d=_sd;try{fn()}catch(err){window.__derr=(window.__derr||0)+1;window.__errs=(window.__errs||[]);if(window.__errs.length<20)window.__errs.push(tag+': '+(err&&err.stack||err));if(window.__derr<4)console.error(tag,err)}finally{unwind(d)}}
function resize(){const w=innerWidth||document.documentElement.clientWidth,h=innerHeight||document.documentElement.clientHeight;if(!(w>80&&h>80))return; // transient 0-size viewports (orientation / fullscreen / bfcache) must never zero the scale
  dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);scale=Math.min(w/W,h/H);offx=(w-W*scale)/2;offy=(h-H*scale)/2}
addEventListener('resize',resize);['pageshow','focus','fullscreenchange','webkitfullscreenchange'].forEach(ev=>addEventListener(ev,()=>{resize();setTimeout(resize,200)}));resize();

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
save.boosts=Object.assign({xp:0,coin:0,pwr:0,arm:0,nit:0,rev:0},save.boosts&&typeof save.boosts==='object'?save.boosts:{});for(const k in save.boosts)save.boosts[k]=Math.max(0,Math.min(99,+save.boosts[k]||0));
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
 {k:'regen',g:'LIFE',gc:'#ff6a7a',n:'Regeneration',d:'Heal a little every second in battle',f:l=>'+'+(.15*l/2).toFixed(3).replace(/0$/,'')+'% life/sec'},
 {k:'steal',g:'LIFE',gc:'#ff6a7a',n:'Lifesteal',d:'Heal for part of the damage you deal',f:l=>(1.2*l).toFixed(1)+'% of damage'},
 {k:'def',g:'ARMOR',gc:'#7ac8ff',n:'Armor Plating',d:'More armor = less damage taken',f:l=>'+'+3*l+' armor'},
 {k:'spd',g:'SPEED',gc:'#c8ff5a',n:'Move Speed',d:'Run and jump faster',f:l=>'+'+(2.5*l).toFixed(1)+'% speed'},
 {k:'aspd',g:'SPEED',gc:'#c8ff5a',n:'Attack Speed',d:'Swing, shoot and cast faster',f:l=>'+'+3*l+'% speed'},
 {k:'atk',g:'POWER',gc:'#ffb347',n:'Attack Power',d:'All your attacks hit harder',f:l=>'+'+5*l+'% damage'},
 {k:'wp',g:'POWER',gc:'#ffb347',n:'Weapon Power',d:'Weapon damage (melee swings and ranged weapon shots)',f:l=>'+'+6*l+'% weapon'},
 {k:'cd',g:'POWER',gc:'#ffb347',n:'Cooldowns',d:'Ultimate and ranged attack recharge faster',f:l=>'-'+4*l+'% cooldown'},
 {k:'en',g:'POWER',gc:'#ffb347',n:'Ultimate Charge',d:'Ultimate recharges faster',f:l=>'+'+10*l+'% faster'}];
const UPMAX=10,MAXLV=40,xpNeed=l=>40+14*(l-1);
const GEAR=[{k:'helm',n:'HELM',per:3},{k:'chest',n:'CHEST ARMOR',per:6},{k:'limbs',n:'GLOVES & BOOTS',per:3}];
const GTIER=['None','Leather','Bronze','Iron','Mythril','Dragon Gold'],GCOST=[100,200,350,550,800],GMAX=5;
const gearArmor=()=>GEAR.reduce((a,g)=>a+g.per*save.armor[g.k],0);
const armRed=a=>Math.min(.6,a/(a+120));
function hs(id){let h=save.heroes[id];if(!h||typeof h!=='object')h=save.heroes[id]={};h.xp=+h.xp||0;h.lvl=+h.lvl||1;h.pts=+h.pts||0;h.up=h.up||{};UPS.forEach(u=>h.up[u.k]=+h.up[u.k]||0);return h}
function addXP(id,n){const h=hs(id),from=h.lvl;h.xp+=n;while(h.lvl<MAXLV&&h.xp>=xpNeed(h.lvl)){h.xp-=xpNeed(h.lvl);h.lvl++;h.pts+=h.lvl%5===0?2:1}if(h.lvl>=MAXLV)h.xp=0;return h.lvl-from}
function statsOf(id){const u=hs(id).up;return{hp:1+.06*u.hp,atk:1+.05*u.atk,armor:gearArmor()+3*u.def,spd:1+.025*u.spd,en:1+.1*u.en,cd:1-.04*u.cd,wp:1+.06*u.wp,regen:.0015*u.regen/HPK,steal:.012*u.steal,aspd:1+.03*u.aspd}}
function spentPts(id){const u=hs(id).up;return UPS.reduce((a,x)=>a+u[x.k],0)}
const pointCost=()=>120+30*save.bought;

/* ---------- weapons ---------- */
const WEAPONS=[
 {id:'fists',name:'Mythic Fists',style:'punch',len:0,idle:0,dmg:9,range:82,dur:.3,hs:.07,he:.18,kb:190,up:0,stun:.28,en:7,cost:0,lvl:0,desc:'Fast and reliable. Your creature\'s own power.'},
 {id:'sword',name:'Star Sword',style:'slash',len:62,idle:-1,dmg:6.5,range:102,dur:.36,hs:.09,he:.2,kb:210,up:0,stun:.28,en:7,cost:0,lvl:0,desc:'Balanced blade with a wide slash.'},
 {id:'axe',name:'Thunder Axe',style:'chop',len:58,idle:-1.1,dmg:16,range:96,dur:.5,hs:.16,he:.3,kb:280,up:0,stun:.36,en:8,cost:150,lvl:3,desc:'Slow, heavy chops that hit hard.'},
 {id:'spear',name:'Sky Spear',style:'thrust',len:100,idle:-.5,dmg:5.8,range:142,dur:.4,hs:.12,he:.22,kb:170,up:0,stun:.26,en:7,cost:250,lvl:6,desc:'Longest reach. Poke from afar!'},
 {id:'staff',name:'Moon Staff',style:'slash',len:74,idle:-1.45,dmg:6.2,range:108,dur:.36,hs:.1,he:.2,kb:180,up:0,stun:.3,en:12,cost:350,lvl:9,desc:'Magic staff with a long, quick swing.'},
 {id:'hammer',name:'Titan Hammer',style:'chop',len:62,idle:-1,dmg:27,range:94,dur:.68,hs:.26,he:.38,kb:380,up:90,stun:.5,en:9,heavy:1,cost:450,lvl:12,desc:'Super slow but smashes and launches foes.'},
 {id:'shield',name:'Guardian Shield',style:'thrust',len:24,idle:0,dmg:8.5,range:70,dur:.32,hs:.08,he:.18,kb:240,up:0,stun:.4,en:6,cost:300,lvl:15,desc:'Bash foes. Blocking drains less shield.'},
 {id:'bow',name:'Wind Bow',style:'shoot',len:40,idle:0,dmg:3.9,range:480,dur:.45,hs:.18,he:.3,kb:120,up:0,stun:.22,en:6,cost:500,lvl:18,ranged:1,desc:'Shoot arrows from across the arena.'},
 {id:'boomerang',name:'Comet Boomerang',style:'throw',len:30,idle:-.6,dmg:3.2,range:480,dur:.42,hs:.16,he:.3,kb:140,up:0,stun:.24,en:7,cost:600,lvl:21,ranged:1,desc:'Throw it out and it flies back, hitting twice!'},
 {id:'claws',name:'Shadow Claws',style:'thrust',len:28,idle:0,dmg:5,range:66,dur:.2,hs:.05,he:.12,kb:70,up:0,stun:.18,en:4,cost:700,lvl:24,desc:'Lightning-fast slashes. Great for combos.'}];

const WT0={fists:[3,1.4,0],sword:[3,1.5,.25],axe:[2,1.5,.55],spear:[2,1.5,.3],staff:[3,1.3,.15],hammer:[1,1,.7],shield:[2,1.6,.6],bow:[1,1,.1],boomerang:[1,1,.1],claws:[4,1.6,0]};
WEAPONS.forEach(w=>{const t=WT0[w.id]||[1,1,.2];w.combo=t[0];w.fin=t[1];w.wt=t[2]});
const mkW=(id,name,style,len,idle,dmg,range,dur,hs,he,kb,up,stun,en,cost,lvl,combo,fin,wt,desc,pk)=>WEAPONS.push({id,name,style,len,idle,dmg,range,dur,hs,he,kb,up,stun,en,cost,lvl,combo,fin,wt,desc,pk,ranged:!!pk});
mkW('dagger','Quick Dagger','thrust',36,0,5.2,70,.17,.04,.1,60,0,.16,4,150,2,4,1.7,0,'Super fast stabs, tiny reach, no weight at all.');
mkW('katana','Wind Katana','slash',88,-1,5,98,.27,.06,.15,130,0,.22,6,330,5,4,1.9,.1,'Fast, long and balanced. A 4-hit chain ends in a big finisher.');
mkW('tome','Arcane Tome','shoot',36,0,3.7,480,.26,.1,.2,60,0,.14,5,380,7,1,1,.05,'Rapid magic shots from far away. Weak up close.',{kind:'ink',col:'#c08aff',speed:760,r:11});
mkW('mace','Skull Mace','chop',62,-1,12.5,90,.44,.15,.28,260,0,.5,8,340,8,2,1.5,.5,'Heavy crushing blows that stun. Slow and heavy.');
mkW('trident','Sea Trident','thrust',96,-.4,7,132,.4,.12,.22,180,0,.26,7,420,10,3,1.5,.3,'Long reach poke. Great for keeping foes away.');
mkW('whip','Thunder Whip','slash',100,-.3,5.6,150,.34,.1,.22,90,0,.2,5,400,11,4,1.3,.05,'Longest close reach, but light hits. 4-hit chain.');
mkW('crossbow','Siege Crossbow','shoot',44,0,5,520,.7,.3,.42,240,0,.35,8,560,13,1,1,.35,'Slow reload, huge fast bolts. Ranged only.',{kind:'warrow',col:'#ffffff',speed:1250,r:11});
mkW('twinblades','Twin Blades','slash',54,-.8,5.6,82,.2,.04,.1,55,0,.16,4,520,14,5,2,.05,'Blazing speed with a 5-hit chain and a huge finisher.');
mkW('javelin','Sky Javelin','shoot',100,0,4.6,540,.62,.26,.38,260,0,.4,8,480,16,1,1,.3,'Thrown spear. Heavy damage at long range.',{kind:'arrow',col:'#ffd8a0',speed:980,r:13});
mkW('shuriken','Star Shuriken','shoot',30,0,3.1,420,.17,.06,.12,40,0,.12,3,500,17,1,1,0,'Machine-gun throwing stars. Tiny damage, zero weight.',{kind:'crescent',col:'#d8e0ff',speed:980,r:9});
mkW('flail','Spike Flail','chop',90,-1,11.8,112,.5,.17,.3,240,0,.42,8,600,19,2,1.6,.55,'Long heavy swings with a huge finisher.');
mkW('firewand','Ember Wand','shoot',70,0,4.4,500,.55,.22,.34,200,0,.3,8,640,20,1,1,.1,'Fireballs that hit hard from afar. Light to carry.',{kind:'fire',col:'#ff8a1f',speed:640,r:17});
mkW('scythe','Reaper Scythe','slash',96,-1.3,12,112,.48,.17,.3,220,0,.34,7,700,22,3,1.7,.4,'Wide arcing swings, strong 3rd-hit finisher.');
mkW('greatsword','Titan Greatsword','slash',112,-1.5,14.5,120,.56,.22,.36,330,0,.42,9,800,25,2,1.5,.7,'The biggest blade. Huge damage and reach, very heavy.');
const WI={};WEAPONS.forEach(w=>WI[w.id]=w);
function weaponOwned(id){const w=WI[id];return !!QS.get('unlock')||save.weapons.includes(id)||(w.lvl>0&&save.cleared>=w.lvl)}
function equipped(heroIdx){const o=QS.get('w');if(o&&WI[o])return WI[o];const id=save.loadout[SPECIES[heroIdx].id]||'sword';return WI[weaponOwned(id)?id:'fists']}
const CULT={
 dragon:{name:'Dragon Rage',type:'buff',buff:'atk',time:7,col:'#ff8a1f',cd:13,desc:'+40% damage for 7s'},
 minotaur:{name:'Earth Stomp',type:'nova',dmg:16,rad:190,col:'#ffb347',cd:11,desc:'Shockwave stomp all around'},
 unicorn:{name:'Healing Light',type:'heal',pct:14,col:'#ff9ae8',cd:14,desc:'Heal 14% health'},
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
const KEYMAP={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyW:'jump',ArrowUp:'jump',Space:'jump',KeyS:'shield',ArrowDown:'shield',ShiftLeft:'shield',ShiftRight:'shield',KeyO:'ult',KeyH:'ranged',KeyB:'ranged',KeyJ:'punch',KeyZ:'punch',KeyR:'rage',KeyU:'dodge',KeyV:'dodge'};
function press(n){if(!inp.held[n])inp.press[n]=true;inp.held[n]=true}
function release(n){inp.held[n]=false}
let touchMode=!!QS.get('touch')||navigator.maxTouchPoints>0||('ontouchstart' in window);
const TB=[{n:'left',x:74,y:482,r:46},{n:'right',x:186,y:482,r:46},
 {n:'punch',x:882,y:468,r:54,l:['ATTACK'],c:'#ff7a3a'},{n:'jump',x:762,y:484,r:46,l:['JUMP'],c:'#9a8aff'},
 {n:'ranged',x:798,y:376,r:42,l:['RANGED'],c:'#4ad0ff'},{n:'ult',x:906,y:352,r:40,l:['ULTI-','MATE'],c:'#ff7ac8'},
 {n:'rage',x:872,y:262,r:36,l:['RAGE'],c:'#ff8a2a'},{n:'shield',x:666,y:424,r:30,l:['BLOCK'],c:'#5aff9a'},{n:'dodge',x:660,y:496,r:30,l:['DODGE'],c:'#5ad0ff'}];
let lastTouch=-1e9;const nowMs=()=>performance.now();
function relAllTouch(){for(const[,n] of ptrs)release(n);ptrs.clear()}
const ptrs=new Map();
function lpos(e){return[(e.clientX-offx)/scale,(e.clientY-offy)/scale]}
function tbAt(x,y){let best=null,bd=1e9;for(const b of TB){const d=Math.hypot(x-b.x,y-b.y);if(d<b.r+12&&d<bd){bd=d;best=b}}return best}
cv.addEventListener('pointerdown',e=>{
  e.preventDefault();SND.resume();SND.startPending();GP.active=false;lastTouch=nowMs();
  if(e.pointerType==='touch'||e.pointerType==='pen')touchMode=true;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const[x,y]=lpos(e);
  if(scene===S.fight&&!G.paused&&G.state!=='end'&&G.state!=='perk'){
    if(Math.hypot(x-480,y-(G.battle?112:58))<26){pauseGame();return}
    if(touchMode&&(!G.battle||G.touchSlot)){const b=tbAt(x,y);if(b){ptrs.set(e.pointerId,b.n);press(b.n);return}}
    return;
  }
  uiClick(curUI(),x,y);
});
cv.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse')lastTouch=nowMs();
  const[x,y]=lpos(e);
  if(ptrs.has(e.pointerId)){const old=ptrs.get(e.pointerId);if(old==='left'||old==='right'){const b=tbAt(x,y);if(b&&(b.n==='left'||b.n==='right')&&b.n!==old){release(old);press(b.n);ptrs.set(e.pointerId,b.n)}}return}
  if(e.pointerType!=='touch')uiHover(curUI(),x,y);
});
function up(e){if(ptrs.has(e.pointerId)){release(ptrs.get(e.pointerId));ptrs.delete(e.pointerId)}}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('lostpointercapture',up);addEventListener('pointerup',up);addEventListener('pointercancel',up);
['gesturestart','gesturechange','gestureend'].forEach(ev=>addEventListener(ev,e=>e.preventDefault()));
addEventListener('touchstart',e=>{lastTouch=nowMs();GP.active=false},{passive:true});addEventListener('touchend',e=>{lastTouch=nowMs();if(!e.touches.length)relAllTouch()},{passive:true});addEventListener('touchcancel',()=>{lastTouch=nowMs();relAllTouch()},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)relAllTouch()});
addEventListener('orientationchange',()=>{setTimeout(resize,150);setTimeout(resize,500)});if(window.visualViewport)visualViewport.addEventListener('resize',resize);
addEventListener('blur',()=>{for(const k in inp.held)inp.held[k]=false;ptrs.clear();if(G&&G.fs)for(const f of G.fs)if(f.inp)f.inp.held={}});
document.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{
  SND.resume();SND.startPending();GP.active=false;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(scene===S.fight&&!G.paused&&G.state!=='end'&&G.state!=='perk'){
    if(e.code==='KeyP'||e.code==='Escape'){pauseGame();return}
    if(G.battle){const m=G.kbMap&&G.kbMap[e.code];if(m){const o=m[0],n=m[1];if(!o.held[n])o.press[n]=true;o.held[n]=true}return}
    const n=KEYMAP[e.code];if(n&&!e.repeat)press(n);else if(n)inp.held[n]=true;return;
  }
  uiKey(curUI(),e.code);
});
addEventListener('keyup',e=>{const n=KEYMAP[e.code];if(n)release(n);if(G&&G.battle&&G.kbMap){const m=G.kbMap[e.code];if(m)m[0].held[m[1]]=false}});

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
    if(u.focus===i||!b.twoTap){u.focus=i;SND.play('click');b.fn&&b.fn(b.split&&x<b.x+b.w*.25?-1:1)}else{u.focus=i;SND.play('click')}return}}}
function uiHover(u,x,y){if(!u)return;for(let i=0;i<u.btns.length;i++)if(!u.btns[i].hidden&&hit(u.btns[i],x,y)){u.focus=i;return}}
function uiKey(u,code){if(!u)return;const n=u.btns.length,cols=u.cols||1;
  const mv=d=>{let i=u.focus;for(let k=0;k<n;k++){i=(i+d+n)%n;if(!u.btns[i].hidden)break}u.focus=i;SND.play('click')};
  if(code==='ArrowDown'||code==='KeyS')mv(cols);else if(code==='ArrowUp'||code==='KeyW')mv(-cols);
  else if(code==='ArrowRight'||code==='KeyD')mv(1);else if(code==='ArrowLeft'||code==='KeyA')mv(-1);
  else if(code==='Enter'||code==='Space'||code==='KeyJ'){const b=u.btns[u.focus];if(b&&!b.disabled||b&&b.clickLocked){SND.play('click');b.fn&&b.fn()}}
  else if((code==='Escape'||code==='Backspace')&&u.back){SND.play('back');u.back()}}
function vmenu(labels,y0,gap){return labels.map((l,i)=>({x:330,y:y0+i*(gap||62),w:300,h:52,label:l[0],fn:l[1]}))}

/* ---------- Fighters ---------- */
const EDGES=['jump','punch','dodge','ult','ranged','rage'];
const ATK={punch:{dur:.3,hs:.07,he:.18,dmg:5,range:82,kb:190,up:0,stun:.28,en:7}};
const SPDUR={proj:.65,dash:.7,slam:.85,flurry:.95,spin:.8,heal:.85,buff:.75,nova:.85,leap:1.7};
function mkF(idx,x,face,o){return armorInit(mkF0(idx,x,face,o))}
const HPK=2; // base life multiplier (fights last ~2x as long); per-second/per-hit absolute sources below are divided by it
function mkF0(idx,x,face,o){o=o||{};const sp=SPECIES[idx],st=o.st||{},maxhp=HPK*100*sp.hp*(o.hpm||1)*(st.hp||1);
  return{idx,sp,team:o.team||0,inv:0,dropT:0,plat:null,chain:0,chainT:0,revive:!!o.revive,sy:groundY(x),name:o.name||'',x,y:groundY(x),vx:0,vy:0,face,hp:maxhp,maxhp,chip:maxhp,en:o.en==null?25:o.en,combo:0,comboT:0,maxCombo:0,atk:null,stun:0,dodgeT:0,dodgeCd:0,shield:false,sh:100,ko:false,rot:0,rotV:0,t:Math.random()*5,
    sc:sp.sc*(o.scale||1),in:{},buf:{},ai:o.ai||null,pose:newPose(),flash:0,onGround:true,boss:!!o.boss,player:!!o.player,lock:0,dmgM:(o.dmgM||1)*(st.atk||1),hitsTaken:0,rdy:false,defM:(o.defM||1),spdM:(o.spdM||1)*(st.spd||1),enM:st.en||1,cdM:(o.cdM||1)*(st.cd||1),wpM:st.wp||1,wp:o.wp||WI.fists,cd:{ult:0,ranged:0},cdMax:{ult:1,ranged:1},rage:0,rageT:0,sq:0,sqv:0,nanFix:0,armor:(o.armor||0)+(st.armor||0),ap:0,apMax:0,apT:0,aspd:(o.aspd||1)*(st.aspd||1),regen:st.regen||0,steal:st.steal||0,gear:o.gear||null,phase:1,buffs:{atk:0,spd:0,def:0},boomOut:false,aura:o.aura||null,tag:o.tag||'',_a:(o.armor||0)+(st.armor||0)}}
function armorInit(f){f.apMax=f.armor>0?18+f.armor*1.2:0;f.ap=f.apMax;return f}
let G=null;
function inRange(f,foe,R){const dx=(foe.x-f.x)*f.face;return dx>-12&&dx<R*f.sc+24*foe.sc&&Math.abs(foe.y-f.y)<100*Math.max(f.sc,foe.sc)}
function pop(x,y,text,col,size){G.pops.push({x,y,t:0,text,col:col||'#fff',size:size||22})}
function healF(f,n){f.hp=Math.min(f.maxhp,f.hp+n);f.chip=Math.max(f.chip,f.hp);SND.play('heal');for(let i=0;i<14;i++)spawnP(f.x+rnd(-30,30),f.y-rnd(0,120),0,-rnd(40,120),.8,5,'#7aff9a','star');pop(f.x,f.y-150*f.sc,'+'+Math.round(n),'#7aff9a')}
/* ranged cooldowns are always much shorter than the ultimate (>= 12s) */
const RCD={bolt:1.9,weapon:1.2,throw:.7},ULT_MIN=12;
function startAtk(f,type){
  if(type==='ranged'){
    if(f.cd.ranged>0)return false;const w=f.wp;let d,base;
    if(w.ranged){if(w.style==='throw'&&f.boomOut)return false;d=w;base=w.style==='throw'?RCD.throw:RCD.weapon;
      f.atk={type:'punch',t:0,hit:false,fired:false,kind:'punch',style:w.style,dmg:d.dmg,range:d.range,dur:d.dur,hs:d.hs,he:d.he,kb:d.kb,up:0,stun:d.stun,en:d.en,heavy:false,w:d,rng:1}}
    else{base=RCD.bolt;f.atk={type:'punch',t:0,hit:false,fired:false,kind:'punch',style:'shoot',bolt:RB[f.sp.id],dmg:5.5,range:80,dur:.42,hs:.16,he:.3,kb:140,up:0,stun:.22,en:6,heavy:false,w:WI.fists,rng:1}}
    f.cd.ranged=f.cdMax.ranged=base*f.cdM;SND.play('swing');f.vx=-f.face*30;return true}
  if(f.player&&type==='ult'&&f.cd.ult<=0)track('ult',1);

  if(type==='ult'){
    let d;
    if(f.cd.ult>0)return false;d=CULT[f.sp.id];f.cd.ult=f.cdMax.ult=Math.max(ULT_MIN,d.cd)*f.cdM/(f.enM||1)
    f.atk={type:'special',slot:type,def:d,kind:d.type,dur:SPDUR[d.type],t:0,hit:false,fired:false,n:0,range:d.type==='dash'?70:100,hs:0,he:0};SND.play(d.type==='heal'?'heal':'special');
    if(d.guard)f.buffs.def=Math.max(f.buffs.def,d.guard);
    for(let i=0;i<20;i++)spawnP(f.x+rnd(-40,40),f.y-rnd(0,140),0,-rnd(50,200),.7,6,d.col,'glow')}
  else{
    let d=f.wp;if(type==='punch'&&f.wp.ranged)d=WI.fists;
    let dm=1,dur=d.dur,fin=false,kbm=1;
    if(type==='punch'&&d.combo>1){f.chain=f.chainT>0?f.chain+1:1;if(f.chain>d.combo)f.chain=1;fin=f.chain===d.combo;if(fin){dm=d.fin;dur=d.dur*1.18;kbm=1.6}else dur=d.dur*.9}
    else if(type==='punch')f.chain=1;
    if(type==='punch')f.chainT=dur+.55;
    const ds=dur/d.dur;
    f.atk={type,t:0,hit:false,fired:false,kind:type,style:type==='punch'?d.style:undefined,dmg:d.dmg*dm,range:d.range*(fin?1.08:1),dur,hs:d.hs*ds,he:d.he*ds,kb:d.kb*kbm,up:fin?Math.max(d.up||0,45):(d.up||0),stun:d.stun*(fin?1.25:1),en:d.en,heavy:!!d.heavy||fin,fin,w:d};
    SND.play('swing');f.vx=f.face*(type==='punch'?(d.style==='thrust'?150:110):70)}
  return true}
/* ---------- RAGE ---------- */
const RAGE={max:100,dur:10,flat:.35,dmgTaken:.225,dmgDealt:.14,block:1.5,dodge:3,jump:1.118,spd:1.3,aspd:1.3,atk:1.3};
function addRage(f,n){if(!f||f.ko||f.out||f.rageT>0||!(n>0)||G.state==='end')return;const was=f.rage;f.rage=Math.min(RAGE.max,f.rage+n);
  if(was<RAGE.max&&f.rage>=RAGE.max){f.rageFull=0;if(f.player||(G.battle&&f.touch)){SND.play('ready');pop(f.x,f.y-190*f.sc,'RAGE READY!','#ff9a3a',22)}}}
function activateRage(f){if(f.ko||f.out||f.rageT>0||f.rage<RAGE.max||G.state!=='fight')return false;
  f.rageT=RAGE.dur;f.sq=.7;f.sqv=0;f.stun=0;G.shake=Math.max(G.shake,10);G.flashW=Math.max(G.flashW,.14);G.flashCol='#ff7a2a';G.zp=Math.max(G.zp||0,.07);
  ring(f.x,f.y-70,'#ff7a2a',150);ring(f.x,f.y-70,'#ffd24a',90);burst(f.x,f.y-70,36,'#ff8a2a',620,9,'star');burst(f.x,f.y-30,14,'#ffd24a',320,5,'spark');SND.play('special');pop(f.x,f.y-190*f.sc,'RAGE!','#ff8a2a',30);return true}
function endRage(f){f.rageT=0;f.rage=0;burst(f.x,f.y-70,16,'#ff8a2a',260,6,'glow');ring(f.x,f.y-60,'#ff8a2a',80)}
function dustPuff(x,y,n,k){for(let i=0;i<n;i++){const d=i%2?1:-1;spawnP(x+d*rnd(4,14),y-2,d*rnd(60,200)*(k||1),-rnd(10,60),rnd(.3,.55),rnd(4,8)*(k||1),'#d8d0c0','dust')}}
function hitFrom(att,foe,o){const sv=att.face;att.face=foe.x>=att.x?1:-1;const r=takeHit(att,foe,o);att.face=sv;return r}
function takeHit(att,def,o){
  if(def.ko||def.out||def.inv>0||G.state==='end')return false;
  if(def.dodgeT>0){if(!o.dodgeNoted){pop(def.x,def.y-140*def.sc,'DODGE!','#5ad0ff',20);o.dodgeNoted=1;addRage(def,RAGE.dodge);if(def.player)track('dodge',1)}return false}
  let dmg=o.dmg*att.dmgM*(att.buffs.atk>0?1.4:1)*(att.buffs.spd>0?1.15:1)*(att.rageT>0?RAGE.atk:1)*(o.wp?att.wpM:1)*(1+.06*Math.min(att.combo,8))*def.defM*(def.buffs.def>0?.5:1);
  if(def.armor>0&&!o.pierce){const full=def.ap>0,prev=dmg*(full?1:.5)*armRed(def.armor);dmg-=prev;def.apT=3;def.armFlash=.2;if(full){def.ap=Math.max(0,def.ap-prev*1.5);if(def.ap<=0)pop(def.x,def.y-168*def.sc,'ARMOR BROKEN!','#7ac8ff',20)}}
  const hx=def.x-att.face*8*def.sc+ (att.x-def.x)*.0,hy=def.y-80*def.sc;
  const facing=(att.x-def.x)*def.face>0;
  if(def.shield&&facing&&def.onGround){
    if(def.player)track('block',1);addRage(def,RAGE.block);
    def.sh-=dmg*2.2*(def.wp.id==='shield'?.55:1);def.vx=att.face*Math.min(o.kb,220)*.5;att.vx-=att.face*(o.proj?0:120);
    SND.play('block');burst(hx+def.face*30,hy,10,'#bfe9ff',200,5,'star');ring(hx+def.face*30,hy,'#9ad8ff',40);G.shake=Math.max(G.shake,3);G.hitstop=.04;
    def.hp-=dmg*.08;def.chip=Math.max(def.chip,def.hp);
    if(def.sh<=0){def.sh=45;def.stun=1;def.shield=false;pop(def.x,def.y-150*def.sc,'GUARD BREAK!','#ffd24a',22);SND.play('heavy');G.shake=8}
    if(def.hp<=0)koF(att,def,o);
    return false}
  addRage(def,dmg*RAGE.dmgTaken+RAGE.flat);addRage(att,dmg*RAGE.dmgDealt+RAGE.flat*.6);def.sq=.45;def.sqv=0;def.hurtT=.25;
  def.hp-=dmg;def.hitsTaken++;if(att.player){G.dmgDealt=(G.dmgDealt||0)+dmg;track('damage',dmg);if(o.rk)track('rhit',1)}if(att.steal>0&&!att.ko)att.hp=Math.min(att.maxhp,att.hp+dmg*att.steal);def.flash=.18;def.atk=null;def.shield=false;
  att.combo++;att.comboT=1.5;att.maxCombo=Math.max(att.maxCombo,att.combo);if(att.player)track('combo',att.combo);
  def.vx=att.face*o.kb;def.stun=Math.max(def.stun,o.stun||.3);
  if(o.up){def.vy=-o.up*3.2;def.onGround=false;def.y-=2}
  const heavy=!!o.heavy||dmg>=14;
  G.hitstop=G.battle?(heavy?.05:.02):(heavy?.11:.06);G.shake=Math.max(G.shake,heavy?13:6);
  SND.play(heavy?'heavy':'hit');
  const col=att.sp.glow;burst(hx,hy,heavy?18:10,col,heavy?420:300,heavy?9:6,'star');burst(hx,hy,heavy?12:7,'#fff6c8',heavy?760:560,3,'spark');burst(hx,hy,8,'#fff',240,4,'glow');ring(hx,hy,col,heavy?70:46);
  pop(def.x+rnd(-14,14),def.y-130*def.sc,Math.round(dmg),'#fff',heavy?30:22);
  if(att.combo>=2){SND.play('combo');if(att.combo>=3)pop(att.x+att.face*30,att.y-170*att.sc,att.combo+' HIT COMBO!','#ffd24a',26)}
  if(def.hp<=0&&!tryRevive(def))koF(att,def,o);
  return true}
function tryRevive(d){if(d.revive&&!d.revived){d.revived=true;if(G.bo&&d===G.p)G.bo.rev=false;d.hp=d.maxhp*.5;d.chip=d.hp;d.inv=1.6;d.stun=0;pop(d.x,d.y-170*d.sc,'PHOENIX REVIVE!','#ff9a3a',26);ring(d.x,d.y-70,'#ff9a3a',160);burst(d.x,d.y-70,30,'#ff9a3a',500,8,'star');SND.play('unlock');return true}return false}
function koF(att,def,o){if(att.player)track('ko',1);def.hp=0;def.ko=true;def.atk=null;def.shield=false;def.vx=att.face*((o.kb||200)+330);def.vy=-560;def.onGround=false;def.rotV=att.face*8;def.rageT=0;def.rage=0;def.dodgeT=0;def.inv=0;G.hitstop=Math.max(G.hitstop||0,.13);def.sq=-.5;burst(def.x,def.y-70,14,'#fff6c8',820,3,'spark');
  if(G.battle){G.shake=Math.max(G.shake,12)}else{G.slow=1.3;G.shake=20;G.flashW=.35}SND.play('ko');burst(def.x,def.y-70,40,att.sp.glow,600,10,'star');ring(def.x,def.y-70,'#fff',140);ring(def.x,def.y-70,att.sp.glow,200);
  if(G.battle){battleKO(att,def)}else if(G.state==='fight'){G.state='ko';G.stateT=0}}
function shootProj(f,p){G.projs.push(Object.assign({owner:f,t:0,life:3,rot:0},p))}
function foesOf(f){return G.fs.filter(o=>o!==f&&!o.ko&&!o.out&&o.team!==f.team&&!(o.inv>0))}
function nearestFoe(f){let b=null,bd=1e9;for(const o of G.fs){if(o===f||o.team===f.team||o.ko||o.out)continue;const d=Math.abs(o.x-f.x)+Math.abs(o.y-f.y)*.6+(o.inv>0?500:0);if(d<bd){bd=d;b=o}}if(b)f.lastFoe=b;return b||f.lastFoe||G.fs.find(o=>o!==f)||f}
function updateAtk(f,foe,dt){
  const a=f.atk;a.t+=dt*(f.aspd||1)*(f.rageT>0?RAGE.aspd:1);
  if(a.type==='special'&&a.slot==='ult'){const C=(a.def&&a.def.col)||'#ff7ac8';
    if(a.t<.3){if(Math.random()<.7){const an=rnd(0,TAU),r=rnd(70,150);spawnP(f.x+Math.cos(an)*r,f.y-70+Math.sin(an)*r*.8,-Math.cos(an)*r*3.2,-Math.sin(an)*r*2.6,.3,5,C,'glow')}G.ultT=Math.max(G.ultT||0,.3);G.ultCol=C}
    else if(!a.fx){a.fx=true;G.shake=Math.max(G.shake,11);G.zp=Math.max(G.zp||0,.09);G.flashW=Math.max(G.flashW,.16);G.flashCol=C;ring(f.x,f.y-70,C,170);ring(f.x,f.y-70,'#fff',110);burst(f.x,f.y-70,26,C,640,8,'star');burst(f.x,f.y-60,14,'#fff',700,3,'spark')}}
  const S=a.def||f.sp.sp,pw=f.sp.pow,wf=!!S.wskill,FO=foesOf(f);
  if(a.type!=='special'){
    if(a.style==='shoot'){
      if(!a.fired&&a.t>=a.hs){a.fired=true;SND.play('swing');if(a.bolt){const B=a.bolt;shootProj(f,{x:f.x+f.face*56*f.sc,y:f.y-96*f.sc,vx:f.face*B.speed,vy:0,sp:B.speed,dmg:a.dmg*pw,r:B.r,col:B.col,kind:B.kind,ground:false,wp:false,rk:1});burst(f.x+f.face*56*f.sc,f.y-96*f.sc,8,B.col,200,5,'glow')}
      else{const K=(a.w&&a.w.pk)||{speed:880,r:12,col:'#ffe27a',kind:'warrow'};shootProj(f,{x:f.x+f.face*56*f.sc,y:f.y-96*f.sc,vx:f.face*K.speed,vy:0,sp:K.speed,dmg:a.dmg*pw,r:K.r,col:K.col,kind:K.kind,ground:false,wp:true,rk:1});burst(f.x+f.face*56*f.sc,f.y-96*f.sc,6,K.col,160,4,'glow')}}
    }else if(a.style==='throw'){
      if(!a.fired&&a.t>=a.hs){a.fired=true;SND.play('swing');f.boomOut=true;shootProj(f,{x:f.x+f.face*50*f.sc,y:f.y-92*f.sc,vx:f.face*640,vy:0,sp:640,dmg:a.dmg*pw,r:22,col:'#ffb347',kind:'boom',ret:true,ground:false,wp:true,life:3,rk:1})}
    }else if(!a.hit&&a.t>=a.hs&&a.t<=a.he){for(const o of FO)if(inRange(f,o,a.range)){a.hit=true;if(takeHit(f,o,{dmg:a.dmg*pw,kb:a.kb,up:a.up,stun:a.stun,en:a.en,heavy:a.heavy,wp:a.type==='punch'})&&a.fin)pop(o.x,o.y-165*o.sc,'FINISHER!','#ffd24a',24)}}
    f.vx*=Math.pow(.01,dt)
  }else if(a.kind==='proj'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.3){a.fired=true;const n=S.n||1;SND.play(S.kind==='fire'?'fire':'special');G.shake=Math.max(G.shake,4);
      for(let i=0;i<n;i++)shootProj(f,{x:f.x+f.face*50*f.sc,y:f.y-(S.kind==='rock'?55:92)*f.sc+(i-(n-1)/2)*(S.kind==='warrow'?24:30),vx:f.face*S.speed,vy:0,sp:S.speed,dmg:S.dmg*pw,r:S.r,col:S.col,kind:S.kind,ground:false,wp:wf,ret:!!S.ret,life:S.ret?3:3});
      if(S.ret)f.boomOut=true;
      if(S.heal)healF(f,S.heal);burst(f.x+f.face*50,f.y-90*f.sc,14,S.col,300,6,'glow')}
  }else if(a.kind==='dash'){
    if(a.t>.12&&a.t<.55){f.vx=f.face*S.speed;if(Math.random()<.8)spawnP(f.x-f.face*30,f.y-rnd(10,100),-f.face*60,rnd(-40,40),.5,rnd(6,12),S.col,S.kind==='dust'?'dust':'glow');
      if(!a.hit){for(const o of FO)if(inRange(f,o,70)){a.hit=true;takeHit(f,o,{dmg:S.dmg*pw,kb:480,up:160,stun:.6,en:12,heavy:true,wp:wf});if(S.heal)healF(f,S.heal);f.vx*=.3}}}
    else if(a.t>=.55)f.vx*=.8
  }else if(a.kind==='slam'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.35){a.fired=true;SND.play('shock');G.shake=Math.max(G.shake,14);G.flashW=.12;ring(f.x,f.y,S.col,120);ring(f.x,f.y,'#fff',80);burst(f.x,f.y-10,30,S.col,450,8,'star',500);
      for(const d of[-1,1])shootProj(f,{x:f.x+d*40,y:f.onGround&&f.plat?f.y:groundY(f.x+d*40),vx:d*420,vy:0,dmg:S.dmg*pw*.8,r:30,col:S.col,kind:S.kind,ground:true,life:1.6,wp:wf});
      for(const o of FO)if(o.onGround&&Math.abs(o.x-f.x)<120*f.sc&&Math.abs(o.y-f.y)<60)takeHit(f,o,{dmg:S.dmg*pw,kb:420,up:220,stun:.7,en:12,heavy:true,wp:wf})}
  }else if(a.kind==='flurry'){
    const last=S.hits;
    while(a.n<last&&a.t>=.2+(last>5?.12:.15)*a.n){a.n++;f.vx=f.face*170;SND.play('punch');const fin=a.n===last;
      for(let i=0;i<8;i++)spawnP(f.x+f.face*(50+i*6),f.y-rnd(50,110),f.face*200,rnd(-80,80),.3,5,S.col,'star');
      for(const o of FO)if(inRange(f,o,100)){takeHit(f,o,{dmg:S.dmg*pw*(fin?1.8:1),kb:fin?420:60,up:fin?150:0,stun:.32,en:3,heavy:fin,wp:wf})}}
  }else if(a.kind==='spin'){
    f.vx*=.92;
    while(a.n<4&&a.t>=.12+.16*a.n){a.n++;SND.play('swing');const y0=f.y-70*f.sc,fin=a.n===4;ring(f.x,y0,S.col,110);burst(f.x,y0,10,S.col,300,5,'star');
      for(const o of FO){const R=(S.rad||110)*f.sc+24*o.sc;if(Math.abs(o.x-f.x)<R&&Math.abs(o.y-f.y)<100*Math.max(f.sc,o.sc))hitFrom(f,o,{dmg:S.dmg*pw*(fin?1.6:1),kb:fin?420:90,up:fin?150:0,stun:.3,en:4,heavy:fin,wp:wf})}}
  }else if(a.kind==='heal'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.25){a.fired=true;healF(f,f.maxhp*S.pct/100);ring(f.x,f.y-70*f.sc,S.col,110);burst(f.x,f.y-70*f.sc,18,S.col,260,6,'star')}
  }else if(a.kind==='buff'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.25){a.fired=true;f.buffs[S.buff]=S.time;pop(f.x,f.y-160*f.sc,BUFFTXT[S.buff],S.col,26);ring(f.x,f.y-70*f.sc,S.col,120);ring(f.x,f.y-70*f.sc,'#fff',80);burst(f.x,f.y-70*f.sc,22,S.col,320,6,'star');G.shake=Math.max(G.shake,5)}
  }else if(a.kind==='nova'){
    f.vx*=.9;
    if(!a.fired&&a.t>=.3){a.fired=true;SND.play('shock');G.shake=Math.max(G.shake,12);G.flashW=.1;ring(f.x,f.y-30,S.col,S.rad*.9);ring(f.x,f.y-30,'#fff',S.rad*.6);burst(f.x,f.y-40,34,S.col,480,8,'star');
      for(const o of FO)if(Math.abs(o.x-f.x)<S.rad*f.sc+20&&o.y>f.y-120&&o.y<f.y+120)hitFrom(f,o,{dmg:S.dmg*pw,kb:400,up:200,stun:.65,en:10,heavy:true,wp:wf})}
  }else if(a.kind==='leap'){
    if(!a.leapt){a.leapt=true;f.vy=-880;f.vx=f.face*S.speed;f.onGround=false;f.y-=3}
    else if(!a.fired&&f.onGround&&a.t>.25){a.fired=true;SND.play('shock');G.shake=Math.max(G.shake,13);ring(f.x,f.y,S.col,S.rad);ring(f.x,f.y,'#fff',S.rad*.6);burst(f.x,f.y-10,26,S.col,420,7,'star',500);
      for(const o of FO)if(Math.abs(o.x-f.x)<S.rad*f.sc+20&&o.onGround&&Math.abs(o.y-f.y)<70)hitFrom(f,o,{dmg:S.dmg*pw,kb:420,up:220,stun:.7,en:12,heavy:true,wp:wf});a.t=Math.max(a.t,a.dur-.3)}
    if(!a.fired)f.vx+=((foe.x>f.x?1:-1)*S.speed*.5-f.vx)*dt*1.5;else f.vx*=.85
  }
  if(a.t>=a.dur)f.atk=null}
/* ---------- platforms / surfaces ---------- */
function support(x,vy,py,y,f){
  let best=null;const g=groundY(x);if(y>=g)best={y:g,pl:null};
  const ps=ARENA.plats;
  if(ps&&vy>=0)for(const p of ps){if(x<p.x-4||x>p.x+p.w+4)continue;if(f&&f.dropT>0&&f.dropP===p)continue;
    if(py<=p.y+12&&y>=p.y&&(!best||p.y<best.y))best={y:p.y,pl:p}}
  return best}
function below(f){let b=groundY(f.x);const ps=ARENA.plats;if(ps)for(const p of ps){if(f.x>=p.x-4&&f.x<=p.x+p.w+4&&p.y>=f.y-14&&p.y<b)b=p.y}return b}
function updF(f,foe,dt){try{updF0(f,foe,dt)}catch(err){window.__derr=(window.__derr||0)+1;(window.__errs=window.__errs||[]).length<20&&window.__errs.push('updF: '+(err&&err.stack||err));f.atk=null;f.stun=0;f.lock=0;f.in={};f.buf={};try{f.pose=newPose()}catch(_){}}}
function updF0(f,foe,dt){
  f.t+=dt;if(f.flash>0)f.flash-=dt;if(f.chainT>0)f.chainT-=dt;if(f.inv>0)f.inv-=dt;if(f.dropT>0)f.dropT-=dt;f.comboT-=dt;for(const k in f.cd)if(f.cd[k]>0)f.cd[k]-=dt;for(const k in f.buffs)if(f.buffs[k]>0)f.buffs[k]-=dt;if(f.comboT<=0)f.combo=0;f.dodgeCd-=dt;
  sane(f);
  for(const k of EDGES){if(f.buf[k]>0)f.buf[k]-=dt;if(f.in[k]){f.buf[k]=.2;f.in[k]=false}}
  if(f.buf.rage>0){f.buf.rage=0;activateRage(f)}
  if(f.rageT>0){f.rageT-=dt;f.rage=Math.max(0,f.rageT/RAGE.dur*RAGE.max);if(f.rageT<=0)endRage(f);else if(Math.random()<dt*28)spawnP(f.x+rnd(-26,26)*f.sc,f.y-rnd(10,110)*f.sc,rnd(-30,30),-rnd(80,200),rnd(.35,.7),rnd(4,8),Math.random()<.5?'#ff8a2a':'#ffd24a','glow')}
  if(f.hurtT>0)f.hurtT-=dt;f.sqv+=(-f.sq*300-f.sqv*17)*dt;f.sq=clamp(f.sq+f.sqv*dt,-.7,.9);
  if(f.regen>0&&G.state==='fight'&&!f.ko)f.hp=Math.min(f.maxhp,f.hp+f.maxhp*f.regen*dt);
  if(f.armFlash>0)f.armFlash-=dt;f.apT-=dt;if(f.apMax>0&&f.apT<=0&&f.ap<f.apMax&&!f.ko)f.ap=Math.min(f.apMax,f.ap+dt*(2+f.armor*.04));
  f.chip=Math.max(f.hp,f.chip-dt*28);
  if(f.ko){
    f.py=f.y;f.vy+=2300*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
    if(f.rotV){f.rot+=f.rotV*dt;if(Math.abs(f.rot)>1.45){f.rot=Math.sign(f.rotV)*1.5;f.rotV=0}}
    const sup=support(f.x,f.vy,f.py,f.y,f);if(sup){f.y=sup.y;if(f.vy>250){f.vy=-f.vy*.3;G.shake=Math.max(G.shake,6);burst(f.x,f.y,10,'#ddd',200,5,'dust')}else f.vy=0;f.vx*=Math.pow(.05,dt);f.onGround=true;f.plat=sup.pl}
    f.x=clamp(f.x,30,(ARENA.ww||W)-30);f.sy=below(f);updatePose(f,dt);return}
  const i=f.in,sp=f.sp,locked=f.lock>0;if(locked)f.lock-=dt;
  if(f.stun>0){f.stun-=dt;f.shield=false;f.vx*=Math.pow(.04,dt)}
  else if(f.atk){updateAtk(f,foe,dt)}
  else if(!locked){
    if(f.onGround&&f.plat&&f.plat.t==='o'&&i.sh&&f.buf.jump>0){f.buf.jump=0;f.dropT=.28;f.dropP=f.plat;f.vy=160;f.onGround=false;f.plat=null;f.y+=3;burst(f.x,f.y,5,'#ddd',90,4,'dust')}
    f.shield=!!(i.sh&&f.onGround&&f.sh>0&&f.dodgeT<=0);
    if(f.dodgeT>0)f.dodgeT-=dt;
    else{
      const dir=(i.r?1:0)-(i.l?1:0),spd=235*sp.spd*f.spdM*(f.buffs.spd>0?1.25:1)*(f.rageT>0?RAGE.spd:1)*(f.shield?.18:1)*(1-(f.wp.wt||0)*.2);
      const acc=f.onGround?18:6;f.vx+=(dir*spd-f.vx)*Math.min(1,acc*dt);
      if(f.buf.jump>0&&f.onGround&&!f.shield){f.buf.jump=0;f.vy=-800*(.88+.12*sp.jmp)*(f.sc>1.2?.95:1)*(f.rageT>0?RAGE.jump:1);f.onGround=false;f.sq=-.4;f.sqv=0;SND.play('jump');dustPuff(f.x,f.y,6)}
      if(f.buf.dodge>0&&f.dodgeCd<=0&&f.onGround){f.buf.dodge=0;f.dodgeT=.3;f.dodgeCd=.85;f.vx=(dir||-f.face)*560;SND.play('dodge');burst(f.x,f.y-60,8,sp.glow,160,6,'glow');dustPuff(f.x,f.y,6,1.2)}
      else if(f.buf.punch>0){f.buf.punch=0;startAtk(f,'punch')}
      else if(f.buf.ranged>0){f.buf.ranged=0;startAtk(f,'ranged')}
      else if(f.buf.ult>0){f.buf.ult=0;startAtk(f,'ult')}
    }
  }else f.vx*=.8;
  if(!f.shield&&f.sh<100)f.sh=Math.min(100,f.sh+25*dt);
  if(f.onGround&&!f.atk&&f.stun<=0&&f.dodgeT<=0&&Math.abs(foe.x-f.x)>6)f.face=foe.x>f.x?1:-1;
  // physics
  const ww=ARENA.ww||W;
  if(f.onGround&&f.plat&&f.plat.mv){f.x+=f.plat.dx;f.y=f.plat.y}
  f.py=f.y;f.vy+=2300*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
  if(f.x<40){f.x=40;f.vx=Math.max(0,f.vx)}if(f.x>ww-40){f.x=ww-40;f.vx=Math.min(0,f.vx)}
  const sup=support(f.x,f.vy,f.py,f.y,f);
  if(sup){if(!f.onGround&&f.vy>250){SND.play('land');dustPuff(f.x,sup.y,f.vy>700?12:7,f.vy>700?1.4:1);f.sq=clamp(f.vy/1300,.2,.75);f.sqv=0;if(f.vy>900)G.shake=Math.max(G.shake,3)}f.y=sup.y;f.vy=0;f.onGround=true;f.plat=sup.pl}
  else if(f.onGround&&f.vy>=0){const gl=support(f.x,0,f.py,f.y+20,f);if(gl){f.y=gl.y;f.plat=gl.pl}else{f.onGround=false;f.plat=null}}
  else{f.onGround=false;f.plat=null}
  f.sy=below(f);
  // soft body separation
  if(f.onGround)for(const o of G.fs){if(o===f||o.ko||o.out||!o.onGround||Math.abs(o.y-f.y)>40)continue;const d=o.x-f.x,m=34*(f.sc+o.sc)/2;if(Math.abs(d)<m){const push=(m-Math.abs(d))*.5*Math.sign(d||f.face);f.x-=push*.5;o.x+=push*.5}}
  updatePose(f,dt);
}

/* NaN / out-of-bounds guard: any broken fighter is put back on the map instead of vanishing */
function sane(f){
  const ww=ARENA.ww||W,top=ARENA.wtop==null?-100:ARENA.wtop,P=f.pose;let bad=false;
  for(const k of['x','y','vx','vy','hp','maxhp','chip','sh','ap','rot','sq','sqv','rage','rageT','flash','stun','lock','sc','t'])if(!Number.isFinite(f[k])){bad=true;break}
  if(!bad&&P&&!(Number.isFinite(P.hf[0]+P.hf[1]+P.hb[0]+P.hb[1]+P.ff[0]+P.ff[1]+P.fb[0]+P.fb[1]+P.lean+P.hip+P.open)))bad=true;
  if(bad||f.x<-150||f.x>ww+150||f.y>GROUND+900||f.y<top-1500){
    f.nanFix=(f.nanFix||0)+1;
    for(const k of['vx','vy','rot','rotV','sq','sqv','flash','stun','lock','rageT','rage','hurtT','t'])if(!Number.isFinite(f[k]))f[k]=0;
    if(!Number.isFinite(f.maxhp)||f.maxhp<=0)f.maxhp=100;if(!Number.isFinite(f.hp))f.hp=f.maxhp;if(!Number.isFinite(f.chip))f.chip=f.hp;
    if(!Number.isFinite(f.sh))f.sh=100;if(!Number.isFinite(f.ap))f.ap=f.apMax||0;if(!(f.sc>0&&Number.isFinite(f.sc)))f.sc=f.sp.sc;
    f.pose=newPose();f.atk=null;f.vx=0;f.vy=0;f.rot=0;f.rotV=0;f.dodgeT=0;f.shield=false;f.plat=null;
    const x=clamp(Number.isFinite(f.x)?f.x:ww/2,60,ww-60);f.x=x;
    if(f.ko){f.y=groundY(x);f.onGround=true}else{f.y=Math.min(top+80,-80);f.onGround=false;f.inv=Math.max(f.inv||0,1.5)}
    f.sy=groundY(x);ring(f.x,f.y,'#fff',90)}
  if(f.hp<=0&&!f.ko&&!f.out&&!f.revive&&G.state==='fight'&&!f.dying){f.hp=Math.max(1,f.hp)} // dead-but-not-KO guard
}
/* ---------- AI ---------- */
function mkAI(diff,boss,v){v=v||{};return{diff:v.fast?Math.min(1.5,diff+.1):diff,boss,t:rnd(.3,.8),shT:0,dodgy:!!v.dodge}}
function aiPlat(f,foe,dx,i){
  const ps=ARENA.plats;if(!ps||!ps.length)return false;const a=f.ai,dy=foe.y-f.y;
  const span=(p,m)=>f.x>=p.x+m&&f.x<=p.x+p.w-m;
  if(a.tp){
    if(a.tpT<=0||(f.onGround&&f.plat===a.tp)||Math.abs(dy)<50&&Math.abs(dx)<110){a.tp=null}
    else{const p=a.tp,cx=p.x+p.w/2;if(Math.abs(cx-f.x)>16)i[cx>f.x?'r':'l']=true;
      if(f.onGround&&f.y>p.y&&f.y-p.y<150&&f.x>=p.x-10&&f.x<=p.x+p.w+10)i.jump=true;
      if(f.onGround&&f.y>p.y+150)a.tp=null;
      return true}}
  if(!f.onGround)return false;
  if(dy>70&&f.plat){ // foe is lower
    if(f.plat.t==='o'&&Math.abs(dx)<520){i.sh=true;i.jump=true;a.shT=0;return true}
    if(Math.abs(dx)>40){i[dx>0?'r':'l']=true;return true}}
  if(dy<-70&&Math.abs(dy)<420){ // foe higher: find a ledge to climb
    let best=null,bc=1e9;
    for(const p of ps){const rise=f.y-p.y;if(rise<20||rise>125)continue;const dxp=f.x<p.x?p.x-f.x:f.x>p.x+p.w?f.x-p.x-p.w:0;if(dxp>520)continue;
      const c=dxp+Math.abs(p.y-foe.y)*2.2+Math.abs(p.x+p.w/2-foe.x)*.25;if(c<bc){bc=c;best=p}}
    if(best){a.tp=best;a.tpT=2.4;return aiPlat(f,foe,dx,i)}}
  return false}
function aiThink(f,foe,dt){try{aiThink0(f,foe,dt)}catch(err){window.__derr=(window.__derr||0)+1;(window.__errs=window.__errs||[]).length<20&&window.__errs.push('ai: '+(err&&err.stack||err));f.in.l=f.in.r=false}}
function aiThink0(f,foe,dt){if(f.ai.tpT>0)f.ai.tpT-=dt;
  const a=f.ai,i=f.in;let diff=a.diff+(f.phase>1?.08*(f.phase-1):0);diff=Math.max(0,Math.min(1.5,diff));
  if(a.shT>0){a.shT-=dt;i.sh=true}else i.sh=false;
  if(foe.ko||foe.out||f.ko||G.state!=='fight'){i.l=i.r=false;return}
  a.t-=dt;if(a.t>0)return;a.t=rnd(.07,.2)*(1.4-Math.min(1.25,diff)*.7);
  const dx=foe.x-f.x,d=Math.abs(dx),S=f.sp.sp,tw=dx>0?'r':'l',aw=dx>0?'l':'r';
  i.l=i.r=false;
  if(f.rage>=RAGE.max&&f.rageT<=0&&d<420&&G.state==='fight'&&Math.random()<.3+diff*.45){i.rage=true}
  if(f.stun>0||f.atk)return;
  if(aiPlat(f,foe,dx,i))return;
  if(foe.atk&&d<150&&Math.random()<Math.min(.9,.18+diff*.5)){const r=Math.random();
    if(r<(a.dodgy?.3:.55))a.shT=rnd(.35,.7);else if(r<.8&&f.dodgeCd<=0)i.dodge=true;else i.jump=true;return}
  if(diff>.3){const pr=G.projs.find(q=>q.owner.team!==f.team&&Math.abs(q.x-f.x)<200&&Math.sign(q.vx)===Math.sign(f.x-q.x));
    if(pr&&Math.random()<.08+diff*.4){const r=Math.random();if(r<.4)a.shT=rnd(.3,.5);else if(r<.7&&f.dodgeCd<=0)i.dodge=true;else i.jump=true;return}}
  if(diff>.45&&foe.atk&&foe.atk.type!=='special'&&foe.atk.t>(foe.atk.he||0)+.02&&d<(f.wp.ranged?80:f.wp.range)*.9*f.sc&&Math.random()<.15+diff*.5){i.punch=true;return}
  const aiOk=X=>{switch(X.type){case'proj':return d>180;case'dash':return d>140&&d<430;case'slam':return d<150;case'flurry':return d<110;case'spin':return d<120;case'nova':return d<X.rad*.8;case'heal':return f.hp<f.maxhp*.55;case'buff':return d<420;case'leap':return d>170&&d<420;default:return false}};
  const U=CULT[f.sp.id];if(f.cd.ult<=0&&Math.random()<.12+diff*.4&&aiOk(U)){i.ult=true;return}
  if(f.wp.ranged&&f.wp.style==='shoot'){if(d>430)i[tw]=true;else if(d<140){if(Math.random()<.5)i[aw]=true;else if(d<100)i.punch=true}else if(Math.random()<.45+.3*diff)i.ranged=true;return}
  if(f.wp.style==='throw'&&!f.boomOut&&d>150&&d<420&&Math.random()<.5){i.ranged=true;return}
  if(!f.wp.ranged&&f.cd.ranged<=0&&d>230&&d<560&&Math.random()<.25+.35*diff){i.ranged=true;return}
  if(f.boss&&Math.random()<.04)i.jump=true;
  if(d>Math.max(70,(f.wp.ranged?82:f.wp.range)*.85*f.sc)+6+rnd(-8,14)){i[tw]=true;if(Math.random()<.05)i.jump=true;if(Math.random()<.05&&f.dodgeCd<=0&&d>200)i.dodge=true}
  else{const r=Math.random(),ag=Math.min(.9,.45+.4*diff);
    if(r<ag)i.punch=true;else if(r<ag+.12)i[aw]=true;else if(r<ag+.2)a.shT=rnd(.3,.6)}
}

/* ---------- Fight ---------- */
function pauseGame(){G.paused=true;pauseUI.focus=0;SND.play('back')}
function startFight(cfg){cfg.level=cfg.level;
  G={cfg,mode:cfg.mode,dmgDealt:0,runXP:0,runCoins:0,kos:0,perks:[],toasts:[],prevBest:save.best,lvStart:hs(SPECIES[cfg.hero].id).lvl,projs:[],pops:[],shake:0,hitstop:0,slow:0,t:0,state:'intro',stateT:0,paused:false,round:1,wins:[0,0],wave:1,score:0,flashW:0,time:0,start:performance.now(),carry:null,banner:''};
  setArena(cfg.arena);resetPlats(ARENA);
  G.bo={};{const B=save.boosts;for(const k of['xp','coin','pwr','arm','nit','rev'])if(B[k]>0){B[k]--;G.bo[k]=true}persist()}
  if(cfg.mode==='survival')track('endless_wave',1);
  initRound();go(S.fight);
  SND.music(cfg.boss?'boss':'battle');
}
const ENW=WEAPONS.map(w=>w.id);
const wRank=w=>w.ranged?'RANGED':'CLOSE';
/* difficulty: tuned with AI-vs-AI sims (see tools/sim) */
const DIFFM=[{n:'EASY',hp:.85,dmg:.8,ai:-.12},{n:'NORMAL',hp:1,dmg:1,ai:0},{n:'HARD',hp:1.2,dmg:1.2,ai:.12}];
const STAGE={hp0:.8,hpK:.03,dm0:.55,dmK:.0138,ar:1.1,ai0:.15,aiK:.035,sp0:.94,spK:.004,cd0:1.7,cdK:.025,bh0:.95,bhK:.05,bd:.72,ba:0};
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
function spawnEnemy(side){const o=enemyFor(G.cfg);const e=mkF(o.idx,side>0?ARENA.ww/2+310:ARENA.ww/2-310,side>0?-1:1,{team:1,scale:o.scale,hpm:o.hpm,boss:o.boss,dmgM:o.dmgM,defM:o.defM,spdM:o.spdM,cdM:o.cdM,wp:o.wp,tag:o.tag,aura:o.aura,armor:o.armor,gear:o.gear,ai:mkAI(o.diff,o.boss,o.v),en:20});e.lock=1.4;e.cd.ult=rnd(4,8)*e.cdM;e.cd.ranged=rnd(.5,1.5);
  e.ename=o.boss&&G.cfg.mode==='story'?LEVELS[G.cfg.level].name.replace(/^.*?: /,''):o.boss&&G.cfg.mode==='survival'?BOSSN[(Math.random()*BOSSN.length)|0]+' '+SPECIES[o.idx].name:SPECIES[o.idx].name;return e}
function bossPhase(e){const ph=e.phase;pop(e.x,e.y-190*e.sc,'PHASE '+ph+'!','#ff5a4a',32);toast(ph===3?'BOSS ENRAGED! Hits harder and faster!':'BOSS PHASE 2: It gets angrier!','#ff8a7a');
  e.dmgM*=1.12;e.spdM*=1.07;e.cdM*=.8;e.cd.ult=0;e.armor+=6;e.apMax=18+e.armor*1.2;e.ap=e.apMax*.7;e.aura=ph===3?'#ff2a2a':'#ff9a3a';
  G.shake=18;G.flashW=.25;SND.play('shock');ring(e.x,e.y-70,'#ff5a4a',220);ring(e.x,e.y-70,'#fff',140);burst(e.x,e.y-80,40,'#ff7a3a',560,9,'star')}
function toast(text,col){if(G){G.toasts=G.toasts||[];G.toasts.push({text,col:col||'#ffe27a',t:0})}}
const PERKS=[
 {id:'dmg',n:'+15% DAMAGE',d:'All your attacks hit harder',tag:'ATK',col:'#ff9a3a',fn:p=>{p.dmgM*=1.15}},
 {id:'heal',n:'HEAL 50%',d:'Restore half of your life now',tag:'LIFE',col:'#7aff9a',fn:p=>{healF(p,p.maxhp*.5)}},
 {id:'armor',n:'+10 ARMOR',d:'Tougher armor, less damage taken',tag:'ARM',col:'#7ac8ff',fn:p=>{p.armor+=10;p.apMax=18+p.armor*1.2;p.ap=p.apMax}},
 {id:'cd',n:'-15% COOLDOWNS',d:'Ultimate and ranged recharge faster',tag:'CD',col:'#c08aff',fn:p=>{p.cdM*=.85}},
 {id:'spd',n:'+8% SPEED',d:'Move faster and attack 6% faster',tag:'SPD',col:'#c8ff5a',fn:p=>{p.spdM*=1.08;p.aspd*=1.06}},
 {id:'steal',n:'+4% LIFESTEAL',d:'Heal from damage you deal',tag:'STL',col:'#ff6a9a',fn:p=>{p.steal+=.04}},
 {id:'maxhp',n:'+20% MAX LIFE',d:'More max life, and heal that much',tag:'HP',col:'#ff6a7a',fn:p=>{const d=p.maxhp*.2;p.maxhp+=d;p.hp+=d;p.chip=p.hp}},
 {id:'regen',n:'+0.2% REGEN',d:'Heal slowly while fighting',tag:'REG',col:'#5aff9a',fn:p=>{p.regen+=.004/HPK}},
 {id:'ultr',n:'ULT READY + CHARGE',d:'Refresh your ultimate and recharge it 25% faster',tag:'ULT',col:'#b66bff',fn:p=>{p.cd.ult=0;p.enM*=1.25}}];
function pickPerks(n){const a=PERKS.slice(),o=[];while(o.length<n&&a.length)o.push(a.splice((Math.random()*a.length)|0,1)[0]);return o}
function initRound(){
  const cfg=G.cfg;
  G.cam=null;G.p=mkF(cfg.hero,ARENA.ww/2-310,1,{player:true,en:25,st:statsOf(SPECIES[cfg.hero].id),wp:equipped(cfg.hero),gear:save.armor});G.p.lock=1.4;
  if(G.bo.pwr)G.p.dmgM*=1.15;if(G.bo.arm){G.p.armor+=10;G.p._a+=10;armorInit(G.p)}if(G.bo.nit)G.p.cdM*=.7;G.p.revive=!!G.bo.rev;
  G.e=spawnEnemy(1);G.projs=[];G.state='intro';G.stateT=0;G.slow=0;
  if(cfg.mode==='survival'&&G.carry){G.p.hp=G.carry.hp;G.p.en=G.carry.en}
  G.banner=cfg.mode==='duel'?'ROUND '+G.round:cfg.mode==='story'?'LEVEL '+(cfg.level+1):(G.e.boss?'BOSS ':'')+'WAVE '+G.wave;
  SND.play('fight');
}
function killProj(i){const p=G.projs[i];if(p&&p.ret&&p.owner)p.owner.boomOut=false;G.projs.splice(i,1)}
function updateProj(dt){
  for(let i=G.projs.length-1;i>=0;i--){
    const p=G.projs[i],ww=ARENA.ww||W;p.t+=dt;p.rot+=dt*(p.ret?18:8);
    if(p.ret){const ow=p.owner;if(!p.back&&(p.t>.55||p.x<24||p.x>ww-24))p.back=true;
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
    if(p.t>p.life||p.x<-60||p.x>ww+60){killProj(i);continue}
    for(const foe of foesOf(p.owner)){
    const near=Math.abs(p.x-foe.x)<p.r+26*foe.sc;
    const vert=p.ground?(foe.onGround&&Math.abs(foe.y-p.y-6)<46):(p.y>foe.y-135*foe.sc-p.r*.5&&p.y<foe.y+p.r*.5);
    if(near&&vert&&!(p.ret&&(p.back?p.hb:p.ho))){
      const dir=Math.sign(p.vx);const att=p.owner;const sv=att.face;att.face=dir;
      const r=takeHit(att,foe,{dmg:p.dmg,kb:p.rk?210:p.kind==='warrow'?200:380,up:p.ground?200:p.rk?40:120,stun:p.rk?.3:p.kind==='warrow'?.3:.5,en:8,heavy:p.kind!=='warrow'&&!p.rk,proj:true,wp:p.wp,rk:p.rk});att.face=sv;
      if(r||foe.shield||foe.dodgeT<=0){burst(p.x,p.y,p.ret?8:16,p.col,350,7,'star');ring(p.x,p.y,p.col,p.ret?40:60);
        if(p.ret){if(p.back)p.hb=true;else{p.ho=true;p.back=true}}else{G.projs.splice(i,1);break}}
    }}
  }
}
function updateCam(dt,snap){
  const fs=G.fs||[G.p,G.e];let list=fs.filter(f=>!f.ko&&!f.out);if(!list.length)list=fs.filter(f=>!f.out);if(!list.length)list=fs;
  const ww=ARENA.ww||W,wtop=ARENA.wtop==null?-100:ARENA.wtop;
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const f of list){if(!Number.isFinite(f.x+f.y))continue;x0=Math.min(x0,f.x-130);x1=Math.max(x1,f.x+130);y0=Math.min(y0,f.y-190*f.sc-30);y1=Math.max(y1,f.y+45)}
  if(!(Number.isFinite(x0+x1+y0+y1))){x0=0;x1=ww;y0=-100;y1=GROUND+45}
  const bw=Math.max(300,x1-x0),bh=Math.max(240,y1-y0);
  const zmin=Math.max(.4,W/ww+.001),zmax=fs.length>2?1:1.12;
  let tz=Math.min(W/bw,(H*.8)/bh);tz=clamp(tz,zmin,zmax);
  let cx=(x0+x1)/2,cy=(y0+y1)/2-.05*H/tz,hw,hh;
  const fit=()=>{hw=W/2/tz;hh=H/2/tz;cx=clamp((x0+x1)/2,hw,ww-hw);cy=clamp((y0+y1)/2-.05*H/tz,wtop+hh,Math.max(wtop+hh,GROUND+130-hh))};
  fit();
  // every living fighter must be inside the view: zoom out until they are (floor .3)
  for(let k=0;k<10;k++){let ok=true;for(const f of list){if(f.x<cx-hw+20||f.x>cx+hw-20||f.y-120*f.sc<cy-hh||f.y>cy+hh-10){ok=false;break}}if(ok||tz<=.3)break;tz=Math.max(.3,tz*.9);fit()}
  const c=G.cam;
  if(!c||snap||!Number.isFinite(c.x+c.y+c.z)){G.cam={x:cx,y:cy,z:tz};return}
  let out=false;for(const f of list){const vw=W/2/c.z,vh=H/2/c.z;if(f.x<c.x-vw+10||f.x>c.x+vw-10||f.y-120*f.sc<c.y-vh||f.y>c.y+vh-4){out=true;break}}
  const kp=1-Math.exp(-(out?16:5)*dt),kz=1-Math.exp(-(out?12:3)*dt);
  c.z+=(tz-c.z)*kz;const h2=W/2/c.z,v2=H/2/c.z;
  c.x+=(cx-c.x)*kp;c.y+=(cy-c.y)*kp;
  c.x=clamp(c.x,h2,ww-h2);c.y=clamp(c.y,wtop+v2,Math.max(wtop+v2,GROUND+130-v2))}
function updateFight(dt){
  if(G.paused)return;
  G.flashW=Math.max(0,G.flashW-dt);if(G.flashW<=0)G.flashCol=null;G.zp=Math.max(0,(G.zp||0)-dt*.5);G.ultT=Math.max(0,(G.ultT||0)-dt);
  if(G.hitstop>0){G.hitstop-=dt;return}
  let sdt=dt;if(G.slow>0){G.slow-=dt;sdt=dt*.3}
  G.shake=Math.max(0,G.shake-dt*40);G.t+=sdt;G.stateT+=dt;
  if(G.battle)return updateBattle(dt,sdt);
  const p=G.p,e=G.e;G.fs=[p,e];updatePlats(ARENA,G.t);
  // player input
  if(p.ai){if(G.state==='fight')aiThink(p,e,sdt)}else{p.in.l=inp.held.left;p.in.r=inp.held.right;p.in.sh=inp.held.shield;
  for(const k of EDGES)if(inp.press[k])p.in[k]=true}
  inp.press={};
  if(G.state==='intro'){if(G.stateT>1.5){G.state='fight';G.stateT=0}}
  if(G.state==='fight'||G.state==='ko'||G.state==='intro'){
    if(e.ai&&G.state!=='intro')aiThink(e,p,sdt);
    updF(p,e,sdt);updF(e,p,sdt);updateProj(sdt);updateCam(dt);
    if(e.boss&&!e.ko&&G.state==='fight'){const r=e.hp/e.maxhp,ph=r<.34?3:r<.67?2:1;if(ph>e.phase){e.phase=ph;bossPhase(e)}}
  }
  updateParts(sdt);if(!G.battle&&G.state==='perk')updateCam(dt);
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
      const xp=(12+wv*6+(boss?40:0))*(G.bo.xp?2:1),co=(8+wv*4+(boss?30:0))*(G.bo.coin?2:1);G.runXP+=xp;G.runCoins+=co;save.coins+=co;const lv=addXP(hid,xp);if(wv>save.best)save.best=wv;persist();
      G.wave++;track('endless_wave',G.wave);
      G.carry={hp:Math.min(G.p.maxhp,G.p.hp+G.p.maxhp*.2),en:Math.min(100,G.p.en+30)};G.p.hp=G.carry.hp;G.p.chip=G.p.hp;G.p.en=G.carry.en;G.p.ap=Math.min(G.p.apMax,G.p.ap+G.p.apMax*.5);
      G.projs=[];G.state='perk';G.stateT=0;G.perkInfo={wave:wv,xp,co,lv,boss};G.choices=pickPerks(3);buildPerkUI();SND.play('win');if(lv>0)SND.play('unlock')}
    else endFight(false)}
}
function nextWave(){G.e=spawnEnemy(G.p.x<ARENA.ww/2?1:-1);G.e.lock=1.2;G.p.ko=false;G.p.boomOut=false;G.state='intro';G.stateT=0;G.banner=(G.e.boss?'BOSS ':'')+'WAVE '+G.wave;G.projs=[];SND.play('fight')}
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
  if(G.bo){if(G.bo.xp)xp*=2;if(G.bo.coin)coins*=2;r.bo=Object.keys(G.bo).filter(k=>G.bo[k])}
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
  c.beginPath();c.arc(x+11,y+26,7.5,0,TAU);c.fillStyle=rdy?'#fff':'#bbb';c.fill();txt(c,key,x+11,y+26.5,key.length>1?8:10.5,'#1a0a30');
  if(cd>0)txt(c,Math.ceil(cd)+'s',x+w/2+8,y+26,13,'#fff','center','#000',3);else if(sub)txt(c,sub,x+w/2+8,y+26,9.5,'#fff','center','#000',3);
  c.restore()}
function drawHUD(c,t){
  const p=G.p,e=G.e;
  const side=(f,x,flip,name)=>{
    const w=340,r=f.hp/f.maxhp,ax=flip?x+w:x,bx=flip?x+w-w*.62:x,bc=bx+w*.31;
    rr(c,x-6,6,w+12,f.player?180:96,14);c.fillStyle='rgba(10,5,30,.58)';c.fill();
    txt(c,name,ax,17,17,'#fff',flip?'right':'left','#000',4);
    drawBar(c,x,28,w,19,r,hpCol(c,r),flip,f.chip/f.maxhp);
    // boss phase ticks
    if(f.boss){for(const q of[.34,.67]){const tx=flip?x+w-w*q:x+w*q;c.fillStyle='#fff';c.fillRect(tx-1,28,2,19)}}
    txt(c,'LIFE '+Math.ceil(f.hp)+' / '+Math.round(f.maxhp),x+w/2,38,12,'#fff','center','#000',3);
    // armor
    if(f.armor>0){const ar=f.apMax?f.ap/f.apMax:0;drawBar(c,bx,51,w*.62,12,ar,f.armFlash>0?'#fff':'#6ab8ff',flip);
      txt(c,'ARMOR '+Math.round(f.armor)+'  (-'+Math.round(armRed(f.armor)*100)+'% dmg)'+(f.ap<=0?' BROKEN':''),bc,57.5,10,'#fff','center','#000',3)}
    else txt(c,'ARMOR 0',ax,57,10,'#9ab',flip?'right':'left');
    // block meter
    {const wt=w*.9,bw2=wt*.34,rw=wt-bw2-6,bk=flip?x+w-bw2:x,rx=flip?x+w-wt:x+bw2+6,full=f.rage>=RAGE.max&&f.rageT<=0,act=f.rageT>0;
      drawBar(c,bk,66,bw2,11,f.sh/100,f.sh<30?'#ff9a5a':'#5aff9a',flip);txt(c,'BLOCK',bk+bw2/2,71.5,10,'#fff','center','#000',3);
      drawBar(c,rx,66,rw,11,f.rage/RAGE.max,act?grad(c,rx,0,rx+rw,0,['#ffd24a','#ff8a2a']):full?grad(c,rx,0,rx+rw,0,['#ff5a1a','#ffd24a','#ff5a1a']):'#d8561a',false);
      if(full){c.save();c.globalAlpha=.5+.4*Math.sin(t*9);rr(c,rx,66,rw,11,5.5);c.strokeStyle='#ffd24a';c.lineWidth=3;c.stroke();c.restore()}
      txt(c,act?'RAGE '+Math.ceil(f.rageT)+'s':full?'RAGE READY '+kh('R'):'RAGE '+Math.floor(f.rage)+'%',rx+rw/2,71.5,10,'#fff','center','#000',3)}
    if(f.player){
      const labels=[['J','CLOSE','#ff7a3a',null,null,'melee'],['H','RANGED','#4ad0ff','ranged',null,'shoot'],['O','ULT','#ff7ac8','ult',null,'power'],['R','RAGE','#ff8a2a',null,f.rageT>0?Math.ceil(f.rageT)+'s':null,'rage',f.rageT>0?f.rageT/RAGE.dur:f.rage/RAGE.max]];
      labels.forEach((l,k)=>chip(c,x+k*85,82,81,37,kh(l[0]),l[1],l[2],f,l[3],t,l[5],l[4],l[6]));
      const cw=f.wp.ranged;
      txt(c,'CLOSE ATTACK ('+kh('J')+'): '+(cw?'Punch (melee)':f.wp.name+' (melee)'),x,129,11,'#ffe9b0','left','#000',3);
      txt(c,'RANGED ATTACK ('+kh('H')+'): '+(cw?f.wp.name+' (ranged)':RB[f.sp.id].name+' (ranged)'),x,142,11,'#bfeaff','left','#000',3);
      txt(c,'ULTIMATE ('+kh('O')+'): '+CULT[f.sp.id].name+'  ·  cooldown '+Math.round(Math.max(ULT_MIN,CULT[f.sp.id].cd)*f.cdM/(f.enM||1))+'s',x,155,11,'#ffd0f0','left','#000',3);
      txt(c,'RANGED cooldown '+(f.cdMax.ranged>1.01||f.cd.ranged>0?f.cdMax.ranged.toFixed(1):((f.wp.ranged?(f.wp.style==='throw'?RCD.throw:RCD.weapon):RCD.bolt)*f.cdM).toFixed(1))+'s  ·  RAGE: fills in battle, lasts 10s',x,168,11,'#ffe0a0','left','#000',3);
    }else txt(c,f.wp.name+(f.wp.ranged?' (ranged)':' (melee)'),ax,88,11,'#ffe9b0',flip?'right':'left','#000',3);
    let by=f.player?196:106;for(const k in f.buffs)if(f.buffs[k]>0){txt(c,{atk:'POWER UP',spd:'FRENZY',def:'ARMOR UP'}[k]+' '+Math.ceil(f.buffs[k]),ax,by,12,'#ffd24a',flip?'right':'left','#000',3);by+=14}
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
/* touch buttons only hide after a REAL gamepad button press and when no finger has touched recently */
function touchHidden(){return GP.active&&nowMs()-(GP.lastBtn||0)<6000&&ptrs.size===0&&nowMs()-lastTouch>2500} // only hidden while a pad button was pressed in the last 6s; any touch or idle pad brings the buttons straight back
let frameNo=0,touchDrawnFrame=-1;
function drawTouch(c,t){
  touchDrawnFrame=frameNo;
  if(!touchMode||touchHidden()||(G.battle&&!G.touchSlot))return;
  c.save();
  for(const b of TB){
    const on=inp.held[b.n];c.globalAlpha=on?.9:.62;
    c.beginPath();c.arc(b.x,b.y,b.r,0,TAU);c.fillStyle=b.c?(on?b.c:'rgba(20,10,50,.78)'):(on?'#9a8aff':'rgba(20,10,50,.7)');c.fill();
    c.lineWidth=4;c.strokeStyle=b.c||'#9a8aff';c.stroke();
    c.fillStyle='#fff';
    if((b.n==='ult'||b.n==='ranged')&&G&&G.p){const f=G.p,cd=Math.max(0,f.cd[b.n]),mx=f.cdMax[b.n]||1;
      if(cd>0){c.save();c.globalAlpha=.8;c.beginPath();c.moveTo(b.x,b.y);c.arc(b.x,b.y,b.r-2,-Math.PI/2+TAU*(1-cd/mx),-Math.PI/2+TAU);c.closePath();c.fillStyle='rgba(0,0,0,.72)';c.fill();c.restore()}
      else{c.globalAlpha=.95;c.beginPath();c.arc(b.x,b.y,b.r+4+Math.sin(time*8)*2,0,TAU);c.strokeStyle=b.c;c.lineWidth=3;c.stroke();c.globalAlpha=on?.9:.75}
      if(cd>0){c.globalAlpha=.95;txt(c,Math.ceil(cd)+'s',b.x,b.y-b.r*.28,15,'#fff','center','#000',4);c.globalAlpha=.9}}
    if(b.n==='rage'&&G&&G.p){const f=G.p,full=f.rage>=RAGE.max&&f.rageT<=0,act=f.rageT>0,fr=act?f.rageT/RAGE.dur:f.rage/RAGE.max;
      c.save();c.globalAlpha=.85;c.beginPath();c.arc(b.x,b.y,b.r-2,0,TAU);c.clip();c.fillStyle=act?'#ffb02a':'#ff6a1a';c.fillRect(b.x-b.r,b.y+b.r-2*b.r*fr,2*b.r,2*b.r*fr);c.restore();
      if(full){glow(c,b.x,b.y,b.r*2.3,'#ff8a2a',.55+.25*Math.sin(time*9));c.save();c.globalAlpha=.95;c.beginPath();c.arc(b.x,b.y,b.r+5+Math.sin(time*9)*3,0,TAU);c.strokeStyle='#ffd24a';c.lineWidth=4;c.stroke();c.restore()}
      if(act){c.save();c.globalAlpha=1;txt(c,Math.ceil(f.rageT)+'s',b.x,b.y+b.r*.45,15,'#fff','center','#000',4);c.restore()}}
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
  const p=G.p,e=G.e;if(!G.fs)G.fs=[p,e];
  if(!G.cam)updateCam(0,true);
  const cam=G.cam,z=(Number.isFinite(cam.z)?cam.z:1)*(G.slow>0?1.04:1)*(1+(G.zp||0));
  c.save();
  if(G.shake>0)c.translate(rnd(-G.shake,G.shake)*.7,rnd(-G.shake,G.shake)*.7);
  drawArenaBg(c,G.t,{x:cam.x,y:cam.y,z});
  c.save();c.translate(W/2,H/2);c.scale(z,z);c.translate(-cam.x,-cam.y);
  drawArenaWorld(c,G.t);
  const order=G.fs.filter(f=>!f.out).sort((a,b)=>a.y-b.y);
  if(G.battle)for(const f of G.fs){if(!f.out&&!f.ko)teamRing(c,f)}
  if(e.boss&&!e.ko&&!G.battle){glow(c,e.x,e.y-80*e.sc,150,e.sp.glow,.3+.1*Math.sin(t*5))}
  if(e.aura&&!e.ko&&!G.battle){glow(c,e.x,e.y-80*e.sc,130*e.sc,e.aura,.32+.12*Math.sin(t*4))}
  for(const f of G.fs){if(f.ko||f.out)continue;if(f.buffs.atk>0)glow(c,f.x,f.y-80*f.sc,110*f.sc,'#ff5a2a',.4);if(f.buffs.spd>0)glow(c,f.x,f.y-80*f.sc,110*f.sc,'#cfe0ff',.4);if(f.rageT>0){glow(c,f.x,f.y-80*f.sc,150*f.sc,'#ff5a1a',.38+.14*Math.sin(t*14));glow(c,f.x,f.y-70*f.sc,80*f.sc,'#ffd24a',.28)}else if(f.rage>=RAGE.max)glow(c,f.x,f.y-4,50*f.sc,'#ff8a2a',.35+.2*Math.sin(t*9));if(f.buffs.def>0){glow(c,f.x,f.y-80*f.sc,110*f.sc,'#7ad8ff',.35);c.save();c.strokeStyle='rgba(160,230,255,.7)';c.lineWidth=3;c.beginPath();c.arc(f.x,f.y-70*f.sc,70*f.sc,0,TAU);c.stroke();c.restore()}}
  order.forEach(f=>{const d=_sd;try{drawFighter(c,f)}catch(err){unwind(d);window.__derr=(window.__derr||0)+1;(window.__errs=window.__errs||[]).length<20&&window.__errs.push('drawFighter: '+(err&&err.stack||err));try{c.save();c.fillStyle=f.tc||'#fff';c.globalAlpha=.9;c.beginPath();c.ellipse(f.x||0,(f.y||0)-60,28,60,0,0,TAU);c.fill();c.restore()}catch(_){unwind(d)}}});
  for(const f of G.fs)if(f.ko&&!f.out&&f.onGround&&(f.koT||0)<1.1&&!f.rotV){const a0=G.t*5;for(let i=0;i<3;i++){const a=a0+i*TAU/3;glow(c,f.x+Math.cos(a)*26,f.y-34*f.sc+Math.sin(a)*7,9,'#ffe27a',.9)}}
  for(const q of G.projs)drawProj(c,q);
  if(G.battle)for(const f of G.fs){if(!f.out&&!f.ko)nameTag(c,f)}
  drawParts(c);
  for(const q of G.pops){const k=q.t/1.1;c.globalAlpha=1-k*k;txt(c,q.text,q.x,q.y-k*50,q.size,q.col,'center','#000',5);c.globalAlpha=1}
  c.restore();
  c.restore();
  if(G.flashW>0){c.save();c.globalAlpha=Math.min(1,G.flashW*1.6);c.fillStyle=G.flashCol||'#fff';c.fillRect(0,0,W,H);c.restore()}
  if(G.ultT>0){c.save();c.globalAlpha=Math.min(.4,G.ultT*1.4);c.fillStyle=rgrad(c,W/2,H/2,H*.2,H*.9,['rgba(0,0,0,0)',G.ultCol||'#ff7ac8']);c.fillRect(0,0,W,H);c.restore()}
  // vignette
  c.fillStyle=rgrad(c,W/2,H/2,H*.45,H*.95,['rgba(0,0,0,0)','rgba(0,0,0,.45)']);c.fillRect(0,0,W,H);
  if(G.battle)drawBattleHUD(c,t);else drawHUD(c,t);
  if(G.state==='intro'){const k=G.stateT;
    if(k<.9)txt(c,G.banner,480,200,64*(1+(1-Math.min(1,k*4))*.5),'#fff','center','#2a0a5a',12);
    else{const s=1+(k-.9)*.8;c.globalAlpha=Math.max(0,1-(k-.9)*1.5);txt(c,'FIGHT!',480,200,80*s,'#ffd24a','center','#7a1a00',14);c.globalAlpha=1}
    if(G.cfg.mode==='story'&&G.e.boss&&k<1.3&&!G.battle){txt(c,'⚠ BOSS ⚠',480,262,30,'#ff5a4a','center','#000',6)}}
  if(G.state==='ko'&&G.stateT>.2&&G.stateT<2)txt(c,'K.O.!',480,190,110,'#fff','center','#c01a1a',16);
  if(G.state==='perk')drawPerk(c,t);else safe(c,()=>drawTouch(c,t),'touch');
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
 {id:'battle2',t:'Play 2 Battle matches',ev:'battle',tgt:2,r:{c:50,x:45}},
 {id:'dmg800',t:'Deal 1600 damage',ev:'damage',tgt:1600,r:{c:55,x:50}},
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
  if(m.d.some(q=>!DP[q.id])){const have=new Set(m.d.map(q=>q.id).filter(i=>DP[i])),pool=DAILY_POOL.filter(d=>!have.has(d.id));m.d=m.d.map(q=>{if(DP[q.id])return q;const d=pool.splice((Math.random()*pool.length)|0,1)[0];return{id:d.id,p:0,cl:false}})}
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
  enter(){SND.music('menu');const B=[['STORY MODE',()=>{sel.mode='story';openSelect()}],['ENDLESS MODE',()=>{sel.mode='survival';openSelect()}],['DUEL VS AI',()=>{sel.mode='duel';openSelect()}],['BATTLE · UP TO 6',()=>go(S.battle)],['MISSIONS',()=>go(S.missions)],['SHOP',()=>go(S.shop)],['ARMORY & UPGRADES',()=>{sel.mode='lab';openSelect()}],['HOW TO PLAY',()=>go(S.how)],['DIFFICULTY: '+DIFFM[save.diff].n,()=>{save.diff=(save.diff+1)%3;persist();S.title.enter();S.title.focus=8}],['SOUND: '+(SND.muted?'OFF':'ON'),()=>{SND.setMuted(!SND.muted);save.muted=SND.muted;persist();S.title.enter();S.title.focus=9}]];
    this.btns=B.map((l,k)=>({x:150+(k%2)*370,y:226+((k/2)|0)*49,w:290,h:41,size:k===6||k===3?17:20,label:l[0],fn:l[1]}));this.btns[4].dot=missionsReady;SND.music('menu')},
  draw(c,t){bgDraw(c,t,0);floorStrip(c,0);
    drawDemo(c,0,110,GROUND+10,1.5,1,t,true);drawDemo(c,2,850,GROUND+10,1.4,-1,t+1,true);drawDemo(c,8,50,GROUND+120,.8,1,t+2,false);drawDemo(c,5,910,GROUND+125,.8,-1,t+3,false);
    logo(c,t,110);uiDrawBtns(c,this,t);
    const n=missionsReady();
    txt(c,'Coins: '+save.coins+'   Best Endless wave: '+save.best+'   Daily streak: '+streakNow()+(n?'   ★ '+n+' mission reward'+(n>1?'s':'')+' ready!':''),480,H-34,14,'#ffe9b0','center','#000',4);
    txt(c,'Clear Story levels to unlock creatures & weapons. Buy armor and upgrades to beat tougher foes!',480,H-14,13,'#bfe','center','#000',3)}});
// How to play
S.how=mkScene({back(){go(S.title)},pg:0,enter(){this.pg=0;this.build()},
  build(){this.btns=[{x:40,y:480,w:180,h:44,label:'BACK',fn:()=>go(S.title)},{x:720,y:480,w:200,h:44,label:['GUIDE ▶','BATTLE ▶','CONTROLLER ▶','◀ CONTROLS'][this.pg],fn:()=>{S.how.pg=(S.how.pg+1)%4;S.how.build();S.how.focus=1}}];this.focus=1},
  draw(c,t){bgDraw(c,t,2);c.fillStyle='rgba(10,5,40,.86)';rr(c,24,12,912,458,20);c.fill();
    if(!this.pg){
      txt(c,'HOW TO PLAY - CONTROLS',480,36,30,'#ffd24a','center','#000',7);
      txt(c,'ACTION',44,66,12,'#bfe','left');txt(c,GP.active?'CONTROLLER':'KEYBOARD',250,66,12,'#bfe','left');txt(c,'iPAD BUTTON',420,66,12,'#bfe','left');txt(c,'WHAT IT DOES',590,66,12,'#bfe','left');
      const L=[['MOVE','A / D  or  ◀ ▶','◀ ▶ (left)','Walk left and right','#fff'],['JUMP','W / ↑ / Space','JUMP (right)','Hop over attacks and shots','#fff'],
       ['CLOSE ATTACK','J  or  Z','ATTACK','Melee hit with your weapon (short range)','#ff9a5a'],['RANGED ATTACK','H  or  B','RANGED + timer','Bolt/arrow/boomerang. Short cooldown (1-2s)','#7ad8ff'],
       ['BLOCK','Hold S / ↓ / Shift','BLOCK (hold)','Stops damage until shield breaks','#7aff9a'],
       ['DODGE','U  or  V','DODGE','Quick roll - cannot be hit','#7ad8ff'],
       ['ULTIMATE','O','ULTIMATE + timer','Creature power move. Long cooldown (12s+)','#ff9ae0'],['RAGE','R  (P1: R/Y · P2: Num3)','RAGE (glows when full)','Full bar = 10s: faster, higher jumps, harder hits','#ff8a4a'],['PAUSE','P or Esc','II button (top)','Pause menu','#fff']];
      const PL=['L-stick / D-pad','A  or  D-pad ↑','X','Y','Hold LB','LT','RT','RB','Start'];
      L.forEach((r,i)=>{const y=92+i*34;txt(c,r[0],44,y,16,r[4],'left','#000',4);txt(c,GP.active?PL[i]:r[1],250,y,GP.active?14:15,GP.active?'#7ad8ff':'#fff','left');txt(c,r[2],420,y,13,'#ffe9b0','left');txt(c,r[3],590,y,12,'#cfe','left')});
      wrapText(c,'iPAD TOUCH: ◀ ▶ on the left. On the right: JUMP, ATTACK, RANGED and ULTIMATE (both show cooldown timers), the orange RAGE button (glows when full) plus small BLOCK and DODGE. Every weapon is CLOSE or RANGED. Bow and Boomerang are ranged weapons: H shoots them and J becomes a quick punch. With any other weapon, H fires your creature\'s own bolt.',44,418,872,16,13,'#ffe9b0')}
    else if(this.pg===1){
      txt(c,'HOW TO PLAY - GUIDE',480,36,30,'#ffd24a','center','#000',7);
      const G2=[['BARS','LIFE (green) is your health. ARMOR (blue) cuts damage and its plating wears down, then slowly regrows. RAGE (orange) fills when you hit, get hit, block or dodge. Press RAGE when it is full: for 10 seconds you jump 25% higher and move, attack faster and hit 30% harder, then the bar is empty again. RANGED recharges in 1-2s, your ULTIMATE needs 12s+.'],
       ['UPGRADES','Win battles for XP + coins. Level up to earn points, then spend them on LIFE (health, regen, lifesteal), ARMOR, SPEED (move, attack) and POWER.'],
       ['ARMOR GEAR','Buy and upgrade a HELM, CHEST ARMOR and GLOVES & BOOTS with coins. You can see them on your creature!'],
       ['STORY','30 levels, 6 chapters. Each level is tougher. Bosses have 3 phases and get angry when hurt. Use difficulty on the title screen.'],
       ['ENDLESS','Fight wave after wave that never stops getting harder. Pick a PERK after each wave. Boss every 5 waves. Your best waves are saved.'],
       ['MISSIONS','3 new daily missions each day plus long-term goals. Claim coins, XP and upgrade points. Play daily for a streak bonus!']];
      G2.forEach((r,i)=>{const y=70+i*62;txt(c,r[0],44,y+8,16,'#7ad8ff','left','#000',4);wrapText(c,r[1],190,y,720,18,14.5,'#fff')});
      wrapText(c,'Tip: use RANGED ATTACK to chip foes from far away, CLOSE ATTACK up close, and BLOCK or DODGE when they swing!',44,446,872,18,14,'#ffe9b0')}
    else if(this.pg===3){
      txt(c,'HOW TO PLAY - CONTROLLER (Xbox / standard gamepad)',480,36,26,'#ffd24a','center','#000',7);
      const T=[['MOVE','Left stick or D-pad','#fff'],['JUMP','A, D-pad up or stick up','#fff'],['CLOSE ATTACK','X','#ff9a5a'],['RANGED ATTACK','Y','#7ad8ff'],['BLOCK','Hold LB  (LB + A on a thin ledge = drop through)','#7aff9a'],['DODGE','LT','#7ad8ff'],['ULTIMATE','RT','#ff9ae0'],['RAGE','RB','#ff8a4a'],['PAUSE','Start','#fff']];
      T.forEach((r,i)=>{const y=72+i*27;txt(c,r[0],60,y,16,r[2],'left','#000',4);txt(c,r[1],300,y,15,'#fff','left')});
      wrapText(c,'MENUS: D-pad or left stick moves, A confirms, B goes back, Start also confirms (or resumes when paused). In setup screens LB / RB change the highlighted choice backward / forward.',60,368,840,17,13.5,'#ffe9b0');
      wrapText(c,'BATTLE: set a slot to GAMEPAD 1-4 (controllers are assigned to free slots automatically when connected). Up to 4 pads plus keyboards and touch. Works with iPad / iPadOS Safari when the controller is paired over Bluetooth. Touch buttons hide while you play with a controller and return when you touch the screen.',60,408,840,17,13.5,'#d8ffd8')}
    else{
      txt(c,'BATTLES, ARENAS & WEAPONS',480,36,28,'#ffd24a','center','#000',7);
      const L3=[['BATTLE MODE','Up to 6 fighters: free-for-all, 2v2v2 or 3v3. Mix CPU fighters with up to 2 keyboard players (P1 + P2) and a touch player. Win by STOCKS, KO RACE or TIMED.'],
       ['P1 KEYS','A/D move · W jump · S block · F close · G ranged · T ult · R or Y rage · Q dodge'],
       ['P2 KEYS','←/→ move · ↑ jump · ↓ block · Num1 close · Num2 ranged · Num5 ult · Num3 rage · Num0 dodge (or . / \' , M)'],
       ['PLATFORMS','Big arenas have ledges, ramps and moving lifts. Jump up through any ledge. On a THIN ledge, hold BLOCK + JUMP to drop down. Firm (thick) ledges can not be dropped through.'],
       ['CAMERA','The camera zooms out and pans to keep every fighter in view, and zooms in when you are close.'],
       ['WEAPONS','24 weapons. The Armory shows SPEED, POWER, REACH, COMBO and WEIGHT bars plus PROS and CONS. Heavy weapons slow you down; combo weapons end in a bigger finisher.'],
       ['SHOP','Spend coins on weapons, armor, upgrade points, XP potions, coin charms, power elixirs and Phoenix feathers.']];
      L3.forEach((r,i)=>{const y=62+i*58;txt(c,r[0],44,y+8,15,'#7ad8ff','left','#000',4);wrapText(c,r[1],190,y,730,17,13.5,'#fff')})}
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
    txt(c,'ULTIMATE',500,326,14,'#b8a0ff','left');txt(c,CULT[sp.id].name,500,350,24,sp.glow,'left','#000',5);
    wrapText(c,CULT[sp.id].desc+' (cooldown '+CULT[sp.id].cd+'s)',500,368,420,18,14,'#fff');
    txt(c,lock?'Locked: clear Story level '+unlockLevel(i):'Tap again or press ENTER to choose',500,428,14,lock?'#ff9a8a':'#9aff9a','left')}});
// Arena select (duel)
S.arenaSel=mkScene({cols:4,onPick:null,onBack:null,back(){if(this.onBack){const cb=this.onBack;this.onPick=null;this.onBack=null;cb()}else openOpp()},
  enter(){this.btns=ARENAS.map((A,i)=>({x:25+(i%4)*232,y:66+((i/4)|0)*140,w:215,h:121,twoTap:true,fn:()=>{sel.arena=i;if(this.onPick){const cb=this.onPick;this.onPick=null;this.onBack=null;cb(i);return}startFight({mode:'duel',hero:sel.hero,enemy:sel.enemy,arena:i,diff:sel.diff})},draw(c,b,focus,t){
      c.save();rr(c,b.x,b.y,b.w,b.h,14);c.clip();c.translate(b.x,b.y);c.scale(b.w/W,b.w/W);A.draw.call(A,c,t,0);c.restore();
      c.save();rr(c,b.x,b.y,b.w,b.h,14);c.lineWidth=focus?6:2;c.strokeStyle=focus?'#ffd24a':'rgba(255,255,255,.5)';c.stroke();c.restore();
      c.fillStyle='rgba(0,0,0,.6)';c.fillRect(b.x+4,b.y+b.h-32,b.w-8,28);txt(c,A.name,b.x+b.w/2,b.y+b.h-18,17,'#fff','center','#000',4)}}))
    .concat([{x:640,y:350,w:280,h:56,label:'DIFFICULTY: '+(sel.diff<.4?'EASY':sel.diff<.7?'NORMAL':'HARD'),fn:()=>{sel.diff=sel.diff<.4?.55:sel.diff<.7?.9:.25;S.arenaSel.enter();S.arenaSel.focus=ARENAS.length}},{x:640,y:420,w:280,h:56,label:'BACK',fn:()=>S.arenaSel.back()}]);},
  draw(c,t){bgDraw(c,t,4);txt(c,this.onPick?'BATTLE ARENA':'CHOOSE ARENA',480,36,32,'#ffd24a','center','#000',7);uiDrawBtns(c,this,t)}});
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
const pauseUI=mkScene({btns:vmenu([['RESUME',()=>{G.paused=false}],['RESTART',()=>{G.paused=false;G.battle?startBattle(G.cfg.bs):startFight(G.cfg)}],['SOUND: ON/OFF',()=>{SND.setMuted(!SND.muted);save.muted=SND.muted;persist()}],['QUIT TO MENU',()=>{G.paused=false;go(S.title)}]],170,66),back(){G.paused=false}});
// Fight scene

/* ================= BATTLE MODE (up to 6 fighters) ================= */
const TCOL=['#ff4a4a','#4a8aff','#4aff7a','#ffd24a','#c04aff','#4af0ff'],TNAME=['RED','BLUE','GREEN','YELLOW','PURPLE','CYAN'];
const BMODES={ffa6:{n:6,name:'FREE-FOR-ALL (6)',team:i=>i},ffa4:{n:4,name:'FREE-FOR-ALL (4)',team:i=>i},ffa3:{n:3,name:'FREE-FOR-ALL (3)',team:i=>i},'2v2v2':{n:6,name:'TEAMS 2v2v2',team:i=>(i/2)|0},'3v3':{n:6,name:'TEAMS 3v3',team:i=>(i/3)|0},'2v2':{n:4,name:'TEAMS 2v2',team:i=>(i/2)|0},'1v1':{n:2,name:'DUEL 1v1',team:i=>i}};
const BMORD=['ffa6','ffa4','ffa3','2v2v2','3v3','2v2','1v1'];
const BRULES={stocks:{name:'STOCKS (3 lives)',lim:3},race:{name:'KO RACE (first to 5)',lim:5},time:{name:'TIMED (3 min)',lim:180}},BRORD=['stocks','race','time'];
const CTLS=['AI','P1 KEYS','P2 KEYS','TOUCH','PAD 1','PAD 2','PAD 3','PAD 4','OFF'],CTLN={'PAD 1':'GAMEPAD 1','PAD 2':'GAMEPAD 2','PAD 3':'GAMEPAD 3','PAD 4':'GAMEPAD 4','AI':'CPU (AI)','P1 KEYS':'P1: WASD KEYS','P2 KEYS':'P2: ARROW KEYS','TOUCH':'TOUCH SCREEN','OFF':'EMPTY'};
const KM1={KeyA:'left',KeyD:'right',KeyW:'jump',KeyS:'shield',KeyF:'punch',KeyG:'ranged',KeyQ:'dodge',KeyT:'ult',KeyR:'rage',KeyY:'rage'};
const KM2={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',ArrowDown:'shield',Numpad1:'punch',Period:'punch',Numpad2:'ranged',Slash:'ranged',Numpad0:'dodge',KeyM:'dodge',Numpad5:'ult',Quote:'ult',Numpad3:'rage',Comma:'rage'};
const BDEF_W=['sword','katana','axe','spear','bow','mace'];
const BS={mode:'ffa4',rule:'stocks',arena:0,ai:.55,slots:[0,1,2,3,4,5].map(i=>({hero:i%SPECIES.length,wp:BDEF_W[i],ctl:i===0?(touchMode?'TOUCH':'P1 KEYS'):'AI'}))};
function startBattle(bs){
  bs=JSON.parse(JSON.stringify(bs));const M=BMODES[bs.mode],R0=BRULES[bs.rule];
  setArena(bs.arena);resetPlats(ARENA);
  G={cfg:{mode:'battle',arena:bs.arena,hero:bs.slots[0].hero,bs},mode:'battle',battle:{rule:bs.rule,lim:R0.lim,mode:bs.mode,timeLeft:R0.lim,scored:false},dmgDealt:0,runXP:0,runCoins:0,kos:0,perks:[],toasts:[],prevBest:save.best,projs:[],pops:[],shake:0,hitstop:0,slow:0,t:0,state:'intro',stateT:0,paused:false,round:1,wins:[0,0],wave:1,score:0,flashW:0,time:0,start:performance.now(),banner:'BATTLE!',cam:null};
  const act=[];bs.slots.forEach((sl,i)=>{if(i<M.n&&sl.ctl!=='OFF')act.push({sl,i})});
  const sp=ARENA.spawns||[500,900,1300],n=act.length;
  G.fs=act.map((o,k)=>{const sl=o.sl,human=sl.ctl!=='AI',team=M.team(o.i);
    const x=sp[Math.round(k*(sp.length-1)/Math.max(1,n-1))];
    const f=mkF(sl.hero,x,x<ARENA.ww/2?1:-1,{player:human,team,wp:WI[sl.wp]||WI.sword,hpm:1.25,ai:human?null:mkAI(bs.ai,false,{}),en:25});
    f.slot=o.i;f.bn=(human?'P':'CPU')+(o.i+1);f.tc=TCOL[M.team(o.i)];f.kos=0;f.deaths=0;f.dmgOut=0;f.stocks=bs.rule==='stocks'?R0.lim:null;f.elim=false;f.koT=0;f.lock=1.6;f.ctl=sl.ctl;
    if(human){if(sl.ctl==='TOUCH')f.touch=true;else if(/^PAD/.test(sl.ctl)){f.gp={held:{},press:{},own:{}};f.padn=+sl.ctl.slice(4)}else f.inp={held:{},press:{}}}
    else{f.cd.ult=rnd(3,7)*f.cdM;f.cd.ranged=rnd(.3,1.2)}
    return f});
  G.touchSlot=G.fs.some(f=>f.touch);
  const kb=G.fs.filter(f=>f.inp),split=kb.length>=2||(kb.length>=1&&G.touchSlot);G.kbMap={};
  if(!split&&kb.length===1){for(const code in KEYMAP)G.kbMap[code]=[kb[0].inp,KEYMAP[code]];kb[0].legacy=true}
  else for(const f of kb){const km=f.ctl==='P1 KEYS'?KM1:KM2;for(const code in km)G.kbMap[code]=[f.inp,km[code]]}
  G.p=G.fs.find(f=>f.touch)||G.fs.find(f=>f.inp)||G.fs.find(f=>f.gp)||G.fs[0];G.e=G.fs.find(f=>f!==G.p)||G.p;
  G.teams=[...new Set(G.fs.map(f=>f.team))];G.tscore={};G.teams.forEach(t=>G.tscore[t]=0);
  inp.press={};inp.held={};
  go(S.fight);SND.music('battle');SND.play('fight');
}
function tlabel(t){const M=BMODES[G.cfg.bs.mode];if(M.team(0)===0&&M.team(1)===0||G.cfg.bs.mode==='3v3'||G.cfg.bs.mode==='2v2v2'||G.cfg.bs.mode==='2v2')return TNAME[t];const f=G.fs.find(o=>o.team===t);return f?f.bn:TNAME[t]}
function battleKO(att,def){
  const B=G.battle;def.koT=0;def.deaths++;
  if(att&&att!==def&&att.team!==def.team){att.kos++;G.tscore[att.team]=(G.tscore[att.team]||0)+1;pop(att.x,att.y-190*att.sc,att.bn+' KO!',att.tc,22)}
  if(def.stocks!=null){def.stocks--;if(def.stocks<=0){def.elim=true}}
  G.slow=0;
  // end checks
  if(G.state!=='fight')return;
  if(B.rule==='stocks'){const alive=new Set(G.fs.filter(f=>!f.elim).map(f=>f.team));if(alive.size<=1)endBattle([...alive][0])}
  else if(B.rule==='race'){for(const t of G.teams)if(G.tscore[t]>=B.lim){endBattle(t);break}}
}
function endBattle(wt){
  if(G.state==='end')return;G.state='end';G.stateT=0;G.winTeam=wt;G.shown=false;SND.play('win');G.flashW=.25;
  G.banner=wt==null?'DRAW!':tlabel(wt)+' WINS!'}
function respawnF(f){
  const sp=ARENA.spawns||[800];const x=sp[(Math.random()*sp.length)|0]+rnd(-60,60);
  f.ko=false;f.out=false;f.hp=f.maxhp;f.chip=f.maxhp;f.x=clamp(x,60,ARENA.ww-60);f.y=Math.min((ARENA.wtop==null?-100:ARENA.wtop)+80,-80);f.vx=0;f.vy=0;f.rot=0;f.rotV=0;f.atk=null;f.stun=0;f.shield=false;f.sh=100;f.dodgeT=0;f.onGround=false;f.plat=null;f.inv=2.4;f.lock=0;
  f.ap=f.apMax;for(const k in f.buffs)f.buffs[k]=0;f.boomOut=false;f.combo=0;f.rage=Math.min(f.rage,40);f.rageT=0;f.dodgeT=0;f.sq=0;f.sqv=0;f.pose=newPose();f.koT=0;
  ring(f.x,f.y,f.tc,80);SND.play('ready')}
function humanIn(f){
  const src=f.touch?inp:(f.gp||f.inp);f.in.l=!!src.held.left;f.in.r=!!src.held.right;f.in.sh=!!src.held.shield;
  for(const k of EDGES)if(src.press[k])f.in[k]=true;
  if(!f.touch)src.press={}}
function updateBattle(dt,sdt){
  const B=G.battle;updatePlats(ARENA,G.t);
  for(const f of G.fs){if(f.out)continue;if(f.ai){if(G.state==='fight'&&!f.ko)aiThink(f,nearestFoe(f),sdt)}else if(G.state==='fight'&&!f.ko)humanIn(f);else if(!f.ai&&(f.inp||f.gp))(f.inp||f.gp).press={}}
  inp.press={};
  if(G.state==='intro'&&G.stateT>1.6){G.state='fight';G.stateT=0}
  for(const f of G.fs){if(f.out)continue;updF(f,nearestFoe(f),sdt)}
  updateProj(sdt);updateCam(dt);
  if(G.state==='fight'){
    G.time+=dt;
    if(B.rule==='time'){B.timeLeft-=dt;if(B.timeLeft<=0){B.timeLeft=0;let best=-1,wt=null,tie=false;for(const t of G.teams){const sc=G.tscore[t];if(sc>best){best=sc;wt=t;tie=false}else if(sc===best)tie=true}endBattle(tie?null:wt)}}
    for(const f of G.fs)if(f.ko&&!f.out){f.koT+=dt;if(f.koT>1.3)f.out=true}
    for(const f of G.fs)if(f.out&&!f.elim){f.koT+=dt;if(f.koT>2.6)respawnF(f)}
  }else if(G.state==='end'){for(const f of G.fs)if(f.ko&&!f.out){f.koT+=dt;if(f.koT>1.3)f.out=true}}
  updateParts(sdt);
  for(let i=G.pops.length-1;i>=0;i--){const q=G.pops[i];q.t+=sdt;if(q.t>1.1)G.pops.splice(i,1)}
  for(let i=G.toasts.length-1;i>=0;i--){G.toasts[i].t+=dt;if(G.toasts[i].t>3)G.toasts.splice(i,1)}
  if(G.state==='end'&&!G.shown&&G.stateT>2.8){G.shown=true;showBattleResult()}
}
function teamRing(c,f){const y=f.sy!=null?f.sy:f.y;c.save();c.globalAlpha=(f.inv>0?.5+.3*Math.sin(f.t*20):.75);c.lineWidth=5;c.strokeStyle=f.tc;c.beginPath();c.ellipse(f.x,y+4,48*f.sc,11*f.sc,0,0,TAU);c.stroke();c.globalAlpha=.18;c.fillStyle=f.tc;c.fill();c.restore()}
function nameTag(c,f){
  const k=clamp(1/(G.cam?G.cam.z:1),.9,1.8),y=f.y-(f.ko?30:178*f.sc)-18*k;
  c.save();c.translate(f.x,y);c.scale(k,k);
  const w=Math.max(62,f.bn.length*10+22);
  rr(c,-w/2,-11,w,22,8);c.fillStyle='rgba(8,4,26,.78)';c.fill();c.lineWidth=2.5;c.strokeStyle=f.tc;c.stroke();
  txt(c,f.bn,0,1,14,'#fff','center','#000',3);
  const r=Math.max(0,f.hp/f.maxhp);rr(c,-w/2+4,12,w-8,6,3);c.fillStyle='rgba(0,0,0,.6)';c.fill();rr(c,-w/2+4,12,Math.max(1,(w-8)*r),6,3);c.fillStyle=hpCol(c,r);c.fill();
  poly(c,[-7,22,7,22,0,31],f.tc,'#000',1.5);
  c.restore()}
function drawBattleHUD(c,t){
  const n=G.fs.length,B=G.battle,gap=6,pw=Math.min(190,(W-24-gap*(n-1))/n),tot=n*pw+gap*(n-1),x0=(W-tot)/2;
  G.fs.forEach((f,i)=>{
    const x=x0+i*(pw+gap),dim=f.elim||f.ko||f.out;
    c.save();c.globalAlpha=f.elim?.45:dim?.75:1;
    rr(c,x,6,pw,62,10);c.fillStyle='rgba(10,5,30,.66)';c.fill();c.lineWidth=3;c.strokeStyle=f.tc;c.stroke();
    c.fillStyle=f.tc;rr(c,x,6,7,62,4);c.fill();
    txt(c,f.bn+' '+SPECIES[f.idx].name,x+13,19,pw<160?11:12,'#fff','left','#000',3);
    const r=Math.max(0,f.hp/f.maxhp);drawBar(c,x+13,27,pw-21,13,r,hpCol(c,r),false,Math.max(0,f.chip/f.maxhp));
    if(f.stocks!=null){for(let k=0;k<B.lim;k++){c.beginPath();c.arc(x+19+k*13,59,4.6,0,TAU);if(k<f.stocks){c.fillStyle=f.tc;c.fill();c.lineWidth=1.5;c.strokeStyle='#fff';c.stroke()}else{c.lineWidth=1.5;c.strokeStyle='rgba(255,255,255,.4)';c.stroke()}}}
    else txt(c,'KOs '+f.kos,x+13,60,12,'#ffe27a','left','#000',3);
    {const full=f.rage>=RAGE.max&&f.rageT<=0,act=f.rageT>0;drawBar(c,x+13,43,pw-21,7,f.rage/RAGE.max,act?'#ffd24a':full?grad(c,x,0,x+pw,0,['#ff5a1a','#ffd24a','#ff5a1a']):'#d8561a',false);
      if(full){c.save();c.globalAlpha=.5+.4*Math.sin(t*9);rr(c,x+13,43,pw-21,7,3.5);c.strokeStyle='#ffd24a';c.lineWidth=2.5;c.stroke();c.restore()}
      if(act)txt(c,'RAGE '+Math.ceil(f.rageT),x+13+(pw-21)/2,46.8,8,'#000','center');else if(full)txt(c,'RAGE!',x+13+(pw-21)/2,46.8,8,'#000','center')}
    const ul=f.cd.ult<=0,rg=f.cd.ranged<=0;
    c.fillStyle=rg?'#4ad0ff':'rgba(255,255,255,.2)';c.fillRect(x+pw-34,52,16,12);c.fillStyle=ul?'#ff7ac8':'rgba(255,255,255,.2)';c.fillRect(x+pw-16,52,16,12);
    if(!rg)txt(c,Math.ceil(f.cd.ranged)+'',x+pw-26,58.5,9,'#fff','center','#000',2.5);if(!ul)txt(c,Math.ceil(f.cd.ult)+'',x+pw-8,58.5,9,'#fff','center','#000',2.5);
    c.restore();
    if(f.elim)txt(c,'OUT',x+pw/2,38,22,'#ff8a7a','center','#000',5);else if(f.out||f.ko)txt(c,'RESPAWN',x+pw/2,38,14,'#ffd24a','center','#000',4)});
  // info line
  let info;
  if(B.rule==='stocks')info='STOCKS · LAST TEAM STANDING';else if(B.rule==='race')info='KO RACE · FIRST TO '+B.lim;else{const s=Math.ceil(B.timeLeft);info='TIME '+((s/60)|0)+':'+String(s%60).padStart(2,'0')+' · MOST KOs WINS'}
  txt(c,info,480,86,14,'#ffe27a','center','#000',4);
  if(B.rule!=='stocks'||G.teams.length<G.fs.length){const parts=G.teams.map(tm=>({tm,sc:G.tscore[tm]||0}));const tw=Math.min(100,(W-60)/parts.length);parts.forEach((q,k)=>{const x=480-parts.length*tw/2+k*tw+tw/2;rr(c,x-tw/2+3,94,tw-6,18,8);c.fillStyle='rgba(10,5,30,.65)';c.fill();c.lineWidth=2;c.strokeStyle=TCOL[q.tm];c.stroke();txt(c,(G.teams.length<=3||G.teams.length===G.fs.length&&G.fs.length<=4?tlabel(q.tm):TNAME[q.tm])+' '+q.sc,x,103.5,11,'#fff','center','#000',3)})}
  c.beginPath();c.arc(W-30,112,16,0,TAU);c.fillStyle='rgba(10,5,30,.6)';c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.stroke();c.fillStyle='#fff';c.fillRect(W-36,104,4,16);c.fillRect(W-27,104,4,16);
  G.toasts.forEach((q,k)=>{const a=Math.min(1,(3-q.t)*2,q.t*5);c.globalAlpha=a;rr(c,250,130+k*34,460,28,10);c.fillStyle='rgba(10,5,30,.8)';c.fill();txt(c,q.text,480,144+k*34,15,q.col,'center','#000',3);c.globalAlpha=1});
  if(G.t<6&&G.state!=='end'){const hs=G.fs.filter(f=>f.inp||f.gp);let y=132;c.globalAlpha=Math.min(1,(6-G.t));
    for(const f of hs){const t1=f.gp?PADTXT:f.legacy?'A/D move · W jump · S block (+W drops through thin ledges) · J close · H ranged · O ult · R rage · U dodge':f.ctl==='P1 KEYS'?'A/D move · W jump · S block (+W drops) · F close · G ranged · T ult · R/Y rage · Q dodge':'←/→ move · ↑ jump · ↓ block (+↑ drops) · Num1 close · Num2 ranged · Num5 ult · Num3 rage · Num0 dodge';
      txt(c,f.bn+': '+t1,480,y,12,'#fff','center','#000',4);y+=16}c.globalAlpha=1}
}
/* setup + result scenes */
function bsActive(){return BMODES[BS.mode].n}
function bsFixKB(i){ // unique controllers
  const sl=BS.slots[i];if(sl.ctl==='AI'||sl.ctl==='OFF')return;
  BS.slots.forEach((o,j)=>{if(j!==i&&o.ctl===sl.ctl)o.ctl='AI'})}
S.battle=mkScene({cols:3,note:'',noteT:0,back(){go(S.title)},
  enter(){SND.music('menu');const B=[];
    for(let i=0;i<6;i++){const y=66+i*44;
      B.push({x:178,y,w:230,h:38,split:1,slot:i,fn:d=>{const sl=BS.slots[i];if(i>=bsActive())return;sl.hero=(sl.hero+(d||1)+SPECIES.length)%SPECIES.length},draw:(c,b,f,t)=>this.rowBtn(c,b,f,t,SPECIES[BS.slots[i].hero].name,'HERO',i)});
      B.push({x:416,y,w:240,h:38,split:1,slot:i,fn:d=>{const sl=BS.slots[i];if(i>=bsActive())return;const k=WEAPONS.findIndex(w=>w.id===sl.wp);sl.wp=WEAPONS[(k+(d||1)+WEAPONS.length)%WEAPONS.length].id},draw:(c,b,f,t)=>{const w=WI[BS.slots[i].wp];this.rowBtn(c,b,f,t,w.name+'  ['+wRank(w)+']','WEAPON',i)}});
      B.push({x:664,y,w:278,h:38,split:1,slot:i,fn:d=>{const sl=BS.slots[i];if(i>=bsActive())return;let k=CTLS.indexOf(sl.ctl);k=(k+(d||1)+CTLS.length)%CTLS.length;sl.ctl=CTLS[k];bsFixKB(i)},draw:(c,b,f,t)=>this.rowBtn(c,b,f,t,CTLN[BS.slots[i].ctl]+(/^PAD/.test(BS.slots[i].ctl)&&gpList().length<+BS.slots[i].ctl.slice(4)?' (not connected)':''),'CONTROL',i)})}
    B.push({x:178,y:340,w:230,h:42,size:15,label:'',fn:d=>{let k=BMORD.indexOf(BS.mode);BS.mode=BMORD[(k+(d||1)+BMORD.length)%BMORD.length]},draw:(c,b,f,t)=>uiBtn(c,Object.assign({},b,{draw:null,label:'MODE: '+BMODES[BS.mode].name}),f,t)});
    B.push({x:416,y:340,w:240,h:42,size:15,label:'',fn:()=>{BS.rule=BRORD[(BRORD.indexOf(BS.rule)+1)%BRORD.length]},draw:(c,b,f,t)=>uiBtn(c,Object.assign({},b,{draw:null,label:'RULES: '+BRULES[BS.rule].name}),f,t)});
    B.push({x:664,y:340,w:278,h:42,size:15,label:'',fn:()=>{S.arenaSel.onPick=i=>{BS.arena=i;go(S.battle)};S.arenaSel.onBack=()=>go(S.battle);go(S.arenaSel)},draw:(c,b,f,t)=>uiBtn(c,Object.assign({},b,{draw:null,label:'ARENA: '+ARENAS[BS.arena].name}),f,t)});
    B.push({x:178,y:390,w:230,h:42,size:15,label:'',fn:()=>{BS.ai=BS.ai<.4?.55:BS.ai<.7?.9:.25},draw:(c,b,f,t)=>uiBtn(c,Object.assign({},b,{draw:null,label:'CPU LEVEL: '+(BS.ai<.4?'EASY':BS.ai<.7?'NORMAL':'HARD')}),f,t)});
    B.push({x:416,y:390,w:240,h:42,size:18,label:'BACK',fn:()=>go(S.title)});
    B.push({x:664,y:390,w:278,h:42,size:22,label:'START BATTLE!',fn:()=>this.start()});
    this.btns=B;this.focus=23;gpAutoAssign()},
  rowBtn(c,b,focus,t,label,kind,i){
    const off=i>=bsActive(),sl=BS.slots[i],tm=BMODES[BS.mode].team(i);
    c.save();if(off)c.globalAlpha=.3;
    if(focus&&!off)glow(c,b.x+b.w/2,b.y+b.h/2,b.w*.6,'#ffd24a',.3);
    rr(c,b.x,b.y,b.w,b.h,10);c.fillStyle=focus&&!off?grad(c,0,b.y,0,b.y+b.h,['#ffe27a','#ff9a2a']):sl.ctl==='OFF'?'#2a2a3a':grad(c,0,b.y,0,b.y+b.h,['#6a4cef','#35288a']);c.fill();c.lineWidth=2.5;c.strokeStyle=focus&&!off?'#fff':'rgba(255,255,255,.4)';c.stroke();
    txt(c,'◀',b.x+12,b.y+b.h/2+1,13,'rgba(255,255,255,.5)');txt(c,'▶',b.x+b.w-12,b.y+b.h/2+1,13,'rgba(255,255,255,.5)');
    txt(c,label,b.x+b.w/2,b.y+b.h/2+1,kind==='WEAPON'?14:16,focus&&!off?'#4a1a00':'#fff','center',null,0);
    c.restore()},
  start(){
    const M=BMODES[BS.mode],act=BS.slots.filter((s,i)=>i<M.n&&s.ctl!=='OFF'),teams=new Set(BS.slots.map((s,i)=>i<M.n&&s.ctl!=='OFF'?M.team(i):-1).filter(t=>t>=0));
    if(act.length<2||teams.size<2){this.note='Need fighters on at least 2 teams!';this.noteT=2.5;SND.play('back');return}
    startBattle(BS)},
  draw(c,t){bgDraw(c,t,BS.arena);c.fillStyle='rgba(5,0,25,.55)';c.fillRect(0,0,W,H);
    txt(c,'BATTLE MODE',480,30,34,'#ffd24a','center','#000',7);
    BS.slots.forEach((sl,i)=>{const y=66+i*44,off=i>=bsActive(),tm=BMODES[BS.mode].team(i);
      c.save();if(off)c.globalAlpha=.3;rr(c,24,y,146,38,10);c.fillStyle='rgba(10,5,30,.7)';c.fill();c.lineWidth=3;c.strokeStyle=TCOL[tm];c.stroke();c.fillStyle=TCOL[tm];c.beginPath();c.arc(44,y+19,10,0,TAU);c.fill();c.lineWidth=2;c.strokeStyle='#fff';c.stroke();
      txt(c,'SLOT '+(i+1),66,y+12,12,'#fff','left','#000',3);txt(c,off?'not in mode':TNAME[tm],66,y+27,12,TCOL[tm],'left','#000',3);c.restore()});
    uiDrawBtns(c,this,t);
    txt(c,'Tap a button to change it (tap the left edge to go back). Up to 6 fighters: mix CPU, P1 keys, P2 keys and touch.',480,452,13,'#cfe','center','#000',4);
    txt(c,'P1: A/D move  W jump  S block  F close  G ranged  T ult  R/Y rage  Q dodge',480,474,12,'#ffe9b0','center','#000',3);
    txt(c,'P2: ←/→ move  ↑ jump  ↓ block  Num1 close  Num2 ranged  Num5 ult  Num3 rage  Num0 dodge',480,491,12,'#bfeaff','center','#000',3);
    txt(c,'Hold BLOCK + JUMP on a thin ledge to drop through it.  One keyboard player uses the normal keys (WASD/arrows, J K H L O I).',480,508,12,'#d8ffd8','center','#000',3);
    if(this.noteT>0){this.noteT-=1/60;txt(c,this.note,480,430,18,'#ff8a7a','center','#000',5)}}});
function showBattleResult(){
  const hum=G.fs.filter(f=>f.player),rw=[];
  for(const f of hum){const win=G.winTeam===f.team;const co=Math.min(60,8+3*f.kos+(win?25:0)),xp=Math.min(60,6+3*f.kos+(win?20:0));save.coins+=co;addXP(SPECIES[f.idx].id,xp);rw.push({f,co,xp})}
  track('battle',1);if(hum.some(f=>f.team===G.winTeam))track('battle_win',1);persist();
  S.battleResult.r={rw,fs:G.fs.slice(),wt:G.winTeam,banner:G.banner};go(S.battleResult)}
S.battleResult=mkScene({r:null,cols:3,enter(){SND.music('win');this.btns=[{x:60,y:468,w:260,h:52,label:'REMATCH',fn:()=>startBattle(G.cfg.bs)},{x:350,y:468,w:260,h:52,label:'BATTLE SETUP',fn:()=>go(S.battle)},{x:640,y:468,w:260,h:52,label:'MAIN MENU',fn:()=>go(S.title)}];this.focus=0},
  back(){go(S.title)},
  draw(c,t){const r=this.r;drawFightFrozen(c,t);c.fillStyle='rgba(5,0,25,.82)';c.fillRect(0,0,W,H);
    const col=r.wt==null?'#fff':TCOL[r.wt];txt(c,r.banner,480,52,56,col,'center','#1a0a3a',12);
    // scoreboard
    const fs=r.fs.slice().sort((a,b)=>(r.wt===b.team)-(r.wt===a.team)||b.kos-a.kos||a.deaths-b.deaths);
    rr(c,60,92,840,34,10);c.fillStyle='rgba(60,40,140,.8)';c.fill();
    const cx=[80,190,420,520,620,730,840];['FIGHTER','TEAM','HERO / WEAPON','KOs','DEATHS','REWARD'].forEach((h,k)=>txt(c,h,[84,184,300,520,620,760][k],109,13,'#ffe27a',k<3?'left':'center','#000',3));
    fs.forEach((f,i)=>{const y=130+i*50,w=r.wt===f.team;rr(c,60,y,840,44,10);c.fillStyle=w?'rgba(255,210,74,.22)':'rgba(20,10,60,.7)';c.fill();c.lineWidth=3;c.strokeStyle=f.tc;c.stroke();
      c.fillStyle=f.tc;c.beginPath();c.arc(82,y+22,11,0,TAU);c.fill();txt(c,f.bn,104,y+23,17,'#fff','left','#000',4);
      txt(c,TNAME[f.team],184,y+23,15,f.tc,'left','#000',4);txt(c,SPECIES[f.idx].name+' · '+f.wp.name,300,y+23,14,'#fff','left','#000',3);
      txt(c,String(f.kos),520,y+23,22,'#ffe27a','center','#000',4);txt(c,String(f.deaths),620,y+23,22,'#ff9a8a','center','#000',4);
      const q=r.rw.find(o=>o.f===f);txt(c,q?'+'+q.co+'c  +'+q.xp+'xp':'—',760,y+23,15,q?'#7aff9a':'#889','center','#000',3);
      if(w)txt(c,'★',876,y+22,22,'#ffd24a','center','#000',4)});
    uiDrawBtns(c,this,t)}});


/* ---------- SHOP hub + boosts ---------- */
const BOOSTS=[
 {k:'xp',n:'XP Potion',d:'Double XP for 3 battles',cost:150,add:3,col:'#7ad8ff',g:'XP'},
 {k:'coin',n:'Coin Charm',d:'Double coins for 3 battles',cost:150,add:3,col:'#ffe27a',g:'$'},
 {k:'rev',n:'Phoenix Feather',d:'Come back once at 50% life',cost:220,add:1,col:'#ff9a3a',g:'♥'},
 {k:'pwr',n:'Power Elixir',d:'+15% damage for 3 battles',cost:120,add:3,col:'#ff6a5a',g:'⚔'},
 {k:'arm',n:'Armor Polish',d:'+10 armor for 3 battles',cost:100,add:3,col:'#9ad0ff',g:'◆'},
 {k:'nit',n:'Haste Tonic',d:'Cooldowns 30% faster, 3 battles',cost:80,add:3,col:'#c88aff',g:'⚡'},
 {k:'tr1',n:'Training Session',d:'Hero gains +60 XP now',cost:100,xp:60,col:'#7aff9a',g:'+'},
 {k:'tr2',n:'Hero Camp',d:'Hero gains +300 XP now',cost:450,xp:300,col:'#5aff9a',g:'++'}];
S.boosts=mkScene({cols:2,note:'',noteT:0,back(){go(S.shop)},
  enter(){const B=this;SND.music('menu');
    this.btns=BOOSTS.map((o,i)=>({x:30+(i%2)*470,y:74+((i/2)|0)*96,w:450,h:88,fn:()=>B.buy(o),draw(c,b,focus,t){
      const n=o.add?save.boosts[o.k]:0,can=save.coins>=o.cost;
      c.save();if(focus)glow(c,b.x+b.w/2,b.y+b.h/2,b.w*.55,'#ffd24a',.25);rr(c,b.x,b.y,b.w,b.h,14);c.fillStyle=focus?'rgba(122,92,255,.62)':'rgba(20,10,60,.74)';c.fill();c.lineWidth=focus?4:2;c.strokeStyle=focus?'#fff':'rgba(255,255,255,.35)';c.stroke();
      glow(c,b.x+46,b.y+b.h/2,40,o.col,.5);c.beginPath();c.arc(b.x+46,b.y+b.h/2,30,0,TAU);c.fillStyle=o.col;c.globalAlpha=.9;c.fill();c.globalAlpha=1;c.lineWidth=3;c.strokeStyle='#fff';c.stroke();txt(c,o.g,b.x+46,b.y+b.h/2+1,24,'#1a0a30');
      txt(c,o.n,b.x+90,b.y+22,20,'#fff','left','#000',5);txt(c,o.d,b.x+90,b.y+46,13,'#cfe','left','#000',3);
      if(o.add)txt(c,n>0?'You have: '+n+(o.k==='rev'?' feather'+(n>1?'s':''):' battle'+(n>1?'s':'')+' left'):'You have: none',b.x+90,b.y+68,12,n>0?'#7aff9a':'#9ab','left','#000',3);else txt(c,'Instant!  Lv '+hs(SPECIES[sel.hero].id).lvl+' '+SPECIES[sel.hero].name,b.x+90,b.y+68,12,'#7aff9a','left','#000',3);
      rr(c,b.x+b.w-112,b.y+18,100,52,12);c.fillStyle=can?'#3ac060':'#6a4a4a';c.fill();c.lineWidth=2;c.strokeStyle='#fff';c.stroke();txt(c,'BUY',b.x+b.w-62,b.y+36,17,'#fff','center','#000',4);txt(c,o.cost+'c',b.x+b.w-62,b.y+57,14,can?'#fff':'#ffb0a0','center','#000',3);
      c.restore()}})).concat([{x:30,y:466,w:150,h:50,label:'BACK',fn:()=>{SND.play('back');go(S.shop)}}]);this.focus=0},
  msg(m){this.note=m;this.noteT=1.8},
  buy(o){if(save.coins<o.cost){SND.play('back');this.msg('Need '+o.cost+' coins - win battles to earn more!');return}
    if(o.add&&save.boosts[o.k]>=(o.k==='rev'?9:30)){SND.play('back');this.msg('You have plenty already!');return}
    save.coins-=o.cost;if(o.add){save.boosts[o.k]+=o.add;this.msg(o.n+' ready! Used automatically in your next fights.')}else{const id=SPECIES[sel.hero].id,l0=hs(id).lvl,lv=addXP(id,o.xp);this.msg('+'+o.xp+' XP for '+SPECIES[sel.hero].name+(hs(id).lvl>l0?'  -  LEVEL UP!':'!'))}
    persist();SND.play('unlock')},
  draw(c,t){bgDraw(c,t,5);c.fillStyle='rgba(10,5,40,.62)';c.fillRect(0,0,W,H);if(this.noteT>0)this.noteT-=1/60;
    txt(c,'BOOSTS & TRAINING',480,34,32,'#ffd24a','center','#000',7);txt(c,'Coins: '+save.coins,930,34,20,'#ffe27a','right','#000',5);
    txt(c,'Boosts work in Story, Duel and Endless. Training goes to '+SPECIES[sel.hero].name+'.',480,60,13,'#cfe','center','#000',3);
    uiDrawBtns(c,this,t);
    if(this.noteT>0){c.globalAlpha=Math.min(1,this.noteT);rr(c,230,472,500,34,12);c.fillStyle='rgba(10,5,30,.9)';c.fill();txt(c,this.note,480,489,15,'#fff','center','#000',4);c.globalAlpha=1}}});
S.shop=mkScene({cols:2,note:'',noteT:0,back(){go(S.title)},
  enter(){const Sh=this;SND.music('menu');
    const tile=(i,label,sub,fn,icon)=>({x:40+(i%2)*450,y:92+((i/2)|0)*158,w:430,h:146,fn,draw(c,b,focus,t){
      c.save();if(focus)glow(c,b.x+b.w/2,b.y+b.h/2,b.w*.6,'#ffd24a',.3);rr(c,b.x,b.y,b.w,b.h,16);c.fillStyle=focus?'rgba(122,92,255,.64)':'rgba(20,10,60,.76)';c.fill();c.lineWidth=focus?5:2;c.strokeStyle=focus?'#fff':'rgba(255,255,255,.4)';c.stroke();
      c.save();rr(c,b.x+10,b.y+10,120,b.h-20,12);c.fillStyle='rgba(0,0,0,.35)';c.fill();c.clip();icon(c,b.x+70,b.y+b.h/2,t);c.restore();
      txt(c,label,b.x+146,b.y+34,26,'#fff','left','#000',6);sub().forEach((l,k)=>txt(c,l,b.x+146,b.y+66+k*20,13.5,k?'#ffe9b0':'#cfe','left','#000',3));
      c.restore()}});
    const hero=()=>SPECIES[sel.hero],h=()=>hs(hero().id);
    this.btns=[
      tile(0,'WEAPONS',()=>['Buy swords, bows, wands & more.',WEAPONS.filter(w=>weaponOwned(w.id)).length+' of '+WEAPONS.length+' owned · Coins or Story wins'],()=>openArmory(null,'',()=>go(S.shop),null,true),(c,x,y,t)=>{drawWeaponIcon(c,WI.katana,x,y-10,.9,hero().glow,t);drawWeaponIcon(c,WI.crossbow,x,y+30,.6,hero().glow,t)}),
      tile(1,'ARMOR',()=>['Helm, chest plate, gloves & boots.','Armor now: '+Math.round(gearArmor())+'  (tiers '+save.armor.helm+'/'+save.armor.chest+'/'+save.armor.limbs+' of 5)'],()=>openGear(()=>go(S.shop)),(c,x,y)=>{armorIcon(c,'chest',Math.max(1,save.armor.chest),x,y,1.3,save.armor.chest===0)}),
      tile(2,'UPGRADES',()=>['Spend level-up points or buy extra ones.',hero().name+' Lv '+h().lvl+' · '+h().pts+' pt'+(h().pts===1?'':'s')+' ready · +1 pt = '+pointCost()+'c'],()=>openUpgrade(()=>go(S.shop)),(c,x,y,t)=>{c.fillStyle='#7aff9a';poly(c,[x,y-44,x+34,y,x+14,y,x+14,y+40,x-14,y+40,x-14,y,x-34,y],'#7aff9a','#1a5a2a',3);glow(c,x,y,50,'#7aff9a',.4)}),
      tile(3,'BOOSTS & TRAINING',()=>['Potions, charms, feathers, XP training.','Active: XP×2 '+save.boosts.xp+' · Coins×2 '+save.boosts.coin+' · Phoenix '+save.boosts.rev],()=>go(S.boosts),(c,x,y,t)=>{glow(c,x,y,50,'#c88aff',.5);ell(c,x,y+14,26,26,'#c88aff',0,'#fff');c.fillStyle='#c88aff';c.fillRect(x-9,y-34,18,26);c.strokeStyle='#fff';c.lineWidth=2.5;c.strokeRect(x-9,y-34,18,26);txt(c,'+',x,y+14,26,'#fff')}),
      {x:40,y:420,w:200,h:50,label:'BACK',fn:()=>{SND.play('back');go(S.title)}},
      {x:250,y:420,w:330,h:50,label:'',size:16,fn:()=>{let k=sel.hero;do{k=(k+1)%SPECIES.length}while(!isUnlocked(k)&&k!==sel.hero);sel.hero=k}}];
    this.hb=this.btns[5];this.focus=0},
  draw(c,t){bgDraw(c,t,4);c.fillStyle='rgba(10,5,40,.6)';c.fillRect(0,0,W,H);
    txt(c,'SHOP',480,40,40,'#ffd24a','center','#000',8);txt(c,'Coins: '+save.coins,930,40,22,'#ffe27a','right','#000',5);
    txt(c,'Spend coins & XP points on gear for your hero.',480,72,14,'#cfe','center','#000',3);
    this.hb.label='SHOPPING FOR: '+SPECIES[sel.hero].name+' (tap to change)';
    uiDrawBtns(c,this,t);
    txt(c,'Earn coins in Story, Endless, Duels and Battles. Weapons also unlock by clearing Story levels!',480,H-20,13,'#bfe','center','#000',3)}});

/* ================= GAMEPAD (standard mapping, Xbox) ================= */
const GP={active:false,own:{},prev:[],rep:[],toasts:[],n:0};
const GPH={J:'X',H:'Y',O:'RT',U:'LT',S:'LB',R:'RB'};
const kh=k=>GP.active?(GPH[k]||k):k;
const PADTXT='stick/D-pad move · A or ↑ jump · X close · Y ranged · RT ultimate · RB rage · LB block (+A drops) · LT dodge';
function gpList(){const l=[];try{const a=navigator.getGamepads?navigator.getGamepads():[];for(const g of a)if(g&&g.connected!==false)l.push(g)}catch(e){}return l.sort((a,b)=>a.index-b.index)}
function gpRead(g,stickOk){
  const B=i=>{const b=g.buttons&&g.buttons[i];return !!b&&(b.pressed||b.value>.5)};
  let ax=g.axes&&g.axes[0]||0,ay=g.axes&&g.axes[1]||0;if(Math.hypot(ax,ay)<.25){ax=0;ay=0} // deadzone
  if(stickOk===false){ax=0;ay=0}
  return{pl:B(14),pr:B(15),pu:B(12),pd:B(13),btn:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].some(B),l:ax<-.45||B(14),r:ax>.45||B(15),u:ay<-.55||B(12),d:ay>.55||B(13),dd:B(13),A:B(0),Bb:B(1),X:B(2),Y:B(3),LB:B(4),RB:B(5),LT:B(6),RT:B(7),back:B(8),start:B(9),RS:B(11)}}
function gpWant(s){return{left:s.l,right:s.r,jump:s.u||s.A,shield:s.LB||s.dd,punch:s.X,ranged:s.Y,ult:s.RT,rage:s.RB,dodge:s.LT}}
function gpApply(t,want,own){for(const n in want){if(want[n]){if(!t.held[n]){t.held[n]=true;t.press[n]=true;own[n]=1}}else if(own[n]){t.held[n]=false;own[n]=0}}}
function gpToast(text){GP.toasts.push({text,t:0});if(GP.toasts.length>3)GP.toasts.shift()}
const gpName=g=>{let n=(g.id||'Controller').replace(/\(.*?\)/g,'').replace(/vendor:.*|STANDARD GAMEPAD/i,'').trim();return n.length>26?n.slice(0,26):(n||'Controller')};
function gpAutoAssign(){
  const n=Math.min(4,gpList().length);
  for(let k=1;k<=n;k++){if(BS.slots.some(s=>s.ctl==='PAD '+k))continue;
    const i=BS.slots.findIndex((s,j)=>j<bsActive()&&s.ctl==='AI');if(i>=0){BS.slots[i].ctl='PAD '+k;gpToast('Gamepad '+k+' -> Battle slot '+(i+1))}}}
const GPKEY={l:'ArrowLeft',r:'ArrowRight',u:'ArrowUp',d:'ArrowDown'};
function pollGamepads(dt){
  const list=gpList();GP.n=list.length;const sOk=!touchMode||GP.active;const st=list.map(g=>gpRead(g,sOk));
  const gameplay=scene===S.fight&&G&&!G.paused&&G.state!=='end'&&G.state!=='perk';
  let rise=false,realRise=false;
  st.forEach((s,i)=>{const pv=GP.prev[i]||{};for(const k in s){if(s[k]&&!pv[k]){rise=true;if(k==='btn')realRise=true}}});
  if(rise){SND.resume();SND.startPending()}
  // only a real BUTTON press (never stick drift) activates gamepad mode; never while a finger is down / recently touched
  if(realRise)GP.lastBtn=nowMs();
  if(realRise&&!GP.active&&ptrs.size===0&&nowMs()-lastTouch>2500)GP.active=true
  if(gameplay){
    const startEdge=st.some((s,i)=>s.start&&!(GP.prev[i]||{}).start);
    if(G.battle){
      for(const f of G.fs){if(!f.gp||f.ko&&false)continue;
        const k=list[f.padn-1];
        if(!k){if(!f.padLost){f.padLost=true;gpToast(f.bn+' controller lost - CPU takes over');f.gp=null;f.ai=mkAI(G.cfg.bs.ai,false,{});f.player=false}continue}
        gpApply(f.gp,gpWant(st[f.padn-1]),f.gp.own)}
    }else{
      const m={};st.forEach(s=>{const w=gpWant(s);for(const n in w)m[n]=m[n]||w[n]});
      for(const n of['left','right','jump','shield','punch','ranged','ult','rage','dodge'])m[n]=!!m[n];
      for(const n in m){if(m[n]){if(!inp.held[n]){press(n);GP.own[n]=1}}else if(GP.own[n]){release(n);GP.own[n]=0}}}
    if(startEdge)pauseGame();
  }else{
    for(const n in GP.own)if(GP.own[n]){release(n);GP.own[n]=0}
    const u=curUI();
    st.forEach((s,i)=>{const pv=GP.prev[i]||{},rp=GP.rep[i]||(GP.rep[i]={});
      for(const d of['l','r','u','d']){if(s[d]){if(!pv[d]){rp[d]=.4;uiKey(u,GPKEY[d])}else{rp[d]-=dt;if(rp[d]<=0){rp[d]=.12;uiKey(u,GPKEY[d])}}}}
      if(s.A&&!pv.A)uiKey(u,'Enter');
      if(s.start&&!pv.start)uiKey(u,G&&G.paused&&scene===S.fight?'Escape':'Enter');
      if(s.Bb&&!pv.Bb)uiKey(u,'Escape');
      if(u&&((s.LB&&!pv.LB)||(s.RB&&!pv.RB))){const b=u.btns[u.focus],dd=s.RB&&!pv.RB?1:-1;if(b&&b.split&&b.fn&&!b.disabled){SND.play('click');b.fn(dd)}}});
  }
  GP.prev=st;
  for(let i=GP.toasts.length-1;i>=0;i--){GP.toasts[i].t+=dt;if(GP.toasts[i].t>3.2)GP.toasts.splice(i,1)}
}
addEventListener('gamepadconnected',e=>{gpToast('🎮 Controller connected: '+gpName(e.gamepad));gpAutoAssign();SND.resume()});
addEventListener('gamepaddisconnected',e=>{gpToast('Controller disconnected: '+gpName(e.gamepad));setTimeout(()=>{if(!gpList().length)GP.active=false},0)});
function drawGPOverlay(c,t){
  if(GP.active&&!(scene===S.fight&&G&&!G.paused&&G.state!=='end'&&G.state!=='perk')){
    c.save();c.globalAlpha=.9;rr(c,W-262,4,258,20,8);c.fillStyle='rgba(10,5,30,.75)';c.fill();txt(c,'🎮 D-pad/stick move · A select · B back',W-133,14.5,11,'#cfe','center','#000',3);c.restore()}
  GP.toasts.forEach((q,k)=>{const a=Math.min(1,(3.2-q.t)*2,q.t*6);c.globalAlpha=a;rr(c,290,494-k*34,380,28,12);c.fillStyle='rgba(10,5,30,.9)';c.fill();c.lineWidth=2;c.strokeStyle='#7ad8ff';c.stroke();txt(c,q.text,480,508-k*34,14,'#fff','center','#000',3);c.globalAlpha=1})}
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
const wSpeed=w=>clamp(1.15-w.dur*1.5,.08,1),wPower=w=>clamp(w.dmg/11,.05,1),wReach=w=>w.ranged?clamp(.7+(w.range-420)/400,.7,1):clamp(w.range/150,.1,1);
function wPros(w){const o=[];if(wSpeed(w)>=.7)o.push('Very fast');if(wPower(w)>=.75)o.push('Heavy damage');if(!w.ranged&&wReach(w)>=.75)o.push('Long reach');if(!w.ranged&&w.combo>=4)o.push(w.combo+'-hit combo chain');if(!w.ranged&&w.fin>=1.8)o.push('Big finisher x'+w.fin);if(w.wt<=.1)o.push('Light: no slowdown');if(w.ranged)o.push('Hits from far away');if(w.kb>=250)o.push('Huge knockback');if(w.id==='shield')o.push('Blocks well');return o.length?o:['Balanced all-rounder']}
function wCons(w){const o=[];if(wSpeed(w)<=.4)o.push('Slow swing');if(wPower(w)<=.4)o.push('Low damage');if(!w.ranged&&wReach(w)<.5)o.push('Very short reach');if(w.wt>=.5)o.push('Heavy: move -'+Math.round(w.wt*20)+'%');if(w.ranged)o.push('Weak up close (J = fist punch)');if(!w.ranged&&w.combo<=1)o.push('No combo chain');if(w.dmg<4&&!w.ranged)o.push('Weak hits');return o.length?o:['Nothing big - just not the best at anything']}
S.armory=mkScene({cols:6,cont:null,contLabel:'FIGHT!',backFn:null,hero:0,view:1,note:'',noteT:0,
  back(){this.backFn&&this.backFn()},
  enter(){const A=this;SND.music('menu');
    const cards=WEAPONS.map((w,i)=>({x:30+(i%6)*118,y:54+((i/6)|0)*57,w:114,h:53,idx:i,fn:()=>A.pick(i),draw(c,b,focus,t){
      const tagc=w.ranged?'#1a8ad0':'#c8601a';
      const own=weaponOwned(w.id),eq=equipped(A.hero).id===w.id;
      c.save();rr(c,b.x,b.y,b.w,b.h,10);c.fillStyle=grad(c,0,b.y,0,b.y+b.h,[eq?'#2a7a4a':own?'#4a3aa0':'#33304a','#1a1040']);c.fill();c.lineWidth=focus?4:2;c.strokeStyle=focus?'#fff':eq?'#7aff9a':'rgba(255,255,255,.35)';c.stroke();
      c.globalAlpha=own?1:.4;drawWeaponIcon(c,w,b.x+34,b.y+22,.4,SPECIES[A.hero].glow,t);c.globalAlpha=1;
      rr(c,b.x+b.w-46,b.y+5,41,13,6);c.fillStyle=tagc;c.fill();txt(c,w.ranged?'RANGED':'CLOSE',b.x+b.w-25.5,b.y+11.5,8.5,'#fff');
      txt(c,w.name,b.x+b.w/2,b.y+b.h-17,10.5,'#fff','center','#000',3);
      if(eq)txt(c,'EQUIPPED',b.x+b.w/2,b.y+b.h-6,9,'#7aff9a','center','#000',3);
      else if(own)txt(c,'owned',b.x+b.w/2,b.y+b.h-6,9,'#cfc','center','#000',3);
      else txt(c,'🔒 Lv '+w.lvl+' / '+w.cost+'c',b.x+b.w/2,b.y+b.h-6,9,'#ffe27a','center','#000',3);
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
    const hero=SPECIES[this.hero];if(this.focus<WEAPONS.length)this.view=this.focus;
    const w=WEAPONS[this.view],own=weaponOwned(w.id),eq=equipped(this.hero).id===w.id;
    txt(c,'ARMORY',100,30,28,'#ffd24a','center','#000',7);txt(c,hero.name+' Lv '+hs(hero.id).lvl+'   ·   '+WEAPONS.filter(x=>weaponOwned(x.id)).length+'/'+WEAPONS.length+' weapons',440,30,18,'#fff','center','#000',5);txt(c,'Coins: '+save.coins,920,30,20,'#ffe27a','right','#000',5);
    uiDrawBtns(c,this,t);
    // hero preview
    c.save();rr(c,744,50,186,228,14);c.fillStyle='rgba(10,5,40,.65)';c.fill();c.clip();glow(c,837,200,110,hero.glow,.45);drawDemo(c,this.hero,837,252,.9,1,t,true,equipped(this.hero),true);c.restore();
    // detail
    c.fillStyle='rgba(10,5,40,.78)';rr(c,30,284,900,174,14);c.fill();
    drawWeaponIcon(c,w,96,392,1.15,hero.glow,t);
    txt(c,w.name,170,301,22,'#fff','left','#000',5);
    rr(c,170,313,w.ranged?132:122,16,8);c.fillStyle=w.ranged?'#1a8ad0':'#c8601a';c.fill();txt(c,wType(w),170+(w.ranged?66:61),321.5,10,'#fff');
    wrapText(c,w.desc,170,334,340,14,12,'#ffe9b0');
    const ST=[['SPEED',wSpeed(w),'#5ad8ff',w.dur.toFixed(2)+'s per hit'],['POWER',wPower(w),'#ff7a5a','dmg '+w.dmg],['REACH',wReach(w),'#ffb02a',w.ranged?'long range shots':'range '+w.range],
      ['COMBO',w.ranged?0:w.combo/5,'#c88aff',w.ranged?'J = fist punch':(w.combo>1?w.combo+' hits + finisher x'+w.fin:'single heavy hit')],['WEIGHT',w.wt,'#ff9a7a','move -'+Math.round(w.wt*20)+'%  (lower is better)']];
    ST.forEach((r,k)=>{const y=372+k*17;txt(c,r[0],170,y+4,10.5,'#bfe','left');bar2(c,226,y,110,r[1],r[2]);txt(c,r[3],344,y+4.5,10,'#fff','left')});
    txt(c,'PROS',528,303,12,'#7aff9a','left','#000',3);wrapText(c,wPros(w).join(' · '),572,296,350,14,11.5,'#d8ffd8');
    txt(c,'CONS',528,337,12,'#ff8a7a','left','#000',3);wrapText(c,wCons(w).join(' · '),572,330,350,14,11.5,'#ffd8d0');
    txt(c,'J close: ',528,371,11.5,'#ff9a5a','left','#000',3);txt(c,w.ranged?'quick punch (melee)':w.name+' swing'+(w.combo>1?' chain':''),584,371,11.5,'#fff','left');
    txt(c,'H ranged: ',528,386,11.5,'#7ad8ff','left','#000',3);txt(c,w.ranged?w.name+' shot':RB[hero.id].name,590,386,11.5,'#fff','left');
    txt(c,'O ult: '+CULT[hero.id].name,528,404,11.5,'#ffa0e0','left','#000',3);txt(c,CULT[hero.id].desc+' · '+CULT[hero.id].cd+'s',528,418,10.5,'#fff','left');
    txt(c,own?(eq?'Equipped!':'Owned - tap EQUIP'):'Locked: Story Lv '+w.lvl+' or '+w.cost+' coins',w.ranged?312:302,321.5,11.5,own?'#7aff9a':'#ffd24a','left','#000',3);
    if(this.noteT>0){c.globalAlpha=Math.min(1,this.noteT);rr(c,230,262,420,26,10);c.fillStyle='rgba(10,5,30,.88)';c.fill();txt(c,this.note,440,275,18,'#fff','center','#000',4);c.globalAlpha=1}
    this.act.label=own?(eq?'EQUIPPED ✓':'EQUIP'):'BUY ('+w.cost+' COINS)';this.act.disabled=!own&&save.coins<w.cost;this.act.clickLocked=true;
    this.cb.label=this.contLabel;this.cb.hidden=!this.cont}});
function openGear(back){S.gear.backFn=back;S.gear.hero=sel.hero;S.gear.focus=0;go(S.gear)}
function heroStats(id){const sp=SPECIES[SPI[id]],st=statsOf(id);return{hp:Math.round(HPK*100*sp.hp*st.hp),armor:st.armor,red:Math.round(armRed(st.armor)*100),spd:Math.round((st.spd-1)*1000)/10,aspd:Math.round((st.aspd-1)*100)}}
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
  const dt=Math.min(.033,(now-last)/1000)||.016;last=now;time+=dt;sceneT+=dt;frameNo++;
  if(!touchMode&&navigator.maxTouchPoints>0)touchMode=true;
  try{pollGamepads(dt);if(scene.update)scene.update(dt)}catch(err){console.error(err);window.__err=(window.__err||'')+err.stack+'\n'}
  const T=()=>ctx.setTransform(dpr*scale,0,0,dpr*scale,offx*dpr,offy*dpr);
  try{
    unwind(0);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#07040f';ctx.fillRect(0,0,cv.width,cv.height);
    T();
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
    const k=Math.min(1,sceneT/.32),e=1-Math.pow(1-k,3),tr=scene!==S.fight&&k<1;
    if(tr){ctx.save();const z=1+.035*(1-e);ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-W/2,-H/2+14*(1-e))}
    scene.draw(ctx,time);
    if(tr){ctx.restore();ctx.save();ctx.globalAlpha=(1-e)*.7;ctx.fillStyle='#07040f';ctx.fillRect(0,0,W,H);ctx.restore()}
    drawGPOverlay(ctx,time);
    ctx.restore();
  }catch(err){console.error(err);window.__err=(window.__err||'')+err.stack+'\n';window.__derr=(window.__derr||0)+1;unwind(0)}
  // touch UI is re-asserted every frame on touch devices (even if the scene draw threw part-way)
  try{if(scene===S.fight&&G&&touchMode&&!G.paused&&G.state!=='perk'&&touchDrawnFrame!==frameNo&&!(G.battle&&!G.touchSlot)&&!touchHidden()){unwind(0);T();ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();safe(ctx,()=>drawTouch(ctx,time),'touch2');ctx.restore()}}catch(err){unwind(0)}
  requestAnimationFrame(frame);
}
window.__game={get frameNo(){return frameNo},get touchDrawnFrame(){return touchDrawnFrame},get touchMode(){return touchMode},ptrs,TB,get offx(){return offx},get offy(){return offy},get scale(){return scale},RAGE,RCD,ULT_MIN,addRage,activateRage,sane,drawTouch,touchHidden,get G(){return G},SPECIES,S,go,startFight,save,inp,get scene(){return scene},LEVELS,WEAPONS,CULT,hs,addXP,statsOf,sel,openArmory,openUpgrade,equipped,WI,mkF,takeHit,updateFight,initRound,endFight,ARENAS,aiThink,mkAI,startAtk,UPS,xpNeed,PERKS,stageStats,DIFFM,STAGE,gearArmor,armRed,track,ensureDay,missionsReady,ACH,DAILY_POOL,openGear,RB,enemyFor,spawnEnemy,bossPhase,nextWave,resolveRound,mkAI,TB,pickPerk,gearFor,GP,gpList,pollGamepads,startBattle,BS,BMODES,BOOSTS,support,foesOf,updateCam,get ARENA(){return ARENA},resetPlats,setArena};
setArena(0);
go(S.title);
if(QS.get('battle')){const a=QS.get('battle').split(',');BS.mode=a[0]||BS.mode;BS.rule=a[1]||BS.rule;BS.arena=+a[2]||0;const cs=(QS.get('ctl')||'').split(',');BS.slots.forEach((s,i)=>{if(cs[i])s.ctl=({a:'AI',k1:'P1 KEYS',k2:'P2 KEYS',t:'TOUCH',o:'OFF',p1:'PAD 1',p2:'PAD 2',p3:'PAD 3',p4:'PAD 4'})[cs[i]]||s.ctl;else if(i>0)s.ctl='AI'});startBattle(BS)}
if(QS.get('autostart')){if(QS.get('lvl')){const hh=hs(SPECIES[+(QS.get('autostart').split(',')[1])||0].id);hh.lvl=+QS.get('lvl');hh.pts=+(QS.get('pts')||0)}
  const[m,h,e,a]=QS.get('autostart').split(',');const cfg={mode:m,hero:+h||0,enemy:+e||1,arena:+a||0,diff:.6,level:+(QS.get('level')||0)};if(m==='story'){const L=LEVELS[cfg.level];cfg.arena=L.arena;cfg.boss=L.boss}else if(QS.get('arena'))cfg.arena=+QS.get('arena');startFight(cfg)}
requestAnimationFrame(frame);
['touchend','click','mousedown'].forEach(ev=>addEventListener(ev,()=>{SND.resume();SND.startPending()},{passive:true}));
