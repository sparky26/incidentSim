import { BlockBehavior, SimulationContext } from '../SimulationEngine';
import { Block, SignalConfig, AlertRuleConfig, EscalationConfig, OnCallConfig, RunbookConfig } from '../../types/blocks';
import { SimulationEvent } from '../../types/simulation';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const findConnectedRunbook = (block: Block, ctx: SimulationContext): Block | undefined => {
    const runbookConnection = ctx.connections.find(c =>
        (c.source === block.id && ctx.getBlock(c.target)?.type === 'Runbook') ||
        (c.target === block.id && ctx.getBlock(c.source)?.type === 'Runbook')
    );

    if (!runbookConnection) return undefined;
    const runbookId = runbookConnection.source === block.id ? runbookConnection.target : runbookConnection.source;
    return runbookId ? ctx.getBlock(runbookId) : undefined;
};

export const SignalBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        ctx.schedule('NOISE_CHECK', ctx.random.next() * 60, block.id, undefined, block.id); // Start within first hour
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as SignalConfig;
        let detected = false;
        let isFalsePositive = false;

        const sensitivity = 0.6 + 0.4 * (config.signalToNoiseRatio ?? 1.0);

        const attemptDetection = (strength: number) => {
            const chance = clamp(strength * sensitivity, 0, 1);
            return ctx.random.boolean(chance);
        };

        if (event.type === 'dependency_check') {
            if (event.data?.status === 'down') {
                detected = attemptDetection(1);
            } else if (event.data?.status === 'degraded') {
                detected = attemptDetection(0.6);
            }
        }
        else if (event.type === 'FAILURE_OCCURRED') {
            detected = attemptDetection(1);
        }
        else if (event.type === 'high_load' && (config.metric === 'latency' || config.metric === 'saturation')) {
            detected = attemptDetection(0.7);
        }
        else if (event.type === 'LOAD_UPDATE' && config.metric === 'saturation') {
            const load = event.data?.load ?? 1;
            if (load > 1.2) {
                detected = attemptDetection(clamp(load / 2, 0, 1));
            }
        }
        else if (event.type === 'NOISE_CHECK') {
            const ratio = config.signalToNoiseRatio ?? 1.0;
            if (ratio < 1.0) {
                const noiseProb = 1 - ratio;
                if (ctx.random.boolean(noiseProb)) {
                    detected = true;
                    isFalsePositive = true;
                }
            }
            ctx.schedule('NOISE_CHECK', 30 + ctx.random.next() * 60, block.id, undefined, block.id);
        }

        if (detected) {
            const noisePenalty = 1 + (1 - (config.signalToNoiseRatio ?? 1)) * 0.5;
            let delay = ctx.random.nextGaussian(config.detectionDelayMean * noisePenalty, config.detectionDelayStdDev);
            if (delay < 0) delay = 0;

            ctx.routeToConnections(block.id, 'SIGNAL_DETECTED', delay, {
                sourceSignalId: block.id,
                metric: config.metric,
                isFalsePositive,
                incidentId: event.data?.incidentId
            });
        }
    }
};

