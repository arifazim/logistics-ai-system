# ================================
# backend/config.py
# ================================
import os
import json
import logging as logger
from dotenv import load_dotenv
import traceback

# Always load .env from the backend directory, regardless of CWD
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(BACKEND_DIR, '.env')
load_dotenv(dotenv_path)

CREDENTIALS_PATH = os.path.join(BACKEND_DIR, 'credentials.json')

class Config:
    
    GOOGLE_SHEETS_ID = '1dAnTuM6cEO1oBnUN7htxCrVOgrTr-jXfcbnhXb5UBKM'
    GOOGLE_CREDENTIALS_FILE = CREDENTIALS_PATH
    AI_MODEL_THRESHOLD = float(os.environ.get('AI_MODEL_THRESHOLD', '0.6'))
    CACHE_TTL = int(os.environ.get('CACHE_TTL', '300'))  # 5 minutes
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    #RATELIMIT_STORAGE_URI = os.environ.get('RATELIMIT_STORAGE_URI', 'memory://')

    @staticmethod
    def get_google_credentials_dict():
        credentials_file = Config.GOOGLE_CREDENTIALS_FILE
        print(f"DEBUG: Looking for credentials at: {credentials_file}")
        """Load and return the full credentials.json as a dict."""
        try:
            with open(credentials_file, 'r') as f:
             logger.info("DEBUG: Looking for credentials at: %s", credentials_file)
             logger.info("DEBUG: Found credentials at: %s", credentials_file)
             return json.load(f)
        except Exception as e:
            logger.error("Failed to initialize Google Sheets client: %s", traceback.format_exc())
            return None
    '''
    @staticmethod
    def check_credentials():
        credentials_file = Config.GOOGLE_CREDENTIALS_FILE
        print("DEBUG: Looking for credentials at:", credentials_file)
        if not os.path.exists(credentials_file):
            logger.warning(f"Credentials file not found: {credentials_file}. Using demo data.")
            return
    '''