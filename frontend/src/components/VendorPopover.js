import React from 'react';
import { Popover, Box, Typography } from '@mui/material';

function VendorPopover({ popoverAnchor, popoverContent, popoverTitle, handlePopoverClose }) {
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
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
              Max Rate: ₹{popoverContent[0].rate} ({popoverContent[0].vendorName})
            </Typography>
            {popoverContent.map((vendor, i) => (
              <Typography key={i} variant="body2">
                <span style={{ color: '#1976d2' }}>{vendor.vendorName}</span>: <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>₹{vendor.rate}</span>
              </Typography>
            ))}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">No vendor rates found.</Typography>
        )}
      </Box>
    </Popover>
  );
}

export default VendorPopover; 