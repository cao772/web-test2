import {
  bindStrategyForInference as bindV14,
  createStrategy as createV14,
  makeDecision,
  reportDecisionReward as reportV14,
  socialStrategyScore,
  strategySummary as summaryV14,
  toyStrategyScore,
  type DecisionCandidate,
  type DecisionKind,
  type DecisionTrace,
  type StrategyFeatures,
  type StrategyState as V14StrategyState,
  type StrategyWeights,
} from './strategy-v14'

export {makeDecision,socialStrategyScore,toyStrategyScore}
export type {DecisionCandidate,DecisionKind,DecisionTrace,StrategyFeatures,StrategyWeights}

export type StateDimension='play'|'social'|'rest'|'curiosity'
export type ObservableState=Record<StateDimension,number|null>
export type TransitionExperience={
  id:string
  key:string
  label:string
  actor:string
  kind:DecisionKind
  state:ObservableState
  nextState:ObservableState
  delta:ObservableState
  dimensions:number
  decisionAt:number
  nextDecisionAt:number
}
export type StateObservation={id:string;key:string;label:string;actor:string;kind:DecisionKind;state:ObservableState;decisionAt:number}
export type StateRolloutSample={
  id:string
  championLabel:string
  challengerLabel:string
  agreed:boolean
  supported:boolean
  championPath:string
  challengerPath:string
  estimatedNeedGain:number
  confidence:number
  dimensions:number
  neighbors:number
  at:number
}
export type StateRolloutResult={
  status:'idle'|'shadowing'|'promoted'|'rejected'
  evaluated:number
  agreements:number
  divergences:number
  supportedDivergences:number
  avgEstimatedNeedGain:number
  avgConfidence:number
  avgDimensions:number
  reason:string
  at:number
}
export type TransitionModelState={
  transitions:TransitionExperience[]
  lastObservation:StateObservation|null
  samples:StateRolloutSample[]
  last:StateRolloutResult
}
export type StrategyState=V14StrategyState&{transitionModel:TransitionModelState}

type ActionModel={key:string;label:string;actor:string;kind:DecisionKind}
type TransitionEstimate={supported:boolean;nextState:ObservableState;confidence:number;neighbors:number;avgDistance:number;dimensions:number}
type Rollout={supported:boolean;first:TransitionEstimate;second:TransitionEstimate|null;path:string;confidence:number;dimensions:number;neighbors:number;state1:ObservableState;state2:ObservableState}

const MAX_TRANSITIONS=220
const MAX_SAMPLES=10
const MAX_NEIGHBORS=5
const MIN_NEIGHBORS=2
const MIN_STATE_DIMS=2
const MAX_STATE_DISTANCE=.48
const MAX_LINK_GAP_MS=30000
const MIN_EVALUATED=6
const MIN_DIVERGENCES=2
const MIN_SUPPORTED_DIVERGENCES=2
const MIN_NEED_GAIN=.012
const MIN_CONFIDENCE=.42
const clamp01=(v:number)=>Math.min(1,Math.max(0,v))
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?clamp01(v):null
const dims:StateDimension[]=['play','social','rest','curiosity']

function emptyState():ObservableState{return{play:null,social:null,rest:null,curiosity:null}}
function blankTransitionModel():TransitionModelState{return{
  transitions:[],lastObservation:null,samples:[],last:{status:'idle',evaluated:0,agreements:0,divergences:0,supportedDivergences:0,avgEstimatedNeedGain:0,avgConfidence:0,avgDimensions:0,reason:'等待真实状态转移；缺失维度不会被伪造',at:Date.now()}
}}
function cleanState(raw:unknown):ObservableState{const out=emptyState(),r=raw as Partial<ObservableState>|null|undefined;if(!r||typeof r!=='object')return out;for(const d of dims)out[d]=finite(r[d]);return out}
function hydrateTransitionModel(raw:unknown):TransitionModelState{
  const out=blankTransitionModel(),r=raw as Partial<TransitionModelState>|null|undefined
  if(!r||typeof r!=='object')return out
  if(Array.isArray(r.transitions))out.transitions=r.transitions.filter(x=>x&&typeof x.id==='string'&&typeof x.key==='string').slice(-MAX_TRANSITIONS).map(x=>({...x,state:cleanState(x.state),nextState:cleanState(x.nextState),delta:cleanState(x.delta),dimensions:Math.max(0,Math.floor(Number(x.dimensions)||0))}))
  if(r.lastObservation&&typeof r.lastObservation==='object')out.lastObservation={...r.lastObservation,state:cleanState(r.lastObservation.state)}
  if(Array.isArray(r.samples))out.samples=r.samples.filter(Boolean).slice(-MAX_SAMPLES).map(x=>({...x}))
  if(r.last&&typeof r.last==='object')out.last={...out.last,...r.last}
  return out
}

