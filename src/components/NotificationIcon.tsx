import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface NotificationIconProps {
  color: string;
  size?: number;
  active?: boolean;
}

const NotificationIcon: React.FC<NotificationIconProps> = ({ color, size = 26, active = false }) => {
  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M10 5C10 3.89543 10.8954 3 12 3C13.1046 3 14 3.89543 14 5C16.3402 5.86432 18 8.13141 18 10.8V14.5C18.5 15 19.5 16 21 16"
          stroke={color}
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M14 5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5C7.65979 5.86432 6 8.13141 6 10.8V14.5C5.5 15 4.5 16 3 16"
          stroke={color}
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M8.5 16C8.5 16 9 19 12 19C15 19 15.5 16 15.5 16"
          stroke={color}
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M12 19V21"
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

export default NotificationIcon; 