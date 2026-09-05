import {bindStrategyForInference,createStrategy as createV16,makeDecision,reportDecisionReward,socialStrategyScore,strategySummary,toyStrategyScore,type DecisionTrace,type StrategyState} from './strategy-v16'
export {makeDecision,reportDecisionReward,socialStrategyScore,strategySummary,toyStrategyScore}
export type {DecisionTrace,StrategyState}
export function createStrategy(raw?:Partial<StrategyState>|null){return bindStrategyForInference(createV16(raw))}
