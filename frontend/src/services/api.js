import axios from 'axios';

// Get the API base URL from environment variable or use the deployed URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (window.location.hostname === 'localhost' ? 
    'http://localhost:5000/api' : 
    'https://logistics-services-api-4ikv.onrender.com/api');

// Log the API base URL for debugging
console.log('Using API base URL:', API_BASE_URL);

// Function to check if the API is available
const checkApiAvailability = async () => {
  try {
    console.log('Checking API availability...');
    // API_BASE_URL already includes /api, so we just need to append /healthz
    const response = await fetch(`${API_BASE_URL}/healthz`, {
      method: 'GET',
      mode: 'no-cors' // This allows us to at least attempt the request even if CORS blocks it
    });
    console.log('API health check response status:', response.status);
    return true;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

// Run the check when the module loads
checkApiAvailability();

// Configure axios defaults for all requests
axios.defaults.timeout = 15000; // 15 seconds timeout

// Cache for API responses to reduce duplicate requests
const apiCache = {
  vendorRates: null,
  vendorRatesTimestamp: null,
  pendingVendorRatesPromise: null,
  vendors: null,
  vendorsTimestamp: null,
  pendingVendorsPromise: null
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

export const searchQuotations = async (params) => {
  // Add max_results parameter to get all available results
  const searchParams = {
    ...params,
    max_results: 1000  // Request up to 1000 results
  };
  const response = await axios.post(`${API_BASE_URL}/quotations/search`, searchParams);
  return response.data;
};

export const getDashboardAnalytics = async () => {
  const response = await axios.get(`${API_BASE_URL}/analytics/dashboard`);
  return response.data;
};

// Cached and throttled vendor rates API
export const getVendorRates = async () => {
  // Check if we have a valid cached response
  const now = Date.now();
  if (apiCache.vendorRates && apiCache.vendorRatesTimestamp && 
      (now - apiCache.vendorRatesTimestamp < CACHE_EXPIRY)) {
    console.log('Using cached vendor rates data');
    return apiCache.vendorRates;
  }
  
  // If there's already a pending request, return that promise
  if (apiCache.pendingVendorRatesPromise) {
    console.log('Reusing pending vendor rates request');
    return apiCache.pendingVendorRatesPromise;
  }
  
  // Create a new request promise
  console.log(`Fetching vendor rates from: ${API_BASE_URL}/vendor-rates`);
  apiCache.pendingVendorRatesPromise = new Promise(async (resolve) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vendor-rates`, {
        timeout: 30000, // 30 seconds timeout for this large dataset
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('Vendor rates API Response:', response.data);
      
      // Cache the successful response
      apiCache.vendorRates = response.data;
      apiCache.vendorRatesTimestamp = Date.now();
      resolve(response.data);
    } catch (error) {
      console.error('Error fetching vendor rates:', error);
      const errorResponse = { 
        success: false, 
        rates: [], 
        error: error.message 
      };
      resolve(errorResponse); // Resolve with error response rather than rejecting
    } finally {
      // Clear the pending promise after a short delay
      setTimeout(() => {
        apiCache.pendingVendorRatesPromise = null;
      }, 1000);
    }
  });
  
  return apiCache.pendingVendorRatesPromise;
};

// Get all vendors
export const getVendors = async () => {
  // Check if we have a valid cached response
  const now = Date.now();
  if (apiCache.vendors && apiCache.vendorsTimestamp && 
      (now - apiCache.vendorsTimestamp < CACHE_EXPIRY)) {
    console.log('Using cached vendors data');
    return apiCache.vendors;
  }
  
  // If there's already a pending request, return that promise
  if (apiCache.pendingVendorsPromise) {
    console.log('Reusing pending vendors request');
    return apiCache.pendingVendorsPromise;
  }
  
  // Create a new request promise
  console.log(`Fetching vendors from: ${API_BASE_URL}/vendors`);
  apiCache.pendingVendorsPromise = new Promise(async (resolve) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vendors`);
      
      console.log('Vendors API Response:', response.data);
      
      // Cache the successful response
      apiCache.vendors = response.data;
      apiCache.vendorsTimestamp = Date.now();
      resolve(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      const errorResponse = { 
        success: false, 
        vendors: [], 
        error: error.message 
      };
      resolve(errorResponse); // Resolve with error response rather than rejecting
    } finally {
      // Clear the pending promise after a short delay
      setTimeout(() => {
        apiCache.pendingVendorsPromise = null;
      }, 1000);
    }
  });
  
  return apiCache.pendingVendorsPromise;
};
