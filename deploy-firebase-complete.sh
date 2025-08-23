#!/bin/bash

# Complete Firebase Deployment Script
# This script deploys rules, indexes, and resolves common Firebase issues

echo "🔥 Complete Firebase Deployment Script"
echo "======================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "📦 Installing Firebase CLI..."

    if command -v npm &> /dev/null; then
        # Install firebase-tools and check if it succeeded
        if npm install -g firebase-tools; then
            echo "✅ Firebase CLI installation completed."

            # Verify installation by checking if firebase command is now available
            if ! command -v firebase &> /dev/null; then
                echo "❌ Firebase CLI installation failed - command not found in PATH."
                echo "💡 Troubleshooting suggestions:"
                echo "   • Try running with sudo: sudo npm install -g firebase-tools"
                echo "   • Check your PATH environment variable"
                echo "   • Restart your terminal and try again"
                echo "   • Install manually: https://firebase.google.com/docs/cli#install_the_firebase_cli"
                exit 1
            fi

            # Double-check with version command
            if ! firebase --version &> /dev/null; then
                echo "❌ Firebase CLI installation failed - version check failed."
                echo "💡 Try reinstalling: npm uninstall -g firebase-tools && npm install -g firebase-tools"
                exit 1
            fi

            echo "✅ Firebase CLI successfully installed and verified."
        else
            echo "❌ Failed to install Firebase CLI via npm."
            echo "💡 Troubleshooting suggestions:"
            echo "   • Try running with sudo: sudo npm install -g firebase-tools"
            echo "   • Check your npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally"
            echo "   • Install manually: https://firebase.google.com/docs/cli#install_the_firebase_cli"
            exit 1
        fi
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

# Deploy Firestore indexes first
echo "🗂️  Deploying Firestore indexes..."
if firebase deploy --only firestore:indexes; then
    echo "✅ Firestore indexes deployed successfully!"
else
    echo "⚠️  Failed to deploy Firestore indexes, continuing with rules..."
fi

# Validate and deploy firestore rules
echo "📜 Validating and deploying Firestore rules..."
if firebase firestore:rules:validate; then
    echo "✅ Firestore rules syntax is valid!"
    
    if firebase deploy --only firestore:rules; then
        echo "✅ Firestore security rules deployed successfully!"
    else
        echo "❌ Failed to deploy Firestore security rules."
        exit 1
    fi
else
    echo "❌ Firestore rules syntax is invalid. Please fix the errors above."
    exit 1
fi

# Deploy storage rules if they exist
if [ -f "storage.rules" ]; then
    echo "📁 Deploying Storage rules..."
    if firebase deploy --only storage; then
        echo "✅ Storage rules deployed successfully!"
    else
        echo "⚠️  Failed to deploy Storage rules, continuing..."
    fi
fi

echo ""
echo "🎉 Firebase deployment complete!"
echo "💡 All Firebase services are now updated."
echo "⏳ Waiting 15 seconds for changes to propagate..."
sleep 15

echo ""
echo "🔄 IMPORTANT: Please restart your app completely to ensure the new configuration takes effect."
echo "📱 Run: npx expo start --clear"
# Extract clean project ID for console URLs
echo "🔍 Extracting project ID for console URLs..."
PROJECT_ID_RAW=$(firebase use --current 2>/dev/null)
if [ $? -eq 0 ] && [ -n "$PROJECT_ID_RAW" ]; then
    # Clean the project ID by removing "Active Project:" prefix and any alias in parentheses
    PROJECT_ID=$(echo "$PROJECT_ID_RAW" | sed 's/^Active Project: *//' | sed 's/ *(.*)$//' | tr -d '\n\r')

    # Validate that we have a clean project ID (should not contain spaces or special chars)
    if [[ "$PROJECT_ID" =~ ^[a-zA-Z0-9-]+$ ]]; then
        echo "✅ Using project ID: $PROJECT_ID"
    else
        echo "⚠️  Project ID format seems unusual: '$PROJECT_ID'"
        echo "   Attempting to get project ID via projects list..."

        # Fallback: try to get project ID from projects list
        if command -v jq &> /dev/null; then
            PROJECT_ID_FALLBACK=$(firebase projects:list --json 2>/dev/null | jq -r '.results[]? | select(.current == true or .isCurrent == true) | .projectId' 2>/dev/null)
            if [ -n "$PROJECT_ID_FALLBACK" ] && [[ "$PROJECT_ID_FALLBACK" =~ ^[a-zA-Z0-9-]+$ ]]; then
                PROJECT_ID="$PROJECT_ID_FALLBACK"
                echo "✅ Using fallback project ID: $PROJECT_ID"
            else
                echo "⚠️  Could not determine clean project ID. Using raw value."
            fi
        else
            echo "⚠️  jq not available for JSON parsing. Using raw project ID."
        fi
    fi
else
    echo "⚠️  Could not determine current project. Console URLs may not work."
    PROJECT_ID="YOUR_PROJECT_ID"
fi

echo ""
echo "🔍 You can verify the deployment in Firebase Console:"
echo "   Rules: https://console.firebase.google.com/project/$PROJECT_ID/firestore/rules"
echo "   Indexes: https://console.firebase.google.com/project/$PROJECT_ID/firestore/indexes"
