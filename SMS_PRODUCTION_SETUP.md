# SMS Verification Production Setup Guide

## 🎯 Overview

This guide explains how to set up production-ready SMS verification for the VULU React Native app. The implementation supports multiple SMS services with automatic fallback.

## 🚀 SMS Service Options

### **Option 1: Firebase Auth Phone Authentication (Recommended for Web)**

**Best for**: Expo Web, React Native with Firebase
**Pros**: Integrated with Firebase Auth, handles verification automatically
**Cons**: Requires reCAPTCHA (web only), needs native modules for React Native

#### Setup Steps:

1. **Enable Phone Authentication in Firebase Console**:
   ```
   1. Go to Firebase Console → Authentication → Sign-in method
   2. Enable "Phone" provider
   3. Add your domain to authorized domains
   ```

2. **Configure reCAPTCHA (Web only)**:
   - Firebase automatically handles reCAPTCHA for web environments
   - The app includes invisible reCAPTCHA setup

3. **Test Firebase Phone Auth**:
   ```typescript
   // In smsConfig.ts, set:
   useMockInDevelopment: false,
   preferredService: 'firebase'
   ```

### **Option 2: Twilio SMS API (Recommended for React Native)**

**Best for**: React Native, cross-platform apps
**Pros**: Works everywhere, reliable delivery, detailed analytics
**Cons**: Requires API credentials, costs per SMS

#### Setup Steps:

