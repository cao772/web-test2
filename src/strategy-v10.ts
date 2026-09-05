export type StrategyWeights={
  toyPlay:number
  toyCuriosity:number
  toyPreference:number
  toySatisfaction:number
  toyNovelty:number
  toyRepeat:number
  socialNeed:number
  socialPlay:number
  socialPreference:number
  socialSatisfaction:number
  socialRepeat:number
  socialThreshold:number
  restThreshold:number
}
export type DecisionKind='toy'|'social'|'rest'
export type StrategyFeatures={play?:number;curiosity?:number;preference?:number;satisfaction?:number;novelty?:number;repeat?:number;social?:number;rest?:number;isTag?:number}
export type DecisionTrace={id:string;kind:DecisionKind;actor:string;key:string;label:string;score:number;features:StrategyFeatures;reason:string;participants:number;rewards:number[];createdAt:number;settled:boolean}
export type StrategyHistory={label:string;reward:number;kind:DecisionKind;at:number}
export type ReplaySample={id:string;kind:DecisionKind;actor:string;key:string;label:string;features:StrategyFeatures;reward:number;at:number}
export type ReflectionResult={status:'collecting'|'accepted'|'rejected';sampleCount:number;currentLoss:number;candidateLoss:number;improvement:number;changed:string[];reason:string;at:number}
export type ReflectionState={buffer:ReplaySample[];cycles:number;accepted:number;rejected:number;last:ReflectionResult}
export type StrategyState={weights:StrategyWeights;updates:number;avgReward:number;lastReward:number;lastDecision:string;history:StrategyHistory[];reflection:ReflectionState}

