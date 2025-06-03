import pytest
import json
import io
from unittest.mock import patch, MagicMock
from PIL import Image
import torch

def test_health_endpoint(client):
    """Test the health check endpoint"""
    response = client.get('/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'status' in data
    assert 'port' in data
    assert 'timestamp' in data

def test_predict_no_image(client):
    """Test prediction endpoint without image"""
    response = client.post('/predict')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data
    assert 'No image provided' in data['error']

def test_predict_empty_filename(client):
    """Test prediction endpoint with empty filename"""
    data = {'image': (io.BytesIO(b''), '')}
    response = client.post('/predict', data=data)
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data
    assert 'No image selected' in data['error']

@patch('app.get_model')
@patch('app.save_prediction')
def test_predict_success(mock_save, mock_get_model, client):
    """Test successful prediction"""
    # Mock the model
    mock_model = MagicMock()
    mock_output = torch.tensor([[0.1, 0.2, 0.7, 0.05, 0.15]])
    mock_model.return_value = mock_output
    mock_get_model.return_value = mock_model
    
    # Create a test image
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    data = {'image': (img_bytes, 'test.jpg')}
    
    with patch('app.class_idx', {2: 'pizza'}):
        response = client.post('/predict', data=data)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'food' in data
    assert 'confidence' in data
    assert 'calories' in data
    assert 'protein' in data
    assert 'carbs' in data
    assert 'fat' in data

def test_history_endpoint(client, db_session):
    """Test history endpoint"""
    response = client.get('/history')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'items' in data
    assert 'total' in data
    assert 'page' in data
    assert 'limit' in data

def test_history_with_search(client):
    """Test history endpoint with search parameter"""
    response = client.get('/history?search=pizza')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'search_query' in data
    assert data['search_query'] == 'pizza'

def test_search_predictions_endpoint(client):
    """Test the search predictions API endpoint"""
    response = client.get('/api/predictions/search?query=pizza')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'results' in data
    assert 'query' in data
    assert 'total' in data

def test_dashboard_endpoint(client):
    """Test dashboard endpoint"""
    response = client.get('/dashboard')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'total_predictions' in data
    assert 'top_foods' in data
    assert 'avg_calories' in data

def test_serve_image_endpoint(client):
    """Test serving uploaded images"""
    # This will return 404 since no image exists, but endpoint should work
    response = client.get('/uploads/test.jpg')
    # 404 is expected since image doesn't exist
    assert response.status_code == 404

@patch('app.get_redis_client')
def test_batch_upload_endpoint(mock_redis, client):
    """Test batch upload endpoint"""
    # Mock Redis client
    mock_redis_client = MagicMock()
    mock_redis.return_value = mock_redis_client
    
    # Create test image
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    data = {'images': (img_bytes, 'test.jpg')}
    response = client.post('/batch/upload', data=data)
    
    # Should return batch ID and status
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'batch_id' in data
    assert 'status' in data

def test_batch_status_endpoint(client):
    """Test batch status endpoint"""
    response = client.get('/batch/status/test-batch-id')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'batch_id' in data
    assert 'status' in data

def test_get_nutrition_info():
    """Test nutrition info retrieval function"""
    from app import get_nutrition_info
    
    # Test with mock nutrition data
    with patch('app.nutrition_data', {'pizza': {'calories': 285, 'protein': 12, 'carbs': 36, 'fat': 10.4}}):
        nutrition = get_nutrition_info('pizza')
        assert nutrition['calories'] == 285
        assert nutrition['protein'] == 12
    
    # Test with unknown food (should return defaults)
    with patch('app.nutrition_data', {}):
        nutrition = get_nutrition_info('unknown_food')
        assert 'calories' in nutrition
        assert 'protein' in nutrition 