export function createStrategy(raw?:Partial<StrategyState>|null):StrategyState{
  const s=createV14(raw as Partial<V14StrategyState>|null) as StrategyState
  s.transitionModel=hydrateTransitionModel(raw?.transitionModel)
  return s
}
export function bindStrategyForInference(s:StrategyState){bindV14(s);return s}

function stateFromTrace(t:DecisionTrace):ObservableState{
  const out=emptyState(),f=t.features??{}
  out.play=finite(f.play);out.social=finite(f.social);out.rest=finite(f.rest);out.curiosity=finite(f.curiosity)
  const cs=Array.isArray(t.candidates)?t.candidates:[]
  for(const d of dims){
    if(out[d]!==null)continue
    const values=cs.map(c=>finite(c.features?.[d])).filter((v):v is number=>v!==null)
    if(values.length)out[d]=values.reduce((a,b)=>a+b,0)/values.length
  }
  return out
}
function stateDelta(a:ObservableState,b:ObservableState){const out=emptyState();let count=0;for(const d of dims){if(a[d]===null||b[d]===null)continue;out[d]=b[d]!-a[d]!;count++}return{delta:out,count}}
function observedCount(s:ObservableState){return dims.filter(d=>s[d]!==null).length}
function stateDistance(a:ObservableState,b:ObservableState){let total=0,weight=0,overlap=0;for(const d of dims){if(a[d]===null||b[d]===null)continue;const w=d==='rest'?1.1:d==='social'?1.05:1,totalDiff=a[d]!-b[d]!;total+=totalDiff*totalDiff*w;weight+=w;overlap++}if(overlap<MIN_STATE_DIMS)return null;return{distance:Math.sqrt(total/Math.max(.001,weight)),overlap}}
function stateCost(s:ObservableState,only?:StateDimension[]){const use=(only??dims).filter(d=>s[d]!==null);if(!use.length)return null;return use.reduce((a,d)=>a+s[d]!,0)/use.length}
function applyDelta(s:ObservableState,delta:ObservableState){const out={...s};for(const d of dims)if(s[d]!==null&&delta[d]!==null)out[d]=clamp01(s[d]!+delta[d]!);return out}

