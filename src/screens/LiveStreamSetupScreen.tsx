import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Switch,
  Modal,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLiveStreams } from '../context/LiveStreamContext';
import { streamingService } from '../services/streamingService';
import Constants from 'expo-constants';

// Conditional import for camera - only available in development builds
let Camera: any = null;
try {
  Camera = require('expo-camera');
} catch (error) {
  console.log('📱 Camera module not available in Expo Go environment');
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface LiveTag {
  id: string;
  label: string;
  color: string;
}

const LIVE_TAGS: LiveTag[] = [
  { id: 'choose', label: 'CHOOSE', color: '#FFD700' },
  { id: 'lets-talk', label: "LET'S TALK", color: '#FF6B6B' },
  { id: 'gaming', label: 'GAMING', color: '#4ECDC4' },
  { id: 'music', label: 'MUSIC', color: '#45B7D1' },
  { id: 'just-chatting', label: 'JUST CHATTING', color: '#96CEB4' },
  { id: 'creative', label: 'CREATIVE', color: '#FFEAA7' },
  { id: 'fitness', label: 'FITNESS', color: '#DDA0DD' },
  { id: 'cooking', label: 'COOKING', color: '#98D8C8' },
];

const LiveStreamSetupScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { createNewStream } = useLiveStreams();

  // Environment detection
  const isExpoGo = Constants.appOwnership === 'expo';
  const isDevelopmentBuild = Constants.appOwnership === 'standalone' || !isExpoGo;
  const isCameraAvailable = Camera && Camera.requestCameraPermissionsAsync;

  // State management
  const [streamTitle, setStreamTitle] = useState('');
  const [selectedTag, setSelectedTag] = useState<LiveTag>(LIVE_TAGS[0]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(isExpoGo); // Default to true in Expo Go
  const [showPermissionWarning, setShowPermissionWarning] = useState(false);

  // Check permissions on component mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      // Check if we're in Expo Go environment
      if (isExpoGo || !isCameraAvailable) {
        console.log('📱 Running in Expo Go - Camera permissions not available');
        console.log('ℹ️ Camera permissions will be handled in production build');
        setPermissionsGranted(true); // Allow setup to continue in development
        setShowPermissionWarning(true);
        return;
      }

      // Only request permissions in development/production builds
      console.log('🔐 Requesting camera and microphone permissions...');
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const audioPermission = await Camera.requestMicrophonePermissionsAsync();

      const granted = cameraPermission.status === 'granted' && audioPermission.status === 'granted';
      setPermissionsGranted(granted);

      if (granted) {
        console.log('✅ Camera and microphone permissions granted');
      } else {
        console.log('❌ Camera or microphone permissions denied');
      }
    } catch (error) {
      console.error('❌ Error checking permissions:', error);

      // Fallback for any permission errors
      if (isExpoGo) {
        console.log('🔄 Fallback: Allowing setup to continue in Expo Go');
        setPermissionsGranted(true);
        setShowPermissionWarning(true);
      } else {
        setPermissionsGranted(false);
      }
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleTagPress = () => {
    setShowTagModal(true);
  };

  const handleTagSelect = (tag: LiveTag) => {
    setSelectedTag(tag);
    setShowTagModal(false);
  };

  const handleGoLive = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to start a live stream.');
      return;
    }

    // Title is now optional - no validation needed

    // Handle permissions based on environment
    if (!permissionsGranted && !isExpoGo) {
      Alert.alert(
        'Permissions Required',
        'Camera and microphone permissions are required to start a live stream.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permissions', onPress: checkPermissions }
        ]
      );
      return;
    }

    // Show development warning if in Expo Go
    if (isExpoGo && showPermissionWarning) {
      Alert.alert(
        'Development Mode',
        'You\'re running in Expo Go. Camera and microphone permissions will be handled automatically in the production build.\n\nContinuing with mock permissions for development.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue Anyway',
            onPress: () => proceedWithStreamCreation()
          }
        ]
      );
      return;
    }

    // Proceed with stream creation
    proceedWithStreamCreation();
  };

  const proceedWithStreamCreation = async () => {
    setIsCreatingStream(true);

    try {
      // Use default title if none provided
      const finalTitle = streamTitle.trim() || 'Live Stream';

      const environmentInfo = isExpoGo ? ' (Expo Go - Development Mode)' : '';
      console.log(`🎥 Creating live stream with setup${environmentInfo}:`, {
        title: finalTitle,
        originalTitle: streamTitle.trim(),
        tag: selectedTag.label,
        cameraEnabled,
        microphoneEnabled,
        hostId: user.uid,
        hostName: user.displayName || 'Host',
        hostAvatar: user.photoURL || 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=H',
        environment: isExpoGo ? 'Expo Go' : 'Production Build'
      });

      // Create stream with configured settings (use finalTitle with fallback)
      // This will automatically check for active streams and show confirmation if needed
      const streamId = await createNewStream(
        finalTitle,
        user.uid,
        user.displayName || 'Host',
        user.photoURL || 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=H'
      );

      console.log('✅ Stream created successfully with ID:', streamId);

      // Navigate to live stream view with configured parameters
      const navigationParams = {
        streamId,
        title: finalTitle, // Use the final title (with fallback applied)
        hostName: user.displayName || 'Host',
        hostAvatar: user.photoURL || 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=H',
        isHost: 'true',
        viewCount: '0',
        tag: selectedTag.label,
        cameraEnabled: cameraEnabled.toString(),
        microphoneEnabled: microphoneEnabled.toString(),
        createdAt: Date.now().toString(),
        hostId: user.uid,
        environment: isExpoGo ? 'expo-go' : 'production'
      };

      console.log('📋 Navigation parameters:', navigationParams);

      router.push({
        pathname: '/livestream',
        params: navigationParams
      });

    } catch (error: any) {
      console.error('❌ Failed to create stream:', error);

      // Don't show error if user just cancelled the confirmation
      if (error && error.message === 'User cancelled stream creation') {
        console.log('ℹ️ User cancelled stream creation');
        return;
      }

      const errorMessage = isExpoGo
        ? `Development Mode Error:\n\n${error.message}\n\nThis may work differently in the production build.`
        : `Could not create your live stream:\n\n${error.message}\n\nPlease try again.`;

      Alert.alert(
        'Stream Creation Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreatingStream(false);
    }
  };

  const renderTagModal = () => (
    <Modal
      visible={showTagModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowTagModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowTagModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choose a tag</Text>
          <FlatList
            data={LIVE_TAGS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.tagOption, { backgroundColor: `${item.color}20` }]}
                onPress={() => handleTagSelect(item)}
              >
                <View style={[styles.tagColorDot, { backgroundColor: item.color }]} />
                <Text style={styles.tagOptionText}>{item.label}</Text>
                {selectedTag.id === item.id && (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Title Input */}
        <View style={styles.titleSection}>
          <TextInput
            style={styles.titleInput}
            placeholder="Add a title (optional)"
            placeholderTextColor="#888888"
            value={streamTitle}
            onChangeText={setStreamTitle}
            maxLength={100}
            multiline={false}
          />
          <View style={styles.titleUnderline} />
        </View>

        {/* Tag Selection */}
        <TouchableOpacity style={styles.tagSelector} onPress={handleTagPress}>
          <Text style={styles.tagLabel}>Tag this live</Text>
          <View style={[styles.tagBadge, { backgroundColor: selectedTag.color }]}>
            <Text style={styles.tagBadgeText}>{selectedTag.label}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Permission Toggles */}
        <View style={styles.permissionsSection}>
          <Text style={styles.permissionsTitle}>Go live</Text>
          <Text style={styles.permissionsSubtitle}>
            {isExpoGo
              ? 'Development Mode - Permissions will be handled in production build'
              : 'Enable access so you can start a Live'
            }
          </Text>

          {/* Development Mode Warning */}
          {isExpoGo && (
            <View style={styles.developmentWarning}>
              <Ionicons name="information-circle" size={16} color="#FFD700" />
              <Text style={styles.developmentWarningText}>
                Running in Expo Go - Camera permissions are simulated
              </Text>
            </View>
          )}
          
          <View style={styles.permissionItem}>
            <View style={styles.permissionLeft}>
              <Ionicons name="videocam" size={24} color="#FFFFFF" />
              <Text style={styles.permissionText}>Enable camera access</Text>
            </View>
            <Switch
              value={cameraEnabled}
              onValueChange={setCameraEnabled}
              trackColor={{ false: '#3E3E3E', true: '#FFD700' }}
              thumbColor={cameraEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.permissionItem}>
            <View style={styles.permissionLeft}>
              <Ionicons name="mic" size={24} color="#FFFFFF" />
              <Text style={styles.permissionText}>Enable Microphone Access</Text>
            </View>
            <Switch
              value={microphoneEnabled}
              onValueChange={setMicrophoneEnabled}
              trackColor={{ false: '#3E3E3E', true: '#FFD700' }}
              thumbColor={microphoneEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Go Live Button */}
        <TouchableOpacity
          style={[styles.goLiveButton, isCreatingStream && styles.goLiveButtonDisabled]}
          onPress={handleGoLive}
          disabled={isCreatingStream}
        >
          <Text style={styles.goLiveButtonText}>
            {isCreatingStream ? 'Creating Stream...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tag Selection Modal */}
      {renderTagModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  titleSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  titleInput: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 50,
  },
  titleUnderline: {
    width: 200,
    height: 2,
    backgroundColor: '#333333',
    marginTop: 10,
  },
  tagSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
  },
  tagLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 10,
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tagBadgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  permissionsSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  permissionsTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  permissionsSubtitle: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 20,
  },
  developmentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  developmentWarningText: {
    color: '#FFD700',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  goLiveButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  goLiveButtonDisabled: {
    backgroundColor: '#666666',
  },
  goLiveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    width: screenWidth * 0.8,
    maxHeight: screenHeight * 0.6,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  tagColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  tagOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
});

export default LiveStreamSetupScreen;
