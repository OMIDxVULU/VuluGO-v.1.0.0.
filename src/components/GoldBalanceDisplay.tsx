import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useGuestRestrictions } from '../hooks/useGuestRestrictions';

interface CurrencyDisplayProps {
  balance: number;
  type: 'gold' | 'gem';
  onPress?: () => void;
}

interface GoldBalanceDisplayProps {
  goldBalance: number;
  gemBalance: number;
  onConvert?: (gems: number) => void;
}

const GoldBalanceDisplay: React.FC<GoldBalanceDisplayProps> = ({ 
  goldBalance = 100, 
  gemBalance = 50,
  onConvert 
}) => {
  const { isGuest, getGuestGoldLimit, getGuestGemsLimit } = useGuestRestrictions();
  const [modalVisible, setModalVisible] = useState(false);
  const [gemsToConvert, setGemsToConvert] = useState('10');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Gold to gem conversion rate
  const conversionRate = 5; // 1 gem = 5 gold

  const openModal = () => {
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setModalVisible(false);
    });
  };

  const handleConvert = () => {
    const gems = parseInt(gemsToConvert, 10);
    if (onConvert && !isNaN(gems) && gems > 0 && gems <= gemBalance) {
      onConvert(gems);
      closeModal();
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={openModal}>
        <MaterialCommunityIcons name="gold" size={18} color="#FFD700" />
        <Text style={styles.balanceText}>{goldBalance}</Text>
      </TouchableOpacity>

      {modalVisible && (
        <>
          <Animated.View 
            style={[
              styles.backdrop, 
              { opacity: backdropOpacity }
            ]} 
            onTouchEnd={closeModal} 
          />
          
          <Animated.View 
            style={[
              styles.modalContainer, 
              { 
                transform: [{ 
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Dimensions.get('window').height, 0]
                  }) 
                }] 
              }
            ]}
          >
            <BlurView intensity={20} style={styles.blurContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Convert Gems to Gold</Text>
                <TouchableOpacity onPress={closeModal}>
                  <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <MaterialCommunityIcons name="diamond-stone" size={24} color="#6E69F4" />
                  <Text style={styles.balanceLabel}>Gem Balance</Text>
                  <Text style={styles.balanceValue}>
                    {gemBalance}
                    {isGuest && <Text style={styles.guestLimit}> / {getGuestGemsLimit()}</Text>}
                  </Text>
                </View>

                <View style={styles.separator} />

                <View style={styles.balanceItem}>
                  <MaterialCommunityIcons name="gold" size={24} color="#FFD700" />
                  <Text style={styles.balanceLabel}>Gold Balance</Text>
                  <Text style={styles.balanceValue}>
                    {goldBalance}
                    {isGuest && <Text style={styles.guestLimit}> / {getGuestGoldLimit()}</Text>}
                  </Text>
                </View>
              </View>

              <View style={styles.conversionSection}>
                <Text style={styles.conversionLabel}>Convert Gems</Text>
                
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={gemsToConvert}
                    onChangeText={setGemsToConvert}
                    keyboardType="number-pad"
                    placeholder="Enter gems amount"
                    placeholderTextColor="#666"
                  />
                  <MaterialCommunityIcons name="diamond-stone" size={20} color="#6E69F4" />
                </View>

                <Text style={styles.conversionRate}>
                  {isNaN(parseInt(gemsToConvert, 10)) ? '0' : parseInt(gemsToConvert, 10)} Gems = {isNaN(parseInt(gemsToConvert, 10)) ? '0' : parseInt(gemsToConvert, 10) * conversionRate} Gold
                </Text>
                
                <TouchableOpacity 
                  style={styles.convertButton}
                  onPress={handleConvert}
                  disabled={
                    isNaN(parseInt(gemsToConvert, 10)) || 
                    parseInt(gemsToConvert, 10) <= 0 || 
                    parseInt(gemsToConvert, 10) > gemBalance
                  }
                >
                  <Text style={styles.convertButtonText}>Convert Now</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  balanceText: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 10,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  blurContainer: {
    backgroundColor: 'rgba(28, 29, 35, 0.9)',
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#9BA1A6',
    fontSize: 14,
    marginTop: 6,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  separator: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12,
  },
  conversionSection: {
    marginTop: 10,
  },
  conversionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: 50,
  },
  conversionRate: {
    color: '#9BA1A6',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  convertButton: {
    backgroundColor: '#6E69F4',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  convertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestLimit: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: 'normal',
  },
});

export default GoldBalanceDisplay; 