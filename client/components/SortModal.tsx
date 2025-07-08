import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  onSortSelect: (sortBy: string) => void;
  currentSort: string;
}

const SortModal: React.FC<SortModalProps> = ({
  visible,
  onClose,
  onSortSelect,
  currentSort,
}) => {
  const sortOptions = [
    { key: 'name', label: 'Name (A-Z)' },
    { key: 'price-low', label: 'Price (Low to High)' },
    { key: 'price-high', label: 'Price (High to Low)' },
    { key: 'category', label: 'Category' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-8 mx-2 mb-2 rounded-b-2xl">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-800">Sort By</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Feather name="x" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => {
                onSortSelect(option.key);
                onClose();
              }}
              className={`flex-row items-center justify-between py-4 px-4 mx-2 rounded-xl mb-3 ${
                currentSort === option.key ? 'bg-purple-50' : ''
              }`}
            >
              <Text
                className={`text-base ${
                  currentSort === option.key
                    ? 'text-purple-600 font-semibold'
                    : 'text-gray-700'
                }`}
              >
                {option.label}
              </Text>
              {currentSort === option.key && (
                <Feather name="check" size={18} color="#8B5CF6" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

export default SortModal;