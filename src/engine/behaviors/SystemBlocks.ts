import { BlockBehavior, SimulationContext } from '../SimulationEngine';
import { Block, ServiceConfig, DependencyConfig, TrafficConfig, VendorConfig, DeploymentConfig } from '../../types/blocks';
import { SimulationEvent } from '../../types/simulation';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const ServiceBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        const config = block.config as ServiceConfig;
        const state = ctx.state.get(block.id)!;
        state.load = 1;
        state.dependencyStatus = 'healthy';

        if (config.baseFailureRate > 0) {
            ctx.schedule('SERVICE_HEALTH_CHECK', 1 + ctx.random.next() * 2, block.id, undefined, block.id);
        }
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as ServiceConfig;
        const state = ctx.state.get(block.id)!;

        const getLoadMultiplier = () => clamp(state.load ?? 1, 0.5, 3);
        const getDependencyMultiplier = () => {
            if (state.dependencyStatus === 'down') return 3;
            if (state.dependencyStatus === 'degraded') return 1.6;
            return 1;
        };

        const startIncident = (reason: string, incidentId?: string) => {
            if (state.status === 'down') return;
            state.status = 'down';
            const resolvedIncidentId = incidentId || `inc-${block.id}-${ctx.timestamp}`;
            state.activeIncidentId = resolvedIncidentId;

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

            ctx.routeToConnections(block.id, 'FAILURE_OCCURRED', 0, {
                sourceId: block.id,
                reason,
                incidentId: resolvedIncidentId
            });

            ctx.routeToConnections(block.id, 'dependency_check', 0, {
                sourceId: block.id,
                status: 'down',
                incidentId: resolvedIncidentId
            });

            if (config.recoveryRate > 0) {
                ctx.schedule('RECOVERY_CHECK', 1, block.id, { incidentId: resolvedIncidentId }, block.id);
            }
        };

        if (event.type === 'DEPLOYMENT_STARTED') {
            const risk = event.data?.risk || 0;
            const canary = event.data?.canary || false;
            const automated = event.data?.automated || false;

            const failureProb = risk * (canary ? 0.5 : 1) * (automated ? 0.7 : 1);
            if (ctx.random.boolean(failureProb)) {
                startIncident('bad_deployment');
            } else if (risk > 0.1 && state.status === 'healthy') {
                const degradeChance = clamp(risk * 0.4, 0, 0.5);
                if (ctx.random.boolean(degradeChance)) {
                    state.status = 'degraded';
                }
            }
        }
        else if (event.type === 'FAILURE_OCCURRED') {
            startIncident(event.data?.reason || 'failure', event.data?.incidentId);
        }
        else if (event.type === 'SERVICE_HEALTH_CHECK') {
            if (state.status !== 'down') {
                const loadMultiplier = getLoadMultiplier();
                const dependencyMultiplier = getDependencyMultiplier();
                const degradedMultiplier = state.status === 'degraded' ? 1.4 : 1;
                const effectiveFailureRate = clamp(
                    config.baseFailureRate * loadMultiplier * dependencyMultiplier * degradedMultiplier,
                    0,
                    1
                );

                if (ctx.random.boolean(effectiveFailureRate)) {
                    startIncident('base_failure');
                } else {
                    if (state.status === 'healthy' && (loadMultiplier > 1.3 || state.dependencyStatus === 'degraded')) {
                        const degradeChance = clamp((loadMultiplier - 1) * 0.4, 0, 0.4);
                        if (ctx.random.boolean(degradeChance)) {
                            state.status = 'degraded';
                        }
                    }
                    if (state.status === 'degraded' && loadMultiplier <= 1.1 && state.dependencyStatus === 'healthy') {
                        const recoverChance = clamp(config.recoveryRate * 0.5, 0, 1);
                        if (ctx.random.boolean(recoverChance)) {
                            state.status = 'healthy';
                        }
                    }
                }
            }
            ctx.schedule('SERVICE_HEALTH_CHECK', 1 + ctx.random.next() * 2, block.id, undefined, block.id);
        }
        else if (event.type === 'dependency_check') {
            const upstreamStatus = event.data?.status;
            if (upstreamStatus === 'down') {
                state.dependencyStatus = 'down';
                startIncident('dependency_cascade', event.data?.incidentId);
            } else if (upstreamStatus === 'degraded') {
                state.dependencyStatus = 'degraded';
                if (state.status === 'healthy') {
                    state.status = 'degraded';
                }
            } else if (upstreamStatus === 'healthy') {
                state.dependencyStatus = 'healthy';
                if (state.status === 'degraded' && config.recoveryRate > 0) {
                    const recoverChance = clamp(config.recoveryRate * 0.6, 0, 1);
                    if (ctx.random.boolean(recoverChance)) {
                        state.status = 'healthy';
                    }
                }
            }
        }
        else if (event.type === 'high_load') {
            const multiplier = event.data?.multiplier ?? 1;
            state.load = Math.max(state.load ?? 1, multiplier);
        }
        else if (event.type === 'LOAD_UPDATE') {
            const load = event.data?.load ?? 1;
            state.load = load;
        }
        else if (event.type === 'SERVICE_RECOVERED') {
            if (state.status === 'down') {
                state.status = state.dependencyStatus === 'degraded' ? 'degraded' : 'healthy';

                const incidentId = event.data?.incidentId || state.activeIncidentId || `inc-${block.id}-unknown`;
                state.activeIncidentId = undefined;

                ctx.emit({
                    id: `incident-resolved-${block.id}-${ctx.timestamp}`,
                    type: 'INCIDENT_RESOLVED',
                    timestamp: ctx.timestamp,
                    sourceBlockId: block.id,
                    incidentId,
                    priority: 100
                });

                ctx.routeToConnections(block.id, 'dependency_check', 0, { sourceId: block.id, status: 'healthy' });
            }
        }
        else if (event.type === 'RECOVERY_CHECK') {
            if (state.status === 'down') {
                const incidentId = event.data?.incidentId || state.activeIncidentId;
                const loadMultiplier = getLoadMultiplier();
                const dependencyMultiplier = state.dependencyStatus === 'down' ? 0.3 : 1;
                const effectiveRecoveryRate = clamp(config.recoveryRate * dependencyMultiplier / loadMultiplier, 0, 1);

                if (ctx.random.boolean(effectiveRecoveryRate)) {
                    ctx.schedule('SERVICE_RECOVERED', 0, block.id, { incidentId }, block.id);
                } else {
                    ctx.schedule('RECOVERY_CHECK', 1, block.id, { incidentId }, block.id);
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
                if (config.type === 'hard') {
                    ctx.routeToConnections(block.id, 'dependency_check', 0, {
                        sourceId: block.id,
                        status: 'down',
                        incidentId
                    });
                } else {
                    const shouldDegrade = ctx.random.boolean(config.impact);
                    ctx.routeToConnections(block.id, 'dependency_check', 0, {
                        sourceId: block.id,
                        status: shouldDegrade ? 'degraded' : 'healthy',
                        incidentId
                    });
                }
            } else if (upstreamStatus === 'healthy') {
                ctx.routeToConnections(block.id, 'dependency_check', 0, {
                    sourceId: block.id,
                    status: 'healthy',
                    incidentId
                });
            }
        }
    }
};

