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
import type { SimulationResultsHistoryEntry } from '../types/simulationBatch';
import { v4 as uuidv4 } from 'uuid';
import { isConnectionAllowed } from '../utils/connectionRules';
import { DEFAULT_EVIDENCE_PROFILE_ID, getEvidenceOverrides } from '../data/evidenceCatalog';

const BASE_DEFAULT_CONFIGS: Record<BlockType, BlockConfig> = {
    'Service': { label: 'New Service', baseFailureRate: 0.001, recoveryRate: 0.1 } as any,
    'Dependency': { label: 'Dependency', type: 'hard', impact: 1 } as any,
    'Vendor': { label: 'Vendor', outageProbability: 0.001, slaResponseTime: 60 } as any,
    'Traffic': { label: 'Traffic', baselineRequestRate: 100, spikeProbability: 0.01, spikeMultiplier: 5 } as any,
    'Deployment': { label: 'Deploy', risk: 0.2, canary: false, automated: true, frequencyMinutes: 60 } as any,
    'Signal': { label: 'Signal', metric: 'latency', detectionDelayMean: 1, detectionDelayStdDev: 0.2, signalToNoiseRatio: 0.95 } as any,
    'AlertRule': { label: 'Alert Rule', threshold: 1, durationMinutes: 5 } as any,
    'OnCall': { label: 'OnCall', scheduleId: 'default', handoverProtocol: 'weak' } as any,
    'Escalation': { label: 'Escalation', steps: [] } as any,
    'Responder': { label: 'Responder', baseResponseTimeMean: 10, baseResponseTimeStdDev: 3, fatigueSensitivity: 0.1, shiftLengthHours: 8 } as any,
    'Commander': { label: 'Commander', experienceLevel: 5, coordinationBonus: 0.2 } as any,
    'CommChannel': { label: 'Slack', latency: 0.1, contextLossProb: 0.01 } as any,
    'Runbook': { label: 'SOP', quality: 0.8, isOutdated: false, automated: false } as any,
    'Action': { label: 'Action', requiredSkill: '', durationMean: 15, durationStdDev: 4, successProbability: 0.9, isRollback: false } as any,
};

const buildDefaultConfig = (type: BlockType, profileId: string): BlockConfig => ({
    ...BASE_DEFAULT_CONFIGS[type],
    evidenceProfileId: profileId,
    ...getEvidenceOverrides(type, profileId),
});

const DEFAULT_CONFIGS: Record<BlockType, BlockConfig> = Object.fromEntries(
    Object.keys(BASE_DEFAULT_CONFIGS).map((type) => [
        type,
        buildDefaultConfig(type as BlockType, DEFAULT_EVIDENCE_PROFILE_ID),
    ])
) as Record<BlockType, BlockConfig>;

interface ScenarioState {
    nodes: Node<BlockConfig>[];
    edges: Edge[];
    simulationConfig: SimulationConfig;
    results: SimulationRunResult[] | null;
    resultsHistory: SimulationResultsHistoryEntry[];
    isSimulating: boolean;

    // Actions
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (connection: Connection) => void;
    addBlock: (type: BlockType, position: { x: number, y: number }) => void;
    removeBlock: (id: string) => void;
    removeEdge: (id: string) => void;
    updateBlockConfig: (id: string, config: Partial<BlockConfig>) => void;
    setResults: (results: SimulationRunResult[] | null) => void;
    addResultsHistory: (entries: SimulationResultsHistoryEntry | SimulationResultsHistoryEntry[]) => void;
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
    resultsHistory: [],
    isSimulating: false,

    loadTemplate: (nodes, edges) => {
        const normalizedNodes = nodes.map((node) => {
            const type = node.type as BlockType | undefined;
            if (!type || !(type in DEFAULT_CONFIGS)) {
                return node;
            }

            const templateConfig = node.data ?? {};
            const evidenceProfileId = (templateConfig as BlockConfig).evidenceProfileId ?? DEFAULT_EVIDENCE_PROFILE_ID;
            const baseConfig = BASE_DEFAULT_CONFIGS[type];
            const evidenceOverrides = getEvidenceOverrides(type, evidenceProfileId);

            const mergedConfig: BlockConfig = {
                ...baseConfig,
                ...evidenceOverrides,
                ...templateConfig,
                evidenceProfileId,
            } as BlockConfig;

            if (type === 'Signal' && (mergedConfig as any).metric === 'errors') {
                (mergedConfig as any).metric = 'error_rate';
            }

            return { ...node, data: mergedConfig };
        });

        set({ nodes: normalizedNodes, edges, results: null });
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
    removeEdge: (id) => {
        set({
            edges: get().edges.filter((edge) => edge.id !== id),
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
    addResultsHistory: (entries) => {
        const nextEntries = Array.isArray(entries) ? entries : [entries];
        set({ resultsHistory: [...get().resultsHistory, ...nextEntries] });
    },
    setSimulating: (isSimulating) => set({ isSimulating }),
}));
