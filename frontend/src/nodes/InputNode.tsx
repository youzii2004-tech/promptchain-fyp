import React, { type ChangeEvent } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

interface InputNodeData {
  value?: string;
  label?: string;
}

interface InputNodeProps {
  id: string;
  data: InputNodeData;
}

const InputNode: React.FC<InputNodeProps> = ({ id, data }) => {
  const { updateNodeData } = useReactFlow();

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { value: e.target.value });
  };

  return (
    <div className="custom-node">
      <div className="node-header">
        {data.label || 'Text Input'}
      </div>
      <div className="node-body">
        <textarea
          className="node-input"
          value={data.value || ''}
          onChange={handleChange}
          placeholder="Enter your prompt or text here..."
          rows={4}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#10b981',
          width: '12px',
          height: '12px',
          border: '2px solid rgba(255, 255, 255, 0.8)',
          right: '-6px'
        }}
      />
    </div>
  );
};

export default InputNode;
