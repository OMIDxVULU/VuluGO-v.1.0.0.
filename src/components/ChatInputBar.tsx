import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Text,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Reply } from './MessageBubble';

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onAttachImage: () => void;
  onEmojiPress: () => void;
  replyTo?: Reply;
  onCancelReply?: () => void;
  placeholderText?: string;
  isTyping?: boolean;
}

const ChatInputBar = ({
  onSendMessage,
  onAttachImage,
  onEmojiPress,
  replyTo,
  onCancelReply,
  placeholderText = 'Type a message...',
  isTyping = false,
}: ChatInputBarProps) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const inputAnimation = useRef(new Animated.Value(0)).current;

  // Animate input bar on focus/blur
  useEffect(() => {
    Animated.timing(inputAnimation, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, inputAnimation]);

  const handleSendPress = () => {
    if (message.trim() === '') return;
    
    onSendMessage(message);
    setMessage('');
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Button opacity based on whether there's text
  const sendButtonOpacity = message.trim() ? 1 : 0.5;

  // Input background color animation
  const inputBackgroundColor = inputAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(45, 46, 56, 0.7)', 'rgba(45, 46, 56, 1)'],
  });

  const inputBorderColor = inputAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.05)', 'rgba(110, 105, 244, 0.3)'],
  });

  // Reply preview section
  const renderReplyPreview = () => {
    if (!replyTo) return null;

    return (
      <View style={styles.replyPreviewContainer}>
        <View style={styles.replyPreviewContent}>
          <View style={styles.replyPreviewBar} />
          <View style={styles.replyPreviewTextContainer}>
            <Text style={styles.replyPreviewSender}>
              Replying to {replyTo.senderName}
            </Text>
            <Text style={styles.replyPreviewText} numberOfLines={1}>
              {replyTo.text}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.replyPreviewCloseButton}
          onPress={onCancelReply}
        >
          <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
    );
  };

  // "User is typing" indicator
  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>Someone is typing...</Text>
        <View style={styles.typingDotsContainer}>
          <Animated.View style={[styles.typingDot, styles.typingDot1]} />
          <Animated.View style={[styles.typingDot, styles.typingDot2]} />
          <Animated.View style={[styles.typingDot, styles.typingDot3]} />
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}
    >
      <LinearGradient
        colors={['rgba(19, 19, 24, 0)', '#131318']}
        style={styles.container}
      >
        {renderTypingIndicator()}
        {renderReplyPreview()}
        
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={onAttachImage}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.textInputContainer,
              {
                backgroundColor: inputBackgroundColor,
                borderColor: inputBorderColor,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder={placeholderText}
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={message}
              onChangeText={setMessage}
              onFocus={handleFocus}
              onBlur={handleBlur}
              multiline
              blurOnSubmit={false}
              maxHeight={120}
            />

            <TouchableOpacity
              style={styles.emojiButton}
              onPress={onEmojiPress}
              activeOpacity={0.7}
            >
              <MaterialIcons name="emoji-emotions" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[styles.sendButton, { opacity: sendButtonOpacity }]}
            onPress={handleSendPress}
            disabled={message.trim() === ''}
            activeOpacity={0.7}
          >
            <MaterialIcons name="send" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(110, 105, 244, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  emojiButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6E69F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 46, 56, 0.7)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  replyPreviewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyPreviewBar: {
    width: 3,
    height: '100%',
    backgroundColor: '#B768FB',
    borderRadius: 2,
    marginRight: 8,
  },
  replyPreviewTextContainer: {
    flex: 1,
  },
  replyPreviewSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B768FB',
  },
  replyPreviewText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  replyPreviewCloseButton: {
    padding: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginRight: 6,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
});

export default ChatInputBar; 