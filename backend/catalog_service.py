from flask import Flask, request, jsonify
import jwt
from pymongo import MongoClient
import os
import datetime
import redis
import json
from functools import wraps
from bson.objectid import ObjectId
from redis import Redis
from typing import Optional

app = Flask(__name__)

# Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://mongodb:27017/commercify')
REDIS_URI = os.getenv('REDIS_URI', 'redis://redis:6379/0')

# MongoDB connection
client = MongoClient(MONGO_URI)
db = client.commercify
products_collection = db.products

# Redis connection for pub/sub
redis_client: Optional[Redis] = redis.from_url(REDIS_URI, decode_responses=True)
if redis_client is None:
    raise ConnectionError("Could not connect to Redis")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def publish_stock_update(product_id, stock):
    """Publish stock update to Redis for real-time notifications"""
    try:
        assert redis_client is not None
        message = {
            'productId': product_id,
            'stock': stock,
            'timestamp': datetime.datetime.utcnow().isoformat()
        }
        redis_client.publish('stock_updates', json.dumps(message))
    except Exception as e:
        print(f"Failed to publish stock update: {e}")

def publish_product_update(product_data, action):
    """Publish product update to Redis for real-time notifications"""
    try:
        assert redis_client is not None
        message = {
            'product': product_data,
            'action': action,  # 'created', 'updated', 'deleted'
            'timestamp': datetime.datetime.utcnow().isoformat()
        }
        redis_client.publish('product_updates', json.dumps(message))
    except Exception as e:
        print(f"Failed to publish product update: {e}")

@app.route('/products', methods=['GET'])
def get_products():
    try:
        products = list(products_collection.find())
        
        # Convert ObjectId to string for JSON serialization
        for product in products:
            product['id'] = str(product['_id'])
            del product['_id']
        
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'message': f'Failed to fetch products: {str(e)}'}), 500

@app.route('/products', methods=['POST'])
@token_required
def create_product(current_user):
    try:
        if current_user['role'] != 'seller':
            return jsonify({'message': 'Only sellers can create products'}), 403
        
        data = request.get_json()
        if data is None:
            return jsonify({'message': 'Invalid JSON data'}), 400
        
        # Validate required fields
        required_fields = ['name', 'description', 'price', 'stock', 'category', 'image']
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'{field} is required'}), 400
        
        product_data = {
            'name': data['name'],
            'description': data['description'],
            'price': float(data['price']),
            'stock': int(data['stock']),
            'category': data['category'],
            'image': data['image'],
            'sellerId': current_user['user_id'],
            'created_at': datetime.datetime.utcnow()
        }
        
        result = products_collection.insert_one(product_data)
        product_id = str(result.inserted_id)
        
        # Prepare product data for response
        product_data['id'] = product_id
        if '_id' in product_data:
            del product_data['_id']
        product_data['createdAt'] = product_data['created_at'].isoformat()
        del product_data['created_at']
        
        # Publish product creation event
        publish_product_update(product_data, 'created')
        
        return jsonify(product_data), 201
    except Exception as e:
        return jsonify({'message': f'Failed to create product: {str(e)}'}), 500

@app.route('/products/<product_id>', methods=['PUT'])
@token_required
def update_product(current_user, product_id):
    try:
        if current_user['role'] != 'seller':
            return jsonify({'message': 'Only sellers can update products'}), 403
        
        # Check if product exists and belongs to the seller
        product = products_collection.find_one({
            '_id': ObjectId(product_id),
            'sellerId': current_user['user_id']
        })
        
        if not product:
            return jsonify({'message': 'Product not found or unauthorized'}), 404
        
        data = request.get_json()
        if data is None:
            return jsonify({'message': 'Invalid JSON data'}), 400
            
        update_data = {}
        
        # Update only provided fields
        updateable_fields = ['name', 'description', 'price', 'stock', 'category', 'image']
        for field in updateable_fields:
            if field in data:
                if field in ['price', 'stock']:
                    update_data[field] = float(data[field]) if field == 'price' else int(data[field])
                else:
                    update_data[field] = data[field]
        
        if update_data:
            update_data['updated_at'] = datetime.datetime.utcnow()
            products_collection.update_one(
                {'_id': ObjectId(product_id)},
                {'$set': update_data}
            )
            
            # Get updated product
            updated_product = products_collection.find_one({'_id': ObjectId(product_id)})
            if updated_product:
                updated_product['id'] = str(updated_product['_id'])
                del updated_product['_id']
                
                # Publish stock update if stock was changed
                if 'stock' in update_data:
                    publish_stock_update(product_id, update_data['stock'])
                
                # Publish product update event
                publish_product_update(updated_product, 'updated')
                
                return jsonify(updated_product), 200
        
        return jsonify({'message': 'No fields to update'}), 400
    except Exception as e:
        return jsonify({'message': f'Failed to update product: {str(e)}'}), 500

@app.route('/products/<product_id>', methods=['DELETE'])
@token_required
def delete_product(current_user, product_id):
    try:
        if current_user['role'] != 'seller':
            return jsonify({'message': 'Only sellers can update products'}), 403
        
        # Check if product exists and belongs to the seller
        product = products_collection.find_one({
            '_id': ObjectId(product_id),
            'sellerId': current_user['user_id']
        })
        
        if not product:
            return jsonify({'message': 'Product not found or unauthorized'}), 404
        
        products_collection.delete_one({'_id': ObjectId(product_id)})
        
        # Publish product deletion event
        product['id'] = str(product['_id'])
        del product['_id']
        publish_product_update(product, 'deleted')
        
        return jsonify({'message': 'Product deleted successfully'}), 200
    except Exception as e:
        return jsonify({'message': f'Failed to delete product: {str(e)}'}), 500

@app.route('/stock/<product_id>', methods=['POST'])
@token_required
def update_stock(current_user, product_id):
    try:
        data = request.get_json()
        if data is None:
            return jsonify({'message': 'Invalid JSON data'}), 400
            
        new_stock = int(data.get('stock', 0))
        
        # For buyers, this is typically called during order processing
        # For sellers, this is manual stock management
        if current_user['role'] == 'seller':
            # Seller updating their own product stock
            product = products_collection.find_one({
                '_id': ObjectId(product_id),
                'sellerId': current_user['user_id']
            })
            
            if not product:
                return jsonify({'message': 'Product not found or unauthorized'}), 404
        
        # Update stock
        result = products_collection.update_one(
            {'_id': ObjectId(product_id)},
            {'$set': {'stock': new_stock, 'updated_at': datetime.datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            return jsonify({'message': 'Product not found'}), 404
        
        # Publish stock update for real-time sync
        publish_stock_update(product_id, new_stock)
        
        return jsonify({'message': 'Stock updated successfully', 'stock': new_stock}), 200
    except Exception as e:
        return jsonify({'message': f'Failed to update stock: {str(e)}'}), 500

if __name__ == '__main__':
    # Ensure indexes
    products_collection.create_index('sellerId')
    products_collection.create_index('category')
    products_collection.create_index('created_at')
    
    app.run(host='0.0.0.0', port=5001, debug=True)