from flask import Flask, request, jsonify
import bcrypt
import jwt
import datetime
from pymongo import MongoClient
import os
from functools import wraps

app = Flask(__name__)

# Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://mongodb:27017/commercify')

# MongoDB connection
client = MongoClient(MONGO_URI)
db = client.commercify
users_collection = db.users

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user = users_collection.find_one({'_id': data['user_id']})
            if not current_user:
                return jsonify({'message': 'Invalid token'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if data is None:
            return jsonify({'message': 'Invalid JSON data'}), 400
            
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'buyer')
        
        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400
        
        if role not in ['buyer', 'seller']:
            return jsonify({'message': 'Role must be buyer or seller'}), 400
        
        # Check if user already exists
        if users_collection.find_one({'email': email}):
            return jsonify({'message': 'User already exists'}), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create user
        user_data = {
            'email': email,
            'password': hashed_password,
            'role': role,
            'created_at': datetime.datetime.utcnow()
        }
        
        result = users_collection.insert_one(user_data)
        user_id = str(result.inserted_id)
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': user_id,
            'email': email,
            'role': role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {
                'id': user_id,
                'email': email,
                'role': role
            }
        }), 201
        
    except Exception as e:
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if data is None:
            return jsonify({'message': 'Invalid JSON data'}), 400
            
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400
        
        # Find user
        user = users_collection.find_one({'email': email})
        if not user:
            return jsonify({'message': 'Invalid credentials'}), 401
        
        # Check password
        if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return jsonify({'message': 'Invalid credentials'}), 401
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'email': user['email'],
            'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Login failed: {str(e)}'}), 500

@app.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    # In a production system, you might want to blacklist the token
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/verify', methods=['GET'])
@token_required
def verify_token(current_user):
    return jsonify({
        'user': {
            'id': str(current_user['_id']),
            'email': current_user['email'],
            'role': current_user['role']
        }
    }), 200

if __name__ == '__main__':
    # Ensure indexes
    users_collection.create_index('email', unique=True)
    app.run(host='0.0.0.0', port=5000, debug=True)

@app.route('/')
def index():
    return 'Auth service is live!'
