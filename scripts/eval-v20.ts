import {mkdir,writeFile} from 'node:fs/promises'
import {runV20Shadow,type V20MethodId,type V20MethodSummary,type V20Run,type V20Stage} from '../src/eval-v20'

const seeds=(process.env.V20_SEEDS??'17017,17118,17520,18026,19020').split(',').map(x=>Number(x.trim())).filter(Number.isFinite)
const rounds=Number(process.env.V20_ROUNDS??240)
const raw=runV20Shadow(seeds,rounds)
const rank=(stage:V20Stage)=>({offline_rejected:0,value_rejected:1,decision_rejected:2,context_rejected:3,trajectory_rejected:4,transition_rejected:5,observing:6,rolled_back:6.25,stable:7,incomplete:1.5}[stage])
const runs:V20Run[]=raw.runs.map(r=>{
  const valuePassed=r.shadowImprovement>.003&&r.challengerWins>=6
  if(r.stage==='decision_rejected'&&!valuePassed)return{...r,stage:'value_rejected',stageScore:1,reason:`价值影子未通过：改善 ${(r.shadowImprovement*100).toFixed(2)}%，胜场 ${r.challengerWins}/10`}
  return r
})
const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0
const passed=(stage:V20Stage,gate:'value'|'decision'|'context'|'trajectory'|'transition')=>rank(stage)>={value:2,decision:3,context:4,trajectory:5,transition:6}[gate]
function summarize(id:V20MethodId,name:string):V20MethodSummary{const rs=runs.filter(r=>r.method===id),offline=rs.filter(r=>r.stage!=='offline_rejected'),transition=rs.filter(r=>passed(r.stage,'transition'));return{id,name,episodes:rs.length,offlineAccepted:offline.length,valuePassed:rs.filter(r=>passed(r.stage,'value')).length,decisionPassed:rs.filter(r=>passed(r.stage,'decision')).length,contextPassed:rs.filter(r=>passed(r.stage,'context')).length,trajectoryPassed:rs.filter(r=>passed(r.stage,'trajectory')).length,transitionPassed:transition.length,observing:rs.filter(r=>r.stage==='observing').length,stable:rs.filter(r=>r.stage==='stable').length,rolledBack:rs.filter(r=>r.stage==='rolled_back').length,avgStageScore:avg(rs.map(r=>r.stageScore)),avgOfflineImprovement:avg(offline.map(r=>r.offlineImprovement)),avgTransitionGain:avg(transition.map(r=>r.transitionGain)),seedsWithOffline:seeds.filter(seed=>rs.some(r=>r.seed===seed&&r.stage!=='offline_rejected')).length,seedsWithTransition:seeds.filter(seed=>rs.some(r=>r.seed===seed&&passed(r.stage,'transition'))).length,seedsWithStable:seeds.filter(seed=>rs.some(r=>r.seed===seed&&r.stage==='stable')).length}}
const methods=[summarize('current','A 当前生成器'),summarize('evolution_strategy','E Evolution Strategy')]
const report={...raw,runs,methods,winner:null,recommendation:'V20 阶段归因已按 V21 校正：Evolution Strategy 有 3 个离线 Challenger，但 0 个真正通过正式价值影子门；生产生成器保持不变。'}
await mkdir('eval-results',{recursive:true})
await writeFile('eval-results/v20-shadow.json',JSON.stringify(report,null,2),'utf8')
console.log(JSON.stringify({version:report.version,seeds:report.seeds,roundsPerSeed:report.roundsPerSeed,methods:report.methods,winner:report.winner,recommendation:report.recommendation,productionChanged:report.productionChanged},null,2))
if(report.productionChanged)throw new Error('V20 shadow evaluation must not mutate production parameters')