function linkPreviousTransition(s:StrategyState,current:StateObservation){
  const prev=s.transitionModel.lastObservation
  if(prev&&current.decisionAt>prev.decisionAt&&current.decisionAt-prev.decisionAt<=MAX_LINK_GAP_MS){
    const {delta,count}=stateDelta(prev.state,current.state)
    if(count>0)s.transitionModel.transitions.push({id:`${prev.id}->${current.id}`,key:prev.key,label:prev.label,actor:prev.actor,kind:prev.kind,state:{...prev.state},nextState:{...current.state},delta,dimensions:count,decisionAt:prev.decisionAt,nextDecisionAt:current.decisionAt})
    s.transitionModel.transitions=s.transitionModel.transitions.slice(-MAX_TRANSITIONS)
  }
  s.transitionModel.lastObservation=current
}
function sameActionDomain(e:TransitionExperience,a:ActionModel){return e.key===a.key&&e.kind===a.kind&&(a.kind==='social'||e.actor===a.actor)}
function estimateTransition(s:StrategyState,state:ObservableState,action:ActionModel):TransitionEstimate{
  const matches=s.transitionModel.transitions.map(e=>({e,m:stateDistance(state,e.state)})).filter((x):x is {e:TransitionExperience;m:{distance:number;overlap:number}}=>Boolean(x.m)&&sameActionDomain(x.e,action)&&x.m!.distance<=MAX_STATE_DISTANCE&&x.e.dimensions>=MIN_STATE_DIMS).sort((a,b)=>a.m.distance-b.m.distance).slice(0,MAX_NEIGHBORS)
  if(matches.length<MIN_NEIGHBORS)return{supported:false,nextState:{...state},confidence:0,neighbors:matches.length,avgDistance:matches.length?matches.reduce((a,b)=>a+b.m.distance,0)/matches.length:1,dimensions:0}
  const delta=emptyState(),weights:Partial<Record<StateDimension,number>>={},counts:Partial<Record<StateDimension,number>>={};let dist=0,totalWeight=0
  for(const x of matches){const w=1/Math.max(.06,x.m.distance+.045);dist+=x.m.distance;totalWeight+=w;for(const d of dims){if(state[d]===null||x.e.delta[d]===null)continue;delta[d]=(delta[d]??0)+x.e.delta[d]!*w;weights[d]=(weights[d]??0)+w;counts[d]=(counts[d]??0)+1}}
  let modeledDims=0;for(const d of dims){if((counts[d]??0)<MIN_NEIGHBORS||!(weights[d]!>0)){delta[d]=null;continue}delta[d]=delta[d]!/weights[d]!;modeledDims++}
  const avgDistance=dist/matches.length,countConfidence=Math.min(1,matches.length/MAX_NEIGHBORS),distanceConfidence=clamp01(1-avgDistance/MAX_STATE_DISTANCE),dimConfidence=Math.min(1,modeledDims/3),confidence=countConfidence*.42+distanceConfidence*.35+dimConfidence*.23
  return{supported:modeledDims>=MIN_STATE_DIMS,nextState:applyDelta(state,delta),confidence,neighbors:matches.length,avgDistance,dimensions:modeledDims}
}
function actionModels(s:StrategyState){const map=new Map<string,ActionModel>();for(const e of s.transitionModel.transitions){const id=`${e.kind}|${e.actor}|${e.key}`;if(!map.has(id))map.set(id,{key:e.key,label:e.label,actor:e.actor,kind:e.kind})}return[...map.values()]}
function bestContinuation(s:StrategyState,state:ObservableState){let best:{model:ActionModel;est:TransitionEstimate;cost:number}|null=null;for(const model of actionModels(s)){const est=estimateTransition(s,state,model);if(!est.supported)continue;const cost=stateCost(est.nextState);if(cost===null)continue;if(!best||cost<best.cost)best={model,est,cost}}return best}