export const AlertRuleBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as AlertRuleConfig;
        const state = ctx.state.get(block.id)!;

        if (!state.activeIncidents) state.activeIncidents = [];
        if (!state.signalHistory) state.signalHistory = [];

        if (event.type === 'SIGNAL_DETECTED') {
            const now = ctx.timestamp;
            state.signalHistory.push(now);
            const windowStart = now - config.durationMinutes;
            state.signalHistory = state.signalHistory.filter(ts => ts >= windowStart);

            const runbook = findConnectedRunbook(block, ctx) as Block | undefined;
            const runbookConfig = runbook?.config as RunbookConfig | undefined;

            const isActive = state.status === 'active';
            const thresholdMet = state.signalHistory.length >= Math.max(1, Math.round(config.threshold));

            if (!isActive && thresholdMet) {
                state.status = 'active';

                const severity = Math.min(5, Math.max(1, Math.round(config.threshold)));

                ctx.emit({
                    id: `alert-${block.id}-${ctx.timestamp}`,
                    type: 'ALERT_FIRED',
                    timestamp: ctx.timestamp,
                    sourceBlockId: block.id,
                    data: {
                        severity,
                        runbookQuality: runbookConfig?.quality,
                        runbookOutdated: runbookConfig?.isOutdated,
                        runbookAutomated: runbookConfig?.automated,
                        incidentId: event.data?.incidentId
                    },
                    priority: 10
                });

                ctx.schedule('reset_alert', config.durationMinutes, block.id, undefined, block.id);

                ctx.routeToConnections(block.id, 'ALERT_FIRED', 0, {
                    alertId: `alert-${block.id}-${ctx.timestamp}`,
                    severity,
                    runbookQuality: runbookConfig?.quality,
                    runbookOutdated: runbookConfig?.isOutdated,
                    runbookAutomated: runbookConfig?.automated,
                    incidentId: event.data?.incidentId
                });
            }
        }
        else if (event.type === 'reset_alert') {
            state.status = 'healthy';
            state.signalHistory = [];
        }
    }
};

export const OnCallBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as OnCallConfig;

        if (event.type === 'ALERT_FIRED' || event.type === 'ESCALATION_STEP') {
            const downstream = ctx.getConnections(block.id);
            if (downstream.length === 0) {
                return;
            }

            const targetId = downstream[Math.floor(ctx.random.next() * downstream.length)];
            let baseDelay = 1;
            let contextLossProb = 0.05;

            if (config.handoverProtocol === 'weak') {
                baseDelay = 5;
                contextLossProb = 0.2;
            } else if (config.handoverProtocol === 'none') {
                baseDelay = 15;
                contextLossProb = 0.4;
            }

            const delay = baseDelay + ctx.random.next() * baseDelay;

            ctx.routeEvent(targetId, 'PAGE_SENT', delay, {
                alertId: event.data?.alertId ?? event.id,
                incidentId: event.data?.incidentId,
                severity: event.data?.severity ?? 1,
                runbookQuality: event.data?.runbookQuality,
                runbookOutdated: event.data?.runbookOutdated,
                runbookAutomated: event.data?.runbookAutomated,
                handoverProtocol: config.handoverProtocol,
                contextLossProb
            }, block.id);
        }
    }
};

export const EscalationBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as EscalationConfig;
        const state = ctx.state.get(block.id)!;

        if (!state.activeEscalations) state.activeEscalations = {};

        if (event.type === 'ALERT_FIRED') {
            const incidentId = event.data?.incidentId ?? event.data?.alertId ?? event.id;
            state.activeEscalations[incidentId] = { acked: false, lastStep: 0 };

            executeStep(0, block, ctx, incidentId);
        }
        else if (event.type === 'PAGE_ACKNOWLEDGED') {
            const incidentId = event.data?.incidentId;
            if (incidentId && state.activeEscalations[incidentId]) {
                state.activeEscalations[incidentId].acked = true;
            }
        }
        else if (event.type === 'ESC_TIMEOUT') {
            const { stepIndex, incidentId } = event.data;
            const escalation = state.activeEscalations[incidentId];
            if (!escalation || escalation.acked) return;

            executeStep(stepIndex + 1, block, ctx, incidentId);
        }
    }
};

function executeStep(index: number, block: Block, ctx: SimulationContext, incidentId: string) {
    const config = block.config as EscalationConfig;
    if (index >= config.steps.length) return;

    const step = config.steps[index];

    ctx.routeEvent(step.target, 'ESCALATION_STEP', 0, { incidentId, severity: index + 1 }, block.id);

    ctx.schedule('ESC_TIMEOUT', step.delay, block.id, { stepIndex: index, incidentId }, block.id);
}
