import {mkdirSync,writeFileSync} from 'node:fs'
import {runV17Evaluation} from '../src/eval-v17'

const seed=Number(process.env.V17_SEED??17017)
const rounds=Number(process.env.V17_ROUNDS??240)
const report=runV17Evaluation(seed,rounds)
mkdirSync('eval-results',{recursive:true})
writeFileSync('eval-results/v17-evaluation.json',JSON.stringify(report,null,2))
console.log(JSON.stringify({passed:report.passed,seed:report.seed,rounds:report.rounds,checks:report.checks,longRun:report.longRun},null,2))
if(!report.passed)process.exitCode=1
