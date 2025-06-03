#!/usr/bin/env python3

import os
import sys
import torch
import torchvision.transforms as transforms
import torchvision.models as models
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import logging
from datetime import datetime, timedelta
import json
import uuid

# Import database components at module level
from database import SessionLocal, Prediction, init_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Docker-friendly configuration with test-safe PORT parsing
def get_port():
    """Get port number in a test-safe way"""
    # First try environment variable
    if 'PORT' in os.environ:
        return int(os.environ['PORT'])
    
    # Check if we're in a test environment
    if 'pytest' in sys.modules or any('pytest' in arg for arg in sys.argv):
        return 8000  # Default test port
    
    # Try to parse command line argument
    if len(sys.argv) > 1:
        try:
            return int(sys.argv[1])
        except ValueError:
            # If it's not a valid integer (like pytest flags), use default
            return 8000
    
    return 8000  # Default port

PORT = get_port()
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', f'static/uploads-{PORT}')
DATABASE_PATH = os.getenv('DATABASE_PATH', 'food_predictions.db')

# Initialize Flask app
app = Flask(__name__)
# Update CORS for Docker networking
CORS(app, origins=[
    'http://localhost:3000',  # Docker frontend
    'http://localhost:5173',  # Development frontend
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176'
], supports_credentials=True)

# Port-specific upload directory
upload_dir = UPLOAD_FOLDER

# Global model variable
model = None

# Load nutrition data
try:
    with open('nutrition_data.json', 'r') as f:
        nutrition_data = json.load(f)
except Exception as e:
    logger.error(f"Error loading nutrition data: {str(e)}")
    nutrition_data = {}

# Load ImageNet class labels
try:
    with open('imagenet_class_index.json', 'r') as f:
        class_index = json.load(f)
        # Convert to simple dict {idx: class_name}
        class_idx = {int(idx): labels[1] for idx, labels in class_index.items()}
except Exception as e:
    logger.error(f"Error loading class labels: {str(e)}")
    class_idx = {}

# Add a simple in-memory cache for local batch processing
LOCAL_BATCH_CACHE = {}

def get_model():
    """Load the model only when needed"""
    global model
    if model is None:
        try:
            logger.info(f"Loading ResNet50 model for port {PORT}...")
            model = models.resnet50(pretrained=True)
            model.eval()
            logger.info(f"Model loaded successfully for port {PORT}")
        except Exception as e:
            logger.error(f"Error loading model for port {PORT}: {str(e)}")
            return None
    return model

def process_image(image_file):
    """Process uploaded image for prediction"""
    try:
        transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                               std=[0.229, 0.224, 0.225])
        ])
        
        image = Image.open(image_file)
        image = image.convert('RGB')
        image_tensor = transform(image)
        return image_tensor.unsqueeze(0)
    except Exception as e:
        logger.error(f"Error processing image on port {PORT}: {str(e)}")
        raise

def get_nutrition_info(food_name):
    """Get nutrition information for a food item"""
    # Default nutrition values if not found
    default_nutrition = {
        'calories': 200,
        'protein': 10,
        'carbs': 25,
        'fat': 8
    }
    
    # Try to find the food in our nutrition database
    food_lower = food_name.lower().replace('_', ' ')
    for key in nutrition_data:
        if food_lower in key.lower() or key.lower() in food_lower:
            return nutrition_data[key]
    
    return default_nutrition

def save_prediction(food_name, filepath, nutrition):
    """Save prediction to shared database"""
    try:
        session = SessionLocal()
        new_prediction = Prediction(
            filename=os.path.basename(filepath),
            predicted_food=food_name,
            calories=nutrition['calories'],
            protein=nutrition['protein'],
            carbs=nutrition['carbs'],
            fat=nutrition['fat']
        )
        session.add(new_prediction)
        session.commit()
        session.close()
        logger.info(f"Prediction saved to shared database from port {PORT}")
        
    except Exception as e:
        logger.error(f"Error saving prediction from port {PORT}: {str(e)}")
        raise

@app.route('/uploads/<path:filename>')
def serve_image(filename):
    """Serve uploaded images"""
    return send_from_directory(upload_dir, filename)

