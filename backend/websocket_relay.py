from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import redis
import json
import threading
import os
from redis import Redis
from typing import Optional

app = Flask(__name__)
socketio = SocketIO(
    app, 
    logger=True, 
    engineio_logger=True,
    cors_allowed_origins=["http://localhost:5173", "http://localhost:5174", "*"]
)

# Configuration
REDIS_URI = os.getenv('REDIS_URI', 'redis://redis:6379/0')

# Redis connection for pub/sub
redis_client: Optional[Redis] = redis.from_url(REDIS_URI, decode_responses=True)

def redis_listener():
    """Listen to Redis pub/sub channels and broadcast to WebSocket clients"""
    assert redis_client is not None
    pubsub = redis_client.pubsub()
    pubsub.subscribe(['stock_updates', 'product_updates'])
    
    print("Redis listener started...")
    
    for message in pubsub.listen():
        if message['type'] == 'message':
            try:
                channel = message['channel'].decode('utf-8')
                data = json.loads(message['data'].decode('utf-8'))
                
                print(f"Received message on {channel}: {data}")
                
                if channel == 'stock_updates':
                    socketio.emit('stock_update', data)
                elif channel == 'product_updates':
                    socketio.emit('product_update', data)
                    
            except Exception as e:
                print(f"Error processing Redis message: {e}")

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")  # type: ignore
    emit('connected', {'message': 'Connected to Commercify WebSocket server'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")  # type: ignore

@socketio.on('join_room')
def handle_join_room(data):
    room = data.get('room')
    if room:
        join_room(room)
        emit('joined_room', {'room': room})

@socketio.on('leave_room')
def handle_leave_room(data):
    room = data.get('room')
    if room:
        leave_room(room)
        emit('left_room', {'room': room})

@app.route('/health', methods=['GET'])
def health_check():
    return {'status': 'healthy', 'service': 'websocket_relay'}, 200

if __name__ == '__main__':
    # Start Redis listener in a separate thread
    listener_thread = threading.Thread(target=redis_listener, daemon=True)
    listener_thread.start()
    
    print("Starting WebSocket relay service...")
    socketio.run(app, host='0.0.0.0', port=5003, debug=True, allow_unsafe_werkzeug=True)