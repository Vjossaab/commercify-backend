import React from 'react';
import { ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { Product } from '../../types';
import { Button } from '../ui/Button';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  showSellerActions?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  showSellerActions = false,
  onEdit,
  onDelete,
}: ProductCardProps) => {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAddToCartClick = () => {
    console.log('ProductCard: Add to Cart button clicked for product:', product.name);
    console.log('ProductCard: onAddToCart function:', onAddToCart);
    if (onAddToCart) {
      console.log('ProductCard: Calling onAddToCart function');
      onAddToCart(product);
    } else {
      console.log('ProductCard: onAddToCart function is undefined');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Out of Stock
            </div>
          </div>
        )}
        {isLowStock && !isOutOfStock && (
          <div className="absolute top-2 right-2">
            <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Low Stock
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 text-lg line-clamp-1">{product.name}</h3>
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full mt-1">
            {product.category}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl font-bold text-blue-600">
            ${product.price.toFixed(2)}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Package className="w-4 h-4 mr-1" />
            <span className={isLowStock ? 'text-orange-600 font-medium' : ''}>
              {product.stock} in stock
            </span>
          </div>
        </div>

        {showSellerActions ? (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(product)}
              className="flex-1"
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete?.(product.id)}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleAddToCartClick}
            disabled={isOutOfStock}
            className="w-full"
            icon={ShoppingCart}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        )}
      </div>
    </div>
  );
};