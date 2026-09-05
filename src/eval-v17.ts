import {
  createStrategy,
  reportDecisionReward,
  socialStrategyScore,
  toyStrategyScore,
  type DecisionCandidate,
  type DecisionKind,
  type DecisionTrace,
  type StrategyFeatures,
  type StrategyState,
  type StrategyWeights,
} from './strategy-v16'

export type EvalCheck={name:string;pass:boolean;detail:string}
export type LongRunSummary={seed:number;rounds:number;firstAvg:number;lastAvg:number;delta:number;reflectionCycles:number;reflectionAccepted:number;reflectionRejected:number;shadowPromoted:number;shadowRejected:number;versions:number;currentVersion:number;rollbacks:number;transitionCount:number;trajectoryCount:number;contextCount:number;actionDigest:string}
export type V17EvaluationReport={version:'V17';seed:number;rounds:number;passed:boolean;checks:EvalCheck[];longRun:LongRunSummary;repeatRun:LongRunSummary;generatedAt:string}

const clamp01=(v:number)=>Math.min(1,Math.max(0,v))
function mulberry32(seed:number){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function avg(xs:number[]){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0}
function sameWeights(a:StrategyWeights,b:StrategyWeights){return(Object.keys(a)as Array<keyof StrategyWeights>).every(k=>Math.abs(a[k]-b[k])<1e-9)}
function trace(id:string,kind:DecisionKind,actor:string,key:string,label:string,features:StrategyFeatures,score:number,candidates:DecisionCandidate[],createdAt:number):DecisionTrace{return{id,kind,actor,key,label,features,score,candidates,reason:'V17 deterministic evaluation',participants:1,rewards:[],createdAt,settled:false}}

function candidateGenerationCheck():EvalCheck{
  const s=createStrategy(),createdAt=1_000_000
  const toy:StrategyFeatures={play:.7,curiosity:.6,preference:.5,satisfaction:.4,novelty:.5,repeat:.7}
  const social:StrategyFeatures={social:.7,play:.5,preference:.5,satisfaction:.4,repeat:.5,isTag:1}
  const pattern:DecisionKind[]=['toy','social','social','toy','toy','social','social','toy']
  pattern.forEach((kind,i)=>{
    const f=kind==='toy'?toy:social,key=kind==='toy'?'music':'social:tag',label=kind==='toy'?'木琴':'追逐'
    const c:DecisionCandidate={kind,actor:kind==='social'?'双人':'陶陶',key,label,features:{...f},championScore:42}
    reportDecisionReward(s,trace(`candidate-${i}`,kind,c.actor,key,label,f,42,[c],createdAt+i*1000),.95)
  })
  const launched=Boolean(s.shadow.challenger)||s.reflection.accepted>0
  return{name:'真实反思可生成 Challenger',pass:launched,detail:`cycles=${s.reflection.cycles}, accepted=${s.reflection.accepted}, challenger=${Boolean(s.shadow.challenger)}`}
}

function observingState(baseline:number):StrategyState{
  const s=createStrategy(),v1=s.policyRegistry.versions[0],v2Weights={...s.weights,toyPlay:s.weights.toyPlay+1}
  s.weights={...v2Weights}
  s.policyRegistry.currentVersion=2
  s.policyRegistry.versions.push({version:2,weights:{...v2Weights},status:'observing',sourceCycle:1,promotedAt:Date.now(),stableAt:null,baselineReward:baseline,observedReward:0,observedSamples:0,metrics:{offlineImprovement:.02,valueImprovement:.02,challengerWins:7,decisionGain:.02,contextGain:.02,trajectoryGain:.02,transitionGain:.02,transitionConfidence:.7},note:'V17 observing fixture'})
  s.policyRegistry.observation={rewards:[],kinds:[],startedAt:Date.now()}
  s.policyRegistry.last={status:'observing',currentVersion:2,fallbackVersion:v1.version,samples:0,avgReward:0,baselineReward:baseline,delta:0,kinds:0,reason:'V17 fixture',at:Date.now()}
  return s
}
function feedObservation(s:StrategyState,rewards:number[]){const base=2_000_000;rewards.forEach((reward,i)=>{const kind:DecisionKind=i%3===0?'social':'toy',f:StrategyFeatures=kind==='toy'?{play:.6,curiosity:.5,preference:.5,satisfaction:.5,novelty:.5,repeat:.2}:{social:.6,play:.5,preference:.5,satisfaction:.5,repeat:.2,isTag:i%2};const c:DecisionCandidate={kind,actor:kind==='social'?'双人':'沫沫',key:kind==='toy'?'books':'social:wave',label:kind==='toy'?'绘本':'招手',features:{...f},championScore:50};reportDecisionReward(s,trace(`observe-${i}`,kind,c.actor,c.key,c.label,f,50,[c],base+i*1000),reward)})}
function stableCheck():EvalCheck{const s=observingState(.70);feedObservation(s,[.72,.69,.71,.73,.68,.72,.70,.71,.69,.72,.70,.71]);const v=s.policyRegistry.versions.find(x=>x.version===2);const pass=s.policyRegistry.currentVersion===2&&v?.status==='stable'&&!s.policyRegistry.observation;return{name:'新 Champion 观察期可稳定',pass,detail:`current=v${s.policyRegistry.currentVersion}, status=${v?.status}, avg=${v?.observedReward.toFixed(3)}`}}
function rollbackCheck():EvalCheck{const s=observingState(.70),fallback={...s.policyRegistry.versions[0].weights};feedObservation(s,[.60,.61,.59,.62,.58,.60,.61,.59,.60,.62,.58,.60]);const v2=s.policyRegistry.versions.find(x=>x.version===2);const pass=s.policyRegistry.currentVersion===1&&v2?.status==='rolled_back'&&s.policyRegistry.rollbacks===1&&sameWeights(s.weights,fallback);return{name:'退化 Champion 可自动回滚',pass,detail:`current=v${s.policyRegistry.currentVersion}, v2=${v2?.status}, rollbacks=${s.policyRegistry.rollbacks}`}}

function chooseToy(s:StrategyState,actor:string,round:number,rng:()=>number){const defs=[['music','木琴'],['books','绘本'],['train','小火车'],['jelly','果冻']] as const;const candidates=defs.map(([key,label],i)=>{const f={play:clamp01(.42+rng()*.45),curiosity:clamp01(.35+rng()*.5),preference:clamp01(.3+rng()*.55),satisfaction:clamp01(.35+rng()*.5),novelty:clamp01(.3+rng()*.6),repeat:clamp01((round+i)%5===0?.65:rng()*.35)};return{kind:'toy' as const,actor,key,label,features:f,championScore:toyStrategyScore(s,f)}});return candidates.sort((a,b)=>b.championScore-a.championScore)}
function chooseSocial(s:StrategyState,rng:()=>number){const defs=[['social:pass','传球',0],['social:tag','追逐',1],['social:wave','招手',0]] as const;const candidates=defs.map(([key,label,isTag])=>{const f={social:clamp01(.4+rng()*.5),play:clamp01(.35+rng()*.5),preference:clamp01(.3+rng()*.55),satisfaction:clamp01(.35+rng()*.5),repeat:clamp01(rng()*.35),isTag};return{kind:'social' as const,actor:'双人',key,label,features:f,championScore:socialStrategyScore(s,f)}});return candidates.sort((a,b)=>b.championScore-a.championScore)}
function oracleReward(c:DecisionCandidate,rng:()=>number){const f=c.features;let v=.32;if(c.kind==='toy'){v+=.22*(f.play??0)+.18*(f.curiosity??0)+.12*(f.preference??0)+.08*(f.novelty??0)-.13*(f.repeat??0);if(c.key==='music')v+=.025;if(c.key==='books')v+=.015}else if(c.kind==='social'){v+=.25*(f.social??0)+.13*(f.play??0)+.1*(f.preference??0)-.12*(f.repeat??0)+.025*(f.isTag??0)}else v=.28+.58*(f.rest??0);v+=(rng()-.5)*.04;return clamp01(v)}
function digest(actions:string[]){let h=2166136261>>>0;for(const text of actions){for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}}return h.toString(16).padStart(8,'0')}

