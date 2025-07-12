import React from 'react';
import { Typography, CircularProgress, Box } from '@mui/material';

function RateConfig({ ratePercent, onPercentChange, onProcess, onDownload, processing, outputData, inputFile }) {
  return (
    <Box p={2} sx={{ backgroundColor: '#f8f9fa', borderRadius: 1, border: '1px solid #dee2e6' }}>
      <Box sx={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Typography variant="body1" sx={{ fontWeight: '500', color: '#4a5568' }}>
            Add % to All Rates:
          </Typography>
          <Box sx={{ position: 'relative' }}>
            <input
              type="number"
              value={ratePercent}
              onChange={e => onPercentChange(Number(e.target.value))}
              min={-100}
              max={100}
              style={{ height: '40px', width: '120px', borderRadius: '8px', border: '2px solid #c3cfe2', padding: '0 12px', fontSize: 16 }}
            />
            <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', fontSize: 14 }}>%</span>
          </Box>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            Enter percentage (-100 to 100)
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <button
          onClick={onProcess}
          disabled={processing || !inputFile}
          style={{
            borderRadius: '8px',
            border: 'none',
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: 15,
            background: '#c3cfe2',
            color: '#2d3748',
            cursor: processing || !inputFile ? 'not-allowed' : 'pointer',
            opacity: processing || !inputFile ? 0.5 : 1
          }}
        >
          {processing ? <CircularProgress size={20} sx={{ color: '#2d3748' }} /> : 'Process'}
        </button>
        <button
          onClick={onDownload}
          disabled={!outputData}
          style={{
            borderRadius: '8px',
            border: '2px solid #48bb78',
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: 15,
            background: 'white',
            color: '#48bb78',
            cursor: !outputData ? 'not-allowed' : 'pointer',
            opacity: !outputData ? 0.5 : 1
          }}
        >
          Download
        </button>
      </Box>
    </Box>
  );
}

export default RateConfig; 