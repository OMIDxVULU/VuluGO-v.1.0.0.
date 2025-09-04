# LiveStream Testing Checklist
## Real Audio Streaming Verification

### Prerequisites ✅
- [ ] Two physical devices (iOS and/or Android)
- [ ] Development builds installed on both devices
- [ ] Different user accounts on each device
- [ ] Stable network connection (Wi-Fi or LTE)

### Phase 1: Runtime Verification
**Goal**: Confirm real Agora SDK is loaded (not mock)

#### Device A & B Startup Logs:
- [ ] "✅ Real Agora SDK imported successfully" 
- [ ] "🔧 Agora Import Wrapper: Using Real SDK"
- [ ] "✅ Real Agora views imported successfully"

❌ **FAIL if you see**: "🎭 Using mock Agora exports" or "Using Mock"

### Phase 2: Host Flow (Device A)
**Goal**: Create stream with real token generation

#### Steps:
1. [ ] Open app, sign in
2. [ ] Navigate to LiveStream
3. [ ] Tap "Go Live"
4. [ ] Grant microphone permission if prompted
5. [ ] Stream should show "LIVE" status

#### Expected Logs:
- [ ] "🔑 Generating new Agora token for channel: ..."
- [ ] "✅ Agora token generated and cached successfully"
- [ ] "✅ Successfully joined channel: ... with UID: ..."
- [ ] "🔗 Connection state changed: 3 (Connected)"

#### Firebase Verification:
- [ ] Check Firebase Functions logs for "Generated new Agora token for user ..."
- [ ] Firestore: streams/{streamId} created with isActive: true

### Phase 3: Viewer Flow (Device B)
**Goal**: Join stream with token generation and real audio

#### Steps:
1. [ ] Open app, sign in with different account
2. [ ] Navigate to LiveStream
3. [ ] Find and tap the active stream from Device A
4. [ ] Should join and show "LIVE" status

#### Expected Logs:
- [ ] "🔑 Generating new Agora token for channel: ..."
- [ ] "✅ Successfully joined channel: ... with UID: ..."
- [ ] "🔗 Connection state changed: 3 (Connected)"
- [ ] "👥 Participant update for stream ...: 2 active participants"

### Phase 4: Audio Verification
**Goal**: Confirm real RTC audio transmission

#### Two-Way Audio Test:
- [ ] **Device A → Device B**: Speak on A, hear clearly on B
- [ ] **Device B → Device A**: Speak on B, hear clearly on A (if broadcaster role)
- [ ] **Mute Test**: Toggle mute on A, confirm silence on B
- [ ] **Unmute Test**: Unmute on A, confirm audio returns on B

#### Speaking Indicators:
- [ ] Speaking indicators correlate with actual speech (not random)
- [ ] Volume levels change based on actual voice volume

### Phase 5: Participant Tracking
**Goal**: Verify Firebase synchronization

#### Firestore Verification:
- [ ] streams/{streamId}/participants/{userId} documents exist for both users
- [ ] lastSeen timestamps update every ~30 seconds
- [ ] Participant count in UI matches Firestore data
- [ ] No permission-denied errors in logs

#### Heartbeat Logs:
- [ ] "💓 Heartbeat sent for user ... in stream ..." every 30s

### Phase 6: Connection Resilience
**Goal**: Test network and app lifecycle handling

#### Network Tests:
- [ ] **Brief offline**: Toggle airplane mode for 10s, then restore
  - Expected: "🔗 Connection state changed: 4 (Reconnecting)" → "3 (Connected)"
- [ ] **Network switch**: Wi-Fi → LTE or vice versa
  - Expected: Reconnection without getting stuck on "Connecting..."

#### App Lifecycle:
- [ ] **Background/Foreground**: Background app for 30s, then restore
  - Expected: Maintains connection or reconnects cleanly
- [ ] **Participant counts remain accurate after reconnection**

### Phase 7: Token Renewal (Optional - Long Test)
**Goal**: Verify automatic token renewal

#### Long Session Test (55+ minutes):
- [ ] Keep stream active for 55+ minutes
- [ ] Watch for: "🔄 Token expiring soon, renewing..."
- [ ] Followed by: "✅ Token renewed successfully"
- [ ] Firebase Functions logs show renewal
- [ ] Stream continues without interruption

### Phase 8: Agora Console Verification
**Goal**: Confirm real usage appears in Agora dashboard

#### Agora Console Check:
- [ ] Login to [Agora Console](https://console.agora.io/)
- [ ] Navigate to Usage dashboard
- [ ] **Interactive Live Streaming** minutes > 0
- [ ] Usage corresponds to your test duration

### Phase 9: Error Handling
**Goal**: Verify graceful error handling

#### Permission Tests:
- [ ] Deny microphone permission → clear error message with retry option
- [ ] Network failure → clear "Connection lost" message with retry

#### Configuration Tests:
- [ ] Missing Agora credentials → clear configuration error (not applicable in production)

---

## Pass/Fail Criteria

### ✅ PASS Requirements:
- Real SDK logs (no mock messages)
- Token generation on both devices
- Bidirectional audio transmission
- Agora Console shows usage minutes
- Firebase participant tracking works
- Reconnection handles network issues
- No infinite "Connecting..." loops

### ❌ FAIL Indicators:
- Mock Agora logs appear
- No audio transmission between devices
- Agora Console shows 0 minutes
- Permission-denied Firestore errors
- Stuck on "Connecting..." status
- Token generation failures

---

## Troubleshooting

### Common Issues:
1. **Still seeing mock logs**: Using Expo Go instead of dev build
2. **No audio**: Microphone permissions denied or network issues
3. **Token failures**: Firebase Functions not deployed or misconfigured
4. **Firestore errors**: Security rules not deployed
5. **0 Agora usage**: Still using mock service

### Quick Fixes:
- Ensure using dev build: `npx expo start --dev-client`
- Check EAS secrets: `eas secret:list`
- Verify Firebase deployment: `firebase functions:list`
- Check Firestore rules: Firebase Console → Firestore → Rules
