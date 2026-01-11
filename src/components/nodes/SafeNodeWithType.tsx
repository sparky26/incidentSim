import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const SafeNodeWithType = ({ data }: NodeProps) => {
    return (
        <div className="p-2 border bg-white">
            <Handle type="target" position={Position.Top} />
            Safe Node with NodeProps
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

export default memo(SafeNodeWithType);
