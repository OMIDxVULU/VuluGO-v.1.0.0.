# 🚨 URGENT: Firebase Rules Deployment Required

## **Status: Live Streaming BROKEN - Rules Not Deployed**

The Firebase permission errors are occurring because the updated security rules are **NOT DEPLOYED** to your Firebase project.

## **IMMEDIATE ACTION REQUIRED**

### **Method 1: Firebase Console (Recommended)**

1. **Open Firebase Console**: https://console.firebase.google.com
2. **Try Different Google Account**: Switch accounts if "vulugo" project not visible
3. **Navigate**: Project "vulugo" → Firestore Database → Rules
4. **Replace ALL existing rules** with the content below

### **Method 2: Ask Project Owner**
If you can't access the console:
- Find who created the Firebase project "vulugo"
- Ask them to deploy the rules below
- Or ask them to add you as an editor

## **EXACT RULES TO DEPLOY**

Copy this ENTIRE content and paste it in Firebase Console Rules editor:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // CRITICAL: STREAMS COLLECTION - This fixes the live streaming errors
    match /streams/{streamId} {
      // Public read access for browsing streams
      allow read: if true;
      
      // SIMPLIFIED stream creation - authenticated users can create streams
      allow create: if isAuthenticated() && 
                   request.auth.uid == request.resource.data.hostId;
      
      // Host can update/delete their own streams
      allow update, delete: if isAuthenticated() && 
                           request.auth.uid == resource.data.hostId;
    }

    // USERS COLLECTION
    match /users/{userId} {
      allow create: if isOwner(userId);
      allow read, update, delete: if isOwner(userId);
      allow read: if isAuthenticated();
      allow read: if true; // Public read for username checking

      // Active stream tracking
      match /activeStream/{documentId} {
        allow read, write: if isAuthenticated() && request.auth.uid == userId;
      }
    }

    // GAMING COLLECTIONS
    match /userGameProfiles/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /miningStats/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /slotsStats/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /goldMinerStats/{userId} {
      allow read, write: if isOwner(userId);
    }

    // SHOP COLLECTIONS
    match /products/{productId} {
      allow read: if true;
      allow write: if false;
    }

    match /purchases/{purchaseId} {
      allow read, write: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }

    match /userInventory/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /shopPromotions/{promotionId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }

    // SOCIAL COLLECTIONS
    match /friends/{friendshipId} {
      allow read, write: if isAuthenticated() && 
        (request.auth.uid == resource.data.userId || 
         request.auth.uid == resource.data.friendId);
    }

    match /friendRequests/{requestId} {
      allow read, write: if isAuthenticated() && 
        (request.auth.uid == resource.data.fromUserId || 
         request.auth.uid == resource.data.toUserId);
    }

    // STREAM MESSAGES
    match /streamMessages/{messageId} {
      allow read: if true;
      allow create: if isAuthenticated() && 
                   request.auth.uid == request.resource.data.userId;
      allow update, delete: if isAuthenticated() && 
                           request.auth.uid == resource.data.userId;
    }

    // NOTIFICATIONS
    match /notifications/{notificationId} {
      allow read, write: if isAuthenticated() && 
                        request.auth.uid == resource.data.userId;
    }

    // GLOBAL CHAT
    match /globalChat/{messageId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
                           request.auth.uid == resource.data.senderId;
    }

    // LEADERBOARDS (public read)
    match /leaderboards/{document=**} {
      allow read: if true;
    }

    // SYSTEM CONFIG (public read)
    match /systemConfig/{document=**} {
      allow read: if true;
    }

    // FALLBACK - deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## **After Deployment**

1. **Click "Publish"** in Firebase Console
2. **Wait 30 seconds** for rules to propagate
3. **Test live streaming** in your app
4. **Check console logs** - permission errors should be gone

## **Alternative: Use Someone Else's Computer**

If you can't access Firebase Console:
1. **Find someone with Node.js >=20**
2. **Have them run**: `npx firebase-tools login`
3. **Then run**: `npx firebase-tools deploy --only firestore:rules --project vulugo`

## **Verification Steps**

After deployment:
1. Run `npx expo start`
2. Try creating a live stream
3. Check console - should see: `✅ Stream created successfully`
4. No more `Missing or insufficient permissions` errors

---

**⚡ CRITICAL: The app will NOT work until these rules are deployed!**
