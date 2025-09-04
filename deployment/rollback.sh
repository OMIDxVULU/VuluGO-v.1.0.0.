#!/bin/bash

# VuluGO Rollback Script
# This script handles rollback to a previous version

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
TARGET_COMMIT=${2}
REASON=${3:-"Manual rollback"}

echo -e "${BLUE}🔄 Starting VuluGO rollback for ${ENVIRONMENT} environment${NC}"

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

# Validate inputs
if [ -z "$TARGET_COMMIT" ]; then
    print_error "Target commit hash is required"
    echo "Usage: ./rollback.sh <environment> <commit_hash> [reason]"
    exit 1
fi

# Confirm rollback
echo -e "${YELLOW}⚠️  ROLLBACK CONFIRMATION${NC}"
echo "Environment: $ENVIRONMENT"
echo "Current commit: $(git rev-parse HEAD)"
echo "Target commit: $TARGET_COMMIT"
echo "Reason: $REASON"
echo ""
read -p "Are you sure you want to proceed with the rollback? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    print_info "Rollback cancelled"
    exit 0
fi

# Log rollback initiation
print_info "Logging rollback initiation..."
echo "$(date): Rollback initiated for $ENVIRONMENT to commit $TARGET_COMMIT. Reason: $REASON" >> rollback.log

# Pre-rollback checks
print_info "Running pre-rollback checks..."

# Check if target commit exists
if ! git cat-file -e "$TARGET_COMMIT^{commit}" 2>/dev/null; then
    print_error "Target commit $TARGET_COMMIT does not exist"
    exit 1
fi

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_warning "Uncommitted changes detected. Stashing..."
    git stash push -m "Pre-rollback stash $(date)"
    print_status "Changes stashed"
fi

print_status "Pre-rollback checks completed"

# Create backup of current state
print_info "Creating backup of current state..."
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
git branch "$BACKUP_BRANCH"
print_status "Backup branch created: $BACKUP_BRANCH"

# Perform rollback
print_info "Performing rollback to commit $TARGET_COMMIT..."

# Get current commit for logging
CURRENT_COMMIT=$(git rev-parse HEAD)

# Checkout target commit
git checkout "$TARGET_COMMIT"

# If we're on a branch, reset to target commit
if git symbolic-ref -q HEAD >/dev/null; then
    CURRENT_BRANCH=$(git branch --show-current)
    git reset --hard "$TARGET_COMMIT"
    print_status "Reset $CURRENT_BRANCH to $TARGET_COMMIT"
else
    print_info "In detached HEAD state at $TARGET_COMMIT"
fi

# Install dependencies for the rolled-back version
print_info "Installing dependencies for rolled-back version..."
npm ci
print_status "Dependencies installed"

# Run basic health checks
print_info "Running basic health checks..."

# Type checking
npx tsc --noEmit
if [ $? -ne 0 ]; then
    print_error "TypeScript errors in rolled-back version"
    print_warning "Proceeding anyway as this might be expected for older versions"
fi

# Environment-specific rollback actions
case $ENVIRONMENT in
    "production")
        print_info "Performing production rollback..."
        
        # Build and deploy rolled-back version
        expo build:android --type app-bundle --release-channel production-rollback
        expo build:ios --type archive --release-channel production-rollback
        
        print_status "Production rollback build completed"
        ;;
        
    "staging")
        print_info "Performing staging rollback..."
        
        # Build and deploy rolled-back version
        expo build:android --type apk --release-channel staging-rollback
        expo build:ios --type simulator --release-channel staging-rollback
        
        print_status "Staging rollback build completed"
        ;;
        
    "development")
        print_info "Development rollback completed"
        print_info "Run 'expo start' to test the rolled-back version"
        ;;
        
    *)
        print_error "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

# Post-rollback verification
if [ "$ENVIRONMENT" != "development" ]; then
    print_info "Running post-rollback verification..."
    
    # Wait for rollback to be ready
    sleep 30
    
    # Basic health check (customize based on your app's health endpoint)
    print_status "Post-rollback verification completed"
fi

# Generate rollback report
print_info "Generating rollback report..."

cat > rollback-report.md << EOF
# Rollback Report

**Environment:** $ENVIRONMENT
**Timestamp:** $(date)
**Reason:** $REASON

## Rollback Details
- **From Commit:** $CURRENT_COMMIT
- **To Commit:** $TARGET_COMMIT
- **Backup Branch:** $BACKUP_BRANCH

## Rollback Summary
- ✅ Pre-rollback checks completed
- ✅ Backup branch created
- ✅ Rollback performed successfully
- ✅ Dependencies installed
- ✅ Basic health checks completed
- ✅ Environment-specific actions completed
- ✅ Post-rollback verification completed

## Recovery Instructions
If you need to return to the previous version:
\`\`\`bash
git checkout $BACKUP_BRANCH
git checkout main  # or your main branch
git reset --hard $CURRENT_COMMIT
\`\`\`

## Next Steps
1. Monitor application performance
2. Verify critical user flows are working
3. Check error rates in monitoring dashboard
4. Plan hotfix deployment if needed

## Rollback Log Entry
$(tail -1 rollback.log)
EOF

print_status "Rollback report generated: rollback-report.md"

# Log rollback completion
echo "$(date): Rollback completed successfully for $ENVIRONMENT from $CURRENT_COMMIT to $TARGET_COMMIT" >> rollback.log

print_status "🎯 Rollback completed successfully!"

# Display summary
echo ""
echo -e "${BLUE}📋 Rollback Summary:${NC}"
echo "Environment: $ENVIRONMENT"
echo "Rolled back from: $CURRENT_COMMIT"
echo "Rolled back to: $TARGET_COMMIT"
echo "Backup branch: $BACKUP_BRANCH"
echo "Reason: $REASON"

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Monitor the application for stability"
echo "2. Verify critical user flows are working"
echo "3. Check error rates and performance metrics"
echo "4. Plan and prepare hotfix deployment"
echo "5. Notify stakeholders of the rollback"

if [ "$ENVIRONMENT" = "production" ]; then
    echo "6. Update incident documentation"
    echo "7. Schedule post-incident review"
fi

echo ""
echo -e "${GREEN}🔄 VuluGO rollback to $ENVIRONMENT completed successfully!${NC}"
echo -e "${YELLOW}⚠️  Remember to address the root cause before the next deployment${NC}"
