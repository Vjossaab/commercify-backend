import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContextType, User } from '../types';
import { authAPI } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const savedToken = localStorage.getItem('commercify_token');
    const savedUser = localStorage.getItem('commercify_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;
      
      setToken(token);
      setUser(user);
      
      localStorage.setItem('commercify_token', token);
      localStorage.setItem('commercify_user', JSON.stringify(user));
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        // @ts-ignore
        throw new Error(error.response?.data?.message || 'Login failed');
      }
      throw new Error('Login failed');
    }
  };

  const register = async (email: string, password: string, role: 'buyer' | 'seller') => {
    try {
      const response = await authAPI.register(email, password, role);
      const { token, user } = response.data;
      
      setToken(token);
      setUser(user);
      
      localStorage.setItem('commercify_token', token);
      localStorage.setItem('commercify_user', JSON.stringify(user));
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        // @ts-ignore
        throw new Error(error.response?.data?.message || 'Registration failed');
      }
      throw new Error('Registration failed');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('commercify_token');
    localStorage.removeItem('commercify_user');
    
    authAPI.logout().catch(() => {
      // Silent fail for logout API call
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};