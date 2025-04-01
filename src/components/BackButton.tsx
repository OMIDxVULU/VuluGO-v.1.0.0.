import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface BackButtonProps {
  onPress: () => void;
  label?: string;
}

const BackButton = ({ onPress, label }: BackButtonProps) => {
  return (
    <TouchableOpacity 
      style={styles.backButtonContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.backButton}>
        <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <Path 
            d="M23.332 14.3203C23.332 14.7633 23.0029 15.1294 22.5758 15.1873L22.457 15.1953L4.95703 15.1953C4.47378 15.1953 4.08203 14.8036 4.08203 14.3203C4.08203 13.8773 4.41121 13.5112 4.8383 13.4533L4.95703 13.4453L22.457 13.4453C22.9403 13.4453 23.332 13.8371 23.332 14.3203Z" 
            fill="white"
          />
          <Path 
            d="M12.633 20.7281C12.9755 21.0691 12.9766 21.6231 12.6357 21.9656C12.3257 22.2769 11.8397 22.3062 11.4966 22.0527L11.3982 21.9682L4.33991 14.9402C4.02766 14.6293 3.99926 14.1415 4.25471 13.7984L4.33986 13.7002L11.3982 6.67102C11.7406 6.33002 12.2946 6.33116 12.6356 6.67358C12.9456 6.98487 12.9729 7.47103 12.718 7.81305L12.6331 7.91101L6.19769 14.3205L12.633 20.7281Z" 
            fill="white"
          />
        </Svg>
      </View>
      {label && <Text style={styles.backButtonText}>{label}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default BackButton; 