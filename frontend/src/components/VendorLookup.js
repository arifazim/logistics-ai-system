import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Avatar, Pagination, CircularProgress, Alert, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Grid, Divider, Skeleton,
  Tooltip, IconButton, Checkbox, ListItemText, OutlinedInput, Fade,
  useMediaQuery, alpha
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CompareIcon from '@mui/icons-material/Compare';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { getVendorRates } from '../services/api';

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

const AnimatedButton = styled(Button)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.common.white, 0.2)}, transparent)`,
    transition: 'all 0.5s ease',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
    '&:before': {
      left: '100%',
    },
  },
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

const StyledChip = styled(Chip)(({ theme, priceTag }) => ({
  fontWeight: 600,
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: theme.shadows[2],
  },
  ...(priceTag === 'low' && {
    backgroundColor: alpha(theme.palette.success.main, 0.1),
    color: theme.palette.success.dark,
    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
    '& .MuiChip-icon': { color: theme.palette.success.dark }
  }),
  ...(priceTag === 'mid' && {
    backgroundColor: alpha(theme.palette.warning.main, 0.1),
    color: theme.palette.warning.dark,
    border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
    '& .MuiChip-icon': { color: theme.palette.warning.dark }
  }),
  ...(priceTag === 'high' && {
    backgroundColor: alpha(theme.palette.error.main, 0.1),
    color: theme.palette.error.dark,
    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
    '& .MuiChip-icon': { color: theme.palette.error.dark }
  }),
}));

const VehicleAvatar = styled(Avatar)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  width: 32,
  height: 32,
  marginRight: theme.spacing(1),
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.1)',
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
  }
}));

// No API URL configuration needed - using the API service

const VendorLookup = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Data state
  const [allVendorRates, setAllVendorRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selection state
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'vehicle', direction: 'asc' });
  const [animateResults, setAnimateResults] = useState(false);
  
  const ITEMS_PER_PAGE = 15;

  // Helper for loading skeletons
  const renderSkeletons = () => (
    <Box sx={{ mt: 4 }}>
      <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: theme.shape.borderRadius * 2 }} />
      <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: theme.shape.borderRadius * 2 }} />
      <Skeleton variant="rectangular" height={300} sx={{ mb: 2, borderRadius: theme.shape.borderRadius * 2 }} />
      <Skeleton variant="rectangular" height={40} sx={{ width: '50%', mx: 'auto', borderRadius: theme.shape.borderRadius * 2 }} />
    </Box>
  );

  // Fetch data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Extract unique routes, vehicles, and vendors
  const { uniqueRoutes, uniqueVehicles, uniqueVendors, vendorsByRoute } = useMemo(() => {
    const routes = new Set();
    const vehicles = new Set();
    const vendors = new Set();
    const vendorsByRoute = {};
    
    // Process all vendor rates to extract routes and vendors
    allVendorRates.forEach(rate => {
      // Ensure we have valid origin and destination
      if (rate.from_origin && rate.area && 
          typeof rate.from_origin === 'string' && 
          typeof rate.area === 'string' && 
          rate.from_origin.trim() !== '' && 
          rate.area.trim() !== '' && 
          rate.from_origin !== 'undefined' && 
          rate.area !== 'undefined') {
        
        const routeKey = `${rate.from_origin} → ${rate.area}`;
        routes.add(routeKey);
        
        if (rate.vehicle_type && typeof rate.vehicle_type === 'string' && rate.vehicle_type.trim() !== '') {
          vehicles.add(rate.vehicle_type);
        }
        
        if (rate.vendor_name && typeof rate.vendor_name === 'string' && rate.vendor_name.trim() !== '') {
          vendors.add(rate.vendor_name);
          
          // Group vendors by route
          if (!vendorsByRoute[routeKey]) {
            vendorsByRoute[routeKey] = new Set();
          }
          vendorsByRoute[routeKey].add(rate.vendor_name);
        }
      }
    });
    
    console.log('Routes found:', Array.from(routes));
    console.log('Vendors by route:', Object.fromEntries(
      Object.entries(vendorsByRoute).map(([route, vendorSet]) => [route, Array.from(vendorSet)])
    ));
    
    return {
      uniqueRoutes: Array.from(routes).sort(),
      uniqueVehicles: Array.from(vehicles).sort(),
      uniqueVendors: Array.from(vendors).sort(),
      vendorsByRoute
    };
  }, [allVendorRates]);

  // Get vendors for selected route
  const vendorsForSelectedRoute = useMemo(() => {
    if (!selectedOrigin || !vendorsByRoute[`${selectedOrigin} → ${selectedArea}`]) return [];
    return Array.from(vendorsByRoute[`${selectedOrigin} → ${selectedArea}`]).sort();
  }, [selectedOrigin, selectedArea, vendorsByRoute]);

  // Unique From-Origins
  const origins = useMemo(() => {
    return [...new Set(allVendorRates.map(r => r.from_origin).filter(Boolean))].sort();
  }, [allVendorRates]);

  // Areas filtered by selectedOrigin
  const areas = useMemo(() => {
    if (!selectedOrigin) return [];
    return [...new Set(allVendorRates.filter(r => r.from_origin === selectedOrigin).map(r => r.area).filter(Boolean))].sort();
  }, [allVendorRates, selectedOrigin]);

  // Vendors filtered by selectedOrigin and selectedArea
  const vendors = useMemo(() => {
    if (!selectedOrigin || !selectedArea) return [];
    return [...new Set(allVendorRates.filter(r => r.from_origin === selectedOrigin && r.area === selectedArea).map(r => r.vendor_name).filter(Boolean))].sort();
  }, [allVendorRates, selectedOrigin, selectedArea]);

  // Filtered data for matrix display
  const filteredData = useMemo(() => {
    if (!selectedOrigin || !selectedArea) return [];
    return allVendorRates.filter(r => r.from_origin === selectedOrigin && r.area === selectedArea && (vehicleFilter === 'all' || r.vehicle_type === vehicleFilter) && (!selectedVendor || r.vendor_name === selectedVendor));
  }, [allVendorRates, selectedOrigin, selectedArea, vehicleFilter, selectedVendor]);

  // Process data for matrix display (vehicle types in rows, vendors in columns)
  const processedData = useMemo(() => {
    // Show all vendors for the selected route, even if none are explicitly selected
    if (!filteredData.length) return { vehicles: [], vendorRates: {} };
    
    // Get all vehicle types for the selected route
    const vehicleTypes = [...new Set(filteredData
      .filter(rate => rate.vehicle_type)
      .map(rate => rate.vehicle_type))].sort();
    
    // Create a mapping of vendor rates by vehicle type
    const vendorRatesByVehicle = {};
    
    vehicleTypes.forEach(vehicle => {
      vendorRatesByVehicle[vehicle] = {};
      
      vendorsForSelectedRoute.forEach(vendor => {
        // Find the rate for this vendor and vehicle type
        const rateEntry = filteredData.find(rate => 
          rate.vendor_name === vendor && rate.vehicle_type === vehicle
        );
        
        vendorRatesByVehicle[vehicle][vendor] = rateEntry ? rateEntry.rate : null;
      });
    });
    
    return {
      vehicles: vehicleTypes,
      vendorRates: vendorRatesByVehicle
    };
  }, [filteredData, vendorsForSelectedRoute]);

  // No need for pagination with simplified view
  const totalPages = 1;

  // Reset filters
  const handleResetFilters = () => {
    setVehicleFilter('all');
    setSelectedVendor('');
    setSortConfig({ key: 'vehicle', direction: 'asc' });
    setCurrentPage(1);
  };

  // Price tag colors for consistent styling
  const priceTagColors = {
    low: {
      color: theme.palette.success.dark,
      bgColor: theme.palette.success.main
    },
    mid: {
      color: theme.palette.warning.dark,
      bgColor: theme.palette.warning.main
    },
    high: {
      color: theme.palette.error.dark,
      bgColor: theme.palette.error.main
    }
  };

  // Get price tag (low, mid, high) based on rate comparison
  const getPriceTag = (rate, vendors, vehicleType, ratesByVehicle) => {
    if (!rate) return 'mid';
    
    // Get all rates for this vehicle type
    const rates = [];
    vendors.forEach(vendor => {
      const vendorRate = ratesByVehicle[vehicleType]?.[vendor];
      if (vendorRate) rates.push(vendorRate);
    });
    
    if (rates.length <= 1) return 'mid';
    
    // Sort rates from low to high
    rates.sort((a, b) => a - b);
    
    // Determine if this is the lowest, highest, or in between
    if (rate === rates[0]) return 'low';
    if (rate === rates[rates.length - 1]) return 'high';
    return 'mid';
  };
  
  // Get price tag color
  const getPriceTagColor = (priceTag) => {
    switch (priceTag) {
      case 'low':
        return theme.palette.success.main;
      case 'mid':
        return theme.palette.warning.main;
      case 'high':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };
  
  // Get price tag icon
  const getPriceTagIcon = (priceTag) => {
    switch (priceTag) {
      case 'low':
        return <TrendingDownIcon />;
      case 'mid':
        return <RemoveIcon />;
      case 'high':
        return <TrendingUpIcon />;
      default:
        return <RemoveIcon />;
    }
  };
  
  // Get vehicle icon
  const getVehicleIcon = (vehicleType) => {
    if (vehicleType?.toLowerCase().includes('truck')) {
      return <LocalShippingIcon />;
    }
    return <DirectionsCarIcon />;
  };

  // Function to load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the API service to get vendor rates
      const response = await getVendorRates();
      
      if (response && response.success && Array.isArray(response.rates)) {
        console.log(`Loaded ${response.rates.length} vendor rates`);
        setAllVendorRates(response.rates);
      } else {
        console.error('Invalid response format:', response);
        const errorMsg = response?.error || 'Failed to load vendor rates - invalid data format';
        const detailMsg = response?.details ? `\n\nDetails: ${response.details}` : '';
        
        setError(`${errorMsg}\n\nPlease try again later or contact support if the issue persists.`);
        
        // Set empty data to prevent UI errors
        setAllVendorRates([]);
      }
    } catch (err) {
      console.error('Error in loadData:', err);
      setError(`Error loading data: ${err.message}. Please check your network connection and try again.`);
      setAllVendorRates([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to retry data loading
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    loadData();
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Typography 
          variant="h4" 
          fontWeight={800} 
          mb={1} 
          align="center" 
          color="primary"
          sx={{
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.25px',
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
          }}
        >
          Route by Vendors
        </Typography>
        <Typography 
          variant="subtitle1" 
          align="center" 
          color="text.secondary" 
          mb={4}
          sx={{ maxWidth: '600px', mx: 'auto' }}
        >
          Loading vendor rates...
        </Typography>
        {renderSkeletons()}
      </Box>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Typography 
          variant="h4" 
          fontWeight={800} 
          mb={1} 
          align="center" 
          color="primary"
          sx={{
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.25px',
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
          }}
        >
          Route by Vendors
        </Typography>
        
        <GradientCard sx={{ mt: 3, mb: 4 }}>
          <CardContent>
            <Typography variant="h5" component="h2" sx={{ 
              mb: 2, 
              color: theme.palette.error.main,
              fontWeight: 600 
            }}>
              Unable to Load Vendor Rates
            </Typography>
            
            <Alert severity="error" sx={{ 
              mb: 3,
              borderRadius: theme.shape.borderRadius * 2,
              '& .MuiAlert-icon': { alignItems: 'center' }
            }}>
              {error}
            </Alert>
            
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <AnimatedButton
                variant="contained"
                color="primary"
                onClick={handleRetry}
                startIcon={<RefreshIcon />}
                sx={{ mt: 2 }}
              >
                Retry
              </AnimatedButton>
            </Box>
          </CardContent>
        </GradientCard>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Fade in={true} timeout={800}>
        <Box>
          <Typography 
            variant="h4" 
            fontWeight={800} 
            mb={1} 
            align="center" 
            color="primary"
            sx={{
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.25px',
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
            }}
          >
            Route by Vendors
          </Typography>
          <Typography 
            variant="subtitle1" 
            align="center" 
            color="text.secondary" 
            mb={4}
            sx={{ maxWidth: '600px', mx: 'auto' }}
          >
            Compare vendor rates across different routes and vehicle types
          </Typography>
          
          {/* Dependent Selects: From-Origin, Area, Vendor */}
          <GradientCard sx={{ mb: 3, overflow: 'hidden' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
                {/* From-Origin Select */}
                <FormControl fullWidth>
                  <InputLabel>From-Origin</InputLabel>
                  <Select
                    value={selectedOrigin}
                    onChange={e => {
                      setSelectedOrigin(e.target.value);
                      setSelectedArea('');
                      setSelectedVendor('');
                    }}
                    label="From-Origin"
                  >
                    <MenuItem value="">Select Origin</MenuItem>
                    {origins.map(origin => (
                      <MenuItem key={origin} value={origin}>{origin}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {/* Area Select */}
                <FormControl fullWidth disabled={!selectedOrigin}>
                  <InputLabel>Area</InputLabel>
                  <Select
                    value={selectedArea}
                    onChange={e => {
                      setSelectedArea(e.target.value);
                      setSelectedVendor('');
                    }}
                    label="Area"
                  >
                    <MenuItem value="">Select Area</MenuItem>
                    {areas.map(area => (
                      <MenuItem key={area} value={area}>{area}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {/* Vendor Select */}
                <FormControl fullWidth disabled={!selectedArea}>
                  <InputLabel>Vendor</InputLabel>
                  <Select
                    value={selectedVendor}
                    onChange={e => setSelectedVendor(e.target.value)}
                    label="Vendor"
                  >
                    <MenuItem value="">All Vendors</MenuItem>
                    {vendors.map(vendor => (
                      <MenuItem key={vendor} value={vendor}>{vendor}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </GradientCard>
          
          {/* Filters and Reset */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            mb: 2,
            flexWrap: 'wrap',
            gap: 1
          }}>
            <AnimatedButton
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              variant="outlined"
              color="primary"
              size="small"
              sx={{ borderRadius: 2 }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </AnimatedButton>
            
            <AnimatedButton
              startIcon={<CloseIcon />}
              onClick={handleResetFilters}
              variant="outlined"
              color="secondary"
              size="small"
              sx={{ borderRadius: 2 }}
            >
              Reset All
            </AnimatedButton>
          </Box>
          
          {/* Additional Filters */}
          {showFilters && (
            <Fade in={showFilters} timeout={500}>
              <GradientCard sx={{ mb: 3, overflow: 'hidden' }}>
                <CardContent sx={{ p: { xs: 2, sm: 2 } }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Vehicle Type</InputLabel>
                        <Select
                          value={vehicleFilter}
                          onChange={(e) => setVehicleFilter(e.target.value)}
                          label="Vehicle Type"
                          startAdornment={
                            <InputAdornment position="start">
                              <LocalShippingIcon color="primary" />
                            </InputAdornment>
                          }
                          sx={{ 
                            borderRadius: 2,
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.light,
                            },
                          }}
                        >
                          <MenuItem value="all">All Vehicle Types</MenuItem>
                          {uniqueVehicles.map(vehicle => (
                            <MenuItem key={vehicle} value={vehicle}>{vehicle}</MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          {vehicleFilter === 'all' 
                            ? 'Showing all vehicle types' 
                            : `Filtered to ${vehicleFilter} only`}
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </GradientCard>
            </Fade>
          )}
          
          {/* Price Tag Legend */}
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1.5, 
            mb: 3,
            justifyContent: isMobile ? 'center' : 'flex-start',
            alignItems: 'center'
          }}>
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
              Price Tags:
            </Typography>
            <StyledChip 
              icon={<TrendingDownIcon />} 
              label="Lowest Price" 
              size="small" 
              priceTag="low"
            />
            <StyledChip 
              icon={<RemoveIcon />} 
              label="Mid Price" 
              size="small" 
              priceTag="mid"
            />
            <StyledChip 
              icon={<TrendingUpIcon />} 
              label="Highest Price" 
              size="small" 
              priceTag="high"
            />
          </Box>
          
          {/* Matrix Display - Vehicle Types in Rows, Vendors in Columns */}
          {selectedOrigin && selectedArea ? (
            <Fade in={true} timeout={800}>
              <GradientCard sx={{ mt: 3, overflow: 'hidden' }}>
                <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 2,
                    px: { xs: 1, sm: 2 },
                    flexWrap: 'wrap',
                    gap: 2
                  }}>
                    <Typography variant="h6" fontWeight={600}>
                      Rate Comparison for {selectedOrigin} → {selectedArea}
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      flexWrap: 'wrap'
                    }}>
                      <Chip 
                        icon={<LocalOfferIcon />} 
                        label="Low Rate" 
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          color: theme.palette.success.dark,
                          fontWeight: 500
                        }}
                      />
                      <Chip 
                        icon={<LocalOfferIcon />} 
                        label="Mid Rate" 
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          color: theme.palette.warning.dark,
                          fontWeight: 500
                        }}
                      />
                      <Chip 
                        icon={<LocalOfferIcon />} 
                        label="High Rate" 
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                          color: theme.palette.error.dark,
                          fontWeight: 500
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <TableContainer component={Paper} sx={{ 
                    boxShadow: 'none', 
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderRadius: 2,
                    overflow: 'auto'
                  }}>
                    <Table sx={{ minWidth: 650 }} aria-label="vendor rates table">
                      <TableHead>
                        <TableRow sx={{ 
                          bgcolor: alpha(theme.palette.primary.main, 0.03),
                          '& th': { fontWeight: 600 }
                        }}>
                          <TableCell>Vehicle Type</TableCell>
                          <TableCell>Best Rate</TableCell>
                          {vendorsForSelectedRoute.map(vendor => (
                            <TableCell key={vendor} align="right">{vendor}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {processedData.vehicles.length > 0 ? (
                          processedData.vehicles.map(vehicle => {
                            // Compute best (lowest) and highest rate for this vehicle type
                            const rates = vendorsForSelectedRoute.map(vendor => processedData.vendorRates[vehicle]?.[vendor]).filter(r => typeof r === 'number');
                            const minRate = rates.length ? Math.min(...rates) : null;
                            const maxRate = rates.length ? Math.max(...rates) : null;
                            
                            // Find the vendor with the minimum rate
                            const minRateVendor = minRate !== null 
                              ? vendorsForSelectedRoute.find(vendor => processedData.vendorRates[vehicle]?.[vendor] === minRate)
                              : null;
                            
                            const percentSavings = (minRate !== null && maxRate && maxRate > 0 && minRate !== maxRate)
                              ? (((maxRate - minRate) / maxRate) * 100).toFixed(1)
                              : null;
                            return (
                              <TableRow key={vehicle} sx={{ 
                                '&:nth-of-type(odd)': { bgcolor: alpha(theme.palette.primary.main, 0.01) },
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                transition: 'background-color 0.2s'
                              }}>
                                <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                                  {vehicle}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    bgcolor: minRate !== null ? '#ffb74d' : 'transparent', // orange
                                    color: minRate !== null ? '#1b5e20' : 'inherit', // dark green
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    textAlign: 'center',
                                    borderRight: '2px solid ' + alpha(theme.palette.primary.main, 0.08)
                                  }}
                                >
                                  {minRate !== null ? (
                                    <>
                                      ₹{minRate.toLocaleString()} {percentSavings && minRateVendor ? <span style={{ fontWeight: 600, fontSize: '0.95em' }}>(+{percentSavings}% by {minRateVendor})</span> : null}
                                    </>
                                  ) : 'N/A'}
                                </TableCell>
                                {vendorsForSelectedRoute.map(vendor => {
                                  const rate = processedData.vendorRates[vehicle]?.[vendor];
                                  const priceTag = getPriceTag(rate, vendorsForSelectedRoute, vehicle, processedData.vendorRates);
                                  return (
                                    <TableCell 
                                      key={`${vehicle}-${vendor}`} 
                                      align="right"
                                      sx={{
                                        fontWeight: 500,
                                        color: rate ? priceTagColors[priceTag].color : 'text.disabled',
                                        bgcolor: rate ? alpha(priceTagColors[priceTag].bgColor, 0.1) : 'transparent'
                                      }}
                                    >
                                      {rate ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                          <LocalOfferIcon sx={{ fontSize: '0.9rem', color: priceTagColors[priceTag].color }} />
                                          ₹{rate.toLocaleString()}
                                        </Box>
                                      ) : 'N/A'}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={vendorsForSelectedRoute.length + 2} align="center" sx={{ py: 3 }}>
                              <Typography color="text.secondary">
                                No data available for the selected filters
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
          ) : !loading && !error ? (
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
                Select a Route to Begin
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary">
                Choose a route from the dropdown above to view vendor rates
              </Typography>
            </Box>
          ) : null}
        </Box>
      </Fade>
    </Box>
  );
};

export default VendorLookup;
