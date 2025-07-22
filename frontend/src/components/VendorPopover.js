import React from 'react';
import { Popover, Box, Typography } from '@mui/material';

function VendorPopover({ popoverAnchor, popoverContent, popoverTitle, handlePopoverClose }) {
  // Determine min and max rates
  let minRate = null, maxRate = null;
  if (popoverContent.length > 0) {
    const rates = popoverContent.map(v => v.rate);
    minRate = Math.min(...rates);
    maxRate = Math.max(...rates);
  }

  return (
    <Popover
      open={Boolean(popoverAnchor)}
      anchorEl={popoverAnchor}
      onClose={handlePopoverClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      PaperProps={{ sx: { p: 2, minWidth: 200, maxWidth: 300 } }}
    >
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          {popoverTitle}
        </Typography>
        {popoverContent.length > 0 ? (
          <>
            {popoverContent.map((vendor, i) => {
              let color = '#8e24aa'; // purple for others
              if (vendor.rate === minRate) color = '#2e7d32'; // green for lowest
              if (vendor.rate === maxRate) color = '#d32f2f'; // red for highest
              return (
                <Typography key={i} variant="body2">
                  <span style={{ color }}>{vendor.vendorName}</span>: <span style={{ color, fontWeight: 'bold' }}>₹{vendor.rate}</span>
                </Typography>
              );
            })}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">No vendor rates found.</Typography>
        )}
      </Box>
    </Popover>
  );
}

export default VendorPopover; 