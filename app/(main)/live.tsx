import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LiveScreen from '../../src/screens/LiveScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLiveStreams } from '../../src/context/LiveStreamContext';
import MinimizedLiveWidget from '../../src/components/MinimizedLiveWidget';

export default function Live() {
  // Check if coming back from a minimized livestream
  const params = useLocalSearchParams();
  const router = useRouter();
  const { currentlyWatching, isMinimized } = useLiveStreams();
  const [showWidget, setShowWidget] = useState(false);
  
  // If the minimized parameter is true, we'll show the widget
  useEffect(() => {
    if ((params.minimized === 'true' && params.streamId) || isMinimized) {
      setShowWidget(true);
      console.log('Minimized livestream active:', currentlyWatching);
    } else {
      setShowWidget(false);
    }
  }, [params, currentlyWatching, isMinimized]);

  // Handle tapping on the minimized widget
  const handleWidgetPress = () => {
    if (currentlyWatching) {
      router.push({
        pathname: '/livestream',
        params: {
          streamId: currentlyWatching,
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      <LiveScreen />
      {showWidget && <MinimizedLiveWidget onPress={handleWidgetPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131318',
  },
}); 