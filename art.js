'use strict';
// Procedural art: creatures, arenas, particles. Everything is drawn with canvas paths/gradients.
const W=960,H=540,GROUND=410,TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>v<a?a:v>b?b:v,rnd=(a,b)=>a+Math.random()*(b-a);
function mkRng(s){return()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296}}
function grad(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g}
function rgrad(c,x,y,r0,r1,stops){const g=c.createRadialGradient(x,y,r0,x,y,r1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g}
function ell(c,x,y,rx,ry,fill,rot,stroke){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot||0,0,TAU);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
function poly(c,pts,fill,stroke,lw){c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw||2;c.lineJoin='round';c.stroke()}}
function glow(c,x,y,r,col,a){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=a==null?1:a;c.fillStyle=rgrad(c,x,y,0,r,[col,'rgba(0,0,0,0)']);c.fillRect(x-r,y-r,r*2,r*2);c.restore()}
function limb(c,x1,y1,x2,y2,w,col,dark,hl){
  c.lineCap='round';c.lineJoin='round';
  c.strokeStyle=dark;c.lineWidth=w+4;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
  c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
  if(hl){c.save();c.globalAlpha=.35;c.strokeStyle=hl;c.lineWidth=w*.35;c.beginPath();c.moveTo(x1,y1-w*.22);c.lineTo(x2,y2-w*.22);c.stroke();c.restore()}
}
function ik(x1,y1,x2,y2,l1,l2,dir){
  const dx=x2-x1,dy=y2-y1;let d=Math.hypot(dx,dy);d=clamp(d,Math.abs(l1-l2)+.5,l1+l2-.5);
  const a=Math.atan2(dy,dx),ang=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),ka=a+dir*ang;
  return[x1+Math.cos(ka)*l1,y1+Math.sin(ka)*l1,x1+Math.cos(a)*d,y1+Math.sin(a)*d];
}
function eye(c,x,y,r,col,f,angry){
  if(f&&(f.stun>0||f.ko)){c.strokeStyle='#222';c.lineWidth=2.5;c.beginPath();c.moveTo(x-r,y-r*.6);c.lineTo(x+r,y+r*.6);c.moveTo(x-r,y+r*.6);c.lineTo(x+r,y-r*.6);c.stroke();return}
  if(f&&Math.sin(f.t*1.3+f.sc*9)>.985){c.strokeStyle='#222';c.lineWidth=2;c.beginPath();c.moveTo(x-r,y);c.lineTo(x+r,y);c.stroke();return}
  ell(c,x,y,r,r*1.05,col||'#fff');ell(c,x+r*.25,y,r*.5,r*.7,'#111');ell(c,x+r*.45,y-r*.3,r*.2,r*.2,'#fff');
  if(angry){c.strokeStyle='#1a0a0a';c.lineWidth=3;c.beginPath();c.moveTo(x-r*1.3,y-r*1.3);c.lineTo(x+r*1.2,y-r*.5);c.stroke()}
}

/* ---------------- Species ---------------- */
const SPECIES=[
 {id:'dragon',name:'Ignis',title:'Ember Dragon',hp:1.05,spd:.95,pow:1.15,jmp:1,sc:1.05,bw:22,c1:'#e0402e',c2:'#7c1712',c3:'#ffd98a',glow:'#ff7a2a',wings:'bat',tail:'dragon',claws:1,
  sp:{name:'Inferno Breath',type:'proj',col:'#ff8a1f',dmg:20,speed:640,r:26,kind:'fire'},bio:'Born in a volcano, Ignis breathes a roaring fireball.'},
 {id:'minotaur',name:'Brutus',title:'Labyrinth Minotaur',hp:1.2,spd:.88,pow:1.2,jmp:.9,sc:1.1,bw:26,c1:'#8a5a3c',c2:'#3d2314',c3:'#d9a273',glow:'#ffb347',wings:null,tail:'thin',claws:0,
  sp:{name:'Bull Charge',type:'dash',col:'#ffb347',dmg:24,speed:720,kind:'dust'},bio:'Strongest horns in the maze. Charges straight through anything.'},
 {id:'unicorn',name:'Aurora',title:'Rainbow Unicorn',hp:.95,spd:1.1,pow:.95,jmp:1.15,sc:1,bw:19,c1:'#f4f1ff',c2:'#8a7cc4',c3:'#ffd0f0',glow:'#ff9ae8',wings:null,tail:'rainbow',claws:0,
  sp:{name:'Rainbow Beam',type:'proj',col:'#ff9ae8',dmg:17,speed:700,r:22,kind:'rainbow',heal:14},bio:'Fast and graceful. Her rainbow beam also heals her.'},
 {id:'centaur',name:'Chiron',title:'Starbow Centaur',hp:1,spd:1.1,pow:1,jmp:1.05,sc:1.05,bw:21,c1:'#b87a43',c2:'#5a3418',c3:'#f0c490',glow:'#ffe27a',wings:null,tail:'horse',claws:0,
  sp:{name:'Arrow Volley',type:'proj',col:'#ffe27a',dmg:9,speed:820,r:12,kind:'arrow',n:3},bio:'Rains glowing star arrows from afar.'},
 {id:'werewolf',name:'Fenrir',title:'Moonlight Werewolf',hp:1,spd:1.15,pow:1.05,jmp:1.1,sc:1.05,bw:22,c1:'#6f7280',c2:'#2c2e3a',c3:'#c9ccd8',glow:'#b9c8ff',wings:null,tail:'fluff',claws:1,
  sp:{name:'Moon Claws',type:'flurry',col:'#b9c8ff',dmg:6,hits:5,kind:'slash'},bio:'A lightning fast flurry of silver moon claws.'},
 {id:'kraken',name:'Krakus',title:'Deep-Sea Kraken',hp:1.1,spd:.95,pow:1.1,jmp:.95,sc:1.05,bw:23,c1:'#7a4bb8',c2:'#33195e',c3:'#e0b5ff',glow:'#b66bff',wings:null,tail:'tentacle',claws:0,
  sp:{name:'Tentacle Slam',type:'slam',col:'#b66bff',dmg:22,kind:'water'},bio:'Slams the ground with giant tentacles to send out a shockwave.'},
 {id:'griffin',name:'Gryph',title:'Sky Griffin',hp:.95,spd:1.12,pow:1.05,jmp:1.25,sc:1.05,bw:21,c1:'#c98a2e',c2:'#6b4210',c3:'#fff1c9',glow:'#ffd54a',wings:'feather',tail:'lion',claws:1,
  sp:{name:'Talon Storm',type:'flurry',col:'#ffd54a',dmg:6,hits:5,kind:'slash'},bio:'King of the skies with a storm of golden talons.'},
 {id:'phoenix',name:'Solara',title:'Phoenix',hp:.9,spd:1.08,pow:1.1,jmp:1.2,sc:1,bw:18,c1:'#ff5a2a',c2:'#a01a1a',c3:'#ffe45a',glow:'#ffb02a',wings:'fire',tail:'fire',claws:0,
  sp:{name:'Rebirth Flames',type:'dash',col:'#ffb02a',dmg:20,speed:760,kind:'fire',heal:10},bio:'Blazes through foes and heals from her own flames.'},
 {id:'yeti',name:'Glacius',title:'Frost Yeti',hp:1.25,spd:.85,pow:1.15,jmp:.85,sc:1.15,bw:28,c1:'#e9f5ff',c2:'#7b9bb8',c3:'#a8e4ff',glow:'#8fe0ff',wings:null,tail:'none',claws:0,
  sp:{name:'Avalanche',type:'slam',col:'#8fe0ff',dmg:26,kind:'ice'},bio:'Huge and tough. His avalanche shakes the whole arena.'},
 {id:'golem',name:'Terra',title:'Ancient Golem',hp:1.3,spd:.8,pow:1.25,jmp:.8,sc:1.15,bw:28,c1:'#8d8a82',c2:'#3d3b38',c3:'#c9c5b8',glow:'#5ff0ff',wings:null,tail:'none',claws:0,
  sp:{name:'Boulder Toss',type:'proj',col:'#c9c5b8',dmg:28,speed:430,r:30,kind:'rock'},bio:'Slow but crushing. Hurls giant glowing boulders.'}
];
SPECIES.forEach(s=>s.short=s.title.split(' ').slice(-1)[0]);
const SPI={};SPECIES.forEach((s,i)=>SPI[s.id]=i);

/* ---------------- Terrain ---------------- */
let ARENA=null;
function heightAt(x){let h=0;for(const r of ARENA.ramps){if(x<r.a||x>=r.d)continue;h+=x<r.b?(x-r.a)/(r.b-r.a)*r.h:x<=r.c?r.h:(r.d-x)/(r.d-r.c)*r.h}return h}
function groundY(x){return GROUND-heightAt(x)}

