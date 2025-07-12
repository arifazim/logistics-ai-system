import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Container, Typography, Grid, Card, CardContent, Box, 
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, CircularProgress, Alert, Chip, 
  Divider, IconButton, Tooltip, Tab, Tabs, Button,
  LinearProgress, useTheme, Rating, FormControlLabel, Switch
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter, ZAxis, ComposedChart, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Warning, CheckCircle, 
  LocalShipping, AttachMoney, Timeline, PieChart as PieChartIcon,
  Speed, CompareArrows, Visibility, VisibilityOff, Refresh
} from '@mui/icons-material';
import { getDashboardAnalytics } from '../services/api';
import axios from 'axios';

// Constants
const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const ANOMALY_THRESHOLD = 25; // Percentage threshold for anomaly detection

function Dashboard() {
  const theme = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [vendorRates, setVendorRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('month');
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError('');
      try {
        const response = await getDashboardAnalytics();
        if (response.success) {
          setAnalytics(response.analytics);
          // Also fetch vendor rates for additional insights
          fetchVendorRates();
        } else {
          setError('Failed to load analytics.');
        }
      } catch (err) {
        setError('Error fetching analytics.');
      } finally {
        setLoading(false);
      }
    }
    
    async function fetchVendorRates() {
      try {
        const response = await axios.get(`${API_URL}/vendor-rates`);
        if (response.data && response.data.success) {
          setVendorRates(response.data.rates || []);
        }
      } catch (err) {
        console.error("Error fetching vendor rates:", err);
        // Don't set error state here as we want to show the dashboard even if this fails
      }
    }
    
    fetchAnalytics();
  }, [refreshing]);

  // Handle manual refresh of dashboard data
  const handleRefresh = () => {
    setRefreshing(prev => !prev);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Utility functions for data processing and insights
  const savingsOpportunities = useMemo(() => {
    if (!vendorRates || vendorRates.length === 0) return [];
    
    // Group rates by route and vehicle type
    const routeGroups = {};
    vendorRates.forEach(rate => {
      if (!rate.from_origin || !rate.area || !rate.vehicle_type || !rate.rate) return;
      
      const key = `${rate.from_origin} → ${rate.area} | ${rate.vehicle_type}`;
      if (!routeGroups[key]) {
        routeGroups[key] = [];
      }
      
      routeGroups[key].push({
        vendor: rate.vendor_name,
        rate: Number(rate.rate),
        route: key,
        origin: rate.from_origin,
        destination: rate.area,
        vehicleType: rate.vehicle_type
      });
    });
    
    // Calculate savings opportunities
    const savingsOpportunities = [];
    Object.values(routeGroups).forEach(rates => {
      if (rates.length < 2) return; // Need at least 2 vendors to compare
      
      // Sort rates from low to high
      rates.sort((a, b) => a.rate - b.rate);
      
      const lowestRate = rates[0];
      const highestRate = rates[rates.length - 1];
      const secondHighestRate = rates.length > 2 ? rates[rates.length - 2] : highestRate;
      
      const potentialSavings = highestRate.rate - lowestRate.rate;
      const savingsPercentage = (potentialSavings / highestRate.rate) * 100;
      
      if (potentialSavings > 0) {
        savingsOpportunities.push({
          route: lowestRate.route,
          origin: lowestRate.origin,
          destination: lowestRate.destination,
          vehicleType: lowestRate.vehicleType,
          lowestVendor: lowestRate.vendor,
          lowestRate: lowestRate.rate,
          highestVendor: highestRate.vendor,
          highestRate: highestRate.rate,
          secondHighestVendor: secondHighestRate.vendor,
          secondHighestRate: secondHighestRate.rate,
          potentialSavings,
          savingsPercentage
        });
      }
    });
    
    // Sort by potential savings (highest first)
    return savingsOpportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }, [vendorRates]);

  // Detect anomalies in rates
  const anomalies = useMemo(() => {
    if (!vendorRates || vendorRates.length === 0) return [];
    
    // Group rates by route and vehicle type
    const routeGroups = {};
    vendorRates.forEach(rate => {
      if (!rate.from_origin || !rate.area || !rate.vehicle_type || !rate.rate) return;
      
      const key = `${rate.from_origin} → ${rate.area} | ${rate.vehicle_type}`;
      if (!routeGroups[key]) {
        routeGroups[key] = [];
      }
      
      routeGroups[key].push({
        vendor: rate.vendor_name,
        rate: Number(rate.rate),
        route: key,
        origin: rate.from_origin,
        destination: rate.area,
        vehicleType: rate.vehicle_type
      });
    });
    
    // Detect anomalies
    const anomalies = [];
    Object.values(routeGroups).forEach(rates => {
      if (rates.length < 3) return; // Need at least 3 vendors to detect anomalies
      
      // Calculate average and standard deviation
      const sum = rates.reduce((acc, r) => acc + r.rate, 0);
      const avg = sum / rates.length;
      
      const squaredDiffs = rates.map(r => Math.pow(r.rate - avg, 2));
      const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / squaredDiffs.length;
      const stdDev = Math.sqrt(avgSquaredDiff);
      
      // Find outliers (rates that are significantly different from others)
      rates.forEach(rate => {
        const deviation = Math.abs(rate.rate - avg);
        const deviationPercentage = (deviation / avg) * 100;
        
        if (deviationPercentage > ANOMALY_THRESHOLD) {
          anomalies.push({
            route: rate.route,
            origin: rate.origin,
            destination: rate.destination,
            vehicleType: rate.vehicleType,
            vendor: rate.vendor,
            rate: rate.rate,
            averageRate: avg,
            deviation,
            deviationPercentage,
            type: rate.rate > avg ? 'high' : 'low'
          });
        }
      });
    });
    
    // Sort by deviation percentage (highest first)
    return anomalies.sort((a, b) => b.deviationPercentage - a.deviationPercentage);
  }, [vendorRates]);

  // Calculate route optimization suggestions
  const routeOptimizations = useMemo(() => {
    if (!vendorRates || vendorRates.length === 0 || !analytics) return [];
    
    // Find routes with high volume but high rates
    const highVolumeRoutes = new Set(
      analytics?.route_volume_by_destination
        ?.slice(0, 5)
        .map(r => r.area) || []
    );
    
    const optimizations = [];
    vendorRates.forEach(rate => {
      if (!rate.area || !rate.from_origin || !rate.vehicle_type || !rate.rate) return;
      
      if (highVolumeRoutes.has(rate.area)) {
        // Check if this is a high-rate route
        const rateValue = Number(rate.rate);
        const avgRateForVehicle = analytics?.avg_rates_by_vehicle_type.find(
          v => v.vehicle_type === rate.vehicle_type
        )?.avg_rate || 0;
        
        if (rateValue > avgRateForVehicle * 1.15) { // 15% higher than average
          optimizations.push({
            route: `${rate.from_origin} → ${rate.area}`,
            origin: rate.from_origin,
            destination: rate.area,
            vehicleType: rate.vehicle_type,
            vendor: rate.vendor_name,
            rate: rateValue,
            avgRate: avgRateForVehicle,
            difference: rateValue - avgRateForVehicle,
            percentageDiff: ((rateValue - avgRateForVehicle) / avgRateForVehicle) * 100
          });
        }
      }
    });
    
    // Remove duplicates and sort by percentage difference
    const uniqueOptimizations = [];
    const seen = new Set();
    
    optimizations.forEach(opt => {
      const key = `${opt.route}|${opt.vehicleType}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueOptimizations.push(opt);
      }
    });
    
    return uniqueOptimizations.sort((a, b) => b.percentageDiff - a.percentageDiff);
  }, [vendorRates, analytics]);

  // Update analytics with calculated data when they change
  useEffect(() => {
    if (analytics) {
      setAnalytics(prevAnalytics => ({
        ...prevAnalytics,
        savings_opportunities: savingsOpportunities,
        anomalies: anomalies,
        routeOptimizationSuggestions: routeOptimizations
      }));
    }
  }, [savingsOpportunities, anomalies, routeOptimizations]);

  // Calculate vendor performance metrics
  const calculateVendorPerformance = useCallback((vendorRates) => {
    if (!vendorRates || vendorRates.length === 0) return [];
    
    // Group by vendor
    const vendorMap = {};
    
    vendorRates.forEach(rate => {
      if (!vendorMap[rate.vendor_name]) {
        vendorMap[rate.vendor_name] = {
          vendor: rate.vendor_name,
          routeCount: 0,
          totalRate: 0,
          rates: [],
          vehicleTypes: new Set(),
          origins: new Set(),
          destinations: new Set(),
          lowestRateCount: 0,
          highestRateCount: 0
        };
      }
      
      vendorMap[rate.vendor_name].routeCount++;
      vendorMap[rate.vendor_name].totalRate += Number(rate.rate);
      vendorMap[rate.vendor_name].rates.push(Number(rate.rate));
      
      if (rate.vehicle_type) {
        vendorMap[rate.vendor_name].vehicleTypes.add(rate.vehicle_type);
      }
      
      if (rate.from_origin) {
        vendorMap[rate.vendor_name].origins.add(rate.from_origin);
      }
      if (rate.to_destination) {
        vendorMap[rate.vendor_name].destinations.add(rate.to_destination);
      }
    });
    
    // Find lowest and highest rates for each route
    const routeMap = {};
    vendorRates.forEach(rate => {
      const routeKey = `${rate.from_origin}-${rate.to_destination}-${rate.vehicle_type}`;
      if (!routeMap[routeKey]) {
        routeMap[routeKey] = {
          rates: []
        };
      }
      routeMap[routeKey].rates.push({
        vendor: rate.vendor_name,
        rate: Number(rate.rate)
      });
    });
    
    // Count lowest and highest rates for each vendor
    Object.values(routeMap).forEach(route => {
      if (route.rates.length <= 1) return;
      
      route.rates.sort((a, b) => a.rate - b.rate);
      const lowestVendor = route.rates[0].vendor;
      const highestVendor = route.rates[route.rates.length - 1].vendor;
      
      if (vendorMap[lowestVendor]) {
        vendorMap[lowestVendor].lowestRateCount++;
      }
      
      if (vendorMap[highestVendor]) {
        vendorMap[highestVendor].highestRateCount++;
      }
    });
    
    // Calculate additional metrics
    const vendors = Object.values(vendorMap).map(vendor => {
      // Calculate average rate
      const avgRate = vendor.totalRate / vendor.routeCount;
      
      // Calculate rate variance
      const sum = vendor.rates.reduce((acc, r) => acc + r, 0);
      const mean = sum / vendor.rates.length;
      const squaredDiffs = vendor.rates.map(r => Math.pow(r - mean, 2));
      const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / squaredDiffs.length;
      
      // Count unique vehicle types, origins, and destinations
      const vehicleCount = vendor.vehicleTypes.size;
      const originCount = vendor.origins.size;
      const destinationCount = vendor.destinations.size;
      
      // Calculate competitiveness score (percentage of routes where vendor has lowest price)
      const competitivenessScore = Math.round((vendor.lowestRateCount / vendor.routeCount) * 100);
      
      // Calculate diversity score (based on unique origins, destinations, and vehicle types)
      const diversityScore = Math.round(((originCount + destinationCount + vehicleCount) / (vendor.routeCount * 3)) * 100);
      
      // Calculate reliability score (inverse of rate variance, normalized)
      const reliabilityScore = Math.round(Math.max(0, Math.min(100, 100 - (variance / avgRate) * 10)));
      
      // Calculate overall score
      const overallScore = Math.round((competitivenessScore + diversityScore + reliabilityScore) / 3);
      
      return {
        vendor: vendor.vendor,
        routeCount: vendor.routeCount,
        avgRate,
        variance,
        vehicleCount,
        originCount,
        destinationCount,
        lowestRateCount: vendor.lowestRateCount,
        highestRateCount: vendor.highestRateCount,
        competitivenessScore,
        diversityScore,
        reliabilityScore,
        overallScore
      };
    });
    
    // Sort by overall score
    return vendors.sort((a, b) => b.overallScore - a.routeCount);
  }, []);

  const vendorPerformance = useMemo(() => calculateVendorPerformance(vendorRates), [vendorRates, calculateVendorPerformance]);

  // Helper for bar chart rendering
  const renderBar = (value, max, color = 'primary.main') => (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Box
        sx={{
          width: `${(value / max) * 100}%`,
          bgcolor: color,
          height: 10,
          borderRadius: 1
        }}
      />
    </Box>
  );

  // Calculate max values for charts
  const maxRouteVolume = analytics?.route_volume_by_destination ? 
    Math.max(...analytics.route_volume_by_destination.map(r => r.count), 1) : 1;
  const maxAvgRate = analytics?.avg_rates_by_vehicle_type ? 
    Math.max(...analytics.avg_rates_by_vehicle_type.map(r => r.avg_rate), 1) : 1;

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>;
  if (error) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><Alert severity="error">{error}</Alert></Box>;
  if (!analytics) return null;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Dashboard
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Refresh />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>
      
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        variant="scrollable" 
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab label="Overview" />
        <Tab label="Savings Opportunities" />
        <Tab label="Pricing Anomalies" />
        <Tab label="Route Optimization" />
        <Tab label="Vendor Analysis" />
      </Tabs>
      
      {/* Overview Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Overview Cards */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={3}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Total Routes
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="primary.main">
                    {analytics.total_routes}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Total Revenue
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="primary.main">
                    ₹{analytics?.total_revenue ? analytics.total_revenue.toFixed(2) : '0.00'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Average Rate
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="primary.main">
                    ₹{analytics?.avg_rate ? analytics.avg_rate.toFixed(2) : '0.00'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Savings Opportunities
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="success.main">
                    ₹{analytics?.savings_opportunities && analytics.savings_opportunities.length > 0 
                      ? analytics.savings_opportunities.reduce((sum, item) => sum + (item.potentialSavings || 0), 0).toFixed(2) 
                      : '0.00'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Overview Charts */}
          <Grid container spacing={3} sx={{ mt: 3 }}>
            {/* Charts removed as requested */}
          </Grid>
        </Box>
      )}
      
      {/* Savings Opportunities Tab */}
      {activeTab === 1 && (
        <Box>
          <Card sx={{ mb: 3, borderRadius: 2, borderLeft: 5, borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                Savings Opportunities
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                Based on your shipping patterns and vendor rates, we've identified opportunities to save money.
                Focus on these high-savings routes for maximum impact.
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: 'grey.100' }}>
                    <TableRow>
                      <TableCell>Route</TableCell>
                      <TableCell>Vehicle</TableCell>
                      <TableCell>Lowest Vendor</TableCell>
                      <TableCell align="right">Lowest Rate</TableCell>
                      <TableCell align="right">Highest Rate</TableCell>
                      <TableCell align="right">Potential Savings</TableCell>
                      <TableCell align="right">Savings Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics?.savings_opportunities?.slice(0, 10).map((item, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>{`${item.origin} → ${item.destination}`}</TableCell>
                        <TableCell>{item.vehicleType}</TableCell>
                        <TableCell>{item.lowestVendor}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                          ₹{item.lowestRate ? item.lowestRate.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>
                          ₹{item.highestRate ? item.highestRate.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          ₹{item.potentialSavings ? item.potentialSavings.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {item.savingsPercentage ? item.savingsPercentage.toFixed(1) : '0.0'}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {analytics?.savings_opportunities?.length === 0 && (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">No savings opportunities available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* Savings Opportunities Charts */}
          <Grid container spacing={3}>
            {/* Charts removed as requested */}
          </Grid>
        </Box>
      )}
      
      {/* Anomalies Tab */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Pricing Anomaly Detection
            </Typography>
            <FormControlLabel
              control={
                <Switch 
                  checked={showAnomalies}
                  onChange={(e) => setShowAnomalies(e.target.checked)}
                  color="warning"
                />
              }
              label="Show Anomalies Only"
            />
          </Box>
          
          <Card sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Our system automatically detects pricing anomalies by analyzing vendor rates across similar routes and vehicle types.
                Rates that deviate significantly from the average (±{ANOMALY_THRESHOLD * 100}%) are flagged as potential anomalies.
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: 'grey.100' }}>
                    <TableRow>
                      <TableCell>Route</TableCell>
                      <TableCell>Vehicle</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell align="right">Avg. Rate</TableCell>
                      <TableCell align="right">Deviation</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics?.vendorRates
                      ?.filter(rate => !showAnomalies || analytics?.anomalies?.some(a => 
                        a.origin === rate.origin && 
                        a.destination === rate.destination && 
                        a.vehicleType === rate.vehicleType &&
                        a.vendor === rate.vendor
                      ))
                      ?.slice(0, 15)
                      .map((rate, idx) => {
                        const isAnomaly = analytics?.anomalies.find(a => 
                          a.origin === rate.origin && 
                          a.destination === rate.destination && 
                          a.vehicleType === rate.vehicleType && 
                          a.vendor === rate.vendor
                        );
                        
                        return (
                          <TableRow 
                            key={idx} 
                            hover
                            sx={{ 
                              backgroundColor: isAnomaly ? 
                                (isAnomaly.type === 'high' ? 'rgba(255, 0, 0, 0.05)' : 'rgba(0, 255, 0, 0.05)') : 
                                'inherit'
                            }}
                          >
                            <TableCell>{`${rate.origin} → ${rate.destination}`}</TableCell>
                            <TableCell>{rate.vehicleType}</TableCell>
                            <TableCell>{rate.vendor}</TableCell>
                            <TableCell align="right" sx={{ 
                              fontWeight: 600,
                              color: isAnomaly ? 
                                (isAnomaly.type === 'high' ? 'error.main' : 'success.main') : 
                                'inherit'
                            }}>
                              ₹{rate.rate.toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              ₹{rate.avgRate.toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              {(((rate.rate - rate.avgRate) / rate.avgRate) * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell align="right">
                              {isAnomaly ? (
                                <Chip 
                                  size="small"
                                  label={isAnomaly.type === 'high' ? 'Overpriced' : 'Underpriced'}
                                  sx={{ 
                                    bgcolor: isAnomaly.type === 'high' ? 'error.light' : 'success.light',
                                    color: isAnomaly.type === 'high' ? 'error.dark' : 'success.dark',
                                    fontWeight: 600
                                  }}
                                />
                              ) : (
                                <Chip 
                                  size="small"
                                  label="Normal"
                                  sx={{ 
                                    bgcolor: 'grey.100',
                                    color: 'text.secondary',
                                  }}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {analytics?.vendorRates?.length === 0 && (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">No vendor rate data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* Anomaly Summary */}
          <Grid container spacing={3}>
            {/* Charts removed as requested */}
          </Grid>
        </Box>
      )}
      
      {/* Route Optimization Tab */}
      {activeTab === 3 && (
        <Box>
          <Card sx={{ mb: 3, borderRadius: 2, borderLeft: 5, borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                Route Optimization Suggestions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                Based on your shipping patterns and vendor rates, we've identified opportunities to optimize your routes.
                Focus on these high-volume routes with above-average rates for maximum impact.
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: 'grey.100' }}>
                    <TableRow>
                      <TableCell>Route</TableCell>
                      <TableCell align="right">Volume</TableCell>
                      <TableCell align="right">Current Avg. Rate</TableCell>
                      <TableCell align="right">Market Avg.</TableCell>
                      <TableCell align="right">Potential Impact</TableCell>
                      <TableCell align="right">Recommendation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics?.routeOptimizationSuggestions?.slice(0, 10).map((item, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>{`${item.origin} → ${item.destination}`}</TableCell>
                        <TableCell align="right">{item.volume}</TableCell>
                        <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 600 }}>
                          ₹{item.currentRate ? item.currentRate.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell align="right">
                          ₹{item.marketAvgRate ? item.marketAvgRate.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          ₹{item.volume && item.currentRate && item.marketAvgRate ? 
                            (item.volume * (item.currentRate - item.marketAvgRate)).toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            size="small"
                            label={item.recommendation}
                            sx={{ 
                              bgcolor: 'primary.light',
                              color: 'primary.dark',
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {analytics?.routeOptimizationSuggestions?.length === 0 && (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">No optimization suggestions available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* Route Optimization Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    High-Volume Routes
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics?.route_volume_by_destination?.slice(0, 8) || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="area" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="count" name="Volume" fill="#3f51b5">
                          {analytics?.route_volume_by_destination?.slice(0, 8).map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={analytics?.routeOptimizationSuggestions?.some(
                                r => r.destination === entry.area
                              ) ? '#f44336' : '#3f51b5'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, bgcolor: '#3f51b5', borderRadius: '50%' }} />
                      <Typography variant="body2">Normal Routes</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, bgcolor: '#f44336', borderRadius: '50%' }} />
                      <Typography variant="body2">Optimization Candidates</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Rate Comparison by Route
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={analytics?.routeOptimizationSuggestions?.slice(0, 8) || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="destination" />
                        <YAxis />
                        <RechartsTooltip formatter={(value) => value ? `₹${value.toFixed(2)}` : '₹0.00'} />
                        <Legend />
                        <Bar dataKey="currentRate" name="Current Rate" fill="#f44336" />
                        <Line type="monotone" dataKey="marketAvgRate" name="Market Avg" stroke="#4caf50" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Total Optimization Impact
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h3" fontWeight={700} color="primary.main">
                      ₹{analytics?.routeOptimizationSuggestions?.reduce((sum, item) => 
                        sum + (item.volume * (item.currentRate - item.marketAvgRate)), 0).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      potential savings through route optimization
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    This represents approximately {
                      (analytics?.routeOptimizationSuggestions?.reduce((sum, item) => 
                        sum + (item.volume * (item.currentRate - item.marketAvgRate)), 0) / analytics.total_revenue * 100).toFixed(1)
                    }% of your total logistics spend.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Vendor Analysis Tab */}
      {activeTab === 4 && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={{ mb: 3, borderRadius: 2, borderLeft: 5, borderColor: 'primary.main' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>
                    Vendor Performance Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    Comprehensive analysis of vendor performance across multiple metrics including pricing competitiveness, route diversity, and reliability.
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: 'grey.100' }}>
                        <TableRow>
                          <TableCell>Vendor</TableCell>
                          <TableCell align="right">Routes Served</TableCell>
                          <TableCell align="right">Avg. Rate</TableCell>
                          <TableCell align="center">Pricing</TableCell>
                          <TableCell align="center">Diversity</TableCell>
                          <TableCell align="center">Reliability</TableCell>
                          <TableCell align="center">Overall Score</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {vendorPerformance?.length > 0 ? vendorPerformance.slice(0, 10).map((vendor, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{vendor.vendor}</TableCell>
                            <TableCell align="right">{vendor.routeCount}</TableCell>
                            <TableCell align="right">₹{vendor.avgRate.toFixed(2)}</TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Rating 
                                  value={vendor.competitivenessScore / 20} 
                                  readOnly 
                                  precision={0.5} 
                                  size="small"
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                  {vendor.competitivenessScore}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Rating 
                                  value={vendor.diversityScore / 20} 
                                  readOnly 
                                  precision={0.5} 
                                  size="small"
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                  {vendor.diversityScore}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Rating 
                                  value={vendor.reliabilityScore / 20} 
                                  readOnly 
                                  precision={0.5} 
                                  size="small"
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                  {vendor.reliabilityScore}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={vendor.overallScore}
                                sx={{ 
                                  fontWeight: 600,
                                  bgcolor: 
                                    vendor.overallScore >= 80 ? 'success.light' :
                                    vendor.overallScore >= 60 ? 'primary.light' :
                                    vendor.overallScore >= 40 ? 'warning.light' : 'error.light',
                                  color: 
                                    vendor.overallScore >= 80 ? 'success.dark' :
                                    vendor.overallScore >= 60 ? 'primary.dark' :
                                    vendor.overallScore >= 40 ? 'warning.dark' : 'error.dark',
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={7} align="center">No vendor data available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Vendor Rate Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      >
                        <CartesianGrid />
                        <XAxis 
                          type="number" 
                          dataKey="routeCount" 
                          name="Routes Served" 
                          unit=" routes"
                        />
                        <YAxis 
                          type="number" 
                          dataKey="avgRate" 
                          name="Average Rate" 
                          unit=" ₹"
                        />
                        <ZAxis 
                          type="number" 
                          dataKey="overallScore" 
                          range={[50, 400]} 
                          name="Score"
                        />
                        <RechartsTooltip 
                          cursor={{ strokeDasharray: '3 3' }} 
                          formatter={(value, name, props) => {
                            if (name === 'Average Rate') return `₹${value.toFixed(2)}`;
                            if (name === 'Routes Served') return `${value} routes`;
                            return value;
                          }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div style={{ 
                                  backgroundColor: '#fff', 
                                  padding: '10px', 
                                  border: '1px solid #ccc',
                                  borderRadius: '4px'
                                }}>
                                  <p style={{ margin: 0, fontWeight: 'bold' }}>{data.vendor}</p>
                                  <p style={{ margin: 0 }}>Routes: {data.routeCount}</p>
                                  <p style={{ margin: 0 }}>Avg Rate: ₹{data.avgRate.toFixed(2)}</p>
                                  <p style={{ margin: 0 }}>Score: {data.overallScore}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter 
                          name="Vendors" 
                          data={vendorPerformance || []} 
                          fill="#8884d8"
                        >
                          {vendorPerformance?.length > 0 && vendorPerformance.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                entry.overallScore >= 80 ? '#4caf50' :
                                entry.overallScore >= 60 ? '#3f51b5' :
                                entry.overallScore >= 40 ? '#ff9800' : '#f44336'
                              } 
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Bubble size represents vendor's overall performance score
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Top Vendor Performance Radar
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart 
                        outerRadius={90} 
                        width={730} 
                        height={250} 
                        data={[
                          { subject: 'Pricing', A: vendorPerformance?.[0]?.competitivenessScore || 0, B: vendorPerformance?.[1]?.competitivenessScore || 0, fullMark: 100 },
                          { subject: 'Diversity', A: vendorPerformance?.[0]?.diversityScore || 0, B: vendorPerformance?.[1]?.diversityScore || 0, fullMark: 100 },
                          { subject: 'Reliability', A: vendorPerformance?.[0]?.reliabilityScore || 0, B: vendorPerformance?.[1]?.reliabilityScore || 0, fullMark: 100 },
                          { subject: 'Routes', A: vendorPerformance?.length > 0 ? (vendorPerformance[0]?.routeCount / Math.max(...vendorPerformance.map(v => v.routeCount || 1)) * 100) || 0 : 0, B: vendorPerformance?.length > 0 ? (vendorPerformance[1]?.routeCount / Math.max(...vendorPerformance.map(v => v.routeCount || 1)) * 100) || 0 : 0, fullMark: 100 },
                          { subject: 'Vehicles', A: vendorPerformance?.length > 0 ? (vendorPerformance[0]?.vehicleCount / Math.max(...vendorPerformance.map(v => v.vehicleCount || 1)) * 100) || 0 : 0, B: vendorPerformance?.length > 0 ? (vendorPerformance[1]?.vehicleCount / Math.max(...vendorPerformance.map(v => v.vehicleCount || 1)) * 100) || 0 : 0, fullMark: 100 },
                        ]}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name={vendorPerformance?.[0]?.vendor || 'Vendor 1'} dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                        <Radar name={vendorPerformance?.[1]?.vendor || 'Vendor 2'} dataKey="B" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Vendor Price Competitiveness
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={vendorPerformance?.length > 0 ? vendorPerformance.slice(0, 8) : []}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="vendor" />
                        <YAxis />
                        <RechartsTooltip formatter={(value) => value ? `₹${value.toFixed(2)}` : '₹0.00'} />
                        <Legend />
                        <Bar dataKey="lowestRateCount" name="Lowest Price Routes" stackId="a" fill="#4caf50" />
                        <Bar dataKey="highestRateCount" name="Highest Price Routes" stackId="a" fill="#f44336" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Number of routes where each vendor offers the lowest or highest price
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Container>
  );
}

export default Dashboard;