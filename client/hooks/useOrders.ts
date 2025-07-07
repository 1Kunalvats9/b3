import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';

const API_BASE_URL = 'https://b3-iota.vercel.app';

export interface OrderItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  image?: string;
}

export interface Order {
  _id: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  deliveryOption: 'delivery' | 'takeaway';
  paymentOption: 'online' | 'cod';
  address: string;
  phoneNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/orders/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error('Fetch all orders error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const createOrder = async (orderData: {
    items: OrderItem[];
    total: number;
    deliveryOption: 'delivery' | 'takeaway';
    paymentOption: 'online' | 'cod';
    address: string;
    phoneNumber: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      
      console.log('Creating order with data:', orderData);
      console.log('API URL:', `${API_BASE_URL}/api/orders`);
      
      const response = await fetch(`${API_BASE_URL}/api/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Order creation error response:', errorData);
        throw new Error(errorData.error || errorData.message || `Failed to create order (${response.status})`);
      }

      const data = await response.json();
      console.log('Order created successfully:', data);
      
      // Refresh orders list
      await fetchOrders();
      
      return data;
    } catch (err) {
      console.error('Create order error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order status');
      }

      const data = await response.json();
      await fetchAllOrders(); // Refresh all orders for admin
      return data;
    } catch (err) {
      console.error('Update order status error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Don't auto-fetch orders on mount since we want to control when to fetch
  // useEffect(() => {
  //   fetchOrders();
  // }, []);

  return {
    orders,
    isLoading,
    error,
    fetchOrders,
    fetchAllOrders,
    createOrder,
    updateOrderStatus,
  };
};