1. **Create Twilio Account**:
   - Sign up at [twilio.com](https://www.twilio.com)
   - Get a phone number for sending SMS

2. **Get API Credentials**:
   ```
   Account SID: Found in Twilio Console Dashboard
   Auth Token: Found in Twilio Console Dashboard  
   Phone Number: Your Twilio phone number (e.g., +1234567890)
   ```

3. **Set Server Environment Variables**:
   ```bash
   # Add to your backend/.env.server (NEVER use EXPO_PUBLIC_ for secrets!)
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_FROM_NUMBER=+1234567890

   # Client-side config (safe for EXPO_PUBLIC_)
   EXPO_PUBLIC_SMS_SERVICE=backend
   EXPO_PUBLIC_USE_MOCK_SMS=false
   ```

4. **Test Twilio SMS**:
   ```typescript
   // In smsConfig.ts, set:
   useMockInDevelopment: false,
   preferredService: 'twilio'
   ```

### **Option 3: AWS SNS (Alternative)**

For AWS SNS integration, you would need to:
1. Set up AWS SNS service
2. Configure IAM permissions
3. Create a similar service class like `TwilioSMSService`

## 🔧 Configuration

### **SMS Service Configuration** (`src/config/smsConfig.ts`)

```typescript
export const defaultSMSConfig: SMSServiceConfig = {
  // Service selection
  preferredService: 'firebase', // 'firebase' | 'twilio' | 'mock'
  enableFallback: true, // Try other services if preferred fails
  
  // Development settings
  useMockInDevelopment: true, // Set to false for production testing
  logVerificationCodes: true, // Log codes to console in development
  
  // Verification settings
  codeLength: 6,
  codeExpirationMinutes: 10,
  maxAttempts: 3,
  resendCooldownSeconds: 60,
};
```

### **Environment Variables**

Create a `.env` file in your project root:

```bash
# Twilio Configuration
EXPO_PUBLIC_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_TWILIO_AUTH_TOKEN=your_auth_token_here
EXPO_PUBLIC_TWILIO_FROM_NUMBER=+1234567890

# Optional: Override SMS service preference
EXPO_PUBLIC_SMS_SERVICE=twilio
EXPO_PUBLIC_USE_MOCK_SMS=false
```

## 🧪 Testing Production SMS

### **Step 1: Configure Service**

```typescript
// In src/config/smsConfig.ts
export const defaultSMSConfig: SMSServiceConfig = {
  preferredService: 'twilio', // or 'firebase'
  useMockInDevelopment: false, // Enable real SMS in development
  // ... other settings
};
```

### **Step 2: Test with Real Phone Number**

1. Run the app: `npm start`
2. Navigate to registration
3. Select "Phone Number" contact method
4. Enter your real phone number with country code
5. Check your phone for the SMS verification code
6. Enter the code in the app

### **Step 3: Monitor Logs**

Check the console for SMS service status:
```
📱 SMS Service Configuration:
  Preferred: twilio
  Best Available: twilio
  Firebase Available: true
  Twilio Available: true
  Development Mode: true
  Use Mock in Dev: false
  Twilio From Number: +1234567890
```

## 🛡️ Security Considerations

### **Environment Variables**
- Never commit API keys to version control
- Use different credentials for development/production
- Rotate API keys regularly

### **Rate Limiting**
- The app includes built-in rate limiting (3 attempts, 60-second cooldown)
- Twilio provides additional rate limiting at the API level
- Monitor usage to prevent abuse

### **Server-Side Security**
- **Require server-side enforcement** of attempts/cooldown/expiry using a centralized store (e.g., Redis) and server time to prevent client manipulation
- **Prohibit logging OTPs** in production and mandate redaction of phone numbers in logs
- **Store only hashed codes** server-side (e.g., HMAC with a per-session salt) rather than plaintext to protect against data leaks

### **Phone Number Validation**
- The app validates phone numbers before sending SMS
- Uses E.164 format for international numbers
- Includes country-specific validation

## 🚀 Deployment

### **Production Checklist**

1. **Set Production Environment Variables**:
   ```bash
   EXPO_PUBLIC_TWILIO_ACCOUNT_SID=production_account_sid
   EXPO_PUBLIC_TWILIO_AUTH_TOKEN=production_auth_token
   EXPO_PUBLIC_TWILIO_FROM_NUMBER=production_phone_number
   ```

2. **Update SMS Configuration**:
   ```typescript
   // For production
   useMockInDevelopment: false,
   preferredService: 'twilio', // or 'firebase'
   enableFallback: true,
   ```

3. **Test with Multiple Phone Numbers**:
   - Test international numbers
   - Test different carriers
   - Verify delivery times

4. **Monitor SMS Delivery**:
   - Set up Twilio webhooks for delivery status
   - Monitor failed deliveries
   - Track SMS costs

## 📊 Service Comparison

| Feature | Firebase Auth Phone | Twilio SMS | Mock SMS |
|---------|-------------------|------------|----------|
| **Real SMS** | ✅ Yes | ✅ Yes | ❌ No |
| **React Native** | ⚠️ Requires native modules | ✅ Works everywhere | ✅ Works everywhere |
| **Expo Go** | ❌ Not supported | ✅ Supported | ✅ Supported |
| **Web Support** | ✅ Full support | ✅ Full support | ✅ Full support |
| **Cost** | Free (Firebase limits) | Pay per SMS | Free |
| **Setup Complexity** | Medium | Easy | None |
| **Reliability** | High | Very High | N/A |

## 🔄 Service Fallback Logic

The app automatically tries services in this order:

1. **Preferred Service** (configured in `smsConfig.ts`)
2. **Firebase Auth Phone** (if available and not preferred)
3. **Twilio SMS** (if configured and not preferred)
4. **Mock SMS** (always available as final fallback)

## 📱 Platform-Specific Notes

### **Expo Go**
- Firebase Auth Phone: Not supported (requires native modules)
- Twilio SMS: ✅ Fully supported
- Recommendation: Use Twilio for Expo Go

### **Expo Development Build**
- Firebase Auth Phone: ✅ Supported with proper configuration
- Twilio SMS: ✅ Fully supported
- Recommendation: Either service works

### **React Native CLI**
- Firebase Auth Phone: ✅ Supported with native modules
- Twilio SMS: ✅ Fully supported
- Recommendation: Either service works

## 🆘 Troubleshooting

### **Common Issues**

1. **"SMS service not configured"**
   - Check environment variables are set correctly
   - Verify Twilio credentials are valid

2. **"reCAPTCHA not available"**
   - This is expected in React Native
   - App will fallback to Twilio automatically

3. **SMS not received**
   - Check phone number format (must include country code)
   - Verify Twilio phone number is SMS-enabled
   - Check spam/blocked messages

4. **"Invalid phone number"**
   - Ensure number is in E.164 format (+1234567890)
   - Use the country code selector in the app

5. **Carrier Registration Issues**
   - Verify A2P 10DLC (or relevant regional carrier registration) in the Twilio console
   - Confirm message template compliance (campaign descriptions, sender IDs, and content restrictions)
   - Check that your brand and campaign are approved for the target carriers

6. **Opt-out Handling**
   - Configure STOP/HELP webhook handling for US numbers
   - Set webhook endpoint URL in Twilio console
   - Implement request validation and proper response behavior
   - Log opt-out events for compliance tracking

### **Production Delivery Checklist**
- [ ] Verify carrier lookup shows SMS-enabled numbers
- [ ] Confirm A2P 10DLC registration status
- [ ] Test STOP/HELP webhook responses
- [ ] Check webhook logs in production
- [ ] Validate message template compliance

### **Debug Mode**

Enable detailed logging:
```typescript
// In smsConfig.ts
logVerificationCodes: true, // Logs codes to console
```

The app will log the SMS service selection and any errors to help with debugging.

## 🎉 Ready for Production!

Once configured, your SMS verification will:
- ✅ Send real SMS messages to users' phones
- ✅ Handle international phone numbers
- ✅ Provide reliable fallback options
- ✅ Include proper error handling and rate limiting
- ✅ Work across all platforms (web, iOS, Android)

Choose Twilio for the most reliable cross-platform experience, or Firebase Auth Phone if you're primarily targeting web users.
