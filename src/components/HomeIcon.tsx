import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface HomeIconProps {
  color: string;
  size?: number;
  active?: boolean;
}

const HomeIcon: React.FC<HomeIconProps> = ({ color, size = 26, active = false }) => {
  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 9.5L12 4L21 9.5"
          stroke={color}
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M19 13V19.4C19 19.7314 18.7314 20 18.4 20H5.6C5.26863 20 5 19.7314 5 19.4V13"
          stroke={color}
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M10 20V14.5C10 14.2239 10.2239 14 10.5 14H13.5C13.7761 14 14 14.2239 14 14.5V20"
          stroke={color}
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeIcon; 