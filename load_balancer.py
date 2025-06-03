#!/usr/bin/env python3
"""
Food Calorie Estimator - Load Balancer
Distributes requests across multiple backend servers using round-robin algorithm
Docker-ready configuration with service discovery
"""

import logging
import time
import threading
from datetime import datetime
import os
import requests
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Enable CORS for all origins - let backend servers handle specific origins
CORS(app, origins='*', supports_credentials=True)

# Docker-ready configuration
BACKEND_SERVERS = [
    {
        'name': 'Backend Server 1',
        'url': os.getenv('BACKEND_1_URL', 'http://localhost:8000'),
        'healthy': True
    },
    {
        'name': 'Backend Server 2', 
        'url': os.getenv('BACKEND_2_URL', 'http://localhost:8001'),
        'healthy': True
    },
    {
        'name': 'Backend Server 3',
        'url': os.getenv('BACKEND_3_URL', 'http://localhost:8002'), 
        'healthy': True
    }
]

# Load balancer configuration
LOAD_BALANCER_PORT = int(os.getenv('LOAD_BALANCER_PORT', 9000))
HEALTH_CHECK_INTERVAL = int(os.getenv('HEALTH_CHECK_INTERVAL', 10))
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', 30))

# Statistics
current_server_index = 0
request_count = 0
server_stats = {server['url']: {'requests': 0, 'errors': 0} for server in BACKEND_SERVERS}

def print_startup_banner():
    """Print colorful startup information"""
    print("\n" + "="*60)
    print("🚀 LOAD BALANCER STARTING (Docker Mode)")
    print("="*60)
    print(f"📍 Load Balancer Port: {LOAD_BALANCER_PORT}")
    print(f"📊 Algorithm: Round-Robin")
    print(f"🔄 Health Check Interval: {HEALTH_CHECK_INTERVAL}s")
    print(f"🎯 Backend Servers:")
    for i, server in enumerate(BACKEND_SERVERS, 1):
        status = "✅" if server['healthy'] else "❌"
        print(f"   {i}. {server['name']} - {server['url']} {status}")
    print(f"🌐 Frontend should connect to: http://localhost:{LOAD_BALANCER_PORT}")
    print(f"📋 Available endpoints:")
    print(f"   • POST /predict - Food prediction")
    print(f"   • GET  /history - Prediction history") 
    print(f"   • GET  /uploads/<filename> - Image files")
    print(f"   • GET  /health - Load balancer health")
    print(f"   • GET  /stats - Load balancer statistics")
    print("="*60)

def get_healthy_servers():
    """Get list of healthy servers for load balancing"""
    return [server for server in BACKEND_SERVERS if server['healthy']]

def get_next_server():
    """
    Round-robin load balancing algorithm
    Cycles through healthy servers in order, wrapping back to start
    """
    global current_server_index
    
    # Get all currently healthy backend servers
    healthy_servers = get_healthy_servers()
    if not healthy_servers:
        return None  # No servers available
    
    # Round-robin: use modulo to cycle through servers (0, 1, 2, 0, 1, 2...)
    server = healthy_servers[current_server_index % len(healthy_servers)]
    
    # Increment index for next request, wrap around using modulo
    current_server_index = (current_server_index + 1) % len(healthy_servers)
    
    return server

def check_server_health(server):
    """
    Health check: ping server's /health endpoint
    Returns True if server responds with 200, False otherwise
    """
    try:
        response = requests.get(f"{server['url']}/health", timeout=5)
        return response.status_code == 200
    except Exception as e:
        logger.debug(f"Health check failed for {server['url']}: {e}")
        return False

def health_monitor():
    """
    Background thread: continuously monitors all backend servers
    Updates server health status and logs changes
    """
    while True:
        try:
            for server in BACKEND_SERVERS:
                old_status = server['healthy']
                server['healthy'] = check_server_health(server)  # Check current health
                
                # Log status changes (UP/DOWN transitions)
                if old_status != server['healthy']:
                    status = "✅ UP" if server['healthy'] else "❌ DOWN"
                    logger.info(f"🔄 Server status changed: {server['name']} is now {status}")
            
        except Exception as e:
            logger.error(f"Health monitor error: {e}")
        
        # Wait before next health check cycle
        time.sleep(HEALTH_CHECK_INTERVAL)

