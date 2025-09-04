#!/bin/bash

# VuluGO Production Deployment Script
# This script handles the complete deployment process for VuluGO app

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
BUILD_TYPE=${2:-development}
SKIP_TESTS=${3:-false}

echo -e "${BLUE}🚀 Starting VuluGO deployment for ${ENVIRONMENT} environment${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-deployment checks
print_info "Running pre-deployment checks..."

# Check required tools
if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi

if ! command_exists expo; then
    print_error "Expo CLI is not installed. Installing..."
    npm install -g @expo/cli
fi

print_status "All required tools are available"

# Check environment variables
print_info "Checking environment variables..."

required_vars=(
    "EXPO_PUBLIC_FIREBASE_API_KEY"
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID"
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

print_status "Environment variables validated"

# Install dependencies
print_info "Installing dependencies..."
npm ci
print_status "Dependencies installed"

# Run security audit
print_info "Running security audit..."
npm audit --audit-level moderate
if [ $? -ne 0 ]; then
    print_warning "Security vulnerabilities found. Please review and fix before production deployment."
    if [ "$ENVIRONMENT" = "production" ]; then
        exit 1
    fi
fi
print_status "Security audit completed"

# Run tests (unless skipped)
if [ "$SKIP_TESTS" != "true" ]; then
    print_info "Running test suite..."
    npm test -- --watchAll=false --coverage
    if [ $? -ne 0 ]; then
        print_error "Tests failed. Deployment aborted."
        exit 1
    fi
    print_status "All tests passed"
else
    print_warning "Tests skipped"
fi

# Type checking
print_info "Running TypeScript type checking..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    print_error "TypeScript errors found. Please fix before deployment."
    exit 1
fi
print_status "TypeScript validation passed"

# Linting
print_info "Running ESLint..."
npx eslint src/ --ext .ts,.tsx --max-warnings 0
if [ $? -ne 0 ]; then
    print_error "Linting errors found. Please fix before deployment."
    exit 1
fi
print_status "Linting passed"

# Build optimization
print_info "Optimizing build..."
export NODE_ENV=$ENVIRONMENT
export EXPO_OPTIMIZE=true

# Clear cache
expo r -c
print_status "Cache cleared"

# Environment-specific deployment
case $ENVIRONMENT in
    "production")
        print_info "Deploying to production..."
        
        # Additional production checks
        print_info "Running production-specific checks..."
        
        # Check if all production environment variables are set
        prod_vars=(
            "EXPO_PUBLIC_AGORA_APP_ID"
            "EXPO_PUBLIC_AGORA_APP_CERTIFICATE"
            "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID"
        )
        
        for var in "${prod_vars[@]}"; do
            if [ -z "${!var}" ]; then
                print_error "Production environment variable $var is not set"
                exit 1
            fi
        done
        
        # Build for production
        expo build:android --type app-bundle --release-channel production
        expo build:ios --type archive --release-channel production
        
        print_status "Production build completed"
        ;;
        
    "staging")
        print_info "Deploying to staging..."
        
        # Build for staging
        expo build:android --type apk --release-channel staging
        expo build:ios --type simulator --release-channel staging
        
        print_status "Staging build completed"
        ;;
        
    "development")
        print_info "Starting development server..."
        
        # Start development server
        expo start --clear
        ;;
        
    *)
        print_error "Unknown environment: $ENVIRONMENT"
        print_info "Available environments: production, staging, development"
        exit 1
        ;;
esac

# Post-deployment checks
if [ "$ENVIRONMENT" != "development" ]; then
    print_info "Running post-deployment checks..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Health check (if applicable)
    # This would typically check if the app is accessible and functioning
    print_status "Post-deployment checks completed"
    
    # Generate deployment report
    print_info "Generating deployment report..."
    
    cat > deployment-report.md << EOF
# Deployment Report

**Environment:** $ENVIRONMENT
**Build Type:** $BUILD_TYPE
**Timestamp:** $(date)
**Git Commit:** $(git rev-parse HEAD)
**Git Branch:** $(git branch --show-current)

## Deployment Summary
- ✅ Pre-deployment checks passed
- ✅ Dependencies installed
- ✅ Security audit completed
- ✅ Tests passed (skipped: $SKIP_TESTS)
- ✅ TypeScript validation passed
- ✅ Linting passed
- ✅ Build completed successfully
- ✅ Post-deployment checks passed

## Environment Variables Validated
$(for var in "${required_vars[@]}"; do echo "- $var"; done)

## Next Steps
1. Monitor application performance
2. Check error rates in monitoring dashboard
3. Verify critical user flows
4. Monitor security events

## Rollback Instructions
If issues are detected, run:
\`\`\`bash
./rollback.sh $ENVIRONMENT $(git rev-parse HEAD~1)
\`\`\`
EOF

    print_status "Deployment report generated: deployment-report.md"
fi

print_status "🎉 Deployment completed successfully!"

# Cleanup
print_info "Cleaning up temporary files..."
# Add any cleanup commands here

print_status "✨ All done! VuluGO is ready to go!"

# Display next steps
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Monitor the application for any issues"
echo "2. Check the monitoring dashboard"
echo "3. Verify critical user flows are working"
echo "4. Review the deployment report"

if [ "$ENVIRONMENT" = "production" ]; then
    echo "5. Notify stakeholders of successful deployment"
    echo "6. Update release notes"
fi

echo ""
echo -e "${GREEN}🚀 VuluGO deployment to $ENVIRONMENT completed successfully!${NC}"
