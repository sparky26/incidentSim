import { BlockBehavior, SimulationContext } from '../SimulationEngine';
import { Block, ActionConfig } from '../../types/blocks';
import { SimulationEvent } from '../../types/simulation';

export const ActionBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as ActionConfig;

        if (event.type === 'ACTION_STARTED') {
            // Calculate duration
            const duration = ctx.random.nextLogNormal(config.durationMean, config.durationMean * 0.2);

            ctx.schedule('ACTION_COMPLETED', duration, block.id, event.data);
        }
        else if (event.type === 'ACTION_COMPLETED') {
            // Check success
            const success = ctx.random.boolean(config.successProbability);

            const targets = ctx.getConnections(block.id);

            if (success) {
                targets.forEach(t => {
                    ctx.schedule('SERVICE_RECOVERED', 0, t, {
                        reason: 'action_success',
                        incidentId: event.data?.incidentId
                    });
                    // Also clear alerts?
                });
            } else {
                // Fail! Side effects?
                // "Side effects (may worsen another service)"
                if (config.isRollback) {
                    // maybe fails to rollback
                }
                // Retry?
            }
        }
    }
};
