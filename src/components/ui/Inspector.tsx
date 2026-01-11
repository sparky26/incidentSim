import React from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import type { BlockConfig } from '../../types/blocks';
import Tooltip from './Tooltip';
import { PROPERTY_DESCRIPTIONS } from '../../data/propertyDefinitions';

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

    const handleChange = (key: string, value: any) => {
        // Basic type coercion
        if (typeof data[key] === 'number') {
            value = parseFloat(value);
        }
        updateBlockConfig(id, { [key]: value });
    };

    return (
        <aside className="w-80 bg-white border-l h-full overflow-y-auto flex flex-col p-4">
            <div className="mb-4">
                <h2 className="font-bold text-lg">{type} Properties</h2>
                <p className="text-xs text-gray-500 font-mono">{id.slice(0, 8)}...</p>
            </div>

            <div className="space-y-4">
                {/* Render Form Fields based on data keys */}
                {Object.entries(data).map(([key, value]) => {
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

                    return (
                        <div key={key}>
                            <Tooltip text={PROPERTY_DESCRIPTIONS[key] || ''}>
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
                                <input
                                    type="number"
                                    step="0.001"
                                    value={value as number}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full px-2 py-1 border rounded text-sm font-mono"
                                />
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
