import { create } from 'zustand';
import type {
    Connection,
    Edge,
    Node,
    OnNodesChange,
    OnEdgesChange
} from 'reactflow';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges
} from 'reactflow';
import type { Block, BlockType, BlockConfig } from '../types/blocks';
import type { SimulationConfig, SimulationRunResult } from '../types/simulation';
import { v4 as uuidv4 } from 'uuid';
import { isConnectionAllowed } from '../utils/connectionRules';
import { DEFAULT_EVIDENCE_PROFILE_ID, getEvidenceOverrides } from '../data/evidenceCatalog';

// Default configs for new blocks
const buildDefaultConfig = <T extends BlockConfig>(type: BlockType, config: T): T => ({
    ...config,
    evidenceProfileId: DEFAULT_EVIDENCE_PROFILE_ID,
    ...getEvidenceOverrides(type, DEFAULT_EVIDENCE_PROFILE_ID),
});

const DEFAULT_CONFIGS: Record<BlockType, BlockConfig> = {
    'Service': buildDefaultConfig('Service', { label: 'New Service', baseFailureRate: 0.001, recoveryRate: 0.1 } as any),
    'Dependency': buildDefaultConfig('Dependency', { label: 'Dependency', type: 'hard', impact: 1 } as any),
    'Vendor': buildDefaultConfig('Vendor', { label: 'Vendor', outageProbability: 0.001, slaResponseTime: 60 } as any),
    'Traffic': buildDefaultConfig('Traffic', { label: 'Traffic', baselineRequestRate: 100, spikeProbability: 0.01, spikeMultiplier: 5 } as any),
    'Deployment': buildDefaultConfig('Deployment', { label: 'Deploy', risk: 0.2, canary: false, automated: true, frequencyMinutes: 60 } as any),
    'Signal': buildDefaultConfig('Signal', { label: 'Signal', metric: 'latency', detectionDelayMean: 1, detectionDelayStdDev: 0.2, signalToNoiseRatio: 0.95 } as any),
    'AlertRule': buildDefaultConfig('AlertRule', { label: 'Alert Rule', threshold: 1, durationMinutes: 5 } as any),
    'OnCall': buildDefaultConfig('OnCall', { label: 'OnCall', scheduleId: 'default', handoverProtocol: 'weak' } as any),
    'Escalation': buildDefaultConfig('Escalation', { label: 'Escalation', steps: [] } as any),
    'Responder': buildDefaultConfig('Responder', { label: 'Responder', baseResponseTimeMean: 10, baseResponseTimeStdDev: 3, fatigueSensitivity: 0.1, shiftLengthHours: 8 } as any),
    'Commander': buildDefaultConfig('Commander', { label: 'Commander', experienceLevel: 5, coordinationBonus: 0.2 } as any),
    'CommChannel': buildDefaultConfig('CommChannel', { label: 'Slack', latency: 0.1, contextLossProb: 0.01 } as any),
    'Runbook': buildDefaultConfig('Runbook', { label: 'SOP', quality: 0.8, isOutdated: false, automated: false } as any),
    'Action': buildDefaultConfig('Action', { label: 'Action', requiredSkill: '', durationMean: 15, durationStdDev: 4, successProbability: 0.9, isRollback: false } as any),
};

interface ScenarioState {
    nodes: Node<BlockConfig>[];
    edges: Edge[];
    simulationConfig: SimulationConfig;
    results: SimulationRunResult[] | null;
    isSimulating: boolean;

    // Actions
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (connection: Connection) => void;
    addBlock: (type: BlockType, position: { x: number, y: number }) => void;
    removeBlock: (id: string) => void;
    updateBlockConfig: (id: string, config: Partial<BlockConfig>) => void;
    setResults: (results: SimulationRunResult[]) => void;
    setSimulating: (isSimulating: boolean) => void;
    loadTemplate: (nodes: Node<BlockConfig>[], edges: Edge[]) => void;
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
    nodes: [],
    edges: [],
    simulationConfig: {
        maxTimeMinutes: 240, // 4 hours
        seed: 12345,
        scenarioId: 'draft',
        evidenceProfileId: DEFAULT_EVIDENCE_PROFILE_ID
    },
    results: null,
    isSimulating: false,

    loadTemplate: (nodes, edges) => {
        set({ nodes, edges, results: null });
    },

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    onConnect: (connection) => {
        const { nodes } = get();
        const sourceType = nodes.find((node) => node.id === connection.source)?.type as BlockType | undefined;
        const targetType = nodes.find((node) => node.id === connection.target)?.type as BlockType | undefined;
        if (!isConnectionAllowed(sourceType, targetType)) {
            return;
        }
        set({
            edges: addEdge(connection, get().edges),
        });
    },
    addBlock: (type, position) => {
        const id = uuidv4();
        const newNode: Node<BlockConfig> = {
            id,
            type, // This maps to our custom node types
            position,
            data: { ...DEFAULT_CONFIGS[type] },
        };
        set({ nodes: [...get().nodes, newNode] });
    },
    removeBlock: (id) => {
        const { nodes, edges } = get();
        set({
            nodes: nodes.filter((node) => node.id !== id),
            edges: edges.filter((edge) => edge.source !== id && edge.target !== id),
        });
    },
    updateBlockConfig: (id, config) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, ...config } };
                }
                return node;
            }),
        });
    },
    setResults: (results) => set({ results }),
    setSimulating: (isSimulating) => set({ isSimulating }),
}));
