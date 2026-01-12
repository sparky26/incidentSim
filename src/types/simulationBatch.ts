import type { BlockType } from './blocks';
import type { SimulationConfig, SimulationRunResult } from './simulation';

export interface SeedRange {
    start: number;
    end: number;
    count: number;
}

export interface SimulationBatchParameter {
    label: string;
    blockType: BlockType;
    configKey: string;
    value: number;
}

export interface SimulationResultsHistoryEntry {
    id: string;
    scenarioId: string;
    seedRange: SeedRange;
    configSnapshot: SimulationConfig;
    parameter?: SimulationBatchParameter;
    results: SimulationRunResult[];
    createdAt: number;
}
