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
            { id: 'dep-1', type: 'Dependency', position: { x: 100, y: 125 }, data: { label: 'API Link', type: 'hard', impact: 1 } as any },
            { id: 'srv-main', type: 'Service', position: { x: 100, y: 200 }, data: { label: 'Checkout Service', baseFailureRate: 0, recoveryRate: 1 } as any },
            { id: 'sig-1', type: 'Signal', position: { x: 300, y: 200 }, data: { label: 'Checkout Failures', metric: 'errors' } as any },
            { id: 'alert-1', type: 'AlertRule', position: { x: 500, y: 200 }, data: { label: 'P0 Alert' } as any },
            { id: 'runbook-1', type: 'Runbook', position: { x: 500, y: 120 }, data: { label: 'Payments Runbook', quality: 0.7, isOutdated: false, automated: false } as any },
            { id: 'oncall-1', type: 'OnCall', position: { x: 500, y: 320 }, data: { label: 'Payments OnCall', scheduleId: 'primary' } as any },
            { id: 'commander-1', type: 'Commander', position: { x: 720, y: 320 }, data: { label: 'Incident Lead', experienceLevel: 8, coordinationBonus: 0.3 } as any },
            { id: 'responder-1', type: 'Responder', position: { x: 500, y: 440 }, data: { label: 'Payments Responder', baseResponseTimeMean: 8, fatigueSensitivity: 0.2, skillTags: ['payments'] } as any },
            { id: 'action-1', type: 'Action', position: { x: 500, y: 560 }, data: { label: 'Failover Vendor', requiredSkill: 'payments', durationMean: 12, successProbability: 0.85, isRollback: false } as any },
        ],
        edges: [
            { id: 'e1', source: 'vend-1', target: 'dep-1' },
            { id: 'e2', source: 'dep-1', target: 'srv-main' },
            { id: 'e3', source: 'srv-main', target: 'sig-1' },
            { id: 'e4', source: 'sig-1', target: 'alert-1' },
            { id: 'e5', source: 'runbook-1', target: 'alert-1' },
            { id: 'e6', source: 'alert-1', target: 'oncall-1' },
            { id: 'e7', source: 'commander-1', target: 'responder-1' },
            { id: 'e8', source: 'oncall-1', target: 'responder-1' },
            { id: 'e9', source: 'responder-1', target: 'action-1' },
            { id: 'e10', source: 'action-1', target: 'srv-main' },
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
            { id: 'sig-1', type: 'Signal', position: { x: 260, y: 350 }, data: { label: 'Backend Errors', metric: 'errors' } as any },
            { id: 'alert-1', type: 'AlertRule', position: { x: 460, y: 350 }, data: { label: 'Backend Alert', threshold: 5, durationMinutes: 2 } as any },
            { id: 'runbook-1', type: 'Runbook', position: { x: 460, y: 260 }, data: { label: 'Scale Playbook', quality: 0.8, isOutdated: false, automated: false } as any },
            { id: 'oncall-1', type: 'OnCall', position: { x: 460, y: 470 }, data: { label: 'Traffic OnCall', scheduleId: 'primary' } as any },
            { id: 'responder-1', type: 'Responder', position: { x: 460, y: 590 }, data: { label: 'SRE Responder', baseResponseTimeMean: 6, fatigueSensitivity: 0.15, skillTags: ['scaling'] } as any },
            { id: 'autoscaler', type: 'Action', position: { x: 460, y: 710 }, data: { label: 'Scale Up', requiredSkill: 'scaling', durationMean: 5, successProbability: 0.7, isRollback: false } as any },
        ],
        edges: [
            { id: 'e1', source: 'traf-1', target: 'fe-1' },
            { id: 'e2', source: 'fe-1', target: 'dep-1' },
            { id: 'e3', source: 'dep-1', target: 'be-1' },
            { id: 'e4', source: 'be-1', target: 'sig-1' },
            { id: 'e5', source: 'sig-1', target: 'alert-1' },
            { id: 'e6', source: 'runbook-1', target: 'alert-1' },
            { id: 'e7', source: 'alert-1', target: 'oncall-1' },
            { id: 'e8', source: 'oncall-1', target: 'responder-1' },
            { id: 'e9', source: 'responder-1', target: 'autoscaler' },
            { id: 'e10', source: 'autoscaler', target: 'be-1' },
        ]
    },
    {
        name: 'Canary Deploy Regression',
        description: 'A risky canary rollout triggers escalation and coordinated response.',
        nodes: [
            { id: 'deploy-1', type: 'Deployment', position: { x: 50, y: 80 }, data: { label: 'Canary Release', frequencyMinutes: 120, risk: 0.35, canary: true, automated: true } as any },
            { id: 'svc-1', type: 'Service', position: { x: 50, y: 220 }, data: { label: 'API Gateway', baseFailureRate: 0.02, recoveryRate: 0.2 } as any },
            { id: 'sig-1', type: 'Signal', position: { x: 260, y: 220 }, data: { label: 'Latency SLO', metric: 'latency', detectionDelayMean: 3, detectionDelayStdDev: 1, signalToNoiseRatio: 0.9 } as any },
            { id: 'alert-1', type: 'AlertRule', position: { x: 460, y: 220 }, data: { label: 'Latency Alert', threshold: 3, durationMinutes: 5 } as any },
            { id: 'runbook-1', type: 'Runbook', position: { x: 460, y: 120 }, data: { label: 'Deploy Rollback', quality: 0.9, isOutdated: false, automated: true } as any },
            { id: 'esc-1', type: 'Escalation', position: { x: 460, y: 320 }, data: { label: 'Escalate Backup', steps: [{ delay: 10, target: 'oncall-1' }, { delay: 20, target: 'oncall-2' }] } as any },
            { id: 'oncall-1', type: 'OnCall', position: { x: 680, y: 240 }, data: { label: 'Primary OnCall', scheduleId: 'primary', handoverProtocol: 'strong' } as any },
            { id: 'oncall-2', type: 'OnCall', position: { x: 680, y: 360 }, data: { label: 'Secondary OnCall', scheduleId: 'secondary', handoverProtocol: 'weak' } as any },
            { id: 'comm-1', type: 'CommChannel', position: { x: 900, y: 300 }, data: { label: 'Incident Chat', latency: 1, contextLossProb: 0.1 } as any },
            { id: 'commander-1', type: 'Commander', position: { x: 1110, y: 220 }, data: { label: 'Incident Commander', activationSeverity: 2, coordinationBonus: 0.4 } as any },
            { id: 'responder-1', type: 'Responder', position: { x: 1110, y: 380 }, data: { label: 'Platform Responder', baseResponseTimeMean: 6, fatigueSensitivity: 0.2, shiftLengthHours: 8 } as any },
            { id: 'action-1', type: 'Action', position: { x: 1110, y: 520 }, data: { label: 'Rollback Deploy', requiredSkill: 'platform', durationMean: 8, successProbability: 0.85, isRollback: true } as any },
        ],
        edges: [
            { id: 'e1', source: 'deploy-1', target: 'svc-1' },
            { id: 'e2', source: 'svc-1', target: 'sig-1' },
            { id: 'e3', source: 'sig-1', target: 'alert-1' },
            { id: 'e4', source: 'runbook-1', target: 'alert-1' },
            { id: 'e5', source: 'alert-1', target: 'esc-1' },
            { id: 'e6', source: 'esc-1', target: 'oncall-1' },
            { id: 'e7', source: 'esc-1', target: 'oncall-2' },
            { id: 'e8', source: 'oncall-1', target: 'comm-1' },
            { id: 'e9', source: 'oncall-2', target: 'comm-1' },
            { id: 'e10', source: 'commander-1', target: 'comm-1' },
            { id: 'e11', source: 'responder-1', target: 'comm-1' },
            { id: 'e12', source: 'responder-1', target: 'action-1' },
            { id: 'e13', source: 'action-1', target: 'svc-1' },
        ]
    },
    {
        name: 'Campaign Vendor Brownout',
        description: 'A marketing surge exposes a flaky vendor dependency and noisy communications.',
        nodes: [
            { id: 'traffic-1', type: 'Traffic', position: { x: 50, y: 60 }, data: { label: 'Marketing Campaign', baselineRequestRate: 1200, spikeProbability: 0.2, spikeMultiplier: 4 } as any },
            { id: 'vendor-1', type: 'Vendor', position: { x: 50, y: 200 }, data: { label: 'Geo Maps API', outageProbability: 0.04, slaResponseTime: 30 } as any },
            { id: 'dep-1', type: 'Dependency', position: { x: 50, y: 320 }, data: { label: 'Mapping Dependency', type: 'soft', impact: 0.6 } as any },
            { id: 'svc-1', type: 'Service', position: { x: 50, y: 440 }, data: { label: 'Delivery Service', baseFailureRate: 0.03, recoveryRate: 0.15 } as any },
            { id: 'sig-1', type: 'Signal', position: { x: 260, y: 440 }, data: { label: 'Saturation Signal', metric: 'saturation', detectionDelayMean: 4, detectionDelayStdDev: 1, signalToNoiseRatio: 0.8 } as any },
            { id: 'alert-1', type: 'AlertRule', position: { x: 460, y: 440 }, data: { label: 'Capacity Alert', threshold: 4, durationMinutes: 4 } as any },
            { id: 'runbook-1', type: 'Runbook', position: { x: 460, y: 340 }, data: { label: 'Traffic Shed Playbook', quality: 0.7, isOutdated: true, automated: false } as any },
            { id: 'oncall-1', type: 'OnCall', position: { x: 680, y: 440 }, data: { label: 'Operations OnCall', scheduleId: 'ops', handoverProtocol: 'none' } as any },
            { id: 'comm-1', type: 'CommChannel', position: { x: 900, y: 440 }, data: { label: 'War Room Bridge', latency: 3, contextLossProb: 0.25 } as any },
            { id: 'commander-1', type: 'Commander', position: { x: 1110, y: 360 }, data: { label: 'Ops Lead', activationSeverity: 3, coordinationBonus: 0.25 } as any },
            { id: 'responder-1', type: 'Responder', position: { x: 1110, y: 520 }, data: { label: 'Ops Responder', baseResponseTimeMean: 10, fatigueSensitivity: 0.3, shiftLengthHours: 10 } as any },
            { id: 'action-1', type: 'Action', position: { x: 1110, y: 660 }, data: { label: 'Enable Rate Limits', requiredSkill: 'ops', durationMean: 12, successProbability: 0.75, isRollback: false } as any },
        ],
        edges: [
            { id: 'e1', source: 'traffic-1', target: 'svc-1' },
            { id: 'e2', source: 'vendor-1', target: 'dep-1' },
            { id: 'e3', source: 'dep-1', target: 'svc-1' },
            { id: 'e4', source: 'svc-1', target: 'sig-1' },
            { id: 'e5', source: 'sig-1', target: 'alert-1' },
            { id: 'e6', source: 'runbook-1', target: 'alert-1' },
            { id: 'e7', source: 'alert-1', target: 'oncall-1' },
            { id: 'e8', source: 'oncall-1', target: 'comm-1' },
            { id: 'e9', source: 'commander-1', target: 'comm-1' },
            { id: 'e10', source: 'responder-1', target: 'comm-1' },
            { id: 'e11', source: 'responder-1', target: 'action-1' },
            { id: 'e12', source: 'action-1', target: 'svc-1' },
        ]
    }
];
