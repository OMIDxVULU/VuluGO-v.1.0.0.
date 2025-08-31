# 🎥 Agora Live Streaming Integration Guide for VuluGO

## 📋 **Setup Checklist**

### **1. Agora Account Setup**
1. **Create Agora Account**: Go to [https://console.agora.io/](https://console.agora.io/)
2. **Create New Project**: 
   - Project Name: `VuluGO Live Streaming`
   - Use Case: `Social Live Streaming`
   - Authentication: `App ID + Token (Recommended)`
3. **Get Credentials**:
   - **App ID**: Found in project overview
   - **App Certificate**: Enable and copy from project settings
   - **Customer ID & Secret**: From account settings for REST API

### **2. Environment Configuration**
Create/update your `.env` file:
```bash
# Agora Live Streaming Configuration
EXPO_PUBLIC_AGORA_APP_ID=your-agora-app-id-here
EXPO_PUBLIC_AGORA_APP_CERTIFICATE=your-agora-app-certificate-here
EXPO_PUBLIC_AGORA_CUSTOMER_ID=your-agora-customer-id-here
EXPO_PUBLIC_AGORA_CUSTOMER_SECRET=your-agora-customer-secret-here

# Streaming Configuration
EXPO_PUBLIC_ENABLE_VIDEO_STREAMING=true
EXPO_PUBLIC_DEFAULT_STREAM_PROFILE=AUDIO_ONLY
EXPO_PUBLIC_MAX_PARTICIPANTS_PER_STREAM=50
```

### **3. Install Dependencies**
```bash
# Install Agora React Native SDK
npm install react-native-agora

# For iOS (if using Mac)
cd ios && pod install && cd ..

# For Android, add to android/app/build.gradle:
# implementation 'io.agora.rtc:full-sdk:3.7.0'
```

### **4. Platform-Specific Setup**

#### **iOS Setup (ios/Podfile)**
```ruby
# Add to your Podfile
pod 'AgoraRtcEngine_iOS', '3.7.0'
```

#### **Android Setup (android/app/src/main/AndroidManifest.xml)**
```xml
<!-- Add permissions -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

## 🧪 **Testing Guide**

### **Development Testing**

#### **1. Audio-Only Testing (Recommended First)**
```bash
# Set in .env
EXPO_PUBLIC_ENABLE_VIDEO_STREAMING=false
EXPO_PUBLIC_DEFAULT_STREAM_PROFILE=AUDIO_ONLY

# Start development server
npx expo start
```

#### **2. Test Flow**
1. **Create Stream**: 
   - Go to Live Screen → Tap "Go Live"
   - Should initialize Agora and create Firebase stream
   - Check console for Agora initialization logs

2. **Join Stream**:
   - Use second device/simulator
   - Join the created stream
   - Should hear audio from host

3. **Test Controls**:
   - Mute/unmute audio
   - Speaking indicators
   - Leave stream

#### **3. Debug Logs to Watch**
```
✅ Agora RTC Engine initialized successfully
🔄 Joining channel: stream_xxx as host/viewer
✅ Successfully joined channel: stream_xxx with UID: xxx
👤 User xxx joined channel
🎤 User xxx is speaking (volume: xx)
```

### **Production Testing**

#### **1. Token Server (Required for Production)**
For production, you'll need a token server. Create a simple Node.js server:

```javascript
// token-server.js
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const APP_ID = 'your-app-id';
const APP_CERTIFICATE = 'your-app-certificate';

app.get('/token', (req, res) => {
  const { channelName, uid, role } = req.query;
  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  
  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
  
  res.json({ token });
});
```

#### **2. Update Agora Service for Production**
```typescript
// In agoraService.ts, update joinChannel method:
async joinChannel(channelName: string, userId: string, isHost: boolean): Promise<boolean> {
  // In production, fetch token from your server
  const token = await this.fetchTokenFromServer(channelName, userId, isHost);
  await this.rtcEngine!.joinChannel(token, channelName, null, uid);
}
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. "Agora not configured" Error**
- Check environment variables are set correctly
- Restart Expo development server after adding .env variables
- Verify App ID format (should be a long string)

#### **2. "Failed to join channel" Error**
- Check App Certificate is enabled in Agora Console
- Verify channel name format (alphanumeric, no spaces)
- Check network connectivity

#### **3. No Audio/Video**
- Check device permissions (microphone/camera)
- Verify audio profile settings
- Test on physical device (simulators have limited audio support)

#### **4. iOS Build Issues**
```bash
# Clean and reinstall pods
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

#### **5. Android Build Issues**
```bash
# Clean Android build
cd android
./gradlew clean
cd ..
```

### **Debug Commands**
```bash
# Check Agora service status
console.log(getAgoraServiceStatus());

# Test Agora configuration
console.log(isAgoraConfigured());

# Monitor connection state
agoraService.setEventCallbacks({
  onConnectionStateChanged: (state, reason) => {
    console.log(`Connection: ${state}, Reason: ${reason}`);
  }
});
```

## 🚀 **Next Steps**

### **Phase 1: Basic Audio Streaming**
- [x] Agora service integration
- [x] Audio-only streaming
- [x] Join/leave functionality
- [x] Mute controls

### **Phase 2: Enhanced Features**
- [ ] Video streaming support
- [ ] Screen sharing
- [ ] Recording functionality
- [ ] Advanced audio effects

### **Phase 3: Production Ready**
- [ ] Token server implementation
- [ ] Error recovery mechanisms
- [ ] Performance optimization
- [ ] Analytics integration

## 📊 **Performance Considerations**

### **Bandwidth Usage**
- **Audio Only**: ~50 kbps per participant
- **Video Standard**: ~500 kbps per participant
- **Video High**: ~1 Mbps per participant

### **Device Limitations**
- **iOS Simulator**: Limited audio support, test on device
- **Android Emulator**: May have audio issues, test on device
- **Older Devices**: May struggle with video streaming

### **Optimization Tips**
- Start with audio-only for better performance
- Limit participants in video streams
- Use adaptive bitrate for varying network conditions
- Implement connection quality monitoring

---

## 🎉 **Success Metrics**

Your Agora integration is successful when:
- ✅ Users can create and join audio streams
- ✅ Real-time audio communication works
- ✅ Speaking indicators update in real-time
- ✅ Mute/unmute controls function properly
- ✅ Users can leave streams gracefully
- ✅ Firebase and Agora states stay synchronized

**Ready to go live with professional-grade streaming! 🚀**
