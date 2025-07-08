import { useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';

const API_BASE_URL = 'https://b3-iota.vercel.app';

export const useUserSync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const syncUser = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('Syncing user with token:', token ? 'Token available' : 'No token');
      console.log('API URL:', `${API_BASE_URL}/api/users/sync`);

      const response = await fetch(`${API_BASE_URL}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Sync response status:', response.status);
      console.log('Sync response headers:', response.headers);
      
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
        throw new Error(errorData.error || 'Failed to sync user');
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const textResponse = await response.text();
        console.error('Failed to parse success response:', textResponse);
        throw new Error('Server returned invalid JSON response');
      }
      
      console.log('User sync successful:', data.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync user';
      setError(errorMessage);
      console.error('User sync error:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncUser,
    isLoading,
    error,
  };
};