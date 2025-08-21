import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface WebResponsiveWrapperProps {
  children: React.ReactNode;
}

const WebResponsiveWrapper: React.FC<WebResponsiveWrapperProps> = ({ children }) => {
  const isWeb = Platform.OS === 'web';

  if (!isWeb) {
    // On native platforms, just return children without wrapper
    return <>{children}</>;
  }

  return (
    <View style={styles.webContainer}>
      <View style={styles.mobileViewport}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f', // Dark background for desktop
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: '100vh' as any,
    paddingVertical: 20,
  },
  mobileViewport: {
    width: '100%',
    maxWidth: 428, // iPhone 14 Pro Max width
    height: '100vh' as any,
    backgroundColor: '#131318',
    borderRadius: Platform.OS === 'web' ? 20 : 0,
    overflow: 'hidden',
    // Web-specific styles
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)' as any,
      border: '1px solid rgba(255, 255, 255, 0.1)' as any,
      minHeight: 'calc(100vh - 40px)' as any,
      maxHeight: 'calc(100vh - 40px)' as any,
    } : {}),
    // Ensure content is visible
    position: 'relative' as any,
  },
});

export default WebResponsiveWrapper;
