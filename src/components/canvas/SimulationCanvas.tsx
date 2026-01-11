import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
} from 'reactflow';
import type { Connection, NodeTypes } from 'reactflow';
import 'reactflow/dist/style.css';
import { useScenarioStore } from '../../store/scenarioStore';
import BlockNode from '../nodes/BlockNode';
import { BlockType } from '../../types/blocks';
import { isConnectionAllowed } from '../../utils/connectionRules';

// Register all block types to use the same component (or different ones later)
const nodeTypes: NodeTypes = {
    'Service': BlockNode,
    'Dependency': BlockNode,
    'Vendor': BlockNode,
    'Traffic': BlockNode,
    'Signal': BlockNode,
    'AlertRule': BlockNode,
    'Escalation': BlockNode,
    'OnCall': BlockNode,
    'Responder': BlockNode,
    'Commander': BlockNode,
    'CommChannel': BlockNode,
    'Action': BlockNode,
};

const SimulationCanvas = () => {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addBlock
    } = useScenarioStore();

    const nodeTypeById = useMemo(() => {
        return new Map(nodes.map((node) => [node.id, node.type as BlockType]));
    }, [nodes]);

    const isValidConnection = useCallback(
        (connection: Connection) => {
            const sourceType = nodeTypeById.get(connection.source ?? '');
            const targetType = nodeTypeById.get(connection.target ?? '');
            return isConnectionAllowed(sourceType, targetType);
        },
        [nodeTypeById]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow') as BlockType;

            if (typeof type === 'undefined' || !type) {
                return;
            }

            // Projections to convert screen coords to flow coords are complex without the reactFlowInstance.
            // For v1 MVP, just dropping at cursor or fixed point is fine.
            // Or we can use useReactFlow hook if we wrap this in ReactFlowProvider.
            // Let's use simple client offsets for now.
            const position = {
                x: event.clientX - 300, // Offset for sidebar
                y: event.clientY - 60,  // Offset for header
            }; // Crude approximation, but acceptable for v1 start.

            addBlock(type, position);
        },
        [addBlock]
    );

    return (
        <div className="w-full h-full" onDragOver={onDragOver} onDrop={onDrop}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background gap={12} size={1} />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
};

export default SimulationCanvas;
