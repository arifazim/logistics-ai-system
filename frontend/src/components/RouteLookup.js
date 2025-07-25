import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 
  (window.location.hostname === 'localhost' ? 
    'http://localhost:5000/api' : 
    'https://logistics-services-api-4ikv.onrender.com/api');

function RouteLookup() {
  const [vendorRates, setVendorRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeSearch, setRouteSearch] = useState('');
  const [routeSearchInput, setRouteSearchInput] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const resp = await axios.get(`${API_URL}/vendor-rates`);
      if (resp.data && resp.data.success) {
        setVendorRates(resp.data.rates);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Prepare route comparison data with highest, second highest, and lowest rates
  const routeComparisonData = React.useMemo(() => {
    if (!vendorRates.length) return [];
    
    // Group by route+vehicle
    const grouped = {};
    vendorRates.forEach(r => {
      if (!r.from_origin || !r.area || !r.vendor_name || !r.rate) return;
      
      const key = `${r.from_origin}  ${r.area} | ${r.vehicle_type || 'Unknown'}`;
      if (!grouped[key]) {
        grouped[key] = {
          route: key,
          origin: r.from_origin || '',
          dest: r.area || '',
          vehicle: r.vehicle_type || 'Unknown',
          rates: []
        };
      }
      
      grouped[key].rates.push({
        vendor: r.vendor_name,
        rate: Number(r.rate)
      });
    });
    
    // Process each route to get highest, second highest, and lowest rates
    const processedRoutes = Object.values(grouped).map(route => {
      // Sort rates from highest to lowest
      const sortedRates = [...route.rates].sort((a, b) => b.rate - a.rate);
      
      // Get highest and second highest rates
      const highest = sortedRates[0] || { vendor: '-', rate: 0 };
      const secondHighest = sortedRates[1] || { vendor: '-', rate: 0 };
      
      // Get three lowest rates (from the end of the sorted array)
      const lowestRates = sortedRates.slice(-3).reverse();
      while (lowestRates.length < 3) {
        lowestRates.push({ vendor: '-', rate: 0 });
      }
      
      // Check if there's no potential for savings
      // This happens when:
      // 1. There's only one unique vendor with non-zero rates
      // 2. All non-zero rates are the same
      const nonZeroRates = sortedRates.filter(r => r.rate > 0);
      const uniqueVendorsWithRates = new Set(nonZeroRates.map(r => r.vendor));
      const uniqueRateValues = new Set(nonZeroRates.map(r => r.rate));
      
      // If there's only one vendor with rates or all rates are the same, no savings potential
      const noSavingsPotential = uniqueVendorsWithRates.size <= 1 || uniqueRateValues.size <= 1;
      
      // Find the lowest non-zero rate for accurate savings calculation
      const lowestNonZeroRate = nonZeroRates.length > 0 ? nonZeroRates[nonZeroRates.length - 1].rate : 0;
      
      // Calculate potential savings (difference between highest and lowest non-zero rate)
      const potentialSavings = noSavingsPotential ? 0 : highest.rate - lowestNonZeroRate;
      const savingsPercentage = noSavingsPotential ? 0 : (highest.rate > 0 ? ((potentialSavings / highest.rate) * 100).toFixed(1) : 0);
      
      return {
        ...route,
        highest,
        secondHighest,
        thirdLowest: lowestRates[0],
        secondLowest: lowestRates[1],
        lowest: lowestRates[2],
        potentialSavings,
        savingsPercentage,
        noSavingsPotential
      };
    });
    
    // Sort by potential savings (highest first)
    return processedRoutes.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }, [vendorRates]);

  // Filtered rows based on search
  const filteredRows = React.useMemo(() => {
    if (!routeSearch) return routeComparisonData;
    const search = routeSearch.toLowerCase();
    return routeComparisonData.filter(row =>
      row.origin.toLowerCase().includes(search) ||
      row.dest.toLowerCase().includes(search) ||
      row.vehicle.toLowerCase().includes(search)
    );
  }, [routeComparisonData, routeSearch]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={2}>Route Rate Analysis</Typography>
      <Typography variant="body1" mb={3} color="text.secondary">
        Compare highest and lowest rates for each route to identify cost-saving opportunities. Routes are sorted by potential savings amount.
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <TextField
              size="small"
              value={routeSearchInput}
              onChange={e => setRouteSearchInput(e.target.value)}
              placeholder="Search routes..."
              sx={{ width: 250 }}
              onKeyDown={e => { if (e.key === 'Enter') setRouteSearch(routeSearchInput); }}
            />
            <IconButton onClick={() => setRouteSearch(routeSearchInput)}>
              <SearchIcon />
            </IconButton>
          </Box>
          
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: '#f3f6fa', fontWeight: 'bold', color: '#1976d2', fontSize: 16, position: 'sticky', top: 0, zIndex: 2 }}>
                    Route & Vehicle
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#ffebee', fontWeight: 'bold', color: '#c62828', fontSize: 15, position: 'sticky', top: 0, zIndex: 2 }}>
                    Highest Rate
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#fff3e0', fontWeight: 'bold', color: '#e65100', fontSize: 15, position: 'sticky', top: 0, zIndex: 2 }}>
                    2nd Highest Rate
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#fff8e1', fontWeight: 'bold', color: '#f9a825', fontSize: 15, position: 'sticky', top: 0, zIndex: 2 }}>
                    3rd Lowest Rate
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#f1f8e9', fontWeight: 'bold', color: '#558b2f', fontSize: 15, position: 'sticky', top: 0, zIndex: 2 }}>
                    2nd Lowest Rate
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#e8f5e9', fontWeight: 'bold', color: '#2e7d32', fontSize: 15, position: 'sticky', top: 0, zIndex: 2 }}>
                    Lowest Rate
                  </TableCell>
                  <TableCell sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold', color: '#1565c0', fontSize: 15, position: 'sticky', top: 0, zIndex: 2 }}>
                    Potential Savings
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <span style={{ color: '#1976d2', fontWeight: 600 }}>{row.origin}</span>
                      <span style={{ color: '#888', margin: '0 6px', fontWeight: 500 }}>→</span>
                      <span style={{ color: '#388e3c', fontWeight: 600 }}>{row.dest}</span>
                      <span style={{ color: '#888', margin: '0 8px', fontWeight: 400 }}>|</span>
                      <span style={{ color: '#8e24aa', fontWeight: 700 }}>{row.vehicle}</span>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#ffebee' }}>
                      <div style={{ fontWeight: 700, color: '#c62828' }}>₹{row.highest.rate}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{row.highest.vendor}</div>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#fff3e0' }}>
                      <div style={{ fontWeight: 600, color: '#e65100' }}>₹{row.secondHighest.rate}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{row.secondHighest.vendor}</div>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#fff8e1' }}>
                      <div style={{ fontWeight: 500, color: '#f9a825' }}>₹{row.thirdLowest.rate}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{row.thirdLowest.vendor}</div>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#f1f8e9' }}>
                      <div style={{ fontWeight: 500, color: '#558b2f' }}>₹{row.secondLowest.rate}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{row.secondLowest.vendor}</div>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#e8f5e9' }}>
                      <div style={{ fontWeight: 700, color: '#2e7d32' }}>₹{row.lowest.rate}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{row.lowest.vendor}</div>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#e3f2fd' }}>
                      {row.noSavingsPotential ? (
                        <>
                          <div style={{ fontWeight: 700, color: '#1565c0' }}>₹0</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>0% savings</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700, color: '#1565c0' }}>₹{row.potentialSavings}</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>{row.savingsPercentage}% savings</div>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}

export default RouteLookup;
