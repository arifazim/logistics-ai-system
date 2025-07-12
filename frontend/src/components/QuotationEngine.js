import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Card, CardContent, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress } from '@mui/material';
import { searchQuotations } from '../services/api';

function QuotationEngine() {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [maxRate, setMaxRate] = useState(null);
  const [otherRates, setOtherRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalFound, setTotalFound] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMaxRate(null);
    setOtherRates([]);
    try {
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
    } catch (err) {
      setError('Error fetching quotations.');
    } finally {
      setLoading(false);
    }
  };

  // Sort otherRates by rate descending, ensuring rate is a number
  const sortedOtherRates = otherRates && otherRates.length > 0
    ? [...otherRates].sort((a, b) => Number(b.rate) - Number(a.rate))
    : [];

  // Helper for summary bar
  const summaryBar = maxRate && (
    <Card sx={{ background: 'primary.light', borderRadius: 2, mb: 4, boxShadow: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Typography variant="h6" color="primary" fontWeight={600}>Best Quotation</Typography>
        <Typography sx={{ fontSize: 18 }}><strong>From:</strong> {maxRate.from_origin}</Typography>
        <Typography sx={{ fontSize: 18 }}><strong>To:</strong> {maxRate.area}</Typography>
        <Typography sx={{ fontSize: 18 }}><strong>Vehicle:</strong> {maxRate.vehicle_type}</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'success.main', ml: 'auto' }}>₹{maxRate.rate}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={4} align="center" color="primary">
        Quotation Engine
      </Typography>
      <Card sx={{ mb: 4, boxShadow: 2 }}>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit} display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              label="From Location"
              value={fromLocation}
              onChange={e => setFromLocation(e.target.value)}
              required
              sx={{ flex: 1, minWidth: 180 }}
            />
            <TextField
              label="To Location"
              value={toLocation}
              onChange={e => setToLocation(e.target.value)}
              required
              sx={{ flex: 1, minWidth: 180 }}
            />
            <TextField
              label="Vehicle Type (optional)"
              value={vehicleType}
              onChange={e => setVehicleType(e.target.value)}
              sx={{ flex: 1, minWidth: 180 }}
            />
            <Button type="submit" disabled={loading} variant="contained" color="primary" sx={{ minWidth: 120, height: 56 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
            </Button>
          </Box>
        </CardContent>
      </Card>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {loading && <Box display="flex" justifyContent="center" alignItems="center" mb={3}><CircularProgress color="primary" /></Box>}
      {summaryBar}
      {maxRate && (
        <Card sx={{ mb: 4, border: '1px solid', borderColor: 'primary.main', borderRadius: 2, boxShadow: 2 }}>
          <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <Box flex={1} minWidth={220}>
              <Typography variant="subtitle1" color="primary" fontWeight={600} mb={1}>Best Quotation Details</Typography>
              <Typography mb={1}><strong>From:</strong> {maxRate.from_origin}</Typography>
              <Typography mb={1}><strong>To:</strong> {maxRate.area}</Typography>
              <Typography mb={1}><strong>Vehicle Type:</strong> {maxRate.vehicle_type}</Typography>
              <Typography mb={1}><strong>Rate:</strong> <span style={{ color: '#388e3c', fontWeight: 700 }}>₹{maxRate.rate}</span></Typography>
            </Box>
            <Box flex={1} minWidth={220}>
              <Typography mb={1}><strong>Vendor:</strong> {maxRate.vendor_name}</Typography>
              <Typography mb={1}><strong>Pincode:</strong> {maxRate.pincode}</Typography>
              <Typography mb={1}><strong>Receiver:</strong> {maxRate.receiver_name}</Typography>
              <Typography mb={1}><strong>Vehicle No.:</strong> {maxRate.vehicle_no}</Typography>
            </Box>
          </CardContent>
        </Card>
      )}
      {otherRates && otherRates.length > 0 && (
        <Box>
          <Typography variant="h6" mb={2} color="primary">
            Other Quotations ({totalFound} total found)
            {totalFound > otherRates.length && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Showing {otherRates.length} results. All {totalFound} results are available in the table below.
              </Typography>
            )}
          </Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
            <Table>
              <TableHead sx={{ backgroundColor: 'primary.light' }}>
                <TableRow>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Vehicle Type</TableCell>
                  <TableCell>Rate</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Pincode</TableCell>
                  <TableCell>Receiver</TableCell>
                  <TableCell>Vehicle No.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedOtherRates.map((q, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{q.from_origin}</TableCell>
                    <TableCell>{q.area}</TableCell>
                    <TableCell>{q.vehicle_type}</TableCell>
                    <TableCell sx={{ color: 'success.main', fontWeight: 600 }}>₹{q.rate}</TableCell>
                    <TableCell>{q.vendor_name}</TableCell>
                    <TableCell>{q.pincode}</TableCell>
                    <TableCell>{q.receiver_name}</TableCell>
                    <TableCell>{q.vehicle_no}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Container>
  );
}

export default QuotationEngine;
