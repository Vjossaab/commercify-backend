import { useState, useEffect } from 'react';
import { CartItem, Product } from '../types';

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('commercify_cart');
      console.log('useCart: Loading from localStorage:', savedCart);
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          console.log('useCart: Parsed cart from localStorage:', parsedCart);
          if (Array.isArray(parsedCart)) {
            setItems(parsedCart);
          } else {
            console.error('useCart: Parsed cart is not an array:', parsedCart);
            localStorage.removeItem('commercify_cart');
          }
        } catch (error) {
          console.error('useCart: Error parsing cart from localStorage:', error);
          localStorage.removeItem('commercify_cart');
        }
      }
    } catch (error) {
      console.error('useCart: Error accessing localStorage:', error);
    }
  }, []);

  useEffect(() => {
    try {
      console.log('useCart: Saving to localStorage:', items);
      localStorage.setItem('commercify_cart', JSON.stringify(items));
      console.log('Cart updated:', items);
    } catch (error) {
      console.error('useCart: Error saving to localStorage:', error);
    }
  }, [items]);

  const addItem = (product: Product, quantity: number = 1) => {
    console.log('Adding to cart:', product.name, 'quantity:', quantity);
    setItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        const newQuantity = Math.min(existingItem.quantity + quantity, product.stock);
        console.log('Updating existing item, new quantity:', newQuantity);
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        );
      }
      
      console.log('Adding new item to cart');
      return [...prev, { product, quantity: Math.min(quantity, product.stock) }];
    });
  };

  const removeItem = (productId: string) => {
    console.log('Removing item:', productId);
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    console.log('Updating quantity for:', productId, 'to:', quantity);
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock) }
          : item
      )
    );
  };

  const clearCart = () => {
    console.log('Clearing cart');
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  console.log('Cart state - items:', items.length, 'total:', total, 'itemCount:', itemCount);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
  };
};