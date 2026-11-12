// Original 8-bar, 82 BPM electronic jazz loop. No external audio or game RNG.
export const MUSIC_STEP_SECONDS=60/82/4;
const chords=[
 [50,57,60,64,65], [43,53,57,58,62], [48,55,59,62,64], [41,52,55,57,60],
 [46,53,57,60,62], [40,50,55,58,62], [45,55,59,62,64], [45,55,58,61,64],
];
const melody=[
 [77,76,72,69,72], [74,72,69,65,69], [76,74,71,67,71], [72,69,67,64,67],
 [74,72,69,65,69], [74,70,67,65,62], [76,74,71,67,71], [73,70,67,64,69],
];
const frequency=(midi:number)=>440*2**((midi-69)/12);

export function createMusicVoice(context:BaseAudioContext,output:AudioNode){
 const voices=new Set<AudioScheduledSourceNode>();
 const bus=context.createGain(),filter=context.createBiquadFilter();
 filter.type='lowpass';filter.frequency.value=5600;bus.connect(filter).connect(output);
 const delay=context.createDelay(.5),feedback=context.createGain(),wet=context.createGain();
 delay.delayTime.value=MUSIC_STEP_SECONDS*1.5;feedback.gain.value=.19;wet.gain.value=.12;
 filter.connect(delay);delay.connect(feedback).connect(delay);delay.connect(wet).connect(output);
 const noise=context.createBuffer(1,context.sampleRate,context.sampleRate),samples=noise.getChannelData(0);
 let seed=853;
 for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}

 function source(node:AudioScheduledSourceNode,nodes:AudioNode[],at:number,end:number){
  voices.add(node);
  node.onended=()=>{voices.delete(node);node.disconnect();nodes.forEach(n=>n.disconnect());};
  node.start(at);node.stop(end);
 }
 function note(midi:number,at:number,length:number,volume:number,kind:'keys'|'bass'|'lead'='keys',pan=0){
  const gain=context.createGain(),tone=context.createBiquadFilter(),stereo=context.createStereoPanner();
  tone.type='lowpass';tone.frequency.value=kind==='bass'?520:kind==='lead'?2100:1800;
  stereo.pan.value=pan;tone.connect(gain).connect(stereo).connect(bus);
  const attack=kind==='keys'?.009:.018,end=at+length+.32;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.27),at+Math.max(attack+.01,length));
  gain.gain.exponentialRampToValueAtTime(.0001,end);
  const oscillator=context.createOscillator();oscillator.type=kind==='keys'?'sine':'triangle';
  oscillator.frequency.value=frequency(midi);oscillator.connect(tone);
  source(oscillator,[tone,gain,stereo],at,end+.02);
  if(kind==='keys'){
   const overtone=context.createOscillator(),overtoneGain=context.createGain();
   overtone.type='sine';overtone.frequency.value=frequency(midi)*2.002;overtoneGain.gain.value=.13;
   overtone.connect(overtoneGain).connect(tone);source(overtone,[overtoneGain],at,end);
  }
 }
 function percussion(at:number,type:'kick'|'snare'|'hat',accent=1){
  const gain=context.createGain();gain.connect(bus);
  if(type==='kick'){
   const oscillator=context.createOscillator();oscillator.frequency.setValueAtTime(112,at);
   oscillator.frequency.exponentialRampToValueAtTime(43,at+.15);
   gain.gain.setValueAtTime(.27*accent,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.24);
   oscillator.connect(gain);source(oscillator,[gain],at,at+.25);
  }else{
   const oscillator=context.createBufferSource(),highpass=context.createBiquadFilter();oscillator.buffer=noise;
   highpass.type='highpass';highpass.frequency.value=type==='hat'?6500:1400;
   const length=type==='hat'?.045:.13;
   gain.gain.setValueAtTime((type==='hat'?.028:.065)*accent,at);
   gain.gain.exponentialRampToValueAtTime(.0001,at+length);
   oscillator.connect(highpass).connect(gain);source(oscillator,[highpass,gain],at,at+length+.01);
  }
 }
 return {
  schedule(step:number,at:number){
   const beat=step%16,bar=Math.floor(step/16)%8,chord=chords[bar],root=chord[0];
   // Warm Rhodes-like voicings, a soft bass line, brushed drums and a sparse lead.
   if([0,7,12].includes(beat))chord.slice(1).forEach((pitch,i)=>note(pitch+12,at+i*.008,beat===0?.85:.42,.045,'keys',(i-1.5)*.16));
   if([0,6,8,11,14].includes(beat))note(root+(beat===11?7:beat===14?12:0),at,.27,.15,'bass');
   const phrase=[2,5,8,10,14].indexOf(beat);
   if(phrase>=0&&!(bar%2===1&&phrase===2))note(melody[bar][phrase],at,.23,.043,'lead',.2);
   if([0,7,10].includes(beat))percussion(at,'kick',beat===0?1:.6);
   if(beat===4||beat===12)percussion(at+.012,'snare');
   if(beat%2===0)percussion(at+(beat%4===2?.02:0),'hat',beat%4===0?.5:.8);
   if(beat===15)percussion(at+.02,'hat',.23);
  },
  stop(){for(const voice of voices){try{voice.stop();}catch{}}voices.clear();},
  destroy(){this.stop();[bus,filter,delay,feedback,wet].forEach(node=>node.disconnect());},
 };
}
