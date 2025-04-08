import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import SVGIcon from '../components/SVGIcon';
import CommonHeader from '../components/CommonHeader';

const { width, height } = Dimensions.get('window');

// Enhanced ChatPreview to include status and level based on Figma
interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string; // Using relative time like "44m" from Figma
  avatar: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  level?: number; // Optional level
  isSelected?: boolean; // For the highlighted item in Figma
}

// Updated Sample data based on Figma structure
const DUMMY_CHATS: ChatPreview[] = [
  {
    id: '2',
    name: 'Sophia',
    lastMessage: 'Luna: Help me!',
    timestamp: '44m', // Relative time
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg', // Changed to men/1 for variety
    status: 'online',
    level: 48,
  },
  {
    id: '3',
    name: 'Sophia',
    lastMessage: 'Luna: Help me!',
    timestamp: '44m',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    status: 'busy',
    level: 48,
    isSelected: true, // Example of selected item
  },
  {
    id: '4',
    name: 'Sophia',
    lastMessage: 'Luna: Help me!',
    timestamp: '44m',
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    status: 'idle',
    level: 48,
  },
  {
    id: '5',
    name: 'Sophia',
    lastMessage: 'Luna: Help me!',
    timestamp: '44m',
    avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    status: 'offline',
    level: 48,
  },
   {
    id: '6',
    name: 'David',
    lastMessage: 'Check this out!',
    timestamp: '1h',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg', // Changed
    status: 'online',
    level: 12,
  },
   {
    id: '7',
    name: 'Another User',
    lastMessage: 'Okay, sounds good.',
    timestamp: '3h',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg', // Changed
    status: 'offline',
  },
];

// Status Indicator Component refined based on Figma specs
const StatusIndicator = ({ status }: { status: ChatPreview['status'] }) => {
  const baseStyle = styles.statusIndicatorBase;
  let specificStyle;
  let content = null;

  switch (status) {
    case 'online':
      specificStyle = styles.statusOnline;
      break;
    case 'busy':
      specificStyle = styles.statusBusy;
      content = <View style={styles.statusBusyInner} />;
      break;
    case 'idle':
      specificStyle = styles.statusIdle;
      // Replace Ionicons with a colored view for now
      // We'll add more SVG icons later for specific status indicators
      content = <View style={{ width: 8, height: 8, backgroundColor: '#FFCB0E', borderRadius: 4 }} />;
      break;
    case 'offline':
      specificStyle = styles.statusOffline;
      // Nested view for the inner circle effect
      content = <View style={styles.statusOfflineInner} />;
      break;
    default:
      specificStyle = {};
  }

  return <View style={[baseStyle, specificStyle]}>{content}</View>;
};

