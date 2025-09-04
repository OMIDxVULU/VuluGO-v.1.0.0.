#!/bin/bash

# Firebase Rules Manual Deployment Helper
# This script helps deploy Firebase rules when CLI is not available

echo "🔥 Firebase Rules Manual Deployment Helper"
echo "=========================================="
echo ""

# Validate rules first
echo "🔍 Validating Firestore rules syntax..."
if node validate-firestore-rules.js; then
    echo ""
    echo "✅ Rules validation passed!"
else
    echo ""
    echo "❌ Rules validation failed. Please fix the errors before deploying."
    exit 1
fi

echo ""
echo "📋 Manual Deployment Instructions:"
echo ""
echo "1. Open Firebase Console:"
echo "   https://console.firebase.google.com/project/vulugo/firestore/rules"
echo ""
echo "2. Copy the contents of firestore.rules file"
echo "3. Paste into the Firebase Console rules editor"
echo "4. Click 'Publish' to deploy the rules"
echo ""

# Check if we can open the browser
if command -v open >/dev/null 2>&1; then
    echo "🌐 Opening Firebase Console in your browser..."
    open "https://console.firebase.google.com/project/vulugo/firestore/rules"
elif command -v xdg-open >/dev/null 2>&1; then
    echo "🌐 Opening Firebase Console in your browser..."
    xdg-open "https://console.firebase.google.com/project/vulugo/firestore/rules"
else
    echo "ℹ️  Please manually open the URL above in your browser"
fi

echo ""
echo "📄 Rules file location: $(pwd)/firestore.rules"
echo ""
echo "🔧 After deployment, test the app to verify:"
echo "   - Authenticated users can create streams"
echo "   - Guest users don't see permission errors"
echo "   - All gaming/shop services work properly"
echo ""
echo "✨ Happy deploying!"
