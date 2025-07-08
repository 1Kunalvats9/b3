import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useCart, CartItem } from '@/hooks/useCart';
import { useProducts, Product } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useUser } from '@/hooks/useUser';
import Header from '@/components/Header';
import initiateUpiPayment from "../../utils/upiPayment.js";
import SuccessModal from '@/components/SuccessModal';
import CustomAlert from '@/components/CustomAlert';
import CustomToast from '@/components/CustomToast';
//@ts-ignore
import { smsTemplates } from '../../utils/sms.js';

const Cart = () => {
  const { getCartItems, removeFromCart, updateCartItemQuantity, clearCart } = useCart();
  const { products } = useProducts();
  const { createOrder } = useOrders();
  const { fetchUserData } = useUser();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartProducts, setCartProducts] = useState<(Product & { cartQuantity: number })[]>([]);

  // Form states
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<'delivery' | 'takeaway'>('delivery');
  const [paymentOption, setPaymentOption] = useState<'online' | 'cod'>('online');

  // Success modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);

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
    loadCartItems();
  }, []);

  useEffect(() => {
    if (cartItems.length > 0 && products.length > 0) {
      const productsWithCart = cartItems
        .map(cartItem => {
          const product = products.find(p => p.barcode === cartItem.barcode);
          return product ? { ...product, cartQuantity: cartItem.quantity } : null;
        })
        .filter(Boolean) as (Product & { cartQuantity: number })[];

      setCartProducts(productsWithCart);
    } else {
      setCartProducts([]);
    }
  }, [cartItems, products]);

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

  const loadCartItems = async () => {
    setIsCartLoading(true);
    try {
      const items = await getCartItems();
      setCartItems(items);
    } catch (error) {
      console.error('Error loading cart items:', error);
      showToast('Failed to load cart items', 'error');
    } finally {
      setIsCartLoading(false);
    }
  };

  const handleRemoveItem = async (barcode: string) => {
    const product = cartProducts.find(p => p.barcode === barcode);
    showAlert(
      'Remove Item',
      `Are you sure you want to remove "${product?.name}" from your cart?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromCart(barcode);
              await loadCartItems();
              showToast('Item removed from cart', 'success');
            } catch (error) {
              showToast('Failed to remove item from cart', 'error');
            }
          },
        },
      ]
    );
  };

  const handleUpdateQuantity = async (barcode: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(barcode);
      return;
    }

    try {
      await updateCartItemQuantity(barcode, newQuantity);
      await loadCartItems();
    } catch (error) {
      showToast('Failed to update item quantity', 'error');
    }
  };

  const handleClearCart = async () => {
    showAlert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCart();
              await loadCartItems();
              showToast('Cart cleared successfully', 'success');
            } catch (error) {
              showToast('Failed to clear cart', 'error');
            }
          },
        },
      ]
    );
  };

  const calculateTotal = () => {
    return cartProducts.reduce((total, item) => total + (item.price * item.cartQuantity), 0);
  };

  const calculateCoinsToEarn = () => {
    const total = calculateTotal() + (deliveryOption === 'delivery' ? 50 : 0);
    return Math.floor(total / 100);
  };

  const handleCheckout = async () => {
    // Input validation
    if (cartProducts.length === 0) {
      showToast('Your cart is empty. Please add items to place an order.', 'warning');
      return;
    }
    if (!phoneNumber.trim()) {
      showToast('Please enter your phone number.', 'warning');
      return;
    }
    if (deliveryOption === 'delivery' && !address.trim()) {
      showToast('Please enter your delivery address.', 'warning');
      return;
    }

    const orderTotal = calculateTotal() + (deliveryOption === 'delivery' ? 50 : 0);

    const orderData = {
      items: cartProducts.map(item => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        quantity: item.cartQuantity,
        category: item.category,
        image: item.image,
      })),
      total: orderTotal,
      deliveryOption,
      paymentOption,
      address: deliveryOption === 'delivery' ? address : 'Store Pickup',
      phoneNumber,
    };

    console.log('Preparing to place order with data:', orderData);
    setIsPlacingOrder(true);

    try {
      if (paymentOption === 'online') {
        console.log('Initiating UPI payment...');
        const paymentSuccess = await initiateUpiPayment(orderTotal, "Your Order Payment");
        if (!paymentSuccess) {
          console.log('Payment was not completed');
          setIsPlacingOrder(false);
          return;
        }
        console.log('Payment completed successfully');
      }

      console.log('Creating order...');
      const response = await createOrder(orderData);
      console.log('Order response:', response);

      // Clear cart after successful order creation
      console.log('Clearing cart...');
      await clearCart();
      await loadCartItems();

      // Refresh user data to get updated coins
      console.log('Refreshing user data...');
      await fetchUserData();

      // Show success modal with order number and coins earned
      const orderNum = response._id ? response._id.slice(-6).toUpperCase() : 'UNKNOWN';
      const earned = response.coinsEarned || calculateCoinsToEarn();

      console.log('Order placed successfully:', orderNum, 'Coins earned:', earned);
      
      setOrderNumber(orderNum);
      setCoinsEarned(earned);
      setShowSuccessModal(true);

      // Reset form states for next order
      setAddress('');
      setPhoneNumber('');
      setDeliveryOption('delivery');
      setPaymentOption('online');


    } catch (error) {
      console.error('Order placement error:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      showAlert(
        'Order Failed',
        `Failed to place order: ${error instanceof Error ? error.message : 'Something went wrong. Please try again.'}`,
        [{ text: 'OK', onPress: () => {} }]
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const renderCartItem = ({ item }: { item: Product & { cartQuantity: number } }) => (
    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 mb-4 p-4">
      <View className="flex-row">
        <View className="w-20 h-20 bg-gray-100 rounded-xl mr-4 overflow-hidden">
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Feather name="image" size={24} color="#9CA3AF" />
            </View>
          )}
        </View>

        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800 mb-1" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-sm text-gray-500 mb-2 capitalize">
            {item.category}
          </Text>
          <Text className="text-xl font-bold text-purple-600">
            ₹{item.price.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => handleRemoveItem(item.barcode)}
          className="p-3 bg-red-50 rounded-xl"
        >
          <Feather name="trash-2" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <View className="flex-row items-center bg-gray-50 rounded-xl p-1">
          <TouchableOpacity
            onPress={() => handleUpdateQuantity(item.barcode, item.cartQuantity - 1)}
            className="w-10 h-10 bg-white rounded-lg items-center justify-center shadow-sm"
          >
            <Feather name="minus" size={16} color="#374151" />
          </TouchableOpacity>
          <Text className="mx-6 text-lg font-bold text-gray-800">
            {item.cartQuantity}
          </Text>
          <TouchableOpacity
            onPress={() => handleUpdateQuantity(item.barcode, item.cartQuantity + 1)}
            className="w-10 h-10 bg-white rounded-lg items-center justify-center shadow-sm"
          >
            <Feather name="plus" size={16} color="#374151" />
          </TouchableOpacity>
        </View>
        <Text className="text-xl font-bold text-gray-800">
          ₹{(item.price * item.cartQuantity).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Header title="Shopping Cart" showProfile={false} />

      {isCartLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text className="text-lg text-gray-600 mt-4">Loading cart...</Text>
        </View>
      ) : cartProducts.length > 0 ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Cart Items Header */}
          <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-800">
              {cartProducts.length} item{cartProducts.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              onPress={handleClearCart}
              className="flex-row items-center px-4 py-2 bg-red-50 rounded-xl"
            >
              <Feather name="trash-2" size={16} color="#EF4444" />
              <Text className="ml-2 text-red-600 font-semibold">Clear All</Text>
            </TouchableOpacity>
          </View>

          {/* Cart Items */}
          <FlatList
            data={cartProducts}
            renderItem={renderCartItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingTop: 16 }}
            scrollEnabled={false}
          />

          {/* Order Details Form */}
          <View className="bg-white mx-4 mt-6 rounded-2xl shadow-sm border border-gray-100 p-6">
            <Text className="text-xl font-bold text-gray-800 mb-6">Order Details</Text>

            {/* Phone Number */}
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-700 mb-3">Phone Number *</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                className="border border-gray-200 rounded-xl px-4 py-4 text-base bg-gray-50"
              />
            </View>

            {/* Delivery Options */}
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-700 mb-4">Delivery Option</Text>
              <View className="flex-row space-x-4">
                <TouchableOpacity
                  onPress={() => setDeliveryOption('delivery')}
                  className={`flex-1 flex-row items-center justify-center py-4 px-4 rounded-xl border-2 ${
                    deliveryOption === 'delivery' ? 'bg-purple-50 border-purple-500' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Feather name="truck" size={20} color={deliveryOption === 'delivery' ? '#8B5CF6' : '#6B7280'} />
                  <Text className={`ml-3 font-semibold ${deliveryOption === 'delivery' ? 'text-purple-600' : 'text-gray-600'}`}>
                    Home Delivery
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDeliveryOption('takeaway')}
                  className={`flex-1 flex-row items-center justify-center py-4 px-4 rounded-xl border-2 ${
                    deliveryOption === 'takeaway' ? 'bg-purple-50 border-purple-500' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Feather name="shopping-bag" size={20} color={deliveryOption === 'takeaway' ? '#8B5CF6' : '#6B7280'} />
                  <Text className={`ml-3 font-semibold ${deliveryOption === 'takeaway' ? 'text-purple-600' : 'text-gray-600'}`}>
                    Takeaway
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Address (only for delivery) */}
            {deliveryOption === 'delivery' && (
              <View className="mb-6">
                <Text className="text-base font-semibold text-gray-700 mb-3">Delivery Address *</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter your complete address"
                  multiline
                  numberOfLines={4}
                  className="border border-gray-200 rounded-xl px-4 py-4 text-base bg-gray-50"
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Payment Options */}
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-700 mb-4">Payment Method</Text>
              <View className="flex-row space-x-4">
                <TouchableOpacity
                  onPress={() => setPaymentOption('online')}
                  className={`flex-1 flex-row items-center justify-center py-4 px-4 rounded-xl border-2 ${
                    paymentOption === 'online' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Feather name="credit-card" size={20} color={paymentOption === 'online' ? '#10B981' : '#6B7280'} />
                  <Text className={`ml-3 font-semibold ${paymentOption === 'online' ? 'text-green-600' : 'text-gray-600'}`}>
                    Online Payment
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPaymentOption('cod')}
                  className={`flex-1 flex-row items-center justify-center py-4 px-4 rounded-xl border-2 ${
                    paymentOption === 'cod' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Feather name="dollar-sign" size={20} color={paymentOption === 'cod' ? '#10B981' : '#6B7280'} />
                  <Text className={`ml-3 font-semibold ${paymentOption === 'cod' ? 'text-green-600' : 'text-gray-600'}`}>
                    Cash on {deliveryOption === 'delivery' ? 'Delivery' : 'Pickup'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Order Summary */}
          <View className="bg-white mx-4 mt-6 mb-8 rounded-2xl shadow-sm border border-gray-100 p-6">
            <Text className="text-xl font-bold text-gray-800 mb-4">Order Summary</Text>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-gray-600 text-base">Subtotal</Text>
              <Text className="font-bold text-base">₹{calculateTotal().toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-600 text-base">Delivery Fee</Text>
              <Text className="font-bold text-base">
                {deliveryOption === 'delivery' ? '₹50.00' : '₹0.00'}
              </Text>
            </View>
            <View className="border-t border-gray-200 pt-4 mt-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">Total</Text>
                <Text className="text-2xl font-bold text-purple-600">
                  ₹{(calculateTotal() + (deliveryOption === 'delivery' ? 50 : 0)).toFixed(2)}
                </Text>
              </View>

              {/* Coins to Earn */}
              <View className="flex-row justify-between items-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <View className="flex-row items-center">
                  <Feather name="star" size={20} color="#F59E0B" />
                  <Text className="text-base text-yellow-700 ml-2 font-semibold">You'll earn</Text>
                </View>
                <Text className="text-base font-bold text-yellow-700">
                  {calculateCoinsToEarn()} coin{calculateCoinsToEarn() !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Checkout Button */}
          <View className="px-4 pb-8">
            <TouchableOpacity
              onPress={handleCheckout}
              disabled={isPlacingOrder}
              className={`rounded-2xl py-5 items-center shadow-lg ${
                isPlacingOrder ? 'bg-gray-400' : 'bg-purple-500'
              }`}
            >
              {isPlacingOrder ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white text-lg font-bold ml-3">
                    Placing Order...
                  </Text>
                </View>
              ) : (
                <Text className="text-white text-lg font-bold">
                  Place Order - ₹{(calculateTotal() + (deliveryOption === 'delivery' ? 50 : 0)).toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-32 h-32 bg-gray-100 rounded-full items-center justify-center mb-6">
            <Feather name="shopping-cart" size={48} color="#9CA3AF" />
          </View>
          <Text className="text-2xl font-bold text-gray-800 mb-3 text-center">
            Your cart is empty
          </Text>
          <Text className="text-gray-500 text-center text-base leading-6">
            Add some delicious items to get started with your order
          </Text>
        </View>
      )}

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        orderNumber={orderNumber}
        coinsEarned={coinsEarned}
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

export default Cart;