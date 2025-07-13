import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardHeader,
  Chip, Button, IconButton, Avatar, Tooltip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Divider, Alert, Stack, Switch, FormControlLabel, Tabs, Tab, Badge
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, Cell, PieChart, Pie, Scatter, ScatterChart
} from 'recharts';
import FilterListIcon from '@mui/icons-material/FilterList';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MapIcon from '@mui/icons-material/Map';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';

// With proxy configuration in package.json, we can use relative URLs
const API_URL = '/api';

// Price tag colors
const priceTagColors = {
  high: { bg: '#ffebee', text: '#c62828', border: '#ef9a9a', icon: '#d32f2f' },
  mid: { bg: '#fff8e1', text: '#f57f17', border: '#ffe082', icon: '#ff9800' },
  low: { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7', icon: '#4caf50' },
  single: { bg: '#fff', text: '#333', border: '#ddd', icon: '#9e9e9e' }
};

function VendorComparison() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allVendorRates, setAllVendorRates] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('comparison'); // 'comparison', 'savings', 'matrix'
  const [savingsData, setSavingsData] = useState([]);
  const [highlightedVendor, setHighlightedVendor] = useState(null);
  const [routeSearchInput, setRouteSearchInput] = useState('');
  const [vendorSearchInput, setVendorSearchInput] = useState('');

  // Fetch vendor rates data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        const resp = await axios.get(`${API_URL}/vendor-rates`, {
          timeout: 8000
        });
        
        if (resp.data && resp.data.success) {
          const rates = resp.data.rates || [];
          setAllVendorRates(rates);
          
          // Extract unique vendors, sort alphabetically
          const uniqueVendors = Array.from(new Set(rates.map(r => r.vendor_name).filter(Boolean)));
          uniqueVendors.sort((a, b) => a.localeCompare(b));
          setVendors(uniqueVendors);
          
          // Extract unique routes
          const uniqueRoutes = Array.from(new Set(rates.map(r => `${r.from_origin} → ${r.area} | ${r.vehicle_type}`).filter(Boolean)));
          uniqueRoutes.sort();
          setRoutes(uniqueRoutes);
          
          // Default: select first 3 routes
          setSelectedRoutes(uniqueRoutes.slice(0, Math.min(3, uniqueRoutes.length)));
          
          // Default: select first 5 vendors
          setSelectedVendors(uniqueVendors.slice(0, Math.min(5, uniqueVendors.length)));
          
          // Extract unique vehicle types
          const uniqueVehicles = Array.from(new Set(rates.map(r => r.vehicle_type).filter(Boolean)));
          uniqueVehicles.sort();
          setVehicleTypes(['all', ...uniqueVehicles]);
          
          // Extract unique origins
          const uniqueOrigins = Array.from(new Set(rates.map(r => r.from_origin).filter(Boolean)));
          uniqueOrigins.sort();
          setOrigins(['all', ...uniqueOrigins]);
          
          setLoading(false);
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (error) {
        console.error("Error fetching vendor rates:", error);
        setError(`${error.message} Please try again later.`);
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Filter data based on filters
  const filteredData = useMemo(() => {
    if (!allVendorRates.length) return [];
    
    return allVendorRates.filter(rate => {
      // Filter by vehicle type
      const vehicleMatch = vehicleFilter === 'all' || rate.vehicle_type === vehicleFilter;
      
      // Filter by origin
      const originMatch = originFilter === 'all' || rate.from_origin === originFilter;
      
      return vehicleMatch && originMatch;
    });
  }, [allVendorRates, vehicleFilter, originFilter]);

  // Process data for comparison view
  const comparisonData = useMemo(() => {
    if (!selectedRoutes.length || !filteredData.length) return [];
    
    // Group by vendor
    const vendorMap = {};
    
    filteredData.forEach(r => {
      if (!r.vendor_name || !r.from_origin || !r.area || !r.vehicle_type) return;
      
      const routeKey = `${r.from_origin} → ${r.area} | ${r.vehicle_type}`;
      if (!selectedRoutes.includes(routeKey)) return;
      
      if (!vendorMap[r.vendor_name]) {
        vendorMap[r.vendor_name] = {
          vendor: r.vendor_name,
          routes: {},
          routeCount: 0,
          avgRate: 0,
          totalRate: 0
        };
      }
      
      vendorMap[r.vendor_name].routes[routeKey] = Number(r.rate || 0);
      if (r.rate > 0) {
        vendorMap[r.vendor_name].routeCount++;
        vendorMap[r.vendor_name].totalRate += Number(r.rate);
      }
    });
    
    // Calculate average rates and convert to array
    const result = Object.values(vendorMap).map(vendor => {
      vendor.avgRate = vendor.routeCount > 0 ? vendor.totalRate / vendor.routeCount : 0;
      
      // Tag rates as high, mid, low for each route
      const routeRates = {};
      
      selectedRoutes.forEach(route => {
        if (!vendor.routes[route]) {
          routeRates[route] = { rate: 0, tag: null };
          return;
        }
        
        routeRates[route] = { 
          rate: vendor.routes[route],
          tag: 'single' // Default tag, will be updated later
        };
      });
      
      vendor.routeRates = routeRates;
      return vendor;
    });
    
    // Find min/max rates for each route to tag properly
    selectedRoutes.forEach(route => {
      const rates = result
        .filter(v => v.routeRates[route]?.rate > 0)
        .map(v => v.routeRates[route].rate);
      
      if (rates.length <= 1) return;
      
      const min = Math.min(...rates);
      const max = Math.max(...rates);
      
      result.forEach(vendor => {
        const rateObj = vendor.routeRates[route];
        if (!rateObj || rateObj.rate === 0) return;
        
        if (rateObj.rate === min) {
          rateObj.tag = 'low';
        } else if (rateObj.rate === max) {
          rateObj.tag = 'high';
        } else {
          rateObj.tag = 'mid';
        }
      });
    });
    
    // Calculate potential savings
    result.forEach(vendor => {
      let potentialSavings = 0;
      let routesWithSavings = 0;
      
      selectedRoutes.forEach(route => {
        const rateObj = vendor.routeRates[route];
        if (!rateObj || rateObj.rate === 0 || rateObj.tag !== 'high') return;
        
        // Find lowest rate for this route
        const lowestRate = Math.min(
          ...result
            .filter(v => v.routeRates[route]?.rate > 0)
            .map(v => v.routeRates[route].rate)
        );
        
        if (lowestRate < rateObj.rate) {
          const saving = rateObj.rate - lowestRate;
          potentialSavings += saving;
          routesWithSavings++;
        }
      });
      
      vendor.potentialSavings = potentialSavings;
      vendor.routesWithSavings = routesWithSavings;
    });
    
    // Filter to only include selected vendors if any are selected
    const filteredResult = selectedVendors.length > 0
      ? result.filter(v => selectedVendors.includes(v.vendor))
      : result;
    
    // Sort by coverage (descending), then by average rate (ascending)
    return filteredResult.sort((a, b) => {
      if (b.routeCount !== a.routeCount) {
        return b.routeCount - a.routeCount;
      }
      return a.avgRate - b.avgRate;
    });
  }, [filteredData, selectedRoutes, selectedVendors]);

  // Calculate savings data
  useEffect(() => {
    if (!comparisonData.length) return;
    
    const savingsArr = comparisonData
      .filter(v => v.potentialSavings > 0)
      .map(v => ({
        vendor: v.vendor,
        potentialSavings: v.potentialSavings,
        routesWithSavings: v.routesWithSavings,
        avgSavingPerRoute: v.routesWithSavings > 0 ? 
          v.potentialSavings / v.routesWithSavings : 0
      }))
      .sort((a, b) => b.potentialSavings - a.potentialSavings);
    
    setSavingsData(savingsArr);
  }, [comparisonData]);

  // Handle route selection
  const handleRouteSelection = (route) => {
    setSelectedRoutes(prev => {
      const isSelected = prev.includes(route);
      if (isSelected) {
        return prev.filter(r => r !== route);
      } else {
        return [...prev, route];
      }
    });
  };

  // Handle vendor selection
  const handleVendorSelection = (vendor) => {
    setSelectedVendors(prev => {
      const isSelected = prev.includes(vendor);
      if (isSelected) {
        return prev.filter(v => v !== vendor);
      } else {
        return [...prev, vendor];
      }
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Render comparison table
  const renderComparisonTable = () => (
    <TableContainer component={Paper} elevation={2}>
      <Table size="medium">
        <TableHead>
          <TableRow>
            <TableCell>Vendor</TableCell>
            {selectedRoutes.map(route => (
              <TableCell key={route} align="center">
                <Tooltip title={route} placement="top">
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                      {route.split(' | ')[0]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {route.split(' | ')[1]}
                    </Typography>
                  </Box>
                </Tooltip>
              </TableCell>
            ))}
            <TableCell align="center">
              <Tooltip title="Average Rate">
                <Typography>Avg. Rate</Typography>
              </Tooltip>
            </TableCell>
            <TableCell align="center">
              <Tooltip title="Potential Savings">
                <Typography>Savings</Typography>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {comparisonData.map((row) => (
            <TableRow 
              key={row.vendor} 
              hover
              sx={{
                ...(highlightedVendor === row.vendor ? {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                } : {}),
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.12)',
                }
              }}
              onMouseEnter={() => setHighlightedVendor(row.vendor)}
              onMouseLeave={() => setHighlightedVendor(null)}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
                    {row.vendor.charAt(0)}
                  </Avatar>
                  <Typography variant="body2" fontWeight={500}>
                    {row.vendor}
                  </Typography>
                </Box>
              </TableCell>
              
              {selectedRoutes.map(route => {
                const rateObj = row.routeRates[route] || { rate: 0, tag: null };
                const { rate, tag } = rateObj;
                
                return (
                  <TableCell 
                    key={route} 
                    align="center"
                    sx={{
                      ...(tag && priceTagColors[tag] ? {
                        backgroundColor: priceTagColors[tag].bg,
                        color: priceTagColors[tag].text,
                        fontWeight: 600,
                        position: 'relative'
                      } : {})
                    }}
                  >
                    {rate > 0 ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="body2" fontWeight={600}>
                          ₹{rate}
                        </Typography>
                        {tag === 'high' && (
                          <Tooltip title="High Rate - Potential Savings">
                            <TrendingUpIcon 
                              fontSize="small" 
                              sx={{ ml: 0.5, color: priceTagColors.high.icon }}
                            />
                          </Tooltip>
                        )}
                        {tag === 'low' && (
                          <Tooltip title="Best Rate">
                            <TrendingDownIcon 
                              fontSize="small" 
                              sx={{ ml: 0.5, color: priceTagColors.low.icon }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        -
                      </Typography>
                    )}
                  </TableCell>
                );
              })}
              
              <TableCell align="center">
                <Chip 
                  label={`₹${Math.round(row.avgRate)}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </TableCell>
              
              <TableCell align="center">
                {row.potentialSavings > 0 ? (
                  <Tooltip title={`Potential savings across ${row.routesWithSavings} routes`}>
                    <Chip 
                      label={`₹${Math.round(row.potentialSavings)}`}
                      size="small"
                      color="success"
                      icon={<AttachMoneyIcon />}
                    />
                  </Tooltip>
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    -
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render savings visualization
  const renderSavingsView = () => {
    if (!savingsData.length) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No potential savings found with the current selection. Try selecting different routes or vendors.
        </Alert>
      );
    }
    
    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardHeader title="Potential Savings by Vendor" />
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={savingsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vendor" />
                  <YAxis />
                  <RechartsTooltip 
                    formatter={(value, name) => [`₹${value}`, 'Potential Savings']}
                    labelFormatter={(label) => `Vendor: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="potentialSavings" 
                    name="Potential Savings" 
                    fill={theme.palette.success.main}
                    animationDuration={1000}
                  >
                    {savingsData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={highlightedVendor === entry.vendor ? 
                          theme.palette.success.dark : theme.palette.success.main} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardHeader title="Savings Breakdown" />
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Vendor</TableCell>
                      <TableCell align="right">Routes</TableCell>
                      <TableCell align="right">Total Savings</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {savingsData.map((row) => (
                      <TableRow 
                        key={row.vendor} 
                        hover
                        sx={{
                          ...(highlightedVendor === row.vendor ? {
                            backgroundColor: 'rgba(76, 175, 80, 0.08)',
                          } : {}),
                          cursor: 'pointer'
                        }}
                        onClick={() => setHighlightedVendor(
                          highlightedVendor === row.vendor ? null : row.vendor
                        )}
                      >
                        <TableCell component="th" scope="row">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar 
                              sx={{ 
                                width: 24, 
                                height: 24, 
                                bgcolor: theme.palette.success.main,
                                fontSize: '0.75rem'
                              }}
                            >
                              {row.vendor.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">{row.vendor}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{row.routesWithSavings}</TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            fontWeight={600} 
                            color="success.main"
                          >
                            ₹{Math.round(row.potentialSavings)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Render route selection UI
  const renderRouteSelector = () => (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Select Routes to Compare</Typography>
          <Button 
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            color="primary"
            variant={showFilters ? "contained" : "outlined"}
            size="small"
          >
            Filters
          </Button>
        </Box>
        
        {showFilters && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Vehicle Type</InputLabel>
                <Select
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  label="Vehicle Type"
                >
                  {vehicleTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type === 'all' ? 'All Vehicle Types' : type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Origin</InputLabel>
                <Select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  label="Origin"
                >
                  {origins.map(origin => (
                    <MenuItem key={origin} value={origin}>
                      {origin === 'all' ? 'All Origins' : origin}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}
        
        <Autocomplete
          multiple
          id="route-selector"
          options={routes}
          value={selectedRoutes}
          onChange={(event, newValue) => setSelectedRoutes(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Search and select routes"
              placeholder="Type to search routes"
              size="small"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const [route, vehicleType] = option.split(' | ');
              return (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ mr: 0.5 }}>
                        {route}
                      </Typography>
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">
                        {vehicleType}
                      </Typography>
                    </Box>
                  }
                  size="small"
                />
              );
            })
          }
        />
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Popular Routes:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {routes.slice(0, 5).map(route => {
              const isSelected = selectedRoutes.includes(route);
              return (
                <Chip
                  key={route}
                  label={route.split(' | ')[0]}
                  size="small"
                  color={isSelected ? "primary" : "default"}
                  onClick={() => handleRouteSelection(route)}
                  clickable
                />
              );
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Render vendor selection UI
  const renderVendorSelector = () => (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Select Vendors to Compare</Typography>
        
        <Autocomplete
          multiple
          id="vendor-selector"
          options={vendors}
          value={selectedVendors}
          onChange={(event, newValue) => setSelectedVendors(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Search and select vendors"
              placeholder="Type to search vendors"
              size="small"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option}
                label={option}
                size="small"
                avatar={<Avatar>{option.charAt(0)}</Avatar>}
              />
            ))
          }
        />
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Top Vendors:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {vendors.slice(0, 5).map(vendor => {
              const isSelected = selectedVendors.includes(vendor);
              return (
                <Chip
                  key={vendor}
                  label={vendor}
                  size="small"
                  color={isSelected ? "primary" : "default"}
                  onClick={() => handleVendorSelection(vendor)}
                  clickable
                  avatar={<Avatar sx={{ bgcolor: isSelected ? theme.palette.primary.main : undefined }}>{vendor.charAt(0)}</Avatar>}
                />
              );
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Main render
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Vendor Rate Comparison
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Compare vendor rates across routes and identify potential savings opportunities
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="fullWidth"
            >
              <Tab 
                label="Rate Comparison" 
                icon={<CompareArrowsIcon />} 
                iconPosition="start"
              />
              <Tab 
                label={
                  <Badge 
                    badgeContent={savingsData.length} 
                    color="error"
                    max={99}
                    showZero={false}
                  >
                    Savings Opportunities
                  </Badge>
                } 
                icon={<AttachMoneyIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Box>
          
          {activeTab === 0 && (
            <>
              {renderRouteSelector()}
              {renderVendorSelector()}
              {renderComparisonTable()}
            </>
          )}
          
          {activeTab === 1 && (
            <>
              {renderRouteSelector()}
              {renderVendorSelector()}
              {renderSavingsView()}
            </>
          )}
        </>
      )}
    </Box>
  );
}

export default VendorComparison;
