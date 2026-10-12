import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

interface LLMNodeData {
  model?: string;
  prompt?: string;
  isProcessing?: boolean;
  output?: string;
  onChange?: (key: string, value: any) => void;
}

interface LLMNodeProps {
  id: string;
  data: LLMNodeData;
  isConnectable: boolean;
}

// Ollama runs on the backend's own localhost, so it only ever works when the
// API itself is running locally too - against the deployed Render backend it
// errors every time, so hide it there (same gating as the main model list).
const apiBase = import.meta.env.VITE_API_BASE_URL || '';
const IS_LOCAL_BACKEND = apiBase.includes('localhost') || apiBase.includes('127.0.0.1');

const LLMNode: React.FC<LLMNodeProps> = ({ id, data, isConnectable }) => {
  const { updateNodeData } = useReactFlow();

  const handleChangeModel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateNodeData(id, { model: e.target.value });
    if (data.onChange) {
      data.onChange('model', e.target.value);
    }
  };

  const handleChangePrompt = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { prompt: e.target.value });
    if (data.onChange) {
      data.onChange('prompt', e.target.value);
    }
  };

  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      
      <div className="node-header">
        LLM Agent
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="node-label">Model</label>
          <select 
            className="node-select"
            value={data.model || 'llama-70b'}
            onChange={handleChangeModel}
          >
            <option value="llama-70b">GPT-OSS 120B (Groq)</option>
            <option value="llama-8b">GPT-OSS 20B (Groq)</option>
            <option value="nemotron-120b">Nemotron 3 Super 120B (OpenRouter)</option>
            {IS_LOCAL_BACKEND && <option value="ollama-llama3.1">Llama 3.1 8B (Ollama)</option>}
          </select>
        </div>

        <div className="node-field" style={{ marginTop: '12px' }}>
          <label className="node-label">Prompt Template</label>
          <textarea 
            className="node-input"
            value={data.prompt || ''} 
            onChange={handleChangePrompt}
            rows={4}
            placeholder="Use {node_id} to inject variables"
          />
        </div>
      </div>

      <div className="node-footer">
        {data.isProcessing ? (
          <span className="status-processing">● Processing...</span>
        ) : data.output ? (
          <span className="status-ready">● Ready (Has Output)</span>
        ) : (
          <span className="status-idle">● Idle</span>
        )}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

export default LLMNode;
