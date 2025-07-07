import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser as useClerkUser } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import Header from '@/components/Header';
import OrderHistoryCard from '@/components/OrderHistoryCard';
import CoinsDisplay from '@/components/CoinDisplay';
import CustomAlert from '@/components/CustomAlert';
import CustomToast from '@/components/CustomToast';
import { useOrders } from '@/hooks/useOrders';
import { useUser } from '@/hooks/useUser';
import { useSocket } from '@/hooks/useSocket';

const Profile = () => {
  const { signOut, isSignedIn, userId } = useAuth();
  const { user: clerkUser } = useClerkUser();
  const { userData, fetchUserData } = useUser();
  const { orders, isLoading: ordersLoading, fetchOrders } = useOrders();
  const { onOrderStatusUpdate, offOrderStatusUpdate } = useSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Custom alert states
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [] as Array<{text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive'}>
  });

  // Toast states
  const [toastConfig, setToastConfig] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }

    // Listen for order status updates
    onOrderStatusUpdate((data) => {
      showToast(data.message, 'info');
      if (activeTab === 'orders') {
        fetchOrders(); // Refresh orders
      }
    });

    return () => {
      offOrderStatusUpdate();
    };
  }, [activeTab]);

  const showAlert = (title: string, message: string, buttons: Array<{text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive'}>) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons
    });
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastConfig({
      visible: true,
      message,
      type
    });
  };

  const handleSignOut = async () => {
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await signOut();
              showToast('Signed out successfully', 'success');
            } catch (error) {
              showToast('Failed to sign out. Please try again.', 'error');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === 'orders') {
        await fetchOrders();
      } else {
        await fetchUserData();
      }
    } catch (error) {
      console.error('Refresh error:', error);
      showToast('Failed to refresh data', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isSignedIn) {
    return <Redirect href="/(auth)" />;
  }

  const profileOptions = [
    {
      icon: 'user',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: () => showToast('Profile editing will be available soon!', 'info'),
    },
    {
      icon: 'heart',
      title: 'Wishlist',
      subtitle: 'Your saved items',
      onPress: () => showToast('Wishlist feature will be available soon!', 'info'),
    },
    {
      icon: 'help-circle',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => showToast('Help & support will be available soon!', 'info'),
    },
    {
      icon: 'info',
      title: 'About',
      subtitle: 'App version and information',
      onPress: () => showAlert('About B3 Store', 'Version 1.0.0\nBuilt with React Native & Expo\n\nA modern shopping experience for your daily needs.', [{ text: 'OK', onPress: () => {} }]),
    },
  ];

  const renderProfileContent = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Header */}
      <View className="bg-white mx-4 mt-6 rounded-2xl shadow-sm border border-gray-100 p-8">
        <View className="items-center">
          <View className="relative">
            <Image
              source={{ 
                uri: clerkUser?.imageUrl || 'https://via.placeholder.com/120x120/8B5CF6/FFFFFF?text=U'
              }}
              className="w-28 h-28 rounded-full border-4 border-purple-100"
            />
            <TouchableOpacity className="absolute -bottom-2 -right-2 bg-purple-500 rounded-full p-3 shadow-lg">
              <Feather name="camera" size={18} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-2xl font-bold text-gray-800 mt-6">
            {clerkUser?.fullName || 'User'}
          </Text>
          <Text className="text-gray-500 mt-2 text-base">
            {clerkUser?.primaryEmailAddress?.emailAddress}
          </Text>
          
          {/* Coins Display */}
          <View className="mt-6">
            <CoinsDisplay 
              coins={userData?.coins || 0} 
              size="large" 
              showLabel={true} 
            />
            <Text className="text-sm text-gray-500 mt-3 text-center">
              Earn 1 coin for every ₹100 spent
            </Text>
          </View>
        </View>
      </View>

      {/* Profile Options */}
      <View className="bg-white mx-4 mt-6 rounded-2xl shadow-sm border border-gray-100">
        {profileOptions.map((option, index) => (
          <TouchableOpacity
            key={option.title}
            onPress={option.onPress}
            className={`flex-row items-center p-5 ${
              index !== profileOptions.length - 1 ? 'border-b border-gray-50' : ''
            }`}
          >
            <View className="w-12 h-12 bg-purple-50 rounded-xl items-center justify-center mr-4">
              <Feather name={option.icon as any} size={20} color="#8B5CF6" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-800">
                {option.title}
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                {option.subtitle}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        onPress={handleSignOut}
        disabled={isLoading}
        className="bg-white mx-4 mt-6 mb-8 rounded-2xl shadow-sm border border-gray-100 p-5"
      >
        <View className="flex-row items-center justify-center">
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text className="ml-3 text-lg font-bold text-red-500">
            {isLoading ? 'Signing Out...' : 'Sign Out'}
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderOrdersContent = () => (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View className="px-4 py-6">
        {ordersLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Feather name="clock" size={32} color="#9CA3AF" />
            </View>
            <Text className="text-xl font-bold text-gray-800 mb-2">
              Loading your orders...
            </Text>
            <Text className="text-gray-500 text-center">
              Please wait while we fetch your order history
            </Text>
          </View>
        ) : orders.length > 0 ? (
          <>
            <View className="bg-blue-50 rounded-xl p-4 mb-6">
              <Text className="text-base font-semibold text-blue-800 mb-1">
                Order History
              </Text>
              <Text className="text-sm text-blue-600">
                {orders.length} order{orders.length !== 1 ? 's' : ''} found
              </Text>
            </View>
            {orders.map((order) => (
              <OrderHistoryCard key={order._id} order={order} />
            ))}
          </>
        ) : (
          <View className="flex-1 items-center justify-center py-20">
            <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Feather name="shopping-bag" size={32} color="#9CA3AF" />
            </View>
            <Text className="text-xl font-bold text-gray-800 mb-2">
              No orders yet
            </Text>
            <Text className="text-gray-500 text-center px-8">
              Your order history will appear here once you place your first order
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Header title="Profile" showProfile={false} />
      
      {/* Tab Bar */}
      <View className="bg-white border-b border-gray-100 shadow-sm">
        <View className="flex-row px-4 py-2">
          <TouchableOpacity
            onPress={() => setActiveTab('profile')}
            className={`flex-1 py-4 items-center border-b-3 ${
              activeTab === 'profile'
                ? 'border-purple-500'
                : 'border-transparent'
            }`}
          >
            <View className="flex-row items-center">
              <Feather 
                name="user" 
                size={18} 
                color={activeTab === 'profile' ? '#8B5CF6' : '#6B7280'} 
              />
              <Text
                className={`ml-2 font-bold ${
                  activeTab === 'profile'
                    ? 'text-purple-600'
                    : 'text-gray-600'
                }`}
              >
                Profile
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setActiveTab('orders')}
            className={`flex-1 py-4 items-center border-b-3 ${
              activeTab === 'orders'
                ? 'border-purple-500'
                : 'border-transparent'
            }`}
          >
            <View className="flex-row items-center">
              <Feather 
                name="shopping-bag" 
                size={18} 
                color={activeTab === 'orders' ? '#8B5CF6' : '#6B7280'} 
              />
              <Text
                className={`ml-2 font-bold ${
                  activeTab === 'orders'
                    ? 'text-purple-600'
                    : 'text-gray-600'
                }`}
              >
                Order History
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === 'profile' ? renderProfileContent() : renderOrdersContent()}

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />

      {/* Custom Toast */}
      <CustomToast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={() => setToastConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

export default Profile;