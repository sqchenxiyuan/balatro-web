import {createMusicVoice,MUSIC_STEP_SECONDS} from './game-music';

export interface AudioOptions {sound?:boolean;music?:boolean;musicVolume?:number}

/** One lazy mixer per visible instance. The headless engine never imports audio. */
export function createGameAudio(initial:AudioOptions={}){
 let sound=initial.sound??false,music=initial.music??false,volume=initial.musicVolume??.35;
 let context:AudioContext|undefined,musicGain:GainNode|undefined,effects:GainNode|undefined;
 let voice:ReturnType<typeof createMusicVoice>|undefined,timer:ReturnType<typeof setInterval>|undefined;
 let activated=false,disposed=false,pageHidden=false,nextAt=0,step=0;
 const lifecycle=new AbortController();
 const visible=()=>!document.hidden&&!pageHidden;
 function stopTimer(){if(timer!==undefined){clearInterval(timer);timer=undefined;}}
 function schedule(){
  if(disposed||!context||context.state!=='running'||!music||volume===0||!visible()){stopTimer();return;}
  const now=context.currentTime;
  if(nextAt<now)nextAt=now+.035;
  while(nextAt<now+.25){voice!.schedule(step++,nextAt);nextAt+=MUSIC_STEP_SECONDS;}
 }
 function begin(){
  if(disposed||!context||context.state!=='running'||!visible())return;
  if(music&&volume>0&&timer===undefined){schedule();timer=setInterval(schedule,80);}
 }
 function sync(){
  if(disposed)return;
  if(!context){
   if(!(sound||music&&volume>0)||!visible()||!(activated||navigator.userActivation?.hasBeenActive))return;
   try{
    context=new AudioContext();
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=4;
    limiter.connect(context.destination);musicGain=context.createGain();effects=context.createGain();
    musicGain.gain.value=volume;musicGain.connect(limiter);effects.connect(limiter);
    voice=createMusicVoice(context,musicGain);
    context.addEventListener('statechange',()=>{if(context?.state==='running')begin();else stopTimer();},{signal:lifecycle.signal});
   }catch{return;}
  }
  musicGain!.gain.setTargetAtTime(music?volume:0,context.currentTime,.04);
  if(!music||volume===0){stopTimer();voice!.stop();nextAt=0;}
  if(!visible()||!(sound||music&&volume>0)){stopTimer();void context.suspend().catch(()=>{});return;}
  // Queue resume even when a preceding suspend has not finished yet.
  void context.resume().then(begin).catch(()=>{});
 }
 document.addEventListener('visibilitychange',sync,{signal:lifecycle.signal});
 window.addEventListener('pagehide',()=>{pageHidden=true;sync();},{signal:lifecycle.signal});
 window.addEventListener('pageshow',()=>{pageHidden=false;sync();},{signal:lifecycle.signal});
 return {
  unlock(){activated=true;sync();},
  setOptions(next:AudioOptions){
   if(next.sound!==undefined)sound=next.sound;
   if(next.music!==undefined)music=next.music;
   if(next.musicVolume!==undefined)volume=next.musicVolume;
   sync();
  },
  effect(index=0){
   if(!sound||disposed||!visible())return;sync();
   if(!context||context.state!=='running')return;
   const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
   oscillator.type='triangle';oscillator.frequency.value=350+index*48;
   gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.001,now+.1);
   oscillator.connect(gain).connect(effects!);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
   oscillator.start();oscillator.stop(now+.11);
  },
  destroy(){
   if(disposed)return;disposed=true;lifecycle.abort();stopTimer();voice?.destroy();
   if(context)void context.close().catch(()=>{});
  },
 };
}
