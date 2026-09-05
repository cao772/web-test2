import './main-v19'
import {runV20Corrected} from './eval-v20-corrected'
import type {V20MethodSummary,V20Report} from './eval-v20'

const PANEL=document.querySelector<HTMLElement>('#brainPanel')
const KEY='tiny-world-v20-shadow-v2'
const SEEDS=[17017,17118,17520,18026,19020]
let observer:MutationObserver|undefined
let decorating=false
let running=false
function read():V20Report|null{try{return JSON.parse(localStorage.getItem(KEY)??'null') as V20Report|null}catch{return null}}
function pct(v:number,digits=2){return`${(v*100).toFixed(digits)}%`}
function furthest(x:V20MethodSummary){if(x.stable)return'稳定 Champion';if(x.observing||x.rolledBack||x.transitionPassed)return'状态转移门';if(x.trajectoryPassed)return'3步轨迹门';if(x.contextPassed)return'上下文门';if(x.decisionPassed)return'Top-1 决策门';if(x.valuePassed)return'价值影子门';if(x.offlineAccepted)return'离线门';return'未进入 Challenger'}
function lane(x:V20MethodSummary){const es=x.id==='evolution_strategy';return`<div class="shadow-lane ${es?'es':'legacy'}"><div class="shadow-lane-head"><span><b>${x.name}</b><small>最远：${furthest(x)}</small></span><em>${x.seedsWithOffline}/5 种子产生离线 Challenger</em></div><div class="gate-track"><span class="${x.offlineAccepted?'pass':''}">离线<b>${x.offlineAccepted}</b></span><i>→</i><span class="${x.valuePassed?'pass':''}">价值<b>${x.valuePassed}</b></span><i>→</i><span class="${x.decisionPassed?'pass':''}">决策<b>${x.decisionPassed}</b></span><i>→</i><span class="${x.contextPassed?'pass':''}">上下文<b>${x.contextPassed}</b></span><i>→</i><span class="${x.trajectoryPassed?'pass':''}">轨迹<b>${x.trajectoryPassed}</b></span><i>→</i><span class="${x.transitionPassed?'pass':''}">状态<b>${x.transitionPassed}</b></span></div><small>离线均值 ${pct(x.avgOfflineImprovement)} · 状态增益 ${pct(x.avgTransitionGain)} · stable ${x.stable} · rollback ${x.rolledBack}</small></div>`}
function markup(r:V20Report|null){
  if(!r)return`<div class="dual-shadow-card waiting"><div class="dual-shadow-head"><b>双 Candidate Generator Shadow</b><span>正式门禁同链对照</span></div><p>旧生成器与 Evolution Strategy 使用同一反思窗口、同一真实历史、同一后续决策，进入 V10~V16 正式门禁链。两者都不控制真实世界。</p><button class="dual-shadow-run" type="button">运行 V20 双影子</button></div>`
  const current=r.methods.find(x=>x.id==='current')!,es=r.methods.find(x=>x.id==='evolution_strategy')!,qualified=Boolean(r.winner)
  const bottleneck=es.offlineAccepted>0&&es.valuePassed===0?'ES 能过离线门，但当前首要瓶颈仍是正式价值影子门。':es.valuePassed>0&&es.decisionPassed===0?'ES 已通过正式价值影子，但尚未证明会做出更好的不同 Top-1 决策。':es.transitionPassed>0?'ES 已进入状态转移门，具备更深层受控证据。':'ES 尚未进入完整策略决策门链。'
  return`<div class="dual-shadow-card ${qualified?'qualified':'hold'}"><div class="dual-shadow-head"><b>双 Candidate Generator Shadow</b><span>${qualified?'✓ 可进入受控生产 A/B':'仍不替换生产生成器'}</span></div><div class="dual-shadow-score"><span>固定种子 <b>${r.seeds.length}</b></span><span>每种子 <b>${r.roundsPerSeed}</b> 轮</span><span>生产改动 <b>${r.productionChanged?'是':'否'}</b></span></div><p><b>${bottleneck}</b> ${r.recommendation}</p><div class="shadow-lanes">${lane(current)}${lane(es)}</div><small>计数表示“成功走过该门”的 Candidate 数。V20 已按 V21 发现的问题校正价值门/决策门阶段归因；后续仍调用正式 reportDecisionReward。</small><button class="dual-shadow-run" type="button">重新运行 5 种子双影子</button></div>`
}
function run(){if(running)return;running=true;const btn=PANEL?.querySelector<HTMLButtonElement>('.dual-shadow-run');if(btn){btn.disabled=true;btn.textContent='完整门禁影子中…'};try{localStorage.setItem(KEY,JSON.stringify(runV20Corrected(SEEDS,240)))}finally{running=false;decorate()}}
function decorate(){
  if(!PANEL||decorating)return
  decorating=true;observer?.disconnect()
  const r=read(),es=r?.methods.find(x=>x.id==='evolution_strategy'),title=PANEL.querySelector<HTMLElement>('.brain-title b'),meta=PANEL.querySelector<HTMLElement>('.brain-title span')
  if(title)title.textContent='双生成器正式门禁影子 V20'
  if(meta)meta.textContent=r?(r.winner?`${r.winner.name} 通过完整受控资格 · 未替换生产`:`ES 最远 ${es?furthest(es):'未知'} · 生产保持 V16`):'等待正式门禁双影子'
  PANEL.querySelector('.dual-shadow-card')?.remove()
  const generator=PANEL.querySelector('.generator-card'),html=markup(r)
  if(generator)generator.insertAdjacentHTML('afterend',html);else PANEL.insertAdjacentHTML('beforeend',html)
  PANEL.querySelector<HTMLButtonElement>('.dual-shadow-run')?.addEventListener('click',run)
  observer?.observe(PANEL,{childList:true,subtree:true});decorating=false
}
if(PANEL){observer=new MutationObserver(decorate);observer.observe(PANEL,{childList:true,subtree:true});decorate();if(!read())setTimeout(run,2100)}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='V20 已按正式 V12 原始价值门校正阶段归因：ES 能产生离线 Challenger，但当前还没有真正通过价值影子门'
if(badge)badge.textContent='双生成器影子'
