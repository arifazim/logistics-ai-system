# ================================
# backend/models/data_processor.py
# ================================
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self):
        self.data_cache = None
        self.last_update = None
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and standardize the data"""
        try:
            # Make a copy to avoid modifying original
            cleaned_df = df.copy()
            
            # Standardize column names
            column_mapping = {
                'FROM-ORIGIN': 'from_origin',
                'PINCODE': 'pincode',
                'AREA': 'area',
                'RECEIVER NAME': 'receiver_name',
                'VEHICLE NO.': 'vehicle_no',
                'VEHICLE TYE': 'vehicle_type',  # Note: Original has typo
                'RATE': 'rate',
                'VENDOR NAME': 'vendor_name'
            }
            
            # Rename columns if they exist
            for old_name, new_name in column_mapping.items():
                if old_name in cleaned_df.columns:
                    cleaned_df = cleaned_df.rename(columns={old_name: new_name})
            
            # Forward-fill missing from_origin values
            if 'from_origin' in cleaned_df.columns:
                cleaned_df['from_origin'] = cleaned_df['from_origin'].replace('', pd.NA)
                cleaned_df['from_origin'] = cleaned_df['from_origin'].fillna(method='ffill')
            
            # Clean text fields
            text_columns = ['from_origin', 'area', 'receiver_name', 'vendor_name', 'vehicle_type']
            for col in text_columns:
                if col in cleaned_df.columns:
                    cleaned_df[col] = cleaned_df[col].astype(str).str.strip()
                    cleaned_df[col] = cleaned_df[col].replace('nan', '')
                    cleaned_df[col] = cleaned_df[col].replace('#REF!', '')
            
            # Clean numeric fields
            if 'rate' in cleaned_df.columns:
                cleaned_df['rate'] = pd.to_numeric(cleaned_df['rate'], errors='coerce').fillna(0)
            
            if 'pincode' in cleaned_df.columns:
                cleaned_df['pincode'] = cleaned_df['pincode'].astype(str).str.strip()
                cleaned_df['pincode'] = cleaned_df['pincode'].replace('nan', '')
            
            # Remove completely empty rows
            cleaned_df = cleaned_df.dropna(how='all')
            
            # Filter out rows with no meaningful data
            cleaned_df = cleaned_df[
                (cleaned_df.get('from_origin', '').str.len() > 0) |
                (cleaned_df.get('area', '').str.len() > 0) |
                (cleaned_df.get('rate', 0) > 0)
            ]
            
            logger.info(f"Data cleaned: {len(df)} -> {len(cleaned_df)} rows")
            return cleaned_df
            
        except Exception as e:
            logger.error(f"Error cleaning data: {str(e)}")
            return df
    
    def extract_locations(self, df: pd.DataFrame) -> Dict[str, List[str]]:
        """Extract unique locations from the dataset"""
        locations = {
            'origins': [],
            'destinations': [],
            'all_locations': []
        }
        
        try:
            # Extract origins
            if 'from_origin' in df.columns:
                origins = df['from_origin'].dropna().unique()
                origins = [str(loc).strip() for loc in origins if str(loc).strip() and str(loc) != 'nan']
                locations['origins'] = sorted(list(set(origins)))
            
            # Extract destinations (areas)
            if 'area' in df.columns:
                destinations = df['area'].dropna().unique()
                destinations = [str(loc).strip() for loc in destinations if str(loc).strip() and str(loc) != 'nan']
                locations['destinations'] = sorted(list(set(destinations)))
            
            # Combine all locations
            all_locs = set(locations['origins'] + locations['destinations'])
            locations['all_locations'] = sorted(list(all_locs))
            
        except Exception as e:
            logger.error(f"Error extracting locations: {str(e)}")
        
        return locations
    
    def extract_vendors(self, df: pd.DataFrame) -> List[str]:
        """Extract unique vendors from the dataset"""
        try:
            if 'vendor_name' not in df.columns:
                return []
            
            vendors = df['vendor_name'].dropna().unique()
            vendors = [str(vendor).strip() for vendor in vendors if str(vendor).strip() and str(vendor) != 'nan']
            return sorted(list(set(vendors)))
            
        except Exception as e:
            logger.error(f"Error extracting vendors: {str(e)}")
            return []
    
    def extract_vehicle_types(self, df: pd.DataFrame) -> List[str]:
        """Extract unique vehicle types from the dataset"""
        try:
            if 'vehicle_type' not in df.columns:
                return []
            
            vehicle_types = df['vehicle_type'].dropna().unique()
            vehicle_types = [str(vt).strip() for vt in vehicle_types if str(vt).strip() and str(vt) != 'nan']
            return sorted(list(set(vehicle_types)))
            
        except Exception as e:
            logger.error(f"Error extracting vehicle types: {str(e)}")
            return []
    
    def calculate_analytics(self, df: pd.DataFrame) -> Dict:
        """Calculate analytics from the dataset"""
        analytics = {
            'total_routes': 0,
            'total_vendors': 0,
            'avg_rate': 0,
            'route_volume_by_destination': [],
            'avg_rates_by_vehicle_type': [],
            'vendor_performance': [],
            'vehicle_area_deliveries': []
        }
        
        try:
            # Filter valid data
            valid_df = df[df['rate'] > 0].copy()
            
            analytics['total_routes'] = len(valid_df)
            analytics['total_vendors'] = len(self.extract_vendors(valid_df))
            analytics['avg_rate'] = float(valid_df['rate'].mean()) if len(valid_df) > 0 else 0
            
            # Route volume by destination
            if 'area' in valid_df.columns:
                route_volume = valid_df['area'].value_counts().head(10)
                analytics['route_volume_by_destination'] = [
                    {'area': area, 'count': int(count)}
                    for area, count in route_volume.items()
                ]
            
            # Average rates by vehicle type
            if 'vehicle_type' in valid_df.columns:
                avg_rates = valid_df.groupby('vehicle_type')['rate'].mean().sort_values(ascending=False)
                analytics['avg_rates_by_vehicle_type'] = [
                    {'vehicle_type': vtype, 'avg_rate': float(rate)}
                    for vtype, rate in avg_rates.items()
                    if str(vtype).strip() and str(vtype) != 'nan'
                ]
            
            # Vendor performance
            if 'vendor_name' in valid_df.columns:
                vendor_stats = valid_df.groupby('vendor_name').agg({
                    'rate': ['count', 'sum', 'mean']
                }).round(2)
                vendor_stats.columns = ['total_routes', 'total_revenue', 'avg_rate']
                vendor_stats = vendor_stats.sort_values('total_revenue', ascending=False).head(8)
                
                analytics['vendor_performance'] = [
                    {
                        'vendor': vendor,
                        'total_routes': int(stats['total_routes']),
                        'total_revenue': float(stats['total_revenue']),
                        'avg_rate': float(stats['avg_rate'])
                    }
                    for vendor, stats in vendor_stats.iterrows()
                    if str(vendor).strip() and str(vendor) != 'nan'
                ]
            
            # Vehicle deliveries to different areas from same from_origin
            if {'from_origin', 'vehicle_no', 'area'}.issubset(valid_df.columns):
                vehicle_area = (
                    valid_df.groupby(['from_origin', 'vehicle_no'])['area']
                    .nunique()
                    .reset_index()
                    .rename(columns={'area': 'unique_areas'})
                )
                analytics['vehicle_area_deliveries'] = [
                    {
                        'from_origin': row['from_origin'],
                        'vehicle_no': row['vehicle_no'],
                        'unique_areas': int(row['unique_areas'])
                    }
                    for _, row in vehicle_area.iterrows()
                    if row['vehicle_no'] and row['unique_areas'] > 1
                ]
            
        except Exception as e:
            logger.error(f"Error calculating analytics: {str(e)}")
        
        return analytics