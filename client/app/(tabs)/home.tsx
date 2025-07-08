import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth, useSession } from '@clerk/clerk-expo';
import Header from '@/components/Header';
import CategoryScroll from '@/components/CategoryScroll';
import ProductCard from '@/components/ProductCard';
import SortModal from '@/components/SortModal';
import { useProducts, Product } from '@/hooks/useProducts';
import { useUserSync } from '@/hooks/useUserSync';
import CustomToast from '@/components/CustomToast';

const CATEGORIES = [
  'All',
  'Snacks',
  'Beverages',
  'Kitchenware',
  'Daily Essentials',
  'Pooja',
  'Dry Fruits',
  'Spices',
  'Chocolates',
  'Sweets',
];

const Home = () => {
  const { products, isLoading, error, fetchProducts } = useProducts();
  const { syncUser } = useUserSync();
  const { isSignedIn, isLoaded } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [showSortModal, setShowSortModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userSynced, setUserSynced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Toast states
  const [toastConfig, setToastConfig] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastConfig({
      visible: true,
      message,
      type
    });
  };

  useEffect(() => {
    if (isSignedIn && isLoaded && !userSynced) {
      console.log('Home page - attempting user sync...');
      syncUser()
        .then(() => {
          console.log('Home page - user sync successful');
          setUserSynced(true);
        })
        .catch(error => {
          console.error('Failed to sync user on home page:', error);
          // Don't block the user experience if sync fails
          setUserSynced(true); // Mark as synced to prevent retry loops
        });
    }
  }, [isSignedIn, isLoaded, userSynced]);

  // Debounce effect for search query
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce time

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // Filter by search query
    if (debouncedSearchQuery) {
      const lowerCaseSearchQuery = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        product => product.name.toLowerCase().includes(lowerCaseSearchQuery)
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(
        product => product.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Sort products
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return sorted;
  }, [products, selectedCategory, sortBy, debouncedSearchQuery]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchProducts();
    setIsRefreshing(false);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} onShowToast={showToast} />
  );

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#8968CD" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <Header title="B3 Store" />
        <View className="flex-1 items-center justify-center px-4">
          <Feather name="alert-circle" size={48} color="#EF4444" />
          <Text className="text-lg font-semibold text-gray-800 mt-4 text-center">
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchProducts}
            className="mt-4 px-6 py-3 bg-purple-500 rounded-lg"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Header title="B3 Store" />
      <View className='px-4'>
        <View className='w-full mx-auto mt-4 px-3 py-2 rounded-full border border-gray-400 flex items-center gap-2 flex-row'>
          <Feather name='search' size={24} color="#9ca3af" />
          <TextInput
            placeholder='Search'
            className='text-[#9ca3af] flex-1'
            onChangeText={setSearchQuery}
            value={searchQuery}
          />
        </View>
      </View>
      <CategoryScroll
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      <View className="flex-row items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <View className="flex-1" />
        <View className="flex-row items-center">
          <Text className="text-gray-600 mr-3 text-sm">
            {filteredAndSortedProducts.length} products
          </Text>
          <TouchableOpacity
            onPress={() => setShowSortModal(true)}
            className="flex-row items-center px-3 py-2 bg-gray-100 rounded-lg"
          >
            <Feather name="filter" size={14} color="#374151" />
            <Text className="ml-2 text-gray-700 font-medium text-sm">Sort</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredAndSortedProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        numColumns={2}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: 100,
        }}
        columnWrapperStyle={{
          justifyContent: 'space-between',
          marginBottom: 8
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Feather name="package" size={48} color="#9CA3AF" />
            <Text className="text-lg font-semibold text-gray-500 mt-4">
              {isLoading ? 'Loading products...' : 'No products found'}
            </Text>
            {selectedCategory !== 'All' && !debouncedSearchQuery && (
              <Text className="text-gray-400 mt-2 text-center">
                Try selecting a different category or check back later
              </Text>
            )}
            {debouncedSearchQuery && (
              <Text className="text-gray-400 mt-2 text-center">
                No products found for "{debouncedSearchQuery}"
              </Text>
            )}
          </View>
        }
      />

      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        onSortSelect={setSortBy}
        currentSort={sortBy}
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

export default Home;