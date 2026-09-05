import {mkdir,writeFile} from 'node:fs/promises'
import {runV22ValueShadowDiagnostics} from '../src/eval-v22'

const report=runV22ValueShadowDiagnostics()
await mkdir('eval-results',{recursive:true})
await writeFile('eval-results/v22-value-shadow.json',JSON.stringify(report,null,2),'utf8')
console.log(JSON.stringify({version:report.version,seeds:report.seeds,roundsPerSeed:report.roundsPerSeed,offlineChallengers:report.offlineChallengers,failureBreakdown:report.failureBreakdown,avgOfflineImprovement:report.avgOfflineImprovement,avgShadowImprovement:report.avgShadowImprovement,offlineShadowCorrelation:report.offlineShadowCorrelation,avgProposalShadowShift:report.avgProposalShadowShift,avgHeldoutShadowShift:report.avgHeldoutShadowShift,dominantWorstKind:report.dominantWorstKind,dominantShiftFeature:report.dominantShiftFeature,parameterShiftOverlap:report.parameterShiftOverlap,recommendation:report.recommendation,productionChanged:report.productionChanged},null,2))
if(report.productionChanged)throw new Error('V22 diagnostics must not mutate production strategy')
if(!report.offlineChallengers)throw new Error('V22 expected fixed benchmark ES offline challengers')
