import './main-v9'

type ShadowResult={status:'idle'|'shadowing'|'promoted'|'rejected';evaluated:number;challengerWins:number;championWins:number;ties:number;championLoss:number;challengerLoss:number;improvement:number;reason:string;at:number}
type ShadowState={challenger:Record<string,number>|null;sourceCycle:number;samples:Array<unknown>;promoted:number;rejected:number;last:ShadowResult}
type ReflectionState={buffer:Array<unknown>;cycles:number;accepted:number;rejected:number;last?:{reason?:string}}
type StoredStrategy={updates?:number;avgReward?:number;reflection?:ReflectionState;shadow?:ShadowState}
type StoredWorld={strategy?:StoredStrategy}

const STORAGE_KEY='tiny-world-v9-strategy-v1'
const panel=document.querySelector<HTMLElement>('#brainPanel')
let observer:MutationObserver|undefined
let decorating=false
function readStrategy():StoredStrategy|null{try{return(JSON.parse(localStorage.getItem(STORAGE_KEY)??'{}')as StoredWorld).strategy??null}catch{return null}}
function pct(v:number){return`${(Math.max(-1,Math.min(1,v))*100).toFixed(2)}%`}
function shadowMarkup(s:StoredStrategy|null){
  const sh=s?.shadow
  if(!sh)return`<div class="shadow-card"><div class="shadow-head"><b>Champion / Challenger</b><span>等待首个候选</span></div><p>先通过离线反思门，才会生成 Challenger；正式行为始终由 Champion 控制。</p></div>`
  const last=sh.last??{status:'idle',evaluated:0,challengerWins:0,championWins:0,ties:0,championLoss:0,challengerLoss:0,improvement:0,reason:'等待 Challenger',at:Date.now()}
  const active=Boolean(sh.challenger)
  const state=last.status==='promoted'?'✓ Challenger 已晋升':last.status==='rejected'?'× Challenger 已淘汰':active?`◌ 影子对照 ${last.evaluated}/10`:'… 等待下一个 Challenger'
  const losses=last.evaluated?`Champion ${last.championLoss.toFixed(3)} · Challenger ${last.challengerLoss.toFixed(3)} · 改善 ${pct(last.improvement)}`:'尚无影子结果'
  return`<div class="shadow-card ${last.status}"><div class="shadow-head"><b>Champion / Challenger</b><span>${state}</span></div><div class="shadow-score"><span>Challenger 胜 <b>${last.challengerWins}</b></span><span>Champion 胜 <b>${last.championWins}</b></span><span>平 <b>${last.ties}</b></span></div><div class="shadow-loss">${losses}</div><p>${last.reason}</p><small>累计晋升 ${sh.promoted??0} · 淘汰 ${sh.rejected??0} · 来源反思 #${sh.sourceCycle??0}</small></div>`
}
function reflectionMini(s:StoredStrategy|null){const r=s?.reflection;if(!r)return'';return`<div class="reflection-mini"><span>离线反思 ${r.cycles??0}</span><span>通过 ${r.accepted??0}</span><span>拒绝 ${r.rejected??0}</span><span>回放池 ${r.buffer?.length??0}/8</span></div>`}
function decorate(){
  if(!panel||decorating)return
  decorating=true;observer?.disconnect()
  const title=panel.querySelector<HTMLElement>('.brain-title b');if(title)title.textContent='Champion / Challenger V11'
  const meta=panel.querySelector<HTMLElement>('.brain-title span'),s=readStrategy(),sh=s?.shadow;if(meta)meta.textContent=sh?`晋升 ${sh.promoted??0} · 淘汰 ${sh.rejected??0} · ${sh.challenger?'Challenger 影子运行中':'Champion 控制中'}`:'等待策略状态'
  panel.querySelector('.v10-reflection')?.remove();panel.querySelector('.shadow-card')?.remove();panel.querySelector('.reflection-mini')?.remove()
  const strategyCard=panel.querySelector('.strategy-card');if(strategyCard){strategyCard.insertAdjacentHTML('afterend',reflectionMini(s)+shadowMarkup(s))}else panel.insertAdjacentHTML('afterbegin',reflectionMini(s)+shadowMarkup(s))
  observer?.observe(panel,{childList:true,subtree:true});decorating=false
}
if(panel){observer=new MutationObserver(decorate);observer.observe(panel,{childList:true,subtree:true});decorate()}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='Champion 控制真实行为；Challenger 只做影子预测，连续胜出后才允许晋升'
if(badge)badge.textContent='Champion 控制中'