const DirectMessagesScreen = () => {
  const handleAddFriend = () => {
    // TODO: Implement navigation or modal for adding friends
    console.log("Add Friends Pressed");
  };

  const handleCreateGroup = () => {
    // TODO: Implement navigation or modal for creating group chat
    console.log("Group Chat Pressed");
  };
  
  const handleSearch = () => {
    // TODO: Implement navigation or modal for search
    console.log("Search Pressed");
  };

  // Updated renderChatItem based on Figma specs
  const renderChatItem = ({ item }: { item: ChatPreview }) => {
    const isSelected = item.isSelected;
    const textColor = isSelected ? '#FFFFFF' : '#818491'; // White for selected, grey otherwise
    const timestampColor = isSelected ? '#FFFFFF' : '#6E717D';

    return (
      <TouchableOpacity
        style={[styles.chatItemContainer, isSelected && styles.chatItemSelected]}
        onPress={() => router.push({
          pathname: '/(main)/chat', // Ensure this path matches your file structure
          params: {
            userId: item.id,
            name: item.name,
            avatar: item.avatar
          }
        })}
      >
        {/* Avatar */}
        <View style={styles.chatItemAvatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.chatItemAvatar} />
          <StatusIndicator status={item.status} />
        </View>

        {/* Info */}
        <View style={styles.chatItemInfo}>
          <View style={styles.chatItemNameLevel}>
            <Text style={[styles.chatItemName, { color: textColor }]}>{item.name}</Text>
            {item.level && (
              <View style={styles.chatItemLevelContainer}>
                {/* Replacing Ionicons with a placeholder (we'll add SVG for flame later) */}
                <View style={{ width: 12, height: 12, backgroundColor: '#6E69F4', borderRadius: 6 }} />
                <Text style={[styles.chatItemLevel, { color: textColor }]}>{item.level}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.chatItemLastMessage, { color: textColor }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>

        {/* Timestamp */}
        <Text style={[styles.chatItemTimestamp, { color: timestampColor }]}>{item.timestamp}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.outerContainer}>
        <CommonHeader title="Messages" />
        
        <View style={styles.mainContentBackground}>
          {/* Top Bar with Search and Add Friends */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <SVGIcon name="visibility" size={17} color="#B5BAC1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addFriendsButton} onPress={handleAddFriend}>
              <View style={styles.addFriendsIconContainer}>
                <SVGIcon name="add" size={20} color="#B5BAC1" />
              </View>
              <Text style={styles.addFriendsText}>Add Friends</Text>
            </TouchableOpacity>
          </View>
          
          {/* TODO: Add Horizontal Active Chats Section here based on Figma component */}
          <View style={styles.horizontalScrollPlaceholder}>
             <Text style={styles.placeholderText}>Horizontal Active Chats (TODO)</Text>
          </View>

          {/* Messages List */}
          <FlatList
            data={DUMMY_CHATS}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatList}
            style={styles.flatListStyle} // Ensures list takes up available space
          />
        </View>

        {/* Group Chat Floating Button */}
        <TouchableOpacity
          style={styles.groupChatButton}
          onPress={handleCreateGroup}
        >
          <View style={styles.groupChatIconContainer}>
            <SVGIcon name="chat" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.groupChatText}>Group Chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Adjusted styles based on Figma CSS specs
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#131318', // Overall page background
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Handle Android status bar
  },
  outerContainer: {
    flex: 1,
    // Removed padding, using absolute positioning and margins where needed
  },
  mainContentBackground: {
    flex: 1, // Take remaining space
    backgroundColor: '#1C1D23',
    borderTopLeftRadius: 5, // Figma: border-radius: 5px 5px 0px 0px;
    borderTopRightRadius: 5,
    // Removed absolute positioning, using flex: 1 instead
    marginTop: 5, // Space between header title and this container
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    // padding: 5px 0px 5px 10px; -> Use paddingHorizontal/Vertical
    paddingVertical: 10, // Increased padding for better touch area
    paddingHorizontal: 16, // Adjusted padding
    // gap: 163px; -> Use justifyContent: 'space-between' or margins
    justifyContent: 'space-between', // Pushes search to left, add friends to right
    // width: 365px; -> Use width: '100%' or rely on container
    width: '100%',
    // Removed absolute positioning
    // background: '#1C1D23', // Already set by mainContentBackground
    // border-radius: 5px 0px 0px 0px; // Already handled by mainContentBackground
    marginBottom: 10, // Space below top bar
  },
  searchButton: {
    // box-sizing: border-box;
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10, // Adjusted padding
    // gap: 10px;
    // width: 37px; height: 37.38px; -> Let padding define size or set fixed size
    width: 40, // Fixed size for consistency
    height: 40,
    backgroundColor: '#434751',
    borderRadius: 10,
    // Shadow properties might need Platform adjustment
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    elevation: 5, // for Android
  },
  // Search icon style (already set size/color in component)
  addFriendsButton: {
    // box-sizing: border-box;
    flexDirection: 'row', // Changed from column to row
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9, // Adjusted padding
    paddingHorizontal: 15, // Adjusted padding
    gap: 8, // Added gap between icon and text
    // width: 266px; -> Width will be determined by content + padding
    height: 40, // Fixed height
    backgroundColor: '#434751',
    borderRadius: 10,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // Figma: 0px 4px 2px -> use offset y=4, radius=2
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 5, // for Android
    flexGrow: 1, // Allow button to grow slightly if needed
    marginLeft: 10, // Space between search and add friends
  },
  addFriendsIconContainer: {
    // Position adjusted by flex gap in button
    // Shadow applied to button container
     marginRight: 5, // Add some space between icon and text
  },
  addFriendsText: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'System', // Use System font as fallback
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 17,
    color: '#B5BAC1',
     // Shadow applied to button container
  },
  // Placeholder for Horizontal Scroll Section
  horizontalScrollPlaceholder: {
      height: 102, // Approximate height from Figma component
      backgroundColor: 'rgba(67, 71, 81, 0.5)', // Semi-transparent version of #434751
      borderRadius: 10,
      marginHorizontal: 16, // Match other padding
      marginBottom: 18, // Space before the vertical list
      justifyContent: 'center',
      alignItems: 'center',
  },
  placeholderText: {
      color: '#B5BAC1',
      fontFamily: Platform.OS === 'ios' ? 'Inter' : 'System',
      fontSize: 14,
  },
  // Styles for Vertical FlatList
  flatListStyle: {
      flex: 1, // Ensure list takes available space within mainContentBackground
      paddingHorizontal: 16, // Add horizontal padding to list container
  },
  chatList: {
    paddingBottom: 100, // Ensure space for Group Chat button
    paddingTop: 0, // Remove default padding if any
  },
  chatItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // padding: 0px; -> Set padding/margin as needed
    marginBottom: 18, // Figma: gap: 18px between items
    paddingHorizontal: 5, // Add some horizontal padding within the item if needed
    // height: 40px; // Height determined by content, matches non-selected figma item height
  },
  chatItemSelected: {
    backgroundColor: '#2A2E37', // Background for selected item
    borderRadius: 10,
    paddingVertical: 10, // Add padding when selected to contain the background
    paddingHorizontal: 12, // Add padding when selected
    marginBottom: 18, // Keep consistent margin
    // height: 59px; // Height from Figma selected item
    // Shadow for selected item
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Subtle shadow
    shadowRadius: 4,
    elevation: 3,
  },
  chatItemAvatarContainer: {
    position: 'relative', // For status indicator positioning
    marginRight: 12, // Space between avatar and text info
  },
  chatItemAvatar: {
    width: 37,
    height: 37,
    borderRadius: 18.5, // Make it circular
    borderWidth: 1, // Figma spec border
    borderColor: '#15151A', // Figma spec border color
  },
  // Status Indicator Styles - Base and Specifics
  statusIndicatorBase: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7, // Make it circular
    borderWidth: 1.2, // Figma spec border
    borderColor: '#15151A', // Figma spec border color (or match container bg?) Using #15151A for now.
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOnline: {
    backgroundColor: '#7ADA72', // Green
  },
  statusBusy: {
    backgroundColor: '#D94430', // Red
  },
  statusBusyInner: { // Minus sign for Busy
    width: 7.53,
    height: 1.4,
    backgroundColor: '#15151A', // Dark color for the minus sign
  },
  statusIdle: {
    backgroundColor: '#282828', // Dark background for idle icon container
    // Moon icon is positioned inside using Ionicons
  },
  statusOffline: {
    backgroundColor: '#000000', // Outer circle color for offline
    // Inner circle achieved with nested view
  },
  statusOfflineInner: { // Inner circle for Offline
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B3A3A', // Inner circle color from Figma spec
    // Border applied to outer container (statusOffline)
  },
  // End Status Indicator Styles
  chatItemInfo: {
    flex: 1, // Take remaining space
    justifyContent: 'center',
  },
  chatItemNameLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // Space between name/level and last message
  },
  chatItemName: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'System',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 19,
    marginRight: 6, // Space between name and level
    // Color set dynamically based on isSelected
  },
  chatItemLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatItemLevel: {
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 14,
    marginLeft: 3, // Space between icon and level number
    // Color set dynamically based on isSelected
  },
  chatItemLastMessage: {
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 17,
    // Color set dynamically based on isSelected
  },
  chatItemTimestamp: {
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 16,
    marginLeft: 10, // Space between text info and timestamp
    // Color set dynamically based on isSelected
  },
  groupChatButton: {
    position: 'absolute',
    bottom: 24, // Align with Figma padding
    right: 24, // Align with Figma padding
    width: 70,
    height: 70,
    backgroundColor: '#6E69F4',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // Figma: 0px 4px 1px
    shadowOpacity: 0.25,
    shadowRadius: 1, // Adjust radius to match '1px' blur effect
    elevation: 8, // for Android
  },
  groupChatIconContainer: {
     // Shadow applied to button container
     marginBottom: 2, // Space between icon and text
  },
  groupChatText: {
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'System',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 12,
    color: '#FFFFFF',
    // Text Shadow
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 2,
  },
});

export default DirectMessagesScreen; 