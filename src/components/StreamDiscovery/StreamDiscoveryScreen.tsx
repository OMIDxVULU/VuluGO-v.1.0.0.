/**
 * Stream Discovery Screen
 * Discord-inspired dark UI for browsing and discovering live streams
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStreamDiscovery from '../../hooks/useStreamDiscovery';
import { StreamCategory } from '../../services/firestoreService';
import StreamCard from './StreamCard';
import CategoryFilter from './CategoryFilter';
import SearchBar from './SearchBar';

const { width } = Dimensions.get('window');

// Discord-inspired color palette
const colors = {
  background: '#0f1117',
  cardBackground: '#151924',
  accent: '#5865F2',
  accentHover: '#4752C4',
  text: '#FFFFFF',
  textMuted: '#B9BBBE',
  textSecondary: '#72767D',
  border: '#202225',
  success: '#3BA55C',
  warning: '#FAA61A',
  error: '#ED4245'
};

interface StreamDiscoveryScreenProps {
  onStreamSelect?: (streamId: string) => void;
  onCreateStream?: () => void;
}

export default function StreamDiscoveryScreen({
  onStreamSelect,
  onCreateStream
}: StreamDiscoveryScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<StreamCategory | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const {
    streams,
    trendingStreams,
    recommendations,
    popularCategories,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    searchStreams,
    filterByCategory,
    loadMore,
    refresh,
    clearFilters,
    clearError
  } = useStreamDiscovery({
    isLive: true,
    sortBy: 'viewers'
  }, {
    autoLoad: true,
    realtime: true,
    refreshInterval: 30000 // Refresh every 30 seconds
  });

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      await searchStreams(query);
    } else {
      await clearFilters();
    }
  }, [searchStreams, clearFilters]);

  // Handle category filter
  const handleCategoryFilter = useCallback(async (category: StreamCategory | null) => {
    setSelectedCategory(category);
    if (category) {
      await filterByCategory(category);
    } else {
      await clearFilters();
    }
  }, [filterByCategory, clearFilters]);

  // Handle stream selection
  const handleStreamSelect = useCallback((streamId: string) => {
    onStreamSelect?.(streamId);
  }, [onStreamSelect]);

  // Render stream item
  const renderStreamItem = useCallback(({ item, index }) => (
    <StreamCard
      stream={item}
      onPress={() => handleStreamSelect(item.id)}
      style={[
        styles.streamCard,
        viewMode === 'grid' && styles.gridCard,
        viewMode === 'list' && styles.listCard
      ]}
    />
  ), [viewMode, handleStreamSelect]);

  // Render trending section
  const renderTrendingSection = () => {
    if (trendingStreams.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color={colors.accent} />
          <Text style={styles.sectionTitle}>Trending Now</Text>
        </View>
        <FlatList
          horizontal
          data={trendingStreams.slice(0, 5)}
          renderItem={({ item }) => (
            <StreamCard
              stream={item}
              onPress={() => handleStreamSelect(item.id)}
              style={styles.trendingCard}
              compact
            />
          )}
          keyExtractor={(item) => `trending-${item.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
  };

  // Render recommendations section
  const renderRecommendationsSection = () => {
    if (recommendations.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star" size={20} color={colors.warning} />
          <Text style={styles.sectionTitle}>Recommended for You</Text>
        </View>
        <FlatList
          horizontal
          data={recommendations.slice(0, 5)}
          renderItem={({ item }) => (
            <StreamCard
              stream={item.stream}
              onPress={() => handleStreamSelect(item.stream.id)}
              style={styles.recommendedCard}
              compact
              showReason={item.reason}
            />
          )}
          keyExtractor={(item) => `rec-${item.stream.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
  };

  // Render categories section
  const renderCategoriesSection = () => {
    if (popularCategories.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="grid" size={20} color={colors.success} />
          <Text style={styles.sectionTitle}>Browse Categories</Text>
        </View>
        <CategoryFilter
          categories={popularCategories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategoryFilter}
        />
      </View>
    );
  };

  // Render main content
  const renderMainContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={clearError}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isLoading && streams.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Discovering streams...</Text>
        </View>
      );
    }

    if (streams.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No streams found</Text>
          <Text style={styles.emptyMessage}>
            {searchQuery || selectedCategory 
              ? 'Try adjusting your search or filters'
              : 'Be the first to go live!'
            }
          </Text>
          {onCreateStream && (
            <TouchableOpacity style={styles.createButton} onPress={onCreateStream}>
              <Ionicons name="add" size={20} color={colors.text} />
              <Text style={styles.createButtonText}>Start Streaming</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <FlatList
        data={streams}
        renderItem={renderStreamItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <Text style={styles.loadingMoreText}>Loading more streams...</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.streamsList}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid" size={20} color={viewMode === 'grid' ? colors.text : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={20} color={viewMode === 'list' ? colors.text : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearch}
        placeholder="Search streams, creators, or tags..."
        style={styles.searchBar}
      />

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {!searchQuery && !selectedCategory && (
          <>
            {renderTrendingSection()}
            {renderRecommendationsSection()}
            {renderCategoriesSection()}
          </>
        )}
        
        <View style={styles.section}>
          {(searchQuery || selectedCategory) && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {searchQuery ? `Results for "${searchQuery}"` : `${selectedCategory} Streams`}
              </Text>
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setSelectedCategory(null);
                clearFilters();
              }}>
                <Text style={styles.clearFiltersText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
          {renderMainContent()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
  },
  viewModeButtonActive: {
    backgroundColor: colors.accent,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  clearFiltersText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  streamsList: {
    paddingHorizontal: 16,
  },
  streamCard: {
    marginBottom: 12,
  },
  gridCard: {
    width: (width - 48) / 2,
    marginHorizontal: 4,
  },
  listCard: {
    width: '100%',
  },
  trendingCard: {
    width: 200,
    marginRight: 12,
  },
  recommendedCard: {
    width: 180,
    marginRight: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
