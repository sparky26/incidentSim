import { BlockBehavior, SimulationContext } from '../SimulationEngine';
import { Block, ServiceConfig, DependencyConfig, TrafficConfig, VendorConfig, DeploymentConfig } from '../../types/blocks';
import { SimulationEvent } from '../../types/simulation';

export const ServiceBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        const config = block.config as ServiceConfig;
        if (config.baseFailureRate > 0) {
            ctx.schedule('SERVICE_HEALTH_CHECK', 1, block.id);
        }
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as ServiceConfig;
        const state = ctx.state.get(block.id)!;

        const startIncident = (reason: string, incidentId?: string) => {
            if (state.status === 'down') return;
            state.status = 'down';
            const resolvedIncidentId = incidentId || `inc-${block.id}-${ctx.timestamp}`;
            state.activeIncidentId = resolvedIncidentId;

            // Emit incident started event
            ctx.emit({
                id: `incident-start-${block.id}-${ctx.timestamp}`,
                type: 'INCIDENT_STARTED',
                timestamp: ctx.timestamp,
                sourceBlockId: block.id,
                incidentId: resolvedIncidentId,
                data: { reason },
                priority: 100
            });

            ctx.emit({
                id: `failure-${block.id}-${ctx.timestamp}`,
                type: 'FAILURE_OCCURRED',
                timestamp: ctx.timestamp,
                sourceBlockId: block.id,
                incidentId: resolvedIncidentId,
                data: { reason, incidentId: resolvedIncidentId },
                priority: 50
            });

            const downstream = ctx.getConnections(block.id);
            downstream.forEach(targetId => {
                const target = ctx.getBlock(targetId);
                if (target?.type === 'Signal') {
                    ctx.schedule('FAILURE_OCCURRED', 0, targetId, {
                        sourceId: block.id,
                        incidentId: resolvedIncidentId
                    });
                } else {
                    ctx.schedule('dependency_check', 0, targetId, {
                        sourceId: block.id,
                        status: 'down',
                        incidentId: resolvedIncidentId
                    });
                }
            });

            if (config.recoveryRate > 0) {
                ctx.schedule('RECOVERY_CHECK', 1, block.id, { incidentId: resolvedIncidentId });
            }
        };

        // Handle Deployments
        if (event.type === 'DEPLOYMENT_STARTED') {
            const risk = event.data?.risk || 0;
            const canary = event.data?.canary || false;

            // Deployment Logic
            const failureProb = canary ? risk * 0.5 : risk;

            if (ctx.random.boolean(failureProb)) {
                startIncident('bad_deployment');
            }
        }
        else if (event.type === 'FAILURE_OCCURRED') {
            startIncident(event.data?.reason || 'failure', event.data?.incidentId);
        }
        else if (event.type === 'SERVICE_HEALTH_CHECK') {
            if (state.status === 'healthy' && ctx.random.boolean(config.baseFailureRate)) {
                startIncident('base_failure');
            }
            ctx.schedule('SERVICE_HEALTH_CHECK', 1, block.id);
        }
        else if (event.type === 'dependency_check' && event.data?.status === 'down') {
            startIncident('dependency_cascade', event.data?.incidentId);
        }
        else if (event.type === 'high_load') {
            const multiplier = event.data?.multiplier ?? 1;
            const effectiveRate = Math.min(1, config.baseFailureRate * multiplier);
            if (state.status === 'healthy' && ctx.random.boolean(effectiveRate)) {
                startIncident('traffic_spike');
            }
        }
        else if (event.type === 'dependency_check' && event.data?.status === 'healthy') {
            if (state.status === 'down' && config.recoveryRate > 0) {
                ctx.schedule('RECOVERY_CHECK', 1, block.id, { incidentId: state.activeIncidentId });
            }
        }
        else if (event.type === 'SERVICE_RECOVERED') {
            if (state.status === 'down') {
                state.status = 'healthy';

                // Find the incident ID from the original failure event
                const incidentId = event.data?.incidentId || state.activeIncidentId || `inc-${block.id}-unknown`;
                state.activeIncidentId = undefined;

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
                    const target = ctx.getBlock(targetId);
                    if (target?.type !== 'Signal') {
                        ctx.schedule('dependency_check', 0, targetId, { sourceId: block.id, status: 'healthy' });
                    }
                });
            }
        }
        else if (event.type === 'RECOVERY_CHECK') {
            if (state.status === 'down') {
                const incidentId = event.data?.incidentId || state.activeIncidentId;
                if (ctx.random.boolean(config.recoveryRate)) {
                    ctx.schedule('SERVICE_RECOVERED', 0, block.id, { incidentId });
                } else {
                    ctx.schedule('RECOVERY_CHECK', 1, block.id, { incidentId });
                }
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
            const incidentId = event.data?.incidentId;

            if (upstreamStatus === 'down') {
                const downstream = ctx.getConnections(block.id);
                downstream.forEach(targetId => {
                    if (config.type === 'hard' || ctx.random.boolean(config.impact)) {
                        ctx.schedule('dependency_check', 0, targetId, {
                            sourceId: block.id,
                            status: 'down',
                            incidentId
                        });
                    }
                });
            } else if (upstreamStatus === 'healthy') {
                const downstream = ctx.getConnections(block.id);
                downstream.forEach(targetId => {
                    ctx.schedule('dependency_check', 0, targetId, {
                        sourceId: block.id,
                        status: 'healthy',
                        incidentId
                    });
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
