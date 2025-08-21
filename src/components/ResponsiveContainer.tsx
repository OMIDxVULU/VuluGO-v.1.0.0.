import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: any;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ children, style }) => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const isWeb = Platform.OS === 'web';
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    
    return () => subscription?.remove();
  }, []);

  // Debug logging
  useEffect(() => {
    if (isWeb) {
      console.log('ResponsiveContainer - Platform: web, Dimensions:', dimensions);
    }
  }, [dimensions, isWeb]);

  // On web, use responsive design with mobile-first approach
  // On mobile, use full width
  const getResponsiveStyle = () => {
    if (!isWeb) {
      // Native mobile - no changes
      return {};
    }
    
    const { width, height } = dimensions;
    console.log('ResponsiveContainer - Width:', width, 'Height:', height);
    
    // For tablets and desktop (larger screens)
    if (width > 768) {
      console.log('ResponsiveContainer - Using desktop layout');
      return {
        maxWidth: 428, // iPhone 14 Pro Max width
        width: 428, // Ensure fixed width
        height: height - 40, // Account for margins
        alignSelf: 'center',
        marginHorizontal: 'auto' as any,
        marginTop: 20,
        marginBottom: 20,
        // Add mobile-like rounded corners
        borderRadius: 20,
        overflow: 'hidden',
        // Add subtle shadow and border for desktop
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 0,
        },
        shadowOpacity: 0.4,
        shadowRadius: 25,
        elevation: 25,
        // Add subtle border
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      };
    }
    
    // For mobile web and smaller screens - use full width
    console.log('ResponsiveContainer - Using mobile layout');
    return {
      paddingHorizontal: 8,
    };
  };

  return (
    <View style={[styles.container, getResponsiveStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
});

export default ResponsiveContainer;
