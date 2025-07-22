import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Container,
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  styled,
  alpha,
  Tooltip
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import fnLogo from '../resources/images/Image_fn.png';
import DescriptionIcon from '@mui/icons-material/Description';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuIcon from '@mui/icons-material/Menu';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocalShippingSharpIcon from '@mui/icons-material/LocalShippingSharp';
import Groups2SharpIcon from '@mui/icons-material/Groups2Sharp';
import ListAltIcon from '@mui/icons-material/ListAlt';         // For Quotation Builder
import AltRouteIcon from '@mui/icons-material/AltRoute';       // For Route by Vendors
import SummarizeIcon from '@mui/icons-material/Summarize';     // For Route Summary
import ShowChartIcon from '@mui/icons-material/ShowChart';     // For Route Rates
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard'; // For Dashboard
import BusinessIcon from '@mui/icons-material/Business';      // For Vendor Analysis

// Styled components
const NavIconButton = styled(IconButton)(({ theme, active }) => ({
  color: 'white',
  margin: theme.spacing(0, 1),
  padding: theme.spacing(1.2),
  position: 'relative',
  transition: 'all 0.2s',
  '&:after': active ? {
    content: '""',
    position: 'absolute',
    width: '75%',
    height: '3px',
    bottom: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'white',
    borderRadius: '2px 2px 0 0',
  } : {},
  '&:hover': {
    background: alpha(theme.palette.common.white, 0.15),
    transform: 'translateY(-2px)',
  },
}));

// Icon style configuration with unique colors for each navigation item
const iconStyles = {
  quotationBuilder: { 
    color: '#FF6B6B', // Coral red
    filter: 'drop-shadow(0 2px 5px rgba(255,107,107,0.5))'
  },
  routeByVendors: { 
    color: '#48dbfb', // Sky blue
    filter: 'drop-shadow(0 2px 5px rgba(72,219,251,0.5))'
  },
  routeSummary: { 
    color: '#1dd1a1', // Mint green
    filter: 'drop-shadow(0 2px 5px rgba(29,209,161,0.5))'
  },
  routeRates: { 
    color: '#feca57', // Yellow
    filter: 'drop-shadow(0 2px 5px rgba(254,202,87,0.5))'
  },
  dashboard: { 
    color: '#a29bfe', // Lavender
    filter: 'drop-shadow(0 2px 5px rgba(162,155,254,0.5))'
  },
  vendorAnalysis: { 
    color: '#26de81', // Fresh green
    filter: 'drop-shadow(0 2px 5px rgba(38,222,129,0.5))'
  }
};

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // other icons for navigation
  // DescriptionIcon
  // CompareArrowsIcon
  // ReceiptLongIcon
  // DashboardIcon  
  const navigationItems = [
    { text: 'Quotation Builder', icon: <ListAltIcon sx={iconStyles.quotationBuilder} fontSize="medium" />, path: '/bulk-quotation', styleKey: 'quotationBuilder' },
    { text: 'Route by Vendors', icon: <AltRouteIcon sx={iconStyles.routeByVendors} fontSize="medium" />, path: '/vendor-lookup', styleKey: 'routeByVendors' },
    { text: 'Vendor Analysis', icon: <Groups2SharpIcon sx={iconStyles.vendorAnalysis} fontSize="medium" />, path: '/vendor-analysis', styleKey: 'vendorAnalysis' },
    { text: 'Route Summary', icon: <SummarizeIcon sx={iconStyles.routeSummary} fontSize="medium" />, path: '/quotations', styleKey: 'routeSummary' },
    { text: 'Route Rates', icon: <LocalShippingSharpIcon sx={iconStyles.routeRates} fontSize="medium" />, path: '/route-lookup', styleKey: 'routeRates' },
    { text: 'Dashboard', icon: <SpaceDashboardIcon sx={iconStyles.dashboard} fontSize="medium" />, path: '/dashboard', styleKey: 'dashboard' }
  ];
 

  // Mobile drawer content
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        FormulaNEXT Express
      </Typography>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem 
            component={Link} 
            to={item.path} 
            key={item.path}
            selected={location.pathname === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
              py: 1.5
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: iconStyles[item.styleKey].color }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{
                fontWeight: location.pathname === item.path ? 600 : 400
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="static" 
        sx={{ 
          background: 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          mb: 2
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ py: { xs: 1, md: 0.5 } }}>
            {/* Mobile menu button */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* Logo and Brand */}
            <Box display="flex" alignItems="center" gap={2} sx={{ mr: { xs: 1, md: 5 } }}>
              <img 
                src={fnLogo} 
                alt="FormulaNEXT Logo" 
                style={{ 
                  height: isMobile ? 72 : 80, 
                  transition: 'all 0.3s ease',
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))',
                  margin: '4px 0',
                  objectFit: 'contain',
                  maxWidth: '100%',
                  padding: '2px'
                }} 
              />
              <Box>
                <Typography 
                  variant={isMobile ? "subtitle1" : "h6"} 
                  fontWeight={700} 
                  sx={{
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    letterSpacing: '0.5px',
                    lineHeight: 1.2
                  }}
                >
                  FormulaNEXT Express
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: 'rgba(255,255,255,0.8)',
                    mt: 0.5
                  }}
                >
                  <LocalShippingIcon fontSize="small" sx={{ mr: 0.5, fontSize: 14 }} />
                  Logistics Management System
                </Typography>
              </Box>
            </Box>

            {/* Desktop Navigation Links */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, ml: 'auto' }}>
              {navigationItems.map((item) => (
                <Tooltip 
                  key={item.text}
                  title={item.text}
                  placement="bottom"
                  arrow
                  enterDelay={300}
                  leaveDelay={100}
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        p: 1,
                        borderRadius: '6px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                      }
                    }
                  }}
                >
                  <NavIconButton
                    component={Link}
                    to={item.path}
                    active={location.pathname === item.path ? 1 : 0}
                    aria-label={item.text}
                    sx={{
                      '&:hover': {
                        background: alpha(theme.palette.common.white, 0.15),
                      }
                    }}
                  >
                    {item.icon}
                  </NavIconButton>
                </Tooltip>
              ))}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
    </>
  );
}

export default Header;