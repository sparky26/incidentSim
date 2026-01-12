import { PriorityQueue } from './core/PriorityQueue';
import { Random } from './core/Random';
import type {
    SimulationEvent,
    SimulationRunResult,
    SimulationConfig,
    EntityState
} from '../types/simulation';
import type { Block, BlockConfig } from '../types/blocks';
import { v4 as uuidv4 } from 'uuid';

// Abstract interface for Block logic
export interface BlockBehavior {
    processEvent(
        event: SimulationEvent,
        block: Block,
        ctx: SimulationContext
    ): void;

    initialize(
        block: Block,
        ctx: SimulationContext
    ): void;
}

export interface SimulationContext {
    random: Random;
    timestamp: number;
    params: SimulationConfig;
    state: Map<string, EntityState>;
    events: PriorityQueue<SimulationEvent>;

    // Helper to schedule future events
    schedule(
        type: SimulationEvent['type'],
        delayMinutes: number,
        targetBlockId?: string,
        data?: any,
        sourceBlockId?: string
    ): void;

    // Helper to emit immediate events
    emit(event: SimulationEvent): void;

    // Access other blocks (read-only config)
    getBlock(id: string): Block | undefined;
    getConnections(sourceId: string): string[]; // returns target IDs
    routeEvent(
        targetBlockId: string,
        type: SimulationEvent['type'],
        delayMinutes: number,
        data?: any,
        sourceBlockId?: string
    ): void;
    routeToConnections(
        sourceBlockId: string,
        type: SimulationEvent['type'],
        delayMinutes: number,
        data?: any
    ): void;

    // Raw access for graph traversal
    connections: { source: string; target: string }[];
}

export class SimulationEngine {
    private behaviors: Map<string, BlockBehavior> = new Map(); // To be injected

    constructor(behaviors: Record<string, BlockBehavior>) {
        this.behaviors = new Map(Object.entries(behaviors));
    }

