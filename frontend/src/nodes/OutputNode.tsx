import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface OutputNodeProps {
  data: {
    output?: string;
  };
}

const OutputNode: React.FC<OutputNodeProps> = ({ data }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Left} style={{ background: '#64748b' }} />
      
      <div className="node-header">
        Final Output
      </div>

      <div className="node-body">
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.03)'
        }}>
          {data.output ? (
            <pre style={{ 
              margin: 0, 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word', 
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              color: '#e2e8f0'
            }}>
              <code>{data.output}</code>
            </pre>
          ) : (
            <div style={{ 
              color: 'var(--text-muted)', 
              fontStyle: 'italic', 
              fontSize: '0.8rem',
              textAlign: 'center',
              padding: '10px 0'
            }}>
              Waiting for execution...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutputNode;
