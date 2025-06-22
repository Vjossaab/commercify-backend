import { io, Socket } from 'socket.io-client';

interface ProductUpdateData {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    image: string;
    sellerId: string;
    createdAt: string;
  };
  action: 'created' | 'updated' | 'deleted';
  timestamp: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:8081', {
      transports: ['websocket'],
      autoConnect: true,
    });

    if (this.socket) {
      this.socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.handleReconnect();
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, 2000 * this.reconnectAttempts);
    }
  }

  subscribeToStockUpdates(callback: (data: { productId: string; stock: number }) => void): void {
    if (!this.socket) return;
    this.socket.on('stock_update', callback);
  }

  subscribeToProductUpdates(callback: (data: ProductUpdateData) => void): void {
    if (!this.socket) return;
    this.socket.on('product_update', callback);
  }

  unsubscribe(event: string): void {
    if (!this.socket) return;
    this.socket.off(event);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();