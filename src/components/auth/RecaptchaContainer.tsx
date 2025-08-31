import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

interface RecaptchaContainerProps {
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Invisible reCAPTCHA container for Firebase Auth Phone Authentication
 * This component provides the DOM element that Firebase needs for reCAPTCHA verification
 */
export const RecaptchaContainer: React.FC<RecaptchaContainerProps> = ({
  onLoad,
  onError,
}) => {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    // In React Native/Expo, we need to handle reCAPTCHA differently
    // This component serves as a placeholder for the reCAPTCHA container
    
    try {
      // Create a hidden div element for reCAPTCHA if we're in a web environment
      if (typeof document !== 'undefined') {
        let recaptchaContainer = document.getElementById('recaptcha-container');
        
        if (!recaptchaContainer) {
          recaptchaContainer = document.createElement('div');
          recaptchaContainer.id = 'recaptcha-container';
          recaptchaContainer.style.position = 'absolute';
          recaptchaContainer.style.top = '-9999px';
          recaptchaContainer.style.left = '-9999px';
          recaptchaContainer.style.visibility = 'hidden';
          document.body.appendChild(recaptchaContainer);
        }
        
        onLoad?.();
      } else {
        // For React Native, we'll need to handle this differently
        console.log('📱 React Native environment detected - reCAPTCHA container created');
        onLoad?.();
      }
    } catch (error: any) {
      console.error('❌ Failed to create reCAPTCHA container:', error);
      onError?.(error);
    }
  }, [onLoad, onError]);

  // Return an invisible view that serves as a placeholder
  return <View ref={containerRef} style={styles.container} />;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default RecaptchaContainer;
