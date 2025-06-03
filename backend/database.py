#!/usr/bin/env python3
"""
Database models and configuration for Food Calorie Estimator
Docker-ready with shared volume support
"""

import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Docker-friendly database configuration
DATABASE_PATH = os.getenv('DATABASE_PATH', 'food_predictions.db')

# Ensure the directory exists for shared database
if DATABASE_PATH.startswith('/app/shared/'):
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)

DATABASE_URL = f'sqlite:///{DATABASE_PATH}'

# Database setup with Docker-optimized settings
engine = create_engine(
    DATABASE_URL, 
    echo=False, 
    connect_args={
        'check_same_thread': False,
        'timeout': 30,  # Longer timeout for shared database access
        'isolation_level': None  # Autocommit mode for better concurrency
    },
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600    # Recycle connections every hour
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

class Prediction(Base):
    """
    Prediction model for storing food calorie estimation results
    """
    __tablename__ = 'predictions'
    
    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    predicted_food = Column(String(100), nullable=False)
    calories = Column(Float, default=0.0)
    protein = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    fat = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Prediction(id={self.id}, food='{self.predicted_food}', calories={self.calories})>"

def init_db():
    """Initialize database tables with Docker support"""
    try:
        logger.info(f"🗄️  Initializing database at: {DATABASE_PATH}")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
        
        # Test connection
        with SessionLocal() as session:
            session.execute(text('SELECT 1'))
            session.commit()
        
        logger.info("✅ Database connection test successful")
        logger.info(f"🐳 Database ready for container use: {DATABASE_PATH}")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

if __name__ == "__main__":
    # Initialize database when run directly
    init_db() 