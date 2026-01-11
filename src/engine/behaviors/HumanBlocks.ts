import { BlockBehavior, SimulationContext } from '../SimulationEngine';
import { Block, ResponderConfig } from '../../types/blocks';
import { SimulationEvent } from '../../types/simulation';

export const ResponderBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        ctx.state.get(block.id)!.fatigue = 0;
        ctx.state.get(block.id)!.timeActive = 0;
        ctx.state.get(block.id)!.shiftStart = 0; // Or random?
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as ResponderConfig;
        const state = ctx.state.get(block.id)!;

        // Update timeActive on every event?
        // Or simulation loop updates it?
        // Simulation is discrete event. We don't have "tick" unless we schedule it.
        // We can calc delta from last event?
        // Let's rely on Events. If 'PAGE_SENT', we check shift duration.
        // Or we schedule 'SHIFT_END' at init?

        // Strategy: When Responder works (ACKs page), check if shift is over.
        // Or just schedule SHIFT_CHECK every hour?

        if (event.type === 'PAGE_SENT') {
            // Check Handover
            const shiftLength = config.shiftLengthHours * 60; // minutes
            // Approx: timeActive is just "Time since init" for single shift logic?
            // Real shift: (currentTime - state.shiftStart) > shiftLength

            // For v1 simple: Assume shift started at T=0.
            const currentShiftTime = (ctx.timestamp - (state.shiftStart || 0)) % (24 * 60); // Reset every day?
            // Actually, let's just use simple duration check.
            const timeOnShift = ctx.timestamp - (state.shiftStart || 0);

            if (timeOnShift > shiftLength) {
                // Trigger Handover
                ctx.schedule('HANDOVER_STARTED', 0, block.id, { alertId: event.data?.alertId });
                return; // Stop processing page here, will resume after handover
            }

            // Normal Page Processing (same as before)
            let responseTime = config.baseResponseTimeMean;
            if (event.data?.runbookQuality !== undefined) {
                const multiplier = 1 - (event.data.runbookQuality * 0.5);
                responseTime *= multiplier;
            } else {
                responseTime *= 1.2;
            }

            const finalDuration = Math.max(1, responseTime * (0.8 + ctx.random.next() * 0.4));
            state.fatigue = (state.fatigue || 0) + 1;

            ctx.schedule('PAGE_ACKNOWLEDGED', finalDuration, block.id, {
                alertId: event.data?.alertId,
                incidentId: event.data?.incidentId
            });
        }
        else if (event.type === 'HANDOVER_STARTED') {
            // Context Loss Penalty
            // If OnCall protocol is weak -> Add penalty time or chance to drop page?
            // We need access to OnCall config... but Responder doesn't know which OnCall paged it easily.
            // Assume default/generic penalty for now or lookup connected OnCall.
            // Let's assume a "Handover Delay" of 30 mins + Context Loss Risk.

            const handoverDuration = 30; // minutes
            ctx.schedule('HANDOVER_COMPLETED', handoverDuration, block.id, {
                alertId: event.data?.alertId
            });

            // Reset shift timer
            state.shiftStart = ctx.timestamp + handoverDuration;
            state.fatigue = 0; // Fresh responder enters
        }
        else if (event.type === 'HANDOVER_COMPLETED') {
            // Resume Page
            // Re-schedule Page Sent? Or just Ack?
            // If context loss -> Drop?
            // For v1: Just delays the Ack.
            const alertId = event.data?.alertId;
            if (alertId) {
                // Re-emit page sent to self to process as new responder
                ctx.schedule('PAGE_SENT', 0, block.id, {
                    alertId,
                    incidentId: event.data?.incidentId
                });
            }
        }
        else if (event.type === 'PAGE_ACKNOWLEDGED') {
            const connectedActions = ctx.getConnections(block.id);
            if (connectedActions.length > 0) {
                const actionId = connectedActions[Math.floor(ctx.random.next() * connectedActions.length)];
                ctx.schedule('ACTION_STARTED', 1, actionId, {
                    responderId: block.id,
                    incidentId: event.data?.incidentId
                });
            }
        }
    }
};

export const CommanderBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },
    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        // Passive bonus provider in v1?
        // Or actively triggers coordination events?
        // "Activation rule"
        // For v1, existence of Commander block might just queryable by others?
        // Or Commander intercepts 'PAGE_ACKNOWLEDGED' and directs traffic.
    }
};

export const CommChannelBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },
    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        // Adds latency to messages passing through
        // Implementation: If Blocks are linked via CommChannel?
        // A -> Comm -> B.
        // In v1, usually A -> B directly.
        // Maybe this is an "Global Environment" block?
    }
};