/* ---------------- Pose ---------------- */
function newPose(){return{hf:[26,-80],hb:[10,-76],ff:[16,0],fb:[-14,0],lean:.05,hip:0,open:0}}
function updatePose(f,dt){
  const P=f.pose,sp=f.sp,t=f.t,a=f.atk;
  let hf=[26,-80],hb=[10,-76],ff=[16,0],fb=[-14,0],lean=.05,hip=0,open=0,fast=false;
  const idle=Math.sin(t*3.2);hip=idle*1.6;hf[1]+=idle*2.5;hb[1]+=idle*2.5;
  const moving=Math.abs(f.vx)>25&&f.onGround;
  if(moving){const ph=t*11;ff=[Math.sin(ph)*24,-Math.max(0,Math.cos(ph))*13];fb=[-Math.sin(ph)*24,-Math.max(0,-Math.cos(ph))*13];hip=-Math.abs(Math.sin(ph))*4;lean=.12;hf[0]+=Math.sin(ph)*8;hb[0]-=Math.sin(ph)*8}
  if(!f.onGround){if(f.vy<0){ff=[20,-30];fb=[-6,-16]}else{ff=[16,-10];fb=[-16,-4]}hf=[26,-96];hb=[2,-92];lean=.1}
  if(f.shield&&!a){hip=9;hf=[36,-92];hb=[30,-68];lean=.12;ff=[22,0];fb=[-18,0]}
  if(f.dodgeT>0){hip=16;lean=-.35;ff=[24,0];fb=[-22,0];hf=[14,-70];hb=[0,-66]}
  if(a){
    fast=true;const p=a.t,R=a.range||80;
    if(a.type==='punch'&&a.style&&a.style!=='punch'){
      const rc=clamp(R*.38,34,52),sty=a.style,e2=a.he+.05;
      if(p<a.hs){const k=p/a.hs;hf=sty==='slash'||sty==='throw'?[lerp(26,2,k),lerp(-80,-122,k)]:sty==='chop'?[lerp(26,-4,k),lerp(-80,-140,k)]:sty==='shoot'?[lerp(26,rc,k),-96]:[lerp(26,6,k),-86];
        if(sty==='shoot')hb=[lerp(10,-6,k),-96];lean=-.14*k}
      else if(p<e2){hf=sty==='chop'?[rc*.85,-66]:sty==='shoot'?[rc,-96]:[rc,-92];lean=sty==='chop'?.48:.3;ff=[28,0];fb=[-24,0];if(sty==='chop')hip=8;if(sty==='shoot')hb=[-4,-96]}
      else{const k=clamp((p-e2)/(a.dur-e2),0,1);hf=[lerp(rc,26,k),lerp(-92,-80,k)];lean=lerp(.3,.05,k)}
    }else if(a.type==='punch'){
      if(p<a.hs){const k=p/a.hs;hf=[lerp(26,-8,k),-84];lean=-.12*k}
      else if(p<a.he+.05){hf=[R*.8,-96];lean=.3;ff=[28,0];fb=[-24,0]}
      else{const k=clamp((p-a.he)/(a.dur-a.he),0,1);hf=[lerp(R*.8,26,k),lerp(-96,-80,k)];lean=lerp(.3,.05,k)}
    }else if(a.type==='kick'){
      if(p<a.hs){const k=p/a.hs;ff=[lerp(16,26,k),-lerp(0,42,k)];lean=-.15*k;hf=[10,-100];hb=[-6,-90]}
      else if(p<a.he+.05){ff=[R*.8,-72];lean=-.3;hf=[-8,-96];hb=[-26,-84];fb=[-8,0]}
      else{const k=clamp((p-a.he)/(a.dur-a.he),0,1);ff=[lerp(R*.8,16,k),-lerp(72,0,k)];lean=lerp(-.3,.05,k)}
    }else{
      const st=a.def?a.def.type:sp.sp.type;open=1;
      if(st==='proj'){if(p<.3){hf=[-6,-96];hb=[-18,-86];lean=-.2}else{hf=[56,-100];hb=[44,-96];lean=.25}}
      else if(st==='dash'){hf=[-24,-76];hb=[-34,-86];lean=.55;ff=[Math.sin(t*30)*26,-Math.max(0,Math.cos(t*30))*14];fb=[-ff[0],-Math.max(0,-Math.cos(t*30))*14]}
      else if(st==='spin'){hf=[46,-92];hb=[-34,-94];lean=.18;ff=[26,0];fb=[-22,0]}
      else if(st==='buff'||st==='heal'||st==='nova'){const k=Math.min(1,p/.25);hf=[lerp(26,12,k),lerp(-80,-152,k)];hb=[lerp(10,-8,k),lerp(-76,-148,k)];lean=-.1}
      else if(st==='leap'){hf=[34,-132];hb=[10,-124];lean=.3;ff=[26,-26];fb=[-6,-12]}
      else if(st==='slam'){if(p<.35){hf=[10,-172];hb=[-8,-168];lean=-.15;ff=[24,0]}else{hf=[46,-26];hb=[34,-30];lean=.45;hip=14}}
      else{const s=Math.sin(t*34);hf=[60+s*10,-96+s*10];hb=[44-s*10,-90-s*10];lean=.3;ff=[26,0];fb=[-20,0]}
    }
  }
  if(f.stun>0&&!f.ko){lean=-.38;hf=[-2,-122];hb=[-22,-100];hip=6}
  if(f.ko){lean=-.15;hf=[34,-34];hb=[-30,-40];ff=[26,-6];fb=[-26,-2];hip=-2}
  const k=1-Math.exp(-dt*(fast?42:22));
  const mix=(o,n)=>{o[0]=lerp(o[0],n[0],k);o[1]=lerp(o[1],n[1],k)};
  mix(P.hf,hf);mix(P.hb,hb);mix(P.ff,ff);mix(P.fb,fb);
  P.lean=lerp(P.lean,lean,k);P.hip=lerp(P.hip,hip,k);P.open=lerp(P.open,open,1-Math.exp(-dt*20));
}

