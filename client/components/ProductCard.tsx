import React from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCart } from '@/hooks/useCart';
import { Product } from '@/hooks/useProducts';
import CustomToast from './CustomToast';

interface ProductCardProps {
  product: Product;
  isAdmin?: boolean;
  onEdit?: (product: Product) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isAdmin = false, onEdit, onShowToast }) => {
  const { addToCart, isLoading } = useCart();
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 48) / 2; // Account for padding and margins

  const handleAddToCart = async () => {
    try {
      await addToCart(product.barcode);
      if (onShowToast) {
        onShowToast(`${product.name} added to cart!`, 'success');
      }
    } catch (error) {
      if (onShowToast) {
        onShowToast('Failed to add item to cart', 'error');
      }
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(product);
    }
  };

  return (
    <View 
      className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 overflow-hidden" 
      style={{ width: cardWidth, height: 280 }}
    >
      {/* Product Image */}
      <View className="h-32 bg-gray-50 relative">
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-gray-100 items-center justify-center">
            <Feather name="image" size={24} color="#9CA3AF" />
          </View>
        )}
        
        {/* Admin Edit Button */}
        {isAdmin && (
          <TouchableOpacity
            onPress={handleEdit}
            className="absolute top-2 right-2 bg-blue-500 rounded-full p-2"
          >
            <Feather name="edit-2" size={14} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Product Info */}
      <View className="p-3 flex-1">
        {/* Product Name - Fixed height with ellipsis */}
        <Text 
          className="text-sm font-semibold text-gray-800 mb-1"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={{ height: 36 }}
        >
          {product.name}
        </Text>

        {/* Category */}
        <Text 
          className="text-xs text-gray-500 mb-2 capitalize"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {product.category}
        </Text>

        {/* Price */}
        <Text className="text-lg font-bold text-purple-600 mb-2">
          ₹{product.price}
        </Text>

        {/* Stock and Add to Cart */}
        <View className="flex-1 justify-end">
          <Text className="text-xs text-gray-500 mb-2">
            Stock: {product.quantity}
          </Text>
          
          {!isAdmin && (
            <TouchableOpacity
              onPress={handleAddToCart}
              disabled={isLoading || product.quantity === 0}
              className={`flex-row items-center justify-center px-3 py-2 rounded-lg ${
                product.quantity === 0
                  ? 'bg-gray-200'
                  : 'bg-purple-500'
              }`}
            >
              <Feather
                name="shopping-cart"
                size={12}
                color={product.quantity === 0 ? '#9CA3AF' : 'white'}
              />
              <Text
                className={`ml-2 text-xs font-medium ${
                  product.quantity === 0 ? 'text-gray-500' : 'text-white'
                }`}
                numberOfLines={1}
              >
                {product.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default ProductCard;