export const BASE_STRATEGY:StrategyWeights={
  toyPlay:40,toyCuriosity:34,toyPreference:31,toySatisfaction:10,toyNovelty:12,toyRepeat:40,
  socialNeed:57,socialPlay:30,socialPreference:18,socialSatisfaction:8,socialRepeat:40,
  socialThreshold:62,restThreshold:67,
}
const BOUNDS:Record<keyof StrategyWeights,[number,number]>={
  toyPlay:[20,60],toyCuriosity:[15,55],toyPreference:[12,48],toySatisfaction:[2,24],toyNovelty:[3,24],toyRepeat:[15,60],
  socialNeed:[30,75],socialPlay:[5,45],socialPreference:[5,35],socialSatisfaction:[1,20],socialRepeat:[15,60],
  socialThreshold:[50,75],restThreshold:[58,78],
}
const REFLECT_EVERY=8,BUFFER_LIMIT=32,MIN_IMPROVEMENT=.004,MAX_CHANGED=8
const clamp=(v:number,[lo,hi]:[number,number])=>Math.min(hi,Math.max(lo,v))
const finite=(v:unknown,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?v:fallback
const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.min(1,Math.max(0,v)):0
const sigmoid=(x:number)=>1/(1+Math.exp(-x))
function blankReflection():ReflectionState{return{buffer:[],cycles:0,accepted:0,rejected:0,last:{status:'collecting',sampleCount:0,currentLoss:0,candidateLoss:0,improvement:0,changed:[],reason:`正在收集真实决策，累计 ${REFLECT_EVERY} 条后反思`,at:Date.now()}}}
export function createStrategy(raw?:Partial<StrategyState>|null):StrategyState{
  const weights={...BASE_STRATEGY},incoming=raw?.weights as Partial<StrategyWeights>|undefined
  if(incoming)for(const key of Object.keys(BASE_STRATEGY)as Array<keyof StrategyWeights>)weights[key]=clamp(finite(incoming[key],BASE_STRATEGY[key]),BOUNDS[key])
  const reflection=blankReflection(),r=raw?.reflection
  if(r){reflection.buffer=Array.isArray(r.buffer)?r.buffer.slice(-BUFFER_LIMIT):[];reflection.cycles=Math.max(0,Math.floor(finite(r.cycles,0)));reflection.accepted=Math.max(0,Math.floor(finite(r.accepted,0)));reflection.rejected=Math.max(0,Math.floor(finite(r.rejected,0)));if(r.last&&typeof r.last==='object')reflection.last={...reflection.last,...r.last,changed:Array.isArray(r.last.changed)?r.last.changed.slice(0,MAX_CHANGED):[]}}
  return{weights,updates:Math.max(0,Math.floor(finite(raw?.updates,0))),avgReward:clamp(finite(raw?.avgReward,.5),[0,1]),lastReward:clamp(finite(raw?.lastReward,.5),[0,1]),lastDecision:typeof raw?.lastDecision==='string'?raw.lastDecision:'尚未完成一轮反思',history:Array.isArray(raw?.history)?raw!.history!.slice(0,8):[],reflection}
}
function toyScore(w:StrategyWeights,f:StrategyFeatures){return n(f.play)*w.toyPlay+n(f.curiosity)*w.toyCuriosity+n(f.preference)*w.toyPreference+n(f.satisfaction)*w.toySatisfaction+n(f.novelty)*w.toyNovelty-n(f.repeat)*w.toyRepeat}
function socialScore(w:StrategyWeights,f:StrategyFeatures){const playWeight=n(f.isTag)?w.socialPlay:w.socialPlay*.34;return n(f.social)*w.socialNeed+n(f.play)*playWeight+n(f.preference)*w.socialPreference+n(f.satisfaction)*w.socialSatisfaction-n(f.repeat)*w.socialRepeat}
export function toyStrategyScore(s:StrategyState,f:Required<Pick<StrategyFeatures,'play'|'curiosity'|'preference'|'satisfaction'|'novelty'|'repeat'>>){return toyScore(s.weights,f)}
export function socialStrategyScore(s:StrategyState,f:Required<Pick<StrategyFeatures,'social'|'play'|'preference'|'satisfaction'|'repeat'|'isTag'>>){return socialScore(s.weights,f)}
export function makeDecision(kind:DecisionKind,actor:string,key:string,label:string,score:number,features:StrategyFeatures,reason:string,participants=1):DecisionTrace{return{id:`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,kind,actor,key,label,score,features,reason,participants,rewards:[],createdAt:Date.now(),settled:false}}
function predict(w:StrategyWeights,s:ReplaySample){if(s.kind==='toy')return sigmoid((toyScore(w,s.features)-42)/18);if(s.kind==='social')return sigmoid((socialScore(w,s.features)-w.socialThreshold)/13);return sigmoid((n(s.features.rest)*100-w.restThreshold)/7)}
function loss(w:StrategyWeights,samples:ReplaySample[]){if(!samples.length)return 1;let total=0;for(const s of samples){const p=predict(w,s),e=p-s.reward;total+=e*e}let regularize=0;for(const k of Object.keys(BASE_STRATEGY)as Array<keyof StrategyWeights>){const span=BOUNDS[k][1]-BOUNDS[k][0],d=(w[k]-BASE_STRATEGY[k])/span;regularize+=d*d}return total/samples.length+regularize*.012}
function bounded(w:StrategyWeights,key:keyof StrategyWeights,v:number){w[key]=clamp(v,BOUNDS[key])}
function candidateFrom(current:StrategyWeights,samples:ReplaySample[],cycles:number){const w={...current},scale=Math.max(.22,.75/Math.sqrt(1+cycles*.35));for(const s of samples){const a=s.reward-.55,f=s.features;if(s.kind==='toy'){bounded(w,'toyPlay',w.toyPlay+scale*a*n(f.play));bounded(w,'toyCuriosity',w.toyCuriosity+scale*a*n(f.curiosity));bounded(w,'toyPreference',w.toyPreference+scale*a*n(f.preference));bounded(w,'toySatisfaction',w.toySatisfaction+scale*a*n(f.satisfaction));bounded(w,'toyNovelty',w.toyNovelty+scale*a*n(f.novelty));bounded(w,'toyRepeat',w.toyRepeat-scale*a*n(f.repeat))}else if(s.kind==='social'){bounded(w,'socialNeed',w.socialNeed+scale*a*n(f.social));bounded(w,'socialPlay',w.socialPlay+scale*a*n(f.play)*(.35+.65*n(f.isTag)));bounded(w,'socialPreference',w.socialPreference+scale*a*n(f.preference));bounded(w,'socialSatisfaction',w.socialSatisfaction+scale*a*n(f.satisfaction));bounded(w,'socialRepeat',w.socialRepeat-scale*a*n(f.repeat));bounded(w,'socialThreshold',w.socialThreshold-scale*a*.45)}else bounded(w,'restThreshold',w.restThreshold-scale*a*.6)}for(const k of Object.keys(BASE_STRATEGY)as Array<keyof StrategyWeights>){w[k]+=(BASE_STRATEGY[k]-w[k])*.014;bounded(w,k,w[k])}return w}
function diffKeys(a:StrategyWeights,b:StrategyWeights){return(Object.keys(a)as Array<keyof StrategyWeights>).filter(k=>Math.abs(a[k]-b[k])>.025).sort((x,y)=>Math.abs(b[y]-a[y])-Math.abs(b[x]-a[x])).slice(0,MAX_CHANGED)}
function reflect(s:StrategyState){const samples=s.reflection.buffer.slice(-REFLECT_EVERY);if(samples.length<REFLECT_EVERY)return false;s.reflection.cycles+=1;const candidate=candidateFrom(s.weights,samples,s.reflection.cycles),currentLoss=loss(s.weights,samples),candidateLoss=loss(candidate,samples),improvement=currentLoss-candidateLoss,changed=diffKeys(s.weights,candidate),kinds=new Set(samples.map(x=>x.kind)).size;let accept=improvement>MIN_IMPROVEMENT&&changed.length>0&&kinds>=2,reason=''
  if(kinds<2){accept=false;reason='样本类型过于单一，拒绝晋升'}else if(changed.length===0){accept=false;reason='候选与当前策略几乎一致，无需晋升'}else if(improvement<=MIN_IMPROVEMENT){accept=false;reason=`回放提升不足 ${(improvement*100).toFixed(2)}%，继续保留当前策略`}else reason=`候选在同一批历史回放上误差更低，提升 ${(improvement*100).toFixed(2)}%`
  if(accept){s.weights=candidate;s.updates+=1;s.reflection.accepted+=1;s.lastDecision=`反思 #${s.reflection.cycles} 通过 · ${changed.slice(0,3).join(' / ')}`}
  else{s.reflection.rejected+=1;s.lastDecision=`反思 #${s.reflection.cycles} 拒绝 · ${reason}`}
  s.reflection.last={status:accept?'accepted':'rejected',sampleCount:samples.length,currentLoss,candidateLoss,improvement,changed,reason,at:Date.now()};s.reflection.buffer=s.reflection.buffer.slice(-Math.floor(REFLECT_EVERY/2));return accept
}
export function reportDecisionReward(s:StrategyState,t:DecisionTrace|undefined|null,reward:number){if(!t||t.settled)return false;t.rewards.push(clamp(reward,[0,1]));if(t.rewards.length<t.participants)return false;t.settled=true;const avg=t.rewards.reduce((a,b)=>a+b,0)/t.rewards.length;s.lastReward=avg;const total=s.history.length+1;s.avgReward=(s.avgReward*Math.min(20,total-1)+avg)/Math.min(21,total);s.history.unshift({label:t.label,reward:avg,kind:t.kind,at:Date.now()});s.history=s.history.slice(0,8);s.reflection.buffer.push({id:t.id,kind:t.kind,actor:t.actor,key:t.key,label:t.label,features:{...t.features},reward:avg,at:Date.now()});s.reflection.buffer=s.reflection.buffer.slice(-BUFFER_LIMIT);s.lastDecision=`已记录 ${t.actor} · ${t.label} · 回报 ${Math.round(avg*100)}% · 待反思 ${s.reflection.buffer.length}/${REFLECT_EVERY}`;if(s.reflection.buffer.length<REFLECT_EVERY){s.reflection.last={status:'collecting',sampleCount:s.reflection.buffer.length,currentLoss:0,candidateLoss:0,improvement:0,changed:[],reason:`收集回放样本 ${s.reflection.buffer.length}/${REFLECT_EVERY}`,at:Date.now()};return false}return reflect(s)}
export function strategySummary(s:StrategyState){const w=s.weights,r=s.reflection.last;return{toy:`玩${w.toyPlay.toFixed(0)} 好奇${w.toyCuriosity.toFixed(0)} 偏好${w.toyPreference.toFixed(0)} 探索${w.toyNovelty.toFixed(0)}`,social:`社交${w.socialNeed.toFixed(0)} 偏好${w.socialPreference.toFixed(0)} 门槛${w.socialThreshold.toFixed(0)}`,rest:`休息门槛 ${w.restThreshold.toFixed(0)}`,reflection:`反思${s.reflection.cycles}次 · 通过${s.reflection.accepted} / 拒绝${s.reflection.rejected} · ${r.status==='collecting'?r.reason:r.reason}`}}
