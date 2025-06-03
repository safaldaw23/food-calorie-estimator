import pytest
import os
import sys
import tempfile
from unittest.mock import patch, MagicMock

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import app, init_db
from database import SessionLocal, engine, Base
import torch

@pytest.fixture
def client():
    """Create a test client for the Flask app"""
    app.config['TESTING'] = True
    app.config['DATABASE_PATH'] = ':memory:'  # Use in-memory SQLite for tests
    
    with app.test_client() as client:
        with app.app_context():
            # Create tables for testing
            Base.metadata.create_all(bind=engine)
            yield client
            # Cleanup after test
            Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """Create a database session for testing"""
    # Create tables
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def mock_model():
    """Mock the PyTorch model for testing"""
    mock_model = MagicMock()
    mock_model.eval.return_value = None
    
    # Mock model prediction
    mock_output = torch.tensor([[0.1, 0.2, 0.7, 0.05, 0.15]])  # 5 classes example
    mock_model.return_value = mock_output
    
    return mock_model

@pytest.fixture
def sample_image():
    """Create a sample image file for testing"""
    # Create a temporary image file
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
        # Write some dummy image data
        tmp.write(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00')
        tmp.flush()
        yield tmp.name
    # Cleanup
    os.unlink(tmp.name)

@pytest.fixture
def sample_prediction_data():
    """Sample prediction data for testing"""
    return {
        'food': 'pizza',
        'confidence': 0.85,
        'calories': 285,
        'protein': 12,
        'carbs': 36,
        'fat': 10.4
    }

@pytest.fixture(autouse=True)
def setup_test_environment():
    """Setup test environment variables"""
    with patch.dict(os.environ, {
        'DATABASE_PATH': ':memory:',
        'UPLOAD_FOLDER': '/tmp/test_uploads',
        'REDIS_URL': 'redis://localhost:6379/15'  # Use different DB for tests
    }):
        yield 