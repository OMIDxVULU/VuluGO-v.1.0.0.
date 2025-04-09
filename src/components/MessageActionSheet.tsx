import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ActionItem {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  iconColor?: string;
}

interface ActionGroup {
  title?: string;
  actions: ActionItem[];
}

interface MessageActionSheetProps {
  visible: boolean;
  actionGroups: ActionGroup[];
  onClose: () => void;
}

const MessageActionSheet = ({
  visible,
  actionGroups,
  onClose,
}: MessageActionSheetProps) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, translateY, opacity]);
  
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      onClose();
    });
  };
  
  const renderActionGroup = (group: ActionGroup, index: number) => {
    return (
      <View key={`group-${index}`} style={styles.actionGroup}>
        {group.title && (
          <Text style={styles.groupTitle}>{group.title}</Text>
        )}
        
        {group.actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionButton}
            onPress={() => {
              handleClose();
              setTimeout(() => {
                action.onPress();
              }, 300);
            }}
          >
            <MaterialIcons
              name={action.icon as any}
              size={24}
              color={action.destructive ? '#FF4B4B' : action.iconColor || '#FFFFFF'}
            />
            <Text
              style={[
                styles.actionLabel,
                action.destructive && styles.destructiveLabel,
              ]}
            >
              {action.label}
            </Text>
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
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          { opacity: opacity }
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <Animated.View
          style={[
            styles.actionSheetContainer,
            { transform: [{ translateY: translateY }] },
            Platform.OS === 'ios' && styles.iosShadow
          ]}
        >
          <LinearGradient
            colors={['#272830', '#1D1E26']}
            style={styles.gradientBackground}
          >
            <View style={styles.handle} />
            
            <ScrollView style={styles.scrollContainer}>
              {actionGroups.map(renderActionGroup)}
              
              <View style={styles.cancelContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionSheetContainer: {
    backgroundColor: '#272830',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    width: '100%',
    overflow: 'hidden',
  },
  gradientBackground: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  iosShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  scrollContainer: {
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  actionGroup: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  groupTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 16,
  },
  destructiveLabel: {
    color: '#FF4B4B',
  },
  cancelContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MessageActionSheet; 