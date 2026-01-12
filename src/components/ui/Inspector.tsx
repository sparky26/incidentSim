import React from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import type { BlockConfig } from '../../types/blocks';
import Tooltip from './Tooltip';
import { PROPERTY_DESCRIPTIONS } from '../../data/propertyDefinitions';
import { DEFAULT_EVIDENCE_PROFILE_ID, EVIDENCE_PROFILES, getEvidenceOverrides, getEvidenceProfile } from '../../data/evidenceCatalog';

const Inspector = () => {
    const { nodes, updateBlockConfig, removeBlock } = useScenarioStore();

    // Find selected node
    const selectedNode = nodes.find((n) => n.selected);

    if (!selectedNode) {
        return (
            <aside className="w-80 bg-white border-l h-full p-4">
                <div className="text-center text-gray-400 mt-10">
                    Select a block to edit properties
                </div>
            </aside>
        );
    }

    const { id, data, type } = selectedNode;
    const evidenceProfileId = data.evidenceProfileId ?? DEFAULT_EVIDENCE_PROFILE_ID;
    const evidenceProfile = getEvidenceProfile(evidenceProfileId);

    const handleChange = (key: string, value: any) => {
        // Basic type coercion
        if (typeof data[key] === 'number') {
            value = parseFloat(value);
        }
        updateBlockConfig(id, { [key]: value });
    };

    const getDistributionRange = (key: string, value: number) => {
        if (!key.endsWith('StdDev')) return null;
        const meanKey = key.replace('StdDev', 'Mean');
        const meanValue = data[meanKey];
        if (typeof meanValue !== 'number') return null;
        const min = Math.max(0, meanValue - 2 * value);
        const max = meanValue + 2 * value;
        return `Approx range (±2σ): ${min.toFixed(2)}–${max.toFixed(2)}`;
    };

    const handleEvidenceChange = (profileId: string) => {
        updateBlockConfig(id, {
            evidenceProfileId: profileId,
            ...getEvidenceOverrides(type, profileId),
        });
    };

    return (
        <aside className="w-80 bg-white border-l h-full overflow-y-auto flex flex-col p-4">
            <div className="mb-4">
                <h2 className="font-bold text-lg">{type} Properties</h2>
                <p className="text-xs text-gray-500 font-mono">{id.slice(0, 8)}...</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Evidence Profile</label>
                    <select
                        value={evidenceProfileId}
                        onChange={(e) => handleEvidenceChange(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                    >
                        {EVIDENCE_PROFILES.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                                {profile.name}
                            </option>
                        ))}
                    </select>
                    {evidenceProfile && (
                        <p className="text-xs text-gray-500 mt-1">{evidenceProfile.description}</p>
                    )}
                </div>

                {/* Render Form Fields based on data keys */}
                {Object.entries(data).map(([key, value]) => {
                    if (key === 'evidenceProfileId') {
                        return null;
                    }
                    if (key === 'label') {
                        return (
                            <div key={key}>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Label</label>
                                <input
                                    type="text"
                                    value={value as string}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full px-2 py-1 border rounded text-sm"
                                />
                            </div>
                        );
                    }

                    // Skip complex objects/arrays for v1 simple inspector
                    if (typeof value === 'object' && value !== null) return null;

                    const tooltipText = [
                        PROPERTY_DESCRIPTIONS[key],
                        evidenceProfile
                            ? `Sources: ${evidenceProfile.sources.map((source) => source.title).join('; ')}.`
                            : '',
                    ]
                        .filter(Boolean)
                        .join(' ');

                    return (
                        <div key={key}>
                            <Tooltip text={tooltipText}>
                                <label className="block text-xs font-medium text-gray-600 mb-1 capitalize cursor-help border-b border-gray-300 border-dashed inline-block">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </label>
                            </Tooltip>
                            {typeof value === 'boolean' ? (
                                <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={(e) => handleChange(key, e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                            ) : typeof value === 'string' ? (
                                // String properties - check if it's a known enum
                                key === 'handoverProtocol' ? (
                                    <select
                                        value={value}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    >
                                        <option value="strong">Strong</option>
                                        <option value="weak">Weak</option>
                                        <option value="none">None</option>
                                    </select>
                                ) : key === 'type' ? (
                                    <select
                                        value={value}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    >
                                        <option value="hard">Hard</option>
                                        <option value="soft">Soft</option>
                                    </select>
                                ) : key === 'metric' ? (
                                    <select
                                        value={value}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    >
                                        <option value="latency">Latency</option>
                                        <option value="error_rate">Error Rate</option>
                                        <option value="saturation">Saturation</option>
                                    </select>
                                ) : (
                                    // Generic string input
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                )
                            ) : (
                                <>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={value as number}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className="w-full px-2 py-1 border rounded text-sm font-mono"
                                    />
                                    {typeof value === 'number' && getDistributionRange(key, value) && (
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            {getDistributionRange(key, value)}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 pt-4 border-t">
                <button
                    className="text-red-500 text-xs hover:underline"
                    onClick={() => removeBlock(id)}
                >
                    Delete Block
                </button>
            </div>
        </aside>
    );
};

export default Inspector;
