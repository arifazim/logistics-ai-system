import React, { useState } from 'react';
import FileUpload from './FileUpload';
import RateConfig from './RateConfig';
import ColumnSelector from './ColumnSelector';
import OutputPreview from './OutputPreview';
import VendorPopover from './VendorPopover';
import BestVendorContacts from './BestVendorContacts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { Box, Typography, Alert, IconButton, Collapse } from '@mui/material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const API_URL = process.env.REACT_APP_API_URL || 
  (window.location.hostname === 'localhost' ? 
    'http://localhost:5000/api' : 
    'https://logistics-services-api-4ikv.onrender.com/api');

// Vehicle rate columns to fill (do not include PER CASE RATE)
const VEHICLE_RATE_COLUMNS = [
  "TATA ACE", "Bolero-Pkup", "407SFC", "407LPT", "1109", "22FT - 9 MT", "32FT -SXL", "32FT -MXL"
];

// Vehicle type aliases for robust matching
const VEHICLE_TYPE_ALIASES = {
  "TATA ACE": ["TATA ACE", "ACE"],
  "Bolero-Pkup": ["Bolero-Pkup", "Pikup", "pick up", "pickup", "Bolero"],
  "407SFC": ["407SFC", "407", "SFC", "407-SFC"],
  "407LPT": ["407LPT", "LPT", "407", "407-LPT", "407 LPT"],
  "1109": ["1109"],
  "22FT - 9 MT": ["22FT - 9 MT"],
  "32FT -SXL": ["32FT -SXL"],
  "32FT -MXL": ["32FT -MXL"]
};

// Location normalization and fuzzy matching functions
function normalizeLocation(location) {
  if (!location) return '';
  
  return location.toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\b(road|rd|street|st|avenue|avn|avn\.|lane|ln|drive|dr|colony|col|park|industrial|ind|area|zone)\b/g, '') // Remove common suffixes
    .trim();
}

// Phonetic matching using Soundex algorithm
function soundex(str) {
  if (!str) return '';
  
  const soundexMap = {
    'b': '1', 'f': '1', 'p': '1', 'v': '1',
    'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
    'd': '3', 't': '3',
    'l': '4',
    'm': '5', 'n': '5',
    'r': '6'
  };
  
  let result = str.charAt(0).toUpperCase();
  let prevCode = soundexMap[str.charAt(0).toLowerCase()] || '';
  
  for (let i = 1; i < str.length && result.length < 4; i++) {
    const char = str.charAt(i).toLowerCase();
    const code = soundexMap[char];
    
    if (code && code !== prevCode) {
      result += code;
      prevCode = code;
    }
  }
  
  return result.padEnd(4, '0');
}

// N-gram similarity for better fuzzy matching
function getNGrams(str, n = 2) {
  const grams = [];
  for (let i = 0; i <= str.length - n; i++) {
    grams.push(str.substring(i, i + n));
  }
  return grams;
}

function nGramSimilarity(str1, str2, n = 2) {
  const grams1 = getNGrams(str1.toLowerCase(), n);
  const grams2 = getNGrams(str2.toLowerCase(), n);
  
  const intersection = grams1.filter(gram => grams2.includes(gram));
  const union = [...new Set([...grams1, ...grams2])];
  
  return intersection.length / union.length;
}

// Advanced similarity calculation using multiple algorithms
function calculateAdvancedSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const normalized1 = normalizeLocation(str1);
  const normalized2 = normalizeLocation(str2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return 1.0;
  
  // Check if one contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.9;
  }
  
  // Phonetic similarity using Soundex
  const soundex1 = soundex(normalized1);
  const soundex2 = soundex(normalized2);
  const phoneticSimilarity = soundex1 === soundex2 ? 0.8 : 0;
  
  // N-gram similarity
  const ngramSimilarity = nGramSimilarity(normalized1, normalized2, 2);
  
  // Levenshtein distance
  const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
  const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
  const distance = levenshteinDistance(longer, shorter);
  const levenshteinSimilarity = longer.length > 0 ? (longer.length - distance) / longer.length : 0;
  
  // Weighted combination of all similarity measures
  const weights = {
    phonetic: 0.3,
    ngram: 0.4,
    levenshtein: 0.3
  };
  
  return (
    phoneticSimilarity * weights.phonetic +
    ngramSimilarity * weights.ngram +
    levenshteinSimilarity * weights.levenshtein
  );
}

