import {
  bindStrategyForInference as bindV13,
  createStrategy as createV13,
  makeDecision,
  reportDecisionReward as reportV13,
  socialStrategyScore,
  strategySummary as summaryV13,
  toyStrategyScore,
  type DecisionCandidate,
  type DecisionKind,
  type DecisionTrace,
  type StrategyFeatures,
  type StrategyState as V13StrategyState,
  type StrategyWeights,
} from './strategy-v13'

export {makeDecision,socialStrategyScore,toyStrategyScore}
export type {DecisionCandidate,DecisionKind,DecisionTrace,StrategyFeatures,StrategyWeights}

export type TrajectoryExperience={
  id:string
  key:string
  label:string
  actor:string
  kind:DecisionKind
  features:StrategyFeatures
  reward:number
  future1?:number
  future2?:number
  decisionAt:number
  completedAt:number
}
export type TrajectoryPending={
  id:string
  championKey:string
  championLabel:string
  challenger:DecisionCandidate|null
  agreed:boolean
  at:number
}
export type TrajectorySample={
  id:string
  championKey:string
  championLabel:string
  challengerKey:string
  challengerLabel:string
  agreed:boolean
  supported:boolean
  championReturn:number
  challengerEstimatedReturn:number
  estimatedGain:number
  confidence:number
  neighbors:number
  avgDistance:number
  at:number
}
export type TrajectoryResult={
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
export type WorldModelState={
  experiences:TrajectoryExperience[]
  pending:TrajectoryPending[]
  samples:TrajectorySample[]
  last:TrajectoryResult
}
export type StrategyState=V13StrategyState&{worldModel:WorldModelState}

const GAMMA=.7
const RETURN_SCALE=1+GAMMA+GAMMA*GAMMA
const MAX_EXPERIENCES=180
const MAX_PENDING=12
const MAX_SAMPLES=10
const MIN_NEIGHBORS=2
const MAX_NEIGHBORS=5
const MAX_DISTANCE=.52
const MIN_EVALUATED=6
const MIN_DIVERGENCES=2
const MIN_SUPPORTED_DIVERGENCES=2
const MIN_GAIN=.015
const MIN_CONFIDENCE=.44
const MAX_LINK_GAP_MS=28000
const clamp01=(v:number)=>Math.min(1,Math.max(0,v))
const finite=(v:unknown,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?v:fallback

function blankWorldModel():WorldModelState{return{
  experiences:[],pending:[],samples:[],last:{status:'idle',evaluated:0,agreements:0,divergences:0,supportedDivergences:0,avgEstimatedGain:0,avgConfidence:0,reason:'等待真实短轨迹；V14 只学习真实连续决策，不凭空模拟未来',at:Date.now()}
}}
function hydrateWorldModel(raw:unknown):WorldModelState{
  const out=blankWorldModel(),r=raw as Partial<WorldModelState>|null|undefined
  if(!r||typeof r!=='object')return out
  if(Array.isArray(r.experiences))out.experiences=r.experiences.filter(x=>x&&typeof x.id==='string'&&Number.isFinite(x.reward)).slice(-MAX_EXPERIENCES).map(x=>({...x,features:{...(x.features??{})},reward:clamp01(x.reward),future1:Number.isFinite(x.future1)?clamp01(x.future1!):undefined,future2:Number.isFinite(x.future2)?clamp01(x.future2!):undefined}))
  if(Array.isArray(r.pending))out.pending=r.pending.filter(Boolean).slice(-MAX_PENDING).map(x=>({...x,challenger:x.challenger?{...x.challenger,features:{...(x.challenger.features??{})}}:null}))
  if(Array.isArray(r.samples))out.samples=r.samples.filter(Boolean).slice(-MAX_SAMPLES).map(x=>({...x}))
  if(r.last&&typeof r.last==='object')out.last={...out.last,...r.last}
  return out
}

export function createStrategy(raw?:Partial<StrategyState>|null):StrategyState{
  const s=createV13(raw as Partial<V13StrategyState>|null) as StrategyState
  s.worldModel=hydrateWorldModel(raw?.worldModel)
  return s
}
export function bindStrategyForInference(s:StrategyState){bindV13(s);return s}

const toyKeys:Array<keyof StrategyFeatures>=['play','curiosity','preference','satisfaction','novelty','repeat']
const socialKeys:Array<keyof StrategyFeatures>=['social','play','preference','satisfaction','repeat','isTag']
const restKeys:Array<keyof StrategyFeatures>=['rest']
function featureKeys(kind:DecisionKind){return kind==='toy'?toyKeys:kind==='social'?socialKeys:restKeys}
function featureDistance(a:StrategyFeatures,b:StrategyFeatures,kind:DecisionKind){
  const keys=featureKeys(kind);let total=0,weight=0
  for(const k of keys){const av=finite(a[k],0),bv=finite(b[k],0),w=k==='preference'||k==='satisfaction'?1.2:k==='repeat'?1.08:1;total+=(av-bv)*(av-bv)*w;weight+=w}
  return Math.sqrt(total/Math.max(.001,weight))
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
function trajectoryReturn(e:TrajectoryExperience){if(!Number.isFinite(e.future1)||!Number.isFinite(e.future2))return null;return e.reward+GAMMA*e.future1!+GAMMA*GAMMA*e.future2!}
function sameDomain(e:TrajectoryExperience,c:DecisionCandidate){return e.key===c.key&&e.kind===c.kind&&(c.kind==='social'||e.actor===c.actor)}
function estimateTrajectory(s:StrategyState,c:DecisionCandidate,excludeId:string){
  const matches=s.worldModel.experiences.filter(e=>e.id!==excludeId&&sameDomain(e,c)&&trajectoryReturn(e)!==null).map(e=>({e,d:featureDistance(e.features,c.features,c.kind),ret:trajectoryReturn(e)!})).filter(x=>x.d<=MAX_DISTANCE).sort((a,b)=>a.d-b.d).slice(0,MAX_NEIGHBORS)
  if(matches.length<MIN_NEIGHBORS)return{value:0,confidence:0,supported:false,neighbors:matches.length,avgDistance:matches.length?matches.reduce((a,b)=>a+b.d,0)/matches.length:1}
  let weighted=0,totalWeight=0,dist=0
  for(const m of matches){const w=1/Math.max(.07,m.d+.05);weighted+=m.ret*w;totalWeight+=w;dist+=m.d}
  const local=weighted/Math.max(.001,totalWeight),avgDistance=dist/matches.length,countConfidence=Math.min(1,matches.length/MAX_NEIGHBORS),distanceConfidence=clamp01(1-avgDistance/MAX_DISTANCE),confidence=countConfidence*.58+distanceConfidence*.42
  return{value:local,confidence,supported:true,neighbors:matches.length,avgDistance}
}
function linkFutureRewards(s:StrategyState,reward:number,decisionAt:number){
  const e=s.worldModel.experiences
  const prev1=e[e.length-1],prev2=e[e.length-2]
  if(prev1&&decisionAt-prev1.decisionAt<=MAX_LINK_GAP_MS&&!Number.isFinite(prev1.future1))prev1.future1=reward
  if(prev2&&decisionAt-prev2.decisionAt<=MAX_LINK_GAP_MS&&!Number.isFinite(prev2.future2))prev2.future2=reward
}
function pushExperience(s:StrategyState,t:DecisionTrace,reward:number){
  linkFutureRewards(s,reward,t.createdAt)
  s.worldModel.experiences.push({id:t.id,key:t.key,label:t.label,actor:t.actor,kind:t.kind,features:{...t.features},reward,decisionAt:t.createdAt,completedAt:Date.now()})
  s.worldModel.experiences=s.worldModel.experiences.slice(-MAX_EXPERIENCES)
}
function pushPending(s:StrategyState,t:DecisionTrace,challenger:StrategyWeights){
  const candidates=Array.isArray(t.candidates)&&t.candidates.length?t.candidates:[{kind:t.kind,actor:t.actor,key:t.key,label:t.label,features:{...t.features},championScore:t.score}]
  const choice=challengerChoice(challenger,candidates),agreed=!choice||choice.key===t.key
  s.worldModel.pending.push({id:t.id,championKey:t.key,championLabel:t.label,challenger:choice?{...choice,features:{...choice.features}}:null,agreed,at:Date.now()})
  s.worldModel.pending=s.worldModel.pending.slice(-MAX_PENDING)
}
function refreshResult(s:StrategyState){
  const samples=s.worldModel.samples,agreements=samples.filter(x=>x.agreed).length,divergences=samples.length-agreements,supported=samples.filter(x=>!x.agreed&&x.supported),supportedCount=supported.length,totalConfidence=supported.reduce((a,b)=>a+b.confidence,0),avgGain=supportedCount?supported.reduce((a,b)=>a+b.estimatedGain*b.confidence,0)/Math.max(.001,totalConfidence):0,avgConfidence=supportedCount?totalConfidence/supportedCount:0
  s.worldModel.last={status:'shadowing',evaluated:samples.length,agreements,divergences,supportedDivergences:supportedCount,avgEstimatedGain:avgGain,avgConfidence,reason:`3步轨迹影子 ${samples.length}/${MAX_SAMPLES} · 一致 ${agreements} · 分歧 ${divergences} · 轨迹支持 ${supportedCount}`,at:Date.now()}
}
function resolvePending(s:StrategyState){
  const remaining:TrajectoryPending[]=[]
  for(const p of s.worldModel.pending){
    const champion=s.worldModel.experiences.find(e=>e.id===p.id),championReturn=champion?trajectoryReturn(champion):null
    if(!champion||championReturn===null){remaining.push(p);continue}
    if(p.agreed||!p.challenger){s.worldModel.samples.push({id:p.id,championKey:p.championKey,championLabel:p.championLabel,challengerKey:p.challenger?.key??p.championKey,challengerLabel:p.challenger?.label??p.championLabel,agreed:true,supported:true,championReturn,challengerEstimatedReturn:championReturn,estimatedGain:0,confidence:1,neighbors:0,avgDistance:0,at:Date.now()});continue}
    const est=estimateTrajectory(s,p.challenger,p.id),gain=est.supported?(est.value-championReturn)/RETURN_SCALE:0
    s.worldModel.samples.push({id:p.id,championKey:p.championKey,championLabel:p.championLabel,challengerKey:p.challenger.key,challengerLabel:p.challenger.label,agreed:false,supported:est.supported,championReturn,challengerEstimatedReturn:est.value,estimatedGain:gain,confidence:est.confidence,neighbors:est.neighbors,avgDistance:est.avgDistance,at:Date.now()})
  }
  s.worldModel.pending=remaining.slice(-MAX_PENDING);s.worldModel.samples=s.worldModel.samples.slice(-MAX_SAMPLES);refreshResult(s)
}
function worldGate(s:StrategyState){
  const d=s.worldModel.last
  if(d.evaluated<MIN_EVALUATED)return{pass:false,reason:`完整3步轨迹不足 ${d.evaluated}/${MIN_EVALUATED}`}
  if(d.divergences<MIN_DIVERGENCES)return{pass:false,reason:`短轨迹 Top-1 分歧不足 ${d.divergences}/${MIN_DIVERGENCES}`}
  if(d.supportedDivergences<MIN_SUPPORTED_DIVERGENCES)return{pass:false,reason:`相似历史轨迹证据不足 ${d.supportedDivergences}/${MIN_SUPPORTED_DIVERGENCES}`}
  if(d.avgConfidence<MIN_CONFIDENCE)return{pass:false,reason:`轨迹近邻置信度不足 ${(d.avgConfidence*100).toFixed(0)}%`}
  if(d.avgEstimatedGain<=MIN_GAIN)return{pass:false,reason:`3步折扣回报增益不足 ${(d.avgEstimatedGain*100).toFixed(2)}%`}
  return{pass:true,reason:`3步经验世界模型通过：折扣轨迹增益 ${(d.avgEstimatedGain*100).toFixed(2)}%，置信 ${(d.avgConfidence*100).toFixed(0)}%`}
}

export function reportDecisionReward(s:StrategyState,t:DecisionTrace|undefined|null,reward:number){
  const settling=willSettle(t),final=settling&&t?finalReward(t,reward):0,beforeChallenger=s.shadow.challenger?{...s.shadow.challenger}:null,beforeWeights={...s.weights},beforeUpdates=s.updates,beforePromoted=s.shadow.promoted,beforeRejected=s.shadow.rejected
  if(settling&&t){if(beforeChallenger)pushPending(s,t,beforeChallenger);pushExperience(s,t,final);resolvePending(s)}
  const changed=reportV13(s,t,reward)
  const launched=!beforeChallenger&&Boolean(s.shadow.challenger)
  if(launched){s.worldModel.pending=[];s.worldModel.samples=[];s.worldModel.last={status:'shadowing',evaluated:0,agreements:0,divergences:0,supportedDivergences:0,avgEstimatedGain:0,avgConfidence:0,reason:`Challenger #${s.shadow.sourceCycle} 开始3步轨迹影子`,at:Date.now()}}
  const v13Promoted=Boolean(beforeChallenger)&&!s.shadow.challenger&&s.shadow.last.status==='promoted'
  if(v13Promoted){const gate=worldGate(s);if(!gate.pass){s.weights=beforeWeights;s.updates=beforeUpdates;s.shadow.promoted=beforePromoted;s.shadow.rejected=beforeRejected+1;s.shadow.last={...s.shadow.last,status:'rejected',reason:`V14 世界模型门否决：${gate.reason}`};s.decisionShadow.last={...s.decisionShadow.last,status:'rejected',reason:`V14 世界模型门否决：${gate.reason}`};s.contextual.last={...s.contextual.last,status:'rejected',reason:`V14 世界模型门否决：${gate.reason}`};s.worldModel.last={...s.worldModel.last,status:'rejected',reason:`已恢复原 Champion：${gate.reason}`};s.lastDecision=`Challenger #${s.shadow.sourceCycle} 被3步世界模型门否决，恢复原 Champion`}else s.worldModel.last={...s.worldModel.last,status:'promoted',reason:gate.reason}}
  else if(Boolean(beforeChallenger)&&!s.shadow.challenger&&s.shadow.last.status==='rejected')s.worldModel.last={...s.worldModel.last,status:'rejected',reason:`前置影子门已拒绝：${s.shadow.last.reason}`}
  return v13Promoted?s.worldModel.last.status==='promoted':changed
}

export function strategySummary(s:StrategyState){const base=summaryV13(s),w=s.worldModel.last;return{...base,worldModel:`3步世界模型：一致${w.agreements} / 分歧${w.divergences} / 轨迹支持${w.supportedDivergences} · 增益 ${(w.avgEstimatedGain*100).toFixed(2)}% · 置信 ${(w.avgConfidence*100).toFixed(0)}%`}}
