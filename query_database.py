#!/usr/bin/env python3
"""
Database Query Tool for Food Calorie Estimator
Execute SQL queries using SQLAlchemy ORM and raw SQL
"""

import sys
import os
sys.path.append('backend')

from database import SessionLocal, Prediction, engine
from sqlalchemy import text

def execute_raw_sql(query):
    """Execute raw SQL query"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query))
            rows = result.fetchall()
            columns = result.keys()
            
            # Print results in a table format
            if columns:
                print(" | ".join([str(col) for col in columns]))
                print("-" * (len(columns) * 15))
                
            for row in rows:
                print(" | ".join([str(value) for value in row]))
                
            print(f"\n{len(rows)} rows returned")
            return rows
    except Exception as e:
        print(f"Error executing query: {e}")
        return None

def execute_orm_query():
    """Execute queries using SQLAlchemy ORM"""
    session = SessionLocal()
    try:
        # Example ORM queries
        print("=== ORM Query Examples ===")
        
        # Count all predictions
        total = session.query(Prediction).count()
        print(f"Total predictions: {total}")
        
        # Get recent predictions
        recent = session.query(Prediction).order_by(Prediction.timestamp.desc()).limit(3).all()
        print(f"\nRecent predictions:")
        for pred in recent:
            print(f"- {pred.predicted_food}: {pred.calories} calories (ID: {pred.id})")
        
        # Get average calories by food type
        from sqlalchemy import func
        avg_calories = session.query(
            Prediction.predicted_food,
            func.avg(Prediction.calories).label('avg_calories'),
            func.count(Prediction.id).label('count')
        ).group_by(Prediction.predicted_food).order_by(func.count(Prediction.id).desc()).limit(5).all()
        
        print(f"\nTop foods by count with average calories:")
        for food, avg_cal, count in avg_calories:
            print(f"- {food}: {avg_cal:.1f} avg calories ({count} predictions)")
            
    except Exception as e:
        print(f"Error with ORM query: {e}")
    finally:
        session.close()

def interactive_query():
    """Interactive SQL query mode"""
    print("\n=== Interactive SQL Query Mode ===")
    print("Type 'exit' to quit, 'help' for examples")
    
    while True:
        try:
            query = input("\nSQL> ").strip()
            
            if query.lower() == 'exit':
                break
            elif query.lower() == 'help':
                print("\nExample queries:")
                print("- SELECT * FROM predictions LIMIT 5;")
                print("- SELECT predicted_food, AVG(calories) FROM predictions GROUP BY predicted_food;")
                print("- SELECT * FROM predictions WHERE calories > 300;")
                print("- SELECT COUNT(*) FROM predictions WHERE predicted_food LIKE '%pizza%';")
                continue
            elif not query:
                continue
                
            execute_raw_sql(query)
            
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    print("🗄️  Food Calorie Estimator - Database Query Tool")
    print("=" * 50)
    
    # Show database info
    db_path = os.getenv('DATABASE_PATH', 'shared/food_predictions.db')
    print(f"Database: {db_path}")
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--raw":
            # Execute raw SQL from command line
            if len(sys.argv) > 2:
                query = " ".join(sys.argv[2:])
                print(f"Executing: {query}")
                execute_raw_sql(query)
            else:
                print("Usage: python query_database.py --raw 'SELECT * FROM predictions LIMIT 5;'")
        elif sys.argv[1] == "--interactive":
            interactive_query()
        else:
            print("Usage:")
            print("  python query_database.py --orm")
            print("  python query_database.py --raw 'SQL QUERY'")
            print("  python query_database.py --interactive")
    else:
        # Default: Show ORM examples
        execute_orm_query()
        
        print("\n" + "=" * 50)
        print("Usage examples:")
        print("  python query_database.py --interactive")
        print("  python query_database.py --raw 'SELECT * FROM predictions LIMIT 5;'") 