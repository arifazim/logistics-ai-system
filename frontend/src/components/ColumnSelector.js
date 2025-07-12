import React, { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, Chip, Button, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

function ColumnSelector({ previewData, columnVisibility, setColumnVisibility, VEHICLE_RATE_COLUMNS, showColumnSelector }) {
  const [open, setOpen] = useState(true);
  if (!showColumnSelector || !previewData.length) return null;
  return (
    <Box mt={3} p={2} sx={{ backgroundColor: '#f8f9fa', borderRadius: 1, border: '1px solid #dee2e6' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          📊 Column Visibility Settings
        </Typography>
        <IconButton onClick={() => setOpen(o => !o)} size="small" aria-label={open ? 'Collapse' : 'Expand'}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <Typography variant="body2" sx={{ mr: 2 }}>
            Select columns to show/hide in the preview:
          </Typography>
          <FormControl>
            <InputLabel>Column Visibility</InputLabel>
            <Select
              multiple
              value={Object.keys(columnVisibility).filter(key => columnVisibility[key])}
              onChange={(e) => {
                const selected = e.target.value;
                const newVisibility = {};
                Object.keys(columnVisibility).forEach(key => {
                  newVisibility[key] = selected.includes(key);
                });
                setColumnVisibility(newVisibility);
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const colName = previewData[0][value];
                    return (
                      <Chip 
                        key={value} 
                        label={colName} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    );
                  })}
                </Box>
              )}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    width: 300,
                  },
                },
              }}
            >
              {previewData[0].map((col, idx) => (
                <MenuItem key={idx} value={idx.toString()}>
                  <Checkbox checked={columnVisibility[idx] !== false} />
                  <ListItemText 
                    primary={col} 
                    secondary={VEHICLE_RATE_COLUMNS.some(v => 
                      v.toUpperCase() === col.toString().trim().toUpperCase()
                    ) ? 'Vehicle Rate Column' : 'Data Column'}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Collapse>
    </Box>
  );
}

export default ColumnSelector; 