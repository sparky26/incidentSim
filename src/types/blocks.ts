export type BlockType =
    // System
    | 'Service'
    | 'Dependency'
    | 'Vendor'
    | 'Traffic'
    | 'Deployment'
    // Detection
    | 'Signal'
    | 'AlertRule'
    | 'OnCall'
    | 'Escalation'
    // Humans
    | 'Responder'
    | 'Commander'
    | 'CommChannel'
    // Mitigation
    | 'CommChannel'
    // Process
    | 'Runbook'
    // Mitigation
    | 'Action';

export interface BaseBlockConfig {
    label: string;
    evidenceProfileId?: string;
}

// --- System Blocks ---
export interface ServiceConfig extends BaseBlockConfig {
    baseFailureRate: number; // probability per minute
    recoveryRate: number; // probability per minute (natural recovery)
}

export interface DependencyConfig extends BaseBlockConfig {
    type: 'hard' | 'soft';
    impact: number; // 0-1
}

export interface VendorConfig extends BaseBlockConfig {
    outageProbability: number;
    slaResponseTime: number; // minutes
}

export interface TrafficConfig extends BaseBlockConfig {
    baselineRequestRate: number;
    spikeProbability: number;
    spikeMultiplier: number;
}

// --- Detection Blocks ---
export interface SignalConfig extends BaseBlockConfig {
    metric: 'latency' | 'error_rate' | 'saturation';
    detectionDelayMean: number; // minutes
    detectionDelayStdDev: number;
    signalToNoiseRatio: number; // 0-1, 1 = no noise
}

export interface AlertRuleConfig extends BaseBlockConfig {
    threshold: number;
    durationMinutes: number;
}

export interface OnCallConfig extends BaseBlockConfig {
    scheduleId: string;
    handoverProtocol: 'strong' | 'weak' | 'none';
}

export interface EscalationConfig extends BaseBlockConfig {
    steps: { delay: number; target: string }[];
}

// --- Human Blocks ---
export interface ResponderConfig extends BaseBlockConfig {
    baseResponseTimeMean: number;
    fatigueSensitivity: number; // 0-1, how much fatigue slows them down
    shiftLengthHours: number;
}

export interface CommanderConfig extends BaseBlockConfig {
    activationSeverity: number;
    coordinationBonus: number; // reduces error rates
}

export interface CommChannelConfig extends BaseBlockConfig {
    latency: number;
    contextLossProb: number;
}

// --- Mitigation Blocks ---
export interface ActionConfig extends BaseBlockConfig {
    requiredSkill: string;
    durationMean: number;
    successProbability: number;
    isRollback: boolean;
}

export type BlockConfig =
    | ServiceConfig
    | DependencyConfig
    | VendorConfig
    | TrafficConfig
    | DeploymentConfig
    | SignalConfig
    | AlertRuleConfig
    | OnCallConfig
    | EscalationConfig
    | ResponderConfig
    | CommanderConfig
    | CommChannelConfig
    | CommChannelConfig
    | RunbookConfig
    | ActionConfig;

// --- Process Blocks ---
export interface RunbookConfig extends BaseBlockConfig {
    quality: number; // 0-1 (1 = perfect, 0 = useless)
    isOutdated: boolean; // if true, penalty instead of boost
    automated: boolean; // if true, chance of auto-resolution
}

export interface Block {
    id: string;
    type: BlockType;
    position: { x: number; y: number };
    config: BlockConfig;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