function n(v:unknown){return typeof v==='number'&&Number.isFinite(v)?clamp01(v):0}
function toyScore(w:StrategyWeights,f:StrategyFeatures){return n(f.play)*w.toyPlay+n(f.curiosity)*w.toyCuriosity+n(f.preference)*w.toyPreference+n(f.satisfaction)*w.toySatisfaction+n(f.novelty)*w.toyNovelty-n(f.repeat)*w.toyRepeat}
function socialScore(w:StrategyWeights,f:StrategyFeatures){return n(f.social)*w.socialNeed+n(f.play)*(n(f.isTag)?w.socialPlay:w.socialPlay*.34)+n(f.preference)*w.socialPreference+n(f.satisfaction)*w.socialSatisfaction-n(f.repeat)*w.socialRepeat}
function challengerChoice(w:StrategyWeights,candidates:DecisionCandidate[]){
  const rest=candidates.filter(c=>c.kind==='rest').sort((a,b)=>n(b.features.rest)-n(a.features.rest))[0]
  if(rest&&n(rest.features.rest)*100>w.restThreshold)return rest
  const social=candidates.filter(c=>c.kind==='social').map(c=>({c,score:socialScore(w,c.features)})).sort((a,b)=>b.score-a.score)[0]
  if(social&&social.score>w.socialThreshold)return social.c
  const toy=candidates.filter(c=>c.kind==='toy').map(c=>({c,score:toyScore(w,c.features)})).sort((a,b)=>b.score-a.score)[0]
  return toy?.c??candidates[0]??null
}
function rollout(s:StrategyState,state:ObservableState,first:ActionModel):Rollout{
  const a=estimateTransition(s,state,first);if(!a.supported)return{supported:false,first:a,second:null,path:first.label,confidence:0,dimensions:0,neighbors:a.neighbors,state1:a.nextState,state2:a.nextState}
  const cont=bestContinuation(s,a.nextState);if(!cont)return{supported:false,first:a,second:null,path:first.label,confidence:a.confidence,dimensions:a.dimensions,neighbors:a.neighbors,state1:a.nextState,state2:a.nextState}
  const dimensions=Math.min(a.dimensions,cont.est.dimensions),confidence=Math.min(a.confidence,cont.est.confidence),neighbors=Math.min(a.neighbors,cont.est.neighbors)
  return{supported:dimensions>=MIN_STATE_DIMS,first:a,second:cont.est,path:`${first.label} → ${cont.model.label}`,confidence,dimensions,neighbors,state1:a.nextState,state2:cont.est.nextState}
}
function compareRollouts(champion:Rollout,challenger:Rollout){
  const common1=dims.filter(d=>champion.state1[d]!==null&&challenger.state1[d]!==null),common2=dims.filter(d=>champion.state2[d]!==null&&challenger.state2[d]!==null),common=[...new Set([...common1,...common2])]
  if(common.length<MIN_STATE_DIMS)return{supported:false,gain:0,dimensions:common.length}
  const c1=stateCost(champion.state1,common1),x1=stateCost(challenger.state1,common1),c2=stateCost(champion.state2,common2),x2=stateCost(challenger.state2,common2)
  if(c1===null||x1===null||c2===null||x2===null)return{supported:false,gain:0,dimensions:common.length}
  const championBurden=c1*.58+c2*.42,challengerBurden=x1*.58+x2*.42
  return{supported:true,gain:championBurden-challengerBurden,dimensions:common.length}
}
function collectStateRollout(s:StrategyState,t:DecisionTrace,challenger:StrategyWeights){
  const state=stateFromTrace(t),candidates=Array.isArray(t.candidates)&&t.candidates.length?t.candidates:[{kind:t.kind,actor:t.actor,key:t.key,label:t.label,features:{...t.features},championScore:t.score}],choice=challengerChoice(challenger,candidates),agreed=!choice||choice.key===t.key
  if(agreed){s.transitionModel.samples.push({id:t.id,championLabel:t.label,challengerLabel:choice?.label??t.label,agreed:true,supported:true,championPath:t.label,challengerPath:choice?.label??t.label,estimatedNeedGain:0,confidence:1,dimensions:observedCount(state),neighbors:0,at:Date.now()})}
  else{
    const championAction:ActionModel={key:t.key,label:t.label,actor:t.actor,kind:t.kind},challengerAction:ActionModel={key:choice.key,label:choice.label,actor:choice.actor,kind:choice.kind},cr=rollout(s,state,championAction),xr=rollout(s,state,challengerAction),cmp=cr.supported&&xr.supported?compareRollouts(cr,xr):{supported:false,gain:0,dimensions:0},supported=cr.supported&&xr.supported&&cmp.supported,confidence=supported?Math.min(cr.confidence,xr.confidence):0,neighbors=supported?Math.min(cr.neighbors,xr.neighbors):Math.min(cr.neighbors,xr.neighbors)
    s.transitionModel.samples.push({id:t.id,championLabel:t.label,challengerLabel:choice.label,agreed:false,supported,championPath:cr.path,challengerPath:xr.path,estimatedNeedGain:supported?cmp.gain:0,confidence,dimensions:cmp.dimensions,neighbors,at:Date.now()})
  }
  s.transitionModel.samples=s.transitionModel.samples.slice(-MAX_SAMPLES);refreshTransitionResult(s)
}
function refreshTransitionResult(s:StrategyState){const samples=s.transitionModel.samples,agreements=samples.filter(x=>x.agreed).length,divergences=samples.length-agreements,supported=samples.filter(x=>!x.agreed&&x.supported),supportedCount=supported.length,totalConfidence=supported.reduce((a,b)=>a+b.confidence,0),avgGain=supportedCount?supported.reduce((a,b)=>a+b.estimatedNeedGain*b.confidence,0)/Math.max(.001,totalConfidence):0,avgConfidence=supportedCount?totalConfidence/supportedCount:0,avgDimensions=supportedCount?supported.reduce((a,b)=>a+b.dimensions,0)/supportedCount:0;s.transitionModel.last={status:'shadowing',evaluated:samples.length,agreements,divergences,supportedDivergences:supportedCount,avgEstimatedNeedGain:avgGain,avgConfidence,avgDimensions,reason:`状态转移 rollout ${samples.length}/${MAX_SAMPLES} · 一致 ${agreements} · 分歧 ${divergences} · 双步支持 ${supportedCount}`,at:Date.now()}}
function transitionGate(s:StrategyState){const d=s.transitionModel.last;if(d.evaluated<MIN_EVALUATED)return{pass:false,reason:`状态 rollout 样本不足 ${d.evaluated}/${MIN_EVALUATED}`};if(d.divergences<MIN_DIVERGENCES)return{pass:false,reason:`状态转移 Top-1 分歧不足 ${d.divergences}/${MIN_DIVERGENCES}`};if(d.supportedDivergences<MIN_SUPPORTED_DIVERGENCES)return{pass:false,reason:`双步状态转移证据不足 ${d.supportedDivergences}/${MIN_SUPPORTED_DIVERGENCES}`};if(d.avgDimensions<MIN_STATE_DIMS)return{pass:false,reason:`可观测状态维度不足 ${d.avgDimensions.toFixed(1)}/${MIN_STATE_DIMS}`};if(d.avgConfidence<MIN_CONFIDENCE)return{pass:false,reason:`状态转移模型置信度不足 ${(d.avgConfidence*100).toFixed(0)}%`};if(d.avgEstimatedNeedGain<=MIN_NEED_GAIN)return{pass:false,reason:`两步 rollout 需求负担改善不足 ${(d.avgEstimatedNeedGain*100).toFixed(2)}%`};return{pass:true,reason:`显式状态转移通过：两步需求负担改善 ${(d.avgEstimatedNeedGain*100).toFixed(2)}%，置信 ${(d.avgConfidence*100).toFixed(0)}%`}}

