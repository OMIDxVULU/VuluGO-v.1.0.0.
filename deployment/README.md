# VuluGO Deployment Guide

This guide covers the complete deployment process for the VuluGO React Native application, including staging and production environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Process](#deployment-process)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Alerts](#monitoring--alerts)
- [Rollback Procedures](#rollback-procedures)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### Required Tools
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Git
- Docker (optional, for containerized deployments)

### Required Accounts & Services
- Firebase project (staging and production)
- Agora.io account for live streaming
- Twilio account for SMS services
- Google Cloud Platform (for various services)
- Apple Developer Account (for iOS deployment)
- Google Play Console (for Android deployment)

### Environment Variables
Ensure all required environment variables are set for each environment:
- See `environments/.env.staging` for staging configuration
- See `environments/.env.production` for production configuration

## 🌍 Environment Setup

### Development Environment
```bash
# Clone the repository
git clone <repository-url>
cd VuluGO-v.1.0.0

# Install dependencies
npm install

# Start development server
npm start
```

### Staging Environment
```bash
# Load staging environment variables
cp environments/.env.staging .env

# Deploy to staging
./deployment/deploy.sh staging
```

### Production Environment
```bash
# Load production environment variables
cp environments/.env.production .env

# Deploy to production
./deployment/deploy.sh production
```

## 🚀 Deployment Process

### Manual Deployment

#### 1. Pre-deployment Checklist
- [ ] All tests pass (`npm test`)
- [ ] Code quality checks pass (`npm run lint`)
- [ ] Security audit passes (`npm audit`)
- [ ] Environment variables are configured
- [ ] Firebase security rules are updated
- [ ] Database migrations are ready (if applicable)

#### 2. Build Process
```bash
# For staging
expo build:android --type apk --release-channel staging
expo build:ios --type simulator --release-channel staging

# For production
expo build:android --type app-bundle --release-channel production
expo build:ios --type archive --release-channel production
```

#### 3. Deployment Scripts
Use the provided deployment scripts for automated deployment:

```bash
# Deploy to staging
./deployment/deploy.sh staging

# Deploy to production
./deployment/deploy.sh production

# Deploy with custom options
./deployment/deploy.sh production development true  # Skip tests
```

### Automated Deployment (CI/CD)

The project includes GitHub Actions workflows for automated deployment:

- **Staging**: Automatically deploys when code is pushed to `staging` branch
- **Production**: Automatically deploys when a release is published

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### 1. Code Quality & Testing (`quality-check`)
- TypeScript compilation check
- ESLint linting
- Unit tests with coverage
- Security audit
- Vulnerability scanning

#### 2. Security Scan (`security-scan`)
- Trivy vulnerability scanner
- SARIF report generation
- Security issue tracking

#### 3. Build Process (`build-staging`, `build-production`)
- Environment-specific builds
- Artifact generation
- Build optimization

#### 4. Deployment (`deploy-staging`, `deploy-production`)
- Automated deployment to respective environments
- Post-deployment testing
- Team notifications

#### 5. Performance Monitoring (`performance-check`)
- Performance testing
- Metrics collection
- Report generation

### Pipeline Configuration

The CI/CD pipeline is configured in `.github/workflows/ci-cd.yml` and includes:

- **Triggers**: Push to main branches, pull requests, releases
- **Environments**: Development, staging, production
- **Security**: Secret management, environment protection
- **Notifications**: Slack integration for deployment status

## 📊 Monitoring & Alerts

### Application Monitoring

The app includes comprehensive monitoring through the `MonitoringService`:

```typescript
import { monitoringService } from '../services/monitoringService';

// Initialize monitoring
await monitoringService.initialize();

// Record custom metrics
monitoringService.recordMetric({
  name: 'user_action',
  value: 1,
  timestamp: Date.now(),
  tags: { action: 'login', success: 'true' }
});
```

### Available Metrics
- HTTP request duration and count
- Error rates and types
- Memory usage
- Security events
- User engagement metrics

### Alert Rules
Default alert rules are configured for:
- High error rates (>10 errors in 5 minutes)
- Slow response times (>5 seconds for 2 minutes)
- Low security scores (<70)
- High memory usage (>100MB for 5 minutes)

### Monitoring Dashboard
Access monitoring data through:
```typescript
// Get active alerts
const alerts = monitoringService.getActiveAlerts();

// Generate monitoring report
const report = monitoringService.generateMonitoringReport();
```

## 🔙 Rollback Procedures

### Automatic Rollback Triggers
- Critical security vulnerabilities detected
- Error rate exceeds 25% for 10 minutes
- Application becomes unresponsive
- Data corruption detected

### Manual Rollback Process

#### 1. Identify Target Version
```bash
# List recent commits
git log --oneline -10

# Identify stable commit hash
TARGET_COMMIT="abc123def456"
```

#### 2. Execute Rollback
```bash
# Rollback to specific commit
./deployment/rollback.sh production $TARGET_COMMIT "Critical bug fix"

# Rollback with reason
./deployment/rollback.sh staging abc123def456 "Performance issues"
```

#### 3. Post-Rollback Verification
- [ ] Application starts successfully
- [ ] Critical user flows work
- [ ] Error rates return to normal
- [ ] Performance metrics are stable

### Rollback via CI/CD
Use the GitHub Actions workflow dispatch to trigger automated rollback:
1. Go to Actions tab in GitHub
2. Select "VuluGO CI/CD Pipeline"
3. Click "Run workflow"
4. Select "rollback" job
5. Provide target commit hash

## 🔒 Security Considerations

### Pre-deployment Security Checks
- [ ] All dependencies are up to date
- [ ] No known vulnerabilities in dependencies
- [ ] Security audit passes
- [ ] Environment variables are properly secured
- [ ] API keys are rotated if compromised
- [ ] Firebase security rules are restrictive

### Production Security Measures
- Rate limiting enabled
- DDoS protection active
- Content filtering operational
- Security monitoring running
- Audit logging enabled
- Data encryption at rest and in transit

### Security Monitoring
The app includes automated security monitoring:
- Real-time threat detection
- Suspicious activity alerts
- Security score tracking
- Compliance monitoring (GDPR, COPPA, etc.)

## 🐛 Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Clear cache and rebuild
expo r -c
npm ci
expo build:android --clear
```

#### Environment Variable Issues
```bash
# Verify environment variables
echo $EXPO_PUBLIC_FIREBASE_API_KEY
env | grep EXPO_PUBLIC
```

#### Firebase Connection Issues
```bash
# Test Firebase connection
npx firebase projects:list
npx firebase use <project-id>
```

#### Agora SDK Issues
```bash
# Verify Agora configuration
echo $EXPO_PUBLIC_AGORA_APP_ID
# Check Agora console for project status
```

### Deployment Logs
Check deployment logs for detailed error information:
```bash
# View deployment logs
tail -f deployment.log

# View rollback logs
tail -f rollback.log
```

### Support Contacts
- **Technical Issues**: tech-support@vulugo.com
- **Security Issues**: security@vulugo.com
- **Emergency Rollback**: emergency@vulugo.com

## 📚 Additional Resources

- [Expo Deployment Guide](https://docs.expo.dev/distribution/introduction/)
- [Firebase Deployment](https://firebase.google.com/docs/hosting/deploying)
- [Agora SDK Documentation](https://docs.agora.io/en/)
- [React Native Performance](https://reactnative.dev/docs/performance)

## 🔄 Deployment Checklist

### Pre-deployment
- [ ] Code review completed
- [ ] All tests pass
- [ ] Security audit clean
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Third-party services configured
- [ ] Monitoring alerts configured

### During Deployment
- [ ] Deployment script executed successfully
- [ ] Build artifacts generated
- [ ] Services deployed to target environment
- [ ] Health checks pass
- [ ] Smoke tests complete

### Post-deployment
- [ ] Application accessible
- [ ] Critical user flows tested
- [ ] Error rates monitored
- [ ] Performance metrics reviewed
- [ ] Security alerts checked
- [ ] Team notified of deployment
- [ ] Documentation updated

---

For questions or issues with deployment, please refer to the troubleshooting section or contact the development team.
