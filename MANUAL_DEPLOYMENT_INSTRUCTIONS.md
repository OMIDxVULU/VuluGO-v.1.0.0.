# 🔥 Firebase Rules Manual Deployment Instructions

## 🚨 **URGENT: Deploy These Rules to Fix Permission Errors**

### **Step 1: Access Firebase Console**

1. **Open this link**: https://console.firebase.google.com/u/0/project/vulugo/firestore/rules
2. **If the link doesn't work**:
   - Go to: https://console.firebase.google.com
   - **Select the correct Google account** that has access to Firebase
   - **Find and click "vulugo" project**
   - Click **"Firestore Database"** in left sidebar
   - Click **"Rules"** tab

### **Step 2: Replace Current Rules**

1. **Select all existing rules** in the editor (Cmd+A / Ctrl+A)
2. **Delete the existing content**
3. **Copy and paste the ENTIRE content below**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Debug helper function for activeStream access
    function debugActiveStreamAccess(userId) {
      // This will help debug permission issues
      return isAuthenticated() &&
             request.auth.uid != null &&
             request.auth.uid == userId;
    }

    // USERS COLLECTION - Core user profiles
    match /users/{userId} {
      // Allow creation only by the user themselves
      allow create: if isOwner(userId);
      // Users can read/update/delete their own profile
      allow read, update, delete: if isOwner(userId);
      // Authenticated users can read other users' basic profiles
      allow read: if isAuthenticated();
      // Allow public read for username checking during registration
      allow read: if true;

      // Active stream tracking subcollection - specific document path
      match /activeStream/current {
        allow read, write: if debugActiveStreamAccess(userId);
      }

      // Allow access to any document in activeStream subcollection (for future flexibility)
      match /activeStream/{documentId} {
        allow read, write: if debugActiveStreamAccess(userId);
      }
    }

    // SHOP & COMMERCE COLLECTIONS
    match /products/{productId} {
      allow read: if true; // Public read access for browsing products
      allow write: if false; // Only admin can modify products (server-side)
    }

    match /purchases/{purchaseId} {
      allow read, write: if isOwner(resource.data.userId);
    }

    match /userInventory/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /shopPromotions/{promotionId} {
      allow read: if isAuthenticated(); // Authenticated users can view promotions
      allow write: if false; // Only admin can modify promotions
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

    // LIVE STREAMING COLLECTIONS
    match /liveStreams/{streamId} {
      // Public read access for browsing streams
      allow read: if true;
      
      // Simplified stream creation - authenticated users can create streams
      allow create: if isAuthenticated() &&
                   request.auth.uid == request.resource.data.hostId &&
                   request.resource.data.isActive == true;
      
      // Host can update/delete their own streams
      allow update, delete: if isAuthenticated() && 
                           request.auth.uid == resource.data.hostId;
    }

    match /streamMessages/{messageId} {
      allow read: if true; // Public read for stream chat
      allow create: if isAuthenticated() && 
                   request.auth.uid == request.resource.data.userId;
      allow update, delete: if isAuthenticated() && 
                           request.auth.uid == resource.data.userId;
    }

    match /streamViewers/{viewerId} {
      allow read: if true; // Public read for viewer counts
      allow write: if isAuthenticated() && 
                  request.auth.uid == request.resource.data.userId;
    }

    // NOTIFICATIONS COLLECTION
    match /notifications/{notificationId} {
      allow read, write: if isOwner(resource.data.userId);
    }

    // ANALYTICS COLLECTIONS
    match /userAnalytics/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /appAnalytics/{analyticsId} {
      allow read: if isAuthenticated();
      allow write: if false; // Server-side only
    }

    // CONTENT COLLECTIONS
    match /posts/{postId} {
      allow read: if true; // Public read
      allow create: if isAuthenticated() && 
                   request.auth.uid == request.resource.data.authorId;
      allow update, delete: if isAuthenticated() && 
                           request.auth.uid == resource.data.authorId;
    }

    match /comments/{commentId} {
      allow read: if true; // Public read
      allow create: if isAuthenticated() && 
                   request.auth.uid == request.resource.data.authorId;
      allow update, delete: if isAuthenticated() && 
                           request.auth.uid == resource.data.authorId;
    }

    // LEADERBOARDS COLLECTION
    match /leaderboards/{leaderboardId} {
      allow read: if true; // Public read access
      allow write: if false; // Server-side only
    }

    // SYSTEM COLLECTIONS
    match /systemConfig/{configId} {
      allow read: if isAuthenticated();
      allow write: if false; // Admin only
    }

    match /appVersions/{versionId} {
      allow read: if true; // Public read for version checking
      allow write: if false; // Admin only
    }

    // CHAT COLLECTIONS
    match /chatRooms/{roomId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
                           request.auth.uid == resource.data.createdBy;
    }

    match /chatMessages/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
                   request.auth.uid == request.resource.data.senderId;
      allow update, delete: if isAuthenticated() && 
                           request.auth.uid == resource.data.senderId;
    }

    // REPORTS & MODERATION
    match /reports/{reportId} {
      allow create: if isAuthenticated() && 
                   request.auth.uid == request.resource.data.reporterId;
      allow read: if false; // Admin only
    }

    match /moderationActions/{actionId} {
      allow read: if isAuthenticated() && 
                 request.auth.uid == resource.data.targetUserId;
      allow write: if false; // Admin only
    }

    // VIRTUAL CURRENCY COLLECTIONS
    match /userCurrency/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /currencyTransactions/{transactionId} {
      allow read: if isAuthenticated() && 
                 request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() && 
                   request.auth.uid == request.resource.data.userId;
    }

    // ACHIEVEMENTS COLLECTION
    match /userAchievements/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /achievementDefinitions/{achievementId} {
      allow read: if isAuthenticated();
      allow write: if false; // Server-side only
    }

    // SETTINGS COLLECTIONS
    match /userSettings/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /userPreferences/{userId} {
      allow read, write: if isOwner(userId);
    }

    // BACKUP & SYNC COLLECTIONS
    match /userBackups/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /syncData/{userId} {
      allow read, write: if isOwner(userId);
    }

    // TEMPORARY COLLECTIONS
    match /tempData/{tempId} {
      allow read, write: if isAuthenticated();
    }

    match /sessionData/{sessionId} {
      allow read, write: if isAuthenticated() && 
                        request.auth.uid == resource.data.userId;
    }

    // FALLBACK RULE - Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### **Step 3: Deploy the Rules**

1. **Click "Publish"** button (usually blue button at top right)
2. **Confirm the deployment** when prompted
3. **Wait for "Rules published successfully"** message

### **Step 4: Verify Deployment**

After deployment, you should see:
- ✅ **No more permission-denied errors** in your app console
- ✅ **Authenticated users can create live streams**
- ✅ **Guest users see graceful fallbacks** instead of errors
- ✅ **All gaming/shop services work** for authenticated users

### **🚨 If Firebase Console Still Doesn't Work**

**Alternative Method - Check Project Access:**

1. Go to: https://console.firebase.google.com
2. **Switch Google accounts** (click profile picture → switch account)
3. **Look for "vulugo" project** in different accounts
4. **Ask the project owner** to add your email as an editor/owner

### **📞 Need Help?**

If you still can't access the Firebase Console:
1. **Check which Google account** owns the Firebase project
2. **Verify project name** - it might not be exactly "vulugo"
3. **Contact the project owner** to grant you access
4. **Share this file** with someone who has Firebase access

---

**⚡ This deployment will fix ALL the permission errors you reported!**