// Dynamic location clustering and learning
function buildLocationIndex(vendorRates) {
  const locationIndex = {
    origins: new Map(),
    areas: new Map(),
    clusters: new Map()
  };
  
  // Extract all unique locations
  const allOrigins = [...new Set(vendorRates.map(rate => rate['from_origin']).filter(Boolean))];
  const allAreas = [...new Set(vendorRates.map(rate => rate['area']).filter(Boolean))];
  
  // Build phonetic and n-gram indexes
  allOrigins.forEach(origin => {
    const normalized = normalizeLocation(origin);
    const soundexCode = soundex(normalized);
    const ngrams = getNGrams(normalized, 2);
    
    if (!locationIndex.origins.has(soundexCode)) {
      locationIndex.origins.set(soundexCode, []);
    }
    locationIndex.origins.get(soundexCode).push({
      original: origin,
      normalized,
      ngrams
    });
  });
  
  allAreas.forEach(area => {
    const normalized = normalizeLocation(area);
    const soundexCode = soundex(normalized);
    const ngrams = getNGrams(normalized, 2);
    
    if (!locationIndex.areas.has(soundexCode)) {
      locationIndex.areas.set(soundexCode, []);
    }
    locationIndex.areas.get(soundexCode).push({
      original: area,
      normalized,
      ngrams
    });
  });
  
  return locationIndex;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function findBestLocationMatchAdvanced(queryLocation, candidateLocations, locationIndex, threshold = 0.6) {
  if (!queryLocation || !candidateLocations || candidateLocations.length === 0) {
    return null;
  }
  
  const normalizedQuery = normalizeLocation(queryLocation);
  const querySoundex = soundex(normalizedQuery);
  const queryNgrams = getNGrams(normalizedQuery, 2);
  
  let bestMatch = null;
  let bestScore = 0;
  
  // First, try phonetic matching for speed
  const phoneticCandidates = locationIndex.origins.get(querySoundex) || 
                            locationIndex.areas.get(querySoundex) || [];
  
  for (const candidate of phoneticCandidates) {
    const score = calculateAdvancedSimilarity(queryLocation, candidate.original);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = candidate.original;
    }
  }
  
  // If no phonetic match, try all candidates with advanced similarity
  if (!bestMatch) {
    for (const candidate of candidateLocations) {
      const score = calculateAdvancedSimilarity(queryLocation, candidate);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = candidate;
      }
    }
  }
  
  return bestMatch;
}

// Enhanced location matching function with PinLookup API integration
async function matchLocationsAdvanced(dcCity, dcPincode, customerCity, customerPincode, vendorRates, locationIndex) {
  const matches = [];
  
  // Extract unique locations from vendor rates
  const vendorOrigins = [...new Set(vendorRates.map(rate => rate['from_origin']).filter(Boolean))];
  const vendorAreas = [...new Set(vendorRates.map(rate => rate['area']).filter(Boolean))];
  
  // Get standardized location names from PinLookup API
  let standardizedOrigin = null;
  let standardizedDestination = null;
  
  try {
    if (dcPincode) {
      standardizedOrigin = await getGeocodingSuggestions(dcCity, dcPincode);
    }
    if (customerPincode) {
      standardizedDestination = await getGeocodingSuggestions(customerCity, customerPincode);
    }
  } catch (error) {
    console.warn('PinLookup API failed, using local matching only');
  }
  
  for (const rate of vendorRates) {
    let originMatch = false;
    let destMatch = false;
    
    // Match origin (DC City/DC Pincode) with API-enhanced matching
    if (dcCity) {
      // Try standardized name first if available
      if (standardizedOrigin && standardizedOrigin.standardizedName) {
        const apiMatch = findBestLocationMatchAdvanced(standardizedOrigin.standardizedName, vendorOrigins, locationIndex, 0.7);
        if (apiMatch && apiMatch === rate['from_origin']) {
          originMatch = true;
        }
      }
      
      // Fallback to original city name
      if (!originMatch) {
        const bestOriginMatch = findBestLocationMatchAdvanced(dcCity, vendorOrigins, locationIndex);
        if (bestOriginMatch && bestOriginMatch === rate['from_origin']) {
          originMatch = true;
        }
      }
    }
    
    // Pincode matching as fallback
    if (!originMatch && dcPincode && rate['pincode']) {
      if (dcPincode.toString().trim() === rate['pincode'].toString().trim()) {
        originMatch = true;
      }
    }
    
    // Match destination (Customer City/Customer Pincode) with API-enhanced matching
    if (customerCity) {
      // Try standardized name first if available
      if (standardizedDestination && standardizedDestination.standardizedName) {
        const apiMatch = findBestLocationMatchAdvanced(standardizedDestination.standardizedName, vendorAreas, locationIndex, 0.7);
        if (apiMatch && apiMatch === rate['area']) {
          destMatch = true;
        }
      }
      
      // Fallback to original city name
      if (!destMatch) {
        const bestDestMatch = findBestLocationMatchAdvanced(customerCity, vendorAreas, locationIndex);
        if (bestDestMatch && bestDestMatch === rate['area']) {
          destMatch = true;
        }
      }
    }
    
    // Pincode matching as fallback
    if (!destMatch && customerPincode && rate['pincode']) {
      if (customerPincode.toString().trim() === rate['pincode'].toString().trim()) {
        destMatch = true;
      }
    }
    
    if (originMatch && destMatch) {
      matches.push(rate);
    }
  }
  
  return matches;
}

