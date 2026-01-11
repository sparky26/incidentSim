import { BlockBehavior, SimulationContext } from '../SimulationEngine';
import { Block, ServiceConfig, DependencyConfig, TrafficConfig, VendorConfig, DeploymentConfig } from '../../types/blocks';
import { SimulationEvent } from '../../types/simulation';

export const ServiceBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        // v1: Passive initialization
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as ServiceConfig;
        const state = ctx.state.get(block.id)!;

        // Handle Deployments
        if (event.type === 'DEPLOYMENT_STARTED') {
            const risk = event.data?.risk || 0;
            const canary = event.data?.canary || false;

            // Deployment Logic
            const failureProb = canary ? risk * 0.5 : risk;

            if (ctx.random.boolean(failureProb)) {
                if (state.status !== 'down') {
                    state.status = 'down';
                    const incidentId = `inc-${block.id}-${ctx.timestamp}`;

                    // Emit incident started event
                    ctx.emit({
                        id: `incident-start-${block.id}-${ctx.timestamp}`,
                        type: 'INCIDENT_STARTED',
                        timestamp: ctx.timestamp,
                        sourceBlockId: block.id,
                        incidentId,
                        data: { reason: 'bad_deployment' },
                        priority: 100
                    });

                    ctx.emit({
                        id: `failure-${block.id}-${ctx.timestamp}`,
                        type: 'FAILURE_OCCURRED',
                        timestamp: ctx.timestamp,
                        sourceBlockId: block.id,
                        data: { reason: 'bad_deployment', incidentId },
                        priority: 50
                    });
                }
            }
        }
        else if (event.type === 'FAILURE_OCCURRED' || (event.type === 'dependency_check' && event.data?.status === 'down')) {
            // Check cascading failure
            if (state.status !== 'down') {
                if (ctx.random.boolean(config.baseFailureRate)) {
                    state.status = 'down';
                    ctx.emit({
                        id: `failure-${block.id}-${ctx.timestamp}`,
                        type: 'FAILURE_OCCURRED',
                        timestamp: ctx.timestamp,
                        sourceBlockId: block.id,
                        data: { reason: 'dependency_cascade' }
                    });
                }
            }
        }
        else if (event.type === 'SERVICE_RECOVERED') {
            if (state.status === 'down') {
                state.status = 'healthy';

                // Find the incident ID from the original failure event
                const incidentId = event.data?.incidentId || `inc-${block.id}-unknown`;

                // Emit incident resolved event
                ctx.emit({
                    id: `incident-resolved-${block.id}-${ctx.timestamp}`,
                    type: 'INCIDENT_RESOLVED',
                    timestamp: ctx.timestamp,
                    sourceBlockId: block.id,
                    incidentId,
                    priority: 100
                });

                // Notify downstream
                const downstream = ctx.getConnections(block.id);
                downstream.forEach(targetId => {
                    ctx.schedule('dependency_check', 0, targetId, { sourceId: block.id, status: 'healthy' });
                });
            }
        }
    }
};

export const DependencyBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) { },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as DependencyConfig;

        if (event.type === 'dependency_check') {
            const upstreamStatus = event.data?.status;

            if (upstreamStatus === 'down') {
                const downstream = ctx.getConnections(block.id);
                downstream.forEach(targetId => {
                    if (config.type === 'hard' || ctx.random.boolean(config.impact)) {
                        ctx.schedule('dependency_check', 0, targetId, { sourceId: block.id, status: 'down' });
                    }
                });
            } else if (upstreamStatus === 'healthy') {
                const downstream = ctx.getConnections(block.id);
                downstream.forEach(targetId => {
                    ctx.schedule('dependency_check', 0, targetId, { sourceId: block.id, status: 'healthy' });
                });
            }
        }
    }
};

export const TrafficBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        const config = block.config as TrafficConfig;
        if (config.spikeProbability > 0) {
            ctx.schedule('check_spike', 60, block.id);
        }
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as TrafficConfig;

        if (event.type === 'check_spike') {
            if (ctx.random.boolean(config.spikeProbability)) {
                const downstream = ctx.getConnections(block.id);
                downstream.forEach(targetId => {
                    ctx.schedule('high_load', 0, targetId, { multiplier: config.spikeMultiplier });
                });
            }
            ctx.schedule('check_spike', 60, block.id);
        }
    }
};

export const VendorBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        const config = block.config as VendorConfig;
        if (config.outageProbability > 0) {
            // Poisson
            const timeToFail = -Math.log(ctx.random.next()) / (config.outageProbability * 10);
            ctx.schedule('FAILURE_OCCURRED', timeToFail, block.id);
        }
    },
    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as VendorConfig;
        const state = ctx.state.get(block.id)!;

        if (event.type === 'FAILURE_OCCURRED') {
            if (state.status === 'down') return;
            state.status = 'down';

            const recoveryTime = config.slaResponseTime * (0.8 + 0.4 * ctx.random.next());
            ctx.schedule('SERVICE_RECOVERED', recoveryTime, block.id);

            const downstream = ctx.getConnections(block.id);
            downstream.forEach(targetId => {
                ctx.schedule('dependency_check', 0, targetId, { sourceId: block.id, status: 'down' });
            });
        } else if (event.type === 'SERVICE_RECOVERED') {
            state.status = 'healthy';
            const downstream = ctx.getConnections(block.id);
            downstream.forEach(targetId => {
                ctx.schedule('dependency_check', 0, targetId, { sourceId: block.id, status: 'healthy' });
            });
        }
    }
};

export const DeploymentBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        const config = block.config as DeploymentConfig;
        ctx.schedule('DEPLOYMENT_STARTED', config.frequencyMinutes, block.id);
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as DeploymentConfig;

        if (event.type === 'DEPLOYMENT_STARTED') {
            // Fan out to connected services
            // Note: Deployment usually targets a service.
            const downstream = ctx.getConnections(block.id);
            downstream.forEach(targetId => {
                ctx.schedule('DEPLOYMENT_STARTED', 0, targetId, {
                    deploymentId: event.id,
                    risk: config.risk,
                    canary: config.canary,
                    automated: config.automated
                });
            });

            // Schedule next deployment
            ctx.schedule('DEPLOYMENT_STARTED', config.frequencyMinutes, block.id);
        }
    }
};
