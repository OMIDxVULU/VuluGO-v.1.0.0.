# iOS Simulator AsyncStorage Recovery Guide

## 🚨 **Critical Storage Corruption Recovery**

When iOS Simulator AsyncStorage becomes corrupted beyond programmatic repair, follow these steps in order:

### **Method 1: Complete Simulator Reset (Most Effective)**

```bash
# 1. Close all simulators and Expo
killall "Simulator"
killall "Expo CLI"
killall node

# 2. Shutdown all simulator devices
xcrun simctl shutdown all

# 3. Erase ALL simulator data (nuclear option)
xcrun simctl erase all

# 4. Clear Expo cache completely
rm -rf ~/.expo
rm -rf node_modules/.cache
rm -rf .expo

# 5. Clear React Native cache
npx react-native-clean-project --remove-iOS-build --remove-iOS-pods

# 6. Restart everything
npx expo start --clear --reset-cache
```

### **Method 2: Targeted Simulator Reset**

```bash
# 1. Find your simulator UDID
xcrun simctl list devices

# 2. Shutdown specific device
xcrun simctl shutdown <DEVICE_UDID>

# 3. Erase specific device
xcrun simctl erase <DEVICE_UDID>

# 4. Clear Expo cache
npx expo start --clear
```

### **Method 3: Manual Directory Cleanup**

```bash
# 1. Find simulator data directory
ls ~/Library/Developer/CoreSimulator/Devices/

# 2. Remove corrupted app data (replace DEVICE_ID with your simulator's ID)
rm -rf ~/Library/Developer/CoreSimulator/Devices/<DEVICE_ID>/data/Containers/Data/Application/*/Documents/ExponentExperienceData

# 3. Restart simulator
npx expo start --clear
```

## 🛡️ **Prevention Strategies**

### **1. Development Best Practices**

- **Avoid Rapid Restarts**: Don't restart the development server too frequently
- **Clean Shutdowns**: Always stop Expo properly (Ctrl+C) before closing terminal
- **Regular Cache Clearing**: Run `npx expo start --clear` weekly
- **Simulator Rotation**: Use different simulator devices to avoid overuse

### **2. AsyncStorage Usage Patterns**

```typescript
// ✅ GOOD: Use simple keys
await AsyncStorage.setItem('userToken', token);

// ❌ BAD: Avoid complex nested keys that create deep directories
await AsyncStorage.setItem('@app/user/profile/settings/theme', data);

// ✅ GOOD: Batch operations
await AsyncStorage.multiSet([
  ['key1', 'value1'],
  ['key2', 'value2']
]);

// ❌ BAD: Rapid sequential operations
await AsyncStorage.setItem('key1', 'value1');
await AsyncStorage.setItem('key2', 'value2'); // Too fast
```

### **3. Simulator Settings**

1. **iOS Simulator → Device → Erase All Content and Settings** monthly
2. **Xcode → Preferences → Locations → Derived Data → Delete** weekly
3. Use **iOS 17.0+** simulators (better storage handling)
4. Avoid **iOS 15.x** simulators (known storage issues)

## 🔧 **Enhanced Error Detection**

The app now includes enhanced error detection that will:

1. **Detect Storage Corruption**: Automatically identify simulator-specific errors
2. **Enable Bypass Mode**: Continue app functionality without storage
3. **Provide Recovery Instructions**: Clear console messages about next steps
4. **Graceful Degradation**: App continues working even with storage issues

### **Console Messages to Watch For**

```
🚧 DEVELOPMENT MODE: AsyncStorage bypass enabled
💡 App will continue without persistent storage
🔄 Manual simulator reset recommended
```

## 🎯 **Testing Recovery**

After applying any recovery method:

```bash
# 1. Start fresh
npx expo start --clear

# 2. Check for these success indicators:
# ✅ No storage error messages
# ✅ App loads to login/signup screen
# ✅ Input fields respond to touch
# ✅ No "Failed to create storage directory" errors

# 3. Test basic functionality:
# - Try typing in login fields
# - Attempt email registration
# - Check console for clean logs
```

## 🆘 **If All Methods Fail**

1. **Update Xcode**: Ensure you're using the latest Xcode version
2. **Reinstall Simulators**: Delete and reinstall iOS Simulator runtimes
3. **Test on Physical Device**: Confirm the issue is simulator-specific
4. **Contact Support**: Share console logs showing the enhanced error handling

## 📋 **Quick Reference Commands**

```bash
# Nuclear reset (most effective)
xcrun simctl shutdown all && xcrun simctl erase all && npx expo start --clear

# Gentle reset
npx expo start --clear --reset-cache

# Check simulator status
xcrun simctl list devices

# Clear Expo cache only
rm -rf ~/.expo && rm -rf .expo
```
