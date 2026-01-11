import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import clsx from 'clsx';
import { BlockConfig } from '../../types/blocks';

// Map types to colors
const TYPE_COLORS: Record<string, string> = {
    // System
    'Service': 'bg-blue-100 border-blue-500',
    'Dependency': 'bg-gray-100 border-gray-500',
    'Vendor': 'bg-purple-100 border-purple-500',
    'Traffic': 'bg-orange-100 border-orange-500',
    // Detection
    'Signal': 'bg-yellow-100 border-yellow-500',
    'AlertRule': 'bg-red-100 border-red-500',
    'OnCall': 'bg-indigo-100 border-indigo-500',
    'Escalation': 'bg-pink-100 border-pink-500',
    // Human
    'Responder': 'bg-green-100 border-green-500',
    'Commander': 'bg-teal-100 border-teal-500',
    'CommChannel': 'bg-slate-100 border-slate-500',
    // Mitigation
    'Action': 'bg-emerald-100 border-emerald-500',
};

const BlockNode = ({ data, type, selected }: NodeProps<BlockConfig>) => {
    // type from props is the node type string (e.g. 'Service') if registered that way
    // Or we can get it from data if we store it there.
    // We will register node types with the same keys as BlockType.

    const colorClass = TYPE_COLORS[type] || 'bg-white border-gray-300';

    return (
        <div className={clsx(
            'px-4 py-2 rounded shadow-md border-2 min-w-[150px]',
            colorClass,
            selected && 'ring-2 ring-black'
        )}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />

            <div className="flex flex-col">
                <span className="text-xs uppercase font-bold tracking-wider opacity-50">{type}</span>
                <span className="font-semibold text-sm">{data.label}</span>
            </div>

            {/* Optional: Show key config values? */}

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400" />
        </div>
    );
};

export default memo(BlockNode);
