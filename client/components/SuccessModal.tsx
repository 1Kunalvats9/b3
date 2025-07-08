import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  orderNumber: string;
  coinsEarned?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  visible, 
  onClose, 
  orderNumber, 
  coinsEarned = 0 
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      checkAnim.setValue(0);
      confettiAnim.setValue(0);
      fadeAnim.setValue(0);

      // Start animations sequence
      Animated.sequence([
        // Fade in background
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Scale in circle
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
        // Animate check mark
        Animated.timing(checkAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Confetti animation
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const checkScale = checkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  const confettiTranslateY = confettiAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  });

  const confettiOpacity = confettiAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  const renderConfetti = () => {
    const confettiPieces = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    
    for (let i = 0; i < 20; i++) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const randomLeft = Math.random() * Dimensions.get('window').width;
      const randomDelay = Math.random() * 500;
      
      confettiPieces.push(
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: randomLeft,
            top: '20%',
            width: 8,
            height: 8,
            backgroundColor: randomColor,
            transform: [
              {
                translateY: confettiTranslateY,
              },
              {
                rotate: confettiAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
            opacity: confettiOpacity,
          }}
        />
      );
    }
    return confettiPieces;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeAnim,
        }}
      >
        {/* Confetti */}
        {renderConfetti()}
        
        {/* Success Card */}
        <Animated.View
          style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 32,
            margin: 16,
            alignItems: 'center',
            transform: [{ scale: scaleAnim }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
            maxWidth: '90%',
          }}
        >
          {/* Success Circle with Check */}
          <Animated.View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#10B981',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
              transform: [{ scale: scaleAnim }],
            }}
          >
            <Animated.View
              style={{
                transform: [{ scale: checkScale }],
              }}
            >
              <Feather name="check" size={40} color="white" />
            </Animated.View>
          </Animated.View>

          {/* Success Text */}
          <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">
            Order Placed Successfully! 🎉
          </Text>
          
          <Text className="text-base text-gray-600 mb-6 text-center">
            Your order has been confirmed
          </Text>
          
          <View className="bg-gray-50 rounded-xl px-6 py-4 mb-6">
            <Text className="text-sm text-gray-500 text-center">Order Number</Text>
            <Text className="text-lg font-bold text-purple-600 text-center">
              #{orderNumber}
            </Text>
          </View>
          
          {/* Coins Earned */}
          {coinsEarned > 0 && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-xl px-6 py-4 mb-6">
              <View className="flex-row items-center justify-center">
                <Feather name="star" size={20} color="#F59E0B" />
                <Text className="ml-2 text-yellow-700 font-semibold">
                  You earned {coinsEarned} coin{coinsEarned !== 1 ? 's' : ''}!
                </Text>
              </View>
              <Text className="text-xs text-yellow-600 text-center mt-1">
                Keep shopping to earn more rewards
              </Text>
            </View>
          )}
          
          <Text className="text-sm text-gray-500 text-center px-4">
            You will receive a confirmation shortly
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default SuccessModal;