import React from 'react';
import { Typography, Box } from '@mui/material';

function FileUpload({ inputFile, onFileChange }) {
  return (
    <Box p={2} sx={{ backgroundColor: '#f8f9fa', borderRadius: 1, border: '1px solid #dee2e6' }}>
     
      <Box sx={{ border: '2px dashed #c3cfe2', borderRadius: '12px', padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc' }}>
        <input
          type="file"
          accept=".xlsx"
          onChange={e => onFileChange(e.target.files[0])}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
          <span
            style={{
              border: '2px solid #c3cfe2',
              color: '#2d3748',
              borderRadius: '12px',
              padding: '12px 24px',
              background: 'white',
              fontWeight: 600,
              display: 'inline-block'
            }}
          >
            📂 Choose Excel File
          </span>
        </label>
        {inputFile && (
          <Typography variant="body2" sx={{ marginTop: '1rem', color: '#4a5568' }}>
            Selected: {inputFile.name}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default FileUpload; 