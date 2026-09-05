import {
  BASE_STRATEGY,
  bindStrategyForInference as bindBaseStrategy,
  createStrategy as createBaseStrategy,
  makeDecision,
  reportDecisionReward as reportBaseReward,
  socialStrategyScore,
  strategySummary as baseSummary,
  toyStrategyScore,
  type DecisionCandidate,
  type DecisionKind,
  type DecisionTrace,
  type StrategyFeatures,
  type StrategyState as BaseStrategyState,
  type StrategyWeights,
} from './strategy-v12'

export { BASE_STRATEGY, makeDecision, socialStrategyScore, toyStrategyScore }
export type { DecisionCandidate, DecisionKind, DecisionTrace, StrategyFeatures, StrategyWeights }

export type ContextExperience={
  key:string
  label:string
  actor:string
  kind:DecisionKind
  features:StrategyFeatures
  reward:number
  at:number
}
export type ContextEstimate={value:number;confidence:number;supported:boolean;neighbors:number;avgDistance:number}
export type ContextShadowSample={
  id:string
  championKey:string
  championLabel:string
  challengerKey:string
  challengerLabel:string
  agreed:boolean
  supported:boolean
  actualReward:number
  estimatedReward:number
  estimatedGain:number
  confidence:number
  neighbors:number
  avgDistance:number
  at:number
}
export type ContextResult={
  status:'idle'|'shadowing'|'promoted'|'rejected'
  evaluated:number
  agreements:number
  divergences:number
  supportedDivergences:number
  avgEstimatedGain:number
  avgConfidence:number
  reason:string
  at:number
}
export type ContextState={experiences:ContextExperience[];samples:ContextShadowSample[];last:ContextResult}
export type StrategyState=BaseStrategyState&{contextual:ContextState}

