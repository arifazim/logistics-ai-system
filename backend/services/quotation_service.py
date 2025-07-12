# ================================
# backend/services/quotation_service.py
# ================================
from typing import List, Dict, Optional
import pandas as pd
import logging
from models.data_processor import DataProcessor
from models.ai_engine import AIQuotationEngine
from services.google_sheets import GoogleSheetsService
import time

logger = logging.getLogger(__name__)

class QuotationService:
    def __init__(self, sheets_service: GoogleSheetsService, ai_engine: AIQuotationEngine):
        self.sheets_service = sheets_service
        self.ai_engine = ai_engine
        self.data_processor = DataProcessor()
        self.cached_data = None
        self.cache_timestamp = 0
        self.cache_ttl = 300  # 5 minutes
    
    def _get_fresh_data(self) -> pd.DataFrame:
        """Get fresh data with caching"""
        current_time = time.time()
        
        if (self.cached_data is None or 
            current_time - self.cache_timestamp > self.cache_ttl):
            
            logger.info("Fetching fresh data from Google Sheets")
            raw_data = self.sheets_service.get_data()
            
            if raw_data is not None:
                self.cached_data = self.data_processor.clean_data(raw_data)
                self.cache_timestamp = current_time
            else:
                logger.error("Failed to fetch data")
                return pd.DataFrame()
        
        return self.cached_data
    
    def get_quotations(self, from_location: str, to_location: str, 
                      vehicle_type: Optional[str] = None, 
                      max_results: int = 1000) -> Dict:
        """Get quotations based on search criteria"""
        try:
            df = self._get_fresh_data()
            
            if df.empty:
                return {'max_rate': None, 'other_rates': []}
            
            # Filter data based on criteria
            filtered_routes = []
            
            # Get all potential origin matches
            origins = df['from_origin'].dropna().unique().tolist()
            origin_matches = self.ai_engine.match_location(from_location, origins)
            
            # Get all potential destination matches
            destinations = df['area'].dropna().unique().tolist()
            destination_matches = self.ai_engine.match_location(to_location, destinations)
            
            if not origin_matches and not destination_matches:
                logger.warning(f"No location matches found for {from_location} -> {to_location}")
                return {'max_rate': None, 'other_rates': []}
            
            # Filter dataframe based on matches
            matched_routes = df.copy()
            
            if origin_matches:
                matched_origins = [match[0] for match in origin_matches]  # All matches
                matched_routes = matched_routes[matched_routes['from_origin'].isin(matched_origins)]
            
            if destination_matches:
                matched_destinations = [match[0] for match in destination_matches]  # All matches
                matched_routes = matched_routes[matched_routes['area'].isin(matched_destinations)]

            if vehicle_type:
                matched_routes = matched_routes[
                    matched_routes['vehicle_type'].str.lower() == vehicle_type.lower()
                ]

            # Apply max_results limit only if specified and reasonable
            if max_results and max_results < 10000:  # Allow up to 10,000 results
                matched_routes = matched_routes.head(max_results)

            # Build output
            for _, row in matched_routes.iterrows():
                filtered_routes.append({
                    'from_origin': row.get('from_origin', ''),
                    'area': row.get('area', ''),
                    'vehicle_type': row.get('vehicle_type', ''),
                    'rate': row.get('rate', 0),
                    'vendor_name': row.get('vendor_name', ''),
                    'pincode': row.get('pincode', ''),
                    'receiver_name': row.get('receiver_name', ''),
                    'vehicle_no': row.get('vehicle_no', '')
                })

            # Filter out entries with empty or zero rates
            filtered_routes = [r for r in filtered_routes if r['rate'] and r['rate'] > 0]

            if not filtered_routes:
                return {'max_rate': None, 'other_rates': []}

            # Find the entry with the maximum rate
            max_rate_entry = max(filtered_routes, key=lambda x: x['rate'])
            other_rates = [r for r in filtered_routes if r != max_rate_entry]

            return {
                'max_rate': max_rate_entry,
                'other_rates': other_rates,
                'total_found': len(filtered_routes)
            }
        except Exception as e:
            logger.error(f"Error in get_quotations: {str(e)}")
            return {'max_rate': None, 'other_rates': []}

    def get_analytics(self) -> Dict:
        df = self._get_fresh_data()
        if df.empty:
            return {
                'total_routes': 0,
                'total_vendors': 0,
                'avg_rate': 0,
                'route_volume_by_destination': [],
                'avg_rates_by_vehicle_type': [],
                'vendor_performance': []
            }
        return self.data_processor.calculate_analytics(df)