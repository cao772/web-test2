import './main-v13'

type TrajectoryResult={status:'idle'|'shadowing'|'promoted'|'rejected';evaluated:number;agreements:number;divergences:number;supportedDivergences:number;avgEstimatedGain:number;avgConfidence:number;reason:string;at:number}
type TrajectoryExperience={future1?:number;future2?:number}
type TrajectorySample={championLabel:string;challengerLabel:string;agreed:boolean;supported:boolean;estimatedGain:number;confidence:number;neighbors:number}
type WorldModelState={experiences:TrajectoryExperience[];pending:Array<unknown>;samples:TrajectorySample[];last:TrajectoryResult}
type StoredStrategy={worldModel?:WorldModelState;shadow?:{challenger:Record<string,number>|null;promoted:number;rejected:number}}
type StoredWorld={strategy?:StoredStrategy}

const STORAGE_KEY='tiny-world-v9-strategy-v1'
const panel=document.querySelector<HTMLElement>('#brainPanel')
let observer:MutationObserver|undefined
let decorating=false
function readStrategy():StoredStrategy|null{try{return(JSON.parse(localStorage.getItem(STORAGE_KEY)??'{}')as StoredWorld).strategy??null}catch{return null}}
function pct(v:number){return`${(Math.max(-1,Math.min(1,v))*100).toFixed(2)}%`}
function worldMarkup(s:StoredStrategy|null){
  const w=s?.worldModel
  if(!w)return`<div class="world-card"><div class="world-head"><b>3 步经验世界模型</b><span>等待真实轨迹</span></div><p>只从真实连续决策学习短期后果，不凭空模拟未来。</p></div>`
  const last=w.last??{status:'idle',evaluated:0,agreements:0,divergences:0,supportedDivergences:0,avgEstimatedGain:0,avgConfidence:0,reason:'等待短轨迹',at:Date.now()}
  const complete=(w.experiences??[]).filter(x=>Number.isFinite(x.future1)&&Number.isFinite(x.future2)).length
  const recent=(w.samples??[]).slice(-3),pairs=recent.map(x=>x.agreed?`=${x.championLabel}`:`${x.championLabel} → ${x.challengerLabel}${x.supported?` · ${x.neighbors}轨迹`: ' ?'}`).join(' · ')||'暂无3步分歧'
  const state=last.status==='promoted'?'✓ 世界模型门通过':last.status==='rejected'?'× 世界模型门否决':`3步影子 ${last.evaluated}/10`
  return`<div class="world-card ${last.status}"><div class="world-head"><b>3 步经验世界模型</b><span>${state}</span></div><div class="world-score"><span>完整轨迹 <b>${complete}</b></span><span>分歧 <b>${last.divergences}</b></span><span>轨迹支持 <b>${last.supportedDivergences}</b></span></div><div class="world-gain">替代动作 3 步折扣回报增益 <b>${pct(last.avgEstimatedGain)}</b> · 置信 <b>${Math.round((last.avgConfidence??0)*100)}%</b></div><p>${last.reason}</p><small>${pairs}</small><em>真实轨迹经验 ${w.experiences?.length??0} 条 · 待补未来 ${w.pending?.length??0} 条 · 折扣 γ=0.7</em></div>`
}
function decorate(){
  if(!panel||decorating)return
  decorating=true;observer?.disconnect()
  const s=readStrategy(),title=panel.querySelector<HTMLElement>('.brain-title b'),meta=panel.querySelector<HTMLElement>('.brain-title span')
  if(title)title.textContent='短期世界模型 V14'
  if(meta){const w=s?.worldModel,sh=s?.shadow;const complete=(w?.experiences??[]).filter(x=>Number.isFinite(x.future1)&&Number.isFinite(x.future2)).length;meta.textContent=sh?.challenger?`Challenger 影子中 · 完整3步轨迹 ${complete}`:`Champion 控制中 · 世界模型轨迹 ${complete}`}
  panel.querySelector('.world-card')?.remove()
  const context=panel.querySelector('.context-card'),html=worldMarkup(s)
  if(context)context.insertAdjacentHTML('afterend',html);else panel.insertAdjacentHTML('afterbegin',html)
  observer?.observe(panel,{childList:true,subtree:true});decorating=false
}
if(panel){observer=new MutationObserver(decorate);observer.observe(panel,{childList:true,subtree:true});decorate()}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='Champion 控制真实行为；Challenger 除了单步与上下文证据，还必须在真实3步短轨迹上证明未来总回报更好'
if(badge)badge.textContent='3步世界模型门控中'
