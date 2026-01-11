import { BlockBehavior, SimulationContext } from '../SimulationEngine';
import { Block, SignalConfig, AlertRuleConfig, EscalationConfig, OnCallConfig } from '../../types/blocks';
import { SimulationEvent } from '../../types/simulation';

export const SignalBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        const config = block.config as SignalConfig;

        // Initial Noise Check
        // Only if ratio < 1.0 needed? But user might change config at runtime?
        // We schedule it anyway.
        ctx.schedule('NOISE_CHECK', ctx.random.next() * 60, block.id); // Start within first hour
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as SignalConfig;
        let detected = false;
        let isFalsePositive = false;

        if (event.type === 'dependency_check' && event.data?.status === 'down') {
            detected = true;
        }
        else if (event.type === 'FAILURE_OCCURRED') {
            detected = true;
        }
        else if (event.type === 'high_load' && config.metric === 'latency') {
            detected = true;
        }
        else if (event.type === 'NOISE_CHECK') {
            // Check for false positive
            const ratio = config.signalToNoiseRatio ?? 1.0;
            if (ratio < 1.0) {
                const noiseProb = 1 - ratio;
                // Determine if we fire a false positive
                if (ctx.random.boolean(noiseProb)) {
                    detected = true;
                    isFalsePositive = true;
                }
            }
            // Schedule next check (random interval 30-90 mins)
            ctx.schedule('NOISE_CHECK', 30 + ctx.random.next() * 60, block.id);
        }

        if (detected) {
            // Sample delay
            let delay = ctx.random.nextGaussian(config.detectionDelayMean, config.detectionDelayStdDev);
            if (delay < 0) delay = 0; // Clamp

            // Distinguish FP in logs?
            // Usually valid signals have data. FP might have empty data or mimic it.

            const downstream = ctx.getConnections(block.id);
            downstream.forEach(targetId => {
                ctx.schedule('SIGNAL_DETECTED', delay, targetId, {
                    sourceSignalId: block.id,
                    metric: config.metric,
                    isFalsePositive, // Metadata for debugging/analysis
                    incidentId: event.data?.incidentId
                });
            });
        }
    }
};

export const AlertRuleBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as AlertRuleConfig;
        const state = ctx.state.get(block.id)!;

        // Ensure state is initialized
        if (!state.activeIncidents) state.activeIncidents = [];

        if (event.type === 'SIGNAL_DETECTED') {

            // Check for Runbook attached to this AlertRule (Upstream or Downstream)
            // We assume Runbook -> AlertRule (process feeds metadata) OR AlertRule -> Runbook (link)
            // Let's check both directions for flexibility
            const runbookId = ctx.connections
                .find(c => (c.source === block.id && ctx.getBlock(c.target)?.type === 'Runbook') ||
                    (c.target === block.id && ctx.getBlock(c.source)?.type === 'Runbook'))
                ?.source === block.id
                ? ctx.connections.find(c => c.source === block.id && ctx.getBlock(c.target)?.type === 'Runbook')?.target
                : ctx.connections.find(c => c.target === block.id && ctx.getBlock(c.source)?.type === 'Runbook')?.source;

            const runbook = runbookId ? ctx.getBlock(runbookId) : undefined;

            // Simple logic: If not active, fire.
            // We do not check for 'active' status strictly to allow re-firing or overlapping alerts in v2?
            // But for now, let's keep simple dedupe.
            const isActive = state.status === 'active';

            if (!isActive) {
                state.status = 'active';

                ctx.emit({
                    id: `alert-${block.id}-${ctx.timestamp}`,
                    type: 'ALERT_FIRED',
                    timestamp: ctx.timestamp,
                    sourceBlockId: block.id,
                    data: {
                        severity: 'critical',
                        // Safety check: cast to any to access specific config
                        runbookQuality: runbook ? (runbook.config as any).quality : undefined,
                        incidentId: event.data?.incidentId
                    },
                    priority: 10
                });

                // Schedule reset
                ctx.schedule('reset_alert', config.durationMinutes, block.id);

                // Notify downstream (OnCall)
                const downstream = ctx.getConnections(block.id);
                downstream.forEach(targetId => {
                    const target = ctx.getBlock(targetId);
                    if (target && target.type !== 'Runbook') {
                        ctx.schedule('ALERT_FIRED', 0, targetId, {
                            alertId: `alert-${block.id}-${ctx.timestamp}`,
                            runbookQuality: runbook ? (runbook.config as any).quality : undefined,
                            incidentId: event.data?.incidentId
                        });
                    }
                });
            }
        }
        else if (event.type === 'reset_alert') {
            state.status = 'healthy';
        }
    }
};

export const OnCallBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as OnCallConfig;

        if (event.type === 'ALERT_FIRED' || event.type === 'ESCALATION_STEP') {
            // Find current on-call (mock: random or connected responder?)
            // V1: Use 'Responder' blocks connected to this OnCall block?
            // Or OnCall has a 'scheduleId'.
            // IMPT: "7. On-Call Schedule ... Gaps allowed".

            // We will look for connected Responders.
            const downstream = ctx.getConnections(block.id);
            if (downstream.length > 0) {
                // Pick one based on schedule?
                // Random for v1 if multiple.
                const targetId = downstream[Math.floor(ctx.random.next() * downstream.length)];
                ctx.schedule('PAGE_SENT', 0, targetId, {
                    alertId: event.data?.alertId ?? event.id,
                    incidentId: event.data?.incidentId
                });
            } else {
                // No one on call! Gap!
                // Maybe log metric?
            }
        }
    }
};

export const EscalationBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as EscalationConfig;
        const state = ctx.state.get(block.id)!;

        if (event.type === 'ALERT_FIRED') {
            // Start escalation policy
            // Step 0
            state.activeIncidents = state.activeIncidents || [];
            const incidentId = uuid(); // Simulation internal ID for this policy run
            state.activeIncidents.push(incidentId); // Track active escalations

            executeStep(0, block, ctx, incidentId);
        }
        else if (event.type === 'PAGE_ACKNOWLEDGED') {
            // Stop escalation
            // How do we know which escalation?
            // Assumption: event.data.escalationId matches?
            // For v1, simplifying: Global stop for that alert context?
            // Let's assume we stop all for this block for simplicity or need ID.
        }
        else if (event.type === 'ESC_TIMEOUT') {
            const { stepIndex, incidentId } = event.data;
            // Check if acked? (We need state tracking of Ack)
            // If not acked, proceed.
            executeStep(stepIndex + 1, block, ctx, incidentId);
        }
    }
};

function executeStep(index: number, block: Block, ctx: SimulationContext, incidentId: string) {
    const config = block.config as EscalationConfig;
    if (index >= config.steps.length) return; // End of policy

    const step = config.steps[index];

    // Notify target (OnCall or User)
    // Target is string ID in config.
    ctx.schedule('ESCALATION_STEP', 0, step.target, { incidentId });

    // Schedule next step
    ctx.schedule('ESC_TIMEOUT', step.delay, block.id, { stepIndex: index, incidentId });
}

function uuid() { return Math.random().toString(36).substr(2, 9); }
