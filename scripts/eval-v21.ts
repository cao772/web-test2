import {mkdir,writeFile} from 'node:fs/promises'
import {runV21BoundaryDiagnostics} from '../src/eval-v21'

const report=runV21BoundaryDiagnostics()
await mkdir('eval-results',{recursive:true})
await writeFile('eval-results/v21-boundary.json',JSON.stringify(report,null,2),'utf8')
console.log(JSON.stringify({version:report.version,seeds:report.seeds,roundsPerSeed:report.roundsPerSeed,summary:report.summary,recommendation:report.recommendation,productionChanged:report.productionChanged},null,2))
if(report.productionChanged)throw new Error('V21 diagnostics must not mutate production strategy')
if(!report.summary.qualifyingChallengers)throw new Error('V21 expected at least one ES challenger to pass offline + value shadow in the fixed benchmark')
