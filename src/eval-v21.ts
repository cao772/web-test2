import {
  bindStrategyForInference,
  createStrategy,
  socialStrategyScore,
  toyStrategyScore,
  type DecisionCandidate,
  type StrategyFeatures,
  type StrategyState,
  type StrategyWeights,
} from './strategy-v16'

export type V21BoundaryCase={
  seed:number
  cycle:number
  offlineImprovement:number
  valueImprovement:number
  valueWins:number
  frames:number
  top1Divergences:number
  supportedDivergences:number
  beneficialDivergences:number
  nearFlipFrames:number
  beneficialRunnerUpFrames:number
  avgChampionMargin:number
  avgChallengerMargin:number
  avgMarginCompression:number
  avgBeneficialRunnerUpGain:number
  changedWeights:Array<{key:keyof StrategyWeights;delta:number}>
  diagnosis:string
}
export type V21Summary={
  qualifyingChallengers:number
  totalFrames:number
  top1Divergences:number
  supportedDivergences:number
  beneficialDivergences:number
  nearFlipFrames:number
  beneficialRunnerUpFrames:number
  avgChampionMargin:number
  avgChallengerMargin:number
  avgMarginCompression:number
  avgBeneficialRunnerUpGain:number
  dominantDiagnosis:string
}
export type V21Report={
  version:'V21'
  seeds:number[]
  roundsPerSeed:number
  summary:V21Summary
  cases:V21BoundaryCase[]
  productionChanged:boolean
  recommendation:string
  generatedAt:string
}

type Frame={chosen:DecisionCandidate;candidates:DecisionCandidate[];reward:number;at:number}
type OfflineSample={features:StrategyFeatures;reward:number;kind:DecisionCandidate['kind']}
type ActionStat={count:number;avg:number}

