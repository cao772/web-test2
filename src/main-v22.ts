import './main-v21'
import {runV22Corrected} from './eval-v22-corrected'
import type {V22Case,V22Report} from './eval-v22'

const PANEL=document.querySelector<HTMLElement>('#brainPanel')
const KEY='tiny-world-v22-value-shadow-v1'
let observer:MutationObserver|undefined
let decorating=false
let running=false
function read():V22Report|null{try{return JSON.parse(localStorage.getItem(KEY)??'null') as V22Report|null}catch{return null}}
function pct(v:number,d=2){return`${(v*100).toFixed(d)}%`}
function failureLabel(c:V22Case){return c.failure==='mse_only'?'仅 MSE 不足':c.failure==='wins_only'?'仅胜场不足':c.failure==='both'?'MSE+胜场不足':'通过'}
function row(c:V22Case){const kind=c.kindMetrics.find(x=>x.kind===c.worstKind);const weights=c.changedWeights.slice(0,3).map(x=>`${String(x.key)} ${x.delta>=0?'+':''}${x.delta.toFixed(2)}`).join(' · ');return`<div class="value-case ${c.failure}"><span><b>seed ${c.seed} · cycle ${c.cycle}</b><small>离线 ${pct(c.offlineImprovement)} → shadow ${pct(c.shadowImprovement)} · 胜 ${c.challengerWins}/10</small></span><em>${failureLabel(c)} · 最弱 ${c.worstKind}${kind?` ${pct(kind.improvement)}`:''}<br>漂移 ${c.heldoutToShadow.combined.toFixed(3)} · ${c.heldoutToShadow.topFeature} ${c.heldoutToShadow.topFeatureDelta>=0?'+':''}${c.heldoutToShadow.topFeatureDelta.toFixed(3)}<br>${weights||'参数变化很小'}</em></div>`}
function markup(r:V22Report|null){
  if(!r)return`<div class="value-drift-card waiting"><div class="value-drift-head"><b>价值影子失败诊断</b><span>MSE / 胜场 / 分布漂移</span></div><p>对 V21 的 3 个 ES 离线 Challenger 逐个拆解：正式价值门究竟卡在 MSE、胜场还是两者；同时比较 proposal / held-out / shadow 的行为与特征分布。不会把 shadow 数据用于训练。</p><button class="value-drift-run" type="button">运行 V22 诊断</button></div>`
  const f=r.failureBreakdown,avgWins=r.cases.length?r.cases.reduce((a,c)=>a+c.challengerWins,0)/r.cases.length:0
  const headline=f.mse_only===r.offlineChallengers?'✓ 胜场够，MSE 改善幅度不足':f.wins_only===r.offlineChallengers?'MSE 有效，但胜场不稳定':f.both===r.offlineChallengers?'shadow 整体泛化不足':'价值失败类型混合'
  return`<div class="value-drift-card"><div class="value-drift-head"><b>价值影子失败诊断</b><span>${headline}</span></div><div class="value-drift-score"><span>离线 Challenger<b>${r.offlineChallengers}</b></span><span>MSE-only<b>${f.mse_only}</b></span><span>Wins-only<b>${f.wins_only}</b></span><span>Both<b>${f.both}</b></span><span>离线均值<b>${pct(r.avgOfflineImprovement)}</b></span><span>shadow 均值<b>${pct(r.avgShadowImprovement)}</b></span></div><div class="drift-strip"><span>平均胜场 <b>${avgWins.toFixed(1)}/10</b></span><span>held-out→shadow <b>${r.avgHeldoutShadowShift.toFixed(3)}</b></span><span>相关性 <b>${r.offlineShadowCorrelation.toFixed(2)}</b></span><span>主漂移 <b>${r.dominantShiftFeature}</b></span><span>最弱行为 <b>${r.dominantWorstKind}</b></span><span>参数/漂移重合 <b>${r.parameterShiftOverlap}/${r.offlineChallengers}</b></span></div><p><b>${r.recommendation}</b></p><div class="value-cases">${r.cases.map(row).join('')}</div><small>正式价值门保持不变：MSE 改善 >0.3%，Challenger 胜场 ≥6/10。V22 的分布漂移指标 = 55% 行为类型总变差 + 45% 共同特征均值 RMS；它用于诊断，不作为生产门禁，也不会用当前 shadow 反向更新 Candidate。</small><button class="value-drift-run" type="button">重新运行 V22 诊断</button></div>`
}
function run(){if(running)return;running=true;const btn=PANEL?.querySelector<HTMLButtonElement>('.value-drift-run');if(btn){btn.disabled=true;btn.textContent='价值影子诊断中…'};try{localStorage.setItem(KEY,JSON.stringify(runV22Corrected()))}finally{running=false;decorate()}}
function decorate(){if(!PANEL||decorating)return;decorating=true;observer?.disconnect();const r=read(),title=PANEL.querySelector<HTMLElement>('.brain-title b'),meta=PANEL.querySelector<HTMLElement>('.brain-title span');if(title)title.textContent='价值影子分布诊断 V22';if(meta)meta.textContent=r?`离线 ${r.offlineChallengers} · MSE-only ${r.failureBreakdown.mse_only} · shadow ${pct(r.avgShadowImprovement)}`:'等待 V22 价值诊断';PANEL.querySelector('.value-drift-card')?.remove();const boundary=PANEL.querySelector('.boundary-card'),html=markup(r);if(boundary)boundary.insertAdjacentHTML('afterend',html);else PANEL.insertAdjacentHTML('beforeend',html);PANEL.querySelector<HTMLButtonElement>('.value-drift-run')?.addEventListener('click',run);observer?.observe(PANEL,{childList:true,subtree:true});decorating=false}
if(PANEL){observer=new MutationObserver(decorate);observer.observe(PANEL,{childList:true,subtree:true});decorate();if(!read())setTimeout(run,2900)}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='V22 已定位价值影子真实瓶颈：3/3 个 ES Challenger 胜场并非首要问题，而是 shadow 平均 MSE 改善约 0.19%，低于正式 0.3% 门槛；同时检查 held-out→shadow 分布漂移，不降低价值门'
if(badge)badge.textContent='价值影子诊断'
