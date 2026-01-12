import { BlockBehavior, SimulationContext } from '../SimulationEngine';
import { Block, RunbookConfig } from '../../types/blocks';
import { SimulationEvent } from '../../types/simulation';

export const RunbookBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as RunbookConfig;

        if (event.type === 'ALERT_FIRED' && config.automated) {
            const qualityPenalty = config.isOutdated ? 0.3 : 0;
            const automationChance = Math.max(0, config.quality - qualityPenalty);

            if (!ctx.random.boolean(automationChance)) return;

            const connectedIds = ctx.connections
                .filter(c => c.source === block.id || c.target === block.id)
                .map(c => (c.source === block.id ? c.target : c.source));

            connectedIds.forEach(targetId => {
                const targetBlock = ctx.getBlock(targetId);
                if (!targetBlock) return;

                if (targetBlock.type === 'Action') {
                    ctx.routeEvent(targetId, 'ACTION_STARTED', 2 + ctx.random.next() * 3, {
                        incidentId: event.data?.incidentId,
                        severity: event.data?.severity,
                        runbookQuality: config.quality,
                        runbookOutdated: config.isOutdated,
                        runbookAutomated: true
                    }, block.id);
                }

                if (targetBlock.type === 'Service') {
                    ctx.routeEvent(targetId, 'SERVICE_RECOVERED', 5 + ctx.random.next() * 5, {
                        incidentId: event.data?.incidentId,
                        reason: 'runbook_automation'
                    }, block.id);
                }
            });
        }
    }
};
