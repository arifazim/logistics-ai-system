import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

function OutputPreview({ previewData, getVisibleColumns, handleCellClick, VEHICLE_RATE_COLUMNS }) {
  if (!previewData.length) return null;
  return (
    <Box mt={4}>
      <Typography variant="h6" mb={2}>📝 Quotation Preview</Typography>
      <Box sx={{ maxHeight: 400, overflow: 'auto', borderRadius: 2 }}>
        <TableContainer component={Paper} sx={{ border: '1px solid #d0d7de', borderRadius: 4, marginTop: 2, minWidth: 650 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {getVisibleColumns().map((col) => (
                  <TableCell key={col.index} sx={{ 
                    fontWeight: 'bold',
                    backgroundColor: VEHICLE_RATE_COLUMNS.some(v => 
                      v.toUpperCase() === col.name.toString().trim().toUpperCase()
                    ) ? '#e3f2fd' : '#f3f6fa',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2
                  }}>
                    {col.name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.slice(1).map((row, rIdx) => (
                <TableRow key={rIdx}>
                  {getVisibleColumns().map((col) => {
                    const cell = row[col.index];
                    const colName = col.name.toString().toUpperCase();
                    const isVehicleRateColumn = VEHICLE_RATE_COLUMNS.some(col =>
                      col.toUpperCase() === colName
                    );
                    const isNumericRate = !isNaN(Number(cell)) && Number(cell) > 0;
                    
                    return (
                      <TableCell
                        key={col.index}
                        sx={{
                          backgroundColor: isVehicleRateColumn && isNumericRate ? '#e8f5e8' : 'inherit',
                          fontWeight: isVehicleRateColumn && isNumericRate ? 'bold' : 'normal',
                          color: isVehicleRateColumn && isNumericRate ? '#2e7d32' : 'inherit',
                          border: isVehicleRateColumn ? '2px solid #4caf50' : '1px solid #d0d7de',
                          cursor: isVehicleRateColumn && isNumericRate ? 'pointer' : 'default',
                          position: 'relative'
                        }}
                        onClick={(e) => handleCellClick(e, rIdx + 1, col.index)}
                      >
                        {isVehicleRateColumn && isNumericRate ? `₹${cell}` : cell}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

export default OutputPreview; 