/**
 * Stream Chat Overlay Component
 * Mobile-optimized chat interface for live streams
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStreamChat from '../../hooks/useStreamChat';
import { ChatMessage } from '../../services/streamChatService';

const { width: screenWidth } = Dimensions.get('window');

// Discord-inspired colors
const colors = {
  background: '#0f1117',
  cardBackground: '#151924',
  accent: '#5865F2',
  text: '#FFFFFF',
  textMuted: '#B9BBBE',
  textSecondary: '#72767D',
  border: '#202225',
  success: '#3BA55C',
  error: '#ED4245'
};

interface StreamChatOverlayProps {
  streamId: string;
  onClose: () => void;
  style?: any;
}

export default function StreamChatOverlay({
  streamId,
  onClose,
  style
}: StreamChatOverlayProps) {
  const insets = useSafeAreaInsets();
  const [messageText, setMessageText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const {
    messages,
    isConnected,
    isLoading,
    error,
    canSendMessages,
    isRateLimited,
    sendMessage,
    addReaction,
    clearError
  } = useStreamChat({
    streamId,
    autoStart: true,
    onNewMessage: (message) => {
      // Auto-scroll to new messages
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  });

  // Animate in on mount
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, []);

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !canSendMessages) return;

    try {
      await sendMessage(messageText.trim());
      setMessageText('');
    } catch (error: any) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle message reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error: any) {
      console.error('Failed to add reaction:', error);
    }
  };

  // Render chat message
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwnMessage = false; // Would check against current user
    const showAvatar = index === 0 || messages[index - 1]?.senderId !== item.senderId;

    return (
      <View style={[styles.messageContainer, isOwnMessage && styles.ownMessage]}>
        {showAvatar && (
          <View style={styles.messageHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.senderName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.senderName}>{item.senderName}</Text>
            <Text style={styles.messageTime}>
              {new Date(item.clientTimestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        )}
        
        <View style={[styles.messageContent, !showAvatar && styles.messageContentContinued]}>
          <Text style={styles.messageText}>{item.message}</Text>
          
          {/* Message reactions */}
          {item.reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {item.reactions.map((reaction, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.reactionButton}
                  onPress={() => handleReaction(item.id, reaction.emoji)}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <Text style={styles.reactionCount}>{reaction.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render quick reactions
  const renderQuickReactions = () => {
    const quickEmojis = ['❤️', '👏', '😂', '😮', '🔥'];
    
    return (
      <View style={styles.quickReactions}>
        {quickEmojis.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={styles.quickReactionButton}
            onPress={() => {
              // Send as a message or reaction
              if (messageText.trim()) {
                setMessageText(messageText + emoji);
              } else {
                setMessageText(emoji);
              }
            }}
          >
            <Text style={styles.quickReactionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        style,
        {
          transform: [{
            translateX: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [screenWidth * 0.8, 0]
            })
          }]
        }
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Live Chat</Text>
        <View style={styles.headerActions}>
          {isConnected && (
            <View style={styles.connectionStatus}>
              <View style={styles.connectionDot} />
              <Text style={styles.connectionText}>Live</Text>
            </View>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat messages */}
      <View style={styles.messagesContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to say something!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesList}
          />
        )}
      </View>

      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError} style={styles.errorClose}>
            <Ionicons name="close" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}
      >
        {/* Quick reactions */}
        {isInputFocused && renderQuickReactions()}
        
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.textInput,
              !canSendMessages && styles.textInputDisabled
            ]}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={
              isRateLimited 
                ? "Slow down! Wait a moment..." 
                : canSendMessages 
                ? "Type a message..." 
                : "Chat disabled"
            }
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            editable={canSendMessages}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || !canSendMessages) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || !canSendMessages}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={
                messageText.trim() && canSendMessages 
                  ? colors.text 
                  : colors.textSecondary
              } 
            />
          </TouchableOpacity>
        </View>

        {/* Character count */}
        {messageText.length > 400 && (
          <Text style={styles.characterCount}>
            {messageText.length}/500
          </Text>
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  connectionText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  messageTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  messageContent: {
    marginLeft: 32,
  },
  messageContentContinued: {
    marginLeft: 32,
    marginTop: -8,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },
  errorClose: {
    padding: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  quickReactions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickReactionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
  },
  quickReactionEmoji: {
    fontSize: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  textInputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.cardBackground,
  },
  characterCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
});
