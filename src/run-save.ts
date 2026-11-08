import {createRun,type RunState} from './run-engine';
import {HANDS,type Card} from './scoring';
import {content,jokerDefs,voucherDefs} from './run-content';
import {consumableById} from './consumables';

/** Restore data only. Storage and transport belong to the host platform. */
export function readSave(input:unknown):RunState {
 const template=createRun(),data=input as RunState;
 const invalid=()=>{throw new Error('无效的 balatro-run/1 存档');};
 if(!data||typeof data!=='object'||data.schema!=='balatro-run/1'||data.allUnlocked!==true)invalid();
 if(Object.keys(template).some(key=>!(key in data)))invalid();
 if(!Number.isInteger(data.revision)||data.revision<0||!Number.isInteger(data.rngState)||
  !Number.isInteger(data.stake)||data.stake<0||data.stake>7||typeof data.seed!=='string'||
  !Number.isFinite(data.money)||!content.decks.some(d=>d.id===data.deck)||
  !['setup','blind_select','playing','cash_out','shop','pack','won','lost'].includes(data.phase))invalid();
 for(const [key,value] of Object.entries(template)){
  const actual=(data as unknown as Record<string,unknown>)[key];
  if(Array.isArray(value)&&!Array.isArray(actual))invalid();
  if(typeof value==='number'&&(typeof actual!=='number'||!Number.isFinite(actual)))invalid();
 }
 if(!data.handLevels||!data.handCounts||Object.keys(HANDS).some(k=>!Number.isFinite(data.handLevels[k as keyof typeof HANDS])||!Number.isFinite(data.handCounts[k as keyof typeof HANDS])))invalid();
 if(!Number.isInteger(data.blindIndex)||data.blindIndex<0||data.blindIndex>2)invalid();
 const card=(c:Card)=>c&&typeof c.id==='string'&&Number.isInteger(c.rank)&&c.rank>=2&&c.rank<=14&&['S','H','C','D'].includes(c.suit);
 if(['hand','drawPile','discardPile','playedPile'].some(zone=>!(data[zone as 'hand']).every(card))||
  data.jokers.some(j=>!j||typeof j.id!=='string'||!jokerDefs[j.kind])||
  data.consumables.some(c=>!c||typeof c.id!=='string'||!consumableById[c.kind])||
  data.vouchers.some(v=>!voucherDefs[v])||!data.roundHands)invalid();
 if(data.phase==='pack'&&(!data.pack||!Array.isArray(data.pack.options)||!Number.isInteger(data.pack.remaining)))invalid();
 // Drop derived fields and arbitrary extra properties from getState() snapshots.
 return structuredClone(Object.fromEntries(Object.keys(template).map(key=>[key,(data as unknown as Record<string,unknown>)[key]]))) as RunState;
}
