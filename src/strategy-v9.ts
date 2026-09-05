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
export type StrategyState={weights:StrategyWeights;updates:number;avgReward:number;lastReward:number;lastDecision:string;history:StrategyHistory[]}

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
const clamp=(v:number,[lo,hi]:[number,number])=>Math.min(hi,Math.max(lo,v))
const finite=(v:unknown,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?v:fallback
export function createStrategy(raw?:Partial<StrategyState>|null):StrategyState{
  const weights={...BASE_STRATEGY}
  const incoming=raw?.weights as Partial<StrategyWeights>|undefined
  if(incoming)for(const key of Object.keys(BASE_STRATEGY)as Array<keyof StrategyWeights>)weights[key]=clamp(finite(incoming[key],BASE_STRATEGY[key]),BOUNDS[key])
  return{weights,updates:Math.max(0,Math.floor(finite(raw?.updates,0))),avgReward:clamp(finite(raw?.avgReward,.5),[0,1]),lastReward:clamp(finite(raw?.lastReward,.5),[0,1]),lastDecision:typeof raw?.lastDecision==='string'?raw.lastDecision:'尚未进行策略更新',history:Array.isArray(raw?.history)?raw!.history!.slice(0,8):[]}
}
export function toyStrategyScore(s:StrategyState,f:Required<Pick<StrategyFeatures,'play'|'curiosity'|'preference'|'satisfaction'|'novelty'|'repeat'>>){const w=s.weights;return f.play*w.toyPlay+f.curiosity*w.toyCuriosity+f.preference*w.toyPreference+f.satisfaction*w.toySatisfaction+f.novelty*w.toyNovelty-f.repeat*w.toyRepeat}
export function socialStrategyScore(s:StrategyState,f:Required<Pick<StrategyFeatures,'social'|'play'|'preference'|'satisfaction'|'repeat'|'isTag'>>){const w=s.weights;const playWeight=f.isTag?w.socialPlay:w.socialPlay*.34;return f.social*w.socialNeed+f.play*playWeight+f.preference*w.socialPreference+f.satisfaction*w.socialSatisfaction-f.repeat*w.socialRepeat}
export function makeDecision(kind:DecisionKind,actor:string,key:string,label:string,score:number,features:StrategyFeatures,reason:string,participants=1):DecisionTrace{return{id:`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,kind,actor,key,label,score,features,reason,participants,rewards:[],createdAt:Date.now(),settled:false}}
function n(v:unknown){return typeof v==='number'&&Number.isFinite(v)?Math.min(1,Math.max(0,v)):0}
function pullToBase(s:StrategyState,key:keyof StrategyWeights){s.weights[key]+= (BASE_STRATEGY[key]-s.weights[key])*.006;s.weights[key]=clamp(s.weights[key],BOUNDS[key])}
function change(s:StrategyState,key:keyof StrategyWeights,delta:number){s.weights[key]=clamp(s.weights[key]+delta,BOUNDS[key]);pullToBase(s,key)}
function applyUpdate(s:StrategyState,t:DecisionTrace,reward:number){
  const advantage=reward-.55,lr=Math.max(.18,.72/Math.sqrt(1+s.updates*.12)),f=t.features
  if(t.kind==='toy'){
    change(s,'toyPlay',lr*advantage*n(f.play))
    change(s,'toyCuriosity',lr*advantage*n(f.curiosity))
    change(s,'toyPreference',lr*advantage*n(f.preference))
    change(s,'toySatisfaction',lr*advantage*n(f.satisfaction))
    change(s,'toyNovelty',lr*advantage*n(f.novelty))
    change(s,'toyRepeat',-lr*advantage*n(f.repeat))
  }else if(t.kind==='social'){
    change(s,'socialNeed',lr*advantage*n(f.social))
    change(s,'socialPlay',lr*advantage*n(f.play)*(.35+.65*n(f.isTag)))
    change(s,'socialPreference',lr*advantage*n(f.preference))
    change(s,'socialSatisfaction',lr*advantage*n(f.satisfaction))
    change(s,'socialRepeat',-lr*advantage*n(f.repeat))
    change(s,'socialThreshold',-lr*advantage*.55)
  }else{
    change(s,'restThreshold',-lr*advantage*.7)
  }
  s.updates+=1;s.lastReward=reward;s.avgReward=((s.avgReward*(s.updates-1))+reward)/s.updates;s.lastDecision=`${t.actor} · ${t.label} · 回报 ${Math.round(reward*100)}%`;s.history.unshift({label:t.label,reward,kind:t.kind,at:Date.now()});s.history=s.history.slice(0,8)
}
export function reportDecisionReward(s:StrategyState,t:DecisionTrace|undefined|null,reward:number){if(!t||t.settled)return false;t.rewards.push(Math.min(1,Math.max(0,reward)));if(t.rewards.length<t.participants)return false;t.settled=true;const avg=t.rewards.reduce((a,b)=>a+b,0)/t.rewards.length;applyUpdate(s,t,avg);return true}
export function strategySummary(s:StrategyState){const w=s.weights;return{toy:`玩${w.toyPlay.toFixed(0)} 好奇${w.toyCuriosity.toFixed(0)} 偏好${w.toyPreference.toFixed(0)} 探索${w.toyNovelty.toFixed(0)}`,social:`社交${w.socialNeed.toFixed(0)} 偏好${w.socialPreference.toFixed(0)} 门槛${w.socialThreshold.toFixed(0)}`,rest:`休息门槛 ${w.restThreshold.toFixed(0)}`}}
