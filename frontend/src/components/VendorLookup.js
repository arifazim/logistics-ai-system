import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, Filter, BarChart3, ArrowUpDown, X, TrendingUp, TrendingDown, Minus, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import './VendorLookup.css';

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
    const styles = {
      low: 'bg-green-100 text-green-800 border-green-200',
      mid: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-red-100 text-red-800 border-red-200',
      single: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return styles[tag] || styles.single;
  };

  const getPriceIcon = (tag) => {
    switch (tag) {
      case 'low': return <TrendingDown className="w-3 h-3" />;
      case 'high': return <TrendingUp className="w-3 h-3" />;
      default: return <Minus className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading vendor data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="text-center">
          <div className="error-text">Error</div>
          <p className="error-details">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-lookup-container">
      <div>
        <h1 className="page-title">Vendor Rate Lookup</h1>
        <p className="page-subtitle">Search and compare vendor rates across different routes and identify the best pricing opportunities for your routes.</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Search and Filter */}
          <div className="search-filter-container">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search vendors, origins, destinations or vehicle types..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filter Toggle */}
            <div className="flex justify-between">
              <button 
                className="filter-button"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
              
              {/* Stats Toggle */}
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {showStats ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                Stats
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="filters-panel">
              <div className="filter-row">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select 
                    className="filter-select"
                    value={vehicleFilter}
                    onChange={(e) => setVehicleFilter(e.target.value)}
                  >
                    <option value="all">All Vehicle Types</option>
                    {uniqueVehicles.map(vehicle => (
                      <option key={vehicle} value={vehicle}>{vehicle}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                  <select 
                    className="filter-select"
                    value={originFilter}
                    onChange={(e) => setOriginFilter(e.target.value)}
                  >
                    <option value="all">All Origins</option>
                    {uniqueOrigins.map(origin => (
                      <option key={origin} value={origin}>{origin}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  className="close-button"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Route Selection */}
          <div className="routes-container">
            <div className="flex justify-between items-center mb-3">
              <h2 className="section-title">Select Routes to Compare</h2>
              <div className="flex items-center">
                <button 
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                  onClick={() => setShowStats(!showStats)}
                >
                  {showStats ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Hide Stats
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Show Stats
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="routes-grid">
              {uniqueRoutes.map(route => (
                <button
                  key={route}
                  onClick={() => handleRouteToggle(route)}
                  className={`route-chip ${selectedRoutes.includes(route) ? 'selected' : ''}`}
                >
                  {route}
                </button>
              ))}
            </div>    
          </div>
        </div>

        {/* Route Statistics */}
        {showStats && selectedRoutes.length > 0 && (
          <div className="stats-container">
            {selectedRoutes.map(route => {
              const stats = routeStats[route];
              if (!stats) return null;
              
              return (
                <div key={route} className="stat-card">
                  <div className="stat-title">{route}</div>
                  <div className="stat-value">₹{stats.avgRate}</div>
                  <div className="stat-subtitle">{stats.vendorCount} vendors · ₹{stats.minRate} to ₹{stats.maxRate}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Price Legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          {[
            { key: 'low', label: 'Lowest Price', icon: TrendingDown },
            { key: 'mid', label: 'Mid Price', icon: Minus },
            { key: 'high', label: 'Highest Price', icon: TrendingUp }
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border ${getPriceTagStyle(key)}`}></div>
              <span className="text-sm text-gray-600">{label}</span>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Vendor
                  </th>
                  {selectedRoutes.map(route => (
                    <th key={route} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      {route}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={selectedRoutes.length + 1} className="px-6 py-8 text-center text-gray-500">
                      {selectedRoutes.length === 0 ? 'Please select routes to compare' : 'No matching vendors found'}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((vendor, index) => (
                    <tr key={vendor.vendor} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-indigo-800">
                              {vendor.vendor.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{vendor.vendor}</div>
                            <div className="text-sm text-gray-500">{vendor.totalRoutes} routes</div>
                          </div>
                        </div>
                      </td>
                      {selectedRoutes.map(route => {
                        const routeData = vendor.routeData[route];
                        return (
                          <td key={route} className="px-6 py-4 whitespace-nowrap text-center">
                            {routeData ? (
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getPriceTagStyle(routeData.tag)}`}>
                                {getPriceIcon(routeData.tag)}
                                ₹{routeData.rate}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    currentPage === i + 1
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}

        {/* Footer Info */}
        <div className="footer-info">
          Showing {paginatedData.length} of {comparisonData.length} vendors
        </div>
      </div>
    </div>
  );
};

export default VendorLookup;