/* ---------------- Armor gear ---------------- */
const GCOL=[null,'#b98a5a','#d98a3a','#b8c4d8','#4ad0f0','#ffd24a'];
function shade(h,k){const n=parseInt(h.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;if(k>0){r+=(255-r)*k;g+=(255-g)*k;b+=(255-b)*k}else{r*=1+k;g*=1+k;b*=1+k}return`rgb(${r|0},${g|0},${b|0})`}
function metal(c,x0,y0,x1,y1,t){const col=GCOL[t];return grad(c,x0,y0,x1,y1,[shade(col,.45),col,shade(col,-.4)])}
function armorHelm(c,sp,tier){ // head-local, facing +x
  const col=GCOL[tier];c.save();c.lineJoin='round';
  if(tier>=3){poly(c,[-4,-16,2,-30-tier*2,8,-16],tier===5?'#ff4a2a':tier===4?'#4ad0f0':'#c33',shade(col,-.5),1.2)}
  c.beginPath();c.ellipse(0,-3,20,16,0,Math.PI*1.02,Math.PI*1.98);c.lineTo(20,-3);c.closePath();c.fillStyle=metal(c,-20,-20,20,0,tier);c.fill();c.lineWidth=2;c.strokeStyle=shade(col,-.6);c.stroke();
  c.fillStyle=shade(col,-.2);c.fillRect(-20,-6,40,5);c.strokeStyle=shade(col,-.6);c.lineWidth=1.5;c.strokeRect(-20,-6,40,5);
  if(tier>=2){poly(c,[16,-5,22,-4,22,8,18,8],metal(c,16,-5,22,8,tier),shade(col,-.6),1.5)} // nose guard
  ell(c,0,-14,3.2,3.2,tier>=4?'#fff':'#ffd24a',0,shade(col,-.6));
  if(tier>=4)glow(c,0,-14,14,tier===5?'#ffd24a':'#4ad0f0',.8);
  c.restore()}
function armorChest(c,hw,tier){ // torso-local
  const col=GCOL[tier];c.save();c.lineJoin='round';
  c.beginPath();c.ellipse(1,-26,hw*.86,22,0,0,TAU);c.fillStyle=metal(c,-hw,-48,hw,-4,tier);c.fill();c.lineWidth=2.5;c.strokeStyle=shade(col,-.6);c.stroke();
  c.strokeStyle=shade(col,.5);c.globalAlpha=.7;c.lineWidth=1.5;for(let i=0;i<3;i++){c.beginPath();c.ellipse(1,-26,hw*.86-3-i*7,22-3-i*5,0,.3,Math.PI-.3);c.stroke()}c.globalAlpha=1;
  c.fillStyle=shade(col,-.3);c.fillRect(-hw*.8,-9,hw*1.7,6);c.strokeStyle=shade(col,-.6);c.lineWidth=1.5;c.strokeRect(-hw*.8,-9,hw*1.7,6);ell(c,0,-6,4.5,4.5,'#ffd24a',0,shade(col,-.6));
  ell(c,3,-47,10,7,metal(c,-7,-54,13,-40,tier),0,shade(col,-.6));ell(c,hw*.7,-46,8,6,metal(c,0,-54,16,-40,tier),0,shade(col,-.6));
  if(tier>=3){ell(c,2,-30,5,6,tier===5?'#ff6a3a':'#8af',0,shade(col,-.6));glow(c,2,-30,18,tier===5?'#ffb02a':'#4ad0f0',.7)}
  c.restore()}
function armorGlove(c,x,y,r,tier){const col=GCOL[tier];c.save();ell(c,x,y,r+3.5,r+3,metal(c,x-r,y-r,x+r,y+r,tier),0,shade(col,-.6));ell(c,x-r-6,y+1,r*.75,r*.9,shade(col,-.2),0,shade(col,-.6));if(tier>=4)glow(c,x,y,r+8,tier===5?'#ffd24a':'#4ad0f0',.5);c.restore()}
function armorBoot(c,fx,fy,tier,knee){const col=GCOL[tier];c.save();ell(c,fx+7,fy-1,15,7.5,metal(c,fx-8,fy-8,fx+22,fy+6,tier),0,shade(col,-.6));ell(c,(fx+knee[0])/2+1,(fy+knee[1])/2+4,8,10,metal(c,fx-8,fy-14,fx+8,fy+4,tier),0,shade(col,-.6),0);c.restore()}
function armorIcon(c,kind,tier,x,y,s,ghost){c.save();c.translate(x,y);c.scale(s,s);if(ghost)c.globalAlpha=.35;
  if(kind==='helm'){c.translate(0,10);armorHelm(c,null,tier)}
  else if(kind==='chest'){c.translate(0,24);armorChest(c,24,tier)}
  else{armorGlove(c,-14,-4,10,tier);armorBoot(c,0,14,tier,[-5,-5])}
  c.restore()}
/* ---------------- Creature drawing ---------------- */
function tailDraw(c,sp,t,bx,by,len,th,col,dark,fluff,wave){
  let px=bx,py=by,n=10;const pts=[];
  for(let i=0;i<=n;i++){const k=i/n;pts.push([bx-k*len+0,by+Math.sin(t*3-k*4)*wave*k*18+k*k*16])}
  for(let i=0;i<n;i++){const w=th*(1-i/n*(fluff?-.3:.8))+(fluff?4:1);limb(c,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],w,col,dark)}
  return pts[n];
}
function batWing(c,sp,x,y,ang,len,dark){
  c.save();c.translate(x,y);
  const wx=Math.cos(ang)*len*.62,wy=Math.sin(ang)*len*.62;
  const tips=[];for(let i=0;i<3;i++){const a2=ang+.25+i*.55-(ang<-.3?0:0);tips.push([wx+Math.cos(a2)*len*.75,wy+Math.sin(a2)*len*.75])}
  c.fillStyle=grad(c,0,-len,0,len*.5,[sp.c1,sp.c2]);c.strokeStyle=dark;c.lineWidth=2;
  c.beginPath();c.moveTo(0,0);c.lineTo(wx,wy);c.lineTo(tips[0][0],tips[0][1]);
  for(let i=1;i<3;i++){c.quadraticCurveTo((tips[i-1][0]+tips[i][0])/2-6,(tips[i-1][1]+tips[i][1])/2-12,tips[i][0],tips[i][1])}
  c.quadraticCurveTo(len*.1,len*.35,0,22);c.closePath();c.fill();c.stroke();
  c.strokeStyle=sp.c3;c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(wx,wy);c.stroke();
  c.lineWidth=1.5;c.strokeStyle=dark;tips.forEach(t=>{c.beginPath();c.moveTo(wx,wy);c.lineTo(t[0],t[1]);c.stroke()});
  c.restore();
}
function featherWing(c,sp,x,y,ang,len,fire,t){
  c.save();c.translate(x,y);
  const n=9;
  for(let i=0;i<n;i++){
    const a=ang-.55+i*.2,L=len*(.55+.45*Math.sin(i/(n-1)*Math.PI*.8+.3)),w=9+i*.4;
    c.save();c.rotate(a);
    c.fillStyle=fire?grad(c,0,0,L,0,[sp.c2,sp.c1,sp.c3]):grad(c,0,0,L,0,[sp.c2,sp.c1,sp.c3]);
    c.strokeStyle=sp.c2;c.lineWidth=1.2;
    c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(L*.5,-w,L,fire?Math.sin(t*9+i)*4:0);c.quadraticCurveTo(L*.5,w,0,0);c.fill();c.stroke();c.restore();
  }
  if(fire)glow(c,len*.5*Math.cos(ang),len*.5*Math.sin(ang),len*.8,sp.glow,.45+.15*Math.sin(t*8));
  c.restore();
}
function drawHead(c,sp,f,P){
  const t=f.t,open=P.open,id=sp.id,c1=sp.c1,c2=sp.c2,c3=sp.c3;
  const sk=(x,y,rx,ry,rot)=>ell(c,x,y,rx,ry,grad(c,x,y-ry,x,y+ry,[c3==='#fff1c9'&&0?c1:c1,c2]),rot,c2);
  switch(id){
  case'dragon':
    c.fillStyle=c3;poly(c,[-6,-12,-34,-34,-20,-6],c3,c2);poly(c,[2,-14,-22,-44,-10,-8],c3,c2);
    for(let i=0;i<4;i++)poly(c,[-14+i*5,-14,-10+i*5,-24,-6+i*5,-14],c2);
    ell(c,0,0,20,16,grad(c,0,-16,0,16,[c1,c2]),0,c2);
    ell(c,15,10+open*9,15,6,c2,0,'#2b0707');
    ell(c,17,3,17,10,grad(c,0,-8,0,14,[c1,c2]),0,c2);
    for(let i=0;i<4;i++){poly(c,[8+i*7,11,11+i*7,17+open*9,14+i*7,11],'#fff');poly(c,[8+i*7,10+open*9+6,11+i*7,5,14+i*7,10+open*9+6],'#fff')}
    ell(c,29,-1,2.5,2,'#220');eye(c,6,-6,5,'#ffe45a',f,1);
    if(open>.5){glow(c,32,10,26,'#ff8a1f',.8)}
    break;
  case'phoenix':
    for(let i=0;i<4;i++){c.save();c.translate(-4,-10);c.rotate(-1.9+i*.22+Math.sin(t*8+i)*.08);
      c.fillStyle=grad(c,0,0,34,0,[c1,c3]);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(18,-7,38-i*3,0);c.quadraticCurveTo(18,7,0,0);c.fill();c.restore()}
    ell(c,0,0,15,14,grad(c,0,-14,0,14,[c1,c2]),0,c2);
    poly(c,[12,-5,32,3,12,9],c3,'#a06a00');poly(c,[12,3,26,4,12,9],'#e0a000');
    eye(c,5,-4,4.5,'#fff3b0',f,0);glow(c,0,0,34,sp.glow,.5);
    break;
  case'minotaur':
    ell(c,-14,-6,7,12,c1,-.7,c2);
    c.strokeStyle=c2;c.lineWidth=11;c.lineCap='round';c.beginPath();c.moveTo(-2,-14);c.quadraticCurveTo(-10,-40,16,-46);c.stroke();
    c.strokeStyle='#f3e3c0';c.lineWidth=7;c.beginPath();c.moveTo(-2,-14);c.quadraticCurveTo(-10,-40,16,-46);c.stroke();
    ell(c,0,0,19,17,grad(c,0,-17,0,17,[c1,c2]),0,c2);
    ell(c,15,7+open*3,15,12,grad(c,0,-5,0,18,[c3,c1]),0,c2);
    ell(c,22,3,2.5,3,'#2a1208');ell(c,22,12,2.5,3,'#2a1208');
    c.strokeStyle='#ffd24a';c.lineWidth=3;c.beginPath();c.arc(26,11,5,.2,TAU-.4);c.stroke();
    eye(c,5,-5,5,'#ffe9d0',f,1);
    break;
  case'centaur':
    c.save();c.translate(-8,-4);for(let i=0;i<5;i++){ell(c,-8-i*7,6+i*5+Math.sin(t*5+i)*2,10,6,c2,-.4)}c.restore();
    ell(c,0,0,15,17,grad(c,0,-17,0,17,['#f3c79a','#d49a68']),0,c2);
    ell(c,-3,-8,16,14,c2);ell(c,-2,-4,14,13,grad(c,0,-17,0,17,['#f3c79a','#d49a68']));
    poly(c,[-12,-6,-24,-14,-12,2],'#e8b988',c2);
    c.fillStyle=c3;c.fillRect(-14,-12,28,4);
    eye(c,5,-3,4,'#fff',f,0);c.strokeStyle='#7a3a20';c.lineWidth=2;c.beginPath();c.arc(9,6,5,.2,2.2);c.stroke();
    break;
  case'unicorn':
    for(let i=0;i<6;i++){ell(c,-8-i*5,-8+i*7+Math.sin(t*4+i)*2,9,5.5,['#ff7ab8','#ffb347','#ffe45a','#7aff9a','#6fc8ff','#b58cff'][i],-.5)}
    poly(c,[-6,-14,-14,-30,2,-16],c1,c2);
    ell(c,0,0,16,15,grad(c,0,-15,0,15,['#fff',c1]),0,c2);
    ell(c,15,6,16,10,grad(c,0,-4,0,14,['#fff',c1]),0,c2);
    ell(c,25,5,2,3,c3);
    c.save();c.translate(6,-14);c.rotate(.35);const hg=grad(c,0,0,0,-44,['#ffe45a','#fff','#ff9ae8']);
    poly(c,[-5,0,0,-46,5,0],hg,'#c8a0e0');c.strokeStyle='#d8a0ff';c.lineWidth=1.5;for(let i=1;i<5;i++){c.beginPath();c.moveTo(-5+i*.4,-i*9);c.lineTo(5-i*.4,-i*9+4);c.stroke()}c.restore();
    glow(c,10,-34,22,'#ffe0ff',.55+.2*Math.sin(t*6));
    eye(c,6,-4,4.2,'#fff',f,0);c.strokeStyle='#222';c.lineWidth=2;c.beginPath();c.moveTo(3,-8);c.lineTo(0,-11);c.stroke();
    break;
  case'griffin':
    poly(c,[-4,-12,-18,-28,0,-18],c3,c2);poly(c,[2,-14,-8,-32,8,-18],c3,c2);
    ell(c,0,0,16,15,grad(c,0,-15,0,15,['#fff',c3]),0,c2);
    c.fillStyle=grad(c,0,-6,0,16,['#ffd54a','#c98a00']);c.strokeStyle='#8a5a00';c.lineWidth=2;
    c.beginPath();c.moveTo(10,-8);c.quadraticCurveTo(34,-8,32,10+open*5);c.quadraticCurveTo(24,4,16,8+open*6);c.lineTo(10,6);c.closePath();c.fill();c.stroke();
    eye(c,5,-4,4.5,'#ffcf40',f,1);
    break;
  case'kraken':
    c.save();c.rotate(-.35);ell(c,-4,-14,22,28,grad(c,0,-42,0,14,[c1,c2]),0,c2);
    for(let i=0;i<5;i++)ell(c,-12+i*5,-24+(i%2)*10,2.6,2.6,c3);c.restore();
    ell(c,2,2,18,15,grad(c,0,-14,0,16,[c1,c2]),0,c2);
    for(let i=0;i<4;i++){c.strokeStyle=c1;c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(8+i*4,12);c.quadraticCurveTo(8+i*4+Math.sin(t*5+i)*8,24,10+i*3+Math.sin(t*4+i)*9,34);c.stroke();ell(c,10+i*3+Math.sin(t*4+i)*9,34,2,2,c3)}
    eye(c,3,-3,6.5,'#ffe45a',f,1);eye(c,15,-1,5,'#ffe45a',f,1);
    break;
  case'werewolf':
    poly(c,[-8,-12,-14,-34,2,-16],c1,c2);poly(c,[2,-14,6,-36,14,-14],c1,c2);
    for(let i=0;i<5;i++)poly(c,[-18,-4+i*5,-30,-2+i*5+Math.sin(t*6+i)*3,-16,4+i*5],c2);
    ell(c,0,0,18,16,grad(c,0,-16,0,16,[c1,c2]),0,c2);
    ell(c,16,5,16,9,grad(c,0,-3,0,14,[c3,c1]),0,c2);ell(c,29,2,3.5,3,'#111');
    ell(c,14,10+open*7,13,5,'#5a1010',0,'#222');
    for(let i=0;i<3;i++){poly(c,[8+i*8,9,11+i*8,16+open*7,14+i*8,9],'#fff');poly(c,[10+i*8,13+open*7,12+i*8,8,15+i*8,13+open*7],'#fff')}
    eye(c,6,-5,4.5,'#ffe45a',f,1);glow(c,6,-5,10,'#ffe45a',.5);
    break;
  case'yeti':
    for(let i=0;i<9;i++){const a=-2.8+i*.45;poly(c,[Math.cos(a)*14,Math.sin(a)*14,Math.cos(a)*27,Math.sin(a)*27+Math.sin(t*5+i)*2,Math.cos(a+.3)*14,Math.sin(a+.3)*14],c1,c2)}
    ell(c,0,0,21,19,grad(c,0,-19,0,19,['#fff',c1]),0,c2);
    ell(c,6,3,14,12,'#9ad4ee');
    poly(c,[2,6,5,16,8,6],'#fff','#7aa');poly(c,[12,6,15,16,18,6],'#fff','#7aa');
    ell(c,10,12+open*4,8,4+open*3,'#3a1a30');
    ell(c,12,0,2.4,2,'#223');
    eye(c,3,-6,3.8,'#fff',f,1);eye(c,13,-6,3.2,'#fff',f,1);
    break;
  case'golem':
    ell(c,-20,-26,7,6,c2,.3);ell(c,18,-34,5,5,c3,.5);ell(c,-4,-33,5,3,'#5a9a4a');
    c.fillStyle=grad(c,0,-18,0,18,[c3,c1,c2]);c.strokeStyle=c2;c.lineWidth=3;c.lineJoin='round';
    c.beginPath();c.moveTo(-18,-14);c.lineTo(-6,-22);c.lineTo(16,-18);c.lineTo(22,-4);c.lineTo(18,16);c.lineTo(-10,18);c.lineTo(-20,6);c.closePath();c.fill();c.stroke();
    c.strokeStyle=c2;c.lineWidth=1.5;c.beginPath();c.moveTo(-4,-20);c.lineTo(0,-8);c.lineTo(-8,2);c.stroke();
    glow(c,6,-4,16,sp.glow,.6);ell(c,2,-4,5,3.5,'#e8ffff');ell(c,14,-4,4.5,3.5,'#e8ffff');
    c.strokeStyle='#222';c.lineWidth=3;c.beginPath();c.moveTo(-3,-10);c.lineTo(8,-6);c.moveTo(18,-9);c.lineTo(10,-6);c.stroke();
    c.fillStyle='#222';c.fillRect(0,8,16,3);
    break;
  }
}
function drawTorsoExtra(c,sp,f,hw){
  const t=f.t;
  switch(sp.id){
  case'dragon':for(let i=0;i<5;i++){ell(c,hw*.45,-8-i*9,hw*.5,4,sp.c3,0,'#a8742a')}for(let i=0;i<5;i++)poly(c,[-hw+2,-10-i*10,-hw-6,-16-i*10,-hw+4,-18-i*10],sp.c2);break;
  case'minotaur':c.fillStyle=sp.c2;c.fillRect(-hw*.9,-12,hw*1.8,9);ell(c,0,-8,6,6,'#ffd24a',0,'#8a5a00');
    c.strokeStyle=sp.c2;c.lineWidth=2;c.beginPath();c.moveTo(4,-26);c.lineTo(4,-16);c.moveTo(-8,-34);c.quadraticCurveTo(0,-26,10,-34);c.stroke();break;
  case'unicorn':c.fillStyle='#ff9ae8';poly(c,[-hw*.6,-10,hw*.6,-10,hw*.5,-30,-hw*.5,-30],'#a78bfa');ell(c,0,-20,5,5,'#ffe45a',0,'#fff');break;
  case'centaur':c.fillStyle='#4a6a3a';poly(c,[-hw*.9,-6,hw*.9,-6,hw*.8,-44,-hw*.8,-44],'#3f7a52','#1a3a26');c.strokeStyle='#ffe27a';c.lineWidth=2;c.beginPath();c.moveTo(-hw*.8,-44);c.lineTo(hw*.8,-6);c.stroke();break;
  case'phoenix':for(let i=0;i<4;i++)ell(c,0,-12-i*9,hw*.8-i*2,4,i%2?sp.c3:'#ffb02a',0);glow(c,0,-28,36,sp.glow,.5);break;
  case'griffin':ell(c,hw*.2,-26,hw*.7,20,'#fff1c9');for(let i=0;i<5;i++)poly(c,[-8,-8-i*9,2,-12-i*9,8,-8-i*9],sp.c3);break;
  case'kraken':for(let i=0;i<6;i++)ell(c,-hw*.5+(i%3)*hw*.5,-14-Math.floor(i/3)*16-(i%2)*4,3,3,sp.c3);break;
  case'werewolf':for(let i=0;i<7;i++)poly(c,[-hw+2,-8-i*7,-hw-8,-12-i*7+Math.sin(t*5+i)*2,-hw+4,-15-i*7],sp.c2);ell(c,hw*.3,-24,hw*.5,18,sp.c3);break;
  case'yeti':for(let i=0;i<8;i++)poly(c,[-hw+4+i*(hw*2-8)/8,-4,-hw+i*(hw*2-8)/8+7,-12,-hw+4+i*(hw*2-8)/8+12,-4],'#fff');ell(c,hw*.2,-26,hw*.55,20,'#bfe4f7');break;
  case'golem':
    c.strokeStyle=sp.c2;c.lineWidth=2;c.beginPath();c.moveTo(-hw,-30);c.lineTo(0,-24);c.lineTo(hw,-34);c.moveTo(0,-24);c.lineTo(-4,-8);c.stroke();
    glow(c,0,-30,22,sp.glow,.8);ell(c,0,-30,6,6,'#d8ffff',0,sp.c2);ell(c,-hw*.7,-44,8,6,sp.c3,0,sp.c2);ell(c,hw*.7,-44,8,6,sp.c3,0,sp.c2);break;
  }
}
function drawFighter(c,f){
  const sp=f.sp,P=f.pose,sc=f.sc,t=f.t;
  const gy=f.demo?f.y:(f.sy!=null?f.sy:groundY(f.x)),h=Math.max(0,gy-f.y);
  c.save();c.globalAlpha=.32*(1-Math.min(1,h/260));c.fillStyle='#000';c.beginPath();c.ellipse(f.x,gy+3,Math.max(5,40*sc*(1-h/520)),8*sc,0,0,TAU);c.fill();c.restore();
  c.save();c.translate(f.x,f.y);
  if(f.rot){c.translate(0,38*sc*Math.min(1,Math.abs(f.rot)/1.5));c.translate(0,-50*sc);c.rotate(f.rot);c.translate(0,50*sc)}
  c.scale(f.face*sc,sc);
  if(f.dodgeT>0)c.globalAlpha=.4;if(f.inv>0&&Math.sin(f.t*28)>0)c.globalAlpha=.35;
  const hipY=-62+P.hip,L=P.lean,cl=Math.cos(L),sl=Math.sin(L);
  const tr=(x,y)=>[x*cl-y*sl,hipY+x*sl+y*cl];
  const hw=sp.bw,sh=tr(4,-46),hd=tr(6,-70);
  const flapSp=f.onGround?3.2:13,flap=Math.sin(t*flapSp);
  // aura for specials
  if(f.atk&&f.atk.type==='special')glow(c,0,-70,90,(f.atk.def||sp.sp).col,.7);
  // back layer: wings / tail
  if(sp.wings){const wa=f.onGround?-1.15+flap*.12:-.9+flap*.6+(f.vy>0?.2:0);
    if(sp.wings==='bat')batWing(c,sp,sh[0]-4,sh[1]+2,wa,92,sp.c2);else featherWing(c,sp,sh[0]-4,sh[1]+4,wa-.1,96,sp.wings==='fire',t)}
  const tb=tr(-6,-8);
  if(sp.tail==='dragon'){const e=tailDraw(c,sp,t,tb[0],tb[1],70,12,sp.c1,sp.c2,0,1);poly(c,[e[0]-4,e[1]-9,e[0]-26,e[1],e[0]-4,e[1]+9],sp.c3,sp.c2)}
  else if(sp.tail==='horse'||sp.tail==='rainbow'){
    const cols=sp.tail==='rainbow'?['#ff7ab8','#ffb347','#ffe45a','#7aff9a','#6fc8ff','#b58cff']:[sp.c2,sp.c2,sp.c2,sp.c1,sp.c2,sp.c2];
    for(let i=0;i<6;i++){const sw=Math.sin(t*4+i)*5;limb(c,tb[0],tb[1],tb[0]-40-i*2+sw,tb[1]+24+i*6,6,cols[i],cols[i])}}
  else if(sp.tail==='fluff'){const e=tailDraw(c,sp,t,tb[0],tb[1],50,10,sp.c1,sp.c2,1,.6);ell(c,e[0],e[1],9,9,sp.c3)}
  else if(sp.tail==='lion'){const e=tailDraw(c,sp,t,tb[0],tb[1],56,5,sp.c1,sp.c2,0,.8);ell(c,e[0]-2,e[1],10,8,sp.c2)}
  else if(sp.tail==='thin'){const e=tailDraw(c,sp,t,tb[0],tb[1],46,4,sp.c1,sp.c2,0,.8);ell(c,e[0]-2,e[1],6,9,sp.c2)}
  else if(sp.tail==='fire'){for(let i=0;i<5;i++){c.save();c.translate(tb[0],tb[1]);c.rotate(Math.PI+.9-i*.35+Math.sin(t*7+i)*.12);
      c.fillStyle=grad(c,0,0,70,0,[sp.c1,sp.c3]);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(36,-8,76-i*6,0);c.quadraticCurveTo(36,8,0,0);c.fill();c.restore()}}
  else if(sp.tail==='tentacle'){for(let i=0;i<4;i++){c.strokeStyle=i%2?sp.c1:sp.c2;c.lineWidth=11-i;c.lineCap='round';c.beginPath();c.moveTo(tb[0],tb[1]-i*4);
      c.bezierCurveTo(tb[0]-26,tb[1]+Math.sin(t*4+i)*14-i*6,tb[0]-44+Math.sin(t*3+i)*6,tb[1]+30+i*6,tb[0]-26-i*8,tb[1]+52+Math.sin(t*5+i)*6);c.stroke()}}
  // limbs
  const ac=sp.c1,ad=sp.c2,ah=sp.c3;
  const lw=sp.id==='yeti'||sp.id==='golem'||sp.id==='minotaur'?17:13;
  const leg=(hx,tg,col,dk)=>{const k=ik(hx,hipY+4,tg[0],tg[1],31,31,-1);
    limb(c,hx,hipY+4,k[0],k[1],lw+1,col,dk,ah);limb(c,k[0],k[1],k[2],k[3],lw,col,dk,ah);
    const fx=k[2],fy=k[3];ell(c,fx+7,fy-1,13,6,dk,0,'rgba(0,0,0,.4)');ell(c,fx+6,fy-3,11,4,col);
    if(f.gear&&f.gear.limbs>0)armorBoot(c,fx,fy,f.gear.limbs,[k[0],k[1]]);
    if(sp.claws){for(let i=0;i<3;i++)poly(c,[fx+15+i*0,fy-5+i*3,fx+22,fy-3+i*3,fx+14,fy-1+i*3],'#fff')}};
  const arm=(s,tg,col,dk,front)=>{const k=ik(s[0],s[1],tg[0],tg[1],25,24,1);
    limb(c,s[0],s[1],k[0],k[1],lw-1,col,dk,ah);limb(c,k[0],k[1],k[2],k[3],lw-2,col,dk,ah);
    const r=sp.id==='golem'?11:sp.id==='yeti'?10:8;
    ell(c,k[2],k[3],r,r,sp.id==='golem'?sp.c3:col,0,dk);
    if(f.gear&&f.gear.limbs>0)armorGlove(c,k[2],k[3],r,f.gear.limbs);
    if(sp.claws)for(let i=0;i<3;i++)poly(c,[k[2]+r-2,k[3]-4+i*4,k[2]+r+7,k[3]-2+i*4,k[2]+r-2,k[3]+1+i*4],'#fff');
    if(f.shield&&f.atk==null)glow(c,k[2],k[3],18,sp.glow,.6);
    if(front&&f.wp&&f.wp.id!=='fists'&&!(f.wp.style==='throw'&&f.boomOut))weaponHeld(c,f,k[2],k[3])};
  const dark1=sp.id==='yeti'?'#b4d4ea':ad;
  leg(-8,P.fb,dark1,'#000'); arm([sh[0]-6,sh[1]],P.hb,dark1,'#000');
  // torso
  c.save();c.translate(0,hipY);c.rotate(L);
  ell(c,0,-3,hw*.85,13,grad(c,0,-14,0,10,[ad,'#000']));
  c.beginPath();c.ellipse(0,-27,hw,31,0,0,TAU);c.fillStyle=grad(c,-hw,0,hw,0,[ad,ac,ac,ah]);c.fill();c.strokeStyle=ad;c.lineWidth=2.5;c.stroke();
  ell(c,hw*.35,-24,hw*.55,24,grad(c,0,-48,0,0,[ah,ac]),0,null);c.globalAlpha*=.55;
  drawTorsoExtra(c,sp,f,hw);c.globalAlpha/=.55;
  if(f.gear&&f.gear.chest>0)armorChest(c,hw,f.gear.chest);
  c.restore();
  // head
  c.save();c.translate(hd[0],hd[1]);c.rotate(L*.6+(f.stun>0?-.2:0)+Math.sin(t*3.2)*.02);
  drawHead(c,sp,f,P);if(f.gear&&f.gear.helm>0)armorHelm(c,sp,f.gear.helm);c.restore();
  leg(8,P.ff,ac,ad);
  arm(sh,P.hf,ac,ad,true);
  if(f.flash>0){glow(c,0,-70,70,'#fff',Math.min(1,f.flash*5))}
  c.restore();
  // shield bubble
  if(f.shield&&!f.ko){const sx=f.x+f.face*26*sc,sy=f.y-68*sc,r=62*sc;c.save();c.globalCompositeOperation='lighter';
    c.fillStyle=rgrad(c,sx,sy,r*.4,r,['rgba(120,200,255,.05)','rgba(120,200,255,.5)']);c.beginPath();c.arc(sx,sy,r,0,TAU);c.fill();
    c.strokeStyle='rgba(200,240,255,'+(.5+f.sh/200)+')';c.lineWidth=3;c.stroke();c.restore()}
}

