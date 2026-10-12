import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import InputNode from '../nodes/InputNode';
import LLMNode from '../nodes/LLMNode';
import OutputNode from '../nodes/OutputNode';
import { usePromptStore } from '../store/usePromptStore';

const nodeTypes: NodeTypes = {
  inputNode: InputNode,
  llmNode: LLMNode,
  outputNode: OutputNode,
};

const FlowCanvas: React.FC = () => {
  const nodes = usePromptStore((state) => state.nodes);
  const edges = usePromptStore((state) => state.edges);
  const onNodesChange = usePromptStore((state) => state.onNodesChange);
  const onEdgesChange = usePromptStore((state) => state.onEdgesChange);
  const onConnect = usePromptStore((state) => state.onConnect);
  const runChain = usePromptStore((state) => state.runChain);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <button
        onClick={runChain}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
          padding: '8px 16px',
          background: '#4a90e2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Run Chain
      </button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default FlowCanvas;
