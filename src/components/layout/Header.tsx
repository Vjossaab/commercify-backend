import React from 'react';
import { ShoppingCart, User, Store, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

interface HeaderProps {
  cartItemCount: number;
  onCartClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ cartItemCount, onCartClick }: HeaderProps) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Store className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Commercify</h1>
            <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              Real-Time
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {user?.role === 'buyer' && (
              <button
                onClick={onCartClick}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-1" />
                <span>{user?.email}</span>
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                  {user?.role}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                icon={LogOut}
                onClick={logout}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};