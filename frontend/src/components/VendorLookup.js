import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardHeader,
  Chip, Button, IconButton, Avatar, Tooltip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Divider, Alert, Stack, Switch, FormControlLabel, Tabs, Tab, Badge,
  InputAdornment, Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useTheme } from '@mui/material/styles';

// Real API function to fetch vendor rates from backend
const fetchVendorRates = async () => {
  try {
    // With proxy configuration in package.json, this will be forwarded to http://localhost:5000/api/vendor-rates
    const response = await axios.get('/api/vendor-rates');
    return response.data; // Backend already returns { success: true, rates: [...] }
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showStats, setShowStats] = useState(true);
  
  const ITEMS_PER_PAGE = 15;

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetchVendorRates();
        if (response.success) {
          setAllVendorRates(response.rates);
          // Auto-select first 3 routes
          const uniqueRoutes = [...new Set(response.rates.map(r => `${r.from_origin} → ${r.area} | ${r.vehicle_type}`))];
          setSelectedRoutes(uniqueRoutes.slice(0, 3));
        } else {
          setError('Failed to load vendor rates');
        }
      } catch (err) {
        setError('Error loading data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Get unique values for filters
  const uniqueVehicles = useMemo(() => 
    [...new Set(allVendorRates.map(r => r.vehicle_type))].sort(),
    [allVendorRates]
  );
  
  const uniqueOrigins = useMemo(() => 
    [...new Set(allVendorRates.map(r => r.from_origin))].sort(),
    [allVendorRates]
  );

  const uniqueRoutes = useMemo(() => 
    [...new Set(allVendorRates.map(r => `${r.from_origin} → ${r.area} | ${r.vehicle_type}`))].sort(),
    [allVendorRates]
  );

  // Filter and search data
  const filteredData = useMemo(() => {
    return allVendorRates.filter(rate => {
      const matchesSearch = !searchTerm || 
        rate.from_origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rate.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rate.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rate.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVehicle = vehicleFilter === 'all' || rate.vehicle_type === vehicleFilter;
      const matchesOrigin = originFilter === 'all' || rate.from_origin === originFilter;
      
      return matchesSearch && matchesVehicle && matchesOrigin;
    });
  }, [allVendorRates, searchTerm, vehicleFilter, originFilter]);

  // Prepare comparison data
  const comparisonData = useMemo(() => {
    if (!selectedRoutes.length) return [];
    
    const vendorMap = new Map();
    
    filteredData.forEach(rate => {
      const routeKey = `${rate.from_origin} → ${rate.area} | ${rate.vehicle_type}`;
      if (!selectedRoutes.includes(routeKey)) return;
      
      if (!vendorMap.has(rate.vendor_name)) {
        vendorMap.set(rate.vendor_name, {
          vendor: rate.vendor_name,
          routes: new Map(),
          totalRoutes: 0,
          avgRate: 0
        });
      }
      
      const vendor = vendorMap.get(rate.vendor_name);
      vendor.routes.set(routeKey, rate.rate);
    });
    
    // Calculate stats and price tags
    const result = Array.from(vendorMap.values()).map(vendor => {
      const routeRates = Array.from(vendor.routes.values());
      vendor.totalRoutes = routeRates.length;
      vendor.avgRate = routeRates.reduce((sum, rate) => sum + rate, 0) / routeRates.length;
      
      // Add price tags for each route
      vendor.routeData = {};
      selectedRoutes.forEach(route => {
        const rate = vendor.routes.get(route);
        if (rate) {
          // Get all rates for this route to determine price tag
          const allRatesForRoute = Array.from(vendorMap.values())
            .map(v => v.routes.get(route))
            .filter(Boolean)
            .sort((a, b) => a - b);
          
          let tag = 'single';
          if (allRatesForRoute.length > 1) {
            const minRate = allRatesForRoute[0];
            const maxRate = allRatesForRoute[allRatesForRoute.length - 1];
            if (rate === minRate) tag = 'low';
            else if (rate === maxRate) tag = 'high';
            else tag = 'mid';
          }
          
          vendor.routeData[route] = { rate, tag };
        }
      });
      
      return vendor;
    });
    
    // Sort by coverage and then by average rate
    return result.sort((a, b) => {
      if (b.totalRoutes !== a.totalRoutes) return b.totalRoutes - a.totalRoutes;
      return a.avgRate - b.avgRate;
    });
  }, [filteredData, selectedRoutes]);

  // Pagination
  const totalPages = Math.ceil(comparisonData.length / ITEMS_PER_PAGE);
  const paginatedData = comparisonData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Route statistics
  const routeStats = useMemo(() => {
    const stats = {};
    selectedRoutes.forEach(route => {
      const rates = comparisonData
        .map(v => v.routeData[route]?.rate)
        .filter(Boolean);
      
      if (rates.length > 0) {
        stats[route] = {
          avgRate: Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length),
          vendorCount: rates.length,
          minRate: Math.min(...rates),
          maxRate: Math.max(...rates)
        };
      }
    });
    return stats;
  }, [selectedRoutes, comparisonData]);

  const handleRouteToggle = (route) => {
    setSelectedRoutes(prev => 
      prev.includes(route) 
        ? prev.filter(r => r !== route)
        : [...prev, route]
    );
    setCurrentPage(1);
  };

  const getPriceTagStyle = (tag) => {
    switch (tag) {
      case 'low': return { bgcolor: '#e8f5e9', color: '#2e7d32', borderColor: '#a5d6a7' };
      case 'mid': return { bgcolor: '#fff8e1', color: '#f57f17', borderColor: '#ffe082' };
      case 'high': return { bgcolor: '#ffebee', color: '#c62828', borderColor: '#ef9a9a' };
      case 'single': return { bgcolor: '#fff', color: '#333', borderColor: '#ddd' };
      default: return { bgcolor: '#f5f5f5', color: '#616161', borderColor: '#e0e0e0' };
    }
  };

  const getPriceIcon = (tag) => {
    switch (tag) {
      case 'low': return <TrendingDownIcon fontSize="small" />;
      case 'high': return <TrendingUpIcon fontSize="small" />;
      default: return <RemoveIcon fontSize="small" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography color="text.secondary">Loading vendor data...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>Error</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Vendor Rate Lookup
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Search and compare vendor rates across different routes and identify the best pricing opportunities for your routes.
      </Typography>

      {/* Controls */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search vendors, origins, destinations or vehicle types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            )
          }}
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
        />
        
        {/* Filter Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            size="small"
          >
            Filters
          </Button>
          
          {/* Stats Toggle */}
          <Button
            startIcon={showStats ? <VisibilityOffIcon /> : <VisibilityIcon />}
            onClick={() => setShowStats(!showStats)}
            size="small"
            color="primary"
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }} elevation={1}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
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
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Origin</InputLabel>
                <Select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  label="Origin"
                >
                  <MenuItem value="all">All Origins</MenuItem>
                  {uniqueOrigins.map(origin => (
                    <MenuItem key={origin} value={origin}>{origin}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <IconButton
              size="small"
              onClick={() => setShowFilters(false)}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Routes Selection */}
      <Card sx={{ mb: 3 }} elevation={1}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Select Routes to Compare</Typography>
            <Button
              startIcon={showStats ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={() => setShowStats(!showStats)}
              size="small"
              color="primary"
            >
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {uniqueRoutes.map(route => (
              <Chip
                key={route}
                label={route}
                onClick={() => handleRouteToggle(route)}
                color={selectedRoutes.includes(route) ? "primary" : "default"}
                variant={selectedRoutes.includes(route) ? "filled" : "outlined"}
                size="small"
                clickable
              />
            ))}
          </Box>    
        </CardContent>
      </Card>

      {/* Route Statistics */}
      {showStats && selectedRoutes.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            {selectedRoutes.map(route => {
              const stats = routeStats[route];
              if (!stats) return null;
              
              return (
                <Grid item xs={12} sm={6} md={4} key={route}>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }} variant="outlined">
                    <Typography variant="caption" color="text.secondary" display="block">
                      {route}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" sx={{ my: 0.5 }}>
                      ₹{stats.avgRate}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stats.vendorCount} vendors · ₹{stats.minRate} to ₹{stats.maxRate}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Price Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {[
          { key: 'low', label: 'Lowest Price', icon: TrendingDown },
          { key: 'mid', label: 'Mid Price', icon: RemoveIcon },
          { key: 'high', label: 'Highest Price', icon: TrendingUp }
        ].map(({ key, label, icon: Icon }) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: 1, ...getPriceTagStyle(key) }} />
            <Typography variant="body2" color="text.secondary">{label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Comparison Table */}
      <TableContainer component={Paper} sx={{ mb: 3, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ position: 'sticky', left: 0, bgcolor: '#f5f5f5', zIndex: 3, fontWeight: 'bold' }}>
                Vendor
              </TableCell>
              {selectedRoutes.map(route => (
                <TableCell 
                  key={route} 
                  align="center"
                  sx={{ fontWeight: 'bold', minWidth: 120 }}
                >
                  {route}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedRoutes.length + 1} align="center">
                  {selectedRoutes.length === 0 ? 'Please select routes to compare' : 'No matching vendors found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((vendor, index) => (
                <TableRow key={vendor.vendor} hover>
                  <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'white', zIndex: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: theme.palette.primary.light, 
                          color: theme.palette.primary.contrastText,
                          width: 32, 
                          height: 32,
                          mr: 1
                        }}
                      >
                        {vendor.vendor.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {vendor.vendor}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {vendor.totalRoutes} routes
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  {selectedRoutes.map(route => {
                    const routeData = vendor.routeData[route];
                    return (
                      <TableCell key={route} align="center">
                        {routeData ? (
                          <Chip
                            size="small"
                            label={`₹${routeData.rate}`}
                            icon={getPriceIcon(routeData.tag)}
                            sx={{
                              ...getPriceTagStyle(routeData.tag),
                              '& .MuiChip-icon': { color: 'inherit' }
                            }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">-</Typography>
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
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(e, page) => setCurrentPage(page)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Footer Info */}
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
        Showing {paginatedData.length} of {comparisonData.length} vendors
      </Typography>
    </Box>
  );
};

export default VendorLookup;