import {bindStrategyForInference,createStrategy as createV15,makeDecision,reportDecisionReward,socialStrategyScore,strategySummary,toyStrategyScore,type DecisionTrace,type StrategyState} from './strategy-v15'
export {makeDecision,reportDecisionReward,socialStrategyScore,strategySummary,toyStrategyScore}
export type {DecisionTrace,StrategyState}
export function createStrategy(raw?:Partial<StrategyState>|null){return bindStrategyForInference(createV15(raw))}
