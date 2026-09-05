import './main-v9'

type ReflectionResult={status:'collecting'|'accepted'|'rejected';sampleCount:number;currentLoss:number;candidateLoss:number;improvement:number;changed:string[];reason:string;at:number}
type ReflectionState={buffer:Array<unknown>;cycles:number;accepted:number;rejected:number;last:ReflectionResult}
type StoredStrategy={updates?:number;avgReward?:number;reflection?:ReflectionState}
type StoredWorld={strategy?:StoredStrategy}

const STORAGE_KEY='tiny-world-v9-strategy-v1'
const panel=document.querySelector<HTMLElement>('#brainPanel')
let observer:MutationObserver|undefined
let decorating=false

function readStrategy():StoredStrategy|null{
  try{return(JSON.parse(localStorage.getItem(STORAGE_KEY)??'{}')as StoredWorld).strategy??null}catch{return null}
}
function pct(v:number){return`${(Math.max(-1,Math.min(1,v))*100).toFixed(2)}%`}
function reflectionMarkup(s:StoredStrategy|null){
  const r=s?.reflection
  if(!r)return`<div class="reflection-card v10-reflection"><div class="reflection-head"><b>反思门</b><span>等待第一批回放样本</span></div><p>真实自主决策会先进入回放池，累计 8 条后才生成候选策略。</p></div>`
  const last=r.last??{status:'collecting',sampleCount:r.buffer?.length??0,currentLoss:0,candidateLoss:0,improvement:0,changed:[],reason:'正在收集回放样本',at:Date.now()}
  const state=last.status==='accepted'?'候选已晋升':last.status==='rejected'?'候选已拒绝':`收集中 ${r.buffer?.length??last.sampleCount}/8`
  const badge=last.status==='accepted'?'✓':last.status==='rejected'?'×':'…'
  const changed=(last.changed??[]).slice(0,4).join(' · ')||'暂无参数变更'
  const losses=last.status==='collecting'?'等待成批评估':`当前 ${last.currentLoss.toFixed(3)} → 候选 ${last.candidateLoss.toFixed(3)} · 改善 ${pct(last.improvement)}`
  return`<div class="reflection-card v10-reflection ${last.status}"><div class="reflection-head"><b>${badge} 反思门</b><span>${state}</span></div><div class="reflection-metrics"><span>周期 ${r.cycles??0}</span><span>通过 ${r.accepted??0}</span><span>拒绝 ${r.rejected??0}</span></div><div class="reflection-loss">${losses}</div><p>${last.reason}</p><small>${changed}</small></div>`
}
function decorate(){
  if(!panel||decorating)return
  decorating=true
  observer?.disconnect()
  const title=panel.querySelector<HTMLElement>('.brain-title b')
  if(title)title.textContent='反思学习 V10'
  const titleMeta=panel.querySelector<HTMLElement>('.brain-title span')
  const strategy=readStrategy(),reflection=strategy?.reflection
  if(titleMeta&&reflection)titleMeta.textContent=`${reflection.cycles} 次反思 · 通过 ${reflection.accepted} / 拒绝 ${reflection.rejected}`
  panel.querySelector('.v10-reflection')?.remove()
  const strategyCard=panel.querySelector('.strategy-card')
  if(strategyCard)strategyCard.insertAdjacentHTML('afterend',reflectionMarkup(strategy))
  else panel.insertAdjacentHTML('afterbegin',reflectionMarkup(strategy))
  observer?.observe(panel,{childList:true,subtree:true})
  decorating=false
}

if(panel){observer=new MutationObserver(decorate);observer.observe(panel,{childList:true,subtree:true});decorate()}

const status=document.querySelector<HTMLElement>('#statusText')
const badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='陶陶和沫沫先积累真实决策，再让候选策略通过回放评估后才晋升'
if(badge)badge.textContent='反思门控中'
