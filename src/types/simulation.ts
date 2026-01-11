import { BlockType } from './blocks';

export type EventType =
    | 'SIMULATION_START'
    | 'TIME_STEP' // If we use fixed ticks, but we try to use discrete events
    | 'FAILURE_OCCURRED'
    | 'SIGNAL_DETECTED'
    | 'ALERT_FIRED'
    | 'PAGE_SENT'
    | 'PAGE_ACKNOWLEDGED'
    | 'ACTION_STARTED'
    | 'ACTION_COMPLETED'
    | 'SERVICE_RECOVERED'
    | 'SIMULATION_END'
    // Internal
    | 'reset_alert'
    | 'NOISE_CHECK'
    | 'ESCALATION_STEP'
    | 'ESC_TIMEOUT'
    | 'DEPLOYMENT_STARTED'
    | 'HANDOVER_STARTED'
    | 'HANDOVER_COMPLETED'
    | 'INCIDENT_STARTED'
    | 'INCIDENT_RESOLVED';

export interface SimulationEvent {
    id: string;
    type: EventType;
    timestamp: number; // relative minutes from start
    sourceBlockId: string;
    targetBlockId?: string;
    data?: Record<string, any>;
    priority?: number; // for priority queue resolution
    incidentId?: string; // Track which incident this event belongs to
}

export interface EntityState {
    id: string;
    status: 'healthy' | 'degraded' | 'down' | 'active' | 'busy' | 'recovering';
    fatigue?: number; // For humans
    load?: number; // For services
    activeIncidents?: string[]; // AlertRule

    // Human
    timeActive?: number;
    shiftStart?: number;
}

export interface SimulationRunResult {
    runId: string;
    events: SimulationEvent[];
    finalTime: number;
    success: boolean; // Incident resolved?
    metrics: {
        customerImpactMinutes: number;
        incidentCount?: number;
        resolvedCount?: number;
        mttr?: number; // Mean Time To Recovery
    };
}

export interface SimulationConfig {
    maxTimeMinutes: number;
    seed: number;
    scenarioId: string;
}
