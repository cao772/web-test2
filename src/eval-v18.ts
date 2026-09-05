import {
  createStrategy,
  reportDecisionReward,
  socialStrategyScore,
  toyStrategyScore,
  type DecisionCandidate,
  type DecisionKind,
  type DecisionTrace,
  type StrategyFeatures,
  type StrategyWeights,
} from './strategy-v16'
import {runV17Evaluation,type V17EvaluationReport} from './eval-v17'

export type RejectionBucket='accepted'|'batch_kind_coverage'|'heldout_kind_coverage'|'unchanged_candidate'|'insufficient_improvement'|'other'
export type RejectionBreakdown=Record<RejectionBucket,number>
export type SweepConfig={window:number;scale:number;threshold:number}
export type SweepResult=SweepConfig&{
  windows:number
  accepted:number
  safeAccepted:number
  unsafeAccepted:number
  acceptanceRate:number
  avgEvalImprovement:number
  avgFutureImprovement:number
  score:number
}
export type V18Report={
  version:'V18'
  seed:number
  rounds:number
  productionCycles:number
  productionAccepted:number
  rejectionBreakdown:RejectionBreakdown
  topConfigs:SweepResult[]
  recommended:SweepResult|null
  recommendation:string
  productionChanged:boolean
  v17:V17EvaluationReport
  generatedAt:string
}

