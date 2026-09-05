import {mkdir,writeFile} from 'node:fs/promises'
import {runV21CorrectedDiagnostics} from '../src/eval-v21-corrected'

const report=runV21CorrectedDiagnostics()
await mkdir('eval-results',{recursive:true})
await writeFile('eval-results/v21-boundary.json',JSON.stringify(report,null,2),'utf8')
console.log(JSON.stringify({
  version:report.version,
  seeds:report.seeds,
  roundsPerSeed:report.roundsPerSeed,
  offlineChallengers:report.offlineChallengers,
  actualValuePassed:report.actualValuePassed,
  v20MisclassifiedAsDecision:report.v20MisclassifiedAsDecision,
  totalShadowFrames:report.totalShadowFrames,
  top1Divergences:report.top1Divergences,
  nearFlipFrames:report.nearFlipFrames,
  beneficialRunnerUpFrames:report.beneficialRunnerUpFrames,
  avgChampionMargin:report.avgChampionMargin,
  avgChallengerMargin:report.avgChallengerMargin,
  recommendation:report.recommendation,
  productionChanged:report.productionChanged,
},null,2))
if(report.productionChanged)throw new Error('V21 diagnostics must not mutate production strategy')
if(!report.offlineChallengers)throw new Error('V21 expected at least one ES challenger to pass the V20 offline gate')
