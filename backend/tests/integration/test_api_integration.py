import pytest
import requests
import json
import time
import io
from PIL import Image
from unittest.mock import patch

# Base URL for API tests (assuming local development server)
BASE_URL = "http://localhost:9000"

class TestAPIIntegration:
    """Integration tests for the Food Calorie Estimator API"""
    
    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Setup test data for integration tests"""
        self.test_image = self.create_test_image()
        
    def create_test_image(self):
        """Create a test image for API calls"""
        img = Image.new('RGB', (224, 224), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes
    
    def test_health_check_api(self):
        """Test health check API endpoint"""
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            assert response.status_code == 200
            data = response.json()
            assert 'status' in data
            assert data['status'] == 'healthy'
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not running - start with docker-compose up")
    
    def test_load_balancer_health(self):
        """Test load balancer health endpoint"""
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            assert response.status_code == 200
            data = response.json()
            assert 'healthy_servers' in data
            assert 'total_servers' in data
            assert data['healthy_servers'] > 0
        except requests.exceptions.ConnectionError:
            pytest.skip("Load balancer not running")
    
    def test_prediction_workflow(self):
        """Test complete prediction workflow"""
        try:
            # Create test image
            img = Image.new('RGB', (224, 224), color='red')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            
            # Make prediction request
            files = {'image': ('test.jpg', img_bytes, 'image/jpeg')}
            response = requests.post(f"{BASE_URL}/predict", files=files, timeout=30)
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify prediction response structure
            required_fields = ['food', 'confidence', 'calories', 'protein', 'carbs', 'fat']
            for field in required_fields:
                assert field in data, f"Missing field: {field}"
            
            # Verify data types
            assert isinstance(data['confidence'], (int, float))
            assert isinstance(data['calories'], (int, float))
            assert isinstance(data['protein'], (int, float))
            assert isinstance(data['carbs'], (int, float))
            assert isinstance(data['fat'], (int, float))
            
            return data
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not running")
    
    def test_history_retrieval(self):
        """Test history retrieval API"""
        try:
            response = requests.get(f"{BASE_URL}/history", timeout=10)
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert 'items' in data
            assert 'total' in data
            assert 'page' in data
            assert 'limit' in data
            
            # If there are items, verify structure
            if data['items']:
                item = data['items'][0]
                required_fields = ['id', 'food', 'calories', 'protein', 'carbs', 'fat', 'timestamp']
                for field in required_fields:
                    assert field in item, f"Missing field in history item: {field}"
                    
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not running")
    
    def test_search_functionality(self):
        """Test search predictions API"""
        try:
            # Test search with common food term
            response = requests.get(f"{BASE_URL}/api/predictions/search?query=pizza", timeout=10)
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert 'results' in data
            assert 'query' in data
            assert 'total' in data
            assert data['query'] == 'pizza'
            
            # If results exist, verify structure
            if data['results']:
                result = data['results'][0]
                required_fields = ['id', 'food', 'calories', 'protein', 'carbs', 'fat']
                for field in required_fields:
                    assert field in result, f"Missing field in search result: {field}"
                    
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not running")
    
    def test_pagination(self):
        """Test pagination in history API"""
        try:
            # Test first page
            response = requests.get(f"{BASE_URL}/history?page=1&limit=5", timeout=10)
            assert response.status_code == 200
            data = response.json()
            
            assert data['page'] == 1
            assert data['limit'] == 5
            assert len(data['items']) <= 5
            
            # Test second page if there's enough data
            if data['total'] > 5:
                response2 = requests.get(f"{BASE_URL}/history?page=2&limit=5", timeout=10)
                assert response2.status_code == 200
                data2 = response2.json()
                assert data2['page'] == 2
                
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not running")
    
    def test_dashboard_api(self):
        """Test dashboard statistics API"""
        try:
            response = requests.get(f"{BASE_URL}/dashboard", timeout=10)
            assert response.status_code == 200
            data = response.json()
            
            # Verify dashboard data structure
            expected_fields = ['total_predictions', 'top_foods', 'avg_calories']
            for field in expected_fields:
                assert field in data, f"Missing dashboard field: {field}"
            
            # Verify data types
            assert isinstance(data['total_predictions'], int)
            assert isinstance(data['avg_calories'], (int, float, type(None)))
            assert isinstance(data['top_foods'], list)
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not running")
    
    def test_batch_processing_api(self):
        """Test batch processing workflow"""
        try:
            # Create test image for batch processing
            img = Image.new('RGB', (224, 224), color='blue')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            
            # Upload batch
            files = {'images': ('batch_test.jpg', img_bytes, 'image/jpeg')}
            response = requests.post(f"{BASE_URL}/batch/upload", files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                assert 'batch_id' in data
                assert 'status' in data
                batch_id = data['batch_id']
                
                # Check batch status
                time.sleep(2)  # Wait for processing
                status_response = requests.get(f"{BASE_URL}/batch/status/{batch_id}", timeout=10)
                assert status_response.status_code == 200
                status_data = status_response.json()
                assert 'batch_id' in status_data
                assert 'status' in status_data
                
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not running")
    
    def test_error_handling(self):
        """Test API error handling"""
        try:
            # Test prediction without image
            response = requests.post(f"{BASE_URL}/predict", timeout=10)
            assert response.status_code == 400
            
            # Test invalid batch status
            response = requests.get(f"{BASE_URL}/batch/status/invalid-id", timeout=10)
            assert response.status_code == 200  # Should return empty/not found status
            
            # Test invalid search parameters
            response = requests.get(f"{BASE_URL}/api/predictions/search", timeout=10)
            assert response.status_code == 200  # Should handle missing query
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not running")
    
    def test_concurrent_requests(self):
        """Test handling of concurrent requests"""
        import threading
        import queue
        
        try:
            results = queue.Queue()
            
            def make_request():
                try:
                    response = requests.get(f"{BASE_URL}/health", timeout=10)
                    results.put(response.status_code)
                except Exception as e:
                    results.put(str(e))
            
            # Create multiple concurrent requests
            threads = []
            for _ in range(5):
                thread = threading.Thread(target=make_request)
                threads.append(thread)
                thread.start()
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
            
            # Check results
            response_codes = []
            while not results.empty():
                response_codes.append(results.get())
            
            # All requests should succeed
            assert len(response_codes) == 5
            assert all(code == 200 for code in response_codes if isinstance(code, int))
            
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not running") 