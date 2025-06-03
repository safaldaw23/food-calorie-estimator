"""
Celery Worker for Batch Food Image Analysis
"""
import os
import uuid
import json
import time
from io import BytesIO
from PIL import Image
import torch
import torchvision.transforms as transforms
from torchvision import models
from celery import Celery
import redis
from werkzeug.utils import secure_filename
from datetime import datetime

# Import shared database components (same as backend)
from database import SessionLocal, Prediction, init_db

# Initialize the database using the same setup as backend
init_db()

# Configure Celery
celery_app = Celery('batch_processor')
celery_app.conf.broker_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
celery_app.conf.result_backend = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Redis connection for progress tracking
import redis
redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
redis_client = redis.Redis.from_url(redis_url, decode_responses=True)

# Food classes and nutrition data
FOOD_CLASSES = [
    'apple_pie', 'baby_back_ribs', 'baklava', 'beef_carpaccio', 'beef_tartare',
    'beet_salad', 'beignets', 'bibimbap', 'bread_pudding', 'breakfast_burrito',
    'bruschetta', 'caesar_salad', 'cannoli', 'caprese_salad', 'carrot_cake',
    'ceviche', 'cheese_plate', 'cheesecake', 'chicken_curry', 'chicken_quesadilla',
    'chicken_wings', 'chocolate_cake', 'chocolate_mousse', 'churros', 'clam_chowder',
    'club_sandwich', 'crab_cakes', 'creme_brulee', 'croque_madame', 'cup_cakes',
    'deviled_eggs', 'donuts', 'dumplings', 'edamame', 'eggs_benedict',
    'escargots', 'falafel', 'filet_mignon', 'fish_and_chips', 'foie_gras',
    'french_fries', 'french_onion_soup', 'french_toast', 'fried_calamari', 'fried_rice',
    'frozen_yogurt', 'garlic_bread', 'gnocchi', 'greek_salad', 'grilled_cheese_sandwich',
    'grilled_salmon', 'guacamole', 'gyoza', 'hamburger', 'hot_and_sour_soup',
    'hot_dog', 'huevos_rancheros', 'hummus', 'ice_cream', 'lasagna',
    'lobster_bisque', 'lobster_roll_sandwich', 'macaroni_and_cheese', 'macarons', 'miso_soup',
    'mussels', 'nachos', 'omelette', 'onion_rings', 'oysters',
    'pad_thai', 'paella', 'pancakes', 'panna_cotta', 'peking_duck',
    'pho', 'pizza', 'pork_chop', 'poutine', 'prime_rib',
    'pulled_pork_sandwich', 'ramen', 'ravioli', 'red_velvet_cake', 'risotto',
    'samosa', 'sashimi', 'scallops', 'seaweed_salad', 'shrimp_and_grits',
    'spaghetti_bolognese', 'spaghetti_carbonara', 'spring_rolls', 'steak', 'strawberry_shortcake',
    'sushi', 'tacos', 'takoyaki', 'tiramisu', 'tuna_tartare', 'waffles'
]

NUTRITION_DATA = {
    'pizza': {'calories': 285, 'protein': 12.0, 'carbs': 36.0, 'fat': 10.4},
    'hamburger': {'calories': 295, 'protein': 17.0, 'carbs': 31.0, 'fat': 12.0},
    'ice_cream': {'calories': 207, 'protein': 3.5, 'carbs': 24.0, 'fat': 11.0},
    'french_fries': {'calories': 365, 'protein': 4.0, 'carbs': 63.0, 'fat': 17.0},
    'hot_dog': {'calories': 290, 'protein': 10.4, 'carbs': 2.0, 'fat': 26.0},
    'donuts': {'calories': 452, 'protein': 4.9, 'carbs': 51.0, 'fat': 25.0},
    'caesar_salad': {'calories': 147, 'protein': 2.8, 'carbs': 5.0, 'fat': 13.0},
    'chocolate_cake': {'calories': 235, 'protein': 4.0, 'carbs': 35.0, 'fat': 10.0},
    'sushi': {'calories': 156, 'protein': 7.0, 'carbs': 20.0, 'fat': 5.8},
    'tacos': {'calories': 226, 'protein': 9.0, 'carbs': 21.0, 'fat': 11.0}
}

def get_default_nutrition():
    return {'calories': 200, 'protein': 8.0, 'carbs': 25.0, 'fat': 8.0}

# Load the model
def load_model():
    try:
        # Use the same model as regular analyze - pre-trained ResNet50 with ImageNet classes
        model = models.resnet50(pretrained=True)
        model.eval()
        return model
    except Exception as e:
        print(f"Model loading error: {e}")
        return None

# Load ImageNet class labels (same as regular analyze)
def load_imagenet_classes():
    """Load ImageNet class labels"""
    try:
        import json
        # If the class index file exists, use it
        if os.path.exists('/app/imagenet_class_index.json'):
            with open('/app/imagenet_class_index.json', 'r') as f:
                class_index = json.load(f)
                return {int(idx): labels[1] for idx, labels in class_index.items()}
        else:
            # Fallback - return a simple mapping for common food classes
            return {
                941: 'pizza',
                927: 'hamburger',
                928: 'cheeseburger', 
                963: 'ice_cream',
                965: 'hot_dog',
                950: 'french_fries'
            }
    except Exception as e:
        print(f"Error loading class labels: {e}")
        return {941: 'pizza'}  # Basic fallback

