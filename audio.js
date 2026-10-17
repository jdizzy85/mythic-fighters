'use strict';
// Synthesized WebAudio sound effects + procedural music. No external assets.
const SND=(()=>{
  let ctx=null,master,musicG,sfxG,muted=false,timer=null,track=null,step=0,nextT=0,noiseBuf=null;
  const TR={
    menu:{bpm:92,root:50,lead:'triangle',bass:'sine',drums:0},
    battle:{bpm:138,root:45,lead:'square',bass:'sawtooth',drums:1},
    boss:{bpm:152,root:40,lead:'sawtooth',bass:'sawtooth',drums:2},
    win:{bpm:110,root:55,lead:'triangle',bass:'sine',drums:0}
  };
  const PENT=[0,3,5,7,10,12,15,17,19];
  const PROG=[0,-4,-2,-5];
  function rng(s){return()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296}}
  for(const k in TR){const r=rng(k.length*977+TR[k].bpm);const m=[];for(let i=0;i<32;i++)m.push(r()<.35?-1:PENT[Math.floor(r()*PENT.length)]);TR[k].mel=m}
  function init(){
    if(ctx)return;
    try{ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}
    master=ctx.createGain();master.gain.value=muted?0:.85;master.connect(ctx.destination);
    musicG=ctx.createGain();musicG.gain.value=.2;musicG.connect(master);
    sfxG=ctx.createGain();sfxG.gain.value=.65;sfxG.connect(master);
    noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
    const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }
  function resume(){init();if(ctx&&ctx.state!=='running')ctx.resume()}
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  function tone(f,d,type,v,slide,when,dest){
    if(!ctx)return;const t=ctx.currentTime+(when||0);
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+d);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(dest||sfxG);o.start(t);o.stop(t+d+.05);
  }
  function noise(d,v,fc,when,dest,type,fc2){
    if(!ctx)return;const t=ctx.currentTime+(when||0);
    const s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;
    const f=ctx.createBiquadFilter();f.type=type||'lowpass';f.frequency.setValueAtTime(fc,t);
    if(fc2)f.frequency.exponentialRampToValueAtTime(fc2,t+d);
    const g=ctx.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    s.connect(f);f.connect(g);g.connect(dest||sfxG);s.start(t);s.stop(t+d+.05);
  }
  const FX={
    click(){tone(660,.08,'square',.15,990)},
    back(){tone(500,.1,'square',.15,300)},
    punch(){noise(.09,.5,1800,0,0,'lowpass',300);tone(160,.1,'sine',.5,60)},
    kick(){noise(.14,.6,1400,0,0,'lowpass',200);tone(120,.16,'sine',.6,45)},
    swing(){noise(.12,.18,2500,0,0,'bandpass',900)},
    hit(){noise(.12,.6,3000,0,0,'lowpass',400);tone(200,.14,'sawtooth',.3,70);tone(90,.2,'sine',.6,40)},
    heavy(){noise(.3,.8,2500,0,0,'lowpass',150);tone(70,.35,'sine',.9,30);tone(300,.2,'sawtooth',.3,60)},
    block(){tone(1200,.1,'square',.2,800);tone(1800,.07,'triangle',.2);noise(.06,.3,5000,0,0,'highpass')},
    jump(){tone(260,.18,'square',.12,620)},
    land(){noise(.06,.2,500,0,0,'lowpass',150)},
    dodge(){noise(.2,.3,3500,0,0,'bandpass',700)},
    special(){tone(220,.5,'sawtooth',.25,1200);tone(330,.5,'square',.12,1500);noise(.5,.25,600,0,0,'bandpass',4000)},
    fire(){noise(.45,.5,3000,0,0,'bandpass',500);tone(180,.4,'sawtooth',.25,60)},
    shock(){tone(90,.5,'sine',.9,30);noise(.5,.7,800,0,0,'lowpass',80)},
    ko(){tone(440,.9,'sawtooth',.35,60);noise(.7,.7,2000,0,0,'lowpass',100);tone(80,.9,'sine',.8,30)},
    ready(){tone(880,.1,'square',.15);tone(1320,.15,'square',.15,0,.09)},
    combo(){tone(700,.08,'triangle',.2,1400)},
    heal(){[523,659,784,1046].forEach((f,i)=>tone(f,.2,'triangle',.18,0,i*.07))},
    fight(){tone(150,.4,'sawtooth',.4,400);noise(.3,.3,1000,0,0,'lowpass',3000)},
    win(){[523,659,784,1046,1318].forEach((f,i)=>tone(f,.3,'square',.17,0,i*.11))},
    lose(){[392,349,311,262].forEach((f,i)=>tone(f,.4,'sawtooth',.2,0,i*.2))},
    unlock(){[784,988,1175,1568,1976].forEach((f,i)=>tone(f,.25,'triangle',.22,0,i*.09))}
  };
  function sched(){
    if(!ctx||!track)return;
    const T=TR[track],spb=60/T.bpm/4;
    while(nextT<ctx.currentTime+.25){
      const t=nextT-ctx.currentTime,s=step%32,bar=Math.floor(step/16)%4,root=T.root+PROG[bar];
      if(s%2===0){const d=[0,0,7,0,5,0,7,3][(s/2)%8];tone(mtof(root+d-12),spb*1.8,T.bass,.5,0,t,musicG)}
      const n=T.mel[s];if(n>=0&&(T.drums||s%4===0))tone(mtof(root+12+n),spb*(T.drums?1.5:3),T.lead,.22,0,t,musicG);
      if(T.drums){
        if(s%8===0||(T.drums===2&&s%8===6))tone(120,.15,'sine',.9,40,t,musicG);
        if(s%8===4)noise(.12,.5,2500,t,musicG,'bandpass');
        if(s%2===1)noise(.03,.15,9000,t,musicG,'highpass');
      }else if(s%8===0)tone(100,.2,'sine',.5,50,t,musicG);
      step++;nextT+=spb;
    }
  }
  return{
    resume,init,
    play(n){if(!ctx||muted)return;try{FX[n]&&FX[n]()}catch(e){}},
    music(n){
      if(n===track)return;track=n;step=0;
      if(!ctx)return;nextT=ctx.currentTime+.05;
      if(!timer)timer=setInterval(sched,40);
    },
    startPending(){if(ctx&&track&&!timer){nextT=ctx.currentTime+.05;timer=setInterval(sched,40)}},
    get muted(){return muted},
    setMuted(m){muted=m;if(master)master.gain.value=m?0:.85}
  };
})();
