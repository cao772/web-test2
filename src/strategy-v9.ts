import {bindStrategyForInference,createStrategy as createV12,makeDecision,reportDecisionReward,socialStrategyScore,strategySummary,toyStrategyScore,type DecisionTrace,type StrategyState} from './strategy-v12'
export {makeDecision,reportDecisionReward,socialStrategyScore,strategySummary,toyStrategyScore}
export type {DecisionTrace,StrategyState}
export function createStrategy(raw?:Partial<StrategyState>|null){return bindStrategyForInference(createV12(raw))}
