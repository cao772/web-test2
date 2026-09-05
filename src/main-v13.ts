import './main-v12'

type ContextResult={status:'idle'|'shadowing'|'promoted'|'rejected';evaluated:number;agreements:number;divergences:number;supportedDivergences:number;avgEstimatedGain:number;avgConfidence:number;reason:string;at:number}
type ContextSample={championLabel:string;challengerLabel:string;agreed:boolean;supported:boolean;estimatedGain:number;confidence:number;neighbors:number;avgDistance:number}
type ContextState={experiences:Array<unknown>;samples:ContextSample[];last:ContextResult}
type StoredStrategy={contextual?:ContextState;shadow?:{challenger:Record<string,number>|null;promoted:number;rejected:number}}
type StoredWorld={strategy?:StoredStrategy}

const STORAGE_KEY='tiny-world-v9-strategy-v1'
const panel=document.querySelector<HTMLElement>('#brainPanel')
let observer:MutationObserver|undefined
let decorating=false
function readStrategy():StoredStrategy|null{try{return(JSON.parse(localStorage.getItem(STORAGE_KEY)??'{}')as StoredWorld).strategy??null}catch{return null}}
function pct(v:number){return`${(Math.max(-1,Math.min(1,v))*100).toFixed(2)}%`}
function contextMarkup(s:StoredStrategy|null){
  const c=s?.contextual
  if(!c)return`<div class="context-card"><div class="context-head"><b>上下文近邻反事实</b><span>等待真实历史</span></div><p>替代动作只有在相似状态下存在足够真实历史，才算有效反事实证据。</p></div>`
  const last=c.last??{status:'idle',evaluated:0,agreements:0,divergences:0,supportedDivergences:0,avgEstimatedGain:0,avgConfidence:0,reason:'等待上下文样本',at:Date.now()}
  const recent=(c.samples??[]).slice(-3),pairs=recent.map(x=>x.agreed?`=${x.championLabel}`:`${x.championLabel} → ${x.challengerLabel}${x.supported?` · ${x.neighbors}邻居`: ' ?'}`).join(' · ')||'暂无上下文分歧'
  const state=last.status==='promoted'?'✓ 上下文门通过':last.status==='rejected'?'× 上下文门否决':`近邻影子 ${last.evaluated}/10`
  return`<div class="context-card ${last.status}"><div class="context-head"><b>上下文近邻反事实</b><span>${state}</span></div><div class="context-score"><span>一致 <b>${last.agreements}</b></span><span>分歧 <b>${last.divergences}</b></span><span>近邻支持 <b>${last.supportedDivergences}</b></span></div><div class="context-gain">相似状态替代动作估计增益 <b>${pct(last.avgEstimatedGain)}</b> · 置信 <b>${Math.round((last.avgConfidence??0)*100)}%</b></div><p>${last.reason}</p><small>${pairs}</small><em>真实上下文经验 ${c.experiences?.length??0} 条 · 仅使用距离足够近且同动作的真实历史</em></div>`
}
function decorate(){
  if(!panel||decorating)return
  decorating=true;observer?.disconnect()
  const s=readStrategy(),title=panel.querySelector<HTMLElement>('.brain-title b'),meta=panel.querySelector<HTMLElement>('.brain-title span')
  if(title)title.textContent='上下文反事实 V13'
  if(meta){const c=s?.contextual,sh=s?.shadow;meta.textContent=sh?.challenger?`Challenger 影子中 · 近邻证据 ${c?.last?.supportedDivergences??0}`:`Champion 控制中 · 上下文经验 ${c?.experiences?.length??0}`}
  panel.querySelector('.context-card')?.remove()
  const decision=panel.querySelector('.decision-shadow-card'),html=contextMarkup(s)
  if(decision)decision.insertAdjacentHTML('afterend',html);else panel.insertAdjacentHTML('afterbegin',html)
  observer?.observe(panel,{childList:true,subtree:true});decorating=false
}
if(panel){observer=new MutationObserver(decorate);observer.observe(panel,{childList:true,subtree:true});decorate()}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='Champion 控制真实行为；Challenger 的替代动作必须在相似状态真实历史中获得近邻证据，才能通过最后晋升门'
if(badge)badge.textContent='上下文反事实门控中'
