/**
 * Analytics Dashboard Component
 * Comprehensive analytics dashboard with real-time charts and metrics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import useStreamAnalytics from '../../hooks/useStreamAnalytics';
import MetricCard from './MetricCard';
import ChartCard from './ChartCard';
import TopListCard from './TopListCard';

const { width: screenWidth } = Dimensions.get('window');

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

interface AnalyticsDashboardProps {
  streamId?: string;
  userId?: string;
  type: 'stream' | 'user' | 'overview';
  onExportReport?: () => void;
}

export default function AnalyticsDashboard({
  streamId,
  userId,
  type,
  onExportReport
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    streamAnalytics,
    userAnalytics,
    realtimeMetrics,
    isLoading,
    error,
    refreshAll,
    currentViewers,
    totalViewers,
    peakViewers,
    engagementRate,
    totalRevenue,
    totalMessages,
    totalReactions,
    totalGifts,
    userTotalStreams,
    userTotalWatchTime,
    userTotalEarnings,
    userTotalSpent
  } = useStreamAnalytics({
    streamId,
    userId,
    autoLoad: true,
    realTimeUpdates: type === 'stream',
    updateInterval: 30000
  });

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Generate chart data
  const generateViewerChartData = () => {
    if (!streamAnalytics?.viewerTimeline) {
      return {
        labels: ['Now'],
        datasets: [{
          data: [currentViewers],
          color: (opacity = 1) => `rgba(88, 101, 242, ${opacity})`,
          strokeWidth: 2
        }]
      };
    }

    // Would process timeline data
    return {
      labels: ['1h', '2h', '3h', '4h', '5h', '6h'],
      datasets: [{
        data: [10, 25, 40, 35, 50, currentViewers],
        color: (opacity = 1) => `rgba(88, 101, 242, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  const generateEngagementChartData = () => {
    return {
      labels: ['Messages', 'Reactions', 'Gifts', 'Shares'],
      datasets: [{
        data: [totalMessages, totalReactions, totalGifts, 25]
      }]
    };
  };

  const generateRevenueChartData = () => {
    return [
      {
        name: 'Gifts',
        population: totalRevenue * 0.8,
        color: colors.success,
        legendFontColor: colors.text,
        legendFontSize: 12
      },
      {
        name: 'Tips',
        population: totalRevenue * 0.15,
        color: colors.warning,
        legendFontColor: colors.text,
        legendFontSize: 12
      },
      {
        name: 'Other',
        population: totalRevenue * 0.05,
        color: colors.accent,
        legendFontColor: colors.text,
        legendFontSize: 12
      }
    ];
  };

  // Render stream analytics
  const renderStreamAnalytics = () => (
    <View>
      {/* Real-time metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Live Viewers"
          value={currentViewers.toString()}
          change={realtimeMetrics?.viewerChange || 0}
          icon="people"
          color={colors.success}
        />
        <MetricCard
          title="Peak Viewers"
          value={peakViewers.toString()}
          subtitle="Today"
          icon="trending-up"
          color={colors.accent}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          change={realtimeMetrics?.revenueChange || 0}
          icon="diamond"
          color={colors.warning}
        />
        <MetricCard
          title="Engagement"
          value={`${engagementRate.toFixed(1)}%`}
          subtitle="Rate"
          icon="heart"
          color={colors.error}
        />
      </View>

      {/* Charts */}
      <ChartCard title="Viewer Timeline" style={styles.chartCard}>
        <LineChart
          data={generateViewerChartData()}
          width={screenWidth - 64}
          height={200}
          chartConfig={{
            backgroundColor: colors.cardBackground,
            backgroundGradientFrom: colors.cardBackground,
            backgroundGradientTo: colors.cardBackground,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(185, 187, 190, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: colors.accent
            }
          }}
          bezier
          style={styles.chart}
        />
      </ChartCard>

      <ChartCard title="Engagement Breakdown" style={styles.chartCard}>
        <BarChart
          data={generateEngagementChartData()}
          width={screenWidth - 64}
          height={200}
          chartConfig={{
            backgroundColor: colors.cardBackground,
            backgroundGradientFrom: colors.cardBackground,
            backgroundGradientTo: colors.cardBackground,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(88, 101, 242, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(185, 187, 190, ${opacity})`,
            style: { borderRadius: 16 }
          }}
          style={styles.chart}
        />
      </ChartCard>

      {totalRevenue > 0 && (
        <ChartCard title="Revenue Sources" style={styles.chartCard}>
          <PieChart
            data={generateRevenueChartData()}
            width={screenWidth - 64}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </ChartCard>
      )}

      {/* Top lists */}
      {streamAnalytics?.topGifters && streamAnalytics.topGifters.length > 0 && (
        <TopListCard
          title="Top Supporters"
          items={streamAnalytics.topGifters.map(gifter => ({
            id: gifter.userId,
            name: `User ${gifter.userId.slice(0, 8)}`,
            value: `$${gifter.amount.toFixed(2)}`,
            icon: 'diamond'
          }))}
          style={styles.topListCard}
        />
      )}
    </View>
  );

  // Render user analytics
  const renderUserAnalytics = () => (
    <View>
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Total Streams"
          value={userTotalStreams.toString()}
          icon="videocam"
          color={colors.accent}
        />
        <MetricCard
          title="Watch Time"
          value={`${Math.floor(userTotalWatchTime / 3600)}h`}
          subtitle="Hours"
          icon="time"
          color={colors.success}
        />
        <MetricCard
          title="Earnings"
          value={`$${userTotalEarnings.toFixed(2)}`}
          icon="trending-up"
          color={colors.warning}
        />
        <MetricCard
          title="Spent"
          value={`$${userTotalSpent.toFixed(2)}`}
          icon="card"
          color={colors.error}
        />
      </View>

      {/* User-specific charts would go here */}
    </View>
  );

  // Render overview analytics
  const renderOverviewAnalytics = () => (
    <View>
      <Text style={styles.sectionTitle}>Platform Overview</Text>
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Active Streams"
          value="42"
          icon="videocam"
          color={colors.success}
        />
        <MetricCard
          title="Total Viewers"
          value="1.2K"
          icon="people"
          color={colors.accent}
        />
        <MetricCard
          title="Revenue Today"
          value="$2,450"
          icon="diamond"
          color={colors.warning}
        />
        <MetricCard
          title="Engagement"
          value="85%"
          icon="heart"
          color={colors.error}
        />
      </View>
    </View>
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorTitle}>Analytics Unavailable</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {type === 'stream' ? 'Stream Analytics' : 
           type === 'user' ? 'Your Analytics' : 
           'Platform Overview'}
        </Text>
        <View style={styles.headerActions}>
          {/* Time range selector */}
          <View style={styles.timeRangeSelector}>
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeButtonText,
                    timeRange === range && styles.timeRangeButtonTextActive
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {onExportReport && (
            <TouchableOpacity style={styles.exportButton} onPress={onExportReport}>
              <Ionicons name="download" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {type === 'stream' && renderStreamAnalytics()}
            {type === 'user' && renderUserAnalytics()}
            {type === 'overview' && renderOverviewAnalytics()}
          </>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 2,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeRangeButtonActive: {
    backgroundColor: colors.accent,
  },
  timeRangeButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeRangeButtonTextActive: {
    color: colors.text,
  },
  exportButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  chartCard: {
    marginBottom: 24,
  },
  chart: {
    borderRadius: 16,
  },
  topListCard: {
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
