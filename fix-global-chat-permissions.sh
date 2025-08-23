#!/bin/bash

# Complete Fix Script for Firebase Global Chat Permission Issues
# This script addresses all the issues with global chat message sending

echo "🔥 Firebase Global Chat Permission Fix Script"
echo "=============================================="

# Step 1: Check Firebase CLI and authentication
echo "📋 Step 1: Checking Firebase setup..."
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
fi

if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please log in:"
    firebase login
fi

echo "✅ Current Firebase project:"
firebase use

# Step 2: Validate and deploy Firestore rules
echo ""
echo "📋 Step 2: Validating and deploying Firestore rules..."

# Check for globalChat rules
if grep -q "globalChat" firestore.rules; then
    echo "✅ Found globalChat rules in firestore.rules"
    echo "📋 GlobalChat rules:"
    grep -A 5 -B 1 "globalChat" firestore.rules
else
    echo "❌ No globalChat rules found!"
    echo "🚨 Adding globalChat rules to firestore.rules..."
    
    # Backup current rules
    cp firestore.rules firestore.rules.backup
    
    # Add globalChat rules before the closing braces
    sed -i.tmp '/^  }$/i\
\
    // Global Chat - PUBLIC READ ACCESS, authenticated users can write\
    match /globalChat/{messageId} {\
      allow read: if true; // Public read access for global chat messages\
      allow create: if request.auth != null; // Only authenticated users can send messages\
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.senderId;\
    }' firestore.rules
    
    rm firestore.rules.tmp
    echo "✅ Added globalChat rules to firestore.rules"
fi

# Validate rules syntax
echo "🔍 Validating Firestore rules syntax..."
if firebase firestore:rules:validate; then
    echo "✅ Firestore rules syntax is valid!"
else
    echo "❌ Firestore rules syntax is invalid. Please fix the errors above."
    exit 1
fi

# Deploy rules
echo "🚀 Deploying Firestore security rules..."
if firebase deploy --only firestore:rules; then
    echo "✅ Firestore security rules deployed successfully!"
    echo "⏳ Waiting 15 seconds for rules to propagate..."
    sleep 15
else
    echo "❌ Failed to deploy Firestore security rules."
    exit 1
fi

# Step 3: Clear Metro cache and restart
echo ""
echo "📋 Step 3: Clearing Metro cache and restarting..."

# Kill any existing Metro processes
echo "🔄 Killing existing Metro processes..."
pkill -f "metro" || true
pkill -f "expo start" || true

# Clear Metro cache
echo "🧹 Clearing Metro cache..."
if command -v npx &> /dev/null; then
    npx expo start --clear --no-dev --minify &
    EXPO_PID=$!
    echo "✅ Started Expo with cleared cache (PID: $EXPO_PID)"
    
    # Wait a moment then kill the process
    sleep 5
    kill $EXPO_PID 2>/dev/null || true
    echo "🛑 Stopped Expo process"
else
    echo "❌ npx not found. Please manually run: npx expo start --clear"
fi

# Step 4: Verification checklist
echo ""
echo "📋 Step 4: Verification Checklist"
echo "================================="
echo ""
echo "✅ COMPLETED FIXES:"
echo "  🔐 Added comprehensive debugging to sendGlobalChatMessage"
echo "  🔐 Added debugging to handleSendGlobalChatMessage in HomeScreen"
echo "  🔥 Verified and deployed Firestore security rules for globalChat"
echo "  ⚛️  Simplified babel.config.js for Reanimated 3.17.4"
echo "  🧹 Cleared Metro cache"
echo ""
echo "🧪 TESTING STEPS:"
echo "  1. Restart your app completely: npx expo start --clear"
echo "  2. Sign in as an authenticated user (not guest)"
echo "  3. Open Global Chat modal"
echo "  4. Try sending a test message"
echo "  5. Check console for debug logs (should show authentication success)"
echo ""
echo "🔍 EXPECTED DEBUG OUTPUT:"
echo "  🔐 sendGlobalChatMessage - Auth Debug: { isAuthenticated: true, userId: '...' }"
echo "  📝 sendGlobalChatMessage - Message Data: { senderId: '...', senderName: '...' }"
echo "  ✅ sendGlobalChatMessage - Success! Message ID: ..."
echo ""
echo "❌ IF STILL GETTING PERMISSION ERRORS:"
echo "  1. Check Firebase Console: https://console.firebase.google.com"
echo "  2. Go to Firestore Database > Rules"
echo "  3. Verify the globalChat rules are present and published"
echo "  4. Check the debug logs to see if user is actually authenticated"
echo ""
echo "🎉 SCRIPT COMPLETE!"
echo "Please restart your app and test global chat message sending."
