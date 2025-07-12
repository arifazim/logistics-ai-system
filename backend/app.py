# ================================
# backend/app.py
# ================================
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
import os
from datetime import datetime

from models.ai_engine import AIQuotationEngine
from services.google_sheets import GoogleSheetsService
from services.quotation_service import QuotationService
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)
#app.config['RATELIMIT_STORAGE_URI'] = Config.RATELIMIT_STORAGE_URI
CORS(app)

# Rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize services
sheets_service = GoogleSheetsService()
ai_engine = AIQuotationEngine()
quotation_service = QuotationService(sheets_service, ai_engine)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/quotations/search', methods=['POST'])
@limiter.limit("10 per minute")
def search_quotations():
    """Search for quotations based on criteria"""
    try:
        data = request.get_json()
        
        # Validate input
        required_fields = ['from_location', 'to_location']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Get quotations
        quotations = quotation_service.get_quotations(
            from_location=data.get('from_location'),
            to_location=data.get('to_location'),
            vehicle_type=data.get('vehicle_type'),
            max_results=data.get('max_results', 10)
        )
        
        return jsonify({
            'success': True,
            'quotations': quotations,
            'total_found': len(quotations),
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in search_quotations: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/analytics/dashboard', methods=['GET'])
@limiter.limit("5 per minute")
def get_dashboard_analytics():
    """Get dashboard analytics data"""
    try:
        analytics = quotation_service.get_analytics()
        return jsonify({
            'success': True,
            'analytics': analytics,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Error in get_dashboard_analytics: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/vendors', methods=['GET'])
def get_vendors():
    """Get list of all vendors"""
    try:
        vendors = quotation_service.get_vendors()
        return jsonify({
            'success': True,
            'vendors': vendors
        })
    except Exception as e:
        logger.error(f"Error in get_vendors: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get list of all locations"""
    try:
        locations = quotation_service.get_locations()
        return jsonify({
            'success': True,
            'locations': locations
        })
    except Exception as e:
        logger.error(f"Error in get_locations: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/vendor-rates', methods=['GET'])
def get_vendor_rates():
    """Get all vendor rates from the Google Sheet as JSON"""
    try:
        df = quotation_service._get_fresh_data()
        if df is None or df.empty:
            return jsonify({'success': False, 'rates': [], 'error': 'No data found'}), 404
        # Convert DataFrame to list of dicts
        rates = df.to_dict(orient='records')
        return jsonify({'success': True, 'rates': rates})
    except Exception as e:
        logger.error(f"Error in get_vendor_rates: {str(e)}")
        return jsonify({'success': False, 'rates': [], 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)