def forward_request(server, endpoint, method='GET', **kwargs):
    """
    Request forwarding: proxy client requests to selected backend server
    Handles request routing, logging, and error tracking
    """
    global request_count, server_stats
    
    request_count += 1  # Track total requests processed
    target_url = f"{server['url']}{endpoint}"
    
    # Log request routing details
    logger.info(f"🎯 Load Balancer routing to: {server['name']} ({server['url']})")
    logger.info(f"🔗 Target URL: {target_url}")
    logger.info(f"📋 Method: {method}")
    logger.info(f"📦 Kwargs: {list(kwargs.keys())}")
    
    try:
        # Forward request using appropriate HTTP method
        if method == 'GET':
            response = requests.get(target_url, timeout=REQUEST_TIMEOUT, **kwargs)
        elif method == 'POST':
            response = requests.post(target_url, timeout=REQUEST_TIMEOUT, **kwargs)
        else:
            response = requests.request(method, target_url, timeout=REQUEST_TIMEOUT, **kwargs)
        
        # Update success statistics
        server_stats[server['url']]['requests'] += 1
        logger.info(f"✅ Request forwarded successfully: {server['name']} - {method} {endpoint}")
        
        return response
        
    except Exception as e:
        # Update error statistics and re-raise exception
        server_stats[server['url']]['errors'] += 1
        logger.error(f"❌ Request failed to {server['name']}: {e}")
        logger.error(f"❌ Target URL was: {target_url}")
        raise

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    """Forward prediction requests"""
    if request.method == 'OPTIONS':
        return '', 200
    
    server = get_next_server()
    if not server:
        return jsonify({'error': 'No healthy backend servers available'}), 503
    
    try:
        # Forward files and form data
        files = {key: (file.filename, file.stream, file.mimetype) 
                for key, file in request.files.items()}
        data = request.form.to_dict()
        
        response = forward_request(server, '/predict', method='POST', files=files, data=data)
        
        # Parse and enhance response
        result = response.json()
        result['load_balancer_info'] = {
            'handled_by': server['name'],
            'server_port': server['url'].split(':')[-1],
            'load_balancer_port': LOAD_BALANCER_PORT,
            'attempt': 1
        }
        
        return jsonify(result), response.status_code
        
    except Exception as e:
        logger.error(f"Prediction request failed: {e}")
        return jsonify({'error': 'Prediction service unavailable'}), 503

@app.route('/history')
def history():
    """Forward history requests"""
    server = get_next_server()
    if not server:
        return jsonify({'error': 'No healthy backend servers available'}), 503
    
    try:
        # Forward query parameters 
        params = request.args.to_dict()
        response = forward_request(server, '/history', method='GET', params=params)
        
        # Parse and enhance response
        result = response.json()
        result['load_balancer_info'] = {
            'handled_by': server['name'],
            'server_port': server['url'].split(':')[-1],
            'load_balancer_port': LOAD_BALANCER_PORT
        }
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"History request failed: {e}")
        return jsonify({'error': 'Failed to fetch history'}), 500

@app.route('/api/predictions/search')
def search_predictions():
    """Forward search predictions requests"""
    server = get_next_server()
    if not server:
        return jsonify({'error': 'No healthy backend servers available'}), 503
    
    try:
        # Forward query parameters 
        params = request.args.to_dict()
        response = forward_request(server, '/api/predictions/search', method='GET', params=params)
        
        # Parse and enhance response
        result = response.json()
        result['load_balancer_info'] = {
            'handled_by': server['name'],
            'server_port': server['url'].split(':')[-1],
            'load_balancer_port': LOAD_BALANCER_PORT
        }
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Search predictions request failed: {e}")
        return jsonify({'error': 'Search failed'}), 500

@app.route('/dashboard')
def dashboard():
    """Forward dashboard requests"""
    server = get_next_server()
    if not server:
        return jsonify({'error': 'No healthy backend servers available'}), 503
    
    try:
        # Forward query parameters
        query_string = request.query_string.decode('utf-8')
        endpoint = f"/dashboard?{query_string}" if query_string else "/dashboard"
        
        response = forward_request(server, endpoint, params=request.args)
        return response.content, response.status_code, response.headers.items()
        
    except Exception as e:
        logger.error(f"Dashboard request failed: {e}")
        return jsonify({'error': 'Dashboard service unavailable'}), 503

@app.route('/batch/upload', methods=['POST'])
def batch_upload():
    """Forward batch upload requests"""
    server = get_next_server()
    if not server:
        return jsonify({'error': 'No healthy backend servers available'}), 503
    
    try:
        # Get all files with the same field name
        uploaded_files = request.files.getlist('images')
        logger.info(f"🚀 Load balancer received {len(uploaded_files)} files for batch upload")
        
        # Prepare files for forwarding - read data once and preserve it
        files = []
        for i, file in enumerate(uploaded_files):
            if file and file.filename:
                # Read the file data once and preserve it
                file.stream.seek(0)
                file_data = file.stream.read()
                logger.info(f"📁 Load balancer read file {i+1}: {file.filename} ({len(file_data)} bytes)")
                files.append(('images', (file.filename, file_data, file.mimetype)))
        
        if not files:
            logger.warning("❌ No valid files to forward")
            return jsonify({'error': 'No valid files uploaded'}), 400
        
        logger.info(f"✅ Load balancer forwarding {len(files)} files to {server['name']}")
        
        # Forward to backend server using requests.post directly for proper multipart handling
        target_url = f"{server['url']}/batch/upload"
        data = request.form.to_dict()
        
        response = requests.post(
            target_url,
            files=files,
            data=data,
            timeout=REQUEST_TIMEOUT
        )
        
        logger.info(f"🎯 Batch upload forwarded successfully to {server['name']}: {response.status_code}")
        return response.content, response.status_code, response.headers.items()
        
    except Exception as e:
        logger.error(f"Batch upload request failed: {e}")
        return jsonify({'error': 'Batch upload service unavailable'}), 503

