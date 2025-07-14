import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
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
  Fade,
  Tooltip
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import fnLogo from '../resources/images/Image_fn.png';
import DescriptionIcon from '@mui/icons-material/Description';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        FormulaNEXT Express
      </Typography>
      <Divider />
      <List>
        <ListItem button component={Link} to="/bulk-quotation" selected={location.pathname === '/bulk-quotation'}>
          <ListItemIcon>
            <DescriptionIcon />
          </ListItemIcon>
          <ListItemText primary="Quotation Builder" />
        </ListItem>
        <ListItem button component={Link} to="/vendor-lookup" selected={location.pathname === '/vendor-lookup'}>
          <ListItemIcon>
            <CompareArrowsIcon />
          </ListItemIcon>
          <ListItemText primary="Vendor" />
        </ListItem>
        <ListItem button component={Link} to="/quotations" selected={location.pathname === '/quotations'}>
          <ListItemIcon>
            <ReceiptLongIcon />
          </ListItemIcon>
          <ListItemText primary="Quotation" />
        </ListItem>
        <ListItem button component={Link} to="/route-lookup" selected={location.pathname === '/route-lookup'}>
          <ListItemIcon>
            <ReceiptLongIcon />
          </ListItemIcon>
          <ListItemText primary="Route" />
        </ListItem>
        <ListItem button component={Link} to="/dashboard" selected={location.pathname === '/dashboard'}>
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <AppBar 
      position="sticky" 
      elevation={0} 
      sx={{ 
        mb: 4, 
        background: 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ py: 1 }}>
          {/* Logo and Brand */}
          <Box display="flex" alignItems="center" gap={1}>
            <img 
              src={fnLogo} 
              alt="FormulaNEXT Logo" 
              style={{ 
                height: isMobile ? 48 : 56, 
                transition: 'height 0.3s ease',
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
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

          {/* Mobile Menu Button */}
          {isMobile ? (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="end"
              onClick={handleDrawerToggle}
              sx={{ ml: 'auto' }}
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          ) : (
            /* Desktop Navigation */
            <Box display="flex" gap={1} ml="auto">
              {[
                { text: 'Quotation Builder', icon: <DescriptionIcon />, path: '/bulk-quotation' },
                { text: 'Vendor', icon: <CompareArrowsIcon />, path: '/vendor-lookup' },
                { text: 'Quick Quote', icon: <ReceiptLongIcon />, path: '/quotations' },
                { text: 'Route', icon: <ReceiptLongIcon />, path: '/route-lookup' },
                { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' }
              ].map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Tooltip key={item.path} title={item.text} arrow>
                    <Button
                      component={Link}
                      to={item.path}
                      sx={{
                        color: 'white',
                        borderRadius: '8px',
                        px: 2,
                        py: 1,
                        minWidth: 'auto',
                        position: 'relative',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                        '&::after': isActive ? {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: '50%',
                          width: '40%',
                          height: '3px',
                          backgroundColor: 'white',
                          transform: 'translateX(-50%)',
                          borderRadius: '3px 3px 0 0',
                        } : {}
                      }}
                      startIcon={item.icon}
                    >
                      {item.text}
                    </Button>
                  </Tooltip>
                );
              })}
            </Box>
          )}
        </Toolbar>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={isMobile && mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': { 
            width: '75%', 
            maxWidth: 300,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #1976d2 0%, #2196f3 100%)',
            color: 'white'
          },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}

export default Header;