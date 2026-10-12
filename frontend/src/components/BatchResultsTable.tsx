import React from 'react';

interface BatchResult {
  input: any;
  output: any;
  status: string;
  error?: string;
}

interface BatchResultsTableProps {
  results: BatchResult[];
}

const BatchResultsTable: React.FC<BatchResultsTableProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <div className="batch-results-empty" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
        No batch results to display.
      </div>
    );
  }

  return (
    <div className="batch-results-container" style={{
      width: '100%',
      overflowX: 'auto',
      backgroundColor: '#1e1e1e',
      borderRadius: '8px',
      border: '1px solid #333',
      color: '#e0e0e0',
      fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left'
      }}>
        <thead>
          <tr style={{
            backgroundColor: '#2a2a2a',
            borderBottom: '1px solid #444'
          }}>
            <th style={{ padding: '12px 16px', fontWeight: '600' }}>#</th>
            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Input (Variables)</th>
            <th style={{ padding: '12px 16px', fontWeight: '600' }}>Output / Error</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const isSuccess = result.status === 'success';
            const rowStyle: React.CSSProperties = {
              borderBottom: '1px solid #333',
              backgroundColor: isSuccess ? 'rgba(46, 204, 113, 0.05)' : 'rgba(231, 76, 60, 0.05)',
            };
            const statusColor = isSuccess ? '#2ecc71' : '#e74c3c';

            return (
              <tr key={index} style={rowStyle}>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>{index + 1}</td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: isSuccess ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                    color: statusColor,
                    fontWeight: '500',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase'
                  }}>
                    {result.status}
                  </span>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top', maxWidth: '300px' }}>
                  <pre style={{
                    margin: 0,
                    padding: '8px',
                    backgroundColor: '#121212',
                    borderRadius: '4px',
                    overflowX: 'auto',
                    fontSize: '0.85rem',
                    color: '#d4d4d4'
                  }}>
                    <code>{JSON.stringify(result.input, null, 2)}</code>
                  </pre>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  {isSuccess ? (
                    <pre style={{
                      margin: 0,
                      padding: '8px',
                      backgroundColor: '#121212',
                      borderRadius: '4px',
                      overflowX: 'auto',
                      fontSize: '0.85rem',
                      color: '#d4d4d4'
                    }}>
                      <code>{JSON.stringify(result.output, null, 2)}</code>
                    </pre>
                  ) : (
                    <div style={{ color: '#e74c3c', fontSize: '0.9rem' }}>
                      {result.error || 'Unknown error occurred'}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BatchResultsTable;
