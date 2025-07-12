import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

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
