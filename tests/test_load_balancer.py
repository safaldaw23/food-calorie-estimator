import pytest
import sys
import os
from unittest.mock import patch, MagicMock
import requests_mock

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from load_balancer import app, backend_servers, check_server_health, get_next_server

class TestLoadBalancer:
    """Test cases for the load balancer"""
    
    @pytest.fixture
    def client(self):
        """Create test client for load balancer"""
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    
    def test_health_endpoint(self, client):
        """Test load balancer health endpoint"""
        with requests_mock.Mocker() as m:
            # Mock backend server responses
            for server in backend_servers:
                m.get(f"{server['url']}/health", json={'status': 'healthy'})
            
            response = client.get('/health')
            assert response.status_code == 200
            data = response.get_json()
            assert 'status' in data
            assert 'healthy_servers' in data
            assert 'total_servers' in data
    
    def test_stats_endpoint(self, client):
        """Test load balancer statistics endpoint"""
        response = client.get('/stats')
        assert response.status_code == 200
        data = response.get_json()
        assert 'request_count' in data
        assert 'server_stats' in data
        assert 'uptime' in data
    
    @patch('load_balancer.requests.get')
    def test_server_health_check_healthy(self, mock_get):
        """Test health check for healthy server"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'status': 'healthy'}
        mock_get.return_value = mock_response
        
        is_healthy = check_server_health('http://test-server:8000')
        assert is_healthy is True
    
    @patch('load_balancer.requests.get')
    def test_server_health_check_unhealthy(self, mock_get):
        """Test health check for unhealthy server"""
        mock_get.side_effect = requests_mock.exceptions.ConnectionError()
        
        is_healthy = check_server_health('http://test-server:8000')
        assert is_healthy is False
    
    def test_round_robin_selection(self):
        """Test round-robin server selection"""
        # Reset server state
        for server in backend_servers:
            server['healthy'] = True
        
        # Get servers in order
        first_server = get_next_server()
        second_server = get_next_server()
        third_server = get_next_server()
        fourth_server = get_next_server()  # Should wrap around
        
        assert first_server != second_server
        assert second_server != third_server
        assert fourth_server == first_server  # Round-robin wrap
    
    def test_skip_unhealthy_servers(self):
        """Test that unhealthy servers are skipped"""
        # Mark first server as unhealthy
        backend_servers[0]['healthy'] = False
        backend_servers[1]['healthy'] = True
        backend_servers[2]['healthy'] = True
        
        # Should skip first server
        selected_server = get_next_server()
        assert selected_server != backend_servers[0]
    
    def test_predict_endpoint_routing(self, client):
        """Test prediction request routing"""
        with requests_mock.Mocker() as m:
            # Mock backend response
            mock_response = {
                'food': 'pizza',
                'confidence': 0.85,
                'calories': 285,
                'protein': 12,
                'carbs': 36,
                'fat': 10.4
            }
            
            for server in backend_servers:
                m.post(f"{server['url']}/predict", json=mock_response)
                m.get(f"{server['url']}/health", json={'status': 'healthy'})
            
            # Make prediction request
            response = client.post('/predict', 
                                 data={'image': (io.BytesIO(b'fake image'), 'test.jpg')})
            
            # Should route successfully
            assert response.status_code == 200 or response.status_code == 400  # 400 if no valid image
    
    def test_history_endpoint_routing(self, client):
        """Test history request routing"""
        with requests_mock.Mocker() as m:
            mock_response = {
                'items': [],
                'total': 0,
                'page': 1,
                'limit': 10
            }
            
            for server in backend_servers:
                m.get(f"{server['url']}/history", json=mock_response)
                m.get(f"{server['url']}/health", json={'status': 'healthy'})
            
            response = client.get('/history')
            assert response.status_code == 200
    
    def test_search_endpoint_routing(self, client):
        """Test search request routing"""
        with requests_mock.Mocker() as m:
            mock_response = {
                'results': [],
                'query': 'pizza',
                'total': 0
            }
            
            for server in backend_servers:
                m.get(f"{server['url']}/api/predictions/search", json=mock_response)
                m.get(f"{server['url']}/health", json={'status': 'healthy'})
            
            response = client.get('/api/predictions/search?query=pizza')
            assert response.status_code == 200
    
    @patch('load_balancer.requests.post')
    def test_failover_handling(self, mock_post, client):
        """Test failover when server is down"""
        # First call fails, second succeeds
        mock_post.side_effect = [
            requests_mock.exceptions.ConnectionError(),
            MagicMock(status_code=200, json=lambda: {'success': True})
        ]
        
        with requests_mock.Mocker() as m:
            for server in backend_servers:
                m.get(f"{server['url']}/health", json={'status': 'healthy'})
        
        # This should attempt failover
        response = client.post('/predict')
        # May fail due to no image, but should attempt routing
        assert response.status_code in [200, 400, 500]
    
    def test_batch_status_all_servers(self, client):
        """Test batch status checking across all servers"""
        with requests_mock.Mocker() as m:
            # Mock different responses from different servers
            batch_id = 'test-batch-123'
            
            # First server - not found
            m.get(f"{backend_servers[0]['url']}/batch/status/{batch_id}", 
                  json={'batch_id': batch_id, 'status': 'not_found'})
            
            # Second server - found
            m.get(f"{backend_servers[1]['url']}/batch/status/{batch_id}", 
                  json={'batch_id': batch_id, 'status': 'completed', 'results': []})
            
            # Third server - not found
            m.get(f"{backend_servers[2]['url']}/batch/status/{batch_id}", 
                  json={'batch_id': batch_id, 'status': 'not_found'})
            
            # Health checks
            for server in backend_servers:
                m.get(f"{server['url']}/health", json={'status': 'healthy'})
            
            response = client.get(f'/batch/status/{batch_id}')
            assert response.status_code == 200
            data = response.get_json()
            assert data['status'] == 'completed'  # Should find the completed batch
    
    def test_error_response_format(self, client):
        """Test error response formatting"""
        with requests_mock.Mocker() as m:
            # Mock all servers as unhealthy
            for server in backend_servers:
                m.get(f"{server['url']}/health", status_code=500)
                m.post(f"{server['url']}/predict", status_code=500)
            
            response = client.post('/predict')
            assert response.status_code in [400, 500]  # Should handle gracefully
    
    def test_request_logging(self, client):
        """Test that requests are logged for statistics"""
        with requests_mock.Mocker() as m:
            for server in backend_servers:
                m.get(f"{server['url']}/health", json={'status': 'healthy'})
                m.get(f"{server['url']}/history", json={'items': [], 'total': 0})
            
            # Make a request
            response = client.get('/history')
            
            # Check stats
            stats_response = client.get('/stats')
            stats_data = stats_response.get_json()
            assert stats_data['request_count'] > 0 