@app.route('/predict', methods=['POST'])
def predict():
    """Main prediction endpoint"""
    logger.info(f"Received prediction request on port {PORT}")
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400
    
    try:
        # Save the uploaded file
        os.makedirs(upload_dir, exist_ok=True)
        filename = secure_filename(file.filename)
        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)
        
        # Get the model
        model = get_model()
        if model is None:
            return jsonify({'error': 'Model not available'}), 500
        
        # Process image and get prediction
        with torch.no_grad():
            image_tensor = process_image(filepath)
            outputs = model(image_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            
            # Get top prediction
            top_prob, top_class = torch.topk(probabilities, 1)
            predicted_idx = top_class.item()
            confidence = top_prob.item()
            
            # Get class name
            predicted_class = class_idx.get(predicted_idx, 'unknown')
            
            # Get nutrition info
            nutrition = get_nutrition_info(predicted_class)
            
            # Save prediction to database
            save_prediction(predicted_class, filepath, nutrition)
            
            result = {
                'food': predicted_class,
                'confidence': confidence,
                'calories': nutrition['calories'],
                'protein': nutrition['protein'],
                'carbs': nutrition['carbs'],
                'fat': nutrition['fat'],
                'image_url': f'/uploads/{filename}',
                'server_port': PORT,  # Add port info for debugging
                'container_info': {
                    'upload_folder': UPLOAD_FOLDER,
                    'database_path': DATABASE_PATH
                }
            }
            
            return jsonify(result)
            
    except Exception as e:
        logger.error(f"Error during prediction on port {PORT}: {str(e)}")
        return jsonify({'error': 'Prediction failed'}), 500

@app.route('/history', methods=['GET'])
def get_history():
    """Get prediction history with optional search"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search_query = request.args.get('search', '').strip()
        
        session = SessionLocal()
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Build query with optional search
        query = session.query(Prediction)
        
        if search_query:
            # Search in food name (case insensitive)
            query = query.filter(Prediction.predicted_food.ilike(f'%{search_query}%'))
        
        # Get total count for the filtered query
        total_count = query.count()
        
        # Get paginated results
        predictions = query.order_by(Prediction.timestamp.desc())\
                           .offset(offset)\
                           .limit(limit)\
                           .all()
        
        session.close()
        
        # Format results
        results = []
        for pred in predictions:
            results.append({
                'id': pred.id,
                'food': pred.predicted_food,
                'calories': pred.calories,
                'protein': pred.protein,
                'carbs': pred.carbs,
                'fat': pred.fat,
                'timestamp': pred.timestamp.isoformat(),
                'filename': pred.filename
            })
        
        return jsonify({
            'items': results,
            'total': total_count,
            'page': page,
            'limit': limit,
            'has_more': offset + limit < total_count,
            'search_query': search_query,
            'server_port': PORT
        })
        
    except Exception as e:
        logger.error(f"Error fetching history on port {PORT}: {str(e)}")
        return jsonify({'error': 'Failed to fetch history'}), 500

@app.route('/api/predictions/search', methods=['GET'])
def search_predictions():
    """Search predictions by food name"""
    try:
        query = request.args.get('query', '').strip()
        limit = int(request.args.get('limit', 20))
        
        if not query:
            return jsonify({'results': [], 'total': 0})
        
        session = SessionLocal()
        
        # Search in food name (case insensitive)
        predictions = session.query(Prediction)\
                           .filter(Prediction.predicted_food.ilike(f'%{query}%'))\
                           .order_by(Prediction.timestamp.desc())\
                           .limit(limit)\
                           .all()
        
        session.close()
        
        # Format results
        results = []
        for pred in predictions:
            results.append({
                'id': pred.id,
                'food': pred.predicted_food,
                'calories': pred.calories,
                'protein': pred.protein,
                'carbs': pred.carbs,
                'fat': pred.fat,
                'confidence': 0.85,  # Default confidence since we don't store it
                'timestamp': pred.timestamp.isoformat(),
                'image_url': f'/uploads/{pred.filename}' if pred.filename else None
            })
        
        return jsonify({
            'results': results,
            'total': len(results),
            'query': query,
            'server_port': PORT
        })
        
    except Exception as e:
        logger.error(f"Error searching predictions on port {PORT}: {str(e)}")
        return jsonify({'error': 'Search failed'}), 500

@app.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    """Get dashboard analytics data"""
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        days = int(request.args.get('days', 7))
        session = SessionLocal()
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get all predictions in the time range
        predictions = session.query(Prediction)\
                            .filter(Prediction.timestamp >= start_date)\
                            .order_by(Prediction.timestamp.desc())\
                            .all()
        
        if not predictions:
            session.close()
            return jsonify({
                'totalAnalyses': 0,
                'avgCaloriesPerDay': 0,
                'totalCalories': 0,
                'avgProtein': 0,
                'avgCarbs': 0,
                'avgFat': 0,
                'caloriesTrend': [],
                'topFoods': [],
                'macronutrients': {'protein': 0, 'carbs': 0, 'fat': 0},
                'dailyBreakdown': []
            })
        
        # Calculate basic metrics
        total_analyses = len(predictions)
        total_calories = sum(p.calories for p in predictions)
        total_protein = sum(p.protein for p in predictions)
        total_carbs = sum(p.carbs for p in predictions)
        total_fat = sum(p.fat for p in predictions)
        
        avg_calories_per_day = total_calories / days if days > 0 else 0
        avg_protein = total_protein / days if days > 0 else 0
        avg_carbs = total_carbs / days if days > 0 else 0
        avg_fat = total_fat / days if days > 0 else 0
        
        # Calculate daily calorie trends
        calorie_trends = {}
        for pred in predictions:
            date_str = pred.timestamp.strftime('%Y-%m-%d')
            if date_str not in calorie_trends:
                calorie_trends[date_str] = 0
            calorie_trends[date_str] += pred.calories
        
        # Sort and format calorie trends
        sorted_trends = sorted(calorie_trends.items())
        calorie_trends_list = [{'date': date, 'calories': calories} for date, calories in sorted_trends]
        
        # Calculate top foods
        food_counts = {}
        food_calories = {}
        for pred in predictions:
            food = pred.predicted_food
            if food not in food_counts:
                food_counts[food] = 0
                food_calories[food] = 0
            food_counts[food] += 1
            food_calories[food] += pred.calories
        
        # Sort top foods by count
        top_foods = [
            {
                'food': food,
                'count': count,
                'calories': food_calories[food]
            }
            for food, count in sorted(food_counts.items(), key=lambda x: x[1], reverse=True)
        ]
        
        # Macronutrients distribution
        macronutrients = {
            'protein': total_protein,
            'carbs': total_carbs,
            'fat': total_fat
        }
        
        # Daily breakdown (simplified - just showing total for now)
        daily_breakdown = [
            {
                'date': date,
                'breakfast': calories * 0.3,  # Estimate breakfast as 30%
                'lunch': calories * 0.4,      # Estimate lunch as 40%
                'dinner': calories * 0.3      # Estimate dinner as 30%
            }
            for date, calories in sorted_trends
        ]
        
        session.close()
        
        return jsonify({
            'totalAnalyses': total_analyses,
            'avgCaloriesPerDay': round(avg_calories_per_day, 1),
            'totalCalories': total_calories,
            'avgProtein': round(avg_protein, 1),
            'avgCarbs': round(avg_carbs, 1),
            'avgFat': round(avg_fat, 1),
            'caloriesTrend': calorie_trends_list,
            'topFoods': top_foods,
            'macronutrients': macronutrients,
            'dailyBreakdown': daily_breakdown,
            'server_port': PORT
        })
        
    except Exception as e:
        logger.error(f"Error fetching dashboard data on port {PORT}: {str(e)}")
        return jsonify({'error': 'Failed to fetch dashboard data'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'server_port': PORT
    })

@app.route('/dashboard')
def get_dashboard():
    """Get comprehensive dashboard data"""
    try:
        days = int(request.args.get('days', 7))
        session = SessionLocal()
        
        # Get all predictions within the date range
        from_date = datetime.utcnow() - timedelta(days=days)
        predictions = session.query(Prediction).filter(
            Prediction.timestamp >= from_date
        ).all()
        
        if not predictions:
            session.close()
            return jsonify({
                'totalAnalyses': 0,
                'avgCaloriesPerDay': 0,
                'totalCalories': 0,
                'avgProtein': 0,
                'avgCarbs': 0,
                'avgFat': 0,
                'caloriesTrend': [],
                'topFoods': [],
                'macronutrients': {'protein': 0, 'carbs': 0, 'fat': 0},
                'dailyBreakdown': []
            })
        
        # Calculate metrics
        total_analyses = len(predictions)
        total_calories = sum(p.calories for p in predictions)
        total_protein = sum(p.protein for p in predictions)
        total_carbs = sum(p.carbohydrates for p in predictions)
        total_fat = sum(p.fat for p in predictions)
        
        avg_calories_per_day = total_calories / days
        avg_protein = total_protein / days
        avg_carbs = total_carbs / days
        avg_fat = total_fat / days
        
        # Group by date for trends
        daily_data = {}
        for prediction in predictions:
            date_key = prediction.timestamp.strftime('%Y-%m-%d')
            if date_key not in daily_data:
                daily_data[date_key] = {
                    'calories': 0,
                    'breakfast': 0,
                    'lunch': 0,
                    'dinner': 0
                }
            daily_data[date_key]['calories'] += prediction.calories
            
            # Simulate meal distribution
            hour = prediction.timestamp.hour
            if 5 <= hour < 11:
                daily_data[date_key]['breakfast'] += prediction.calories * 0.3
            elif 11 <= hour < 17:
                daily_data[date_key]['lunch'] += prediction.calories * 0.4
            else:
                daily_data[date_key]['dinner'] += prediction.calories * 0.3
        
        # Calories trend
        calories_trend = [
            {'date': date, 'calories': data['calories']}
            for date, data in sorted(daily_data.items())
        ]
        
        # Daily breakdown
        daily_breakdown = [
            {
                'date': date,
                'breakfast': data['breakfast'],
                'lunch': data['lunch'],
                'dinner': data['dinner']
            }
            for date, data in sorted(daily_data.items())
        ]
        
        # Top foods
        food_counts = {}
        for prediction in predictions:
            food = prediction.predicted_food
            if food not in food_counts:
                food_counts[food] = {'count': 0, 'calories': 0}
            food_counts[food]['count'] += 1
            food_counts[food]['calories'] += prediction.calories
        
        top_foods = [
            {'food': food, 'count': data['count'], 'calories': data['calories']}
            for food, data in sorted(food_counts.items(), key=lambda x: x[1]['count'], reverse=True)
        ]
        
        session.close()
        
        # Include server port for debugging
        server_port = os.environ.get('SERVER_PORT', 8000)
        
        return jsonify({
            'totalAnalyses': total_analyses,
            'avgCaloriesPerDay': avg_calories_per_day,
            'totalCalories': total_calories,
            'avgProtein': avg_protein,
            'avgCarbs': avg_carbs,
            'avgFat': avg_fat,
            'caloriesTrend': calories_trend,
            'topFoods': top_foods,
            'macronutrients': {
                'protein': total_protein,
                'carbs': total_carbs,
                'fat': total_fat
            },
            'dailyBreakdown': daily_breakdown,
            'server_port': server_port
        })
        
    except Exception as e:
        return jsonify({'error': f'Dashboard error: {str(e)}'}), 500

@app.route('/batch/upload', methods=['POST'])
def batch_upload():
    """Handle batch upload with optional Redis fallback"""
    try:
        logger.info(f"🔄 Starting batch upload process on port {PORT}")
        import redis
        logger.info(f"✅ Redis module imported successfully on port {PORT}")
        # Test Redis connection specifically
        redis_client = get_redis_client()
        logger.info(f"✅ Redis client created successfully on port {PORT}")
        redis_client.ping()  # Test connection
        logger.info(f"✅ Redis connection successful on port {PORT}")
        # Try Redis-based batch processing first
        return batch_upload_with_celery()
    except ImportError as e:
        logger.warning(f"⚠️  Redis import failed on port {PORT}: {e}, falling back to local processing")
        return batch_upload_local_fallback()
    except (redis.exceptions.ConnectionError, redis.exceptions.RedisError, ConnectionRefusedError) as e:
        logger.warning(f"⚠️  Redis connection failed on port {PORT}: {e}, falling back to local processing")
        return batch_upload_local_fallback()
    except Exception as e:
        logger.error(f"❌ Unexpected error in batch upload Redis test on port {PORT}: {type(e).__name__}: {e}")
        logger.warning(f"⚠️  Falling back to local processing due to unexpected error")
        return batch_upload_local_fallback()

def batch_upload_with_celery():
    """Redis + Celery batch processing (original implementation)"""
    if 'images' not in request.files:
        return jsonify({'error': 'No images provided'}), 400
    
    files = request.files.getlist('images')
    if not files or not any(file.filename for file in files):
        return jsonify({'error': 'No valid images provided'}), 400
    
    # Generate batch ID
    batch_id = str(uuid.uuid4())
    logger.info(f"🚀 Batch upload received {len(files)} files on port {PORT}")
    logger.info(f"📦 Generated batch ID: {batch_id} for {len(files)} files on port {PORT}")
    
    # Prepare image data for Celery
    image_data_list = []
    for i, file in enumerate(files):
        if file and allowed_file(file.filename):
            # Reset file stream position to the beginning
            file.stream.seek(0)
            # Read image data
            file_data = file.stream.read()
            logger.info(f"📸 Processing file {i+1}/{len(files)}: {file.filename} ({len(file_data)} bytes) on port {PORT}")
            
            # Validate that we actually read data
            if len(file_data) == 0:
                logger.warning(f"⚠️  Warning: File {file.filename} appears to be empty or already read")
                continue
                
            image_data_list.append({
                'filename': secure_filename(file.filename),
                'data': file_data,
                'content_type': file.content_type
            })
    
    if not image_data_list:
        return jsonify({'error': 'No valid image files provided'}), 400
    
    logger.info(f"✅ Prepared {len(image_data_list)} images for batch processing on port {PORT}")
    
    # Send to Celery for processing
    try:
        from celery_worker import process_batch_images
    except ImportError:
        # Fallback import for Docker environment
        try:
            from backend.celery_worker import process_batch_images
        except ImportError:
            logger.warning("⚠️  Could not import Celery worker, falling back to local processing")
            return batch_upload_local_fallback()
    
    try:
        logger.info(f"🚀 Attempting to start Celery task for batch {batch_id} on port {PORT}")
        task = process_batch_images.delay(batch_id, image_data_list)
        logger.info(f"🎯 Started Celery task {task.id} for batch {batch_id} on port {PORT}")
        
        return jsonify({
            'batch_id': batch_id,
            'task_id': task.id,
            'status': 'processing',
            'message': f'Processing {len(image_data_list)} images'
        })
    except Exception as e:
        logger.error(f"❌ Celery task failed for batch {batch_id} on port {PORT}: {str(e)}")
        logger.warning(f"⚠️  Falling back to local processing for batch {batch_id}")
        return batch_upload_local_fallback()

def batch_upload_local_fallback():
    """Local fallback batch processing without Redis/Celery"""
    if 'images' not in request.files:
        return jsonify({'error': 'No images provided'}), 400
    
    files = request.files.getlist('images')
    if not files or not any(file.filename for file in files):
        return jsonify({'error': 'No valid images provided'}), 400
    
    # Generate batch ID
    batch_id = str(uuid.uuid4())
    logger.info(f"🚀 Local batch upload received {len(files)} files on port {PORT}")
    
    # Store initial batch info in local cache
    LOCAL_BATCH_CACHE[batch_id] = {
        'batch_id': batch_id,
        'status': 'processing',
        'total': len(files),
        'completed': 0,
        'created_at': datetime.utcnow().isoformat(),
        'server_port': PORT,
        'results': []
    }
    
    results = []
    for i, file in enumerate(files):
        if file and allowed_file(file.filename):
            try:
                # Process image synchronously
                file.stream.seek(0)
                prediction_result = predict_food_from_file(file)
                
                # Save to database
                prediction = Prediction(
                    filename=secure_filename(file.filename),
                    predicted_food=prediction_result['food'],
                    calories=prediction_result['calories'],
                    protein=prediction_result['protein'],
                    carbs=prediction_result['carbs'],
                    fat=prediction_result['fat']
                )
                
                db = SessionLocal()
                try:
                    db.add(prediction)
                    db.commit()
                    result_item = {
                        'filename': file.filename,
                        'predicted_food': prediction_result['food'],
                        'confidence': prediction_result['confidence'],
                        'nutrition': {
                            'calories': prediction_result['calories'],
                            'protein': prediction_result['protein'],
                            'carbs': prediction_result['carbs'],
                            'fat': prediction_result['fat']
                        },
                        'id': prediction.id
                    }
                    results.append(result_item)
                    logger.info(f"✅ Processed {file.filename}: {prediction_result['food']}")
                    
                    # Update batch cache
                    LOCAL_BATCH_CACHE[batch_id]['completed'] += 1
                    LOCAL_BATCH_CACHE[batch_id]['results'].append(result_item)
                    
                except Exception as e:
                    db.rollback()
                    logger.error(f"❌ Database error for {file.filename}: {e}")
                finally:
                    db.close()
                    
            except Exception as e:
                logger.error(f"❌ Processing error for {file.filename}: {e}")
    
    # Mark batch as completed in cache
    LOCAL_BATCH_CACHE[batch_id]['status'] = 'completed'
    LOCAL_BATCH_CACHE[batch_id]['completed_at'] = datetime.utcnow().isoformat()
    
    return jsonify({
        'batch_id': batch_id,
        'status': 'completed',
        'total_processed': len(results),
        'results': results,
        'message': f'Local processing completed for {len(results)} images'
    })

@app.route('/batch/status/<batch_id>')
def batch_status(batch_id):
    """Get batch processing status from Redis or local cache"""
    try:
        # First, try to get status from Redis (for Celery-processed batches)
        try:
            redis_client = get_redis_client()
            batch_data = redis_client.hgetall(f"batch:{batch_id}")
            
            if batch_data:
                logger.info(f"✅ Found batch {batch_id} in Redis on port {PORT}")
                
                # Convert Redis data to proper format
                status_data = {
                    'batch_id': batch_id,
                    'status': batch_data.get('status', 'unknown'),
                    'progress': int(batch_data.get('progress', 0)),
                    'total': int(batch_data.get('total', 0)),
                    'completed': int(batch_data.get('completed', 0)),
                    'started_at': batch_data.get('started_at'),
                    'completed_at': batch_data.get('completed_at'),
                    'results': json.loads(batch_data.get('results', '[]')) if batch_data.get('results') else [],
                    'server_port': PORT
                }
                
                return jsonify(status_data)
                
        except Exception as redis_error:
            logger.warning(f"⚠️  Redis check failed for batch {batch_id} on port {PORT}: {redis_error}")
        
        # Fallback to local cache (for local-processed batches)
        if batch_id in LOCAL_BATCH_CACHE:
            logger.info(f"✅ Found batch {batch_id} in local cache on port {PORT}")
            batch_data = LOCAL_BATCH_CACHE[batch_id]
            batch_data['server_port'] = PORT
            return jsonify(batch_data)
        
        # Batch not found
        logger.warning(f"❌ Batch {batch_id} not found on port {PORT}")
        return jsonify({
            'error': f'Batch {batch_id} not found',
            'server_port': PORT
        }), 404
        
    except Exception as e:
        logger.error(f"❌ Error checking batch status on port {PORT}: {e}")
        return jsonify({
            'error': 'Internal server error checking batch status',
            'server_port': PORT
        }), 500

@app.route('/batch/history')
def batch_history():
    """Get batch processing history with Redis fallback"""
    try:
        import redis
        # Try to create a Redis client and test the connection
        redis_client = get_redis_client()
        redis_client.ping()  # Test connection
        return batch_history_with_redis()
    except (ImportError, redis.exceptions.ConnectionError, redis.exceptions.RedisError, ConnectionRefusedError):
        return batch_history_local_fallback()

def batch_history_with_redis():
    """Redis-based batch history (original implementation)"""
    try:
        redis_client = get_redis_client()
        
        # Get all batch keys
        batch_keys = redis_client.keys("batch:*")
        batches = []
        
        for key in batch_keys:
            batch_data = redis_client.hgetall(key)
            if batch_data:
                # Convert bytes to strings
                batch_info = {k.decode() if isinstance(k, bytes) else k: 
                             v.decode() if isinstance(v, bytes) else v 
                             for k, v in batch_data.items()}
                
                batch_id = key.decode().split(':')[1]
                batch_info['batch_id'] = batch_id
                batches.append(batch_info)
        
        # Sort by creation time (newest first)
        batches.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify({
            'batches': batches[:20],  # Limit to 20 most recent
            'total': len(batches),
            'server_port': PORT
        })
        
    except Exception as e:
        logger.error(f"❌ Batch history error on port {PORT}: {str(e)}")
        return jsonify({'error': f'History retrieval failed: {str(e)}'}), 500

def batch_history_local_fallback():
    """Local fallback - return recent predictions as batch history"""
    try:
        db = SessionLocal()
        try:
            # Get recent predictions grouped by timestamp (simulating batches)
            predictions = db.query(Prediction).order_by(Prediction.timestamp.desc()).limit(60).all()
            
            # Group predictions by minute to simulate batch operations
            from collections import defaultdict
            import datetime
            
            batches = defaultdict(list)
            for pred in predictions:
                # Group by minute
                minute_key = pred.timestamp.replace(second=0, microsecond=0)
                batches[minute_key].append({
                    'filename': pred.filename,
                    'predicted_food': pred.predicted_food,
                    'calories': pred.calories,
                    'protein': pred.protein,
                    'carbs': pred.carbs,
                    'fat': pred.fat,
                    'id': pred.id
                })
            
            # Convert to batch format
            batch_list = []
            for timestamp, items in list(batches.items())[:10]:  # Last 10 "batches"
                batch_list.append({
                    'batch_id': f"local_{timestamp.strftime('%Y%m%d_%H%M')}",
                    'status': 'completed',
                    'total': len(items),
                    'completed': len(items),
                    'created_at': timestamp.isoformat(),
                    'results': items
                })
            
            return jsonify({
                'batches': batch_list,
                'total': len(batch_list),
                'server_port': PORT,
                'message': 'Local batch history (grouped predictions)'
            })
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Local batch history error on port {PORT}: {str(e)}")
        return jsonify({'error': f'History retrieval failed: {str(e)}'}), 500

def get_redis_client():
    """Get Redis client using environment variables"""
    import redis
    import urllib.parse
    
    redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    if redis_url.startswith('redis://'):
        # Parse Redis URL
        parsed = urllib.parse.urlparse(redis_url)
        # Extract database number from path or default to 0
        db_num = 0
        if parsed.path and parsed.path.strip('/'):
            try:
                db_num = int(parsed.path.strip('/'))
            except ValueError:
                db_num = 0
        
        return redis.Redis(
            host=parsed.hostname or 'localhost',
            port=parsed.port or 6379,
            db=db_num,  # Use database from URL (0 for Docker)
            decode_responses=True
        )
    else:
        # Fallback for local development
        return redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def allowed_file(filename):
    """Check if file has allowed extension"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def predict_food_from_file(file):
    """Predict food from a file object (used by batch fallback)"""
    try:
        # Get the model
        model = get_model()
        if model is None:
            raise Exception('Model not available')
        
        # Process image and get prediction
        with torch.no_grad():
            image_tensor = process_image(file)
            outputs = model(image_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            
            # Get top prediction
            top_prob, top_class = torch.topk(probabilities, 1)
            predicted_idx = top_class.item()
            confidence = top_prob.item()
            
            # Get class name
            predicted_class = class_idx.get(predicted_idx, 'unknown')
            
            # Get nutrition info
            nutrition = get_nutrition_info(predicted_class)
            
            return {
                'food': predicted_class,
                'confidence': confidence,
                'calories': nutrition['calories'],
                'protein': nutrition['protein'],
                'carbs': nutrition['carbs'],
                'fat': nutrition['fat']
            }
            
    except Exception as e:
        logger.error(f"Error predicting food from file: {str(e)}")
        raise

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    # Start the Flask app
    print(f"🚀 Starting Backend Server on port {PORT}")
    print(f"📁 Upload directory: {upload_dir}")
    print(f"🗄️  Database: {DATABASE_PATH}")
    app.run(debug=False, host='0.0.0.0', port=PORT, threaded=True) 