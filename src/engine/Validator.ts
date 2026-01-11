import { Block } from '../types/blocks';

// Define Connection locally or import if available
interface Connection {
    source: string;
    target: string;
}

export class ScenarioValidator {
    static validate(blocks: Block[], connections: Connection[]): string[] {
        const errors: string[] = [];

        // 1. Basic Checks
        if (blocks.length === 0) {
            errors.push("Scenario must have at least one block.");
        }

        // 2. Connector Integrity
        const blockIds = new Set(blocks.map(b => b.id));
        connections.forEach(conn => {
            if (!blockIds.has(conn.source)) errors.push(`Connection source ${conn.source} not found.`);
            if (!blockIds.has(conn.target)) errors.push(`Connection target ${conn.target} not found.`);
        });

        // 3. Block Configuration Validation
        blocks.forEach(block => {
            const issues = this.validateBlockConfig(block);
            issues.forEach(issue => errors.push(`Block '${block.config.label || block.id}': ${issue}`));
        });

        return errors;
    }

    private static validateBlockConfig(block: Block): string[] {
        const issues: string[] = [];
        const config = block.config;

        // Generic probability check
        ['baseFailureRate', 'recoveryRate', 'outageProbability', 'spikeProbability', 'successProbability', 'contextLossProb', 'quality'].forEach(key => {
            if (key in config) {
                const val = (config as any)[key];
                if (val < 0 || val > 1) issues.push(`${key} must be between 0 and 1.`);
            }
        });

        // Non-negative time
        ['slaResponseTime', 'detectionDelayMean', 'durationMinutes', 'baseResponseTimeMean', 'durationMean'].forEach(key => {
            if (key in config) {
                const val = (config as any)[key];
                if (val < 0) issues.push(`${key} must be positive.`);
            }
        });

        return issues;
    }
}