type OfflineSample={kind:DecisionKind;actor:string;key:string;label:string;features:StrategyFeatures;reward:number;at:number}
const BASE:StrategyWeights={toyPlay:40,toyCuriosity:34,toyPreference:31,toySatisfaction:10,toyNovelty:12,toyRepeat:40,socialNeed:57,socialPlay:30,socialPreference:18,socialSatisfaction:8,socialRepeat:40,socialThreshold:62,restThreshold:67}
const BOUNDS:Record<keyof StrategyWeights,[number,number]>={toyPlay:[20,60],toyCuriosity:[15,55],toyPreference:[12,48],toySatisfaction:[2,24],toyNovelty:[3,24],toyRepeat:[15,60],socialNeed:[30,75],socialPlay:[5,45],socialPreference:[5,35],socialSatisfaction:[1,20],socialRepeat:[15,60],socialThreshold:[50,75],restThreshold:[58,78]}
const clamp01=(v:number)=>Math.min(1,Math.max(0,v))
const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?clamp01(v):0
const clamp=(v:number,[lo,hi]:[number,number])=>Math.min(hi,Math.max(lo,v))
const sigmoid=(x:number)=>1/(1+Math.exp(-x))
function mulberry32(seed:number){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function avg(xs:number[]){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0}
function toyScore(w:StrategyWeights,f:StrategyFeatures){return n(f.play)*w.toyPlay+n(f.curiosity)*w.toyCuriosity+n(f.preference)*w.toyPreference+n(f.satisfaction)*w.toySatisfaction+n(f.novelty)*w.toyNovelty-n(f.repeat)*w.toyRepeat}
function socialScore(w:StrategyWeights,f:StrategyFeatures){return n(f.social)*w.socialNeed+n(f.play)*(n(f.isTag)?w.socialPlay:w.socialPlay*.34)+n(f.preference)*w.socialPreference+n(f.satisfaction)*w.socialSatisfaction-n(f.repeat)*w.socialRepeat}
function predict(w:StrategyWeights,s:OfflineSample){if(s.kind==='toy')return sigmoid((toyScore(w,s.features)-42)/18);if(s.kind==='social')return sigmoid((socialScore(w,s.features)-w.socialThreshold)/13);return sigmoid((n(s.features.rest)*100-w.restThreshold)/7)}
function loss(w:StrategyWeights,samples:OfflineSample[]){if(!samples.length)return 1;let total=0;for(const s of samples){const e=predict(w,s)-s.reward;total+=e*e}let regularize=0;for(const k of Object.keys(BASE)as Array<keyof StrategyWeights>){const span=BOUNDS[k][1]-BOUNDS[k][0],d=(w[k]-BASE[k])/span;regularize+=d*d}return total/samples.length+regularize*.012}
function bounded(w:StrategyWeights,k:keyof StrategyWeights,v:number){w[k]=clamp(v,BOUNDS[k])}
function candidateFrom(current:StrategyWeights,samples:OfflineSample[],cycle:number,scaleMultiplier:number){
  const w={...current},scale=Math.max(.22,.75/Math.sqrt(1+cycle*.35))*scaleMultiplier
  for(const s of samples){const a=s.reward-.55,f=s.features
    if(s.kind==='toy'){
      bounded(w,'toyPlay',w.toyPlay+scale*a*n(f.play));bounded(w,'toyCuriosity',w.toyCuriosity+scale*a*n(f.curiosity));bounded(w,'toyPreference',w.toyPreference+scale*a*n(f.preference));bounded(w,'toySatisfaction',w.toySatisfaction+scale*a*n(f.satisfaction));bounded(w,'toyNovelty',w.toyNovelty+scale*a*n(f.novelty));bounded(w,'toyRepeat',w.toyRepeat-scale*a*n(f.repeat))
    }else if(s.kind==='social'){
      bounded(w,'socialNeed',w.socialNeed+scale*a*n(f.social));bounded(w,'socialPlay',w.socialPlay+scale*a*n(f.play)*(.35+.65*n(f.isTag)));bounded(w,'socialPreference',w.socialPreference+scale*a*n(f.preference));bounded(w,'socialSatisfaction',w.socialSatisfaction+scale*a*n(f.satisfaction));bounded(w,'socialRepeat',w.socialRepeat-scale*a*n(f.repeat));bounded(w,'socialThreshold',w.socialThreshold-scale*a*.45)
    }else bounded(w,'restThreshold',w.restThreshold-scale*a*.6)
  }
  for(const k of Object.keys(BASE)as Array<keyof StrategyWeights>){w[k]+=(BASE[k]-w[k])*.014;bounded(w,k,w[k])}
  return w
}
function changed(a:StrategyWeights,b:StrategyWeights){return(Object.keys(a)as Array<keyof StrategyWeights>).some(k=>Math.abs(a[k]-b[k])>.025)}
function trace(id:string,c:DecisionCandidate,all:DecisionCandidate[],at:number):DecisionTrace{return{id,kind:c.kind,actor:c.actor,key:c.key,label:c.label,score:c.championScore,features:{...c.features},reason:'V18 diagnostics',participants:1,rewards:[],createdAt:at,settled:false,candidates:all.map(x=>({...x,features:{...x.features}}))}}
function chooseToy(s:ReturnType<typeof createStrategy>,actor:string,round:number,rng:()=>number){const defs=[['music','木琴'],['books','绘本'],['train','小火车'],['jelly','果冻']]as const;return defs.map(([key,label],i)=>{const f={play:clamp01(.42+rng()*.45),curiosity:clamp01(.35+rng()*.5),preference:clamp01(.3+rng()*.55),satisfaction:clamp01(.35+rng()*.5),novelty:clamp01(.3+rng()*.6),repeat:clamp01((round+i)%5===0?.65:rng()*.35)};return{kind:'toy' as const,actor,key,label,features:f,championScore:toyStrategyScore(s,f)}}).sort((a,b)=>b.championScore-a.championScore)}
function chooseSocial(s:ReturnType<typeof createStrategy>,rng:()=>number){const defs=[['social:pass','传球',0],['social:tag','追逐',1],['social:wave','招手',0]]as const;return defs.map(([key,label,isTag])=>{const f={social:clamp01(.4+rng()*.5),play:clamp01(.35+rng()*.5),preference:clamp01(.3+rng()*.55),satisfaction:clamp01(.35+rng()*.5),repeat:clamp01(rng()*.35),isTag};return{kind:'social' as const,actor:'双人',key,label,features:f,championScore:socialStrategyScore(s,f)}}).sort((a,b)=>b.championScore-a.championScore)}
function oracleReward(c:DecisionCandidate,rng:()=>number){const f=c.features;let v=.32;if(c.kind==='toy'){v+=.22*n(f.play)+.18*n(f.curiosity)+.12*n(f.preference)+.08*n(f.novelty)-.13*n(f.repeat);if(c.key==='music')v+=.025;if(c.key==='books')v+=.015}else if(c.kind==='social')v+=.25*n(f.social)+.13*n(f.play)+.1*n(f.preference)-.12*n(f.repeat)+.025*n(f.isTag);else v=.28+.58*n(f.rest);v+=(rng()-.5)*.04;return clamp01(v)}
function classifyReason(reason:string):RejectionBucket{if(reason.includes('整批样本类型'))return'batch_kind_coverage';if(reason.includes('留出评估集覆盖'))return'heldout_kind_coverage';if(reason.includes('几乎一致'))return'unchanged_candidate';if(reason.includes('离线留出提升不足'))return'insufficient_improvement';if(reason.includes('进入影子模式'))return'accepted';return'other'}
function blankBreakdown():RejectionBreakdown{return{accepted:0,batch_kind_coverage:0,heldout_kind_coverage:0,unchanged_candidate:0,insufficient_improvement:0,other:0}}

function collect(seed:number,rounds:number){
  const rng=mulberry32(seed),s=createStrategy(),samples:OfflineSample[]=[],breakdown=blankBreakdown(),start=4_000_000;let lastCycle=0
  for(let i=0;i<rounds;i++){
    const actor=i%2?'沫沫':'陶陶',mode=i%7===5?'rest':i%3===1?'social':'toy';let candidates:DecisionCandidate[],chosen:DecisionCandidate
    if(mode==='toy'){candidates=chooseToy(s,actor,i,rng);chosen=candidates[0]}
    else if(mode==='social'){candidates=chooseSocial(s,rng);chosen=candidates[0]}
    else{const f={rest:clamp01(.5+rng()*.45)},c={kind:'rest' as const,actor,key:'rest',label:'休息',features:f,championScore:n(f.rest)*100};candidates=[c];chosen=c}
    const reward=oracleReward(chosen,rng),at=start+i*1000
    samples.push({kind:chosen.kind,actor:chosen.actor,key:chosen.key,label:chosen.label,features:{...chosen.features},reward,at})
    reportDecisionReward(s,trace(`diag-${seed}-${i}`,chosen,candidates,at),reward)
    if(s.reflection.cycles>lastCycle){lastCycle=s.reflection.cycles;breakdown[classifyReason(s.reflection.last.reason)]++}
  }
  return{samples,breakdown,cycles:s.reflection.cycles,accepted:s.reflection.accepted}
}

function evaluateConfig(samples:OfflineSample[],cfg:SweepConfig):SweepResult{
  const stride=Math.max(2,Math.floor(cfg.window/2)),improvements:number[]=[],futureImprovements:number[]=[];let accepted=0,safeAccepted=0,unsafeAccepted=0,windows=0,cycle=0
  for(let start=0;start+cfg.window<=samples.length;start+=stride){
    const batch=samples.slice(start,start+cfg.window),proposal=batch.filter((_,i)=>i%2===0),evaluation=batch.filter((_,i)=>i%2===1),future=samples.slice(start+cfg.window,start+cfg.window+Math.min(8,cfg.window));windows++;cycle++
    const kinds=new Set(batch.map(x=>x.kind)).size,evalKinds=new Set(evaluation.map(x=>x.kind)).size,candidate=candidateFrom(BASE,proposal,cycle,cfg.scale),currentLoss=loss(BASE,evaluation),candidateLoss=loss(candidate,evaluation),improvement=currentLoss-candidateLoss
    if(kinds<2||evalKinds<2||!changed(BASE,candidate)||improvement<=cfg.threshold)continue
    accepted++;improvements.push(improvement)
    if(future.length>=4){const futureImprovement=loss(BASE,future)-loss(candidate,future);futureImprovements.push(futureImprovement);if(futureImprovement>=-.002)safeAccepted++;else unsafeAccepted++}
  }
  const acceptanceRate=windows?accepted/windows:0,avgEvalImprovement=avg(improvements),avgFutureImprovement=avg(futureImprovements),safetyPenalty=unsafeAccepted*2.5,score=safeAccepted*1.4+Math.max(0,avgFutureImprovement)*120+acceptanceRate*3-safetyPenalty
  return{...cfg,windows,accepted,safeAccepted,unsafeAccepted,acceptanceRate,avgEvalImprovement,avgFutureImprovement,score}
}

export function runV18Diagnostics(seed=17017,rounds=240):V18Report{
  const production=collect(seed,rounds),results:SweepResult[]=[]
  for(const window of[8,12,16])for(const scale of[.6,.8,1,1.2,1.5])for(const threshold of[.001,.002,.003,.004])results.push(evaluateConfig(production.samples,{window,scale,threshold}))
  results.sort((a,b)=>b.score-a.score||a.unsafeAccepted-b.unsafeAccepted||b.safeAccepted-a.safeAccepted)
  const eligible=results.filter(x=>x.accepted>0&&x.safeAccepted>0&&x.unsafeAccepted===0&&x.avgFutureImprovement>=0),recommended=eligible[0]??null
  const recommendation=recommended?`离线候选：窗口 ${recommended.window}、学习尺度 ×${recommended.scale.toFixed(1)}、离线门槛 ${(recommended.threshold*100).toFixed(1)}%；${recommended.accepted} 次接受中 ${recommended.safeAccepted} 次有未来留出证据，未发现坏候选。仅建议进入下一轮受控验证，不自动修改生产参数。`:`当前扫描没有找到“产生有效 Challenger 且坏候选为 0”的配置，建议保持 V16 生产参数不变，先扩充更多行为分布与真实回放。`
  return{version:'V18',seed,rounds,productionCycles:production.cycles,productionAccepted:production.accepted,rejectionBreakdown:production.breakdown,topConfigs:results.slice(0,8),recommended,recommendation,productionChanged:false,v17:runV17Evaluation(seed,rounds),generatedAt:new Date().toISOString()}
}
