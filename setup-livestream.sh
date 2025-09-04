#!/bin/bash

# VuluGO LiveStream Setup Script
# Automates the transition from mock to real Agora streaming

set -e

echo "🎥 VuluGO LiveStream Setup - Mock to Production"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${RED}❌ EAS CLI not found. Install with: npm install -g @expo/eas-cli${NC}"
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found. Install with: npm install -g firebase-tools${NC}"
    exit 1
fi

# Check if logged into EAS
if ! eas whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged into EAS. Run: eas login${NC}"
    exit 1
fi

# Check if logged into Firebase
if ! firebase projects:list &> /dev/null; then
    echo -e "${RED}❌ Not logged into Firebase. Run: firebase login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"

# Get Agora credentials
echo -e "${BLUE}🔑 Agora Credentials Setup${NC}"
echo "Please provide your Agora credentials from https://console.agora.io/"

read -p "Enter your Agora App ID: " AGORA_APP_ID
read -p "Enter your Agora App Certificate: " AGORA_APP_CERTIFICATE

if [ -z "$AGORA_APP_ID" ] || [ -z "$AGORA_APP_CERTIFICATE" ]; then
    echo -e "${RED}❌ Agora credentials are required${NC}"
    exit 1
fi

# Set EAS secrets
echo -e "${BLUE}🔧 Setting EAS secrets...${NC}"
eas secret:create --name EXPO_PUBLIC_AGORA_APP_ID --value "$AGORA_APP_ID" --force
eas secret:create --name EXPO_PUBLIC_AGORA_APP_CERTIFICATE --value "$AGORA_APP_CERTIFICATE" --force
echo -e "${GREEN}✅ EAS secrets configured${NC}"

# Set Firebase Functions config
echo -e "${BLUE}🔥 Configuring Firebase Functions...${NC}"
firebase functions:config:set agora.app_id="$AGORA_APP_ID" agora.app_certificate="$AGORA_APP_CERTIFICATE"
echo -e "${GREEN}✅ Firebase Functions configured${NC}"

# Deploy Firebase Functions
echo -e "${BLUE}🚀 Deploying Firebase Functions...${NC}"
if firebase deploy --only functions; then
    echo -e "${GREEN}✅ Firebase Functions deployed successfully${NC}"
else
    echo -e "${RED}❌ Failed to deploy Firebase Functions${NC}"
    exit 1
fi

# Deploy Firestore rules
echo -e "${BLUE}📜 Deploying Firestore security rules...${NC}"
if firebase deploy --only firestore:rules; then
    echo -e "${GREEN}✅ Firestore rules deployed successfully${NC}"
else
    echo -e "${RED}❌ Failed to deploy Firestore rules${NC}"
    exit 1
fi

# Build development clients
echo -e "${BLUE}📱 Building development clients...${NC}"
echo "This will build for both iOS and Android platforms."
read -p "Continue with EAS build? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🔨 Starting EAS build (this may take 10-15 minutes)...${NC}"
    if eas build --profile development --platform all --non-interactive; then
        echo -e "${GREEN}✅ Development builds completed${NC}"
        echo -e "${YELLOW}📲 Install the builds on your devices, then run: npx expo start --dev-client${NC}"
    else
        echo -e "${RED}❌ EAS build failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Skipping EAS build. Run manually: eas build --profile development --platform all${NC}"
fi

# Final instructions
echo -e "${GREEN}🎉 LiveStream setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Install the development builds on your physical devices"
echo "2. Run: npx expo start --dev-client"
echo "3. Test with two devices:"
echo "   - Create stream on Device A"
echo "   - Join stream on Device B"
echo "   - Verify real audio transmission"
echo ""
echo -e "${BLUE}Verification:${NC}"
echo "- Look for logs: '✅ Real Agora SDK imported successfully'"
echo "- Check Agora Console for usage minutes"
echo "- Confirm Firebase Functions logs show token generation"
echo ""
echo -e "${YELLOW}⚠️  Remember: Expo Go uses mock Agora. Always use dev builds for LiveStream testing.${NC}"
