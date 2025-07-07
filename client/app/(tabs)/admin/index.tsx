import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useProducts, Product } from '@/hooks/useProducts';
import { useOrders, Order } from '@/hooks/useOrders';
import { useSocket } from '@/hooks/useSocket';
import ProductCard from '@/components/ProductCard';
import OrderCard from '@/components/OrderCard';
import EditProductModal from '@/components/EditProductModal';
import CustomAlert from '@/components/CustomAlert';
import CustomToast from '@/components/CustomToast';

const ADMIN_TABS = ['Active Orders', 'Past Orders', 'Products', 'Analytics'];

const AdminPanel = () => {
  const { products, isLoading: productsLoading, fetchProducts } = useProducts();
  const { orders, isLoading: ordersLoading, fetchAllOrders, updateOrderStatus } = useOrders();
  const { joinAdminRoom, onNewOrder, offNewOrder, isConnected, reconnect } = useSocket();
  const [activeTab, setActiveTab] = useState('Active Orders');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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

  // Filter orders based on status
  const activeOrders = orders.filter(order => 
    ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
  );
  
  const pastOrders = orders.filter(order => 
    ['delivered', 'cancelled'].includes(order.status)
  );

  useEffect(() => {
    // Join admin room for real-time updates
    if (isConnected) {
      joinAdminRoom();
    } else {
      console.log('Socket not connected, attempting to reconnect...');
      reconnect();
      // Try joining admin room after a short delay
      setTimeout(() => {
        if (isConnected) {
          joinAdminRoom();
        }
      }, 2000);
    }

    // Listen for new orders
    onNewOrder((data) => {
      console.log('New order received:', data);
      showToast(`New order #${data.order._id.slice(-6).toUpperCase()} received!`, 'info');
      fetchAllOrders(); // Refresh orders
    });

    return () => {
      offNewOrder();
    };
  }, [isConnected]);

  // Fetch appropriate data based on active tab
  useEffect(() => {
    if (activeTab === 'Active Orders' || activeTab === 'Past Orders') {
      fetchAllOrders();
    } else if (activeTab === 'Products') {
      fetchProducts();
    }
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

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedProduct(null);
    fetchProducts(); // Refresh products after edit
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateOrderStatus(orderId, status);
      showToast(`Order status updated to ${status}`, 'success');
    } catch (error) {
      showToast('Failed to update order status', 'error');
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard 
      product={item} 
      isAdmin={true}
      onEdit={handleEditProduct}
    />
  );

  const renderOrder = ({ item }: { item: Order }) => (
    <OrderCard 
      order={item} 
      isAdmin={true}
      onUpdateStatus={handleUpdateOrderStatus}
    />
  );

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'Active Orders': return activeOrders.length;
      case 'Past Orders': return pastOrders.length;
      case 'Products': return products.length;
      default: return 0;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Products':
        return (
          <FlatList
            key="products-grid"
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            numColumns={2}
            contentContainerStyle={{ 
              paddingHorizontal: 8,
              paddingVertical: 12,
              paddingBottom: 100 
            }}
            columnWrapperStyle={{ justifyContent: 'space-around' }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
                  <Feather name="package" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-xl font-bold text-gray-800 mb-2">
                  {productsLoading ? 'Loading products...' : 'No products found'}
                </Text>
                <Text className="text-gray-500 text-center">
                  Products will appear here once added to inventory
                </Text>
              </View>
            }
          />
        );
      case 'Active Orders':
        return (
          <FlatList
            key="active-orders-list"
            data={activeOrders}
            renderItem={renderOrder}
            keyExtractor={(item) => item._id}
            numColumns={1}
            contentContainerStyle={{ 
              paddingVertical: 12,
              paddingBottom: 100 
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
                  <Feather name="clock" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-xl font-bold text-gray-800 mb-2">
                  {ordersLoading ? 'Loading orders...' : 'No active orders'}
                </Text>
                <Text className="text-gray-500 text-center px-8">
                  Active orders will appear here when customers place orders
                </Text>
              </View>
            }
          />
        );
      case 'Past Orders':
        return (
          <FlatList
            key="past-orders-list"
            data={pastOrders}
            renderItem={renderOrder}
            keyExtractor={(item) => item._id}
            numColumns={1}
            contentContainerStyle={{ 
              paddingVertical: 12,
              paddingBottom: 100 
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
                  <Feather name="archive" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-xl font-bold text-gray-800 mb-2">
                  {ordersLoading ? 'Loading past orders...' : 'No past orders'}
                </Text>
                <Text className="text-gray-500 text-center px-8">
                  Completed and cancelled orders will appear here
                </Text>
              </View>
            }
          />
        );
      case 'Analytics':
        return (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Feather name="bar-chart-2" size={32} color="#9CA3AF" />
            </View>
            <Text className="text-xl font-bold text-gray-800 mb-2">
              Analytics Dashboard
            </Text>
            <Text className="text-gray-500 text-center">
              Detailed analytics and insights coming soon
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-5 bg-white border-b border-gray-200 shadow-sm">
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mr-3">
            <Feather name="shield" size={20} color="#8B5CF6" />
          </View>
          <View>
            <Text className="text-xl font-bold text-gray-800">Admin Panel</Text>
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-500">Manage your store</Text>
              <View className={`w-2 h-2 rounded-full ml-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text className={`text-xs ml-1 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Live' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
        <View className="bg-blue-50 px-3 py-2 rounded-full">
          <Text className="text-sm font-semibold text-blue-600">
            {getTabCount(activeTab)} {activeTab.toLowerCase()}
          </Text>
        </View>
      </View>

      {/* Admin Tab Bar */}
      <View className="bg-white border-b border-gray-100 shadow-sm">
        <View className="flex-row px-4 py-3">
          {ADMIN_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`px-4 py-3 mr-3 rounded-xl ${
                activeTab === tab
                  ? 'bg-blue-500 shadow-sm'
                  : 'bg-gray-100'
              }`}
            >
              <Text
                className={`font-semibold text-sm ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Edit Product Modal */}
      <EditProductModal
        visible={showEditModal}
        product={selectedProduct}
        onClose={handleCloseModal}
      />

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

export default AdminPanel;