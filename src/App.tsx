import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useCart } from './hooks/useCart';
import { AuthForm } from './components/auth/AuthForm';
import { Header } from './components/layout/Header';
import { BuyerDashboard } from './components/buyer/BuyerDashboard';
import { SellerDashboard } from './components/seller/SellerDashboard';
import { CartSidebar } from './components/cart/CartSidebar';
import { orderAPI } from './services/api';

function App() {
  const { user, isLoading } = useAuth();
  const {
    items: cartItems,
    total: cartTotal,
    itemCount: cartItemCount,
    updateQuantity,
    removeItem,
    clearCart,
    addItem,
  } = useCart();
  
  const [showCart, setShowCart] = useState(false);

  console.log('App render - cartItems:', cartItems.length, 'cartItemCount:', cartItemCount, 'showCart:', showCart);
  console.log('App render - cartItems details:', cartItems);
  console.log('App render - cartTotal:', cartTotal);

  // Log cart state changes
  useEffect(() => {
    console.log('Cart state changed in App - items:', cartItems.length, 'total:', cartTotal, 'itemCount:', cartItemCount);
  }, [cartItems, cartTotal, cartItemCount]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    try {
      const orderItems = cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      await orderAPI.createOrder(orderItems);
      clearCart();
      setShowCart(false);
      
      // Show success message
      alert('Order placed successfully!');
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  // Test function to manually add an item to cart
  const testAddToCart = () => {
    const testProduct = {
      id: 'test-123',
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      stock: 10,
      category: 'Test',
      image: 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=400',
      sellerId: 'test-seller',
      createdAt: new Date().toISOString(),
    };
    console.log('App: Testing add to cart with:', testProduct);
    addItem(testProduct, 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Commercify...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        cartItemCount={cartItemCount}
        onCartClick={() => setShowCart(true)}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'buyer' ? <BuyerDashboard /> : <SellerDashboard />}
      </main>

      {/* Test button for debugging */}
      {user.role === 'buyer' && (
        <div className="fixed bottom-4 left-4 z-50">
          <button
            onClick={testAddToCart}
            className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600"
          >
            Test Add to Cart
          </button>
        </div>
      )}

      {user.role === 'buyer' && (
        <CartSidebar
          isOpen={showCart}
          onClose={() => setShowCart(false)}
          items={cartItems}
          total={cartTotal}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}

export default App;