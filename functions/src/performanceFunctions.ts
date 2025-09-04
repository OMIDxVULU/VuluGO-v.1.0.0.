/**
 * Firebase Functions for Performance Monitoring
 * Handles performance analysis, alerting, and reporting
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Generate stream quality report
 */
export const generateStreamQualityReport = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { streamId, startTime, endTime } = data;

    if (!streamId || !startTime || !endTime) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'streamId, startTime, and endTime are required'
      );
    }

    // Verify user has access to this stream
    const streamDoc = await db.doc(`streams/${streamId}`).get();
    if (!streamDoc.exists()) {
      throw new functions.https.HttpsError(
        'not-found',
        'Stream not found'
      );
    }

    const streamData = streamDoc.data()!;
    if (streamData.hostId !== context.auth.uid && 
        !streamData.moderatorIds?.includes(context.auth.uid)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Insufficient permissions'
      );
    }

    // Get performance metrics for the time period
    const start = admin.firestore.Timestamp.fromDate(new Date(startTime));
    const end = admin.firestore.Timestamp.fromDate(new Date(endTime));

    const metricsQuery = await db.collection('performanceMetrics')
      .where('streamId', '==', streamId)
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .get();

    if (metricsQuery.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'No performance data found for the specified period'
      );
    }

    const metrics = metricsQuery.docs.map(doc => doc.data());

    // Generate report
    const report = await generateQualityReport(streamId, streamData.hostId, metrics, start, end);

    console.log(`Generated quality report for stream ${streamId}`);
    return report;

  } catch (error: any) {
    console.error('Error generating stream quality report:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate stream quality report'
    );
  }
});

/**
 * Process performance alerts
 */
export const processPerformanceAlerts = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    try {
      const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(
        Date.now() - 5 * 60 * 1000
      );

      // Get recent performance metrics
      const recentMetricsQuery = await db.collection('performanceMetrics')
        .where('timestamp', '>=', fiveMinutesAgo)
        .get();

      if (recentMetricsQuery.empty) {
        console.log('No recent performance metrics to process');
        return { processed: 0 };
      }

      const metrics = recentMetricsQuery.docs.map(doc => doc.data());
      
      // Analyze metrics for patterns and issues
      const alerts = await analyzePerformancePatterns(metrics);
      
      // Create alerts in Firestore
      const batch = db.batch();
      alerts.forEach(alert => {
        const alertRef = db.collection('performanceAlerts').doc();
        batch.set(alertRef, alert);
      });

      if (alerts.length > 0) {
        await batch.commit();
        console.log(`Created ${alerts.length} performance alerts`);
      }

      return { processed: alerts.length };

    } catch (error) {
      console.error('Error processing performance alerts:', error);
      throw error;
    }
  });

/**
 * Aggregate performance statistics
 */
export const aggregatePerformanceStats = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    try {
      const oneHourAgo = admin.firestore.Timestamp.fromMillis(
        Date.now() - 60 * 60 * 1000
      );

      // Get metrics from the last hour
      const metricsQuery = await db.collection('performanceMetrics')
        .where('timestamp', '>=', oneHourAgo)
        .get();

      if (metricsQuery.empty) {
        console.log('No metrics to aggregate');
        return { aggregated: 0 };
      }

      const metrics = metricsQuery.docs.map(doc => doc.data());
      
      // Group metrics by stream
      const streamMetrics = new Map<string, any[]>();
      metrics.forEach(metric => {
        if (metric.streamId) {
          if (!streamMetrics.has(metric.streamId)) {
            streamMetrics.set(metric.streamId, []);
          }
          streamMetrics.get(metric.streamId)!.push(metric);
        }
      });

      // Create aggregated statistics
      const batch = db.batch();
      let aggregatedCount = 0;

      for (const [streamId, streamMetricsList] of streamMetrics) {
        const aggregatedStats = calculateAggregatedStats(streamMetricsList);
        
        const statsRef = db.collection('performanceStats').doc();
        batch.set(statsRef, {
          streamId,
          period: {
            start: oneHourAgo,
            end: admin.firestore.Timestamp.now()
          },
          ...aggregatedStats,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        aggregatedCount++;
      }

      if (aggregatedCount > 0) {
        await batch.commit();
        console.log(`Aggregated performance stats for ${aggregatedCount} streams`);
      }

      return { aggregated: aggregatedCount };

    } catch (error) {
      console.error('Error aggregating performance stats:', error);
      throw error;
    }
  });

