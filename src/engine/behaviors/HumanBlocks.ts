import { BlockBehavior, SimulationContext } from '../SimulationEngine';
import { Block, ResponderConfig, CommanderConfig, CommChannelConfig } from '../../types/blocks';
import { SimulationEvent } from '../../types/simulation';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

export const ResponderBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        const state = ctx.state.get(block.id)!;
        state.fatigue = 0;
        state.timeActive = 0;
        state.shiftStart = 0;
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as ResponderConfig;
        const state = ctx.state.get(block.id)!;

        if (event.type === 'PAGE_SENT') {
            const shiftLength = config.shiftLengthHours * 60;
            const timeOnShift = ctx.timestamp - (state.shiftStart || 0);

            if (timeOnShift > shiftLength) {
                ctx.schedule('HANDOVER_STARTED', 0, block.id, {
                    alertId: event.data?.alertId,
                    incidentId: event.data?.incidentId,
                    severity: event.data?.severity,
                    runbookQuality: event.data?.runbookQuality,
                    runbookOutdated: event.data?.runbookOutdated,
                    handoverProtocol: event.data?.handoverProtocol
                }, block.id);
                return;
            }

            let responseTime = config.baseResponseTimeMean;
            const runbookQuality = event.data?.runbookQuality ?? 0;
            if (runbookQuality) {
                const qualityBoost = event.data?.runbookOutdated ? -0.3 : 0.5;
                responseTime *= 1 - runbookQuality * qualityBoost;
            } else {
                responseTime *= 1.2;
            }

            const fatigue = state.fatigue || 0;
            const fatigueMultiplier = 1 + fatigue * config.fatigueSensitivity * 0.15;
            responseTime *= fatigueMultiplier;

            const severity = event.data?.severity ?? 1;
            const commanderBonus = findCommanderBonus(block.id, ctx, severity);
            responseTime *= 1 - commanderBonus * 0.2;

            const contextLossProb = event.data?.contextLossProb ?? 0;
            if (contextLossProb > 0) {
                responseTime *= 1 + contextLossProb * 0.5;
                if (ctx.random.boolean(contextLossProb * 0.15)) {
                    responseTime += 10;
                }
            }

            const finalDuration = Math.max(1, responseTime * (0.8 + ctx.random.next() * 0.4));
            state.fatigue = fatigue + 1;
            state.timeActive = (state.timeActive || 0) + finalDuration;

            ctx.schedule('PAGE_ACKNOWLEDGED', finalDuration, block.id, {
                alertId: event.data?.alertId,
                incidentId: event.data?.incidentId,
                severity,
                runbookQuality: event.data?.runbookQuality,
                runbookOutdated: event.data?.runbookOutdated,
                runbookAutomated: event.data?.runbookAutomated
            }, block.id);
        }
        else if (event.type === 'HANDOVER_STARTED') {
            const handoverProtocol = event.data?.handoverProtocol ?? 'weak';
            const baseDuration = handoverProtocol === 'strong' ? 10 : handoverProtocol === 'none' ? 45 : 25;
            const handoverDuration = baseDuration + ctx.random.next() * 10;

            ctx.schedule('HANDOVER_COMPLETED', handoverDuration, block.id, {
                alertId: event.data?.alertId,
                incidentId: event.data?.incidentId,
                severity: event.data?.severity,
                runbookQuality: event.data?.runbookQuality,
                runbookOutdated: event.data?.runbookOutdated,
                handoverProtocol
            }, block.id);

            state.shiftStart = ctx.timestamp + handoverDuration;
            state.fatigue = 0;
        }
        else if (event.type === 'HANDOVER_COMPLETED') {
            const alertId = event.data?.alertId;
            if (alertId) {
                ctx.schedule('PAGE_SENT', 0, block.id, {
                    alertId,
                    incidentId: event.data?.incidentId,
                    severity: event.data?.severity,
                    runbookQuality: event.data?.runbookQuality,
                    runbookOutdated: event.data?.runbookOutdated,
                    handoverProtocol: event.data?.handoverProtocol
                }, block.id);
            }
        }
        else if (event.type === 'PAGE_ACKNOWLEDGED') {
            const connectedActions = ctx.getConnections(block.id);
            if (connectedActions.length > 0) {
                const actionId = connectedActions[Math.floor(ctx.random.next() * connectedActions.length)];
                ctx.routeEvent(actionId, 'ACTION_STARTED', 1, {
                    responderId: block.id,
                    incidentId: event.data?.incidentId,
                    severity: event.data?.severity,
                    runbookQuality: event.data?.runbookQuality,
                    runbookOutdated: event.data?.runbookOutdated,
                    runbookAutomated: event.data?.runbookAutomated
                }, block.id);
            }
        }
    }
};

export const CommanderBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },
    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        if (event.type === 'ALERT_FIRED') {
            const config = block.config as CommanderConfig;
            const severity = event.data?.severity ?? 1;
            if (severity >= config.activationSeverity) {
                ctx.state.get(block.id)!.status = 'active';
            }
        }
    }
};

export const CommChannelBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },
    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as CommChannelConfig;
        if (event.type === 'COMM_MESSAGE') {
            const forwardedType = event.data?.forwardedType as SimulationEvent['type'];
            const forwardedData = event.data?.forwardedData ?? {};
            const combinedContextLoss = clamp(
                1 - (1 - (forwardedData.contextLossProb ?? 0)) * (1 - config.contextLossProb),
                0,
                1
            );

            const shouldDrop = ctx.random.boolean(combinedContextLoss * 0.1);
            if (shouldDrop) return;

            const latency = config.latency * (0.8 + 0.4 * ctx.random.next());
            ctx.routeToConnections(block.id, forwardedType, latency, {
                ...forwardedData,
                contextLossProb: combinedContextLoss
            });
        }
    }
};
