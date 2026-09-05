import {
  createStrategy,
  socialStrategyScore,
  toyStrategyScore,
  type DecisionCandidate,
  type DecisionKind,
  type StrategyFeatures,
  type StrategyWeights,
} from './strategy-v16'
import {runV18Diagnostics,type V18Report} from './eval-v18'

export type GeneratorId='current'|'reward_weighted'|'pairwise'|'finite_difference'|'evolution_strategy'
export type GeneratorResult={
  id:GeneratorId
  name:string
  windows:number
  accepted:number
  safeAccepted:number
  unsafeAccepted:number
  ambiguousAccepted:number
  acceptanceRate:number
  avgHeldoutImprovement:number
  avgFutureImprovement:number
  worstFutureImprovement:number
  avgWeightDistance:number
  score:number
}
export type V19Report={
  version:'V19'
  seed:number
  rounds:number
  gateThreshold:number
  methods:GeneratorResult[]
  winner:GeneratorResult|null
  recommendation:string
  productionChanged:boolean
  v18:V18Report
  generatedAt:string
}

type OfflineSample={kind:DecisionKind;actor:string;key:string;label:string;features:StrategyFeatures;reward:number;at:number}
type Episode={proposal:OfflineSample[];heldout:OfflineSample[];future:OfflineSample[];cycle:number}

