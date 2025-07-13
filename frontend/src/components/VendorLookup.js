import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, Filter, BarChart3, ArrowUpDown, X, TrendingUp, TrendingDown, Minus, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

// Real API function to fetch vendor rates from backend
const fetchVendorRates = async () => {
  try {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendor data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-800">Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vendor Rate Comparison
          </h1>
          <p className="text-gray-600">
            Compare rates across vendors and identify the best pricing opportunities for your routes.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search vendors, routes, or vehicle types..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
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

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Vehicles</option>
                {uniqueVehicles.map(vehicle => (
                  <option key={vehicle} value={vehicle}>{vehicle}</option>
                ))}
              </select>
              
              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Origins</option>
                {uniqueOrigins.map(origin => (
                  <option key={origin} value={origin}>{origin}</option>
                ))}
              </select>
            </div>
          )}

          {/* Route Selection */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Select Routes to Compare</h3>
            <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {uniqueRoutes.slice(0, 20).map(route => (
                  <label key={route} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoutes.includes(route)}
                      onChange={() => handleRouteToggle(route)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{route}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Route Statistics */}
        {showStats && selectedRoutes.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedRoutes.map(route => {
                const stats = routeStats[route];
                if (!stats) return null;
                
                return (
                  <div key={route} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 text-sm">{route}</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Rate:</span>
                        <span className="font-medium">₹{stats.avgRate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Vendors:</span>
                        <span className="font-medium">{stats.vendorCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Range:</span>
                        <span className="font-medium">₹{stats.minRate} - ₹{stats.maxRate}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
        <div className="mt-8 text-center text-sm text-gray-500">
          Showing {paginatedData.length} of {comparisonData.length} vendors
        </div>
      </div>
    </div>
  );
};

export default VendorLookup;