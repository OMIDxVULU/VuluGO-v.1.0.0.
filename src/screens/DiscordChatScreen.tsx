import React, { useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ChatScreenProps {
  userId: string;
  name: string;
  avatar: string;
  goBack: () => void;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
}

const COLORS = {
  background: '#36393F',
  textNormal: '#DCDDDE',
  textBright: '#FFFFFF',
  textMuted: '#72767D',
  divider: '#40444B',
  inputBackground: '#40444B',
  accent: '#5865F2',
};

const DiscordChatScreen = ({ name, avatar, goBack }: ChatScreenProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const newMsg: Message = {
      id: String(Date.now()),
      senderId: 'current',
      senderName: 'You',
      senderAvatar: avatar,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, newMsg]);
    setMessage('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerButton} onPress={goBack}>
        <MaterialIcons name="arrow-back" size={24} color={COLORS.textBright} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{name}</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerButton}>
          <MaterialIcons name="call" size={24} color={COLORS.textBright} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <MaterialIcons name="videocam" size={24} color={COLORS.textBright} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton}>
          <MaterialIcons name="more-vert" size={24} color={COLORS.textBright} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Message }) => (
    <View style={styles.messageRow}>
      <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.username}>{item.senderName}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 85 : 70}
        style={styles.keyboardContainer}
        enabled
      >
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={`Message ${name}`}
              placeholderTextColor={COLORS.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            {message.trim().length > 0 && (
              <TouchableOpacity style={[styles.sendButton]} onPress={sendMessage}>
                <MaterialIcons name="send" size={20} color={COLORS.textBright} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardContainer: { flex: 1 },
  chatContainer: { flex: 1 },
  messagesContainer: { padding: 12 },
  header: {
    height: 56,
    backgroundColor: '#202225',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerButton: { padding: 6 },
  headerTitle: { color: COLORS.textBright, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  messageRow: { flexDirection: 'row', marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  messageContent: { flex: 1 },
  messageHeader: { flexDirection: 'row', alignItems: 'baseline' },
  username: { color: COLORS.textBright, fontWeight: '600', marginRight: 8 },
  timestamp: { color: COLORS.textMuted, fontSize: 12 },
  messageText: { color: COLORS.textNormal, marginTop: 2 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: COLORS.textNormal,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 100,
  },
  sendButton: { marginLeft: 8, padding: 8, backgroundColor: COLORS.accent, borderRadius: 16 },
});

export default DiscordChatScreen;


