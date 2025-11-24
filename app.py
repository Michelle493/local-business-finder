from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# API Configuration
RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY', '9b43007e1fmsh34ea7b470d38c51p1e76e2jsnfa00b4d9dc48')
RAPIDAPI_HOST = "local-business-search.p.rapidapi.com"

@app.route('/')
def index():
    """Render the main application page"""
    return render_template('index.html')

@app.route('/api/search', methods=['POST'])
def search_businesses():
    """
    Search for local businesses using the Local Business Search API
    Accepts: query, location, limit, language
    Returns: JSON with business results or error
    """
    try:
        data = request.get_json()
        query = data.get('query', '')
        location = data.get('location', '')
        limit = data.get('limit', 20)
        language = data.get('language', 'en')
        
        # Validation
        if not query or not location:
            return jsonify({
                'status': 'error',
                'message': 'Query and location are required'
            }), 400
        
        
        search_query = f"{query} in {location}"
        
        # API Request
        url = "https://local-business-search.p.rapidapi.com/search"
        headers = {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": RAPIDAPI_HOST
        }
        params = {
            "query": search_query,
            "limit": limit,
            "language": language,
            "region": "us"
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        # Handle API errors
        if response.status_code == 429:
            return jsonify({
                'status': 'error',
                'message': 'Rate limit exceeded. Please try again later.'
            }), 429
        
        if response.status_code == 403:
            return jsonify({
                'status': 'error',
                'message': 'API authentication failed. Please check API key.'
            }), 403
        
        if response.status_code != 200:
            return jsonify({
                'status': 'error',
                'message': f'API request failed with status {response.status_code}'
            }), response.status_code
        
        
        api_data = response.json()
        
        if api_data.get('status') == 'OK':
            return jsonify({
                'status': 'success',
                'data': api_data.get('data', []),
                'query': search_query
            })
        else:
            return jsonify({
                'status': 'error',
                'message': api_data.get('error', {}).get('message', 'Unknown error')
            }), 400
            
    except requests.exceptions.Timeout:
        return jsonify({
            'status': 'error',
            'message': 'Request timeout. Please try again.'
        }), 504
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            'status': 'error',
            'message': f'Network error: {str(e)}'
        }), 503
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/api/business-details', methods=['POST'])
def get_business_details():
    """
    Get detailed information about a specific business
    Accepts: business_id
    Returns: Detailed business information
    """
    try:
        data = request.get_json()
        business_id = data.get('business_id', '')
        
        if not business_id:
            return jsonify({
                'status': 'error',
                'message': 'Business ID is required'
            }), 400
        
        url = "https://local-business-search.p.rapidapi.com/business-details"
        headers = {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": RAPIDAPI_HOST
        }
        params = {
            "business_id": business_id,
            "extract_emails_and_contacts": "true"
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            api_data = response.json()
            if api_data.get('status') == 'OK':
                return jsonify({
                    'status': 'success',
                    'data': api_data.get('data', {})
                })
        
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch business details'
        }), response.status_code
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/health')
def health_check():
    """Health check endpoint for load balancer"""
    return jsonify({'status': 'healthy'}), 200

@app.errorhandler(404)
def not_found(e):
    return jsonify({'status': 'error', 'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'status': 'error', 'message': 'Internal server error'}), 500

if __name__ == '__main__':
    # Development server
    app.run(debug=True, host='0.0.0.0', port=5000) 