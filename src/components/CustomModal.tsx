import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  GestureResponderEvent
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttons: Array<{
    text: string;
    type?: 'default' | 'cancel' | 'destructive' | 'confirm';
    onPress: () => void;
  }>;
  // Optional icon props
  icon?: {
    name: string;
    color?: string;
    background?: string;
  };
  // Add gems information for purchase modals
  gemInfo?: {
    currentBalance: number;
    cost: number;
  };
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  title,
  message,
  onClose,
  buttons,
  icon,
  gemInfo
}) => {
  // If there's no explicit confirm button but there's a destructive one, treat it as confirm
  const primaryButton = buttons.find(b => b.type === 'confirm') || 
                       buttons.find(b => b.type === 'destructive');
  
  // All other buttons (usually cancel)
  const secondaryButtons = buttons.filter(b => 
    b.type !== 'confirm' && 
    (primaryButton?.type === 'destructive' ? b.type !== 'destructive' : true)
  );

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.centeredView}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          
          <TouchableWithoutFeedback onPress={(e: GestureResponderEvent) => e.stopPropagation()}>
            <View style={styles.modalView}>
              {/* Optional Icon */}
              {icon && (
                <View style={[
                  styles.iconContainer, 
                  { backgroundColor: icon.background || '#B768FB' }
                ]}>
                  <MaterialIcons name={icon.name as any} size={28} color={icon.color || "#FFFFFF"} />
                </View>
              )}
              
              {/* Title and message */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              
              {/* Optional gem info for purchases */}
              {gemInfo && (
                <View style={styles.gemInfoContainer}>
                  <View style={styles.gemRow}>
                    <MaterialIcons name="diamond" size={18} color="#B768FB" />
                    <Text style={styles.gemText}>Current Balance: {gemInfo.currentBalance.toLocaleString()}</Text>
                  </View>
                  <View style={styles.gemRow}>
                    <MaterialIcons name="remove-circle-outline" size={18} color="#F23535" />
                    <Text style={[styles.gemText, {color: '#F23535'}]}>Cost: {gemInfo.cost.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.gemRow, styles.resultRow]}>
                    <MaterialIcons name="diamond" size={18} color="#B768FB" />
                    <Text style={[styles.gemText, {fontWeight: 'bold'}]}>
                      New Balance: {(gemInfo.currentBalance - gemInfo.cost).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Buttons container */}
              <View style={styles.buttonContainer}>
                {/* Secondary buttons (usually cancel) */}
                {secondaryButtons.map((button, index) => (
                  <TouchableOpacity
                    key={`secondary-${index}`}
                    style={[
                      styles.button,
                      styles.secondaryButton,
                      // If there's a primary button, secondary takes 40% width
                      primaryButton ? { flex: 0.4 } : { flex: 1 }
                    ]}
                    onPress={() => {
                      button.onPress();
                      onClose();
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>{button.text}</Text>
                  </TouchableOpacity>
                ))}
                
                {/* Primary button (confirm or destructive) */}
                {primaryButton && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.primaryButton,
                      primaryButton.type === 'destructive' ? styles.destructiveButton : {},
                      // If there are secondary buttons, primary takes 60% width
                      secondaryButtons.length > 0 ? { flex: 0.6 } : { flex: 1 }
                    ]}
                    onPress={() => {
                      primaryButton.onPress();
                      onClose();
                    }}
                  >
                    <Text 
                      style={[
                        styles.primaryButtonText,
                        primaryButton.type === 'destructive' ? styles.destructiveButtonText : {}
                      ]}
                    >
                      {primaryButton.text}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    width: width * 0.85,
    maxWidth: 400,
    backgroundColor: '#2C2D35',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B768FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#DDDDDD',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  gemInfoContainer: {
    width: '100%',
    backgroundColor: '#22232A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  gemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  gemText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#B768FB',
    marginLeft: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButtonText: {
    color: '#DDDDDD',
    fontSize: 16,
  },
  destructiveButton: {
    backgroundColor: '#F24444',
  },
  destructiveButtonText: {
    color: 'white',
  },
});

export default CustomModal; 