# ================================
# backend/services/google_sheets.py
# ================================
import gspread
import traceback
from google.oauth2.service_account import Credentials
import pandas as pd
import logging
from typing import Optional
import os
from config import Config

logger = logging.getLogger(__name__)

class GoogleSheetsService:
    def __init__(self, worksheet_name: str = 'FINAL-VENDOR 20-24'):
        self.client = None
        self.spreadsheet = None
        self.worksheet = None
        self.worksheet_name = worksheet_name
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Google Sheets client"""
        try:
            # Define the scope
            scope = [
                'https://spreadsheets.google.com/feeds',
                'https://www.googleapis.com/auth/drive'
            ]
            
            # Load credentials
            credentials_dict = Config.get_google_credentials_dict()
            credentials_file = Config.GOOGLE_CREDENTIALS_FILE
            #print("DEBUG: Looking for credentials at:", credentials_file)
            #print("DEBUG: Credentials dict:", credentials_dict)
            if not os.path.exists(credentials_file):
                logger.warning(f"Credentials file not found: {credentials_file}. Using demo data.")
                return
            
            creds = Credentials.from_service_account_file(credentials_file, scopes=scope)
            self.client = gspread.authorize(creds)
            
            # Open the spreadsheet
            self.spreadsheet = self.client.open_by_key(Config.GOOGLE_SHEETS_ID)
            self.worksheet = self.spreadsheet.worksheet(self.worksheet_name)
            
            logger.info(f"Google Sheets client initialized successfully. Using worksheet: {self.worksheet_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets client: {str(e)}")
            logger.error("Failed to initialize Google Sheets client: %s", traceback.format_exc())
            self.client = None
    
    def get_data(self) -> Optional[pd.DataFrame]:
        """Fetch data from Google Sheets"""
        try:
            if not self.client or not self.worksheet:
                logger.warning("Google Sheets not available, using demo data")
                return self._get_demo_data()
            
            # Get all values
            data = self.worksheet.get_all_records()
            
            if not data:
                logger.warning("No data found in spreadsheet")
                return self._get_demo_data()
            
            df = pd.DataFrame(data)
            logger.info(f"Fetched {len(df)} rows from Google Sheets")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching data from Google Sheets: {str(e)}")
            return self._get_demo_data()
    
    def _get_demo_data(self) -> pd.DataFrame:
        """Return demo data when Google Sheets is not available"""
        demo_data = [
            {
                'FROM-ORIGIN': 'NEW KOROLA',
                'PINCODE': '700103',
                'AREA': 'RAMCHANDRAPUR',
                'RECEIVER NAME': '',
                'VEHICLE NO.': 'WB23D1704',
                'VEHICLE TYE': '',
                'RATE': 5000,
                'VENDOR NAME': 'Demo Vendor'
            },
            {
                'FROM-ORIGIN': 'SILIGURI',
                'PINCODE': '',
                'AREA': 'GELEPHU',
                'RECEIVER NAME': 'FOOD CORPORATION OF BHUTAN',
                'VEHICLE NO.': 'AC28C9699',
                'VEHICLE TYE': 'LPT',
                'RATE': 21000,
                'VENDOR NAME': 'NITESH SINGH'
            },
            {
                'FROM-ORIGIN': 'TARATALA',
                'PINCODE': '',
                'AREA': 'KISHANGANJ',
                'RECEIVER NAME': '',
                'VEHICLE NO.': 'BR01GB5653',
                'VEHICLE TYE': '1109',
                'RATE': 10850,
                'VENDOR NAME': 'CHANDAN'
            },
            {
                'FROM-ORIGIN': 'SANKRAIL',
                'PINCODE': '',
                'AREA': 'RANCHI',
                'RECEIVER NAME': 'A K ENTERPRISE',
                'VEHICLE NO.': 'CG04HY6165',
                'VEHICLE TYE': '12 WHEEL',
                'RATE': 33500,
                'VENDOR NAME': 'DINESH SILIGURI'
            },
            {
                'FROM-ORIGIN': 'KOROLA',
                'PINCODE': '',
                'AREA': 'MALDA',
                'RECEIVER NAME': 'Dada bhai',
                'VEHICLE NO.': 'WB891846',
                'VEHICLE TYE': '1109-19FT',
                'RATE': 18000,
                'VENDOR NAME': 'YUDHISHTHIR DOLUI'
            },
            {
                'FROM-ORIGIN': 'DANKUNI',
                'PINCODE': '',
                'AREA': 'RANCHI',
                'RECEIVER NAME': 'DAIKIN AIR CONDITIONING',
                'VEHICLE NO.': 'CG04MZ5617',
                'VEHICLE TYE': '1109-19FT',
                'RATE': 21000,
                'VENDOR NAME': 'DURGA PRASAD SHAW'
            },
            {
                'FROM-ORIGIN': 'SILIGURI',
                'PINCODE': '',
                'AREA': 'KATIHAR',
                'RECEIVER NAME': 'ADARSH ENTERPRISE',
                'VEHICLE NO.': 'BR06GB4430',
                'VEHICLE TYE': '1109-19FT',
                'RATE': 9700,
                'VENDOR NAME': 'JAMIR KHAN'
            },
            {
                'FROM-ORIGIN': 'SANKRAIL',
                'PINCODE': '',
                'AREA': 'RAIPUR',
                'RECEIVER NAME': 'S.D.ENTERPRISES',
                'VEHICLE NO.': 'CG10AW7266',
                'VEHICLE TYE': 'LPT',
                'RATE': 25700,
                'VENDOR NAME': 'SHAMIM AHMED KHAN'
            }
        ]
        
        logger.info("Using demo data")
        return pd.DataFrame(demo_data)
    
    def update_data(self, row_data: dict, row_index: int) -> bool:
        """Update a specific row in the spreadsheet"""
        try:
            if not self.client or not self.worksheet:
                logger.warning("Google Sheets not available for updates")
                return False
            
            # Convert dict to list in the correct order
            headers = self.worksheet.row_values(1)
            row_values = [row_data.get(header, '') for header in headers]
            
            # Update the row
            self.worksheet.update(f'A{row_index + 1}', [row_values])
            logger.info(f"Updated row {row_index + 1} in Google Sheets")
            return True
            
        except Exception as e:
            logger.error(f"Error updating Google Sheets: {str(e)}")
            return False