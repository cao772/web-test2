import {runV19Tournament,type GeneratorId,type GeneratorResult,type V19Report} from './eval-v19'

export type RobustGeneratorResult={
  id:GeneratorId
  name:string
  seeds:number
  seedsWithAccepted:number
  seedsWithSafe:number
  totalAccepted:number
  totalSafeAccepted:number
  totalUnsafeAccepted:number
  totalAmbiguousAccepted:number
  avgHeldoutImprovement:number
  avgFutureImprovement:number
  worstFutureImprovement:number
  robust:boolean
}
export type V19RobustReport={
  version:'V19-ROBUST'
  seeds:number[]
  roundsPerSeed:number
  runs:V19Report[]
  methods:RobustGeneratorResult[]
  winner:RobustGeneratorResult|null
  recommendation:string
  productionChanged:boolean
  generatedAt:string
}

const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0
function aggregate(id:GeneratorId,runs:V19Report[]):RobustGeneratorResult{
  const rows=runs.map(r=>r.methods.find(x=>x.id===id)).filter((x):x is GeneratorResult=>Boolean(x)),name=rows[0]?.name??id
  const acceptedRows=rows.filter(x=>x.accepted>0),futureRows=rows.filter(x=>x.accepted>0)
  const totalAccepted=rows.reduce((s,x)=>s+x.accepted,0),totalSafeAccepted=rows.reduce((s,x)=>s+x.safeAccepted,0),totalUnsafeAccepted=rows.reduce((s,x)=>s+x.unsafeAccepted,0),totalAmbiguousAccepted=rows.reduce((s,x)=>s+x.ambiguousAccepted,0),seedsWithAccepted=acceptedRows.length,seedsWithSafe=rows.filter(x=>x.safeAccepted>0).length,avgHeldoutImprovement=avg(acceptedRows.map(x=>x.avgHeldoutImprovement)),avgFutureImprovement=avg(futureRows.map(x=>x.avgFutureImprovement)),worstFutureImprovement=futureRows.length?Math.min(...futureRows.map(x=>x.worstFutureImprovement)):0
  const robust=seedsWithSafe>=2&&totalSafeAccepted>=3&&totalUnsafeAccepted===0&&avgFutureImprovement>0&&worstFutureImprovement>=-.002
  return{id,name,seeds:rows.length,seedsWithAccepted,seedsWithSafe,totalAccepted,totalSafeAccepted,totalUnsafeAccepted,totalAmbiguousAccepted,avgHeldoutImprovement,avgFutureImprovement,worstFutureImprovement,robust}
}

export function runV19RobustTournament(baseSeed=17017,rounds=240):V19RobustReport{
  const seeds=[baseSeed,baseSeed+101,baseSeed+503,baseSeed+1009,baseSeed+2003],runs=seeds.map(seed=>runV19Tournament(seed,rounds)),ids:GeneratorId[]=['current','reward_weighted','pairwise','finite_difference','evolution_strategy'],methods=ids.map(id=>aggregate(id,runs)).sort((a,b)=>Number(b.robust)-Number(a.robust)||b.totalSafeAccepted-a.totalSafeAccepted||a.totalUnsafeAccepted-b.totalUnsafeAccepted||b.avgFutureImprovement-a.avgFutureImprovement),winner=methods.find(x=>x.robust)??null
  const signal=methods.find(x=>x.totalSafeAccepted>0&&x.totalUnsafeAccepted===0)
  const recommendation=winner?`${winner.name} 通过多种子稳健性门：${winner.seedsWithSafe}/${winner.seeds} 个种子出现安全接受，累计 ${winner.totalSafeAccepted} 次安全接受、0 次 unsafe，future 平均提升 ${(winner.avgFutureImprovement*100).toFixed(2)}%。仅获得受控 Challenger 生成器实验资格，不自动进入 V16 生产。`:signal?`${signal.name} 出现正向信号：${signal.seedsWithSafe}/${signal.seeds} 个种子、累计 ${signal.totalSafeAccepted} 次安全接受且当前 0 unsafe，但尚未达到“≥2 个种子且累计 ≥3 次安全接受”的稳健门。继续保持生产生成器不变。`:`五种生成器在 5 组固定种子上仍未产生可重复的安全接受信号，保持 V16 生产生成器不变。`
  return{version:'V19-ROBUST',seeds,roundsPerSeed:rounds,runs,methods,winner,recommendation,productionChanged:false,generatedAt:new Date().toISOString()}
}