const BASE:StrategyWeights={toyPlay:40,toyCuriosity:34,toyPreference:31,toySatisfaction:10,toyNovelty:12,toyRepeat:40,socialNeed:57,socialPlay:30,socialPreference:18,socialSatisfaction:8,socialRepeat:40,socialThreshold:62,restThreshold:67}
const BOUNDS:Record<keyof StrategyWeights,[number,number]>={toyPlay:[20,60],toyCuriosity:[15,55],toyPreference:[12,48],toySatisfaction:[2,24],toyNovelty:[3,24],toyRepeat:[15,60],socialNeed:[30,75],socialPlay:[5,45],socialPreference:[5,35],socialSatisfaction:[1,20],socialRepeat:[15,60],socialThreshold:[50,75],restThreshold:[58,78]}
const KEYS=Object.keys(BASE) as Array<keyof StrategyWeights>
const OFFLINE_GATE=.004
const VALUE_GATE=.003
const VALUE_WINS=6
const SHADOW=10
const NEAR_FLIP_MARGIN=2.5
const clamp01=(v:number)=>Math.min(1,Math.max(0,v))
const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?clamp01(v):0
const clamp=(v:number,[lo,hi]:[number,number])=>Math.min(hi,Math.max(lo,v))
const sigmoid=(x:number)=>1/(1+Math.exp(-x))
const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0
function mulberry32(seed:number){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function bounded(w:StrategyWeights,k:keyof StrategyWeights,v:number){w[k]=clamp(v,BOUNDS[k])}
function toyScore(w:StrategyWeights,f:StrategyFeatures){return n(f.play)*w.toyPlay+n(f.curiosity)*w.toyCuriosity+n(f.preference)*w.toyPreference+n(f.satisfaction)*w.toySatisfaction+n(f.novelty)*w.toyNovelty-n(f.repeat)*w.toyRepeat}
function socialScore(w:StrategyWeights,f:StrategyFeatures){return n(f.social)*w.socialNeed+n(f.play)*(n(f.isTag)?w.socialPlay:w.socialPlay*.34)+n(f.preference)*w.socialPreference+n(f.satisfaction)*w.socialSatisfaction-n(f.repeat)*w.socialRepeat}
function rawScore(w:StrategyWeights,c:DecisionCandidate){if(c.kind==='toy')return toyScore(w,c.features);if(c.kind==='social')return socialScore(w,c.features);return n(c.features.rest)*100}
function predictedReward(w:StrategyWeights,s:OfflineSample){if(s.kind==='toy')return sigmoid((toyScore(w,s.features)-42)/18);if(s.kind==='social')return sigmoid((socialScore(w,s.features)-w.socialThreshold)/13);return sigmoid((n(s.features.rest)*100-w.restThreshold)/7)}
function loss(w:StrategyWeights,samples:OfflineSample[]){if(!samples.length)return 1;let total=0;for(const s of samples){const e=predictedReward(w,s)-s.reward;total+=e*e}let regularize=0;for(const k of KEYS){const span=BOUNDS[k][1]-BOUNDS[k][0],d=(w[k]-BASE[k])/span;regularize+=d*d}return total/samples.length+regularize*.012}
function finiteDifferenceGenerator(proposal:OfflineSample[]){let w={...BASE},best=loss(w,proposal);for(let step=0;step<3;step++){let bestCandidate=w,bestLoss=best;for(const k of KEYS){const span=BOUNDS[k][1]-BOUNDS[k][0],delta=span*(step===0?.025:step===1?.015:.008);for(const dir of[-1,1]){const c={...w};bounded(c,k,c[k]+dir*delta);const l=loss(c,proposal);if(l<bestLoss-1e-7){bestLoss=l;bestCandidate=c}}}if(bestCandidate===w)break;w=bestCandidate;best=bestLoss}for(const k of KEYS){w[k]+=(BASE[k]-w[k])*.006;bounded(w,k,w[k])}return w}
function evolutionStrategyGenerator(proposal:OfflineSample[],cycle:number){const baseLoss=loss(BASE,proposal),candidates:StrategyWeights[]=[];for(let i=0;i<36;i++){const c={...BASE};for(let ki=0;ki<KEYS.length;ki++){const k=KEYS[ki],span=BOUNDS[k][1]-BOUNDS[k][0],wave=Math.sin((cycle+1)*12.9898+(i+1)*78.233+(ki+1)*37.719),gate=Math.cos((i+1)*(ki+2)*.731);if(Math.abs(gate)>.32)bounded(c,k,c[k]+wave*span*.022)}candidates.push(c)}candidates.sort((a,b)=>loss(a,proposal)-loss(b,proposal));const top=candidates.slice(0,4).filter(c=>loss(c,proposal)<baseLoss);if(!top.length)return finiteDifferenceGenerator(proposal);const w={...BASE};for(const k of KEYS){const weights=top.map(c=>Math.max(1e-6,baseLoss-loss(c,proposal))),den=weights.reduce((a,b)=>a+b,0);w[k]=top.reduce((sum,c,i)=>sum+c[k]*weights[i],0)/den;bounded(w,k,w[k]);w[k]+=(BASE[k]-w[k])*.008;bounded(w,k,w[k])}return w}
function chooseToy(s:StrategyState,actor:string,round:number,rng:()=>number){const defs=[['music','木琴'],['books','绘本'],['train','小火车'],['jelly','果冻']]as const;return defs.map(([key,label],i)=>{const f={play:clamp01(.42+rng()*.45),curiosity:clamp01(.35+rng()*.5),preference:clamp01(.3+rng()*.55),satisfaction:clamp01(.35+rng()*.5),novelty:clamp01(.3+rng()*.6),repeat:clamp01((round+i)%5===0?.65:rng()*.35)};return{kind:'toy' as const,actor,key,label,features:f,championScore:toyStrategyScore(s,f)}}).sort((a,b)=>b.championScore-a.championScore)}
function chooseSocial(s:StrategyState,rng:()=>number){const defs=[['social:pass','传球',0],['social:tag','追逐',1],['social:wave','招手',0]]as const;return defs.map(([key,label,isTag])=>{const f={social:clamp01(.4+rng()*.5),play:clamp01(.35+rng()*.5),preference:clamp01(.3+rng()*.55),satisfaction:clamp01(.35+rng()*.5),repeat:clamp01(rng()*.35),isTag};return{kind:'social' as const,actor:'双人',key,label,features:f,championScore:socialStrategyScore(s,f)}}).sort((a,b)=>b.championScore-a.championScore)}
function oracleMean(c:DecisionCandidate){const f=c.features;if(c.kind==='toy'){let v=.32+.22*n(f.play)+.18*n(f.curiosity)+.12*n(f.preference)+.08*n(f.novelty)-.13*n(f.repeat);if(c.key==='music')v+=.025;if(c.key==='books')v+=.015;return clamp01(v)}if(c.kind==='social')return clamp01(.32+.25*n(f.social)+.13*n(f.play)+.1*n(f.preference)-.12*n(f.repeat)+.025*n(f.isTag));return clamp01(.28+.58*n(f.rest))}
function collectFrames(seed:number,rounds:number){const rng=mulberry32(seed),s=bindStrategyForInference(createStrategy()),frames:Frame[]=[];for(let i=0;i<rounds;i++){const actor=i%2?'沫沫':'陶陶',mode=i%7===5?'rest':i%3===1?'social':'toy';let candidates:DecisionCandidate[],chosen:DecisionCandidate;if(mode==='toy'){candidates=chooseToy(s,actor,i,rng);chosen=candidates[0]}else if(mode==='social'){candidates=chooseSocial(s,rng);chosen=candidates[0]}else{const f={rest:clamp01(.5+rng()*.45)},c={kind:'rest' as const,actor,key:'rest',label:'休息',features:f,championScore:n(f.rest)*100};candidates=[c];chosen=c}const reward=clamp01(oracleMean(chosen)+(rng()-.5)*.04);frames.push({chosen:{...chosen,features:{...chosen.features}},candidates:candidates.map(c=>({...c,features:{...c.features}})),reward,at:7_000_000+i*1000})}return frames}
function offline(f:Frame):OfflineSample{return{kind:f.chosen.kind,features:{...f.chosen.features},reward:f.reward}}
function choice(w:StrategyWeights,candidates:DecisionCandidate[]){const rest=candidates.filter(c=>c.kind==='rest').sort((a,b)=>n(b.features.rest)-n(a.features.rest))[0];if(rest&&n(rest.features.rest)*100>w.restThreshold)return rest;const socials=candidates.filter(c=>c.kind==='social').map(c=>({c,score:socialScore(w,c.features)})).sort((a,b)=>b.score-a.score);if(socials[0]&&socials[0].score>w.socialThreshold)return socials[0].c;const toys=candidates.filter(c=>c.kind==='toy').map(c=>({c,score:toyScore(w,c.features)})).sort((a,b)=>b.score-a.score);return toys[0]?.c??candidates[0]}
function ranked(w:StrategyWeights,candidates:DecisionCandidate[]){return candidates.map(c=>({c,score:rawScore(w,c)})).sort((a,b)=>b.score-a.score)}
function buildActionStats(frames:Frame[],end:number){const stats:Record<string,ActionStat>={};for(let i=0;i<end;i++){const f=frames[i],old=stats[f.chosen.key],count=(old?.count??0)+1;stats[f.chosen.key]={count,avg:((old?.avg??0)*(count-1)+f.reward)/count}}return stats}
function valueGate(candidate:StrategyWeights,frames:Frame[],start:number){let championLoss=0,challengerLoss=0,wins=0;for(let i=start;i<Math.min(frames.length,start+SHADOW);i++){const f=frames[i],s=offline(f),cp=predictedReward(BASE,s),xp=predictedReward(candidate,s),ce=(cp-s.reward)**2,xe=(xp-s.reward)**2;championLoss+=ce;challengerLoss+=xe;if(xe+.0004<ce)wins++}const count=Math.min(SHADOW,frames.length-start),improvement=count?(championLoss-challengerLoss)/count:0;return{pass:count===SHADOW&&improvement>VALUE_GATE&&wins>=VALUE_WINS,improvement,wins}}
function diagnoseCase(seed:number,cycle:number,frames:Frame[],batchStart:number,candidate:StrategyWeights,offlineImprovement:number,valueImprovement:number,valueWins:number):V21BoundaryCase{
  const shadowStart=batchStart+8,stats=buildActionStats(frames,shadowStart),marginsC:number[]=[],marginsX:number[]=[],compressions:number[]=[],runnerGains:number[]=[];let divergences=0,supported=0,beneficial=0,nearFlip=0,beneficialRunner=0
  for(let i=shadowStart;i<Math.min(frames.length,shadowStart+SHADOW);i++){
    const f=frames[i],cr=ranked(BASE,f.candidates),xr=ranked(candidate,f.candidates),cc=choice(BASE,f.candidates),xc=choice(candidate,f.candidates),cm=cr.length>1?cr[0].score-cr[1].score:99,xm=xr.length>1?xr[0].score-xr[1].score:99;marginsC.push(cm);marginsX.push(xm);compressions.push(cm-xm);if(xm<=NEAR_FLIP_MARGIN)nearFlip++
    if(cc.key!==xc.key){divergences++;const st=stats[xc.key];if(st?.count>=2)supported++;if(oracleMean(xc)>oracleMean(cc)+.0001)beneficial++}
    const runner=xr.find(x=>x.c.key!==xc.key);if(runner){const gain=oracleMean(runner.c)-oracleMean(xc);if(gain>0){beneficialRunner++;runnerGains.push(gain)}}
  }
  const changedWeights=KEYS.map(key=>({key,delta:candidate[key]-BASE[key]})).filter(x=>Math.abs(x.delta)>.025).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,8)
  let diagnosis='';if(divergences<2){if(nearFlip>=3||beneficialRunner>=3)diagnosis='主要瓶颈是决策边界未被推过：已有多个接近翻转/更优第二名，但 ES 参数扰动不足以改变 Top-1';else diagnosis='主要瓶颈是排序稳定：ES 改善价值拟合，但动作排序基本不变，缺少改变决策边界的训练信号'}else if(supported<2)diagnosis='已有 Top-1 分歧，但替代动作的真实历史执行证据不足';else if(beneficial<2)diagnosis='已有有证据分歧，但分歧动作并未稳定优于 Champion 动作';else diagnosis='决策层已有正向信号，失败更可能来自现有反事实增益/置信门'
  return{seed,cycle,offlineImprovement,valueImprovement,valueWins,frames:SHADOW,top1Divergences:divergences,supportedDivergences:supported,beneficialDivergences:beneficial,nearFlipFrames:nearFlip,beneficialRunnerUpFrames:beneficialRunner,avgChampionMargin:avg(marginsC),avgChallengerMargin:avg(marginsX),avgMarginCompression:avg(compressions),avgBeneficialRunnerUpGain:avg(runnerGains),changedWeights,diagnosis}
}
function seedCases(seed:number,rounds:number){const frames=collectFrames(seed,rounds),cases:V21BoundaryCase[]=[];let cycle=0;for(let start=0;start+8+SHADOW<=frames.length;start+=4){cycle++;const batch=frames.slice(start,start+8).map(offline),proposal=batch.filter((_,i)=>i%2===0),heldout=batch.filter((_,i)=>i%2===1),kinds=new Set(batch.map(x=>x.kind)).size,heldKinds=new Set(heldout.map(x=>x.kind)).size;if(kinds<2||heldKinds<2)continue;const c=evolutionStrategyGenerator(proposal,cycle),baseLoss=loss(BASE,heldout),candidateLoss=loss(c,heldout),improvement=baseLoss-candidateLoss;if(improvement<=OFFLINE_GATE)continue;const vg=valueGate(c,frames,start+8);if(!vg.pass)continue;cases.push(diagnoseCase(seed,cycle,frames,start,c,improvement,vg.improvement,vg.wins))}return cases}
export function runV21BoundaryDiagnostics(seeds=[17017,17118,17520,18026,19020],roundsPerSeed=240):V21Report{
  const cases=seeds.flatMap(seed=>seedCases(seed,roundsPerSeed)),sum=(pick:(c:V21BoundaryCase)=>number)=>cases.reduce((a,c)=>a+pick(c),0),weighted=(pick:(c:V21BoundaryCase)=>number)=>cases.length?avg(cases.map(pick)):0,totalFrames=sum(c=>c.frames),div=sum(c=>c.top1Divergences),supported=sum(c=>c.supportedDivergences),beneficial=sum(c=>c.beneficialDivergences),near=sum(c=>c.nearFlipFrames),runner=sum(c=>c.beneficialRunnerUpFrames),runnerGains=cases.filter(c=>c.avgBeneficialRunnerUpGain>0).map(c=>c.avgBeneficialRunnerUpGain),diagnoses=cases.map(c=>c.diagnosis),counts=new Map<string,number>();for(const d of diagnoses)counts.set(d,(counts.get(d)??0)+1);const dominant=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]??'没有形成通过价值影子门的 ES Challenger';const summary:V21Summary={qualifyingChallengers:cases.length,totalFrames,top1Divergences:div,supportedDivergences:supported,beneficialDivergences:beneficial,nearFlipFrames:near,beneficialRunnerUpFrames:runner,avgChampionMargin:weighted(c=>c.avgChampionMargin),avgChallengerMargin:weighted(c=>c.avgChallengerMargin),avgMarginCompression:weighted(c=>c.avgMarginCompression),avgBeneficialRunnerUpGain:avg(runnerGains),dominantDiagnosis:dominant};let recommendation='';if(!cases.length)recommendation='当前基准没有 ES Challenger 同时通过离线门和价值影子门，先保持 V20 结论。';else if(div<cases.length*2&&runner>0)recommendation=`ES 已把价值预测做得更准，但 ${totalFrames} 个影子决策仅产生 ${div} 次 Top-1 分歧；同时有 ${runner} 帧存在 oracle 更优的非 Top-1 动作。下一步应把 Candidate Generator 的目标从“降低 reward prediction loss”扩展为“排序/决策边界损失”，而不是降低 Top-1 门槛。`;else if(supported<2)recommendation='Top-1 已有分歧，但历史替代动作覆盖不足；下一步应增加低风险受控反事实采样，而不是改生产门。';else recommendation='决策分歧与历史支持已经出现，下一步针对反事实增益估计做校准，不建议直接放宽门槛。';return{version:'V21',seeds,roundsPerSeed,summary,cases,productionChanged:false,recommendation,generatedAt:new Date().toISOString()}
}