export function runSeededLongEvaluation(seed=17017,rounds=240):LongRunSummary{
  const rng=mulberry32(seed),s=createStrategy(),rewards:number[]=[],actions:string[]=[],start=3_000_000
  for(let i=0;i<rounds;i++){
    const actor=i%2?'沫沫':'陶陶',mode=i%7===5?'rest':i%3===1?'social':'toy'
    let candidates:DecisionCandidate[],chosen:DecisionCandidate
    if(mode==='toy'){candidates=chooseToy(s,actor,i,rng);chosen=candidates[0]}
    else if(mode==='social'){candidates=chooseSocial(s,rng);chosen=candidates[0]}
    else{const f={rest:clamp01(.5+rng()*.45)},c={kind:'rest' as const,actor,key:'rest',label:'休息',features:f,championScore:(f.rest??0)*100};candidates=[c];chosen=c}
    const reward=oracleReward(chosen,rng),t=trace(`long-${seed}-${i}`,chosen.kind,chosen.actor,chosen.key,chosen.label,chosen.features,chosen.championScore,candidates,start+i*1000)
    reportDecisionReward(s,t,reward);rewards.push(reward);actions.push(`${chosen.kind}:${chosen.key}`)
  }
  const window=Math.min(50,Math.floor(rounds/3)),firstAvg=avg(rewards.slice(0,window)),lastAvg=avg(rewards.slice(-window))
  return{seed,rounds,firstAvg,lastAvg,delta:lastAvg-firstAvg,reflectionCycles:s.reflection.cycles,reflectionAccepted:s.reflection.accepted,reflectionRejected:s.reflection.rejected,shadowPromoted:s.shadow.promoted,shadowRejected:s.shadow.rejected,versions:s.policyRegistry.versions.length,currentVersion:s.policyRegistry.currentVersion,rollbacks:s.policyRegistry.rollbacks,transitionCount:s.transitionModel.transitions.length,trajectoryCount:s.worldModel.experiences.length,contextCount:s.contextual.experiences.length,actionDigest:digest(actions)}
}

export function runV17Evaluation(seed=17017,rounds=240):V17EvaluationReport{
  const checks=[candidateGenerationCheck(),stableCheck(),rollbackCheck()],longRun=runSeededLongEvaluation(seed,rounds),repeatRun=runSeededLongEvaluation(seed,rounds)
  const deterministic=longRun.actionDigest===repeatRun.actionDigest&&Math.abs(longRun.firstAvg-repeatRun.firstAvg)<1e-12&&Math.abs(longRun.lastAvg-repeatRun.lastAvg)<1e-12
  checks.push({name:'固定随机种子可重复',pass:deterministic,detail:`digest=${longRun.actionDigest}/${repeatRun.actionDigest}, delta=${longRun.delta.toFixed(4)}`})
  checks.push({name:'长跑真实经验链持续积累',pass:longRun.transitionCount>20&&longRun.trajectoryCount>20&&longRun.contextCount>20,detail:`transition=${longRun.transitionCount}, trajectory=${longRun.trajectoryCount}, context=${longRun.contextCount}`})
  return{version:'V17',seed,rounds,passed:checks.every(x=>x.pass),checks,longRun,repeatRun,generatedAt:new Date().toISOString()}
}
