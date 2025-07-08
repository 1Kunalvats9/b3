import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';

const API_BASE_URL = 'https://b3-iota.vercel.app';

export interface UserData {
  _id: string;
  clerkId: string;
  email: string;
  profilePicture: string;
  coins: number;
  cartItem: Array<{ barcode: number }>;
  createdAt: string;
  updatedAt: string;
}

export const useUser = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('Fetching user data with token:', token ? 'Token available' : 'No token');
      console.log('API URL:', `${API_BASE_URL}/api/users/me`);

      // Add a small delay to ensure server is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      console.log('User data response status:', response.status);
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse);
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          const textResponse = await response.text();
          console.error('Failed to parse error response:', textResponse);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        throw new Error(errorData.error || 'Failed to fetch user data');
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const textResponse = await response.text();
        console.error('Failed to parse success response:', textResponse);
        throw new Error('Server returned invalid JSON response');
      }
      
      setUserData(data.user);
      return data.user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user data';
      setError(errorMessage);
      console.error('Fetch user data error:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData().catch(error => {
      console.error('Initial user data fetch failed:', error);
    });
  }, []);

  return {
    userData,
    isLoading,
    error,
    fetchUserData,
    refetch: fetchUserData,
  };
};