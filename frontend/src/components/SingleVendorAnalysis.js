import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Typography, TextField, Autocomplete,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Avatar, CircularProgress, Alert, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Grid, Divider, Skeleton,
  Tooltip, IconButton, Chip, Fade, Popper,
  useMediaQuery, alpha
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CompareIcon from '@mui/icons-material/Compare';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BusinessIcon from '@mui/icons-material/Business';
import { getVendorRates, getVendors } from '../services/api';

// Styled components for custom UI elements
const GradientCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
  backdropFilter: 'blur(8px)',
  borderRadius: theme.shape.borderRadius * 2,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-2px)'
  }
}));

const VendorAvatar = styled(Avatar)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.secondary.main, 0.15),
  color: theme.palette.secondary.main,
  width: 56,
  height: 56,
  marginRight: theme.spacing(2),
  border: `2px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
  }
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  '& .MuiTableCell-head': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    color: theme.palette.primary.main,
    fontWeight: 600,
    borderBottom: `2px solid ${theme.palette.primary.light}`,
  }
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: alpha(theme.palette.primary.light, 0.03),
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.light, 0.08),
    transition: 'background-color 0.2s ease',
  },
}));

const ComparisonChip = styled(Chip)(({ theme, comparison }) => ({
  fontWeight: 600,
  fontSize: '0.8rem',
  height: 24,
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.05)',
  },
  ...(comparison === 'lowest' && {
    backgroundColor: alpha(theme.palette.success.main, 0.1),
    color: theme.palette.success.dark,
    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
  }),
  ...(comparison === 'lower' && {
    backgroundColor: alpha(theme.palette.info.main, 0.1),
    color: theme.palette.info.dark,
    border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
  }),
  ...(comparison === 'average' && {
    backgroundColor: alpha(theme.palette.warning.light, 0.1),
    color: theme.palette.warning.dark,
    border: `1px solid ${alpha(theme.palette.warning.light, 0.3)}`,
  }),
  ...(comparison === 'higher' && {
    backgroundColor: alpha(theme.palette.warning.main, 0.1),
    color: theme.palette.warning.dark,
    border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
  }),
  ...(comparison === 'highest' && {
    backgroundColor: alpha(theme.palette.error.main, 0.1),
    color: theme.palette.error.dark,
    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
  }),
}));

const VehicleAvatar = styled(Avatar)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  width: 36,
  height: 36,
  marginRight: theme.spacing(1),
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.1)',
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
  }
}));

// Custom Popper component for dropdown menus
const CustomPopper = props => {
  const { style, ...otherProps } = props;
  return (
    <Popper
      {...otherProps}
      style={{
        ...style,
        width: 'auto',
        minWidth: '300px',
        maxWidth: '500px'
      }}
    />
  );
};

function SingleVendorAnalysis() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vendorRates, setVendorRates] = useState({});
  const [selectedVendor, setSelectedVendor] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [rateData, setRateData] = useState(null);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState('all');
  // Simple flag to show/hide graph section
  const [showGraph, setShowGraph] = useState(false);

  // Comparison indicators and their colors
  const comparisonIndicators = {
    lowest: { label: 'LOWEST RATE', icon: <TrendingDownIcon fontSize="small" />, color: theme.palette.success.dark },
    lower: { label: 'LOWER THAN AVG', icon: <ArrowDownwardIcon fontSize="small" />, color: theme.palette.info.dark },
    average: { label: 'AVERAGE', icon: <RemoveIcon fontSize="small" />, color: theme.palette.warning.light },
    higher: { label: 'HIGHER THAN AVG', icon: <ArrowUpwardIcon fontSize="small" />, color: theme.palette.warning.dark },
    highest: { label: 'HIGHEST RATE', icon: <TrendingUpIcon fontSize="small" />, color: theme.palette.error.dark },
  };

  // Helper for loading skeletons
  const renderSkeletons = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <StyledTableRow key={`skeleton-${index}`}>
        {Array.from({ length: 5 }).map((_, cellIndex) => (
          <TableCell key={`skeleton-cell-${index}-${cellIndex}`}>
            <Skeleton animation="wave" height={24} width="80%" />
          </TableCell>
        ))}
      </StyledTableRow>
    ));
  };

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch vendors first
        console.log('Fetching vendors data...');
        const vendorsResponse = await getVendors();
        console.log('Vendors API response:', vendorsResponse);
        
        if (!vendorsResponse || !vendorsResponse.success || !Array.isArray(vendorsResponse.vendors)) {
          console.error('Invalid vendors API response:', vendorsResponse);
          setError('Failed to load vendor list. Please try again later.');
          setLoading(false);
          return;
        }
        
        const vendorsList = vendorsResponse.vendors;
        console.log('Vendor list:', vendorsList);
        setVendors(vendorsList);
        
        // Then fetch rates
        console.log('Fetching vendor rates data...');
        const ratesResponse = await getVendorRates();
        console.log('Rates API response:', ratesResponse);
        
        // Check for proper API response format
        if (!ratesResponse || !ratesResponse.success || !Array.isArray(ratesResponse.rates)) {
          console.error('Invalid rates API response format:', ratesResponse);
          setError('The API returned an invalid data format. Please try again later.');
          setLoading(false);
          return;
        }
        
        const data = ratesResponse.rates.reduce((acc, item) => {
          // Create route key
          const routeKey = `${item.from_origin}-${item.area}`;
          
          // Initialize route if it doesn't exist
          if (!acc[routeKey]) {
            acc[routeKey] = {
              vendorRates: {}
            };
          }
          
          // Initialize vehicle type if it doesn't exist
          if (!acc[routeKey].vendorRates[item.vehicle_type]) {
            acc[routeKey].vendorRates[item.vehicle_type] = {};
          }
          
          // Add vendor rate
          acc[routeKey].vendorRates[item.vehicle_type][item.vendor_name] = item.rate;
          
          return acc;
        }, {});
        
        console.log('Processed data:', data);
        
        // Extract unique routes and vehicle types
        const allRoutes = [];
        const allVehicleTypes = new Set();
        const ratesData = {};

        Object.keys(data).forEach(routeKey => {
          const [origin, destination] = routeKey.split('-');
          const routeInfo = { 
            id: routeKey, 
            origin, 
            destination,
            display: `${origin} to ${destination}`
          };
          allRoutes.push(routeInfo);
          
          // Collect vehicle types and structure rates by vendor
          const vendorsForRoute = data[routeKey].vendorRates || {};
          Object.keys(vendorsForRoute).forEach(vehicleType => {
            allVehicleTypes.add(vehicleType);
            
            // For each vendor in our list, structure the data
            vendorsList.forEach(vendor => {
              const rate = vendorsForRoute[vehicleType][vendor] || null;
              
              // Structure by vendor > route > vehicleType
              if (!ratesData[vendor]) ratesData[vendor] = {};
              if (!ratesData[vendor][routeKey]) ratesData[vendor][routeKey] = {};
              if (rate !== null) {
                ratesData[vendor][routeKey][vehicleType] = rate;
              }
            });
          });
        });
        
        console.log('Vehicle types:', Array.from(allVehicleTypes));
        console.log('Routes:', allRoutes.length);
        console.log('Rates data structured by vendor:', ratesData);
        
        setRoutes(allRoutes);
        setVehicleTypes(Array.from(allVehicleTypes));
        setVendorRates(ratesData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load vendor rates. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get vehicle icon and color based on type
  const getVehicleDisplay = (vehicleType) => {
    const type = vehicleType.toLowerCase();
    if (type.includes('truck')) {
      return { 
        icon: <LocalShippingIcon />, 
        color: '#2196f3' // Blue for trucks
      };
    } else if (type.includes('van')) {
      return {
        icon: <AirportShuttleIcon />,
        color: '#ff9800' // Orange for vans
      };
    } else if (type.includes('bike')) {
      return {
        icon: <TwoWheelerIcon />,
        color: '#9c27b0' // Purple for bikes
      };
    }
    // Default for car and others
    return { 
      icon: <DirectionsCarIcon />, 
      color: '#4caf50' // Green for cars
    };
  };

  // Process data for the selected vendor
  useEffect(() => {
    console.log('Processing data for vendor:', selectedVendor);
    
    if (!selectedVendor || !vendorRates[selectedVendor]) {
      console.log('No vendor selected or no rates data for vendor');
      setRateData(null);
      return;
    }

    const vendorData = vendorRates[selectedVendor];
    
    // Group routes by origin for sorting
    const routesByOrigin = {};
    
    routes.forEach(route => {
      const routeId = route.id;
      
      // Only process if we have data for this route
      if (vendorData[routeId]) {
        if (!routesByOrigin[route.origin]) {
          routesByOrigin[route.origin] = [];
        }
        
        const routeVehicles = [];
        
        vehicleTypes.forEach(vehicleType => {
          // Skip if filtering by vehicle type
          if (selectedVehicleType !== 'all' && selectedVehicleType !== vehicleType) {
            return;
          }
          
          const vendorRate = vendorData[routeId][vehicleType];
          if (vendorRate === undefined) return; // Skip if no rate for this vehicle type
          
          // Calculate comparison metrics
          const allVendorRates = [];
          let lowestRate = Infinity;
          let highestRate = 0;
          let lowestVendor = '';
          let highestVendor = '';
          
          vendors.forEach(v => {
            const rate = vendorRates[v]?.[route.id]?.[vehicleType];
            if (rate !== undefined) {
              allVendorRates.push(rate);
              
              if (rate < lowestRate) {
                lowestRate = rate;
                lowestVendor = v;
              }
              
              if (rate > highestRate) {
                highestRate = rate;
                highestVendor = v;
              }
            }
          });
          
          const avgRate = allVendorRates.reduce((sum, r) => sum + r, 0) / allVendorRates.length;
          const percentDiffFromAvg = ((vendorRate - avgRate) / avgRate * 100).toFixed(1);
          
          // Determine comparison status
          let comparison;
          if (vendorRate === lowestRate) {
            comparison = 'lowest';
          } else if (vendorRate === highestRate) {
            comparison = 'highest';
          } else if (vendorRate < avgRate) {
            comparison = 'lower';
          } else if (vendorRate > avgRate) {
            comparison = 'higher';
          } else {
            comparison = 'average';
          }
          
          // Calculate savings or premium percentage
          let savingsPercent = null;
          let premiumPercent = null;
          
          if (vendorRate < highestRate) {
            savingsPercent = ((highestRate - vendorRate) / highestRate * 100).toFixed(1);
          }
          
          if (vendorRate > lowestRate) {
            premiumPercent = ((vendorRate - lowestRate) / lowestRate * 100).toFixed(1);
          }
          
          routeVehicles.push({
            vehicleType,
            rate: vendorRate,
            avgRate,
            lowestRate,
            highestRate,
            lowestVendor,
            highestVendor,
            percentDiffFromAvg,
            comparison,
            savingsPercent,
            premiumPercent
          });
        });
        
        if (routeVehicles.length > 0) {
          routesByOrigin[route.origin].push({
            ...route,
            vehicles: routeVehicles
          });
        }
      }
    });
    
    // Flatten and sort routes by origin
    const processedRoutes = [];
    
    // Sort origins alphabetically
    Object.keys(routesByOrigin).sort().forEach(origin => {
      // Add all routes for this origin
      processedRoutes.push(...routesByOrigin[origin]);
    });
    
    setRateData({
      vendor: selectedVendor,
      routes: processedRoutes
    });
    
    // Initialize filtered routes with all routes
    setFilteredRoutes(processedRoutes);
  }, [selectedVendor, vendorRates, routes, vehicleTypes, selectedVehicleType, vendors]);
  
  // Reset filters
  const handleResetFilters = () => {
    setSelectedVehicleType('all');
    setSearchQuery('');
    if (rateData && rateData.routes) {
      setFilteredRoutes(rateData.routes);
    }
  };

  // Handle route search
  const handleRouteSearch = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (rateData && rateData.routes) {
      if (!query) {
        // If no search query, show all routes
        setFilteredRoutes(rateData.routes);
      } else {
        // Filter routes by origin or destination containing the search query
        const filtered = rateData.routes.filter(route => 
          route.origin.toLowerCase().includes(query) || 
          route.destination.toLowerCase().includes(query)
        );
        setFilteredRoutes(filtered);
      }
    }
  };

  // Retry loading data
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchData();
  };
  
  
  // Toggle graph visibility
  const handleToggleGraph = () => {
    setShowGraph(!showGraph);
  };
  
  // Handle vendor selection
  const handleVendorSelect = (event, newValue) => {
    console.log('Selected vendor:', newValue);
    setSelectedVendor(newValue);
  };

  return (
    <Box sx={{ pt: 2, pb: 6 }}>
      <Fade in={true} style={{ transitionDelay: '150ms' }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              mb: 1,
              fontWeight: 700,
              color: theme.palette.primary.main,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
            }}
          >
            Vendor Rate Analysis
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              mb: 3,
              color: 'text.secondary',
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            Select a vendor to analyze their rates across all routes
          </Typography>
          
          <GradientCard sx={{ mt: 3, mb: 4 }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                {/* Vendor Selection */}
                <Grid item xs={12} md={9}>
                  <Autocomplete
                    id="vendor-selector"
                    options={vendors || []}
                    value={selectedVendor}
                    onChange={handleVendorSelect}
                    getOptionLabel={(option) => option || ''}
                    isOptionEqualToValue={(option, value) => option === value}
                    noOptionsText="No vendors available"
                    loadingText="Loading vendors..."
                    loading={loading}
                    sx={{
                      width: '100%',
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderWidth: '2px', // Optional: thicker border
                          borderColor: 'gray', // Optional: custom color
                        },
                      },
                    }}
                    ListboxProps={{
                      style: {
                        maxHeight: '300px', // Increased height from default ~224px
                        width: '500px', // Increased width to better accommodate long vendor names
                        padding: '8px 0'
                      }
                    }}
                    PopperComponent={CustomPopper}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth

                        label="Select Vendor"
                        sx={{ width: '100%' }}
                        placeholder="Start typing to search vendors..."
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {loading ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Route Search */}
                {!loading && !error && rateData && (
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      id="route-search"
                      label="Search Routes"
                      placeholder="Search by origin or destination..."
                      onChange={handleRouteSearch}
                      InputProps={{
                        startAdornment: (
                          <SearchIcon color="primary" sx={{ mr: 1 }} />
                        ),
                      }}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                )}
                
                {/* Vehicle Type Filter */}
                <Grid item xs={12} md={6}>
                  {rateData && (
                    <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
                      <FormControl variant="outlined" size="small" sx={{ width: 150 }}>
                        <InputLabel>Filter by Vehicle</InputLabel>
                        <Select
                          value={selectedVehicleType}
                          onChange={(e) => setSelectedVehicleType(e.target.value)}
                          label="Filter by Vehicle"
                        >
                          <MenuItem value="all">All Vehicles</MenuItem>
                          {vehicleTypes.map(type => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton 
                        onClick={handleResetFilters}
                        color="primary"
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Box>
                  )}
                </Grid>
                
                {/* Reset Filters Button */}
                <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
                  <IconButton 
                    color="primary" 
                    onClick={handleResetFilters}
                    sx={{ 
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                      borderRadius: '8px',
                      p: 1
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </CardContent>
          </GradientCard>
          
          {/* Error Message */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3, boxShadow: theme.shadows[1], borderRadius: 2 }}
              action={
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleRetry}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              }
            >
              {error}
            </Alert>
          )}
          
          {/* Loading Skeleton */}
          {loading && (
            <GradientCard sx={{ mt: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Skeleton variant="circular" width={56} height={56} sx={{ mr: 2 }} />
                  <Box>
                    <Skeleton variant="text" width={180} height={40} />
                    <Skeleton variant="text" width={120} height={24} />
                  </Box>
                </Box>
                
                <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: theme.shadows[2] }}>
                  <Table>
                    <StyledTableHead>
                      <TableRow>
                        <TableCell>Route</TableCell>
                        <TableCell>Vehicle Type</TableCell>
                        <TableCell>Vendor Rate</TableCell>
                        <TableCell>Market Comparison</TableCell>
                        <TableCell>Savings/Premium</TableCell>
                      </TableRow>
                    </StyledTableHead>
                    <TableBody>
                      {renderSkeletons()}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </GradientCard>
          )}
          
          {/* Vendor Rate Analysis Results */}
          {!loading && !error && rateData && (
            <Fade in={true} style={{ transitionDelay: '150ms' }}>
              <GradientCard sx={{ mt: 2 }}>
                <CardContent>
                  {/* Vendor Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <VendorAvatar>
                      <BusinessIcon fontSize="large" />
                    </VendorAvatar>
                    <Box>
                      <Typography variant="h5" fontWeight={700}>
                        {rateData.vendor}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Showing rates for {rateData.routes.length} routes
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 3 }} />
                  
                  {/* Graph Visualization - temporarily disabled due to dependencies */}
                  {showGraph && (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: theme.palette.primary.main }}>
                        Route Network Visualization
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        To enable the graph visualization, please install the required dependency:
                        <br />
                        <code>npm install --save react-force-graph-2d</code>
                      </Typography>
                      
                      <Paper 
                        elevation={2} 
                        sx={{ 
                          height: 300, 
                          borderRadius: theme.shape.borderRadius * 2,
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette.primary.main, 0.03)
                        }}
                      >
                        <Box sx={{ textAlign: 'center', p: 3 }}>
                          <CompareIcon sx={{ fontSize: 60, color: alpha(theme.palette.primary.main, 0.3), mb: 2 }} />
                          <Typography variant="h6">
                            Graph Visualization Unavailable
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            The required dependencies need to be installed to display the interactive route graph.
                          </Typography>
                        </Box>
                      </Paper>
                    </Box>
                  )}
                  
                  <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: theme.shadows[2] }}>
                    <Table>
                      <StyledTableHead>
                        <TableRow>
                          <TableCell>Route</TableCell>
                          <TableCell>Vehicle Type</TableCell>
                          <TableCell>Vendor Rate</TableCell>
                          <TableCell>Lowest Rate</TableCell>
                          <TableCell>Market Comparison</TableCell>
                        </TableRow>
                      </StyledTableHead>
                      <TableBody>
                        {rateData.routes.length > 0 ? (
                          rateData.routes.flatMap((route) =>
                            route.vehicles.map((vehicleData, vIndex) => (
                              <StyledTableRow key={`${route.id}-${vehicleData.vehicleType}`}>
                                {/* Route Column */}
                                {vIndex === 0 && (
                                  <TableCell 
                                    rowSpan={route.vehicles.length}
                                    sx={{ 
                                      borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                      minWidth: 150 
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <LocationOnIcon 
                                        color="primary" 
                                        fontSize="small" 
                                        sx={{ mr: 1 }} 
                                      />
                                      <Typography fontWeight={500}>
                                        {route.origin} <ArrowDownwardIcon fontSize="small" sx={{ mx: 0.5, color: theme.palette.primary.main }} /> {route.destination}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                )}
                                
                                {/* Vehicle Type Column */}
                                <TableCell sx={{ minWidth: 120 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <VehicleAvatar sx={{ bgcolor: getVehicleDisplay(vehicleData.vehicleType).color }}>
                                      {getVehicleDisplay(vehicleData.vehicleType).icon}
                                    </VehicleAvatar>
                                    <Typography fontWeight={500} sx={{ color: getVehicleDisplay(vehicleData.vehicleType).color }}>
                                      {vehicleData.vehicleType}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                
                                {/* Vendor Rate Column */}
                                <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>
                                  <Typography 
                                    variant="h6" 
                                    color={vehicleData.rate <= vehicleData.lowestRate ? "success.main" : "error.main"}
                                  >
                                    ₹{vehicleData.rate.toLocaleString()}
                                  </Typography>
                                  
                                  {vehicleData.rate > vehicleData.lowestRate && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                      <ArrowUpwardIcon color="error" fontSize="small" sx={{ mr: 0.5 }} />
                                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 500 }}>
                                        ₹{(vehicleData.rate - vehicleData.lowestRate).toLocaleString()}
                                      </Typography>
                                    </Box>
                                  )}
                                </TableCell>
                                
                                {/* Market Comparison Column */}
                                <TableCell>
                                  <ComparisonChip
                                    label={comparisonIndicators[vehicleData.comparison].label}
                                    icon={comparisonIndicators[vehicleData.comparison].icon}
                                    comparison={vehicleData.comparison}
                                  />
                                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                    {vehicleData.percentDiffFromAvg > 0 ? '+' : ''}{vehicleData.percentDiffFromAvg}% from avg
                                  </Typography>
                                </TableCell>
                                
                                {/* Lowest Rate Column */}
                                <TableCell>
                                  <Typography variant="h6" color={vehicleData.lowestVendor === rateData.vendor ? "success.main" : "text.primary"}>
                                    ₹{vehicleData.lowestRate.toLocaleString()}
                                  </Typography>
                                  
                                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                    <BusinessIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                                    <Tooltip title={`Lowest rate offered by ${vehicleData.lowestVendor}`}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                        {vehicleData.lowestVendor}
                                        {vehicleData.lowestVendor === rateData.vendor && 
                                          <Chip 
                                            size="small"
                                            label="BEST"
                                            color="success"
                                            sx={{ ml: 1, height: 16, fontSize: '0.6rem', fontWeight: 'bold' }}
                                          />
                                        }
                                      </Typography>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                              </StyledTableRow>
                            ))
                          )
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                              <Typography color="text.secondary">
                                No rates available for the selected vendor and filters
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </GradientCard>
            </Fade>
          )}
          
          {/* Empty State */}
          {!loading && !error && !rateData && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              mt: 4,
              p: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.02),
              borderRadius: 2
            }}>
              <CompareIcon sx={{ fontSize: 60, color: alpha(theme.palette.primary.main, 0.3), mb: 2 }} />
              <Typography variant="h6" align="center" gutterBottom>
                Select a Vendor to Begin
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary">
                Choose a vendor from the dropdown above to analyze their rates
              </Typography>
            </Box>
          )}
        </Box>
      </Fade>
    </Box>
  );
}

export default SingleVendorAnalysis;