function willSettle(t:DecisionTrace|undefined|null){return Boolean(t&&!t.settled&&t.rewards.length+1>=t.participants)}
export function reportDecisionReward(s:StrategyState,t:DecisionTrace|undefined|null,reward:number){
  const settling=willSettle(t),beforeChallenger=s.shadow.challenger?{...s.shadow.challenger}:null,beforeWeights={...s.weights},beforeUpdates=s.updates,beforePromoted=s.shadow.promoted,beforeRejected=s.shadow.rejected
  if(settling&&t){const obs:StateObservation={id:t.id,key:t.key,label:t.label,actor:t.actor,kind:t.kind,state:stateFromTrace(t),decisionAt:t.createdAt};linkPreviousTransition(s,obs);if(beforeChallenger)collectStateRollout(s,t,beforeChallenger)}
  const changed=reportV14(s,t,reward)
  const launched=!beforeChallenger&&Boolean(s.shadow.challenger)
  if(launched){s.transitionModel.samples=[];s.transitionModel.last={status:'shadowing',evaluated:0,agreements:0,divergences:0,supportedDivergences:0,avgEstimatedNeedGain:0,avgConfidence:0,avgDimensions:0,reason:`Challenger #${s.shadow.sourceCycle} 开始显式状态转移影子`,at:Date.now()}}
  const v14Promoted=Boolean(beforeChallenger)&&!s.shadow.challenger&&s.shadow.last.status==='promoted'
  if(v14Promoted){const gate=transitionGate(s);if(!gate.pass){s.weights=beforeWeights;s.updates=beforeUpdates;s.shadow.promoted=beforePromoted;s.shadow.rejected=beforeRejected+1;s.shadow.last={...s.shadow.last,status:'rejected',reason:`V15 状态转移门否决：${gate.reason}`};s.decisionShadow.last={...s.decisionShadow.last,status:'rejected',reason:`V15 状态转移门否决：${gate.reason}`};s.contextual.last={...s.contextual.last,status:'rejected',reason:`V15 状态转移门否决：${gate.reason}`};s.worldModel.last={...s.worldModel.last,status:'rejected',reason:`V15 状态转移门否决：${gate.reason}`};s.transitionModel.last={...s.transitionModel.last,status:'rejected',reason:`已恢复原 Champion：${gate.reason}`};s.lastDecision=`Challenger #${s.shadow.sourceCycle} 被显式状态转移门否决，恢复原 Champion`}else s.transitionModel.last={...s.transitionModel.last,status:'promoted',reason:gate.reason}}
  else if(Boolean(beforeChallenger)&&!s.shadow.challenger&&s.shadow.last.status==='rejected')s.transitionModel.last={...s.transitionModel.last,status:'rejected',reason:`前置世界模型门已拒绝：${s.shadow.last.reason}`}
  return v14Promoted?s.transitionModel.last.status==='promoted':changed
}

export function strategySummary(s:StrategyState){const base=summaryV14(s),m=s.transitionModel.last;return{...base,transitionModel:`状态转移：一致${m.agreements} / 分歧${m.divergences} / 双步支持${m.supportedDivergences} · 需求改善 ${(m.avgEstimatedNeedGain*100).toFixed(2)}% · ${m.avgDimensions.toFixed(1)}维 · 置信 ${(m.avgConfidence*100).toFixed(0)}%`}}
