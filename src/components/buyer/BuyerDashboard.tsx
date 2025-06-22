import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Product } from '../../types';
import { catalogAPI } from '../../services/api';
import { socketService } from '../../services/socket';
import { useCart } from '../../hooks/useCart';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ProductGrid } from '../products/ProductGrid';

export const BuyerDashboard: React.FC = () => {
  const {
    addItem: addToCart,
  } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const loadProducts = async () => {
    try {
      const response = await catalogAPI.getProducts();
      // Normalize all products to have createdAt (camelCase)
      const normalized = response.data.map((product: any) => ({
        ...product,
        createdAt: product.createdAt || product.created_at || new Date().toISOString(),
      }));
      setProducts(normalized);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = (data: { productId: string; stock: number }) => {
    setProducts(prev =>
      prev.map((product: Product) =>
        product.id === data.productId
          ? { ...product, stock: data.stock }
          : product
      )
    );
  };

  const filterProducts = useCallback(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter((product: Product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((product: Product) => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory]);

  useEffect(() => {
    loadProducts();
    
    // Connect to WebSocket for real-time updates
    socketService.connect();
    socketService.subscribeToStockUpdates(handleStockUpdate);

    return () => {
      socketService.unsubscribe('stock_update');
    };
  }, []);

  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  const handleAddToCart = (product: Product) => {
    console.log('BuyerDashboard: handleAddToCart called with product:', product.name, 'stock:', product.stock);
    console.log('BuyerDashboard: addToCart function:', addToCart);
    if (product.stock > 0) {
      console.log('BuyerDashboard: Adding product to cart');
      // Normalize product object for cart
      const normalizedProduct = {
        ...product,
        createdAt: product.createdAt || (product as any).created_at || new Date().toISOString(),
      };
      delete (normalizedProduct as any).created_at;
      addToCart(normalizedProduct, 1);
    } else {
      console.log('BuyerDashboard: Product out of stock, cannot add to cart');
    }
  };

  const categories = [...new Set(products.map((product: Product) => product.category))];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
          <p className="text-gray-600">Discover and shop our latest products</p>
        </div>
        <Button
          variant="outline"
          icon={RefreshCw}
          onClick={loadProducts}
        >
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>
          
          <div className="sm:w-48">
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category: string) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {(searchTerm || selectedCategory) && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredProducts.length} of {products.length} products
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <ProductGrid
        products={filteredProducts}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};