/**
 * Clean up old performance data
 */
export const cleanupPerformanceData = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      );

      // Clean up old performance metrics (keep for 7 days)
      const oldMetricsQuery = await db.collection('performanceMetrics')
        .where('timestamp', '<', sevenDaysAgo)
        .limit(500)
        .get();

      const batch = db.batch();
      oldMetricsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Clean up resolved alerts older than 30 days
      const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      );

      const oldAlertsQuery = await db.collection('performanceAlerts')
        .where('resolvedAt', '<', thirtyDaysAgo)
        .limit(500)
        .get();

      oldAlertsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`Cleaned up ${oldMetricsQuery.size + oldAlertsQuery.size} old performance records`);

      return {
        deletedMetrics: oldMetricsQuery.size,
        deletedAlerts: oldAlertsQuery.size
      };

    } catch (error) {
      console.error('Error cleaning up performance data:', error);
      throw error;
    }
  });

/**
 * Generate quality report from metrics
 */
async function generateQualityReport(
  streamId: string,
  hostId: string,
  metrics: any[],
  start: admin.firestore.Timestamp,
  end: admin.firestore.Timestamp
): Promise<any> {
  try {
    // Calculate aggregate metrics
    const totalMetrics = metrics.length;
    const avgLatency = metrics.reduce((sum, m) => sum + (m.latency || 0), 0) / totalMetrics;
    const avgJitter = metrics.reduce((sum, m) => sum + (m.jitter || 0), 0) / totalMetrics;
    const avgPacketLoss = metrics.reduce((sum, m) => sum + (m.packetLoss || 0), 0) / totalMetrics;

    // Quality distribution
    const qualityDistribution = metrics.reduce((acc, m) => {
      const quality = m.connectionQuality || 'unknown';
      acc[quality] = (acc[quality] || 0) + 1;
      return acc;
    }, {});

    // Convert counts to percentages
    Object.keys(qualityDistribution).forEach(key => {
      qualityDistribution[key] = Math.round((qualityDistribution[key] / totalMetrics) * 100);
    });

    // Calculate average connection quality score
    const qualityScores = { excellent: 4, good: 3, fair: 2, poor: 1 };
    const avgConnectionQuality = metrics.reduce((sum, m) => {
      return sum + (qualityScores[m.connectionQuality as keyof typeof qualityScores] || 0);
    }, 0) / totalMetrics;

    // Detect major issues
    const majorIssues = detectMajorIssues(metrics);

    // Generate recommendations
    const recommendations = generateRecommendations(avgLatency, avgJitter, avgPacketLoss, qualityDistribution);

    return {
      streamId,
      hostId,
      reportPeriod: { start, end },
      averageLatency: Math.round(avgLatency),
      averageJitter: Math.round(avgJitter),
      averagePacketLoss: Math.round(avgPacketLoss * 100) / 100,
      averageConnectionQuality: Math.round(avgConnectionQuality * 100) / 100,
      qualityDistribution,
      majorIssues,
      recommendations,
      totalSamples: totalMetrics,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

  } catch (error) {
    console.error('Error generating quality report:', error);
    throw error;
  }
}

/**
 * Analyze performance patterns for alerts
 */
async function analyzePerformancePatterns(metrics: any[]): Promise<any[]> {
  const alerts: any[] = [];

  // Group metrics by stream and user
  const streamMetrics = new Map<string, any[]>();
  metrics.forEach(metric => {
    if (metric.streamId) {
      if (!streamMetrics.has(metric.streamId)) {
        streamMetrics.set(metric.streamId, []);
      }
      streamMetrics.get(metric.streamId)!.push(metric);
    }
  });

  // Analyze each stream
  for (const [streamId, streamMetricsList] of streamMetrics) {
    // Check for widespread latency issues
    const highLatencyCount = streamMetricsList.filter(m => m.latency > 200).length;
    const latencyPercentage = (highLatencyCount / streamMetricsList.length) * 100;

    if (latencyPercentage > 50) {
      alerts.push({
        type: 'quality_degradation',
        severity: 'critical',
        streamId,
        message: `${latencyPercentage.toFixed(1)}% of users experiencing high latency`,
        metrics: {
          affectedUsers: highLatencyCount,
          totalUsers: streamMetricsList.length,
          averageLatency: streamMetricsList.reduce((sum, m) => sum + m.latency, 0) / streamMetricsList.length
        },
        acknowledged: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Check for connection drops
    const highPacketLossCount = streamMetricsList.filter(m => m.packetLoss > 5).length;
    const packetLossPercentage = (highPacketLossCount / streamMetricsList.length) * 100;

    if (packetLossPercentage > 30) {
      alerts.push({
        type: 'connection_drop',
        severity: 'warning',
        streamId,
        message: `${packetLossPercentage.toFixed(1)}% of users experiencing packet loss`,
        metrics: {
          affectedUsers: highPacketLossCount,
          totalUsers: streamMetricsList.length
        },
        acknowledged: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }

  return alerts;
}

/**
 * Calculate aggregated statistics
 */
function calculateAggregatedStats(metrics: any[]): any {
  const totalMetrics = metrics.length;
  
  if (totalMetrics === 0) {
    return {};
  }

  return {
    totalSamples: totalMetrics,
    averageLatency: Math.round(metrics.reduce((sum, m) => sum + (m.latency || 0), 0) / totalMetrics),
    averageJitter: Math.round(metrics.reduce((sum, m) => sum + (m.jitter || 0), 0) / totalMetrics),
    averagePacketLoss: Math.round((metrics.reduce((sum, m) => sum + (m.packetLoss || 0), 0) / totalMetrics) * 100) / 100,
    averageCpuUsage: Math.round(metrics.reduce((sum, m) => sum + (m.cpuUsage || 0), 0) / totalMetrics),
    averageMemoryUsage: Math.round(metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / totalMetrics),
    qualityDistribution: metrics.reduce((acc, m) => {
      const quality = m.connectionQuality || 'unknown';
      acc[quality] = (acc[quality] || 0) + 1;
      return acc;
    }, {}),
    issueCount: {
      bufferingEvents: metrics.reduce((sum, m) => sum + (m.bufferingEvents || 0), 0),
      reconnectionAttempts: metrics.reduce((sum, m) => sum + (m.reconnectionAttempts || 0), 0),
      errorCount: metrics.reduce((sum, m) => sum + (m.errorCount || 0), 0)
    }
  };
}

/**
 * Detect major issues from metrics
 */
function detectMajorIssues(metrics: any[]): any[] {
  const issues: any[] = [];

  // Check for consistent high latency
  const highLatencyMetrics = metrics.filter(m => m.latency > 300);
  if (highLatencyMetrics.length > metrics.length * 0.3) {
    issues.push({
      type: 'high_latency',
      severity: 'high',
      description: 'Consistently high latency detected',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      affectedUsers: highLatencyMetrics.length
    });
  }

  // Check for packet loss issues
  const packetLossMetrics = metrics.filter(m => m.packetLoss > 5);
  if (packetLossMetrics.length > metrics.length * 0.2) {
    issues.push({
      type: 'packet_loss',
      severity: 'medium',
      description: 'Significant packet loss detected',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      affectedUsers: packetLossMetrics.length
    });
  }

  return issues;
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(
  avgLatency: number,
  avgJitter: number,
  avgPacketLoss: number,
  qualityDistribution: any
): any[] {
  const recommendations: any[] = [];

  // Latency recommendations
  if (avgLatency > 200) {
    recommendations.push({
      category: 'network',
      priority: 'high',
      description: 'Consider using a CDN or edge servers to reduce latency',
      impact: 'Could reduce average latency by 30-50%'
    });
  }

  // Packet loss recommendations
  if (avgPacketLoss > 3) {
    recommendations.push({
      category: 'infrastructure',
      priority: 'medium',
      description: 'Investigate network infrastructure for packet loss issues',
      impact: 'Could improve connection stability for affected users'
    });
  }

  // Quality distribution recommendations
  const poorQualityPercentage = qualityDistribution.poor || 0;
  if (poorQualityPercentage > 20) {
    recommendations.push({
      category: 'settings',
      priority: 'medium',
      description: 'Consider implementing adaptive bitrate streaming',
      impact: 'Could improve experience for users with poor connections'
    });
  }

  return recommendations;
}
