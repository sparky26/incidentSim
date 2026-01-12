import { BlockBehavior, SimulationContext } from '../SimulationEngine';
import { Block, ActionConfig, CommanderConfig } from '../../types/blocks';
import { SimulationEvent } from '../../types/simulation';
import { getRunbookEffectiveness } from '../../data/evidenceCatalog';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const samplePositiveLogNormal = (mean: number, stdDev: number, ctx: SimulationContext) =>
    Math.max(1, ctx.random.nextLogNormal(mean, stdDev));

const findCommanderBonus = (blockId: string, ctx: SimulationContext, severity: number) => {
    const connections = ctx.connections.filter(c => c.source === blockId || c.target === blockId);
    const candidateIds = new Set<string>();

    connections.forEach(c => {
        const otherId = c.source === blockId ? c.target : c.source;
        candidateIds.add(otherId);
        const otherBlock = ctx.getBlock(otherId);
        if (otherBlock?.type === 'CommChannel') {
            ctx.connections.forEach(inner => {
                if (inner.source === otherId) candidateIds.add(inner.target);
                if (inner.target === otherId) candidateIds.add(inner.source);
            });
        }
    });

    for (const id of candidateIds) {
        const block = ctx.getBlock(id);
        if (block?.type === 'Commander') {
            const config = block.config as CommanderConfig;
            if (severity >= config.activationSeverity) {
                return config.coordinationBonus;
            }
        }
    }

    return 0;
};

export const ActionBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as ActionConfig;
        const runbookEffectiveness = getRunbookEffectiveness(config.evidenceProfileId);

        if (event.type === 'ACTION_STARTED') {
            const runbookQuality = event.data?.runbookQuality ?? 0;
            const runbookPenalty = event.data?.runbookOutdated ? 0.2 : 0;
            const severity = event.data?.severity ?? 1;
            const commanderBonus = findCommanderBonus(block.id, ctx, severity);

            let durationMean = config.durationMean;
            let durationStdDev = config.durationStdDev;
            const runbookModifier = 1 - runbookQuality * 0.3 * runbookEffectiveness.responseDelay;
            const runbookPenaltyModifier = 1 + runbookPenalty;
            const commanderModifier = 1 - commanderBonus * 0.2;

            durationMean *= runbookModifier * runbookPenaltyModifier * commanderModifier;
            durationStdDev *= runbookModifier * runbookPenaltyModifier * commanderModifier;

            const duration = samplePositiveLogNormal(durationMean, durationStdDev, ctx);

            ctx.schedule('ACTION_COMPLETED', duration, block.id, event.data, block.id);
        }
        else if (event.type === 'ACTION_COMPLETED') {
            const runbookQuality = event.data?.runbookQuality ?? 0;
            const runbookPenalty = event.data?.runbookOutdated ? 0.2 : 0;
            const severity = event.data?.severity ?? 1;
            const commanderBonus = findCommanderBonus(block.id, ctx, severity);

            let successProbability = config.successProbability;
            successProbability += runbookQuality * 0.2 * runbookEffectiveness.successProbability;
            successProbability -= runbookPenalty;
            successProbability += commanderBonus * 0.2;
            successProbability = clamp(successProbability, 0, 1);

            const success = ctx.random.boolean(successProbability);

            const targets = ctx.getConnections(block.id);

            if (success) {
                targets.forEach(t => {
                    ctx.routeEvent(t, 'SERVICE_RECOVERED', 0, {
                        reason: 'action_success',
                        incidentId: event.data?.incidentId
                    }, block.id);
                });
            } else if (config.isRollback) {
                targets.forEach(t => {
                    ctx.routeEvent(t, 'FAILURE_OCCURRED', 0, {
                        reason: 'rollback_failed',
                        incidentId: event.data?.incidentId
                    }, block.id);
                });
            }
        }
    }
};
