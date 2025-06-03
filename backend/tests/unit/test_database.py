import pytest
from datetime import datetime
from database import Prediction, SessionLocal, Base, engine

def test_prediction_model_creation(db_session):
    """Test creating a prediction record"""
    prediction = Prediction(
        filename='test.jpg',
        predicted_food='pizza',
        calories=285.0,
        protein=12.0,
        carbs=36.0,
        fat=10.4
    )
    
    db_session.add(prediction)
    db_session.commit()
    
    # Retrieve the prediction
    retrieved = db_session.query(Prediction).filter_by(filename='test.jpg').first()
    assert retrieved is not None
    assert retrieved.predicted_food == 'pizza'
    assert retrieved.calories == 285.0
    assert retrieved.protein == 12.0
    assert retrieved.carbs == 36.0
    assert retrieved.fat == 10.4
    assert retrieved.timestamp is not None

def test_prediction_model_defaults(db_session):
    """Test prediction model with default values"""
    prediction = Prediction(
        filename='test2.jpg',
        predicted_food='burger'
    )
    
    db_session.add(prediction)
    db_session.commit()
    
    retrieved = db_session.query(Prediction).filter_by(filename='test2.jpg').first()
    assert retrieved is not None
    assert retrieved.predicted_food == 'burger'
    assert retrieved.calories == 200.0  # Default value
    assert retrieved.protein == 10.0    # Default value
    assert retrieved.carbs == 25.0      # Default value
    assert retrieved.fat == 8.0         # Default value

def test_query_predictions_by_food(db_session):
    """Test querying predictions by food type"""
    # Add multiple predictions
    predictions = [
        Prediction(filename='pizza1.jpg', predicted_food='pizza', calories=285.0),
        Prediction(filename='burger1.jpg', predicted_food='burger', calories=535.0),
        Prediction(filename='pizza2.jpg', predicted_food='pizza', calories=300.0),
    ]
    
    for pred in predictions:
        db_session.add(pred)
    db_session.commit()
    
    # Query pizza predictions
    pizza_predictions = db_session.query(Prediction).filter(
        Prediction.predicted_food.like('%pizza%')
    ).all()
    
    assert len(pizza_predictions) == 2
    assert all(pred.predicted_food == 'pizza' for pred in pizza_predictions)

def test_prediction_ordering(db_session):
    """Test prediction ordering by timestamp"""
    import time
    
    # Add predictions with slight time delay
    pred1 = Prediction(filename='first.jpg', predicted_food='apple')
    db_session.add(pred1)
    db_session.commit()
    
    time.sleep(0.01)  # Small delay
    
    pred2 = Prediction(filename='second.jpg', predicted_food='banana')
    db_session.add(pred2)
    db_session.commit()
    
    # Query ordered by timestamp desc (newest first)
    predictions = db_session.query(Prediction).order_by(
        Prediction.timestamp.desc()
    ).all()
    
    assert len(predictions) == 2
    assert predictions[0].filename == 'second.jpg'  # Newest first
    assert predictions[1].filename == 'first.jpg'

def test_prediction_statistics(db_session):
    """Test calculating statistics from predictions"""
    from sqlalchemy import func
    
    # Add test data
    predictions = [
        Prediction(filename='test1.jpg', predicted_food='pizza', calories=285.0),
        Prediction(filename='test2.jpg', predicted_food='burger', calories=535.0),
        Prediction(filename='test3.jpg', predicted_food='salad', calories=150.0),
        Prediction(filename='test4.jpg', predicted_food='pizza', calories=300.0),
    ]
    
    for pred in predictions:
        db_session.add(pred)
    db_session.commit()
    
    # Test total count
    total_count = db_session.query(Prediction).count()
    assert total_count == 4
    
    # Test average calories
    avg_calories = db_session.query(func.avg(Prediction.calories)).scalar()
    assert abs(avg_calories - 317.5) < 0.1  # (285+535+150+300)/4 = 317.5
    
    # Test food frequency
    food_counts = db_session.query(
        Prediction.predicted_food,
        func.count(Prediction.predicted_food)
    ).group_by(Prediction.predicted_food).all()
    
    food_dict = dict(food_counts)
    assert food_dict['pizza'] == 2
    assert food_dict['burger'] == 1
    assert food_dict['salad'] == 1

def test_database_session_rollback(db_session):
    """Test database session rollback functionality"""
    # Add a prediction
    prediction = Prediction(filename='rollback_test.jpg', predicted_food='test')
    db_session.add(prediction)
    
    # Check it exists in session but not committed
    assert db_session.query(Prediction).filter_by(filename='rollback_test.jpg').first() is not None
    
    # Rollback
    db_session.rollback()
    
    # Check it no longer exists
    assert db_session.query(Prediction).filter_by(filename='rollback_test.jpg').first() is None

def test_prediction_str_representation():
    """Test string representation of Prediction model"""
    prediction = Prediction(
        filename='test.jpg',
        predicted_food='pizza',
        calories=285.0
    )
    
    str_repr = str(prediction)
    assert 'pizza' in str_repr
    assert 'test.jpg' in str_repr 