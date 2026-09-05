import './main-v16'
import {runV17Evaluation,type V17EvaluationReport} from './eval-v17'

const PANEL=document.querySelector<HTMLElement>('#brainPanel')
const EVAL_KEY='tiny-world-v17-eval-v1'
let observer:MutationObserver|undefined
let decorating=false
let running=false
function readReport():V17EvaluationReport|null{try{return JSON.parse(localStorage.getItem(EVAL_KEY)??'null') as V17EvaluationReport|null}catch{return null}}
function pct(v:number,digits=1){return`${(v*100).toFixed(digits)}%`}
function verdict(report:V17EvaluationReport){if(report.behavioralVerdict==='improved')return['✓ 已证明改善','improved'];if(report.behavioralVerdict==='regressed')return['× 长跑退化','regressed'];return['△ 未证明改善','inconclusive']}
function labMarkup(report:V17EvaluationReport|null){
  if(!report)return`<div class="eval-card waiting"><div class="eval-head"><b>自进化评测实验室</b><span>固定种子基准</span></div><p>隔离运行 240 轮确定性决策，不修改当前真实 Champion。验证 Challenger、稳定、回滚、可重复性和长跑趋势。</p><button class="eval-run" type="button">运行 240 轮评测</button></div>`
  const [label,klass]=verdict(report),lr=report.longRun,passed=report.checks.filter(x=>x.pass).length
  return`<div class="eval-card ${klass}"><div class="eval-head"><b>自进化评测实验室</b><span>${label}</span></div><div class="eval-score"><span>生命周期 <b>${passed}/${report.checks.length}</b></span><span>反思 <b>${lr.reflectionCycles}</b></span><span>自然晋升 <b>${lr.shadowPromoted}</b></span></div><div class="eval-trend">前窗 <b>${pct(lr.firstAvg)}</b> → 后窗 <b>${pct(lr.lastAvg)}</b> · Δ <b>${pct(lr.delta,2)}</b></div><p>${report.behavioralReason}</p><div class="eval-checks">${report.checks.map(x=>`<span class="${x.pass?'pass':'fail'}">${x.pass?'✓':'×'} ${x.name}</span>`).join('')}</div><small>seed ${report.seed} · ${report.rounds} rounds · digest ${lr.actionDigest} · 转移 ${lr.transitionCount} / 轨迹 ${lr.trajectoryCount} / 上下文 ${lr.contextCount}</small><button class="eval-run" type="button">重新运行同种子评测</button></div>`
}
function runEvaluation(){if(running)return;running=true;const button=PANEL?.querySelector<HTMLButtonElement>('.eval-run');if(button){button.disabled=true;button.textContent='评测中…'};try{const report=runV17Evaluation(17017,240);localStorage.setItem(EVAL_KEY,JSON.stringify(report))}finally{running=false;decorate()}}
function decorate(){
  if(!PANEL||decorating)return
  decorating=true;observer?.disconnect()
  const report=readReport(),title=PANEL.querySelector<HTMLElement>('.brain-title b'),meta=PANEL.querySelector<HTMLElement>('.brain-title span')
  if(title)title.textContent='自进化评测 V17'
  if(meta)meta.textContent=report?`${report.checks.filter(x=>x.pass).length}/${report.checks.length} 生命周期检查 · ${report.improvementDemonstrated?'改善已证明':'长期改善未证明'}`:'等待隔离评测'
  PANEL.querySelector('.eval-card')?.remove()
  const registry=PANEL.querySelector('.registry-card'),html=labMarkup(report)
  if(registry)registry.insertAdjacentHTML('afterend',html);else PANEL.insertAdjacentHTML('beforeend',html)
  PANEL.querySelector<HTMLButtonElement>('.eval-run')?.addEventListener('click',runEvaluation)
  observer?.observe(PANEL,{childList:true,subtree:true});decorating=false
}
if(PANEL){observer=new MutationObserver(decorate);observer.observe(PANEL,{childList:true,subtree:true});decorate();if(!readReport())setTimeout(runEvaluation,900)}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='V17 不再只看能否编译：固定随机种子隔离长跑，直接验证 Challenger、版本稳定、自动回滚与长期真实回报趋势'
if(badge)badge.textContent='自进化评测中'
