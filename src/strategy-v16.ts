import {
  bindStrategyForInference as bindV15,
  createStrategy as createV15,
  makeDecision,
  reportDecisionReward as reportV15,
  socialStrategyScore,
  strategySummary as summaryV15,
  toyStrategyScore,
  type DecisionCandidate,
  type DecisionKind,
  type DecisionTrace,
  type StrategyFeatures,
  type StrategyState as V15StrategyState,
  type StrategyWeights,
} from './strategy-v15'

export {makeDecision,socialStrategyScore,toyStrategyScore}
export type {DecisionCandidate,DecisionKind,DecisionTrace,StrategyFeatures,StrategyWeights}

export type GateMetrics={
  offlineImprovement:number
  valueImprovement:number
  challengerWins:number
  decisionGain:number
  contextGain:number
  trajectoryGain:number
  transitionGain:number
  transitionConfidence:number
}
export type PolicyVersionStatus='stable'|'observing'|'rolled_back'
export type PolicyVersion={
  version:number
  weights:StrategyWeights
  status:PolicyVersionStatus
  sourceCycle:number
  promotedAt:number
  stableAt:number|null
  baselineReward:number
  observedReward:number
  observedSamples:number
  metrics:GateMetrics
  note:string
}
export type StabilityResult={
  status:'stable'|'observing'|'rolled_back'
  currentVersion:number
  fallbackVersion:number
  samples:number
  avgReward:number
  baselineReward:number
  delta:number
  kinds:number
  reason:string
  at:number
}
export type PolicyRegistryState={
  currentVersion:number
  versions:PolicyVersion[]
  observation:{rewards:number[];kinds:DecisionKind[];startedAt:number}|null
  rollbacks:number
  last:StabilityResult
}
export type StrategyState=V15StrategyState&{policyRegistry:PolicyRegistryState}

