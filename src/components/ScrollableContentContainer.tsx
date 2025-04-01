import React, { forwardRef } from 'react';
import { View, ScrollView, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScrollableContentContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
}

/**
 * A wrapper component that provides extra bottom padding for scrollable content
 * to ensure nothing is hidden behind the navigation bar.
 */
const ScrollableContentContainer = forwardRef<ScrollView, ScrollableContentContainerProps>(
  (
    {
      children,
      style,
      contentContainerStyle,
      showsVerticalScrollIndicator = false,
      keyboardShouldPersistTaps = 'handled',
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    
    // Very generous extra padding to ensure interactive elements are never hidden
    // 200px ensures plenty of space for large buttons or interactive elements at the bottom
    const extraBottomPadding = 200;

    // For iOS, we also use contentInset to provide even more scroll area
    const contentInset = Platform.OS === 'ios' 
      ? { bottom: 100 } 
      : undefined;

    return (
      <ScrollView
        ref={ref}
        style={[styles.scrollView, style]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: extraBottomPadding },
          contentContainerStyle
        ]}
        contentInset={contentInset}
        contentOffset={{ x: 0, y: 0 }}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        scrollEventThrottle={16}
        alwaysBounceVertical={true}
        disableScrollViewPanResponder={true}
        overScrollMode="always"
        bounces={true}
        automaticallyAdjustContentInsets={false}
      >
        {children}
      </ScrollView>
    );
  }
);

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});

export default ScrollableContentContainer; 