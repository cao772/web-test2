import './main-v20'
import {runV21CorrectedDiagnostics,type BoundaryCase,type V21CorrectedReport} from './eval-v21-corrected'

const PANEL=document.querySelector<HTMLElement>('#brainPanel')
const KEY='tiny-world-v21-boundary-v1'
let observer:MutationObserver|undefined
let decorating=false
let running=false
function read():V21CorrectedReport|null{try{return JSON.parse(localStorage.getItem(KEY)??'null') as V21CorrectedReport|null}catch{return null}}
function pct(v:number,d=2){return`${(v*100).toFixed(d)}%`}
function num(v:number,d=2){return Number.isFinite(v)?v.toFixed(d):'0.00'}
function caseRow(c:BoundaryCase){const status=c.actualValuePassed?'value-pass':'value-fail',weights=c.changedWeights.slice(0,3).map(x=>`${String(x.key)} ${x.delta>=0?'+':''}${x.delta.toFixed(2)}`).join(' · ');return`<div class="boundary-case ${status}"><span><b>seed ${c.seed} · cycle ${c.cycle}</b><small>离线 ${pct(c.offlineImprovement)} · 价值 ${pct(c.valueImprovement)} · 胜 ${c.valueWins}/10</small></span><em>Top-1 分歧 ${c.top1Divergences} · 近翻转 ${c.nearFlipFrames} · 更优第二名 ${c.beneficialRunnerUpFrames}<br>${weights||'参数变化很小'}</em></div>`}
function markup(r:V21CorrectedReport|null){
  if(!r)return`<div class="boundary-card waiting"><div class="boundary-head"><b>Top-1 决策边界诊断</b><span>先校正门禁归因</span></div><p>从 V20 原始 shadow improvement / challenger wins 重新判断真实价值门，再分析 Top-1 排序、近翻转和更优第二名。不会改变生产参数。</p><button class="boundary-run" type="button">运行 V21 诊断</button></div>`
  const wrong=r.v20MisclassifiedAsDecision>0,primary=wrong?'✓ 已发现并校正阶段归因错误':r.actualValuePassed?`价值门通过 ${r.actualValuePassed}`:'价值门仍是首要瓶颈'
  return`<div class="boundary-card ${wrong?'corrected':'hold'}"><div class="boundary-head"><b>Top-1 决策边界诊断</b><span>${primary}</span></div><div class="boundary-score"><span>离线 Challenger <b>${r.offlineChallengers}</b></span><span>真实价值通过 <b>${r.actualValuePassed}</b></span><span>V20 误归因 <b>${r.v20MisclassifiedAsDecision}</b></span><span>Top-1 分歧 <b>${r.top1Divergences}</b></span><span>近翻转帧 <b>${r.nearFlipFrames}</b></span><span>更优第二名 <b>${r.beneficialRunnerUpFrames}</b></span></div><div class="margin-strip"><span>Champion 一二名分差 <b>${num(r.avgChampionMargin)}</b></span><i>→</i><span>Challenger 分差 <b>${num(r.avgChallengerMargin)}</b></span><em>压缩 ${num(r.avgMarginCompression)}</em></div><p><b>${r.dominantDiagnosis}</b></p><p>${r.recommendation}</p><div class="boundary-cases">${r.cases.map(caseRow).join('')}</div><small>V21 不把“decisionShadow.status=rejected”直接等同于决策门失败，而是按正式 V12 原始价值条件重新判定：MSE 改善 >0.3%、Challenger 胜场 ≥6/10。排序诊断属于下一层观察，不会越过未通过的价值门。</small><button class="boundary-run" type="button">重新运行 V21 校正诊断</button></div>`
}
function run(){if(running)return;running=true;const btn=PANEL?.querySelector<HTMLButtonElement>('.boundary-run');if(btn){btn.disabled=true;btn.textContent='校正并诊断中…'};try{localStorage.setItem(KEY,JSON.stringify(runV21CorrectedDiagnostics()))}finally{running=false;decorate()}}
function decorate(){if(!PANEL||decorating)return;decorating=true;observer?.disconnect();const r=read(),title=PANEL.querySelector<HTMLElement>('.brain-title b'),meta=PANEL.querySelector<HTMLElement>('.brain-title span');if(title)title.textContent='决策边界校正诊断 V21';if(meta)meta.textContent=r?`离线 ${r.offlineChallengers} · 真实价值通过 ${r.actualValuePassed} · V20 误归因 ${r.v20MisclassifiedAsDecision}`:'等待 V21 校正诊断';PANEL.querySelector('.boundary-card')?.remove();const dual=PANEL.querySelector('.dual-shadow-card'),html=markup(r);if(dual)dual.insertAdjacentHTML('afterend',html);else PANEL.insertAdjacentHTML('beforeend',html);PANEL.querySelector<HTMLButtonElement>('.boundary-run')?.addEventListener('click',run);observer?.observe(PANEL,{childList:true,subtree:true});decorating=false}
if(PANEL){observer=new MutationObserver(decorate);observer.observe(PANEL,{childList:true,subtree:true});decorate();if(!read())setTimeout(run,2500)}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='V21 先校正 V20 的价值门/决策门归因：3 个 ES 离线 Challenger 实际 0 个通过正式价值影子；Top-1 分歧 0 只是下一层潜在现象，不再误判为当前首要瓶颈'
if(badge)badge.textContent='门禁归因校正'
