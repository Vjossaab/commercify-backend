import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Package, TrendingUp, AlertCircle } from 'lucide-react';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { catalogAPI } from '../../services/api';
import { socketService } from '../../services/socket';
import { Button } from '../ui/Button';
import { ProductGrid } from '../products/ProductGrid';
import { ProductForm } from './ProductForm';

export const SellerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const response = await catalogAPI.getProducts();
      const userProducts = response.data.filter((p: Product) => p.sellerId === user?.id);
      setProducts(userProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleStockUpdate = (data: { productId: string; stock: number }) => {
    setProducts(prev =>
      prev.map(product =>
        product.id === data.productId
          ? { ...product, stock: data.stock }
          : product
      )
    );
  };

  const handleProductUpdate = useCallback(() => {
    // Handle product updates from other actions
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadProducts();
    
    // Connect to WebSocket for real-time updates
    socketService.connect();
    socketService.subscribeToStockUpdates(handleStockUpdate);
    socketService.subscribeToProductUpdates(handleProductUpdate);

    return () => {
      socketService.unsubscribe('stock_update');
      socketService.unsubscribe('product_update');
    };
  }, [loadProducts, handleProductUpdate]);

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'sellerId'>) => {
    setSubmitting(true);
    try {
      await catalogAPI.createProduct(productData);
      setShowProductForm(false);
      loadProducts();
    } catch (error) {
      console.error('Failed to add product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleUpdateProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'sellerId'>) => {
    if (!editingProduct) return;
    
    setSubmitting(true);
    try {
      await catalogAPI.updateProduct(editingProduct.id, productData);
      setShowProductForm(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await catalogAPI.deleteProduct(productId);
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const lowStockProducts = products.filter(product => product.stock <= 5 && product.stock > 0);
  const outOfStockProducts = products.filter(product => product.stock === 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Stock</p>
              <p className="text-2xl font-bold text-gray-900">{totalStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockProducts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Package className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">{outOfStockProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Products</h2>
          <p className="text-gray-600">Manage your product inventory</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => {
            setEditingProduct(null);
            setShowProductForm(true);
          }}
        >
          Add Product
        </Button>
      </div>

      {/* Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
            <p className="text-orange-800">
              <strong>{lowStockProducts.length}</strong> products are running low on stock.
            </p>
          </div>
        </div>
      )}

      {outOfStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <Package className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">
              <strong>{outOfStockProducts.length}</strong> products are out of stock.
            </p>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <ProductGrid
        products={products}
        showSellerActions={true}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
      />

      {/* Product Form Modal */}
      <ProductForm
        isOpen={showProductForm}
        onClose={() => {
          setShowProductForm(false);
          setEditingProduct(null);
        }}
        onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}
        product={editingProduct}
        loading={submitting}
      />
    </div>
  );
};