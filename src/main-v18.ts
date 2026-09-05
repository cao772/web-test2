import './main-v17'
import {runV18Diagnostics,type SweepResult,type V18Report} from './eval-v18'

const PANEL=document.querySelector<HTMLElement>('#brainPanel')
const KEY='tiny-world-v18-diagnostics-v1'
let observer:MutationObserver|undefined
let decorating=false
let running=false
function read():V18Report|null{try{return JSON.parse(localStorage.getItem(KEY)??'null') as V18Report|null}catch{return null}}
function pct(v:number,digits=1){return`${(v*100).toFixed(digits)}%`}
function topRow(x:SweepResult){return`<div class="sweep-row"><span>窗${x.window} · ×${x.scale.toFixed(1)} · 门${pct(x.threshold,1)}</span><em>接受 ${x.accepted}/${x.windows} · 安全 ${x.safeAccepted} · 坏 ${x.unsafeAccepted} · 未来 ${pct(x.avgFutureImprovement,2)}</em></div>`}
function markup(r:V18Report|null){
  if(!r)return`<div class="diagnostic-card waiting"><div class="diagnostic-head"><b>反思瓶颈诊断</b><span>只读扫描</span></div><p>统计每次反思拒绝原因，并离线扫描窗口、学习尺度和门槛。不会修改 V16 正式策略参数。</p><button class="diagnostic-run" type="button">运行 V18 诊断</button></div>`
  const b=r.rejectionBreakdown,total=r.productionCycles,dominant=b.insufficient_improvement===total?'留出提升门是唯一瓶颈':'存在多个瓶颈',rec=r.recommended
  return`<div class="diagnostic-card ${rec?'candidate':'hold'}"><div class="diagnostic-head"><b>反思瓶颈诊断</b><span>${rec?'有受控候选':'保持生产参数'}</span></div><div class="diagnostic-score"><span>反思 <b>${total}</b></span><span>生产接受 <b>${r.productionAccepted}</b></span><span>参数改动 <b>${r.productionChanged?'是':'否'}</b></span></div><div class="rejection-grid"><span>提升不足 <b>${b.insufficient_improvement}</b></span><span>整批覆盖 <b>${b.batch_kind_coverage}</b></span><span>留出覆盖 <b>${b.heldout_kind_coverage}</b></span><span>候选不变 <b>${b.unchanged_candidate}</b></span></div><p><b>${dominant}</b>。${r.recommendation}</p><div class="sweep-list">${r.topConfigs.slice(0,3).map(topRow).join('')}</div><small>扫描：窗口 8/12/16 × 学习尺度 0.6~1.5 × 离线门槛 0.1%~0.4%。坏候选定义为：离线通过后，在后续未见回放上损失恶化超过 0.2%。</small><button class="diagnostic-run" type="button">重新运行同种子诊断</button></div>`
}
function run(){if(running)return;running=true;const btn=PANEL?.querySelector<HTMLButtonElement>('.diagnostic-run');if(btn){btn.disabled=true;btn.textContent='诊断中…'};try{localStorage.setItem(KEY,JSON.stringify(runV18Diagnostics(17017,240)))}finally{running=false;decorate()}}
function decorate(){
  if(!PANEL||decorating)return
  decorating=true;observer?.disconnect()
  const r=read(),title=PANEL.querySelector<HTMLElement>('.brain-title b'),meta=PANEL.querySelector<HTMLElement>('.brain-title span')
  if(title)title.textContent='反思瓶颈诊断 V18'
  if(meta)meta.textContent=r?`${r.productionCycles} 次反思 · ${r.productionAccepted} 次生产接受 · ${r.recommended?'发现受控候选':'生产参数保持'}`:'等待离线扫描'
  PANEL.querySelector('.diagnostic-card')?.remove()
  const evalCard=PANEL.querySelector('.eval-card'),html=markup(r)
  if(evalCard)evalCard.insertAdjacentHTML('afterend',html);else PANEL.insertAdjacentHTML('beforeend',html)
  PANEL.querySelector<HTMLButtonElement>('.diagnostic-run')?.addEventListener('click',run)
  observer?.observe(PANEL,{childList:true,subtree:true});decorating=false
}
if(PANEL){observer=new MutationObserver(decorate);observer.observe(PANEL,{childList:true,subtree:true});decorate();if(!read())setTimeout(run,1300)}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='V18 正在解释“为什么不进化”：逐次归因 59 次反思拒绝，并离线扫描参数；没有安全证据就不改生产门槛'
if(badge)badge.textContent='瓶颈诊断中'
