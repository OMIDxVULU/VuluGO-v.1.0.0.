#!/bin/bash

# Firebase Rules Deployment via REST API
# This bypasses the Firebase CLI Node.js version requirement

echo "🔥 Firebase Rules Deployment via REST API"
echo "========================================="

PROJECT_ID="vulugo"
RULES_FILE="firestore.rules"

# Check if rules file exists
if [ ! -f "$RULES_FILE" ]; then
    echo "❌ Error: $RULES_FILE not found"
    exit 1
fi

echo "📋 Project ID: $PROJECT_ID"
echo "📄 Rules file: $RULES_FILE"
echo ""

# Get Firebase access token
echo "🔐 Getting Firebase access token..."
echo "Please run this command in a separate terminal and paste the access token:"
echo ""
echo "gcloud auth print-access-token"
echo ""
echo "If you don't have gcloud CLI, you can:"
echo "1. Go to https://console.cloud.google.com/apis/credentials"
echo "2. Create a service account key"
echo "3. Use that for authentication"
echo ""

read -p "Enter your Firebase access token: " ACCESS_TOKEN

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ No access token provided"
    exit 1
fi

# Read rules file content
RULES_CONTENT=$(cat "$RULES_FILE")

# Create JSON payload
cat > rules_payload.json << EOF
{
  "source": {
    "files": [
      {
        "name": "firestore.rules",
        "content": $(echo "$RULES_CONTENT" | jq -Rs .)
      }
    ]
  }
}
EOF

echo "🚀 Deploying rules to Firebase..."

# Deploy rules via REST API
RESPONSE=$(curl -s -X POST \
  "https://firebaserules.googleapis.com/v1/projects/$PROJECT_ID/rulesets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @rules_payload.json)

echo "Response: $RESPONSE"

# Check if deployment was successful
if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Deployment failed"
    echo "$RESPONSE"
    exit 1
else
    echo "✅ Rules deployed successfully!"
    echo ""
    echo "🎉 Live streaming should now work!"
    echo "Test by running: npx expo start"
fi

# Cleanup
rm -f rules_payload.json

echo ""
echo "📝 Next steps:"
echo "1. Test live streaming in your app"
echo "2. Check console logs for permission errors"
echo "3. If still failing, check Firebase Console for rule status"