# Load class mapping
IMAGENET_CLASSES = load_imagenet_classes()

def get_nutrition_info(food_name):
    """Get nutrition information for a food item (same as regular analyze)"""
    # Default nutrition values if not found
    default_nutrition = {
        'calories': 200,
        'protein': 10,
        'carbs': 25,
        'fat': 8
    }
    
    # Enhanced nutrition database
    enhanced_nutrition_data = {
        'pizza': {'calories': 285, 'protein': 12.0, 'carbs': 36.0, 'fat': 10.4},
        'hamburger': {'calories': 295, 'protein': 17.0, 'carbs': 31.0, 'fat': 12.0},
        'cheeseburger': {'calories': 535, 'protein': 31.0, 'carbs': 40.0, 'fat': 31.0},
        'ice_cream': {'calories': 207, 'protein': 3.5, 'carbs': 24.0, 'fat': 11.0},
        'french_fries': {'calories': 365, 'protein': 4.0, 'carbs': 63.0, 'fat': 17.0},
        'hot_dog': {'calories': 290, 'protein': 10.4, 'carbs': 2.0, 'fat': 26.0},
        'taco': {'calories': 226, 'protein': 9.0, 'carbs': 21.0, 'fat': 11.0},
        'burrito': {'calories': 326, 'protein': 15.0, 'carbs': 43.0, 'fat': 11.0},
        'sandwich': {'calories': 250, 'protein': 12.0, 'carbs': 30.0, 'fat': 9.0}
    }
    
    # Try to find the food in our nutrition database
    food_lower = food_name.lower().replace('_', ' ')
    for key, nutrition in enhanced_nutrition_data.items():
        if food_lower in key.lower() or key.lower() in food_lower:
            return nutrition
    
    return default_nutrition

# Image preprocessing
def preprocess_image(image):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return transform(image).unsqueeze(0)

# Batch processing task
@celery_app.task(bind=True)
def process_batch_images(self, batch_id, image_data_list):
    """
    Process multiple images in batch
    """
    try:
        # Update progress
        redis_client.hset(f"batch:{batch_id}", mapping={
            'status': 'processing',
            'progress': 0,
            'total': len(image_data_list),
            'completed': 0,
            'started_at': datetime.utcnow().isoformat()
        })
        
        # Load model
        model = load_model()
        if model is None:
            raise Exception("Failed to load model")
        
        results = []
        session = SessionLocal()
        
        for i, image_data in enumerate(image_data_list):
            try:
                # Decode image
                image_bytes = BytesIO(image_data['data'])
                image = Image.open(image_bytes).convert('RGB')
                
                # Process image
                input_tensor = preprocess_image(image)
                
                with torch.no_grad():
                    outputs = model(input_tensor)
                    probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
                    
                    # Get top prediction (same as regular analyze)
                    top_prob, top_class = torch.topk(probabilities, 1)
                    predicted_idx = top_class.item()
                    confidence = top_prob.item()
                    
                    # Get class name from ImageNet classes
                    predicted_food = IMAGENET_CLASSES.get(predicted_idx, 'unknown')
                
                # Get nutrition info
                nutrition = get_nutrition_info(predicted_food)
                
                # Save to database (using same schema as backend)
                prediction = Prediction(
                    filename=image_data['filename'],
                    predicted_food=predicted_food,
                    calories=nutrition['calories'],
                    protein=nutrition['protein'],
                    carbs=nutrition['carbs'],
                    fat=nutrition['fat']
                    # Note: confidence and batch_id not in backend schema
                )
                session.add(prediction)
                session.commit()
                
                # Prepare result (include confidence for API response)
                result = {
                    'filename': image_data['filename'],
                    'predicted_food': predicted_food,
                    'confidence': confidence,
                    'nutrition': nutrition,
                    'id': prediction.id
                }
                results.append(result)
                
                # Update progress
                completed = i + 1
                progress = int((completed / len(image_data_list)) * 100)
                redis_client.hset(f"batch:{batch_id}", mapping={
                    'progress': progress,
                    'completed': completed,
                    'last_processed': image_data['filename']
                })
                
                # Small delay to show progress
                time.sleep(0.1)
                
            except Exception as e:
                print(f"Error processing image {image_data['filename']}: {e}")
                results.append({
                    'filename': image_data['filename'],
                    'error': str(e)
                })
        
        session.close()
        
        # Update final status
        redis_client.hset(f"batch:{batch_id}", mapping={
            'status': 'completed',
            'progress': 100,
            'completed': len(results),
            'finished_at': datetime.utcnow().isoformat(),
            'results': json.dumps(results)
        })
        
        return {
            'batch_id': batch_id,
            'status': 'completed',
            'total_processed': len(results),
            'results': results
        }
        
    except Exception as e:
        # Update error status
        redis_client.hset(f"batch:{batch_id}", mapping={
            'status': 'failed',
            'error': str(e),
            'failed_at': datetime.utcnow().isoformat()
        })
        raise e

if __name__ == '__main__':
    # For testing
    celery_app.start() 