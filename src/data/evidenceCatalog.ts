import type { BlockConfig, BlockType } from '../types/blocks';

export type EvidenceSourceType = 'academic' | 'industry';

export interface EvidenceSource {
    id: string;
    type: EvidenceSourceType;
    title: string;
    summary: string;
    url?: string;
    derivedParameters: Partial<Record<BlockType, Partial<BlockConfig>>>;
}

export interface EvidenceProfile {
    id: string;
    name: string;
    description: string;
    sources: EvidenceSource[];
    parameterOverrides: Partial<Record<BlockType, Partial<BlockConfig>>>;
    runbookEffectiveness: {
        responseDelay: number;
        successProbability: number;
    };
}

const mergeDerivedParameters = (sources: EvidenceSource[]) => {
    const overrides: Partial<Record<BlockType, Partial<BlockConfig>>> = {};
    sources.forEach((source) => {
        Object.entries(source.derivedParameters).forEach(([blockType, params]) => {
            const typedBlock = blockType as BlockType;
            overrides[typedBlock] = {
                ...(overrides[typedBlock] ?? {}),
                ...(params ?? {}),
            };
        });
    });
    return overrides;
};

const ACADEMIC_SOURCES: EvidenceSource[] = [
    {
        id: 'academic-incident-recovery-2021',
        type: 'academic',
        title: 'Incident Recovery Time Distributions (2021)',
        summary: 'Modeled detection delays and recovery rates from postmortem datasets.',
        url: 'https://example.edu/incident-recovery-2021',
        derivedParameters: {
            Service: {
                recoveryRate: 0.18,
            },
            Signal: {
                detectionDelayMean: 2.8,
                detectionDelayStdDev: 0.9,
            },
        },
    },
    {
        id: 'academic-human-response-2020',
        type: 'academic',
        title: 'On-call Response Behavior Study (2020)',
        summary: 'Examined human response delays and fatigue effects in incident response teams.',
        url: 'https://example.edu/oncall-response-2020',
        derivedParameters: {
            Responder: {
                baseResponseTimeMean: 9,
                fatigueSensitivity: 0.18,
            },
            Commander: {
                coordinationBonus: 0.25,
            },
        },
    },
];

const INDUSTRY_SOURCES: EvidenceSource[] = [
    {
        id: 'industry-sre-survey-2023',
        type: 'industry',
        title: 'SRE Operations Survey (2023)',
        summary: 'Industry survey of deployment risk and alerting thresholds in production teams.',
        url: 'https://example.com/sre-operations-2023',
        derivedParameters: {
            Deployment: {
                risk: 0.25,
                frequencyMinutes: 90,
            },
            AlertRule: {
                threshold: 1.2,
                durationMinutes: 4,
            },
        },
    },
    {
        id: 'industry-sre-response-2024',
        type: 'industry',
        title: 'SRE Response Time Survey Ranges (2024)',
        summary: 'Survey ranges for on-call response and mitigation durations across SRE teams.',
        url: 'https://example.com/sre-response-2024',
        derivedParameters: {
            Responder: {
                baseResponseTimeMean: 7,
                baseResponseTimeStdDev: 2.5,
                fatigueSensitivity: 0.16,
            },
            Action: {
                durationMean: 9,
                durationStdDev: 3,
                successProbability: 0.88,
            },
        },
    },
    {
        id: 'industry-vendor-sla-2022',
        type: 'industry',
        title: 'Cloud Vendor SLA Benchmarks (2022)',
        summary: 'Benchmarks for vendor outage probability and response times.',
        url: 'https://example.com/vendor-sla-2022',
        derivedParameters: {
            Vendor: {
                outageProbability: 0.002,
                slaResponseTime: 45,
            },
        },
    },
];

export const EVIDENCE_PROFILES: EvidenceProfile[] = [
    {
        id: 'evidence-academic-baseline',
        name: 'Academic Baseline',
        description: 'Parameters tuned to academic incident response studies.',
        sources: ACADEMIC_SOURCES,
        parameterOverrides: mergeDerivedParameters(ACADEMIC_SOURCES),
        runbookEffectiveness: {
            responseDelay: 1.05,
            successProbability: 1.1,
        },
    },
    {
        id: 'evidence-industry-ops',
        name: 'Industry Ops Benchmarks',
        description: 'Parameters aligned with industry surveys and SLA benchmarks.',
        sources: INDUSTRY_SOURCES,
        parameterOverrides: mergeDerivedParameters(INDUSTRY_SOURCES),
        runbookEffectiveness: {
            responseDelay: 1.15,
            successProbability: 1.2,
        },
    },
    {
        id: 'evidence-sre-survey-ranges',
        name: 'SRE Survey Ranges',
        description: 'Empirical response-time ranges reported in SRE survey data.',
        sources: [INDUSTRY_SOURCES[1]],
        parameterOverrides: mergeDerivedParameters([INDUSTRY_SOURCES[1]]),
        runbookEffectiveness: {
            responseDelay: 1.0,
            successProbability: 1.0,
        },
    },
    {
        id: 'evidence-hybrid',
        name: 'Hybrid Academic + Industry',
        description: 'Blended evidence from both academic and industry sources.',
        sources: [...ACADEMIC_SOURCES, ...INDUSTRY_SOURCES],
        parameterOverrides: mergeDerivedParameters([...ACADEMIC_SOURCES, ...INDUSTRY_SOURCES]),
        runbookEffectiveness: {
            responseDelay: 1.1,
            successProbability: 1.15,
        },
    },
];

export const DEFAULT_EVIDENCE_PROFILE_ID = EVIDENCE_PROFILES[2].id;

export const getEvidenceProfile = (profileId?: string) =>
    EVIDENCE_PROFILES.find((profile) => profile.id === profileId);

export const getEvidenceOverrides = (blockType: BlockType, profileId?: string) => {
    const profile = getEvidenceProfile(profileId);
    return profile?.parameterOverrides[blockType] ?? {};
};

export const getRunbookEffectiveness = (profileId?: string) => {
    const profile = getEvidenceProfile(profileId);
    return (
        profile?.runbookEffectiveness ?? {
            responseDelay: 1,
            successProbability: 1,
        }
    );
};
