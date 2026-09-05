import {mkdir,writeFile} from 'node:fs/promises'
import {runV19RobustTournament} from '../src/eval-v19-robust'

const seed=Number(process.env.V19_SEED??17017)
const rounds=Number(process.env.V19_ROUNDS??240)
const report=runV19RobustTournament(seed,rounds)
await mkdir('eval-results',{recursive:true})
await writeFile('eval-results/v19-tournament.json',JSON.stringify(report,null,2),'utf8')
console.log(JSON.stringify({
  version:report.version,
  seeds:report.seeds,
  roundsPerSeed:report.roundsPerSeed,
  methods:report.methods,
  winner:report.winner,
  recommendation:report.recommendation,
  productionChanged:report.productionChanged,
},null,2))
if(report.productionChanged)throw new Error('V19 tournament must not mutate production parameters')