const BASE:StrategyWeights={toyPlay:40,toyCuriosity:34,toyPreference:31,toySatisfaction:10,toyNovelty:12,toyRepeat:40,socialNeed:57,socialPlay:30,socialPreference:18,socialSatisfaction:8,socialRepeat:40,socialThreshold:62,restThreshold:67}
const BOUNDS:Record<keyof StrategyWeights,[number,number]>={toyPlay:[20,60],toyCuriosity:[15,55],toyPreference:[12,48],toySatisfaction:[2,24],toyNovelty:[3,24],toyRepeat:[15,60],socialNeed:[30,75],socialPlay:[5,45],socialPreference:[5,35],socialSatisfaction:[1,20],socialRepeat:[15,60],socialThreshold:[50,75],restThreshold:[58,78]}
const KEYS=Object.keys(BASE) as Array<keyof StrategyWeights>
const GATE=.004
const clamp01=(v:number)=>Math.min(1,Math.max(0,v))
const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?clamp01(v):0
const clamp=(v:number,[lo,hi]:[number,number])=>Math.min(hi,Math.max(lo,v))
const sigmoid=(x:number)=>1/(1+Math.exp(-x))
const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0
function mulberry32(seed:number){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function toyScore(w:StrategyWeights,f:StrategyFeatures){return n(f.play)*w.toyPlay+n(f.curiosity)*w.toyCuriosity+n(f.preference)*w.toyPreference+n(f.satisfaction)*w.toySatisfaction+n(f.novelty)*w.toyNovelty-n(f.repeat)*w.toyRepeat}
function socialScore(w:StrategyWeights,f:StrategyFeatures){return n(f.social)*w.socialNeed+n(f.play)*(n(f.isTag)?w.socialPlay:w.socialPlay*.34)+n(f.preference)*w.socialPreference+n(f.satisfaction)*w.socialSatisfaction-n(f.repeat)*w.socialRepeat}
function predict(w:StrategyWeights,s:OfflineSample){if(s.kind==='toy')return sigmoid((toyScore(w,s.features)-42)/18);if(s.kind==='social')return sigmoid((socialScore(w,s.features)-w.socialThreshold)/13);return sigmoid((n(s.features.rest)*100-w.restThreshold)/7)}
function loss(w:StrategyWeights,samples:OfflineSample[]){if(!samples.length)return 1;let total=0;for(const s of samples){const e=predict(w,s)-s.reward;total+=e*e}let regularize=0;for(const k of KEYS){const span=BOUNDS[k][1]-BOUNDS[k][0],d=(w[k]-BASE[k])/span;regularize+=d*d}return total/samples.length+regularize*.012}
function bounded(w:StrategyWeights,k:keyof StrategyWeights,v:number){w[k]=clamp(v,BOUNDS[k])}
function changed(a:StrategyWeights,b:StrategyWeights){return KEYS.some(k=>Math.abs(a[k]-b[k])>.025)}
function distance(a:StrategyWeights,b:StrategyWeights){return Math.sqrt(KEYS.reduce((sum,k)=>{const span=BOUNDS[k][1]-BOUNDS[k][0],d=(a[k]-b[k])/span;return sum+d*d},0))}
function pullAndClamp(w:StrategyWeights,pull=.014){for(const k of KEYS){w[k]+=(BASE[k]-w[k])*pull;bounded(w,k,w[k])}return w}

function chooseToy(s:ReturnType<typeof createStrategy>,actor:string,round:number,rng:()=>number){const defs=[['music','木琴'],['books','绘本'],['train','小火车'],['jelly','果冻']]as const;return defs.map(([key,label],i)=>{const f={play:clamp01(.42+rng()*.45),curiosity:clamp01(.35+rng()*.5),preference:clamp01(.3+rng()*.55),satisfaction:clamp01(.35+rng()*.5),novelty:clamp01(.3+rng()*.6),repeat:clamp01((round+i)%5===0?.65:rng()*.35)};return{kind:'toy' as const,actor,key,label,features:f,championScore:toyStrategyScore(s,f)}}).sort((a,b)=>b.championScore-a.championScore)}
function chooseSocial(s:ReturnType<typeof createStrategy>,rng:()=>number){const defs=[['social:pass','传球',0],['social:tag','追逐',1],['social:wave','招手',0]]as const;return defs.map(([key,label,isTag])=>{const f={social:clamp01(.4+rng()*.5),play:clamp01(.35+rng()*.5),preference:clamp01(.3+rng()*.55),satisfaction:clamp01(.35+rng()*.5),repeat:clamp01(rng()*.35),isTag};return{kind:'social' as const,actor:'双人',key,label,features:f,championScore:socialStrategyScore(s,f)}}).sort((a,b)=>b.championScore-a.championScore)}
function oracleReward(c:DecisionCandidate,rng:()=>number){const f=c.features;let v=.32;if(c.kind==='toy'){v+=.22*n(f.play)+.18*n(f.curiosity)+.12*n(f.preference)+.08*n(f.novelty)-.13*n(f.repeat);if(c.key==='music')v+=.025;if(c.key==='books')v+=.015}else if(c.kind==='social')v+=.25*n(f.social)+.13*n(f.play)+.1*n(f.preference)-.12*n(f.repeat)+.025*n(f.isTag);else v=.28+.58*n(f.rest);v+=(rng()-.5)*.04;return clamp01(v)}
function collect(seed:number,rounds:number){const rng=mulberry32(seed),s=createStrategy(),samples:OfflineSample[]=[];for(let i=0;i<rounds;i++){const actor=i%2?'沫沫':'陶陶',mode=i%7===5?'rest':i%3===1?'social':'toy';let candidates:DecisionCandidate[],chosen:DecisionCandidate;if(mode==='toy'){candidates=chooseToy(s,actor,i,rng);chosen=candidates[0]}else if(mode==='social'){candidates=chooseSocial(s,rng);chosen=candidates[0]}else{const f={rest:clamp01(.5+rng()*.45)},c={kind:'rest' as const,actor,key:'rest',label:'休息',features:f,championScore:n(f.rest)*100};candidates=[c];chosen=c}samples.push({kind:chosen.kind,actor:chosen.actor,key:chosen.key,label:chosen.label,features:{...chosen.features},reward:oracleReward(chosen,rng),at:5_000_000+i*1000})}return samples}
function episodes(samples:OfflineSample[]){const out:Episode[]=[];let cycle=0;for(let start=0;start+8<=samples.length;start+=4){const batch=samples.slice(start,start+8),future=samples.slice(start+8,start+16);if(future.length<4)break;out.push({proposal:batch.filter((_,i)=>i%2===0),heldout:batch.filter((_,i)=>i%2===1),future,cycle:++cycle})}return out}

function currentGenerator(proposal:OfflineSample[],cycle:number){const w={...BASE},scale=Math.max(.22,.75/Math.sqrt(1+cycle*.35));for(const s of proposal){const a=s.reward-.55,f=s.features;if(s.kind==='toy'){bounded(w,'toyPlay',w.toyPlay+scale*a*n(f.play));bounded(w,'toyCuriosity',w.toyCuriosity+scale*a*n(f.curiosity));bounded(w,'toyPreference',w.toyPreference+scale*a*n(f.preference));bounded(w,'toySatisfaction',w.toySatisfaction+scale*a*n(f.satisfaction));bounded(w,'toyNovelty',w.toyNovelty+scale*a*n(f.novelty));bounded(w,'toyRepeat',w.toyRepeat-scale*a*n(f.repeat))}else if(s.kind==='social'){bounded(w,'socialNeed',w.socialNeed+scale*a*n(f.social));bounded(w,'socialPlay',w.socialPlay+scale*a*n(f.play)*(.35+.65*n(f.isTag)));bounded(w,'socialPreference',w.socialPreference+scale*a*n(f.preference));bounded(w,'socialSatisfaction',w.socialSatisfaction+scale*a*n(f.satisfaction));bounded(w,'socialRepeat',w.socialRepeat-scale*a*n(f.repeat));bounded(w,'socialThreshold',w.socialThreshold-scale*a*.45)}else bounded(w,'restThreshold',w.restThreshold-scale*a*.6)}return pullAndClamp(w)}

function addFeatureGradient(w:StrategyWeights,s:OfflineSample,a:number,scale:number){const f=s.features;if(s.kind==='toy'){bounded(w,'toyPlay',w.toyPlay+scale*a*n(f.play));bounded(w,'toyCuriosity',w.toyCuriosity+scale*a*n(f.curiosity));bounded(w,'toyPreference',w.toyPreference+scale*a*n(f.preference));bounded(w,'toySatisfaction',w.toySatisfaction+scale*a*n(f.satisfaction));bounded(w,'toyNovelty',w.toyNovelty+scale*a*n(f.novelty));bounded(w,'toyRepeat',w.toyRepeat-scale*a*n(f.repeat))}else if(s.kind==='social'){bounded(w,'socialNeed',w.socialNeed+scale*a*n(f.social));bounded(w,'socialPlay',w.socialPlay+scale*a*n(f.play)*(.34+.66*n(f.isTag)));bounded(w,'socialPreference',w.socialPreference+scale*a*n(f.preference));bounded(w,'socialSatisfaction',w.socialSatisfaction+scale*a*n(f.satisfaction));bounded(w,'socialRepeat',w.socialRepeat-scale*a*n(f.repeat));bounded(w,'socialThreshold',w.socialThreshold-scale*a*.55)}else bounded(w,'restThreshold',w.restThreshold-scale*a)}
function rewardWeightedGenerator(proposal:OfflineSample[]){const w={...BASE},mean=avg(proposal.map(x=>x.reward)),spread=Math.sqrt(avg(proposal.map(x=>(x.reward-mean)**2)))||.05;for(const s of proposal){const advantage=Math.max(-1.5,Math.min(1.5,(s.reward-mean)/spread));addFeatureGradient(w,s,advantage,.42)}return pullAndClamp(w,.02)}

function pairwiseGenerator(proposal:OfflineSample[]){const w={...BASE};let pairs=0;for(let i=0;i<proposal.length;i++)for(let j=i+1;j<proposal.length;j++){const a=proposal[i],b=proposal[j];if(a.kind!==b.kind||Math.abs(a.reward-b.reward)<.025)continue;const hi=a.reward>b.reward?a:b,lo=a.reward>b.reward?b:a,gap=Math.min(.25,Math.abs(a.reward-b.reward)),hf=hi.features,lf=lo.features;const s=.9*gap;pairs++;if(hi.kind==='toy'){bounded(w,'toyPlay',w.toyPlay+s*(n(hf.play)-n(lf.play)));bounded(w,'toyCuriosity',w.toyCuriosity+s*(n(hf.curiosity)-n(lf.curiosity)));bounded(w,'toyPreference',w.toyPreference+s*(n(hf.preference)-n(lf.preference)));bounded(w,'toySatisfaction',w.toySatisfaction+s*(n(hf.satisfaction)-n(lf.satisfaction)));bounded(w,'toyNovelty',w.toyNovelty+s*(n(hf.novelty)-n(lf.novelty)));bounded(w,'toyRepeat',w.toyRepeat-s*(n(hf.repeat)-n(lf.repeat)))}else if(hi.kind==='social'){bounded(w,'socialNeed',w.socialNeed+s*(n(hf.social)-n(lf.social)));bounded(w,'socialPlay',w.socialPlay+s*(n(hf.play)-n(lf.play)));bounded(w,'socialPreference',w.socialPreference+s*(n(hf.preference)-n(lf.preference)));bounded(w,'socialSatisfaction',w.socialSatisfaction+s*(n(hf.satisfaction)-n(lf.satisfaction)));bounded(w,'socialRepeat',w.socialRepeat-s*(n(hf.repeat)-n(lf.repeat)));bounded(w,'socialThreshold',w.socialThreshold-s*.3)}else bounded(w,'restThreshold',w.restThreshold-s*(n(hf.rest)-n(lf.rest)))}if(!pairs)return rewardWeightedGenerator(proposal);return pullAndClamp(w,.01)}

function finiteDifferenceGenerator(proposal:OfflineSample[]){let w={...BASE},best=loss(w,proposal);for(let step=0;step<3;step++){let bestCandidate=w,bestLoss=best;for(const k of KEYS){const span=BOUNDS[k][1]-BOUNDS[k][0],delta=span*(step===0?.025:step===1?.015:.008);for(const dir of[-1,1]){const c={...w};bounded(c,k,c[k]+dir*delta);const l=loss(c,proposal);if(l<bestLoss-1e-7){bestLoss=l;bestCandidate=c}}}if(bestCandidate===w)break;w=bestCandidate;best=bestLoss}return pullAndClamp({...w},.006)}

function evolutionStrategyGenerator(proposal:OfflineSample[],cycle:number){const baseLoss=loss(BASE,proposal),candidates:StrategyWeights[]=[];for(let i=0;i<36;i++){const c={...BASE};for(let ki=0;ki<KEYS.length;ki++){const k=KEYS[ki],span=BOUNDS[k][1]-BOUNDS[k][0],wave=Math.sin((cycle+1)*12.9898+(i+1)*78.233+(ki+1)*37.719),gate=Math.cos((i+1)*(ki+2)*.731);if(Math.abs(gate)>.32)bounded(c,k,c[k]+wave*span*.022)}candidates.push(c)}candidates.sort((a,b)=>loss(a,proposal)-loss(b,proposal));const top=candidates.slice(0,4).filter(c=>loss(c,proposal)<baseLoss);if(!top.length)return finiteDifferenceGenerator(proposal);const w={...BASE};for(const k of KEYS){const weights=top.map(c=>Math.max(1e-6,baseLoss-loss(c,proposal))),den=weights.reduce((a,b)=>a+b,0);w[k]=top.reduce((sum,c,i)=>sum+c[k]*weights[i],0)/den;bounded(w,k,w[k])}return pullAndClamp(w,.008)}

const GENERATORS:{id:GeneratorId;name:string;generate:(proposal:OfflineSample[],cycle:number)=>StrategyWeights}[]=[
  {id:'current',name:'A 当前手工更新',generate:currentGenerator},
  {id:'reward_weighted',name:'B 回报加权更新',generate:(p)=>rewardWeightedGenerator(p)},
  {id:'pairwise',name:'C Pairwise Preference',generate:(p)=>pairwiseGenerator(p)},
  {id:'finite_difference',name:'D 有限差分搜索',generate:(p)=>finiteDifferenceGenerator(p)},
  {id:'evolution_strategy',name:'E Evolution Strategy',generate:evolutionStrategyGenerator},
]

function evaluateMethod(id:GeneratorId,name:string,generate:(proposal:OfflineSample[],cycle:number)=>StrategyWeights,eps:Episode[]):GeneratorResult{let accepted=0,safeAccepted=0,unsafeAccepted=0,ambiguousAccepted=0;const held:number[]=[],future:number[]=[],dists:number[]=[];for(const ep of eps){const kinds=new Set([...ep.proposal,...ep.heldout].map(x=>x.kind)).size,heldKinds=new Set(ep.heldout.map(x=>x.kind)).size;if(kinds<2||heldKinds<2)continue;const c=generate(ep.proposal,ep.cycle);if(!changed(BASE,c))continue;const hi=loss(BASE,ep.heldout)-loss(c,ep.heldout);if(hi<=GATE)continue;accepted++;held.push(hi);dists.push(distance(BASE,c));const fi=loss(BASE,ep.future)-loss(c,ep.future);future.push(fi);if(fi>=0)safeAccepted++;else if(fi<-.002)unsafeAccepted++;else ambiguousAccepted++}const windows=eps.length,acceptanceRate=windows?accepted/windows:0,avgHeldoutImprovement=avg(held),avgFutureImprovement=avg(future),worstFutureImprovement=future.length?Math.min(...future):0,avgWeightDistance=avg(dists),score=safeAccepted*2.2-unsafeAccepted*3.5-ambiguousAccepted*.4+Math.max(0,avgFutureImprovement)*180+Math.max(0,avgHeldoutImprovement)*90;return{id,name,windows,accepted,safeAccepted,unsafeAccepted,ambiguousAccepted,acceptanceRate,avgHeldoutImprovement,avgFutureImprovement,worstFutureImprovement,avgWeightDistance,score}}

export function runV19Tournament(seed=17017,rounds=240):V19Report{const samples=collect(seed,rounds),eps=episodes(samples),methods=GENERATORS.map(g=>evaluateMethod(g.id,g.name,g.generate,eps)).sort((a,b)=>b.score-a.score||a.unsafeAccepted-b.unsafeAccepted||b.safeAccepted-a.safeAccepted),eligible=methods.filter(x=>x.safeAccepted>=2&&x.unsafeAccepted===0&&x.avgFutureImprovement>0),winner=eligible[0]??null;const recommendation=winner?`${winner.name} 在同一 proposal / held-out / future 基准上得到 ${winner.safeAccepted} 次安全接受、0 次坏候选，未来未见回放平均提升 ${(winner.avgFutureImprovement*100).toFixed(2)}%。它只获得“受控 Challenger 生成器实验资格”，不自动替换 V16 生产生成器。`:`五种 Candidate Generator 中仍没有方法满足“至少 2 次安全接受、0 次坏候选且 future 平均提升为正”。继续保持 V16 生产生成器不变，下一步应扩大可学习信号或增加真实反事实数据，而不是继续放宽门槛。`;return{version:'V19',seed,rounds,gateThreshold:GATE,methods,winner,recommendation,productionChanged:false,v18:runV18Diagnostics(seed,rounds),generatedAt:new Date().toISOString()}}
