import React, { useState, lazy, Suspense } from 'react';
import { 
  Container, Typography, TextField, Button, Card, CardContent, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Alert, CircularProgress, Skeleton, Fade, Chip, Divider,
  useMediaQuery, alpha
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { searchQuotations } from '../services/api';

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

function QuotationEngine() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Form state
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  
  // Results state
  const [maxRate, setMaxRate] = useState(null);
  const [otherRates, setOtherRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalFound, setTotalFound] = useState(0);
  
  // UI state
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [animateResults, setAnimateResults] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMaxRate(null);
    setOtherRates([]);
    setFormSubmitted(true);
    setAnimateResults(false);
    
    try {
      // Simulate network delay for UI feedback (remove in production)
      // await new Promise(resolve => setTimeout(resolve, 800));
      
      const response = await searchQuotations({
        from_location: fromLocation,
        to_location: toLocation,
        vehicle_type: vehicleType || undefined,
      });
      
      if (response.success && response.quotations) {
        setMaxRate(response.quotations.max_rate);
        setOtherRates(response.quotations.other_rates);
        setTotalFound(response.total_found || 0);
        if (!response.quotations.max_rate) {
          setError('No valid quotations found.');
        }
      } else if (response.max_rate || response.other_rates) {
        setMaxRate(response.max_rate);
        setOtherRates(response.other_rates);
        setTotalFound(response.total_found || 0);
        if (!response.max_rate) {
          setError('No valid quotations found.');
        }
      } else {
        setError('No quotations found.');
      }
      
      // Trigger animation for results after a short delay
      setTimeout(() => setAnimateResults(true), 100);
    } catch (err) {
      console.error('Error fetching quotations:', err);
      setError(`Error fetching quotations: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Sort otherRates by rate descending, ensuring rate is a number
  const sortedOtherRates = otherRates && otherRates.length > 0
    ? [...otherRates].sort((a, b) => Number(b.rate) - Number(a.rate))
    : [];

  // Compute both highest and lowest quote from all rates
  const allRates = maxRate && otherRates ? [maxRate, ...otherRates] : (maxRate ? [maxRate] : []);
  const highestQuote = allRates.length > 0 ? allRates.reduce((a, b) => (Number(a.rate) > Number(b.rate) ? a : b)) : null;
  const lowestQuote = allRates.length > 0 ? allRates.reduce((a, b) => (Number(a.rate) < Number(b.rate) ? a : b)) : null;

  // Helper for loading skeletons
  const renderSkeletons = () => (
    <Box sx={{ mt: 4 }}>
      <Skeleton variant="rectangular" height={100} sx={{ mb: 2, borderRadius: theme.shape.borderRadius * 2 }} />
      <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: theme.shape.borderRadius * 2 }} />
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: theme.shape.borderRadius * 2 }} />
    </Box>
  );

  // Helper for summary bar with animation
  const summaryBar = highestQuote && lowestQuote && (
    <Fade in={animateResults} timeout={500}>
      <GradientCard sx={{ mb: 4, overflow: 'hidden' }}>
        <CardContent>
          <Box sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 2,
            flexWrap: 'wrap'
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              background: alpha(theme.palette.primary.main, 0.1),
              py: 0.5,
              px: 1.5,
              borderRadius: 2
            }}>
              <CompareArrowsIcon color="primary" />
              <Typography variant="h6" color="primary" fontWeight={600}>Quote Summary</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: isMobile ? 1 : 3, flexWrap: 'wrap' }}>
              <Chip 
                icon={<LocationOnIcon />} 
                label={`From: ${highestQuote.from_origin}`}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                sx={{ borderColor: theme.palette.primary.light }}
              />
              <Chip 
                icon={<LocationOnIcon />} 
                label={`To: ${highestQuote.area}`}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                sx={{ borderColor: theme.palette.primary.light }}
              />
              <Chip 
                icon={<LocalShippingIcon />} 
                label={`${highestQuote.vehicle_type}`}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                sx={{ borderColor: theme.palette.primary.light }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, ml: isMobile ? 0 : 'auto' }}>
              <Chip
                label={`Highest: ₹${highestQuote.rate}`}
                size="medium"
                sx={{ 
                  bgcolor: '#ffb74d', // orange
                  color: '#b53f00', // dark orange
                  fontWeight: 700, 
                  fontSize: '1.1rem',
                  py: 2.5,
                  borderRadius: 3,
                  boxShadow: theme.shadows[2]
                }}
              />
              <Chip
                label={`Lowest: ₹${lowestQuote.rate}`}
                size="medium"
                sx={{ 
                  bgcolor: '#c8e6c9', // light green
                  color: '#1b5e20', // dark green
                  fontWeight: 700, 
                  fontSize: '1.1rem',
                  py: 2.5,
                  borderRadius: 3,
                  boxShadow: theme.shadows[2]
                }}
              />
            </Box>
          </Box>
        </CardContent>
      </GradientCard>
    </Fade>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
              fontSize: { xs: '1rem', sm: '1.5rem', md: '2rem' }
            }}
          >
            Quick Quotes
          </Typography>
          <Typography 
            variant="subtitle1" 
            align="center" 
            color="text.secondary" 
            mb={4}
            sx={{ maxWidth: '600px', mx: 'auto' }}
          >
            Find the best rates for your logistics needs instantly
          </Typography>
          
          <GradientCard sx={{ mb: 4, boxShadow: theme.shadows[2] }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box 
                component="form" 
                onSubmit={handleSubmit} 
                sx={{
                  display: 'flex',
                  flexDirection: isTablet ? 'column' : 'row',
                  gap: 2,
                  alignItems: isTablet ? 'stretch' : 'center'
                }}
              >
                <TextField
                  label="From Location"
                  value={fromLocation}
                  onChange={e => setFromLocation(e.target.value)}
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: <LocationOnIcon color="primary" sx={{ mr: 1, opacity: 0.7 }} />,
                  }}
                  sx={{ 
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.light,
                      },
                    },
                  }}
                />
                
                <TextField
                  label="To Location"
                  value={toLocation}
                  onChange={e => setToLocation(e.target.value)}
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: <LocationOnIcon color="primary" sx={{ mr: 1, opacity: 0.7 }} />,
                  }}
                  sx={{ 
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.light,
                      },
                    },
                  }}
                />
                
                <TextField
                  label="Vehicle Type (optional)"
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <LocalShippingIcon color="primary" sx={{ mr: 1, opacity: 0.7 }} />,
                  }}
                  sx={{ 
                    flex: isTablet ? 1 : 0.8,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.light,
                      },
                    },
                  }}
                />
                
                <AnimatedButton 
                  type="submit" 
                  disabled={loading} 
                  variant="contained" 
                  color="primary" 
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  sx={{ 
                    minWidth: 120, 
                    height: 56,
                    borderRadius: 2,
                    px: 3,
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}
                >
                  {loading ? 'Searching...' : 'Search'}
                </AnimatedButton>
              </Box>
            </CardContent>
          </GradientCard>
          
          {error && (
            <Fade in={true} timeout={500}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  borderRadius: 2,
                  '& .MuiAlert-icon': { alignItems: 'center' }
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}
          
          {loading && renderSkeletons()}
          
          {!loading && formSubmitted && (
            <>
              {summaryBar}
              
              {maxRate && (
                <Fade in={animateResults} timeout={700}>
                  <GradientCard sx={{ mb: 4, overflow: 'hidden' }}>
                    <Box sx={{ 
                      p: 1, 
                      px: 2, 
                      borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      bgcolor: alpha(theme.palette.primary.main, 0.05)
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" color="primary" fontWeight={600}>
                          Quotation Range
                        </Typography>
                        <Chip
                          label={`Highest: ₹${highestQuote?.rate} (${highestQuote?.vendor_name})`}
                          size="small"
                          sx={{ bgcolor: '#ffb74d', color: '#b53f00', fontWeight: 700, ml: 1 }}
                        />
                        <Chip
                          label={`Lowest: ₹${lowestQuote?.rate} (${lowestQuote?.vendor_name})`}
                          size="small"
                          sx={{ bgcolor: '#c8e6c9', color: '#1b5e20', fontWeight: 700, ml: 1 }}
                        />
                      </Box>
                    </Box>
                    
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        flexWrap: 'wrap',
                        gap: 4
                      }}>
                        <Box flex={1} minWidth={isMobile ? '100%' : 220}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>From</Typography>
                          <Typography variant="body1" fontWeight={500} mb={2}>{maxRate.from_origin}</Typography>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>To</Typography>
                          <Typography variant="body1" fontWeight={500} mb={2}>{maxRate.area}</Typography>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>Vehicle Type</Typography>
                          <Typography variant="body1" fontWeight={500} mb={2}>{maxRate.vehicle_type}</Typography>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>Rate</Typography>
                          <Chip 
                            label={`₹${maxRate.rate}`} 
                            color="success" 
                            sx={{ fontWeight: 700, fontSize: '1rem' }}
                          />
                        </Box>
                        
                        <Divider orientation={isMobile ? 'horizontal' : 'vertical'} flexItem={!isMobile} />
                        
                        <Box flex={1} minWidth={isMobile ? '100%' : 220}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>Vendor</Typography>
                          <Typography variant="body1" fontWeight={500} mb={2}>{maxRate.vendor_name}</Typography>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>Pincode</Typography>
                          <Typography variant="body1" fontWeight={500} mb={2}>{maxRate.pincode || 'N/A'}</Typography>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>Receiver</Typography>
                          <Typography variant="body1" fontWeight={500} mb={2}>{maxRate.receiver_name || 'N/A'}</Typography>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>Vehicle No.</Typography>
                          <Typography variant="body1" fontWeight={500}>{maxRate.vehicle_no || 'N/A'}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </GradientCard>
                </Fade>
              )}
              
              {otherRates && otherRates.length > 0 && (
                <Fade in={animateResults} timeout={900}>
                  <Box>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 2,
                      flexWrap: 'wrap',
                      gap: 1
                    }}>
                      <Typography variant="h6" color="primary" fontWeight={600}>
                        Other Quotations
                      </Typography>
                      
                      <Chip 
                        label={`${totalFound} quotes found`} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </Box>
                    
                    {totalFound > otherRates.length && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Showing {otherRates.length} results. All {totalFound} results are available in the table below.
                      </Typography>
                    )}
                    
                    <TableContainer 
                      component={Paper} 
                      sx={{ 
                        borderRadius: theme.shape.borderRadius * 2, 
                        boxShadow: theme.shadows[2],
                        overflow: 'hidden',
                        mb: 4
                      }}
                    >
                      <Table size={isMobile ? "small" : "medium"}>
                        <StyledTableHead>
                          <TableRow>
                            <TableCell>From</TableCell>
                            <TableCell>To</TableCell>
                            <TableCell>Vehicle Type</TableCell>
                            <TableCell>Rate</TableCell>
                            <TableCell>Vendor</TableCell>
                            {!isMobile && <TableCell>Pincode</TableCell>}
                            {!isMobile && <TableCell>Receiver</TableCell>}
                            {!isMobile && <TableCell>Vehicle No.</TableCell>}
                          </TableRow>
                        </StyledTableHead>
                        <TableBody>
                          {sortedOtherRates.map((q, idx) => (
                            <StyledTableRow key={idx}>
                              <TableCell>{q.from_origin}</TableCell>
                              <TableCell>{q.area}</TableCell>
                              <TableCell>{q.vehicle_type}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={`₹${q.rate}`} 
                                  size="small" 
                                  sx={{ 
                                    bgcolor: alpha(theme.palette.success.main, 0.1), 
                                    color: theme.palette.success.dark,
                                    fontWeight: 600,
                                    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
                                  }} 
                                />
                              </TableCell>
                              <TableCell>{q.vendor_name}</TableCell>
                              {!isMobile && <TableCell>{q.pincode || 'N/A'}</TableCell>}
                              {!isMobile && <TableCell>{q.receiver_name || 'N/A'}</TableCell>}
                              {!isMobile && <TableCell>{q.vehicle_no || 'N/A'}</TableCell>}
                            </StyledTableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Fade>
              )}
            </>
          )}
        </Box>
      </Fade>
    </Container>
  );
}

export default QuotationEngine;
