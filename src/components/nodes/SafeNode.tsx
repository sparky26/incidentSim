import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const SafeNode = () => {
    return (
        <div className="p-2 border bg-white">
            <Handle type="target" position={Position.Top} />
            Safe Node
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

export default memo(SafeNode);
