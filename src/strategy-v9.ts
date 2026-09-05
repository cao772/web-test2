import {bindStrategyForInference,createStrategy as createV13,makeDecision,reportDecisionReward,socialStrategyScore,strategySummary,toyStrategyScore,type DecisionTrace,type StrategyState} from './strategy-v13'
export {makeDecision,reportDecisionReward,socialStrategyScore,strategySummary,toyStrategyScore}
export type {DecisionTrace,StrategyState}
export function createStrategy(raw?:Partial<StrategyState>|null){return bindStrategyForInference(createV13(raw))}