/* ---------------- Particles ---------------- */
const parts=[];
function spawnP(x,y,vx,vy,life,size,col,kind,grav){if(parts.length>700)parts.shift();parts.push({x,y,vx,vy,life,max:life,size,col,kind:kind||'glow',grav:grav||0,rot:rnd(0,TAU)})}
function burst(x,y,n,col,spd,size,kind,grav){for(let i=0;i<n;i++){const a=rnd(0,TAU),s=rnd(.3,1)*spd;spawnP(x,y,Math.cos(a)*s,Math.sin(a)*s,rnd(.3,.7),rnd(.6,1)*size,col,kind,grav)}}
function ring(x,y,col,size){spawnP(x,y,0,0,.35,size,col,'ring')}
function updateParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue}p.vy+=p.grav*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=dt*4}}
function drawParts(c){
  c.save();
  for(const p of parts){const k=p.life/p.max;
    if(p.kind==='ring'){c.globalCompositeOperation='lighter';c.globalAlpha=k;c.strokeStyle=p.col;c.lineWidth=4*k+1;c.beginPath();c.arc(p.x,p.y,p.size*(1.2-k),0,TAU);c.stroke()}
    else if(p.kind==='star'){c.globalCompositeOperation='lighter';c.globalAlpha=k;c.fillStyle=p.col;c.save();c.translate(p.x,p.y);c.rotate(p.rot);const s=p.size*k;poly(c,[0,-s*2,s*.5,-s*.5,s*2,0,s*.5,s*.5,0,s*2,-s*.5,s*.5,-s*2,0,-s*.5,-s*.5],p.col);c.restore()}
    else if(p.kind==='dust'){c.globalCompositeOperation='source-over';c.globalAlpha=k*.5;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.size*(2-k),0,TAU);c.fill()}
    else{c.globalCompositeOperation='lighter';c.globalAlpha=k;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.size*(.4+k*.6),0,TAU);c.fill()}
  }
  c.restore();
}

