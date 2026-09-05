import './main-v14'

type RolloutResult={status:'idle'|'shadowing'|'promoted'|'rejected';evaluated:number;agreements:number;divergences:number;supportedDivergences:number;avgEstimatedNeedGain:number;avgConfidence:number;avgDimensions:number;reason:string;at:number}
type RolloutSample={championLabel:string;challengerLabel:string;agreed:boolean;supported:boolean;championPath:string;challengerPath:string;estimatedNeedGain:number;confidence:number;dimensions:number;neighbors:number}
type TransitionModelState={transitions:Array<{dimensions:number}>;samples:RolloutSample[];last:RolloutResult}
type StoredStrategy={transitionModel?:TransitionModelState;shadow?:{challenger:Record<string,number>|null;promoted:number;rejected:number}}
type StoredWorld={strategy?:StoredStrategy}

const STORAGE_KEY='tiny-world-v9-strategy-v1'
const panel=document.querySelector<HTMLElement>('#brainPanel')
let observer:MutationObserver|undefined
let decorating=false
function readStrategy():StoredStrategy|null{try{return(JSON.parse(localStorage.getItem(STORAGE_KEY)??'{}')as StoredWorld).strategy??null}catch{return null}}
function pct(v:number){return`${(Math.max(-1,Math.min(1,v))*100).toFixed(2)}%`}
function transitionMarkup(s:StoredStrategy|null){
  const m=s?.transitionModel
  if(!m)return`<div class="transition-card"><div class="transition-head"><b>显式状态转移</b><span>等待真实转移</span></div><p>只在真实可见的需求维度上学习 S + A → S′，缺失状态不会被补造。</p></div>`
  const last=m.last??{status:'idle',evaluated:0,agreements:0,divergences:0,supportedDivergences:0,avgEstimatedNeedGain:0,avgConfidence:0,avgDimensions:0,reason:'等待状态转移',at:Date.now()}
  const usable=(m.transitions??[]).filter(x=>(x.dimensions??0)>=2).length,recent=(m.samples??[]).slice(-3),pairs=recent.map(x=>x.agreed?`=${x.championLabel}`:`${x.championPath} ↔ ${x.challengerPath}${x.supported?` · ${x.dimensions}维/${x.neighbors}邻居`:' ?'}`).join(' · ')||'暂无两步 rollout 分歧'
  const state=last.status==='promoted'?'✓ 状态转移门通过':last.status==='rejected'?'× 状态转移门否决':`两步 rollout ${last.evaluated}/10`
  return`<div class="transition-card ${last.status}"><div class="transition-head"><b>显式状态转移</b><span>${state}</span></div><div class="transition-score"><span>真实转移 <b>${m.transitions?.length??0}</b></span><span>≥2维 <b>${usable}</b></span><span>双步支持 <b>${last.supportedDivergences}</b></span></div><div class="transition-gain">Challenger 两步需求负担改善 <b>${pct(last.avgEstimatedNeedGain)}</b> · 置信 <b>${Math.round((last.avgConfidence??0)*100)}%</b> · 平均 <b>${(last.avgDimensions??0).toFixed(1)}维</b></div><p>${last.reason}</p><small>${pairs}</small><em>状态维度：玩耍 / 社交 / 休息 / 好奇 · 当前 Planner 未暴露的维度保持未知，不进入模型计算</em></div>`
}
function decorate(){
  if(!panel||decorating)return
  decorating=true;observer?.disconnect()
  const s=readStrategy(),title=panel.querySelector<HTMLElement>('.brain-title b'),meta=panel.querySelector<HTMLElement>('.brain-title span')
  if(title)title.textContent='显式状态转移 V15'
  if(meta){const m=s?.transitionModel,sh=s?.shadow;const usable=(m?.transitions??[]).filter(x=>(x.dimensions??0)>=2).length;meta.textContent=sh?.challenger?`Challenger rollout 中 · 可用状态转移 ${usable}`:`Champion 控制中 · 可用状态转移 ${usable}`}
  panel.querySelector('.transition-card')?.remove()
  const world=panel.querySelector('.world-card'),html=transitionMarkup(s)
  if(world)world.insertAdjacentHTML('afterend',html);else panel.insertAdjacentHTML('afterbegin',html)
  observer?.observe(panel,{childList:true,subtree:true});decorating=false
}
if(panel){observer=new MutationObserver(decorate);observer.observe(panel,{childList:true,subtree:true});decorate()}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='Champion 控制真实行为；Challenger 还要通过显式状态转移模型，两步 rollout 后的需求状态更优才允许最终晋升'
if(badge)badge.textContent='状态转移 rollout 中'