export const TrafficBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        const config = block.config as TrafficConfig;
        ctx.schedule('LOAD_UPDATE', 5 + ctx.random.next() * 5, block.id, undefined, block.id);
        if (config.spikeProbability > 0) {
            ctx.schedule('LOAD_UPDATE', 15, block.id, undefined, block.id);
        }
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as TrafficConfig;

        if (event.type === 'LOAD_UPDATE') {
            const baseRate = config.baselineRequestRate || 1;
            const normalVariation = ctx.random.nextGaussian(1, 0.1);
            let loadMultiplier = clamp(normalVariation, 0.6, 1.4);

            if (ctx.random.boolean(config.spikeProbability)) {
                loadMultiplier *= config.spikeMultiplier;
            }

            ctx.routeToConnections(block.id, 'LOAD_UPDATE', 0, {
                load: loadMultiplier,
                requestRate: baseRate * loadMultiplier
            });

            if (loadMultiplier > 1.3) {
                ctx.routeToConnections(block.id, 'high_load', 0, { multiplier: loadMultiplier });
            }

            ctx.schedule('LOAD_UPDATE', 15 + ctx.random.next() * 10, block.id, undefined, block.id);
        }
    }
};

export const VendorBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        const config = block.config as VendorConfig;
        if (config.outageProbability > 0) {
            const failureRatePerMinute = clamp(config.outageProbability / 60, 0, 1);
            if (failureRatePerMinute > 0) {
                const timeToFail = -Math.log(ctx.random.next()) / failureRatePerMinute;
                ctx.schedule('FAILURE_OCCURRED', timeToFail, block.id, undefined, block.id);
            }
        }
    },
    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as VendorConfig;
        const state = ctx.state.get(block.id)!;

        if (event.type === 'FAILURE_OCCURRED') {
            if (state.status === 'down') return;
            state.status = 'down';

            const recoveryTime = config.slaResponseTime * (0.7 + 0.6 * ctx.random.next());
            ctx.schedule('SERVICE_RECOVERED', recoveryTime, block.id, undefined, block.id);

            ctx.routeToConnections(block.id, 'dependency_check', 0, { sourceId: block.id, status: 'down' });
        } else if (event.type === 'SERVICE_RECOVERED') {
            state.status = 'healthy';
            ctx.routeToConnections(block.id, 'dependency_check', 0, { sourceId: block.id, status: 'healthy' });

            if (config.outageProbability > 0) {
                const failureRatePerMinute = clamp(config.outageProbability / 60, 0, 1);
                if (failureRatePerMinute > 0) {
                    const timeToFail = -Math.log(ctx.random.next()) / failureRatePerMinute;
                    ctx.schedule('FAILURE_OCCURRED', timeToFail, block.id, undefined, block.id);
                }
            }
        }
    }
};

export const DeploymentBehavior: BlockBehavior = {
    initialize(block: Block, ctx: SimulationContext) {
        const config = block.config as DeploymentConfig;
        ctx.schedule('DEPLOYMENT_STARTED', config.frequencyMinutes, block.id, undefined, block.id);
    },

    processEvent(event: SimulationEvent, block: Block, ctx: SimulationContext) {
        const config = block.config as DeploymentConfig;

        if (event.type === 'DEPLOYMENT_STARTED') {
            ctx.routeToConnections(block.id, 'DEPLOYMENT_STARTED', 0, {
                deploymentId: event.id,
                risk: config.risk,
                canary: config.canary,
                automated: config.automated
            });

            ctx.schedule('DEPLOYMENT_STARTED', config.frequencyMinutes, block.id, undefined, block.id);
        }
    }
};
