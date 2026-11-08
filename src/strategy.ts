import type {GamePort,GameState,ActionResult} from './run-api';
import type {RunAction} from './run-types';

export type Strategy=(state:GameState,context:{signal:AbortSignal;step:number})=>RunAction|null|Promise<RunAction|null>;
export interface StrategyOptions {intervalMs?:number;decisionTimeoutMs?:number;maxSteps?:number;animate?:boolean}
export type StrategyStatus={status:'idle'|'running'|'stopped'|'completed'|'error';steps:number;reason:string;lastAction:RunAction|null;lastResult:ActionResult|null;error:string|null};
const owners=new WeakMap<GamePort,object>();
const cancelled=()=>new Error('STRATEGY_CANCELLED');
function abortable<T>(task:Promise<T>,signal:AbortSignal):Promise<T>{
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(cancelled());
  if(signal.aborted){reject(cancelled());return;}
  signal.addEventListener('abort',abort,{once:true});
  task.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
 });
}
function delay(ms:number,signal:AbortSignal){
 return new Promise<void>((resolve,reject)=>{
  const abort=()=>{clearTimeout(timer);reject(cancelled());};
  const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);
  if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
 });
}
/** Runs a trusted function against the same two methods used by mouse/keyboard input. */
export function createStrategyRunner(game:GamePort,initialStrategy:Strategy,options:StrategyOptions={}){
 let strategy=initialStrategy,controller:AbortController|null=null,task:Promise<StrategyStatus>|null=null,destroyed=false;
 const token={},interval=options.intervalMs??120,timeout=options.decisionTimeoutMs??10000,max=options.maxSteps??1000;
 if(typeof strategy!=='function'||!Number.isFinite(interval)||interval<0||!Number.isFinite(timeout)||timeout<=0||!Number.isInteger(max)||max<1)throw new Error('策略或运行参数无效');
 let status:StrategyStatus={status:'idle',steps:0,reason:'',lastAction:null,lastResult:null,error:null};
 const getStatus=()=>structuredClone(status);
 function stop(){controller?.abort();if(status.status==='running'){status.status='stopped';status.reason='stop';}return getStatus();}
 async function execute(single:boolean):Promise<StrategyStatus>{
  if(destroyed)throw new Error('策略运行器已销毁');
  if(task)return task;
  if(owners.has(game))throw new Error('此游戏已有策略正在运行');
  owners.set(game,token);controller=new AbortController();const signal=controller.signal;
  status={status:'running',steps:0,reason:'',lastAction:null,lastResult:null,error:null};
  task=Promise.resolve().then(async()=>{
   try{
    while(!signal.aborted){
     let state=game.getState();
     if(state.phase==='won'||state.phase==='lost'){status.status='completed';status.reason=state.phase;break;}
     if(status.steps>=(single?1:max)){status.status='completed';status.reason=single?'step':'max_steps';break;}
     if(state.busy){await delay(25,signal);continue;}
     const decisionController=new AbortController();
     const abort=()=>decisionController.abort();signal.addEventListener('abort',abort,{once:true});
     const timer=setTimeout(()=>decisionController.abort(),timeout);
     let action:RunAction|null;
     try{action=await abortable(Promise.resolve().then(()=>strategy(structuredClone(state),{signal:decisionController.signal,step:status.steps})),decisionController.signal);}
     catch(e){if(!signal.aborted&&decisionController.signal.aborted)throw new Error('策略决策超时');throw e;}
     finally{clearTimeout(timer);signal.removeEventListener('abort',abort);decisionController.abort();}
     if(signal.aborted)break;
     if(action===null){status.status='completed';status.reason='no_action';break;}
     if(!action||typeof action.type!=='string')throw new Error('策略应返回操作对象或 null');
     // A human or another controller may have moved while the strategy was awaiting.
     const current=game.getState();
     if(current.revision!==state.revision||current.busy){await delay(interval,signal);continue;}
     action={...structuredClone(action),expectedRevision:state.revision,animate:options.animate??false};
     status.lastAction=action;
     const result=await abortable(Promise.resolve(game.dispatch(action)),signal);
     status.lastResult=result;
     if(!result.ok)throw new Error(`${result.error}: ${result.message??'操作失败'}`);
     status.steps++;
     await delay(interval,signal);
    }
   }catch(e){if(!signal.aborted){status.status='error';status.reason='error';status.error=e instanceof Error?e.message:String(e);}}
   finally{if(signal.aborted&&status.status==='running'){status.status='stopped';status.reason='stop';}if(owners.get(game)===token)owners.delete(game);task=null;controller=null;}
   return getStatus();
  });
  return task;
 }
 return {
  getStatus,start:()=>execute(false),step:()=>execute(true),stop,
  setStrategy(next:Strategy){if(typeof next!=='function')throw new Error('策略必须是函数');stop();strategy=next;return task??Promise.resolve(getStatus());},
  destroy(){stop();destroyed=true;},
 };
}
