import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MessageOptionsProps {
  visible: boolean;
  position: { x: number; y: number; width: number; height: number };
  isCurrentUser: boolean;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy: () => void;
  onReact: (emoji: string) => void;
  onClose: () => void;
  animatedValue: Animated.Value;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

const MessageOptions = ({
  visible,
  position,
  isCurrentUser,
  onReply,
  onEdit,
  onDelete,
  onCopy,
  onReact,
  onClose,
  animatedValue,
}: MessageOptionsProps) => {
  // Calculate position of options menu
  const getPositionStyle = () => {
    const { x, y, width, height } = position;
    
    // Menu dimensions
    const menuWidth = 280;
    const menuHeight = 280; // Approximate
    
    // Initial position - centered below the message bubble
    let posX = x + width / 2 - menuWidth / 2;
    let posY = y + height + 8;
    
    // Ensure menu stays within screen bounds
    if (posX < 16) posX = 16;
    if (posX + menuWidth > SCREEN_WIDTH - 16) posX = SCREEN_WIDTH - menuWidth - 16;
    
    // If too close to bottom, position above the message
    const isCloseToBottom = posY + menuHeight > Dimensions.get('window').height - 100;
    if (isCloseToBottom) {
      posY = y - menuHeight - 8;
    }
    
    return {
      left: posX,
      top: posY,
    };
  };
  
  // Scale and opacity animations
  const scaleAndOpacity = {
    transform: [
      { 
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }) 
      }
    ],
    opacity: animatedValue,
  };
  
  // Render reaction emojis
  const renderReactionOptions = () => {
    return (
      <View style={styles.reactionContainer}>
        {REACTION_EMOJIS.map((emoji, index) => (
          <TouchableOpacity
            key={index}
            style={styles.reactionButton}
            onPress={() => {
              onReact(emoji);
              onClose();
            }}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.optionsContainer,
              getPositionStyle(),
              scaleAndOpacity,
              Platform.OS === 'ios' && styles.iosShadow,
            ]}
          >
            <LinearGradient
              colors={['#272830', '#1D1E26']}
              style={styles.gradientBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              {renderReactionOptions()}
              
              <View style={styles.optionsSeparator} />
              
              <View style={styles.menuOptions}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    onReply();
                    onClose();
                  }}
                >
                  <MaterialIcons name="reply" size={20} color="#FFFFFF" />
                  <Text style={styles.optionText}>Reply</Text>
                </TouchableOpacity>
                
                {isCurrentUser && onEdit && (
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      onEdit();
                      onClose();
                    }}
                  >
                    <MaterialIcons name="edit" size={20} color="#FFFFFF" />
                    <Text style={styles.optionText}>Edit</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    onCopy();
                    onClose();
                  }}
                >
                  <MaterialIcons name="content-copy" size={20} color="#FFFFFF" />
                  <Text style={styles.optionText}>Copy</Text>
                </TouchableOpacity>
                
                {isCurrentUser && onDelete && (
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      onDelete();
                      onClose();
                    }}
                  >
                    <MaterialIcons name="delete" size={20} color="#FF4B4B" />
                    <Text style={[styles.optionText, styles.deleteText]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  optionsContainer: {
    position: 'absolute',
    width: 280,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBackground: {
    padding: 16,
    borderRadius: 16,
  },
  iosShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  reactionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  reactionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 20,
  },
  optionsSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  menuOptions: {
    marginTop: 4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 16,
  },
  deleteText: {
    color: '#FF4B4B',
  },
});

export default MessageOptions; 