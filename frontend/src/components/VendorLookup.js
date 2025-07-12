import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TextField, 
  IconButton, 
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Tooltip,
  Button,
  Card,
  CardContent,
  Grid,
  Avatar,
  Pagination,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import BarChartIcon from '@mui/icons-material/BarChart';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Price tag colors
const priceTagColors = {
  high: { bg: '#ffebee', text: '#c62828', border: '#ef9a9a' },
  mid: { bg: '#fff8e1', text: '#f57f17', border: '#ffe082' },
  low: { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
  single: { bg: '#fff', text: '#333', border: '#ddd' }
};

// Number of rows per page
const ROWS_PER_PAGE = 20;

function VendorLookup() {
  const theme = useTheme();
  const [allVendorRates, setAllVendorRates] = useState([]);
  const [vendorRates, setVendorRates] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeSearch, setRouteSearch] = useState('');
  const [routeSearchInput, setRouteSearchInput] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [vendorStats, setVendorStats] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [routeOptions, setRouteOptions] = useState([]);

  // Debounce search input
  const debounce = useCallback((func, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  }, []);

  const debouncedSearch = useCallback(
    debounce((value) => {
      setRouteSearch(value);
      setPage(1); // Reset to first page when search changes
    }, 300),
    []
  );

  // Handle search input change with debounce
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setRouteSearchInput(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Handle route selection/deselection
  const handleRouteSelection = useCallback((route) => {
    setSelectedRoutes(prev => {
      const routeIndex = prev.indexOf(route);
      if (routeIndex === -1) {
        // Add route if not selected
        return [...prev, route];
      } else {
        // Remove route if already selected
        return prev.filter(r => r !== route);
      }
    });
  }, []);

  // Fetch all vendor rates data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        const resp = await axios.get(`${API_URL}/vendor-rates`, {
          timeout: 8000
        }).catch(err => {
          if (err.code === 'ECONNABORTED') {
            throw new Error('API request timed out.');
          }
          throw err;
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
          
          // Default: select first 3 routes or all if less than 3
          setSelectedRoutes(uniqueRoutes.slice(0, Math.min(3, uniqueRoutes.length)));
          
          // Extract unique vehicle types
          const uniqueVehicles = Array.from(new Set(rates.map(r => r.vehicle_type).filter(Boolean)));
          uniqueVehicles.sort();
          setVehicleTypes(['all', ...uniqueVehicles]);
          
          // Extract unique origins
          const uniqueOrigins = Array.from(new Set(rates.map(r => r.from_origin).filter(Boolean)));
          uniqueOrigins.sort();
          setOrigins(['all', ...uniqueOrigins]);
          
          setDataLoaded(true);
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

  // Filter data based on search, vehicle type, and origin
  const filteredData = useMemo(() => {
    if (!allVendorRates.length) return [];
    
    return allVendorRates.filter(rate => {
      // Filter by search term
      const searchMatch = !routeSearch || 
        (rate.from_origin && rate.from_origin.toLowerCase().includes(routeSearch.toLowerCase())) ||
        (rate.area && rate.area.toLowerCase().includes(routeSearch.toLowerCase())) ||
        (rate.vehicle_type && rate.vehicle_type.toLowerCase().includes(routeSearch.toLowerCase()));
      
      // Filter by vehicle type
      const vehicleMatch = vehicleFilter === 'all' || rate.vehicle_type === vehicleFilter;
      
      // Filter by origin
      const originMatch = originFilter === 'all' || rate.from_origin === originFilter;
      
      return searchMatch && vehicleMatch && originMatch;
    });
  }, [allVendorRates, routeSearch, vehicleFilter, originFilter]);

  // Update pagination when filtered data changes
  useEffect(() => {
    if (dataLoaded) {
      setTotalRoutes(filteredData.length);
      setTotalPages(Math.ceil(filteredData.length / ROWS_PER_PAGE));
      setPage(1); // Reset to first page when filters change
    }
  }, [filteredData, dataLoaded]);

  // Get current page data
  const currentPageData = useMemo(() => {
    const startIndex = (page - 1) * ROWS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredData, page]);

  // Update vendor rates for current page
  useEffect(() => {
    setVendorRates(currentPageData);
  }, [currentPageData]);

  // Handle page change
  const handlePageChange = useCallback((event, value) => {
    setPage(value);
    // Scroll to top when page changes
    window.scrollTo(0, 0);
  }, []);

  // Calculate vendor statistics for selected routes
  useEffect(() => {
    if (dataLoaded && selectedRoutes.length > 0) {
      setLoadingStats(true);
      
      // Use setTimeout to calculate stats in the background
      setTimeout(() => {
        try {
          const stats = {};
          
          // First, identify vendors that have rates for all selected routes
          const vendorGroups = {};
          filteredData.forEach(r => {
            if (!r.vendor_name || !r.from_origin || !r.area || !r.vehicle_type) return;
            
            const key = `${r.from_origin} → ${r.area} | ${r.vehicle_type}`;
            if (!vendorGroups[key]) {
              vendorGroups[key] = {
                vendors: new Set(),
                rates: []
              };
            }
            
            if (r.vendor_name && selectedRoutes.includes(key) && r.rate) {
              vendorGroups[key].vendors.add(r.vendor_name);
              vendorGroups[key].rates.push({
                vendor: r.vendor_name,
                rate: Number(r.rate)
              });
            }
          });
          
          // Filter to only include routes that have rates for all selected routes
          const matchingRoutes = Object.entries(vendorGroups)
            .filter(([_, data]) => data.vendors.size > 0)
            .map(([key, data]) => ({
              route: key,
              rates: data.rates
            }));
          
          selectedRoutes.forEach(route => {
            // Get rates for this route from matching routes only
            const routeRates = matchingRoutes.flatMap(routeData => 
              routeData.rates.filter(r => r.vendor)
            );
            
            // Calculate average rate
            const sum = routeRates.reduce((acc, r) => acc + (r.rate || 0), 0);
            const avgRate = routeRates.length ? Math.round(sum / routeRates.length) : 0;
            
            // Count vendors covered
            const vendorsCovered = routeRates.length;
            
            // Count lowest and highest rates
            let lowestRateCount = 0;
            let highestRateCount = 0;
            
            // Check each matching route for lowest/highest
            matchingRoutes.forEach(routeData => {
              if (routeData.rates.length <= 1) return;
              
              const sortedRates = [...routeData.rates].sort((a, b) => a.rate - b.rate);
              
              if (sortedRates[0].vendor) {
                lowestRateCount++;
              }
              
              if (sortedRates[sortedRates.length - 1].vendor) {
                highestRateCount++;
              }
            });
            
            stats[route] = {
              avgRate,
              vendorsCovered,
              lowestRateCount,
              highestRateCount
            };
          });
          
          setVendorStats(stats);
          setLoadingStats(false);
        } catch (error) {
          console.error("Error calculating vendor statistics:", error);
          setLoadingStats(false);
        }
      }, 100);
    }
  }, [dataLoaded, selectedRoutes, filteredData]);

  // Prepare comparison data for selected routes - memoized to prevent recalculation
  const comparisonRows = useMemo(() => {
    if (!selectedRoutes.length || !vendorRates.length) return [];
    
    // Group by vendor
    const grouped = {};
    vendorRates.forEach(r => {
      if (!r.vendor_name || !r.from_origin || !r.area || !r.vehicle_type) return;
      
      const key = r.vendor_name;
      if (!grouped[key]) {
        grouped[key] = {
          vendor: key,
          routes: {}
        };
      }
      
      if (r.vendor_name && selectedRoutes.includes(`${r.from_origin} → ${r.area} | ${r.vehicle_type}`)) {
        grouped[key].routes[`${r.from_origin} → ${r.area} | ${r.vehicle_type}`] = Number(r.rate || 0);
      }
    });
    
    // Convert to array and add price tags
    const rows = Object.values(grouped);
    
    // Pre-create a Set of selected routes for faster lookups
    const selectedRoutesSet = new Set(selectedRoutes);
    
    // Process each row
    rows.forEach(row => {
      // Get rates for selected routes - more efficient with Set lookup
      const selectedRates = [];
      for (const route of selectedRoutesSet) {
        const rate = row.routes[route] || 0;
        if (rate > 0) {
          selectedRates.push({ route, rate });
        }
      }
      
      // Sort rates from high to low
      selectedRates.sort((a, b) => b.rate - a.rate);
      
      // Assign price tags
      const taggedRates = selectedRates.map((r, i) => {
        let tag;
        if (selectedRates.length <= 1) {
          tag = 'single';
        } else if (i === 0) {
          tag = 'high';
        } else if (i === selectedRates.length - 1) {
          tag = 'low';
        } else {
          tag = 'mid';
        }
        return { ...r, tag };
      });
      
      // Create a map of route to tagged rate
      const routeRateMap = {};
      taggedRates.forEach(r => {
        routeRateMap[r.route] = { rate: r.rate, tag: r.tag };
      });
      
      row.routeRates = routeRateMap;
      
      // Calculate coverage score for sorting (how many selected routes this vendor covers)
      row.coverageScore = selectedRates.length;
      
      // Calculate average rate for selected routes
      row.avgRate = selectedRates.length > 0 
        ? selectedRates.reduce((sum, r) => sum + r.rate, 0) / selectedRates.length 
        : 0;
    });
    
    // Sort by coverage score (descending), then by average rate (ascending)
    return rows.sort((a, b) => {
      // First sort by coverage (how many selected routes they service)
      if (b.coverageScore !== a.coverageScore) {
        return b.coverageScore - a.coverageScore;
      }
      // Then sort by average rate (lower rates first)
      return a.avgRate - b.avgRate;
    });
  }, [vendorRates, selectedRoutes]);

  const rowsPerPage = 20; // Changed from 10 to 20
  
  // Paginated data
  const paginatedRows = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return comparisonRows.slice(startIndex, endIndex);
  }, [comparisonRows, page]);

  // Memoize vendor stats display to prevent unnecessary re-renders
  const VendorStatsDisplay = useMemo(() => {
    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Route</TableCell>
            <TableCell align="center">Avg. Rate</TableCell>
            <TableCell align="center">Vendors</TableCell>
            <TableCell align="center">Lowest Rates</TableCell>
            <TableCell align="center">Highest Rates</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loadingStats ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            selectedRoutes.map(route => {
              const stats = vendorStats[route] || { 
                avgRate: 0, 
                vendorsCovered: 0, 
                lowestRateCount: 0,
                highestRateCount: 0
              };
              
              return (
                <TableRow key={route} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar 
                        sx={{ 
                          width: 28, 
                          height: 28, 
                          bgcolor: theme.palette.primary.main,
                          fontSize: '0.9rem'
                        }}
                      >
                        {route.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={500}>
                        {route}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">₹{stats.avgRate}</TableCell>
                  <TableCell align="center">{stats.vendorsCovered}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      size="small"
                      label={stats.lowestRateCount} 
                      sx={{ 
                        bgcolor: priceTagColors.low.bg,
                        color: priceTagColors.low.text,
                        border: `1px solid ${priceTagColors.low.border}`,
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      size="small"
                      label={stats.highestRateCount} 
                      sx={{ 
                        bgcolor: priceTagColors.high.bg,
                        color: priceTagColors.high.text,
                        border: `1px solid ${priceTagColors.high.border}`,
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    );
  }, [selectedRoutes, vendorStats, theme.palette.primary.main, loadingStats]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={2}>
        Vendor Rate Comparison
      </Typography>
      <Typography variant="body1" mb={3} color="text.secondary">
        Select routes to compare their rates across vendors. Identify high, mid, and low priced vendors for negotiation opportunities.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Route Selection and Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={5}>
          <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Select Routes to Compare
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="Search routes..."
                value={routeSearchInput}
                onChange={handleSearchChange}
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <IconButton 
                      size="small" 
                      onClick={() => setRouteSearch(routeSearchInput)}
                      sx={{ visibility: routeSearchInput ? 'visible' : 'hidden' }}
                    >
                      <SearchIcon />
                    </IconButton>
                  )
                }}
                disabled={loading}
              />
              <FormControl fullWidth size="small" disabled={loading}>
                <InputLabel id="route-select-label">Routes</InputLabel>
                <Select
                  labelId="route-select-label"
                  multiple
                  value={selectedRoutes}
                  onChange={(e) => setSelectedRoutes(e.target.value)}
                  input={<OutlinedInput label="Routes" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={value} 
                          size="small"
                          deleteIcon={
                            <IconButton
                              size="small"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          }
                          onDelete={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRouteSelection(value);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          sx={{ 
                            fontWeight: 500,
                            bgcolor: theme.palette.primary.light,
                            color: theme.palette.primary.contrastText
                          }} 
                        />
                      ))}
                    </Box>
                  )}
                  MenuProps={{
                    PaperProps: {
                      style: { maxHeight: 300 },
                    },
                  }}
                >
                  {routes
                    .filter(route => 
                      route.toLowerCase().includes(routeSearch.toLowerCase())
                    )
                    .map((route) => (
                      <MenuItem 
                        key={route} 
                        value={route}
                      >
                        <Checkbox checked={selectedRoutes.indexOf(route) > -1} />
                        <ListItemText primary={route} />
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Button 
                  size="small" 
                  onClick={() => setSelectedRoutes(routes.slice(0, Math.min(3, routes.length)))}
                  startIcon={<CompareArrowsIcon />}
                  disabled={loading || routes.length === 0}
                >
                  Compare Top 3
                </Button>
                <Button 
                  size="small"
                  color="error"
                  onClick={() => {
                    setSelectedRoutes([]);
                    setRouteSearch('');
                  }}
                  disabled={loading || selectedRoutes.length === 0}
                >
                  Reset
                </Button>
                <Button 
                  size="small" 
                  onClick={() => setSelectedRoutes(routes)}
                  startIcon={<BarChartIcon />}
                  disabled={loading || routes.length === 0}
                >
                  Select All
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={7}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Route Statistics
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                {VendorStatsDisplay}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Filters and Search */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: showFilters ? 2 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              size="small"
              value={routeSearchInput}
              onChange={handleSearchChange}
              placeholder="Search routes..."
              sx={{ width: 250 }}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={() => setRouteSearch(routeSearchInput)} disabled={loading}>
                    <SearchIcon />
                  </IconButton>
                )
              }}
            />
            <Button 
              variant="outlined" 
              size="small"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              disabled={loading}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {totalRoutes} routes found
            </Typography>
          </Box>
        </Box>
        
        {showFilters && (
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }} disabled={loading}>
              <InputLabel>Vehicle Type</InputLabel>
              <Select
                value={vehicleFilter}
                onChange={(e) => {
                  setVehicleFilter(e.target.value);
                }}
                label="Vehicle Type"
              >
                {vehicleTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type === 'all' ? 'All Vehicle Types' : type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 200 }} disabled={loading}>
              <InputLabel>Origin</InputLabel>
              <Select
                value={originFilter}
                onChange={(e) => {
                  setOriginFilter(e.target.value);
                }}
                label="Origin"
              >
                {origins.map(origin => (
                  <MenuItem key={origin} value={origin}>
                    {origin === 'all' ? 'All Origins' : origin}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Paper>
      
      {/* Price Tag Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, justifyContent: 'flex-end' }}>
        {Object.entries(priceTagColors).map(([tag, colors]) => (
          <Box key={tag} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              sx={{ 
                width: 16, 
                height: 16, 
                borderRadius: '50%', 
                bgcolor: colors.bg,
                border: `1px solid ${colors.border}`
              }} 
            />
            <Typography variant="body2" fontWeight={500} color={colors.text}>
              {tag.charAt(0).toUpperCase() + tag.slice(1)} Price
            </Typography>
          </Box>
        ))}
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" mt={2}>
            Loading vendor data...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Pagination Controls - Top */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
          
          {/* Standard Table */}
          <TableContainer component={Paper} sx={{ maxHeight: 500, borderRadius: 2, overflow: 'auto' }} elevation={3}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      backgroundColor: '#f3f6fa', 
                      fontWeight: 'bold', 
                      color: theme.palette.primary.main, 
                      fontSize: 16, 
                      position: 'sticky', 
                      top: 0, 
                      left: 0,
                      zIndex: 3,
                      minWidth: 250
                    }}
                  >
                    Vendor
                  </TableCell>
                  {selectedRoutes.map(route => (
                    <TableCell
                      key={route}
                      sx={{
                        backgroundColor: '#f3f6fa',
                        fontWeight: 'bold',
                        fontSize: 15,
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        minWidth: 120,
                        textAlign: 'center'
                      }}
                    >
                      {route}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectedRoutes.length + 1} align="center" sx={{ py: 3 }}>
                      {selectedRoutes.length > 1 ? (
                        <>
                          <Typography variant="body1" color="text.secondary" gutterBottom>
                            No matching vendors found between the selected routes.
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Only vendors that are servicing all selected routes are displayed for comparison.
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body1" color="text.secondary">
                          No vendors found matching your criteria
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar 
                            sx={{ 
                              width: 28, 
                              height: 28, 
                              bgcolor: theme.palette.primary.main,
                              fontSize: '0.9rem'
                            }}
                          >
                            {row.vendor.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>
                            {row.vendor}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      {selectedRoutes.map(route => {
                        const vendorRate = row.routeRates[route];
                        const rate = vendorRate?.rate || 0;
                        const tag = vendorRate?.tag;
                        
                        return (
                          <TableCell 
                            key={route} 
                            align="center"
                            sx={{
                              position: 'relative',
                              ...(tag && priceTagColors[tag] ? {
                                backgroundColor: priceTagColors[tag].bg,
                                color: priceTagColors[tag].text,
                                fontWeight: 600
                              } : {})
                            }}
                          >
                            {rate > 0 ? (
                              <>
                                <Typography variant="body2" fontWeight={600}>
                                  ₹{rate}
                                </Typography>
                                {tag && (
                                  <Tooltip title={`${tag.charAt(0).toUpperCase() + tag.slice(1)} price`}>
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        width: 0,
                                        height: 0,
                                        borderStyle: 'solid',
                                        borderWidth: '0 12px 12px 0',
                                        borderColor: `transparent ${priceTagColors[tag].border} transparent transparent`,
                                      }}
                                    />
                                  </Tooltip>
                                )}
                              </>
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                -
                              </Typography>
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
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {loading ? 'Loading...' : `Showing ${paginatedRows.length} of ${totalRoutes} vendors`}
            </Typography>
            {totalPages > 1 && (
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
                size="medium"
                disabled={loading}
              />
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

export default VendorLookup; 