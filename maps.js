'use strict';
/* Mythic Fighters - big battle maps: world size, ramps, jump-through platforms, moving platforms, spawns.
   Ground is y=410. Tiers are 100px apart (jump apex is ~135px): 310, 210, 110, 10.
   Platform types: 'o' = thin ledge you can drop through (hold BLOCK/Down + JUMP), 'f' = firm ledge (jump up through it, cannot drop). */
const PL=(x,y,w,t)=>({x,y,w,t:t||'o'});
const MVP=(x0,y0,w,ax,ay,sp,ph,t)=>({x:x0,y:y0,w,t:t||'o',mv:{x0,y0,ax,ay,sp,ph:ph||0}});
const MAPS=[
 /* 0 Ember Peak (volcano) - two hills, lava lifts */
 {ww:2000,wtop:-230,ramps:[{a:260,b:380,c:450,d:560,h:60},{a:1440,b:1550,c:1620,d:1740,h:60}],
  plats:[PL(120,310,180),PL(660,310,200),PL(1140,310,200),PL(1700,310,180),PL(780,210,200),PL(1020,210,200),PL(900,110,200),MVP(420,260,110,0,50,1.1,0),MVP(1470,260,110,0,50,1.1,3)],spawns:[300,700,900,1100,1300,1700]},
 /* 1 Whisperwood (forest) - central hill, tree branches, swaying vines */
 {ww:2200,wtop:-230,ramps:[{a:950,b:1050,c:1150,d:1250,h:48}],
  plats:[PL(220,310,240),PL(560,230,200),PL(300,130,180),PL(1740,310,240),PL(1440,230,200),PL(1720,130,180),PL(1000,200,200),PL(1000,100,200),MVP(780,310,120,90,0,1,0),MVP(1300,310,120,90,0,1,2)],spawns:[250,600,950,1250,1600,1950]},
 /* 2 Cloud Temple (sky) - tall, four tiers, drifting cloud */
 {ww:2400,wtop:-330,ramps:[{a:1000,b:1060,c:1340,d:1400,h:40}],
  plats:[PL(200,310,220,'f'),PL(700,310,200),PL(1500,310,200),PL(1980,310,220,'f'),PL(450,210,200),PL(1000,210,400,'f'),PL(1750,210,200),PL(250,110,180),PL(780,110,200),PL(1420,110,200),PL(1970,110,180),PL(1020,10,360),MVP(1200,360,140,520,0,.5,0)],spawns:[300,700,1100,1300,1700,2100]},
 /* 3 Glimmerfrost (ice) - ice shelves, long ramp */
 {ww:1900,wtop:-230,ramps:[{a:100,b:240,c:340,d:470,h:55},{a:1400,b:1500,c:1560,d:1660,h:35}],
  plats:[PL(520,310,180,'f'),PL(900,260,200),PL(1220,310,180),PL(300,200,200),PL(620,210,200),PL(1100,210,200),PL(850,110,200),PL(1500,200,200),MVP(960,350,120,250,0,.7,1)],spawns:[250,620,950,1250,1600,1750]},
 /* 4 Sunken Citadel (ocean) - ruins with vertical water lifts */
 {ww:2100,wtop:-230,ramps:[{a:300,b:390,c:470,d:560,h:50},{a:1540,b:1630,c:1710,d:1800,h:60}],
  plats:[PL(150,310,200),PL(650,310,180),PL(1270,310,180),PL(1750,310,200),PL(450,210,200),PL(1450,210,200),PL(950,200,200),PL(700,110,200),PL(1200,110,200),MVP(1000,300,110,0,60,1,0),MVP(300,200,100,0,60,1.2,2)],spawns:[250,700,1000,1100,1400,1850]},
 /* 5 Sunset Sands (desert) - dunes, crumbled ruins */
 {ww:2300,wtop:-230,ramps:[{a:450,b:600,c:700,d:850,h:50},{a:1450,b:1600,c:1700,d:1850,h:50}],
  plats:[PL(250,310,200),PL(1000,310,300,'f'),PL(1850,310,200),PL(700,210,200),PL(1400,210,200),PL(1050,210,200),PL(300,210,160),PL(1850,210,160),PL(1060,110,180),MVP(520,330,110,160,0,.8,0)],spawns:[300,700,1000,1300,1700,2000]},
 /* 6 Shadow Citadel (castle) - tall towers, drawbridge + elevator */
 {ww:2000,wtop:-330,ramps:[{a:80,b:160,c:240,d:330,h:45},{a:1670,b:1760,c:1840,d:1920,h:45}],
  plats:[PL(450,310,180,'f'),PL(1370,310,180,'f'),PL(300,210,160),PL(1540,210,160),PL(650,210,200),PL(1150,210,200),PL(900,110,200),PL(400,110,160),PL(1440,110,160),PL(900,10,200),MVP(1000,300,180,160,0,.8,0),MVP(700,260,100,0,80,1.2,0)],spawns:[300,650,900,1100,1400,1750]}
];
function applyMaps(){
  ARENAS.forEach((A,i)=>{const M=MAPS[i];if(!M)return;A.ww=M.ww;A.wtop=M.wtop;A.ramps=M.ramps;A.spawns=M.spawns;A.platDef=M.plats})}
function resetPlats(A){A.plats=(A.platDef||[]).map(p=>Object.assign({},p,{dx:0,dy:0,rx:p.x,ry:p.y,mv:p.mv?Object.assign({},p.mv):null}))}
function updatePlats(A,t){if(!A.plats)return;for(const p of A.plats){if(!p.mv)continue;const m=p.mv,nx=m.x0+m.ax*Math.sin(t*m.sp+m.ph),ny=m.y0+m.ay*Math.sin(t*m.sp+m.ph);p.dx=nx-p.x;p.dy=ny-p.y;p.x=nx;p.y=ny}}
applyMaps();
