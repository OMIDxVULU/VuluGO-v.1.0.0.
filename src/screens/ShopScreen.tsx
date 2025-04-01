import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Image, ScrollView } from 'react-native';
import { Text, Button, Card, Badge, Chip, IconButton } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScrollableContentContainer from '../components/ScrollableContentContainer';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isNew?: boolean;
  discount?: number;
  isFeatured?: boolean;
}

const ShopScreen = () => {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'avatars', label: 'Avatars' },
    { id: 'badges', label: 'Badges' },
    { id: 'themes', label: 'Themes' },
    { id: 'effects', label: 'Effects' }
  ];

  const shopItems: ShopItem[] = [
    { 
      id: '1', 
      name: 'Premium Avatar Pack', 
      description: 'Exclusive animated avatars', 
      price: 1200, 
      image: 'https://picsum.photos/id/237/300/300', 
      category: 'avatars',
      isNew: true,
      isFeatured: true
    },
    { 
      id: '2', 
      name: 'Gold Badge', 
      description: 'Show off your status', 
      price: 800, 
      image: 'https://picsum.photos/id/1025/300/300', 
      category: 'badges',
      discount: 15
    },
    { 
      id: '3', 
      name: 'Neon Theme', 
      description: 'Light up your profile', 
      price: 950, 
      image: 'https://picsum.photos/id/1069/300/300', 
      category: 'themes'
    },
    { 
      id: '4', 
      name: 'Message Effects', 
      description: 'Add flair to your messages', 
      price: 600, 
      image: 'https://picsum.photos/id/1062/300/300', 
      category: 'effects',
      isNew: true
    },
    { 
      id: '5', 
      name: 'Diamond Avatar', 
      description: 'The ultimate rare avatar', 
      price: 2500, 
      image: 'https://picsum.photos/id/1082/300/300', 
      category: 'avatars',
      isFeatured: true
    },
    { 
      id: '6', 
      name: 'VIP Badge', 
      description: 'Exclusive access badge', 
      price: 1500, 
      image: 'https://picsum.photos/id/1060/300/300', 
      category: 'badges'
    },
    { 
      id: '7', 
      name: 'Dark Mode Theme', 
      description: 'Sleek and modern look', 
      price: 750, 
      image: 'https://picsum.photos/id/1039/300/300', 
      category: 'themes',
      discount: 20
    },
    { 
      id: '8', 
      name: 'Confetti Effect', 
      description: 'Celebrate in style', 
      price: 450, 
      image: 'https://picsum.photos/id/1019/300/300', 
      category: 'effects'
    },
  ];

  const filteredItems = selectedCategory === 'all' 
    ? shopItems 
    : shopItems.filter(item => item.category === selectedCategory);

  const featuredItems = shopItems.filter(item => item.isFeatured);

  const renderShopItem = ({ item }: { item: ShopItem }) => {
    const discountedPrice = item.discount 
      ? Math.round(item.price * (1 - item.discount / 100)) 
      : item.price;

    return (
      <Card style={styles.itemCard}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.itemImage} />
          {item.isNew && (
            <Badge style={styles.newBadge}>NEW</Badge>
          )}
          {item.discount && (
            <Badge style={styles.discountBadge}>{`${item.discount}% OFF`}</Badge>
          )}
        </View>
        <Card.Content style={styles.cardContent}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription}>{item.description}</Text>
          <View style={styles.priceContainer}>
            {item.discount ? (
              <View style={styles.discountContainer}>
                <Text style={styles.originalPrice}>{item.price}</Text>
                <Text style={styles.itemPrice}>{discountedPrice}</Text>
              </View>
            ) : (
              <Text style={styles.itemPrice}>{item.price}</Text>
            )}
            <Button 
              mode="contained" 
              style={styles.buyButton}
              buttonColor="#4CAF50"
              labelStyle={styles.buyButtonLabel}
            >
              Buy
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderFeaturedItem = ({ item }: { item: ShopItem }) => (
    <TouchableOpacity style={styles.featuredItemContainer}>
      <Image source={{ uri: item.image }} style={styles.featuredImage} />
      <View style={styles.featuredOverlay}>
        <View style={styles.featuredContent}>
          <Text style={styles.featuredLabel}>FEATURED</Text>
          <Text style={styles.featuredName}>{item.name}</Text>
          <Text style={styles.featuredPrice}>{item.price} Gold</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="shopping-cart" size={24} color="#4CAF50" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Shop</Text>
        </View>
        <View style={styles.headerRightContainer}>
          <View style={styles.goldContainer}>
            <MaterialIcons name="monetization-on" size={20} color="#FFD700" />
            <Text style={styles.goldAmount}>1,250</Text>
          </View>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollableContentContainer style={styles.content}>
        {/* Featured Items Carousel */}
        <Text style={styles.sectionTitle}>Featured Items</Text>
        <FlatList
          data={featuredItems}
          renderItem={renderFeaturedItem}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
        />

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map(category => (
            <Chip
              key={category.id}
              selected={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.selectedCategoryChip
              ]}
            >
              {category.label}
            </Chip>
          ))}
        </ScrollView>

        {/* Shop Items Grid */}
        <View style={styles.shopGrid}>
          {filteredItems.map(item => (
            <View key={item.id} style={styles.gridItem}>
              {renderShopItem({ item })}
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  goldAmount: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  featuredList: {
    paddingBottom: 20,
  },
  featuredItemContainer: {
    width: 280,
    height: 160,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  featuredContent: {
    padding: 16,
  },
  featuredLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4,
  },
  featuredName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  featuredPrice: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#2C2D35',
  },
  selectedCategoryChip: {
    backgroundColor: '#4CAF50',
  },
  categoryChipText: {
    color: '#FFFFFF',
  },
  selectedCategoryChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  shopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#1C1D23',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 120,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#4CAF50',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF5C8D',
  },
  cardContent: {
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discountContainer: {
    flexDirection: 'column',
  },
  originalPrice: {
    fontSize: 12,
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  buyButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  buyButtonLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginVertical: 0,
  },
});

export default ShopScreen; 