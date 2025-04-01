import React from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Avatar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScrollableContentContainer from '../components/ScrollableContentContainer';

// Use the router for navigation
const HomeScreen = () => {
  const router = useRouter();

  // Define card routes with their proper typing
  const cards = [
    { title: 'Direct Messages', subtitle: 'Chat with your friends', icon: 'chat', route: 'directmessages', color: '#6E69F4' },
    { title: 'Live Stream', subtitle: 'Watch live content', icon: 'live-tv', route: 'live', color: '#FF5C8D' },
    { title: 'Music', subtitle: 'Listen to your favorite tracks', icon: 'music-note', route: 'music', color: '#38B6FF' },
    { title: 'Leaderboard', subtitle: 'View top performers', icon: 'leaderboard', route: 'leaderboard', color: '#FF914D' },
    { title: 'Mining Gold', subtitle: 'Earn rewards', icon: 'monetization-on', route: 'mining', color: '#FFD700' },
    { title: 'Shop', subtitle: 'Browse and buy items', icon: 'shopping-cart', route: 'shop', color: '#4CAF50' }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar.Image
            source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
            size={40}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.usernameText}>David Chen</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton} 
          onPress={() => router.push('/(main)/notifications')}
        >
          <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>9</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollableContentContainer
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>VULU GO</Text>
        <Text style={styles.subtitle}>Explore our features</Text>

        <View style={styles.cardsContainer}>
          {cards.map((card, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.cardWrapper}
              onPress={() => router.push(`/(main)/${card.route}` as any)}
            >
              <Card style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  <View style={[styles.iconContainer, { backgroundColor: card.color }]}>
                    <MaterialIcons name={card.icon as any} size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollableContentContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  usernameText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  notificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F23535',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 24,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default HomeScreen; 