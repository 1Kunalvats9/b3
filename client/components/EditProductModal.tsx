import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Product } from '@/hooks/useProducts';
import { useAuth } from '@clerk/clerk-expo';

interface EditProductModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
}

const CATEGORIES = [
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

const EditProductModal: React.FC<EditProductModalProps> = ({ visible, product, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    quantity: '',
    image: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        image: product.image || '',
      });
    }
  }, [product]);

  const uploadToCloudinary = async (imageUri: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'product-image.jpg',
      } as any);
      formData.append('upload_preset', 'my_preset'); // Replace with your Cloudinary upload preset
      
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/dzjlp82fv/image/upload', // Replace with your Cloudinary cloud name
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = await response.json();
      if (data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        try {
          const imageUrl = await uploadToCloudinary(result.assets[0].uri);
          setFormData(prev => ({ ...prev, image: imageUrl }));
          Alert.alert('Success', 'Image uploaded successfully!');
        } catch (error) {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!product) return;

    if (!formData.name.trim() || !formData.price || !formData.quantity) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`https://b3-iota.vercel.app/api/products/${product._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity),
          image: formData.image,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Product updated successfully!');
        onClose();
      } else {
        throw new Error('Failed to update product');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">Edit Product</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 rounded-lg"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-medium">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-6">
          {/* Product Image */}
          <View className="mb-8">
            <Text className="text-base font-medium text-gray-700 mb-3">Product Image</Text>
            <TouchableOpacity
              onPress={pickImage}
              disabled={isUploading}
              className="w-32 h-32 bg-gray-100 rounded-lg items-center justify-center border-2 border-dashed border-gray-300"
            >
              {isUploading ? (
                <ActivityIndicator size="large" color="#8B5CF6" />
              ) : formData.image ? (
                <Image
                  source={{ uri: formData.image }}
                  className="w-full h-full rounded-lg"
                  resizeMode="cover"
                />
              ) : (
                <View className="items-center">
                  <Feather name="camera" size={24} color="#9CA3AF" />
                  <Text className="text-gray-500 text-sm mt-2">Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Product Name */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-700 mb-2">Product Name *</Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Enter product name"
              className="border border-gray-200 rounded-lg px-3 py-3 text-base"
            />
          </View>

          {/* Category */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-700 mb-2">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row px-2">
                {CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setFormData(prev => ({ ...prev, category: category.toLowerCase() }))}
                    className={`px-4 py-3 mx-1 rounded-full border ${
                      formData.category === category.toLowerCase()
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`font-medium text-sm ${
                        formData.category === category.toLowerCase()
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Price */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-700 mb-2">Price *</Text>
            <TextInput
              value={formData.price}
              onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
              placeholder="Enter price"
              keyboardType="numeric"
              className="border border-gray-200 rounded-lg px-3 py-3 text-base"
            />
          </View>

          {/* Quantity */}
          <View className="mb-8">
            <Text className="text-base font-medium text-gray-700 mb-2">Quantity *</Text>
            <TextInput
              value={formData.quantity}
              onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
              placeholder="Enter quantity"
              keyboardType="numeric"
              className="border border-gray-200 rounded-lg px-3 py-3 text-base"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default EditProductModal;