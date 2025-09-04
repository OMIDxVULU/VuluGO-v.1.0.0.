/**
 * React Hook for Stream Chat
 * Provides easy integration with stream chat service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import streamChatService, { ChatMessage } from '../services/streamChatService';
import { useAuth } from '../contexts/AuthContext';

export interface UseStreamChatOptions {
  streamId: string;
  autoStart?: boolean;
  maxMessages?: number;
  onNewMessage?: (message: ChatMessage) => void;
  onMessageDeleted?: (messageId: string) => void;
  onError?: (error: Error) => void;
}

export interface StreamChatState {
  messages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  userRole: 'host' | 'moderator' | 'viewer';
  canSendMessages: boolean;
  isRateLimited: boolean;
}

export function useStreamChat(options: UseStreamChatOptions) {
  const { streamId, autoStart = true, maxMessages = 100 } = options;
  const { user } = useAuth();
  
  const [state, setState] = useState<StreamChatState>({
    messages: [],
    isConnected: false,
    isLoading: false,
    error: null,
    userRole: 'viewer',
    canSendMessages: true,
    isRateLimited: false
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Start chat listener
  const startChat = useCallback(() => {
    if (!streamId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const unsubscribe = streamChatService.startChatListener(
      streamId,
      (messages) => {
        const limitedMessages = messages.slice(0, maxMessages);
        
        setState(prev => {
          // Check for new messages
          const newMessage = limitedMessages[0];
          if (newMessage && prev.messages.length > 0 && newMessage.id !== prev.messages[0]?.id) {
            callbacksRef.current.onNewMessage?.(newMessage);
          }

          return {
            ...prev,
            messages: limitedMessages,
            isConnected: true,
            isLoading: false
          };
        });
      },
      (error) => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          error: error.message
        }));
        callbacksRef.current.onError?.(error);
      }
    );

    unsubscribeRef.current = unsubscribe;
    console.log(`💬 Started chat for stream: ${streamId}`);
  }, [streamId, maxMessages]);

  // Stop chat listener
  const stopChat = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      messages: []
    }));
    
    console.log(`💬 Stopped chat for stream: ${streamId}`);
  }, [streamId]);

  // Send message
  const sendMessage = useCallback(async (message: string, mentions: string[] = []) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (state.isRateLimited) {
        throw new Error('You are sending messages too quickly. Please slow down.');
      }

      await streamChatService.sendMessage(streamId, message, mentions);
      
      // Reset rate limit status after successful send
      setState(prev => ({ ...prev, isRateLimited: false }));
      
    } catch (error: any) {
      if (error.message.includes('too quickly')) {
        setState(prev => ({ ...prev, isRateLimited: true }));
        
        // Reset rate limit status after 10 seconds
        setTimeout(() => {
          setState(prev => ({ ...prev, isRateLimited: false }));
        }, 10000);
      }
      
      throw error;
    }
  }, [streamId, user, state.isRateLimited]);

  // Add reaction
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await streamChatService.addReaction(streamId, messageId, emoji);
    } catch (error: any) {
      console.error('Failed to add reaction:', error);
      throw error;
    }
  }, [streamId]);

  // Delete message (moderation)
  const deleteMessage = useCallback(async (messageId: string, reason?: string) => {
    try {
      await streamChatService.deleteMessage(streamId, messageId, reason);
      callbacksRef.current.onMessageDeleted?.(messageId);
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }, [streamId]);

  // Clear chat (moderation)
  const clearChat = useCallback(async (reason?: string) => {
    try {
      await streamChatService.clearChat(streamId, reason);
    } catch (error: any) {
      console.error('Failed to clear chat:', error);
      throw error;
    }
  }, [streamId]);

  // Update chat settings (moderation)
  const updateChatSettings = useCallback(async (settings: any) => {
    try {
      await streamChatService.updateChatSettings(streamId, settings);
    } catch (error: any) {
      console.error('Failed to update chat settings:', error);
      throw error;
    }
  }, [streamId]);

  // Get message by ID
  const getMessage = useCallback((messageId: string): ChatMessage | undefined => {
    return state.messages.find(msg => msg.id === messageId);
  }, [state.messages]);

  // Get messages by user
  const getMessagesByUser = useCallback((userId: string): ChatMessage[] => {
    return state.messages.filter(msg => msg.senderId === userId);
  }, [state.messages]);

  // Get recent messages (last N messages)
  const getRecentMessages = useCallback((count: number = 10): ChatMessage[] => {
    return state.messages.slice(0, count);
  }, [state.messages]);

  // Check if user can moderate
  const canModerate = useCallback((): boolean => {
    return ['host', 'moderator'].includes(state.userRole);
  }, [state.userRole]);

  // Check if message is from current user
  const isOwnMessage = useCallback((message: ChatMessage): boolean => {
    return user?.uid === message.senderId;
  }, [user?.uid]);

  // Auto-start chat listener
  useEffect(() => {
    if (autoStart && streamId) {
      startChat();
    }

    return () => {
      stopChat();
    };
  }, [streamId, autoStart, startChat, stopChat]);

  // Determine user role and permissions
  useEffect(() => {
    if (!user || !streamId) return;

    const determineUserRole = async () => {
      try {
        // Get user role from stream data
        // This would need to be implemented in the chat service
        // For now, we'll assume viewer role
        setState(prev => ({
          ...prev,
          userRole: 'viewer',
          canSendMessages: true
        }));
      } catch (error) {
        console.error('Failed to determine user role:', error);
      }
    };

    determineUserRole();
  }, [user, streamId]);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [state.error]);

  return {
    // State
    messages: state.messages,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    userRole: state.userRole,
    canSendMessages: state.canSendMessages && !state.isRateLimited,
    isRateLimited: state.isRateLimited,

    // Actions
    startChat,
    stopChat,
    sendMessage,
    addReaction,
    deleteMessage,
    clearChat,
    updateChatSettings,

    // Helpers
    getMessage,
    getMessagesByUser,
    getRecentMessages,
    canModerate,
    isOwnMessage,

    // Computed values
    messageCount: state.messages.length,
    latestMessage: state.messages[0] || null,
    hasMessages: state.messages.length > 0,
    activeUsers: [...new Set(state.messages.slice(0, 20).map(msg => msg.senderId))].length,
    
    // Status checks
    isActive: state.isConnected && !state.error,
    needsReconnection: !state.isConnected && !state.isLoading && !state.error
  };
}

export default useStreamChat;