@app.route('/batch/status/<batch_id>')
def batch_status(batch_id):
    """Handle batch status requests by checking all backend servers"""
    logger.info(f"🔍 Checking batch status for: {batch_id}")
    
    # Check all healthy backend servers for the batch
    for server in BACKEND_SERVERS:
        if server['healthy']:
            try:
                logger.info(f"🔍 Checking batch {batch_id} on {server['name']}")
                response = forward_request(server, f'/batch/status/{batch_id}', method='GET')
                
                if response.status_code == 200:
                    result = response.json()
                    # If we found the batch (no error), return it
                    if 'error' not in result:
                        logger.info(f"✅ Found batch {batch_id} on {server['name']}")
                        result['found_on_server'] = server['name']
                        result['load_balancer_info'] = {
                            'checked_servers': [s['name'] for s in BACKEND_SERVERS if s['healthy']],
                            'found_on': server['name'],
                            'load_balancer_port': LOAD_BALANCER_PORT
                        }
                        return jsonify(result)
                
            except Exception as e:
                logger.warning(f"⚠️  Error checking batch {batch_id} on {server['name']}: {e}")
                continue
    
    # If batch not found on any server, return not found
    logger.warning(f"❌ Batch {batch_id} not found on any backend server")
    return jsonify({
        'error': 'Batch not found',
        'batch_id': batch_id,
        'checked_servers': [s['name'] for s in BACKEND_SERVERS if s['healthy']],
        'load_balancer_info': {
            'message': 'Checked all healthy backend servers',
            'load_balancer_port': LOAD_BALANCER_PORT
        }
    }), 404

@app.route('/batch/history')
def batch_history():
    """Forward batch history requests"""
    server = get_next_server()
    if not server:
        return jsonify({'error': 'No healthy backend servers available'}), 503
    
    try:
        # Forward query parameters
        query_string = request.query_string.decode('utf-8')
        endpoint = f"/batch/history?{query_string}" if query_string else "/batch/history"
        
        response = forward_request(server, endpoint, params=request.args)
        return response.content, response.status_code, response.headers.items()
        
    except Exception as e:
        logger.error(f"Batch history request failed: {e}")
        return jsonify({'error': 'Batch history service unavailable'}), 503

@app.route('/uploads/<filename>')
def uploads(filename):
    """Forward file requests"""
    server = get_next_server()
    if not server:
        return jsonify({'error': 'No healthy backend servers available'}), 503
    
    try:
        response = forward_request(server, f'/uploads/{filename}')
        return response.content, response.status_code, response.headers.items()
        
    except Exception as e:
        logger.error(f"File request failed: {e}")
        return jsonify({'error': 'File service unavailable'}), 503

@app.route('/health')
def health():
    """Load balancer health check"""
    healthy_servers = get_healthy_servers()
    
    return jsonify({
        'status': 'healthy' if healthy_servers else 'unhealthy',
        'load_balancer': 'running',
        'port': LOAD_BALANCER_PORT,
        'total_servers': len(BACKEND_SERVERS),
        'healthy_servers': len(healthy_servers),
        'servers': [
            {
                'name': server['name'],
                'url': server['url'],
                'healthy': server['healthy']
            }
            for server in BACKEND_SERVERS
        ],
        'timestamp': datetime.now().isoformat()
    })

@app.route('/stats')
def stats():
    """Load balancer statistics"""
    return jsonify({
        'total_requests': request_count,
        'healthy_servers': len(get_healthy_servers()),
        'total_servers': len(BACKEND_SERVERS),
        'server_stats': server_stats,
        'current_server_index': current_server_index,
        'algorithm': 'round-robin',
        'uptime': time.time(),
        'timestamp': datetime.now().isoformat()
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print_startup_banner()
    
    # Start health monitoring thread
    health_thread = threading.Thread(target=health_monitor, daemon=True)
    health_thread.start()
    
    # Start load balancer
    app.run(
        host='0.0.0.0',  # Listen on all interfaces for Docker
        port=LOAD_BALANCER_PORT,
        debug=False
    ) 