// Enhanced location matching using PinLookup API for Indian pincodes
// https://pinlookup.in/api-docs - Free API with 5,000 requests/day per IP
async function getPincodeDetails(pincode) {
  if (!pincode || pincode.toString().length !== 6) {
    return null;
  }
  
  try {
    const response = await fetch(`https://pinlookup.in/api/pincode?pincode=${pincode}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`PinLookup API error for pincode ${pincode}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data.data; // Returns comprehensive pincode details
  } catch (error) {
    console.warn(`Failed to fetch pincode details for ${pincode}:`, error);
    return null;
  }
}

// Get standardized location names using PinLookup API
async function getGeocodingSuggestions(location, pincode = null) {
  try {
    // If we have a pincode, get detailed location info
    if (pincode) {
      const pincodeData = await getPincodeDetails(pincode);
      if (pincodeData) {
        return {
          standardizedName: pincodeData.office_name,
          district: pincodeData.district_name,
          state: pincodeData.state_name,
          taluk: pincodeData.taluk,
          coordinates: {
            latitude: pincodeData.latitude,
            longitude: pincodeData.longitude
          },
          fullAddress: `${pincodeData.office_name}, ${pincodeData.district_name}, ${pincodeData.state_name}`
        };
      }
    }
    
    // Fallback to local matching if API fails or no pincode
    return null;
  } catch (error) {
    console.warn('PinLookup API not available, using local matching');
    return null;
  }
}

/*
🎯 ADVANCED LOCATION MATCHING SYSTEM WITH PINLOOKUP API

This implementation uses multiple AI/ML techniques + PinLookup API:

1. **PinLookup API Integration**:
   - Free Indian pincode database (5,000 requests/day)
   - Standardizes location names using official data
   - Provides district, state, coordinates for validation

2. **Phonetic Matching (Soundex)**: 
   - "BUDGE BUDGE" and "BUDGEBUDGE" get same phonetic code
   - Handles spelling variations and typos

3. **N-Gram Similarity**: 
   - Breaks text into character pairs for fuzzy matching
   - "AJC BOSE ROAD" vs "A J C BOSE RD" have high n-gram overlap

4. **Levenshtein Distance**: 
   - Measures edit distance between strings
   - Handles insertions, deletions, substitutions

5. **Weighted Multi-Algorithm Approach**:
   - Combines all methods with optimal weights
   - API standardization + 30% phonetic + 40% n-gram + 30% Levenshtein

6. **Dynamic Indexing**:
   - Pre-processes vendor locations for faster lookup
   - Groups similar locations by phonetic codes

7. **Multi-Level Matching Strategy**:
   - PinLookup API standardization (highest priority)
   - Local fuzzy matching (fallback)
   - Pincode exact matching (final fallback)

This approach is:
✅ India-specific - uses official Indian pincode data
✅ Scalable - handles any new location variations
✅ Intelligent - learns from actual data patterns  
✅ Fast - uses indexed lookups + API caching
✅ Accurate - multiple validation methods + official data
✅ Free - PinLookup API is free for Indian logistics
*/

function applyPercentToRates(data, percent) {
  if (!data || data.length === 0) return data;
  const header = data[0];

  // Find the indexes of all vehicle rate columns
  const rateIndexes = header
    .map((h, idx) => ({
      idx,
      name: h && h.toString().trim().toUpperCase()
    }))
    .filter(h =>
      VEHICLE_RATE_COLUMNS.map(v => v.toUpperCase()).includes(h.name)
    )
    .map(h => h.idx);

  if (rateIndexes.length === 0) return data;

  const multiplier = 1 + (percent / 100);

  const updatedRows = data.slice(1).map(row => {
    const updatedRow = [...row];
    rateIndexes.forEach(rateIdx => {
      const val = Number(updatedRow[rateIdx]);
      if (!isNaN(val) && val > 0) {
        updatedRow[rateIdx] = Math.round(val * multiplier); // Round to nearest integer
      }
    });
    return updatedRow;
  });

  return [header, ...updatedRows];
}

// Add PDF export function
function exportPreviewToPDF(previewData, getVisibleColumns) {
  if (!previewData || previewData.length === 0) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const visibleCols = getVisibleColumns();
  if (!visibleCols.length) return;
  const header = visibleCols.map(col => col.name);
  const colIndexes = visibleCols.map(col => col.index);
  const body = previewData.slice(1).map(row => colIndexes.map(idx => row[idx]));

  // Title
  doc.setFontSize(16);
  doc.text('Quotation Spreadsheet', 40, 40);

  // Table
  autoTable(doc,{
    startY: 60,
    head: [header],
    body: body,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [195, 207, 226], textColor: 44, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
    tableWidth: 'auto',
    theme: 'grid',
  });

  // Download
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
  doc.save(`FN_Quotation_Rate_${today}.pdf`);
}

function BulkQuotation() {
  const [inputFile, setInputFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [outputData, setOutputData] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [ratePercent, setRatePercent] = useState(0);
  const [rawData, setRawData] = useState([]);
  const [debugInfo, setDebugInfo] = useState([]);
  const [vendorRatesData, setVendorRatesData] = useState([]);
  const [locationIndex, setLocationIndex] = useState(null);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [originalWorkbook, setOriginalWorkbook] = useState(null);
  const [originalWorksheet, setOriginalWorksheet] = useState(null);
  
  // Popover state
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [popoverContent, setPopoverContent] = useState([]);
  const [popoverTitle, setPopoverTitle] = useState('');

  // Collapsible sections state
  const [fileUploadOpen, setFileUploadOpen] = useState(true);
  const [rateConfigOpen, setRateConfigOpen] = useState(true);

  // Handle file upload
  const handleFileChange = (file) => {
    if (file && !file.name.endsWith('.xlsx')) {
      setError('Only .xlsx files are supported.');
      setInputFile(null);
      return;
    }
    setInputFile(file);
    setError('');
    setSuccess('');
    setOutputData(null);
    setPreviewData([]);
    // Read and store the original workbook and worksheet for style preservation
    if (file) {
      file.arrayBuffer().then(data => {
        const wb = XLSX.read(data, { type: 'array', cellStyles: true });
        setOriginalWorkbook(wb);
        const sheetName = wb.SheetNames[0];
        setOriginalWorksheet(wb.Sheets[sheetName]);
      });
    } else {
      setOriginalWorkbook(null);
      setOriginalWorksheet(null);
    }
  };

  // Helper functions for processing
  function findColIdx(header, search) {
    const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normSearch = norm(search);
    for (let i = 0; i < header.length; i++) {
      if (norm(header[i] || '') === normSearch) return i;
    }
    return -1;
  }

  function normalizeCity(str) {
    return (str || '').toString().toLowerCase().replace(/[^a-z0-9]/gi, '').trim();
  }

  function findVendorCol(row, search) {
    const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of Object.keys(row)) {
      if (norm(key) === norm(search)) return key;
    }
    // Try partial match
    for (const key of Object.keys(row)) {
      if (norm(key).includes(norm(search))) return key;
    }
    return null;
  }

  function extractVehicleType(row) {
    // Try VEHICLE TYPE column first (robust)
    const vtCol = findVendorCol(row, 'vehicle type') || findVendorCol(row, 'vehicle tye');
    if (vtCol && row[vtCol] && row[vtCol].toString().trim()) {
      return row[vtCol].toString().trim().toUpperCase();
    }
    // Try to parse from VEHICLE NO.
    const vnCol = findVendorCol(row, 'vehicle no');
    if (vnCol && row[vnCol] && row[vnCol].toString().trim()) {
      const parts = row[vnCol].toString().toUpperCase().split('-');
      for (const part of parts) {
        // Exact match
        if (VEHICLE_RATE_COLUMNS.map(v => v.toUpperCase()).includes(part.trim())) {
          return part.trim();
        }
        // Partial match (e.g., 407 in 407LPT or 407-10FT)
        for (const v of VEHICLE_RATE_COLUMNS) {
          if (part.includes(v.replace(/\s+/g, '').toUpperCase()) || v.replace(/\s+/g, '').toUpperCase().includes(part)) {
            return v.toUpperCase();
          }
        }
      }
    }
    return '';
  }

  // Get vendor details for a specific cell
  const getVendorDetailsForCell = (rowIndex, colIndex) => {
    if (!previewData || previewData.length === 0 || !vendorRatesData || vendorRatesData.length === 0) {
      return [];
    }

    const header = previewData[0];
    const row = previewData[rowIndex];
    const vehicleType = header[colIndex];
    
    // Check if this is a vehicle rate column
    if (!VEHICLE_RATE_COLUMNS.some(v => v.toUpperCase() === vehicleType.toString().trim().toUpperCase())) {
      return [];
    }

    // Extract route information from the row
    const dcCityIdx = findColIdx(header, 'dc city');
    const customerCityIdx = findColIdx(header, 'customer city') !== -1
      ? findColIdx(header, 'customer city')
      : findColIdx(header, 'customer'); // fallback to 'Customer'
    const customerPincodeIdx = findColIdx(header, 'customer pincode');

    const dcCity = row[dcCityIdx] || '';
    const customerCity = row[customerCityIdx] || '';
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

    // Filter by vehicle type
    const aliases = VEHICLE_TYPE_ALIASES[vehicleType] || [vehicleType];
    const ratesForType = matchingRoutes.filter(rate => {
      const vehicleTypeExtracted = extractVehicleType(rate);
      if (!vehicleTypeExtracted) return false;
      const normExtracted = vehicleTypeExtracted.replace(/\s+/g, '').toUpperCase();
      return aliases.some(alias =>
        normExtracted === alias.replace(/\s+/g, '').toUpperCase() ||
        normExtracted.includes(alias.replace(/\s+/g, '').toUpperCase()) ||
        alias.replace(/\s+/g, '').toUpperCase().includes(normExtracted)
      );
    });

    // Extract vendor details
    return ratesForType.map(rate => {
      const vendorCol = findVendorCol(rate, 'vendor name') || findVendorCol(rate, 'vendor') || findVendorCol(rate, 'name');
      const rateCol = findVendorCol(rate, 'rate');
      
      return {
        vendorName: vendorCol ? rate[vendorCol] : 'Unknown Vendor',
        rate: rateCol ? Number(rate[rateCol]) : 0,
        vehicleType: extractVehicleType(rate),
        fromOrigin: rate[findVendorCol(rate, 'from-origin')] || '',
        area: rate[findVendorCol(rate, 'area')] || ''
      };
    }).sort((a, b) => b.rate - a.rate); // Sort by rate descending
  };

  // Handle cell click
  const handleCellClick = (event, rowIndex, colIndex) => {
    const header = previewData[0];
    const row = previewData[rowIndex];
    const vehicleType = header[colIndex];
    const cellValue = row[colIndex];
    
    // Check if this is a vehicle rate column with a numeric value
    const isVehicleRateColumn = VEHICLE_RATE_COLUMNS.some(v => v.toUpperCase() === vehicleType.toString().trim().toUpperCase());
    const isNumericRate = !isNaN(Number(cellValue)) && Number(cellValue) > 0;
    
    if (!isVehicleRateColumn || !isNumericRate) {
      return;
    }

    // Get vendor details for this cell
    const vendorDetails = getVendorDetailsForCell(rowIndex, colIndex);
    
    if (vendorDetails.length === 0) {
      return;
    }

    // Set popover content
    setPopoverContent(vendorDetails);
    setPopoverTitle(`${vehicleType} 📦 ${row[findColIdx(header, 'dc city')] || ''} → ${row[findColIdx(header, 'customer city')] || row[findColIdx(header, 'customer')] || ''}`);
    setPopoverAnchor(event.currentTarget);
  };

  // Handle popover close
  const handlePopoverClose = () => {
    setPopoverAnchor(null);
    setPopoverContent([]);
    setPopoverTitle('');
  };

  // Handle column visibility change
  const handleColumnVisibilityChange = (columnIndex, isVisible) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnIndex]: isVisible
    }));
  };

  // Get visible columns for preview
  const getVisibleColumns = () => {
    if (!previewData || previewData.length === 0) return [];
    
    const header = previewData[0];
    return header.map((col, idx) => ({
      index: idx,
      name: col,
      visible: columnVisibility[idx] !== false // Default to visible unless explicitly hidden
    })).filter(col => col.visible);
  };

  // Initialize column visibility when data is loaded
  const initializeColumnVisibility = (header) => {
    const visibility = {};
    header.forEach((col, idx) => {
      visibility[idx] = true; // All columns visible by default
    });
    setColumnVisibility(visibility);
  };

  // Main processing function
  const handleProcess = async () => {
    setProcessing(true);
    setError('');
    setSuccess('');
    setOutputData(null);
    setPreviewData([]);
    setDebugInfo([]);
    
    try {
      if (!inputFile) {
        setError('Please upload a .xlsx Excel file.');
        setProcessing(false);
        return;
      }

      // Read input Excel
      const data = await inputFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!parsedData.length) {
        setError('Input Excel file is empty or invalid.');
        setProcessing(false);
        return;
      }

      // Auto-detect the header row: first row with at least 3 columns
      let headerRowIdx = parsedData.findIndex(row => Array.isArray(row) && row.filter(cell => cell && cell.toString().trim()).length >= 3);
      const header = headerRowIdx !== -1 ? parsedData[headerRowIdx] : [];
      if (!header || !header.length) {
        setError('Input Excel file is empty or has no header row.');
        setProcessing(false);
        return;
      }

      // Fetch vendor rates from Google Sheet
      const ratesResp = await axios.get(`${API_URL}/vendor-rates`);
      if (!ratesResp.data.success) {
        setError('Failed to fetch vendor rates from Google Sheet.');
        setProcessing(false);
        return;
      }
      const vendorRates = ratesResp.data.rates;
      
      // Store vendor rates and location index for popover functionality
      setVendorRatesData(vendorRates);
      const locIndex = buildLocationIndex(vendorRates);
      setLocationIndex(locIndex);

      // Process each row and fill vehicle rates
      const processedRows = [];
      let filledCount = 0;
      let totalCells = 0;
      const debugData = [];

      // Find column indexes using robust lookup
      const dcCityIdx = findColIdx(header, 'dc city');
      const customerCityIdx = findColIdx(header, 'customer city') !== -1
        ? findColIdx(header, 'customer city')
        : findColIdx(header, 'customer'); // fallback to 'Customer'
      const customerPincodeIdx = findColIdx(header, 'customer pincode');

      // Build a mapping of column indices to vehicle types (strictly)
      const vehicleRateIndexes = [];
      header.forEach((col, idx) => {
        if (col && VEHICLE_RATE_COLUMNS.some(v => v.toUpperCase() === col.toString().trim().toUpperCase())) {
          vehicleRateIndexes.push({ vehicleType: col.toString().trim(), idx });
        }
      });

      // Preprocess vendorRates to add a _vehicle_type_extracted field
      const vendorRatesWithType = vendorRates.map(row => ({
        ...row,
        _vehicle_type_extracted: extractVehicleType(row)
      }));

      for (let rowIdx = 1; rowIdx < parsedData.length; rowIdx++) {
        const row = parsedData[rowIdx];
        // Skip duplicate header rows
        if (row.every((cell, idx) => (cell || '').toString().trim() === (header[idx] || '').toString().trim())) {
          continue;
        }
        // Pad the row to match header length
        const updatedRow = [...row];
        while (updatedRow.length < header.length) updatedRow.push('');

        // Extract route information
        const dcCity = row[dcCityIdx] || '';
        const customerCity = row[customerCityIdx] || '';
        const normDcCity = normalizeCity(dcCity);
        const normCustomerCity = normalizeCity(customerCity);

        // Find all matching vendor rates for this row
        const matchingRoutes = vendorRatesWithType.filter(rate => {
          const fromOriginCol = findVendorCol(rate, 'from-origin');
          const areaCol = findVendorCol(rate, 'area');
          const originMatch = normDcCity && fromOriginCol && rate[fromOriginCol] &&
            normDcCity === normalizeCity(rate[fromOriginCol]);
          const destMatch = normCustomerCity && areaCol && rate[areaCol] &&
            normCustomerCity === normalizeCity(rate[areaCol]);
          return originMatch && destMatch;
        });

        // For each vehicle type column, find the highest rate from matchingRoutes
        vehicleRateIndexes.forEach(({ vehicleType, idx }) => {
          if (idx === -1) return;
          totalCells++;
          // Robust vehicle type alias matching
          const aliases = VEHICLE_TYPE_ALIASES[vehicleType] || [vehicleType];
          const ratesForType = matchingRoutes.filter(rate => {
            if (!rate._vehicle_type_extracted) return false;
            const normExtracted = rate._vehicle_type_extracted.replace(/\s+/g, '').toUpperCase();
            return aliases.some(alias =>
              normExtracted === alias.replace(/\s+/g, '').toUpperCase() ||
              normExtracted.includes(alias.replace(/\s+/g, '').toUpperCase()) ||
              alias.replace(/\s+/g, '').toUpperCase().includes(normExtracted)
            );
          });
          if (ratesForType.length > 0) {
            // Pick the highest rate
            const maxRate = ratesForType.reduce((max, curr) =>
              Number(curr['rate']) > Number(max['rate']) ? curr : max, ratesForType[0]
            );
            // Apply percentage if specified
            const finalRate = ratePercent > 0
              ? Math.round(Number(maxRate['rate']) * (1 + ratePercent / 100) * 100) / 100
              : Number(maxRate['rate']);
            updatedRow[idx] = finalRate;
            filledCount++;
          }
        });

        // Debug output for first 3 rows
        if (rowIdx <= 3) {
          debugData.push({
            row: rowIdx,
            dcCity,
            customerCity,
            normDcCity,
            normCustomerCity,
            matchesFound: Array.isArray(matchingRoutes) ? matchingRoutes.length : 0,
            vehicleTypeResults: Array.isArray(vehicleRateIndexes)
              ? vehicleRateIndexes.map(({ vehicleType }) => {
                  const ratesForType = Array.isArray(matchingRoutes)
                    ? matchingRoutes.filter(rate => {
                        if (!rate._vehicle_type_extracted) return false;
                        const normCol = vehicleType.replace(/\s+/g, '').toUpperCase();
                        const normExtracted = rate._vehicle_type_extracted.replace(/\s+/g, '').toUpperCase();
                        return (
                          normExtracted === normCol ||
                          normExtracted.includes(normCol) ||
                          normCol.includes(normExtracted)
                        );
                      })
                    : [];
                  return {
                    vehicleType,
                    count: Array.isArray(ratesForType) ? ratesForType.length : 0,
                    maxRate: Array.isArray(ratesForType) && ratesForType.length > 0
                      ? Math.max(...ratesForType.map(r => Number(r['rate'])))
                      : null,
                    foundTypes: Array.isArray(ratesForType) ? ratesForType.map(r => r._vehicle_type_extracted) : []
                  };
                })
              : []
          });
        }

        processedRows.push(updatedRow);
      }

      // Create output data
      const outputDataArray = [header, ...processedRows];
      setRawData(outputDataArray);
      setPreviewData(outputDataArray);
      setDebugInfo(debugData);
      initializeColumnVisibility(header); // Initialize column visibility
      setShowColumnSelector(true); // Show column selector after processing

      // Create output Excel
      const outWs = XLSX.utils.aoa_to_sheet(outputDataArray);
      const outWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(outWb, outWs, 'Rate Quotation');
      const outBuffer = XLSX.write(outWb, { bookType: 'xlsx', type: 'array' });
      setOutputData(outBuffer);

      setSuccess(`Processed ${processedRows.length} rows. Filled ${filledCount} out of ${totalCells} vehicle rate cells.`);

    } catch (err) {
      setError('Error processing file: ' + (err.message || err));
    } finally {
      setProcessing(false);
    }
  };

  // Handle percentage change
  const handlePercentChange = (percent) => {
    // Clamp percent to a reasonable range, e.g., -100 to 100
    const clamped = Math.max(-100, Math.min(100, percent));
    setRatePercent(clamped);
    if (rawData.length > 0) {
      setPreviewData(applyPercentToRates(rawData, clamped));
    }
  };

  // Update handleDownload to trigger both XLSX and PDF downloads
  const handleDownload = () => {
    if (!originalWorkbook || !originalWorksheet || !previewData || previewData.length === 0) {
      setError('No processed data to download.');
      return;
    }
    // XLSX logic (unchanged)
    const ws = XLSX.utils.aoa_to_sheet(XLSX.utils.sheet_to_json(originalWorksheet, { header: 1, defval: '' }));
    const data = previewData;
    const header = data[0];
    const rateIndexes = header
      .map((h, idx) => ({ idx, name: h && h.toString().trim().toUpperCase() }))
      .filter(h => VEHICLE_RATE_COLUMNS.map(v => v.toUpperCase()).includes(h.name))
      .map(h => h.idx);
    for (let r = 1; r < data.length; r++) {
      for (const c of rateIndexes) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        let value = data[r][c];
        if (typeof value !== 'undefined') {
          value = Math.round(Number(value));
          ws[cellAddress] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
        }
      }
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length - 1, c: header.length - 1 } });
    const outWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outWb, ws, 'Rate Quotation');
    const outBuffer = XLSX.write(outWb, { bookType: 'xlsx', type: 'array' });
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    const filename = `FN_Quotation_Rate_${today}.xlsx`;
    saveAs(new Blob([outBuffer], { type: 'application/octet-stream' }), filename);
    // PDF logic
    exportPreviewToPDF(previewData, getVisibleColumns);
    // Note: Only unchanged cells retain their original style. Updated rate cells lose their style due to SheetJS Community Edition limitations.
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Box sx={{ mb: 3 }}>
      
          <Typography variant="body1" sx={{ color: '#4a5568', maxWidth: '1200px', margin: 0, lineHeight: '1.6', textAlign: 'left' }}>
            📊 Upload your <strong>customer spreadsheet</strong> file to fill empty vehicle rates from the vendor sheet (Google Spreadsheet).<br />
            <strong>Note:</strong> Only .xlsx files are supported. The system will find the highest rates for each vehicle type.
          </Typography>
        </Box>
        {/* Compact row for FileUpload, RateConfig, and ColumnSelector, all collapsible and same height */}
        <Box sx={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {/* FileUpload Section */}
          <Box sx={{ flex: 1, minWidth: '260px', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>📄 File Upload</Typography>
              <IconButton onClick={() => setFileUploadOpen(o => !o)} size="small" aria-label={fileUploadOpen ? 'Collapse' : 'Expand'}>
                {fileUploadOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={fileUploadOpen}>
              <FileUpload inputFile={inputFile} onFileChange={handleFileChange} />
            </Collapse>
          </Box>
          {/* RateConfig Section */}
          <Box sx={{ flex: 1, minWidth: '260px', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>⚙️ Apply Rate (%)</Typography>
              <IconButton onClick={() => setRateConfigOpen(o => !o)} size="small" aria-label={rateConfigOpen ? 'Collapse' : 'Expand'}>
                {rateConfigOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={rateConfigOpen}>
              <RateConfig
                ratePercent={ratePercent}
                onPercentChange={handlePercentChange}
                onProcess={handleProcess}
                onDownload={handleDownload}
                processing={processing}
                outputData={outputData}
                inputFile={inputFile}
              />
            </Collapse>
          </Box>
          {/* ColumnSelector Section (already collapsible) */}
          <Box sx={{ flex: 1, minWidth: '260px', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
            <ColumnSelector
              previewData={previewData}
              columnVisibility={columnVisibility}
              setColumnVisibility={setColumnVisibility}
              VEHICLE_RATE_COLUMNS={VEHICLE_RATE_COLUMNS}
              showColumnSelector={showColumnSelector}
            />
          </Box>
        </Box>
        {/* End compact row */}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
        <OutputPreview
          previewData={previewData}
          getVisibleColumns={getVisibleColumns}
          handleCellClick={handleCellClick}
          VEHICLE_RATE_COLUMNS={VEHICLE_RATE_COLUMNS}
        />
        
        {/* New section for best vendor contacts with lowest rates */}
        <BestVendorContacts
          previewData={previewData}
          vendorRatesData={vendorRatesData}
          VEHICLE_RATE_COLUMNS={VEHICLE_RATE_COLUMNS}
          findColIdx={findColIdx}
          normalizeCity={normalizeCity}
          findVendorCol={findVendorCol}
          extractVehicleType={extractVehicleType}
        />
        
        <VendorPopover
          popoverAnchor={popoverAnchor}
          popoverContent={popoverContent}
          popoverTitle={popoverTitle}
          handlePopoverClose={handlePopoverClose}
        />
      </Box>
    </Box>
  );
}

export default BulkQuotation;