import {createRun,dispatchRun,snapshot} from './run-engine';
import type {RunAction,RunState} from './run-types';
import {readSave} from './run-save';

export type GameState=RunState&{apiVersion:string;isDemo:boolean;busy:boolean;legalActions:string[];limits:{jokers:number;consumables:number}};
export type ActionResult={ok:boolean;revision:number;error?:string;message?:string};
export interface GamePort {
 getState():GameState;
 dispatch(action:RunAction):ActionResult|Promise<ActionResult>;
}
export interface GameOptions {seed?:string;deck?:string;stake?:number;state?:unknown;startInMenu?:boolean}
export interface HeadlessGame extends GamePort {dispatch(action:RunAction):ActionResult}

/** A synchronous, DOM-free instance for strategy evaluation and batch runs. */
export function createGame(options:GameOptions={}):HeadlessGame{
 let state:RunState=options.state===undefined?createRun(options):readSave(options.state);
 if(options.state===undefined&&options.startInMenu)state.phase='setup';
 return {
  getState:()=>({...snapshot(state),busy:false}),
  dispatch(action:RunAction){
   if(action?.expectedRevision!==undefined&&action.expectedRevision!==state.revision)
    return {ok:false,revision:state.revision,error:'STALE_STATE',message:'状态已变化，请重新决策'};
   const result=dispatchRun(state,action);
   if(!result.ok)return {ok:false,revision:state.revision,error:result.error,message:result.message};
   state=result.state;return {ok:true,revision:state.revision};
  },
 };
}
