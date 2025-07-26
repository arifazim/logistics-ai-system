# ================================
# backend/app.py
# ================================
import sys  # <-- Missing import
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
import os
from datetime import datetime

# Import your modules (ensure they exist and are correct)
try:
    from models.ai_engine import AIQuotationEngine
    from services.google_sheets import GoogleSheetsService
    from services.quotation_service import QuotationService
    from config import Config
except Exception as e:
    logging.critical(f"❌ Failed to import required modules: {e}", exc_info=True)
    sys.exit(1)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Apply config from Config class
app.config.from_object(Config)

# Configure CORS
# Allow your frontend domain only (recommended for production)
frontend_origin = os.getenv("FRONTEND_URL", "https://logistics-services-4ikv.onrender.com")

# Add localhost for development
allowed_origins = [frontend_origin, "http://localhost:3000"]

CORS(app)

# Add CORS headers manually (optional, but safe)
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin in allowed_origins or origin == f"https://{frontend_origin}":
        response.headers.add('Access-Control-Allow-Origin', origin)
    else:
        response.headers.add('Access-Control-Allow-Origin', '*')  # fallback
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cache-Control,Pragma')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# OPTIONS preflight handler
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def options_preflight(path):
    return jsonify({'status': 'preflight OK'}), 200

# Rate limiting
try:
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://"  # Use in-memory storage (Render doesn't support Redis on free tier)
    )
    limiter.init_app(app)
except Exception as e:
    logger.warning(f"⚠️ Rate limiter failed to initialize: {e}")

# Initialize services (with error fallback)
sheets_service = None
ai_engine = None
quotation_service = None

try:
    sheets_service = GoogleSheetsService()
    ai_engine = AIQuotationEngine()
    quotation_service = QuotationService(sheets_service, ai_engine)
    logger.info("✅ Services initialized successfully")
except Exception as e:
    logger.critical(f"❌ Failed to initialize services: {e}", exc_info=True)
    sys.exit(1)

# === Routes ===

@app.route("/api/healthz")
def health():
    return {"status": "ok"}

@app.route("/api/health", methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/quotations/search', methods=['POST'])
@limiter.limit("10 per minute")
def search_quotations():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON payload provided'}), 400

        required_fields = ['from_location', 'to_location']
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({'error': f'Missing required fields: {missing}'}), 400

        if not quotation_service:
            return jsonify({'error': 'Service unavailable'}), 503

        quotations = quotation_service.get_quotations(
            from_location=data['from_location'],
            to_location=data['to_location'],
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
        logger.error(f"Error in search_quotations: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/analytics/dashboard', methods=['GET', 'OPTIONS'])
@limiter.limit("5 per minute")
def get_dashboard_analytics():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin') or '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        analytics = quotation_service.get_analytics() if quotation_service else {}
        return jsonify({
            'success': True,
            'analytics': analytics,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Error in get_dashboard_analytics: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/vendors', methods=['GET'])
def get_vendors():
    try:
        vendors = quotation_service.get_vendors()
        return jsonify({'success': True, 'vendors': vendors})
    except Exception as e:
        logger.error(f"Error in get_vendors: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/locations', methods=['GET'])
def get_locations():
    try:
        locations = quotation_service.get_locations()
        return jsonify({'success': True, 'locations': locations})
    except Exception as e:
        logger.error(f"Error in get_locations: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/vendor-rates', methods=['GET'])
def get_vendor_rates():
    try:
        df = quotation_service._get_fresh_data()
        if df is None or df.empty:
            return jsonify({'success': False, 'rates': [], 'error': 'No data found'}), 404
        rates = df.to_dict(orient='records')
        return jsonify({'success': True, 'rates': rates})
    except Exception as e:
        logger.error(f"Error in get_vendor_rates: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

# Debug route (remove in production if sensitive)
@app.route("/api/debug/routes")
def debug_routes():
    routes = [
        {
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'route': str(rule)
        }
        for rule in app.url_map.iter_rules()
    ]
    return jsonify({
        'routes': routes,
        'total': len(routes),
        'timestamp': datetime.utcnow().isoformat()
    })

# Start the server
if __name__ == '__main__':
    try:
        port = int(os.environ.get("PORT", 5000))
        logger.info(f"🚀 Starting Flask server on port {port}")
        app.run(host="0.0.0.0", port=port)
    except Exception as e:
        logger.critical(f"❌ Failed to start Flask server: {e}", exc_info=True)
        sys.exit(1)