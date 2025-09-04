#!/bin/bash

echo "🚨 CRITICAL: Firebase Deployment Script"
echo "========================================="
echo ""
echo "This script will help you deploy the Firebase security rules and indexes"
echo "that are required for the live stream prevention system to function."
echo ""

# Check if Firebase CLI is available
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Firebase CLI requires Node.js 20+"
    echo ""
    echo "Please update Node.js:"
    echo "1. Install nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "2. Restart terminal or run: source ~/.bashrc"
    echo "3. Install Node 20: nvm install 20 && nvm use 20"
    echo "4. Run this script again"
    echo ""
    echo "OR use the manual method below:"
    echo ""
fi

echo "📋 MANUAL DEPLOYMENT INSTRUCTIONS"
echo "=================================="
echo ""
echo "Since automated deployment may not work, here's how to deploy manually:"
echo ""
echo "1. 🔐 DEPLOY SECURITY RULES:"
echo "   - Go to: https://console.firebase.google.com"
echo "   - Select your 'vulugo' project"
echo "   - Navigate to: Firestore Database → Rules"
echo "   - Copy ALL content from the 'firestore.rules' file in this directory"
echo "   - Paste it in the Firebase Console editor"
echo "   - Click 'Publish'"
echo ""
echo "2. 📊 DEPLOY INDEXES:"
echo "   - In Firebase Console, go to: Firestore Database → Indexes"
echo "   - Create these composite indexes:"
echo ""
echo "   Index 1:"
echo "   - Collection: streams"
echo "   - Field 1: isActive (Ascending)"
echo "   - Field 2: startedAt (Ascending)"
echo ""
echo "   Index 2:"
echo "   - Collection: streams"
echo "   - Field 1: isActive (Ascending)"
echo "   - Field 2: endedAt (Ascending)"
echo ""
echo "   Index 3:"
echo "   - Collection: streams"
echo "   - Field 1: isActive (Ascending)"
echo "   - Field 2: lastActivity (Ascending)"
echo ""
echo "3. 🔄 RESTART THE APP:"
echo "   - Stop the React Native app"
echo "   - Start it again with: npm start"
echo "   - Test that permission errors are gone"
echo ""

# Try automated deployment if Node.js version is sufficient
if [ "$NODE_VERSION" -ge 20 ]; then
    echo "✅ Node.js version is sufficient. Attempting automated deployment..."
    echo ""
    
    # Check if user is logged in to Firebase
    if ! firebase projects:list &> /dev/null; then
        echo "🔐 Please log in to Firebase:"
        firebase login
    fi
    
    echo "🚀 Deploying security rules..."
    if firebase deploy --only firestore:rules; then
        echo "✅ Security rules deployed successfully!"
    else
        echo "❌ Failed to deploy security rules. Use manual method above."
    fi
    
    echo ""
    echo "🚀 Deploying indexes..."
    if firebase deploy --only firestore:indexes; then
        echo "✅ Indexes deployed successfully!"
    else
        echo "❌ Failed to deploy indexes. Use manual method above."
    fi
    
else
    echo "⚠️  Automated deployment skipped due to Node.js version."
fi

echo ""
echo "🎯 VERIFICATION STEPS:"
echo "====================="
echo ""
echo "After deployment, check the React Native logs for:"
echo ""
echo "✅ SUCCESS INDICATORS:"
echo "   LOG  ✅ Successfully set active stream for user [userId]"
echo "   LOG  ✅ Firebase permissions verified for activeStream access"
echo "   LOG  ✅ Cleanup cycle completed without errors"
echo ""
echo "❌ FAILURE INDICATORS:"
echo "   ERROR ❌ Error getting active stream: [FirebaseError: Missing or insufficient permissions]"
echo "   ERROR ❌ Error cleaning stale streams: [FirebaseError: The query requires an index]"
echo ""
echo "If you still see errors after deployment, please:"
echo "1. Wait 2-3 minutes for Firebase to propagate changes"
echo "2. Restart the React Native app completely"
echo "3. Check that you deployed to the correct Firebase project"
echo ""
echo "🆘 NEED HELP?"
echo "============="
echo "If deployment fails or you need assistance:"
echo "1. Take a screenshot of any error messages"
echo "2. Check the Firebase Console for your project"
echo "3. Verify you have admin access to the Firebase project"
echo ""

echo "Done! 🎉"
