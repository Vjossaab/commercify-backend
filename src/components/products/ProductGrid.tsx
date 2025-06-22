import React from 'react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  onAddToCart?: (product: Product) => void;
  showSellerActions?: boolean;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onAddToCart,
  showSellerActions = false,
  onEditProduct,
  onDeleteProduct,
}: ProductGridProps) => {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-500">
          {showSellerActions 
            ? 'Start by adding your first product to the catalog.' 
            : 'Check back soon for new products!'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product: Product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          showSellerActions={showSellerActions}
          onEdit={onEditProduct}
          onDelete={onDeleteProduct}
        />
      ))}
    </div>
  );
};