/* ---------------- Arenas ---------------- */
function mk(seed,n,fn){const r=mkRng(seed),a=[];for(let i=0;i<n;i++)a.push(fn(r,i));return a}
const ARENAS=[
 {id:'volcano',name:'Ember Peak',sub:'Volcano',ramps:[{a:120,b:230,c:290,d:380,h:55},{a:590,b:680,c:740,d:850,h:55}],gTop:'#4a2420',gBot:'#1a0a0c',gLine:'#ff6a1f',music:'battle',
  deco:mk(11,40,r=>({x:r()*W,y:r()*H,s:r()*2+1,sp:20+r()*40,ph:r()*6})),
  draw(c,t,px){
    c.fillStyle=grad(c,0,0,0,GROUND,['#2a0a22','#8a1f2a','#ff7a2a']);c.fillRect(0,0,W,H);
    glow(c,700-px*.05,230,200,'#ffcf6a',.55);
    c.fillStyle='#3a1226';poly(c,[0,330,90-px*.1,230,200-px*.1,300,320-px*.1,200,430,310,520,330,560,GROUND+20,0,GROUND+20]);
    const vx=300-px*.15;
    c.fillStyle=grad(c,0,150,0,GROUND,['#4a1a2a','#240a18']);poly(c,[vx-230,GROUND+10,vx-60,190,vx-34,170,vx+34,170,vx+60,190,vx+230,GROUND+10]);
    glow(c,vx,168,90,'#ff6a1f',.9);ell(c,vx,170,36,8,'#ffb040');
    c.strokeStyle='#ff7a2a';c.lineWidth=4;c.beginPath();c.moveTo(vx-10,172);c.quadraticCurveTo(vx-40,260,vx-70,330);c.moveTo(vx+14,172);c.quadraticCurveTo(vx+30,250,vx+60,320);c.stroke();
    for(let i=0;i<7;i++){const k=((t*.12+i/7)%1);c.globalAlpha=(1-k)*.5;ell(c,vx+Math.sin(k*5+i)*30+k*60,160-k*160,14+k*40,12+k*30,'#3a2030');c.globalAlpha=1}
    c.fillStyle='#2a0c1c';poly(c,[420-px*.3,GROUND+20,560-px*.3,250,680-px*.3,310,800-px*.3,230,960,330,960,GROUND+20]);
    c.save();c.globalCompositeOperation='lighter';for(const d of this.deco){const y=((d.y-t*d.sp)%H+H)%H,x=d.x+Math.sin(t+d.ph)*18-px*.1;c.fillStyle=`rgba(255,${140+d.ph*10|0},40,${.5+.4*Math.sin(t*3+d.ph)})`;c.beginPath();c.arc((x+W)%W,y,d.s,0,TAU);c.fill()}c.restore();
  },
  fore(c,t){const r=mkRng(5);c.save();c.globalCompositeOperation='lighter';for(let i=0;i<10;i++){const x=r()*W,y=GROUND+25+r()*90;c.strokeStyle=`rgba(255,${100+r()*80|0},30,${.4+.3*Math.sin(t*2+i)})`;c.lineWidth=2+r()*2;c.beginPath();c.moveTo(x,y);c.lineTo(x+30+r()*40,y+10);c.lineTo(x+60+r()*40,y-6);c.stroke()}c.restore()}},
 {id:'forest',name:'Whisperwood',sub:'Enchanted Forest',ramps:[{a:330,b:420,c:540,d:630,h:48}],gTop:'#3f8a3a',gBot:'#14361c',gLine:'#9aff7a',music:'battle',
  trees:mk(3,14,r=>({x:r()*W,h:150+r()*120,w:16+r()*14,l:r()})),near:mk(8,7,r=>({x:r()*W,h:230+r()*80,w:30+r()*14})),
  fly:mk(4,35,r=>({x:r()*W,y:150+r()*260,ph:r()*6,s:r()})),
  draw(c,t,px){
    c.fillStyle=grad(c,0,0,0,GROUND,['#0b3b3a','#2f9a62','#c6f5a0']);c.fillRect(0,0,W,H);
    c.save();c.globalCompositeOperation='lighter';for(let i=0;i<5;i++){const x=120+i*190+Math.sin(t*.3+i)*20;c.fillStyle=grad(c,x,0,x,GROUND,['rgba(255,255,180,.28)','rgba(255,255,180,0)']);poly(c,[x,0,x+50,0,x+160,GROUND,x+60,GROUND])}c.restore();
    const tree=(x,h,w,col,col2)=>{c.fillStyle=col2;c.fillRect(x-w/2,GROUND-h,w,h);c.fillStyle=col;for(let k=0;k<4;k++)ell(c,x+Math.sin(k*2)*w*1.4,GROUND-h-k*16+20,w*2.2-k*4,w*1.7,col)};
    for(const o of this.trees)tree(((o.x-px*.15)%1100+1100)%1100-70,o.h,o.w*.8,'#1d6a46','#0f3a2a');
    c.fillStyle='rgba(120,255,200,.12)';c.fillRect(0,GROUND-120,W,140);
    for(const o of this.near)tree(((o.x-px*.4)%1100+1100)%1100-70,o.h,o.w,'#17542f','#2a1a10');
    c.save();c.globalCompositeOperation='lighter';for(const f of this.fly){const x=(f.x+Math.sin(t*.6+f.ph)*40-px*.3+W*3)%W,y=f.y+Math.cos(t*.8+f.ph)*25;c.fillStyle=rgba2('#e6ff7a',.5+.5*Math.sin(t*3+f.ph));c.beginPath();c.arc(x,y,2+f.s*1.5,0,TAU);c.fill();glow(c,x,y,10,'#d6ff6a',.35)}c.restore();
  },
  fore(c,t){const r=mkRng(7);for(let i=0;i<14;i++){const x=r()*W,y=GROUND+22+r()*100;c.strokeStyle='#2c7a2c';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.sin(t+i)*6,y-14,x+Math.sin(t+i)*9,y-26);c.stroke()}
    for(let i=0;i<5;i++){const x=80+i*190+r()*50,y=GROUND+60+r()*50;ell(c,x,y,14,9,'#e0463a');ell(c,x,y+10,4,8,'#f4e8d0');ell(c,x-4,y-2,2.5,2,'#fff')}}},
 {id:'sky',name:'Cloud Temple',sub:'Sky Temple',ramps:[{a:90,b:200,c:250,d:330,h:62},{a:630,b:710,c:760,d:870,h:62}],gTop:'#f3e6c0',gBot:'#b89a5a',gLine:'#fff7d0',music:'battle',
  clouds:mk(2,10,r=>({x:r()*W,y:40+r()*260,s:.6+r()*1.2,sp:6+r()*14})),
  draw(c,t,px){
    c.fillStyle=grad(c,0,0,0,GROUND,['#2f86ff','#8fd0ff','#fff0cf']);c.fillRect(0,0,W,H);
    glow(c,760,110,170,'#fff6c0',.8);ell(c,760,110,36,36,'#fffbe0');
    for(const o of this.clouds){const x=((o.x+t*o.sp-px*.1*o.s)%1200+1200)%1200-120;c.globalAlpha=.85;for(let k=0;k<4;k++)ell(c,x+k*38*o.s,o.y+(k%2)*10*o.s,52*o.s,26*o.s,'#fff');c.globalAlpha=1}
    const isl=(x,y,s)=>{const yy=y+Math.sin(t+x)*6;poly(c,[x-90*s,yy,x+90*s,yy,x+40*s,yy+60*s,x,yy+90*s,x-40*s,yy+50*s],'#8a7a6a','#5a4a3a');ell(c,x,yy,90*s,10*s,'#6fc060');
      c.fillStyle='#fdf6e3';for(let k=-2;k<=2;k++)c.fillRect(x+k*24*s-5*s,yy-50*s,10*s,48*s);poly(c,[x-62*s,yy-50*s,x+62*s,yy-50*s,x,yy-84*s],'#e9d9b0','#a89060')};
    isl(220-px*.1,170,.8);isl(720-px*.12,130,.6);
    for(const sx of[60,900]){const x=sx-px*.4;c.fillStyle=grad(c,x-30,0,x+30,0,['#d8c9a6','#fffaf0','#c9b88f']);c.fillRect(x-28,60,56,GROUND-50);c.fillStyle='#e8d9b0';c.fillRect(x-40,40,80,24);c.fillRect(x-38,GROUND-30,76,34)}
  },
  fore(c,t){c.strokeStyle='rgba(120,90,40,.35)';c.lineWidth=2;for(let i=0;i<8;i++){c.beginPath();c.moveTo(i*130,GROUND+20);c.lineTo(i*130-40,H);c.stroke()}for(let j=0;j<3;j++){c.beginPath();c.moveTo(0,GROUND+30+j*34);c.lineTo(W,GROUND+30+j*34);c.stroke()}}},
 {id:'ice',name:'Glimmerfrost',sub:'Frozen Cave',ramps:[{a:60,b:200,c:300,d:420,h:50},{a:700,b:780,c:830,d:900,h:30}],gTop:'#d7f1ff',gBot:'#4a7aa8',gLine:'#ffffff',music:'battle',
  stal:mk(6,16,r=>({x:r()*W,h:40+r()*90,w:16+r()*20})),cry:mk(9,8,r=>({x:r()*W,h:40+r()*60,hue:r()})),snow:mk(12,60,r=>({x:r()*W,y:r()*H,s:1+r()*2,sp:20+r()*40,ph:r()*6})),
  draw(c,t,px){
    c.fillStyle=grad(c,0,0,0,GROUND,['#050e26','#12386a','#2c7aa8']);c.fillRect(0,0,W,H);
    c.save();c.globalCompositeOperation='lighter';for(let b=0;b<3;b++){c.fillStyle=grad(c,0,60,0,260,['rgba(60,255,160,0)',['rgba(60,255,170,.28)','rgba(180,90,255,.25)','rgba(60,200,255,.25)'][b],'rgba(0,0,0,0)']);c.beginPath();c.moveTo(0,100+b*30);for(let x=0;x<=W;x+=40)c.lineTo(x,90+b*32+Math.sin(x*.01+t*.5+b)*34);for(let x=W;x>=0;x-=40)c.lineTo(x,200+b*32+Math.sin(x*.012+t*.4+b*2)*30);c.fill()}c.restore();
    for(const o of this.stal){const x=o.x-px*.12;poly(c,[x-o.w,0,x+o.w,0,x,o.h],'#2b5f8f','#8ad0f0')}
    for(const o of this.cry){const x=((o.x-px*.3)%1100+1100)%1100-70,col=o.hue>.5?'#7afcff':'#c79aff';glow(c,x,GROUND-o.h*.5,70,col,.5);poly(c,[x-14,GROUND,x-6,GROUND-o.h,x+4,GROUND,],col,'#fff',1.5);poly(c,[x+2,GROUND,x+12,GROUND-o.h*.7,x+22,GROUND],col,'#fff',1.5)}
    c.fillStyle='rgba(255,255,255,.8)';for(const s of this.snow){c.beginPath();c.arc(((s.x+Math.sin(t+s.ph)*20+W)%W),(s.y+t*s.sp)%H,s.s,0,TAU);c.fill()}
  },
  fore(c,t){const r=mkRng(3);c.fillStyle='rgba(255,255,255,.35)';for(let i=0;i<12;i++){ell(c,r()*W,GROUND+30+r()*100,30+r()*40,4,'rgba(255,255,255,.3)')}}},
 {id:'ocean',name:'Sunken Citadel',sub:'Ocean Ruins',ramps:[{a:190,b:280,c:330,d:420,h:45},{a:540,b:620,c:680,d:790,h:60}],gTop:'#e6d49a',gBot:'#7a6a3a',gLine:'#fff2b0',music:'battle',
  bub:mk(14,40,r=>({x:r()*W,y:r()*H,s:2+r()*5,sp:20+r()*40,ph:r()*6})),fish:mk(15,7,r=>({y:60+r()*260,sp:20+r()*40,s:.6+r()*.8,x:r()*W})),
  draw(c,t,px){
    c.fillStyle=grad(c,0,0,0,GROUND,['#03284a','#0a6a90','#3ec9c9']);c.fillRect(0,0,W,H);
    c.save();c.globalCompositeOperation='lighter';for(let i=0;i<6;i++){const x=40+i*170+Math.sin(t*.4+i)*30;c.fillStyle=grad(c,x,0,x,GROUND,['rgba(180,255,255,.3)','rgba(180,255,255,0)']);poly(c,[x,0,x+60,0,x+190,GROUND,x+70,GROUND])}c.restore();
    const col=(x,h,w,broken)=>{c.fillStyle=grad(c,x-w,0,x+w,0,['#3a6a7a','#7ab4c0','#2c5260']);c.fillRect(x-w,GROUND-h,w*2,h);c.fillRect(x-w-5,GROUND-h-8,w*2+10,10);if(broken)poly(c,[x-w,GROUND-h,x+w,GROUND-h,x+w*.2,GROUND-h-24],'#2c5260')};
    c.globalAlpha=.55;col(120-px*.15,260,26,0);col(300-px*.15,200,24,1);col(700-px*.2,290,28,0);col(870-px*.2,180,26,1);
    c.strokeStyle='#4a7a8a';c.lineWidth=14;c.beginPath();c.arc(500-px*.2,GROUND,120,Math.PI,TAU);c.stroke();c.globalAlpha=1;
    for(const f of this.fish){const x=((f.x+t*f.sp*(f.s>1?-1:1))%1200+1200)%1200-120;c.fillStyle='rgba(20,60,90,.7)';ell(c,x,f.y,16*f.s,7*f.s);poly(c,[x-14*f.s,f.y,x-26*f.s,f.y-8*f.s,x-26*f.s,f.y+8*f.s],'rgba(20,60,90,.7)')}
    c.fillStyle='rgba(220,255,255,.6)';c.strokeStyle='rgba(255,255,255,.8)';for(const b of this.bub){const y=((b.y-t*b.sp)%H+H)%H;c.beginPath();c.arc((b.x+Math.sin(t*2+b.ph)*10),y,b.s,0,TAU);c.globalAlpha=.4;c.fill();c.globalAlpha=.8;c.stroke();c.globalAlpha=1}
  },
  fore(c,t){const r=mkRng(21);for(let i=0;i<9;i++){const x=r()*W,y=GROUND+50+r()*70,col=['#ff6a8a','#ff9a4a','#c06aff'][i%3];for(let k=0;k<4;k++){c.strokeStyle=col;c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(x+k*8,y);c.quadraticCurveTo(x+k*8+Math.sin(t*1.5+k)*5,y-18,x+k*8+Math.sin(t+i)*7+k*3-6,y-34-k*4);c.stroke()}}}}
];
function rgba2(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`}
function setArena(i){ARENA=ARENAS[i]}
function drawArena(c,t,camx){ // legacy (menus)
  const px=(camx||480)-480;ARENA.draw(c,t,px);
  c.beginPath();c.moveTo(0,H);for(let x=0;x<=W;x+=8)c.lineTo(x,groundY(x));c.lineTo(W,groundY(W));c.lineTo(W,H);c.closePath();
  c.fillStyle=grad(c,0,GROUND-60,0,H,[ARENA.gTop,ARENA.gBot]);c.fill();
  c.beginPath();for(let x=0;x<=W;x+=8)x?c.lineTo(x,groundY(x)):c.moveTo(x,groundY(x));c.strokeStyle=ARENA.gLine;c.lineWidth=4;c.stroke();
  ARENA.fore(c,t);
}
/* screen-space backdrop aligned to the camera's ground line */
function drawArenaBg(c,t,cam){
  const ww=ARENA.ww||W,px=(cam.x-ww/2)*.5,gy=H/2+(GROUND-cam.y)*cam.z,dy=gy-GROUND;
  ARENA.draw(c,t,px);
  if(Math.abs(dy)>3){c.save();c.beginPath();c.rect(0,0,W,H);c.clip();c.translate(0,Math.max(-200,Math.min(260,dy)));ARENA.draw(c,t,px);c.restore()}
}
function drawPlat(c,p,t){
  const th=p.t==='f'?24:15,col=ARENA.gTop,dk=ARENA.gBot,ln=ARENA.gLine;
  c.save();
  if(p.mv){glow(c,p.x+p.w/2,p.y+th/2,p.w*.7,ln,.28)}
  c.fillStyle='rgba(0,0,0,.28)';c.fillRect(p.x+6,p.y+th,p.w-12,6);
  c.beginPath();rr0(c,p.x,p.y,p.w,th,p.t==='f'?4:7);c.fillStyle=grad(c,0,p.y,0,p.y+th,[col,dk]);c.fill();c.lineWidth=2;c.strokeStyle='rgba(0,0,0,.45)';c.stroke();
  c.fillStyle=ln;c.fillRect(p.x+3,p.y,p.w-6,4);
  if(p.t==='f'){c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=1.5;for(let x=p.x+22;x<p.x+p.w-6;x+=34){c.beginPath();c.moveTo(x,p.y+5);c.lineTo(x,p.y+th);c.stroke()}}
  else{c.fillStyle='rgba(255,255,255,.55)';for(let x=p.x+12;x<p.x+p.w-8;x+=22)c.fillRect(x,p.y+th-4,9,2.5)} // dashed underside = thin ledge, drop through
  if(p.mv){c.fillStyle=ln;ell(c,p.x+10,p.y+th+5,4,4,ln);ell(c,p.x+p.w-10,p.y+th+5,4,4,ln)}
  c.restore()}
function drawArenaWorld(c,t){
  const ww=ARENA.ww||W,bot=1500;
  c.beginPath();c.moveTo(-200,bot);c.lineTo(-200,groundY(0));for(let x=0;x<=ww;x+=10)c.lineTo(x,groundY(x));c.lineTo(ww,groundY(ww));c.lineTo(ww+200,groundY(ww));c.lineTo(ww+200,bot);c.closePath();
  c.fillStyle=grad(c,0,GROUND-60,0,GROUND+300,[ARENA.gTop,ARENA.gBot]);c.fill();
  c.beginPath();for(let x=-200;x<=ww+200;x+=10){const y=groundY(Math.max(0,Math.min(ww,x)));x===-200?c.moveTo(x,y):c.lineTo(x,y)}c.strokeStyle=ARENA.gLine;c.lineWidth=4;c.stroke();
  c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.25;c.lineWidth=10;c.stroke();c.restore();
  for(let k=0;k*W<ww;k++){c.save();c.translate(k*W,0);ARENA.fore(c,t);c.restore()}
  if(ARENA.plats)for(const p of ARENA.plats)drawPlat(c,p,t);
  // arena edge barriers
  c.save();c.globalCompositeOperation='lighter';for(const x of[0,ww]){const g=c.createLinearGradient(x-60,0,x+60,0);g.addColorStop(x?1:0,'rgba(255,255,255,0)');g.addColorStop(x?0:1,'rgba(255,255,255,.18)');c.fillStyle=x?grad(c,x-70,0,x,0,['rgba(255,255,255,0)','rgba(255,255,255,.2)']):grad(c,0,0,70,0,['rgba(255,255,255,.2)','rgba(255,255,255,0)']);c.fillRect(x?x-70:0,-400,70,1900)}c.restore();
}
ARENA=ARENAS[0];


/* ---------------- Weapons (procedural art) ---------------- */
function weaponAng(f,W){
  const a=f.atk,idle=W.idle||0;let sty=W.style,t=0,hs=0,he=0,dur=1,on=false;
  if(a&&a.type==='punch'&&a.style===W.style){on=true;t=a.t;hs=a.hs;he=a.he+.05;dur=a.dur}
  else if(a&&a.type==='special'&&a.def&&a.def.wskill){on=true;t=a.t;hs=.12;he=.34;dur=a.dur;if(a.kind==='spin')return a.t*26;if(a.kind==='dash'||a.kind==='flurry')sty='thrust'}
  if(!on)return idle+Math.sin(f.t*3.2)*.04;
  let w=-2.5,e=.9;
  if(sty==='chop'){w=-2.9;e=1.3}else if(sty==='throw'){w=-2.2;e=.5}
  else if(sty==='thrust'||sty==='shoot')return sty==='shoot'?0:lerp(idle,0,Math.min(1,t/Math.max(.01,hs)));
  if(t<hs)return lerp(idle,w,t/Math.max(.01,hs));
  if(t<he)return lerp(w,e,clamp((t-hs)/Math.max(.01,he-hs),0,1));
  return lerp(e,idle,clamp((t-he)/Math.max(.01,dur-he),0,1))
}
function weaponHeld(c,f,hx,hy){
  const W=f.wp,ang=weaponAng(f,W),a=f.atk;
  c.save();c.translate(hx,hy);
  // swoosh
  if(a&&(a.style===W.style||a.type==='special'&&a.def&&a.def.wskill)&&(W.style==='slash'||W.style==='chop'||a.kind==='spin')){
    const he=(a.he||.34)+.05,hs=a.hs||.12;
    if(a.t>=hs&&a.t<he+.12||a.kind==='spin'){const L=W.len*.95;c.save();c.globalCompositeOperation='lighter';c.lineCap='round';
      for(let i=0;i<3;i++){c.strokeStyle=i===0?'rgba(255,255,255,.7)':f.sp.glow;c.globalAlpha=.5-i*.14;c.lineWidth=14-i*4;c.beginPath();c.arc(0,0,L-i*3,ang-1.1-i*.15,ang,false);c.stroke()}c.restore()}}
  const pull=a&&a.style==='shoot'?(a.t<a.hs?lerp(6,-16,a.t/a.hs):a.t<a.hs+.12?4:6):6;
  drawWeapon(c,W,ang,f.sp.glow,pull,!(a&&a.style==='shoot'&&a.t>a.hs&&a.t<a.dur*.7));
  c.restore()
}
function drawWeapon(c,W,ang,gc,pull,nock){
  c.save();c.rotate(ang);c.lineJoin='round';c.lineCap='round';
  const steel=()=>grad(c,0,-8,0,8,['#ffffff','#9fb0cc']),wood='#8a5a2a';
  switch(W.id){
  case'sword':
    c.fillStyle='#6a3a1a';c.fillRect(-10,-3,14,6);ell(c,-11,0,4,4,'#ffd24a');
    poly(c,[3,-3,9,-3,9,-12,6,-12],'#ffd24a','#8a6a10',1.5);poly(c,[3,3,9,3,9,12,6,12],'#ffd24a','#8a6a10',1.5);c.fillStyle='#ffd24a';c.fillRect(3,-3,6,6);
    poly(c,[9,-5.5,58,-4,70,0,58,4,9,5.5],steel(),'#4a5a78',2);c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1.8;c.beginPath();c.moveTo(14,0);c.lineTo(58,0);c.stroke();glow(c,42,0,34,gc,.35);break;
  case'axe':
    c.fillStyle=wood;c.fillRect(-12,-3,72,6);c.fillStyle='#5a3a18';for(const x of[2,14])c.fillRect(x,-3.5,3,7);
    poly(c,[40,-3,34,-24,48,-37,66,-30,62,-8,52,0],steel(),'#4a5a78',2);poly(c,[40,3,34,13,46,7],'#cfd8e8','#4a5a78',1.5);
    c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=2;c.beginPath();c.moveTo(50,-33);c.quadraticCurveTo(66,-26,62,-9);c.stroke();glow(c,52,-18,30,gc,.3);break;
  case'spear':
    c.fillStyle='#a0703a';c.fillRect(-18,-2.5,100,5);c.fillStyle='#c0392b';c.fillRect(70,-3,6,6);
    poly(c,[80,-8,104,0,80,8,86,0],steel(),'#4a5a78',2);c.strokeStyle='#ff5a4a';c.lineWidth=3;c.beginPath();c.moveTo(74,0);c.quadraticCurveTo(66,10,56,8);c.moveTo(74,0);c.quadraticCurveTo(64,-8,54,-9);c.stroke();glow(c,94,0,22,gc,.35);break;
  case'staff':
    c.fillStyle='#7a4a2a';c.fillRect(-22,-3,86,6);c.fillStyle='#ffd24a';c.fillRect(8,-3.5,3,7);c.fillRect(44,-3.5,3,7);
    c.strokeStyle='#ffd24a';c.lineWidth=3.5;c.beginPath();c.arc(66,0,12,2.2,-2.2+Math.PI*2,false);c.stroke();
    glow(c,66,0,34,gc,.9);ell(c,66,0,8,8,rgrad(c,64,-2,1,9,['#fff',gc]));ell(c,66,0,8,8,null,0,'#ffffffaa');break;
  case'hammer':
    c.fillStyle=wood;c.fillRect(-12,-3.5,58,7);
    c.beginPath();rr0(c,40,-18,28,36,5);c.fillStyle=grad(c,40,-18,68,18,['#d8dce8','#6a7288']);c.fill();c.strokeStyle='#3a4258';c.lineWidth=2;c.stroke();
    c.fillStyle='#ffd24a';c.fillRect(40,-18,5,36);c.fillRect(63,-18,5,36);ell(c,54,0,4,4,gc);glow(c,54,0,26,gc,.25);break;
  case'bow':{
    c.translate(-24,0);c.strokeStyle='#8a4a1a';c.lineWidth=6;c.beginPath();c.arc(-16,0,42,-1.05,1.05);c.stroke();
    c.strokeStyle='#ffd24a';c.lineWidth=2;c.beginPath();c.arc(-16,0,42,-1.05,1.05);c.stroke();
    const ex=-16+42*Math.cos(1.05),ey=42*Math.sin(1.05),px=pull;
    c.strokeStyle='#fff';c.lineWidth=1.8;c.beginPath();c.moveTo(ex,-ey);c.lineTo(px,0);c.lineTo(ex,ey);c.stroke();
    if(nock){c.strokeStyle='#d8b878';c.lineWidth=2.6;c.beginPath();c.moveTo(px,0);c.lineTo(px+42,0);c.stroke();poly(c,[px+52,0,px+40,-5,px+40,5],'#cfd8e8');poly(c,[px-2,0,px+5,-4,px+5,4],'#ff7a7a')}
    glow(c,24,0,24,gc,.2);break}
  case'boomerang':
    c.translate(-14,0);c.strokeStyle='#5a2a08';c.lineWidth=13;c.beginPath();c.moveTo(6,-34);c.quadraticCurveTo(22,-4,40,24);c.stroke();
    c.strokeStyle='#e8a03a';c.lineWidth=9;c.beginPath();c.moveTo(6,-34);c.quadraticCurveTo(22,-4,40,24);c.stroke();
    c.strokeStyle=gc;c.lineWidth=3;c.setLineDash([5,7]);c.beginPath();c.moveTo(8,-31);c.quadraticCurveTo(22,-4,38,21);c.stroke();c.setLineDash([]);break;
  case'dagger':
    c.fillStyle='#4a2a1a';c.fillRect(-9,-2.5,12,5);ell(c,-10,0,3.5,3.5,'#ffd24a');poly(c,[2,-6,6,-6,6,6,2,6],'#ffd24a','#8a6a10',1.2);poly(c,[6,-3.4,38,0,6,3.4],steel(),'#4a5a78',1.6);glow(c,26,0,20,gc,.3);break;
  case'katana':
    c.fillStyle='#2a2a3a';c.fillRect(-16,-2.8,20,5.6);c.strokeStyle='#c8cce0';c.lineWidth=1;for(let x=-14;x<3;x+=4){c.beginPath();c.moveTo(x,-2.8);c.lineTo(x+3,2.8);c.stroke()}
    ell(c,5,0,3,7,'#ffd24a',0,'#8a6a10');poly(c,[7,-3,60,-4.2,84,-6,88,-4,66,2.5,7,3],steel(),'#4a5a78',1.6);c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=1.4;c.beginPath();c.moveTo(12,0);c.lineTo(80,-3);c.stroke();glow(c,52,-2,34,gc,.28);break;
  case'greatsword':
    c.fillStyle='#5a2a1a';c.fillRect(-18,-3.5,26,7);ell(c,-19,0,5,5,'#ffd24a');poly(c,[6,-5,14,-5,16,-20,10,-20],'#ffd24a','#8a6a10',1.5);poly(c,[6,5,14,5,16,20,10,20],'#ffd24a','#8a6a10',1.5);c.fillStyle='#ffd24a';c.fillRect(6,-5,8,10);
    poly(c,[14,-10,102,-7,122,0,102,7,14,10],steel(),'#4a5a78',2.4);c.strokeStyle='rgba(120,140,180,.8)';c.lineWidth=2;c.beginPath();c.moveTo(22,0);c.lineTo(104,0);c.stroke();glow(c,70,0,50,gc,.35);break;
  case'mace':
    c.fillStyle=wood;c.fillRect(-12,-3.5,70,7);c.fillStyle='#ffd24a';c.fillRect(-2,-4,3,8);
    for(let i=0;i<8;i++){const a=i*TAU/8;poly(c,[66+Math.cos(a-.25)*13,Math.sin(a-.25)*13,66+Math.cos(a)*23,Math.sin(a)*23,66+Math.cos(a+.25)*13,Math.sin(a+.25)*13],'#c8ccd8','#4a5a78',1.4)}
    ell(c,66,0,14,14,grad(c,52,-14,80,14,['#d8dce8','#5a6278']),0,'#3a4258');glow(c,66,0,30,gc,.3);break;
  case'trident':
    c.fillStyle='#6a8aa8';c.fillRect(-18,-2.5,96,5);c.strokeStyle='#8ae0ff';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(76,0);c.lineTo(76,0);c.moveTo(76,-13);c.quadraticCurveTo(80,-13,84,0);c.moveTo(76,13);c.quadraticCurveTo(80,13,84,0);c.stroke();
    poly(c,[78,-3,102,0,78,3],steel(),'#4a5a78',1.6);poly(c,[74,-15,92,-13,76,-8],steel(),'#4a5a78',1.4);poly(c,[74,15,92,13,76,8],steel(),'#4a5a78',1.4);glow(c,92,0,24,'#6ad8ff',.4);break;
  case'whip':
    c.fillStyle='#5a2a1a';c.fillRect(-10,-3.5,24,7);c.fillStyle='#ffd24a';c.fillRect(4,-4,3,8);
    c.strokeStyle='#3a2210';c.lineWidth=5;c.beginPath();c.moveTo(14,0);c.bezierCurveTo(40,-30,70,30,100,-8);c.stroke();c.strokeStyle='#b8782a';c.lineWidth=2.4;c.setLineDash([6,4]);c.stroke();c.setLineDash([]);ell(c,100,-8,4.5,4.5,gc,0,'#fff');glow(c,100,-8,16,gc,.5);break;
  case'scythe':
    c.fillStyle='#5a3a1a';c.fillRect(-16,-2.8,104,5.6);c.save();c.translate(86,-1);
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(20,-6,36,-6,44,20);c.bezierCurveTo(30,4,14,6,0,6);c.closePath();c.fillStyle=grad(c,0,-6,44,20,['#f0f4ff','#7a88a8']);c.fill();c.strokeStyle='#3a4258';c.lineWidth=2;c.stroke();c.restore();glow(c,108,10,30,gc,.35);break;
  case'twinblades':
    for(const o of[-5,5]){c.save();c.translate(0,o);c.fillStyle='#3a2a1a';c.fillRect(-10,-2,12,4);poly(c,[2,-5,5,-5,5,5,2,5],'#ffd24a','#8a6a10',1);poly(c,[5,-3,44,-1,54,0,44,2,5,3],steel(),'#4a5a78',1.5);c.restore()}
    glow(c,34,0,30,gc,.35);break;
  case'flail':
    c.fillStyle=wood;c.fillRect(-12,-3.5,46,7);c.fillStyle='#ffd24a';c.fillRect(8,-4,3,8);
    c.strokeStyle='#9aa4b8';c.lineWidth=3;for(let i=0;i<6;i++){const x=36+i*7,y=Math.sin(i*.9)*7;ell(c,x,y,4,2.6,null,i*.3,'#9aa4b8')}
    for(let i=0;i<8;i++){const a=i*TAU/8;poly(c,[80+Math.cos(a-.3)*11,6+Math.sin(a-.3)*11,80+Math.cos(a)*20,6+Math.sin(a)*20,80+Math.cos(a+.3)*11,6+Math.sin(a+.3)*11],'#c8ccd8','#4a5a78',1.2)}
    ell(c,80,6,12,12,grad(c,68,-6,92,18,['#d8dce8','#5a6278']),0,'#3a4258');break;
  case'crossbow':
    c.fillStyle='#6a3a1a';c.fillRect(-12,-3.5,48,7);c.strokeStyle='#8a4a1a';c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(30,-26);c.quadraticCurveTo(44,0,30,26);c.stroke();
    c.strokeStyle='#fff';c.lineWidth=1.6;c.beginPath();c.moveTo(30,-26);c.lineTo(pull>0?20:12,0);c.lineTo(30,26);c.stroke();
    if(nock){c.fillStyle='#d8b878';c.fillRect(8,-1.5,38,3);poly(c,[56,0,44,-4,44,4],'#cfd8e8')}glow(c,40,0,20,gc,.2);break;
  case'javelin':
    c.fillStyle='#b88a4a';c.fillRect(-26,-2,112,4);c.fillStyle='#e04a3a';c.fillRect(54,-2.6,5,5.2);poly(c,[84,-6,112,0,84,6,90,0],steel(),'#4a5a78',1.6);glow(c,100,0,20,gc,.35);break;
  case'tome':
    c.save();c.translate(10,0);c.beginPath();rr0(c,-4,-17,32,34,4);c.fillStyle=grad(c,-4,-17,28,17,['#6a3ab8','#2a1260']);c.fill();c.strokeStyle='#ffd24a';c.lineWidth=2.5;c.stroke();
    c.fillStyle='#f4ecd0';c.fillRect(0,-13,3,26);ell(c,16,0,7,7,rgrad(c,14,-2,1,8,['#fff',gc]),0,'#ffd24a');c.restore();glow(c,26,0,34,gc,.55);break;
  case'shuriken':
    c.save();c.translate(10,0);c.rotate((performance.now()/180)%TAU);poly(c,[0,-17,4,-4,17,0,4,4,0,17,-4,4,-17,0,-4,-4],steel(),'#4a5a78',1.6);ell(c,0,0,3.2,3.2,'#2a3250');c.restore();glow(c,10,0,24,gc,.3);break;
  case'firewand':
    c.fillStyle='#6a3a1a';c.fillRect(-14,-2.8,64,5.6);c.fillStyle='#ffd24a';c.fillRect(4,-3.4,3,6.8);c.fillRect(30,-3.4,3,6.8);
    glow(c,58,0,36,'#ff7a2a',.85);poly(c,[50,0,62,-10,74,0,62,10],'#ff9a2a','#ffe27a',1.4);ell(c,62,0,5,5,'#fff6c0');break;
  case'claws':
    for(let i=-1;i<=1;i++){c.save();c.translate(2,i*7);poly(c,[0,-3,22,-3,38,i*3+2,22,3,0,3],steel(),'#4a5a78',1.5);c.restore()}
    glow(c,28,0,26,gc,.4);break;
  case'shield':
    ell(c,12,0,23,23,grad(c,-10,-23,34,23,['#e8ecf6','#6a7898']),0,'#2a3250');c.strokeStyle='#ffd24a';c.lineWidth=4;c.beginPath();c.arc(12,0,19,0,TAU);c.stroke();
    ell(c,12,0,8,8,rgrad(c,10,-2,1,9,['#fff',gc]),0,'#2a3250');c.strokeStyle=gc;c.lineWidth=2.5;for(let i=0;i<6;i++){const a=i*TAU/6;c.beginPath();c.moveTo(12+Math.cos(a)*10,Math.sin(a)*10);c.lineTo(12+Math.cos(a)*17,Math.sin(a)*17);c.stroke()}break;
  }
  c.restore()
}
function rr0(c,x,y,w,h,r){c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function drawWeaponIcon(c,W,x,y,s,gc,t){
  c.save();c.translate(x,y);c.scale(s,s);
  if(W.id==='fists'){ell(c,0,2,17,15,grad(c,0,-14,0,14,['#ffe0b0','#d08a50']),0,'#7a4a20');for(let i=-1;i<=1;i++)ell(c,i*8,-12,5,6,'#f0b078',0,'#7a4a20');ell(c,-17,4,7,6,'#f0b078',0,'#7a4a20')}
  else{const L=({spear:100,bow:70,shield:36,claws:44,boomerang:40,javelin:110,scythe:96,katana:92,greatsword:112,whip:100,trident:96,crossbow:60,dagger:44,twinblades:56,tome:36,shuriken:30,firewand:70,mace:70,flail:90})[W.id]||80;c.translate(-L*.32,L*.2);drawWeapon(c,W,-.75+Math.sin((t||0)*2)*.05,gc,6,true)}
  c.restore()
}

/* ---------------- Extra arenas ---------------- */
ARENAS.push(
 {id:'desert',name:'Sunset Sands',sub:'Desert Ruins',ramps:[{a:380,b:460,c:520,d:600,h:40}],gTop:'#c88a4a',gBot:'#5a3418',gLine:'#ffd28a',music:'battle',
  deco:mk(31,50,r=>({x:r()*W,y:r()*260,s:r()*1.6+.5,ph:r()*6})),
  draw(c,t,px){
    c.fillStyle=grad(c,0,0,0,GROUND,['#26164a','#a8445a','#ffb060']);c.fillRect(0,0,W,H);
    c.save();c.globalCompositeOperation='lighter';for(const d of this.deco){c.fillStyle=`rgba(255,240,210,${.25+.35*Math.sin(t*2+d.ph)})`;c.beginPath();c.arc(d.x,d.y*(1-d.y/900),d.s,0,TAU);c.fill()}c.restore();
    glow(c,640-px*.04,250,230,'#ffd080',.7);ell(c,640-px*.04,250,62,62,rgrad(c,640-px*.04,250,5,62,['#fff6c8','#ffb050']));
    c.fillStyle='#7a3040';poly(c,[0,GROUND,0,330,120-px*.05,300,260-px*.05,350,420-px*.05,310,560-px*.05,360,760-px*.05,300,960,340,960,GROUND]);
    const pyr=(x,b,h,w)=>{c.fillStyle=grad(c,x-w,0,x+w,0,['#d89a58','#8a4a30']);poly(c,[x-w,b,x,b-h,x+w,b]);c.fillStyle='rgba(60,20,30,.45)';poly(c,[x,b-h,x+w,b,x+w*.1,b])};
    pyr(250-px*.12,GROUND+6,170,150);pyr(430-px*.14,GROUND+6,110,100);pyr(790-px*.1,GROUND+6,140,120);
    c.fillStyle='#b8703a';poly(c,[0,GROUND,0,380,150-px*.2,350,330-px*.2,390,520-px*.2,365,700-px*.2,395,960,360,960,GROUND]);
  },
  fore(c,t){const r=mkRng(77);c.save();c.globalAlpha=.5;c.fillStyle='#ffe0a8';for(let i=0;i<26;i++){const x=((r()*W+t*(60+r()*80))%W),y=GROUND+10+r()*120;c.fillRect(x,y,10+r()*14,1.5)}c.restore();
    c.fillStyle='#4a2a14';for(let i=0;i<3;i++){const x=60+i*380,y=GROUND+70+i*14;c.beginPath();c.ellipse(x,y,22,6,0,0,TAU);c.fill();c.fillRect(x-3,y-34,6,34);ell(c,x,y-38,10,5,'#2a6a3a')}}},
 {id:'castle',name:'Shadow Citadel',sub:'Haunted Castle',ramps:[{a:150,b:230,c:300,d:380,h:45},{a:580,b:660,c:730,d:810,h:45}],gTop:'#3a2a5a',gBot:'#120a24',gLine:'#b06aff',music:'boss',
  deco:mk(41,40,r=>({x:r()*W,y:r()*H,s:r()*2+1,sp:20+r()*40,ph:r()*6})),
  draw(c,t,px){
    c.fillStyle=grad(c,0,0,0,GROUND,['#05020f','#1c0b3a','#4a1a6a']);c.fillRect(0,0,W,H);
    const fl=Math.max(0,Math.sin(t*1.3)*Math.sin(t*7.1))>.82?.35:0;if(fl){c.fillStyle=`rgba(190,150,255,${fl})`;c.fillRect(0,0,W,H)}
    glow(c,760-px*.03,110,150,'#c8b0ff',.5);ell(c,760-px*.03,110,34,34,rgrad(c,752,102,3,34,['#fff','#b8a0e8']));
    const cx=400-px*.12;c.fillStyle='#120826';
    poly(c,[cx-300,GROUND+10,cx-300,250,cx-270,250,cx-270,200,cx-240,200,cx-240,250,cx-130,250,cx-130,130,cx-110,100,cx-90,130,cx-90,250,cx+60,250,cx+60,170,cx+90,120,cx+120,170,cx+120,250,cx+230,250,cx+230,200,cx+260,200,cx+260,250,cx+300,250,cx+300,GROUND+10]);
    c.fillStyle='#ffcf5a';for(const [x,y] of [[-110,160],[90,190],[-200,300],[-30,320],[170,310],[-260,230]]){c.globalAlpha=.6+.4*Math.sin(t*3+x);c.fillRect(cx+x-4,y-8,8,14)}c.globalAlpha=1;
    c.fillStyle='#0a0418';poly(c,[0,GROUND+10,0,340,100-px*.25,300,220-px*.25,350,360-px*.25,320,520-px*.25,360,700-px*.25,310,860-px*.25,350,960,320,960,GROUND+10]);
    c.save();c.globalCompositeOperation='lighter';for(const d of this.deco){const y=((d.y-t*d.sp)%H+H)%H,x=d.x+Math.sin(t+d.ph)*18-px*.1;c.fillStyle=`rgba(176,106,255,${.4+.4*Math.sin(t*3+d.ph)})`;c.beginPath();c.arc((x+W)%W,y,d.s,0,TAU);c.fill()}c.restore();
  },
  fore(c,t){c.save();c.globalCompositeOperation='lighter';for(let i=0;i<5;i++){const x=((i*260+t*14)%1100)-100,y=GROUND+30+i*18;c.fillStyle=rgrad(c,x,y,0,140,['rgba(150,90,230,.22)','rgba(0,0,0,0)']);c.fillRect(x-140,y-60,280,120)}c.restore()}}
);
