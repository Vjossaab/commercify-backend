import axios from 'axios';
import { Product } from '../types';

const API_BASE_URL = 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('commercify_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (email: string, password: string, role: 'buyer' | 'seller') =>
    api.post('/auth/register', { email, password, role }),
  
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  logout: () =>
    api.post('/auth/logout'),
};

// Catalog API
export const catalogAPI = {
  getProducts: () => api.get('/catalog/products'),
  
  createProduct: (product: Omit<Product, 'id' | 'createdAt' | 'sellerId'>) =>
    api.post('/catalog/products', product),
  
  updateProduct: (id: string, product: Partial<Omit<Product, 'id' | 'createdAt' | 'sellerId'>>) =>
    api.put(`/catalog/products/${id}`, product),
  
  deleteProduct: (id: string) =>
    api.delete(`/catalog/products/${id}`),
  
  updateStock: (productId: string, stock: number) =>
    api.post(`/catalog/stock/${productId}`, { stock }),
};

// Order API  
export const orderAPI = {
  createOrder: (items: Array<{ productId: string; quantity: number }>) =>
    api.post('/orders', { items }),
  
  getOrders: (userId: string) =>
    api.get(`/orders/${userId}`),
};