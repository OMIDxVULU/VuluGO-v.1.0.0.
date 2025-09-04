import { getCurrentConfig } from '../../deployment/production-config';
import { SecurityAudit } from '../utils/securityAudit';

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  duration: number; // in milliseconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  metadata?: Record<string, any>;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: Map<string, MetricData[]> = new Map();
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private isInitialized = false;

  private constructor() {
    this.initializeDefaultAlertRules();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const config = getCurrentConfig();
    
    if (config.monitoringConfig.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }

    if (config.securityConfig.enableSecurityAudit) {
      this.startSecurityMonitoring();
    }

    this.startAlertProcessing();
    this.isInitialized = true;

    console.log('🔍 Monitoring service initialized');
  }

  // Record a metric
  recordMetric(metric: MetricData): void {
    const metricHistory = this.metrics.get(metric.name) || [];
    metricHistory.push(metric);

    // Keep only last 1000 data points per metric
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    this.metrics.set(metric.name, metricHistory);
    this.checkAlertRules(metric);
  }

  // Get metric history
  getMetricHistory(metricName: string, timeRange?: number): MetricData[] {
    const history = this.metrics.get(metricName) || [];
    
    if (!timeRange) return history;

    const cutoff = Date.now() - timeRange;
    return history.filter(metric => metric.timestamp >= cutoff);
  }

  // Performance monitoring
  private startPerformanceMonitoring(): void {
    // Monitor app startup time
    const startTime = Date.now();
    
    // Monitor memory usage (if available)
    if (typeof performance !== 'undefined' && performance.memory) {
      setInterval(() => {
        this.recordMetric({
          name: 'memory_usage',
          value: (performance.memory as any).usedJSHeapSize,
          timestamp: Date.now(),
          unit: 'bytes'
        });
      }, 30000); // Every 30 seconds
    }

    // Monitor network requests
    this.monitorNetworkRequests();

    // Monitor app lifecycle events
    this.monitorAppLifecycle();

    console.log('📊 Performance monitoring started');
  }

  private monitorNetworkRequests(): void {
    // This would typically integrate with your HTTP client
    // For now, we'll create a simple wrapper
    const originalFetch = global.fetch;
    
    global.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0] as string;
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        this.recordMetric({
          name: 'http_request_duration',
          value: duration,
          timestamp: Date.now(),
          tags: {
            url: url.split('?')[0], // Remove query params
            status: response.status.toString(),
            method: (args[1]?.method || 'GET').toUpperCase()
          },
          unit: 'milliseconds'
        });

        this.recordMetric({
          name: 'http_request_count',
          value: 1,
          timestamp: Date.now(),
          tags: {
            url: url.split('?')[0],
            status: response.status.toString(),
            method: (args[1]?.method || 'GET').toUpperCase()
          }
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.recordMetric({
          name: 'http_request_duration',
          value: duration,
          timestamp: Date.now(),
          tags: {
            url: url.split('?')[0],
            status: 'error',
            method: (args[1]?.method || 'GET').toUpperCase()
          },
          unit: 'milliseconds'
        });

        this.recordMetric({
          name: 'http_request_errors',
          value: 1,
          timestamp: Date.now(),
          tags: {
            url: url.split('?')[0],
            error: error instanceof Error ? error.name : 'unknown'
          }
        });

        throw error;
      }
    };
  }

  private monitorAppLifecycle(): void {
    // Monitor app state changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.recordMetric({
          name: 'app_visibility_change',
          value: document.hidden ? 0 : 1,
          timestamp: Date.now(),
          tags: {
            state: document.hidden ? 'hidden' : 'visible'
          }
        });
      });
    }
  }

  // Security monitoring
  private startSecurityMonitoring(): void {
    // Run security audit periodically
    const config = getCurrentConfig();
    
    setInterval(async () => {
      try {
        const auditResult = await SecurityAudit.getInstance().performComprehensiveAudit();
        
        this.recordMetric({
          name: 'security_score',
          value: auditResult.score,
          timestamp: Date.now(),
          unit: 'score'
        });

        this.recordMetric({
          name: 'security_issues',
          value: auditResult.issues.length,
          timestamp: Date.now(),
          tags: {
            critical: auditResult.issues.filter(i => i.severity === 'critical').length.toString(),
            high: auditResult.issues.filter(i => i.severity === 'high').length.toString(),
            medium: auditResult.issues.filter(i => i.severity === 'medium').length.toString(),
            low: auditResult.issues.filter(i => i.severity === 'low').length.toString(),
          }
        });

        // Create alerts for critical security issues
        auditResult.issues.forEach(issue => {
          if (issue.severity === 'critical' || issue.severity === 'high') {
            this.createAlert({
              id: `security-${Date.now()}-${Math.random()}`,
              ruleId: 'security-audit',
              message: `Security issue detected: ${issue.description}`,
              severity: issue.severity,
              timestamp: Date.now(),
              resolved: false,
              metadata: { issue }
            });
          }
        });

      } catch (error) {
        console.error('Security monitoring error:', error);
      }
    }, config.securityConfig.auditInterval);

    console.log('🔒 Security monitoring started');
  }

  // Alert management
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metric: 'http_request_errors',
        condition: 'greater_than',
        threshold: 10,
        duration: 5 * 60 * 1000, // 5 minutes
        severity: 'high',
        enabled: true
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        metric: 'http_request_duration',
        condition: 'greater_than',
        threshold: 5000, // 5 seconds
        duration: 2 * 60 * 1000, // 2 minutes
        severity: 'medium',
        enabled: true
      },
      {
        id: 'low-security-score',
        name: 'Low Security Score',
        metric: 'security_score',
        condition: 'less_than',
        threshold: 70,
        duration: 0, // Immediate
        severity: 'high',
        enabled: true
      },
      {
        id: 'memory-usage-high',
        name: 'High Memory Usage',
        metric: 'memory_usage',
        condition: 'greater_than',
        threshold: 100 * 1024 * 1024, // 100MB
        duration: 5 * 60 * 1000, // 5 minutes
        severity: 'medium',
        enabled: true
      }
    ];
  }

  private checkAlertRules(metric: MetricData): void {
    this.alertRules.forEach(rule => {
      if (!rule.enabled || rule.metric !== metric.name) return;

      const shouldAlert = this.evaluateAlertCondition(rule, metric);
      
      if (shouldAlert) {
        const existingAlert = this.alerts.find(
          alert => alert.ruleId === rule.id && !alert.resolved
        );

        if (!existingAlert) {
          this.createAlert({
            id: `${rule.id}-${Date.now()}`,
            ruleId: rule.id,
            message: `${rule.name}: ${metric.name} is ${metric.value} (threshold: ${rule.threshold})`,
            severity: rule.severity,
            timestamp: Date.now(),
            resolved: false,
            metadata: { metric, rule }
          });
        }
      }
    });
  }

  private evaluateAlertCondition(rule: AlertRule, metric: MetricData): boolean {
    switch (rule.condition) {
      case 'greater_than':
        return metric.value > rule.threshold;
      case 'less_than':
        return metric.value < rule.threshold;
      case 'equals':
        return metric.value === rule.threshold;
      case 'not_equals':
        return metric.value !== rule.threshold;
      default:
        return false;
    }
  }

  private createAlert(alert: Alert): void {
    this.alerts.push(alert);
    console.warn(`🚨 Alert: ${alert.message}`);
    
    // In a real implementation, you would send this to your alerting system
    // (e.g., PagerDuty, Slack, email, etc.)
  }

  private startAlertProcessing(): void {
    // Process alerts every minute
    setInterval(() => {
      this.processAlerts();
    }, 60 * 1000);
  }

  private processAlerts(): void {
    const unresolvedAlerts = this.alerts.filter(alert => !alert.resolved);
    
    // Auto-resolve alerts that are no longer triggering
    unresolvedAlerts.forEach(alert => {
      const rule = this.alertRules.find(r => r.id === alert.ruleId);
      if (!rule) return;

      const recentMetrics = this.getMetricHistory(rule.metric, rule.duration || 60000);
      const stillTriggering = recentMetrics.some(metric => 
        this.evaluateAlertCondition(rule, metric)
      );

      if (!stillTriggering) {
        alert.resolved = true;
        alert.resolvedAt = Date.now();
        console.log(`✅ Alert resolved: ${alert.message}`);
      }
    });
  }

  // Public API methods
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
    }
  }

  getMetrics(): Map<string, MetricData[]> {
    return new Map(this.metrics);
  }

  // Generate monitoring report
  generateMonitoringReport(): string {
    const activeAlerts = this.getActiveAlerts();
    const metrics = Array.from(this.metrics.keys());
    
    let report = `# Monitoring Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    report += `## Active Alerts (${activeAlerts.length})\n\n`;
    if (activeAlerts.length > 0) {
      activeAlerts.forEach(alert => {
        const severity = alert.severity.toUpperCase();
        const emoji = alert.severity === 'critical' ? '🔴' : 
                     alert.severity === 'high' ? '🟠' : 
                     alert.severity === 'medium' ? '🟡' : '🟢';
        report += `${emoji} **${severity}** - ${alert.message}\n`;
      });
    } else {
      report += `✅ No active alerts\n`;
    }
    
    report += `\n## Metrics Overview\n\n`;
    report += `Tracking ${metrics.length} metrics:\n`;
    metrics.forEach(metric => {
      const history = this.metrics.get(metric) || [];
      const latest = history[history.length - 1];
      if (latest) {
        report += `- **${metric}**: ${latest.value} ${latest.unit || ''}\n`;
      }
    });
    
    return report;
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();
