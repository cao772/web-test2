import {bindStrategyForInference,createStrategy as createV16,makeDecision,reportDecisionReward,socialStrategyScore as socialScoreV16,strategySummary,toyStrategyScore as toyScoreV16,type DecisionTrace,type StrategyFeatures,type StrategyState} from './strategy-v16'
export {makeDecision,reportDecisionReward,strategySummary}
export type {DecisionTrace,StrategyState}
export function createStrategy(raw?:Partial<StrategyState>|null){return bindStrategyForInference(createV16(raw))}
export function toyStrategyScore(s:StrategyState,f:StrategyFeatures){return toyScoreV16(s,f as Parameters<typeof toyScoreV16>[1])}
export function socialStrategyScore(s:StrategyState,f:StrategyFeatures){return socialScoreV16(s,f as Parameters<typeof socialScoreV16>[1])}
