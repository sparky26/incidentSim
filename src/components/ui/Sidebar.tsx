import React from 'react';
import type { BlockType } from '../../types/blocks';

const BLOCK_CATEGORIES: { name: string; types: BlockType[] }[] = [
    { name: 'System', types: ['Service', 'Dependency', 'Vendor', 'Traffic', 'Deployment'] },
    { name: 'Detection', types: ['Signal', 'AlertRule', 'Escalation', 'OnCall'] },
    { name: 'Process', types: ['Runbook'] },
    { name: 'Human', types: ['Responder', 'Commander', 'CommChannel'] },
    { name: 'Mitigation', types: ['Action'] },
];

const Sidebar = () => {
    const onDragStart = (event: React.DragEvent, nodeType: BlockType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-64 bg-white border-r h-full overflow-y-auto flex flex-col">
            <div className="p-4 border-b">
                <h2 className="font-bold text-gray-800">Library</h2>
                <p className="text-xs text-gray-500">Drag blocks to canvas</p>
            </div>

            <div className="flex-1 p-4 space-y-6">
                {BLOCK_CATEGORIES.map((cat) => (
                    <div key={cat.name}>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat.name}</h3>
                        <div className="space-y-2">
                            {cat.types.map((type) => (
                                <div
                                    key={type}
                                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded cursor-move hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm font-medium text-gray-700"
                                    draggable
                                    onDragStart={(e) => onDragStart(e, type)}
                                >
                                    {type}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default Sidebar;
