import {runV22ValueShadowDiagnostics,type V22Report} from './eval-v22'

export function runV22Corrected(seeds=[17017,17118,17520,18026,19020],roundsPerSeed=240):V22Report{
  const r=runV22ValueShadowDiagnostics(seeds,roundsPerSeed)
  const f=r.failureBreakdown
  let recommendation=r.recommendation
  if(r.offlineChallengers>0&&f.mse_only===r.offlineChallengers){
    recommendation=`${r.offlineChallengers}/${r.offlineChallengers} 个 ES Challenger 都是“胜场已够、但 MSE 改善不足”：平均 shadow 改善 ${(r.avgShadowImprovement*100).toFixed(2)}%，低于正式 0.3% 门槛。held-out→shadow 平均漂移 ${r.avgHeldoutShadowShift.toFixed(3)}，最常漂移维度 ${r.dominantShiftFeature}，最常退化行为 ${r.dominantWorstKind}。下一步应测试“跨历史窗口稳健 ES”，优化平均损失 + 最坏窗口损失；不能降低正式价值门，也不能把当前 shadow 数据用于反向训练。`
  }else if(r.offlineChallengers>0&&f.wins_only===r.offlineChallengers){
    recommendation=`${r.offlineChallengers}/${r.offlineChallengers} 个 ES Challenger 都是“MSE 已改善、但胜场不足”，说明提升集中在少量大误差样本。下一步应在历史多窗口目标中加入胜场/分位数稳定性，而不是降低 6/10 门槛。`
  }else if(r.offlineChallengers>0&&f.both===r.offlineChallengers){
    recommendation=`${r.offlineChallengers}/${r.offlineChallengers} 个 ES Challenger 同时卡 MSE 与胜场，说明 shadow 下整体泛化不足。下一步做历史多窗口最坏分布优化，不调整正式门槛。`
  }
  return{...r,recommendation}
}
