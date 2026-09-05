import {mkdir,writeFile} from 'node:fs/promises'
import {runV20Shadow} from '../src/eval-v20'

const seeds=(process.env.V20_SEEDS??'17017,17118,17520,18026,19020').split(',').map(x=>Number(x.trim())).filter(Number.isFinite)
const rounds=Number(process.env.V20_ROUNDS??240)
const report=runV20Shadow(seeds,rounds)
await mkdir('eval-results',{recursive:true})
await writeFile('eval-results/v20-shadow.json',JSON.stringify(report,null,2),'utf8')
console.log(JSON.stringify({version:report.version,seeds:report.seeds,roundsPerSeed:report.roundsPerSeed,methods:report.methods,winner:report.winner,recommendation:report.recommendation,productionChanged:report.productionChanged},null,2))
if(report.productionChanged)throw new Error('V20 shadow evaluation must not mutate production parameters')
