import { SimulationEngine } from './SimulationEngine';
import { ALL_BEHAVIORS } from './behaviors';
import { Block, ServiceConfig, SignalConfig, ResponderConfig, ActionConfig, AlertRuleConfig, OnCallConfig } from '../types/blocks';
import { v4 as uuidv4 } from 'uuid';

// Setup blocks
const blocks: Block[] = [
    {
        id: 'web-service',
        type: 'Service',
        position: { x: 0, y: 0 },
        config: {
            label: 'Web Service',
            baseFailureRate: 0.1, // High failure rate for test
            recoveryRate: 0.0
        } as ServiceConfig
    },
    {
        id: 'latency-signal',
        type: 'Signal',
        position: { x: 0, y: 0 },
        config: {
            label: 'High Latency',
            metric: 'latency',
            detectionDelayMean: 2,
            detectionDelayStdDev: 0.5
        } as SignalConfig
    },
    {
        id: 'alert-rule',
        type: 'AlertRule',
        position: { x: 0, y: 0 },
        config: {
            label: 'Alert Rule',
            threshold: 100,
            durationMinutes: 10
        } as AlertRuleConfig
    },
    {
        id: 'on-call',
        type: 'OnCall',
        position: { x: 0, y: 0 },
        config: { label: 'SRE OnCall', scheduleId: '1' } as OnCallConfig
    },
    {
        id: 'responder-alice',
        type: 'Responder',
        position: { x: 0, y: 0 },
        config: {
            label: 'Alice',
            baseResponseTimeMean: 5,
            skillTags: ['web'],
            fatigueSensitivity: 1
        } as ResponderConfig
    },
    {
        id: 'restart-action',
        type: 'Action',
        position: { x: 0, y: 0 },
        config: {
            label: 'Restart Service',
            requiredSkill: 'web',
            durationMean: 5,
            successProbability: 0.9,
            isRollback: false
        } as ActionConfig
    }
];

const connections = [
    { source: 'web-service', target: 'latency-signal' },
    { source: 'latency-signal', target: 'alert-rule' },
    { source: 'alert-rule', target: 'on-call' },
    { source: 'on-call', target: 'responder-alice' },
    { source: 'responder-alice', target: 'restart-action' },
    { source: 'restart-action', target: 'web-service' }
];

const engine = new SimulationEngine(ALL_BEHAVIORS);

console.log('Starting Simulation...');
const result = engine.run(blocks, connections, {
    maxTimeMinutes: 120,
    seed: 12345,
    scenarioId: 'test'
});

console.log('Simulation Ended.');
console.log('Success:', result.success);
console.log('Events:', result.events.length);
result.events.forEach(e => {
    console.log(`[${e.timestamp.toFixed(2)}m] ${e.type} (${e.sourceBlockId} -> ${e.targetBlockId})`);
});
