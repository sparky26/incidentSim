import type { Block } from '../types/blocks';
import type { SimulationConfig, SimulationRunResult } from '../types/simulation';
import type { SimulationBatchParameter, SeedRange } from '../types/simulationBatch';
import { SimulationEngine } from '../engine/SimulationEngine';

type Connection = { source: string; target: string };

export interface SimulationSweepDimension {
    label: string;
    blockType: SimulationBatchParameter['blockType'];
    configKey: string;
    values: number[];
}

export interface SimulationBatchRun {
    parameter: SimulationBatchParameter;
    seedRange: SeedRange;
    configSnapshot: SimulationConfig;
    results: SimulationRunResult[];
}

interface RunSweepOptions {
    blocks: Block[];
    connections: Connection[];
    config: SimulationConfig;
    runsPerValue: number;
    seedStart?: number;
    dimension: SimulationSweepDimension;
    evidenceProfileId?: string;
}

const buildSeedRange = (seedStart: number, runsPerValue: number): SeedRange => ({
    start: seedStart,
    end: seedStart + runsPerValue - 1,
    count: runsPerValue
});

export class SimulationBatchRunner {
    private engine: SimulationEngine;

    constructor(engine: SimulationEngine) {
        this.engine = engine;
    }

    runSweep(options: RunSweepOptions): SimulationBatchRun[] {
        const {
            blocks,
            connections,
            config,
            runsPerValue,
            seedStart = config.seed,
            dimension,
            evidenceProfileId
        } = options;

        return dimension.values.map((value, index) => {
            const adjustedBlocks = blocks.map(block => {
                if (block.type !== dimension.blockType) {
                    return block;
                }

                return {
                    ...block,
                    config: {
                        ...block.config,
                        [dimension.configKey]: value
                    }
                };
            });

            const seedOffset = seedStart + index * runsPerValue;
            const results: SimulationRunResult[] = [];

            for (let runIndex = 0; runIndex < runsPerValue; runIndex++) {
                results.push(this.engine.run(adjustedBlocks, connections, {
                    ...config,
                    evidenceProfileId,
                    seed: seedOffset + runIndex
                }));
            }

            return {
                parameter: {
                    label: dimension.label,
                    blockType: dimension.blockType,
                    configKey: dimension.configKey,
                    value
                },
                seedRange: buildSeedRange(seedOffset, runsPerValue),
                configSnapshot: { ...config, evidenceProfileId },
                results
            };
        });
    }
}
