import {mkdir,writeFile} from 'node:fs/promises'
import {runV18Diagnostics} from '../src/eval-v18'

const seed=Number(process.env.V18_SEED??17017)
const rounds=Number(process.env.V18_ROUNDS??240)
const report=runV18Diagnostics(seed,rounds)
await mkdir('eval-results',{recursive:true})
await writeFile('eval-results/v18-diagnostics.json',JSON.stringify(report,null,2),'utf8')
console.log(JSON.stringify({
  version:report.version,
  seed:report.seed,
  rounds:report.rounds,
  productionCycles:report.productionCycles,
  productionAccepted:report.productionAccepted,
  rejectionBreakdown:report.rejectionBreakdown,
  recommended:report.recommended,
  recommendation:report.recommendation,
  productionChanged:report.productionChanged,
},null,2))
if(report.productionChanged)throw new Error('V18 diagnostics must not mutate production parameters')
