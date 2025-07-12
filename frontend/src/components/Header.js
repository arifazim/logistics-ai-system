import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { Link } from 'react-router-dom';
import fnLogo from '../resources/images/Image_fn.png';
import DescriptionIcon from '@mui/icons-material/Description';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DashboardIcon from '@mui/icons-material/Dashboard';

function Header() {
  return (
    <AppBar position="sticky" color="primary" elevation={4} sx={{ mb: 4 }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <img src={fnLogo} alt="FormulaNEXT Logo" style={{ height: 64, marginRight: 4 }} />
            <Typography variant="h6" fontWeight={700} color="inherit" noWrap>
              FormulaNEXT Express <span role="img" aria-label="truck" style={{ fontSize: 28, marginLeft: 6 }}>🚚</span>
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
             <Button component={Link} to="/bulk-quotation" color="inherit" variant="text" startIcon={<DescriptionIcon />}>
              Quotation Builder
            </Button>
            <Button component={Link} to="/vendor-lookup" color="inherit" variant="text" startIcon={<CompareArrowsIcon />}>
              Vendor 
            </Button>
            <Button component={Link} to="/quotations" color="inherit" variant="text" startIcon={<ReceiptLongIcon />}>
              Quotation 
            </Button>
            <Button component={Link} to="/route-lookup" color="inherit" variant="text" startIcon={<ReceiptLongIcon />}>
              Route   
            </Button>
            <Button component={Link} to="/dashboard" color="inherit" variant="text" startIcon={<DashboardIcon />}>
              Dashboard
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Header;