const OBSERVE_SAMPLES=12
const MAX_VERSIONS=8
const MAX_REGRESSION=.06
const MIN_KINDS=2
const clamp01=(v:number)=>Math.min(1,Math.max(0,v))
const finite=(v:unknown,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?v:fallback
const cloneWeights=(w:StrategyWeights)=>({...w})

function metricsFrom(s:V15StrategyState):GateMetrics{return{
  offlineImprovement:finite(s.reflection?.last?.improvement,0),
  valueImprovement:finite(s.shadow?.last?.improvement,0),
  challengerWins:Math.max(0,Math.floor(finite(s.shadow?.last?.challengerWins,0))),
  decisionGain:finite(s.decisionShadow?.last?.avgEstimatedGain,0),
  contextGain:finite(s.contextual?.last?.avgEstimatedGain,0),
  trajectoryGain:finite(s.worldModel?.last?.avgEstimatedGain,0),
  transitionGain:finite(s.transitionModel?.last?.avgEstimatedNeedGain,0),
  transitionConfidence:clamp01(finite(s.transitionModel?.last?.avgConfidence,0)),
}}
function recentBaseline(s:V15StrategyState){
  const rs=(s.history??[]).slice(0,8).map(x=>x.reward).filter(Number.isFinite)
  return rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:clamp01(finite(s.avgReward,.5))
}
function initialVersion(s:V15StrategyState):PolicyVersion{return{
  version:1,weights:cloneWeights(s.weights),status:'stable',sourceCycle:0,promotedAt:Date.now(),stableAt:Date.now(),baselineReward:recentBaseline(s),observedReward:recentBaseline(s),observedSamples:0,metrics:metricsFrom(s),note:'V16 接管时的当前 Champion，作为初始稳定回滚点',
}}
function blankRegistry(s:V15StrategyState):PolicyRegistryState{const v=initialVersion(s);return{currentVersion:1,versions:[v],observation:null,rollbacks:0,last:{status:'stable',currentVersion:1,fallbackVersion:1,samples:0,avgReward:v.observedReward,baselineReward:v.baselineReward,delta:0,kinds:0,reason:'Champion v1 已登记为初始稳定版本',at:Date.now()}}}
function cleanMetrics(raw:unknown):GateMetrics{const r=raw as Partial<GateMetrics>|null|undefined;return{offlineImprovement:finite(r?.offlineImprovement,0),valueImprovement:finite(r?.valueImprovement,0),challengerWins:Math.max(0,Math.floor(finite(r?.challengerWins,0))),decisionGain:finite(r?.decisionGain,0),contextGain:finite(r?.contextGain,0),trajectoryGain:finite(r?.trajectoryGain,0),transitionGain:finite(r?.transitionGain,0),transitionConfidence:clamp01(finite(r?.transitionConfidence,0))}}
function cleanStatus(v:unknown):PolicyVersionStatus{return v==='observing'||v==='rolled_back'||v==='stable'?v:'stable'}
function hydrateRegistry(raw:unknown,s:V15StrategyState):PolicyRegistryState{
  const fallback=blankRegistry(s),r=raw as Partial<PolicyRegistryState>|null|undefined
  if(!r||typeof r!=='object')return fallback
  const versions:PolicyVersion[]=Array.isArray(r.versions)?r.versions.filter(v=>v&&Number.isFinite(v.version)&&v.weights).slice(-MAX_VERSIONS).map((v):PolicyVersion=>({
    version:Math.max(1,Math.floor(v.version)),weights:cloneWeights(v.weights),status:cleanStatus(v.status),sourceCycle:Math.max(0,Math.floor(finite(v.sourceCycle,0))),promotedAt:finite(v.promotedAt,Date.now()),stableAt:v.stableAt===null?null:finite(v.stableAt,Date.now()),baselineReward:clamp01(finite(v.baselineReward,.5)),observedReward:clamp01(finite(v.observedReward,.5)),observedSamples:Math.max(0,Math.floor(finite(v.observedSamples,0))),metrics:cleanMetrics(v.metrics),note:typeof v.note==='string'?v.note:''
  })):[fallback.versions[0]]
  if(!versions.length)versions.push(fallback.versions[0])
  const currentVersion=Math.max(1,Math.floor(finite(r.currentVersion,versions[versions.length-1].version)))
  const observation=r.observation&&Array.isArray(r.observation.rewards)&&Array.isArray(r.observation.kinds)?{rewards:r.observation.rewards.map(x=>clamp01(finite(x,.5))).slice(-OBSERVE_SAMPLES),kinds:r.observation.kinds.filter((x):x is DecisionKind=>x==='toy'||x==='social'||x==='rest').slice(-OBSERVE_SAMPLES),startedAt:finite(r.observation.startedAt,Date.now())}:null
  const last=r.last&&typeof r.last==='object'?{...fallback.last,...r.last}:fallback.last
  return{currentVersion,versions,observation,rollbacks:Math.max(0,Math.floor(finite(r.rollbacks,0))),last}
}

export function createStrategy(raw?:Partial<StrategyState>|null):StrategyState{
  const s=createV15(raw as Partial<V15StrategyState>|null) as StrategyState
  s.policyRegistry=hydrateRegistry(raw?.policyRegistry,s)
  return s
}
export function bindStrategyForInference(s:StrategyState){bindV15(s);return s}

function willSettle(t:DecisionTrace|undefined|null){return Boolean(t&&!t.settled&&t.rewards.length+1>=t.participants)}
function finalReward(t:DecisionTrace,reward:number){const values=[...t.rewards,clamp01(reward)];return values.reduce((a,b)=>a+b,0)/Math.max(1,values.length)}
function versionByNumber(r:PolicyRegistryState,v:number){return r.versions.find(x=>x.version===v)??null}
function previousStable(r:PolicyRegistryState,current:number){return[...r.versions].reverse().find(v=>v.version<current&&v.status==='stable')??null}
function trimVersions(r:PolicyRegistryState){
  if(r.versions.length<=MAX_VERSIONS)return
  const keep=new Set<number>([r.currentVersion])
  const stable=[...r.versions].reverse().filter(v=>v.status==='stable').slice(0,2);for(const v of stable)keep.add(v.version)
  const recent=[...r.versions].reverse().slice(0,MAX_VERSIONS);for(const v of recent)keep.add(v.version)
  r.versions=r.versions.filter(v=>keep.has(v.version)).slice(-MAX_VERSIONS)
}
function registerPromotion(s:StrategyState,baseline:number){
  const r=s.policyRegistry,next=Math.max(r.currentVersion,...r.versions.map(v=>v.version))+1,sourceCycle=Math.max(0,Math.floor(finite(s.shadow?.sourceCycle,0)))
  const v:PolicyVersion={version:next,weights:cloneWeights(s.weights),status:'observing',sourceCycle,promotedAt:Date.now(),stableAt:null,baselineReward:clamp01(baseline),observedReward:0,observedSamples:0,metrics:metricsFrom(s),note:`Challenger #${sourceCycle} 通过全部 V15 门禁，进入 V16 稳定性观察`}
  r.versions.push(v);r.currentVersion=next;r.observation={rewards:[],kinds:[],startedAt:Date.now()};trimVersions(r)
  const fallback=previousStable(r,next)?.version??1
  r.last={status:'observing',currentVersion:next,fallbackVersion:fallback,samples:0,avgReward:0,baselineReward:v.baselineReward,delta:0,kinds:0,reason:`Champion v${next} 进入稳定性观察 0/${OBSERVE_SAMPLES}`,at:Date.now()}
  s.lastDecision=`Champion v${next} 已晋升，进入 ${OBSERVE_SAMPLES} 条真实决策稳定性观察`
}
function rollback(s:StrategyState,current:PolicyVersion,fallback:PolicyVersion,avg:number,kinds:number){
  const r=s.policyRegistry,delta=avg-current.baselineReward
  current.status='rolled_back';current.stableAt=null;current.observedReward=avg;current.observedSamples=r.observation?.rewards.length??0;current.note=`观察期真实回报退化 ${(Math.abs(delta)*100).toFixed(1)}%，已自动回滚到 v${fallback.version}`
  s.weights=cloneWeights(fallback.weights);r.currentVersion=fallback.version;r.rollbacks+=1;r.observation=null
  s.reflection.buffer=[];s.shadow.challenger=null;s.shadow.samples=[];s.transitionModel.samples=[];s.worldModel.samples=[];s.contextual.samples=[];s.decisionShadow.samples=[]
  r.last={status:'rolled_back',currentVersion:fallback.version,fallbackVersion:fallback.version,samples:current.observedSamples,avgReward:avg,baselineReward:current.baselineReward,delta,kinds,reason:`Champion v${current.version} 观察期退化，已自动回滚到稳定 v${fallback.version}`,at:Date.now()}
  s.lastDecision=`Champion v${current.version} 退化，自动回滚到稳定 Champion v${fallback.version}`
}
function markStable(s:StrategyState,current:PolicyVersion,avg:number,kinds:number){
  const r=s.policyRegistry,delta=avg-current.baselineReward
  current.status='stable';current.stableAt=Date.now();current.observedReward=avg;current.observedSamples=r.observation?.rewards.length??0;current.note=`观察期通过：真实平均回报 ${(avg*100).toFixed(1)}%，相对基线 ${delta>=0?'+':''}${(delta*100).toFixed(1)}%`
  r.observation=null;r.last={status:'stable',currentVersion:current.version,fallbackVersion:current.version,samples:current.observedSamples,avgReward:avg,baselineReward:current.baselineReward,delta,kinds,reason:`Champion v${current.version} 已通过稳定性观察，成为新的回滚点`,at:Date.now()}
  s.lastDecision=`Champion v${current.version} 已稳定，正式成为新的安全回滚点`
}
function observeCurrentVersion(s:StrategyState,kind:DecisionKind,reward:number){
  const r=s.policyRegistry,o=r.observation;if(!o)return
  const current=versionByNumber(r,r.currentVersion);if(!current||current.status!=='observing'){r.observation=null;return}
  o.rewards.push(clamp01(reward));o.kinds.push(kind);o.rewards=o.rewards.slice(-OBSERVE_SAMPLES);o.kinds=o.kinds.slice(-OBSERVE_SAMPLES)
  const avg=o.rewards.reduce((a,b)=>a+b,0)/o.rewards.length,kinds=new Set(o.kinds).size,delta=avg-current.baselineReward,fallback=previousStable(r,current.version)
  current.observedReward=avg;current.observedSamples=o.rewards.length
  r.last={status:'observing',currentVersion:current.version,fallbackVersion:fallback?.version??current.version,samples:o.rewards.length,avgReward:avg,baselineReward:current.baselineReward,delta,kinds,reason:`Champion v${current.version} 稳定性观察 ${o.rewards.length}/${OBSERVE_SAMPLES} · 当前 ${(avg*100).toFixed(1)}% · 基线 ${(current.baselineReward*100).toFixed(1)}%`,at:Date.now()}
  if(o.rewards.length<OBSERVE_SAMPLES)return
  if(kinds<MIN_KINDS){r.last={...r.last,reason:`观察样本类型不足 ${kinds}/${MIN_KINDS}，继续保持观察并等待更丰富行为`};o.rewards=o.rewards.slice(-Math.floor(OBSERVE_SAMPLES/2));o.kinds=o.kinds.slice(-Math.floor(OBSERVE_SAMPLES/2));return}
  if(delta<-MAX_REGRESSION&&fallback)rollback(s,current,fallback,avg,kinds);else markStable(s,current,avg,kinds)
}

export function reportDecisionReward(s:StrategyState,t:DecisionTrace|undefined|null,reward:number){
  const settling=willSettle(t),settledReward=settling&&t?finalReward(t,reward):0,wasObserving=Boolean(s.policyRegistry.observation),baselineBefore=recentBaseline(s),beforeWeights=cloneWeights(s.weights),beforeVersion=s.policyRegistry.currentVersion
  const changed=reportV15(s,t,reward)
  const promoted=changed&&s.transitionModel.last.status==='promoted'&&Object.keys(beforeWeights).some(k=>Math.abs(beforeWeights[k as keyof StrategyWeights]-s.weights[k as keyof StrategyWeights])>.00001)
  if(promoted)registerPromotion(s,baselineBefore)
  else if(settling&&t&&wasObserving&&s.policyRegistry.currentVersion===beforeVersion)observeCurrentVersion(s,t.kind,settledReward)
  return changed
}

export function strategySummary(s:StrategyState){const base=summaryV15(s),r=s.policyRegistry,l=r.last;return{...base,policyRegistry:`Champion v${r.currentVersion} · ${l.status==='stable'?'稳定':l.status==='rolled_back'?'已回滚':'观察中'} · ${l.samples}/${OBSERVE_SAMPLES} · 回滚 ${r.rollbacks} 次 · ${l.reason}`}}
