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
orders_collection = db.orders
products_collection = db.products

# Redis connection
redis_client: Optional[Redis] = redis.from_url(REDIS_URI, decode_responses=True)

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

@app.route('/orders', methods=['POST'])
@token_required
def create_order(current_user):
    try:
        if current_user['role'] != 'buyer':
            return jsonify({'message': 'Only buyers can create orders'}), 403
        
        data = request.get_json()
        if data is None:
            return jsonify({'message': 'Invalid JSON data'}), 400
            
        items = data.get('items', [])
        
        if not items:
            return jsonify({'message': 'Order items are required'}), 400
        
        order_items = []
        total_amount = 0
        
        # Process each item and update stock
        for item in items:
            product_id = item.get('productId')
            quantity = int(item.get('quantity', 1))
            
            if not product_id or quantity <= 0:
                return jsonify({'message': 'Invalid item data'}), 400
            
            # Get product and check stock
            product = products_collection.find_one({'_id': ObjectId(product_id)})
            if not product:
                return jsonify({'message': f'Product {product_id} not found'}), 404
            
            if product['stock'] < quantity:
                return jsonify({
                    'message': f'Insufficient stock for {product["name"]}. Available: {product["stock"]}'
                }), 400
            
            # Calculate item total
            item_total = product['price'] * quantity
            total_amount += item_total
            
            # Prepare order item
            order_items.append({
                'productId': str(product['_id']),
                'productName': product['name'],
                'quantity': quantity,
                'price': product['price'],
                'total': item_total
            })
            
            # Update product stock
            new_stock = product['stock'] - quantity
            products_collection.update_one(
                {'_id': ObjectId(product_id)},
                {
                    '$set': {
                        'stock': new_stock,
                        'updated_at': datetime.datetime.utcnow()
                    }
                }
            )
            
            # Publish stock update for real-time sync
            publish_stock_update(product_id, new_stock)
        
        # Create order
        order_data = {
            'userId': current_user['user_id'],
            'userEmail': current_user['email'],
            'items': order_items,
            'total': total_amount,
            'status': 'confirmed',
            'created_at': datetime.datetime.utcnow()
        }
        
        result = orders_collection.insert_one(order_data)
        order_id = str(result.inserted_id)
        
        # Prepare response
        order_data['id'] = order_id
        if '_id' in order_data:
            del order_data['_id']
        order_data['createdAt'] = order_data['created_at'].isoformat()
        del order_data['created_at']
        
        return jsonify(order_data), 201
    except Exception as e:
        return jsonify({'message': f'Failed to create order: {str(e)}'}), 500

@app.route('/orders/<user_id>', methods=['GET'])
@token_required
def get_user_orders(current_user, user_id):
    try:
        # Users can only view their own orders
        if current_user['user_id'] != user_id:
            return jsonify({'message': 'Unauthorized'}), 403
        
        orders = list(orders_collection.find({'userId': user_id}).sort('created_at', -1))
        
        # Convert ObjectId to string for JSON serialization
        for order in orders:
            order['id'] = str(order['_id'])
            del order['_id']
            order['createdAt'] = order['created_at'].isoformat()
            del order['created_at']
        
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'message': f'Failed to fetch orders: {str(e)}'}), 500

@app.route('/orders/<order_id>/status', methods=['PUT'])
@token_required
def update_order_status(current_user, order_id):
    try:
        data = request.get_json()
        if data is None:
            return jsonify({'message': 'Invalid JSON data'}), 400
            
        new_status = data.get('status')
        
        valid_statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
        if new_status not in valid_statuses:
            return jsonify({'message': 'Invalid status'}), 400
        
        # Find order
        order = orders_collection.find_one({'_id': ObjectId(order_id)})
        if not order:
            return jsonify({'message': 'Order not found'}), 404
        
        # Authorization check (users can only update their own orders, or sellers can update orders for their products)
        if current_user['role'] == 'buyer' and order['userId'] != current_user['user_id']:
            return jsonify({'message': 'Unauthorized'}), 403
        
        # Update order status
        orders_collection.update_one(
            {'_id': ObjectId(order_id)},
            {
                '$set': {
                    'status': new_status,
                    'updated_at': datetime.datetime.utcnow()
                }
            }
        )
        
        return jsonify({'message': 'Order status updated successfully', 'status': new_status}), 200
    except Exception as e:
        return jsonify({'message': f'Failed to update order status: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'order_service'}), 200

if __name__ == '__main__':
    # Ensure indexes
    orders_collection.create_index('userId')
    orders_collection.create_index('created_at')
    orders_collection.create_index([('userId', 1), ('created_at', -1)])
    
    app.run(host='0.0.0.0', port=5002, debug=True)