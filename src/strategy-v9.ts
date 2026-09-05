import {bindStrategyForInference,createStrategy as createV14,makeDecision,reportDecisionReward,socialStrategyScore,strategySummary,toyStrategyScore,type DecisionTrace,type StrategyState} from './strategy-v14'
export {makeDecision,reportDecisionReward,socialStrategyScore,strategySummary,toyStrategyScore}
export type {DecisionTrace,StrategyState}
export function createStrategy(raw?:Partial<StrategyState>|null){return bindStrategyForInference(createV14(raw))}
