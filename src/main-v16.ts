import './main-v15'

type GateMetrics={offlineImprovement:number;valueImprovement:number;challengerWins:number;decisionGain:number;contextGain:number;trajectoryGain:number;transitionGain:number;transitionConfidence:number}
type PolicyVersion={version:number;status:'stable'|'observing'|'rolled_back';sourceCycle:number;promotedAt:number;stableAt:number|null;baselineReward:number;observedReward:number;observedSamples:number;metrics:GateMetrics;note:string}
type StabilityResult={status:'stable'|'observing'|'rolled_back';currentVersion:number;fallbackVersion:number;samples:number;avgReward:number;baselineReward:number;delta:number;kinds:number;reason:string;at:number}
type Registry={currentVersion:number;versions:PolicyVersion[];observation:{rewards:number[];kinds:string[];startedAt:number}|null;rollbacks:number;last:StabilityResult}
type StoredStrategy={policyRegistry?:Registry;shadow?:{challenger:Record<string,number>|null}}
type StoredWorld={strategy?:StoredStrategy}

const STORAGE_KEY='tiny-world-v9-strategy-v1'
const panel=document.querySelector<HTMLElement>('#brainPanel')
let observer:MutationObserver|undefined
let decorating=false
function readStrategy():StoredStrategy|null{try{return(JSON.parse(localStorage.getItem(STORAGE_KEY)??'{}')as StoredWorld).strategy??null}catch{return null}}
function pct(v:number){return`${(Math.max(-1,Math.min(1,v))*100).toFixed(1)}%`}
function statusText(v:PolicyVersion){return v.status==='stable'?'稳定':v.status==='observing'?'观察':'已回滚'}
function versionHistory(r:Registry){
  const recent=[...(r.versions??[])].sort((a,b)=>b.version-a.version).slice(0,4)
  if(!recent.length)return'<small>暂无版本历史</small>'
  return`<div class="version-list">${recent.map(v=>{const m=v.metrics??({} as GateMetrics);const metric=v.sourceCycle?`状态 ${(m.transitionGain*100||0).toFixed(1)}% · 置信 ${Math.round((m.transitionConfidence||0)*100)}%`:'初始安全点';return`<div class="version-row ${v.status}"><span><b>v${v.version}</b> ${statusText(v)}</span><em>${metric}</em></div>`}).join('')}</div>`
}
function registryMarkup(s:StoredStrategy|null){
  const r=s?.policyRegistry
  if(!r)return`<div class="registry-card"><div class="registry-head"><b>Champion 版本注册表</b><span>初始化中</span></div><p>当前策略会登记为初始稳定版本；以后每次晋升先观察，再决定稳定或自动回滚。</p></div>`
  const l=r.last??{status:'stable',currentVersion:r.currentVersion??1,fallbackVersion:r.currentVersion??1,samples:0,avgReward:0,baselineReward:0,delta:0,kinds:0,reason:'等待版本状态',at:Date.now()}
  const state=l.status==='stable'?'✓ 稳定版本':l.status==='rolled_back'?'↶ 已自动回滚':`◌ 稳定性观察 ${l.samples}/12`
  const avg=l.samples?`${pct(l.avgReward)} / 基线 ${pct(l.baselineReward)}`:'等待观察样本'
  return`<div class="registry-card ${l.status}"><div class="registry-head"><b>Champion 版本注册表</b><span>${state}</span></div><div class="registry-score"><span>当前 <b>v${r.currentVersion}</b></span><span>回滚点 <b>v${l.fallbackVersion}</b></span><span>累计回滚 <b>${r.rollbacks??0}</b></span></div><div class="registry-gain">真实回报 <b>${avg}</b>${l.samples?` · Δ <b>${pct(l.delta)}</b> · ${l.kinds}类行为`:''}</div><p>${l.reason}</p>${versionHistory(r)}<small>新 Champion 需 12 条真实自主决策且覆盖 ≥2 类行为；平均真实回报较基线下降超过 6% 才触发自动回滚。</small></div>`
}
function decorate(){
  if(!panel||decorating)return
  decorating=true;observer?.disconnect()
  const s=readStrategy(),title=panel.querySelector<HTMLElement>('.brain-title b'),meta=panel.querySelector<HTMLElement>('.brain-title span'),r=s?.policyRegistry
  if(title)title.textContent='版本化 Champion V16'
  if(meta)meta.textContent=r?.observation?`Champion v${r.currentVersion} 观察中 · ${r.last?.samples??0}/12`:`Champion v${r?.currentVersion??1} · 回滚 ${r?.rollbacks??0} 次`
  panel.querySelector('.registry-card')?.remove()
  const transition=panel.querySelector('.transition-card'),html=registryMarkup(s)
  if(transition)transition.insertAdjacentHTML('afterend',html);else panel.insertAdjacentHTML('afterbegin',html)
  observer?.observe(panel,{childList:true,subtree:true});decorating=false
}
if(panel){observer=new MutationObserver(decorate);observer.observe(panel,{childList:true,subtree:true});decorate()}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='Champion 已版本化；新版本通过全部门禁后还要观察真实表现，持续退化会自动回滚到上一个稳定版本'
if(badge)badge.textContent='版本守护中'
