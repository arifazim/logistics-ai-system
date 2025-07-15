import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, InputAdornment, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Avatar, Pagination, CircularProgress, Alert, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Grid, Divider,
  Tooltip, IconButton, Checkbox, ListItemText, OutlinedInput
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';

// API URL configuration for both development and production environments
const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
console.log(`Using API URL: ${API_URL}`);

// Function to fetch vendor rates from backend
const fetchVendorRates = async () => {
  try {
    console.log(`Fetching vendor rates from: ${API_URL}/vendor-rates`);
    const response = await axios.get(`${API_URL}/vendor-rates`, {
      timeout: 8000 // Add timeout to prevent hanging requests
    });
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching vendor rates:', error);
    return { success: false, rates: [], error: error.message };
  }
};

const VendorLookup = () => {
  const theme = useTheme();
  const [allVendorRates, setAllVendorRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'vehicle', direction: 'asc' });
  
  const ITEMS_PER_PAGE = 15;

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        const response = await fetchVendorRates();
        
        if (response && response.success && response.rates && Array.isArray(response.rates)) {
          console.log('Received vendor rates:', response.rates.length);
          setAllVendorRates(response.rates);
        } else if (response && response.rates && Array.isArray(response.rates)) {
          // Some APIs might not include a success flag but still return valid data
          console.log('Received vendor rates without success flag:', response.rates.length);
          setAllVendorRates(response.rates);
        } else {
          console.error('Invalid API response format:', response);
          setError('Failed to load vendor rates - invalid data format. Please try again later.');
        }
      } catch (err) {
        console.error('Error in loadData:', err);
        setError(`Error loading data: ${err.message}. Please check your network connection and try again.`);
      } finally {
        setLoading(false);
      }
    };
    
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
      if (rate.from_origin && rate.area && 
          rate.from_origin !== 'undefined' && rate.area !== 'undefined') {
        
        const routeKey = `${rate.from_origin} → ${rate.area}`;
        routes.add(routeKey);
        
        if (rate.vehicle_type) {
          vehicles.add(rate.vehicle_type);
        }
        
        if (rate.vendor_name) {
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
    if (!selectedRoute || !vendorsByRoute[selectedRoute]) return [];
    return Array.from(vendorsByRoute[selectedRoute]).sort();
  }, [selectedRoute, vendorsByRoute]);

  // Filter data by selected route
  const filteredData = useMemo(() => {
    if (!selectedRoute) return [];
    
    // Parse the selected route
    const [origin, destination] = selectedRoute.split(' → ');
    
    return allVendorRates.filter(rate => {
      // Match the selected route
      if (rate.from_origin !== origin) {
        return false;
      }
      
      // Check destination - using area field
      if (rate.area !== destination) {
        return false;
      }
      
      // Apply vehicle type filter
      if (vehicleFilter !== 'all' && rate.vehicle_type !== vehicleFilter) {
        return false;
      }
      
      return true;
    });
  }, [allVendorRates, selectedRoute, vehicleFilter]);

  // Process data for matrix display (vehicle types in rows, vendors in columns)
  const processedData = useMemo(() => {
    if (!filteredData.length || !selectedVendors.length) return { vehicles: [], vendorRates: {} };
    
    // Get all vehicle types for the selected route
    const vehicleTypes = [...new Set(filteredData
      .filter(rate => rate.vehicle_type) // Only include rates with vehicle type
      .map(rate => rate.vehicle_type))]
      .sort();
    
    // Create a map of vendor rates by vehicle type
    const vendorRates = {};
    const priceTagsByVehicle = {};
    
    // Initialize the structure
    vehicleTypes.forEach(vehicleType => {
      vendorRates[vehicleType] = {};
      priceTagsByVehicle[vehicleType] = {};
      
      selectedVendors.forEach(vendor => {
        vendorRates[vehicleType][vendor] = null;
      });
    });
    
    // Fill in the rates
    filteredData.forEach(rate => {
      if (rate.vehicle_type && selectedVendors.includes(rate.vendor_name)) {
        vendorRates[rate.vehicle_type][rate.vendor_name] = rate.rate;
      }
    });
    
    // Calculate price tags for each vehicle type
    vehicleTypes.forEach(vehicleType => {
      const rates = [];
      
      // Collect all rates for this vehicle type
      selectedVendors.forEach(vendor => {
        const rate = vendorRates[vehicleType][vendor];
        if (rate !== null) rates.push({ vendor, rate });
      });
      
      // Sort rates to determine price tags
      rates.sort((a, b) => a.rate - b.rate);
      
      if (rates.length === 1) {
        // Only one vendor has a rate for this vehicle type
        priceTagsByVehicle[vehicleType][rates[0].vendor] = 'single';
      } else if (rates.length > 1) {
        // Multiple vendors have rates for this vehicle type
        const minRate = rates[0].rate;
        const maxRate = rates[rates.length - 1].rate;
        
        rates.forEach(({ vendor, rate }) => {
          if (rate === minRate) {
            priceTagsByVehicle[vehicleType][vendor] = 'low';
          } else if (rate === maxRate) {
            priceTagsByVehicle[vehicleType][vendor] = 'high';
          } else {
            priceTagsByVehicle[vehicleType][vendor] = 'mid';
          }
        });
      }
    });
    
    // Create the final data structure
    const vehicles = vehicleTypes.map(vehicleType => {
      // Calculate stats for this vehicle type
      const rates = [];
      selectedVendors.forEach(vendor => {
        const rate = vendorRates[vehicleType][vendor];
        if (rate !== null) rates.push(rate);
      });
      
      const stats = rates.length ? {
        avgRate: Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length),
        minRate: Math.min(...rates),
        maxRate: Math.max(...rates),
        vendorCount: rates.length
      } : { avgRate: 0, minRate: 0, maxRate: 0, vendorCount: 0 };
      
      return {
        vehicleType,
        stats,
        vendorRates: vendorRates[vehicleType],
        priceTags: priceTagsByVehicle[vehicleType]
      };
    });
    
    // Sort vehicles based on sortConfig
    vehicles.sort((a, b) => {
      if (sortConfig.key === 'vehicle') {
        return sortConfig.direction === 'asc' 
          ? a.vehicleType.localeCompare(b.vehicleType)
          : b.vehicleType.localeCompare(a.vehicleType);
      } else if (sortConfig.key === 'rate') {
        return sortConfig.direction === 'asc'
          ? a.stats.avgRate - b.stats.avgRate
          : b.stats.avgRate - a.stats.avgRate;
      } else if (sortConfig.key === 'vendors') {
        return sortConfig.direction === 'asc'
          ? a.stats.vendorCount - b.stats.vendorCount
          : b.stats.vendorCount - a.stats.vendorCount;
      }
      return 0;
    });
    
    return { vehicles, vendorRates };
  }, [filteredData, selectedVendors, sortConfig]);

  // Calculate pagination
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedData.vehicles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [processedData.vehicles, currentPage]);

  const totalPages = Math.ceil(processedData.vehicles.length / ITEMS_PER_PAGE);

  // Handle route selection
  const handleRouteChange = (event) => {
    setSelectedRoute(event.target.value);
    setSelectedVendors([]);
    setCurrentPage(1);
  };

  // Handle vendor selection
  const handleVendorChange = (event) => {
    const value = event.target.value;
    setSelectedVendors(typeof value === 'string' ? value.split(',') : value);
  };

  // Reset filters
  const handleResetFilters = () => {
    setVehicleFilter('all');
    setSelectedVendors([]);
    setSortConfig({ key: 'vehicle', direction: 'asc' });
    setCurrentPage(1);
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
        return theme.palette.info.main;
    }
  };

  // Get price tag icon
  const getPriceTagIcon = (priceTag) => {
    switch (priceTag) {
      case 'low':
        return <TrendingDownIcon fontSize="small" />;
      case 'high':
        return <TrendingUpIcon fontSize="small" />;
      default:
        return <RemoveIcon fontSize="small" />;
    }
  };
  
  // Get vehicle icon
  const getVehicleIcon = (vehicleType) => {
    if (vehicleType.toLowerCase().includes('truck')) {
      return <LocalShippingIcon />;
    }
    return <DirectionsCarIcon />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Vendor Rate Lookup
      </Typography>
      
      {/* Route Selection */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Select Route</InputLabel>
          <Select
            value={selectedRoute}
            onChange={handleRouteChange}
            label="Select Route"
          >
            {uniqueRoutes.length > 0 ? (
              uniqueRoutes.map(route => (
                <MenuItem key={route} value={route}>{route}</MenuItem>
              ))
            ) : (
              <MenuItem disabled>No routes available</MenuItem>
            )}
          </Select>
        </FormControl>
      </Box>
      
      {/* Vendor Selection */}
      {selectedRoute && (
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="vendor-select-label">Select Vendors to Compare</InputLabel>
            <Select
              labelId="vendor-select-label"
              multiple
              value={selectedVendors}
              onChange={handleVendorChange}
              input={<OutlinedInput label="Select Vendors to Compare" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {vendorsForSelectedRoute && vendorsForSelectedRoute.length > 0 ? (
                vendorsForSelectedRoute.map((vendor) => (
                  <MenuItem key={vendor} value={vendor}>
                    <Checkbox checked={selectedVendors.indexOf(vendor) > -1} />
                    <ListItemText primary={vendor} />
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>
                  <ListItemText primary="No vendors available for this route" />
                </MenuItem>
              )}
            </Select>
          </FormControl>
        </Box>
      )}
      
      {/* Filters and Reset */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button
          startIcon={<FilterListIcon />}
          onClick={() => setShowFilters(!showFilters)}
          size="small"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
        
        <Button
          startIcon={<CloseIcon />}
          onClick={handleResetFilters}
          size="small"
        >
          Reset All
        </Button>
      </Box>
      
      {/* Additional Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Vehicle Type</InputLabel>
                <Select
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  label="Vehicle Type"
                >
                  <MenuItem value="all">All Vehicle Types</MenuItem>
                  {uniqueVehicles.map(vehicle => (
                    <MenuItem key={vehicle} value={vehicle}>{vehicle}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* Price Tag Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Typography variant="subtitle2">Price Tags:</Typography>
        <Chip 
          icon={<TrendingDownIcon />} 
          label="Lowest Price" 
          size="small" 
          sx={{ bgcolor: theme.palette.success.light, color: theme.palette.success.dark }}
        />
        <Chip 
          icon={<RemoveIcon />} 
          label="Mid Price" 
          size="small" 
          sx={{ bgcolor: theme.palette.warning.light, color: theme.palette.warning.dark }}
        />
        <Chip 
          icon={<TrendingUpIcon />} 
          label="Highest Price" 
          size="small" 
          sx={{ bgcolor: theme.palette.error.light, color: theme.palette.error.dark }}
        />
      </Box>
      
      {/* Matrix Display - Vehicle Types in Rows, Vendors in Columns */}
      {selectedRoute ? (
        selectedVendors.length > 0 ? (
          <>
            <Typography variant="h6" gutterBottom>
              Vehicle Rates Comparison for {selectedRoute}
            </Typography>
            
            <Paper sx={{ width: '100%', overflow: 'auto', mb: 3 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>
                        Vehicle Type
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 120 }}>
                        Best Rate
                      </TableCell>
                      {selectedVendors.map(vendor => (
                        <TableCell 
                          key={vendor} 
                          align="center"
                          sx={{ fontWeight: 'bold', minWidth: 120 }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Avatar 
                              sx={{ 
                                width: 30, 
                                height: 30, 
                                fontSize: '0.875rem',
                                mb: 0.5,
                                bgcolor: theme.palette.primary.main
                              }}
                            >
                              {vendor.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" noWrap>
                              {vendor}
                            </Typography>
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={selectedVendors.length + 2} align="center">
                          No vehicle data available for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedVehicles.map(vehicle => (
                        <TableRow key={vehicle.vehicleType}>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ bgcolor: theme.palette.grey[200], mr: 1, width: 28, height: 28 }}>
                                {getVehicleIcon(vehicle.vehicleType)}
                              </Avatar>
                              {vehicle.vehicleType}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {vehicle.stats.vendorCount > 0 ? (
                              <Chip 
                                label={`₹${vehicle.stats.minRate}`} 
                                size="small" 
                                icon={<TrendingDownIcon fontSize="small" />}
                                sx={{
                                  bgcolor: theme.palette.success.light,
                                  color: theme.palette.success.dark,
                                  fontWeight: 'bold',
                                  border: `1px solid ${theme.palette.success.main}`,
                                  '& .MuiChip-icon': { color: theme.palette.success.dark }
                                }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">N/A</Typography>
                            )}
                          </TableCell>
                          
                          {selectedVendors.map(vendor => {
                            const rate = vehicle.vendorRates[vendor];
                            const priceTag = vehicle.priceTags[vendor];
                            
                            return (
                              <TableCell key={vendor} align="center">
                                {rate !== null ? (
                                  <Chip
                                    size="small"
                                    label={`₹${rate}`}
                                    icon={getPriceTagIcon(priceTag)}
                                    sx={{
                                      bgcolor: 
                                        priceTag === 'low' ? theme.palette.success.light :
                                        priceTag === 'high' ? theme.palette.error.light :
                                        priceTag === 'mid' ? theme.palette.warning.light :
                                        theme.palette.grey[200],
                                      color: 
                                        priceTag === 'low' ? theme.palette.success.dark :
                                        priceTag === 'high' ? theme.palette.error.dark :
                                        priceTag === 'mid' ? theme.palette.warning.dark :
                                        theme.palette.grey[800],
                                      '& .MuiChip-icon': { color: 'inherit' }
                                    }}
                                  />
                                ) : (
                                  <Typography variant="body2" color="text.secondary">N/A</Typography>
                                )}
                              </TableCell>
                            );
                          })}
                          
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination 
                  count={totalPages} 
                  page={currentPage} 
                  onChange={(e, page) => setCurrentPage(page)} 
                  color="primary"
                />
              </Box>
            )}
          </>
        ) : (
          <Alert severity="info">
            Please select one or more vendors to compare rates
          </Alert>
        )
      ) : (
        <Alert severity="info">
          Please select a route to view vehicle types and vendor rates
        </Alert>
      )}
    </Box>
  );
};

export default VendorLookup;
