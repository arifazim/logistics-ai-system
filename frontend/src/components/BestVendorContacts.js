import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Tooltip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import BusinessIcon from '@mui/icons-material/Business';
import BoltIcon from '@mui/icons-material/Bolt';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';

// Styled components for better UI
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: alpha(theme.palette.primary.light, 0.03),
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.light, 0.08),
    transition: 'background-color 0.2s ease',
  },
}));

const SavingsChip = styled(Chip)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.8rem',
  height: 24,
  backgroundColor: alpha(theme.palette.success.main, 0.1),
  color: theme.palette.success.dark,
  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.05)',
  },
}));

const VendorAvatar = styled(Avatar)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.secondary.main, 0.15),
  color: theme.palette.secondary.main,
  width: 40,
  height: 40,
  marginRight: theme.spacing(1),
  border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.05)',
  }
}));

function BestVendorContacts({ previewData, vendorRatesData, VEHICLE_RATE_COLUMNS, findColIdx, normalizeCity, findVendorCol, extractVehicleType }) {
  if (!previewData || !previewData.length || !vendorRatesData || !vendorRatesData.length) {
    return null;
  }

  const header = previewData[0];
  
  // Find column indexes
  const dcCityIdx = findColIdx(header, 'dc city');
  const customerCityIdx = findColIdx(header, 'customer city') !== -1
    ? findColIdx(header, 'customer city')
    : findColIdx(header, 'customer');

  // Group by unique routes
  const uniqueRoutes = [];
  const routeMap = new Map();

  previewData.slice(1).forEach((row) => {
    const dcCity = row[dcCityIdx] || '';
    const customerCity = row[customerCityIdx] || '';
    
    if (dcCity && customerCity) {
      const routeKey = `${dcCity.toString().trim()}-${customerCity.toString().trim()}`;
      
      if (!routeMap.has(routeKey)) {
        routeMap.set(routeKey, {
          dcCity,
          customerCity,
          bestVendors: {}
        });
        uniqueRoutes.push(routeKey);
      }
    }
  });

  // For each unique route, find the best vendor rates
  uniqueRoutes.forEach(routeKey => {
    const routeData = routeMap.get(routeKey);
    const { dcCity, customerCity } = routeData;
    const normDcCity = normalizeCity(dcCity);
    const normCustomerCity = normalizeCity(customerCity);

    // Find all matching vendor rates for this route
    const matchingRoutes = vendorRatesData.filter(rate => {
      const fromOriginCol = findVendorCol(rate, 'from-origin');
      const areaCol = findVendorCol(rate, 'area');
      const originMatch = normDcCity && fromOriginCol && rate[fromOriginCol] &&
        normDcCity === normalizeCity(rate[fromOriginCol]);
      const destMatch = normCustomerCity && areaCol && rate[areaCol] &&
        normCustomerCity === normalizeCity(rate[areaCol]);
      return originMatch && destMatch;
    });

    // For each vehicle type, find the lowest rate
    VEHICLE_RATE_COLUMNS.forEach(vehicleType => {
      // Get all rates for this vehicle type
      const ratesForType = matchingRoutes.filter(rate => {
        const vehicleTypeExtracted = extractVehicleType(rate);
        if (!vehicleTypeExtracted) return false;
        
        const normExtracted = vehicleTypeExtracted.replace(/\s+/g, '').toUpperCase();
        const normVehicleType = vehicleType.replace(/\s+/g, '').toUpperCase();
        
        return (
          normExtracted === normVehicleType ||
          normExtracted.includes(normVehicleType) ||
          normVehicleType.includes(normExtracted)
        );
      });

      if (ratesForType.length > 0) {
        // Find the lowest rate vendor
        const lowestRateVendor = ratesForType.reduce((min, curr) => 
          Number(curr['rate']) < Number(min['rate']) ? curr : min, ratesForType[0]
        );
        
        // Find the highest rate for comparison
        const highestRate = Math.max(...ratesForType.map(r => Number(r['rate'])));
        
        // Calculate savings percentage
        const savingsPercent = ((highestRate - Number(lowestRateVendor['rate'])) / highestRate * 100).toFixed(1);
        
        const vendorCol = findVendorCol(lowestRateVendor, 'vendor name') || 
                          findVendorCol(lowestRateVendor, 'vendor') || 
                          findVendorCol(lowestRateVendor, 'name');
        
        routeData.bestVendors[vehicleType] = {
          vendorName: vendorCol ? lowestRateVendor[vendorCol] : 'Unknown Vendor',
          rate: Number(lowestRateVendor['rate']),
          highestRate: highestRate,
          savingsPercent: savingsPercent,
          contactInfo: lowestRateVendor['contact'] || lowestRateVendor['phone'] || lowestRateVendor['email'] || '',
          vehicleType
        };
      }
    });
  });

  // Prepare data for display
  const routesWithVendors = Array.from(routeMap.entries())
    .filter(([_, data]) => Object.keys(data.bestVendors).length > 0)
    .map(([routeKey, data]) => ({
      routeKey,
      dcCity: data.dcCity,
      customerCity: data.customerCity,
      bestVendors: data.bestVendors
    }));

  if (routesWithVendors.length === 0) {
    return null;
  }

  return (
    <Box mt={5}>
      <Card sx={{ 
        borderRadius: 4, 
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4ecfb 100%)'
      }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <BoltIcon sx={{ fontSize: 28, color: 'success.main', mr: 1 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              Contact Vendor for this quotation
            </Typography>
          </Box>
          
          <Typography variant="subtitle1" color="text.secondary" mb={3}>
            Below are the vendors offering the lowest rates for each vehicle type and route. Contact them directly to save maximum on your logistics costs.
          </Typography>

          {routesWithVendors.map((route) => (
            <Box key={route.routeKey} mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <LocationOnIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  {route.dcCity} → {route.customerCity}
                </Typography>
              </Box>
              
              <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Vehicle Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Best Vendor</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Lowest Rate</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Savings</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Contact Info</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.values(route.bestVendors).map((vendor) => (
                      <StyledTableRow key={vendor.vehicleType}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {vendor.vehicleType}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <VendorAvatar>
                              <BusinessIcon />
                            </VendorAvatar>
                            <Typography variant="body2" fontWeight="bold">
                              {vendor.vendorName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            ₹{vendor.rate.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={`Save ₹${(vendor.highestRate - vendor.rate).toLocaleString()} compared to highest rate of ₹${vendor.highestRate.toLocaleString()}`}>
                            <SavingsChip 
                              icon={<BoltIcon />} 
                              label={`${vendor.savingsPercent}% off`}
                              size="small"
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {vendor.contactInfo ? (
                            <Box display="flex" alignItems="center">
                              {vendor.contactInfo.includes('@') ? (
                                <Tooltip title={`Email: ${vendor.contactInfo}`}>
                                  <EmailIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                                </Tooltip>
                              ) : (
                                <Tooltip title={`Phone: ${vendor.contactInfo}`}>
                                  <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                                </Tooltip>
                              )}
                              <Typography variant="body2" noWrap>
                                {vendor.contactInfo}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Contact via office
                            </Typography>
                          )}
                        </TableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}

export default BestVendorContacts;
