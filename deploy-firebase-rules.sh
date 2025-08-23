#!/bin/bash

# Firebase Security Rules Deployment Script
# This script helps deploy and verify Firebase security rules

echo "🔥 Firebase Security Rules Deployment Script"
echo "============================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "📦 Installing Firebase CLI..."

    # Try to install Firebase CLI
    if command -v npm &> /dev/null; then
        npm install -g firebase-tools
    else
        echo "❌ npm is not available. Please install Node.js and npm first."
        echo "🌐 Visit: https://nodejs.org/"
        exit 1
    fi
fi

# Check if user is logged in to Firebase
echo "🔐 Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase."
    echo "🔑 Please log in to Firebase:"
    firebase login
fi

# Show current project
echo "📋 Current Firebase project:"
firebase use

# Show current rules before deployment
echo "📜 Current firestore.rules content:"
echo "=================================="
cat firestore.rules
echo "=================================="

# Validate firestore.rules syntax
echo "✅ Validating firestore.rules syntax..."
if firebase firestore:rules:validate; then
    echo "✅ Firestore rules syntax is valid!"
else
    echo "❌ Firestore rules syntax is invalid. Please fix the errors above."
    exit 1
fi

# Check for globalChat rules specifically
echo "🔍 Checking for globalChat rules..."
if grep -q "globalChat" firestore.rules; then
    echo "✅ Found globalChat rules in firestore.rules"
    echo "📋 GlobalChat rules:"
    grep -A 5 -B 1 "globalChat" firestore.rules
else
    echo "❌ No globalChat rules found in firestore.rules!"
    echo "🚨 This is likely the cause of permission errors."
    exit 1
fi

# Deploy the rules
echo "🚀 Deploying Firestore security rules..."
if firebase deploy --only firestore:rules; then
    echo "✅ Firestore security rules deployed successfully!"

    echo "🎉 Deployment complete!"
    echo "💡 The new security rules are now active in your Firebase project."
    echo "🔍 You can verify them in the Firebase Console:"
    echo "   https://console.firebase.google.com/project/$(firebase use --current)/firestore/rules"

    # Wait a moment for rules to propagate
    echo "⏳ Waiting 10 seconds for rules to propagate..."
    sleep 10

else
    echo "❌ Failed to deploy Firestore security rules."
    echo "🔍 Please check the error messages above and try again."
    exit 1
fi

echo ""
echo "🧪 Testing Global Chat Access..."
echo "================================"
echo "The deployed rules should now allow:"
echo "✅ Public read access to globalChat collection (allow read: if true)"
echo "✅ Authenticated write access to globalChat collection (allow create: if request.auth != null)"
echo "✅ No permission-denied errors for authenticated users sending messages"
echo ""
echo "🔄 IMPORTANT: Please restart your app completely to ensure the new rules take effect."
echo "📱 Close the app and restart it, or run: npx expo start --clear"