const MAX_EXPERIENCES=120
const SHADOW_EVERY=10
const MIN_NEIGHBORS=2
const MAX_NEIGHBORS=5
const MAX_DISTANCE=.58
const MIN_CONTEXT_DIVERGENCES=2
const MIN_SUPPORTED_DIVERGENCES=2
const MIN_CONTEXT_GAIN=.01
const MIN_CONTEXT_CONFIDENCE=.42
const clamp01=(v:number)=>Math.min(1,Math.max(0,v))
const finite=(v:unknown,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?v:fallback

function blankContext():ContextState{return{
  experiences:[],samples:[],last:{status:'idle',evaluated:0,agreements:0,divergences:0,supportedDivergences:0,avgEstimatedGain:0,avgConfidence:0,reason:'等待 Challenger；上下文近邻只使用真实执行历史',at:Date.now()}
}}

function hydrateContext(raw:unknown):ContextState{
  const out=blankContext(),r=raw as Partial<ContextState>|null|undefined
  if(!r||typeof r!=='object')return out
  if(Array.isArray(r.experiences))out.experiences=r.experiences.filter(x=>x&&typeof x.key==='string'&&Number.isFinite(x.reward)).slice(-MAX_EXPERIENCES).map(x=>({...x,features:{...(x.features??{})},reward:clamp01(x.reward)}))
  if(Array.isArray(r.samples))out.samples=r.samples.filter(Boolean).slice(-SHADOW_EVERY).map(x=>({...x}))
  if(r.last&&typeof r.last==='object')out.last={...out.last,...r.last}
  return out
}

export function createStrategy(raw?:Partial<StrategyState>|null):StrategyState{
  const base=createBaseStrategy(raw as Partial<BaseStrategyState>|null) as StrategyState
  base.contextual=hydrateContext(raw?.contextual)
  return base
}
export function bindStrategyForInference(s:StrategyState){bindBaseStrategy(s);return s}

const toyKeys:Array<keyof StrategyFeatures>=['play','curiosity','preference','satisfaction','novelty','repeat']
const socialKeys:Array<keyof StrategyFeatures>=['social','play','preference','satisfaction','repeat','isTag']
const restKeys:Array<keyof StrategyFeatures>=['rest']
function featureKeys(kind:DecisionKind){return kind==='toy'?toyKeys:kind==='social'?socialKeys:restKeys}
function featureDistance(a:StrategyFeatures,b:StrategyFeatures,kind:DecisionKind){
  const keys=featureKeys(kind);let total=0,weight=0
  for(const k of keys){const av=finite(a[k],0),bv=finite(b[k],0),w=k==='preference'||k==='satisfaction'?1.15:k==='repeat'?1.05:1;total+=(av-bv)*(av-bv)*w;weight+=w}
  return Math.sqrt(total/Math.max(.001,weight))
}
function sameContextDomain(e:ContextExperience,c:DecisionCandidate){return e.key===c.key&&e.kind===c.kind&&(c.kind==='social'||e.actor===c.actor)}
function estimateContextual(s:StrategyState,c:DecisionCandidate):ContextEstimate{
  const matches=s.contextual.experiences.filter(e=>sameContextDomain(e,c)).map(e=>({e,d:featureDistance(e.features,c.features,c.kind)})).filter(x=>x.d<=MAX_DISTANCE).sort((a,b)=>a.d-b.d).slice(0,MAX_NEIGHBORS)
  if(matches.length<MIN_NEIGHBORS)return{value:s.avgReward,confidence:0,supported:false,neighbors:matches.length,avgDistance:matches.length?matches.reduce((a,b)=>a+b.d,0)/matches.length:1}
  let weighted=0,totalWeight=0,dist=0
  for(const m of matches){const w=1/Math.max(.08,m.d+.06);weighted+=m.e.reward*w;totalWeight+=w;dist+=m.d}
  const local=weighted/Math.max(.001,totalWeight),avgDistance=dist/matches.length,shrink=Math.min(.82,.45+matches.length*.07),value=local*shrink+s.avgReward*(1-shrink),countConfidence=Math.min(1,matches.length/MAX_NEIGHBORS),distanceConfidence=clamp01(1-avgDistance/MAX_DISTANCE),confidence=countConfidence*.55+distanceConfidence*.45
  return{value:clamp01(value),confidence,supported:true,neighbors:matches.length,avgDistance}
}

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

function willSettle(t:DecisionTrace|undefined|null){return Boolean(t&&!t.settled&&t.rewards.length+1>=t.participants)}
function finalReward(t:DecisionTrace,reward:number){const values=[...t.rewards,clamp01(reward)];return values.reduce((a,b)=>a+b,0)/Math.max(1,values.length)}
function pushExperience(s:StrategyState,t:DecisionTrace,reward:number){
  s.contextual.experiences.push({key:t.key,label:t.label,actor:t.actor,kind:t.kind,features:{...t.features},reward,at:Date.now()})
  s.contextual.experiences=s.contextual.experiences.slice(-MAX_EXPERIENCES)
}
function collectContextShadow(s:StrategyState,t:DecisionTrace,reward:number,challenger:StrategyWeights){
  const candidates=Array.isArray(t.candidates)&&t.candidates.length?t.candidates:[{kind:t.kind,actor:t.actor,key:t.key,label:t.label,features:{...t.features},championScore:t.score}]
  const choice=challengerChoice(challenger,candidates),agreed=!choice||choice.key===t.key
  const est=agreed?{value:reward,confidence:1,supported:true,neighbors:0,avgDistance:0}:estimateContextual(s,choice)
  s.contextual.samples.push({id:t.id,championKey:t.key,championLabel:t.label,challengerKey:choice?.key??t.key,challengerLabel:choice?.label??t.label,agreed,supported:agreed||est.supported,actualReward:reward,estimatedReward:est.value,estimatedGain:agreed?0:est.value-reward,confidence:est.confidence,neighbors:est.neighbors,avgDistance:est.avgDistance,at:Date.now()})
  s.contextual.samples=s.contextual.samples.slice(-SHADOW_EVERY)
  const samples=s.contextual.samples,agreements=samples.filter(x=>x.agreed).length,divergences=samples.length-agreements,supported=samples.filter(x=>!x.agreed&&x.supported),supportedCount=supported.length,totalConfidence=supported.reduce((a,b)=>a+b.confidence,0),avgGain=supportedCount?supported.reduce((a,b)=>a+b.estimatedGain*b.confidence,0)/Math.max(.001,totalConfidence):0,avgConfidence=supportedCount?totalConfidence/supportedCount:0
  s.contextual.last={status:'shadowing',evaluated:samples.length,agreements,divergences,supportedDivergences:supportedCount,avgEstimatedGain:avgGain,avgConfidence,reason:`上下文影子 ${samples.length}/${SHADOW_EVERY} · 一致 ${agreements} · 分歧 ${divergences} · 近邻支持 ${supportedCount}`,at:Date.now()}
}
function contextGate(s:StrategyState){
  const d=s.contextual.last
  if(d.divergences<MIN_CONTEXT_DIVERGENCES)return{pass:false,reason:`Top-1 分歧不足 ${d.divergences}/${MIN_CONTEXT_DIVERGENCES}`}
  if(d.supportedDivergences<MIN_SUPPORTED_DIVERGENCES)return{pass:false,reason:`相似状态近邻证据不足 ${d.supportedDivergences}/${MIN_SUPPORTED_DIVERGENCES}`}
  if(d.avgConfidence<MIN_CONTEXT_CONFIDENCE)return{pass:false,reason:`近邻证据置信度不足 ${(d.avgConfidence*100).toFixed(0)}%`}
  if(d.avgEstimatedGain<=MIN_CONTEXT_GAIN)return{pass:false,reason:`上下文反事实增益不足 ${(d.avgEstimatedGain*100).toFixed(2)}%`}
  return{pass:true,reason:`相似状态反事实通过：平均估计增益 ${(d.avgEstimatedGain*100).toFixed(2)}%，置信度 ${(d.avgConfidence*100).toFixed(0)}%`}
}

export function reportDecisionReward(s:StrategyState,t:DecisionTrace|undefined|null,reward:number){
  const settling=willSettle(t),final=settling&&t?finalReward(t,reward):0,beforeChallenger=s.shadow.challenger?{...s.shadow.challenger}:null,beforeWeights={...s.weights},beforeUpdates=s.updates,beforePromoted=s.shadow.promoted,beforeRejected=s.shadow.rejected
  if(settling&&t&&beforeChallenger)collectContextShadow(s,t,final,beforeChallenger)
  const changed=reportBaseReward(s,t,reward)
  const launched=!beforeChallenger&&Boolean(s.shadow.challenger)
  if(launched){s.contextual.samples=[];s.contextual.last={status:'shadowing',evaluated:0,agreements:0,divergences:0,supportedDivergences:0,avgEstimatedGain:0,avgConfidence:0,reason:`Challenger #${s.shadow.sourceCycle} 开始上下文近邻影子`,at:Date.now()}}
  const basePromoted=Boolean(beforeChallenger)&&!s.shadow.challenger&&s.shadow.last.status==='promoted'
  if(basePromoted){const gate=contextGate(s);if(!gate.pass){s.weights=beforeWeights;s.updates=beforeUpdates;s.shadow.promoted=beforePromoted;s.shadow.rejected=beforeRejected+1;s.shadow.last={...s.shadow.last,status:'rejected',reason:`V13 上下文门否决：${gate.reason}`};s.decisionShadow.last={...s.decisionShadow.last,status:'rejected',reason:`V13 上下文门否决：${gate.reason}`};s.contextual.last={...s.contextual.last,status:'rejected',reason:`已恢复原 Champion：${gate.reason}`};s.lastDecision=`Challenger #${s.shadow.sourceCycle} 被上下文近邻门否决，恢复原 Champion`}else s.contextual.last={...s.contextual.last,status:'promoted',reason:gate.reason}}
  else if(Boolean(beforeChallenger)&&!s.shadow.challenger&&s.shadow.last.status==='rejected')s.contextual.last={...s.contextual.last,status:'rejected',reason:`基础双影子已拒绝：${s.shadow.last.reason}`}
  if(settling&&t)pushExperience(s,t,final)
  return basePromoted?s.contextual.last.status==='promoted':changed
}

export function strategySummary(s:StrategyState){const base=baseSummary(s),c=s.contextual.last;return{...base,contextual:`上下文影子：一致${c.agreements} / 分歧${c.divergences} / 近邻支持${c.supportedDivergences} · 增益 ${(c.avgEstimatedGain*100).toFixed(2)}% · 置信 ${(c.avgConfidence*100).toFixed(0)}%`}}