    public run(
        blocks: Block[],
        connections: { source: string; target: string }[],
        config: SimulationConfig
    ): SimulationRunResult {
        // 0. Validate
        // Note: Validation should ideally happen before the loop in App.tsx to avoid 100x checks, 
        // but for safety we check here or assume caller checks.
        // For 'Ironman' simplicity, we'll assume App.tsx uses the Validator, 
        // OR we throw strictly here.
        if (!blocks || blocks.length === 0) throw new Error("No blocks provided");

        const random = new Random(config.seed);
        const pq = new PriorityQueue<SimulationEvent>();
        const state = new Map<string, EntityState>();

        // Lookup maps
        const blockMap = new Map(blocks.map(b => [b.id, b]));
        const connectionMap = new Map<string, string[]>();
        connections.forEach(c => {
            if (!connectionMap.has(c.source)) connectionMap.set(c.source, []);
            connectionMap.get(c.source)?.push(c.target);
        });

        let currentTimestamp = 0;

        // Context Factory
        const createCtx = (): SimulationContext => ({
            random,
            timestamp: currentTimestamp,
            params: config,
            state,
            events: pq,

            schedule: (type, delay, targetBlockId, data, sourceBlockId) => {
                pq.push({
                    id: uuidv4(),
                    type,
                    timestamp: currentTimestamp + delay,
                    sourceBlockId: sourceBlockId ?? 'system', // or implicit
                    targetBlockId,
                    data,
                    incidentId: data?.incidentId
                }, currentTimestamp + delay);
            },

            emit: (evt) => {
                // Immediate priority? Or just schedule with 0 delay?
                // Usually schedule 0 delay to maintain discrete steps.
                pq.push(evt, evt.timestamp);
            },

            getBlock: (id) => blockMap.get(id),
            getConnections: (id) => connectionMap.get(id) || [],
            routeEvent: (targetBlockId, type, delayMinutes, data, sourceBlockId) => {
                const target = blockMap.get(targetBlockId);
                if (!target) return;
                if (target.type === 'CommChannel') {
                    pq.push({
                        id: uuidv4(),
                        type: 'COMM_MESSAGE',
                        timestamp: currentTimestamp + delayMinutes,
                        sourceBlockId: sourceBlockId ?? 'system',
                        targetBlockId,
                        data: {
                            forwardedType: type,
                            forwardedData: data,
                            originalSourceId: sourceBlockId ?? 'system'
                        }
                    }, currentTimestamp + delayMinutes);
                } else {
                    pq.push({
                        id: uuidv4(),
                        type,
                        timestamp: currentTimestamp + delayMinutes,
                        sourceBlockId: sourceBlockId ?? 'system',
                        targetBlockId,
                        data,
                        incidentId: data?.incidentId
                    }, currentTimestamp + delayMinutes);
                }
            },
            routeToConnections: (sourceBlockId, type, delayMinutes, data) => {
                const targets = connectionMap.get(sourceBlockId) || [];
                targets.forEach(targetId => {
                    const target = blockMap.get(targetId);
                    if (!target) return;
                    if (target.type === 'CommChannel') {
                        pq.push({
                            id: uuidv4(),
                            type: 'COMM_MESSAGE',
                            timestamp: currentTimestamp + delayMinutes,
                            sourceBlockId,
                            targetBlockId: targetId,
                            data: {
                                forwardedType: type,
                                forwardedData: data,
                                originalSourceId: sourceBlockId
                            }
                        }, currentTimestamp + delayMinutes);
                    } else {
                        pq.push({
                            id: uuidv4(),
                            type,
                            timestamp: currentTimestamp + delayMinutes,
                            sourceBlockId,
                            targetBlockId: targetId,
                            data,
                            incidentId: data?.incidentId
                        }, currentTimestamp + delayMinutes);
                    }
                });
            },
            connections: connections // Pass through
        });

        // Initialize Blocks
        const ctx = createCtx();
        blocks.forEach(block => {
            // Init default state
            state.set(block.id, { id: block.id, status: 'healthy' });

            const behavior = this.behaviors.get(block.type);
            if (behavior) {
                behavior.initialize(block, ctx);
            }
        });

        // Start Event
        pq.push({
            id: uuidv4(),
            type: 'SIMULATION_START',
            timestamp: 0,
            sourceBlockId: 'system'
        }, 0);

        const eventLog: SimulationEvent[] = [];

        // Track incidents for success rate calculation
        interface IncidentRecord {
            incidentId: string;
            serviceId: string;
            startTime: number;
            endTime?: number;
            resolved: boolean;
        }
        const incidents: IncidentRecord[] = [];

        // Main Loop
        while (pq.length > 0) {
            const event = pq.pop();
            if (!event) break;

            currentTimestamp = event.timestamp;

            ctx.timestamp = currentTimestamp;

            eventLog.push(event);

            // Track incidents
            if (event.type === 'INCIDENT_STARTED' && event.incidentId) {
                incidents.push({
                    incidentId: event.incidentId,
                    serviceId: event.sourceBlockId,
                    startTime: currentTimestamp,
                    resolved: false
                });
            } else if (event.type === 'INCIDENT_RESOLVED' && event.incidentId) {
                const incident = incidents.find(i => i.incidentId === event.incidentId);
                if (incident) {
                    incident.endTime = currentTimestamp;
                    incident.resolved = true;
                }
            }

            if (currentTimestamp > config.maxTimeMinutes) {
                break; // Time limit
            }

            // Dispatch to Target
            if (event.targetBlockId) {
                const targetBlock = blockMap.get(event.targetBlockId);
                if (targetBlock) {
                    const behavior = this.behaviors.get(targetBlock.type);
                    if (behavior) {
                        behavior.processEvent(event, targetBlock, ctx);
                    }
                }
            } else {
                // Broadcast or System event?
                // If SIMULATION_START, maybe trigger specific start logic everywhere?
                // For v1, SIMULATION_START is usually the only system event.
                if (event.type === 'SIMULATION_START') {
                    // Maybe trigger specific failures scheduled in init?
                }
            }
        }

        // Aggregate Metrics based on incident tracking
        const totalIncidents = incidents.length;
        const resolvedIncidents = incidents.filter(i => i.resolved).length;

        // Calculate customer impact (downtime)
        const customerImpactMinutes = incidents.reduce((sum, inc) => {
            const endTime = inc.endTime || currentTimestamp;
            return sum + (endTime - inc.startTime);
        }, 0);

        // Calculate MTTR (Mean Time To Recovery) for resolved incidents
        const mttr = resolvedIncidents > 0
            ? incidents
                .filter(i => i.resolved && i.endTime)
                .reduce((sum, i) => sum + (i.endTime! - i.startTime), 0) / resolvedIncidents
            : 0;

        // Success = either no incidents occurred, or 95%+ were resolved
        const successRate = totalIncidents > 0 ? resolvedIncidents / totalIncidents : 1.0;
        const success = successRate >= 0.95;

        return {
            runId: uuidv4(),
            events: eventLog,
            finalTime: currentTimestamp,
            success,
            evidenceProfileId: config.evidenceProfileId,
            metrics: {
                customerImpactMinutes,
                incidentCount: totalIncidents,
                resolvedCount: resolvedIncidents,
                mttr
            }
        };
    }
}
