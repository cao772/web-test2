import './main-v18'
import {runV19RobustTournament,type RobustGeneratorResult,type V19RobustReport} from './eval-v19-robust'

const PANEL=document.querySelector<HTMLElement>('#brainPanel')
const KEY='tiny-world-v19-tournament-v1'
let observer:MutationObserver|undefined
let decorating=false
let running=false
function read():V19RobustReport|null{try{return JSON.parse(localStorage.getItem(KEY)??'null') as V19RobustReport|null}catch{return null}}
function pct(v:number,digits=2){return`${(v*100).toFixed(digits)}%`}
function row(x:RobustGeneratorResult){const state=x.robust?'winner':x.totalSafeAccepted>0?'signal':'none';return`<div class="generator-row ${state}"><span><b>${x.name}</b><small>${x.seedsWithSafe}/${x.seeds} 种子有安全接受</small></span><em>接受 ${x.totalAccepted} · safe ${x.totalSafeAccepted} · unsafe ${x.totalUnsafeAccepted}<br>held ${pct(x.avgHeldoutImprovement)} · future ${pct(x.avgFutureImprovement)}</em></div>`}
function markup(r:V19RobustReport|null){
  if(!r)return`<div class="generator-card waiting"><div class="generator-head"><b>Candidate Generator 锦标赛</b><span>5 种子稳健验证</span></div><p>A~E 五种候选生成器只看 proposal；held-out 与 future 完全隔离。不会修改 V16 正式生成器。</p><button class="generator-run" type="button">运行 V19 锦标赛</button></div>`
  const w=r.winner
  return`<div class="generator-card ${w?'qualified':'hold'}"><div class="generator-head"><b>Candidate Generator 锦标赛</b><span>${w?'✓ 有受控实验候选':'保持生产生成器'}</span></div><div class="generator-score"><span>固定种子 <b>${r.seeds.length}</b></span><span>每种子轮数 <b>${r.roundsPerSeed}</b></span><span>生产改动 <b>${r.productionChanged?'是':'否'}</b></span></div>${w?`<div class="generator-winner">候选 <b>${w.name}</b> · ${w.seedsWithSafe}/${w.seeds} 种子 · safe ${w.totalSafeAccepted} · unsafe ${w.totalUnsafeAccepted} · future ${pct(w.avgFutureImprovement)}</div>`:''}<p>${r.recommendation}</p><div class="generator-list">${r.methods.map(row).join('')}</div><small>稳健门：至少 2 个种子出现安全接受、累计 ≥3 次 safe、0 次 unsafe、future 平均为正且最差 future 不低于 -0.2%。通过只代表可以进入下一轮受控 Challenger 实验，不代表已部署生产。</small><button class="generator-run" type="button">重新运行 5 种子锦标赛</button></div>`
}
function run(){if(running)return;running=true;const btn=PANEL?.querySelector<HTMLButtonElement>('.generator-run');if(btn){btn.disabled=true;btn.textContent='5 种子评测中…'};try{localStorage.setItem(KEY,JSON.stringify(runV19RobustTournament(17017,240)))}finally{running=false;decorate()}}
function decorate(){
  if(!PANEL||decorating)return
  decorating=true;observer?.disconnect()
  const r=read(),title=PANEL.querySelector<HTMLElement>('.brain-title b'),meta=PANEL.querySelector<HTMLElement>('.brain-title span')
  if(title)title.textContent='Candidate Generator 锦标赛 V19'
  if(meta)meta.textContent=r?(r.winner?`${r.winner.name} 通过稳健门 · 尚未进生产`:'五生成器均未通过稳健门'):'等待 5 种子评测'
  PANEL.querySelector('.generator-card')?.remove()
  const diagnostic=PANEL.querySelector('.diagnostic-card'),html=markup(r)
  if(diagnostic)diagnostic.insertAdjacentHTML('afterend',html);else PANEL.insertAdjacentHTML('beforeend',html)
  PANEL.querySelector<HTMLButtonElement>('.generator-run')?.addEventListener('click',run)
  observer?.observe(PANEL,{childList:true,subtree:true});decorating=false
}
if(PANEL){observer=new MutationObserver(decorate);observer.observe(PANEL,{childList:true,subtree:true});decorate();if(!read())setTimeout(run,1700)}
const status=document.querySelector<HTMLElement>('#statusText'),badge=document.querySelector<HTMLElement>('#autoBadge')
if(status)status.textContent='V19 不再调低门槛：五种 Candidate Generator 在相同 proposal / held-out / future 上做 5 种子锦标赛，只有可重复安全改善才获得受控实验资格'
if(badge)badge.textContent='生成器锦标赛'
