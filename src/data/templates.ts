import type { BlockType, BlockConfig } from '../types/blocks';
import type { Edge, Node } from 'reactflow';

export interface Template {
    name: string;
    description: string;
    nodes: Node<BlockConfig>[];
    edges: Edge[];
}

export const TEMPLATES: Template[] = [
    {
        name: 'Bad Deploy at Night',
        description: 'A service fails during off-hours with limited on-call availability.',
        nodes: [
            { id: 'srv-1', type: 'Service', position: { x: 100, y: 100 }, data: { label: 'Auth Service', baseFailureRate: 0.1, recoveryRate: 0.0 } as any },
            { id: 'sig-1', type: 'Signal', position: { x: 100, y: 250 }, data: { label: 'Error Rate', metric: 'errors', detectionDelayMean: 2, detectionDelayStdDev: 0.5 } as any },
            { id: 'alert-1', type: 'AlertRule', position: { x: 100, y: 400 }, data: { label: 'High Errors', threshold: 5, durationMinutes: 2 } as any },
            { id: 'oncall-1', type: 'OnCall', position: { x: 300, y: 400 }, data: { label: 'Night Shift', scheduleId: 'night' } as any },
            { id: 'person-1', type: 'Responder', position: { x: 300, y: 550 }, data: { label: 'Junior Dev (Sleepy)', baseResponseTimeMean: 15, fatigueSensitivity: 2, skillTags: ['backend'] } as any },
            { id: 'act-1', type: 'Action', position: { x: 100, y: 550 }, data: { label: 'Rollback', requiredSkill: 'backend', durationMean: 10, successProbability: 0.8, isRollback: true } as any },
        ],
        edges: [
            { id: 'e1', source: 'srv-1', target: 'sig-1' },
            { id: 'e2', source: 'sig-1', target: 'alert-1' },
            { id: 'e3', source: 'alert-1', target: 'oncall-1' },
            { id: 'e4', source: 'oncall-1', target: 'person-1' },
            { id: 'e5', source: 'person-1', target: 'act-1' },
            { id: 'e6', source: 'act-1', target: 'srv-1' },
        ]
    },
    {
        name: 'Third-Party Vendor Outage',
        description: 'A critical dependency goes down, SLA is breached.',
        nodes: [
            { id: 'vend-1', type: 'Vendor', position: { x: 100, y: 50 }, data: { label: 'Payment API', outageProbability: 0.05, slaResponseTime: 45 } as any },
            { id: 'srv-main', type: 'Service', position: { x: 100, y: 200 }, data: { label: 'Checkout Service', baseFailureRate: 0, recoveryRate: 1 } as any },
            { id: 'dep-1', type: 'Dependency', position: { x: 100, y: 125 }, data: { label: 'API Link', type: 'hard', impact: 1 } as any },
            { id: 'sig-1', type: 'Signal', position: { x: 300, y: 200 }, data: { label: 'Checkout Failures', metric: 'errors' } as any },
            { id: 'alert-1', type: 'AlertRule', position: { x: 500, y: 200 }, data: { label: 'P0 Alert' } as any },
            { id: 'comm-1', type: 'CommChannel', position: { x: 700, y: 200 }, data: { label: 'Status Page update' } as any },
        ],
        edges: [
            { id: 'e1', source: 'vend-1', target: 'dep-1' },
            { id: 'e2', source: 'dep-1', target: 'srv-main' },
            { id: 'e3', source: 'srv-main', target: 'sig-1' },
            { id: 'e4', source: 'sig-1', target: 'alert-1' },
            { id: 'e5', source: 'alert-1', target: 'comm-1' },
        ]
    },
    {
        name: 'Load Spike + Cascading Failure',
        description: 'Traffic spike takes down frontend, then backend.',
        nodes: [
            { id: 'traf-1', type: 'Traffic', position: { x: 50, y: 50 }, data: { label: 'Black Friday', spikeProbability: 0.1, spikeMultiplier: 10 } as any },
            { id: 'fe-1', type: 'Service', position: { x: 50, y: 200 }, data: { label: 'Frontend', baseFailureRate: 0.01 } as any },
            { id: 'be-1', type: 'Service', position: { x: 50, y: 350 }, data: { label: 'Backend', baseFailureRate: 0.01 } as any },
            { id: 'dep-1', type: 'Dependency', position: { x: 50, y: 275 }, data: { label: 'RPC', type: 'hard', impact: 1 } as any },
            { id: 'autoscaler', type: 'Action', position: { x: 250, y: 350 }, data: { label: 'Scale Up', durationMean: 5, successProbability: 0.7 } as any },
        ],
        edges: [
            { id: 'e1', source: 'traf-1', target: 'fe-1' },
            { id: 'e2', source: 'fe-1', target: 'dep-1' },
            { id: 'e3', source: 'dep-1', target: 'be-1' },
            { id: 'e4', source: 'be-1', target: 'autoscaler' }, // Simplified: Backend failures trigger action?
        ]
    }
];
